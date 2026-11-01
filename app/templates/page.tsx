import fs from 'node:fs'
import path from 'node:path'
import type { Metadata } from 'next'
import CodePanel from '@/components/CodePanel'
import Toaster from '@/components/Toaster'
import '@/components/site.css'

export const metadata: Metadata = { title: 'Templates' }

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), 'public', 'template', file), 'utf8').replace(/\r/g, '')

export default function Templates() {
	const legacy = read('legacy-theme.json')
	const plugin = read('plugin/js/index.ts')
	const manifest = read('plugin/manifest.json')
	return (
		<div className="narrow">
			<div className="page-title">
				<h1>Templates</h1>
				<p>Dusk is a starter theme that changes 25 colours. Copy it as a JSON theme or as a plugin, or open it in the studio and change it there.</p>
			</div>
			<img className="template-hero" src="/images/template-preview.webp" alt="Dusk on four Discord screens" width={1110} height={600} />
			<div className="template-actions">
				<a className="button primary" href="/studio/#!dusk">Open in studio</a>
				<a className="button" href="/docs/legacy-json/">How to install a JSON theme</a>
				<a className="button" href="/docs/plugin/">How to build a plugin</a>
			</div>
			<div className="stack">
				<section>
					<h2>JSON theme</h2>
					<p className="muted">For the Legacy Themes plugin. Host the file and import it by its raw URL.</p>
					<CodePanel title="legacy-theme.json" file="dusk.json" text={legacy} type="application/json" />
				</section>
				<section>
					<h2>Plugin</h2>
					<p className="muted">Goes in the plugin template&apos;s <code>themes/</code> folder: <code>js/index.ts</code> next to <code>manifest.json</code>.</p>
					<div className="stack">
						<CodePanel title="js/index.ts" file="index.ts" text={plugin} />
						<CodePanel title="manifest.json" file="manifest.json" text={manifest} type="application/json" />
					</div>
				</section>
			</div>
			<Toaster />
		</div>
	)
}
