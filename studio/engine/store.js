// The one theme state shared by the editor, the docs and the preview.
// Colours resolve exactly like Discord + Valenced: a theme's semantic value wins for its base, otherwise the
// semantic token's raw colour (theme raw override, else Discord's) at the token's opacity.
import { HEX } from './color.js'

export const BASES = ['dark', 'darker', 'light', 'midnight']
export const BASE_NAMES = { dark: 'Ash', darker: 'Dark', light: 'Light', midnight: 'Onyx' }
/** Bases that can follow Ash. Legacy JSON themes always share Ash with Dark, and Onyx falls back to Ash. */
export const LINKABLE = ['darker', 'midnight']

const STORE_KEY = 'valenced-studio:theme'
const HISTORY_LIMIT = 200

export function emptyTheme() {
	return {
		meta: { name: 'Untitled theme', description: '', authors: [{ name: 'Your Name', id: '0' }], extra: {} },
		semantic: { dark: {}, darker: {}, light: {}, midnight: {} },
		raw: {},
		links: { darker: true, midnight: true },
	}
}

/** Fills in anything missing so older saves and imports always have the full shape. */
export function normalizeTheme(t) {
	const base = emptyTheme()
	return {
		meta: { ...base.meta, ...(t?.meta || {}), extra: { ...(t?.meta?.extra || {}) } },
		semantic: Object.fromEntries(BASES.map(b => [b, { ...(t?.semantic?.[b] || {}) }])),
		raw: { ...(t?.raw || {}) },
		links: { ...base.links, ...(t?.links || {}) },
	}
}

const alphaHex = n => Math.round(n * 255).toString(16).padStart(2, '0')

export function createStore({ tokens, initialTheme, persistent = true }) {
	const saved = persistent && load()
	let hasTheme = !!(initialTheme || saved)
	let theme = initialTheme ? normalizeTheme(initialTheme) : saved || emptyTheme()
	let base = 'dark'
	const undoStack = [], redoStack = []
	let lastCoalesce = null, lastTime = 0
	const listeners = {}

	// raw name -> semantic keys that point at it, per base
	const rawUsers = Object.fromEntries(BASES.map(b => [b, {}]))
	for (const [key, def] of Object.entries(tokens.semantic))
		for (const b of BASES) if (def[b]) (rawUsers[b][def[b].raw] ??= []).push(key)

	const emit = (name, detail) => (listeners[name] || []).forEach(fn => fn(detail))
	const isKnownSemantic = key => key in tokens.semantic
	const isKnownRaw = key => key in tokens.raw

	function load() {
		try {
			const saved = JSON.parse(localStorage.getItem(STORE_KEY))
			return saved ? normalizeTheme(saved) : null
		} catch {
			return null
		}
	}

	let saveTimer
	function persist() {
		hasTheme = true
		if (!persistent) return
		clearTimeout(saveTimer)
		emit('saving')
		saveTimer = setTimeout(() => {
			try {
				localStorage.setItem(STORE_KEY, JSON.stringify(theme))
				emit('saved', { ok: true })
			} catch (err) {
				emit('saved', { ok: false, error: err.message })
			}
		}, 250)
	}

	/** Raw palette value with the theme's override, if Valenced would apply it. */
	function rawValue(name) {
		const own = theme.raw[name]
		if (own && HEX.test(own) && isKnownRaw(name)) return { value: expand(own), source: 'theme' }
		return { value: tokens.raw[name], source: 'default' }
	}

	/** Discord's resolution of a semantic token (resolveSemanticColor), honouring raw overrides. */
	function tokenValue(key, b) {
		const tk = tokens.semantic[key]?.[b]
		if (!tk) return { value: undefined }
		const raw = rawValue(tk.raw)
		if (!raw.value) return { value: undefined, raw: tk.raw, opacity: tk.opacity }
		const value = tk.opacity >= 1 ? raw.value : raw.value.slice(0, 7) + alphaHex(tk.opacity)
		return { value, raw: tk.raw, opacity: tk.opacity, rawSource: raw.source }
	}

	/**
	 * Full picture of one semantic key on a base: the value painted, where it came from, and Discord's default.
	 * source: 'theme' (set on this base), 'linked' (follows Ash), 'raw' (default token, but its raw colour is themed) or 'default'.
	 */
	function semanticInfo(key, b = base) {
		const own = theme.semantic[b]?.[key]
		const token = tokenValue(key, b)
		const def = defaultSemantic(key, b)
		const info = { key, base: b, default: def, token, own, invalid: own != null && !HEX.test(own) }
		if (own && HEX.test(own)) return { ...info, value: expand(own), source: 'theme' }
		if (b !== 'dark' && theme.links[b]) {
			const ash = theme.semantic.dark[key]
			if (ash && HEX.test(ash)) return { ...info, value: expand(ash), source: 'linked' }
		}
		return { ...info, value: token.value, source: token.rawSource === 'theme' ? 'raw' : 'default' }
	}

	function defaultSemantic(key, b) {
		const tk = tokens.semantic[key]?.[b]
		if (!tk) return undefined
		const raw = tokens.raw[tk.raw]
		return raw && (tk.opacity >= 1 ? raw : raw.slice(0, 7) + alphaHex(tk.opacity))
	}

	function rawInfo(name) {
		const own = theme.raw[name]
		const r = rawValue(name)
		return { key: name, default: tokens.raw[name], own, invalid: own != null && !HEX.test(own), unknown: !isKnownRaw(name), value: r.value, source: r.source }
	}

	function snapshot() {
		return JSON.stringify(theme)
	}

	function record(coalesce) {
		const now = performance.now()
		if (coalesce && coalesce === lastCoalesce && now - lastTime < 900) {
			lastTime = now
			return
		}
		undoStack.push(snapshot())
		if (undoStack.length > HISTORY_LIMIT) undoStack.shift()
		redoStack.length = 0
		lastCoalesce = coalesce
		lastTime = now
	}

	/** Every semantic key whose painted colour may change when `name` (raw) changes. */
	function usersOfRaw(name) {
		const set = new Set()
		for (const b of BASES) for (const k of rawUsers[b][name] || []) set.add(k)
		return set
	}

	const store = {
		tokens,
		get theme() { return theme },
		get hasTheme() { return hasTheme },
		get base() { return base },
		set base(b) {
			if (!BASES.includes(b) || b === base) return
			base = b
			emit('base', b)
			emit('change', { all: true })
		},
		isKnownSemantic,
		isKnownRaw,
		semanticInfo,
		rawInfo,
		usersOfRaw,
		rawUsers,
		/** The colour a semantic key paints on the current base. */
		color: (key, b = base) => semanticInfo(key, b).value,
		rawColor: name => rawValue(name).value,

		on(name, fn) {
			(listeners[name] ??= []).push(fn)
			return () => (listeners[name] = listeners[name].filter(f => f !== fn))
		},

		/** Sets (or with null, clears) a semantic value on one base. */
		setSemantic(key, value, b = base, { coalesce } = {}) {
			const current = theme.semantic[b][key]
			if ((current ?? null) === (value ?? null)) return
			record(coalesce && `s:${b}:${key}:${coalesce}`)
			if (value == null) delete theme.semantic[b][key]
			else theme.semantic[b][key] = value
			persist()
			emit('change', { semantic: [key], base: b })
		},

		setRaw(name, value, { coalesce } = {}) {
			const current = theme.raw[name]
			if ((current ?? null) === (value ?? null)) return
			record(coalesce && `r:${name}:${coalesce}`)
			if (value == null) delete theme.raw[name]
			else theme.raw[name] = value
			persist()
			emit('change', { raw: [name], semantic: [...usersOfRaw(name)] })
		},

		/** Resets a key on every base. */
		resetSemanticAll(key) {
			if (!BASES.some(b => key in theme.semantic[b])) return
			record()
			for (const b of BASES) delete theme.semantic[b][key]
			persist()
			emit('change', { semantic: [key] })
		},

		setLink(b, on) {
			if (!LINKABLE.includes(b) || theme.links[b] === on) return
			record()
			theme.links[b] = on
			persist()
			emit('change', { all: true })
		},

		setMeta(patch, { coalesce } = {}) {
			record(coalesce && `meta:${coalesce}`)
			theme.meta = { ...theme.meta, ...patch }
			persist()
			emit('meta')
		},

		/** Replaces the whole theme (import, template, new). Undoable. */
		replace(next, label, { coalesce } = {}) {
			record(coalesce && `replace:${coalesce}`)
			theme = normalizeTheme(next)
			persist()
			emit('change', { all: true, label })
			emit('meta')
		},

		undo() {
			if (!undoStack.length) return false
			redoStack.push(snapshot())
			theme = normalizeTheme(JSON.parse(undoStack.pop()))
			lastCoalesce = null
			persist()
			emit('change', { all: true, history: true })
			emit('meta')
			return true
		},
		redo() {
			if (!redoStack.length) return false
			undoStack.push(snapshot())
			theme = normalizeTheme(JSON.parse(redoStack.pop()))
			lastCoalesce = null
			persist()
			emit('change', { all: true, history: true })
			emit('meta')
			return true
		},
		get canUndo() { return undoStack.length > 0 },
		get canRedo() { return redoStack.length > 0 },

		/** Ends colour-drag coalescing so the next edit starts a fresh undo step. */
		commit() { lastCoalesce = null },

		/** Keys with a value on any base, plus raw overrides. */
		modified() {
			const semantic = new Set()
			for (const b of BASES) for (const k in theme.semantic[b]) semantic.add(k)
			return { semantic, raw: new Set(Object.keys(theme.raw)) }
		},

		/** Imported entries Valenced would ignore, so the UI can flag them instead of dropping them. */
		problems() {
			const out = []
			for (const b of BASES)
				for (const [k, v] of Object.entries(theme.semantic[b])) {
					if (!isKnownSemantic(k)) out.push({ kind: 'semantic', key: k, base: b, issue: 'unknown', message: `${k} is not a semantic key in Discord ${VTVersion()}. Kept, but it may do nothing.` })
					if (!HEX.test(v)) out.push({ kind: 'semantic', key: k, base: b, issue: 'invalid', message: `${k} (${b}) has "${v}", which is not #RGB, #RRGGBB or #RRGGBBAA. Valenced skips it.` })
				}
			for (const [k, v] of Object.entries(theme.raw)) {
				if (!isKnownRaw(k)) out.push({ kind: 'raw', key: k, issue: 'unknown', message: `${k} is not a raw colour in Discord ${VTVersion()}. Valenced skips unknown raw names.` })
				if (!HEX.test(v)) out.push({ kind: 'raw', key: k, issue: 'invalid', message: `${k} has "${v}", which is not a valid hex colour. Valenced skips it.` })
			}
			return out
		},
	}
	return store
}

const VTVersion = () => globalThis.window?.VT?.data?.discord || 'this build'

/** #RGB to #RRGGBB, so CSS and comparisons see one form. */
export function expand(hex) {
	if (hex.length === 4) return '#' + [...hex.slice(1)].map(c => c + c).join('')
	return hex.toLowerCase()
}
