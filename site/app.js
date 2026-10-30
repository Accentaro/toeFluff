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

// ---------- markdown, just what README.md uses

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

function markdown(src) {
	const lines = src.replace(/\r/g, '').split('\n')
	let html = ''
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]
		if (line.startsWith('```')) {
			let code = ''
			while (++i < lines.length && !lines[i].startsWith('```')) code += lines[i] + '\n'
			html += `<pre><code>${esc(code)}</code></pre>`
		} else if (/^#{1,3} /.test(line)) {
			const n = line.indexOf(' ')
			html += `<h${n}>${inline(line.slice(n + 1))}</h${n}>`
		} else if (line.startsWith('|')) {
			const rows = []
			while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++])
			i--
			const cells = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())
			const head = cells(rows[0])
			// an all-empty header row (used for image grids) is left out
			html += '<table>' + (head.some(Boolean) ? '<thead><tr>' + head.map(c => `<th>${inline(c)}</th>`).join('') + '</tr></thead>' : '') + '<tbody>'
			for (const r of rows.slice(2)) html += '<tr>' + cells(r).map(c => `<td>${inline(c)}</td>`).join('') + '</tr>'
			html += '</tbody></table>'
		} else if (/^(-|\d+\.) /.test(line)) {
			const ordered = /^\d/.test(line)
			let items = ''
			while (i < lines.length && /^(-|\d+\.) /.test(lines[i])) {
				let item = lines[i].replace(/^(-|\d+\.) /, '')
				while (i + 1 < lines.length && /^ {2,}\S/.test(lines[i + 1])) item += ' ' + lines[++i].trim()
				items += `<li>${inline(item)}</li>`
				i++
			}
			i--
			html += ordered ? `<ol>${items}</ol>` : `<ul>${items}</ul>`
		} else if (line.startsWith('<')) {
			html += line
		} else if (line.trim()) {
			let para = line
			while (i + 1 < lines.length && lines[i + 1].trim() && !/^([#|<`]|- |\d+\. )/.test(lines[i + 1])) para += ' ' + lines[++i]
			html += `<p>${inline(para)}</p>`
		}
	}
	// image paths in the README are relative to the repo root
	return html.replace(/src="(?!https?:)([^"]+)"/g, `src="${ROOT}$1"`)
}

// ---------- pages

let data, resolved, tokens, areas, captures, examples, descriptions, store

async function renderGuide() {
	const el = $('#page-guide')
	const readme = await get('README.md', 'text')
	el.innerHTML = `<div class="guide-hero">
		<div class="hero-copy"><p class="eyebrow">VALENCED / THEME WORKSPACE</p>
		<h1>Your colours.<br>Your Discord.</h1>
		<p class="lead">Make Valenced feel like you. Explore the colour keys behind Discord on Android, see every change in the studio, and export a theme ready to use.</p>
		<div class="hero-actions"><a class="button primary" href="#studio/!dusk">Start from Dusk <span aria-hidden="true">↗</span></a><a class="button" href="#studio/!new">Start blank</a><button data-start-import>Import a theme</button></div>
		<a class="browse-link" href="#keys">Find the key you need <span aria-hidden="true">→</span></a>
		<p class="hero-note">Local autosave. No account. Your theme stays in your browser.</p>
		</div>
		<div class="hero-demo"><div class="demo-label"><span class="eyebrow">LIVE PREVIEW</span><a href="#studio">Open studio ↗</a></div><div id="guide-live" class="live-preview" aria-label="Live theme preview"><p class="empty" role="status">Loading preview…</p></div></div>
	</div>
	<div class="workflow"><a href="#keys"><span>01 / EXPLORE</span><strong>Find what a key paints</strong><p>Tested examples, searchable by screen.</p></a><a href="#studio"><span>02 / CREATE</span><strong>See your changes live</strong><p>Four bases. One theme. Full control.</p></a><a href="#templates"><span>03 / EXPORT</span><strong>Take your theme with you</strong><p>Legacy JSON or a theme plugin.</p></a></div>
	<div class="guide-layout"><article class="guide-body">${markdown(readme.slice(readme.indexOf('## How colours work')))}</article><nav class="contents" aria-label="On this page"><p class="nav-label">ON THIS PAGE</p></nav></div>`
	el.querySelectorAll('.guide-body h2').forEach((heading, index) => {
		heading.id = `guide-section-${index}`
		const link = document.createElement('a')
		link.href = `#guide/${heading.id}`
		link.textContent = heading.textContent
		$('.contents').append(link)
	})
	el.querySelectorAll('td img').forEach(img => {
		const name = img.closest('td').querySelector('code')?.textContent
		const capture = captures.semantic[name]
		const key = data.semantic.find(key => key.key === name)
		const button = document.createElement('button')
		button.className = 'image-button'
		button.setAttribute('aria-label', `Enlarge ${name || 'screenshot'}`)
		if (capture) img.src = capture.image
		if (key) {
			button.dataset.name = name
			button.dataset.description = `Pink shows: ${key.description}${capture?.textScrambled ? ' Personal text is scrambled.' : ''}`
			img.alt = `What ${name} colours`
		}
		img.replaceWith(button)
		button.append(img)
		button.insertAdjacentHTML('beforeend', focusOutline(capture))
		button.onclick = () => openImage(img.src, button.getAttribute('aria-label'), button)
	})
}

const keyState = { kind: 'semantic', area: null, q: '' }

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
		const swatches = kind === 'semantic'
			? BASES.map(([b, name]) => `<span class="swatch">${dot(k.defaults[b])}${name}</span>`).join('')
			: `<span class="swatch">${dot(k.value)}${esc(k.value)}</span>`
		const current = kind === 'semantic' ? store.semanticInfo(k.key, 'dark') : store.rawInfo(k.key)
		const extra = (kind === 'semantic'
			? `<span class="used-by">Ash default ${esc(k.defaults.dark)}, raw ${esc(k.raw.dark ?? 'none')}</span>`
			: k.usedBy.length ? `<span class="used-by">Used by ${k.usedBy.length} semantic key${k.usedBy.length > 1 ? 's' : ''}</span>` : '')
			+ `<span class="card-actions"><a class="studio-link" href="#studio/${kind === 'raw' ? '@' : ''}${esc(k.key)}">Edit in the studio</a><span class="yours">${dot(current.value)}Your theme (Ash): ${esc(current.value)}${current.source === 'default' ? ' · default' : ''}</span><button class="key-preview-button" data-preview-key="${kind === 'raw' ? '@' : ''}${esc(k.key)}">Preview this key</button></span>`
		return `<div class="card">
			<div class="card-body">
				<button class="key" data-key="${esc(k.key)}" title="Copy">${esc(k.key).replace(/_/g, '_<wbr>')}</button>
				<span class="focus-label"><i aria-hidden="true"></i> Pink shows</span>
				<p>${inline(esc(k.description))}</p>
				${extra}
				<div class="swatches">${swatches}</div>
			</div>
			<div class="key-gallery" role="group" aria-label="${esc(k.key)} examples">${gallery}</div>
		</div>`
	}

	if (kind === 'semantic') {
		$('#keys-list').innerHTML = areas
			.map(a => [a, items.filter(k => k.area === a)])
			.filter(([, list]) => list.length)
			.map(([a, list]) => `<h2 class="area-title">${esc(a)}</h2><div class="grid">${list.map(card).join('')}</div>`)
			.join('')
	} else {
		$('#keys-list').innerHTML = `<div class="grid">${items.map(card).join('')}</div>`
	}
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
		if (active) {
			$('#current-page').textContent = a.textContent
			a.scrollIntoView({ block: 'nearest', inline: 'nearest' })
		}
	})
	document.title = `${$('#current-page').textContent} · Valenced Theming`
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
	$('#keys-meta').textContent = `Discord ${data.discord} / Ash / ${data.tested}. Pink marks a single changed key; outlines locate smaller targets. Examples include live screens and isolated Discord controls. Select an image to enlarge it or a key name to copy it.`
	await Promise.all([renderGuide(), renderTemplates()])
	store.on('change', () => {
		updateThemePresence()
		if ($('#page-keys').classList.contains('on')) renderKeys()
		if ($('#page-all').classList.contains('on')) renderAll()
	})
	store.on('meta', updateThemePresence)
	updateThemePresence()
	$('[data-start-import]').onclick = () => { location.hash = 'studio/!import' }
	renderAll()
	window.addEventListener('hashchange', route)
	route()
})().catch(err => {
	document.querySelector('main').innerHTML = `<p class="empty">Couldn't load the data: ${esc(err.message)}.<br>Serve the repo root over HTTP and open /site/.</p><button class="retry">Reload and try again</button>`
	document.querySelector('.retry').onclick = () => location.reload()
})
