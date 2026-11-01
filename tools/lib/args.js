const argv = process.argv.slice(2)

export function hasFlag(name) {
	return argv.includes(name)
}

export function argValue(name, fallback = undefined) {
	const i = argv.indexOf(name)
	if (i !== -1 && i + 1 < argv.length) return argv[i + 1]
	const eq = argv.find(a => a.startsWith(`${name}=`))
	return eq ? eq.slice(name.length + 1) : fallback
}

/** Arguments that are not flags or flag values. Flags listed in `valued` take a value. */
export function positional(valued = []) {
	const out = []
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i]
		if (a.startsWith('--')) {
			if (valued.includes(a)) i++
			continue
		}
		out.push(a)
	}
	return out
}
