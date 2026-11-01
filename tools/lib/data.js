import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
export const DATA = path.join(ROOT, 'data')
export const PUBLIC = path.join(ROOT, 'public')
export const WORK = path.join(ROOT, 'tools', '.work')

/** Discord's theme ids, in the order the site lists them: Ash, Dark, Light, Onyx. */
export const BASES = ['dark', 'darker', 'light', 'midnight']
export const BASE_NAMES = { dark: 'Ash', darker: 'Dark', light: 'Light', midnight: 'Onyx' }
export const KINDS = ['semantic', 'raw']

/** The colour keys are set to while capturing. Matches the existing screenshots. */
export const PINK = '#ff65c5'

export const byName = (a, b) => a.localeCompare(b, 'en')

export function dataPath(name) {
	return path.join(DATA, `${name}.json`)
}

export function readData(name, fallback) {
	const file = dataPath(name)
	if (!fs.existsSync(file)) {
		if (fallback !== undefined) return fallback
		throw new Error(`missing ${path.relative(ROOT, file)}`)
	}
	return JSON.parse(fs.readFileSync(file, 'utf8'))
}

/** Writes data/NAME.json. `indent` 0 writes one line like tokens.json and resolved.json. */
export function writeData(name, value, indent) {
	const text = indent ? `${JSON.stringify(value, null, indent)}\n` : JSON.stringify(value)
	fs.writeFileSync(dataPath(name), text)
}

// Indentation each generated file has used so far.
export const INDENT = { tokens: 0, resolved: 0, keys: '\t', tested: 1, captures: 2, examples: 2 }

export function sortObject(obj, compare = byName) {
	return Object.fromEntries(Object.keys(obj).sort(compare).map(k => [k, obj[k]]))
}

export function today() {
	const d = new Date()
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** `#rrggbb` + alpha from an opacity, alpha omitted when opaque. Matches resolved.json. */
export function withOpacity(hex, opacity) {
	let out = hex.slice(0, 7).toLowerCase()
	const a = Math.round(opacity * 255)
	if (a < 255) out += a.toString(16).padStart(2, '0')
	return out
}

/** Resolves semantic defaults from tokens.json the way Discord does for plain (non-gradient) themes. */
export function resolveFromTokens(tokens) {
	const out = {}
	for (const [name, def] of Object.entries(tokens.semantic)) {
		out[name] = {}
		for (const base of BASES) {
			const ref = def[base]
			const raw = ref && tokens.raw[ref.raw]
			out[name][base] = raw ? withOpacity(raw, ref.opacity ?? 1) : null
		}
	}
	return out
}

/** Description lookup: { area?, text?, skip? } or undefined. */
export function descriptionOf(descriptions, kind, key) {
	return descriptions[kind]?.[key]
}
