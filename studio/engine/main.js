// Theme studio: key navigator, editor and inspector around the interactive phone.
// Mounted by components/studio/Studio.tsx, which puts the shared reference data in window.VT first.
import { BASES, BASE_NAMES, LINKABLE } from './store.js'
import { createPreview, PROPS } from './preview.js'
import { createPicker } from './picker.js'
import { exportLegacy, exportManifest, exportPlugin, importText, validate } from './formats.js'
import { HEX, contrast, over, parse } from './color.js'
import * as mock from './mock.js'
import { createRepair, outdatedKeys, repairAll } from './repair.js'
import { createLibrary } from './library.js'

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const UI_KEY = 'valenced-studio:ui'
const DEVICES = [['412x915', 'Pixel 7'], ['393x852', 'Pixel 8a'], ['360x780', 'Compact'], ['430x932', 'Large'], ['custom', 'Custom']]

export async function mount(host) {
	const VT = window.VT
	const store = VT.store
	window.VTStudio = { store, get preview() { return preview } }
	// Document and window listeners end with the page (client-side navigation leaves the document alive)
	const lifetime = new AbortController()
	const signal = lifetime.signal

	// ---------- reference data, shared with the docs pages

	const tested = new Map(VT.data.semantic.map(k => [k.key, k]))
	const testedRaw = new Map(VT.data.raw.map(k => [k.key, k]))
	const areas = VT.descriptions.areas
	const screenLabel = id => VT.screenNames[id] || id

	const saved = (() => { try { return JSON.parse(localStorage.getItem(UI_KEY)) || {} } catch { return {} } })()
	const ui = {
		kind: saved.kind || 'semantic',
		scope: saved.scope || 'tested',
		q: '',
		changed: false,
		onScreen: false,
		selected: null,
		target: saved.base || 'dark',
		tab: saved.tab || 'property',
		inspected: null,
		highlight: saved.highlight ?? true,
		device: saved.device || '412x915',
		custom: saved.custom || [412, 915],
		zoom: saved.zoom || 'fit',
		keysW: saved.keysW || 300,
		editW: saved.editW || 380,
		keysHidden: !!saved.keysHidden,
		view: 'preview',
		format: saved.format || 'legacy',
	}
	let preview = null
	const persistUi = () => localStorage.setItem(UI_KEY, JSON.stringify({
		kind: ui.kind, scope: ui.scope, base: store.base, tab: ui.tab, highlight: ui.highlight, device: ui.device, custom: ui.custom,
		zoom: ui.zoom, keysW: ui.keysW, editW: ui.editW, keysHidden: ui.keysHidden, format: ui.format, screen: preview?.screen,
	}))
	store.base = ui.target

	// ---------- layout

	host.innerHTML = `
	<div class="st" data-view="preview" style="--keys-w:${ui.keysW}px;--edit-w:${ui.editW}px">
		<div class="st-bar">
			<input class="st-name" aria-label="Theme name" spellcheck="false">
			<div class="st-group">
				<button class="st-icon-btn" data-cmd="undo" title="Undo (Ctrl+Z)" aria-label="Undo"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg></button>
				<button class="st-icon-btn" data-cmd="redo" title="Redo (Ctrl+Shift+Z)" aria-label="Redo"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/></svg></button>
			</div>
			<div class="segmented st-bases-switch" role="group" aria-label="Base theme">${BASES.map((b, i) => `<button data-base="${b}" title="${BASE_NAMES[b]} (${b}), key ${i + 1}">${BASE_NAMES[b]}</button>`).join('')}</div>
			<span class="st-spacer"></span>
			<span class="st-saved" role="status"></span>
			<button data-cmd="library" title="Themes saved in this browser (Ctrl+S saves)">My themes</button>
			<button data-cmd="import" title="Import a theme file">Import</button>
			<div class="st-menu">
				<button class="primary" data-cmd="export-menu" aria-haspopup="true" aria-expanded="false" title="Export (Ctrl+E)">Export</button>
				<div class="st-menu-list" hidden>
					<button data-export="legacy-download">Download legacy JSON<small>For the Legacy Themes plugin, by URL</small></button>
					<button data-export="plugin-download">Download plugin index.ts<small>For a theme plugin's js/ folder</small></button>
					<button data-export="manifest-download">Download manifest.json<small>Goes next to the plugin's index.ts</small></button>
					<hr>
					<button data-export="legacy-copy">Copy legacy JSON</button>
					<button data-export="plugin-copy">Copy plugin index.ts</button>
				</div>
			</div>
			<button class="st-icon-btn" data-cmd="help" title="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts">?</button>
			<input type="file" class="st-file" accept=".json,.ts,.js,.txt,application/json" hidden>
		</div>
		<section class="st-section st-repair-banner" aria-label="Theme repairs" hidden></section>
		<nav class="st-tabs" aria-label="Studio panels"><button data-view="keys">Keys</button><button data-view="edit">Edit</button><button data-view="preview">Preview</button></nav>
		<div class="st-body${ui.keysHidden ? ' keys-hidden' : ''}">
			<aside class="st-keys" aria-label="Theme keys">
				<div class="st-keys-head">
					<input type="search" class="st-keys-search" placeholder="Search keys and descriptions (/)" aria-label="Search keys" autocomplete="off">
					<div class="st-keys-filters">
						<div class="segmented sm" data-filter="kind"><button data-v="semantic">Semantic</button><button data-v="raw">Raw</button></div>
						<div class="segmented sm" data-filter="scope"><button data-v="tested" title="Keys with documented examples">Tested</button><button data-v="all" title="Every key in this Discord build">All</button></div>
					</div>
					<div class="st-keys-checks">
						<label><input type="checkbox" data-check="changed"> Changed</label>
						<label><input type="checkbox" data-check="onScreen"> On screen</label>
						<span class="st-keys-count"></span>
					</div>
				</div>
				<div class="st-keys-list" tabindex="-1"></div>
			</aside>
			<div class="st-resize" data-resize="keys" aria-label="Key list width" title="Drag to resize. Double-click to hide the key list." role="separator" tabindex="0" aria-orientation="vertical"></div>
			<section class="st-edit" aria-label="Editor">
				<div class="segmented st-edit-tabs" role="group" aria-label="Editor panels"><button data-tab="property">Property</button><button data-tab="source">Source</button><button data-tab="theme">Theme</button><button data-tab="repair">Repair</button></div>
				<div class="st-pane" data-pane="property"></div>
				<div class="st-pane" data-pane="source"></div>
				<div class="st-pane" data-pane="theme"></div>
				<div class="st-pane" data-pane="repair"></div>
			</section>
			<div class="st-resize" data-resize="edit" aria-label="Editor width" role="separator" tabindex="0" aria-orientation="vertical" title="Drag to resize"></div>
			<section class="st-preview" aria-label="Phone preview">
				<div class="st-pv-bar">
					<button class="st-icon-btn" data-cmd="keys-toggle" title="Show or hide the key list" aria-label="Toggle key list"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></svg></button>
					<button class="st-icon-btn" data-cmd="phone-back" title="Phone back button" aria-label="Phone back"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12H5M11 5l-7 7 7 7"/></svg></button>
					<select class="st-screen" aria-label="Screen"></select>
					<button class="st-toggle" data-cmd="inspect" title="Inspect elements (I)" aria-pressed="false"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4h6M4 4v6M20 4h-6M20 4v6M4 20h6M4 20v-6"/><path d="m13 13 7 7M13 13v5l1.5-1.5M13 13h5l-1.5 1.5" /></svg>Inspect</button>
					<button class="st-toggle" data-cmd="highlight" title="Outline what the selected key paints (H)" aria-pressed="false"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="3" stroke-dasharray="3 3"/></svg>Highlight</button>
					<span class="st-spacer"></span>
					<select class="st-device" aria-label="Device size">${DEVICES.map(([v, l]) => `<option value="${v}">${l}${v === 'custom' ? '' : ` ${v.replace('x', ' x ')}`}</option>`).join('')}</select>
					<span class="st-custom" hidden><input type="number" min="300" max="600" class="st-w" aria-label="Width"> x <input type="number" min="560" max="1200" class="st-h" aria-label="Height"></span>
					<select class="st-zoom" aria-label="Zoom"><option value="fit">Fit</option><option value="1">100%</option><option value="0.75">75%</option><option value="0.5">50%</option></select>
				</div>
				<div class="st-stage"><div class="st-stage-inner"><div class="st-phone-host"></div></div></div>
				<p class="st-pv-foot"></p>
			</section>
		</div>
		<dialog class="st-help" aria-label="Keyboard shortcuts">
			<h2>Keyboard shortcuts</h2>
			<dl>
				<dt>Ctrl Z / Ctrl Shift Z</dt><dd>Undo / redo</dd>
				<dt>I</dt><dd>Inspect elements in the phone</dd>
				<dt>H</dt><dd>Outline what the selected key paints</dd>
				<dt>1 2 3 4</dt><dd>Ash, Dark, Light, Onyx</dd>
				<dt>/ or Ctrl K</dt><dd>Search keys</dd>
				<dt>Up / Down</dt><dd>Move through the key list</dd>
				<dt>Ctrl E</dt><dd>Export menu</dd>
				<dt>Ctrl S</dt><dd>Save to My themes</dd>
				<dt>Esc</dt><dd>Stop inspecting, close menus and phone overlays</dd>
				<dt>Long press or right-click</dt><dd>Message and server menus in the phone</dd>
			</dl>
			<p class="muted">The theme you are editing is saved in this browser as you work. My themes keeps named copies.</p>
			<form method="dialog"><button>Close</button></form>
		</dialog>
		<dialog class="st-library" aria-label="My themes"></dialog>
	</div>`

	const $ = s => host.querySelector(s)
	const root = $('.st')
	const keysList = $('.st-keys-list')
	const propPane = $('[data-pane="property"]')
	const sourcePane = $('[data-pane="source"]')
	const themePane = $('[data-pane="theme"]')
	const repair = createRepair({ host: $('[data-pane="repair"]'), store, tokens: VT.tokens, toast: VT.toast })
	let repairReport = null
	function renderRepairBanner() {
		const outdated = outdatedKeys(store.theme, VT.tokens)
		const banner = $('.st-repair-banner')
		banner.hidden = !outdated.length && !repairReport
		banner.innerHTML = `${repairReport ? `<p role="status">Repaired ${repairReport.repaired.length} outdated key${repairReport.repaired.length === 1 ? '' : 's'}. ${repairReport.unresolved.length} need manual attention. Undo restores the previous theme.</p>` : ''}
			${outdated.length ? `<div class="st-row wrap"><strong>${outdated.length} outdated colour key${outdated.length === 1 ? '' : 's'} found.</strong><button class="primary" data-cmd="repair-all">Repair all</button><button data-cmd="repair">Review details</button></div><p class="small muted">Updates known legacy keys using <a href="https://github.com/blancodagoat/theme-fixer/blob/32a3f861955e216bf0eec88079a677cea27d68a8/map.json" target="_blank" rel="noreferrer">community mappings</a>. Your colours are kept; conflicts and unknown replacements stay untouched.</p>` : ''}
			${repairReport?.repaired.length ? `<details><summary>Repaired keys</summary>${repairReport.repaired.map(item => `<p class="small">${esc(item.key)} &rarr; ${item.targets.map(esc).join(", ")}</p>`).join('')}</details>` : ''}
			${repairReport?.unresolved.length ? `<details><summary>Keys still needing attention</summary>${repairReport.unresolved.map(item => `<p class="small">${esc(item.key)}: ${esc(item.reason)}</p>`).join('')}</details>` : ''}`
	}


	// ---------- preview

	preview = createPreview({
		store,
		host: $('.st-phone-host'),
		mock,
		onInspect: info => {
			ui.inspected = info
			setTab('property')
			if (info?.props?.length) {
				const first = info.props.find(p => !p.pressed) || info.props[0]
				select(first.key, first.raw, { from: 'inspector' })
			} else renderProperty()
			if (matchMedia('(max-width: 900px)').matches) setView('edit')
		},
		onNavigate: () => {
			syncScreenSelect()
			persistUi()
			if (ui.onScreen) renderKeyList()
			updatePresence()
			if (ui.selected && ui.highlight) preview.highlight(ui.selected.key, ui.selected.raw)
		},
	})
	if (saved.screen && preview.screens[saved.screen]) preview.go(saved.screen, {}, { push: false })

	const groups = {}
	for (const s of Object.values(preview.screens)) (groups[s.group] ??= []).push(['screen', s])
	$('.st-screen').innerHTML = Object.entries(groups).map(([g, list]) => `<optgroup label="${esc(g)}">${list.map(([, s]) => `<option value="screen:${s.id}">${esc(s.title)}</option>`).join('')}</optgroup>`).join('')
		+ `<optgroup label="Open over a screen">${Object.values(preview.overlays).map(o => `<option value="overlay:${o.id}">${esc(o.title)}</option>`).join('')}</optgroup>`
	function syncScreenSelect() {
		$('.st-screen').value = preview.overlay ? `overlay:${preview.overlay}` : `screen:${preview.screen}`
	}
	syncScreenSelect()
	$('.st-screen').onchange = e => {
		const [kind, id] = e.target.value.split(':')
		preview.show({ kind, id })
	}

	// Fit the phone in the stage
	const stage = $('.st-stage'), stageInner = $('.st-stage-inner')
	function layoutPhone() {
		const [w, h] = ui.device === 'custom' ? ui.custom : ui.device.split('x').map(Number)
		preview.phone.style.setProperty('--vp-w', w + 'px')
		preview.phone.style.setProperty('--vp-h', h + 'px')
		const fw = w + 18, fh = h + 18
		const avail = stage.getBoundingClientRect()
		const fit = Math.min((avail.width - 24) / fw, (avail.height - 24) / fh, 1)
		const scale = ui.zoom === 'fit' ? Math.max(0.3, fit) : +ui.zoom
		preview.device.style.transform = `scale(${scale})`
		stageInner.style.width = fw * scale + 'px'
		stageInner.style.height = fh * scale + 'px'
		preview.redraw()
	}
	const stageObserver = new ResizeObserver(layoutPhone)
	stageObserver.observe(stage)
	$('.st-device').value = ui.device
	$('.st-zoom').value = ui.zoom
	const customBox = $('.st-custom')
	customBox.hidden = ui.device !== 'custom'
	$('.st-w').value = ui.custom[0]
	$('.st-h').value = ui.custom[1]
	$('.st-device').onchange = e => {
		ui.device = e.target.value
		customBox.hidden = ui.device !== 'custom'
		layoutPhone()
		persistUi()
	}
	customBox.onchange = () => {
		ui.custom = [Math.min(600, Math.max(300, +$('.st-w').value || 412)), Math.min(1200, Math.max(560, +$('.st-h').value || 915))]
		layoutPhone()
		persistUi()
	}
	$('.st-zoom').onchange = e => {
		ui.zoom = e.target.value
		layoutPhone()
		persistUi()
	}

	// ---------- key catalogue

	function metaFor(key, raw) {
		if (raw) {
			const t = testedRaw.get(key)
			return { key, raw, tested: t, description: t?.description, value: store.rawColor(key) }
		}
		const t = tested.get(key)
		return { key, raw, tested: t, description: t?.description, area: t?.area, category: VT.tokens.semantic[key]?.category }
	}

	const OTHER = { background: 'Backgrounds (not verified)', text: 'Text (not verified)', border: 'Borders (not verified)', generic: 'Other (not verified)' }
	function catalogue() {
		const q = ui.q.trim().toLowerCase()
		const modified = store.modified()
		const visible = ui.onScreen ? preview.visibleKeys() : null
		const raw = ui.kind === 'raw'
		let keys
		if (!raw) keys = ui.scope === 'tested' ? [...tested.keys()] : Object.keys(VT.tokens.semantic)
		else keys = ui.scope === 'tested' ? [...testedRaw.keys()] : Object.keys(VT.tokens.raw)
		// imported keys this Discord build does not know still get listed, so nothing is hidden
		const unknown = raw ? [...modified.raw].filter(k => !(k in VT.tokens.raw)) : [...modified.semantic].filter(k => !(k in VT.tokens.semantic))
		keys = [...keys, ...unknown]
		const items = keys.map(k => metaFor(k, raw)).filter(m =>
			(!q || m.key.toLowerCase().includes(q) || (m.description || '').toLowerCase().includes(q)) &&
			(!ui.changed || (raw ? modified.raw : modified.semantic).has(m.key)) &&
			(!visible || visible.has((raw ? '@' : '') + m.key)))
		const grouped = new Map()
		const put = (g, m) => { if (!grouped.has(g)) grouped.set(g, []); grouped.get(g).push(m) }
		if (!raw) {
			for (const a of areas) grouped.set(a, [])
			for (const m of items) {
				if (!(m.key in VT.tokens.semantic)) put('Not in this Discord build', m)
				else if (m.tested) put(m.area, m)
				else put(OTHER[m.category] || OTHER.generic, m)
			}
		} else {
			for (const m of items) {
				if (!(m.key in VT.tokens.raw)) put('Not in this Discord build', m)
				else if (m.tested && ui.scope === 'tested') put('Tested raw colours', m)
				else put(m.key.split('_')[0], m)
			}
		}
		for (const [g, l] of grouped) if (!l.length) grouped.delete(g)
		if (raw && ui.scope === 'all') return new Map([...grouped].sort(([a], [b]) => a.localeCompare(b)))
		return grouped
	}

	const rowEls = new Map()
	function swatchStyle(value) {
		return value ? `background:${value}` : 'background:transparent'
	}
	function rowState(m) {
		const id = (m.raw ? '@' : '') + m.key
		const info = m.raw ? store.rawInfo(m.key) : store.semanticInfo(m.key)
		const changed = m.raw ? info.own != null : BASES.some(b => store.theme.semantic[b][m.key] != null)
		return { id, value: info.value, changed, here: m.raw ? info.own != null : info.source === 'theme' || info.source === 'linked' }
	}

	function renderKeyList() {
		const grouped = catalogue()
		rowEls.clear()
		let count = 0, html = ''
		for (const [g, list] of grouped) {
			count += list.length
			html += `<div class="st-kgroup"><h3>${esc(g)} <span>${list.length}</span></h3>`
			for (const m of list) {
				const s = rowState(m)
				const sel = ui.selected && ui.selected.key === m.key && !!ui.selected.raw === m.raw
				html += `<button class="st-krow${sel ? ' on' : ''}${s.changed ? ' changed' : ''}" data-key="${esc(m.key)}" data-raw="${m.raw ? 1 : ''}" title="${esc(m.description || m.key)}">
					<span class="st-sw"><i style="${swatchStyle(s.value)}"></i></span>
					<span class="st-krow-text"><code>${esc(m.key).replace(/_/g, '_<wbr>')}</code>${m.description ? `<small>${esc(m.description)}</small>` : ''}</span>
					<span class="st-krow-mark" aria-label="${s.changed ? 'Changed' : ''}"></span>
				</button>`
			}
			html += '</div>'
		}
		keysList.innerHTML = html || `<p class="st-empty">No keys match.${ui.onScreen ? ' Turn off "On screen" to see keys from other screens.' : ''}</p>`
		for (const el of keysList.querySelectorAll('.st-krow')) rowEls.set((el.dataset.raw ? '@' : '') + el.dataset.key, el)
		$('.st-keys-count').textContent = `${count} key${count === 1 ? '' : 's'}`
		host.querySelectorAll('[data-filter="kind"] button').forEach(b => b.classList.toggle('on', b.dataset.v === ui.kind))
		host.querySelectorAll('[data-filter="scope"] button').forEach(b => b.classList.toggle('on', b.dataset.v === ui.scope))
	}

	/** Refreshes just the swatches that changed, so dragging a colour does not rebuild the list. */
	function updateRows(detail) {
		const ids = detail.all ? [...rowEls.keys()] : [...(detail.semantic || []), ...(detail.raw || []).map(k => '@' + k)]
		for (const id of ids) {
			const el = rowEls.get(id)
			if (!el) continue
			const raw = id.startsWith('@')
			const s = rowState({ key: raw ? id.slice(1) : id, raw })
			el.querySelector('.st-sw i').style.cssText = swatchStyle(s.value)
			el.classList.toggle('changed', s.changed)
		}
	}

	keysList.addEventListener('click', e => {
		const row = e.target.closest('.st-krow')
		if (!row) return
		select(row.dataset.key, !!row.dataset.raw, { from: 'list' })
		if (matchMedia('(max-width: 900px)').matches) setView('edit')
	})
	// Hovering a key previews where it paints, without changing the selection
	keysList.addEventListener('pointerover', e => {
		const row = e.target.closest('.st-krow')
		if (!row || row === keysList.hovered) return
		keysList.hovered = row
		preview.highlight(row.dataset.key, !!row.dataset.raw)
	})
	keysList.addEventListener('pointerleave', () => {
		keysList.hovered = null
		restoreHighlight()
	})
	keysList.addEventListener('keydown', e => {
		if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
		e.preventDefault()
		moveSelection(e.key === 'ArrowDown' ? 1 : -1)
	})
	function moveSelection(step) {
		const rows = [...keysList.querySelectorAll('.st-krow')]
		if (!rows.length) return
		const i = rows.findIndex(r => r.classList.contains('on'))
		const next = rows[Math.min(rows.length - 1, Math.max(0, i + step))]
		select(next.dataset.key, !!next.dataset.raw, { from: 'list' })
		next.focus({ preventScroll: true })
		next.scrollIntoView({ block: 'nearest' })
	}

	let searchTimer
	$('.st-keys-search').addEventListener('input', e => {
		clearTimeout(searchTimer)
		searchTimer = setTimeout(() => {
			ui.q = e.target.value
			renderKeyList()
		}, 80)
	})
	$('.st-keys-search').addEventListener('keydown', e => {
		if (e.key === 'ArrowDown') {
			e.preventDefault()
			keysList.querySelector('.st-krow')?.click()
			keysList.querySelector('.st-krow')?.focus()
		}
	})
	host.querySelectorAll('[data-filter]').forEach(group => group.addEventListener('click', e => {
		const v = e.target.closest('button')?.dataset.v
		if (!v) return
		ui[group.dataset.filter] = v
		renderKeyList()
		persistUi()
	}))
	host.querySelectorAll('[data-check]').forEach(c => c.addEventListener('change', () => {
		ui[c.dataset.check] = c.checked
		renderKeyList()
	}))

	// ---------- selection and highlighting

	function select(key, raw = false, { from } = {}) {
		ui.selected = { key, raw }
		if (from !== 'inspector') ui.inspected = ui.inspected && ui.inspected.props.some(p => p.key === key && !!p.raw === raw) ? ui.inspected : null
		// make sure the list shows the key
		if (ui.kind !== (raw ? 'raw' : 'semantic') || (ui.scope === 'tested' && !(raw ? testedRaw : tested).has(key))) {
			ui.kind = raw ? 'raw' : 'semantic'
			if (!(raw ? testedRaw : tested).has(key)) ui.scope = 'all'
			renderKeyList()
		}
		keysList.querySelectorAll('.st-krow.on').forEach(r => r.classList.remove('on'))
		const row = rowEls.get((raw ? '@' : '') + key)
		if (row) {
			row.classList.add('on')
			if (from !== 'list') row.scrollIntoView({ block: 'nearest' })
		}
		setTab('property')
		renderProperty()
		restoreHighlight()
		history.replaceState(history.state, '', `#${raw ? '@' : ''}${key}`)
	}

	function restoreHighlight() {
		const on = ui.highlight && ui.selected
		preview.highlight(on ? ui.selected.key : null, on ? ui.selected.raw : false)
		updatePresence()
	}

	function updatePresence() {
		const el = propPane.querySelector('.st-presence')
		const foot = $('.st-pv-foot')
		if (!ui.selected) {
			foot.textContent = preview.inspecting ? 'Hover to see what paints each element, click to edit it.' : 'Tap around the phone: rows, channels, reactions and switches work. Long-press or right-click messages and servers.'
			return
		}
		const { key, raw } = ui.selected
		const n = preview.countKey(key, raw)
		foot.innerHTML = n ? `<b>${esc(key)}</b> paints ${n} element${n === 1 ? '' : 's'} here${ui.highlight ? ', outlined in pink' : ''}.` : `<b>${esc(key)}</b> is not on this screen.`
		if (!el) return
		const elsewhere = preview.screensFor(key, raw).filter(s => !(s.kind === 'screen' && s.id === preview.screen && !preview.overlay) && !(s.kind === 'overlay' && s.id === preview.overlay))
		el.innerHTML = `${n ? `<span class="st-pill ok">${n} on this screen</span>` : '<span class="st-pill">Not on this screen</span>'}
			${elsewhere.length ? `<span class="st-presence-label">${n ? 'Also on' : 'Shown on'}</span>${elsewhere.slice(0, 8).map(s => `<button class="st-chip" data-show="${s.kind}:${s.id}">${esc(s.title)}</button>`).join('')}` : n ? '' : '<span class="st-presence-label">No preview screen uses this key yet.</span>'}`
	}

	// ---------- property panel

	const picker = createPicker({
		onInput: (hex, { final }) => applyPicked(hex, final),
		palette: () => {
			const set = new Set()
			for (const b of BASES) for (const v of Object.values(store.theme.semantic[b])) if (HEX.test(v)) set.add(v.toLowerCase())
			for (const v of Object.values(store.theme.raw)) if (HEX.test(v)) set.add(v.toLowerCase())
			return [...set]
		},
	})
	let pickerDriving = false
	function applyPicked(hex, final) {
		if (!ui.selected) return
		pickerDriving = true
		const { key, raw } = ui.selected
		if (raw) store.setRaw(key, hex, { coalesce: 'pick' })
		else store.setSemantic(key, hex, ui.target, { coalesce: 'pick' })
		pickerDriving = false
		if (final) {
			store.commit()
			picker.refreshPalette()
		}
	}

	function verification(key, raw, capture) {
		const t = raw ? testedRaw.get(key) : tested.get(key)
		if (!t) return { level: 'none', text: 'Not verified. Placed from the key name; the real app may differ.' }
		const screens = raw ? [VT.captures.raw[key]?.screen].filter(Boolean) : t.screens
		if (capture && screens.includes(capture)) return { level: 'here', text: 'Verified on this screen' }
		return { level: 'elsewhere', text: `Verified on ${screens.slice(0, 4).map(screenLabel).join(', ')}${screens.length > 4 ? '...' : ''}` }
	}

	function docsLink(key, raw) {
		return `/?q=${encodeURIComponent(key)}`
	}

	function sourceLabel(info) {
		if (info.source === 'theme') return 'Your theme'
		if (info.source === 'linked') return 'Follows Ash'
		if (info.source === 'raw') return `Via ${info.token.raw} (themed)`
		return info.token?.raw ? `Discord: ${info.token.raw}${info.token.opacity < 1 ? ` at ${Math.round(info.token.opacity * 100)}%` : ''}` : 'Discord default'
	}

	function inspectedCard() {
		const d = ui.inspected
		if (!d) return ''
		const capture = d.capture
		const row = p => {
			const info = p.raw ? store.rawInfo(p.key) : store.semanticInfo(p.key)
			const v = verification(p.key, p.raw, capture)
			const sel = ui.selected && ui.selected.key === p.key && !!ui.selected.raw === !!p.raw
			return `<button class="st-iprop${sel ? ' on' : ''}" data-select="${esc(p.key)}" data-raw="${p.raw ? 1 : ''}">
				<span class="st-sw"><i style="${swatchStyle(info.value)}"></i></span>
				<span class="st-iprop-text"><small>${esc(PROPS[p.prop][1])}${p.pressed ? ' (pressed)' : ''}</small><code>${p.raw ? '<em>raw</em> ' : ''}${esc(p.key)}</code></span>
				<span class="st-verify ${v.level}" title="${esc(v.text)}">${v.level === 'here' ? 'Verified' : v.level === 'elsewhere' ? 'Tested elsewhere' : 'Unverified'}</span>
			</button>`
		}
		return `<div class="st-inspect">
			<div class="st-inspect-head"><span><small>Inspecting</small><b>${esc(d.name)}</b></span><button class="st-icon-btn" data-cmd="clear-inspect" aria-label="Close inspector card">&times;</button></div>
			${d.fixed ? `<p class="st-fixed"><b>Fixed styling.</b> ${esc(d.fixed)} is not drawn from theme colours, so no key changes it.</p>` : ''}
			${d.props.length ? `<div class="st-iprops">${d.props.map(row).join('')}</div>` : ''}
			${d.context.length ? `<p class="st-context">Sits on ${d.context.map(c => `<button class="st-chip" data-select="${esc(c.key)}" data-raw="${c.raw ? 1 : ''}">${esc(c.key)}</button>`).join(' ')}</p>` : ''}
		</div>`
	}

	function renderProperty() {
		if (!ui.selected) {
			propPane.innerHTML = `${inspectedCard()}<div class="st-blank">
				<h2>Pick something to edit</h2>
				<p>Choose a key on the left, or turn on <b>Inspect</b> (I) and click anything in the phone to see which keys paint it.</p>
				<p class="muted">Start with the twelve keys in the <a href="/docs/">docs</a>, or the raw key <code>BLURPLE_50</code> for the brand colour.</p>
				<div class="st-quick">${['BACKGROUND_BASE_LOWEST', 'PANEL_BG', 'CHANNEL_BACKGROUND_DEFAULT', 'TEXT_STRONG', 'MOBILE_ACTIONSHEET_BACKGROUND', 'CARD_MUTED_BG'].map(k => `<button class="st-chip" data-select="${k}">${k}</button>`).join('')}<button class="st-chip" data-select="BLURPLE_50" data-raw="1">BLURPLE_50</button></div>
			</div>`
			return
		}
		const { key, raw } = ui.selected
		const m = metaFor(key, raw)
		const known = raw ? key in VT.tokens.raw : key in VT.tokens.semantic
		const v = verification(key, raw, preview.overlay ? preview.overlays[preview.overlay].capture : preview.screens[preview.screen].capture)
		const capture = (raw ? VT.captures.raw : VT.captures.semantic)[key]
		const description = m.description || (known ? 'Exported by this Discord build but not seen in the captured screens, so what it paints is unverified.' : `Not a ${raw ? 'raw' : 'semantic'} key in Discord ${VT.data.discord}. It was kept from an import; Valenced ${raw ? 'skips unknown raw names' : 'passes it on, but nothing may use it'}.`)
		propPane.innerHTML = `${inspectedCard()}
		<article class="st-prop">
			<header class="st-prop-head">
				<div><span class="st-kind">${raw ? 'Raw colour' : 'Semantic key'}${m.area ? ` / ${esc(m.area)}` : ''}</span><h2><button class="st-copy-key" data-copy="${esc(key)}" title="Copy key name">${esc(key).replace(/_/g, '_<wbr>')}</button></h2></div>
				${capture ? `<button class="st-thumb" data-shot="${esc(capture.image)}" title="Open the documented screenshot"><img src="${esc(capture.image)}" alt="${esc(key)} in ${esc(screenLabel(capture.screen))}" loading="lazy"><span class="st-thumb-focus" style="left:${capture.focus.x * 100}%;top:${capture.focus.y * 100}%;width:${capture.focus.width * 100}%;height:${capture.focus.height * 100}%"></span></button>` : ''}
			</header>
			<p class="st-desc">${esc(description)}</p>
			<p class="st-meta"><span class="st-verify ${v.level}">${esc(v.level === 'none' ? (known ? 'No documented example' : 'Unknown key') : m.tested ? `Tested on ${(raw ? 1 : m.tested.screens.length)} screen${raw || m.tested.screens.length === 1 ? '' : 's'}` : '')}</span><a href="${docsLink(key, raw)}">Read in the docs &rarr;</a></p>
			<div class="st-presence"></div>
			<div class="st-values"></div>
			<div class="st-picker-slot"></div>
			<div class="st-extra"></div>
		</article>`
		propPane.querySelector('.st-picker-slot').append(picker.el)
		picker.refreshPalette()
		renderValues()
		updatePresence()
	}

	function renderValues() {
		if (!ui.selected) return
		const { key, raw } = ui.selected
		const wrap = propPane.querySelector('.st-values')
		const extra = propPane.querySelector('.st-extra')
		if (!wrap) return
		if (raw) {
			const info = store.rawInfo(key)
			wrap.innerHTML = `<div class="st-base-row on">
				<span class="st-sw big"><i style="${swatchStyle(info.value)}"></i></span>
				<span class="st-base-name">All bases</span>
				<code>${esc(info.own ?? info.value ?? 'none')}</code>
				<span class="st-src">${info.own != null ? (info.invalid ? 'Invalid, skipped' : 'Your theme') : 'Discord default'}</span>
				${info.own != null ? `<button class="st-reset" data-reset="raw" title="Back to ${esc(info.default || 'none')}">Reset</button>` : ''}
			</div>`
			picker.set(info.own && HEX.test(info.own) ? info.own : info.value)
			const users = [...store.usersOfRaw(key)].sort()
			extra.innerHTML = `<h3>Used by ${users.length} semantic key${users.length === 1 ? '' : 's'} on some base</h3>
				<p class="muted">Raw colours apply to every base. Semantic keys set in your theme win over them.</p>
				<div class="st-chips">${users.slice(0, 60).map(k => `<button class="st-chip${tested.has(k) ? '' : ' faint'}" data-select="${k}">${k}</button>`).join('')}${users.length > 60 ? `<span class="muted">and ${users.length - 60} more</span>` : ''}</div>`
			return
		}
		const target = ui.target
		wrap.innerHTML = BASES.map(b => {
			const info = store.semanticInfo(key, b)
			const linked = b !== 'dark' && store.theme.links[b]
			return `<div class="st-base-row${b === target ? ' on' : ''}" data-target="${b}" role="button" tabindex="0" aria-label="Edit ${BASE_NAMES[b]}">
				<span class="st-sw big"><i style="${swatchStyle(info.value)}"></i></span>
				<span class="st-base-name">${BASE_NAMES[b]}${b === store.base ? ' <em>previewing</em>' : ''}</span>
				<code>${esc(info.invalid ? info.own : info.value ?? 'none')}</code>
				<span class="st-src${info.invalid ? ' bad' : ''}">${info.invalid ? 'Invalid, skipped' : esc(sourceLabel(info))}${linked && info.source !== 'theme' ? '' : ''}</span>
				${info.own != null ? `<button class="st-reset" data-reset="${b}" title="Back to ${esc(info.source === 'theme' && linked ? 'Ash' : 'Discord')}">Reset</button>` : ''}
			</div>`
		}).join('') + `<p class="st-links-note">${LINKABLE.filter(b => store.theme.links[b]).map(b => BASE_NAMES[b]).join(' and ') || 'No base'} ${LINKABLE.filter(b => store.theme.links[b]).length === 1 ? 'follows' : 'follow'} Ash unless set. <button class="st-linkish" data-cmd="tab-theme">Change</button>${BASES.some(b => store.theme.semantic[b][key] != null) ? ` <button class="st-linkish" data-cmd="reset-key">Reset all bases</button>` : ''}</p>`
		const info = store.semanticInfo(key, target)
		if (!pickerDriving) picker.set(info.own && HEX.test(info.own) ? info.own : info.value)
		// Where the default comes from, plus a readability check for text keys
		const tk = info.token
		const cat = VT.tokens.semantic[key]?.category
		let contrastHtml = ''
		if (cat === 'text' && info.value) {
			const bgs = ['CHANNEL_BACKGROUND_DEFAULT', 'PANEL_BG', 'MOBILE_ACTIONSHEET_BACKGROUND'].map(bk => {
				const bg = store.color(bk, target)
				const fg = info.value.length === 9 ? over(info.value, bg) : info.value
				const r = contrast(fg, bg.slice(0, 7))
				return `<span class="st-contrast ${r >= 4.5 ? 'ok' : r >= 3 ? 'meh' : 'bad'}" title="On ${bk}"><i style="background:${bg};color:${info.value}">Aa</i>${r.toFixed(1)}:1</span>`
			})
			contrastHtml = `<h3>Contrast on ${BASE_NAMES[target]}</h3><div class="st-contrasts">${bgs.join('')}</div><p class="muted small">Chat, channel list and settings pages. 4.5:1 or more reads comfortably.</p>`
		}
		extra.innerHTML = `${tk?.raw ? `<h3>Discord's default on ${BASE_NAMES[target]}</h3><p class="st-chain"><code>${esc(info.default)}</code> = <button class="st-chip" data-select="${tk.raw}" data-raw="1">${tk.raw}</button>${tk.opacity < 1 ? ` at ${Math.round(tk.opacity * 100)}% opacity` : ''}. Editing ${tk.raw} changes every key that uses it.</p>` : ''}${contrastHtml}`
	}

	propPane.addEventListener('click', e => {
		const t = e.target
		const sel = t.closest('[data-select]')
		if (sel) return select(sel.dataset.select, !!sel.dataset.raw, { from: sel.closest('.st-inspect') ? 'inspector' : 'panel' })
		const show = t.closest('[data-show]')
		if (show) {
			const [kind, id] = show.dataset.show.split(':')
			preview.show({ kind, id })
			if (matchMedia('(max-width: 900px)').matches) setView('preview')
			return
		}
		const reset = t.closest('[data-reset]')
		if (reset) {
			e.stopPropagation()
			const { key } = ui.selected
			if (reset.dataset.reset === 'raw') store.setRaw(key, null)
			else store.setSemantic(key, null, reset.dataset.reset)
			return
		}
		const row = t.closest('[data-target]')
		if (row) {
			ui.target = row.dataset.target
			if (store.base !== ui.target) store.base = ui.target
			renderValues()
			return
		}
		const shot = t.closest('[data-shot]')
		if (shot) return VT.openImage(shot.dataset.shot, ui.selected.key, null)
		const copyKey = t.closest('[data-copy]')
		if (copyKey) return VT.copy(copyKey.dataset.copy)
		const cmd = t.closest('[data-cmd]')?.dataset.cmd
		if (cmd === 'clear-inspect') {
			ui.inspected = null
			renderProperty()
		}
		if (cmd === 'tab-theme') setTab('theme')
		if (cmd === 'reset-key') store.resetSemanticAll(ui.selected.key)
	})
	propPane.addEventListener('keydown', e => {
		if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-target]')) {
			e.preventDefault()
			e.target.click()
		}
	})

	// ---------- source editor

	sourcePane.innerHTML = `
		<div class="st-source-bar">
			<div class="segmented sm" data-format>${[['legacy', 'Legacy JSON'], ['plugin', 'Plugin index.ts'], ['manifest', 'manifest.json']].map(([v, l]) => `<button data-v="${v}">${l}</button>`).join('')}</div>
			<span class="st-spacer"></span>
			<button class="sm" data-src="copy">Copy</button>
			<button class="sm" data-src="download">Download</button>
		</div>
		<div class="st-code"><pre aria-hidden="true"><code></code></pre><textarea spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Theme source"></textarea></div>
		<div class="st-source-status" role="status"></div>`
	const codeEl = sourcePane.querySelector('pre code'), textarea = sourcePane.querySelector('textarea'), pre = sourcePane.querySelector('pre')
	const srcStatus = sourcePane.querySelector('.st-source-status')
	let sourceDirty = false, sourceTimer, errorLine = null

	function sourceText() {
		if (ui.format === 'plugin') return exportPlugin(store.theme, VT.descriptions.semantic)
		if (ui.format === 'manifest') return { text: exportManifest(store.theme), warnings: [] }
		return exportLegacy(store.theme)
	}

	function renderSource(force) {
		sourcePane.querySelectorAll('[data-format] button').forEach(b => b.classList.toggle('on', b.dataset.v === ui.format))
		if (sourceDirty && !force) return
		const { text, warnings } = sourceText()
		if (textarea.value !== text) {
			const top = textarea.scrollTop
			textarea.value = text
			textarea.scrollTop = top
		}
		textarea.readOnly = ui.format === 'manifest'
		errorLine = null
		highlightSource()
		srcStatus.innerHTML = ui.format === 'manifest'
			? '<span class="ok">Generated from the theme name. Edit the name and author on the Theme tab.</span>'
			: `<span class="ok">In sync with the editor. Edits here apply as you type.</span>${warnings.map(w => `<p class="warn">${esc(w)}</p>`).join('')}`
	}

	function highlightSource() {
		const text = textarea.value
		const lines = (ui.format === 'plugin' ? highlightTs(text) : highlightJson(text)).split('\n')
		codeEl.innerHTML = lines.map((l, i) => `<span class="ln${errorLine === i + 1 ? ' err' : ''}">${l || ' '}</span>`).join('\n') + '\n'
	}

	textarea.addEventListener('input', () => {
		sourceDirty = true
		highlightSource()
		clearTimeout(sourceTimer)
		sourceTimer = setTimeout(applySource, 450)
	})
	textarea.addEventListener('scroll', () => {
		pre.scrollTop = textarea.scrollTop
		pre.scrollLeft = textarea.scrollLeft
	})
	textarea.addEventListener('blur', () => {
		if (!sourceDirty) return
		clearTimeout(sourceTimer)
		applySource()
		if (!errorLine) {
			sourceDirty = false
			renderSource()
		}
	})
	textarea.addEventListener('keydown', e => {
		if (e.key === 'Tab') {
			e.preventDefault()
			document.execCommand('insertText', false, '\t')
		}
	})

	function applySource() {
		const result = validate(textarea.value)
		if (!result.ok) {
			errorLine = result.line ?? null
			highlightSource()
			srcStatus.innerHTML = `<p class="bad">${esc(result.error)}${result.line ? ` (line ${result.line})` : ''}</p><p class="muted">Not applied. The editor keeps the last valid theme.</p>`
			return
		}
		errorLine = null
		highlightSource()
		const next = result.theme
		const current = store.theme
		// Fields one format cannot hold are kept from the current theme
		next.meta = { ...current.meta, ...pickDefined(next.meta), extra: result.format === 'legacy' ? next.meta.extra : current.meta.extra, plugin: next.meta.plugin || current.meta.plugin }
		if (result.format === 'plugin' && !Object.keys(next.meta).includes('authors')) next.meta.authors = current.meta.authors
		sourceApplying = true
		store.replace(next, 'source', { coalesce: 'source' })
		sourceApplying = false
		srcStatus.innerHTML = `<span class="ok">Applied.</span>${[...result.warnings, ...result.problems].map(w => `<p class="warn">${esc(w)}</p>`).join('')}`
	}
	let sourceApplying = false
	const pickDefined = obj => Object.fromEntries(Object.entries(obj).filter(([k, v]) => v !== undefined && k !== 'extra' && k !== 'plugin'))

	sourcePane.querySelector('[data-format]').addEventListener('click', e => {
		const v = e.target.closest('button')?.dataset.v
		if (!v) return
		ui.format = v
		sourceDirty = false
		renderSource(true)
		persistUi()
	})
	sourcePane.addEventListener('click', e => {
		const a = e.target.closest('[data-src]')?.dataset.src
		if (!a) return
		const { text } = sourceText()
		if (a === 'copy') VT.copy(text, ui.format === 'plugin' ? 'index.ts' : ui.format === 'manifest' ? 'manifest.json' : 'the theme JSON')
		else download(text, fileName(ui.format))
	})

	// ---------- theme settings

	function renderTheme() {
		const t = store.theme
		const problems = store.problems()
		const count = b => Object.keys(t.semantic[b]).length
		const extraKeys = Object.keys(t.meta.extra || {})
		themePane.innerHTML = `
		<section class="st-section">
			<label class="st-field"><span>Name</span><input data-meta="name" value="${esc(t.meta.name)}"></label>
			<label class="st-field"><span>Description</span><textarea data-meta="description" rows="2">${esc(t.meta.description)}</textarea></label>
			<div class="st-field"><span>Authors</span>
				${(t.meta.authors || []).map((a, i) => `<div class="st-author"><input data-author="${i}" data-f="name" value="${esc(a.name)}" placeholder="Name" aria-label="Author name"><input data-author="${i}" data-f="id" value="${esc(a.id ?? '')}" placeholder="Discord user ID" aria-label="Author ID"><button class="st-icon-btn" data-cmd="author-remove" data-i="${i}" aria-label="Remove author">&times;</button></div>`).join('')}
				<button class="sm" data-cmd="author-add">Add author</button>
			</div>
		</section>
		<section class="st-section">
			<h3>Bases</h3>
			<p class="muted small">Ash ${count('dark')}, Dark ${count('darker')}, Light ${count('light')}, Onyx ${count('midnight')} semantic colours; ${Object.keys(t.raw).length} raw.</p>
			${LINKABLE.map(b => `<label class="st-check"><input type="checkbox" data-link="${b}" ${t.links[b] ? 'checked' : ''}> ${BASE_NAMES[b]} follows Ash</label>`).join('')}
			<p class="muted small">Legacy JSON always gives Dark the Ash colours, and Onyx falls back to Ash. Plugins can set every base separately; a base left empty keeps Discord's colours.</p>
		</section>
		${problems.length ? `<section class="st-section warnbox"><h3>Needs attention</h3><button data-cmd="repair">Review repairs</button>${problems.map((p, i) => `<div class="st-problem"><p>${esc(p.message)}</p><button class="sm" data-cmd="problem-remove" data-i="${i}">Remove</button></div>`).join('')}</section>` : ''}
		${extraKeys.length ? `<section class="st-section"><h3>Other fields</h3><p class="muted small">Kept as they are and written back on legacy export.</p><pre class="st-extra-json">${esc(JSON.stringify(t.meta.extra, null, 2))}</pre></section>` : ''}
		<section class="st-section">
			<h3>Import</h3>
			<p class="muted small">Legacy theme JSON, a theme plugin's index.ts, or ThemeColors JSON. Imports can be undone.</p>
			<div class="st-row"><button data-cmd="import">Choose a file</button></div>
			<div class="st-row"><input class="st-url" type="url" placeholder="https://raw.githubusercontent.com/..." aria-label="Theme URL"><button data-cmd="import-url">Import URL</button></div>
			<div class="st-drop">Or drop a file anywhere on the studio.</div>
		</section>
		<section class="st-section">
			<h3>Start over</h3>
			<div class="st-row wrap"><button data-cmd="load-dusk">Load the Dusk template</button><button data-cmd="reset-colors">Clear all colours</button><button data-cmd="new-theme">New empty theme</button></div>
		</section>`
	}

	themePane.addEventListener('input', e => {
		const m = e.target.dataset.meta
		if (m) {
			metaEditing = true
			store.setMeta({ [m]: e.target.value }, { coalesce: m })
			metaEditing = false
			if (m === 'name') $('.st-name').value = e.target.value
		}
		const a = e.target.dataset.author
		if (a != null) {
			const authors = store.theme.meta.authors.map((x, i) => (i === +a ? { ...x, [e.target.dataset.f]: e.target.value } : x))
			metaEditing = true
			store.setMeta({ authors }, { coalesce: 'authors' })
			metaEditing = false
		}
	})
	let metaEditing = false
	themePane.addEventListener('change', e => {
		const b = e.target.dataset.link
		if (b) store.setLink(b, e.target.checked)
	})

	// ---------- commands

	host.addEventListener('click', e => {
		if (e.target.closest('[data-cmd="repair"]')) {
			setTab('repair')
			if (matchMedia('(max-width: 900px)').matches) setView('edit')
		}
		if (e.target.closest('[data-cmd="repair-all"]')) {
			const result = repairAll(store.theme, VT.tokens)
			if (result.repaired.length) store.replace(result.theme, 'repair')
			repairReport = result
			renderRepairBanner()
			VT.toast(`Repaired ${result.repaired.length} keys. ${result.unresolved.length} need attention.`)
		}
	})
	const fileInput = $('.st-file')
	async function importFromText(text, source) {
		try {
			const { theme, warnings, format } = importText(text)
			if (!theme.meta.name || theme.meta.name === 'Untitled theme') theme.meta.name = store.theme.meta.name
			store.replace(theme, 'import')
			const n = BASES.reduce((s, b) => s + Object.keys(theme.semantic[b]).length, 0) + Object.keys(theme.raw).length
			VT.toast(`Imported ${format === 'legacy' ? 'legacy theme' : format === 'plugin' ? 'plugin theme' : 'colours'}: ${n} colour${n === 1 ? '' : 's'}. Ctrl+Z undoes it.`)
			if (warnings.length) setTimeout(() => VT.toast(warnings[0]), 1600)
			setTab('theme')
		} catch (err) {
			VT.toast(`Could not import ${source}: ${err.message}`)
		}
	}
	fileInput.onchange = async () => {
		const f = fileInput.files[0]
		if (f) await importFromText(await f.text(), f.name)
		fileInput.value = ''
	}
	host.addEventListener('dragover', e => {
		if ([...e.dataTransfer.types].includes('Files')) {
			e.preventDefault()
			root.classList.add('dropping')
		}
	})
	host.addEventListener('dragleave', e => { if (!host.contains(e.relatedTarget)) root.classList.remove('dropping') })
	host.addEventListener('drop', async e => {
		root.classList.remove('dropping')
		const f = e.dataTransfer.files[0]
		if (!f) return
		e.preventDefault()
		await importFromText(await f.text(), f.name)
	})

	function download(text, name) {
		const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([text], { type: 'text/plain' })), download: name })
		a.click()
		setTimeout(() => URL.revokeObjectURL(a.href), 2000)
	}
	const slug = () => (store.theme.meta.name || 'theme').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'theme'
	const fileName = f => (f === 'plugin' ? 'index.ts' : f === 'manifest' ? 'manifest.json' : `${slug()}.json`)
	const library = createLibrary({ dialog: $('.st-library'), store, descriptions: VT.descriptions.semantic, toast: VT.toast, download })

	function exportAs(action) {
		const [fmt, how] = action.split('-')
		const { text, warnings } = fmt === 'plugin' ? exportPlugin(store.theme, VT.descriptions.semantic) : fmt === 'manifest' ? { text: exportManifest(store.theme), warnings: [] } : exportLegacy(store.theme)
		if (how === 'copy') VT.copy(text, fmt === 'plugin' ? 'index.ts' : 'the theme JSON')
		else {
			download(text, fileName(fmt))
			VT.toast(`Downloaded ${fileName(fmt)}`)
		}
		if (warnings.length) setTimeout(() => VT.toast(warnings[0]), 1500)
	}

	const menu = $('.st-menu-list'), menuBtn = $('[data-cmd="export-menu"]')
	function toggleMenu(open = menu.hidden) {
		menu.hidden = !open
		menuBtn.setAttribute('aria-expanded', String(open))
		if (open) menu.querySelector('button').focus()
	}
	document.addEventListener('click', e => { if (!menu.hidden && !e.target.closest('.st-menu')) toggleMenu(false) }, { signal })
	menu.addEventListener('click', e => {
		const a = e.target.closest('[data-export]')?.dataset.export
		if (!a) return
		toggleMenu(false)
		exportAs(a)
	})

	async function loadTemplate() {
		try {
			const text = await (await fetch('/template/legacy-theme.json')).text()
			const { theme } = importText(text)
			store.replace(theme, 'template')
			VT.toast('Loaded the Dusk template. Ctrl+Z undoes it.')
		} catch (err) {
			VT.toast(`Could not load the template: ${err.message}`)
		}
	}

	host.addEventListener('click', async e => {
		const btn = e.target.closest('[data-cmd]')
		if (!btn || btn.closest('[data-pane="property"]')) return
		const cmd = btn.dataset.cmd
		if (cmd === 'undo') store.undo() || VT.toast('Nothing to undo')
		if (cmd === 'redo') store.redo() || VT.toast('Nothing to redo')
		if (cmd === 'import') fileInput.click()
		if (cmd === 'library') library.open()
		if (cmd === 'export-menu') toggleMenu()
		if (cmd === 'help') $('.st-help').showModal()
		if (cmd === 'inspect') setInspect(!preview.inspecting)
		if (cmd === 'highlight') setHighlight(!ui.highlight)
		if (cmd === 'phone-back') preview.back()
		if (cmd === 'keys-toggle') toggleKeys()
		if (cmd === 'author-add') store.setMeta({ authors: [...(store.theme.meta.authors || []), { name: '', id: '' }] })
		if (cmd === 'author-remove') store.setMeta({ authors: store.theme.meta.authors.filter((_, i) => i !== +btn.dataset.i) })
		if (cmd === 'problem-remove') {
			const p = store.problems()[+btn.dataset.i]
			if (p?.kind === 'raw') store.setRaw(p.key, null)
			else if (p) store.setSemantic(p.key, null, p.base)
		}
		if (cmd === 'import-url') {
			const url = themePane.querySelector('.st-url').value.trim()
			if (!url) return
			try {
				const res = await fetch(url)
				if (!res.ok) throw new Error(`HTTP ${res.status}`)
				await importFromText(await res.text(), url)
			} catch (err) {
				VT.toast(`Could not fetch that URL (${err.message}). The host may block browser requests; download it and use Choose a file.`)
			}
		}
		if (cmd === 'load-dusk') loadTemplate()
		if (cmd === 'reset-colors') {
			const t = structuredClone(store.theme)
			t.semantic = { dark: {}, darker: {}, light: {}, midnight: {} }
			t.raw = {}
			store.replace(t, 'reset')
			VT.toast('Cleared every colour. Ctrl+Z brings them back.')
		}
		if (cmd === 'new-theme') {
			store.replace({}, 'new')
			VT.toast('Started a new theme. Ctrl+Z goes back.')
		}
	})

	$('.st-name').addEventListener('input', e => {
		metaEditing = true
		store.setMeta({ name: e.target.value }, { coalesce: 'name' })
		metaEditing = false
		const field = themePane.querySelector('[data-meta="name"]')
		if (field) field.value = e.target.value
	})

	host.querySelector('.st-bases-switch').addEventListener('click', e => {
		const b = e.target.closest('[data-base]')?.dataset.base
		if (b) setBase(b)
	})

	function setBase(b) {
		ui.target = b
		store.base = b
		persistUi()
	}
	function setInspect(on) {
		preview.setInspecting(on)
		const btn = $('[data-cmd="inspect"]')
		btn.classList.toggle('on', on)
		btn.setAttribute('aria-pressed', String(on))
		updatePresence()
	}
	function setHighlight(on) {
		ui.highlight = on
		const btn = $('[data-cmd="highlight"]')
		btn.classList.toggle('on', on)
		btn.setAttribute('aria-pressed', String(on))
		restoreHighlight()
		persistUi()
	}
	function toggleKeys(force) {
		ui.keysHidden = force ?? !ui.keysHidden
		$('.st-body').classList.toggle('keys-hidden', ui.keysHidden)
		persistUi()
	}
	function setTab(tab) {
		ui.tab = tab
		host.querySelectorAll('.st-edit-tabs button').forEach(b => {
			b.classList.toggle('on', b.dataset.tab === tab)
			b.setAttribute('aria-pressed', String(b.dataset.tab === tab))
		})
		host.querySelectorAll('.st-pane').forEach(p => (p.hidden = p.dataset.pane !== tab))
		if (tab === 'source') renderSource()
		if (tab === 'theme') renderTheme()
		if (tab === 'repair') repair.render()
		persistUi()
	}
	host.querySelector('.st-edit-tabs').addEventListener('click', e => {
		const tab = e.target.closest('[data-tab]')?.dataset.tab
		if (tab) setTab(tab)
	})
	function setView(v) {
		ui.view = v
		root.dataset.view = v
		host.querySelectorAll('.st-tabs button').forEach(b => {
			b.classList.toggle('on', b.dataset.view === v)
			b.setAttribute('aria-pressed', String(b.dataset.view === v))
		})
		if (v === 'preview') requestAnimationFrame(layoutPhone)
	}
	host.querySelector('.st-tabs').addEventListener('click', e => {
		const v = e.target.closest('[data-view]')?.dataset.view
		if (v) setView(v)
	})

	// Resizable panels; double-click the key list's handle to hide it
	host.querySelectorAll('.st-resize').forEach(handle => {
		const which = handle.dataset.resize
		const syncValue = () => {
			handle.setAttribute('aria-valuemin', '220')
			handle.setAttribute('aria-valuemax', '560')
			handle.setAttribute('aria-valuenow', String(ui[which + 'W']))
		}
		syncValue()
		handle.addEventListener('keydown', e => {
			if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return
			e.preventDefault()
			ui[which + 'W'] = Math.min(560, Math.max(220, ui[which + 'W'] + (e.key === 'ArrowRight' ? 20 : -20)))
			root.style.setProperty(`--${which}-w`, ui[which + 'W'] + 'px')
			syncValue()
			persistUi()
		})
		handle.addEventListener('dblclick', () => which === 'keys' && toggleKeys())
		handle.addEventListener('pointerdown', e => {
			e.preventDefault()
			handle.setPointerCapture(e.pointerId)
			const startX = e.clientX, start = which === 'keys' ? ui.keysW : ui.editW
			if (which === 'keys' && ui.keysHidden) toggleKeys(false)
			const move = ev => {
				const w = Math.min(560, Math.max(220, start + ev.clientX - startX))
				if (which === 'keys') ui.keysW = w
				else ui.editW = w
				root.style.setProperty(which === 'keys' ? '--keys-w' : '--edit-w', w + 'px')
				syncValue()
			}
			const up = () => {
				handle.removeEventListener('pointermove', move)
				handle.removeEventListener('pointerup', up)
				persistUi()
			}
			handle.addEventListener('pointermove', move)
			handle.addEventListener('pointerup', up)
		})
	})

	// ---------- keyboard

	document.addEventListener('keydown', e => {
		if (!host.isConnected || host.querySelector('dialog[open]')) return
		const typing = e.target.closest('input, textarea, select, [contenteditable]')
		const mod = e.ctrlKey || e.metaKey
		if (mod && e.key.toLowerCase() === 'z' && !typing) {
			e.preventDefault()
			e.shiftKey ? store.redo() : store.undo()
			return
		}
		if (mod && e.key.toLowerCase() === 'y' && !typing) {
			e.preventDefault()
			store.redo()
			return
		}
		if (mod && e.key.toLowerCase() === 'k') {
			e.preventDefault()
			focusSearch()
			return
		}
		if (mod && e.key.toLowerCase() === 'e') {
			e.preventDefault()
			toggleMenu(true)
			return
		}
		if (mod && e.key.toLowerCase() === 's') {
			e.preventDefault()
			library.save()
			return
		}
		if (e.key === 'Escape') {
			if (!menu.hidden) return toggleMenu(false)
			if (preview.inspecting) return setInspect(false)
			if (preview.overlay) return preview.close()
			if (typing) return e.target.blur()
			return
		}
		if (typing || mod || e.altKey) return
		if (e.key === '/') {
			e.preventDefault()
			focusSearch()
		} else if (e.key === 'i' || e.key === 'I') setInspect(!preview.inspecting)
		else if (e.key === 'h' || e.key === 'H') setHighlight(!ui.highlight)
		else if (e.key === '?') $('.st-help').showModal()
		else if (['1', '2', '3', '4'].includes(e.key)) setBase(BASES[+e.key - 1])
		else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && e.target === document.body) {
			e.preventDefault()
			moveSelection(e.key === 'ArrowDown' ? 1 : -1)
		}
	}, { signal })
	window.addEventListener('storage', e => { if (e.key?.startsWith('valenced-studio:library')) library.refresh() }, { signal })
	function focusSearch() {
		if (ui.keysHidden) toggleKeys(false)
		if (matchMedia('(max-width: 900px)').matches) setView('keys')
		$('.st-keys-search').focus()
		$('.st-keys-search').select()
	}

	// ---------- store events

	const savedEl = $('.st-saved')
	store.on('saving', () => { savedEl.textContent = 'Saving...'; savedEl.className = 'st-saved' })
	store.on('saved', r => {
		savedEl.textContent = r.ok ? 'Saved locally' : 'Not saved: storage is full or blocked'
		savedEl.className = 'st-saved ' + (r.ok ? 'ok' : 'bad')
	})
	store.on('change', detail => {
		repairReport = null
		renderRepairBanner()
		updateRows(detail)
		if (detail.all) {
			if (detail.label === 'import' || detail.label === 'template' || detail.label === 'new' || detail.label === 'repair' || detail.label === 'library' || detail.history) renderKeyList()
			host.querySelectorAll('.st-bases-switch button').forEach(b => b.classList.toggle('on', b.dataset.base === store.base))
		}
		if (ui.selected && (detail.all || (ui.selected.raw ? detail.raw?.includes(ui.selected.key) : detail.semantic?.includes(ui.selected.key)) || (!ui.selected.raw && detail.raw?.length))) renderValues()
		if (ui.inspected) refreshInspectSwatches()
		if (ui.changed && !detail.all) scheduleListRefresh()
		if (ui.tab === 'repair') repair.render()
		if (ui.tab === 'source' && !sourceApplying) renderSource()
		if (ui.tab === 'theme' && (detail.all || detail.label)) renderTheme()
		syncHistoryButtons()
	})
	store.on('meta', () => {
		if (!metaEditing) {
			$('.st-name').value = store.theme.meta.name
			if (ui.tab === 'theme') renderTheme()
		}
		if (ui.tab === 'repair') repair.render()
		if (ui.tab === 'source' && !sourceApplying) renderSource()
		syncHistoryButtons()
	})
	store.on('base', b => {
		ui.target = b
		host.querySelectorAll('.st-bases-switch button').forEach(x => x.classList.toggle('on', x.dataset.base === b))
	})
	let listTimer
	function scheduleListRefresh() {
		clearTimeout(listTimer)
		listTimer = setTimeout(renderKeyList, 400)
	}
	function refreshInspectSwatches() {
		propPane.querySelectorAll('.st-iprop').forEach(el => {
			const info = el.dataset.raw ? store.rawInfo(el.dataset.select) : store.semanticInfo(el.dataset.select)
			el.querySelector('.st-sw i').style.cssText = swatchStyle(info.value)
		})
	}
	function syncHistoryButtons() {
		$('[data-cmd="undo"]').disabled = !store.canUndo
		$('[data-cmd="redo"]').disabled = !store.canRedo
	}

	// ---------- start

	renderRepairBanner()

	$('.st-name').value = store.theme.meta.name
	host.querySelectorAll('.st-bases-switch button').forEach(b => b.classList.toggle('on', b.dataset.base === store.base))
	setHighlight(ui.highlight)
	renderKeyList()
	renderProperty()
	setTab(ui.tab)
	setView('preview')
	syncHistoryButtons()
	layoutPhone()

	/** Picks the screen that best shows a key: the documented example's screen when the preview has it. */
	function locate(key, raw) {
		if (preview.countKey(key, raw)) return
		const list = preview.screensFor(key, raw)
		if (!list.length) return
		const example = (raw ? VT.captures.raw : VT.captures.semantic)[key]?.screen
		const capOf = s => (s.kind === 'screen' ? preview.screens[s.id] : preview.overlays[s.id]).capture
		const best = list.find(s => capOf(s) === example) || list.find(s => s.kind === 'screen') || list[0]
		preview.show(best)
	}

	return {
		/** Handles /studio/#KEY, #@RAW, #!dusk, #!new and #!import links. */
		route(param) {
			if (!param) return layoutPhone()
			const value = decodeURIComponent(param)
			if (value === '!dusk') {
				history.replaceState(history.state, '', location.pathname + location.search)
				return loadTemplate()
			}
			if (value === '!new' || value === '!import') {
				history.replaceState(history.state, '', location.pathname + location.search)
				if (value === '!new') {
					store.replace({}, 'new')
					VT.toast('Started a new theme. Undo brings your previous theme back.')
				} else fileInput.click()
				setTab('theme')
				if (matchMedia('(max-width: 900px)').matches) setView('edit')
				return layoutPhone()
			}
			const raw = value.startsWith('@')
			const key = raw ? value.slice(1) : value
			if (!(raw ? key in VT.tokens.raw : key in VT.tokens.semantic) && !(raw ? store.theme.raw : store.theme.semantic.dark)[key]) return
			if (!ui.selected || ui.selected.key !== key || ui.selected.raw !== raw) select(key, raw, { from: 'route' })
			locate(key, raw)
			if (matchMedia('(max-width: 900px)').matches) setView('edit')
			if (!ui.highlight) setHighlight(true)
			requestAnimationFrame(layoutPhone)
		},
		store,
		preview,
		destroy() {
			lifetime.abort()
			stageObserver.disconnect()
			preview.destroy()
			if (window.VTStudio?.store === store) delete window.VTStudio
		},
	}
}

// ---------- syntax highlighting (escapes first, then wraps tokens)

const swatchFor = hex => (HEX.test(hex) ? ` style="text-decoration-color:${hex.length === 4 ? hex : hex.slice(0, 7)}"` : '')
function highlightJson(text) {
	return esc(text).replace(/(&quot;(?:[^&\\]|\\.|&(?!quot;))*?&quot;)(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?)/g, (m, str, colon, kw, num) => {
		if (str) {
			if (colon) return `<span class="t-key">${str}</span>${colon}`
			const inner = str.slice(6, -6)
			return HEX.test(inner) ? `<span class="t-str t-hex"${swatchFor(inner)}>${str}</span>` : `<span class="t-str">${str}</span>`
		}
		if (kw) return `<span class="t-kw">${kw}</span>`
		if (num) return `<span class="t-num">${num}</span>`
		return m
	})
}
function highlightTs(text) {
	return esc(text).replace(/(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|('(?:[^'\\\n]|\\.)*'|`[^`]*`|&quot;(?:[^&\n]|&(?!quot;))*&quot;)|\b(import|export|default|const|type|from|return|function)\b|\b([A-Z][A-Z0-9_]{2,})(?=\s*:)|\b([a-zA-Z_]\w*)(?=\s*\()/g, (m, comment, str, kw, key, fn) => {
		if (comment) return `<span class="t-com">${comment}</span>`
		if (str) {
			const inner = str.replace(/^'|'$/g, '')
			return HEX.test(inner) ? `<span class="t-str t-hex"${swatchFor(inner)}>${str}</span>` : `<span class="t-str">${str}</span>`
		}
		if (kw) return `<span class="t-kw">${kw}</span>`
		if (key) return `<span class="t-key">${key}</span>`
		if (fn) return `<span class="t-fn">${fn}</span>`
		return m
	})
}
