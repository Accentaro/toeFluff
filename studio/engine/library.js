// "My themes": named themes saved in this browser. The working theme itself is autosaved by store.js under its own key;
// this list is separate so saves from before it existed keep loading.
import { BASES, normalizeTheme } from './store.js'
import { exportLegacy, exportManifest, exportPlugin } from './formats.js'

const LIBRARY_KEY = 'valenced-studio:library'
// Library entry the working theme was opened from or last saved to, so Save updates it instead of adding a copy
const CURRENT_KEY = 'valenced-studio:library-current'

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const newId = () => globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2)

export function readLibrary() {
	try {
		const data = JSON.parse(localStorage.getItem(LIBRARY_KEY))
		if (!Array.isArray(data?.themes)) return []
		return data.themes.filter(t => t && typeof t.id === 'string' && t.theme).map(t => ({ ...t, theme: normalizeTheme(t.theme) }))
	} catch {
		return []
	}
}

/** Throws when storage is full or blocked. */
function writeLibrary(themes) {
	localStorage.setItem(LIBRARY_KEY, JSON.stringify({ version: 1, themes }))
}

/** Distinct semantic keys set on any base, plus raw overrides. */
export function keyCount(theme) {
	const semantic = new Set()
	for (const b of BASES) for (const k in theme.semantic[b]) semantic.add(k)
	return semantic.size + Object.keys(theme.raw).length
}

export function createLibrary({ dialog, store, descriptions, toast, download }) {
	let current = localStorage.getItem(CURRENT_KEY)
	let renaming = null, confirming = null

	const setCurrent = id => {
		current = id
		try {
			if (id) localStorage.setItem(CURRENT_KEY, id)
			else localStorage.removeItem(CURRENT_KEY)
		} catch { /* only affects which entry Save updates */ }
	}

	// A new, template or imported theme is no longer the saved one it replaced
	store.on('change', d => {
		if (d.label === 'new' || d.label === 'template' || d.label === 'import') setCurrent(null)
	})

	function commit(themes, done) {
		try {
			writeLibrary(themes)
		} catch {
			toast('Could not save: browser storage is full or blocked.')
			return false
		}
		done?.()
		if (dialog.open) render()
		return true
	}

	function save({ asNew = false } = {}) {
		const themes = readLibrary()
		const name = store.theme.meta.name.trim() || 'Untitled theme'
		const now = Date.now()
		let entry = !asNew && themes.find(t => t.id === current)
		if (entry) Object.assign(entry, { name, theme: structuredClone(store.theme), updated: now })
		else {
			entry = { id: newId(), name, theme: structuredClone(store.theme), created: now, updated: now }
			themes.unshift(entry)
		}
		commit(themes, () => {
			setCurrent(entry.id)
			toast(`Saved "${name}" to My themes`)
		})
	}

	const fileFor = (entry, fmt) =>
		fmt === 'plugin' ? 'index.ts' : fmt === 'manifest' ? 'manifest.json' : `${entry.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'theme'}.json`

	function render() {
		const themes = readLibrary().sort((a, b) => b.updated - a.updated)
		const linked = themes.find(t => t.id === current)
		const name = store.theme.meta.name.trim() || 'Untitled theme'
		const date = ms => new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
		dialog.innerHTML = `
			<div class="st-lib-head"><h2>My themes</h2><form method="dialog"><button class="st-icon-btn" aria-label="Close">&times;</button></form></div>
			<div class="st-lib-save">
				<p>${linked ? `Editing <b>${esc(linked.name)}</b>. Saving updates it.` : `<b>${esc(name)}</b> is not in your list yet.`}</p>
				<div class="st-row wrap"><button class="primary" data-lib="save">${linked ? 'Save changes' : 'Save to My themes'}</button>${linked ? '<button data-lib="save-new">Save as a new theme</button>' : ''}</div>
			</div>
			${themes.length ? `<ul class="st-lib-list">${themes.map(t => {
				const n = keyCount(t.theme)
				return `<li class="st-lib-item${t.id === current ? ' on' : ''}" data-id="${esc(t.id)}">
					<div class="st-lib-info">
						${renaming === t.id ? `<input class="st-lib-rename" value="${esc(t.name)}" aria-label="New name">` : `<b>${esc(t.name)}</b>`}
						<small>${n} key${n === 1 ? '' : 's'} · updated ${esc(date(t.updated))}${t.id === current ? ' · open now' : ''}</small>
					</div>
					<div class="st-lib-actions">
						${renaming === t.id
							? '<button class="sm primary" data-lib="rename-ok">Save name</button><button class="sm" data-lib="rename-cancel">Cancel</button>'
							: `<button class="sm" data-lib="open">Open</button><button class="sm" data-lib="duplicate">Duplicate</button><button class="sm" data-lib="rename">Rename</button>
							<details class="st-lib-export"><summary class="sm">Export</summary><div><button data-lib="export" data-fmt="legacy">Legacy JSON</button><button data-lib="export" data-fmt="plugin">Plugin index.ts</button><button data-lib="export" data-fmt="manifest">manifest.json</button></div></details>
							<button class="sm${confirming === t.id ? ' danger' : ''}" data-lib="delete">${confirming === t.id ? 'Confirm delete' : 'Delete'}</button>`}
					</div>
				</li>`
			}).join('')}</ul>` : '<p class="st-empty">No saved themes yet. Save the one you are editing to start a list.</p>'}
			<p class="muted small">Saved in this browser only. Export a theme to keep a copy or move it to another device.</p>`
		dialog.querySelector('.st-lib-rename')?.focus()
		dialog.querySelector('.st-lib-rename')?.select()
	}

	function rename(id, value) {
		const name = value.trim()
		renaming = null
		if (!name) return render()
		const themes = readLibrary()
		const entry = themes.find(t => t.id === id)
		if (!entry) return render()
		entry.name = name
		entry.theme.meta.name = name
		entry.updated = Date.now()
		commit(themes, () => {
			if (id === current && store.theme.meta.name !== name) store.setMeta({ name })
		})
	}

	dialog.addEventListener('click', e => {
		const btn = e.target.closest('[data-lib]')
		if (!btn) return
		const action = btn.dataset.lib
		const id = btn.closest('[data-id]')?.dataset.id
		if (action !== 'delete') confirming = null
		if (action === 'save') return save()
		if (action === 'save-new') return save({ asNew: true })
		const themes = readLibrary()
		const entry = themes.find(t => t.id === id)
		if (!entry) return render()
		if (action === 'open') {
			store.replace(entry.theme, 'library')
			setCurrent(id)
			dialog.close()
			toast(`Opened "${entry.name}". Ctrl+Z goes back.`)
		}
		if (action === 'duplicate') {
			const copy = { ...structuredClone(entry), id: newId(), name: `${entry.name} copy`, created: Date.now(), updated: Date.now() }
			copy.theme.meta.name = copy.name
			themes.splice(themes.indexOf(entry), 0, copy)
			commit(themes, () => toast(`Duplicated "${entry.name}"`))
		}
		if (action === 'rename') {
			renaming = id
			render()
		}
		if (action === 'rename-ok') rename(id, dialog.querySelector('.st-lib-rename').value)
		if (action === 'rename-cancel') {
			renaming = null
			render()
		}
		if (action === 'export') {
			const fmt = btn.dataset.fmt
			const { text, warnings } = fmt === 'plugin' ? exportPlugin(entry.theme, descriptions) : fmt === 'manifest' ? { text: exportManifest(entry.theme), warnings: [] } : exportLegacy(entry.theme)
			download(text, fileFor(entry, fmt))
			btn.closest('details').open = false
			toast(`Downloaded ${fileFor(entry, fmt)}`)
			if (warnings.length) setTimeout(() => toast(warnings[0]), 1500)
		}
		if (action === 'delete') {
			if (confirming !== id) {
				confirming = id
				return render()
			}
			confirming = null
			commit(themes.filter(t => t !== entry), () => {
				if (id === current) setCurrent(null)
				toast(`Deleted "${entry.name}"`)
			})
		}
	})
	dialog.addEventListener('keydown', e => {
		if (!e.target.matches('.st-lib-rename')) return
		if (e.key === 'Enter') {
			e.preventDefault()
			rename(e.target.closest('[data-id]').dataset.id, e.target.value)
		}
		if (e.key === 'Escape') {
			e.preventDefault()
			e.stopPropagation()
			renaming = null
			render()
		}
	})
	dialog.addEventListener('close', () => { renaming = confirming = null })

	return {
		open() {
			render()
			dialog.showModal()
		},
		save,
		/** Re-reads the list when another tab changed it. */
		refresh() { if (dialog.open) render() },
	}
}
