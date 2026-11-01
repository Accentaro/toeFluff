// Pages that open on top: Settings, Plugins, Theme colours, your profile, someone else's profile, Notifications.
import { inbox, plugins, users } from '../mock.js'
import { avatar, clanTag, esc, icon, md, navBar, pageHeader, rowGroup, searchField, sectionLabel, statusBar, switchEl } from './common.js'

const notInPreview = ({ api, el }) => api.toast('default', `${el.textContent.trim().split('\n')[0]} is not part of the preview`)

export const settings = {
	id: 'settings', title: 'Settings', group: 'Settings', capture: 'settings',
	render() {
		return `${statusBar('MOBILE_ACTIONSHEET_BACKGROUND', '2:37')}
		<div class="vp-page" data-k="bg:MOBILE_ACTIONSHEET_BACKGROUND" data-n="Settings page">
			${pageHeader('Settings', { close: true })}
			<div class="vp-page-scroll" data-scroll="settings">
				${searchField('Search')}
				${sectionLabel('Valenced')}
				${rowGroup([
					{ icon: 'quests', label: 'Valenced', value: '1.2.4-4fb12ba', act: 'na' },
					{ icon: 'puzzle', label: 'Plugins', value: `${plugins.filter(p => p.on).length + 7} enabled`, go: 'plugins' },
					{ icon: 'palette', label: 'Themes', go: 'colors' },
					{ icon: 'wrench', label: 'Developer', act: 'na' },
				])}
				${sectionLabel('Account Settings')}
				${rowGroup([
					{ icon: 'nitro', label: 'Get Nitro', act: 'na' },
					{ icon: 'account', label: 'Account', act: 'na' },
					{ icon: 'social', label: 'Content & Social', act: 'na' },
					{ icon: 'shield', label: 'Data & Privacy', act: 'na' },
					{ icon: 'family', label: 'Family Centre', act: 'na' },
					{ icon: 'key', label: 'Authorised Apps', act: 'na' },
					{ icon: 'devices', label: 'Devices', act: 'na' },
				])}
				${sectionLabel('App Settings')}
				${rowGroup([
					{ icon: 'palette', label: 'Appearance', act: 'appearance' },
					{ icon: 'logout', label: 'Log Out', chevron: false, act: 'logout' },
				])}
			</div>
		</div>
		${navBar('MOBILE_ACTIONSHEET_BACKGROUND')}`
	},
	actions: {
		na: notInPreview,
		appearance: ({ api }) => api.go('colors'),
		logout: ({ api }) => api.open('alert', { keepScreen: true, arg: 'logout' }),
	},
}

export const pluginsPage = {
	id: 'plugins', title: 'Plugins', group: 'Settings', capture: 'plugins',
	render({ ui }) {
		const state = id => ui[id] ?? plugins.find(p => p.id === id).on
		const q = (ui.q || '').toLowerCase()
		return `${statusBar('MOBILE_ACTIONSHEET_BACKGROUND', '2:38')}
		<div class="vp-page" data-k="bg:MOBILE_ACTIONSHEET_BACKGROUND" data-n="Plugins page">
			${pageHeader('Plugins', { trailing: `<button class="vp-square-btn" data-k="bg:REDESIGN_BUTTON_TERTIARY_BACKGROUND fg:REDESIGN_BUTTON_TERTIARY_TEXT" data-n="Settings button" data-act="na" aria-label="Plugin settings">${icon('gear', 24)}</button>` })}
			<div class="vp-page-scroll" data-scroll="plugins">
				${searchField('Search', { filter: true, value: ui.q || '', input: 'q' })}
				${plugins.filter(p => !q || p.name.toLowerCase().includes(q)).map(p => `
				<div class="vp-plugin" data-k="bg:TABLEROW_BACKGROUND_DEFAULT bd:BORDER_MUTED" data-n="Plugin card">
					<div class="vp-plugin-head">
						<span data-k="fg:TEXT_STRONG">${icon(p.icon, 22)}</span><b data-k="fg:TEXT_STRONG">${esc(p.name)}</b>
						${p.gear ? `<button class="vp-square-btn sm" data-k="bg:CONTROL_SECONDARY_BACKGROUND_DEFAULT fg:CONTROL_SECONDARY_TEXT_DEFAULT" data-n="Plugin settings button" data-go="colors" aria-label="${esc(p.name)} settings">${icon('gear', 20)}</button>` : ''}
						${switchEl(state(p.id), `toggle:${p.id}`)}
					</div>
					<p data-k="fg:TEXT_DEFAULT">${esc(p.text)}</p>
				</div>`).join('')}
				<div class="vp-fab-space"></div>
			</div>
			<button class="vp-fab" data-k="bg:CONTROL_PRIMARY_BACKGROUND_DEFAULT fg:CONTROL_PRIMARY_TEXT_DEFAULT bd:CONTROL_PRIMARY_BORDER_DEFAULT" data-n="Install plugin button" data-open="alert:install" aria-label="Install plugin">${icon('plus', 26)}</button>
		</div>
		${navBar('MOBILE_ACTIONSHEET_BACKGROUND')}`
	},
	actions: {
		toggle: ({ arg, ui }) => {
			ui[arg] = !(ui[arg] ?? plugins.find(p => p.id === arg).on)
			return 'render'
		},
		q: ({ el, ui, api }) => {
			ui.q = el.value
			api.render()
			const input = document.querySelector('.vp-screen .vp-search input')
			input?.focus()
			input?.setSelectionRange(input.value.length, input.value.length)
		},
		na: notInPreview,
	},
}

export const colors = {
	id: 'colors', title: 'Theme colours', group: 'Settings', capture: 'colors',
	render({ ui }) {
		const picked = ui.picked || 'studio'
		const card = (id, name, desc, swatches) => `
			<button class="vp-theme-card" data-act="pick:${id}" data-k="bg:CARD_MUTED_BG" data-n="Theme card">
				<span class="vp-theme-text"><b data-k="fg:TEXT_STRONG">${esc(name)}</b><span data-k="fg:TEXT_MUTED">${esc(desc)}</span><span class="vp-theme-dots">${swatches}</span></span>
				<span class="vp-radio${picked === id ? ' on' : ''}" data-k="${picked === id ? 'bg:REDESIGN_INPUT_CONTROL_SELECTED' : 'bd:RADIO_BORDER_DEFAULT'}" data-n="Radio ${picked === id ? 'selected' : 'unselected'}">${picked === id ? '<i data-k="bg:WHITE"></i>' : ''}</span>
			</button>`
		// The swatches preview the theme's own colours, the way Valenced draws them
		const dots = keys => keys.map(k => `<i data-k="bg:${k}" data-n="Theme swatch"></i>`).join('')
		return `${statusBar('MOBILE_ACTIONSHEET_BACKGROUND', '2:38')}
		<div class="vp-page" data-k="bg:MOBILE_ACTIONSHEET_BACKGROUND" data-n="Colors page">
			${pageHeader('Colors', { trailing: `<button class="vp-square-btn" data-k="bg:CONTROL_SECONDARY_BACKGROUND_DEFAULT fg:CONTROL_SECONDARY_TEXT_DEFAULT bd:CONTROL_SECONDARY_BORDER_DEFAULT" data-n="Background settings button" data-act="bg" aria-label="Background">${icon('gear', 22)}</button>` })}
			<div class="vp-page-scroll" data-scroll="colors">
				${card('discord', 'Discord', 'Default Discord colors.', '<i style="background:#5865f2" data-fixed="Swatch of Discord colours"></i><i style="background:#2c2d32" data-fixed="Swatch"></i><i style="background:#323339" data-fixed="Swatch"></i><i style="background:#fff" data-fixed="Swatch"></i><i style="background:#76aff6" data-fixed="Swatch"></i>')}
				${sectionLabel('Theme studio')}
				${card('studio', 'Your theme', 'The theme you are editing.', dots(['BACKGROUND_BRAND', 'BACKGROUND_BASE_LOWEST', 'CHANNEL_BACKGROUND_DEFAULT', 'TEXT_STRONG', 'TEXT_LINK']))}
				<p class="vp-hint" data-k="fg:TEXT_MUTED">Install a theme plugin to get color themes.</p>
			</div>
		</div>
		${navBar('MOBILE_ACTIONSHEET_BACKGROUND')}`
	},
	actions: {
		pick: ({ arg, ui, api }) => {
			ui.picked = arg
			api.toast('success', arg === 'discord' ? 'Discord colours picked' : 'Your theme picked')
			return 'render'
		},
		bg: notInPreview,
	},
}

/** A profile: your own (You tab) or someone else's, without a Nitro profile theme. */
function profile({ id, own, ui }) {
	const u = users[id] || users.me
	const tab = ui.tab || 'Main'
	return `${statusBar(null, '2:37')}
	<div class="vp-profile" data-k="bg:USER_PROFILE_GRADIENT_BACKGROUND" data-n="Profile background" data-scroll="profile">
		<div class="vp-profile-banner" data-fixed="Profile banner (user content)" style="background:linear-gradient(120deg,hsl(${u.hue} 30% 82%),hsl(${(u.hue + 30) % 360} 25% 70%))"></div>
		<button class="vp-overlay-btn vp-profile-close" data-back data-k="bg:CONTROL_OVERLAY_SECONDARY_BACKGROUND_DEFAULT fg:WHITE" data-n="Close button" aria-label="Close">${icon('close', 22)}</button>
		<div class="vp-profile-avatar" data-k="bg:USER_PROFILE_GRADIENT_BACKGROUND" data-n="Avatar ring">${avatar(u.id, 88)}</div>
		${own ? `<span class="vp-status-bubble" data-k="bg:CUSTOM_STATUS_BUBBLE_BG fg:TEXT_DEFAULT" data-n="Custom status bubble"><span data-k="fg:TEXT_STRONG">${icon('plus', 16)}</span><i>Theming all day</i></span>` : ''}
		<div class="vp-profile-body">
			<h1 data-k="fg:TEXT_STRONG">${esc(u.name)} ${own ? icon('chevronDown', 18) : ''}</h1>
			<p class="vp-profile-user" data-k="fg:TEXT_DEFAULT">${esc(u.username)}${u.pronouns ? ` &bull; ${esc(u.pronouns)}` : ''} ${clanTag(u.tag)}</p>
			<div class="vp-badges" data-k="bg:BACKGROUND_MOD_STRONG" data-n="Badge strip"><span data-fixed="Profile badges">${['#3ba55d', '#f0b232', '#eb459e', '#5865f2', '#00b0f4'].map(c => `<i style="background:${c}"></i>`).join('')}</span><b data-k="fg:TEXT_DEFAULT">+1</b></div>
			${own
				? `<button class="vp-btn-primary" data-k="bg:CONTROL_PRIMARY_BACKGROUND_DEFAULT fg:CONTROL_PRIMARY_TEXT_DEFAULT bd:CONTROL_PRIMARY_BORDER_DEFAULT" data-n="Primary button" data-act="edit">${icon('pencil', 18)}Edit Profile</button>`
				: `<div class="vp-profile-actions"><button class="vp-btn-primary grow" data-k="bg:CONTROL_PRIMARY_BACKGROUND_DEFAULT fg:CONTROL_PRIMARY_TEXT_DEFAULT bd:CONTROL_PRIMARY_BORDER_DEFAULT" data-n="Primary button" data-act="friend">${icon('userPlus', 18)}${ui.requested ? 'Request Sent' : 'Add Friend'}</button><button class="vp-btn-sq" data-k="bg:CONTROL_SECONDARY_BACKGROUND_DEFAULT fg:CONTROL_SECONDARY_TEXT_DEFAULT bd:CONTROL_SECONDARY_BORDER_DEFAULT" data-n="Message button" data-go="dm:${u.id === 'quill' ? 'quill' : 'ren'}" aria-label="Message">${icon('chat', 20)}</button><button class="vp-btn-sq" data-k="bg:CONTROL_SECONDARY_BACKGROUND_DEFAULT fg:CONTROL_SECONDARY_TEXT_DEFAULT bd:CONTROL_SECONDARY_BORDER_DEFAULT" data-n="Call button" data-act="call" aria-label="Call">${icon('phone', 20)}</button></div>`}
			<nav class="vp-tabs" data-k="bb:BORDER_SUBTLE" data-n="Profile tabs">${['Main', 'Board', 'Activity', 'Wishlist'].map(t => `<button data-act="tab:${t}" class="${t === tab ? 'on' : ''}" data-k="fg:${t === tab ? 'TEXT_BRAND' : 'TEXT_MUTED'}">${t}${t === tab ? '<i data-k="bg:BACKGROUND_BRAND" data-n="Tab indicator"></i>' : ''}</button>`).join('')}</nav>
			${tab === 'Main' ? `
			${own ? `<div class="vp-card row" data-k="bg:BACKGROUND_SURFACE_HIGH" data-n="Orbs card"><b data-k="fg:TEXT_STRONG">Orbs Balance</b><span class="vp-orbs" data-k="bg:BACKGROUND_MOD_STRONG fg:TEXT_STRONG" data-n="Orbs pill">${icon('boost', 18)}1,250</span></div>` : ''}
			<div class="vp-card" data-k="bg:BACKGROUND_SURFACE_HIGH" data-n="Activity card">
				<b data-k="fg:TEXT_STRONG">Playing</b>
				<div class="vp-game"><span class="vp-game-art" data-fixed="Game art (content)">M&darr;</span><span><b data-k="fg:TEXT_STRONG">Visual Studio Code</b><small data-k="fg:TEXT_DEFAULT">README.md:84:1</small><small class="vp-elapsed" data-k="fg:TEXT_FEEDBACK_POSITIVE">${icon('games', 14)}53:41</small></span></div>
			</div>
			<h3 data-k="fg:USER_PROFILE_ABOUT_ME_HEADING_TEXT">Bio</h3>
			<p class="vp-bio" data-k="fg:TEXT_STRONG">${md(u.bio || 'Here for the themes.')}</p>
			<p class="vp-bio" data-k="fg:TEXT_STRONG">Plugin repo: <span class="vp-link" data-k="fg:TEXT_LINK" data-n="Link">https://valenced.example/plugins</span></p>
			<p class="vp-bio" data-k="fg:TEXT_STRONG">Secret: <button class="vp-spoiler${ui.spoiler ? ' open' : ''}" data-act="spoiler" data-k="${ui.spoiler ? 'bg:SPOILER_REVEALED_BACKGROUND' : 'bg:SPOILER_HIDDEN_BACKGROUND'}" data-n="${ui.spoiler ? 'Revealed spoiler' : 'Hidden spoiler'}">onyx is the best base</button></p>
			<h3 data-k="fg:USER_PROFILE_ABOUT_ME_HEADING_TEXT">Member Since</h3>
			<p class="vp-since" data-k="fg:TEXT_DEFAULT">${icon('chat', 16)} 3 Jul 2018 &bull; 30 Mar 2026</p>` : `<p class="vp-empty" data-k="fg:TEXT_MUTED">Nothing on ${tab} yet.</p>`}
			<div class="vp-fab-space"></div>
		</div>
	</div>
	${own ? `<nav class="vp-tabbar" data-k="bg:TAB_BAR_BACKGROUND bd:BORDER_MUTED" data-n="Tab bar">
		${[['quests', 'Quests', 'quests', true], ['shop', 'Shop', 'shop'], ['nitro', 'Nitro', 'nitro'], ['settings', 'Settings', 'gear']].map(([id, label, ic, dot]) => `<button data-${id === 'settings' ? 'go="settings"' : 'act="na"'} data-k="fg:TEXT_STRONG" data-n="Tab">${icon(ic, 24)}${dot ? '<i class="vp-dot" data-k="bg:BACKGROUND_FEEDBACK_NOTIFICATION" data-n="Notification dot"></i>' : ''}<span>${label}</span></button>`).join('')}
	</nav>` : ''}
	${navBar('USER_PROFILE_GRADIENT_BACKGROUND')}`
}

const profileActions = {
	tab: ({ arg, ui }) => {
		ui.tab = arg
		return 'render'
	},
	spoiler: ({ ui }) => {
		ui.spoiler = !ui.spoiler
		return 'render'
	},
	edit: notInPreview,
	call: notInPreview,
	na: notInPreview,
	friend: ({ ui, api }) => {
		ui.requested = !ui.requested
		if (ui.requested) api.toast('success', 'Friend request sent')
		return 'render'
	},
}

export const you = {
	id: 'you', title: 'Your profile', group: 'Profiles', capture: 'you',
	render: ({ ui }) => profile({ id: 'me', own: true, ui }),
	actions: profileActions,
}

export const userProfile = {
	id: 'profile', title: 'Member profile', group: 'Profiles', capture: 'you',
	render: ({ ui, params }) => profile({ id: params.id && params.id !== 'me' ? params.id : 'palm', own: params.id === 'me', ui }),
	actions: profileActions,
}

export const inboxPage = {
	id: 'inbox', title: 'Notifications', group: 'Main', capture: 'inbox',
	render({ ui }) {
		const cleared = ui.cleared
		return `${statusBar('BACKGROUND_BASE_LOW', '2:37')}
		<div class="vp-page" data-k="bg:BACKGROUND_BASE_LOW" data-n="Notifications page">
			<header class="vp-page-header" data-k="bg:BACKGROUND_BASE_LOW bb:BORDER_SUBTLE" data-n="Page header">
				<button class="vp-icon-btn" data-back data-k="fg:INTERACTIVE_TEXT_DEFAULT" data-n="Back button" aria-label="Back">${icon('back', 24)}</button>
				<h1 data-k="fg:MOBILE_TEXT_HEADING_PRIMARY">Notifications</h1>
				<span class="vp-header-tools">${['bookmark', 'clock', 'more'].map(i => `<button class="vp-square-btn" data-k="bg:REDESIGN_BUTTON_TERTIARY_BACKGROUND fg:INTERACTIVE_TEXT_DEFAULT" data-n="Header button" data-act="${i === 'more' ? 'clear' : 'na'}" aria-label="${i}">${icon(i, 22)}</button>`).join('')}</span>
			</header>
			<div class="vp-page-scroll" data-scroll="inbox">
				<h2 class="vp-section" data-k="fg:TEXT_SUBTLE">Recent Activity</h2>
				${cleared ? '<p class="vp-empty" data-k="fg:TEXT_MUTED">You are all caught up.</p>' : inbox.map(n => `
				<button class="vp-notif" data-go="chat" data-n="Notification">
					${avatar(n.user, 48, { status: false })}
					<span class="vp-notif-text">
						<span data-k="fg:TEXT_MUTED">${esc(n.text)}</span>
						<span class="vp-notif-quote" data-k="bl:BORDER_SUBTLE fg:TEXT_DEFAULT">${n.quote[0] ? `<span data-k="fg:MENTION_FOREGROUND" data-n="Mention">${esc(n.quote[0])}</span>` : ''}${esc(n.quote[1])}</span>
					</span>
					<small data-k="fg:TEXT_MUTED">${n.time}</small>
				</button>`).join('')}
			</div>
		</div>
		${navBar('BACKGROUND_BASE_LOW')}`
	},
	actions: {
		clear: ({ ui, api }) => {
			ui.cleared = !ui.cleared
			api.toast('success', ui.cleared ? 'Marked all as read' : 'Notifications restored')
			return 'render'
		},
		na: notInPreview,
	},
}
