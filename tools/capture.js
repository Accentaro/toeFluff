#!/usr/bin/env node
// Finds which colour keys paint the screen currently shown on the device, one key at a time in pink.
// Takes a baseline screenshot, then sets batches of keys to pink and splits any batch that changes
// the screen until single keys are left. Each visible key gets its pink screenshot, pixel count and
// focus box recorded under the screen name. Other screens' observations are kept.
//
// Usage: node capture.js <screen> [options]
//   --keys A,B,raw/C      only these keys (semantic unless prefixed raw/)
//   --match REGEX         only keys whose name matches
//   --kind semantic|raw   only one kind (default both)
//   --tested              only keys already recorded on this screen (quick refresh)
//   --batch N             keys per batch before splitting (default 32; 1 = strictly one at a time)
//   --settle MS           wait after each colour change (default 1200)
//   --tolerance N         per-channel change that counts (default 3)
//   --min-pixels N        smallest change that counts as visible (default 20)
//   --base dark           theme base the semantic overrides go to (default dark = Ash)
//   --scrambled           personal text on screen is scrambled (sets textScrambled)
//   --save-examples       also save KEY-screen.webp for keys whose main example is another screen
//   --prune               drop this screen from keys that no longer show up on it
//   --dry-run             drive the device but write nothing to data/ or public/
//   --serial S            adb device (default: the only emulator)
//
// node capture.js --restore   puts the previous colour theme back after a killed run

import fs from 'node:fs'
import path from 'node:path'
import { pickDevice, screencap } from './lib/adb.js'
import { applyColors, restoreTheme, setupProbe } from './lib/app.js'
import { argValue, hasFlag, positional } from './lib/args.js'
import { INDENT, KINDS, PINK, PUBLIC, WORK, readData, today, writeData } from './lib/data.js'
import { parseClientInfo, waitForClient } from './lib/devtools.js'
import { decode, diff, hexToRgb, saveWebp, unstableMask } from './lib/image.js'
import { mergeScreen } from './lib/observations.js'

const VALUED = ['--keys', '--match', '--kind', '--batch', '--settle', '--tolerance', '--min-pixels', '--base', '--serial']
const sleep = ms => new Promise(r => setTimeout(r, ms))

export function selectKeys({ tokens, tested, screen, keys, match, kind, onlyTested }) {
	const kinds = kind ? [kind] : KINDS
	let list = kinds.flatMap(k => Object.keys(tokens[k]).map(key => ({ kind: k, key })))
	if (keys) {
		const wanted = new Set(keys.split(',').map(s => s.trim()).filter(Boolean).map(s => (s.includes('/') ? s : `semantic/${s}`)))
		for (const id of wanted) {
			const [k, key] = id.split('/')
			if (!tokens[k]?.[key]) throw new Error(`unknown key ${id}`)
		}
		list = list.filter(e => wanted.has(`${e.kind}/${e.key}`))
	}
	if (match) {
		const re = new RegExp(match)
		list = list.filter(e => re.test(e.key))
	}
	if (onlyTested) list = list.filter(e => tested[e.kind]?.[e.key]?.screens?.[screen] !== undefined)
	return list
}

function colorsFor(kind, keys, base) {
	const values = Object.fromEntries(keys.map(k => [k, PINK]))
	return kind === 'raw' ? { raw: values } : { semantic: { [base]: values } }
}

async function main() {
	if (hasFlag('--restore')) {
		await waitForClient()
		await setupProbe()
		const r = await restoreTheme()
		console.log(r === 'failed' ? 'Previous theme could not be reselected; back to Discord defaults.' : r ? `Reselected ${r.plugin}/${r.theme}.` : 'Back to Discord defaults.')
		return
	}
	const [screen] = positional(VALUED)
	if (!screen) throw new Error('usage: node capture.js <screen> [--keys ...] [--dry-run]; see the header of capture.js')
	const dry = hasFlag('--dry-run')
	const batch = Math.max(1, Number(argValue('--batch', 32)))
	const settle = Number(argValue('--settle', 1200))
	const tolerance = Number(argValue('--tolerance', 3))
	const minPixels = Number(argValue('--min-pixels', 20))
	const base = argValue('--base', 'dark')
	const kind = argValue('--kind')
	if (kind && !KINDS.includes(kind)) throw new Error('--kind must be semantic or raw')

	const tokens = readData('tokens')
	const tested = readData('tested')
	const keys = selectKeys({ tokens, tested, screen, keys: argValue('--keys'), match: argValue('--match'), kind, onlyTested: hasFlag('--tested') })
	if (!keys.length) throw new Error('no keys selected')

	const serial = await pickDevice(argValue('--serial'))
	const client = await waitForClient()
	const discord = parseClientInfo(client.info).discord
	console.log(`Screen "${screen}" on ${serial}, Discord ${discord}: probing ${keys.length} keys${dry ? ' (dry run)' : ''}`)

	const wasScrambled = KINDS.some(k => Object.values(readData('captures')[k] ?? {}).some(c => c.screen === screen && c.textScrambled))
	if (wasScrambled && !hasFlag('--scrambled')) console.log('Note: earlier captures of this screen had personal text scrambled; pass --scrambled once it is.')

	const shotsDir = path.join(WORK, 'capture', screen)
	fs.mkdirSync(shotsDir, { recursive: true })
	const pink = hexToRgb(PINK)
	const opts = { tolerance, pink }

	await setupProbe()
	let interrupted = false
	const onSigint = () => {
		interrupted = true
		console.log('\nStopping after the current step; restoring the theme...')
	}
	process.on('SIGINT', onSigint)

	const results = []
	try {
		await applyColors({})
		await sleep(settle)
		const shot0 = await screencap(serial)
		await sleep(400)
		const shot1 = await screencap(serial)
		const baseline = await decode(shot0)
		const mask = unstableMask(baseline, await decode(shot1), tolerance)
		const unstable = mask.reduce((a, b) => a + b, 0)
		fs.writeFileSync(path.join(shotsDir, 'baseline.png'), shot0)
		if (unstable) console.log(`Ignoring ${unstable} pixels that change on their own (clock, animations).`)

		let shots = 2
		const probe = async (k, group) => {
			await applyColors(colorsFor(k, group, base))
			await sleep(settle)
			const png = await screencap(serial)
			shots++
			return { png, d: diff(baseline, await decode(png), mask, opts) }
		}

		// Sanity check: every selected semantic key at once must change the screen.
		const semanticKeys = keys.filter(e => e.kind === 'semantic').map(e => e.key)
		if (semanticKeys.length > 20) {
			const { d } = await probe('semantic', semanticKeys)
			if (d.pixels < minPixels)
				throw new Error(`setting ${semanticKeys.length} semantic keys to pink changed nothing. Is Discord on the ${base} theme, and is Valenced's Themes API running?`)
		}

		for (const k of KINDS) {
			const queue = []
			const ofKind = keys.filter(e => e.kind === k).map(e => e.key)
			for (let i = 0; i < ofKind.length; i += batch) queue.push(ofKind.slice(i, i + batch))
			let done = 0
			while (queue.length && !interrupted) {
				const group = queue.shift()
				const { png, d } = await probe(k, group)
				if (d.pixels < minPixels) {
					done += group.length
				} else if (group.length > 1) {
					const half = Math.ceil(group.length / 2)
					queue.unshift(group.slice(0, half), group.slice(half))
				} else {
					done++
					const key = group[0]
					const measurement = d.pinkShare < 0.5 ? 'baseline-difference' : undefined
					results.push({ kind: k, key, pixels: d.pixels, focus: d.focus, width: d.width, height: d.height, measurement, png })
					console.log(`  ${k}/${key}: ${d.pixels} px${measurement ? ' (tint only)' : ''}`)
					// Back to defaults before the next key.
					await applyColors({})
					await sleep(settle)
				}
				process.stdout.write(`\r  ${k}: ${done}/${ofKind.length} checked, ${shots} screenshots `)
			}
			process.stdout.write('\n')
		}

		// The screen should look like the baseline again.
		await applyColors({})
		await sleep(settle)
		const after = diff(baseline, await decode(await screencap(serial)), mask, opts)
		if (after.pixels >= minPixels) console.log(`Warning: the screen differs from the baseline by ${after.pixels} px after the run; it may have scrolled or changed.`)
	} finally {
		process.off('SIGINT', onSigint)
		const restored = await restoreTheme().catch(e => `failed: ${e.message}`)
		if (String(restored).startsWith('failed'))
			console.log(`Could not reselect the previous colour theme (${restored}). Pick it again in Valenced, or run node tools/capture.js --restore.`)
	}
	if (interrupted) {
		console.log('Interrupted; nothing written.')
		return
	}

	const probed = new Set(keys.map(e => `${e.kind}/${e.key}`))
	const data = {
		tested,
		captures: readData('captures'),
		examples: readData('examples'),
		descriptions: readData('descriptions'),
		tokens,
	}
	const { images, report } = mergeScreen(data, {
		screen,
		discord,
		date: today(),
		probed,
		results,
		scrambled: hasFlag('--scrambled'),
		saveExamples: hasFlag('--save-examples'),
		prune: hasFlag('--prune'),
	})

	if (dry) {
		// Every visible key's screenshot, for review; nothing in data/ or public/ changes.
		const dir = path.join(WORK, 'dry-run')
		fs.mkdirSync(dir, { recursive: true })
		for (const r of results) await saveWebp(r.png, path.join(dir, r.kind, `${r.key}-${screen}.webp`))
		fs.writeFileSync(path.join(dir, `${screen}.json`), `${JSON.stringify({ report, results: results.map(({ png, ...r }) => r) }, null, 2)}\n`)
	} else {
		for (const img of images) {
			const r = results.find(x => x.kind === img.kind && x.key === img.key)
			img.target.bytes = await saveWebp(r.png, path.join(PUBLIC, img.file))
		}
		writeData('tested', data.tested, INDENT.tested)
		writeData('captures', data.captures, INDENT.captures)
		writeData('examples', data.examples, INDENT.examples)
	}

	const line = (label, ids) => ids.length && console.log(`${label} (${ids.length}): ${ids.join(', ')}`)
	console.log(`\n${results.length} keys visible on "${screen}".`)
	line('New keys', report.added)
	line('Updated', report.updated)
	line('Example images', report.examples)
	line('Recorded here before, not seen now', report.notSeen)
	line('Removed from this screen (--prune)', report.pruned)
	line('Main example is this screen but not seen now (check by hand)', report.mainNotSeen)
	console.log(dry ? `Dry run: images and report in ${path.relative(process.cwd(), path.join(WORK, 'dry-run'))}` : 'Wrote data/tested.json, data/captures.json, data/examples.json and images.')
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('tools/capture.js'))
	main().catch(e => {
		console.error(e.message)
		process.exit(1)
	})
