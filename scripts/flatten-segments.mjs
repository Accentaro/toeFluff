// Next's static export writes segment prefetch data as out/<route>/__next.<a>/<b>/__PAGE__.txt, but the client
// requests out/<route>/__next.<a>.<b>.__PAGE__.txt. A static host can't map one to the other, so every
// link click 404s and falls back to a full page load. Write a copy under the requested name.
import { copyFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const OUT = 'out'
let copied = 0

function walk(dir) {
	for (const name of readdirSync(dir)) {
		const path = join(dir, name)
		if (!statSync(path).isDirectory()) continue
		if (name.startsWith('__next.')) flatten(dir, path)
		else if (name !== '_next') walk(path)
	}
}

function flatten(routeDir, segmentDir) {
	for (const name of readdirSync(segmentDir, { recursive: true })) {
		const file = join(segmentDir, name)
		if (statSync(file).isDirectory()) continue
		copyFileSync(file, join(routeDir, relative(routeDir, file).split(sep).join('.')))
		copied++
	}
}

walk(OUT)
console.log(`flatten-segments: ${copied} files`)
