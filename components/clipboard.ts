'use client'

// Copy, download and the toast that reports them. <Toaster /> must be on the page.
export function toast(text: string) {
	window.dispatchEvent(new CustomEvent('tf-toast', { detail: text }))
}

export async function copyText(text: string, label = text) {
	try {
		await navigator.clipboard.writeText(text)
		toast(`Copied ${label}`)
	} catch {
		toast('Could not copy. Select the text and copy it manually.')
	}
}

export function download(name: string, text: string, type = 'text/plain') {
	const url = URL.createObjectURL(new Blob([text], { type }))
	const a = document.createElement('a')
	a.href = url
	a.download = name
	document.body.append(a)
	a.click()
	a.remove()
	setTimeout(() => URL.revokeObjectURL(url), 1000)
}
