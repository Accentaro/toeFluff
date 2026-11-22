// "Popups" group: things Discord floats over the app that are not sheets or alerts.
// Keys below were checked on the Valenced emulator (Discord 352.6, 2026-11-21) on all four bases (Ash, Dark, Onyx, Light)
// by giving every semantic key, then every raw key, its own colour through the official Themes API and reading which
// colour each element took. Every element here follows a semantic key on every base.
import { esc, icon, statusBar } from './common.js'

// Variants copied from the Design System > Toast page on the emulator: success, critical, default with an information
// icon, with a copy icon, with no icon, and long text that wraps. Text is TEXT_STRONG on every variant. The icon on the
// default variants is ICON_DEFAULT (probed 2026-11-22 on the Design System > Toast page).
const toast = (variant, text, glyph) => {
	const keys = variant === 'critical'
		? 'bg:TOAST_CRITICAL_BACKGROUND bd:TOAST_CRITICAL_BORDER'
		: variant === 'success' ? 'bg:TOAST_SUCCESS_BACKGROUND bd:TOAST_SUCCESS_BORDER' : 'bg:BACKGROUND_SURFACE_HIGHEST bd:BORDER_NORMAL'
	const iconKey = variant === 'critical' ? 'data-k="fg:ICON_FEEDBACK_CRITICAL"' : variant === 'success' ? 'data-k="fg:ICON_FEEDBACK_POSITIVE"' : 'data-k="fg:ICON_DEFAULT"'
	const g = glyph ?? (variant === 'critical' ? 'error' : variant === 'success' ? 'checkCircle' : '')
	const name = variant === 'critical' ? 'Critical toast' : variant === 'success' ? 'Success toast' : 'Default toast'
	return `<div class="vp-toast vp-popup-static${g ? '' : ' vp-toast-plain'}" data-k="${keys}" data-n="${name}">
		${g ? `<span ${iconKey}>${icon(g, 22)}</span>` : ''}<span data-k="fg:TEXT_STRONG" data-n="Toast text">${esc(text)}</span>
	</div>`
}

// In-app message banner variants, captured on the emulator (Discord 352.6, 2026-11-22) by dispatching MESSAGE_CREATE, with every
// semantic key probed on Dark, Darker and Light (identical on all three). The sender name uses MOBILE_TEXT_HEADING_PRIMARY, text
// TEXT_STRONG, the server/channel line TEXT_MUTED, "Sent a..." labels TEXT_SUBTLE, links TEXT_LINK, the file tile BACKGROUND_MOD_SUBTLE
// with ICON_SUBTLE, and the embed card EMBED_BACKGROUND_ALTERNATE with a BORDER_NORMAL bar. Discord only raises the banner
// for DMs and mentions (guild channels default to "only @mentions").
const K = {
	body: 'fg:TEXT_STRONG', label: 'fg:TEXT_SUBTLE', channel: 'fg:TEXT_MUTED', link: 'fg:TEXT_LINK',
	tile: 'bg:BACKGROUND_MOD_SUBTLE', tileIcon: 'fg:ICON_SUBTLE', embedCard: 'bg:EMBED_BACKGROUND_ALTERNATE bl:BORDER_NORMAL', embedTitle: 'fg:MOBILE_TEXT_HEADING_PRIMARY', embedDesc: 'fg:TEXT_DEFAULT',
}
const pill = (t, base) => `<span class="vp-mention${base === 'light' ? ' light' : ''}" data-fixed="Mention pill (fixed colour; no key changes it)">${esc(t)}</span>`
const avatarBadge = `<span class="vp-msgpop-avatar" data-fixed="Sender avatar">${icon('chat', 24)}</span>`

const bannerParts = {
	text: t => `<span class="vp-msgpop-body" data-k="${K.body}" data-n="Message text">${t}</span>`,
	label: t => `<span class="vp-msgpop-label" data-k="${K.label}" data-n="Attachment label">${esc(t)}</span>`,
	link: t => `<span class="vp-msgpop-body" data-k="${K.link}" data-n="Link">${esc(t)}</span>`,
}
const media = {
	file: `<span class="vp-msgpop-media" data-k="${K.tile}" data-n="File tile"><span data-k="${K.tileIcon}">${icon('file', 28)}</span></span>`,
	sticker: `<span class="vp-msgpop-media sticker" data-fixed="Sticker image (content)"></span>`,
}
const bannerHead = (where, name = 'Studio Fixture') => `<span class="vp-msgpop-head"><b data-k="fg:MOBILE_TEXT_HEADING_PRIMARY" data-n="Sender name">${esc(name)}</b>${where ? `<span data-k="${K.channel}" data-n="Channel and server name">&middot; ${esc(where)}</span>` : ''}</span>`

const banner = (where, lines, side = '') => `<div class="vp-msgpop" data-k="bg:MOBILE_ALERT_BACKGROUND_DEFAULT bd:BORDER_SUBTLE" data-n="New message notification">
	${avatarBadge}
	<span class="vp-msgpop-text">${bannerHead(where)}${lines}</span>${side}
	<i class="vp-msgpop-timer" data-k="bg:BACKGROUND_BRAND" data-n="Timer bar"></i>
</div>`

const bannerVariants = base => [
	['Mention in a server channel', banner('announcements, Valenced', bannerParts.text(`${pill('@Juniper', base)} are you around?`))],
	['@everyone ping', banner('announcements, Valenced', bannerParts.text(`${pill('@everyone', base)} server update in 5 minutes`))],
	['Direct message (no channel line)', banner('', bannerParts.text('Hey, are you free later?'))],
	['Image', banner('', bannerParts.label('Sent an image'))],
	['File attachment', banner('', bannerParts.label('Sent a file') + bannerParts.link('notes.txt'), media.file)],
	['Sticker', banner('', bannerParts.label('Sent a sticker'), media.sticker)],
	['Embed', banner('', `<span class="vp-msgpop-embed" data-k="${K.embedCard}" data-n="Embed card (fill and left bar)"><b data-k="${K.embedTitle}" data-n="Embed title">Embed title</b><span data-k="${K.embedDesc}" data-n="Embed description">Embed description</span></span>`)],
	['Link', banner('', bannerParts.link('https://example.com/page'))],
	['Long text clamps to two lines', banner('', bannerParts.text('This is a much longer message that should show how the banner clamps text when there is more than a couple of lines of content to display in the popup.'))],
]

const heading = text => `<h2 class="vp-popup-label" data-k="fg:TEXT_MUTED">${esc(text)}</h2>`

export const popupsToasts = {
	id: 'popups-toasts', title: 'Toasts', group: 'Popups', capture: 'popup-toasts',
	render() {
		return `${statusBar('CHANNEL_BACKGROUND_DEFAULT', '7:42')}
		<div class="vp-page" data-k="bg:CHANNEL_BACKGROUND_DEFAULT" data-n="Page behind the toasts">
			<div class="vp-popup-stack">
				${heading('Success')}
				${toast('success', 'Saved')}
				${heading('Critical')}
				${toast('critical', 'Something went wrong')}
				${heading('Default, information icon')}
				${toast('default', 'This is a toast message', 'info')}
				${heading('Default, copy icon')}
				${toast('default', 'Copied', 'copy')}
				${heading('Default, no icon')}
				${toast('default', 'This is a toast message')}
				${heading('Long text wraps')}
				${toast('default', 'This is a much longer toast message that should wrap onto several lines when there is no room left')}
			</div>
		</div>`
	},
}

export const popupsBanner = {
	id: 'popups-banner', title: 'Message notification', group: 'Popups', capture: 'popup-banner',
	render({ base }) {
		return `${statusBar('CHANNEL_BACKGROUND_DEFAULT', '7:42')}
		<div class="vp-page" data-k="bg:CHANNEL_BACKGROUND_DEFAULT" data-n="Page behind the banner">
			<div class="vp-popup-stack">
				${bannerVariants(base).map(([label, html]) => `${heading(label)}${html}`).join('')}
			</div>
		</div>`
	},
}
