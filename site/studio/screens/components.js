// Discord's shared controls, as in the "Theme reference" captures. Press and hold a control to see its pressed
// colours; those come from data-k-press, so the inspector lists them too.
import { esc, icon, navBar, pageHeader, statusBar } from './common.js'

const btn = (label, keys, press, cls = '') => `<button class="vp-ref-btn ${cls}" data-k="${keys}" ${press ? `data-k-press="${press}"` : ''} data-n="${esc(label)} button">${label}</button>`

const badge = (label, base) => `<div class="vp-ref-line"><span data-k="fg:TEXT_STRONG">${label.toLowerCase()}</span><span class="vp-ref-badge" data-k="bg:BADGE_${base}_BACKGROUND bd:BADGE_${base}_BORDER fg:BADGE_${base}_TEXT" data-n="${label} badge">${label}</span></div>`

const section = (title, body) => `<section class="vp-ref" data-k="bg:MOBILE_ALERT_BACKGROUND_DEFAULT" data-n="Reference card"><h2 data-k="fg:MOBILE_TEXT_HEADING_PRIMARY">${title}</h2>${body}</section>`

export const components = {
	id: 'components', title: 'Component reference', group: 'Components', capture: 'component-buttons',
	render({ ui }) {
		const tg = ui.toggles || { ps: true, ss: true }
		const ic = ui.icons || { def: true, crit: true, only: true }
		return `${statusBar('MOBILE_ACTIONSHEET_BACKGROUND', '7:42')}
		<div class="vp-page" data-k="bg:MOBILE_ACTIONSHEET_BACKGROUND" data-n="Component page">
			${pageHeader('Theme reference')}
			<div class="vp-page-scroll" data-scroll="components">
				<p class="vp-hint" data-k="fg:TEXT_MUTED">Discord components. Press and hold to see pressed colours.</p>
				${section('Buttons', `
					${btn('primary', 'bg:CONTROL_PRIMARY_BACKGROUND_DEFAULT fg:CONTROL_PRIMARY_TEXT_DEFAULT bd:CONTROL_PRIMARY_BORDER_DEFAULT', 'bg:CONTROL_PRIMARY_BACKGROUND_ACTIVE bd:CONTROL_PRIMARY_BORDER_ACTIVE')}
					${btn('secondary', 'bg:CONTROL_SECONDARY_BACKGROUND_DEFAULT fg:CONTROL_SECONDARY_TEXT_DEFAULT bd:CONTROL_SECONDARY_BORDER_DEFAULT', 'bg:CONTROL_SECONDARY_BACKGROUND_ACTIVE bd:CONTROL_SECONDARY_BORDER_ACTIVE')}
					${btn('destructive', 'bg:CONTROL_CRITICAL_PRIMARY_BACKGROUND_DEFAULT fg:CONTROL_CRITICAL_PRIMARY_TEXT_DEFAULT bd:CONTROL_CRITICAL_PRIMARY_BORDER_DEFAULT', 'bg:CONTROL_CRITICAL_PRIMARY_BACKGROUND_ACTIVE bd:CONTROL_CRITICAL_PRIMARY_BORDER_ACTIVE')}
					${btn('active', 'bg:CONTROL_CONNECTED_BACKGROUND_DEFAULT fg:CONTROL_CONNECTED_TEXT_DEFAULT bd:CONTROL_CONNECTED_BORDER_DEFAULT', 'bg:CONTROL_CONNECTED_BACKGROUND_ACTIVE bd:CONTROL_CONNECTED_BORDER_ACTIVE')}
					${btn('expressive', 'fg:CONTROL_EXPRESSIVE_TEXT_DEFAULT', '', 'expressive')}
					${btn('primary-overlay', 'bg:CONTROL_OVERLAY_PRIMARY_BACKGROUND_DEFAULT fg:CONTROL_OVERLAY_PRIMARY_TEXT_DEFAULT bd:CONTROL_OVERLAY_PRIMARY_BORDER_DEFAULT', 'bg:CONTROL_OVERLAY_PRIMARY_BACKGROUND_ACTIVE')}
					${btn('secondary-overlay', 'bg:CONTROL_OVERLAY_SECONDARY_BACKGROUND_DEFAULT fg:CONTROL_OVERLAY_SECONDARY_TEXT_DEFAULT bd:CONTROL_OVERLAY_SECONDARY_BORDER_DEFAULT', 'bg:CONTROL_OVERLAY_SECONDARY_BACKGROUND_ACTIVE')}
					${btn('critical-secondary', 'bg:CONTROL_CRITICAL_SECONDARY_BACKGROUND_DEFAULT fg:CONTROL_CRITICAL_SECONDARY_TEXT_DEFAULT bd:CONTROL_CRITICAL_SECONDARY_BORDER_DEFAULT', 'bg:CONTROL_CRITICAL_SECONDARY_BACKGROUND_ACTIVE bd:CONTROL_CRITICAL_SECONDARY_BORDER_ACTIVE')}
					${btn('icon-only', 'fg:CONTROL_ICON_ONLY_ICON_DEFAULT', 'bg:CONTROL_ICON_ONLY_BACKGROUND_ACTIVE bd:CONTROL_ICON_ONLY_BORDER_ACTIVE', 'plain')}
					${btn('premium-primary', 'x:REDESIGN_BUTTON_PREMIUM_PRIMARY_PURPLE_FOR_GRADIENT x:REDESIGN_BUTTON_PREMIUM_PRIMARY_PURPLE_FOR_GRADIENT_2 fg:WHITE', '', 'premium')}
					${btn('premium-basic', 'x:@PREMIUM_TIER_0_PURPLE_FOR_GRADIENTS x:@PREMIUM_TIER_0_BLUE_FOR_GRADIENTS_2 fg:WHITE', 'x:REDESIGN_BUTTON_PREMIUM_PRIMARY_PRESSED_BACKGROUND', 'premium-basic')}
				`)}
				${section('Checks', `
					<button class="vp-check-row" data-act="check:a"><span class="vp-check${ui.a ? ' on' : ''}" data-k="${ui.a ? 'bg:CHECKBOX_BACKGROUND_SELECTED_DEFAULT bd:CHECKBOX_BORDER_SELECTED_DEFAULT fg:CHECKBOX_ICON_ACTIVE' : 'bg:CHECKBOX_BACKGROUND_DEFAULT bd:CHECKBOX_BORDER_DEFAULT'}" data-n="Checkbox">${ui.a ? icon('check', 16) : ''}</span><span data-k="fg:TEXT_STRONG">${ui.a ? 'Checked' : 'Unchecked'}</span></button>
					<button class="vp-check-row" data-act="check:b"><span class="vp-check${!ui.b ? ' on' : ''}" data-k="${!ui.b ? 'bg:CHECKBOX_BACKGROUND_SELECTED_DEFAULT bd:CHECKBOX_BORDER_SELECTED_DEFAULT fg:CHECKBOX_ICON_ACTIVE' : 'bg:CHECKBOX_BACKGROUND_DEFAULT bd:CHECKBOX_BORDER_DEFAULT'}" data-n="Checkbox">${!ui.b ? icon('check', 16) : ''}</span><span data-k="fg:TEXT_STRONG">${!ui.b ? 'Checked' : 'Unchecked'}</span></button>
					<p class="vp-ref-label" data-k="fg:TEXT_STRONG">Radio: unselected / selected</p>
					<div class="vp-radios">${[0, 1].map(i => `<button data-act="radio:${i}" class="vp-radio${(ui.radio ?? 1) === i ? ' on' : ''}" data-k="${(ui.radio ?? 1) === i ? 'bg:REDESIGN_INPUT_CONTROL_SELECTED' : 'bd:RADIO_BORDER_DEFAULT'}" data-n="Radio">${(ui.radio ?? 1) === i ? '<i data-k="bg:WHITE"></i>' : ''}</button>`).join('')}</div>
					<p class="vp-ref-label" data-k="fg:TEXT_STRONG">Slider</p>
					<div class="vp-slider" data-k="bg:SLIDER_TRACK_BACKGROUND" data-n="Slider track"><i class="vp-slider-fill" data-k="bg:REDESIGN_INPUT_CONTROL_SELECTED" data-n="Slider fill" style="width:${ui.slider ?? 40}%"></i><input type="range" min="0" max="100" value="${ui.slider ?? 40}" data-input="slider" aria-label="Slider"><i class="vp-slider-thumb" data-k="bg:WHITE" data-n="Slider thumb" style="left:${ui.slider ?? 40}%"></i></div>
				`)}
				${section('Inputs', `
					<p class="vp-ref-label" data-k="fg:TEXT_STRONG">Normal field</p>
					<input class="vp-field" data-k="bg:INPUT_BACKGROUND_DEFAULT bd:INPUT_BORDER_DEFAULT fg:INPUT_TEXT_DEFAULT" data-n="Text field" value="Example text" aria-label="Normal field">
					<p class="vp-ref-label" data-k="fg:TEXT_STRONG">Error field</p>
					<input class="vp-field" data-k="bg:INPUT_BACKGROUND_DEFAULT bd:INPUT_BORDER_ERROR_DEFAULT fg:INPUT_TEXT_ERROR_DEFAULT" data-n="Text field with error" value="Invalid example" aria-label="Error field">
					<p class="vp-field-error" data-k="fg:TEXT_FEEDBACK_CRITICAL" data-n="Error message">${icon('error', 14)}Example validation error</p>
				`)}
				${section('Toggles', `
					${[['ps', 'primary'], ['ss', 'secondary']].map(([id, label]) => `<button class="vp-ref-btn" data-act="toggle:${id}" data-k="${tg[id] ? 'bg:TOGGLEBUTTON_BACKGROUND_SELECTED bd:TOGGLEBUTTON_BORDER_SELECTED fg:TEXT_STRONG' : 'bg:CONTROL_SECONDARY_BACKGROUND_DEFAULT bd:CONTROL_SECONDARY_BORDER_DEFAULT fg:CONTROL_SECONDARY_TEXT_DEFAULT'}" data-k-press="${tg[id] ? 'bg:TOGGLEBUTTON_BACKGROUND_SELECTED_ACTIVE' : 'bg:CONTROL_SECONDARY_BACKGROUND_ACTIVE'}" data-n="Text toggle ${tg[id] ? 'selected' : 'unselected'}">${label} ${tg[id] ? 'selected' : 'unselected'}</button>`).join('')}
					<div class="vp-icon-toggles">
						<button data-act="icon:def" data-k="${ic.def ? 'bg:TOGGLEBUTTON_BACKGROUND_SELECTED bd:TOGGLEBUTTON_BORDER_SELECTED fg:TOGGLEBUTTON_ICON_SELECTED' : 'fg:TOGGLEBUTTON_ICON_DEFAULT'}" data-k-press="${ic.def ? 'bg:TOGGLEBUTTON_BACKGROUND_SELECTED_HOVER fg:TOGGLEBUTTON_ICON_ACTIVE' : 'bd:TOGGLEBUTTON_BORDER_ACTIVE'}" data-n="Icon toggle">${icon('heart', 22)}</button>
						<button data-act="icon:crit" data-k="${ic.crit ? 'bg:TOGGLEBUTTON_CRITICAL_BACKGROUND_SELECTED fg:TOGGLEBUTTON_CRITICAL_ICON_SELECTED' : 'fg:TOGGLEBUTTON_CRITICAL_ICON_DEFAULT'}" data-k-press="bg:TOGGLEBUTTON_CRITICAL_BACKGROUND_SELECTED_HOVER bd:TOGGLEBUTTON_CRITICAL_BORDER_ACTIVE fg:TOGGLEBUTTON_CRITICAL_ICON_ACTIVE" data-n="Critical icon toggle">${icon('heart', 22)}</button>
						<button data-act="icon:only" data-k="${ic.only ? 'fg:TOGGLEBUTTON_ICON_ONLY_ICON_SELECTED' : 'fg:TOGGLEBUTTON_ICON_ONLY_ICON_DEFAULT'}" data-k-press="bd:CONTROL_ICON_ONLY_BORDER_ACTIVE fg:TOGGLEBUTTON_ICON_ONLY_ICON_ACTIVE" data-n="Icon-only toggle">${icon('heart', 22)}</button>
					</div>
				`)}
				${section('Badges', ['Primary', 'Secondary', 'Critical', 'Success', 'Warning', 'Expressive', 'Inverted', 'Notification'].map(b => badge(b, b.toUpperCase())).join('') + `
					<div class="vp-ref-line"><span data-k="fg:TEXT_STRONG">premium</span><span class="vp-ref-badge premium" data-k="x:BADGE_PREMIUM_BACKGROUND_GRADIENT_START fg:BADGE_PREMIUM_TEXT" data-n="Premium badge">NITRO</span></div>
					<div class="vp-rarity">
						<span data-k="bg:BADGE_COMMON_BACKGROUND bd:BADGE_COMMON_BORDER fg:BADGE_COMMON_TEXT" data-n="Common badge">Common</span>
						<span data-k="bg:BADGE_RARE_BACKGROUND bd:BADGE_RARE_BORDER_GRADIENT_START fg:BADGE_RARE_TEXT" data-n="Rare badge">Rare</span>
						<span data-k="bg:BADGE_EPIC_BACKGROUND bd:BADGE_EPIC_BORDER_GRADIENT_START fg:BADGE_EPIC_TEXT" data-n="Epic badge">Epic</span>
						<span data-k="bg:BADGE_MYTHIC_BACKGROUND bd:BADGE_MYTHIC_TEXT fg:BADGE_MYTHIC_TEXT" data-n="Mythic badge">Mythic</span>
					</div>`)}
				${section('Cards and notices', `
					<div class="vp-ref-card" data-k="bd:BORDER_STRONG fg:TEXT_DEFAULT" data-n="Card with strong outline">Card with a strong outline</div>
					${[['info', 'BLUE_345', 'Information notice'], ['success', 'GREEN_400', 'Positive notice'], ['warning', 'YELLOW_300', 'Warning notice'], ['error', 'RED_400', 'Critical notice']].map(([ic, raw, label]) => `<div class="vp-notice" data-k="bd:@${raw}" data-n="${label}"><span data-k="fg:@${raw}">${icon(ic, 18)}</span><span data-k="fg:TEXT_DEFAULT">${label}</span></div>`).join('')}
					<div class="vp-ref-pair">
						${btn('Show success', 'bg:CONTROL_SECONDARY_BACKGROUND_DEFAULT fg:CONTROL_SECONDARY_TEXT_DEFAULT bd:CONTROL_SECONDARY_BORDER_DEFAULT', '', 'half" data-act="toast:success')}
						${btn('Show error', 'bg:CONTROL_SECONDARY_BACKGROUND_DEFAULT fg:CONTROL_SECONDARY_TEXT_DEFAULT bd:CONTROL_SECONDARY_BORDER_DEFAULT', '', 'half" data-act="toast:critical')}
					</div>
				`)}
			</div>
		</div>
		${navBar('MOBILE_ACTIONSHEET_BACKGROUND')}`
	},
	actions: {
		check: ({ arg, ui }) => {
			ui[arg] = !ui[arg]
			return 'render'
		},
		radio: ({ arg, ui }) => {
			ui.radio = +arg
			return 'render'
		},
		toggle: ({ arg, ui }) => {
			ui.toggles = { ps: true, ss: true, ...ui.toggles }
			ui.toggles[arg] = !ui.toggles[arg]
			return 'render'
		},
		icon: ({ arg, ui }) => {
			ui.icons = { def: true, crit: true, only: true, ...ui.icons }
			ui.icons[arg] = !ui.icons[arg]
			return 'render'
		},
		slider: ({ el, ui }) => {
			ui.slider = +el.value
			const wrap = el.closest('.vp-slider')
			wrap.querySelector('.vp-slider-fill').style.width = el.value + '%'
			wrap.querySelector('.vp-slider-thumb').style.left = el.value + '%'
		},
		toast: ({ arg, api }) => api.toast(arg, arg === 'success' ? 'Example success notification' : 'Example error notification'),
	},
}
