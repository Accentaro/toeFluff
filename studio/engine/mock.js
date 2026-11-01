// Local mock data for the preview. People and conversations are made up; no account or network is involved.
// Avatars, server icons, role colours and embed accents are user content in Discord, so they stay fixed.

export const users = {
	me: { id: 'me', name: 'Juniper', username: 'juniper.dev', hue: 32, status: 'idle', tag: 'MOSS', pronouns: 'she/her', bio: 'Theme tinkerer. Making Discord softer, one colour key at a time.', activity: 'Visual Studio Code' },
	palm: { id: 'palm', name: 'Palm', username: 'palmdevs', hue: 260, status: 'online', role: '#6fc8f2', tag: 'VLCD', pronouns: 'he/him', bio: 'I make things with user experience and accessibility in mind. Dry jokes too.' },
	quill: { id: 'quill', name: 'Quill', username: 'quill.ink', hue: 340, status: 'dnd', role: '#f47fa4', tag: 'INK' },
	tempo: { id: 'tempo', name: 'Tempo', username: 'tempo', hue: 190, status: 'online', bot: true },
	sol: { id: 'sol', name: 'sol', username: 'solstice', hue: 48, status: 'online', role: '#f5c542', tag: 'SUN' },
	ren: { id: 'ren', name: 'Ren', username: 'ren.codes', hue: 150, status: 'idle', role: '#57d6a0' },
	mika: { id: 'mika', name: 'Mika', username: 'mika_m', hue: 205, status: 'offline' },
	oak: { id: 'oak', name: 'Oakley', username: 'oakley', hue: 15, status: 'online' },
	vex: { id: 'vex', name: 'vex', username: 'vexillum', hue: 285, status: 'dnd', role: '#b18cff', tag: 'FLAG' },
	lumen: { id: 'lumen', name: 'Lumen', username: 'lumen', hue: 95, status: 'online', role: '#ff8a5c' },
	ash: { id: 'ash', name: 'Ashwin', username: 'ashwin', hue: 225, status: 'offline' },
	nova: { id: 'nova', name: 'Nova', username: 'nova.exe', hue: 310, status: 'online', role: '#e86bd6', tag: 'STAR' },
}

export const servers = [
	{ id: 'valenced', name: 'Valenced', logo: 'valenced', unread: true },
	{ id: 'lumen', name: 'Lumen Lab', glyph: 'L', hue: 20, unread: true },
	{ id: 'garden', name: 'Pixel Garden', glyph: 'PG', hue: 140, unread: true },
	{ id: 'owls', name: 'Night Owls', glyph: 'NO', hue: 250, unread: true },
	{ id: 'synth', name: 'Synth Club', glyph: 'S', hue: 320 },
	{ id: 'cove', name: 'Cove Themes', glyph: 'CT', hue: 190, unread: true },
	{ id: 'rust', name: 'Rustaceans', glyph: 'R', hue: 8, unread: true },
	{ id: 'atlas', name: 'Atlas', glyph: 'A', hue: 210, unread: true },
	{ id: 'kiln', name: 'Kiln', glyph: 'K', hue: 35 },
]

export const valenced = {
	members: '3,766',
	boost: { label: 'Boost Goal', have: 20, need: 33 },
	categories: [
		{ name: 'Info', channels: [
			{ id: 'rules', name: 'rules', type: 'rules' },
			{ id: 'announcements', name: 'announcements', type: 'announcement' },
			{ id: 'faq', name: 'faq', type: 'text' },
			{ id: 'github', name: 'github', type: 'text', unread: true },
		] },
		{ name: 'Addons', channels: [
			{ id: 'plugins', name: 'plugins', type: 'forum' },
			{ id: 'themes', name: 'themes', type: 'forum' },
			{ id: 'plugin-requests', name: 'plugin-requests', type: 'forum', unread: true, mentions: 5, threads: ['GIF category'] },
		] },
		{ name: 'Community', channels: [
			{ id: 'general', name: 'general', type: 'text', unread: true },
			{ id: 'bots', name: 'bots', type: 'text', unread: true },
			{ id: 'showcase', name: 'showcase', type: 'text' },
			{ id: 'support', name: 'support', type: 'forum' },
		] },
	],
}

export const announcements = [
	{ user: 'palm', time: '28/10/2026 10:57', text: 'Some of you saw Discord stall on the logo screen after updating. A log from your device helps a lot: if you know how to use ADB, please send your `adb logcat` output.', edited: true, reactions: [['✅', 9, true], ['🥔', 6], ['😡', 2]], thread: { name: 'thread', count: 41, last: 'There are no recent messages in this thread.' } },
	{ user: 'palm', time: '28/10/2026 12:01', reply: { user: 'palm', text: "There's a known issue with Valenced being frozen on the Discord logo screen. To temporarily fix the issue, ..." }, text: 'I pushed small fixes in 1.2.2 that should help. Reinstall in Manager to update to the latest version.', reactions: [['✅', 22], ['🥔', 8], ['✨', 2], ['🐱', 2]] },
]

export const bots = {
	unread: 20,
	since: '02:16',
	messages: [
		{ user: 'sol', time: '02:16', text: '.top' },
		{ user: 'tempo', time: '02:16', embed: {
			accent: '#e3366d',
			title: 'Top listeners in Valenced',
			lines: [['sol', 480], ['Ren', 245], ['Juniper', 232, true], ['Quill', 114], ['vex', 95], ['Lumen', 56], ['Nova', 42], ['Oakley', 27]],
			footer: 'Crown claimed by sol!',
			meta: 'dream pop', sub: 'Artist - 22 listeners - 1,347 plays',
		} },
		{ user: 'nova', time: '02:17', text: '@sol how are you still on top' },
		{ user: 'sol', time: '02:17', text: 'consistency :)' },
	],
}

export const dms = [
	{ id: 'quill', user: 'quill', preview: 'did the new build fix the drawer?', time: '13m', unread: true, badge: 2 },
	{ id: 'ren', user: 'ren', preview: 'Ren: sent the palette over', time: '4h' },
	{ id: 'group', group: true, name: 'Theme crew', members: ['palm', 'nova', 'oak'], preview: 'Nova: onyx needs more contrast', time: '5h' },
	{ id: 'oak', user: 'oak', preview: 'You: sounds good, ping me later', time: '1d' },
	{ id: 'mika', user: 'mika', preview: 'Mika: lol yes', time: '1d' },
	{ id: 'vex', user: 'vex', preview: 'You: try BLURPLE_50 first', time: '2d', wave: true },
	{ id: 'lumen', user: 'lumen', preview: 'Lumen: the screenshots look great', time: '4d' },
	{ id: 'ash', user: 'ash', preview: 'Ashwin: see you then', time: '6d' },
]

export const activities = [
	{ user: 'nova', title: 'Chasing Lights', sub: 'Aurora Bloom', kind: 'listening', art: [300, 340] },
	{ user: 'ren', title: 'Starfall Tactics', sub: 'In a match', kind: 'playing', art: [120, 160] },
]

export const conversations = {
	quill: [
		{ user: 'quill', time: 'Yesterday at 21:04', text: 'is the server drawer plugin working for you on 352?' },
		{ user: 'me', time: 'Yesterday at 21:10', text: 'yeah, after the update it is fine. which build are you on?' },
		{ user: 'quill', time: 'Today at 09:32', text: 'did the new build fix the drawer?' },
	],
	ren: [
		{ user: 'ren', time: 'Today at 08:12', text: 'sent the palette over' },
		{ user: 'ren', time: 'Today at 08:12', text: 'background `#1c1827`, cards `#2a2439`, accent `#8b5cf6`' },
	],
	group: [
		{ user: 'palm', time: 'Today at 14:02', text: 'Dusk looks great on Ash' },
		{ user: 'oak', time: 'Today at 14:05', text: 'agreed, the chat box reads much better now' },
		{ user: 'nova', time: 'Today at 14:20', text: 'onyx needs more contrast though', reactions: [['👍', 2, true]] },
	],
}

export const inbox = [
	{ user: 'quill', text: 'Quill mentioned you in Valenced - development:', quote: ['@Juniper', ' does the new build fix it'], time: '2h' },
	{ user: 'ren', text: 'Ren replied to you in Valenced - themes:', quote: ['', 'thank you, this helped a lot'], time: '2h' },
	{ user: 'palm', text: 'Palm mentioned you in Valenced - development:', quote: ['@Juniper', ' can you check this'], time: '3h' },
	{ user: 'vex', text: 'vex replied to you in Cove Themes - showcase:', quote: ['', 'exactly what I was confused about'], time: '4h' },
	{ user: 'nova', text: 'Nova replied to you in Theme crew:', quote: ['', 'onyx needs more contrast though'], time: '5h' },
	{ user: 'lumen', text: 'Lumen replied to you in Lumen Lab - general:', quote: ['', 'the screenshots look great'], time: '4d' },
]

export const memberGroups = [
	['Team', [['tempo', 'stupid discussions in chat', 'app']]],
	['Mod', [['quill', 'reading the logs']]],
	['Contributor', [['palm', 'Visual Studio Code', 'game'], ['vex', 'gg/flags'], ['nova', 'Listening to Aurora Bloom', 'music']]],
	['Plugin Dev', [['ren', 'Visual Studio Code', 'game'], ['lumen', 'check my sheet']]],
]

export const plugins = [
	{ id: 'devkit', name: 'Developer Kit', icon: 'wrench', text: 'Tools assisting Valenced developers.', on: true },
	{ id: 'devmode', name: 'Developer Mode', icon: 'wrench', text: 'Exposes internal Valenced APIs for debugging.', on: true },
	{ id: 'gif', name: 'GIF Picker Performance', icon: 'image', text: 'Smoother GIF picker: no placeholder swaps or fades, and GIFs outside the visible area stay paused.', on: true },
	{ id: 'notrack', name: 'No Track', icon: 'shield', text: 'Disables Discord and Sentry analytics.', on: true },
	{ id: 'ota', name: 'Prevent OTA Updates', icon: 'error', text: 'Prevents Discord from downloading and running OTA updates.', on: false },
	{ id: 'staff', name: 'Staff Settings', icon: 'key', text: "Allows accessing Discord's Staff Settings.", on: true },
	{ id: 'themes', name: 'Themes', icon: 'palette', text: 'Color themes, font packs, icon packs, and emoji packs.', on: true, gear: true },
]

/** Fixed artwork: a circle with initials, coloured from the user's hue. */
export function avatar(id, size = 40, { status = true, ring = '' } = {}) {
	const u = users[id] || users.me
	const initials = u.name.replace(/[^A-Za-z]/g, '').slice(0, 1).toUpperCase() || '?'
	const dot = status && u.status && size >= 24
		? `<i class="vp-status s-${u.status}" data-k="${statusKeys[u.status]}" data-n="Status: ${u.status}"></i>` : ''
	return `<span class="vp-av${ring}" style="width:${size}px;height:${size}px"><span class="vp-av-img" data-fixed="Avatar (user content)" style="background:linear-gradient(135deg,hsl(${u.hue} 55% 62%),hsl(${(u.hue + 40) % 360} 50% 42%));font-size:${Math.round(size * 0.42)}px">${initials}</span>${dot}</span>`
}

/** Status colours: online is verified; idle, dnd and offline use the matching ICON_STATUS_* keys. */
export const statusKeys = {
	online: 'bg:STATUS_POSITIVE',
	idle: 'bg:ICON_STATUS_IDLE',
	dnd: 'bg:ICON_STATUS_DND',
	offline: 'bg:ICON_STATUS_OFFLINE',
}

/** Server icon artwork. */
export function serverIcon(s, size = 48) {
	if (s.logo === 'valenced')
		return `<span class="vp-sicon" data-fixed="Server icon (user content)" style="width:${size}px;height:${size}px;background:#2fe1f7"><svg width="${size * 0.72}" height="${size * 0.72}" viewBox="0 0 48 48" fill="none" stroke="#0c1418" stroke-width="3.4"><circle cx="24" cy="24" r="16.5"/><circle cx="24" cy="24" r="9"/><circle cx="24" cy="24" r="3" fill="#0c1418" stroke="none"/><circle cx="24" cy="7.5" r="3" fill="#0c1418" stroke="none"/><circle cx="10" cy="32.5" r="3" fill="#0c1418" stroke="none"/><circle cx="38" cy="32.5" r="3" fill="#0c1418" stroke="none"/></svg></span>`
	return `<span class="vp-sicon" data-fixed="Server icon (user content)" style="width:${size}px;height:${size}px;background:linear-gradient(140deg,hsl(${s.hue} 70% 58%),hsl(${(s.hue + 30) % 360} 60% 38%));font-size:${s.glyph.length > 1 ? 15 : 19}px">${s.glyph}</span>`
}

export const roleColor = id => users[id]?.role || null
