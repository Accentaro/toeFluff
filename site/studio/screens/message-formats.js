// Every message format Discord's native chat draws: headings, subtext, styles, spoilers, mentions, quotes, lists,
// timestamps, code, the rich / link / image / video embeds and reactions.
// Checked on the Valenced emulator (Discord 352.6, 2026-11-21) on all four bases: every semantic key, then every raw key,
// was given its own colour through the official Themes API on a local test message, and the colour found on each element
// named its key. Raw keys (@NAME) are Android resources the native chat reads directly, so they change per base and
// ignore semantic overrides. The @everyone pill and its text are fixed colours that no key changes.
import { chatActions } from './main.js'
import { avatar, channelHeader, chatInput, codeTextColors, chatSpineColors, embedLinkColors, embedV2Colors, esc, inlineCodeColors, message, nameOf, navBar, spoilerColors, reactions, statusBar, threadColors, threadTimestampColors } from './common.js'

const bulletColors = { dark: 'PRIMARY_400', darker: 'PRIMARY_400', midnight: 'PRIMARY_400', light: 'PRIMARY_360' }
const timestampColors = { dark: 'PRIMARY_200', darker: 'PRIMARY_200', midnight: 'PRIMARY_200', light: 'PRIMARY_600' }
const keywordColors = { dark: 'RED_NEW_10', darker: 'RED_NEW_21', midnight: 'RED_NEW_30', light: 'RED_NEW_60' }
const stringColors = { dark: 'GREEN_NEW_15', darker: 'GREEN_NEW_25', midnight: 'GREEN_NEW_33', light: 'GREEN_NEW_62' }
const fieldNameColors = { dark: 'PRIMARY_100', darker: 'PRIMARY_100', midnight: 'PRIMARY_100', light: 'PRIMARY_500' }
const providerColors = { dark: 'PRIMARY_300', darker: 'PRIMARY_300', midnight: 'PRIMARY_300', light: 'PRIMARY_630' }

const raw = (key, base, label) => `data-k="fg:@${key[base]}" data-n="${label} (Android raw colour)"`

function post(inner, first) {
	return `<div class="vp-msg" data-n="Message"><div class="vp-msg-row">
		<span class="vp-msg-avatar">${first ? avatar('me', 40, { status: false }) : ''}</span>
		<div class="vp-msg-body">${first ? `<div class="vp-msg-head">${nameOf('me')}<span class="vp-time" data-k="fg:TEXT_MUTED">20:08</span></div>` : ''}${inner}</div>
	</div></div>`
}

const text = inner => `<div class="vp-msg-text" data-k="fg:TEXT_STRONG">${inner}</div>`
const code = (t, base) => `<code class="vp-code" data-k="bg:BACKGROUND_CODE bd:BORDER_NORMAL fg:@${inlineCodeColors[base]}" data-n="Inline code (text is an Android raw colour)">${esc(t)}</code>`
const link = t => `<span class="vp-link" data-k="fg:TEXT_LINK" data-n="Link">${esc(t)}</span>`
const spoiler = (t, base, open) => `<button class="vp-spoiler${open ? ' open' : ''}" data-act="spoiler" ${open ? 'data-k="bg:SPOILER_REVEALED_BACKGROUND" data-n="Revealed spoiler"' : `data-k="bg:@${spoilerColors[base]}" data-n="Hidden spoiler (Android raw colour)"`}>${esc(t)}</button>`

function markdown(base, ui) {
	return text(`
		<div class="vp-fmt-h1">Heading 1</div><div class="vp-fmt-h2">Heading 2</div><div class="vp-fmt-h3">Heading 3</div>
		<div class="vp-fmt-sub" ${raw(threadTimestampColors, base, 'Subtext (-#)')}>subtext line</div>
		<b>bold</b> <i>italic</i> <u>underline</u> <s>strike</s> <b><i>bold italic</i></b> ${spoiler('spoiler text', base, ui.spoiler)}<br>
		${code('inline code', base)} and ${link('masked link')} ${link('https://example.com')}
		<blockquote class="vp-markdown-quote" data-k="bl:@${chatSpineColors[base]} fg:TEXT_STRONG" data-n="Markdown quote (bar is an Android raw colour)">quoted line</blockquote>
		<ul class="vp-fmt-list">${['bullet one', 'bullet two'].map(t => `<li><i ${raw(bulletColors, base, 'List bullet')}></i>${t}</li>`).join('')}</ul>
		<ol class="vp-fmt-list num">${['numbered one', 'numbered two'].map(t => `<li><i ${raw(bulletColors, base, 'List bullet')}></i>${t}</li>`).join('')}</ol>
		<span class="vp-mention${base === 'light' ? ' light' : ''}" data-fixed="@everyone mention (fixed colour; no key changes it on 352.6)">@everyone</span> <span class="vp-fmt-time" data-k="bg:BORDER_SUBTLE" data-n="Timestamp background"><span ${raw(timestampColors, base, 'Timestamp text')}>3 years ago</span></span>`)
}

function codeBlocks(base) {
	const t = codeTextColors[base]
	return `<div class="vp-codeblock" data-k="bg:BACKGROUND_CODE bd:BORDER_NORMAL fg:@${t}" data-n="Code block, highlighted (text is an Android raw colour)"><span ${raw(keywordColors, base, 'Code keyword')}>const</span> probe = <span ${raw(stringColors, base, 'Code string')}>"code block"</span>;
<span ${raw(keywordColors, base, 'Code keyword')}>function</span> hello() { <span ${raw(keywordColors, base, 'Code keyword')}>return</span> <span ${raw(stringColors, base, 'Code string')}>42</span> }</div>
	<div class="vp-codeblock" data-k="bg:BACKGROUND_CODE bd:BORDER_NORMAL fg:@${t}" data-n="Code block, plain (text is an Android raw colour)">plain block</div>`
}

function richEmbed(base) {
	return `<div class="vp-embed vp-fmt-embed" data-k="bg:EMBED_BACKGROUND" data-n="Rich embed (accent colour set by the bot)" style="border-left-color:#5865f2">
		<b class="vp-fmt-e-author" data-k="fg:@${threadColors[base][1]}" data-n="Embed author (Android raw colour)">Embed author</b>
		<b class="vp-embed-title" ${raw(embedLinkColors, base, 'Embed title')}>Embed title</b>
		<p data-k="fg:TEXT_DEFAULT" data-n="Embed description">Embed description with <b>bold</b>, ${code('code', base)} and a <span ${raw(embedLinkColors, base, 'Embed link')}>link</span>.</p>
		${[['Field name', 'Field value'], ['Second', 'Another value']].map(([n, v]) => `<div class="vp-fmt-e-field"><b ${raw(fieldNameColors, base, 'Embed field name')}>${n}</b><span data-k="fg:@${embedV2Colors[base][0]}" data-n="Embed field value (Android raw colour)">${v}</span></div>`).join('')}
		<small data-k="fg:@${embedV2Colors[base][0]}" data-n="Embed footer (Android raw colour)">Embed footer | Today at 20:08</small>
	</div>`
}

function linkEmbed(base) {
	return `<div class="vp-embed vp-fmt-embed" data-k="bg:EMBED_BACKGROUND bd:BORDER_NORMAL" data-n="Link preview (accent bar is BORDER_NORMAL when the site sets no colour)">
		<small ${raw(providerColors, base, 'Embed provider')}>example.com</small>
		<b class="vp-embed-title" ${raw(embedLinkColors, base, 'Embed title')}>Link preview title</b>
		<p data-k="fg:TEXT_DEFAULT" data-n="Embed description">Link preview description text.</p>
	</div>`
}

function videoEmbed(base) {
	return `<div class="vp-embed vp-fmt-embed" data-k="bg:EMBED_BACKGROUND bd:BORDER_NORMAL" data-n="Video embed">
		<small ${raw(providerColors, base, 'Embed provider')}>YouTube</small>
		<b class="vp-fmt-e-author" data-k="fg:@${threadColors[base][1]}" data-n="Video author (Android raw colour)">Channel name</b>
		<b class="vp-embed-title" ${raw(embedLinkColors, base, 'Embed title')}>Video embed title</b>
		<div class="vp-fmt-video" data-fixed="Video thumbnail and play button (content)"><i></i></div>
	</div>`
}

export const messageFormats = {
	id: 'message-formats', title: 'Markdown & embed types', group: 'Conversations', capture: 'message-formats',
	render({ ui, base }) {
		const parts = [
			markdown(base, ui),
			{ whole: message({ user: 'ren', time: '20:09', text: 'Mentions: @Juniper is pinged, so the row is highlighted.', mentionsMe: true }, 'formats.mention', { ui, base }) },
			codeBlocks(base),
			`${text('Rich embed')}${richEmbed(base)}`,
			`${text('Link preview')}${linkEmbed(base)}`,
			`${text('Image embed')}<div class="vp-fmt-image" data-fixed="Image (content). Images have no frame colour to theme."></div>`,
			`${text('Video embed')}${videoEmbed(base)}`,
			`${text('Reactions: one with a single count, others with many')}${reactions([['🔥', 1], ['👍', 12, true], ['❤️', 3]], 'formats', ui.reacted, base)}`,
		]
		return `${statusBar('STANDALONE_CHANNEL_CONTENT_BACKGROUND')}
		${channelHeader({ type: 'text', name: 'formats', count: 3 })}
		<div class="vp-chat" data-k="bg:CHANNEL_BACKGROUND_DEFAULT" data-n="Chat background" data-scroll="chat">${parts.map((p, i) => p.whole ?? post(p, i === 0)).join('')}</div>
		${chatInput({ placeholder: 'Message #formats', active: ui.focused, value: ui.draft || '' })}
		${navBar('MOBILE_KEYBOARD_GAP_BACKGROUND')}`
	},
	actions: chatActions('message-formats'),
}
