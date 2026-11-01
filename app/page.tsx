import KeysBrowser from '@/components/keys/KeysBrowser'
import Toaster from '@/components/Toaster'
import { areas, meta, testedRaw, testedSemantic } from '@/components/keys/build'
import '@/components/site.css'

export default function Home() {
	return (
		<>
			<div className="page-title">
				<h1>Valenced Theme Keys</h1>
				<p>Every colour key a Valenced theme can change, with screenshots of what it paints.</p>
			</div>
			<KeysBrowser semantic={testedSemantic()} raw={testedRaw()} areas={areas} meta={meta} />
			<Toaster />
		</>
	)
}
