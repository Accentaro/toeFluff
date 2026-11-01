import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import DocPage from '@/components/docs/DocPage'
import { docs } from '@/components/docs/markdown'

type Props = { params: Promise<{ slug: string }> }

export const dynamicParams = false

export function generateStaticParams() {
	return docs().slice(1).map(d => ({ slug: d.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { slug } = await params
	return { title: docs().find(d => d.slug === slug)?.title ?? 'Docs' }
}

export default async function Doc({ params }: Props) {
	const { slug } = await params
	const doc = docs().slice(1).find(d => d.slug === slug)
	if (!doc) notFound()
	return <DocPage doc={doc} />
}
