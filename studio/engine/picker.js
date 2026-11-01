// Colour picker with alpha. Emits hex, since Valenced only reads #RRGGBB / #RRGGBBAA.
import { format, hsvToRgb, normalize, parse, rgbToHsv, toHex } from './color.js'

export function createPicker({ onInput, onCommit, palette = () => [] }) {
	const el = document.createElement('div')
	el.className = 'st-picker'
	el.innerHTML = `
		<div class="st-sv" tabindex="0" aria-label="Saturation and brightness"><i class="st-sv-knob"></i></div>
		<div class="st-sliders">
			<div class="st-hue" tabindex="0" aria-label="Hue"><i></i></div>
			<div class="st-alpha" tabindex="0" aria-label="Opacity"><b></b><i></i></div>
		</div>
		<div class="st-picker-row">
			<select class="st-format" aria-label="Colour format"><option value="hex">HEX</option><option value="rgb">RGB</option><option value="hsl">HSL</option></select>
			<input class="st-colour-code" spellcheck="false" aria-label="Colour value">
			<input class="st-alpha-num" type="number" min="0" max="100" aria-label="Opacity percent"><span class="st-pct">%</span>
			${'EyeDropper' in window ? '<button class="st-icon-btn st-eyedrop" title="Pick a colour from the screen" aria-label="Pick a colour from the screen"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.4 3.6a2.8 2.8 0 0 0-4 0l-2.2 2.2-1.4-1.4-1.4 1.4 1.4 1.4-7.7 7.7a2 2 0 0 0-.6 1.4V19h2.7a2 2 0 0 0 1.4-.6l7.7-7.7 1.4 1.4 1.4-1.4-1.4-1.4 2.2-2.2a2.8 2.8 0 0 0 0-4ZM6.6 17H5v-1.6l7.6-7.6 1.6 1.6L6.6 17Z"/></svg></button>' : ''}
		</div>
		<div class="st-palette" aria-label="Colours in this theme"></div>`
	const sv = el.querySelector('.st-sv'), svKnob = el.querySelector('.st-sv-knob')
	const hue = el.querySelector('.st-hue'), hueKnob = hue.querySelector('i')
	const alpha = el.querySelector('.st-alpha'), alphaKnob = alpha.querySelector('i'), alphaFill = alpha.querySelector('b')
	const fmt = el.querySelector('.st-format'), code = el.querySelector(".st-colour-code"), alphaNum = el.querySelector('.st-alpha-num')
	const paletteEl = el.querySelector('.st-palette')

	let hsv = { h: 0, s: 0, v: 0 }, a = 1
	fmt.value = localStorage.getItem('valenced-studio:format') || 'hex'

	function current() {
		return toHex({ ...hsvToRgb(hsv.h, hsv.s, hsv.v), a })
	}

	function draw(skipCode) {
		const hex = current()
		const opaque = hex.slice(0, 7)
		sv.style.background = `linear-gradient(transparent, #000), linear-gradient(90deg, #fff, hsl(${hsv.h} 100% 50%))`
		svKnob.style.left = hsv.s * 100 + '%'
		svKnob.style.top = (1 - hsv.v) * 100 + '%'
		svKnob.style.background = opaque
		hueKnob.style.left = (hsv.h / 360) * 100 + '%'
		alphaFill.style.background = `linear-gradient(90deg, transparent, ${opaque})`
		alphaKnob.style.left = a * 100 + '%'
		if (!skipCode) code.value = format(hex, fmt.value)
		alphaNum.value = Math.round(a * 100)
		code.classList.remove('bad')
	}

	function emit(final) {
		const hex = current()
		onInput?.(hex, { final })
		if (final) onCommit?.(hex)
	}

	function drag(target, fn) {
		target.addEventListener('pointerdown', e => {
			e.preventDefault()
			target.setPointerCapture(e.pointerId)
			target.focus()
			const move = ev => {
				const r = target.getBoundingClientRect()
				fn(Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height)))
				draw()
				emit(false)
			}
			move(e)
			const up = () => {
				target.removeEventListener('pointermove', move)
				target.removeEventListener('pointerup', up)
				target.removeEventListener('lostpointercapture', up)
				emit(true)
			}
			target.addEventListener('pointermove', move)
			target.addEventListener('pointerup', up)
			target.addEventListener('lostpointercapture', up)
		})
	}
	drag(sv, (x, y) => { hsv.s = x; hsv.v = 1 - y })
	drag(hue, x => { hsv.h = x * 360 })
	drag(alpha, x => { a = Math.round(x * 255) / 255 })

	// Arrow keys nudge the focused control; shift for bigger steps
	const keys = (target, fn) => target.addEventListener('keydown', e => {
		const step = e.shiftKey ? 10 : 1
		const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key]
		if (!d) return
		e.preventDefault()
		fn(...d)
		draw()
		emit(true)
	})
	keys(sv, (dx, dy) => { hsv.s = Math.min(1, Math.max(0, hsv.s + dx / 100)); hsv.v = Math.min(1, Math.max(0, hsv.v - dy / 100)) })
	keys(hue, dx => { hsv.h = (hsv.h + dx * 3.6 + 360) % 360 })
	keys(alpha, dx => { a = Math.min(1, Math.max(0, a + dx / 100)) })

	code.addEventListener('input', () => {
		const c = parse(code.value)
		code.classList.toggle('bad', !c)
		if (!c) return
		setFromRgb(c)
		draw(true)
		emit(false)
	})
	code.addEventListener('change', () => {
		if (parse(code.value)) { draw(); emit(true) }
	})
	code.addEventListener('keydown', e => { if (e.key === 'Enter') code.dispatchEvent(new Event('change')) })
	alphaNum.addEventListener('change', () => {
		a = Math.min(100, Math.max(0, +alphaNum.value || 0)) / 100
		draw()
		emit(true)
	})
	fmt.addEventListener('change', () => {
		localStorage.setItem('valenced-studio:format', fmt.value)
		draw()
	})
	el.querySelector('.st-eyedrop')?.addEventListener('click', async () => {
		try {
			const { sRGBHex } = await new window.EyeDropper().open()
			setFromRgb({ ...parse(sRGBHex), a })
			draw()
			emit(true)
		} catch { /* cancelled */ }
	})
	paletteEl.addEventListener('click', e => {
		const hex = e.target.closest('[data-hex]')?.dataset.hex
		if (!hex) return
		setFromRgb(parse(hex))
		draw()
		emit(true)
	})

	function setFromRgb(c) {
		const next = rgbToHsv(c)
		// keep hue when the colour is grey, so dragging back out of grey does not jump
		if (next.s === 0 || next.v === 0) next.h = hsv.h
		hsv = next
		a = c.a ?? 1
	}

	return {
		el,
		set(hex) {
			const c = parse(hex || '#000000')
			if (!c) return
			if (normalize(hex) === current()) return
			setFromRgb(c)
			draw()
		},
		refreshPalette() {
			const list = palette().slice(0, 24)
			paletteEl.innerHTML = list.length ? list.map(h => `<button class="st-chip-swatch" data-hex="${h}" title="${h}" aria-label="Use ${h}"><i style="background:${h}"></i></button>`).join('') : ''
			paletteEl.hidden = !list.length
		},
	}
}
