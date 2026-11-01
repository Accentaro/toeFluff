import type { Metadata } from 'next'
import DocPage from '@/components/docs/DocPage'
import { docs } from '@/components/docs/markdown'

export const metadata: Metadata = { title: 'Docs' }

export default function Docs() {
	return <DocPage doc={docs()[0]} />
}
