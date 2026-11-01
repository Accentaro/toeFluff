import { BASES, BASE_NAMES } from './store.js'
import { HEX } from './color.js'
import { MIGRATIONS } from './migrations.js'

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const own = (o, k) => Object.hasOwn(o, k)

export function outdatedKeys(theme, tokens) {
	return [
		...[...new Set(BASES.flatMap(b => Object.keys(theme.semantic[b])))].filter(key => !own(tokens.semantic, key)).map(key => ({ kind: 'semantic', key })),
		...Object.keys(theme.raw).filter(key => !own(tokens.raw, key)).map(key => ({ kind: 'raw', key })),
	]
}

export function repairAll(theme, tokens) {
	const next = structuredClone(theme), repaired = [], unresolved = []
	const pending = outdatedKeys(theme, tokens).map(item => ({ ...item, targets: item.kind === 'semantic' && own(MIGRATIONS, item.key) ? MIGRATIONS[item.key] : [] }))
	// Collect proposals first so conflicting legacy keys never win by import order.
	const proposals = new Map()
	for (const { key, kind, targets } of pending) for (const target of targets) for (const base of BASES) {
		const value = kind === 'semantic' ? theme.semantic[base][key] : undefined
		if (value == null) continue
		const id = `${base}:${target}`
		if (!proposals.has(id)) proposals.set(id, new Set())
		proposals.get(id).add(value.toLowerCase())
	}
	for (const { key, kind, targets } of pending) {
		let reason = !targets.length ? 'No known replacement' : targets.some(target => !own(tokens.semantic, target)) ? 'Replacement unavailable in this build' : ''
		if (!reason) for (const base of BASES) {
			const value = theme.semantic[base][key]
			if (value == null) continue
			if (!HEX.test(value)) { reason = 'Invalid colour value'; break }
			if (targets.some(target => proposals.get(`${base}:${target}`)?.size > 1 || (own(theme.semantic[base], target) && theme.semantic[base][target].toLowerCase() !== value.toLowerCase()))) {
				reason = 'Conflicting destination colours'; break
			}
		}
		if (reason) { unresolved.push({ kind, key, reason }); continue }
		for (const base of BASES) {
			const value = theme.semantic[base][key]
			if (value != null) for (const target of targets) next.semantic[base][target] = value
			delete next.semantic[base][key]
		}
		repaired.push({ key, targets })
	}
	return { theme: next, repaired, unresolved }
}

// Equal bindings are evidence to review, not proof that two keys paint the same UI.
export function suggestions(key, snapshot, reference, tokens) {
	const old = snapshot.semantic[key]
	if (!old) return []
	return Object.keys(tokens.semantic).filter(target => {
		const next = reference.semantic[target]
		return next && BASES.every(b => old[b]?.[1]?.raw && next[b]?.[1]?.raw === old[b][1].raw && next[b][1].opacity === old[b][1].opacity)
	})
}

export function repairTheme(theme, tokens, { kind, key, target, values, overwrite }) {
	if (!['raw', 'semantic'].includes(kind) || !own(tokens[kind], target)) throw new Error('Choose a current key from the list.')
	const next = structuredClone(theme)
	const bases = kind === 'raw' ? ['raw'] : BASES
	for (const base of bases) {
		const dict = kind === 'raw' ? next.raw : next.semantic[base]
		const value = values[base]?.trim()
		if (value && !HEX.test(value)) throw new Error(`${BASE_NAMES[base] || 'Raw'} needs a #RGB, #RRGGBB or #RRGGBBAA colour.`)
		if (key !== target && value && own(dict, target) && dict[target].toLowerCase() !== value.toLowerCase() && !overwrite) {
			throw new Error(`${BASE_NAMES[base] || 'Raw'} already has ${target} = ${dict[target]}. Enable replacement to overwrite it.`)
		}
		if (key !== target) delete dict[key]
		if (value) dict[target] = value
		else if (key === target) delete dict[target]
	}
	return next
}

export function createRepair({ host, store, tokens, toast }) {
	let history, loading = false, snapshotIndex = 0, selection = '', kind = 'semantic'
	const $ = s => host.querySelector(s)
	const keys = () => kind === 'raw' ? Object.keys(store.theme.raw) : [...new Set(BASES.flatMap(b => Object.keys(store.theme.semantic[b])))]
	function render() {
		const imported = keys().sort()
		if (!imported.includes(selection)) selection = imported[0] || ''
		host.innerHTML = `<section class="st-section">
			<h3>Repair imported colours</h3>
			<p class="muted small">Compare a past Discord version with this site's captured build. Choose the closest version you know; it cannot be detected from a theme. Changes are saved locally and can be undone.</p>
			<label class="st-field"><span>Historical reference</span><select class="repair-version">${history ? history.snapshots.map((s, i) => `<option value="${i}" ${i === snapshotIndex ? 'selected' : ''}>${esc(s.version)}</option>`).join('') : '<option>History unavailable</option>'}</select></label>
			${history ? `<p class="small muted">Data: <a href="https://github.com/nexpid/Themelings/tree/${history.snapshots[snapshotIndex].commit}" target="_blank" rel="noreferrer">Themelings snapshot</a>. Suggestions compare bindings against its ${esc(history.snapshots.at(-1).version)} snapshot, then require the key to exist in this site's current table. Review the current defaults below.</p>` : `<p class="small muted">${loading ? 'Loading token history…' : 'History could not be loaded. Manual repairs still work.'}</p>${loading ? '' : '<button type="button" class="repair-retry">Retry history</button>'}`}
			<label class="st-field"><span>Colour type</span><select class="repair-kind"><option value="semantic" ${kind === 'semantic' ? 'selected' : ''}>Semantic</option><option value="raw" ${kind === 'raw' ? 'selected' : ''}>Raw</option></select></label>
			<label class="st-field"><span>Imported key</span><select class="repair-key">${imported.map(k => `<option ${k === selection ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select></label>
			<div class="repair-detail"></div>
		</section>`
		detail()
	}
	function detail() {
		const area = $('.repair-detail')
		if (!selection) { area.innerHTML = '<p class="muted">No imported colours of this type. Import a theme first.</p>'; return }
		const snapshot = history?.snapshots[snapshotIndex]
		const matches = snapshot && kind === 'semantic' ? suggestions(selection, snapshot, history.snapshots.at(-1), tokens) : []
		const target = own(tokens[kind], selection) ? selection : matches.length === 1 ? matches[0] : ''
		area.innerHTML = `<p class="small">${own(tokens[kind], selection) ? 'This key still exists; its use or bindings may have changed.' : 'This key is absent from the current table.'}</p>
			${matches.length ? `<p class="small">Same historical raw bindings and opacity on all four bases: ${matches.map(esc).join(', ')}. This is a suggestion, not a verified rename.</p>` : '<p class="small muted">No binding-based replacement identified. Choose a current key manually.</p>'}
			<form class="repair-form">
			<label class="st-field"><span>Current destination key</span><input class="repair-target" list="repair-targets" value="${esc(target)}" autocomplete="off" required></label>
			<datalist id="repair-targets">${Object.keys(tokens[kind]).sort().map(k => `<option value="${esc(k)}"></option>`).join('')}</datalist>
			<div class="repair-comparison"></div>
			<p class="small muted">Saved colours to apply. Blank removes the old override for that base. Other destination values are kept. Base links stay unchanged.</p>
			${(kind === 'raw' ? ['raw'] : BASES).map(b => `<label class="st-field"><span>${BASE_NAMES[b] || 'Raw'}${store.theme.links[b] ? ' (follows Ash unless explicitly set)' : ''}</span><input data-repair-base="${b}" value="${esc((kind === 'raw' ? store.theme.raw : store.theme.semantic[b])[selection] ?? '')}" placeholder="No override" spellcheck="false"></label>`).join('')}
			<label class="st-check"><input type="checkbox" class="repair-overwrite"> Replace conflicting destination colours</label>
			<p class="small">Applying moves these overrides to the destination and removes the old key. Undo restores the previous theme.</p>
			<p class="repair-error" role="alert"></p><button class="primary" type="submit">Apply repair</button></form>`
		comparison()
	}
	function comparison() {
		const target = $('.repair-target').value.trim()
		const snapshot = history?.snapshots[snapshotIndex]
		const old = snapshot?.[kind]?.[selection]
		const current = tokens[kind][target]
		const binding = d => d ? `${d.raw} × ${d.opacity ?? 1}` : 'Not recorded'
		let html = `<h4>Then → current default</h4>`
		if (kind === 'semantic') {
			html += BASES.map(b => `<p class="small"><strong>${BASE_NAMES[b]}</strong><br>${esc(old?.[b] ? `${old[b][0]} · ${binding(old[b][1])}` : 'Not recorded')}<br>→ ${esc(current?.[b] ? `${store.semanticInfo(target, b).default ?? ''} ${binding(current[b])}` : 'Choose a current key')}</p>`).join('')
		} else {
			html += `<p class="small">${esc(old || 'Not recorded')} → ${esc(current || 'Choose a current key')}</p>`
			const consumers = (table, historical) => Object.entries(table).flatMap(([k, def]) => BASES.filter(b => (historical ? def[b]?.[1] : def[b])?.raw === (historical ? selection : target)).map(b => `${k} (${BASE_NAMES[b]})`))
			html += `<details><summary>What this raw colour feeds</summary><p class="small">Then: ${esc(snapshot ? consumers(snapshot.semantic, true).join(', ') || 'None recorded' : 'Not recorded')}</p><p class="small">Now: ${esc(consumers(tokens.semantic, false).join(', ') || 'None recorded')}</p></details>`
		}
		$('.repair-comparison').innerHTML = html
	}
	async function load() {
		if (history || loading) return
		loading = true
		render()
		try {
			// Its own chunk, loaded the first time the Repair tab opens
			const data = (await import('./token-history.json')).default
			if (!Array.isArray(data.snapshots) || !data.snapshots.length || data.snapshots.some(s => !s.semantic || !s.raw || !/^[a-f0-9]{40}$/.test(s.commit))) throw new Error('Invalid history')
			history = data
		} catch { /* Manual repairs remain available offline. */ }
		loading = false
		render()
	}
	host.addEventListener('change', e => {
		if (e.target.matches('.repair-version')) { snapshotIndex = +e.target.value; render() }
		if (e.target.matches('.repair-kind')) { kind = e.target.value; selection = ''; render() }
		if (e.target.matches('.repair-key')) { selection = e.target.value; detail() }
	})
	host.addEventListener('input', e => { if (e.target.matches('.repair-target')) comparison() })
	host.addEventListener('click', e => { if (e.target.closest('.repair-retry')) load() })
	host.addEventListener('submit', e => {
		e.preventDefault()
		try {
			const values = Object.fromEntries([...host.querySelectorAll('[data-repair-base]')].map(el => [el.dataset.repairBase, el.value]))
			const next = repairTheme(store.theme, tokens, { kind, key: selection, target: $('.repair-target').value.trim(), values, overwrite: $('.repair-overwrite').checked })
			store.replace(next, 'repair')
			toast('Repair applied. Undo restores the previous theme.')
		} catch (error) { $('.repair-error').textContent = error.message }
	})
	return { render() { render(); if (!history && !loading) load() } }
}
