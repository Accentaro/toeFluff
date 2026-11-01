'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const NAV = [
	{ href: '/', label: 'Keys', icon: 'M4 6h16M4 12h16M4 18h10' },
	{ href: '/studio/', label: 'Studio', icon: 'M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.5 0-.4-.2-.8-.4-1.1-.3-.3-.4-.6-.4-1 0-.8.7-1.4 1.5-1.4H16a5 5 0 0 0 5-5c0-4.4-4-8-9-8Z' },
	{ href: '/docs/', label: 'Docs', icon: 'M6 3h9l4 4v14H6zM14 3v5h5' },
	{ href: '/converter/', label: 'Converter', icon: 'M4 8h13l-3-3M20 16H7l3 3' },
	{ href: '/templates/', label: 'Templates', icon: 'M5 4h14v6H5zM5 14h6v6H5zM15 14h4v6h-4z' },
]
const EXTERNAL = [
	{ href: 'https://github.com/Valenced/valenced', label: 'Valenced' },
	{ href: 'https://github.com/nexpid/Themelings/tree/data', label: 'Themelings' },
]

export default function Sidebar() {
	const path = usePathname()
	const [open, setOpen] = useState(false)
	useEffect(() => setOpen(false), [path])
	const active = (href: string) => (href === '/' ? path === '/' : path.startsWith(href))

	return (
		<>
			<button className="menu-toggle" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(o => !o)}>
				<svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
			</button>
			<aside className={`sidebar${open ? ' open' : ''}`}>
				<Link href="/" className="brand">
					<span className="brand-mark" aria-hidden="true">v.</span>Theme Keys
				</Link>
				<nav aria-label="Main navigation">
					{NAV.map(item => (
						<Link key={item.href} href={item.href} className={active(item.href) ? 'on' : undefined}>
							<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d={item.icon} /></svg>
							{item.label}
						</Link>
					))}
				</nav>
				<div className="sidebar-foot">
					{EXTERNAL.map(item => (
						<a key={item.href} href={item.href} target="_blank" rel="noopener">{item.label} ↗</a>
					))}
				</div>
			</aside>
			{open && <div className="scrim" onClick={() => setOpen(false)} />}
		</>
	)
}
