import { icon, rowGroup, sectionLabel } from './common.js'

const statuses = [
	['Online', 'ONLINE', '<circle cx="12" cy="12" r="8"/>'],
	['Idle', 'IDLE', '<path d="M12 4a8 8 0 1 1-8 8 7 7 0 0 0 8-8Z"/>'],
	['Do Not Disturb', 'DND', '<path fill-rule="evenodd" d="M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM8 10a2 2 0 0 0 0 4h8a2 2 0 0 0 0-4Z"/>'],
	['Invisible', 'OFFLINE', '<path fill-rule="evenodd" d="M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z"/>'],
]
const developerRows = [['rules', 'Analytics'], ['refresh', 'Build Override'], ['wrench', 'Experiment Overrides'], ['file', 'Logging Flags'], ['account', 'Generated Test Users'], ['external', 'Data Storage'], ['palette', 'Design Systems'], ['close', 'Dismissible Contents']]

// Visually verified with semantic overrides on Discord 352.6, across all four bases.
export const statusSheet = {
	id: 'status', title: 'Change Online Status', group: 'Menus and sheets', capture: 'status', screen: 'server',
	render({ ui }) {
		return `<div class="vp-scrim" data-close data-k="bg:BACKGROUND_SCRIM" data-n="Scrim"></div>
		<section class="vp-sheet vp-status-sheet" data-k="bg:MOBILE_ACTIONSHEET_GRADIENT_BACKGROUND_DEFAULT" data-n="Online status sheet">
			<i class="vp-handle" data-k="bg:BACKGROUND_MOD_STRONG" data-n="Sheet handle"></i>
			<div class="vp-status-scroll" data-scroll="status-sheet">
				<h1 data-k="fg:MOBILE_TEXT_HEADING_PRIMARY">Change Online Status</h1>
				${sectionLabel('Online Status')}
				<div class="vp-rowgroup" role="radiogroup" aria-label="Online status (preview)" data-k="bg:CARD_MUTED_BG" data-n="Status rows">${statuses.map(([label, key, glyph], i) => {
					const selected = (ui.selected ?? 'Idle') === label
					return `<button class="vp-row" role="radio" aria-checked="${selected}" data-act="select:${label}"><span class="vp-row-icon" data-k="fg:TEXT_STATUS_${key}" data-n="${label} symbol"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${glyph}</svg></span><span class="vp-row-label${i < 3 ? ' divided' : ''}" data-k="bb:BORDER_SUBTLE" data-n="Row divider"><span data-k="fg:TEXT_STRONG">${label}</span><span class="vp-radio" data-k="${selected ? 'bg:REDESIGN_INPUT_CONTROL_SELECTED' : 'bd:RADIO_BORDER_DEFAULT'}" data-n="${selected ? 'Selected radio' : 'Radio outline'}">${selected ? '<i data-k="bg:WHITE" data-n="Radio dot"></i>' : ''}</span></span></button>`
				}).join('')}</div>
				<button class="vp-row vp-custom-status" data-act="detail" data-k="bg:TABLEROW_BACKGROUND_DEFAULT" data-n="Custom status row"><span class="vp-row-icon" data-k="fg:INTERACTIVE_ICON_DEFAULT" data-n="Custom status emoji icon">${icon('emoji', 24)}</span><span data-k="fg:TEXT_STRONG">Set a custom status</span></button>
				${sectionLabel('Developer Tools')}
				${rowGroup(developerRows.map(([icon, label]) => ({ icon, label, act: 'detail' })))}
			</div>
		</section><div class="vp-nav-scrim" data-k="bg:ANDROID_NAVIGATION_SCRIM_BACKGROUND" data-n="Navigation bar while a sheet is open"><i data-fixed="Android gesture handle (system)"></i></div>`
	},
	actions: {
		select: ({ arg, ui }) => { ui.selected = arg; return 'render' },
		detail: ({ api }) => api.toast('info', 'Not available in the preview'),
	},
}
