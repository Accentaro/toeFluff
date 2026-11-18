import fs from "fs";
import { zstdDecompressSync } from "zlib";

import { unpack } from "msgpackr";

const VALENCED_PIN = "https://raw.githubusercontent.com/Valenced/valenced/main/android/patches/apps/discord/patch/src/main/kotlin/app/valenced/patches/discord/Discord.kt";
const TRACKER = process.env.TRACKER_URL ?? "https://tracker.thororen.com";
const THEMES = { ASH: "dark", LIGHT: "light", ONYX: "midnight", DARK: "darker" };
const BASES = ["dark", "darker", "light", "midnight"];

async function get(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
    return res;
}

const readJson = file => JSON.parse(fs.readFileSync(file, "utf8"));

const version = (await (await get(VALENCED_PIN)).text()).match(/"com\.discord"\("([^"]+)"\)/)?.[1];
if (!version) throw new Error("Discord version pin not found in Valenced");

const resolved = readJson("data/resolved.json");
if (version === resolved.discord) {
    console.log(`Keys are already on ${version}`);
    process.exit(0);
}

const build = (await (await get(`${TRACKER}/android/builds`)).json()).find(b => b.versionName === version);
if (!build?.modules) {
    console.log(`::warning::${version} has no decompiled modules on ${TRACKER} yet`);
    process.exit(0);
}

const { modules } = unpack(zstdDecompressSync(Buffer.from(await (await get(`${TRACKER}/build/android-${build.versionCode}/full`)).arrayBuffer())));
const sources = Object.values(modules);
const rawSource = sources.find(s => s.includes("{'RawColors': null}"));
const semanticSource = sources.find(s => s.includes("{'SemanticColors': null}"));
if (!rawSource || !semanticSource) throw new Error(`Colour modules not found in ${version}`);

const raw = Object.fromEntries([...rawSource.matchAll(/'(\w+)': '(#[0-9a-f]{6,8})'/g)].map(m => [m[1], m[2]]));

// hermes-dec prints both `obj[slot] = r` and `obj[rN] = r` as `obj[N] = r`, so a register holding a theme means a theme key
const regs = {};
let colors;
for (const line of semanticSource.split("\n")) {
    let m = line.match(/^\s*r(\d+) = (.*);$/);
    if (m) {
        const theme = m[2].match(/^r\d+\.(\w+)$/)?.[1];
        regs[m[1]] = m[2].startsWith("{") ? JSON.parse(m[2].replace(/'/g, "\"")) : theme in THEMES ? { theme: THEMES[theme] } : undefined;
        if (regs[m[1]] && "SemanticColors" in regs[m[1]]) colors = regs[m[1]];
        continue;
    }
    m = line.match(/^\s*r(\d+)\[(?:(\d+)|'(\w+)')\] = r(\d+);$/);
    if (!m || !regs[m[1]]) continue;
    const key = m[3] ?? regs[m[2]]?.theme ?? Object.keys(regs[m[1]])[m[2]];
    regs[m[1]][key] = regs[m[4]];
}

const semantic = colors?.SemanticColors;
if (!semantic) throw new Error(`SemanticColors not found in ${version}`);
for (const [key, token] of Object.entries(semantic)) {
    if (!BASES.every(b => token?.[b]?.raw in raw)) throw new Error(`Could not read ${key} from ${version}`);
}

const oldTokens = readJson("data/tokens.json");
const added = [...Object.keys(semantic), ...Object.keys(raw)].filter(k => !(k in oldTokens.semantic) && !(k in oldTokens.raw));
const removed = [...Object.keys(oldTokens.semantic), ...Object.keys(oldTokens.raw)].filter(k => !(k in semantic) && !(k in raw));

const defaults = Object.fromEntries(Object.entries(semantic).map(([key, token]) => [key, Object.fromEntries(BASES.map(b => {
    const { raw: name, opacity } = token[b];
    return [b, raw[name].slice(0, 7) + (opacity >= 1 ? "" : Math.round(opacity * 255).toString(16).padStart(2, "0"))];
}))]));

fs.writeFileSync("data/tokens.json", JSON.stringify({ semantic, raw }));
fs.writeFileSync("data/resolved.json", JSON.stringify({ discord: version, semantic: defaults }));

const keys = readJson("data/keys.json");
keys.semantic = keys.semantic.filter(k => k.key in semantic);
keys.raw = keys.raw.filter(k => k.key in raw);
for (const k of keys.semantic) {
    k.defaults = defaults[k.key];
    k.raw = Object.fromEntries(BASES.map(b => [b, semantic[k.key][b].raw]));
}
for (const k of keys.raw) {
    k.value = raw[k.key];
    k.usedBy = Object.keys(semantic).filter(s => semantic[s].dark.raw === k.key);
}
fs.writeFileSync("data/keys.json", JSON.stringify(keys, null, 2) + "\n");

if (removed.length) {
    const descriptions = readJson("data/descriptions.json");
    const tested = readJson("data/tested.json");
    for (const key of removed) {
        delete descriptions.semantic[key];
        delete descriptions.raw[key];
        delete tested.semantic[key];
        delete tested.raw[key];
    }
    fs.writeFileSync("data/descriptions.json", JSON.stringify(descriptions, null, 2) + "\n");
    fs.writeFileSync("data/tested.json", JSON.stringify(tested, null, 1) + "\n");
    fs.writeFileSync("KEYS.md", fs.readFileSync("KEYS.md", "utf8").split("\n").filter(l => !removed.includes(l.match(/^\| `(\w+)` \|/)?.[1])).join("\n"));
}

const testedKeys = new Set([...keys.semantic, ...keys.raw].filter(k => k.tested).map(k => k.key));
const semanticRows = Object.keys(semantic).sort((a, b) => a < b ? -1 : 1)
    .map(key => `| ${testedKeys.has(key) ? "yes" : ""} | \`${key}\` | ${BASES.map(b => defaults[key][b]).join(" | ")} | ${semantic[key].dark.raw} |\n`).join("");
const rawRows = Object.entries(raw).map(([key, value]) => `| \`${key}\` | \`${value}\` |\n`).join("");
fs.writeFileSync("ALL-KEYS.md", fs.readFileSync("ALL-KEYS.md", "utf8").replace(/\r\n/g, "\n")
    .replace(/Every colour key in Discord .+?,/, () => `Every colour key in Discord ${version},`)
    .replace(/(\| Tested \|.*\n\|.*\n)(\|.*\n)+/, (_, head) => head + semanticRows)
    .replace(/<summary>\d+ raw colours/, () => `<summary>${Object.keys(raw).length} raw colours`)
    .replace(/(\| Key \| Value \|\n\|.*\n)(\|.*\n)+/, (_, head) => head + rawRows));

console.log(`Synced keys to ${version} (${build.versionCode})`);
console.log(`Added: ${added.join(", ") || "none"}`);
console.log(`Removed: ${removed.join(", ") || "none"}`);
