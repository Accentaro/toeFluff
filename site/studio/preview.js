// The interactive phone. Screens are plain HTML templates; each themed element declares the keys that paint it
// in data-k ("bg:PANEL_BG fg:TEXT_STRONG"). That one attribute drives both the styling and the inspector,
// so what the inspector reports is exactly what paints the element.
import { paintAppearance, TAB_PARTS } from './appearance.js'
import { screens, overlays } from './screens/index.js'

/** data-k property -> CSS property and the label the inspector shows. Raw keys are written @NAME. */
export const PROPS = {
	bg: ['background-color', 'Background'],
	fg: ['color', 'Text and icon'],
	bd: ['border-color', 'Outline'],
	bb: ['border-bottom-color', 'Divider below'],
	bt: ['border-top-color', 'Divider above'],
	bl: ['border-left-color', 'Left edge'],
	fill: ['fill', 'Fill'],
	x: [null, 'Gradient or effect'],
}

export function parseKeys(attr) {
	return (attr || '').trim().split(/\s+/).filter(Boolean).map(part => {
		const [prop, name] = part.split(':')
		const raw = name?.startsWith('@')
		return { prop, key: raw ? name.slice(1) : name, raw }
	}).filter(p => p.key && PROPS[p.prop])
}

/** Keys an element uses in any state, pressed included. */
const elKeys = el => [...parseKeys(el.dataset.k), ...parseKeys(el.dataset.kPress)]
const KEYED = '[data-k], [data-k-press]'

const cssVar = p => (p.raw ? `var(--r-${p.key})` : `var(--c-${p.key})`)

/** Turns data-k into inline custom-property references. Runs once per render, not per colour change. */
function applyKeys(root) {
	for (const el of root.querySelectorAll('[data-k]')) {
		for (const p of parseKeys(el.dataset.k)) {
			const css = PROPS[p.prop][0]
			if (css) el.style.setProperty(css, cssVar(p))
		}
	}
}

export function createPreview({ store, host, mock, onInspect, onNavigate }) {
	const state = {
		screen: 'home',
		overlay: null,
		params: {},
		ui: {}, // per-screen interactive state (switches, typed messages, collapsed categories)
		history: [],
	}
	let inspecting = false
	let pinned = null
	let highlightKey = null
	let draftTabs = null
	let hoverEl = null

	host.innerHTML = `
		<div class="vp-device">
			<div class="vp" data-base="dark">
				<div class="vp-screen"></div>
				<div class="vp-overlay"></div>
				<div class="vp-toasts"></div>
				<div class="vp-marks" aria-hidden="true"></div>
			</div>
		</div>`
	const device = host.querySelector('.vp-device')
	const phone = host.querySelector('.vp')
	const screenEl = phone.querySelector('.vp-screen')
	const overlayEl = phone.querySelector('.vp-overlay')
	const toastEl = phone.querySelector('.vp-toasts')
	const marks = phone.querySelector('.vp-marks')

	// ---------- colours

	const usedSemantic = new Set(), usedRaw = new Set()
	/** Every key any screen uses, collected from the templates so base switches and resets update them all. */
	function collectUsed() {
		const scratch = document.createElement('div')
		const all = [...Object.values(screens), ...Object.values(overlays)]
		for (const s of all) {
			try {
				scratch.innerHTML = s.render(ctxFor(s.id, true))
			} catch {
				continue
			}
			for (const el of scratch.querySelectorAll(KEYED))
				for (const p of elKeys(el)) (p.raw ? usedRaw : usedSemantic).add(p.key)
		}
	}

	function paint(detail = { all: true }) {
		const style = phone.style
		if (detail.all) {
			for (const k of usedSemantic) style.setProperty(`--c-${k}`, store.color(k) || 'transparent')
			for (const k of usedRaw) style.setProperty(`--r-${k}`, store.rawColor(k) || 'transparent')
		} else {
			for (const k of detail.semantic || []) if (usedSemantic.has(k)) style.setProperty(`--c-${k}`, store.color(k) || 'transparent')
			for (const k of detail.raw || []) if (usedRaw.has(k)) style.setProperty(`--r-${k}`, store.rawColor(k) || 'transparent')
		}
		paintAppearance(phone, store, draftTabs)
		phone.dataset.base = store.base
		phone.classList.toggle('vp-light', store.base === 'light')
		if (highlightKey || pinned) requestAnimationFrame(drawMarks)
	}

	// ---------- rendering

	function ctxFor(id, dry = false) {
		const ui = (state.ui[id] ??= {})
		return { mock, ui, params: dry ? {} : state.params, base: store.base, state, dry }
	}

	function paintRenderedKeys(root) {
		for (const el of root.querySelectorAll(KEYED)) {
			for (const p of elKeys(el)) {
				const used = p.raw ? usedRaw : usedSemantic
				if (used.has(p.key)) continue
				used.add(p.key)
				phone.style.setProperty(`${p.raw ? '--r-' : '--c-'}${p.key}`, (p.raw ? store.rawColor(p.key) : store.color(p.key)) || 'transparent')
			}
		}
		applyKeys(root)
	}

	function render() {
		const screen = screens[state.screen]
		const scrollers = [...screenEl.querySelectorAll('[data-scroll]')].map(el => [el.dataset.scroll, el.scrollTop])
		screenEl.innerHTML = screen.render(ctxFor(state.screen))
		screenEl.dataset.screen = state.screen
		paintRenderedKeys(screenEl)
		paintAppearance(phone, store, draftTabs)
		// keep scroll positions across re-renders of the same screen
		if (render.last === state.screen)
			for (const [name, top] of scrollers) {
				const el = screenEl.querySelector(`[data-scroll="${name}"]`)
				if (el) el.scrollTop = top
			}
		else screen.mounted?.(screenEl, ctxFor(state.screen))
		render.last = state.screen
		renderOverlay()
	}

	function renderOverlay() {
		const ov = state.overlay && overlays[state.overlay]
		const scrolls = overlayEl.dataset.overlay === state.overlay
			? [...overlayEl.querySelectorAll('[data-scroll]')].map(el => [el.dataset.scroll, el.scrollTop]) : []
		overlayEl.innerHTML = ov ? ov.render(ctxFor(state.overlay)) : ''
		overlayEl.dataset.overlay = state.overlay || ''
		if (ov) {
			paintRenderedKeys(overlayEl)
			ov.mounted?.(overlayEl, ctxFor(state.overlay))
			for (const [name, top] of scrolls) {
				const el = [...overlayEl.querySelectorAll('[data-scroll]')].find(el => el.dataset.scroll === name)
				if (el) el.scrollTop = top
			}
		}
		pinned = null
		requestAnimationFrame(drawMarks)
	}

	function go(screen, params = {}, { push = true } = {}) {
		if (!screens[screen]) return
		if (push && (state.screen !== screen || JSON.stringify(state.params) !== JSON.stringify(params))) state.history.push([state.screen, state.params])
		if (state.history.length > 30) state.history.shift()
		state.screen = screen
		state.params = params
		state.overlay = null
		render()
		onNavigate?.(state)
	}

	// Where Back leads when there's no history to return to, as in Discord's own navigation
	const PARENT = { ...Object.fromEntries(Object.values(screens).filter(screen => screen.group === 'Settings').map(screen => [screen.id, 'settings'])), 'theme-fonts': 'themes', 'theme-icons': 'themes', 'theme-emojis': 'themes', chat: 'server', bots: 'server', forum: 'server', search: 'bots', channelinfo: 'bots', dm: 'home', inbox: 'home', you: 'home', quests: 'you', shop: 'you', nitro: 'you', profile: 'home', settings: 'you', plugins: 'settings', colors: 'themes', components: 'settings', appearance: 'settings', 'web-browser': 'settings', advanced: 'settings', 'discord-theme': 'appearance', server: 'home' }
	// Leaving a chat always lands on its channel or DM list, as on Discord; other pages step back through history
	const CHATS = new Set(['chat', 'bots', 'forum', 'dm'])
	function back() {
		if (state.overlay) return close()
		if (CHATS.has(state.screen)) {
			const parent = PARENT[state.screen]
			while (state.history.length && state.history.at(-1)[0] !== parent) state.history.pop()
			state.history.pop()
			return go(parent, {}, { push: false })
		}
		const prev = state.history.pop()
		if (prev) return go(prev[0], prev[1], { push: false })
		const parent = PARENT[state.screen]
		if (parent) go(parent, {}, { push: false })
	}

	function open(id, params = {}) {
		const ov = overlays[id]
		if (!ov) return
		if (ov.screen && state.screen !== ov.screen && !params.keepScreen) {
			state.history.push([state.screen, state.params])
			state.screen = ov.screen
			state.params = ov.params || {}
			render()
		}
		state.overlay = id
		state.overlayParams = params
		renderOverlay()
		onNavigate?.(state)
	}

	function close() {
		if (!state.overlay) return
		state.overlay = null
		renderOverlay()
		onNavigate?.(state)
	}

	function toast(kind, text) {
		const el = document.createElement('div')
		const keys = kind === 'critical'
			? 'bg:TOAST_CRITICAL_BACKGROUND bd:TOAST_CRITICAL_BORDER'
			: kind === 'success' ? 'bg:TOAST_SUCCESS_BACKGROUND bd:TOAST_SUCCESS_BORDER' : 'bg:BACKGROUND_SURFACE_HIGHEST bd:BORDER_NORMAL'
		const iconKeys = kind === 'critical' ? 'fg:ICON_FEEDBACK_CRITICAL' : kind === 'success' ? 'fg:ICON_FEEDBACK_POSITIVE' : 'fg:TEXT_STRONG'
		el.className = 'vp-toast'
		el.dataset.k = keys
		el.dataset.n = kind === 'critical' ? 'Error notification' : kind === 'success' ? 'Success notification' : 'Toast'
		el.innerHTML = `<span data-k="${iconKeys}">${toastIcon(kind)}</span><span data-k="fg:${kind === 'critical' || kind === 'success' ? 'TEXT_DEFAULT' : 'TEXT_STRONG'}">${text}</span>`
		toastEl.append(el)
		applyKeys(el.parentElement)
		setTimeout(() => el.classList.add('out'), state.holdToasts ? 1e9 : 2600)
		setTimeout(() => el.remove(), state.holdToasts ? 1e9 : 2900)
	}
	const toastIcon = kind => kind === 'critical'
		? '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1 5h2v7h-2V7Zm1 9a1.3 1.3 0 1 1 0 2.6A1.3 1.3 0 0 1 12 16Z"/></svg>'
		: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.7 6.3a1 1 0 0 1 0 1.4l-5.5 5.5a1 1 0 0 1-1.4 0l-2.5-2.5a1 1 0 1 1 1.4-1.4l1.8 1.8 4.8-4.8a1 1 0 0 1 1.4 0Z"/></svg>'

	// ---------- interaction

	const api = { go, back, open, close, toast, render, renderOverlay, state, setBase: base => { store.base = base } }

	function runAction(el, kind, e) {
		const owner = el.closest('.vp-overlay') ? overlays[state.overlay] : screens[state.screen]
		const ownerId = el.closest('.vp-overlay') ? state.overlay : state.screen
		const name = el.dataset[kind]
		const [action, arg] = name.split(':')
		const handler = owner?.actions?.[action]
		if (!handler) return false
		const result = handler({ el, arg, ui: (state.ui[ownerId] ??= {}), mock, api, event: e, params: state.params, overlayParams: state.overlayParams })
		if (result === 'render') {
			if (el.closest('.vp-overlay')) renderOverlay()
			else render()
		}
		return true
	}

	phone.addEventListener('click', e => {
		if (inspecting) return
		const t = e.target
		const go_ = t.closest('[data-go]')
		const open_ = t.closest('[data-open]')
		const act = t.closest('[data-act]')
		if (t.closest('[data-back]')) return back()
		if (t.closest('[data-close]') && !t.closest('[data-stop]')) return close()
		if (act) return runAction(act, 'act', e)
		if (open_) {
			const [id, arg] = open_.dataset.open.split(':')
			return open(id, { arg, keepScreen: true })
		}
		if (go_) {
			const [screen, arg, ctx] = go_.dataset.go.split(':')
			return go(screen, arg ? { id: arg, ...(ctx ? { ctx } : {}) } : {})
		}
	})

	// Long-press (or right-click) opens menus, as on the phone
	let holdTimer = null, held = false
	phone.addEventListener('pointerdown', e => {
		if (inspecting) return
		const el = e.target.closest('[data-hold]')
		if (!el) return
		held = false
		holdTimer = setTimeout(() => {
			held = true
			const [id, arg] = el.dataset.hold.split(':')
			open(id, { arg, keepScreen: true, own: el.dataset.messageOwn === 'true' })
		}, 450)
	})
	const cancelHold = () => clearTimeout(holdTimer)
	phone.addEventListener('pointerup', cancelHold)
	phone.addEventListener('pointerleave', cancelHold)
	phone.addEventListener('pointermove', e => { if (Math.abs(e.movementX) + Math.abs(e.movementY) > 6) cancelHold() })
	phone.addEventListener('click', e => { if (held) { e.stopPropagation(); e.preventDefault(); held = false } }, true)
	phone.addEventListener('contextmenu', e => {
		const el = e.target.closest('[data-hold]')
		if (!el || inspecting) return
		e.preventDefault()
		const [id, arg] = el.dataset.hold.split(':')
		open(id, { arg, keepScreen: true, own: el.dataset.messageOwn === 'true' })
	})

	// Drag to scroll, like a finger on the phone. A drag that moves more than a few pixels scrolls the
	// nearest scrollable area and doesn't count as a tap.
	let drag = null, dragged = false
	const scrollerOf = el => {
		for (let n = el; n && n !== phone; n = n.parentElement) {
			const s = getComputedStyle(n)
			if ((/(auto|scroll)/.test(s.overflowY) && n.scrollHeight > n.clientHeight + 1) || (/(auto|scroll)/.test(s.overflowX) && n.scrollWidth > n.clientWidth + 1)) return n
		}
		return null
	}
	// Sheets (menus, pickers, the server sheet, voice panel) can be pulled down to close, as on the phone
	const SHEETS = '.vp-sheet, .vp-info-sheet, .vp-picker, .vp-voice'
	let pull = null
	phone.addEventListener('pointerdown', e => {
		if (inspecting || e.button !== 0 || e.target.closest('input, textarea')) return
		const el = scrollerOf(e.target)
		dragged = false
		const sheet = e.target.closest(SHEETS)
		pull = sheet && overlayEl.contains(sheet) ? { sheet, y: e.clientY, x: e.clientX, id: e.pointerId, scroller: el, on: false } : null
		drag = el && { el, x: e.clientX, y: e.clientY, top: el.scrollTop, left: el.scrollLeft, id: e.pointerId }
	})
	window.addEventListener('pointermove', e => {
		if (!pull || e.pointerId !== pull.id) return
		const scale = phone.getBoundingClientRect().width / phone.offsetWidth || 1
		const dy = (e.clientY - pull.y) / scale, dx = (e.clientX - pull.x) / scale
		// start pulling only on a downward drag while the sheet's own list is at its top
		if (!pull.on) {
			if (dy < 8 || Math.abs(dx) > dy || (pull.scroller && pull.scroller.scrollTop > 0)) return
			pull.on = true; dragged = true; drag = null; cancelHold(); release()
			pull.sheet.style.transition = 'none'
		}
		pull.dy = Math.max(0, dy)
		pull.sheet.style.transform = `translateY(${pull.dy}px)`
	})
	window.addEventListener('pointerup', () => {
		if (!pull) return
		const p = pull
		pull = null
		if (!p.on) return
		const h = p.sheet.offsetHeight || 400
		p.sheet.style.transition = 'transform .18s ease-out'
		if (p.dy > Math.min(140, h * 0.3)) {
			p.sheet.style.transform = `translateY(${h}px)`
			setTimeout(close, 170)
		} else p.sheet.style.transform = ''
	})
	window.addEventListener('pointermove', e => {
		if (!drag || e.pointerId !== drag.id) return
		const dx = e.clientX - drag.x, dy = e.clientY - drag.y
		if (!dragged && Math.abs(dx) + Math.abs(dy) < 6) return
		if (!dragged) { dragged = true; cancelHold(); release() }
		// the phone is scaled; convert screen pixels back to phone pixels
		const scale = phone.getBoundingClientRect().width / phone.offsetWidth || 1
		drag.el.scrollTop = drag.top - dy / scale
		drag.el.scrollLeft = drag.left - dx / scale
	})
	let swipe = null
	phone.addEventListener('pointerdown', e => { if (!inspecting && e.button === 0 && !e.target.closest('input, textarea')) swipe = { x: e.clientX, y: e.clientY, carousel: !!e.target.closest('[data-nitro-carousel]') } })
	window.addEventListener('pointerup', e => {
		drag = null
		if (!swipe) return
		if (swipe.carousel) { swipe = null; return }
		const scale = phone.getBoundingClientRect().width / phone.offsetWidth || 1
		const dx = (e.clientX - swipe.x) / scale, dy = (e.clientY - swipe.y) / scale
		swipe = null
		// a mostly sideways drag to the right: back, like swiping a chat away to the channel list
		if (dx > 90 && Math.abs(dy) < dx * 0.5 && !state.overlay && PARENT[state.screen] && state.screen !== 'server') { dragged = true; back() }
	})
	phone.addEventListener('click', e => { if (dragged) { e.stopPropagation(); e.preventDefault(); dragged = false } }, true)

	// Pressed colours: data-k-press swaps in while the pointer is down, as Discord's pressed states do
	let pressed = null
	const release = () => {
		if (!pressed) return
		for (const p of parseKeys(pressed.dataset.kPress)) {
			const css = PROPS[p.prop][0]
			if (!css) continue
			const base = parseKeys(pressed.dataset.k).find(b => b.prop === p.prop)
			if (base) pressed.style.setProperty(css, cssVar(base))
			else pressed.style.removeProperty(css)
		}
		pressed.classList.remove('vp-pressed')
		pressed = null
	}
	phone.addEventListener('pointerdown', e => {
		if (inspecting) return
		const el = e.target.closest('[data-k-press]')
		if (!el) return
		pressed = el
		el.classList.add('vp-pressed')
		for (const p of parseKeys(el.dataset.kPress)) {
			const css = PROPS[p.prop][0]
			if (css) el.style.setProperty(css, cssVar(p))
		}
	})
	window.addEventListener('pointerup', release)
	phone.addEventListener('pointerleave', release)

	phone.addEventListener('input', e => {
		const el = e.target.closest('[data-input]')
		if (el) runAction(el, 'input', e)
	})
	phone.addEventListener('keydown', e => {
		const el = e.target.closest('[data-enter]')
		if (el && e.key === 'Enter') {
			e.preventDefault()
			runAction(el, 'enter', e)
		}
	})
	phone.addEventListener('focusin', e => {
		const el = e.target.closest('[data-focus]')
		if (el) runAction(el, 'focus', e)
	})
	phone.addEventListener('focusout', e => {
		const el = e.target.closest('[data-blur]')
		if (el) runAction(el, 'blur', e)
	})

	// ---------- inspector

	/** The element the inspector should report for a pointer target: the nearest themed or fixed element. */
	function inspectable(target) {
		return target?.closest?.('[data-k], [data-k-press], [data-fixed]')
	}

	phone.addEventListener('pointermove', e => {
		if (!inspecting) return
		const el = inspectable(e.target)
		if (el === hoverEl) return
		hoverEl = el
		drawMarks()
	})
	phone.addEventListener('pointerleave', () => {
		hoverEl = null
		drawMarks()
	})
	phone.addEventListener('click', e => {
		if (!inspecting) return
		e.preventDefault()
		e.stopPropagation()
		const el = inspectable(e.target)
		pinned = el
		drawMarks()
		onInspect?.(el ? describe(el) : null)
	}, true)

	/** What the inspector panel shows for an element. */
	function describe(el) {
		const tabPart = el.closest('.vp-tabs') ? (el.matches('i') ? 'indicator' : el.closest('button') ? 'text' : 'row') : null
		const own = [...parseKeys(el.dataset.k), ...parseKeys(el.dataset.kPress).map(p => ({ ...p, pressed: true }))]
		const context = []
		let p = el.parentElement
		while (p && p !== phone && context.length < 3) {
			const bg = parseKeys(p.dataset?.k).find(x => x.prop === 'bg')
			if (bg && !own.some(o => o.key === bg.key)) context.push({ ...bg, name: p.dataset.n || '' })
			p = p.parentElement
		}
		// Surface colours belong in the editable parts even when the click lands on text or emoji artwork.
		if (state.overlay === 'msgmenu' || el.closest('.vp-member-card')) {
			for (let i = context.length - 1; i >= 0; i--) {
				if (['CARD_MUTED_BG', 'MOBILE_EMOJI_BUTTON_BACKGROUND', 'TABLEROW_BACKGROUND_DEFAULT'].includes(context[i].key))
					own.unshift(...context.splice(i, 1))
			}
		}
		return {
			name: TAB_PARTS[tabPart] || el.dataset.n || el.dataset.fixed || guessName(el),
			fixed: el.dataset.fixed && !own.length ? el.dataset.fixed : null,
			props: tabPart ? [] : own,
			tabPart,
			context,
			screen: state.screen,
			overlay: state.overlay,
			capture: (state.overlay && overlays[state.overlay].capture) || screens[state.screen].capture,
		}
	}

	function guessName(el) {
		const text = el.textContent.trim().replace(/\s+/g, ' ')
		return text ? `"${text.length > 32 ? text.slice(0, 30) + '...' : text}"` : el.tagName === 'svg' ? 'Icon' : 'Element'
	}

	function phoneScale() {
		return phone.getBoundingClientRect().width / phone.offsetWidth || 1
	}

	function boxFor(el, cls) {
		const pr = phone.getBoundingClientRect()
		const r = el.getBoundingClientRect()
		if (!r.width && !r.height) return ''
		const s = phoneScale()
		const x = (r.left - pr.left) / s, y = (r.top - pr.top) / s, w = r.width / s, h = r.height / s
		// clip to the phone so highlights inside scrolled lists stay on screen
		const x1 = Math.max(0, x), y1 = Math.max(0, y), x2 = Math.min(phone.offsetWidth, x + w), y2 = Math.min(phone.offsetHeight, y + h)
		if (x2 <= x1 || y2 <= y1) return ''
		return `<i class="${cls}" style="left:${x1}px;top:${y1}px;width:${x2 - x1}px;height:${y2 - y1}px"></i>`
	}

	function isVisible(el) {
		// Inside a hidden branch (closed tab etc.)
		return el.offsetParent !== null || el.tagName === 'svg' || getComputedStyle(el).position === 'fixed'
	}

	function tabTargets(el) {
		const row = el.closest('.vp-tabs')
		return row && el.closest('button') && !el.matches('i') ? [...row.querySelectorAll('button')] : [el]
	}

	function drawMarks() {
		let html = ''
		if (highlightKey) {
			for (const el of phone.querySelectorAll(KEYED)) {
				if (!isVisible(el)) continue
				if (elKeys(el).some(p => p.key === highlightKey.key && p.raw === highlightKey.raw)) html += boxFor(el, 'vp-mark key')
			}
		}
		if (inspecting && hoverEl && hoverEl !== pinned) html += tabTargets(hoverEl).map(el => boxFor(el, 'vp-mark hover')).join('')
		if (pinned && pinned.isConnected) html += tabTargets(pinned).map(el => boxFor(el, 'vp-mark pinned')).join('')
		marks.innerHTML = html
		if (inspecting && hoverEl) {
			const d = describe(hoverEl)
			const label = d.fixed ? `${d.name} (fixed)` : `${d.name}`
			marks.insertAdjacentHTML('beforeend', `<span class="vp-tip" style="${tipPos(hoverEl)}">${escapeHtml(label)}${d.props.length ? '<br><small>' + d.props.map(p => (p.raw ? '@' : '') + p.key).join(', ') + '</small>' : ''}</span>`)
		}
	}

	function tipPos(el) {
		const pr = phone.getBoundingClientRect(), r = el.getBoundingClientRect(), s = phoneScale()
		const top = (r.bottom - pr.top) / s + 4
		const below = top < phone.offsetHeight - 60
		const y = below ? top : (r.top - pr.top) / s - 50
		const x = Math.min(Math.max(4, (r.left - pr.left) / s), phone.offsetWidth - 220)
		return `left:${x}px;top:${Math.max(4, y)}px`
	}

	phone.addEventListener('scroll', e => {
		const track = e.target
		if (track.hasAttribute('data-nitro-carousel')) {
			const index = Math.round(track.scrollLeft / (track.firstElementChild.offsetWidth + 8))
			track.nextElementSibling.querySelectorAll('button').forEach((dot, i) => {
				const key = i === index ? 'TEXT_BRAND' : 'BACKGROUND_MOD_STRONG'
				dot.setAttribute('aria-current', String(i === index))
				dot.dataset.k = 'bg:' + key
				dot.style.backgroundColor = `var(--c-${key})`
			})
		}
		requestAnimationFrame(drawMarks)
	}, true)

	/** Number of visible elements using a key, for the editor's "N on this screen" readout. */
	function countKey(key, raw = false) {
		let n = 0
		for (const el of phone.querySelectorAll(KEYED))
			if (isVisible(el) && elKeys(el).some(p => p.key === key && !!p.raw === raw)) n++
		return n
	}

	// Which screens use which keys, from the templates, so the editor can offer "find on another screen"
	let keyIndex = null
	function screensFor(key, raw = false) {
		if (!keyIndex) {
			keyIndex = new Map()
			const scratch = document.createElement('div')
			const add = (id, kind, html) => {
				scratch.innerHTML = html
				for (const el of scratch.querySelectorAll(KEYED))
					for (const p of elKeys(el)) {
						const k = (p.raw ? '@' : '') + p.key
						if (!keyIndex.has(k)) keyIndex.set(k, new Set())
						keyIndex.get(k).add(`${kind}:${id}`)
					}
			}
			for (const s of Object.values(screens)) add(s.id, 'screen', s.render(ctxFor(s.id, true)))
			for (const o of Object.values(overlays)) add(o.id, 'overlay', o.render(ctxFor(o.id, true)))
		}
		return [...(keyIndex.get((raw ? '@' : '') + key) || [])].map(s => {
			const [kind, id] = s.split(':')
			return { kind, id, title: (kind === 'screen' ? screens[id] : overlays[id]).title }
		})
	}

	collectUsed()
	paint()
	render()

	const unsubscribeMeta = store.on('meta', () => paint())
	const unsubscribe = store.on('change', detail => paint(detail))
	const unsubscribeBase = store.on('base', () => {
		if (screenEl.querySelector('.vp-thread, .vp-reply, .vp-embed-v2')) render()
	})

	// Live getters: Object.assign would copy their values once
	Object.defineProperties(api, {
		screen: { get: () => state.screen },
		overlay: { get: () => state.overlay },
		inspecting: { get: () => inspecting },
		highlighted: { get: () => highlightKey },
	})
	return Object.assign(api, {
		phone, device,
		editTab(part, color) {
			draftTabs = part ? { [part]: color } : null
			paintAppearance(phone, store, draftTabs)
		},
		destroy() {
			unsubscribe()
			unsubscribeMeta()
			unsubscribeBase()
			window.removeEventListener('pointerup', release)
			cancelHold()
		},
		screens, overlays,
		setInspecting(on) {
			inspecting = on
			phone.classList.toggle('inspecting', on)
			hoverEl = null
			if (!on) pinned = null
			drawMarks()
		},
		highlight(key, raw = false) {
			highlightKey = key ? { key, raw } : null
			drawMarks()
			return key ? countKey(key, raw) : 0
		},
		countKey,
		screensFor,
		/** Keys painting something visible right now, written KEY or @RAW. */
		visibleKeys() {
			const set = new Set()
			for (const el of phone.querySelectorAll(KEYED))
				if (isVisible(el)) for (const p of elKeys(el)) set.add((p.raw ? '@' : '') + p.key)
			return set
		},
		redraw: () => requestAnimationFrame(drawMarks),
		/** Jumps to wherever a key shows: an overlay opens over its own screen. */
		show({ kind, id }) {
			if (kind === 'screen') go(id)
			else open(id)
		},
		/** Selects the first visible element painted by a key, for keyboard and reverse-lookup use. */
		firstFor(key, raw = false) {
			for (const el of phone.querySelectorAll(KEYED))
				if (isVisible(el) && elKeys(el).some(p => p.key === key && !!p.raw === raw)) return el
			return null
		},
		inspectElement(el) {
			pinned = el
			drawMarks()
			onInspect?.(el ? describe(el) : null)
		},
	})
}

const escapeHtml = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
