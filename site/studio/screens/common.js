// Pieces shared by several screens. Sizes are in dp: the phone is 412 x 915, like the 1080 x 2400 captures.
import { icon, statusIcons } from '../icons.js'
import { avatar, serverIcon, servers, users } from '../mock.js'

export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

/** Android status bar. Its colour comes from the screen behind it, so callers pass that key. */
export function statusBar(bgKey, time = '2:35') {
	return `<div class="vp-statusbar${bgKey ? '' : ' over'}" ${bgKey ? `data-k="bg:${bgKey}" data-n="Status bar"` : ''}><span data-fixed="Android status bar (system)">${time}</span><span class="vp-sb-icons" data-fixed="Android status bar (system)">${statusIcons}</span></div>`
}

/** Gesture navigation strip at the bottom. */
export function navBar(bgKey) {
	return `<div class="vp-navbar" data-k="bg:${bgKey}" data-n="Navigation bar area"><i data-fixed="Android gesture handle (system)"></i></div>`
}

export function notificationCount(count, label, { low = false, ring } = {}) {
	return `<span class="vp-notification-count" data-k="bg:${low ? 'BACKGROUND_MOD_STRONG' : 'BACKGROUND_FEEDBACK_NOTIFICATION'} fg:WHITE${ring ? ` bd:${ring}` : ''}" data-n="${label}">${count}</span>`
}

export function rail(selected) {
	const btn = (id, ic, label) => `<button class="vp-rail-btn${selected === id ? ' on' : ''}" data-go="${id}" data-k="${selected === id ? 'bg:BACKGROUND_BRAND fg:WHITE' : 'bg:MOBILE_GUILDBAR_ICON_BACKGROUND_DEFAULT fg:MOBILE_GUILDBAR_ICON_DEFAULT'}" data-n="${label} button" aria-label="${label}">${icon(ic, 24)}</button>`
	return `<nav class="vp-rail" data-k="bg:BACKGROUND_BASE_LOWEST" data-n="Server rail" data-scroll="rail">
		<div class="vp-rail-item">${selected === 'home' ? '<i class="vp-pip tall" data-k="bg:WHITE" data-n="Selected indicator"></i>' : ''}${btn('home', 'chat', 'Messages')}</div>
		<div class="vp-rail-item">${btn('inbox', 'star', 'Favourites')}</div>
		${servers.map(s => `<div class="vp-rail-item">${selected === s.id ? '<i class="vp-pip tall" data-k="bg:WHITE" data-n="Selected indicator"></i>' : s.unread ? '<i class="vp-pip" data-k="bg:WHITE" data-n="Unread indicator"></i>' : ''}<button class="vp-rail-server" data-go="server" data-hold="guildmenu:${s.id}" aria-label="${esc(s.name)}${s.mentions ? `, ${s.mentions} notifications` : ''}">${serverIcon(s, 48)}${s.mentions ? notificationCount(s.mentions, 'Server notification count', { low: s.low, ring: 'BACKGROUND_BASE_LOWEST' }) : ''}</button></div>`).join('')}
	</nav>`
}

/** Quest card and your nameplate, floating above the bottom of the main screens. */
export function userPanel() {
	const me = users.me
	return `<div class="vp-userpanel" data-k="bd:BORDER_MUTED" data-n="User panel">
		<div class="vp-quest" data-k="bg:BACKGROUND_SURFACE_HIGH" data-n="Quest card">
			<span class="vp-quest-icon" data-fixed="Quest artwork">${icon('quests', 22)}</span>
			<span class="vp-quest-text"><b data-k="fg:TEXT_STRONG">Quest Completed!</b><span data-k="fg:TEXT_DEFAULT">Claim by 01/12/2026</span></span>
		</div>
		<div class="vp-nameplate" data-k="bg:MOBILE_FLOATINGBAR_BACKGROUND_NAMEPLATE" data-n="Nameplate" data-go="you" data-hold="status">
			${avatar('me', 40)}
			<span class="vp-np-text"><span class="vp-np-name"><b data-k="fg:TEXT_STRONG">${me.name}</b>${clanTag(me.tag)}<span data-k="fg:TEXT_STRONG">${icon('chevronDown', 16)}</span></span><span class="vp-np-activity" data-k="fg:TEXT_DEFAULT"><span data-k="fg:TEXT_FEEDBACK_POSITIVE">${icon('games', 15)}</span>${me.activity}</span></span>
			<button class="vp-overlay-btn" data-k="bg:CONTROL_OVERLAY_SECONDARY_BACKGROUND_DEFAULT fg:WHITE" data-n="Notification bell" data-act="bell" aria-label="Notifications">${icon('bell', 20)}</button>
		</div>
	</div>`
}

export function clanTag(tag) {
	return tag ? `<span class="vp-clan" data-k="bg:BACKGROUND_MOD_STRONG fg:TEXT_DEFAULT" data-n="Clan tag"><i data-fixed="Clan badge (user content)"></i>${esc(tag)}</span>` : ''
}

/** Channel type glyph. */
export function channelIcon(type, size = 22) {
	return icon({ text: 'hash', thread: 'thread', announcement: 'megaphone', forum: 'forum', rules: 'rules', voice: 'speaker', locked: 'hashLock', nsfw: 'hashWarn' }[type] || 'hash', size)
}

/** Header of a channel or DM: back arrow, name, search. */
export function channelHeader({ type = 'text', name, dm, sub, count }) {
	return `<header class="vp-chan-header" data-k="bg:STANDALONE_CHANNEL_CONTENT_BACKGROUND bb:STANDALONE_CHANNEL_HEADER_BORDER" data-n="Channel header">
		<button class="vp-icon-btn vp-channel-back" data-back data-k="fg:ICON_SUBTLE" data-n="Back arrow" aria-label="${count ? `Back, ${count} notifications` : 'Back'}">${icon('back', 24)}${count ? notificationCount(count, 'Back button notification count') : ''}</button>
		<span class="vp-chan-title" data-go="channelinfo" data-n="Channel name (opens the channel page)">${dm ? avatar(dm, 24, { status: false }) : `<span class="vp-chan-type" data-k="fg:ICON_STRONG" data-n="Channel type icon">${channelIcon(type, 20)}</span>`}<b data-k="fg:MOBILE_TEXT_HEADING_PRIMARY">${esc(name)}</b><span data-k="fg:TEXT_SUBTLE">${icon('chevronRight', 16)}</span></span>
		${sub ? `<span class="vp-chan-sub" data-k="fg:TEXT_MUTED">${esc(sub)}</span>` : dm ? '' : `<span class="vp-chan-sub" data-k="fg:TEXT_MUTED"><i class="vp-online-dot" data-k="bg:TEXT_STATUS_ONLINE" data-n="Online dot"></i>2 Online</span>`}
		${dm
			// In a DM, call, video and search all use INTERACTIVE_ICON_DEFAULT (verified on Discord 352)
			? `<button class="vp-icon-btn" data-k="fg:INTERACTIVE_ICON_DEFAULT" data-n="Voice call button" aria-label="Call">${icon('phone', 22)}</button><button class="vp-icon-btn" data-k="fg:INTERACTIVE_ICON_DEFAULT" data-n="Video call button" aria-label="Video call">${icon('camera', 22)}</button><button class="vp-icon-btn" data-k="fg:INTERACTIVE_ICON_DEFAULT" data-n="Search button" data-go="search" aria-label="Search">${icon('search', 22)}</button>`
			: `<button class="vp-icon-btn" data-k="fg:ICON_SUBTLE" data-n="Search button" data-go="search" aria-label="Search">${icon('search', 22)}</button>`}
	</header>`
}

/** Inline markdown used by mock messages: `code`, @mentions, **bold**, links. */
const inlineCodeColors = { dark: 'NEUTRAL_4', darker: 'NEUTRAL_5', light: 'NEUTRAL_72', midnight: 'NEUTRAL_12' }
const codeTextColors = { dark: 'NEUTRAL_1', darker: 'NEUTRAL_8', light: 'NEUTRAL_66', midnight: 'NEUTRAL_15' }

export function md(text, base = 'dark') {
	return esc(text)
		.replace(/`([^`]+)`/g, `<code class="vp-code" data-k="bg:BACKGROUND_CODE bd:BORDER_NORMAL fg:@${inlineCodeColors[base]}" data-n="Inline code (Android raw text colour)">$1</code>`)
		.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
		.replace(/(^|\s)@(\w+)/g, `$1<span class="vp-mention${base === 'light' ? ' light' : ''}" data-fixed="Mention (fixed colour; no key changes it on 352.6)">@$2</span>`)
		.replace(/(https?:\/\/\S+)/g, '<span class="vp-link" data-k="fg:TEXT_LINK" data-n="Link">$1</span>')
}

function codeBlock(code, language, base) {
	const keys = `bg:BACKGROUND_CODE bd:BORDER_NORMAL fg:@${codeTextColors[base]}`
	if (!language) return `<pre class="vp-codeblock" data-k="${keys}" data-n="Code block">${esc(code)}</pre>`
	return `<div class="vp-codeblock vp-code-listing" data-k="${keys}" data-n="Fenced code block"><div class="vp-code-language" data-k="fg:TEXT_MUTED" data-n="Code language">${esc(language)}</div><ol>${code.split('\n').map(line => `<li><code>${esc(line)}</code></li>`).join('')}</ol></div>`
}

// Discord Android 352206 reads these native raw resources, bypassing semantic overrides.
const threadColors = {
	dark: ['NEUTRAL_64', 'NEUTRAL_1', 'NEUTRAL_4', 'BLUE_NEW_27'],
	darker: ['NEUTRAL_79', 'NEUTRAL_2', 'NEUTRAL_5', 'BLUE_NEW_37'],
	light: ['NEUTRAL_1', 'NEUTRAL_76', 'NEUTRAL_72', 'BLUE_NEW_53'],
	midnight: ['NEUTRAL_96', 'NEUTRAL_10', 'NEUTRAL_12', 'BLUE_NEW_45'],
}

const threadTimestampColors = { dark: 'NEUTRAL_23', darker: 'NEUTRAL_29', light: 'NEUTRAL_41', midnight: 'NEUTRAL_35' }
const chatSpineColors = { dark: 'NEUTRAL_47', darker: 'NEUTRAL_55', light: 'NEUTRAL_16', midnight: 'NEUTRAL_65' }

function threadCard(thread, base) {
	const [background, title, text, link] = threadColors[base]
	const body = `<span class="vp-thread-top"><b data-k="fg:@${title}" data-n="Thread title">${esc(thread.name)}</b><span data-k="fg:@${link}" data-n="Thread reply count">${thread.count} ${icon('chevronRight', 12)}</span></span><span data-k="fg:@${text}" data-n="Thread message preview">${thread.author ? `<b data-k="fg:@${title}" data-n="Thread preview author">${esc(thread.author)}</b> ` : ''}${esc(thread.last)}</span>`
	const props = `class="vp-thread" data-k="bg:@${background} bd:BORDER_SUBTLE" data-n="Thread preview (Android raw colours)"`
	return thread.route ? `<button ${props} data-go="${thread.route}">${body}</button>` : `<div ${props}>${body}</div>`
}

// Native chat reactions on Discord 352.6 use Android raw colours, except the unselected fill.
const reactionTextColors = { dark: ['NEUTRAL_16', 'NEUTRAL_1'], darker: ['NEUTRAL_23', 'NEUTRAL_2'], light: ['NEUTRAL_47', 'NEUTRAL_76'], midnight: ['NEUTRAL_29', 'NEUTRAL_10'] }
export function reactionKeys(mine, base = 'dark') {
	const [normal, selected] = reactionTextColors[base]
	return mine ? `bg:@BRAND_NEW_500_ALPHA_20 bd:@BRAND_560 fg:@${selected}` : `bg:BACKGROUND_MOD_STRONG fg:@${normal}`
}

export function reactions(list, msgIndex, toggled = {}, base = 'dark') {
	if (!list?.length) return ''
	list = list.map(([e, n, mine], i) => {
		if (!toggled[`${msgIndex}.${i}`]) return [e, n, mine]
		return [e, mine ? n - 1 : n + 1, !mine]
	})
	return `<div class="vp-reactions">${list.map(([e, n, mine], i) => `<button class="vp-reaction${mine ? ' on' : ''}" data-act="react:${msgIndex}.${i}" data-k="${reactionKeys(mine, base)}" data-n="${mine ? 'Your reaction' : 'Reaction'}"><span data-fixed="Emoji">${e}</span>${n}</button>`).join('')}<button class="vp-reaction add" data-k="${reactionKeys(false, base)}" data-n="Add reaction" data-open="emoji">${icon('emoji', 18)}</button></div>`
}

export function nameOf(id) {
	const u = users[id] || users.me
	return `<b class="vp-msg-name" data-go="profile:${u.id}" ${u.role ? `style="color:${u.role}" data-fixed="Role colour (set by the server)"` : 'data-k="fg:INTERACTIVE_TEXT_ACTIVE" data-n="Username (no role colour)"'}>${esc(u.name)}</b>`
}

/** One chat message. `index` addresses it for reactions and the long-press menu. */
export function message(m, index, { grouped = false, ui = {}, dm = false, base = 'dark' } = {}) {
	const where = dm ? '' : ':server'
	const u = users[m.user] || users.me
	if (m.threadStarted) return `<div class="vp-msg vp-thread-started" data-n="Thread started message">
		<span class="vp-thread-start-icon" data-k="fg:ICON_MUTED" data-n="Thread started icon">${icon('thread', 20)}</span>
		<i class="vp-thread-spine" data-k="bd:@${chatSpineColors[base]}" data-n="Chat thread connector (Android raw colour)"></i>
		<div>${nameOf(u.id)} <span data-k="fg:TEXT_DEFAULT">started a thread:</span><b class="vp-thread-name" data-k="fg:TEXT_STRONG">${esc(m.thread.name)}</b><small data-k="fg:@${threadTimestampColors[base]}" data-n="Thread created timestamp (Android raw colour)">${esc(m.time)}</small>${threadCard(m.thread, base)}</div>
	</div>`
	const head = grouped ? '' : `<div class="vp-msg-head">${nameOf(u.id)}${u.bot ? '<span class="vp-app" data-k="bg:BACKGROUND_BRAND fg:WHITE" data-n="App badge">' + icon('check', 10) + 'APP</span>' : clanTag(u.tag)}<span class="vp-time" data-k="fg:TEXT_MUTED">${esc(m.time)}</span></div>`
	const reply = m.reply ? `<div class="vp-reply"><i class="vp-reply-spine" data-k="bd:@${chatSpineColors[base]}" data-n="Reply line (Android raw colour)"></i>${avatar(m.reply.user, 16, { status: false })}${nameOf(m.reply.user)}${clanTag(users[m.reply.user]?.tag)}<span class="vp-reply-text" data-k="fg:TEXT_DEFAULT">${esc(m.reply.text)}</span></div>` : ''
	// "X joined the server" and other system lines have no avatar or name row
	if (m.system) return `<div class="vp-msg vp-system" data-n="System message">
		<span class="vp-system-icon" data-k="fg:TEXT_FEEDBACK_POSITIVE" data-n="Join arrow">${icon('arrowRight', 18)}</span>
		<span data-k="fg:TEXT_MUTED">${m.system.replace('{name}', `</span><b data-k="fg:TEXT_STRONG">${esc(u.name)}</b><span data-k="fg:TEXT_MUTED">`)}</span>
		<small data-k="fg:TEXT_MUTED">${esc(m.time)}</small>
	</div>`
	const mentioned = m.mentionsMe ? ' data-k="bg:MESSAGE_MENTIONED_BACKGROUND_DEFAULT"' : ''
	return `<div class="vp-msg${grouped ? ' grouped' : ''}${m.mentionsMe ? ' mentioned' : ''}" data-hold="msgmenu:${index}" data-message-own="${m.user === 'me'}" data-n="${m.mentionsMe ? 'Message that mentions you' : 'Message'}"${mentioned}>
		${m.mentionsMe ? '<i class="vp-mention-bar" data-k="bg:@YELLOW_300" data-n="Mention highlight bar (Android raw colour)"></i>' : ''}
		${reply}
		<div class="vp-msg-row">
			${m.thread ? `<i class="vp-thread-spine" data-k="bd:@${chatSpineColors[base]}" data-n="Chat thread connector (Android raw colour)"></i>` : ''}
			<span class="vp-msg-avatar" data-go="profile:${u.id}${where}">${grouped ? '' : avatar(u.id, 40, { status: false })}</span>
			<div class="vp-msg-body">
				${head}
				${m.text ? `<div class="vp-msg-text" data-k="fg:TEXT_STRONG">${md(m.text, base)}${m.edited ? ' <small data-k="fg:TEXT_MUTED">(edited)</small>' : ''}</div>` : ''}
				${m.quote ? `<blockquote class="vp-markdown-quote" data-k="bl:@${chatSpineColors[base]} fg:TEXT_STRONG" data-n="Markdown quote (bar is an Android raw colour)">${md(m.quote, base)}</blockquote>` : ''}
				${m.code ? codeBlock(m.code, m.language, base) : ''}
				${m.spoiler ? `<div class="vp-msg-text" data-k="fg:TEXT_STRONG">${esc(m.spoiler[0])} <button class="vp-spoiler${ui.spoiler ? ' open' : ''}" data-act="spoiler" data-k="${ui.spoiler ? 'bg:SPOILER_REVEALED_BACKGROUND' : 'bg:SPOILER_HIDDEN_BACKGROUND'}" data-n="${ui.spoiler ? 'Revealed spoiler' : 'Hidden spoiler'}">${esc(m.spoiler[1])}</button></div>` : ''}
				${m.embed ? embed(m.embed, base) : ''}
				${m.embedV2 ? embedV2(m.embedV2, base) : ''}
				${reactions(m.reactions, index, ui.reacted, base)}
				${m.thread ? threadCard(m.thread, base) : ''}
			</div>
		</div>
	</div>`
}

// Embed titles and links ignore TEXT_LINK and take a raw blue per base (checked on all four bases, 352.6).
export const embedLinkColors = { dark: 'BLUE_NEW_27', darker: 'BLUE_NEW_37', light: 'BLUE_NEW_53', midnight: 'BLUE_NEW_45' }

function embed(e, base) {
	return `<div class="vp-embed" data-k="bg:EMBED_BACKGROUND" data-n="V1 embed" style="border-left-color:${e.accent}">
		<b class="vp-embed-title" data-k="fg:@${embedLinkColors[base]}" data-n="Embed title (Android raw colour)">${esc(e.title)}</b>
		<ol class="vp-embed-list" data-k="fg:TEXT_DEFAULT">${e.lines.map(([n, plays, bold]) => `<li><span data-k="fg:@${embedLinkColors[base]}" data-n="Embed link (Android raw colour)">${esc(n)}</span> - <b>${plays}</b> plays</li>`).join('')}</ol>
		<p data-k="fg:TEXT_DEFAULT">${esc(e.footer)}</p>
		<small data-k="fg:@${embedV2Colors[base][0]}" data-n="Embed footer (Android raw colour)"><b>${esc(e.meta)}</b><br>${esc(e.sub)}</small>
		<span class="vp-embed-thumb" data-fixed="Embed image (content)"></span>
	</div>`
}

// Android 352206 Components V2 text and separators consume raw colours.
const embedV2Colors = {
	dark: ['NEUTRAL_4', 'NEUTRAL_23'], darker: ['NEUTRAL_5', 'NEUTRAL_29'],
	light: ['NEUTRAL_72', 'NEUTRAL_41'], midnight: ['NEUTRAL_12', 'NEUTRAL_35'],
}

function embedV2(e, base) {
	const [text, divider] = embedV2Colors[base]
	const link = embedLinkColors[base]
	const timestamp = base === 'light' ? 'PRIMARY_600' : 'PRIMARY_200'
	return `<div class="vp-embed-v2${e.days ? ' vp-embed-v2-overview' : ''}" data-k="bg:EMBED_BACKGROUND bd:BORDER_SUBTLE" data-n="V2 container">
		${e.accent ? `<i class="vp-embed-v2-accent" style="background:${esc(e.accent)}" data-fixed="V2 accent colour (set by the bot)"></i>` : ''}
		<h3 data-k="fg:@${text}" data-n="V2 heading (Android raw colour)">${esc(e.title)}${e.days ? ` <span data-k="fg:@${link}" data-n="V2 link (Android raw colour)">${esc(e.listener)}</span>` : ''}</h3>
		${e.days ? `${e.days.map(day => `<hr data-k="bt:@${divider}" data-n="V2 separator (Android raw colour)">
			<p data-k="fg:@${text}" data-n="V2 bold text (Android raw colour)"><b><span class="vp-embed-v2-timestamp" data-k="bg:BORDER_SUBTLE" data-k-base="${base === 'light' ? 'light' : 'darker'}" data-n="V2 timestamp background (native Light or Dark base)"><span data-k="fg:@${timestamp}" data-n="V2 timestamp text (Android raw colour)">${esc(day.date)}</span></span> - ${esc(day.duration)} - ${day.plays} plays</b></p>
			<p data-k="fg:@${divider}" data-n="V2 subtext (Android raw colour)"><em>${esc(day.genres)}</em></p>
			<p data-k="fg:@${text}" data-n="V2 body and italic text (Android raw colour)">${day.tracks.map(([name, plays]) => `${esc(name)} - <em>${plays} plays</em>`).join('<br>')}</p>`).join('')}
			<hr data-k="bt:@${divider}" data-n="V2 separator (Android raw colour)">
			<p data-k="fg:@${divider}" data-n="V2 footer subtext (Android raw colour)">${esc(e.footer)}<br>${esc(e.summary)}</p>
			<div class="vp-embed-v2-buttons">${['\u23ee\ufe0f', '\u25c0\ufe0f', '\u25b6\ufe0f', '\u23ed\ufe0f', '\ud83d\udd22'].map((emoji, i) => `<button disabled aria-label="${['First page', 'Previous page', 'Next page', 'Last page', 'Jump to page'][i]}" data-k="bd:CONTROL_SECONDARY_BORDER_DEFAULT" data-n="V2 disabled pagination button"><i class="vp-embed-v2-button-bg" data-k="bg:CONTROL_SECONDARY_BACKGROUND_DEFAULT" data-n="V2 disabled button background (50% opacity)"></i><span data-fixed="Pagination emoji artwork (bot content)">${emoji}</span></button>`).join('')}</div>` : `<p data-k="fg:@${text}" data-n="V2 text (Android raw colour)">${esc(e.text)}</p>
		<hr data-k="bt:@${divider}" data-n="V2 separator (Android raw colour)">
		<p data-k="fg:@${text}" data-n="V2 text (Android raw colour)">${esc(e.footer)}</p>`}
	</div>`
}

/** Chat box. `active` while typing; `value` shows typed text and lights up the send button. */
export function chatInput({ placeholder, active, value = '', picker = false }) {
	const keys = active ? 'bg:MOBILE_CHATINPUT_BACKGROUND_ACTIVE bd:MOBILE_CHATINPUT_BORDER_ACTIVE' : 'bg:MOBILE_CHATINPUT_BACKGROUND_DEFAULT bd:MOBILE_CHATINPUT_BORDER_DEFAULT'
	const send = value
		? `<button class="vp-send on" data-act="send" data-k="bg:CHAT_INPUT_SEND_BUTTON_ACTIVE_BACKGROUND fg:CHAT_INPUT_SEND_BUTTON_ICON_ACTIVE_TINT" data-n="Send button (ready)" aria-label="Send">${icon('send', 20)}</button>`
		: `<button class="vp-send" data-k="fg:ICON_MUTED" data-n="Send arrow" aria-label="Send">${icon('send', 24)}</button>`
	return `<div class="vp-chatinput-wrap" data-k="bg:BACKGROUND_BASE_LOWER" data-n="Behind the chat box">
		<div class="vp-chatinput${active ? ' active' : ''}" data-k="${keys}" data-n="${active ? 'Chat box (typing)' : 'Chat box'}">
			<button class="vp-ci-btn" data-k="fg:CHAT_INPUT_ACTION_BUTTON_ICON_DEFAULT_TINT" data-n="Attach (+)" data-open="attach" aria-label="Attach">${icon('plus', 24)}</button>
			<input class="vp-ci-field" data-k="fg:TEXT_STRONG x:TEXT_MUTED" data-n="Message field and placeholder" data-input="type" data-enter="send" data-focus="focus" data-blur="blur" placeholder="${esc(placeholder)}" value="${esc(value)}" aria-label="${esc(placeholder)}">
			<button class="vp-ci-btn" data-k="fg:CHAT_INPUT_ACTION_BUTTON_ICON_DEFAULT_TINT" data-n="Gift" data-open="gift" aria-label="Gift">${icon('gift', 22)}</button>
			<button class="vp-ci-btn" data-k="fg:CHAT_INPUT_ICON_DEFAULT_TINT" data-n="Emoji button" data-act="${picker ? 'keyboard' : 'picker'}" aria-label="Emoji">${icon(picker ? 'keyboard' : 'emoji', 24)}</button>
			${send}
		</div>
	</div>`
}

/** Settings-style page header: close or back, title, optional trailing button. */
export function pageHeader(title, { close = false, trailing = '', glyph = '', bg = 'MOBILE_ACTIONSHEET_BACKGROUND' } = {}) {
	return `<header class="vp-page-header" data-k="bg:${bg}" data-n="Page header">
		<button class="vp-icon-btn" data-back data-k="fg:INTERACTIVE_TEXT_DEFAULT" data-n="${close ? 'Close' : 'Back'} button" aria-label="${close ? 'Close' : 'Back'}">${icon(close ? 'close' : 'back', 24)}</button>
		<h1 data-k="fg:MOBILE_TEXT_HEADING_PRIMARY">${glyph ? icon(glyph, 24) : ''}${esc(title)}</h1>
		${trailing}
	</header>`
}

export function searchField(placeholder, { filter = false, active = false, value = '', input = '' } = {}) {
	return `<div class="vp-search-row">
		<label class="vp-search${active ? ' active' : ''}" data-k="bg:INPUT_BACKGROUND_DEFAULT bd:${active ? 'INPUT_BORDER_ACTIVE' : 'INPUT_BORDER_DEFAULT'}" data-n="Search field">
			<span data-k="fg:INPUT_ICON_DEFAULT">${icon('search', 20)}</span>
			<input data-k="fg:INPUT_TEXT_DEFAULT x:INPUT_PLACEHOLDER_TEXT_DEFAULT" data-n="Search field text and placeholder" placeholder="${esc(placeholder)}" value="${esc(value)}" ${input ? `data-input="${input}"` : ''} aria-label="${esc(placeholder)}">
		</label>
		${filter ? `<button class="vp-square-btn" data-k="bg:REDESIGN_BUTTON_TERTIARY_BACKGROUND fg:REDESIGN_BUTTON_TERTIARY_TEXT" data-n="Filter button" aria-label="Filter">${icon('filter', 22)}</button>` : ''}
	</div>`
}

/** A grouped list of settings rows. */
export function rowGroup(rows, { card = 'CARD_MUTED_BG' } = {}) {
	return `<div class="vp-rowgroup" data-k="bg:${card}" data-n="Grouped rows">${rows.map((r, i) => `
		<${r.static ? 'div' : 'button'} class="vp-row${r.description ? ' vp-row-description' : ''}" ${r.go ? `data-go="${r.go}"` : ''} ${r.act ? `data-act="${r.act}"` : ''} data-n="Settings row">
			<span class="vp-row-icon" data-k="fg:${r.critical ? 'TEXT_FEEDBACK_CRITICAL' : 'TABLEROW_ICON_COLOR_DEFAULT'}">${icon(r.icon, 24)}</span>
			<span class="vp-row-label${i < rows.length - 1 ? ' divided' : ''}" data-k="bb:BORDER_SUBTLE" data-n="Row divider">
				<span data-k="fg:${r.critical ? 'TEXT_FEEDBACK_CRITICAL' : 'TEXT_STRONG'}">${esc(r.label)}${r.description ? `<small data-k="fg:TEXT_MUTED">${esc(r.description)}</small>` : ''}</span>
				${r.value ? `<small data-k="fg:TEXT_MUTED">${esc(r.value)}</small>` : ''}
				${r.chevron === false ? '' : `<span class="vp-chev" data-k="fg:INTERACTIVE_TEXT_DEFAULT" data-n="Chevron">${icon('chevronRight', 20)}</span>`}
			</span>
		</${r.static ? 'div' : 'button'}>`).join('')}</div>`
}

export function sectionLabel(text) {
	return `<h2 class="vp-section" data-k="fg:TEXT_SUBTLE" data-n="Section header">${esc(text)}</h2>`
}

export function switchEl(on, act) {
	return `<button class="vp-switch${on ? ' on' : ''}" role="switch" aria-checked="${on}" data-act="${act}" data-k="${on ? 'bg:SWITCH_BACKGROUND_SELECTED_DEFAULT bd:SWITCH_BORDER_SELECTED_DEFAULT' : 'bg:SWITCH_BACKGROUND_DEFAULT bd:SWITCH_BORDER_DEFAULT'}" data-n="Switch ${on ? 'on' : 'off'}"><i data-k="bg:${on ? 'SWITCH_THUMB_BACKGROUND_SELECTED_DEFAULT' : 'SWITCH_THUMB_BACKGROUND_DEFAULT'}" data-n="Switch knob"></i></button>`
}

/** Native range input supplies pointer and keyboard behaviour; themed pieces supply its appearance. */
export function sliderEl({ value, min = 0, max = 100, step = 1, label = 'Slider', action = 'slider', suffix = '', id = '' }) {
	const amount = Math.min(max, Math.max(min, Number(value)))
	const percent = (amount - min) / (max - min) * 100
	return `<div class="vp-slider"><i class="vp-slider-track" data-k="bg:SLIDER_TRACK_BACKGROUND" data-n="Slider track"></i><i class="vp-slider-fill" data-k="bg:REDESIGN_INPUT_CONTROL_SELECTED" data-n="Slider fill" style="width:${percent}%"></i><input ${id ? `id="${esc(id)}"` : ''} type="range" min="${min}" max="${max}" step="${step}" value="${amount}" data-input="${esc(action)}" data-suffix="${esc(suffix)}" aria-label="${esc(label)}" aria-valuetext="${amount}${esc(suffix)}"><i class="vp-slider-thumb" data-fixed="Native slider thumb; colour binding unverified" style="left:${percent}%"></i></div>`
}

export function updateSlider(el) {
	const value = Number(el.value)
	const percent = (value - Number(el.min)) / (Number(el.max) - Number(el.min)) * 100
	const wrap = el.closest('.vp-slider')
	wrap.querySelector('.vp-slider-fill').style.width = `${percent}%`
	wrap.querySelector('.vp-slider-thumb').style.left = `${percent}%`
	const display = `${value}${el.dataset.suffix || ''}`
	el.setAttribute('aria-valuetext', display)
	const output = wrap.closest('.vp-setting-slider')?.querySelector('output')
	if (output) output.textContent = display
	return value
}

export const valencedWordmark = `<svg viewBox="0 0 330 70" width="250" height="54" aria-hidden="true"><g fill="none" stroke="#0b1114" stroke-width="5"><circle cx="35" cy="35" r="27"/><circle cx="35" cy="35" r="14"/></g><g fill="#0b1114"><circle cx="35" cy="35" r="5"/><circle cx="35" cy="8" r="5"/><circle cx="12" cy="48" r="5"/><circle cx="58" cy="48" r="5"/></g><text x="74" y="44" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="36" fill="#0b1114" letter-spacing="-1">VALENCED</text><text x="76" y="60" font-family="Arial, sans-serif" font-weight="700" font-size="10.5" fill="#0b1114">Supercharge your Discord experience.</text></svg>`

export { icon, avatar }
