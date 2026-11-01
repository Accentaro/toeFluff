// HTTP client for bridge.js. Code sent to the app runs through the Developer Kit's eval:
// `valenced`, `revenge`, `api` and `hidden` are in scope. Results are snapshotted to a depth,
// and promises are not awaited, so everything here returns JSON strings and polls for async work.

export const DEVTOOLS_PORT = Number(process.env.DEVTOOLS_PORT) || 7684
export const BRIDGE_HTTP_PORT = Number(process.env.TOEFLUFF_BRIDGE_PORT) || 7685
const base = `http://127.0.0.1:${BRIDGE_HTTP_PORT}`

async function call(path, body) {
	let res
	// One retry: a reused keep-alive socket the bridge already closed fails once.
	for (let attempt = 0; !res; attempt++) {
		try {
			res = await fetch(base + path, body === undefined ? undefined : { method: 'POST', body: JSON.stringify(body) })
		} catch {
			if (attempt) throw new Error(`bridge not running on ${base}; start it with: node tools/bridge.js`)
		}
	}
	const json = await res.json()
	if (!res.ok) throw new Error(json.error ?? `bridge returned ${res.status}`)
	return json
}

export function status() {
	return call('/status')
}

export async function waitForClient(timeout = 60000) {
	const s = await status()
	if (s.connected) return s
	console.log('Waiting for Valenced to connect (DevTools auto-connect, adb reverse tcp:7684 tcp:7684)...')
	return call(`/wait?timeout=${timeout}`)
}

/** Evaluates an expression in the app. Returns the snapshotted value. */
export async function evalRaw(code, timeout = 30000) {
	const res = await call('/eval', { code, timeout })
	if (!res.ok) throw new Error(`eval failed: ${res.error}`)
	return res.result
}

/** Runs a function body in the app and returns its JSON-serialisable return value. */
export async function evalJson(body, timeout = 30000) {
	const out = await evalRaw(`JSON.stringify((function () {\n${body}\n})())`, timeout)
	return out == null ? null : JSON.parse(out)
}

let jobCounter = 0

/**
 * Runs a function body that returns a promise, then polls until it settles.
 * The body must not use `await`; chain with `.then`.
 */
export async function evalAsync(body, { timeout = 60000, interval = 100 } = {}) {
	const id = `${process.pid}-${++jobCounter}`
	await evalRaw(`(function () {
		var jobs = globalThis.__toefluffJobs || (globalThis.__toefluffJobs = {});
		jobs[${JSON.stringify(id)}] = { done: false };
		Promise.resolve().then(function () {\n${body}\n}).then(
			function (v) { jobs[${JSON.stringify(id)}] = { done: true, value: JSON.stringify(v === undefined ? null : v) } },
			function (e) { jobs[${JSON.stringify(id)}] = { done: true, error: String((e && e.stack) || e) } }
		);
		return 'started';
	})()`)
	const start = Date.now()
	while (Date.now() - start < timeout) {
		const out = await evalRaw(`(function () {
			var jobs = globalThis.__toefluffJobs, j = jobs && jobs[${JSON.stringify(id)}];
			if (!j || !j.done) return null;
			delete jobs[${JSON.stringify(id)}];
			return JSON.stringify(j);
		})()`)
		if (out != null) {
			const job = JSON.parse(out)
			if (job.error) throw new Error(`app error: ${job.error}`)
			return JSON.parse(job.value)
		}
		await new Promise(r => setTimeout(r, interval))
	}
	throw new Error(`app job timed out after ${timeout} ms`)
}

/** Reloads Discord and waits for the client to reconnect. */
export async function reload(timeout = 90000) {
	const res = await call('/reload', { timeout })
	if (!res.ok) throw new Error(`reload failed: ${res.error}`)
	return res.result
}

/** Splits the Hello info string, e.g. "352.6 - Alpha (Valenced 1.2.4)". */
export function parseClientInfo(info) {
	const m = /^(.*?)(?: \((.+)\))?$/.exec(info ?? '')
	return { discord: m?.[1] || null, loader: m?.[2] || null }
}
