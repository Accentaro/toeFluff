'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { copyText } from '@/components/clipboard'
import Lightbox, { FocusOutline, type Gallery } from './Lightbox'
import { BASE_NAMES, type RawItem, type SemanticItem, type Shot } from './types'

type Kind = 'semantic' | 'raw'
type Props = {
	semantic: SemanticItem[]
	raw: RawItem[]
	areas: string[]
	meta: { discord: string; date: string; semanticTotal: number; rawTotal: number }
}

const UNTESTED = 'No screenshot yet'
const PAGE = 24

export default function KeysBrowser({ semantic, raw, areas, meta }: Props) {
	const [kind, setKind] = useState<Kind>('semantic')
	const [area, setArea] = useState<string | null>(null)
	const [q, setQ] = useState('')
	const [all, setAll] = useState(false)
	const [extra, setExtra] = useState<{ semantic: SemanticItem[]; raw: RawItem[] } | null>(null)
	const [limit, setLimit] = useState(PAGE)
	const [gallery, setGallery] = useState<Gallery | null>(null)
	const sentinel = useRef<HTMLDivElement>(null)

	// The untested keys come from the full token tables, loaded only when asked for
	useEffect(() => {
		if (!all || extra) return
		let live = true
		import('./untested').then(m => {
			if (live) setExtra(m.untested(new Set(semantic.map(k => k.k)), new Set(raw.map(k => k.k))))
		})
		return () => { live = false }
	}, [all, extra, semantic, raw])

	// /?q=KEY, /#KEY and /#@RAW open the list filtered to that key. A key without a screenshot widens the list to
	// all keys; whether it is semantic or raw is settled once the full list has loaded.
	const [pending, setPending] = useState<string | null>(null)
	useEffect(() => {
		const apply = (fromHash: boolean) => {
			let value = fromHash ? location.hash.slice(1) : new URLSearchParams(location.search).get('q') ?? ''
			try { if (fromHash) value = decodeURIComponent(value) } catch { return }
			value = value.trim()
			if (!value) return
			const isRaw = value.startsWith('@')
			const key = isRaw ? value.slice(1) : value
			const inRaw = raw.some(k => k.k === key)
			const raws = isRaw || (inRaw && !semantic.some(k => k.k === key))
			setKind(raws ? 'raw' : 'semantic')
			setArea(null)
			setQ(key)
			const found = (raws ? raw : semantic).some(k => k.k === key)
			if (!found) {
				setAll(true)
				if (!isRaw) setPending(key)
			}
			if (fromHash) window.scrollTo(0, 0)
		}
		apply(false)
		apply(true)
		const onHash = () => apply(true)
		window.addEventListener('hashchange', onHash)
		return () => window.removeEventListener('hashchange', onHash)
	}, [semantic, raw])
	useEffect(() => {
		if (!pending || !extra) return
		if (!extra.semantic.some(k => k.k === pending) && extra.raw.some(k => k.k === pending)) setKind('raw')
		setPending(null)
	}, [pending, extra])

	const rows = useMemo(() => {
		const query = q.trim().toLowerCase()
		const match = (k: { k: string; d?: string }) => !query || k.k.toLowerCase().includes(query) || !!k.d?.toLowerCase().includes(query)
		const untested = all ? (extra?.[kind] ?? []) : []
		if (kind === 'raw') {
			const list: { group: string; item: SemanticItem | RawItem }[] = []
			for (const item of raw) if (match(item)) list.push({ group: all ? 'With screenshots' : '', item })
			for (const item of untested) if (match(item)) list.push({ group: UNTESTED, item })
			return list
		}
		const list: { group: string; item: SemanticItem | RawItem }[] = []
		for (const a of areas)
			if (!area || area === a) for (const item of semantic) if (item.a === a && match(item)) list.push({ group: a, item })
		if (!area || area === UNTESTED) for (const item of untested) if (match(item)) list.push({ group: UNTESTED, item })
		return list
	}, [kind, area, q, all, extra, semantic, raw, areas])

	useEffect(() => setLimit(PAGE), [kind, area, q, all])

	// Render a page of cards at a time; more as the end of the list scrolls into view
	useEffect(() => {
		const el = sentinel.current
		if (!el || limit >= rows.length) return
		const io = new IntersectionObserver(entries => {
			if (entries.some(e => e.isIntersecting)) setLimit(n => n + PAGE)
		}, { rootMargin: '800px' })
		io.observe(el)
		return () => io.disconnect()
	}, [limit, rows.length])

	const sections: { group: string; items: (SemanticItem | RawItem)[] }[] = []
	for (const { group, item } of rows.slice(0, limit)) {
		const last = sections[sections.length - 1]
		if (last && last.group === group) last.items.push(item)
		else sections.push({ group, items: [item] })
	}

	const loading = all && !extra
	const total = kind === 'semantic' ? meta.semanticTotal : meta.rawTotal
	const tested = kind === 'semantic' ? semantic.length : raw.length

	return (
		<>
			<div className="keys-controls">
				<input
					className="input"
					type="search"
					placeholder="Search keys or descriptions"
					aria-label="Search keys or descriptions"
					value={q}
					onChange={e => setQ(e.target.value)}
				/>
				<div className="pill-group" role="group" aria-label="Key type">
					{(['semantic', 'raw'] as const).map(k => (
						<button key={k} className={`pill${kind === k ? ' on' : ''}`} aria-pressed={kind === k} onClick={() => { setKind(k); setArea(null) }}>
							{k === 'semantic' ? 'Semantic' : 'Raw'}
						</button>
					))}
				</div>
				<div className="pill-group small" role="group" aria-label="Which keys">
					<button className={`pill${!all ? ' on' : ''}`} aria-pressed={!all} onClick={() => { setAll(false); if (area === UNTESTED) setArea(null) }}>With screenshots</button>
					<button className={`pill${all ? ' on' : ''}`} aria-pressed={all} onClick={() => setAll(true)}>All keys</button>
				</div>
				{kind === 'semantic' && (
					<div className="chips" role="group" aria-label="Area">
						{[null, ...areas, ...(all ? [UNTESTED] : [])].map(a => (
							<button key={a ?? 'all'} className={`chip${area === a ? ' on' : ''}`} aria-pressed={area === a} onClick={() => setArea(a)}>
								{a ?? 'All'}
							</button>
						))}
					</div>
				)}
				<p className="muted keys-count" aria-live="polite">
					{loading ? 'Loading the full key list…' : `${rows.length} of ${all ? total : tested} ${kind} keys`}
					{' · '}{tested} of {total} have screenshots
				</p>
			</div>

			{sections.map((s, i) => (
				<section key={`${s.group}-${i}`}>
					{s.group && (i === 0 || sections[i - 1].group !== s.group) && <h2 className="area-title">{s.group}</h2>}
					<div className="key-grid">
						{s.items.map(item => (
							<KeyCard key={item.k} item={item} kind={kind} onOpen={(shots, index) => setGallery({ name: item.k, description: item.d, shots, index })} />
						))}
					</div>
				</section>
			))}
			{!rows.length && !loading && <p className="empty">No keys match.</p>}
			{limit < rows.length && <div ref={sentinel} className="keys-more muted">Loading more…</div>}

			<p className="muted keys-note">
				Discord {meta.discord}, Ash, checked {meta.date}. Pink marks the one key changed in each screenshot; a yellow
				outline finds small targets. Click a key name to copy it, or a screenshot to enlarge it.
			</p>

			<Lightbox gallery={gallery} onChange={setGallery} />
		</>
	)
}

function Swatch({ color }: { color: string }) {
	return <span className="swatch" title={color}><i style={{ background: color || 'transparent' }} /></span>
}

function KeyCard({ item, kind, onOpen }: { item: SemanticItem | RawItem; kind: Kind; onOpen: (shots: Shot[], index: number) => void }) {
	const sem = kind === 'semantic' ? (item as SemanticItem) : null
	const rawItem = kind === 'raw' ? (item as RawItem) : null
	const sameRaw = sem && sem.r.every(r => r === sem.r[0])

	return (
		<article className="key-card">
			<button className="key-name" title="Copy" onClick={() => copyText(item.k)}>
				{item.k.split('_').map((part, i) => <span key={i}>{i > 0 && <>_<wbr /></>}{part}</span>)}
			</button>
			{item.d ? <p className="key-desc">{item.d}</p> : <p className="key-desc muted">No description or screenshot yet.</p>}

			{item.sh && (
				<div className="shots" role="group" aria-label={`${item.k} screenshots`}>
					{item.sh.map((shot, i) => (
						<figure key={shot.i}>
							<button className="shot" onClick={() => onOpen(item.sh!, i)} aria-label={`Enlarge ${item.k}: ${shot.s}`}>
								<img src={shot.i} alt={`${item.k} in ${shot.s}`} loading="lazy" decoding="async" width={1080} height={2400} />
								<FocusOutline f={shot.f} />
							</button>
							<figcaption>{shot.s}{shot.n && ` / ${shot.n}`}</figcaption>
						</figure>
					))}
				</div>
			)}

			{sem && (
				<>
					<div className="defaults">
						{BASE_NAMES.map((name, i) => (
							<span key={name} className="default">
								<Swatch color={sem.v[i]} />
								<span>{name}</span>
								<code>{sem.v[i] || 'none'}</code>
								{!sameRaw && sem.r[i] && <a className="raw-ref" href={`#@${sem.r[i]}`}>{sem.r[i]}</a>}
							</span>
						))}
					</div>
					{sameRaw && sem.r[0] && <p className="raw-line">Raw key <a href={`#@${sem.r[0]}`}>{sem.r[0]}</a></p>}
				</>
			)}
			{rawItem && (
				<>
					<div className="defaults one">
						<span className="default"><Swatch color={rawItem.v} /><span>All bases</span><code>{rawItem.v}</code></span>
					</div>
					<p className="raw-line">
						{rawItem.un
							? <>Used by {rawItem.u.map((u, i) => <span key={u}>{i > 0 && ', '}<a href={`#${u}`}>{u}</a></span>)}{rawItem.un > rawItem.u.length && ` and ${rawItem.un - rawItem.u.length} more`}</>
							: 'No semantic key points at it.'}
					</p>
				</>
			)}

			<a className="studio-link" href={`/studio/#${kind === 'raw' ? '@' : ''}${item.k}`}>Edit in the studio →</a>
		</article>
	)
}
