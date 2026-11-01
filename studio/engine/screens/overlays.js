// Things that open over a screen: the long-press message menu, alerts, the server menu and the emoji picker.
import { icon, esc, chatInput } from './common.js'

const scrim = () => `<div class="vp-scrim" data-close data-k="bg:BACKGROUND_SCRIM" data-n="Scrim"></div>`
const navScrim = () => `<div class="vp-nav-scrim" data-k="bg:ANDROID_NAVIGATION_SCRIM_BACKGROUND" data-n="Navigation bar while a sheet is open"><i data-fixed="Android gesture handle (system)"></i></div>`

const quickReactions = ['🤣', '😭', '🫶', '❤️', '🔥']

export const msgmenu = {
	id: 'msgmenu', title: 'Message menu', group: 'Menus and sheets', capture: 'actionsheet', screen: 'chat',
	render() {
		const row = (ic, label, act, chevron) => `<button class="vp-sheet-row" data-act="${act}" data-n="Action sheet row"><span data-k="fg:TABLEROW_ICON_COLOR_DEFAULT">${icon(ic, 24)}</span><span class="vp-sheet-label" data-k="bb:BORDER_SUBTLE"><span data-k="fg:TEXT_STRONG">${label}</span>${chevron ? `<span data-k="fg:INTERACTIVE_TEXT_DEFAULT">${icon('chevronRight', 20)}</span>` : ''}</span></button>`
		return `${scrim()}
		<div class="vp-sheet" data-k="bg:MOBILE_ACTIONSHEET_GRADIENT_BACKGROUND_DEFAULT bd:BORDER_SUBTLE" data-n="Message menu">
			<i class="vp-handle" data-k="bg:BACKGROUND_MOD_STRONG" data-n="Sheet handle"></i>
			<div class="vp-quick">${quickReactions.map(e => `<button data-act="react:${e}" data-k="bg:MOBILE_EMOJI_BUTTON_BACKGROUND" data-n="Quick reaction"><span data-fixed="Emoji">${e}</span></button>`).join('')}<button data-open="emoji" data-k="bg:MOBILE_EMOJI_BUTTON_BACKGROUND fg:INTERACTIVE_ICON_DEFAULT" data-n="More reactions">${icon('emoji', 26)}</button></div>
			<div class="vp-rowgroup" data-k="bg:CARD_MUTED_BG" data-n="Grouped rows">${row('forward', 'Forward', 'done:Forwarded')}</div>
			<div class="vp-rowgroup" data-k="bg:CARD_MUTED_BG" data-n="Grouped rows" data-scroll="sheet">
				${row('reply', 'Reply', 'close')}
				${row('copy', 'Copy Text', 'copy')}
				${row('markUnread', 'Mark Unread', 'done:Marked unread')}
				${row('emoji', 'Reactions', 'reactions')}
				${row('bookmark', 'Bookmark Message', 'done:Bookmarked')}
				${row('clock', 'Create Reminder', 'done:Reminder set for 1 hour', true)}
				${row('apps', 'Apps', 'done:No apps for this message', true)}
			</div>
		</div>
		${navScrim()}`
	},
	actions: {
		react: ({ arg, api }) => {
			api.close()
			api.toast('success', `Reacted with ${arg}`)
		},
		copy: ({ api }) => {
			const msg = document.querySelector('.vp-screen .vp-msg:last-of-type .vp-msg-text')
			navigator.clipboard?.writeText(msg?.textContent || '').catch(() => {})
			api.close()
			api.toast('success', 'Copied to clipboard')
		},
		done: ({ arg, api }) => {
			api.close()
			api.toast('success', arg)
		},
		close: ({ api }) => api.close(),
		reactions: ({ api }) => api.open('emoji', { keepScreen: true }),
	},
}

const alerts = {
	default: { title: 'Example alert', body: 'This is what an alert looks like.', confirm: 'Confirm', critical: false },
	logout: { title: 'Log Out', body: 'Are you sure you want to log out?', confirm: 'Log Out', critical: true },
	install: { title: 'Install plugin', body: 'Plugins can do anything Discord can. Only install plugins you trust.', confirm: 'Choose File', critical: false },
}

export const alert = {
	id: 'alert', title: 'Alert', group: 'Menus and sheets', capture: 'alert', screen: 'home',
	render({ state }) {
		const a = alerts[state.overlayParams?.arg] || alerts.default
		const confirm = a.critical
			? 'bg:CONTROL_CRITICAL_PRIMARY_BACKGROUND_DEFAULT fg:CONTROL_CRITICAL_PRIMARY_TEXT_DEFAULT bd:CONTROL_CRITICAL_PRIMARY_BORDER_DEFAULT'
			: 'bg:CONTROL_PRIMARY_BACKGROUND_DEFAULT fg:CONTROL_PRIMARY_TEXT_DEFAULT bd:CONTROL_PRIMARY_BORDER_DEFAULT'
		const press = a.critical ? 'bg:CONTROL_CRITICAL_PRIMARY_BACKGROUND_ACTIVE bd:CONTROL_CRITICAL_PRIMARY_BORDER_ACTIVE' : 'bg:CONTROL_PRIMARY_BACKGROUND_ACTIVE bd:CONTROL_PRIMARY_BORDER_ACTIVE'
		return `${scrim()}
		<div class="vp-alert" data-k="bg:MOBILE_ALERT_BACKGROUND_DEFAULT bd:BORDER_SUBTLE" data-n="Alert">
			<h2 data-k="fg:MOBILE_TEXT_HEADING_PRIMARY">${esc(a.title)}</h2>
			<p data-k="fg:TEXT_DEFAULT">${esc(a.body)}</p>
			<button class="vp-btn-primary" data-act="confirm" data-k="${confirm}" data-k-press="${press}" data-n="${a.critical ? 'Destructive button' : 'Primary button'}">${esc(a.confirm)}</button>
			<button class="vp-btn-secondary" data-close data-k="bg:CONTROL_SECONDARY_BACKGROUND_DEFAULT fg:CONTROL_SECONDARY_TEXT_DEFAULT bd:CONTROL_SECONDARY_BORDER_DEFAULT" data-k-press="bg:CONTROL_SECONDARY_BACKGROUND_ACTIVE bd:CONTROL_SECONDARY_BORDER_ACTIVE" data-n="Secondary button">Cancel</button>
		</div>`
	},
	actions: {
		confirm: ({ api }) => {
			api.close()
			api.toast('success', 'Done')
		},
	},
}

export const guildmenu = {
	id: 'guildmenu', title: 'Server menu', group: 'Menus and sheets', capture: 'guildsheet', screen: 'home',
	render() {
		const row = (ic, label, act) => `<button class="vp-pop-row" data-act="${act}" data-k="bt:BORDER_SUBTLE" data-n="Menu row"><span data-k="fg:TEXT_STRONG">${icon(ic, 22)}</span><span data-k="fg:TEXT_STRONG">${label}</span></button>`
		return `${scrim()}
		<div class="vp-popmenu" data-k="bg:BACKGROUND_SURFACE_HIGHEST bd:BORDER_SUBTLE" data-n="Server popup menu">
			<h2 data-k="fg:MOBILE_TEXT_HEADING_PRIMARY">Valenced</h2>
			<hr class="vp-pop-sep" data-k="bg:BORDER_SUBTLE" data-n="Divider">
			${row('envelope', 'Mark as Read', 'done:Marked as read')}
			${row('bell', 'Notifications', 'done:Notifications: all messages')}
			${row('gear', 'More Options', 'server')}
		</div>`
	},
	actions: {
		done: ({ arg, api }) => {
			api.close()
			api.toast('success', arg)
		},
		server: ({ api }) => api.go('server'),
	},
}

const emojiSets = {
	top: ['🏆', '⭐', '🕒', '🎯', '🦊', '🎮', '🔮', '🛡️', '😀', '😂', '🥹', '😍', '🤔', '👀', '🔥', '✨', '💜', '👍', '🙏', '🎉', '💀', '😭', '🫶', '✅'],
	people: ['😀', '😃', '😄', '😁', '😆', '🥹', '😅', '😂', '🤣', '🥲', '☺️', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋'],
	nature: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺'],
	food: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️'],
}

export const emoji = {
	id: 'emoji', title: 'Emoji picker', group: 'Menus and sheets', capture: 'emoji', screen: 'bots',
	render({ state }) {
		const own = (state.ui.emoji ??= {})
		const tab = own.tab || 'Emoji'
		const cat = own.cat || 'top'
		const host = state.ui[state.screen] || {}
		const q = own.q || ''
		const list = q ? Object.values(emojiSets).flat().filter((_, i) => i % 3 === q.length % 3) : emojiSets[cat]
		return `<div class="vp-picker-dim" data-close></div>
		<div class="vp-picker-input">${chatInput({ placeholder: 'Message #bots', active: false, value: host.draft || '', picker: true })}</div>
		<div class="vp-picker" data-k="bg:MOBILE_EXPRESSION_PICKER_BACKGROUND_DEFAULT bd:BORDER_SUBTLE" data-n="Expression picker">
			<i class="vp-handle" data-k="bg:BACKGROUND_MOD_STRONG" data-n="Sheet handle"></i>
			<div class="vp-segmented" data-k="bg:MOBILE_SEGMENTED_CONTROL_BACKGROUND" data-n="Segmented control">${['Emoji', 'GIFs', 'Stickers'].map(t => `<button data-act="tab:${t}" class="${t === tab ? 'on' : ''}" data-k="${t === tab ? 'bg:MOBILE_SEGMENTED_CONTROL_INDICATOR_BACKGROUND fg:TEXT_STRONG' : 'fg:TEXT_MUTED'}" data-n="${t === tab ? 'Selected segment' : 'Segment'}">${t}</button>`).join('')}</div>
			${tab === 'Emoji' ? `
			<label class="vp-search" data-k="bg:INPUT_BACKGROUND_DEFAULT bd:INPUT_BORDER_DEFAULT" data-n="Search field"><span data-k="fg:INPUT_ICON_DEFAULT">${icon('search', 20)}</span><input data-k="fg:INPUT_TEXT_DEFAULT x:INPUT_PLACEHOLDER_TEXT_DEFAULT" placeholder="Find the perfect emoji" value="${esc(q)}" data-input="q" aria-label="Find emoji"></label>
			<h3 class="vp-picker-head" data-k="bg:BACKGROUND_SURFACE_HIGH fg:TEXT_STRONG" data-n="Picker section header">${q ? 'Results' : { top: 'Top Emojis in Valenced', people: 'People', nature: 'Nature', food: 'Food' }[cat]}</h3>
			<div class="vp-emoji-grid" data-scroll="emoji">${list.map(e => `<button data-act="pick:${e}" data-fixed="Emoji">${e}</button>`).join('')}</div>
			<nav class="vp-picker-foot" data-k="bg:BACKGROUND_SURFACE_HIGH" data-n="Category bar">${[['top', 'trophy'], ['people', 'emoji'], ['nature', 'star'], ['food', 'clock']].map(([id, ic]) => `<button data-act="cat:${id}" ${id === cat ? 'data-k="bg:INTERACTIVE_BACKGROUND_ACTIVE fg:INTERACTIVE_ICON_DEFAULT" data-n="Selected category"' : 'data-k="fg:ICON_MUTED" data-n="Category icon"'}>${icon(ic, 22)}</button>`).join('')}<button class="end" data-act="backspace" data-k="fg:ICON_MUTED" data-n="Backspace">${icon('backspace', 22)}</button></nav>`
			: `<p class="vp-empty" data-k="fg:TEXT_MUTED">${tab} need a network connection, so the preview leaves them out.</p>`}
		</div>
		${navScrim()}`
	},
	actions: {
		tab: ({ arg, api }) => {
			api.state.ui.emoji.tab = arg
			return 'render'
		},
		cat: ({ arg, api }) => {
			api.state.ui.emoji.cat = arg
			api.state.ui.emoji.q = ''
			return 'render'
		},
		q: ({ el, api }) => {
			api.state.ui.emoji.q = el.value
			api.renderOverlay()
			const input = document.querySelector('.vp-overlay .vp-picker .vp-search input')
			input?.focus()
			input?.setSelectionRange(input.value.length, input.value.length)
		},
		pick: ({ arg, api }) => {
			const host = (api.state.ui[api.state.screen] ??= {})
			host.draft = (host.draft || '') + arg
			return 'render'
		},
		backspace: ({ api }) => {
			const host = (api.state.ui[api.state.screen] ??= {})
			host.draft = [...(host.draft || '')].slice(0, -1).join('')
			return 'render'
		},
		keyboard: ({ api }) => api.close(),
		send: ({ api }) => {
			const screen = api.state.screen
			const host = (api.state.ui[screen] ??= {})
			const text = (host.draft || '').trim()
			if (!text) return
			const key = api.state.params.id || screen
			host.sent = { ...host.sent, [key]: [...(host.sent?.[key] || []), { user: 'me', time: 'Today at ' + new Date().toTimeString().slice(0, 5), text }] }
			host.draft = ''
			api.close()
			api.render()
		},
		type: ({ el, api }) => {
			const host = (api.state.ui[api.state.screen] ??= {})
			host.draft = el.value
		},
		attach: ({ api }) => api.toast('critical', 'Uploads are not available in the preview'),
		focus: () => {},
		blur: () => {},
	},
}
