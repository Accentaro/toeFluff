// Updates themes made for older Discord builds and other mods (Vendetta, Bunny, Revenge, Kettu/Rain, Enmity) so they
// look on Valenced the way they did when they were made.
//
// 1. Raw names from other mods are renamed (PRIMARY_DARK_* and BRAND_NEW_*).
// 2. Old semantic keys move to their current names (migrations.js), without overwriting keys the theme sets itself.
// 3. Raw overrides are replayed against the old bindings. Discord 352 paints most surfaces from NEUTRAL_* instead of
//    PRIMARY_*, so a theme that recoloured PRIMARY_600 changes almost nothing now. For every key the old build had,
//    the colour the theme gave it then is pinned on the key, wherever today's build would show something else.
// 4. Keys Discord no longer has are removed.
import { HEX, parse, toHex } from './color.js'
import { MIGRATIONS, renameRaw } from './migrations.js'

const own = (o, k) => Object.hasOwn(o, k)

// CSS named colours that turn up in themes (chroma.js accepted all of them in Vendetta and Bunny)
const NAMED = {
	transparent: '#00000000', black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000', lime: '#00ff00', blue: '#0000ff',
	yellow: '#ffff00', cyan: '#00ffff', aqua: '#00ffff', magenta: '#ff00ff', fuchsia: '#ff00ff', gray: '#808080', grey: '#808080',
	silver: '#c0c0c0', maroon: '#800000', olive: '#808000', navy: '#000080', purple: '#800080', teal: '#008080', orange: '#ffa500',
	pink: '#ffc0cb', hotpink: '#ff69b4', deeppink: '#ff1493', gold: '#ffd700', violet: '#ee82ee', indigo: '#4b0082', crimson: '#dc143c',
	darkgray: '#a9a9a9', darkgrey: '#a9a9a9', lightgray: '#d3d3d3', lightgrey: '#d3d3d3', dimgray: '#696969', dimgrey: '#696969',
	whitesmoke: '#f5f5f5', gainsboro: '#dcdcdc', lavender: '#e6e6fa', coral: '#ff7f50', salmon: '#fa8072', tomato: '#ff6347',
	orchid: '#da70d6', plum: '#dda0dd', skyblue: '#87ceeb', lightblue: '#add8e6', royalblue: '#4169e1', slateblue: '#6a5acd',
	midnightblue: '#191970', darkblue: '#00008b', darkred: '#8b0000', darkgreen: '#006400', turquoise: '#40e0d0', beige: '#f5f5dc',
}

/**
 * Any colour a theme might contain, as Valenced hex. Returns '' for "no colour" (false, empty, null), which keeps
 * Discord's colour, or null when it cannot be read.
 */
export function cssToHex(value) {
	if (value === false || value === null || value === undefined) return ''
	if (typeof value !== 'string') return null
	const s = value.trim().toLowerCase()
	if (!s || s === 'false' || s === 'none' || s === 'default') return ''
	if (HEX.test(s)) return s.length === 4 ? toHex(parse(s)) : s
	if (own(NAMED, s)) return NAMED[s]
	const c = parse(s)
	return c ? toHex(c) : null
}

const withOpacity = (hex, opacity = 1) => {
	const c = parse(hex)
	if (!c) return null
	return toHex({ ...c, a: c.a * opacity })
}
const same = (a, b) => (a || '').toLowerCase() === (b || '').toLowerCase()

/**
 * Whether a theme's raw overrides were written for the old palette. Raws only old builds bind to (PRIMARY_600) say
 * yes; raws only today's build binds to (NEUTRAL_69) say no, and such a theme is left exactly as it is.
 */
function targetsOldPalette(raw, tokens, history) {
	const usedNow = new Set(), usedThen = new Set()
	for (const def of Object.values(tokens.semantic)) for (const b of Object.values(def)) if (b?.raw) usedNow.add(b.raw)
	for (const s of history.snapshots) for (const def of Object.values(s.semantic)) for (const b of Object.values(def)) if (b?.[1]?.raw) usedThen.add(b[1].raw)
	let old = 0, current = 0
	for (const key of Object.keys(raw)) {
		if (usedThen.has(key) && !usedNow.has(key)) old++
		else if (usedNow.has(key) && !usedThen.has(key)) current++
	}
	return old > current
}

/** True when modernize() would change anything; cheap enough to run on every import. */
export function needsUpdate(theme, tokens, history) {
	const r = modernize(theme, tokens, history)
	return r.report.changes > 0
}

/**
 * Returns { theme, report }. `history` is token-history.json; without it, step 3 is skipped.
 * report: { renamed: [{from, to: []}], rawRenamed: [[from, to]], pinned, removed: [key], changes }
 */
export function modernize(theme, tokens, history) {
	const next = structuredClone(theme)
	const report = { renamed: [], rawRenamed: [], pinned: 0, unpinned: 0, removed: [], changes: 0 }

	// 1. raw names from other mods
	for (const [key, value] of Object.entries(theme.raw)) {
		if (own(tokens.raw, key)) continue
		const to = renameRaw(key)
		if (to && own(tokens.raw, to)) {
			if (!own(theme.raw, to)) next.raw[to] = value
			delete next.raw[key]
			report.rawRenamed.push([key, to])
		}
	}

	// Onyx follows Ash in a legacy theme. Replaying bindings below treats Onyx on its own (it used different raw
	// colours), so give it Ash's explicit values first, exactly as Valenced would read them.
	if (next.links.midnight) {
		next.semantic.midnight = { ...next.semantic.dark, ...next.semantic.midnight }
		next.links.midnight = false
	}

	// 2. old semantic keys, per base
	const order = Object.keys(MIGRATIONS)
	const won = {}
	for (const base of Object.keys(next.semantic)) {
		const dict = next.semantic[base]
		const original = { ...dict }
		const claims = {}
		for (const key of Object.keys(original)) {
			if (own(tokens.semantic, key) || !own(MIGRATIONS, key)) continue
			MIGRATIONS[key].forEach((target, i) => {
				if (!own(tokens.semantic, target) || own(original, target)) return
				const rank = i * 1000 + order.indexOf(key)
				if (!claims[target] || rank < claims[target].rank) claims[target] = { rank, from: key, value: original[key] }
			})
		}
		for (const [target, claim] of Object.entries(claims)) {
			dict[target] = claim.value
			;(won[claim.from] ??= new Set()).add(target)
		}
		for (const key of Object.keys(original)) if (!own(tokens.semantic, key) && own(MIGRATIONS, key)) delete dict[key]
	}
	for (const [from, targets] of Object.entries(won)) report.renamed.push({ from, to: [...targets] })

	// 3. replay raw overrides on the bindings the theme was made for
	if (history?.snapshots?.length && Object.keys(next.raw).length && targetsOldPalette(next.raw, tokens, history)) {
		const snaps = [...history.snapshots].reverse() // newest first
		const bases = ['dark', 'light', 'midnight', ...(next.links.darker ? [] : ['darker'])]
		for (const [key, now] of Object.entries(tokens.semantic)) {
			const snap = snaps.find(s => own(s.semantic, key))
			if (!snap) continue
			for (const base of bases) {
				const dict = next.semantic[base]
				if (own(dict, key)) continue
				const old = snap.semantic[key][base]?.[1], cur = now[base]
				if (!old?.raw || !cur?.raw) continue
				const themedThen = own(next.raw, old.raw) ? withOpacity(next.raw[old.raw], old.opacity ?? 1) : null
				const themedNow = own(next.raw, cur.raw) ? withOpacity(next.raw[cur.raw], cur.opacity ?? 1) : null
				if (!themedThen && !themedNow) continue
				const stock = withOpacity(tokens.raw[cur.raw], cur.opacity ?? 1)
				const want = themedThen ?? stock // the theme left this key alone then, so keep Discord's look
				const got = themedNow ?? stock
				if (!want || same(want, got)) continue
				dict[key] = want
				if (themedThen) report.pinned++
				else report.unpinned++
			}
		}
	}

	// Onyx values identical to Ash collapse back to "follows Ash"
	const d = next.semantic.dark, m = next.semantic.midnight
	if (Object.keys(m).length === Object.keys(d).length && Object.entries(m).every(([k, v]) => same(d[k], v))) {
		next.semantic.midnight = {}
		next.links.midnight = true
	}

	// 4. keys Discord no longer has
	const removed = new Set()
	for (const dict of Object.values(next.semantic))
		for (const key of Object.keys(dict)) if (!own(tokens.semantic, key)) { delete dict[key]; removed.add(key) }
	for (const key of Object.keys(next.raw)) if (!own(tokens.raw, key)) { delete next.raw[key]; removed.add(`raw ${key}`) }
	report.removed = [...removed].sort()

	report.changes = report.renamed.length + report.rawRenamed.length + report.pinned + report.unpinned + report.removed.length
	return { theme: next, report }
}
