#!/usr/bin/env node
// Regenerates data/keys.json, KEYS.md and ALL-KEYS.md from tokens, resolved, tested, descriptions.
// Lists tested keys that still need a description (they stay out of keys.json until they have one).
//
// Usage: node build-docs.js [--check]   (--check: write nothing, exit 1 if outputs would change)

import fs from 'node:fs'
import path from 'node:path'
import { hasFlag } from './lib/args.js'
import { BASES, INDENT, ROOT, dataPath, readData } from './lib/data.js'

export function buildDocs() {
	const tokens = readData('tokens')
	const resolved = readData('resolved')
	const tested = readData('tested')
	const descriptions = readData('descriptions')

	const missing = []
	const gone = []
	const semantic = []
	for (const [key, t] of Object.entries(tested.semantic)) {
		const def = tokens.semantic[key]
		if (!def) {
			gone.push(`semantic/${key}`)
			continue
		}
		const d = descriptions.semantic?.[key]
		if (d?.skip) continue
		if (!d?.text || !d.area) {
			missing.push(`semantic/${key}`)
			continue
		}
		semantic.push({
			key,
			area: d.area,
			description: d.text,
			image: t.image,
			screens: Object.keys(t.screens),
			defaults: Object.fromEntries(BASES.map(b => [b, resolved.semantic[key][b]])),
			raw: Object.fromEntries(BASES.map(b => [b, def[b].raw])),
		})
	}

	const raw = []
	for (const [key, t] of Object.entries(tested.raw)) {
		if (!(key in tokens.raw)) {
			gone.push(`raw/${key}`)
			continue
		}
		const d = descriptions.raw?.[key]
		if (d?.skip) continue
		if (!d?.text) {
			missing.push(`raw/${key}`)
			continue
		}
		raw.push({
			key,
			description: d.text,
			image: t.image,
			value: tokens.raw[key],
			usedBy: Object.keys(tokens.semantic).filter(s => tokens.semantic[s].dark?.raw === key),
		})
	}

	const keys = { discord: tested.discord, base: tested.base, tested: tested.date, semantic, raw }
	const areas = descriptions.areas ?? []
	const unknownAreas = [...new Set(semantic.map(e => e.area))].filter(a => !areas.includes(a))

	return {
		keys,
		keysMd: keysMarkdown(keys, resolved, [...areas, ...unknownAreas]),
		allKeysMd: allKeysMarkdown(tokens, resolved, keys),
		missing,
		gone,
		unknownAreas,
	}
}

const cell = s => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ')
const img = image => `<img src="public/${image}" width="110">`

function keysMarkdown(keys, resolved, areas) {
	const out = [
		'# Tested keys',
		'',
		`Every key here was checked on screen: it was given its own colour on Discord ${keys.discord}, and`,
		'the examples show the affected areas in pink. Screenshots were checked on Ash; other bases',
		`have listed defaults but have not been visually verified. Last run: ${keys.tested}.`,
		'',
		'Personal text in DMs, notifications and profiles is scrambled before capture.',
		'',
		'See [ALL-KEYS.md](ALL-KEYS.md) for every key Discord has, including ones not covered here.',
		'',
	]
	for (const area of areas) {
		const rows = keys.semantic.filter(e => e.area === area)
		if (!rows.length) continue
		out.push(`## ${area}`, '', '| Key | What it colours | Ash default | Example |', '| --- | --- | --- | --- |')
		for (const e of rows) out.push(`| \`${e.key}\` | ${cell(e.description)} | \`${resolved.semantic[e.key].dark}\` | ${img(e.image)} |`)
		out.push('')
	}
	out.push(
		'## Raw colours',
		'',
		'Raw colours are the palette the semantic keys point at. Changing one changes every key that uses it,',
		'on every base. These are the ones that showed up on screen.',
		'',
		'| Raw key | What it ends up colouring | Default | Semantic keys using it on Ash | Example |',
		'| --- | --- | --- | --- | --- |',
	)
	for (const e of keys.raw) {
		const shown = e.usedBy.slice(0, 6).map(k => `\`${k}\``)
		if (e.usedBy.length > 6) shown.push(`+${e.usedBy.length - 6} more`)
		out.push(`| \`${e.key}\` | ${cell(e.description)} | \`${e.value}\` | ${shown.join(', ') || '—'} | ${img(e.image)} |`)
	}
	return `${out.join('\n')}\n`
}

function allKeysMarkdown(tokens, resolved, keys) {
	const tested = new Set(keys.semantic.map(e => e.key))
	const discord = resolved.discord ?? keys.discord
	const out = [
		'# All keys',
		'',
		`Every colour key in Discord ${discord}, with its default on each base and the raw colour it`,
		'points at. Keys marked "yes" under Tested are in [KEYS.md](KEYS.md) with an example. Unmarked keys',
		'have not been observed in the tested screens and states. This does not establish that they are unused.',
		'',
		'| Tested | Key | Ash | Dark | Light | Onyx | Raw (Ash) |',
		'| --- | --- | --- | --- | --- | --- | --- |',
	]
	for (const key of Object.keys(tokens.semantic).sort()) {
		const r = resolved.semantic[key] ?? {}
		out.push(`| ${tested.has(key) ? 'yes' : ''} | \`${key}\` | ${BASES.map(b => r[b] ?? '').join(' | ')} | ${tokens.semantic[key].dark?.raw ?? ''} |`)
	}
	const rawKeys = Object.keys(tokens.raw).sort()
	out.push('', '## Raw palette', '', `<details><summary>${rawKeys.length} raw colours</summary>`, '', '| Key | Value |', '| --- | --- |')
	for (const key of rawKeys) out.push(`| \`${key}\` | \`${tokens.raw[key]}\` |`)
	out.push('', '</details>')
	return `${out.join('\n')}\n`
}

function main() {
	const check = hasFlag('--check')
	const r = buildDocs()
	const outputs = [
		[dataPath('keys'), `${JSON.stringify(r.keys, null, INDENT.keys)}\n`, text => JSON.stringify(JSON.parse(text))],
		[path.join(ROOT, 'KEYS.md'), r.keysMd, text => text.replace(/\r\n/g, '\n')],
		[path.join(ROOT, 'ALL-KEYS.md'), r.allKeysMd, text => text.replace(/\r\n/g, '\n')],
	]
	let changed = 0
	for (const [file, text, norm] of outputs) {
		const before = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
		const same = before && norm(before) === norm(text)
		if (!same) changed++
		if (!check && !same) fs.writeFileSync(file, text)
		console.log(`${same ? 'unchanged' : check ? 'would change' : 'wrote'} ${path.relative(ROOT, file)}`)
	}
	console.log(`${r.keys.semantic.length} semantic and ${r.keys.raw.length} raw keys documented.`)
	if (r.gone.length) console.log(`\nTested keys Discord no longer has (left out; remove or rename them in data/tested.json):\n  ${r.gone.join('\n  ')}`)
	if (r.unknownAreas.length) console.log(`\nAreas not in descriptions.json "areas" (listed last): ${r.unknownAreas.join(', ')}`)
	if (r.missing.length)
		console.log(`\nNeed a description in data/descriptions.json (left out until then):\n  ${r.missing.join('\n  ')}`)
	if (check && changed) process.exitCode = 1
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('tools/build-docs.js')) main()
