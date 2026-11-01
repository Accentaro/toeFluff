#!/usr/bin/env node
// Reads Discord's colour token tables from the running app and writes data/tokens.json and
// data/resolved.json. Reports added, removed and likely renamed keys against the previous files.
// Needs bridge.js running with Valenced connected, and no Valenced colour theme selected.
//
// Usage: node dump.js [--dry-run]

import fs from 'node:fs'
import path from 'node:path'
import { readTokens } from './lib/app.js'
import { hasFlag } from './lib/args.js'
import { BASES, INDENT, KINDS, WORK, byName, readData, resolveFromTokens, sortObject, writeData } from './lib/data.js'
import { parseClientInfo, waitForClient } from './lib/devtools.js'

const HEX = /^#[0-9a-f]{6}([0-9a-f]{2})?$/

function normHex(v) {
	if (typeof v !== 'string') return null
	let s = v.trim().toLowerCase()
	if (!HEX.test(s)) return null
	if (s.length === 9 && s.endsWith('ff')) s = s.slice(0, 7)
	return s
}

/** Compares two token tables. Renames are removed/added pairs with identical definitions. */
export function compareTokens(prev, next) {
	const report = {}
	for (const kind of KINDS) {
		const a = prev?.[kind] ?? {}
		const b = next[kind]
		const removed = Object.keys(a).filter(k => !(k in b))
		const added = Object.keys(b).filter(k => !(k in a))
		const same = k => (kind === 'raw' ? String(b[k]).toLowerCase() : JSON.stringify(BASES.map(x => b[k][x])))
		const sameA = k => (kind === 'raw' ? String(a[k]).toLowerCase() : JSON.stringify(BASES.map(x => a[k][x])))
		const renamed = []
		for (const r of removed) {
			const matches = added.filter(n => same(n) === sameA(r))
			if (matches.length) renamed.push({ from: r, to: matches })
		}
		const changed = Object.keys(b).filter(k => k in a && sameA(k) !== same(k))
		report[kind] = { added, removed, renamed, changed }
	}
	return report
}

async function main() {
	const dry = hasFlag('--dry-run')
	const client = await waitForClient()
	const app = await readTokens()
	if (app.theme)
		throw new Error(
			`Valenced colour theme "${app.theme.plugin}/${app.theme.theme}" is active, so the tables hold its colours. Pick Discord's default theme and run again.`,
		)

	const discord = app.version || parseClientInfo(client.info).discord
	const semantic = sortObject(app.semantic)
	const raw = Object.fromEntries(Object.keys(app.raw).sort(byName).map(k => [k, normHex(app.raw[k]) ?? app.raw[k]]))
	const tokens = { semantic, raw }

	// resolved.json: the app's own resolution, checked against tokens (they have always matched).
	const computed = resolveFromTokens(tokens)
	const resolved = {}
	const mismatches = []
	for (const name of Object.keys(semantic)) {
		resolved[name] = {}
		for (const base of BASES) {
			const fromApp = normHex(app.resolved?.[name]?.[base])
			resolved[name][base] = fromApp ?? computed[name][base]
			if (fromApp && fromApp !== computed[name][base]) mismatches.push(`${name}.${base}: app ${fromApp}, tokens ${computed[name][base]}`)
		}
	}

	const prev = readData('tokens', null)
	const report = compareTokens(prev, tokens)
	const prevResolved = readData('resolved', null)

	if (!dry) {
		writeData('tokens', tokens, INDENT.tokens)
		writeData('resolved', { discord, semantic: resolved }, INDENT.resolved)
	}
	fs.mkdirSync(WORK, { recursive: true })
	fs.writeFileSync(path.join(WORK, 'dump-report.json'), `${JSON.stringify({ discord, previous: prevResolved?.discord, ...report, mismatches }, null, 2)}\n`)

	// Tested keys that disappeared need a rename in tested/captures/examples/descriptions.
	const tested = readData('tested', null)
	const lost = tested ? KINDS.flatMap(kind => Object.keys(tested[kind] ?? {}).filter(k => !(k in tokens[kind])).map(k => `${kind}/${k}`)) : []

	console.log(`Discord ${discord}${prevResolved?.discord && prevResolved.discord !== discord ? ` (was ${prevResolved.discord})` : ''}`)
	console.log(`${Object.keys(semantic).length} semantic, ${Object.keys(raw).length} raw keys${dry ? ' (dry run, nothing written)' : ''}`)
	for (const kind of KINDS) {
		const r = report[kind]
		const list = (label, items) => items.length && console.log(`  ${kind} ${label} (${items.length}): ${items.join(', ')}`)
		list('added', r.added)
		list('removed', r.removed)
		list('likely renamed', r.renamed.map(x => `${x.from} -> ${x.to.join(' | ')}`))
		list('changed', r.changed)
	}
	if (mismatches.length) console.log(`  ${mismatches.length} resolved values differ from tokens (app value kept), e.g. ${mismatches.slice(0, 3).join('; ')}`)
	if (lost.length) console.log(`Tested keys no longer in Discord: ${lost.join(', ')}`)
	console.log(`Report: ${path.relative(process.cwd(), path.join(WORK, 'dump-report.json'))}`)
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('tools/dump.js'))
	main().catch(e => {
		console.error(e.message)
		process.exit(1)
	})
