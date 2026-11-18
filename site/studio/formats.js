// Import and export in the two formats Valenced reads:
//  - Legacy JSON (Vendetta/Bunny spec 2), read by the Legacy Themes plugin (themes.legacy/js/parsers.ts):
//    semanticColors: { KEY: [dark, light, midnight?] }, dark also paints Dark (darker), midnight falls back to dark.
//  - A theme plugin's ThemeColors ({ semantic: { dark, darker, light, midnight }, raw }), as in template/plugin/js/index.ts.
import { readAppearance } from './appearance.js'
import { tabPluginImports, tabPluginCode, tabPluginStart } from './tab-plugin.js'
import { HEX } from './color.js'
import { BASES, emptyTheme, normalizeTheme } from './store.js'
import { cssToHex } from './convert.js'

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
	const appearance = readAppearance(theme.meta.appearance)
	if (appearance.tabs) warnings.push('Tab styling needs the plugin export; legacy JSON cannot apply it.')
	if (appearance.background && !appearance.background.path.startsWith('http')) warnings.push('Uploaded backgrounds need the plugin export and the downloaded image asset. Legacy JSON needs a hosted image URL.')
	if (appearance.background && appearance.background.dimming !== 0.7) warnings.push('Legacy JSON cannot set surface dimming; Valenced uses 0.7. Use the plugin export to retain it.')
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
		...(appearance.background?.path.startsWith('http') ? { background: { url: appearance.background.path, alpha: appearance.background.opacity, blur: appearance.background.blur } } : {}),
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
	const appearance = readAppearance(theme.meta.appearance)
	const background = appearance.background && Object.fromEntries(Object.entries(appearance.background).filter(([key]) => key !== 'preview'))
	const exportedAppearance = { ...appearance, ...(background ? { background } : {}) }
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
${appearance.tabs ? tabPluginImports() : ''}
// @studio-appearance ${JSON.stringify(exportedAppearance)}
${appearance.tabs ? tabPluginCode(appearance.tabs) : ''}

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
			getColors: () => colors,${background ? `\n\t\t\tbackground: ${JSON.stringify(background)},` : ''}
		})
	},${appearance.tabs ? tabPluginStart : ''}
})
`
	return { text, warnings: [
		...(background && !background.path.startsWith('http') ? [`Include ${background.path} in your plugin folder. Download it from Background image.`] : []),
		...(appearance.tabs ? ['Tab styling runs while this plugin is enabled, regardless of the selected colour theme.'] : []),
	] }
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
	const trimmed = text.replace(/^﻿/, '').trim()
	if (!trimmed) throw new SourceError('The file is empty.')
	if (trimmed.startsWith('{')) {
		let json, repaired = false
		try {
			json = JSON.parse(trimmed)
		} catch (err) {
			// Hand-written themes often have comments, trailing commas or a missing comma. Vendetta-era tools
			// were forgiving about these, so fix them rather than refuse the file.
			try {
				json = JSON.parse(looseJson(trimmed))
				repaired = true
			} catch {
				throw jsonError(err, text)
			}
		}
		const result = importJson(json)
		if (repaired) result.warnings.unshift('Fixed the JSON syntax (comments, trailing or missing commas).')
		return result
	}
	return importPlugin(text)
}

function importJson(json) {
	if (!json || typeof json !== 'object' || Array.isArray(json)) throw new SourceError('This JSON is not a theme object.')
	// Same order as Kettu's parser: spec 3, spec 2, then Enmity (spec 1 or a theme_color_map)
	if (json.spec === 3 && json.main && typeof json.main === 'object') return importBunny3(json)
	if (json.spec !== 2 && !('semanticColors' in json) && (json.spec === 1 || json.theme_color_map || json.colours || json.colors)) return importEnmity(json)
	if ('semanticColors' in json || 'rawColors' in json || 'spec' in json) return importLegacy(json)
	if ('semantic' in json || 'raw' in json) return importThemeColors(json, 'ThemeColors JSON')
	throw new SourceError('This JSON has no semanticColors, rawColors or semantic fields, so it is not a theme.')
}

/** JSON with comments, trailing commas and missing commas between entries fixed. Strings are left alone. */
export function looseJson(src) {
	let out = '', i = 0
	const stack = []
	let last = '' // kind of the last token written: 'value' (string, number, literal, ] or }), 'open', ',', ':'
	const skipSpace = j => {
		for (;;) {
			while (/\s/.test(src[j] || '')) j++
			if (src[j] === '/' && src[j + 1] === '/') { while (j < src.length && src[j] !== '\n') j++; continue }
			if (src[j] === '/' && src[j + 1] === '*') { const e = src.indexOf('*/', j + 2); j = e < 0 ? src.length : e + 2; continue }
			return j
		}
	}
	while (i < src.length) {
		const c = src[i]
		if (c === '/' && (src[i + 1] === '/' || src[i + 1] === '*')) { i = skipSpace(i); continue }
		if (/\s/.test(c)) { out += c; i++; continue }
		if (c === ',') {
			// a trailing comma before } or ] is dropped
			const j = skipSpace(i + 1)
			if (src[j] !== '}' && src[j] !== ']') { out += ','; last = ',' }
			i++
			continue
		}
		// a value straight after another value is missing its comma
		const startsValue = c === '"' || c === '{' || c === '[' || /[\w.+-]/.test(c)
		if (startsValue && last === 'value') out += ','
		if (c === '"') {
			let j = i + 1
			while (j < src.length && src[j] !== '"') j += src[j] === '\\' ? 2 : 1
			out += src.slice(i, j + 1)
			i = j + 1
			last = 'value'
		} else if (/[\w.+-]/.test(c)) {
			const word = src.slice(i).match(/^[\w.+-]+/)[0]
			out += word
			i += word.length
			last = 'value'
		} else {
			out += c
			i++
			last = c === '}' || c === ']' ? 'value' : c === ':' ? ':' : 'open'
			if (c === '{' || c === '[') stack.push(c === '{' ? '}' : ']')
			// stop at the end of the theme object; anything after it (a stray brace, a code fence) is not JSON
			if ((c === '}' || c === ']') && stack.pop() && !stack.length) break
		}
	}
	// a file cut off before its closing braces
	return out + stack.reverse().join('')
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

/** Colours as Valenced hex, collecting what had to be converted. '' keeps Discord's colour. */
function colourReader(warnings) {
	const converted = new Set(), unreadable = []
	const read = (value, where) => {
		const hex = cssToHex(value)
		if (hex === null) unreadable.push(`${where} (${JSON.stringify(value)})`)
		else if (hex && !(typeof value === 'string' && HEX.test(value.trim()))) converted.add(String(value).trim().replace(/\d+(\.\d+)?/g, 'n').slice(0, 28))
		return hex || ''
	}
	read.finish = () => {
		if (converted.size) warnings.push(`Converted ${converted.size > 1 ? 'colours' : 'a colour'} Valenced can't read to hex, such as ${[...converted].slice(0, 3).join(', ')}.`)
		if (unreadable.length) warnings.push(`Skipped ${unreadable.length} unreadable colour${unreadable.length > 1 ? 's' : ''}: ${unreadable.slice(0, 4).join(', ')}${unreadable.length > 4 ? '...' : ''}`)
	}
	return read
}

function legacyMeta(theme, json, known, warnings) {
	const display = json.display && typeof json.display === 'object' ? json.display : {}
	const pick = (...v) => v.find(x => typeof x === 'string' && x.trim())
	theme.meta.name = pick(json.name, display.name) || 'Untitled theme'
	theme.meta.description = pick(json.description, display.description) || ''
	const authors = Array.isArray(json.authors) ? json.authors : Array.isArray(display.authors) ? display.authors : typeof json.author === 'string' ? [json.author] : []
	theme.meta.authors = authors.map(a => typeof a === 'string' ? { name: a } : a).filter(a => a && typeof a.name === 'string')
	theme.meta.extra = Object.fromEntries(Object.entries(json).filter(([k]) => !known.has(k)))
	if (Object.keys(theme.meta.extra).length) warnings.push(`Kept other fields as they are: ${Object.keys(theme.meta.extra).join(', ')}.`)
}

/** Vendetta, Bunny, Revenge and Kettu spec 2. Mirrors Valenced's legacyThemeColors(): dark paints Ash and Dark, midnight falls back to dark. */
export function importLegacy(json) {
	const warnings = []
	if (json.spec !== 2) warnings.push(`spec was ${JSON.stringify(json.spec)}; Valenced only imports spec 2, so exports use spec 2.`)
	if (typeof json.name !== 'string' || !json.name.trim()) warnings.push('The theme had no name, which Valenced refuses; it was given one.')
	const theme = emptyTheme()
	legacyMeta(theme, json, new Set([...LEGACY_KNOWN, 'author']), warnings)
	if (json.background?.url) {
		try { theme.meta.appearance = readAppearance({ background: { path: json.background.url, opacity: json.background.alpha, blur: json.background.blur } }) }
		catch { warnings.push('The imported background could not be previewed; its original field was kept.') }
	}
	const read = colourReader(warnings)

	const sc = json.semanticColors && typeof json.semanticColors === 'object' ? json.semanticColors : {}
	const rows = {}
	let extraValues = 0
	for (const [key, value] of Object.entries(sc)) {
		// a lone colour instead of a list
		const values = Array.isArray(value) ? value : [value]
		if (values.length > 3 && values.slice(3).some(v => cssToHex(v) && cssToHex(v) !== cssToHex(values[0]))) extraValues++
		const [d, l, m] = values.slice(0, 3).map(v => read(v, key))
		rows[key] = [d, l, values.length > 2 ? m : undefined]
	}
	if (extraValues) warnings.push(`${extraValues} key${extraValues > 1 ? 's have' : ' has'} more than three colours. Valenced reads [Ash and Dark, Light, Onyx], so the rest were left out.`)
	let onyxFollowsAsh = true
	for (const [key, [d, l, m]] of Object.entries(rows)) {
		if (d) theme.semantic.dark[key] = d
		if (l) theme.semantic.light[key] = l
		if (m !== undefined && m !== d) onyxFollowsAsh = false
	}
	theme.links = { darker: true, midnight: onyxFollowsAsh }
	if (!onyxFollowsAsh)
		for (const [key, [d, , m]] of Object.entries(rows)) {
			const mid = m === undefined ? d : m
			if (mid) theme.semantic.midnight[key] = mid
		}
	const rc = json.rawColors && typeof json.rawColors === 'object' ? json.rawColors : {}
	for (const [key, value] of Object.entries(rc)) { const hex = read(value, key); if (hex) theme.raw[key] = hex }
	read.finish()
	return { theme: normalizeTheme(theme), format: 'legacy', warnings }
}

// Discord's raw palette, for Bunny spec 3 themes that name raw colours. Set from data/tokens.json.
let rawPalette = {}
export function setRawPalette(raw) { rawPalette = raw || {} }
const withAlpha = (hex, opacity) => {
	if (!(opacity < 1)) return hex
	const base = hex.length === 9 ? parseInt(hex.slice(7), 16) / 255 : 1
	return hex.slice(0, 7) + Math.round(base * opacity * 255).toString(16).padStart(2, '0')
}

/** Bunny and Revenge spec 3: { main: { type, semantic, raw, background } }, one base per theme. */
function importBunny3(json) {
	const warnings = ['Bunny spec 3 theme, converted to the legacy format Valenced reads.']
	const theme = emptyTheme()
	legacyMeta(theme, json, new Set(['spec', 'main', 'name', 'description', 'authors', 'display', 'id', 'type']), warnings)
	const read = colourReader(warnings)
	const { main } = json
	const base = main.type === 'light' ? 'light' : 'dark'
	const rawHex = name => (typeof name === 'string' && cssToHex(rawPalette[name])) || ''
	for (const [key, def] of Object.entries(main.semantic || {})) {
		let hex = ''
		if (typeof def === 'string') hex = def.trim().startsWith('#') ? read(def, key) : rawHex(def)
		else if (def && typeof def === 'object') {
			const colour = def.type === 'raw' ? read(def.value, key) : rawHex(def.value)
			hex = colour ? withAlpha(colour, typeof def.opacity === 'number' ? def.opacity : 1) : ''
		}
		if (hex) theme.semantic[base][key] = hex
	}
	for (const [key, value] of Object.entries(main.raw || {})) { const hex = read(value, key); if (hex) theme.raw[key] = hex }
	const bg = main.background
	if (bg?.url) theme.meta.extra.background = { url: bg.url, ...(typeof bg.blur === 'number' ? { blur: bg.blur } : {}), ...(typeof bg.opacity === 'number' ? { alpha: bg.opacity } : {}) }
	theme.links = { darker: true, midnight: true }
	read.finish()
	return { theme: normalizeTheme(theme), format: 'legacy', warnings }
}

/** Enmity, as Kettu reads it: theme_color_map [dark, light], colours/colors and unsafe_colors as raw. */
function importEnmity(json) {
	const warnings = ['Enmity theme, converted to the legacy format Valenced reads.']
	const theme = emptyTheme()
	legacyMeta(theme, json, new Set(['spec', 'name', 'description', 'authors', 'author', 'theme_color_map', 'colours', 'colors', 'unsafe_colors', 'version']), warnings)
	const read = colourReader(warnings)
	for (const [key, values] of Object.entries(json.theme_color_map || {})) {
		const [d, l] = (Array.isArray(values) ? values : [values]).map(v => read(v, key))
		if (d) theme.semantic.dark[key] = d
		if (l) theme.semantic.light[key] = l
	}
	for (const [key, value] of Object.entries({ ...(json.colours || json.colors || {}), ...(json.unsafe_colors || {}) })) {
		const hex = read(value, key)
		if (hex) theme.raw[key] = hex
	}
	theme.links = { darker: true, midnight: true }
	read.finish()
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
	const appearance = text.match(/^\/\/ @studio-appearance (.+)$/m)
	if (appearance) meta.appearance = readAppearance(JSON.parse(appearance[1]))
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
