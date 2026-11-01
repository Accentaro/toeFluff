// Keys with no screenshot yet, built in the browser when "all keys" is switched on. Loaded as its own chunk so the
// full token tables stay out of the page until then.
import tokens from '@/data/tokens.json'
import resolved from '@/data/resolved.json'
import descriptions from '@/data/descriptions.json'
import type { RawItem, SemanticItem } from './types'

const BASES = ['dark', 'darker', 'light', 'midnight'] as const
type TokenDef = Partial<Record<(typeof BASES)[number], { raw: string; opacity: number }>>

export function untested(testedSemantic: Set<string>, testedRaw: Set<string>) {
	const semDefs = tokens.semantic as Record<string, TokenDef>
	const res = resolved.semantic as Record<string, Record<string, string>>
	const semantic: SemanticItem[] = Object.keys(semDefs).sort()
		.filter(k => !testedSemantic.has(k))
		.map(k => ({ k, v: BASES.map(b => res[k]?.[b] ?? ''), r: BASES.map(b => semDefs[k][b]?.raw ?? '') }))

	const users: Record<string, Set<string>> = {}
	for (const [k, def] of Object.entries(semDefs))
		for (const b of BASES) if (def[b]) (users[def[b].raw] ??= new Set()).add(k)
	const rawText = descriptions.raw as Record<string, { text?: string }>
	const raw: RawItem[] = Object.entries(tokens.raw as Record<string, string>)
		.filter(([k]) => !testedRaw.has(k))
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([k, v]) => {
			const u = [...(users[k] || [])].sort()
			return { k, v, d: rawText[k]?.text, u: u.slice(0, 4), un: u.length }
		})
	return { semantic, raw }
}
