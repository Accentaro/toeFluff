import { HEX, normalize } from './color.js'

const esc = value => String(value ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c])
export const TAB_PARTS = { row: 'Tab row background', text: 'All tab text', indicator: 'Selected tab indicator' }
const imageTypes = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }
export function readAppearance(value) {
	const out = {}
	if (value?.background) {
		const b = value.background
		if (typeof b.path !== 'string' || !(/^(https?:\/\/|assets\/background\.(png|jpg|webp)$)/.test(b.path))) throw Error('Use an HTTP(S) image URL or an uploaded background image.')
		if (!b.path.startsWith('assets/background.')) {
			const url = new URL(b.path)
			if (!['http:', 'https:'].includes(url.protocol)) throw Error('Use an HTTP(S) image URL.')
		}
		out.background = { path: b.path }
		for (const [key, fallback, max] of [['opacity', 1, 1], ['blur', 0, 50], ['dimming', 0.7, 1]]) {
			const n = b[key] ?? fallback
			if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > max) throw Error(`Invalid background ${key}.`)
			out.background[key] = n
		}
		if (typeof b.preview === 'string' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(b.preview) && b.preview.length < 2100000) out.background.preview = b.preview
	}
	if (value?.tabs) {
		const tabs = {}
		for (const key of Object.keys(TAB_PARTS)) {
			const color = value.tabs[key] ?? (key === 'text' ? value.tabs.selectedText ?? value.tabs.otherText : undefined)
			if (color != null && (!HEX.test(color) || typeof color !== 'string')) throw Error(`Invalid ${TAB_PARTS[key]}.`)
			if (color) tabs[key] = normalize(color)
		}
		if (Object.keys(tabs).length) out.tabs = tabs
	}
	return out
}
export function mountBackground({ host, store, toast }) {
	let draft, revision = 0
	function render() {
		revision++
		draft = structuredClone(store.theme.meta.appearance || {})
		const b = draft.background || {}
		host.innerHTML = `<form class="st-section st-appearance">
			<h3>Background image</h3>
			<p class="small muted">One image behind chat, the channel list and server rail. Preview is approximate; Valenced uses Discordâ€™s gradient surfaces.</p>
			<label class="st-field"><span>Upload image (PNG, JPEG or WebP, up to 1.5 MB)</span><input name="image" type="file" accept="image/png,image/jpeg,image/webp"></label>
			<label class="st-field"><span>Or image URL</span><input name="url" type="url" placeholder="https://example.com/background.jpg" value="${esc(b.path?.startsWith('http') ? b.path : '')}"></label>
			<p class="small" data-image-status>${esc(b.path || 'No background image')}</p>
			${[['opacity','Image opacity',b.opacity ?? 1,1,0.05],['dimming','Surface dimming',b.dimming ?? 0.7,1,0.05],['blur','Blur',b.blur ?? 0,50,1]].map(([name,label,value,max,step]) => `<label class="st-field"><span>${label}</span><input name="${name}" type="number" value="${value}" min="0" max="${max}" step="${step}" required></label>`).join('')}
			<button type="button" data-remove-image>Remove image</button>
			<button type="button" data-download-image ${b.preview ? '' : 'hidden'}>Download background asset</button>
			<p class="small muted">Uploaded images stay in this browser. Download the background asset and place it in your pluginâ€™s assets/ folder before building. Legacy JSON needs a hosted image URL and cannot apply the tab patch.</p>
			<div class="st-row"><button class="primary" type="submit">Apply to theme</button><button type="button" data-reset>Reset background</button></div>
			<p role="status" data-status></p>
		</form>`
	}
	render()
	const off = store.on('meta', render)
	host.addEventListener('change', async e => {
		if (e.target.name !== 'image') return
		const file = e.target.files[0], current = ++revision
		if (!file) return
		const status = host.querySelector('[data-status]')
		try {
			if (!imageTypes[file.type] || file.size > 1500000) throw Error('Choose a PNG, JPEG or WebP image up to 1.5 MB.')
			host.querySelector('[type="submit"]').disabled = true
			const preview = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(Error('Could not read the image.')); reader.readAsDataURL(file) })
			const image = new Image(); image.src = preview; await image.decode()
			if (current !== revision) return
			draft.background = { ...draft.background, path: `assets/background.${imageTypes[file.type]}`, preview }
			host.querySelector('[name="url"]').value = ''
			host.querySelector('[data-image-status]').textContent = file.name + ' â€” ready to apply'
			status.textContent = 'Click Apply to theme to use this image.'
		} catch (error) { if (current === revision) status.textContent = error.message }
		finally { if (current === revision) host.querySelector('[type="submit"]').disabled = false }
	})
	host.addEventListener('click', e => {
		if (e.target.closest('[data-remove-image]')) {
			revision++; delete draft.background
			host.querySelector('[type="submit"]').disabled = false
			host.querySelector('[name="url"]').value = ''
			host.querySelector('[name="image"]').value = ''
			host.querySelector('[data-image-status]').textContent = 'No image â€” apply to remove'
		}
		if (e.target.closest('[data-reset]')) { const extra = { ...store.theme.meta.extra }; delete extra.background; store.setMeta({ appearance: { ...store.theme.meta.appearance, background: undefined }, extra }) }
		if (e.target.closest('[data-download-image]')) {
			const b = store.theme.meta.appearance?.background
			if (b?.preview) Object.assign(document.createElement('a'), { href: b.preview, download: b.path.split('/').pop() }).click()
		}
	})
	host.addEventListener('submit', e => {
		e.preventDefault()
		try {
			const values = new FormData(e.target), url = values.get('url').trim()
			const background = url ? { path: url } : draft.background
			const tabs = store.theme.meta.appearance?.tabs || {}
			const appearance = readAppearance({ ...(background ? { background: { ...background, opacity: Number(values.get('opacity')), dimming: Number(values.get('dimming')), blur: Number(values.get('blur')) } } : {}), ...(Object.keys(tabs).length ? { tabs } : {}) })
			const extra = { ...store.theme.meta.extra }; delete extra.background
			store.setMeta({ appearance, extra })
			toast('Applied to theme. Plugin source and preview updated.')
			host.querySelector('[data-status]').textContent = 'Applied. Export the plugin to include these changes.'
		} catch (error) { host.querySelector('[data-status]').textContent = error.message }
	})
	return off
}

export function paintAppearance(phone, store, draftTabs) {
	const { background: b } = store.theme.meta.appearance || {}
	const tabs = { ...readAppearance(store.theme.meta.appearance).tabs, ...draftTabs }
	const screen = phone.querySelector('.vp-screen')
	let image = phone.querySelector('.vp-background-image')
	if (!image) { image = document.createElement('div'); image.className = 'vp-background-image'; image.style.cssText = 'position:absolute;inset:0;pointer-events:none;background-size:cover;background-position:center'; phone.prepend(image) }
	const active = b && ['home','server','chat','bots','dm','forum'].includes(screen.dataset.screen)
	image.style.backgroundImage = active ? `url(${JSON.stringify(b.preview || b.path)})` : 'none'
	image.style.opacity = b?.opacity ?? 1
	image.style.filter = `blur(${b?.blur || 0}px)`
	// These are the surfaces the Themes API clears or dims through Discord's gradient context.
	// Status bars and channel headers keep their normal theme surface above the image.
	const surfaces = new Set(['BACKGROUND_BASE_LOW','BACKGROUND_BASE_LOWEST','CHANNEL_BACKGROUND_DEFAULT','PANEL_BG'])
	for (const el of screen.querySelectorAll('[data-k]')) {
		const key = el.dataset.k.split(/\s+/).find(p => p.startsWith('bg:'))?.slice(3)
		if (key && el.matches('.vp-statusbar, .vp-chan-header, .vp-typing, .vp-chatinput-wrap')) { el.style.backgroundColor = `var(--c-${key})`; continue }
		if (surfaces.has(key)) el.style.backgroundColor = active ? (key === 'PANEL_BG' ? 'transparent' : `color-mix(in srgb, ${store.color('BACKGROUND_BASE_LOWER') || '#000000'} ${b.dimming * 100}%, transparent)`) : `var(--c-${key})`
	}
	for (const row of phone.querySelectorAll('.vp-tabs')) {
		row.style.backgroundColor = tabs?.row || ''
		row.classList.toggle('vp-tabs-custom-row', !!tabs.row)
		for (const tab of row.querySelectorAll('button')) {
			const selected = tab.classList.contains('on')
			tab.style.backgroundColor = ''
			tab.style.color = tabs.text || `var(--c-${selected ? 'TEXT_BRAND' : 'TEXT_MUTED'})`
		}
		for (const indicator of row.querySelectorAll('button i')) indicator.style.backgroundColor = tabs.indicator || 'var(--c-BACKGROUND_BRAND)'
	}
}
