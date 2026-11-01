// Merges one screen's capture results into tested.json, captures.json and examples.json.
// Observations from other screens are left alone.

/**
 * @param data { tested, captures, examples, descriptions }  mutated in place
 * @param run  { screen, discord, date, probed: Set<"kind/key">, results: [{ kind, key, pixels, focus, width, height, measurement }],
 *               scrambled, saveExamples, prune }
 * @returns { images: [{ kind, key, file, target }], report }
 *   Each image is written by the caller, which then sets target.bytes.
 */
export function mergeScreen(data, run) {
	const { tested, captures, examples, descriptions } = data
	const { screen } = run
	const images = []
	const report = { added: [], updated: [], examples: [], notSeen: [], pruned: [], mainNotSeen: [] }

	for (const r of run.results) {
		const id = `${r.kind}/${r.key}`
		tested[r.kind] ??= {}
		let t = tested[r.kind][r.key]
		if (!t) {
			t = tested[r.kind][r.key] = { screens: {}, example: screen, image: `images/${r.kind}/${r.key}.webp` }
			report.added.push(id)
		} else report.updated.push(id)
		t.screens[screen] = r.pixels

		if (t.example === screen) {
			captures[r.kind] ??= {}
			const prev = captures[r.kind][r.key]
			const entry = captureEntry(r, `/${t.image}`, screen, run.scrambled, prev?.screen === screen ? prev.description : undefined)
			captures[r.kind][r.key] = entry
			images.push({ kind: r.kind, key: r.key, file: t.image, target: entry })
			continue
		}

		examples[r.kind] ??= {}
		const list = examples[r.kind][r.key] ?? []
		const i = list.findIndex(e => e.screen === screen)
		if (i === -1 && !run.saveExamples) continue
		const file = `images/${r.kind}/${r.key}-${screen}.webp`
		const entry = captureEntry(r, `/${file}`, screen, run.scrambled, i === -1 ? undefined : list[i].description)
		if (i === -1) list.push(entry)
		else list[i] = entry
		examples[r.kind][r.key] = list
		images.push({ kind: r.kind, key: r.key, file, target: entry })
		report.examples.push(id)
	}

	// Probed keys that were on this screen before but did not show up now.
	const seen = new Set(run.results.map(r => `${r.kind}/${r.key}`))
	for (const id of run.probed) {
		if (seen.has(id)) continue
		const [kind, key] = id.split('/')
		const t = tested[kind]?.[key]
		if (!t || !(screen in t.screens)) continue
		if (t.example === screen) {
			report.mainNotSeen.push(id)
			continue
		}
		report.notSeen.push(id)
		if (!run.prune) continue
		delete t.screens[screen]
		const list = examples[kind]?.[key]
		if (list) {
			const rest = list.filter(e => e.screen !== screen)
			if (rest.length) examples[kind][key] = rest
			else delete examples[kind][key]
		}
		report.pruned.push(id)
	}

	tested.discord = run.discord ?? tested.discord
	tested.date = run.date
	updateCoverage(tested, descriptions, data.tokens)
	return { images, report }
}

function captureEntry(r, image, screen, scrambled, description) {
	const e = { pixels: r.pixels, focus: r.focus, private: false }
	if (scrambled) e.textScrambled = true
	e.width = r.width
	e.height = r.height
	e.bytes = 0
	if (r.measurement) e.measurement = r.measurement
	e.image = image
	e.screen = screen
	if (description) e.description = description
	return e
}

/** Keeps the counted parts of tested.coverage in line with the data. Hand-written fields stay. */
export function updateCoverage(tested, descriptions, tokens) {
	const c = tested.coverage
	if (!c) return
	if (tokens) c.catalogue = { semantic: Object.keys(tokens.semantic).length, raw: Object.keys(tokens.raw).length }
	const count = kind => Object.keys(tested[kind] ?? {}).filter(k => !descriptions?.[kind]?.[k]?.skip).length
	c.individualExamples = { semantic: count('semantic'), raw: count('raw') }
}
