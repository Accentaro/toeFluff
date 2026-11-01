# Getting started

Discord gives everything on screen a named colour, and a theme swaps those colours out. This page covers how
the colours fit together. The next pages show the two ways to ship a theme.

## Semantic and raw keys

**Semantic keys** describe a job, like `TEXT_DEFAULT` or `CHANNEL_BACKGROUND_DEFAULT`. You set them per base,
so a dark theme and a light theme can differ. Start with these, since they're easy to aim.

**Raw keys** are the palette underneath, like `NEUTRAL_69` or `BLURPLE_50`. Most semantic keys point at one of
them. Changing a raw key changes everything that uses it, on every base. That's handy for big sweeps, like
recolouring Discord's blurple everywhere with one line, but hard to aim.

If you set both, the semantic key wins for that spot.

## Bases

Discord has four bases, the themes you pick in its Appearance settings. A theme can cover any of them; the ones
you leave out keep Discord's colours.

| In Discord | In a theme |
| --- | --- |
| Ash | `dark` |
| Dark | `darker` |
| Light | `light` |
| Onyx | `midnight` |

Colours are hex: `#RRGGBB`, or `#RRGGBBAA` to add transparency.

## Start here

These twelve cover most of what you see. Pink is what each one paints; click one to see its card.

```shots
BACKGROUND_BASE_LOWEST: server rail
PANEL_BG: DM and channel list
CHANNEL_BACKGROUND_DEFAULT: chat
BACKGROUND_BASE_LOWER: under the chat box
MOBILE_ACTIONSHEET_BACKGROUND: settings pages
CARD_MUTED_BG: settings rows
MOBILE_CHATINPUT_BACKGROUND_DEFAULT: chat box
EMBED_BACKGROUND: embeds
TEXT_STRONG: main text
TEXT_DEFAULT: descriptions
TEXT_MUTED: timestamps, hints
MOBILE_TEXT_HEADING_PRIMARY: page titles
```

For the brand colour (buttons, switches, the selected rail button), set the raw key `BLURPLE_50`.

The quickest way to try this is the [studio](/studio/#!dusk): it opens the Dusk starter on a live phone preview,
and exports either format.
