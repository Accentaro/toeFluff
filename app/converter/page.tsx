import type { Metadata } from 'next'
import Converter from '@/components/converter/Converter'
import Toaster from '@/components/Toaster'
import { descriptions, tokens } from '@/lib/data'
import '@/components/site.css'

export const metadata: Metadata = { title: 'Converter' }

export default function ConverterPage() {
	const semantic = descriptions.semantic as Record<string, { text?: string }>
	const hints = Object.fromEntries(Object.entries(semantic).filter(([, d]) => d.text).map(([k, d]) => [k, { text: d.text! }]))
	return (
		<div className="narrow">
			<div className="page-title">
				<h1>Theme converter</h1>
				<p>Paste or upload a Vendetta/Bunny theme JSON to check it and turn it into a Valenced theme plugin. A plugin <code>index.ts</code> converts back to JSON.</p>
			</div>
			<Converter semanticKeys={Object.keys(tokens.semantic)} rawKeys={Object.keys(tokens.raw)} descriptions={hints} />
			<Toaster />
		</div>
	)
}
