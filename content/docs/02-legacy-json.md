# A JSON theme

No code needed. Valenced's **Legacy Themes** plugin imports themes in the old Vendetta/Bunny format by URL.

## Steps

1. Copy the [Dusk JSON](/templates/) and change the colours, or build one in the [studio](/studio/) and export it.
2. Upload it somewhere that serves the raw file, like a GitHub repo or Gist. Use the **raw** link.
3. In Discord, open **Settings > Themes > Manage theme plugins** and install **Legacy Themes**.
4. In its settings, paste the link under **Theme or font pack URL** and tap **Import theme**.
5. Pick it under **Themes > Colors**.

## The format

Each semantic key takes a list: `["ash and dark", "light", "onyx"]`. Leave out the ones you don't need. Onyx
falls back to the first colour, and Light is left alone if you skip it.

```json
"semanticColors": {
	"CHANNEL_BACKGROUND_DEFAULT": ["#1c1827", "#f4f0ff"]
}
```

Raw keys take a single colour:

```json
"rawColors": {
	"BLURPLE_50": "#a78bfa"
}
```

The file needs a `name` and `"spec": 2`, or Valenced won't import it.

## Limits

Ash and Dark always share the first colour, so a JSON theme can't tell them apart. If you need that, or anything
beyond colours, write a [plugin](/docs/plugin/). The [converter](/converter/) turns a JSON theme into one.
