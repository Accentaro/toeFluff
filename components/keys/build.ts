// Build-time: turns data/*.json into the compact lists the keys page renders.
import { keys, captures, examples, descriptions, tokens, BASES } from '@/lib/data'
import type { Focus } from '@/lib/data'
import type { RawItem, SemanticItem, Shot } from './types'

const SCREEN_NAMES: Record<string, string> = { chat: 'Announcements', chatinput: 'Chat', keyboard: 'Chat with keyboard', emoji: 'Emoji picker', server: 'Channel list', settings: 'Settings', plugins: 'Plugins', colors: 'Theme colours', alert: 'Alert', actionsheet: 'Message menu', guildsheet: 'Server menu', forum: 'Forum', search: 'Member search', members: 'Members', home: 'Direct messages', you: 'Your profile', inbox: 'Inbox', 'chat-scrolled': 'Chat / Scrolled back', 'chat-unread-preview': 'Chat / Unread preview', 'chat-floating-preview': 'Chat / Jump button preview', 'component-activity': 'Listening activity preview', 'component-buttons': 'Button styles', 'component-buttons-more': 'Additional button styles', 'component-disabled': 'Disabled buttons', 'component-inputs': 'Text fields', 'component-checks': 'Checkboxes, radios and slider', 'component-cards': 'Cards', 'component-badges': 'Badges', 'component-badges-premium': 'Premium badge', 'component-badges-rarity': 'Rarity badges', 'component-notices': 'Notices', 'component-toggles': 'Toggle buttons', 'component-icons': 'Icon buttons', 'component-rows': 'Settings row', 'component-toast-default': 'Notification', 'component-toast-success': 'Success notification', 'component-toast-critical': 'Error notification' }

export function screenName(screen?: string) {
	if (!screen) return 'Earlier probe'
	if (SCREEN_NAMES[screen]) return SCREEN_NAMES[screen]
	if (!screen.startsWith('component-')) return screen
	return screen.slice(10)
		.replace('buttons-more-pressed-', 'Pressed / ')
		.replace('buttons-pressed-', 'Pressed / ')
		.replace('icons-pressed-', 'Pressed icon / ')
		.replace('rows-pressed-', 'Pressed / ')
		.replace('toggles-pressed-', 'Pressed toggle / ')
		.replaceAll('-', ' ')
}

type RawShot = { image: string; screen: string; focus?: Focus; description?: string; textScrambled?: boolean; measurement?: string }

const round = (n: number) => Math.round(n * 1000) / 1000

function shot(s: RawShot): Shot {
	const out: Shot = { i: s.image, s: screenName(s.screen) }
	const f = s.focus
	if (f && f.width * f.height < 0.5) out.f = [round(f.x), round(f.y), round(f.width), round(f.height)]
	if (s.description) out.d = s.description
	const notes = [s.measurement === 'baseline-difference' && 'Partly transparent', s.textScrambled && 'Text scrambled'].filter(Boolean)
	if (notes.length) out.n = notes.join(' / ')
	return out
}

function shots(kind: 'semantic' | 'raw', key: string, fallback?: string): Shot[] | undefined {
	const main = (captures[kind] as Record<string, RawShot>)[key]
	const more = (examples[kind] as Record<string, RawShot[]>)[key] || []
	if (main) return [main, ...more].map(shot)
	return fallback ? [{ i: '/' + fallback, s: 'Earlier probe' }] : undefined
}

export function testedSemantic(): SemanticItem[] {
	return keys.semantic.map(k => ({
		k: k.key,
		a: k.area,
		d: k.description,
		v: BASES.map(([b]) => (k.defaults as Record<string, string>)[b] ?? ''),
		r: BASES.map(([b]) => (k.raw as Record<string, string>)[b] ?? ''),
		sh: shots('semantic', k.key, k.image),
	}))
}

export function testedRaw(): RawItem[] {
	return keys.raw.map(k => ({
		k: k.key,
		d: k.description,
		v: k.value,
		u: k.usedBy.slice(0, 4),
		un: k.usedBy.length,
		sh: shots('raw', k.key, k.image),
	}))
}

export const areas: string[] = descriptions.areas
export const meta = { discord: keys.discord, date: keys.tested, semanticTotal: Object.keys(tokens.semantic).length, rawTotal: Object.keys(tokens.raw).length }
