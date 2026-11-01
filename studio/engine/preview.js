// The interactive phone. Screens are plain HTML templates; each themed element declares the keys that paint it
// in data-k ("bg:PANEL_BG fg:TEXT_STRONG"). That one attribute drives both the styling and the inspector,
// so what the inspector reports is exactly what paints the element.
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
		phone.dataset.base = store.base
		phone.classList.toggle('vp-light', store.base === 'light')
		if (highlightKey || pinned) requestAnimationFrame(drawMarks)
	}

	// ---------- rendering

	function ctxFor(id, dry = false) {
		const ui = (state.ui[id] ??= {})
		return { mock, ui, params: dry ? {} : state.params, base: store.base, state, dry }
	}

	function render() {
		const screen = screens[state.screen]
		const scrollers = [...screenEl.querySelectorAll('[data-scroll]')].map(el => [el.dataset.scroll, el.scrollTop])
		screenEl.innerHTML = screen.render(ctxFor(state.screen))
		screenEl.dataset.screen = state.screen
		applyKeys(screenEl)
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
		overlayEl.innerHTML = ov ? ov.render(ctxFor(state.overlay)) : ''
		overlayEl.dataset.overlay = state.overlay || ''
		if (ov) {
			applyKeys(overlayEl)
			ov.mounted?.(overlayEl, ctxFor(state.overlay))
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

	function back() {
		if (state.overlay) return close()
		const prev = state.history.pop()
		if (prev) go(prev[0], prev[1], { push: false })
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
			: kind === 'success' ? 'bg:TOAST_SUCCESS_BACKGROUND bd:TOAST_SUCCESS_BORDER' : 'bg:MOBILE_TOAST_BACKGROUND_DEFAULT bd:BORDER_SUBTLE'
		const iconKeys = kind === 'critical' ? 'fg:ICON_FEEDBACK_CRITICAL' : kind === 'success' ? 'fg:ICON_FEEDBACK_POSITIVE' : 'fg:ICON_DEFAULT'
		el.className = 'vp-toast'
		el.dataset.k = keys
		el.dataset.n = kind === 'critical' ? 'Error notification' : kind === 'success' ? 'Success notification' : 'Toast'
		el.innerHTML = `<span data-k="${iconKeys}">${toastIcon(kind)}</span><span data-k="fg:TEXT_DEFAULT">${text}</span>`
		toastEl.append(el)
		applyKeys(el.parentElement)
		setTimeout(() => el.classList.add('out'), state.holdToasts ? 1e9 : 2600)
		setTimeout(() => el.remove(), state.holdToasts ? 1e9 : 2900)
	}
	const toastIcon = kind => kind === 'critical'
		? '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1 5h2v7h-2V7Zm1 9a1.3 1.3 0 1 1 0 2.6A1.3 1.3 0 0 1 12 16Z"/></svg>'
		: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.7 6.3a1 1 0 0 1 0 1.4l-5.5 5.5a1 1 0 0 1-1.4 0l-2.5-2.5a1 1 0 1 1 1.4-1.4l1.8 1.8 4.8-4.8a1 1 0 0 1 1.4 0Z"/></svg>'

	// ---------- interaction

	const api = { go, back, open, close, toast, render, renderOverlay, state }

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
			const [screen, arg] = go_.dataset.go.split(':')
			return go(screen, arg ? { id: arg } : {})
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
			open(id, { arg, keepScreen: true })
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
		open(id, { arg, keepScreen: true })
	})

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
		const own = [...parseKeys(el.dataset.k), ...parseKeys(el.dataset.kPress).map(p => ({ ...p, pressed: true }))]
		const context = []
		let p = el.parentElement
		while (p && p !== phone && context.length < 3) {
			const bg = parseKeys(p.dataset?.k).find(x => x.prop === 'bg')
			if (bg && !own.some(o => o.key === bg.key)) context.push({ ...bg, name: p.dataset.n || '' })
			p = p.parentElement
		}
		return {
			name: el.dataset.n || el.dataset.fixed || guessName(el),
			fixed: el.dataset.fixed && !own.length ? el.dataset.fixed : null,
			props: own,
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

	function drawMarks() {
		let html = ''
		if (highlightKey) {
			for (const el of phone.querySelectorAll(KEYED)) {
				if (!isVisible(el)) continue
				if (elKeys(el).some(p => p.key === highlightKey.key && p.raw === highlightKey.raw)) html += boxFor(el, 'vp-mark key')
			}
		}
		if (inspecting && hoverEl && hoverEl !== pinned) html += boxFor(hoverEl, 'vp-mark hover')
		if (pinned && pinned.isConnected) html += boxFor(pinned, 'vp-mark pinned')
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

	phone.addEventListener('scroll', () => requestAnimationFrame(drawMarks), true)

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

	const unsubscribe = store.on('change', detail => paint(detail))

	// Live getters: Object.assign would copy their values once
	Object.defineProperties(api, {
		screen: { get: () => state.screen },
		overlay: { get: () => state.overlay },
		inspecting: { get: () => inspecting },
		highlighted: { get: () => highlightKey },
	})
	return Object.assign(api, {
		phone, device,
		destroy() {
			unsubscribe()
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
