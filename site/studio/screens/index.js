// Screen registry. To add a screen, write a module exporting { id, title, group, capture, render(ctx), actions }
// and list it here; the editor, inspector and key index pick it up automatically.
// `capture` names the screen in data/keys.json, so the inspector can say whether a key was verified there.
import { home, server, dm } from './main.js'
import { chat, botsChat, forum, search } from './chat.js'
import { settings, pluginsPage, colors, you, userProfile, inboxPage } from './pages.js'
import { components } from './components.js'
import { msgmenu, alert, guildmenu, emoji } from './overlays.js'

const byId = list => Object.fromEntries(list.map(s => [s.id, s]))

export const screens = byId([home, server, inboxPage, chat, botsChat, dm, forum, search, you, userProfile, settings, pluginsPage, colors, components])
export const overlays = byId([msgmenu, emoji, alert, guildmenu])
