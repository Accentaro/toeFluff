// Code that runs inside Discord through the bridge. Kept to ES2017-level syntax for Hermes' eval.
import { evalAsync, evalJson } from './devtools.js'

export const PROBE_PLUGIN = 'toefluff.probe'

// Valenced's themes store, reached through the hidden API ("Developer Mode" plugin).
const STORE = `
	if (typeof hidden === 'undefined' || !hidden) throw new Error('hidden API missing: enable the "Developer Mode" plugin (valenced.api.hidden) in Valenced');
	var themesPlugin = hidden.plugins.internal.pList.get('valenced.settings.themes');
	var themesInternal = themesPlugin && themesPlugin.api && themesPlugin.api.themesInternal;
	if (!themesInternal) throw new Error('Valenced themes store not found (is the Themes API plugin running?)');
	var store = themesInternal.store;
	var g = globalThis.__toefluff || (globalThis.__toefluff = {});
`

/**
 * Discord's token tables: SemanticColor (per base: raw name + opacity), RawColor (hex),
 * the app's own resolution of every semantic key per base, and the active Valenced colour theme.
 */
export function readTokens() {
	return evalJson(
		`
		var T = valenced.discord.common.tokens.Tokens;
		if (!T || !T.SemanticColor || !T.RawColor) throw new Error('Discord tokens module not found');
		var internal = T.default && T.default.internal, colors = T.default && T.default.colors;
		var bases = ['dark', 'darker', 'light', 'midnight'];
		var resolved = {};
		if (internal && colors) for (var name in T.SemanticColor) {
			resolved[name] = {};
			for (var i = 0; i < bases.length; i++) {
				try { resolved[name][bases[i]] = internal.resolveSemanticColor(bases[i], colors[name]) } catch (e) { resolved[name][bases[i]] = null }
			}
		}
		var theme = null;
		try {
			var p = hidden.plugins.internal.pList.get('valenced.settings.themes');
			var sel = p.api.themesInternal.store.themesStore.getState().selected.colors;
			if (sel) theme = { plugin: sel.plugin, group: sel.group, theme: sel.theme };
		} catch (e) {}
		var info = null;
		try { info = valenced.discord.native.ClientInfoModule.getConstants() } catch (e) {}
		return {
			version: info && info.Version, build: info && info.Build,
			semantic: T.SemanticColor, raw: T.RawColor, resolved: resolved, theme: theme
		};
	`,
		60000,
	)
}

/** Registers the probe theme and remembers the colour theme that was active before. */
export function setupProbe() {
	return evalJson(`${STORE}
		if (!g.registered) {
			store.registerTheme('${PROBE_PLUGIN}', 'probe', 'probe', {
				name: 'toeFluff probe',
				getColors: function () { return g.colors || {} }
			});
			g.registered = true;
		}
		if (!g.saved) {
			var sel = store.themesStore.getState().selected.colors;
			g.prev = sel && sel.plugin !== '${PROBE_PLUGIN}' ? { plugin: sel.plugin, group: sel.group, theme: sel.theme } : null;
			g.saved = true;
		}
		return { previous: g.prev };
	`)
}

/** Applies ThemeColors through the probe theme ({} = Discord's defaults). Resolves once Valenced has applied them. */
export function applyColors(colors) {
	return evalAsync(`${STORE}
		g.colors = ${JSON.stringify(colors)};
		return store.selectTheme('${PROBE_PLUGIN}', 'probe', 'probe').then(function () { return true });
	`)
}

/** Reselects the theme that was active before probing (or none) and removes the probe theme. */
export function restoreTheme() {
	return evalAsync(`${STORE}
		var prev = g.prev;
		var done = function (restored) {
			store.unregisterAll('${PROBE_PLUGIN}');
			globalThis.__toefluff = undefined;
			return restored;
		};
		var none = function () { return store.selectTheme(null) };
		var p = prev ? store.selectTheme(prev.plugin, prev.group, prev.theme).then(function () { return prev }, function () { return none().then(function () { return 'failed' }) })
			: none().then(function () { return null });
		return p.then(done);
	`)
}
