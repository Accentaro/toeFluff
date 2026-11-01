'use client'

import { copyText, download } from '@/components/clipboard'

/** A titled code block with copy and download buttons. */
export default function CodePanel({ title, file, text, type }: { title: string; file: string; text: string; type?: string }) {
	return (
		<div className="code-panel">
			<div className="code-head">
				<strong>{title}</strong>
				<div className="code-actions">
					<button className="button" onClick={() => copyText(text, title)}>Copy</button>
					<button className="button" onClick={() => download(file, text, type)}>Download</button>
				</div>
			</div>
			<pre><code>{text}</code></pre>
		</div>
	)
}
