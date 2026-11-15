import { createStore } from './studio/store.js'

// Everything is read from the repo at load time, so the site always matches the latest capture run.
const ROOT = '../'
const BASES = [['dark', 'Ash'], ['darker', 'Dark'], ['light', 'Light'], ['midnight', 'Onyx']]
const $ = sel => document.querySelector(sel)
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

$('.skip-link').onclick = e => {
	e.preventDefault()
	$('#main').focus()
	$('#main').scrollIntoView()
}

const get = async (path, type = 'json') => {
	const res = await fetch(ROOT + path)
	if (!res.ok) throw new Error(`${path}: ${res.status}`)
	return type === 'json' ? res.json() : res.text()
}

// ---------- small helpers

function toast(text) {
	const el = $('#toast')
	el.textContent = text
	el.hidden = false
	clearTimeout(toast.t)
	toast.t = setTimeout(() => (el.hidden = true), 1400)
}

async function copy(text, label = text) {
	try {
		await navigator.clipboard.writeText(text)
		toast(`Copied ${label}`)
	} catch {
		toast('Could not copy. Select the text and copy it manually.')
	}
}

const dot = color => `<span class="dot" title="${esc(color ?? '')}"><i style="background:${esc(color ?? 'transparent')}"></i></span>`

function focusOutline(capture) {
	const focus = capture?.focus
	return focus && focus.width * focus.height < 0.5
		? `<span class="focus-outline" style="left:${focus.x * 100}%;top:${focus.y * 100}%;width:${focus.width * 100}%;height:${focus.height * 100}%" aria-hidden="true"></span>` : ''
}

let imageGroup = [], imageIndex = 0
const screenNames = { chat: 'Announcements', chatinput: 'Chat', keyboard: 'Chat with keyboard', emoji: 'Emoji picker', server: 'Channel list', settings: 'Settings', plugins: 'Plugins', colors: 'Theme colours', alert: 'Alert', actionsheet: 'Message menu', guildsheet: 'Server menu', forum: 'Forum', search: 'Member search', members: 'Members', home: 'Direct messages', you: 'Your profile', inbox: 'Inbox', 'chat-scrolled': 'Chat / Scrolled back', 'chat-unread-preview': 'Chat / Unread preview', 'chat-floating-preview': 'Chat / Jump button preview', 'component-activity': 'Listening activity preview', 'component-buttons': 'Button styles', 'component-buttons-more': 'Additional button styles', 'component-disabled': 'Disabled buttons', 'component-inputs': 'Text fields', 'component-checks': 'Checkboxes, radios and slider', 'component-cards': 'Cards', 'component-badges': 'Badges', 'component-badges-premium': 'Premium badge', 'component-badges-rarity': 'Rarity badges', 'component-notices': 'Notices', 'component-toggles': 'Toggle buttons', 'component-icons': 'Icon buttons', 'component-rows': 'Settings row', 'component-toast-default': 'Notification', 'component-toast-success': 'Success notification', 'component-toast-critical': 'Error notification' }

function openImage(src, alt, button) {
	imageGroup = [...(button?.closest('.key-gallery')?.querySelectorAll('.image-button') || [button])].filter(Boolean)
	imageIndex = imageGroup.indexOf(button)
	$('#image-navigation').hidden = imageGroup.length < 2
	$('#image-position').textContent = `${imageIndex + 1} / ${imageGroup.length}`
	$('#image-screen').textContent = button?.dataset.screen || ''
	const box = $('#lightbox')
	box.querySelector('img').src = src
	box.querySelector('img').alt = alt || 'Discord colour key preview'
	$('#image-title').textContent = button?.dataset.name || alt || 'Theme screenshot'
	$('#image-description').textContent = button?.dataset.description || 'Pink marks the colour changed by this key.'
	$('#image-original').href = src
	const outline = box.querySelector('.focus-outline')
	const source = button?.querySelector('.focus-outline')
	outline.hidden = !source
	outline.style.cssText = source?.style.cssText || ''
	if (!box.open) box.showModal()
}
$('#lightbox').onclick = e => {
	if (e.target === $('#lightbox') || e.target.closest('.close-image')) $('#lightbox').close()
}

function stepImage(step) {
	const button = imageGroup[(imageIndex + step + imageGroup.length) % imageGroup.length]
	if (!button) return
	const img = button.querySelector('img')
	openImage(img.src, img.alt, button)
}
$('#image-prev').onclick = () => stepImage(-1)
$('#image-next').onclick = () => stepImage(1)
$('#lightbox').addEventListener('keydown', e => {
	if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
		e.preventDefault()
		stepImage(e.key === 'ArrowLeft' ? -1 : 1)
	}
})

// ---------- inline markdown for key descriptions

function inline(text) {
	return text
		.replace(/`([^`]+)`/g, (_, c) => `<code>${esc(c)}</code>`)
		.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
		.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
		.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, href) => `<a href="${linkFor(href)}">${t}</a>`)
}

// Repo links that have a page on this site go there; other relative links stay pointed at the files
function linkFor(href) {
	if (/^https?:/.test(href)) return href
	if (href === 'KEYS.md') return '#keys'
	if (href === 'ALL-KEYS.md') return '#all'
	if (href.startsWith('template')) return '#templates'
	return ROOT + href
}

// ---------- pages

let data, resolved, tokens, areas, captures, examples, descriptions, store

// The overview is for people making a theme. How the keys were captured, maintenance and credits live in the repo README.
function renderGuide() {
	$('#page-guide').innerHTML = `<div class="guide-hero">
		<div class="hero-copy">
		<h1>Your colours.<br>Your Discord.</h1>
		<p class="lead">Recolour Discord on Android with Valenced. Change colours on a live preview, then export a theme you can install.</p>
		<div class="hero-actions"><a class="button primary" href="#studio">Open the studio</a><a class="button" href="#keys">Browse tested keys</a></div>
		<p class="hero-note">Free, no account. Your theme is saved in this browser.</p>
		</div>
		<div class="hero-demo"><div id="guide-live" class="live-preview" aria-label="Live theme preview"><p class="empty" role="status">Loading preview…</p></div></div>
	</div>
	<ol class="workflow">
		<li><a href="#studio"><span>1</span><strong>Pick a colour</strong><p>Turn on Inspect and tap anything on the phone to see which key paints it.</p></a></li>
		<li><a href="#studio"><span>2</span><strong>Check every screen</strong><p>Chat, settings, menus and more, on all four of Discord's themes.</p></a></li>
		<li><a href="#templates"><span>3</span><strong>Install it</strong><p>Export a JSON file for Legacy Themes, or a theme plugin.</p></a></li>
	</ol>
	<section class="basics" aria-labelledby="basics-title">
		<h2 id="basics-title">Good to know</h2>
		<div class="basics-grid">
			<div><h3>Two kinds of key</h3><p><strong>Semantic</strong> keys name a job, like <code>TEXT_DEFAULT</code>. <strong>Raw</strong> keys are the palette underneath, like <code>BLURPLE_50</code>, and change everything that uses them. Start with semantic.</p></div>
			<div><h3>Four bases</h3><p>Ash, Dark, Light and Onyx are the themes in Discord's Appearance settings. Your theme can cover any of them; the rest keep Discord's colours.</p></div>
			<div><h3>Keep overlays see-through</h3><p>Some keys, like <code>BACKGROUND_SCRIM</code>, sit over other things. Give them transparency with <code>#RRGGBBAA</code>, for example <code>#00000099</code>.</p></div>
		</div>
	</section>`
}

const keyState = { kind: 'semantic', area: null, q: '', open: { semantic: new Set(), raw: new Set() } }

function renderKeys() {
	document.querySelectorAll('.key-live').forEach(host => host.dispose?.())
	const { kind, area, q } = keyState
	const query = q.trim().toLowerCase()
	const items = data[kind].filter(k =>
		(!area || k.area === area) &&
		(!query || k.key.toLowerCase().includes(query) || k.description.toLowerCase().includes(query)))
	$('#keys-count').textContent = `${items.length} ${kind} key${items.length === 1 ? '' : 's'}${area ? ' · ' + area : ''}`
	$('#keys-kind').querySelectorAll('button').forEach(b => {
		b.classList.toggle('on', b.dataset.kind === kind)
		b.setAttribute('aria-pressed', String(b.dataset.kind === kind))
	})

	$('#keys-areas').hidden = kind !== 'semantic'
	$('#keys-areas').innerHTML = ['All', ...areas].map(a =>
		`<button data-area="${esc(a)}" aria-pressed="${a === 'All' ? !area : a === area}" class="${(a === 'All' ? !area : a === area) ? 'on' : ''}">${esc(a)}</button>`).join('')

	if (!items.length) {
		$('#keys-list').innerHTML = '<p class="empty">No keys match.</p>'
		return
	}

	const card = k => {
		const capture = captures[kind][k.key]
		const image = capture ? capture.image : ROOT + k.image
		const shots = capture ? [capture, ...(examples[kind][k.key] || [])] : [{ image }]
		const gallery = shots.map(shot => {
			const screen = screenNames[shot.screen] || (shot.screen?.startsWith('component-') ? shot.screen.slice(10).replace('buttons-more-pressed-', 'Pressed / ').replace('buttons-pressed-', 'Pressed / ').replace('icons-pressed-', 'Pressed icon / ').replace('rows-pressed-', 'Pressed / ').replace('toggles-pressed-', 'Pressed toggle / ').replaceAll('-', ' ') : 'Earlier probe')
			const description = `Pink shows: ${shot.description || k.description}${shot.measurement === 'baseline-difference' ? ' This colour is partly transparent.' : ''}${shot.textScrambled ? ' Personal text is scrambled.' : ''}`
			return `<figure><button class="image-button" data-name="${esc(k.key)}" data-screen="${esc(screen)}" data-description="${esc(description)}" aria-label="Enlarge ${esc(k.key)}: ${esc(screen)}"><img src="${esc(shot.image)}" alt="${esc(k.key)} in ${esc(screen)}" loading="lazy" width="1080" height="2400">${focusOutline(shot)}<span class="image-zoom">Enlarge</span></button><figcaption>${esc(screen)}${shot.measurement === 'baseline-difference' ? ' / Partly transparent' : ''}${shot.textScrambled ? ' / Text scrambled' : ''}</figcaption></figure>`
		}).join('')
		// Base defaults with their hex, which themers copy from constantly; click a hex to copy it
		const hex = v => v ? `<button class="hex" data-key="${esc(v)}" title="Copy ${esc(v)}">${esc(v)}</button>` : '<span class="hex">none</span>'
		const swatches = kind === 'semantic'
			? BASES.map(([b, name]) => `<span class="swatch">${dot(k.defaults[b])}<span class="swatch-base">${name}</span>${hex(k.defaults[b])}</span>`).join('') + (k.raw?.dark ? `<span class="used-by swatch-raw">Raw on Ash: ${esc(k.raw.dark)}</span>` : '')
			: `<span class="swatch">${dot(k.value)}${hex(k.value)}</span>${k.usedBy.length ? `<span class="used-by swatch-raw">Used by ${k.usedBy.length} semantic key${k.usedBy.length > 1 ? 's' : ''}</span>` : ''}`
		const current = kind === 'semantic' ? store.semanticInfo(k.key, 'dark') : store.rawInfo(k.key)
		const yours = current.source === 'default' ? '' : `<span class="yours">${dot(current.value)}Your theme: ${esc(current.value)}</span>`
		return `<div class="card">
			<div class="card-body">
				<button class="key" data-key="${esc(k.key)}" title="Copy">${esc(k.key).replace(/_/g, '_<wbr>')}</button>
				<p>${inline(esc(k.description))}</p>
				<div class="swatches">${swatches}</div>
				${yours}
				<span class="card-actions"><a class="studio-link" href="#studio/${kind === 'raw' ? '@' : ''}${esc(k.key)}">Edit in the studio</a><button class="key-preview-button" data-preview-key="${kind === 'raw' ? '@' : ''}${esc(k.key)}">Preview on the phone</button></span>
			</div>
			<div class="key-gallery" role="group" aria-label="${esc(k.key)} examples">${gallery}</div>
		</div>`
	}

	// Areas start collapsed and build their cards when opened; a search or area filter opens what matches.
	const groupOf = k => kind === 'semantic' ? k.area : k.key.replace(/_?(NEW_)?\d.*$/, '')
	const order = kind === 'semantic' ? areas : [...new Set(data.raw.map(groupOf))]
	const groups = order.map(g => [g, items.filter(k => groupOf(k) === g)]).filter(([, list]) => list.length)
	const expand = !!query || !!area || groups.length === 1
	const opened = keyState.open[kind]
	$('#keys-list').innerHTML = groups.map(([g, list]) => {
		const open = expand || opened.has(g)
		return `<details class="area" data-group="${esc(g)}"${open ? ' open' : ''}><summary><h2 class="area-title">${esc(g)}</h2><span class="area-count">${list.length} key${list.length === 1 ? '' : 's'}</span></summary><div class="grid">${open ? list.map(card).join('') : ''}</div></details>`
	}).join('')
	$('#keys-list').querySelectorAll('details.area').forEach(el => el.addEventListener('toggle', () => {
		const g = el.dataset.group
		if (el.open) {
			opened.add(g)
			const grid = el.querySelector('.grid')
			if (!grid.children.length) grid.innerHTML = groups.find(([name]) => name === g)[1].map(card).join('')
		} else opened.delete(g)
	}))
}

$('#keys-search').oninput = e => { keyState.q = e.target.value; renderKeys() }
$('#keys-kind').onclick = e => {
	const kind = e.target.dataset.kind
	if (!kind) return
	keyState.kind = kind
	keyState.area = null
	$('#keys-kind').querySelectorAll('button').forEach(b => b.classList.toggle('on', b === e.target))
	renderKeys()
}
$('#keys-areas').onclick = e => {
	const a = e.target.dataset.area
	if (!a) return
	keyState.area = a === 'All' ? null : a
	renderKeys()
}
$('#keys-list').onclick = e => {
	if (e.target.dataset.previewKey) {
		const button = e.target
		const card = button.closest('.card')
		let host = card.querySelector('.key-live')
		if (host) { host.hidden = !host.hidden; button.setAttribute('aria-expanded', String(!host.hidden)); return }
		host = document.createElement('div')
		host.className = 'live-preview key-live'
		card.append(host)
		button.setAttribute('aria-expanded', 'true')
		loadPreview(host, { key: button.dataset.previewKey, readonly: true })
	}
	else if (e.target.dataset.key) copy(e.target.dataset.key)
	else if (e.target.closest('.image-button')) {
		const img = e.target.closest('.image-button').querySelector('img')
		openImage(img.src, img.alt, e.target.closest('.image-button'))
	}
}

function renderAll() {
	const q = $('#all-search').value.trim().toLowerCase()
	const testedOnly = $('#all-tested').checked
	const tested = new Set(data.semantic.map(k => k.key))
	const rows = Object.keys(resolved.semantic).sort()
		.filter(k => (!q || k.toLowerCase().includes(q)) && (!testedOnly || tested.has(k)))
		.map(k => {
			const r = resolved.semantic[k]
			const cells = BASES.map(([b]) => `<td><span class="cell">${dot(r[b])}${esc(r[b] ?? '')}</span></td>`).join('')
			return `<tr><td>${esc(k)}${tested.has(k) ? '<a class="tag" href="#keys/' + esc(k) + '">example</a>' : ''}<a class="tag" href="#studio/${esc(k)}">edit</a></td><td><span class="cell">${dot(store.color(k, 'dark'))}${esc(store.color(k, 'dark'))}</span></td>${cells}<td>${esc(tokens.semantic[k]?.dark?.raw ?? '')}</td></tr>`
		})
	$('#all-table tbody').innerHTML = rows.join('') || '<tr><td colspan="7" class="empty">No keys match.</td></tr>'
}
$('#all-search').oninput = renderAll
$('#all-tested').onchange = renderAll
$('#all-table').onclick = e => {
	const k = e.target.dataset.jump
	if (!k) return
	keyState.kind = 'semantic'
	keyState.area = null
	keyState.q = k
	$('#keys-search').value = k
}

async function renderTemplates() {
	const [legacy, plugin] = await Promise.all([get('template/legacy-theme.json', 'text'), get('template/plugin/js/index.ts', 'text')])
	$('#tpl-legacy').textContent = legacy
	$('#tpl-plugin').textContent = plugin
	document.querySelectorAll('[data-copy]').forEach(b =>
		(b.onclick = () => copy(b.dataset.copy === 'legacy' ? legacy : plugin, b.dataset.copy === 'legacy' ? 'the JSON' : 'the plugin code')))
}

function updateThemePresence() {
	const modified = store.modified()
	const count = modified.semantic.size + modified.raw.size
	const el = $('#theme-presence')
	el.textContent = `${store.theme.meta.name || 'Untitled theme'} · ${count} changed`
	el.title = 'Open your theme in the studio'
	// Only worth showing once there is a theme to go back to
	el.hidden = !count && !store.canUndo && !store.hasTheme
	const guide = $('#guide-live')
	if (guide?.dataset.dusk === 'true' && (count || store.canUndo)) {
		guide.dispose?.()
		guide.dataset.dusk = 'false'
		loadPreview(guide, {})
	}
}

async function loadPreview(host, options) {
	host.dataset.loaded = 'true'
	host.innerHTML = '<p class="empty" role="status">Loading live preview…</p>'
	try {
		const { mountPreview } = await import('./docs-preview.js')
		if (host.isConnected) await mountPreview(host, options)
	} catch (err) {
		delete host.dataset.loaded
		host.innerHTML = `<p class="empty">Preview could not load: ${esc(err.message)}</p><button>Try again</button>`
		host.querySelector('button').onclick = () => loadPreview(host, options)
	}
}

// ---------- routing

let studio
async function openStudio(param, routeHash) {
	if (!studio) {
		const host = $('#page-studio')
		studio = import('./studio/main.js').then(m => m.mount(host)).catch(err => {
			host.innerHTML = `<p class="empty" role="alert">The studio could not load: ${esc(err.message)}</p><button class="retry">Reload and try again</button>`
			host.querySelector('.retry').onclick = () => location.reload()
			studio = null
			throw err
		})
	}
	const editor = await studio
	if (location.hash === routeHash) await editor.route(param)
}

function route() {
	const [page = 'guide', ...rest] = location.hash.slice(1).split('/')
	let section = rest.join('/')
	const id = ['guide', 'studio', 'keys', 'all', 'templates'].includes(page) ? page : 'guide'
	try { decodeURIComponent(section) } catch { section = ''; toast('This link contains an invalid key name.') }
	document.querySelectorAll('.page').forEach(p => p.classList.toggle('on', p.id === 'page-' + id))
	document.querySelectorAll('[data-page]').forEach(a => {
		const active = a.dataset.page === id
		a.classList.toggle('on', active)
		if (active) a.setAttribute('aria-current', 'page')
		else a.removeAttribute('aria-current')
		if (active) a.scrollIntoView({ block: 'nearest', inline: 'nearest' })
	})
	const label = document.querySelector(`[data-page="${id}"]`).textContent
	document.title = id === 'guide' ? 'Valenced Theme Studio' : `${label} · Valenced Theme Studio`
	document.body.classList.toggle('studio-mode', id === 'studio')
	if (id === 'studio') {
		openStudio(section, location.hash).catch(err => toast(`Studio unavailable: ${err.message}`))
		return
	}
	// #keys/KEY and #all/KEY open the reference filtered to one key, e.g. from the studio
	if (id === 'keys' && section) {
		const raw = section.startsWith('@')
		const key = decodeURIComponent(raw ? section.slice(1) : section)
		keyState.kind = raw ? 'raw' : 'semantic'
		keyState.area = null
		keyState.q = key
		$('#keys-search').value = key
	}
	if (id === 'all') {
		if (section) $('#all-search').value = decodeURIComponent(section)
		renderAll()
	}
	if (id === 'keys') renderKeys()
	if (id === 'guide' || id === 'templates') {
		const host = $(id === 'guide' ? '#guide-live' : '#template-live')
		if (host && !host.dataset.loaded) loadPreview(host, { dusk: id === 'templates' || !store.hasTheme, fallback: id === 'guide' })
	}
	if (id === 'guide' && section) document.getElementById(section)?.scrollIntoView()
	else window.scrollTo(0, 0)
}

;(async () => {
	;[data, resolved, tokens, descriptions, examples, captures] = await Promise.all([
		get('data/keys.json'), get('data/resolved.json'), get('data/tokens.json'), get('data/descriptions.json'),
		fetch('capture-examples.json').then(res => { if (!res.ok) throw new Error('Could not load grouped examples'); return res.json() }),
		fetch('capture-data.json').then(res => { if (!res.ok) throw new Error('Could not load screenshot details'); return res.json() }),
	])
	areas = descriptions.areas
	// One copy of the reference data, shared with the studio so the two cannot disagree
	store = createStore({ tokens })
	window.VT = { store, data, resolved, tokens, descriptions, captures, examples, screenNames, openImage: (src, alt) => openImage(src, alt, null), toast, copy }
	$('#keys-meta').textContent = `Each picture shows one key set to pink, so you can see exactly what it paints. Tap a picture to enlarge it, or a key name to copy it. Captured on Discord ${data.discord}, Ash theme.`
	await Promise.all([renderGuide(), renderTemplates()])
	store.on('change', () => {
		updateThemePresence()
		if ($('#page-keys').classList.contains('on')) renderKeys()
		if ($('#page-all').classList.contains('on')) renderAll()
	})
	store.on('meta', updateThemePresence)
	updateThemePresence()
	renderAll()
	window.addEventListener('hashchange', route)
	route()
})().catch(err => {
	document.querySelector('main').innerHTML = `<p class="empty">Couldn't load the data: ${esc(err.message)}.<br>Serve the repo root over HTTP and open /site/.</p><button class="retry">Reload and try again</button>`
	document.querySelector('.retry').onclick = () => location.reload()
})
