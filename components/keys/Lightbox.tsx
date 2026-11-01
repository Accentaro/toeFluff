'use client'

import { useEffect, useRef } from 'react'
import type { Shot } from './types'

export type Gallery = { name: string; description?: string; shots: Shot[]; index: number }

export function FocusOutline({ f }: { f?: Shot['f'] }) {
	if (!f) return null
	return <span className="focus-outline" aria-hidden="true" style={{ left: `${f[0] * 100}%`, top: `${f[1] * 100}%`, width: `${f[2] * 100}%`, height: `${f[3] * 100}%` }} />
}

export default function Lightbox({ gallery, onChange }: { gallery: Gallery | null; onChange: (g: Gallery | null) => void }) {
	const ref = useRef<HTMLDialogElement>(null)

	useEffect(() => {
		const dialog = ref.current
		if (!dialog) return
		if (gallery && !dialog.open) dialog.showModal()
		if (!gallery && dialog.open) dialog.close()
	}, [gallery])

	const shot = gallery?.shots[gallery.index]
	const count = gallery?.shots.length ?? 0
	const step = (by: number) => gallery && onChange({ ...gallery, index: (gallery.index + by + count) % count })
	const notes = [shot?.n?.includes('transparent') && 'This colour is partly transparent.', shot?.n?.includes('scrambled') && 'Personal text is scrambled.'].filter(Boolean).join(' ')

	return (
		<dialog
			ref={ref}
			className="lightbox"
			aria-label={gallery ? `${gallery.name}: ${shot?.s}` : 'Screenshot'}
			onClose={() => onChange(null)}
			onClick={e => { if (e.target === e.currentTarget) e.currentTarget.close() }}
			onKeyDown={e => {
				if (count > 1 && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
					e.preventDefault()
					step(e.key === 'ArrowLeft' ? -1 : 1)
				}
			}}
		>
			<button className="button lb-close" onClick={() => ref.current?.close()} aria-label="Close" autoFocus>Close ×</button>
			{gallery && shot && (
				<figure className="lb-body">
					<div className="lb-frame">
						<img src={shot.i} alt={`${gallery.name} in ${shot.s}`} width={1080} height={2400} />
						<FocusOutline f={shot.f} />
					</div>
					<figcaption>
						<strong className="lb-title">{gallery.name}</strong>
						<p className="muted">{shot.s}</p>
						<p>Pink shows: {shot.d || gallery.description} {notes}</p>
						{count > 1 && (
							<div className="lb-nav">
								<button className="button" onClick={() => step(-1)} aria-label="Previous screenshot">←</button>
								<span aria-live="polite">{gallery.index + 1} / {count}</span>
								<button className="button" onClick={() => step(1)} aria-label="Next screenshot">→</button>
							</div>
						)}
						<a href={shot.i} target="_blank" rel="noopener">Open full-size image ↗</a>
					</figcaption>
				</figure>
			)}
		</dialog>
	)
}
