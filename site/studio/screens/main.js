// The main screens: the Messages list, a server's channel list, and DM conversations.
import { activities, avatar, conversations, dms, users, valenced } from '../mock.js'
import { valencedWordmark, channelHeader, channelIcon, chatInput, clanTag, esc, icon, message, navBar, notificationCount, rail, statusBar, userPanel } from './common.js'

/** The rounded panel to the right of the rail, shared by Messages and a server's channel list. */
const panel = (inner, n) => `<section class="vp-panel" data-k="bg:PANEL_BG bd:APP_FRAME_BORDER" data-n="${n}" data-scroll="panel">${inner}</section>`

const dock = () => `<div class="vp-dock" data-k="x:BACKGROUND_BASE_LOWER" data-n="Behind the user panel">${userPanel()}</div>`

export const home = {
	id: 'home', title: 'Messages', group: 'Main', capture: 'home',
	render({ ui }) {
		const dmRow = d => {
			const u = users[d.user]
			const pic = d.group ? `<span class="vp-group-av">${avatar(d.members[0], 24, { status: false })}${avatar(d.members[1], 24, { status: false })}</span>` : avatar(d.user, 36)
			const read = ui.read?.[d.id]
			const unread = d.unread && !read
			return `<button class="vp-dm${unread ? ' unread' : ''}" data-go="dm:${d.id}" data-n="Direct message row">
				${pic}
				<span class="vp-dm-text">
					<span class="vp-dm-name"><b data-k="${unread ? 'fg:TEXT_STRONG' : 'fg:MESSAGES_ITEM_CHANNEL_TEXT_DEFAULT'}" data-n="${unread ? 'Unread DM name' : 'DM name'}">${esc(d.group ? d.name : u.name)}</b>${!d.group ? clanTag(u.tag) : ''}</span>
					<span class="vp-dm-preview" data-k="fg:TEXT_MUTED">${esc(d.preview)}</span>
				</span>
				${d.wave ? `<span class="vp-wave" data-k="bg:CONTROL_SECONDARY_BACKGROUND_DEFAULT fg:CONTROL_SECONDARY_TEXT_DEFAULT bd:CONTROL_SECONDARY_BORDER_DEFAULT" data-n="Wave button">${icon('wave', 18)}Wave</span>` : `<span class="vp-dm-meta"><small data-k="fg:TEXT_MUTED">${d.time}</small>${unread && d.badge ? `<span class="vp-badge" data-k="bg:BADGE_NOTIFICATION_BACKGROUND fg:BADGE_NOTIFICATION_TEXT" data-n="Unread badge">${d.badge}</span>` : ''}</span>`}
			</button>`
		}
		return `${statusBar('BACKGROUND_BASE_LOWEST')}
		<div class="vp-main" data-k="bg:BACKGROUND_BASE_LOWEST" data-n="App background">
			${rail('home')}
			${panel(`
				<h1 class="vp-panel-title" data-k="fg:MOBILE_TEXT_HEADING_PRIMARY">Messages</h1>
				<div class="vp-dm-actions">
					<button class="vp-btn-sq" data-k="bg:CONTROL_SECONDARY_BACKGROUND_DEFAULT fg:CONTROL_SECONDARY_TEXT_DEFAULT bd:CONTROL_SECONDARY_BORDER_DEFAULT" data-n="Search button" data-go="search" aria-label="Search">${icon('search', 20)}</button>
					<button class="vp-btn-secondary grow" data-k="bg:CONTROL_SECONDARY_BACKGROUND_DEFAULT fg:CONTROL_SECONDARY_TEXT_DEFAULT bd:CONTROL_SECONDARY_BORDER_DEFAULT" data-n="Add Friends button" data-act="addfriends">${icon('userPlus', 20)}Add Friends</button>
					<button class="vp-btn-sq" data-k="bg:CONTROL_PRIMARY_BACKGROUND_DEFAULT fg:CONTROL_PRIMARY_TEXT_DEFAULT bd:CONTROL_PRIMARY_BORDER_DEFAULT" data-n="New message button" data-open="alert" aria-label="New message">${icon('plus', 22)}</button>
				</div>
				<div class="vp-activities" data-scroll="acts">${activities.map(a => `
					<div class="vp-activity" data-k="bg:CARD_SECONDARY_BACKGROUND_DEFAULT" data-n="Activity card" data-go="profile:${a.user}">
						<span class="vp-activity-art" data-fixed="Album or game art (content)" style="background:linear-gradient(150deg,hsl(${a.art[0]} 60% 45%),hsl(${a.art[1]} 50% 20%))"></span>
						<span class="vp-activity-text">${avatar(a.user, 24, { status: false })}<b data-k="fg:TEXT_STRONG">${esc(users[a.user].name)}</b><span data-k="fg:TEXT_MUTED">${esc(a.title)}</span></span>
						<span class="vp-activity-kind" data-k="fg:ICON_VOICE_CONNECTED" data-n="Listening icon">${icon(a.kind === 'listening' ? 'headphones' : 'games', 16)}</span>
					</div>`).join('')}
				</div>
				<div class="vp-dms">${dms.map(dmRow).join('')}</div>
				<div class="vp-dock-space"></div>`, 'DM list panel')}
		</div>
		${dock()}
		${navBar('BACKGROUND_BASE_LOWER')}`
	},
	actions: {
		bell: ({ api }) => api.toast('default', 'Notifications are on for this server'),
		addfriends: ({ api }) => api.toast('success', 'Friend request sent'),
	},
}

// Icon of an unread or open channel; read channels use CHANNEL_ICON. Confirmed against the capture of Discord 352.
const UNREAD_ICON = 'INTERACTIVE_TEXT_ACTIVE'

export const server = {
	id: 'server', title: 'Server channels', group: 'Main', capture: 'server',
	render({ ui, state }) {
		const collapsed = ui.collapsed || {}
		const chan = c => {
			const connected = state.ui.voice?.joined && state.ui.voice.channel === c.id
			const active = ui.selected === c.id
			const unread = c.unread && !ui.read?.[c.id]
			return `<div class="vp-chan-wrap">
				${unread ? `<i class="vp-chan-pip" data-k="bg:${UNREAD_ICON}" data-n="Unread indicator"></i>` : ''}
				<button class="vp-chan${active ? ' on' : ''}" data-act="channel:${c.id}" data-n="Channel row" ${active ? 'data-k="bg:MOBILE_CHANNEL_ITEM_BACKGROUND_SELECTED"' : ''}>
					<span class="${c.muted ? 'vp-chan-muted' : ''}" data-k="fg:${connected ? 'STATUS_POSITIVE' : unread || active ? UNREAD_ICON : 'CHANNEL_ICON'}" data-n="${connected ? 'Connected voice channel icon' : unread ? 'Unread channel icon' : 'Channel icon'}">${channelIcon(c.type, 22)}</span>
					<span class="vp-chan-name${unread ? ' unread' : ''}${c.muted ? ' vp-chan-muted' : ''}" data-k="fg:${unread || active ? 'REDESIGN_CHANNEL_NAME_TEXT' : 'REDESIGN_CHANNEL_NAME_MUTED_TEXT'}" data-n="${c.muted ? 'Muted channel name' : unread ? 'Unread channel name' : 'Channel name'}">${esc(c.name)}</span>
					${c.mentions && unread ? notificationCount(c.mentions, 'Channel mention count') : ''}
				</button>
				${(c.members || []).map(id => `<div class="vp-voice-user" data-n="Person in the voice channel">${avatar(id, 24, { status: false })}<span data-k="fg:REDESIGN_CHANNEL_NAME_MUTED_TEXT">${esc(users[id].name)}</span></div>`).join('')}
				${(c.threads || []).map(t => {
					const name = `<span data-k="fg:REDESIGN_CHANNEL_NAME_MUTED_TEXT">${esc(t)}</span>`
					return `<div class="vp-subthread">
						<i class="vp-spine" data-k="bd:SPINE_DEFAULT" data-n="Channel list thread spine"></i>
						${c.preview ? `<button data-go="thread-chat" aria-label="Open ${esc(t)}">
							<span data-k="fg:CHANNEL_ICON" data-n="Thread channel icon">${icon('thread', 18)}</span>${name}
						</button>` : name}
					</div>`
				}).join('')}
			</div>`
		}
		const b = valenced.boost
		return `${statusBar('BACKGROUND_BASE_LOWEST', '2:35')}
		<div class="vp-main" data-k="bg:BACKGROUND_BASE_LOWEST" data-n="App background">
			${rail('valenced')}
			${panel(`
				<div class="vp-banner" data-fixed="Server banner (user content)"><span>${valencedWordmark}</span></div>
				<div class="vp-guild-head">
					<button class="vp-guild-name" data-open="serverinfo" data-n="Server name"><b data-k="fg:MOBILE_TEXT_HEADING_PRIMARY">Valenced</b><span class="vp-guild-badge" data-fixed="Server badge">${icon('boost', 16)}</span><span data-k="fg:TEXT_MUTED">${icon('chevronRight', 14)}</span></button>
					<p data-k="fg:TEXT_MUTED">${valenced.members} Members <span>&bull;</span> Community</p>
					<div class="vp-guild-actions">
						<button class="vp-btn-secondary grow" data-k="bg:CONTROL_SECONDARY_BACKGROUND_DEFAULT fg:CONTROL_SECONDARY_TEXT_DEFAULT bd:CONTROL_SECONDARY_BORDER_DEFAULT" data-n="Search button" data-go="search">${icon('search', 20)}Search</button>
						<button class="vp-btn-sq" data-k="bg:CONTROL_SECONDARY_BACKGROUND_DEFAULT fg:CONTROL_SECONDARY_TEXT_DEFAULT bd:CONTROL_SECONDARY_BORDER_DEFAULT" data-n="Invite button" data-act="invite" aria-label="Invite">${icon('userPlus', 20)}</button>
					</div>
				</div>
				<hr data-k="bt:BORDER_SUBTLE" data-n="Divider">
				<button class="vp-boost" data-k="bg:BACKGROUND_MOD_NORMAL" data-n="Boost goal track"><span class="vp-boost-fill" data-fixed="Boost progress (Discord's boost colours)" style="width:${(b.have / b.need) * 100}%"></span><b data-k="fg:TEXT_STRONG">${b.label}</b><span data-k="fg:TEXT_DEFAULT">${b.have}/${b.need} Boosts ${icon('chevronRight', 16)}</span></button>
				<hr data-k="bt:BORDER_SUBTLE" data-n="Divider">
				<button class="vp-chan vp-chan-roles" data-n="Channels &amp; Roles"><span data-k="fg:CHANNEL_ICON">${icon('channelsRoles', 22)}</span><span data-k="fg:REDESIGN_CHANNEL_NAME_MUTED_TEXT">Channels &amp; Roles</span><span class="vp-new" data-k="bg:MOBILE_TOAST_BACKGROUND_DEFAULT fg:TEXT_BRAND" data-n="NEW pill">NEW</span></button>
				<hr data-k="bt:BORDER_SUBTLE" data-n="Divider">
				${valenced.categories.map((cat, i) => `
					<button class="vp-category" data-act="collapse:${i}" data-k="fg:TEXT_SUBTLE" data-n="Category">${esc(cat.name)} <span class="${collapsed[i] ? 'closed' : ''}">${icon('chevronDown', 14)}</span></button>
					${cat.channels.filter(c => (!collapsed[i] || c.unread) && (ui.showAllVoice || c.type !== 'voice' || c.members?.length || (state.ui.voice?.joined && state.ui.voice.channel === c.id))).map(chan).join('')}`).join('')}
				<button class="vp-show-voice" data-act="showvoice" data-k="bg:CONTROL_SECONDARY_BACKGROUND_DEFAULT fg:CONTROL_SECONDARY_TEXT_DEFAULT" data-n="Show all voice channels">${icon('speaker', 16)}${ui.showAllVoice ? 'Hide Voice Channels' : 'Show All'}</button>
				<div class="vp-dock-space"></div>`, 'Channel list panel')}
		</div>
		${dock()}
		${navBar('BACKGROUND_BASE_LOWER')}`
	},
	actions: {
		showvoice: ({ ui }) => { ui.showAllVoice = !ui.showAllVoice; return 'render' },
		collapse: ({ arg, ui }) => {
			ui.collapsed = { ...ui.collapsed, [arg]: !ui.collapsed?.[arg] }
			return 'render'
		},
		channel: ({ arg, ui, api }) => {
			ui.selected = arg
			ui.read = { ...ui.read, [arg]: true }
			const c = valenced.categories.flatMap(x => x.channels).find(x => x.id === arg)
			if (c.preview) return api.go(c.preview)
			if (c.type === 'voice') return api.open('voice', { arg, keepScreen: true })
			if (c.type === 'forum') return api.go('forum', { id: arg })
			if (arg === 'bots' || arg === 'general' || arg === 'github') return api.go('bots', { id: arg })
			return api.go('chat', { id: arg })
		},
		invite: ({ api }) => api.toast('success', 'Invite link copied'),
		bell: ({ api }) => api.toast('default', 'Notifications are on for this server'),
	},
}

/** A DM or group DM conversation. */
export const dm = {
	id: 'dm', title: 'Direct message', group: 'Conversations', capture: 'chatinput',
	render({ params, ui, base }) {
		const id = params.id || 'quill'
		const d = dms.find(x => x.id === id) || dms[0]
		const msgs = [...(conversations[id] || conversations.quill), ...(ui.sent?.[id] || [])]
		const title = d.group ? d.name : users[d.user].name
		return `${statusBar('STANDALONE_CHANNEL_CONTENT_BACKGROUND')}
		${channelHeader({ name: title, dm: d.group ? null : d.user, type: 'text', sub: d.group ? '3 members' : '' })}
		<div class="vp-chat" data-k="bg:CHANNEL_BACKGROUND_DEFAULT" data-n="Chat background" data-scroll="chat">
			<div class="vp-dm-intro">
				${d.group ? `<span class="vp-group-av big">${avatar(d.members[0], 48, { status: false })}${avatar(d.members[1], 48, { status: false })}</span>` : avatar(d.user, 80, { status: false })}
				<h2 data-k="fg:MOBILE_TEXT_HEADING_PRIMARY">${esc(title)}</h2>
				${d.group ? '' : `<p data-k="fg:TEXT_DEFAULT">${esc(users[d.user].username)}</p>`}
				<p data-k="fg:TEXT_MUTED">${d.group ? `Welcome to the beginning of the ${esc(title)} group.` : `This is the beginning of your direct message history with ${esc(title)}.`}</p>
				${d.group ? '' : `<div class="vp-intro-actions"><button class="vp-btn-secondary" data-k="bg:CONTROL_SECONDARY_BACKGROUND_DEFAULT fg:CONTROL_SECONDARY_TEXT_DEFAULT bd:CONTROL_SECONDARY_BORDER_DEFAULT" data-n="Secondary button" data-go="profile:${d.user}">View Profile</button></div>`}
			</div>
			<div class="vp-day" data-k="bt:BORDER_SUBTLE" data-n="Date divider"><span data-k="fg:TEXT_MUTED bg:CHANNEL_BACKGROUND_DEFAULT">Today</span></div>
			${msgs.map((m, i) => message(m, `dm.${i}`, { grouped: i > 0 && msgs[i - 1].user === m.user, ui, dm: true, base })).join('')}
		</div>
		${chatInput({ placeholder: `Message ${d.group ? title : '@' + title}`, active: ui.focused, value: ui.draft || '' })}
		${navBar('MOBILE_KEYBOARD_GAP_BACKGROUND')}`
	},
	mounted(el) {
		const chat = el.querySelector('.vp-chat')
		chat.scrollTop = chat.scrollHeight
	},
	actions: chatActions('dm'),
}

/** Typing, sending and reacting, shared by every chat screen. */
export function chatActions(kind) {
	return {
		spoiler: ({ ui }) => {
			ui.spoiler = !ui.spoiler
			return 'render'
		},
		type: ({ el, ui }) => {
			const had = !!ui.draft
			ui.draft = el.value
			// only redraw when the send button needs to change, so typing stays smooth
			if (had !== !!ui.draft) {
				const box = el.closest('.vp-chatinput')
				box.querySelector('.vp-send').outerHTML = ui.draft
					? `<button class="vp-send on" data-act="send" data-k="bg:CHAT_INPUT_SEND_BUTTON_ACTIVE_BACKGROUND fg:CHAT_INPUT_SEND_BUTTON_ICON_ACTIVE_TINT" data-n="Send button (ready)" aria-label="Send" style="background-color:var(--c-CHAT_INPUT_SEND_BUTTON_ACTIVE_BACKGROUND);color:var(--c-CHAT_INPUT_SEND_BUTTON_ICON_ACTIVE_TINT)">${icon('send', 20)}</button>`
					: `<button class="vp-send" data-k="fg:ICON_MUTED" data-n="Send arrow" aria-label="Send" style="color:var(--c-ICON_MUTED)">${icon('send', 24)}</button>`
			}
		},
		focus: ({ el, ui }) => {
			ui.focused = true
			const box = el.closest('.vp-chatinput')
			box.classList.add('active')
			box.dataset.k = 'bg:MOBILE_CHATINPUT_BACKGROUND_ACTIVE bd:MOBILE_CHATINPUT_BORDER_ACTIVE'
			box.dataset.n = 'Chat box (typing)'
			box.style.backgroundColor = 'var(--c-MOBILE_CHATINPUT_BACKGROUND_ACTIVE)'
			box.style.borderColor = 'var(--c-MOBILE_CHATINPUT_BORDER_ACTIVE)'
		},
		blur: ({ el, ui }) => {
			ui.focused = false
			const box = el.closest('.vp-chatinput')
			box.classList.remove('active')
			box.dataset.k = 'bg:MOBILE_CHATINPUT_BACKGROUND_DEFAULT bd:MOBILE_CHATINPUT_BORDER_DEFAULT'
			box.dataset.n = 'Chat box'
			box.style.backgroundColor = 'var(--c-MOBILE_CHATINPUT_BACKGROUND_DEFAULT)'
			box.style.borderColor = 'var(--c-MOBILE_CHATINPUT_BORDER_DEFAULT)'
		},
		send: ({ ui, params, api }) => {
			const text = (ui.draft || '').trim()
			if (!text) return
			const key = params.id || kind
			ui.sent = { ...ui.sent, [key]: [...(ui.sent?.[key] || []), { user: 'me', time: 'Today at ' + new Date().toTimeString().slice(0, 5), text }] }
			ui.draft = ''
			ui.focused = false
			api.render()
			const chat = api.state && document.querySelector('.vp-screen .vp-chat')
			if (chat) chat.scrollTop = chat.scrollHeight
		},
		react: ({ arg, ui }) => {
			ui.reacted = { ...ui.reacted, [arg]: !ui.reacted?.[arg] }
			return 'render'
		},
		picker: ({ api }) => api.open('emoji', { keepScreen: true }),
		keyboard: ({ api }) => api.close(),
		attach: ({ api }) => api.toast('critical', 'Uploads are not available in the preview'),
	}
}
