// Voice channel panel, chat box sheets (attachments, gifts), search filters and the server info page.
// Voice panel keys are from the Discord 352 capture; the others follow the sheets they share a design with.
import { users, valenced } from '../mock.js'
import { avatar, esc, icon, navBar, rowGroup, sectionLabel, statusBar, switchEl } from './common.js'

const scrim = () => `<div class="vp-scrim" data-close data-k="bg:BACKGROUND_SCRIM" data-n="Scrim"></div>`
const navScrim = () => `<div class="vp-nav-scrim" data-k="bg:ANDROID_NAVIGATION_SCRIM_BACKGROUND" data-n="Navigation bar while a sheet is open"><i data-fixed="Android gesture handle (system)"></i></div>`
const handle = () => '<i class="vp-handle" data-k="bg:ICON_MUTED" data-n="Sheet handle"></i>'
const notInPreview = ({ api }) => api.toast('default', 'Not available in the preview')

/** Opened by tapping a voice channel: a panel over the channel list, as on Discord. */
export const voice = {
	id: 'voice', title: 'Voice channel', group: 'Server', capture: 'voice', screen: 'server',
	render({ state }) {
		const c = valenced.categories.flatMap(x => x.channels).find(x => x.id === state.overlayParams?.arg) || { name: 'Lounge', members: ['nova', 'ren'] }
		const people = c.members || []
		const own = (state.ui.voice ??= {})
		return `<div class="vp-voice" data-k="bg:BACKGROUND_BASE_LOWER" data-n="Voice channel panel">
			<div class="vp-voice-top">
				<button class="vp-voice-pill sq" data-close data-k="bg:CONTROL_OVERLAY_SECONDARY_BACKGROUND_DEFAULT fg:CONTROL_OVERLAY_SECONDARY_TEXT_DEFAULT" data-n="Collapse button">${icon('chevronDown', 20)}</button>
				<button class="vp-voice-pill" data-k="bg:CONTROL_OVERLAY_SECONDARY_BACKGROUND_DEFAULT fg:CONTROL_OVERLAY_SECONDARY_TEXT_DEFAULT" data-n="Channel name">${esc(c.name)} ${icon('chevronRight', 16)}</button>
				<span class="grow"></span>
				<button class="vp-voice-pill sq" data-k="bg:CONTROL_OVERLAY_SECONDARY_BACKGROUND_DEFAULT fg:CONTROL_OVERLAY_SECONDARY_TEXT_DEFAULT" data-n="Speaker button">${icon('speaker', 20)}</button>
			</div>
			${people.length
				? `<div class="vp-voice-tiles">${people.map(id => `<div class="vp-voice-tile" data-k="bg:VOICE_VIDEO_VIDEO_TILE_BACKGROUND" data-n="Person tile">${avatar(id, 64, { status: false })}<span class="vp-voice-name" data-k="bg:BACKGROUND_SCRIM fg:TEXT_OVERLAY_LIGHT" data-n="Name label">${esc(users[id].name)}</span></div>`).join('')}</div>`
				: `<p class="vp-voice-empty" data-k="fg:TEXT_DEFAULT">No one's here yet!<br>When you are ready to talk, just hop in.</p>`}
			<div class="vp-voice-bar" data-k="bg:MOBILE_FLOATINGBAR_BACKGROUND bd:BORDER_SUBTLE" data-n="Voice controls">
				${handle()}
				<div class="vp-voice-controls">
					<button class="vp-voice-btn" data-act="mute" data-k="${own.unmuted ? 'bg:CONTROL_SECONDARY_BACKGROUND_DEFAULT fg:INTERACTIVE_ICON_DEFAULT' : 'bg:BACKGROUND_VOICE_MUTED fg:ICON_VOICE_MUTED'}" data-n="${own.unmuted ? 'Microphone' : 'Microphone (muted)'}">${icon('mic', 24)}</button>
					<button class="vp-voice-join" data-act="join" data-k="${own.joined ? 'bg:CONTROL_CRITICAL_PRIMARY_BACKGROUND_DEFAULT fg:CONTROL_CRITICAL_PRIMARY_TEXT_DEFAULT' : 'bg:CONTROL_CONNECTED_BACKGROUND_DEFAULT fg:TEXT_OVERLAY_LIGHT'}" data-n="${own.joined ? 'Leave button' : 'Join Voice button'}">${own.joined ? 'Disconnect' : 'Join Voice'}</button>
					<button class="vp-voice-btn plain" data-act="na" data-k="fg:ICON_STRONG" data-n="Text chat button">${icon('chat', 24)}</button>
				</div>
			</div>
		</div>
		${navBar('BACKGROUND_BASE_LOWER')}`
	},
	actions: {
		mute: ({ api }) => { api.state.ui.voice.unmuted = !api.state.ui.voice.unmuted; return 'render' },
		join: ({ api }) => {
			const v = api.state.ui.voice
			v.joined = !v.joined
			api.toast(v.joined ? 'success' : 'default', v.joined ? 'Connected to voice' : 'Disconnected')
			return 'render'
		},
		na: notInPreview,
	},
}

/** The + in the chat box: a camera tile and recent photos, with the other options along the bottom. */
export const attach = {
	id: 'attach', title: 'Attachments', group: 'Menus and sheets', capture: null, screen: 'bots',
	render() {
		return `<div class="vp-picker-dim" data-close></div>
		<div class="vp-picker vp-attach" data-k="bg:MOBILE_EXPRESSION_PICKER_BACKGROUND_DEFAULT bd:BORDER_SUBTLE" data-n="Attachment panel">
			${handle()}
			<div class="vp-attach-strip" data-scroll="attach">
				<button class="vp-attach-camera" data-act="na" data-k="bg:BACKGROUND_MOD_NORMAL fg:INTERACTIVE_ICON_DEFAULT" data-n="Camera button">${icon('camera', 28)}</button>
				${[30, 200, 120, 280, 330, 60].map((h, i) => `<button class="vp-attach-photo" data-act="pickphoto:${i}" data-fixed="Photo (user content)" style="background:linear-gradient(135deg,hsl(${h} 45% 45%),hsl(${h + 50} 40% 25%))"></button>`).join('')}
			</div>
			<nav class="vp-attach-bar" data-k="bg:BACKGROUND_SURFACE_HIGH" data-n="Attachment options">${[['image', 'Photos', true], ['check', 'Poll'], ['thread', 'Thread'], ['puzzle', 'Apps'], ['apps', 'Files']].map(([ic, label, on]) => `<button data-act="na" ${on ? 'data-k="bg:INTERACTIVE_BACKGROUND_ACTIVE fg:INTERACTIVE_ICON_ACTIVE" data-n="Selected option"' : 'data-k="fg:INTERACTIVE_ICON_DEFAULT" data-n="Option"'}>${icon(ic, 22)}<small>${label}</small></button>`).join('')}</nav>
		</div>
		${navScrim()}`
	},
	actions: {
		na: notInPreview,
		pickphoto: ({ api }) => api.toast('default', 'Photo added'),
	},
}

/** The gift button in the chat box: Discord's full-screen Nitro gift page. Its art and card are Nitro branding. */
export const gift = {
	id: 'gift', title: 'Gift Nitro', group: 'Menus and sheets', capture: null, screen: 'bots',
	render() {
		const perks = [['image', '1 GB uploads'], ['emoji', 'Custom emojis anywhere'], ['star', 'Unlimited Super Reactions'], ['camera', 'HD video streaming'], ['boost', '2 Server Boosts'], ['account', 'Custom profiles and more!']]
		return `<div class="vp-gift" data-fixed="Nitro gift page (Nitro branding, not themed)">
			<button class="vp-icon-btn vp-gift-close" data-close aria-label="Close">${icon('close', 24)}</button>
			<h1>Gift a new Nitro<br>membership</h1>
			<p>Warning: gift may cause uncontrollable happiness!</p>
			<div class="vp-gift-badge">${icon('boost', 18)} 1 gift away from the Patron badge!</div>
			<div class="vp-gift-card">
				<b class="vp-gift-logo">NITRO</b>
				<small>Choose from $.../<br>month or $.../year</small>
				<h3>Your recipient will receive:</h3>
				${perks.map(([ic, t]) => `<p>${icon(ic, 16)} ${t}</p>`).join('')}
				<button class="vp-gift-go" data-act="na">Gift Nitro</button>
			</div>
			<div class="vp-gift-dots"><i class="on"></i><i></i></div>
		</div>`
	},
	actions: { na: notInPreview },
}

/** Search page filter button: a small popup list, as on Discord. */
export const searchfilter = {
	id: 'searchfilter', title: 'Search filters', group: 'Menus and sheets', capture: null, screen: 'search',
	render() {
		const rows = [['account', 'From a specific person'], ['hash', 'In a specific channel'], ['apps', 'Has specific data'], ['userPlus', 'Mention someone'], ['clock', 'Sent on a date'], ['clock', 'Before a date'], ['clock', 'After a date'], ['account', 'By author type']]
		return `<div class="vp-scrim" data-close data-k="bg:BACKGROUND_SCRIM" data-n="Scrim"></div>
		<div class="vp-popmenu vp-filter-menu" data-k="bg:BACKGROUND_SURFACE_HIGHEST bd:BORDER_SUBTLE" data-n="Filter popup">
			<h2 data-k="fg:TEXT_STRONG">Filter results...</h2>
			${rows.map(([ic, label]) => `<button class="vp-pop-row" data-act="na" data-k="bt:BORDER_SUBTLE" data-n="Menu row"><span data-k="fg:TEXT_STRONG">${icon(ic, 20)}</span><span data-k="fg:TEXT_STRONG">${label}</span></button>`).join('')}
		</div>`
	},
	actions: { na: notInPreview },
}

/** Tapping the server name: a sheet with the server's details, over the channel list (checked against Discord 352). */
export const serverinfo = {
	id: 'serverinfo', title: 'Server info', group: 'Server', capture: null, screen: 'server',
	render({ state }) {
		const ui = (state.ui.serverinfo ??= {})
		const btn = (ic, label, act) => `<button class="vp-info-btn" data-act="${act}" data-n="${label} button"><span data-k="bg:BACKGROUND_MOD_NORMAL fg:INTERACTIVE_ICON_DEFAULT">${icon(ic, 22)}</span><small data-k="fg:TEXT_DEFAULT">${label}</small></button>`
		const plain = (label, sub, act) => `<button class="vp-row" data-act="${act}" data-n="Row"><span class="vp-row-label divided" data-k="bb:BORDER_SUBTLE"><span class="vp-row-stack"><span data-k="fg:TEXT_STRONG">${label}</span>${sub ? `<small data-k="fg:TEXT_MUTED">${sub}</small>` : ''}</span></span></button>`
		return `${scrim()}
		<div class="vp-info-sheet" data-k="bg:MOBILE_ACTIONSHEET_BACKGROUND" data-n="Server info sheet" data-scroll="serverinfo">
			<div class="vp-info-banner" data-fixed="Server banner (user content)"></div>
			<div class="vp-info-head">
				<span class="vp-info-icon" data-k="bg:MOBILE_ACTIONSHEET_BACKGROUND" data-n="Icon ring"><span data-fixed="Server icon (user content)">${icon('boost', 34)}</span></span>
				<h1 data-k="fg:MOBILE_TEXT_HEADING_PRIMARY"><span class="vp-guild-badge" data-fixed="Server badge">${icon('boost', 18)}</span>Valenced</h1>
				<p class="vp-info-desc" data-k="fg:TEXT_DEFAULT">Valenced is a client modification for Discord mobile.<br>https://valenced.app</p>
				<p class="vp-info-meta"><span class="vp-info-chip" data-k="bg:BACKGROUND_MOD_NORMAL fg:TEXT_STRONG" data-n="Community chip">${icon('globe', 14)} Community Server</span><span data-k="fg:TEXT_MUTED"><i class="vp-dot" data-k="bg:TEXT_STATUS_ONLINE"></i> 2,263 Online</span><span data-k="fg:TEXT_MUTED"><i class="vp-dot" data-k="bg:ICON_STATUS_OFFLINE"></i> ${valenced.members} Members</span></p>
			</div>
			<div class="vp-info-btns">${btn('boost', '25 Boosts', 'na')}${btn('userPlus', 'Invite', 'invite')}${btn('bell', 'Notifications', 'na')}${btn('gear', 'Settings', 'na')}</div>
			<div class="vp-rowgroup" data-k="bg:CARD_MUTED_BG" data-n="Grouped rows">${plain('Mark as Read', '', 'read')}${plain('Channels &amp; Roles', '', 'na')}</div>
			<div class="vp-rowgroup" data-k="bg:CARD_MUTED_BG" data-n="Grouped rows">${plain('Edit Per-server Profile', 'Juniper', 'na')}${plain('Server Tag', '', 'na')}<div class="vp-row" data-n="Switch row"><span class="vp-row-label" data-k="bb:BORDER_SUBTLE"><span data-k="fg:TEXT_STRONG">Show All Channels</span>${switchEl(!!ui.all, 'toggle:all')}</span></div></div>
			<div class="vp-rowgroup" data-k="bg:CARD_MUTED_BG" data-n="Grouped rows">${plain('Report Raid', '', 'na')}${plain('<span data-k="fg:TEXT_FEEDBACK_CRITICAL">Leave Server</span>', '', 'na')}</div>
			<div class="vp-fab-space"></div>
		</div>
		${navScrim()}`
	},
	actions: {
		toggle: ({ arg, api }) => { api.state.ui.serverinfo[arg] = !api.state.ui.serverinfo[arg]; return 'render' },
		invite: ({ api }) => api.toast('success', 'Invite link copied'),
		read: ({ api }) => { api.close(); api.toast('success', 'Marked as read') },
		na: notInPreview,
	},
}
