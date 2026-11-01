#!/usr/bin/env node
// DevTools bridge. Valenced's Developer Kit connects to ws://localhost:7684 as a client
// (adb reverse tcp:7684 tcp:7684). The other scripts talk to this process over HTTP on 7685.
//
//   GET  /status              { connected, info, alias, since }
//   GET  /wait?timeout=ms     waits for a client, then /status
//   POST /eval   {code, timeout}          -> { ok, result, error }
//   POST /mcp    {command, args, timeout} -> { ok, result, error }
//   POST /reload {timeout}    reloads Discord and waits for the client to reconnect
//
// Usage: node bridge.js [--port 7684] [--http 7685] [--logs]

import http from 'node:http'
import { WebSocketServer } from 'ws'
import { LogLevel, MCPCommand, MessageType, PROTOCOL_VERSION } from '@revenge-mod/devtools-shared/constants'
import { deserialize, serialize } from '@revenge-mod/devtools-shared/serializer'
import { argValue, hasFlag } from './lib/args.js'
import { BRIDGE_HTTP_PORT, DEVTOOLS_PORT } from './lib/devtools.js'

export function startBridge({ port = DEVTOOLS_PORT, httpPort = BRIDGE_HTTP_PORT, logs = false, quiet = false } = {}) {
	const say = quiet ? () => {} : (...a) => console.log('[bridge]', ...a)
	let client = null
	let nextId = 1
	const pending = new Map()
	const waiters = new Set()

	const wss = new WebSocketServer({ port })
	wss.on('connection', ws => {
		const conn = { ws, info: null, alias: null, since: null, ready: false }
		ws.on('message', raw => {
			let msg
			try {
				msg = deserialize(raw.toString())
			} catch (e) {
				say('unparseable message:', e.message)
				return
			}
			switch (msg.type) {
				case MessageType.Hello: {
					const supported = msg.data?.version === PROTOCOL_VERSION
					ws.send(
						serialize({
							type: MessageType.Hi,
							data: {
								version: PROTOCOL_VERSION,
								supported,
								settings: { log: { level: LogLevel.Default, inspectDepth: 4, interceptConsole: logs } },
							},
						}),
					)
					if (!supported) {
						say(`client speaks protocol ${msg.data?.version}, need ${PROTOCOL_VERSION}`)
						return
					}
					Object.assign(conn, { info: msg.data.info ?? null, alias: msg.data.alias ?? null, since: Date.now(), ready: true })
					if (client && client !== conn) client.ws.close()
					client = conn
					say('client connected:', conn.info)
					for (const w of waiters) w()
					waiters.clear()
					break
				}
				case MessageType.Log:
					if (logs) console.log('[app]', ...(msg.data?.message ?? []).map(String))
					break
				case MessageType.MCPResult: {
					const p = pending.get(msg.data.id)
					if (!p) break
					pending.delete(msg.data.id)
					clearTimeout(p.timer)
					p.resolve({ ok: msg.data.ok, result: toJson(msg.data.result), error: msg.data.error ?? null })
					break
				}
			}
		})
		ws.on('close', () => {
			if (client === conn) {
				client = null
				say('client disconnected')
			}
		})
	})

	function status() {
		return { connected: !!client, info: client?.info ?? null, alias: client?.alias ?? null, since: client?.since ?? null }
	}

	function waitForClient(timeout = 60000) {
		if (client) return Promise.resolve(status())
		return new Promise((resolve, reject) => {
			const done = () => {
				clearTimeout(timer)
				resolve(status())
			}
			const timer = setTimeout(() => {
				waiters.delete(done)
				reject(new Error('no DevTools client connected'))
			}, timeout)
			waiters.add(done)
		})
	}

	function mcp(command, args = {}, timeout = 30000) {
		if (!client) return Promise.resolve({ ok: false, result: null, error: 'no DevTools client connected' })
		const id = String(nextId++)
		return new Promise(resolve => {
			const timer = setTimeout(() => {
				pending.delete(id)
				resolve({ ok: false, result: null, error: `timed out after ${timeout} ms` })
			}, timeout)
			pending.set(id, { resolve, timer })
			client.ws.send(serialize({ type: MessageType.MCPRun, data: { id, command, args } }))
		})
	}

	async function reload(timeout = 90000) {
		const before = client
		const res = await mcp(MCPCommand.DiscordReload)
		if (!res.ok) return res
		const start = Date.now()
		while (Date.now() - start < timeout) {
			if (client && client !== before) return { ok: true, result: status(), error: null }
			await new Promise(r => setTimeout(r, 250))
		}
		return { ok: false, result: null, error: 'client did not reconnect after reload' }
	}

	const server = http.createServer(async (req, res) => {
		const url = new URL(req.url, 'http://localhost')
		const reply = (code, body) => {
			res.writeHead(code, { 'content-type': 'application/json' })
			res.end(JSON.stringify(body))
		}
		try {
			const body = req.method === 'POST' ? JSON.parse((await readBody(req)) || '{}') : {}
			if (req.method === 'GET' && url.pathname === '/status') return reply(200, status())
			if (req.method === 'GET' && url.pathname === '/wait')
				return reply(200, await waitForClient(Number(url.searchParams.get('timeout')) || 60000))
			if (req.method === 'POST' && url.pathname === '/eval')
				return reply(200, await mcp(MCPCommand.Eval, { code: body.code }, body.timeout))
			if (req.method === 'POST' && url.pathname === '/mcp') return reply(200, await mcp(body.command, body.args, body.timeout))
			if (req.method === 'POST' && url.pathname === '/reload') return reply(200, await reload(body.timeout))
			reply(404, { error: 'not found' })
		} catch (e) {
			reply(500, { error: e.message })
		}
	})
	server.listen(httpPort, '127.0.0.1')
	say(`DevTools server on ws://localhost:${port}, API on http://127.0.0.1:${httpPort}`)

	return {
		status,
		waitForClient,
		mcp,
		reload,
		close() {
			for (const p of pending.values()) clearTimeout(p.timer)
			for (const ws of wss.clients) ws.terminate()
			wss.close()
			server.close()
		},
	}
}

function readBody(req) {
	return new Promise((resolve, reject) => {
		let data = ''
		req.on('data', c => (data += c))
		req.on('end', () => resolve(data))
		req.on('error', reject)
	})
}

// devalue placeholders (MaxDepthObject, functions, ...) become their string previews.
function toJson(value) {
	return JSON.parse(
		JSON.stringify(value, (_, v) => {
			if (v === undefined) return null
			if (typeof v === 'bigint') return v.toString()
			if (v instanceof Map) return Object.fromEntries(v)
			if (v instanceof Set) return [...v]
			if (v && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) !== Object.prototype && typeof v.toString === 'function' && !(v instanceof Date))
				return v.toString()
			return v
		}) ?? 'null',
	)
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('tools/bridge.js')) {
	startBridge({
		port: Number(argValue('--port')) || DEVTOOLS_PORT,
		httpPort: Number(argValue('--http')) || BRIDGE_HTTP_PORT,
		logs: hasFlag('--logs'),
	})
}
