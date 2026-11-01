'use client'

// Hosts the vanilla theme studio (studio/engine). The engine, its data and the phone mock load after hydration,
// so nothing touches window during the static build.
import { useEffect, useRef, useState } from 'react'
import '@/studio/engine/studio.css'
import '@/studio/engine/phone.css'
import './shell.css'

type Editor = { route(param: string): unknown; destroy(): void }

declare global {
	interface Window { VT?: Record<string, unknown> }
}

const screenNames: Record<string, string> = { chat: 'Announcements', chatinput: 'Chat', keyboard: 'Chat with keyboard', emoji: 'Emoji picker', server: 'Channel list', settings: 'Settings', plugins: 'Plugins', colors: 'Theme colours', alert: 'Alert', actionsheet: 'Message menu', guildsheet: 'Server menu', forum: 'Forum', search: 'Member search', members: 'Members', home: 'Direct messages', you: 'Your profile', inbox: 'Inbox', 'chat-scrolled': 'Chat / Scrolled back', 'chat-unread-preview': 'Chat / Unread preview', 'chat-floating-preview': 'Chat / Jump button preview', 'component-activity': 'Listening activity preview', 'component-buttons': 'Button styles', 'component-buttons-more': 'Additional button styles', 'component-disabled': 'Disabled buttons', 'component-inputs': 'Text fields', 'component-checks': 'Checkboxes, radios and slider', 'component-cards': 'Cards', 'component-badges': 'Badges', 'component-badges-premium': 'Premium badge', 'component-badges-rarity': 'Rarity badges', 'component-notices': 'Notices', 'component-toggles': 'Toggle buttons', 'component-icons': 'Icon buttons', 'component-rows': 'Settings row', 'component-toast-default': 'Notification', 'component-toast-success': 'Success notification', 'component-toast-critical': 'Error notification' }

export default function Studio() {
	const hostRef = useRef<HTMLDivElement>(null)
	const imageRef = useRef<HTMLDialogElement>(null)
	const toastRef = useRef<HTMLDivElement>(null)
	const [state, setState] = useState<'loading' | 'ready' | string>('loading')
	const [toast, setToast] = useState('')
	const [image, setImage] = useState<{ src: string; alt: string } | null>(null)

	useEffect(() => {
		if (image && !imageRef.current?.open) imageRef.current?.showModal()
	}, [image])

	useEffect(() => {
		const host = hostRef.current!
		let editor: Editor | null = null
		let cancelled = false
		let toastTimer: ReturnType<typeof setTimeout>

		// A popover, so it shows above the studio's modal dialogs too
		const showToast = (text: string) => {
			const el = toastRef.current
			setToast(text)
			clearTimeout(toastTimer)
			if (el?.matches(':popover-open')) el.hidePopover()
			el?.showPopover()
			toastTimer = setTimeout(() => {
				if (el?.matches(':popover-open')) el.hidePopover()
				setToast('')
			}, 2400)
		}
		const copy = async (text: string, label = text) => {
			try {
				await navigator.clipboard.writeText(text)
				showToast(`Copied ${label}`)
			} catch {
				showToast('Could not copy. Select the text and copy it manually.')
			}
		}
		// /studio/#KEY, #@RAW, #!dusk, #!new, #!import
		const route = () => {
			const param = location.hash.slice(1)
			try {
				decodeURIComponent(param)
			} catch {
				return showToast('This link contains an invalid key name.')
			}
			editor?.route(param)
		}

		;(async () => {
			const [data, { createStore }, { mount }] = await Promise.all([
				import('@/lib/data'),
				import('@/studio/engine/store.js'),
				import('@/studio/engine/main.js'),
			])
			if (cancelled) return
			const store = createStore({ tokens: data.tokens, initialTheme: undefined, persistent: true })
			window.VT = {
				store, data: data.keys, resolved: data.resolved, tokens: data.tokens, descriptions: data.descriptions,
				captures: data.captures, examples: data.examples, screenNames,
				openImage: (src: string, alt: string) => setImage({ src, alt }), toast: showToast, copy,
			}
			const mounted: Editor = await mount(host)
			if (cancelled) return mounted.destroy()
			editor = mounted
			setState('ready')
			route()
		})().catch((err: Error) => {
			if (!cancelled) setState(err.message || 'unknown error')
		})

		window.addEventListener('hashchange', route)
		window.addEventListener('popstate', route)
		return () => {
			cancelled = true
			clearTimeout(toastTimer)
			window.removeEventListener('hashchange', route)
			window.removeEventListener('popstate', route)
			editor?.destroy()
			host.replaceChildren()
		}
	}, [])

	return (
		<div className="studio-shell">
			{state !== 'ready' && (
				<div className="studio-status" role={state === 'loading' ? 'status' : 'alert'}>
					{state === 'loading' ? 'Loading the studio…' : <>The studio could not load: {state}. <button onClick={() => location.reload()}>Reload</button></>}
				</div>
			)}
			<div ref={hostRef} />
			<div ref={toastRef} className="toast" role="status" popover="manual">{toast}</div>
			<dialog ref={imageRef} className="studio-image" onClose={() => setImage(null)} onClick={e => e.target === e.currentTarget && imageRef.current?.close()}>
				{image && (
					<>
						<header><span>{image.alt}</span><form method="dialog"><button aria-label="Close">×</button></form></header>
						<img src={image.src} alt={`${image.alt} screenshot`} />
						<p className="muted"><a href={image.src} target="_blank" rel="noreferrer">Open the original</a></p>
					</>
				)}
			</dialog>
		</div>
	)
}
