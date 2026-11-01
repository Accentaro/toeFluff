import type { Metadata } from 'next'
import Studio from '@/components/studio/Studio'

export const metadata: Metadata = {
	title: 'Theme studio',
	description: 'Edit a Valenced theme on a live Discord phone preview, then export it as legacy JSON or a theme plugin.',
}

export default function StudioPage() {
	return <Studio />
}
