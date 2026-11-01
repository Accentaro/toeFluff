'use client'

import { useEffect, useState } from 'react'

export default function Toaster() {
	const [text, setText] = useState('')
	useEffect(() => {
		let timer: ReturnType<typeof setTimeout>
		const show = (e: Event) => {
			setText((e as CustomEvent<string>).detail)
			clearTimeout(timer)
			timer = setTimeout(() => setText(''), 1600)
		}
		window.addEventListener('tf-toast', show)
		return () => {
			window.removeEventListener('tf-toast', show)
			clearTimeout(timer)
		}
	}, [])
	return <div className="toast" role="status" hidden={!text}>{text}</div>
}
