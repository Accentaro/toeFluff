// Stands in for adb in test/selftest.js. One emulator whose "screen" is drawn from the colours the
// fake app last applied (JSON in TOEFLUFF_FAKE_STATE):
//   TEXT_LINK (semantic, Ash) paints a 50x20 box at (10,20), opaque.
//   NEUTRAL_69 (raw) tints the bottom 40 rows at 10%, like a translucent key.
//   One corner pixel changes on every screenshot, like a clock.

import crypto from 'node:crypto'
import fs from 'node:fs'
import sharp from 'sharp'

const args = process.argv.slice(2)
if (args[0] === 'devices') {
	process.stdout.write('List of devices attached\nemulator-5554\tdevice\n\n')
	process.exit(0)
}
if (!(args[2] === 'exec-out' && args[3] === 'screencap')) {
	process.stderr.write(`fake adb: unsupported ${args.join(' ')}`)
	process.exit(1)
}

const W = 120
const H = 240
const state = JSON.parse(fs.readFileSync(process.env.TOEFLUFF_FAKE_STATE, 'utf8') || '{}')
const pink = [255, 101, 197]
const px = Buffer.alloc(W * H * 3)
for (let i = 0; i < W * H; i++) px.set([50, 51, 57], i * 3)
const link = state.semantic?.dark?.TEXT_LINK ? pink : [118, 175, 246]
for (let y = 20; y < 40; y++) for (let x = 10; x < 60; x++) px.set(link, (y * W + x) * 3)
if (state.raw?.NEUTRAL_69)
	for (let y = H - 40; y < H; y++)
		for (let x = 0; x < W; x++) {
			const i = (y * W + x) * 3
			for (let c = 0; c < 3; c++) px[i + c] = Math.round(px[i + c] * 0.9 + pink[c] * 0.1)
		}
px.set(crypto.randomBytes(3), (W - 1) * 3)

process.stdout.write(await sharp(px, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer())
