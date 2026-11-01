// Import and export in the two formats Valenced reads:
//  - Legacy JSON (Vendetta/Bunny spec 2), read by the Legacy Themes plugin (themes.legacy/js/parsers.ts):
//    semanticColors: { KEY: [dark, light, midnight?] }, dark also paints Dark (darker), midnight falls back to dark.
//  - A theme plugin's ThemeColors ({ semantic: { dark, darker, light, midnight }, raw }), as in template/plugin/js/index.ts.
import { HEX } from './color.js'
import { BASES, emptyTheme, normalizeTheme } from './store.js'

const LEGACY_KNOWN = new Set(['name', 'description', 'authors', 'semanticColors', 'rawColors', 'spec'])

// ---------- export

/** Values each base really paints for a key, with links resolved the way Valenced would see the export. */
function flatten(theme) {
	const out = Object.fromEntries(BASES.map(b => [b, { ...theme.semantic[b] }]))
	for (const b of ['darker', 'midnight'])
		if (theme.links[b]) out[b] = { ...theme.semantic.dark, ...theme.semantic[b] }
	return out
}

const sortKeys = obj => Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)))

/** Legacy JSON text plus anything that could not be expressed in it. */
export function exportLegacy(theme) {
	const warnings = []
	const s = theme.semantic
	const keys = [...new Set([...Object.keys(s.dark), ...Object.keys(s.light), ...Object.keys(s.midnight), ...(theme.links.darker ? [] : Object.keys(s.darker))])].sort()

	const differs = Object.keys(s.darker).filter(k => (s.darker[k] || '') !== (s.dark[k] || ''))
	if (differs.length || !theme.links.darker)
		warnings.push(`Legacy JSON gives Dark the same colours as Ash${differs.length ? `; ${differs.length} Dark-only value${differs.length > 1 ? 's are' : ' is'} left out` : ''}. Use the plugin format to theme Dark separately.`)

	const semanticColors = {}
	for (const k of keys) {
		const d = s.dark[k] || ''
		const l = s.light[k] || ''
		// Onyx: omitted falls back to Ash, "" keeps Discord's colour
		let m
		if (s.midnight[k]) m = s.midnight[k] === d ? undefined : s.midnight[k]
		else if (theme.links.midnight) m = undefined
		else m = d ? '' : undefined
		const arr = [d, l, m]
		while (arr.length && arr[arr.length - 1] === undefined) arr.pop()
		while (arr.length > 1 && arr[arr.length - 1] === '' && arr.length !== 3) arr.pop()
		if (!arr.length || arr.every(v => !v)) continue
		semanticColors[k] = arr.map(v => v ?? '')
	}

	const { name, description, authors, extra } = theme.meta
	const json = {
		name: name || 'Untitled theme',
		description: description || '',
		authors: (authors || []).filter(a => a?.name),
		semanticColors,
		rawColors: sortKeys(theme.raw),
		...extra,
		spec: 2,
	}
	if (!json.authors.length) delete json.authors
	return { text: formatLegacy(json), warnings }
}

/** Same layout as template/legacy-theme.json: one key per line, short arrays inline. */
function formatLegacy(json) {
	const lines = ['{']
	const entries = Object.entries(json)
	entries.forEach(([k, v], i) => {
		const comma = i < entries.length - 1 ? ',' : ''
		if ((k === 'semanticColors' || k === 'rawColors') && v && typeof v === 'object') {
			const inner = Object.entries(v)
			if (!inner.length) return lines.push(`\t${JSON.stringify(k)}: {}${comma}`)
			lines.push(`\t${JSON.stringify(k)}: {`)
			inner.forEach(([ik, iv], j) => lines.push(`\t\t${JSON.stringify(ik)}: ${Array.isArray(iv) ? '[' + iv.map(x => JSON.stringify(x)).join(', ') + ']' : JSON.stringify(iv)}${j < inner.length - 1 ? ',' : ''}`))
			lines.push(`\t}${comma}`)
		} else if (k === 'authors' && Array.isArray(v)) {
			lines.push(`\t"authors": [`)
			v.forEach((a, j) => lines.push(`\t\t${JSON.stringify(a).replace(/^\{/, '{ ').replace(/\}$/, ' }').replace(/","/g, '", "').replace(/":/g, '": ')}${j < v.length - 1 ? ',' : ''}`))
			lines.push(`\t]${comma}`)
		} else {
			lines.push(`\t${JSON.stringify(k)}: ${JSON.stringify(v, null, '\t').replace(/\n/g, '\n\t')}${comma}`)
		}
	})
	lines.push('}')
	return lines.join('\n') + '\n'
}

const slug = s => (s || 'theme').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'theme'
const q = s => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

/** One-line hint from the key's documented description. */
function hint(key, descriptions) {
	const text = descriptions?.[key]?.text
	if (!text) return ''
	let first = text.split(/(?<=\.)\s/)[0].replace(/\.$/, '')
	if (first.length > 60) first = first.slice(0, 57).replace(/\s+\S*$/, '') + '...'
	return ` // ${first.charAt(0).toLowerCase()}${first.slice(1)}`
}

/** Theme plugin js/index.ts, in the starter template's style. */
export function exportPlugin(theme, descriptions) {
	const flat = flatten(theme)
	const plugin = theme.meta.plugin || {}
	const group = plugin.group || 'my-themes'
	const id = plugin.id || slug(theme.meta.name)
	const groupName = plugin.groupName || 'My Themes'
	const bases = BASES.filter(b => Object.keys(flat[b]).length)
	const block = (obj, indent) => Object.entries(sortKeys(obj)).map(([k, v]) => `${indent}${k}: ${q(v)},${hint(k, descriptions)}`).join('\n')

	const semantic = bases.map(b => `\t\t${b}: {\n${block(flat[b], '\t\t\t')}\n\t\t},`).join('\n')
	const raw = Object.keys(theme.raw).length ? `\traw: {\n${block(theme.raw, '\t\t')}\n\t},\n` : ''
	const left = BASES.filter(b => !bases.includes(b)).map(b => ({ dark: 'Ash', darker: 'Dark', light: 'Light', midnight: 'Onyx' })[b])

	const text = `/**
 * ${theme.meta.name || 'Untitled theme'}${theme.meta.description ? `. ${theme.meta.description}` : ''}
 * Made with the Valenced theme studio. Goes in the plugin template's \`themes/\` folder next to manifest.json.
 *${left.length ? ` ${left.join(', ')} ${left.length > 1 ? 'are' : 'is'} left out and keep${left.length > 1 ? '' : 's'} Discord's colours.` : ' Every base is themed.'}
 */

/// <reference types="@valenced/themes-api" />

import type { ThemeColors } from '@valenced/themes-api/types'

const colors: ThemeColors = {
	semantic: {
${semantic}
	},
${raw}}

export default plugin({
	// Registering in preInit means a picked theme is ready before Discord draws anything
	preInit({ themes }) {
		themes.registerGroup(${q(group)}, {
			name: ${q(groupName)},
		})

		themes.registerTheme(${q(group)}, ${q(id)}, {
			name: ${q(theme.meta.name || 'Untitled theme')},
			description: ${q(theme.meta.description || '')},
			getColors: () => colors,
		})
	},
})
`
	return { text, warnings: [] }
}

export function exportManifest(theme) {
	const s = slug(theme.meta.name)
	return JSON.stringify({
		format: 1,
		id: `com.example.${s}-theme`,
		name: `${theme.meta.name || 'Untitled'} Theme`,
		description: theme.meta.description || 'A colour theme for Valenced.',
		author: theme.meta.authors?.[0]?.name || 'Your Name',
		version: '1.0.0',
		dependencies: {
			'valenced.api': { version: '>=1 <2' },
			discord: { version: '*' },
			'valenced.api.themes': { version: '*' },
		},
		dist: { script: 'index.js' },
	}, null, '\t') + '\n'
}

// ---------- import

/** Works out the format from the text and converts it. Returns { theme, format, warnings } or throws a SourceError. */
export function importText(text) {
	const trimmed = text.trim()
	if (!trimmed) throw new SourceError('The file is empty.')
	if (trimmed.startsWith('{')) {
		let json
		try {
			json = JSON.parse(trimmed)
		} catch (err) {
			throw jsonError(err, text)
		}
		if (json && typeof json === 'object' && ('semanticColors' in json || 'rawColors' in json || 'spec' in json)) return importLegacy(json)
		if (json && typeof json === 'object' && ('semantic' in json || 'raw' in json)) return importThemeColors(json, 'ThemeColors JSON')
		throw new SourceError('This JSON has no semanticColors, rawColors or semantic fields, so it is not a Valenced theme.')
	}
	return importPlugin(text)
}

export class SourceError extends Error {
	constructor(message, line) {
		super(message)
		this.line = line
	}
}

function jsonError(err, text) {
	const pos = +(err.message.match(/position (\d+)/)?.[1] ?? NaN)
	let line = +(err.message.match(/line (\d+)/)?.[1] ?? NaN)
	if (Number.isNaN(line) && !Number.isNaN(pos)) line = text.slice(0, pos).split('\n').length
	return new SourceError(`JSON error: ${err.message.replace(/^JSON\.parse: /, '')}`, Number.isNaN(line) ? undefined : line)
}

/** Mirrors legacyThemeColors(): dark paints Ash and Dark, midnight falls back to dark. */
export function importLegacy(json) {
	const warnings = []
	if (json.spec !== 2) warnings.push(`spec is ${JSON.stringify(json.spec)}; Valenced only imports spec 2. Exports will use spec 2.`)
	if (typeof json.name !== 'string') warnings.push('The theme has no name; Valenced refuses themes without one.')
	const theme = emptyTheme()
	theme.meta.name = typeof json.name === 'string' ? json.name : 'Untitled theme'
	theme.meta.description = typeof json.description === 'string' ? json.description : ''
	theme.meta.authors = Array.isArray(json.authors) ? json.authors : []
	theme.meta.extra = Object.fromEntries(Object.entries(json).filter(([k]) => !LEGACY_KNOWN.has(k)))

	const sc = json.semanticColors && typeof json.semanticColors === 'object' ? json.semanticColors : {}
	let onyxFollowsAsh = true
	for (const [key, values] of Object.entries(sc)) {
		if (!Array.isArray(values)) {
			warnings.push(`${key} is not a list of colours; it was skipped.`)
			continue
		}
		const [d, l, m] = values
		if (d) theme.semantic.dark[key] = String(d)
		if (l) theme.semantic.light[key] = String(l)
		if (m !== undefined && m !== null && m !== d) onyxFollowsAsh = false
	}
	theme.links = { darker: true, midnight: onyxFollowsAsh }
	if (!onyxFollowsAsh)
		for (const [key, values] of Object.entries(sc)) {
			if (!Array.isArray(values)) continue
			const mid = values[2] ?? values[0]
			if (mid) theme.semantic.midnight[key] = String(mid)
		}
	const rc = json.rawColors && typeof json.rawColors === 'object' ? json.rawColors : {}
	for (const [key, value] of Object.entries(rc)) theme.raw[key] = String(value)
	if (Object.keys(theme.meta.extra).length) warnings.push(`Kept other fields as they are: ${Object.keys(theme.meta.extra).join(', ')}.`)
	return { theme: normalizeTheme(theme), format: 'legacy', warnings }
}

function importThemeColors(colors, format, meta = {}) {
	const theme = emptyTheme()
	Object.assign(theme.meta, meta)
	const warnings = []
	for (const b of BASES) {
		const values = colors.semantic?.[b]
		if (values && typeof values === 'object') for (const [k, v] of Object.entries(values)) theme.semantic[b][k] = String(v)
	}
	for (const b of Object.keys(colors.semantic || {})) if (!BASES.includes(b)) warnings.push(`Unknown base "${b}" was skipped; bases are dark, darker, light and midnight.`)
	for (const [k, v] of Object.entries(colors.raw || {})) theme.raw[k] = String(v)
	// A base identical to Ash is shown as following Ash; anything else stays separate, as Valenced treats it
	for (const b of ['darker', 'midnight']) {
		const same = sameValues(theme.semantic[b], theme.semantic.dark) && Object.keys(theme.semantic.dark).length
		theme.links[b] = !!same
		if (same) theme.semantic[b] = {}
	}
	return { theme: normalizeTheme(theme), format, warnings }
}

const sameValues = (a, b) => {
	const ka = Object.keys(a), kb = Object.keys(b)
	return ka.length === kb.length && ka.every(k => a[k] === b[k])
}

/** Reads ThemeColors out of a plugin's index.ts without running it. Values must be plain strings. */
export function importPlugin(text) {
	const clean = stripComments(text)
	const warnings = []
	const semantic = findObject(clean, /\bsemantic\s*:\s*\{/)
	const raw = findObject(clean, /\braw\s*:\s*\{/)
	if (!semantic && !raw) throw new SourceError('Could not find a `semantic: { ... }` or `raw: { ... }` object. Paste a theme plugin index.ts, a legacy theme JSON, or a ThemeColors JSON.')
	const colors = {}
	if (semantic) colors.semantic = parseObject(semantic, warnings)
	if (raw) colors.raw = parseObject(raw, warnings)

	const meta = {}
	const reg = clean.match(/registerTheme\(\s*(['"`])(.*?)\1\s*,\s*(['"`])(.*?)\3\s*,\s*\{/)
	if (reg) {
		const opts = findObject(clean.slice(reg.index), /registerTheme\([^{]*\{/)
		const name = opts?.text.match(/\bname\s*:\s*(['"`])((?:\\.|(?!\1).)*)\1/)
		const desc = opts?.text.match(/\bdescription\s*:\s*(['"`])((?:\\.|(?!\1).)*)\1/)
		if (name) meta.name = unescape(name[2])
		if (desc) meta.description = unescape(desc[2])
		const group = clean.match(/registerGroup\(\s*(['"`])(.*?)\1\s*,\s*\{[^}]*?\bname\s*:\s*(['"`])((?:\\.|(?!\3).)*)\3/)
		meta.plugin = { group: reg[2], id: reg[4], groupName: group ? unescape(group[4]) : reg[2] }
	}
	const result = importThemeColors(colors, 'plugin', meta)
	result.warnings.unshift(...warnings)
	return result
}

const unescape = s => s.replace(/\\(.)/g, '$1')

function stripComments(src) {
	let out = '', i = 0
	while (i < src.length) {
		const c = src[i]
		if (c === '"' || c === "'" || c === '`') {
			let j = i + 1
			while (j < src.length && src[j] !== c) j += src[j] === '\\' ? 2 : 1
			out += src.slice(i, j + 1)
			i = j + 1
		} else if (c === '/' && src[i + 1] === '/') {
			while (i < src.length && src[i] !== '\n') i++
		} else if (c === '/' && src[i + 1] === '*') {
			const end = src.indexOf('*/', i + 2)
			out += src.slice(i, end < 0 ? src.length : end + 2).replace(/[^\n]/g, ' ')
			i = end < 0 ? src.length : end + 2
		} else out += src[i++]
	}
	return out
}

/** The balanced { ... } that follows the first match of `re`. */
function findObject(src, re) {
	const m = re.exec(src)
	if (!m) return null
	const start = m.index + m[0].length - 1
	let depth = 0
	for (let i = start; i < src.length; i++) {
		const c = src[i]
		if (c === '"' || c === "'" || c === '`') {
			let j = i + 1
			while (j < src.length && src[j] !== c) j += src[j] === '\\' ? 2 : 1
			i = j
		} else if (c === '{') depth++
		else if (c === '}' && !--depth) return { text: src.slice(start, i + 1), start }
	}
	throw new SourceError('An object is missing its closing brace.', src.slice(0, start).split('\n').length)
}

/** Object literal of string values (one level of nesting for bases). Other expressions are reported. */
function parseObject({ text }, warnings) {
	let i = 0
	const ws = () => { while (/\s|,/.test(text[i] || '')) i++ }
	function value() {
		ws()
		const c = text[i]
		if (c === '{') return object()
		if (c === '"' || c === "'" || c === '`') {
			let j = i + 1, s = ''
			while (j < text.length && text[j] !== c) {
				if (text[j] === '\\') { s += text[j + 1]; j += 2 } else s += text[j++]
			}
			i = j + 1
			if (c === '`' && s.includes('${')) return { unsupported: s }
			return s
		}
		// an expression such as discord.raw.BLURPLE_50: skip to the end of the entry
		let j = i, depth = 0
		while (j < text.length && !(depth === 0 && (text[j] === ',' || text[j] === '}'))) {
			if ('([{'.includes(text[j])) depth++
			if (')]}'.includes(text[j])) depth--
			j++
		}
		const expr = text.slice(i, j).trim()
		i = j
		return { unsupported: expr }
	}
	function object() {
		const obj = {}
		i++ // {
		for (;;) {
			ws()
			if (text[i] === '}') { i++; return obj }
			if (i >= text.length) return obj
			if (text.startsWith('...', i)) {
				const v = value()
				warnings.push(`Skipped a spread (${String(v.unsupported || '').slice(3) || '...'}); only literal colours can be imported.`)
				continue
			}
			let key
			const m = text.slice(i).match(/^(?:(['"])((?:\\.|(?!\1).)*)\1|([A-Za-z_$][\w$]*))\s*:/)
			if (!m) {
				const line = text.slice(0, i).split('\n').length
				throw new SourceError(`Unexpected "${text.slice(i, i + 20).split('\n')[0]}" in the colours object.`, line)
			}
			key = m[2] ?? m[3]
			i += m[0].length
			const v = value()
			if (v && typeof v === 'object' && 'unsupported' in v) warnings.push(`${key} is set to \`${v.unsupported}\`, which needs the plugin to run. It was skipped; set a hex colour instead.`)
			else obj[key] = v
		}
	}
	return object()
}

/** Checks a source text and returns problems without changing anything. */
export function validate(text) {
	try {
		const result = importText(text)
		const problems = []
		for (const b of BASES)
			for (const [k, v] of Object.entries(result.theme.semantic[b])) if (!HEX.test(v)) problems.push(`${k}: "${v}" is not a hex colour`)
		for (const [k, v] of Object.entries(result.theme.raw)) if (!HEX.test(v)) problems.push(`${k}: "${v}" is not a hex colour`)
		return { ok: true, ...result, problems }
	} catch (err) {
		return { ok: false, error: err.message, line: err.line }
	}
}
