#!/usr/bin/env node
// Offline test: runs bridge.js against a fake Valenced built on @revenge-mod/devtools-client,
// with Discord's token tables taken from data/tokens.json and a stand-in themes store.
// Also checks the screenshot diff and the observation merge. Writes nothing outside tools/.work.

import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DevToolsClient } from '@revenge-mod/devtools-client'

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.env.DEVTOOLS_PORT = '17684'
process.env.TOEFLUFF_BRIDGE_PORT = '17685'
const FAKE_STATE = path.join(here, '.work', 'fake-screen.json')
fs.mkdirSync(path.dirname(FAKE_STATE), { recursive: true })
fs.writeFileSync(FAKE_STATE, '{}')
const env = { ...process.env, TOEFLUFF_FAKE_ADB: path.join(here, 'test', 'fake-adb.js'), TOEFLUFF_FAKE_STATE: FAKE_STATE }

const { readData, resolveFromTokens, BASES, WORK } = await import('../lib/data.js')
const devtools = await import('../lib/devtools.js')
const app = await import('../lib/app.js')
const { diff, unstableMask } = await import('../lib/image.js')
const { mergeScreen } = await import('../lib/observations.js')

const tokens = readData('tokens')
const sleep = ms => new Promise(r => setTimeout(r, ms))
let failures = 0
async function test(name, fn) {
	try {
		await fn()
		console.log(`ok   ${name}`)
	} catch (e) {
		failures++
		console.log(`FAIL ${name}\n     ${e.stack?.split('\n').slice(0, 3).join('\n     ')}`)
	}
}

// --- fake app --------------------------------------------------------------
function fakeValenced() {
	const RawColor = { ...tokens.raw }
	const colors = Object.fromEntries(Object.keys(tokens.semantic).map(n => [n, { __name: n }]))
	const internal = {
		getSemanticColorName: c => c.__name,
		resolveSemanticColor(base, color) {
			const ref = tokens.semantic[color.__name][base]
			let out = RawColor[ref.raw].slice(0, 7).toLowerCase()
			const a = Math.round(ref.opacity * 255)
			if (a < 255) out += a.toString(16).padStart(2, '0')
			return out
		},
	}
	const state = { groups: {}, selected: { format: 1, colors: { plugin: 'some.theme', group: 'g', theme: 't', values: { raw: { WHITE: '#000000' } } } } }
	const store = {
		applied: [],
		themesStore: { getState: () => state },
		registerTheme(plugin, group, id, theme) {
			state.groups[plugin] ??= {}
			state.groups[plugin][group] = { themes: { [id]: theme } }
		},
		unregisterAll(plugin) {
			delete state.groups[plugin]
		},
		selectTheme(plugin, group, id) {
			return new Promise((resolve, reject) =>
				setTimeout(() => {
					if (plugin === null) state.selected.colors = undefined
					else if (plugin === 'some.theme') state.selected.colors = { plugin, group, theme: id, values: { raw: { WHITE: '#000000' } } }
					else {
						const theme = state.groups[plugin]?.[group]?.themes[id]
						if (!theme) return reject(new Error(`Not registered: ${plugin}/${group}/${id}`))
						state.selected.colors = { plugin, group, theme: id, values: theme.getColors({ raw: RawColor }) }
					}
					store.applied.push(structuredClone(state.selected.colors ?? null))
					const sel = state.selected.colors
					fs.writeFileSync(FAKE_STATE, JSON.stringify(sel?.plugin === 'toefluff.probe' ? sel.values : {}))
					resolve()
				}, 20),
			)
		},
	}
	const valenced = {
		discord: {
			common: { tokens: { Tokens: { SemanticColor: tokens.semantic, RawColor, default: { colors, internal } } } },
			native: {
				ClientInfoModule: { getConstants: () => ({ Version: '999.0 - Test', Build: '1' }) },
				BundleUpdaterManager: { reload: () => reloadFake() },
			},
		},
	}
	const hidden = { plugins: { internal: { pList: new Map([['valenced.settings.themes', { api: { themesInternal: { store } } }]]) } } }
	return { valenced, hidden, store }
}

let fake
let client
function connectFake() {
	fake = fakeValenced()
	client = new DevToolsClient()
	client.expose('api', {})
	client.expose('valenced', fake.valenced)
	client.expose('revenge', fake.valenced)
	client.expose('hidden', fake.hidden)
	client.connect(`ws://localhost:${process.env.DEVTOOLS_PORT}`, '999.0 - Test (Valenced test)')
}
function reloadFake() {
	client.disconnect()
	setTimeout(connectFake, 200)
}

// --- run -------------------------------------------------------------------
const bridge = spawn(process.execPath, [path.join(here, 'bridge.js')], { env, stdio: ['ignore', 'pipe', 'inherit'] })
let bridgeOut = ''
bridge.stdout.on('data', d => (bridgeOut += d))
await sleep(500)
connectFake()

try {
	await test('client connects and says hello', async () => {
		const s = await devtools.waitForClient(5000)
		assert.equal(s.connected, true)
		assert.deepEqual(devtools.parseClientInfo(s.info), { discord: '999.0 - Test', loader: 'Valenced test' })
	})
	await test('eval round-trips values', async () => {
		assert.equal(await devtools.evalRaw('1 + 2'), 3)
		assert.deepEqual(await devtools.evalJson('return { a: [1, "x"], b: null }'), { a: [1, 'x'], b: null })
		assert.equal(await devtools.evalRaw('Object.keys(valenced.discord.common.tokens.Tokens.RawColor).length'), Object.keys(tokens.raw).length)
	})
	await test('eval errors come back', async () => {
		await assert.rejects(devtools.evalRaw('nope.nope'), /nope is not defined/)
	})
	await test('async eval polls until the promise settles', async () => {
		const v = await devtools.evalAsync('return new Promise(function (r) { setTimeout(function () { r({ late: true }) }, 300) })')
		assert.deepEqual(v, { late: true })
		await assert.rejects(devtools.evalAsync('return Promise.reject(new Error("boom"))'), /boom/)
	})
	await test('readTokens returns the tables and resolution', async () => {
		const r = await app.readTokens()
		assert.equal(r.version, '999.0 - Test')
		assert.deepEqual(r.semantic, tokens.semantic)
		assert.deepEqual(r.raw, tokens.raw)
		assert.deepEqual(r.resolved, readData('resolved').semantic)
		assert.deepEqual(r.theme, { plugin: 'some.theme', group: 'g', theme: 't' })
	})
	await test('probe theme applies colours and restores the previous theme', async () => {
		const s = await app.setupProbe()
		assert.deepEqual(s.previous, { plugin: 'some.theme', group: 'g', theme: 't' })
		await app.applyColors({ semantic: { dark: { TEXT_LINK: '#ff65c5' } } })
		assert.deepEqual(fake.store.applied.at(-1).values, { semantic: { dark: { TEXT_LINK: '#ff65c5' } } })
		await app.applyColors({})
		assert.deepEqual(fake.store.applied.at(-1).values, {})
		const restored = await app.restoreTheme()
		assert.deepEqual(restored, { plugin: 'some.theme', group: 'g', theme: 't' })
		assert.equal(fake.store.themesStore.getState().selected.colors.plugin, 'some.theme')
		assert.equal(fake.store.themesStore.getState().groups['toefluff.probe'], undefined)
	})
	await test('dump refuses while a colour theme is active, then matches data/ in a dry run', async () => {
		// Async spawn: the fake app runs in this process and has to keep answering.
		const run = () =>
			new Promise(resolve => {
				const p = spawn(process.execPath, [path.join(here, 'dump.js'), '--dry-run'], { env })
				let stderr = ''
				p.stderr.on('data', d => (stderr += d))
				p.on('close', status => resolve({ status, stderr }))
			})
		let r = await run()
		assert.equal(r.status, 1)
		assert.match(r.stderr, /colour theme/)
		await devtools.evalAsync('return hidden.plugins.internal.pList.get("valenced.settings.themes").api.themesInternal.store.selectTheme(null)')
		r = await run()
		assert.equal(r.status, 0, r.stderr)
		const report = JSON.parse(fs.readFileSync(path.join(WORK, 'dump-report.json'), 'utf8'))
		for (const k of ['semantic', 'raw']) for (const f of ['added', 'removed', 'changed']) assert.deepEqual(report[k][f], [], `${k} ${f}`)
		assert.deepEqual(report.mismatches, [])
	})
	await test('capture finds the keys on a fake screen (dry run)', async () => {
		const out = await new Promise(resolve => {
			const p = spawn(process.execPath, [path.join(here, 'capture.js'), 'fake-screen', '--dry-run', '--settle', '0', '--batch', '64'], { env })
			let text = ''
			p.stdout.on('data', d => (text += d))
			p.stderr.on('data', d => (text += d))
			p.on('close', status => resolve({ status, text }))
		})
		assert.equal(out.status, 0, out.text.slice(-600))
		const { results, report } = JSON.parse(fs.readFileSync(path.join(WORK, 'dry-run', 'fake-screen.json'), 'utf8'))
		const link = results.find(r => r.key === 'TEXT_LINK')
		const neutral = results.find(r => r.key === 'NEUTRAL_69')
		assert.equal(results.length, 2, JSON.stringify(results.map(r => r.key)))
		assert.equal(link.pixels, 1000)
		assert.deepEqual(link.focus, { x: 10 / 120, y: 20 / 240, width: 50 / 120, height: 20 / 240 })
		assert.equal(link.measurement, undefined)
		assert.equal(neutral.kind, 'raw')
		assert.equal(neutral.pixels, 120 * 40)
		assert.equal(neutral.measurement, 'baseline-difference')
		assert.deepEqual(report.updated, ['semantic/TEXT_LINK', 'raw/NEUTRAL_69'])
		// theme put back afterwards
		assert.equal(fake.store.themesStore.getState().selected.colors?.plugin ?? null, null)
		assert.equal(fake.store.themesStore.getState().groups['toefluff.probe'], undefined)
	})
	await test('reload waits for the client to come back', async () => {
		const before = (await devtools.status()).since
		const s = await devtools.reload(10000)
		assert.equal(s.connected, true)
		assert.notEqual(s.since, before)
	})
} finally {
	client.disconnect()
	bridge.kill()
}

await test('resolved.json matches tokens.json', () => {
	const r = resolveFromTokens(tokens)
	const resolved = readData('resolved').semantic
	for (const name of Object.keys(resolved)) for (const b of BASES) assert.equal(r[name][b], resolved[name][b], `${name}.${b}`)
})

await test('dump reports added, removed, renamed and changed keys', async () => {
	const { compareTokens } = await import('../dump.js')
	const next = structuredClone(tokens)
	next.semantic.TEXT_LINK_NEW = next.semantic.TEXT_LINK
	delete next.semantic.TEXT_LINK
	next.raw.NEUTRAL_1 = '#123456'
	next.raw.BRAND_NEW_1 = '#abcdef'
	const r = compareTokens(tokens, next)
	assert.deepEqual(r.semantic.renamed, [{ from: 'TEXT_LINK', to: ['TEXT_LINK_NEW'] }])
	assert.deepEqual(r.raw.added, ['BRAND_NEW_1'])
	assert.deepEqual(r.raw.changed, ['NEUTRAL_1'])
})

await test('diff counts changed pixels and their box, ignoring unstable ones', () => {
	const W = 10
	const H = 20
	const img = () => ({ data: Buffer.alloc(W * H * 3, 40), width: W, height: H })
	const base = img()
	const other = img()
	other.data.fill(99, 0, 3) // pixel (0,0) flickers
	const mask = unstableMask(base, other, 3)
	const pinked = img()
	pinked.data.set([255, 101, 197], 0)
	for (const [x, y] of [[2, 3], [5, 7]]) pinked.data.set([255, 101, 197], (y * W + x) * 3)
	pinked.data.set([42, 41, 40], (10 * W + 9) * 3) // below tolerance
	const d = diff(base, pinked, mask)
	assert.equal(d.pixels, 2)
	assert.deepEqual(d.focus, { x: 0.2, y: 0.15, width: 0.4, height: 0.25 })
	assert.equal(d.pinkShare, 1)
})

await test('merging a screen keeps other screens and hand-written descriptions', () => {
	const data = {
		tested: readData('tested'),
		captures: readData('captures'),
		examples: readData('examples'),
		descriptions: readData('descriptions'),
		tokens,
	}
	const before = structuredClone(data)
	const focus = { x: 0, y: 0, width: 1, height: 1 }
	const res = (kind, key) => ({ kind, key, pixels: 1234, focus, width: 1080, height: 2400 })
	const { images, report } = mergeScreen(data, {
		screen: 'emoji',
		discord: '999.0 - Test',
		date: '2026-01-01',
		probed: new Set(['semantic/ANDROID_NAVIGATION_SCRIM_BACKGROUND', 'semantic/INPUT_BACKGROUND_DEFAULT', 'semantic/BACKGROUND_BASE_LOW', 'semantic/APP_FRAME_BORDER', 'raw/NEUTRAL_100']),
		results: [res('semantic', 'ANDROID_NAVIGATION_SCRIM_BACKGROUND'), res('semantic', 'INPUT_BACKGROUND_DEFAULT'), res('semantic', 'BACKGROUND_BASE_LOW'), res('raw', 'NEUTRAL_100')],
		scrambled: false,
		saveExamples: false,
		prune: false,
	})
	const t = data.tested.semantic
	// main example on this screen: capture replaced, other screen kept
	assert.equal(t.ANDROID_NAVIGATION_SCRIM_BACKGROUND.screens.emoji, 1234)
	assert.equal(t.ANDROID_NAVIGATION_SCRIM_BACKGROUND.screens.actionsheet, before.tested.semantic.ANDROID_NAVIGATION_SCRIM_BACKGROUND.screens.actionsheet)
	assert.equal(data.captures.semantic.ANDROID_NAVIGATION_SCRIM_BACKGROUND.pixels, 1234)
	// existing example for this screen: refreshed, description kept
	const ex = data.examples.semantic.INPUT_BACKGROUND_DEFAULT.find(e => e.screen === 'emoji')
	const exBefore = before.examples.semantic.INPUT_BACKGROUND_DEFAULT.find(e => e.screen === 'emoji')
	assert.equal(ex.pixels, 1234)
	assert.equal(ex.description, exBefore.description)
	assert.equal(data.examples.semantic.INPUT_BACKGROUND_DEFAULT.length, before.examples.semantic.INPUT_BACKGROUND_DEFAULT.length)
	// key seen on a new screen without --save-examples: pixels recorded, no image
	assert.equal(t.BACKGROUND_BASE_LOW.screens.emoji, 1234)
	assert.equal(t.BACKGROUND_BASE_LOW.screens.inbox, before.tested.semantic.BACKGROUND_BASE_LOW.screens.inbox)
	assert.ok(!images.some(i => i.key === 'BACKGROUND_BASE_LOW'))
	// probed but not seen; was never on emoji -> untouched
	assert.deepEqual(t.APP_FRAME_BORDER, before.tested.semantic.APP_FRAME_BORDER)
	assert.deepEqual(report.notSeen, [])
	// untouched keys and other files' entries stay identical
	assert.deepEqual(data.tested.semantic.TEXT_LINK, before.tested.semantic.TEXT_LINK)
	assert.deepEqual(data.captures.raw, Object.assign(structuredClone(before.captures.raw), { NEUTRAL_100: data.captures.raw.NEUTRAL_100 }))
	assert.equal(data.tested.date, '2026-01-01')
	assert.deepEqual(Object.keys(data.tested), Object.keys(before.tested))
	assert.deepEqual(data.tested.coverage.individualExamples, before.tested.coverage.individualExamples)
	assert.equal(images.length, 2 + (before.tested.raw.NEUTRAL_100?.example === "emoji" ? 1 : 0))
})

await test('a key that disappears from its screen is reported, and pruned with --prune', () => {
	const data = { tested: readData('tested'), captures: readData('captures'), examples: readData('examples'), descriptions: readData('descriptions') }
	const run = prune =>
		mergeScreen(structuredClone(data), { screen: 'actionsheet', date: 'x', probed: new Set(['semantic/ANDROID_NAVIGATION_SCRIM_BACKGROUND']), results: [], prune })
	assert.deepEqual(run(false).report.notSeen, ['semantic/ANDROID_NAVIGATION_SCRIM_BACKGROUND'])
	const copy = structuredClone(data)
	const { report } = mergeScreen(copy, { screen: 'actionsheet', date: 'x', probed: new Set(['semantic/ANDROID_NAVIGATION_SCRIM_BACKGROUND']), results: [], prune: true })
	assert.deepEqual(report.pruned, ['semantic/ANDROID_NAVIGATION_SCRIM_BACKGROUND'])
	assert.equal(copy.tested.semantic.ANDROID_NAVIGATION_SCRIM_BACKGROUND.screens.actionsheet, undefined)
	assert.equal(copy.examples.semantic.ANDROID_NAVIGATION_SCRIM_BACKGROUND, undefined)
})

console.log(failures ? `\n${failures} failed` : '\nall passed')
process.exit(failures ? 1 : 0)
