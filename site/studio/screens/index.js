import { quests, questFilters, questMenu, questWhy, shop, nitro, nitroBadgeSheet } from './commerce.js'
// Screen registry. To add a screen, write a module exporting { id, title, group, capture, render(ctx), actions }
// and list it here; the editor, inspector and key index pick it up automatically.
// `capture` names the screen in data/keys.json, so the inspector can say whether a key was verified there.
import { home, server, dm } from './main.js'
import { appearance, discordTheme, webBrowser, advanced } from './settings.js'
import { settingsPages, sensitiveFilterSheet, typingTextSheet, typingAnimationSheet, inputModeSheet, addConnectionSheet } from './settings-pages.js'
import { chat, botsChat, embedExamples, embedOverview, chatExamples, threadChat, channelInfo, forum, search } from './chat.js'
import { settings, pluginsPage, colors, you, userProfile, inboxPage } from './pages.js'
import { components } from './components.js'
import { msgmenu, alert, guildmenu, emoji } from './overlays.js'
import { statusSheet } from './status.js'
import { attach, gift, searchfilter, serverinfo, voice } from './more.js'
import { popupsToasts, popupsBanner } from './popups.js'

const byId = list => Object.fromEntries(list.map(s => [s.id, s]))

export const screens = byId([home, server, inboxPage, chat, botsChat, embedExamples, embedOverview, chatExamples, threadChat, dm, forum, search, channelInfo, you, userProfile, quests, shop, nitro, settings, pluginsPage, colors, appearance, discordTheme, webBrowser, advanced, ...settingsPages, components, popupsToasts, popupsBanner])
export const overlays = byId([statusSheet, nitroBadgeSheet, questMenu, questWhy, questFilters, sensitiveFilterSheet, typingTextSheet, typingAnimationSheet, inputModeSheet, addConnectionSheet, msgmenu, emoji, alert, guildmenu, voice, attach, gift, searchfilter, serverinfo])
