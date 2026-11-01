import Link from 'next/link'
import { docs, type Doc } from './markdown'
import '@/components/site.css'

export const docHref = (slug: string) => (slug === docs()[0].slug ? '/docs/' : `/docs/${slug}/`)

export default function DocPage({ doc }: { doc: Doc }) {
	const all = docs()
	const i = all.indexOf(doc)
	const prev = all[i - 1], next = all[i + 1]
	return (
		<div className="docs">
			<nav className="docs-nav" aria-label="Docs">
				<p>Docs</p>
				{all.map(d => (
					<span key={d.slug} style={{ display: 'contents' }}>
						<Link href={docHref(d.slug)} className={d === doc ? 'on' : undefined} aria-current={d === doc ? 'page' : undefined}>{d.title}</Link>
						{d === doc && d.headings.map(h => <a key={h.id} className="sub" href={`#${h.id}`}>{h.text}</a>)}
					</span>
				))}
			</nav>
			<article>
				<div className="prose" dangerouslySetInnerHTML={{ __html: doc.html }} />
				<div className="docs-pager">
					{prev ? <Link className="button" href={docHref(prev.slug)}>← {prev.title}</Link> : <span />}
					{next && <Link className="button" href={docHref(next.slug)}>{next.title} →</Link>}
				</div>
			</article>
		</div>
	)
}
