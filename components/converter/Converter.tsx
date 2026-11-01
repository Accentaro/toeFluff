'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import { copyText, download, toast } from '@/components/clipboard'
// Plain JS shared with the studio
import { exportLegacy, exportManifest, exportPlugin, validate } from '@/studio/engine/formats.js'

type Theme = {
	meta: { name: string; description: string; authors: { name: string; id?: string }[]; extra: Record<string, unknown> }
	semantic: Record<'dark' | 'darker' | 'light' | 'midnight', Record<string, string>>
	raw: Record<string, string>
	links: { darker: boolean; midnight: boolean }
}
type Result =
	| { ok: true; theme: Theme; format: string; warnings: string[]; problems: string[] }
	| { ok: false; error: string; line?: number }
type Tab = 'index.ts' | 'manifest.json' | 'legacy JSON'

// Same key as studio/engine/store.js STORE_KEY, so /studio/ opens the converted theme
const STORE_KEY = 'valenced-studio:theme'
const FORMAT_NAMES: Record<string, string> = { legacy: 'legacy theme JSON', plugin: 'plugin index.ts', 'ThemeColors JSON': 'ThemeColors JSON' }
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'theme'

type Props = { semanticKeys: string[]; rawKeys: string[]; descriptions: Record<string, { text: string }> }

export default function Converter({ semanticKeys, rawKeys, descriptions }: Props) {
	const [text, setText] = useState('')
	const [tab, setTab] = useState<Tab | null>(null)
	const source = useDeferredValue(text)
	const known = useMemo(() => ({ semantic: new Set(semanticKeys), raw: new Set(rawKeys) }), [semanticKeys, rawKeys])

	const out = useMemo(() => {
		if (!source.trim()) return null
		const result = validate(source) as Result
		if (!result.ok) return { ok: false as const, result }
		const { theme } = result
		const unknownSemantic = [...new Set(Object.values(theme.semantic).flatMap(Object.keys))].filter(k => !known.semantic.has(k)).sort()
		const unknownRaw = Object.keys(theme.raw).filter(k => !known.raw.has(k)).sort()
		const legacy = exportLegacy(theme) as { text: string; warnings: string[] }
		const files: Record<Tab, string> = {
			'index.ts': (exportPlugin(theme, descriptions) as { text: string }).text,
			'manifest.json': exportManifest(theme) as string,
			'legacy JSON': legacy.text,
		}
		const count = new Set(Object.values(theme.semantic).flatMap(Object.keys)).size
		return { ok: true as const, result, theme, unknownSemantic, unknownRaw, files, legacyWarnings: legacy.warnings, count, raw: Object.keys(theme.raw).length }
	}, [source, known, descriptions])

	const ok = out?.ok ? out : null
	const fromPlugin = ok?.result.ok && ok.result.format === 'plugin'
	const order: Tab[] = fromPlugin ? ['legacy JSON', 'index.ts', 'manifest.json'] : ['index.ts', 'manifest.json', 'legacy JSON']
	const current = tab && order.includes(tab) ? tab : order[0]
	const fileName = (t: Tab) => (t === 'legacy JSON' ? `${slug(ok?.theme.meta.name || 'theme')}.json` : t)

	async function upload(file?: File) {
		if (!file) return
		setText(await file.text())
		setTab(null)
	}

	async function loadExample() {
		const res = await fetch('/template/legacy-theme.json')
		setText(await res.text())
		setTab(null)
	}

	function openInStudio() {
		if (!ok) return
		if (localStorage.getItem(STORE_KEY) && !confirm('Replace the theme saved in the studio with this one?')) return
		try {
			localStorage.setItem(STORE_KEY, JSON.stringify(ok.theme))
		} catch (err) {
			toast(`Could not save the theme for the studio: ${(err as Error).message}`)
			return
		}
		location.href = '/studio/'
	}

	function downloadPlugin() {
		if (!ok) return
		download('index.ts', ok.files['index.ts'])
		setTimeout(() => download('manifest.json', ok.files['manifest.json'], 'application/json'), 300)
	}

	const warnings = ok?.result.ok ? [...ok.result.warnings] : []
	const problems = ok?.result.ok ? ok.result.problems : []

	return (
		<>
			<textarea
				className="converter-input"
				spellCheck={false}
				placeholder="Paste a theme JSON or a plugin index.ts here"
				aria-label="Theme source"
				value={text}
				onChange={e => setText(e.target.value)}
				onDragOver={e => e.preventDefault()}
				onDrop={e => { e.preventDefault(); upload(e.dataTransfer.files[0]) }}
			/>
			<div className="row">
				<label className="button file-button">
					Upload a file
					<input type="file" accept=".json,.ts,.js,.txt,application/json,text/plain" onChange={e => { upload(e.target.files?.[0]); e.target.value = '' }} />
				</label>
				<button className="button" onClick={loadExample}>Try the Dusk JSON</button>
				<button className="button danger" onClick={() => setText('')} disabled={!text}>Clear</button>
			</div>

			{out && !out.result.ok && (
				<div className="status error" role="alert">
					<p><strong>Can&apos;t read this.</strong> {out.result.error}{out.result.line ? ` (line ${out.result.line})` : ''}</p>
				</div>
			)}

			{ok && ok.result.ok && (
				<>
					<div className="report">
						<div className={`status ${problems.length || ok.unknownSemantic.length || ok.unknownRaw.length ? 'warn' : 'ok'}`} role="status">
							<p>
								Read <strong>{ok.theme.meta.name}</strong> as {FORMAT_NAMES[ok.result.format] ?? ok.result.format}:
								{' '}{ok.count} semantic key{ok.count === 1 ? '' : 's'}, {ok.raw} raw key{ok.raw === 1 ? '' : 's'}.
								{!problems.length && !ok.unknownSemantic.length && !ok.unknownRaw.length && ' No problems found.'}
							</p>
						</div>
						{problems.length > 0 && <Issues title="Not a hex colour" items={problems} note="Valenced ignores these. Use #RRGGBB or #RRGGBBAA." />}
						{ok.unknownSemantic.length > 0 && <Issues title="Unknown semantic keys" items={ok.unknownSemantic} note="Not in the current Discord build. They may be renamed or removed; the studio's Repair can map old names." />}
						{ok.unknownRaw.length > 0 && <Issues title="Unknown raw keys" items={ok.unknownRaw} note="Not in the current Discord build." />}
						{warnings.length > 0 && <Issues title="Notes" items={warnings} plain />}
					</div>

					<div className="row">
						<button className="button primary" onClick={openInStudio}>Open in studio</button>
						<button className="button" onClick={downloadPlugin}>Download plugin files</button>
					</div>

					<div className="code-panel">
						<div className="code-head">
							<div className="tabs" role="tablist">
								{order.map(t => (
									<button key={t} role="tab" aria-selected={current === t} className={`tab${current === t ? ' on' : ''}`} onClick={() => setTab(t)}>{t}</button>
								))}
							</div>
							<div className="code-actions">
								<button className="button" onClick={() => copyText(ok.files[current], current)}>Copy</button>
								<button className="button" onClick={() => download(fileName(current), ok.files[current], current === 'index.ts' ? 'text/plain' : 'application/json')}>Download</button>
							</div>
						</div>
						{current === 'legacy JSON' && ok.legacyWarnings.length > 0 && (
							<div className="status warn code-note"><p>{ok.legacyWarnings.join(' ')}</p></div>
						)}
						<pre role="tabpanel"><code>{ok.files[current]}</code></pre>
					</div>
				</>
			)}
		</>
	)
}

function Issues({ title, items, note, plain }: { title: string; items: string[]; note?: string; plain?: boolean }) {
	const shown = items.slice(0, 40)
	return (
		<details className="issues" open={items.length <= 12}>
			<summary><strong>{title}</strong> ({items.length})</summary>
			{note && <p className="muted">{note}</p>}
			<ul>
				{shown.map(i => <li key={i}>{plain ? i : <code>{i}</code>}</li>)}
				{items.length > shown.length && <li>and {items.length - shown.length} more</li>}
			</ul>
		</details>
	)
}
