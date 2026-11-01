import { execFile } from 'node:child_process'

const ADB = process.env.ADB || 'adb'
// Test hook: a Node script standing in for adb (see test/fake-adb.js).
const FAKE = process.env.TOEFLUFF_FAKE_ADB

function run(args, { buffer = false, timeout = 30000 } = {}) {
	return new Promise((resolve, reject) => {
		const [cmd, argv] = FAKE ? [process.execPath, [FAKE, ...args]] : [ADB, args]
		execFile(cmd, argv, { encoding: buffer ? 'buffer' : 'utf8', maxBuffer: 64 << 20, timeout, windowsHide: true }, (err, stdout, stderr) => {
			if (err) reject(new Error(`adb ${args.join(' ')}: ${String(stderr || err.message).trim()}`))
			else resolve(stdout)
		})
	})
}

export async function devices() {
	const out = await run(['devices'])
	return out
		.split(/\r?\n/)
		.slice(1)
		.map(l => l.trim().split(/\s+/))
		.filter(p => p.length >= 2)
		.map(([serial, state]) => ({ serial, state }))
}

/**
 * Picks the device to drive: `serial` (or ANDROID_SERIAL) if given, otherwise the only emulator.
 * Never falls back to a physical device on its own.
 */
export async function pickDevice(serial = process.env.ANDROID_SERIAL) {
	const list = await devices()
	const ready = list.filter(d => d.state === 'device')
	if (serial) {
		if (!ready.some(d => d.serial === serial)) throw new Error(`adb device ${serial} not connected (have: ${list.map(d => d.serial).join(', ') || 'none'})`)
		return serial
	}
	const emulators = ready.filter(d => d.serial.startsWith('emulator-'))
	if (emulators.length === 1) return emulators[0].serial
	if (!emulators.length) throw new Error(`no emulator connected (have: ${list.map(d => d.serial).join(', ') || 'none'}); pass --serial to pick a device`)
	throw new Error(`several emulators connected (${emulators.map(d => d.serial).join(', ')}); pass --serial`)
}

export function shell(serial, args, opts) {
	return run(['-s', serial, 'shell', ...args], opts)
}

export function reverse(serial, port) {
	return run(['-s', serial, 'reverse', `tcp:${port}`, `tcp:${port}`])
}

/** PNG screenshot. */
export function screencap(serial) {
	return run(['-s', serial, 'exec-out', 'screencap', '-p'], { buffer: true })
}
