/**
 * Starter theme. Copy this folder into the plugin template's `themes/` folder, rename the ID in
 * manifest.json, change the colours, and build with `./gradlew packageAllPlugins`.
 *
 * Only `dark` (Ash) is filled in. Add `darker` (Dark), `light` and `midnight` (Onyx) the same way;
 * bases you leave out keep Discord's colours. See KEYS.md for what every key paints.
 */

/// <reference types="@valenced/themes-api" />

import type { ThemeColors } from '@valenced/themes-api/types'

const colors: ThemeColors = {
	semantic: {
		dark: {
			// Backgrounds, darkest to lightest
			BACKGROUND_BASE_LOWEST: '#16131f', // server rail
			BACKGROUND_BASE_LOWER: '#1c1827', // behind the user panel and chat box
			BACKGROUND_BASE_LOW: '#211c2e', // notifications page
			PANEL_BG: '#1c1827', // DM list and channel list
			CHANNEL_BACKGROUND_DEFAULT: '#1c1827', // chat
			STANDALONE_CHANNEL_CONTENT_BACKGROUND: '#1c1827', // channel header
			MOBILE_ACTIONSHEET_BACKGROUND: '#211c2e', // settings and other pages on top
			BACKGROUND_SURFACE_HIGH: '#2a2439', // raised cards
			BACKGROUND_SURFACE_HIGHEST: '#2f2941', // popup menus
			CARD_MUTED_BG: '#2a2439', // grouped settings rows
			TABLEROW_BACKGROUND_DEFAULT: '#2a2439', // plugin cards
			EMBED_BACKGROUND: '#241f33', // embeds
			MOBILE_ALERT_BACKGROUND_DEFAULT: '#241f33', // alerts
			MOBILE_ACTIONSHEET_GRADIENT_BACKGROUND_DEFAULT: '#241f33', // message menu
			MOBILE_EXPRESSION_PICKER_BACKGROUND_DEFAULT: '#211c2e', // emoji picker

			// Chat box
			MOBILE_CHATINPUT_BACKGROUND_DEFAULT: '#2a2439',
			MOBILE_CHATINPUT_BACKGROUND_ACTIVE: '#2f2941',
			INPUT_BACKGROUND_DEFAULT: '#1c1827', // search boxes

			// Text
			MOBILE_TEXT_HEADING_PRIMARY: '#ffffff', // page titles
			TEXT_STRONG: '#f1ecff', // message text, row titles
			TEXT_DEFAULT: '#ddd5f3', // descriptions
			TEXT_SUBTLE: '#b3a9cc', // section headers
			TEXT_MUTED: '#9a90b5', // timestamps, previews
			TEXT_LINK: '#9cc4ff',
		},
	},
	raw: {
		// Raw colours apply to every base. BLURPLE_50 is Discord's brand colour:
		// main buttons, switches, the selected rail button.
		BLURPLE_50: '#8b5cf6',
	},
}

export default plugin({
	// Registering in preInit means a picked theme is ready before Discord draws anything
	preInit({ themes }) {
		themes.registerGroup('my-themes', {
			name: 'My Themes',
		})

		themes.registerTheme('my-themes', 'dusk', {
			name: 'Dusk',
			description: 'A starter theme. Make it yours.',
			getColors: () => colors,
		})
	},
})
