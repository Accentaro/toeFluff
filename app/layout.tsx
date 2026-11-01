import type { Metadata, Viewport } from 'next'
import Sidebar from '@/components/Sidebar'
import './globals.css'

export const metadata: Metadata = {
	title: { default: 'Valenced Theme Keys', template: '%s · Valenced Theme Keys' },
	description: 'Every Discord colour key Valenced themes can change, with a picture of what it paints. Build a theme in the browser and export it.',
	icons: '/favicon.svg',
}

export const viewport: Viewport = { themeColor: '#18181b' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body>
				<Sidebar />
				<main id="main">{children}</main>
			</body>
		</html>
	)
}
