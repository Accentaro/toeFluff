// Colour parsing and formatting. Valenced only accepts hex, so everything is stored as #RRGGBB or #RRGGBBAA;
// other formats are accepted as input and offered as read-outs.

/** Valenced's own check, from themes.legacy/js/parsers.ts. */
export const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i

const clamp = (n, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n))
const h2 = n => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0')

/** Parses hex (3/4/6/8 digits), rgb(a)() or hsl(a)(). Returns {r,g,b,a} with r,g,b 0-255 and a 0-1, or null. */
export function parse(input) {
	if (typeof input !== 'string') return null
	const s = input.trim().toLowerCase()
	let m = s.match(/^#?([0-9a-f]{3,8})$/)
	if (m && [3, 4, 6, 8].includes(m[1].length)) {
		let h = m[1]
		if (h.length < 5) h = [...h].map(c => c + c).join('')
		return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 }
	}
	m = s.match(/^rgba?\(\s*([\d.]+)%?[\s,]+([\d.]+)%?[\s,]+([\d.]+)%?(?:[\s,/]+([\d.]+)(%?))?\s*\)$/)
	if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : clamp(m[5] ? m[4] / 100 : +m[4]) }
	m = s.match(/^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%?[\s,]+([\d.]+)%?(?:[\s,/]+([\d.]+)(%?))?\s*\)$/)
	if (m) return { ...hslToRgb(+m[1], m[2] / 100, m[3] / 100), a: m[4] === undefined ? 1 : clamp(m[5] ? m[4] / 100 : +m[4]) }
	return null
}

/** #RRGGBB, or #RRGGBBAA when not fully opaque. */
export function toHex({ r, g, b, a = 1 }) {
	const alpha = Math.round(clamp(a) * 255)
	return '#' + h2(r) + h2(g) + h2(b) + (alpha < 255 ? h2(alpha) : '')
}

/** Normalises any accepted input to Valenced hex, or null. */
export const normalize = input => {
	const c = parse(input)
	return c ? toHex(c) : null
}

export function hslToRgb(h, s, l) {
	h = ((h % 360) + 360) % 360
	const k = n => (n + h / 30) % 12
	const f = n => l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))
	return { r: f(0) * 255, g: f(8) * 255, b: f(4) * 255 }
}

export function rgbToHsv({ r, g, b }) {
	r /= 255; g /= 255; b /= 255
	const max = Math.max(r, g, b), d = max - Math.min(r, g, b)
	let h = 0
	if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
	return { h: (h * 60 + 360) % 360, s: max ? d / max : 0, v: max }
}

export function hsvToRgb(h, s, v) {
	const f = n => {
		const k = (n + h / 60) % 6
		return v - v * s * Math.max(0, Math.min(k, 4 - k, 1))
	}
	return { r: f(5) * 255, g: f(3) * 255, b: f(1) * 255 }
}

export function rgbToHsl({ r, g, b }) {
	r /= 255; g /= 255; b /= 255
	const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min
	let h = 0
	if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
	return { h: (h * 60 + 360) % 360, s: d ? d / (1 - Math.abs(2 * l - 1)) : 0, l }
}

const n1 = x => +x.toFixed(2)
export function format(hex, mode) {
	const c = parse(hex)
	if (!c) return ''
	if (mode === 'rgb') return c.a < 1 ? `rgba(${c.r}, ${c.g}, ${c.b}, ${n1(c.a)})` : `rgb(${c.r}, ${c.g}, ${c.b})`
	if (mode === 'hsl') {
		const { h, s, l } = rgbToHsl(c)
		const body = `${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`
		return c.a < 1 ? `hsla(${body}, ${n1(c.a)})` : `hsl(${body})`
	}
	return toHex(c)
}

/** Relative luminance, for picking readable text over a swatch. */
export function luminance(hex) {
	const c = parse(hex)
	if (!c) return 0
	const lin = v => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
	return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b)
}

/** WCAG contrast of two opaque colours. */
export function contrast(a, b) {
	const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
	return (x + 0.05) / (y + 0.05)
}

/** Composites a translucent colour over an opaque one. */
export function over(top, bottom) {
	const t = parse(top), b = parse(bottom)
	if (!t || !b) return top
	return toHex({ r: t.r * t.a + b.r * (1 - t.a), g: t.g * t.a + b.g * (1 - t.a), b: t.b * t.a + b.b * (1 - t.a) })
}
