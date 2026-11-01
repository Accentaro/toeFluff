---
name: update-theme-keys
description: Refresh the Discord colour keys from an Android emulator running Discord with Valenced, recapture the pink screenshots per screen, and regenerate data/*.json, KEYS.md and ALL-KEYS.md. Use when Discord has updated or the user asks to update the theme keys.
---

# Update theme keys

Scripts live in `tools/` (run `npm install` there once). Read the header comment of each script for
its options. Work from the repo root. Long runs go in the background; don't sit waiting on them.

## 1. Device

- `adb devices -l`. Use only an `emulator-*` device. Other devices (a Quest headset is often
  attached) must not be touched: `export ANDROID_SERIAL=emulator-5554` (the emulator's serial) and
  pass `-s $ANDROID_SERIAL` to every manual `adb` call.
- Discord with Valenced must be installed: `adb -s $ANDROID_SERIAL shell pm list packages | grep -E 'valenced|discord'`.
- `adb -s $ANDROID_SERIAL reverse tcp:7684 tcp:7684`
- In Discord: Valenced settings > Developer: turn on "Auto-connect to DevTools". The "Developer Mode"
  plugin (valenced.api.hidden) must be enabled. Theme: Discord's Ash, with no Valenced colour theme
  selected.

## 2. Bridge

- Start `node tools/bridge.js` in the background and leave it running.
- Force-stop and reopen Discord (Valenced connects once, at startup):
  `adb -s $ANDROID_SERIAL shell am force-stop <package>` then `monkey -p <package> 1`.
- `curl -s 127.0.0.1:7685/status` must show `"connected":true`.

## 3. Dump

- `node tools/dump.js`. It writes `data/tokens.json` and `data/resolved.json` and prints added,
  removed, likely renamed and changed keys (full report in `tools/.work/dump-report.json`).
- For a tested key that Discord renamed, rename it in `data/tested.json`, `data/captures.json`,
  `data/examples.json`, `data/descriptions.json` and the image files, and tell the user.

## 4. Capture, per screen

Screens are the names under `screens` in `data/tested.json`. List them with:
`node -e "const t=require('./data/tested.json');console.log([...new Set(['semantic','raw'].flatMap(k=>Object.values(t[k]).flatMap(e=>Object.keys(e.screens))))].join('\n'))"`

For each screen:

1. Navigate there with `adb -s $ANDROID_SERIAL shell input tap X Y` / `input swipe` / `input keyevent 4` (back).
   Find targets with `adb -s $ANDROID_SERIAL shell uiautomator dump /sdcard/ui.xml && adb -s $ANDROID_SERIAL exec-out cat /sdcard/ui.xml`
   (bounds are in pixels). Check where you are with
   `adb -s $ANDROID_SERIAL exec-out screencap -p > tools/.work/nav.png` and read the image.
   Compare with an existing screenshot for that screen (`data/captures.json`, `screen` field) to match the state.
2. Wait until the screen is still (no loading animations, keyboard state as in the old capture).
3. `node tools/capture.js <screen>` in the background (about 5 to 10 minutes for the full catalogue).
   Quick refresh of known keys only: `--tested`. Single keys: `--keys A,raw/B`. Try `--dry-run` first on a
   new screen; results land in `tools/.work/dry-run/`.
   Pass `--scrambled` only if personal text on screen really is scrambled.
4. Read the summary: new keys, keys not seen any more, and warnings (screen moved, nothing changed).
   Look at the new screenshots in `public/images/` for new keys before keeping them.

`component-*` screens came from component previews that are not in this repo. Skip them unless the
user provides a way to show them; capture never removes other screens' observations.

If a capture was killed and Discord stays pink, run `node tools/capture.js --restore`.

## 5. Descriptions and docs

- `node tools/build-docs.js` lists keys that need a description. Add them to `data/descriptions.json`
  (semantic: `{ "area": <one of "areas">, "text": "..." }`; raw: `{ "text": "..." }`, or
  `{ "skip": "reason" }` for false positives). Write what the key colours on screen, short and plain,
  based on the screenshot. Never rewrite existing descriptions.
- Run `node tools/build-docs.js` again until nothing is missing.
- `npx next build` must pass.

## 6. Report

Summarise for the commit: Discord version (old -> new), added/removed/renamed keys, keys newly seen or
no longer seen per screen, descriptions added. Suggest a one-line commit title. Don't commit unless asked.
