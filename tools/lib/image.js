import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

/** Decodes a PNG/WebP buffer or file to RGB. */
export async function decode(input) {
	const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true })
	return { data, width: info.width, height: info.height }
}

const channelDelta = (a, b, i) => Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]))

/** Pixels that differ between two baselines (clock, cursor, animations). 1 = ignore. */
export function unstableMask(a, b, tolerance) {
	const mask = new Uint8Array(a.width * a.height)
	if (!b) return mask
	for (let p = 0, i = 0; p < mask.length; p++, i += 3) if (channelDelta(a.data, b.data, i) > tolerance) mask[p] = 1
	return mask
}

/**
 * Counts pixels that changed from the baseline, ignoring masked ones. `focus` is the bounding
 * box of those pixels as fractions of the screen. `pinkShare` is the share of changed pixels
 * close to `pink`; translucent keys only tint the screen and score low.
 */
export function diff(base, img, mask, { tolerance = 3, pink = [255, 101, 197], pinkDistance = 40 } = {}) {
	if (base.width !== img.width || base.height !== img.height) throw new Error('screenshot size changed during capture')
	const { width, height } = base
	let pixels = 0
	let pinkish = 0
	let minX = width
	let minY = height
	let maxX = -1
	let maxY = -1
	for (let y = 0, p = 0; y < height; y++) {
		for (let x = 0; x < width; x++, p++) {
			if (mask?.[p]) continue
			const i = p * 3
			if (channelDelta(base.data, img.data, i) <= tolerance) continue
			pixels++
			const d = img.data
			if (Math.abs(d[i] - pink[0]) + Math.abs(d[i + 1] - pink[1]) + Math.abs(d[i + 2] - pink[2]) <= pinkDistance) pinkish++
			if (x < minX) minX = x
			if (x > maxX) maxX = x
			if (y < minY) minY = y
			if (y > maxY) maxY = y
		}
	}
	const focus = pixels ? { x: minX / width, y: minY / height, width: (maxX - minX + 1) / width, height: (maxY - minY + 1) / height } : null
	return { pixels, focus, pinkShare: pixels ? pinkish / pixels : 0, width, height }
}

/** Saves a screenshot as lossless WebP, like the existing images. Returns its size in bytes. */
export async function saveWebp(input, file) {
	fs.mkdirSync(path.dirname(file), { recursive: true })
	const info = await sharp(input).removeAlpha().webp({ lossless: true }).toFile(file)
	return info.size
}

export function hexToRgb(hex) {
	return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
}
