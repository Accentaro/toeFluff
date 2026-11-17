// Fictional content in layouts observed on Discord 352.6. Bindings await individual colour QA.
import { avatar, esc, icon, navBar, pageHeader, sectionLabel, statusBar } from './common.js'

const button = (label, action, primary = false) => `<button class="vp-btn-${primary ? 'primary' : 'secondary'}" data-act="${action}" data-k="bg:CONTROL_${primary ? 'PRIMARY' : 'SECONDARY'}_BACKGROUND_DEFAULT fg:CONTROL_${primary ? 'PRIMARY' : 'SECONDARY'}_TEXT_DEFAULT bd:CONTROL_${primary ? 'PRIMARY' : 'SECONDARY'}_BORDER_DEFAULT">${label}</button>`
const header = title => pageHeader(title, { trailing: `<span class="vp-commerce-balance" data-k="bg:BACKGROUND_MOD_STRONG fg:TEXT_STRONG" data-n="Orbs balance">${icon('boost', 18)}1,250</span>` })
const commerceImage = (name, label, cls = '') => `<img class="${cls}" src="${new URL(`../../assets/commerce-reference/${name}.webp`, import.meta.url).href}" alt="${esc(label)}" data-fixed="Static artwork from genuine emulator reference">`
const art = (name, hue) => `<div class="vp-commerce-art" style="--art-hue:${hue}" data-fixed="Fictional promotional artwork"><span>${esc(name)}</span>${icon('star', 64)}</div>`
const questData = [
	{ title: 'STARFALL QUEST', game: 'Starfall Tactics', studio: 'Northlight Games', reward: '200 Orbs', art: 'quest-city-banner', rewardType: 'Orbs', questType: 'Watch', recent: 2, expiry: 1, ready: true },
	{ title: 'GARDEN TRAILS QUEST', game: 'Garden Trails', studio: 'Fern Studio', reward: 'A Garden Trails Avatar Decoration', art: 'quest-monster-banner', rewardType: 'Avatar Decoration', questType: 'Watch', recent: 3, expiry: 17 },
	{ title: 'LUNAR DRIFT QUEST', game: 'Lunar Drift', studio: 'Moonbeam Games', reward: '200 Orbs', art: 'quest-sunset-banner', rewardType: 'Orbs', questType: 'Watch', recent: 1, expiry: 2 },
]

const questSorts = ['Suggested', 'Most Recent', 'Expiring Soon', 'Started']
const questRewards = ['Orbs', 'Avatar Decoration', 'In-Game Rewards']
const questTypes = ['Play', 'Watch']
const defaultQuestFilters = () => ({ sort:'Suggested', rewards:[], types:[] })
function visibleQuests(ui) {
	const filters = ui.filters ?? defaultQuestFilters()
	return questData.map((quest,i)=>({quest,i})).filter(({quest}) =>
		(!filters.rewards.length || filters.rewards.includes(quest.rewardType)) &&
		(!filters.types.length || filters.types.includes(quest.questType))
	).sort((a,b) => filters.sort === 'Most Recent' ? b.quest.recent-a.quest.recent : filters.sort === 'Expiring Soon' ? a.quest.expiry-b.quest.expiry : filters.sort === 'Started' ? Number(b.quest.ready || !!ui['completed'+b.i])-Number(a.quest.ready || !!ui['completed'+a.i]) : a.i-b.i)
}

export const questFilters = {
	id:'quest-filters', title:'Quest filters', group:'Menus and sheets', capture:null, screen:'quests',
	render({ui}) {
		const filters = ui.draft ?? defaultQuestFilters()
		const choices = (label, options, field) => `${sectionLabel(label)}<div class="vp-setting-group">${options.map((name,i) => {
			const selected = field === 'sort' ? filters.sort === name : filters[field].includes(name)
			return `<button class="vp-setting-control" role="${field === 'sort' ? 'radio' : 'checkbox'}" aria-checked="${selected}" data-act="${field === 'sort' ? 'sort' : field}:${i}" data-k="bg:CARD_MUTED_BG fg:TEXT_STRONG"><span>${name}</span>${field === 'sort' ? `<span class="vp-radio${selected ? ' on' : ''}" data-k="${selected ? 'bg:REDESIGN_INPUT_CONTROL_SELECTED' : 'bd:RADIO_BORDER_DEFAULT'}">${selected ? '<i data-k="bg:WHITE"></i>' : ''}</span>` : `<span class="vp-data-checkbox" data-k="bg:CHECKBOX_BACKGROUND_${selected ? 'SELECTED_DEFAULT' : 'DEFAULT'} bd:CHECKBOX_BORDER_${selected ? 'SELECTED_DEFAULT' : 'DEFAULT'} fg:CHECKBOX_ICON_ACTIVE">${selected ? icon('check',16) : ''}</span>`}</button>`
		}).join('')}</div>`
		return `<div class="vp-scrim" data-close data-k="bg:BACKGROUND_SCRIM"></div><section class="vp-sheet vp-quest-filter-sheet" data-k="bg:MOBILE_ACTIONSHEET_BACKGROUND"><i class="vp-handle" data-k="bg:BACKGROUND_MOD_STRONG"></i><h2 data-k="fg:TEXT_STRONG">Filters</h2><div class="vp-quest-filter-scroll" data-scroll="quest-filters">${choices('Sort by',questSorts,'sort')}${choices('Reward',questRewards,'rewards')}${choices('Quest Type',questTypes,'types')}</div><footer>${button('Done','done',true)}${button('Reset','reset')}</footer></section><div class="vp-nav-scrim" data-k="bg:ANDROID_NAVIGATION_SCRIM_BACKGROUND"><i></i></div>`
	},
	actions: {
		sort: ({arg,ui}) => { (ui.draft ??= defaultQuestFilters()).sort=questSorts[Number(arg)]; return 'render' },
		rewards: ({arg,ui}) => { const draft=(ui.draft ??= defaultQuestFilters()), value=questRewards[Number(arg)]; draft.rewards=draft.rewards.includes(value) ? draft.rewards.filter(item=>item!==value) : [...draft.rewards,value]; return 'render' },
		types: ({arg,ui}) => { const draft=(ui.draft ??= defaultQuestFilters()), value=questTypes[Number(arg)]; draft.types=draft.types.includes(value) ? draft.types.filter(item=>item!==value) : [...draft.types,value]; return 'render' },
		reset: ({ui}) => { ui.draft=defaultQuestFilters(); return 'render' },
		done: ({ui,api}) => { (api.state.ui.quests ??= {}).filters=ui.draft ?? defaultQuestFilters(); api.close(); api.render() },
	},
}

export const questMenu = {
	id:'quest-menu', title:'Quest menu', group:'Menus and sheets', capture:null, screen:'quests',
	render({state}) {
		const top=state?.overlayParams?.top ?? 420
		return `<div class="vp-scrim" data-close data-k="bg:BACKGROUND_SCRIM"></div><div class="vp-quest-menu" role="menu" style="top:${top}px" data-k="bg:BACKGROUND_SURFACE_HIGH bd:BORDER_SUBTLE">${[['external','Buy Now','buy'],['help','Why am I seeing this?','why'],['copy','Copy Link','copy']].map(([glyph,label,action])=>`<button role="menuitem" data-act="${action}" data-k="fg:TEXT_STRONG bb:BORDER_SUBTLE">${icon(glyph,20)}<span>${label}</span></button>`).join('')}</div>`
	},
	actions:{
		buy:({api})=>{ api.close(); api.toast('default','Fictional game preview: no store page is connected') },
		why:({overlayParams,api})=>api.open('quest-why',{quest:overlayParams.quest,keepScreen:true}),
		copy:async({overlayParams,api})=>{
			try { await navigator.clipboard.writeText(`https://example.com/quests/${overlayParams.quest ?? 0}`); api.close(); api.toast('success','Link copied') }
			catch { api.toast('critical','Could not copy the link') }
		},
	},
}

export const questWhy = {
	id:'quest-why', title:'Why am I seeing this?', group:'Menus and sheets', capture:null, screen:'quests',
	render({state}) {
		const quest=questData[state?.overlayParams?.quest ?? 0] ?? questData[0]
		return `<div class="vp-quest-why" data-k="bg:BACKGROUND_BASE_LOWEST">${statusBar('BACKGROUND_BASE_LOWER')}<header class="vp-page-header" data-k="bg:BACKGROUND_BASE_LOWER"><button class="vp-icon-btn" data-close aria-label="Close" data-k="fg:INTERACTIVE_ICON_DEFAULT">${icon('close',24)}</button><h1 data-k="fg:TEXT_STRONG">Why am I seeing this?</h1></header><div class="vp-quest-why-body" data-scroll="quest-why"><img src="${new URL('../../assets/commerce-reference/quest-why.png',import.meta.url).href}" alt="Discord character playing a game" data-fixed="Original native Discord illustration"><p data-k="fg:TEXT_DEFAULT">${esc(quest.studio)} is promoting on Discord by partnering with us to offer this Quest. This Quest is available for all users in User Settings &gt; Quests.</p><p data-k="fg:TEXT_DEFAULT">Learn more about how to manage your Privacy Settings <button data-act="privacy" data-k="fg:TEXT_LINK">here.</button></p></div><footer>${button('Close','close',true)}</footer>${navBar('BACKGROUND_BASE_LOWEST')}</div>`
	},
	actions:{close:({api})=>api.close(),privacy:({api})=>{api.close();api.go('data-privacy')}},
}

export const quests = {
	id: 'quests', title: 'Quests', group: 'Profiles', capture: null,
	render({ ui }) {
		return `${statusBar('MOBILE_ACTIONSHEET_BACKGROUND')}<div class="vp-page" data-k="bg:MOBILE_ACTIONSHEET_BACKGROUND">${pageHeader('Quests', { close: true, glyph: 'quests', trailing: `<span class="vp-commerce-balance" data-k="bg:BACKGROUND_MOD_STRONG fg:TEXT_STRONG">${icon('boost', 18)}1,250</span><button class="vp-icon-btn" data-act="filter" aria-label="Filter quests" aria-pressed="${!!(ui.filters && (ui.filters.sort !== 'Suggested' || ui.filters.rewards.length || ui.filters.types.length))}" data-k="${ui.filters && (ui.filters.sort !== 'Suggested' || ui.filters.rewards.length || ui.filters.types.length) ? 'bg:CONTROL_PRIMARY_BACKGROUND_DEFAULT fg:CONTROL_PRIMARY_TEXT_DEFAULT' : 'fg:TEXT_STRONG'}">${icon('filter', 22)}</button>` })}<div class="vp-page-scroll vp-commerce-scroll" data-k="bg:BACKGROUND_BASE_LOWEST" data-scroll="quests"><h2 data-k="fg:TEXT_STRONG">Quests</h2>${visibleQuests(ui).map(({quest, i}) => `<article class="vp-quest-card" data-k="bg:CARD_BACKGROUND_DEFAULT bd:BORDER_SUBTLE">
			<div class="vp-quest-banner">${commerceImage(quest.art, quest.game)}<p class="vp-quest-sponsor" data-k="fg:TEXT_MUTED">Promoted by: ${esc(quest.studio)}<span>Ends 30/11</span></p></div>
			<div class="vp-quest-reward"><span class="vp-reward-art ${quest.ready || ui['completed' + i] ? 'is-complete' : ''}" data-fixed="Reward artwork">${commerceImage(i === 1 ? 'quest-avatar-reward' : 'quest-orb-reward', quest.reward)}</span><div><small data-k="fg:TEXT_BRAND">${quest.title}</small><b data-k="fg:TEXT_STRONG">${ui['claimed' + i] ? 'Reward claimed' : 'Claim ' + quest.reward}</b><p data-k="fg:TEXT_MUTED">${i === 1 ? 'Watch the video to unlock a Garden Trails Avatar Decoration for 1 month. Keep it with Nitro!' : 'Watch the video to win 200 Orbs!'}</p></div></div>
			<div class="vp-commerce-actions" data-k="bt:BORDER_SUBTLE">${quest.ready || ui['completed' + i] ? button(ui['claimed' + i] ? 'Claimed' : 'Claim Reward', `claim:${i}`, true) + `<button class="vp-btn-secondary vp-quest-square" data-act="refresh:${i}" aria-label="Refresh reward status" data-k="bg:CONTROL_SECONDARY_BACKGROUND_DEFAULT fg:CONTROL_SECONDARY_TEXT_DEFAULT bd:CONTROL_SECONDARY_BORDER_DEFAULT">${icon('refresh',24)}</button>` : button('Play Now', `detail:${i}`) + button('Watch 2m', `watch:${i}`, true)}<button class="vp-btn-secondary vp-quest-square" data-act="menu:${i}" aria-label="Quest menu" data-k="bg:CONTROL_SECONDARY_BACKGROUND_DEFAULT fg:CONTROL_SECONDARY_TEXT_DEFAULT bd:CONTROL_SECONDARY_BORDER_DEFAULT">${icon('more',20)}</button></div>
		</article>`).join('') || '<p class="vp-quest-empty" data-k="fg:TEXT_MUTED">No quests match these filters.</p>'}</div></div>${navBar('MOBILE_ACTIONSHEET_BACKGROUND')}`
	},
	actions: {
		menu: ({arg,el,api}) => { const bounds=el.getBoundingClientRect(), phone=el.closest('.vp').getBoundingClientRect(); const scale=phone.width/412; api.open('quest-menu',{quest:Number(arg),top:Math.max(112,Math.min((bounds.bottom-phone.top)/scale+10,phone.height/scale-165)),keepScreen:true}) },
		refresh: ({ arg, ui, api }) => api.toast('default', ui['claimed' + arg] ? 'Reward already claimed' : 'Reward ready to claim'),
		filter: ({ ui, api }) => { const filters=ui.filters ?? defaultQuestFilters(); (api.state.ui['quest-filters'] ??= {}).draft={...filters,rewards:[...filters.rewards],types:[...filters.types]}; api.open('quest-filters',{keepScreen:true}) },
		watch: ({ arg, ui, api }) => { ui['completed' + arg] = true; api.toast('success', 'Preview quest completed'); return 'render' },
		claim: ({ arg, ui, api }) => { if (!questData[Number(arg)]?.ready && !ui['completed' + arg]) return; ui['claimed' + arg] = true; api.toast('success', 'Example reward claimed'); return 'render' },
		detail: ({ arg, api }) => api.toast('default', `${questData[Number(arg)].game}: a fictional quest for the preview`),
	},
}

const nitroBadges = [['Bronze','1 Month'],['Silver','3 Months'],['Gold','6 Months'],['Platinum','1 Year'],['Diamond','2 Years'],['Emerald','3 Years'],['Ruby','5 Years'],['Opal','6+ Years']]
const nitroImage = (name, label, cls = '') => `<img class="${cls}" src="${new URL(`../../assets/commerce-reference/nitro-${name}.png`,import.meta.url).href}" alt="${esc(label)}" data-fixed="Original Discord 352206 artwork">`

export const nitroBadgeSheet = {
	id:'nitro-badges', title:'Nitro milestones', group:'Menus and sheets', capture:null, screen:'nitro',
	render() {
		return `<div class="vp-scrim" data-close data-k="bg:BACKGROUND_SCRIM"></div><section class="vp-sheet vp-nitro-badge-sheet" role="dialog" aria-modal="true" aria-label="Nitro milestones" data-k="bg:MOBILE_ACTIONSHEET_BACKGROUND"><button class="vp-nitro-sheet-handle" data-close aria-label="Close badges"><i class="vp-handle" data-k="bg:BACKGROUND_MOD_STRONG"></i></button><div data-scroll="nitro-badges"><h2 data-k="fg:TEXT_STRONG">Celebrate Your Nitro<br>Milestones in Style</h2><p data-k="fg:TEXT_DEFAULT">Your badge will automatically evolve over time.</p><div class="vp-nitro-badge-grid">${nitroBadges.map(([name,duration])=>`<div>${nitroImage(name.toLowerCase()+'-badge',name+' Nitro badge')}<b data-k="fg:TEXT_STRONG">${name}</b><span data-k="fg:TEXT_DEFAULT">${duration}</span></div>`).join('')}</div></div></section><div class="vp-nav-scrim" data-k="bg:ANDROID_NAVIGATION_SCRIM_BACKGROUND"><i></i></div>`
	},
}

// Copy and grouping observed in the native Nitro Perks screen (Discord 352206).
const nitroPerkGroups = [
	[
		"Nitro Favourites",
		[
			{
				"title": "Customise Your Profile",
				"description": "Use a different avatar, profile theme, banner and bio in each of your servers.",
				"art": "custom-profile",
				"route": "profile"
			},
			{
				"title": "Colour Your Experience",
				"description": "Add your vibe to Discord with unique theme colours.",
				"art": "client-theme",
				"route": "discord-theme"
			},
			{
				"title": "2 Server Boosts + 30% off",
				"description": "Give your favourite communities a boost and unlock awesome perks.",
				"art": "grey-server-boosts",
				"overlay": "Requires Subscription"
			}
		]
	],
	[
		"Make Discord Yours",
		[
			{
				"title": "Custom App Icons",
				"description": "Choose a mobile and in-app desktop icon that fits your vibe.",
				"art": "custom-icons",
				"route": "app-icon"
			},
			{
				"title": "More Emoji Power",
				"description": "Hype, roast and meme with custom emojis anywhere.",
				"art": "emoji"
			},
			{
				"title": "Custom Sounds Everywhere",
				"description": "Use custom soundboard sounds across voice channels. Only with Nitro.",
				"art": "custom-sounds"
			},
			{
				"title": "Special Sticker Access",
				"description": "Use custom stickers anywhere.",
				"art": "sticker"
			}
		]
	],
	[
		"Enjoy an Upgraded Discord",
		[
			{
				"title": "Special Member Pricing",
				"description": "Snag sweet discounts on any – or every! – item in the Shop. Only with Nitro.",
				"art": "member-pricing",
				"route": "shop"
			},
			{
				"title": "Early Access",
				"description": "Get exclusive access to certain new features before they’re released to everyone.",
				"art": "early-access"
			},
			{
				"title": "1 GB Uploads",
				"description": "Upload what you want with increased 1 GB upload size. (Beta)",
				"art": "large-uploads"
			},
			{
				"title": "HD Video",
				"description": "Better video resolutions for all your streams. Stream apps and games in sweet, sweet HD.",
				"art": "hd-video"
			},
			{
				"title": "Super Reactions",
				"description": "Hype up the chat with action-packed, animated reactions.",
				"art": "super-reaction"
			}
		]
	],
	[
		"Show up the Way You Want",
		[
			{
				"title": "Entrance Sounds",
				"description": "Pick a Soundboard sound to play whenever you join a voice channel.",
				"art": "entrace-sounds"
			},
			{
				"title": "Subscriber Badge",
				"description": "Get this cool badge for being a Nitro subscriber.",
				"art": "grey-badge",
				"overlay": "Requires Subscription"
			}
		]
	]
]
function nitroPerks() {
	return nitroPerkGroups.map(([title,cards],group)=>`<section class="vp-nitro-perk-group"><h2 data-k="fg:TEXT_STRONG">${esc(title)}</h2><div class="vp-nitro-carousel" data-nitro-carousel="${group}" tabindex="0" aria-label="${esc(title)}">${cards.map(card=>`<article class="vp-nitro-perk-card" data-k="bg:CARD_BACKGROUND_DEFAULT"><div class="vp-nitro-perk-art">${nitroImage('perk-'+card.art,card.title)}${card.overlay ? `<span>${esc(card.overlay)}</span>` : ''}</div><div class="vp-nitro-perk-body"><h3 data-k="fg:TEXT_STRONG">${esc(card.title)}</h3><p data-k="fg:TEXT_DEFAULT">${esc(card.description)}</p>${card.route ? button('Take me there','perk:'+card.route) : ''}</div></article>`).join('')}</div><div class="vp-nitro-dots">${cards.map((card,i)=>`<button data-act="carousel:${i}" aria-label="Show ${esc(card.title)}" aria-current="${i===0}" data-k="bg:${i===0 ? 'TEXT_BRAND' : 'BACKGROUND_MOD_STRONG'}"></button>`).join('')}</div></section>`).join('')
}

export const nitro = {
	id: 'nitro', title: 'Nitro', group: 'Profiles', capture: null,
	render({ ui }) {
		const tab = ui.tab ?? 'New'
		return `${statusBar('MOBILE_ACTIONSHEET_BACKGROUND').replace('vp-statusbar', 'vp-statusbar vp-nitro-status')}<div class="vp-page" data-k="bg:BACKGROUND_BASE_LOWER"><header class="vp-nitro-hero" data-fixed="Original Nitro header artwork"><button class="vp-icon-btn" data-back aria-label="Back">${icon('back', 24)}</button><h2>YOUR NITRO HOME</h2><span>ENDS IN 30 DAYS</span></header>
			<div class="vp-page-scroll vp-nitro-scroll" data-scroll="nitro">

				${tab === 'New' ? `<article class="vp-nitro-card vp-nitro-badge-card" data-k="bg:CARD_BACKGROUND_DEFAULT"><span class="vp-nitro-required" data-fixed="Native subscription badge gradient">SUBSCRIPTION REQUIRED</span><div class="vp-nitro-badge" data-fixed="Example subscription badge"><img src="${new URL('../../assets/commerce-reference/nitro-gold-badge.png', import.meta.url).href}" alt="Evolving profile badge" data-fixed="Original Gold subscription badge artwork"></div><h2 data-k="fg:TEXT_STRONG">Evolving Profile Badge</h2><p data-k="fg:TEXT_DEFAULT">Gold &middot; 6 Months</p><p data-k="fg:TEXT_MUTED">Subscriber since 14/05/26</p>${button('See All Badges', 'badges')}</article><article class="vp-nitro-card" data-k="bg:CARD_BACKGROUND_DEFAULT">${commerceImage('nitro-game-pass', 'Game Pass membership artwork', 'vp-nitro-card-art')}<h2 data-k="fg:TEXT_STRONG">Xbox Game Pass &amp; More</h2><p data-k="fg:TEXT_DEFAULT">Your Nitro membership now comes with Xbox Game Pass, gear discounts and Orbs perks. Available on Desktop only. <a href="https://support.discord.com/hc/en-gb/articles/39188406147479" target="_blank" rel="noopener noreferrer" data-k="fg:TEXT_LINK">Terms apply.</a></p></article><article class="vp-nitro-card" data-k="bg:CARD_BACKGROUND_DEFAULT">${nitroImage('perk-member-pricing', 'Member pricing artwork', 'vp-nitro-card-art')}<h2 data-k="fg:TEXT_STRONG">Special Member Pricing</h2><p data-k="fg:TEXT_DEFAULT">Snag sweet discounts on any &ndash; or every! &ndash; item in the Shop. Only with Nitro.</p>${button('Take me there', 'shop')}</article><article class="vp-nitro-card" data-k="bg:CARD_BACKGROUND_DEFAULT">${nitroImage('perk-early-access', 'Early Access artwork', 'vp-nitro-card-art')}<h2 data-k="fg:TEXT_STRONG">Early Access</h2><p data-k="fg:TEXT_DEFAULT">Get exclusive access to certain new features before they?re released to everyone.</p></article>` : nitroPerks()}
			</div><nav class="vp-commerce-tabs" data-k="bg:MOBILE_SEGMENTED_CONTROL_BACKGROUND">${['New', 'Perks'].map(label => `<button data-act="tab:${label}" data-k="${tab === label ? 'bg:MOBILE_SEGMENTED_CONTROL_INDICATOR_BACKGROUND fg:TEXT_STRONG' : 'fg:TEXT_MUTED'}">${label}</button>`).join('')}</nav>
		</div>${navBar('MOBILE_ACTIONSHEET_BACKGROUND')}`
	},
	actions: {
		tab: ({ arg, ui }) => { ui.tab = arg; return 'render' },
		badges: ({ api }) => api.open('nitro-badges',{keepScreen:true}),
		perk: ({ arg, api }) => { if (nitroPerkGroups.some(([, cards]) => cards.some(card => card.route === arg))) api.go(arg) },
		carousel: ({ arg, el }) => { const track=el.closest('.vp-nitro-perk-group').querySelector('.vp-nitro-carousel'); const card=track.children[Number(arg)]; if (card) track.scrollTo({left:card.offsetLeft-track.firstElementChild.offsetLeft,behavior:'smooth'}) },
		perks: ({ ui }) => { ui.tab = 'Perks'; return 'render' },
		shop: ({ api }) => api.go('shop'),
	},
}

const shopAsset = name => new URL(`../../assets/shop-reference/${name}.webp`, import.meta.url).href
const shopProducts = [
	{ name: 'Midnight Current Bundle', art: 'bundle-a', category: 'Featured', price: 1800 },
	{ name: 'Moonlit Echo Bundle', art: 'bundle-b', category: 'Featured', price: 1800 },
	{ name: 'Quiet Hours', art: 'bundle-a', category: 'Lo-Fi Vibes', price: 800 },
	{ name: 'Evening Reverie', art: 'bundle-b', category: 'Lo-Fi Vibes', price: 800 },
]
const shopImage = (name, label, className = '') => `<img class="${className}" src="${shopAsset(name)}" alt="${esc(label)}" data-fixed="Promotional artwork cropped from the genuine emulator reference">`
const shopProduct = (product, i, ui) => `<article class="vp-shop-product" data-k="bg:CARD_BACKGROUND_DEFAULT bd:BORDER_SUBTLE">
	<button class="vp-shop-product-open" data-act="product:${i}" aria-label="View ${esc(product.name)}">${shopImage(product.art, product.name)}<b data-k="fg:TEXT_STRONG">${esc(product.name)}</b><span class="vp-shop-price" data-k="fg:TEXT_STRONG">${icon('boost', 16)} ${product.price.toLocaleString('en-GB')} <small data-k="fg:TEXT_FEEDBACK_POSITIVE">-33%</small></span></button>
	<button class="vp-shop-heart" data-act="save:${i}" aria-label="${ui['saved' + i] ? 'Remove ' + esc(product.name) + ' from' : 'Add ' + esc(product.name) + ' to'} wishlist" aria-pressed="${!!ui['saved' + i]}" data-k="bg:CONTROL_OVERLAY_SECONDARY_BACKGROUND_DEFAULT fg:${ui['saved' + i] ? 'TEXT_BRAND' : 'TEXT_MUTED'}">${icon('heart', 23)}</button>
</article>`

export const shop = {
	id: 'shop', title: 'Shop', group: 'Profiles', capture: null,
	render({ ui }) {
		const product = shopProducts[ui.product]
		const heading = product ? product.name : ui.wishlist ? 'Wishlist' : ui.category || ui.collection || 'Shop'
		const localView = product || ui.wishlist || ui.category || ui.collection
		const top = `<header class="vp-page-header vp-shop-header" data-k="bg:MOBILE_ACTIONSHEET_BACKGROUND"><button class="vp-icon-btn" ${localView ? 'data-act="home"' : 'data-back'} aria-label="Back" data-k="fg:INTERACTIVE_TEXT_DEFAULT">${icon('back', 24)}</button><h1 data-k="fg:TEXT_STRONG">${!localView ? icon('shop', 24) : ''}${esc(heading)}</h1><span class="vp-commerce-balance" data-k="bg:BACKGROUND_MOD_STRONG fg:TEXT_STRONG">${icon('boost', 18)}1,250</span><button class="vp-icon-btn" data-act="wishlist" aria-label="Wishlist" data-k="fg:TEXT_STRONG">${icon('heart', 22)}</button><button class="vp-icon-btn vp-shop-menu-icon" data-act="menu" aria-label="Shop categories" aria-expanded="${!!ui.menu}" data-k="fg:TEXT_STRONG"><span></span><span></span><span></span></button></header>`
		let content
		if (product) content = `<div class="vp-shop-detail">${shopImage(product.art, product.name)}<h2 data-k="fg:TEXT_STRONG">${esc(product.name)}</h2><p data-k="fg:TEXT_MUTED">Avatar decoration and matching profile accessories.</p><div class="vp-shop-detail-profile" data-k="bg:CARD_MUTED_BG fg:TEXT_STRONG">${avatar('me', 64, { status: false })}<b>Juniper</b></div>${button(ui['saved' + ui.product] ? 'Remove from Wishlist' : 'Add to Wishlist', `save:${ui.product}`)}${button(ui.previewing ? 'Hide Preview' : 'Preview Decoration', 'preview', true)}${ui.previewing ? `<div class="vp-shop-decoration-preview" data-fixed="Example decoration preview">${shopImage(product.art, 'Selected decoration preview')}</div>` : ''}</div>`
		else if (ui.wishlist || ui.category) {
			const matches = shopProducts.map((item, i) => ({ item, i })).filter(({ item, i }) => ui.wishlist ? ui['saved' + i] : ui.category === 'All' || item.category === ui.category)
			content = `<div class="vp-shop-selection">${matches.length ? `<div class="vp-shop-selection-grid">${matches.map(({ item, i }) => shopProduct(item, i, ui)).join('')}</div>` : `<div class="vp-shop-empty" data-k="fg:TEXT_MUTED">${icon('heart', 42)}<h2 data-k="fg:TEXT_STRONG">Your wishlist is waiting</h2><p>Save something you love from the Shop.</p>${button('Explore Shop', 'home')}</div>`}</div>`
		} else content = `<button class="vp-shop-feature" data-act="category:Featured" aria-label="Explore featured collection">${shopImage('hero', 'Featured game collection')}<span data-k="bg:CONTROL_OVERLAY_SECONDARY_BACKGROUND_DEFAULT fg:WHITE">${icon('chevronRight', 28)}</span></button><div class="vp-shop-carousel" aria-label="Featured products">${shopProducts.slice(0, 3).map((item, i) => shopProduct(item, i, ui)).join('')}</div><div class="vp-shop-collections"><button data-act="collection:Marvel" aria-label="Explore Marvel collection">${shopImage('collection-marvel', 'Marvel Deadpool and Wolverine collection')}</button><button data-act="collection:Horror" aria-label="Explore horror collection">${shopImage('collection-horror', 'Dead by Daylight collection')}</button></div><div class="vp-shop-section-heading"><h2 data-k="fg:TEXT_STRONG">Lo-Fi Vibes</h2>${button('Shop All', 'category:Lo-Fi Vibes')}</div><div class="vp-shop-carousel vp-shop-lofi">${shopProducts.slice(2).map((item, i) => shopProduct(item, i + 2, ui)).join('')}</div>`
		if (ui.collection) content = `<div class="vp-shop-collection-detail">${shopImage(ui.collection === 'Marvel' ? 'collection-marvel' : 'collection-horror', `${ui.collection} collection`)}<div class="vp-shop-section-heading"><h2 data-k="fg:TEXT_STRONG">${ui.collection === 'Marvel' ? 'Hero Collection' : 'After Dark Collection'}</h2>${button('All Collections', 'home')}</div><div class="vp-shop-carousel vp-shop-lofi">${shopProducts.slice(0, 2).map((item, i) => shopProduct(item, i, ui)).join('')}</div></div>`
		return `${statusBar('MOBILE_ACTIONSHEET_BACKGROUND')}<div class="vp-page" data-k="bg:BACKGROUND_BASE_LOWEST">${top}${ui.menu ? `<nav class="vp-shop-categories" aria-label="Shop categories" data-k="bg:CARD_MUTED_BG">${['All', 'Featured', 'Lo-Fi Vibes'].map(label => button(label, `category:${label}`)).join('')}</nav>` : ''}<div class="vp-page-scroll vp-shop-scroll" data-scroll="shop">${content}</div></div>${navBar('BACKGROUND_BASE_LOWEST')}`
	},
	actions: {
		save: ({ arg, ui }) => { ui['saved' + arg] = !ui['saved' + arg]; return 'render' },
		menu: ({ ui }) => { ui.menu = !ui.menu; return 'render' },
		home: ({ ui }) => { delete ui.product; delete ui.category; delete ui.collection; ui.wishlist = false; ui.menu = false; ui.previewing = false; return 'render' },
		wishlist: ({ ui }) => { delete ui.product; delete ui.category; delete ui.collection; ui.wishlist = true; ui.menu = false; return 'render' },
		category: ({ arg, ui }) => { delete ui.product; delete ui.collection; ui.category = arg; ui.wishlist = false; ui.menu = false; return 'render' },
		collection: ({ arg, ui }) => { ui.collection = arg; ui.menu = false; return 'render' },
		product: ({ arg, ui }) => { ui.product = Number(arg); delete ui.collection; ui.menu = false; ui.previewing = false; return 'render' },
		preview: ({ ui }) => { ui.previewing = !ui.previewing; return 'render' },
	},
}
