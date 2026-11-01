// Build-time: reads content/docs/*.md and renders it with marked.
import fs from 'node:fs'
import path from 'node:path'
import { Marked } from 'marked'
import { captures } from '@/lib/data'
import type { Focus } from '@/lib/data'

const DIR = path.join(process.cwd(), 'content', 'docs')

export type Doc = { slug: string; title: string; html: string; headings: { id: string; text: string }[] }

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const slugify = (s: string) => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** ```shots blocks: one "KEY: caption" per line, drawn as screenshot thumbnails linking to the key's card. */
function shots(text: string) {
	const items = text.trim().split('\n').map(line => {
		const [key, ...rest] = line.split(':')
		const name = key.trim()
		const capture = (captures.semantic as Record<string, { image: string; focus?: Focus }>)[name]
		if (!capture) throw new Error(`content/docs: no screenshot for ${name}`)
		const f = capture.focus
		const outline = f && f.width * f.height < 0.5
			? `<span class="focus-outline" aria-hidden="true" style="left:${f.x * 100}%;top:${f.y * 100}%;width:${f.width * 100}%;height:${f.height * 100}%"></span>` : ''
		return `<a href="/?q=${encodeURIComponent(name)}"><span class="shot"><img src="${esc(capture.image)}" alt="What ${esc(name)} colours" loading="lazy" width="1080" height="2400">${outline}</span><code>${esc(name).replace(/_/g, '_<wbr>')}</code><span>${esc(rest.join(':').trim())}</span></a>`
	})
	return `<div class="doc-shots">${items.join('')}</div>`
}

function render(src: string) {
	const headings: Doc['headings'] = []
	const marked = new Marked({
		renderer: {
			heading({ tokens, depth }) {
				const text = this.parser.parseInline(tokens)
				if (depth === 1) return `<h1>${text}</h1>`
				const id = slugify(text)
				if (depth === 2) headings.push({ id, text: text.replace(/<[^>]+>/g, '') })
				return `<h${depth} id="${id}">${text}</h${depth}>`
			},
			code({ text, lang }) {
				if (lang === 'shots') return shots(text)
				return false
			},
			link({ href, tokens }) {
				const text = this.parser.parseInline(tokens)
				const external = /^https?:/.test(href)
				return `<a href="${esc(href)}"${external ? ' target="_blank" rel="noopener"' : ''}>${text}</a>`
			},
		},
	})
	return { html: marked.parse(src, { async: false }), headings }
}

let cache: Doc[] | null = null

export function docs(): Doc[] {
	if (cache) return cache
	cache = fs.readdirSync(DIR).filter(f => f.endsWith('.md')).sort().map(file => {
		const src = fs.readFileSync(path.join(DIR, file), 'utf8').replace(/\r/g, '')
		const title = src.match(/^# (.+)$/m)?.[1] ?? file
		const slug = file.replace(/^\d+-/, '').replace(/\.md$/, '')
		return { slug, title, ...render(src) }
	})
	return cache
}
