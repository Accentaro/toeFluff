#!/usr/bin/env node
// Refreshes everything: dump -> capture per screen -> build-docs.
// Without --screens it runs dump and build-docs only. With --screens it asks you to open each
// screen on the device, then runs capture.js for it. Other options are passed on to capture.js.
//
// Usage: node update.js [--screens home,chat,...|--all-screens] [capture options]

import { spawnSync } from 'node:child_process'
import path from 'node:path'
import readline from 'node:readline/promises'
import { fileURLToPath } from 'node:url'
import { argValue, hasFlag } from './lib/args.js'
import { readData } from './lib/data.js'

const here = path.dirname(fileURLToPath(import.meta.url))

function step(script, args = []) {
	console.log(`\n> node ${script} ${args.join(' ')}`)
	const r = spawnSync(process.execPath, [path.join(here, script), ...args], { stdio: 'inherit' })
	if (r.status !== 0) throw new Error(`${script} failed`)
}

async function main() {
	step('dump.js')

	let screens = argValue('--screens')?.split(',').filter(Boolean) ?? []
	if (hasFlag('--all-screens')) {
		const tested = readData('tested')
		screens = [...new Set(['semantic', 'raw'].flatMap(k => Object.values(tested[k]).flatMap(t => Object.keys(t.screens))))]
	}
	const own = new Set(['--screens', '--all-screens'])
	const argv = process.argv.slice(2)
	const pass = argv.filter((a, i) => !own.has(a) && argv[i - 1] !== '--screens')

	if (screens.length) {
		const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
		for (const screen of screens) {
			const answer = await rl.question(`\nOpen "${screen}" on the device, then press Enter (s = skip, q = stop): `)
			if (answer.trim() === 'q') break
			if (answer.trim() === 's') continue
			try {
				step('capture.js', [screen, ...pass])
			} catch (e) {
				console.log(e.message)
			}
		}
		rl.close()
	}

	step('build-docs.js')
}

main().catch(e => {
	console.error(e.message)
	process.exit(1)
})
