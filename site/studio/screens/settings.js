// Layout checked against the local Discord 352.6 emulator references.
// A layout reference alone does not verify colour-key bindings.
import { settingsCopy as copy } from './settings-copy.js'
import { BASE_NAMES } from '../store.js'
import { avatar } from '../mock.js'
import { esc, icon, navBar, pageHeader, sectionLabel, sliderEl, statusBar, switchEl, updateSlider } from './common.js'

const toggle = (label, description, key, ui, initial = false) => `<div class="vp-setting-control" data-k="bg:CARD_MUTED_BG"><span><span data-k="fg:TEXT_STRONG">${esc(label)}</span>${description ? `<small data-k="fg:TEXT_SUBTLE">${esc(description)}</small>` : ''}</span>${switchEl(ui[key] ?? initial, `toggle:${key}`)}</div>`
const radio = (label, value, selected, action) => `<button class="vp-setting-control" data-act="${action}:${value}" data-k="bg:CARD_MUTED_BG fg:TEXT_STRONG"><span>${esc(typeof label === 'string' ? label : label.label)}${label.description ? `<small data-k="fg:TEXT_SUBTLE">${esc(label.description)}</small>` : ''}</span><span class="vp-radio${selected === value ? ' on' : ''}" data-k="${selected === value ? 'bg:REDESIGN_INPUT_CONTROL_SELECTED' : 'bd:RADIO_BORDER_DEFAULT'}">${selected === value ? '<i data-k="bg:WHITE"></i>' : ''}</span></button>`
const page = (id, title, body) => `${statusBar('MOBILE_ACTIONSHEET_BACKGROUND')}<div class="vp-page" data-k="bg:MOBILE_ACTIONSHEET_BACKGROUND">${pageHeader(title)}<div class="vp-page-scroll" data-scroll="${id}">${body}</div></div>${navBar('MOBILE_ACTIONSHEET_BACKGROUND')}`
const group = body => `<div class="vp-setting-group">${body}</div>`
const hint = text => `<p class="vp-hint" data-k="fg:TEXT_SUBTLE">${esc(text)}</p>`

export const webBrowser = {
	id: 'web-browser', title: 'Web Browser', group: 'Settings', capture: null,
	render({ ui }) { return page('web-browser', 'Web Browser', sectionLabel('Web Browser') + group(['In-App Browser', 'External Browser'].map((label, i) => radio(label, i, ui.browser ?? 0, 'browser')).join(''))) },
	actions: { browser: ({ arg, ui }) => { ui.browser = Number(arg); return 'render' } },
}

export const advanced = {
	id: 'advanced', title: 'Advanced', group: 'Settings', capture: null,
	render({ ui }) {
		return page('advanced', 'Advanced', sectionLabel('General') + group(toggle('Developer Mode', '', 'developer', ui, true)) + hint('Developer Mode exposes context menu items helpful for people writing apps using the Discord API.') + sectionLabel('LaunchPad') + group(copy.advanced.LaunchPad.options.map((label, i) => radio(label, i, ui.launchpad ?? 3, 'launchpad')).join('')) + hint('Enables an experimental feature for faster navigation through the app. Accessible globally with a gesture or pull-tab element.'))
	},
	actions: {
		toggle: ({ ui }) => { ui.developer = !(ui.developer ?? true); return 'render' },
		launchpad: ({ arg, ui }) => { ui.launchpad = Number(arg); return 'render' },
	},
}

export const appearance = {
	id: 'appearance', title: 'Appearance', group: 'Settings', capture: null,
	render({ ui, base }) {
		return page('appearance', 'Appearance', `${sectionLabel('Theme')}
			<div class="vp-setting-group">
				${toggle('Same as Device Theme', 'Match your device’s light or dark mode.', 'device', ui)}
				<button class="vp-setting-control" data-go="discord-theme" data-k="bg:CARD_MUTED_BG fg:TEXT_STRONG"><span>Theme</span><small data-k="fg:TEXT_MUTED">${BASE_NAMES[base]} ›</small></button>
				${toggle('Sync across clients.', 'Turning this on will override your selected theme on all clients, including desktop and browser.', 'sync', ui)}
			</div>
			${sectionLabel('Zoom level')}
			<div class="vp-setting-group">
				<div class="vp-setting-slider" data-k="bg:CARD_MUTED_BG fg:TEXT_STRONG"><label for="vp-zoom">Zoom level <output>${ui.zoom ?? 100}%</output></label><div class="vp-slider-controls"><button data-act="adjust:-10" aria-label="Decrease Zoom level">&minus;</button>${sliderEl({ id: 'vp-zoom', label: 'Zoom level', value: ui.zoom ?? 100, min: 80, max: 140, step: 10, action: 'zoom', suffix: '%' })}<button data-act="adjust:10" aria-label="Increase Zoom level">+</button></div><button class="vp-btn-secondary" data-act="reset">Reset to default</button></div>
				${toggle('Classic chat text size', 'Uses a slightly smaller font size for the chat text when enabled.', 'classic', ui)}
			</div>
			${sectionLabel('DM List Message Previews')}
			<div class="vp-setting-group">${[['all', 'All Messages'], ['unread', 'Unread DMs only'], ['none', 'None']].map(([value, label]) => radio(label, value, ui.previews ?? 'all', 'previews')).join('')}</div>
${group(toggle('Show games in autocomplete results', '', 'games', ui, true)) + group(toggle('Show Favourites server', '', 'favourites', ui, true)) + hint('Your Favourites stay saved, even if you toggle this off.')}<button class="vp-hint" data-act="learn" data-k="fg:TEXT_LINK">Learn more</button>
${sectionLabel('DM List Activity Cards')}${group(toggle('Disable Activity Cards', '', 'activityCards', ui))}
${sectionLabel('Search')}${group(toggle('Show exact search result counts', '', 'exactCounts', ui))}`)
	},
	actions: {
		toggle: ({ arg, ui }) => { ui[arg] = !(ui[arg] ?? ['games', 'favourites'].includes(arg)); return 'render' },
		previews: ({ arg, ui }) => { ui.previews = arg; return 'render' },
		zoom: ({ el, ui }) => { ui.zoom = updateSlider(el) },
        adjust: ({arg, ui}) => { ui.zoom = Math.max(80, Math.min(140, (ui.zoom ?? 100) + Number(arg))); return 'render' },
        learn: ({api}) => api.go('setting-detail', {id:'Favourites'}),
		reset: ({ ui }) => { ui.zoom = 100; return 'render' },
	},
}

export const discordTheme = {
	id: 'discord-theme', title: 'Discord theme', group: 'Settings', capture: null,
	render({ base }) {
		const messages = [
			['nova', 'Nova', 'Have a lovely weekend!', '11:55', true],
			['oak', 'Garden club', 'Oakley: Shall we meet at four?', '11:55', true],
			['ren', 'Ren', 'I?ll add the notes to our channel.', '11:58', false],
			['mika', 'Sketch night', 'Mika: The new brushes look great.', '12:00', false],
			['lumen', 'Lumen', 'What time works for everyone?', '12:00', false],
			['quill', 'Weekend plans', 'Quill: See you by the fountain!', '11:58', false],
		]
		return `${statusBar('BACKGROUND_BASE_LOW')}<div class="vp-theme-picker" data-k="bg:BACKGROUND_BASE_LOW"><header class="vp-theme-picker-header"><button class="vp-icon-btn" data-back aria-label="Back" data-k="fg:TEXT_STRONG">${icon('back',24)}</button><h1 data-k="fg:TEXT_STRONG">App Theme</h1></header>
			<div class="vp-theme-sample" data-k="bg:PANEL_BG bd:APP_FRAME_BORDER"><h2 data-k="fg:TEXT_STRONG">Messages</h2><div class="vp-theme-sample-activity" data-k="bg:CARD_SECONDARY_BACKGROUND_DEFAULT bd:BORDER_SUBTLE"><span class="vp-theme-game-art" data-fixed="Fictional game artwork">${icon('games',32)}</span><span><b data-k="fg:TEXT_STRONG">Nova, Ren and 3 others</b><small data-k="fg:TEXT_MUTED">Sketch Party</small></span></div>${messages.map(([user,name,message,time,unread])=>`<div class="vp-theme-sample-message">${unread ? '<i data-k="bg:BACKGROUND_BRAND"></i>' : ''}${avatar(user,48)}<span><b data-k="fg:${unread ? 'TEXT_STRONG' : 'MESSAGES_ITEM_CHANNEL_TEXT_DEFAULT'}">${esc(name)}</b><small data-k="fg:TEXT_MUTED">${esc(message)}</small></span><time data-k="fg:TEXT_MUTED">${time}</time></div>`).join('')}</div>
			<div class="vp-theme-options" role="radiogroup" aria-label="App theme">${[['light','#ffffff'],['dark','#323339'],['darker','#1c1d22'],['midnight','#000000']].map(([value,colour])=>`<button class="vp-theme-swatch${base===value ? ' on' : ''}" role="radio" aria-checked="${base===value}" aria-label="${BASE_NAMES[value]}" data-act="theme:${BASE_NAMES[value]}" style="--swatch:${colour}" data-fixed="Theme palette preview"></button>`).join('')}</div><h2 class="vp-theme-selected" data-k="fg:TEXT_STRONG">${BASE_NAMES[base]}</h2><p class="vp-theme-change-note" data-k="fg:TEXT_MUTED">You can always change this later!</p>
		</div>${navBar('BACKGROUND_BASE_LOW')}`
	},
	actions: { theme: ({ arg, api }) => { api.setBase(Object.keys(BASE_NAMES).find(base => BASE_NAMES[base] === arg)); return 'render' } },
}
