# A theme plugin

Plugins can do more than a JSON file: separate colours for Ash and Dark, colours worked out from Discord's own
palette, backgrounds, fonts, icons and emoji.

## Steps

1. Get the [Valenced plugin template](https://github.com/Valenced/valenced-plugin-template) and follow its setup.
2. Copy the [Dusk plugin](/templates/) into its `themes/` folder. Change the ID in `manifest.json`.
3. Edit the colours in `js/index.ts`.
4. Build with `./gradlew packageAllPlugins`. The ZIP lands in `build/dist/`.
5. In Discord, open **Settings > Plugins**, tap the gear, then **Install from file**, and pick the ZIP.

Already have a JSON theme? Paste it into the [converter](/converter/) to get `index.ts` and `manifest.json`.

## The colours object

`index.ts` registers the theme and returns a `ThemeColors` object. Each base is optional:

```ts
const colors: ThemeColors = {
	semantic: {
		dark: { CHANNEL_BACKGROUND_DEFAULT: '#1c1827' },
		darker: { CHANNEL_BACKGROUND_DEFAULT: '#120f1a' },
		light: { CHANNEL_BACKGROUND_DEFAULT: '#f4f0ff' },
	},
	raw: { BLURPLE_50: '#a78bfa' },
}
```

The [Themes API docs](https://github.com/Valenced/valenced-website/blob/main/content/docs/plugin-development/api-reference/themes.mdx)
cover the rest.
