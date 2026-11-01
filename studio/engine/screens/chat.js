// Channel screens: an announcement channel, a busy text channel with unreads, a forum and member search.
import { announcements, bots, memberGroups, users, valenced } from '../mock.js'
import { avatar, channelHeader, chatInput, clanTag, esc, icon, message, navBar, statusBar } from './common.js'
import { chatActions } from './main.js'

const channelName = id => valenced.categories.flatMap(c => c.channels).find(c => c.id === id) || { name: id, type: 'text' }

export const chat = {
	id: 'chat', title: 'Announcement channel', group: 'Conversations', capture: 'chat',
	render({ params, ui }) {
		const c = channelName(params.id || 'announcements')
		const msgs = [...announcements, ...(ui.sent?.[c.id] || [])]
		return `${statusBar('STANDALONE_CHANNEL_CONTENT_BACKGROUND')}
		${channelHeader({ type: c.type, name: c.name })}
		<div class="vp-chat" data-k="bg:CHANNEL_BACKGROUND_DEFAULT" data-n="Chat background" data-scroll="chat">
			<div class="vp-msg-tail" data-k="fg:TEXT_STRONG">and force stopping the app multiple times. Recovery mode should trigger automatically and let you back in. You can reload the app again to exit recovery mode.<br><br>This doesn't seem to be a plugin issue. I'm looking into the root cause of it.</div>
			<div class="vp-msg-tail-reactions">${reactionsRow([['✅', 13], ['🥔', 7]], 'tail', ui)}</div>
			${msgs.map((m, i) => message(m, `a.${i}`, { ui })).join('')}
		</div>
		${c.type === 'announcement' ? `<div class="vp-follow-wrap" data-k="bg:MOBILE_KEYBOARD_GAP_BACKGROUND" data-n="Under the chat"><div class="vp-follow" data-k="bg:BACKGROUND_SURFACE_HIGH bd:BORDER_MUTED" data-n="Follow card">
			<p data-k="fg:TEXT_DEFAULT">Follow to get this channel's updates in your own server.</p>
			<button class="vp-btn-primary" data-k="bg:CONTROL_PRIMARY_BACKGROUND_DEFAULT fg:CONTROL_PRIMARY_TEXT_DEFAULT bd:CONTROL_PRIMARY_BORDER_DEFAULT" data-n="Primary button" data-act="follow">${ui.followed ? 'Following' : 'Follow'}</button>
		</div></div>` : chatInput({ placeholder: `Message #${c.name}`, active: ui.focused, value: ui.draft || '' })}
		${navBar('MOBILE_KEYBOARD_GAP_BACKGROUND')}`
	},
	mounted(el) {
		const chatEl = el.querySelector('.vp-chat')
		chatEl.scrollTop = chatEl.scrollHeight
	},
	actions: {
		...chatActions('chat'),
		follow: ({ ui, api }) => {
			ui.followed = !ui.followed
			api.toast('success', ui.followed ? 'Following #announcements' : 'Unfollowed')
			return 'render'
		},
	},
}

/** Reaction row for the partly scrolled-off message at the top of the announcements screen. */
function reactionsRow(list, id, ui) {
	return list.map(([e, n], i) => {
		const on = ui.reacted?.[`${id}.${i}`]
		return `<button class="vp-reaction${on ? ' on' : ''}" data-act="react:${id}.${i}" data-k="${on ? 'bg:REACTION_BACKGROUND_REACTED_DEFAULT bd:REACTION_BORDER_REACTED_DEFAULT fg:REACTION_TEXT_REACTED_DEFAULT' : 'bg:BACKGROUND_MOD_STRONG fg:REACTION_TEXT_DEFAULT'}" data-n="Reaction"><span data-fixed="Emoji">${e}</span>${on ? n + 1 : n}</button>`
	}).join('') + `<button class="vp-reaction add" data-k="bg:BACKGROUND_MOD_STRONG fg:INTERACTIVE_ICON_DEFAULT" data-n="Add reaction" data-open="emoji">${icon('emoji', 18)}</button>`
}

export const botsChat = {
	id: 'bots', title: 'Text channel with unreads', group: 'Conversations', capture: 'chatinput',
	render({ params, ui }) {
		const c = channelName(params.id || 'bots')
		const msgs = [...bots.messages, ...(ui.sent?.[c.id] || [])]
		return `${statusBar('STANDALONE_CHANNEL_CONTENT_BACKGROUND', '2:36')}
		${channelHeader({ type: c.type, name: c.name })}
		<div class="vp-chat-area">
			${ui.dismissed ? '' : `<button class="vp-unread-bar" data-k="bg:BACKGROUND_BRAND fg:TEXT_OVERLAY_LIGHT" data-n="Unread banner" data-act="dismiss"><span>${bots.unread} new messages since ${bots.since}</span>${icon('close', 22)}</button>`}
			<div class="vp-chat" data-k="bg:CHANNEL_BACKGROUND_DEFAULT" data-n="Chat background" data-scroll="chat">
				<div class="vp-newdiv" data-k="bt:MOBILE_CHAT_NEW_MESSAGE_BORDER" data-n="New messages divider"><span data-k="fg:MOBILE_CHAT_NEW_MESSAGE_TEXT bg:CHANNEL_BACKGROUND_DEFAULT" data-n="NEW MESSAGES label">NEW MESSAGES</span></div>
				${msgs.map((m, i) => message(m, `b.${i}`, { ui })).join('')}
			</div>
			<button class="vp-jump" data-k="bg:MOBILE_FLOATINGBAR_BACKGROUND fg:INTERACTIVE_ICON_DEFAULT" data-n="Jump to latest button" data-act="jump" aria-label="Jump to latest">${icon('arrowDown', 22)}</button>
		</div>
		${chatInput({ placeholder: `Message #${c.name}`, active: ui.focused, value: ui.draft || '' })}
		${navBar('MOBILE_KEYBOARD_GAP_BACKGROUND')}`
	},
	actions: {
		...chatActions('bots'),
		dismiss: ({ ui }) => {
			ui.dismissed = true
			return 'render'
		},
		jump: ({ el }) => {
			const c = el.closest('.vp-chat-area').querySelector('.vp-chat')
			c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' })
		},
	},
}

export const forum = {
	id: 'forum', title: 'Forum channel', group: 'Conversations', capture: 'forum',
	render({ params, ui }) {
		const c = channelName(params.id || 'plugins')
		const posts = [
			{ pinned: true, author: 'palm', when: '2d ago', title: c.name === 'plugins' ? 'Plugins' : 'Read this first', body: 'Only plugins made for Valenced can be installed and used. Revenge, Kettu, Vencord and BetterDiscord plugins will not load.', tags: ['🎨 Customization', '💼 Productivity'], more: 1, comments: 0, react: ['✨', 15] },
			{ author: 'ren', when: '5h ago', title: 'Server drawer: compact mode', body: 'A denser layout for people with lots of servers. Screenshots inside.', tags: ['🧩 Plugin'], comments: 12, react: ['👍', 8] },
		]
		return `${statusBar('STANDALONE_CHANNEL_CONTENT_BACKGROUND', '2:36')}
		${channelHeader({ type: 'forum', name: c.name })}
		<div class="vp-forum" data-k="bg:BACKGROUND_BASE_LOWER" data-n="Forum post list" data-scroll="forum">
			<div class="vp-forum-bar" data-k="bb:BORDER_SUBTLE">
				<button class="vp-btn-secondary sm" data-k="bg:CONTROL_SECONDARY_BACKGROUND_DEFAULT fg:CONTROL_SECONDARY_TEXT_DEFAULT bd:CONTROL_SECONDARY_BORDER_DEFAULT" data-n="Sort &amp; view button" data-act="sort"><span data-k="fg:INTERACTIVE_ICON_DEFAULT">${icon('sort', 16)}</span>${ui.sort ? 'Newest' : 'Sort &amp; view'}</button>
				<button class="vp-btn-secondary sm" data-k="bg:CONTROL_SECONDARY_BACKGROUND_DEFAULT fg:CONTROL_SECONDARY_TEXT_DEFAULT bd:CONTROL_SECONDARY_BORDER_DEFAULT" data-n="Tags button">${icon('tag', 16)}Tags</button>
			</div>
			${(ui.sort ? [...posts].reverse() : posts).map(p => `
			<article class="vp-post" data-k="bg:BACKGROUND_SURFACE_HIGH bd:BORDER_MUTED" data-n="Forum post card" data-go="chat:${c.id}">
				<div class="vp-post-tags">
					${p.pinned ? `<span class="vp-pin" data-k="bg:BACKGROUND_BRAND fg:WHITE" data-n="Pinned badge">${icon('pin', 14)}</span>` : ''}
					${p.tags.map(t => `<span class="vp-tag" data-k="bd:BORDER_SUBTLE fg:TEXT_DEFAULT" data-n="Tag">${esc(t)}</span>`).join('')}
					${p.more ? `<span class="vp-tag" data-k="bd:BORDER_SUBTLE fg:TEXT_DEFAULT">+${p.more}</span>` : ''}
				</div>
				<div class="vp-post-meta"><b style="color:${users[p.author].role || 'inherit'}" data-fixed="Role colour (set by the server)">${users[p.author].name}</b><small data-k="fg:TEXT_MUTED">${p.when}</small></div>
				<h3 data-k="fg:MOBILE_TEXT_HEADING_PRIMARY">${esc(p.title)}</h3>
				<p data-k="fg:TEXT_MUTED">${esc(p.body)}</p>
				<div class="vp-post-foot"><span data-k="fg:ICON_MUTED" data-n="Comment icon">${icon('chat', 18)}</span><b data-k="fg:TEXT_MUTED">${p.comments}</b><span class="vp-post-react" data-k="bg:REACTION_BACKGROUND_DEFAULT bd:REACTION_BORDER_DEFAULT fg:REACTION_TEXT_DEFAULT" data-n="Reaction pill"><span data-fixed="Emoji">${p.react[0]}</span>${p.react[1]}</span></div>
			</article>`).join('')}
		</div>
		<button class="vp-fab" data-k="bg:CONTROL_PRIMARY_BACKGROUND_DEFAULT fg:CONTROL_PRIMARY_TEXT_DEFAULT bd:CONTROL_PRIMARY_BORDER_DEFAULT" data-n="New post button" data-open="alert" aria-label="New post">${icon('plus', 26)}</button>
		${navBar('BACKGROUND_BASE_LOWER')}`
	},
	actions: {
		sort: ({ ui }) => {
			ui.sort = !ui.sort
			return 'render'
		},
	},
}

export const search = {
	id: 'search', title: 'Member search', group: 'Server', capture: 'search',
	render({ ui }) {
		const tab = ui.tab || 'Members'
		const q = (ui.q || '').toLowerCase()
		const groups = memberGroups.map(([g, list]) => [g, list.filter(([id]) => !q || users[id].name.toLowerCase().includes(q))]).filter(([, l]) => l.length)
		return `${statusBar('MOBILE_ACTIONSHEET_BACKGROUND', '2:37')}
		<div class="vp-page" data-k="bg:MOBILE_ACTIONSHEET_BACKGROUND" data-n="Search page">
			<div class="vp-search-head">
				<button class="vp-icon-btn" data-back data-k="fg:INTERACTIVE_TEXT_DEFAULT" data-n="Back button" aria-label="Back">${icon('back', 24)}</button>
				<label class="vp-search active" data-k="bg:INPUT_BACKGROUND_DEFAULT bd:INPUT_BORDER_ACTIVE" data-n="Search field (focused)">
					<span data-k="fg:INPUT_ICON_DEFAULT">${icon('search', 20)}</span>
					<span class="vp-chip" data-k="bg:BACKGROUND_MOD_SUBTLE fg:TEXT_DEFAULT" data-n="Filter chip">in: announcements</span>
					<input data-k="fg:INPUT_TEXT_DEFAULT" data-input="q" value="${esc(ui.q || '')}" aria-label="Search members">
				</label>
				<button class="vp-square-btn" data-k="bg:REDESIGN_BUTTON_TERTIARY_BACKGROUND fg:REDESIGN_BUTTON_TERTIARY_TEXT" data-n="Filter button" aria-label="Filters">${icon('filter', 22)}</button>
			</div>
			<nav class="vp-tabs" data-k="bb:BORDER_SUBTLE" data-n="Tabs">${['Members', 'Media', 'Pins', 'Threads', 'Links', 'Files'].map(t => `<button data-act="tab:${t}" class="${t === tab ? 'on' : ''}" data-k="fg:${t === tab ? 'TEXT_BRAND' : 'TEXT_MUTED'}" data-n="${t === tab ? 'Selected tab' : 'Tab'}">${t}${t === tab ? '<i data-k="bg:BACKGROUND_BRAND" data-n="Tab indicator"></i>' : ''}</button>`).join('')}</nav>
			<div class="vp-page-scroll" data-scroll="search">
				${tab !== 'Members' ? `<p class="vp-empty" data-k="fg:TEXT_MUTED">No ${tab.toLowerCase()} in this channel yet.</p>` : groups.map(([g, list]) => `
					<h2 class="vp-member-group" data-k="fg:TEXT_SUBTLE">${g} &mdash; ${list.length}</h2>
					<div class="vp-rowgroup" data-k="bg:CARD_MUTED_BG" data-n="Member group">${list.map(([id, status, kind], i) => `
						<button class="vp-member" data-go="profile:${id}" data-n="Member row">
							${avatar(id, 40)}
							<span class="vp-member-text${i < list.length - 1 ? ' divided' : ''}" data-k="bb:BORDER_SUBTLE">
								<span class="vp-member-name"><b style="color:${users[id].role || 'inherit'}" ${users[id].role ? 'data-fixed="Role colour (set by the server)"' : 'data-k="fg:TEXT_STRONG"'}>${esc(users[id].name)}</b>${users[id].bot ? `<span class="vp-app" data-k="bg:BACKGROUND_BRAND fg:WHITE" data-n="App badge">APP</span>` : clanTag(users[id].tag)}</span>
								<small data-k="fg:TEXT_DEFAULT">${kind === 'game' ? `<span data-k="fg:TEXT_FEEDBACK_POSITIVE">${icon('games', 14)}</span>` : ''}${esc(status)}</small>
							</span>
						</button>`).join('')}
					</div>`).join('')}
			</div>
		</div>
		${navBar('MOBILE_ACTIONSHEET_BACKGROUND')}`
	},
	actions: {
		tab: ({ arg, ui }) => {
			ui.tab = arg
			return 'render'
		},
		q: ({ el, ui, api }) => {
			ui.q = el.value
			api.render()
			const input = document.querySelector('.vp-screen .vp-search input')
			input?.focus()
			input?.setSelectionRange(input.value.length, input.value.length)
		},
	},
}
