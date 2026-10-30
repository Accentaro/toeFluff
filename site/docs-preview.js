import { createStore } from './studio/store.js'
import { createPreview } from './studio/preview.js'
import { importText } from './studio/formats.js'
import * as mock from './studio/mock.js'

export async function mountPreview(host, { dusk = false, fallback = false, key, readonly = false } = {}) {
	let store = window.VT.store
	if (dusk) {
		const response = await fetch('../template/legacy-theme.json')
		if (!response.ok) throw new Error(`Dusk: ${response.status}`)
		const { theme } = importText(await response.text())
		store = createStore({ tokens: window.VT.tokens, initialTheme: theme, persistent: false })
	}
	if (!host.isConnected) return
	if (fallback && window.VT.store.hasTheme) store = window.VT.store
	host.dataset.dusk = String(store !== window.VT.store)
	host.innerHTML = `<div class="demo-controls"><label>Screen <select aria-label="Preview screen"></select></label><span class="demo-theme"></span></div><div class="demo-stage"><div class="demo-phone"></div></div><p class="demo-caption"></p>`
	const phoneHost = host.querySelector('.demo-phone')
	const select = host.querySelector('select')
	const preview = createPreview({ store, host: phoneHost, mock, onNavigate: () => { select.value = preview.screen } })
	for (const screen of Object.values(preview.screens)) select.add(new Option(screen.title, screen.id))
	select.value = preview.screen
	select.onchange = () => {
		preview.go(select.value)
		if (key) preview.highlight(key.replace(/^@/, ''), key.startsWith('@'))
	}
	const caption = host.querySelector('.demo-caption')
	if (key) {
		const raw = key.startsWith('@')
		const name = raw ? key.slice(1) : key
		const targets = preview.screensFor(name, raw)
		if (targets.length) {
			preview.show(targets[0])
			preview.highlight(name, raw)
			caption.textContent = 'Outlined areas use this key. The browser preview is illustrative; captures above show tested results.'
		} else caption.textContent = 'This key is not represented in the live preview. Use the tested captures above.'
	} else caption.textContent = 'Interactive Android preview · fictional content'
	if (readonly) {
		phoneHost.inert = true
		phoneHost.setAttribute('aria-hidden', 'true')
	}
	const syncName = () => { host.querySelector('.demo-theme').textContent = store.theme.meta.name || 'Untitled theme' }
	syncName()
	const offMeta = store.on('meta', syncName)
	const stage = host.querySelector('.demo-stage')
	const resize = () => {
		const scale = Math.min((stage.clientWidth - 32) / 430, .57)
		if (scale <= 0) return
		phoneHost.style.width = `${430 * scale}px`
		phoneHost.style.height = `${933 * scale}px`
		preview.device.style.transform = `scale(${scale})`
		preview.redraw()
	}
	const observer = new ResizeObserver(resize)
	observer.observe(stage)
	resize()
	host.dispose = () => { observer.disconnect(); offMeta(); preview.destroy() }
}
