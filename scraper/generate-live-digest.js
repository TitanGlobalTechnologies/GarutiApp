const fs = require("fs");
const path = require("path");

const data = JSON.parse(fs.readFileSync(path.join(__dirname, "output/digest_all_with_scope.json"), "utf-8"));

const cityMap = {
  "Cape Coral_FL": "Cape Coral",
  "Fort Myers_FL": "Fort Myers",
  "Naples_FL": "Naples",
  "Bonita Springs_FL": "Bonita Springs",
  "Lehigh Acres_FL": "Lehigh Acres",
  "Punta Gorda_FL": "Punta Gorda",
  "Florida": "Florida",
  "USA": "USA",
};

const SWFL_CITIES = ["Cape Coral", "Fort Myers", "Naples", "Bonita Springs", "Lehigh Acres", "Punta Gorda"];

// Only these scopes get written to TypeScript — state scopes (Georgia, etc.)
// feed the hierarchy pools but don't become tabs in the app
const OUTPUT_SCOPES = new Set([
  "Cape Coral", "Fort Myers", "Naples", "Bonita Springs",
  "Lehigh Acres", "Punta Gorda", "Florida", "USA",
]);

function esc(str) {
  return (str || "")
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$")
    .replace(/\n/g, " ")
    .replace(/\r/g, "")
    .replace(/"/g, '\\"');
}

function getDateStr(daysBack) {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return d.toISOString().split("T")[0];
}

const MAX_AGE_DAYS = 7;
const MAX_POSTS = 5;
const MAX_POSTS_USA = 10;  // USA tab shows more — all fresh viral posts
const now = new Date();

/**
 * FRESHNESS > VIRALITY. Always.
 * Sort by date (newest first), then by virality within the same date.
 * A 100-virality post from yesterday beats a 10,000-virality post from 3 days ago.
 */
function freshFirstSort(a, b) {
  const dateA = a.date || a.postDate || "1970-01-01";
  const dateB = b.date || b.postDate || "1970-01-01";
  if (dateA !== dateB) return dateB.localeCompare(dateA); // newest date wins
  return b.viralityScore - a.viralityScore; // within same date, highest virality wins
}

// ── Step 1: Clean all posts per scope (dedup + freshness) ──
const cleanByScope = {};
for (const [key, items] of Object.entries(data)) {
  const city = cityMap[key] || key;
  const fresh = items.filter(item => {
    const dateStr = item.date || item.postDate;
    if (!dateStr) return true;
    const d = new Date(dateStr);
    return (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24) <= MAX_AGE_DAYS;
  });
  const seenSC = new Set();
  const seenAuth = new Set();
  const deduped = fresh.filter(item => {
    const sc = item.shortcode;
    const author = (item.author || item.authorHandle || "").toLowerCase();
    if (seenSC.has(sc)) return false;
    if (author && seenAuth.has(author)) return false;
    seenSC.add(sc);
    if (author) seenAuth.add(author);
    return true;
  });
  // SELECTION by freshness (yesterday fills first)
  deduped.sort(freshFirstSort);
  // Pick the freshest, then re-sort by virality for DISPLAY
  const selected = deduped.slice(0, MAX_POSTS);
  selected.sort((a, b) => b.viralityScore - a.viralityScore);
  // Full pool for hierarchy (freshFirstSort), selected first for output (virality)
  cleanByScope[city] = [...selected, ...deduped.slice(MAX_POSTS)];
}

// ── Step 2: Build hierarchy ──
// Collect ALL posts from every scope into a flat pool
const allPosts = [];
for (const [city, posts] of Object.entries(cleanByScope)) {
  for (const p of posts) {
    allPosts.push({ ...p, _scope: city });
  }
}

function dedupTopN(posts, n) {
  const seenSC = new Set();
  const seenAuth = new Set();
  const result = [];
  for (const p of posts) {
    if (result.length >= n) break;
    const sc = p.shortcode;
    const author = (p.author || p.authorHandle || "").toLowerCase();
    if (seenSC.has(sc)) continue;
    if (author && seenAuth.has(author)) continue;
    seenSC.add(sc);
    if (author) seenAuth.add(author);
    result.push(p);
  }
  return result;
}

// For FL/USA hierarchy tabs: match the scraper's 7-day lookback window
// The scraper already prioritizes yesterday-first, so anything it found is valid
const HIERARCHY_MAX_AGE = 7;
const freshOnly = allPosts.filter(p => {
  const dateStr = p.date || p.postDate;
  if (!dateStr) return false; // no date = don't include in hierarchy
  const d = new Date(dateStr);
  return (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24) <= HIERARCHY_MAX_AGE;
});
// ── Priority: Cities > Florida > USA ──
// Smaller areas get first dibs on their best posts

const EXTRA_MIN_SCORE = 800;
const isFlScope = (p) => p._scope === "Florida" || SWFL_CITIES.includes(p._scope);

// FLORIDA tab: two-pass (same pattern as USA)
// Base 5: freshest FL+city posts
const flPool = freshOnly.filter(isFlScope);
flPool.sort(freshFirstSort);
const flBase = dedupTopN(flPool, MAX_POSTS);
// Extras: any FL post with 800+ virality not already in base
const flSelectedSC = new Set(flBase.map(p => p.shortcode));
const flSelectedAuth = new Set(flBase.map(p => (p.author || p.authorHandle || "").toLowerCase()).filter(Boolean));
const flExtras = [];
for (const p of [...flPool].sort((a, b) => b.viralityScore - a.viralityScore)) {
  if (flExtras.length >= 5) break;
  if (flSelectedSC.has(p.shortcode)) continue;
  const auth = (p.author || p.authorHandle || "").toLowerCase();
  if (auth && flSelectedAuth.has(auth)) continue;
  if (p.viralityScore < EXTRA_MIN_SCORE) continue;
  flSelectedSC.add(p.shortcode);
  if (auth) flSelectedAuth.add(auth);
  flExtras.push(p);
}
// Display by virality within base, extras after
flBase.sort((a, b) => b.viralityScore - a.viralityScore);
const floridaTop = [...flBase, ...flExtras];

// USA tab: national leaderboard — top posts from ALL states
// Select freshest first (yesterday fills slots), display by virality
const usaPool = [...freshOnly].sort(freshFirstSort);
const usaBase = dedupTopN(usaPool, MAX_POSTS);
// Extras: 800+ from yesterday, not already in base
const yesterday = getDateStr(1);
const usaSelectedSC = new Set(usaBase.map(p => p.shortcode));
const usaSelectedAuth = new Set(usaBase.map(p => (p.author || p.authorHandle || "").toLowerCase()).filter(Boolean));
const usaExtras = [];
for (const p of [...freshOnly].sort((a, b) => b.viralityScore - a.viralityScore)) {
  if (usaExtras.length >= MAX_POSTS_USA - MAX_POSTS) break;
  if (usaSelectedSC.has(p.shortcode)) continue;
  const auth = (p.author || p.authorHandle || "").toLowerCase();
  if (auth && usaSelectedAuth.has(auth)) continue;
  if (p.viralityScore < EXTRA_MIN_SCORE) continue;
  const pDate = p.date || p.postDate || "";
  if (pDate !== yesterday) continue;
  usaSelectedSC.add(p.shortcode);
  if (auth) usaSelectedAuth.add(auth);
  usaExtras.push(p);
}
// Display by virality
usaBase.sort((a, b) => b.viralityScore - a.viralityScore);
const usaTop = [...usaBase, ...usaExtras];

// Override the Florida and USA entries
cleanByScope["Florida"] = floridaTop;
cleanByScope["USA"] = usaTop;

console.log("Hierarchy built:");
console.log("  USA: " + usaTop.map(p => "👾" + p.viralityScore + " @" + (p.author || p.authorHandle) + " [" + p._scope + "]").join(", "));
console.log("  FL:  " + floridaTop.map(p => "👾" + p.viralityScore + " @" + (p.author || p.authorHandle) + " [" + p._scope + "]").join(", "));

// ── Step 3: Generate TypeScript ──
let out = `/**
 * Live digest data for all SWFL cities
 * Real scraped content with verified Instagram engagement
 * Generated: ${now.toISOString().split("T")[0]}
 *
 * Hierarchy: USA = top 10 freshest from all, Florida = top 5 freshest from FL+cities
 * FRESHNESS > VIRALITY: yesterday's posts always beat older ones
 */

import type { DiscoveredContent } from "../lib/content-pipeline";

export interface LiveDigestItem {
  shortcode: string;
  url: string;
  title: string;
  authorHandle: string;
  views: number;
  likes: number;
  comments: number;
  viralityScore: number;
  script: string;
  caption: string;
  postDate?: string;
}

export type SupportedCity = "Cape Coral" | "Fort Myers" | "Naples" | "Bonita Springs" | "Lehigh Acres" | "Punta Gorda" | "Florida" | "USA";

export const CITY_DIGESTS: Record<SupportedCity, LiveDigestItem[]> = {\n`;

for (const [city, items] of Object.entries(cleanByScope)) {
  // Skip state scopes (Georgia, Texas, etc.) — they feed hierarchy only
  if (!OUTPUT_SCOPES.has(city)) continue;
  // Cap per-city tabs at 5, USA at 10 (already capped by hierarchy)
  const maxForScope = (city === "USA") ? MAX_POSTS_USA : MAX_POSTS;
  const outputItems = items.slice(0, maxForScope);
  out += `  "${city}": [\n`;
  for (const item of outputItems) {
    out += `    {\n`;
    out += `      shortcode: "${item.shortcode}",\n`;
    out += `      url: "${item.url}",\n`;
    out += `      title: "${esc(item.title)}",\n`;
    out += `      authorHandle: "${esc(item.authorHandle || item.author || '')}",\n`;
    out += `      views: ${item.views},\n`;
    out += `      likes: ${item.likes},\n`;
    out += `      comments: ${item.comments},\n`;
    out += `      viralityScore: ${item.viralityScore},\n`;
    out += `      script: "${esc(item.script)}",\n`;
    out += `      caption: "${esc(item.caption || item.title)}",\n`;
    if (item.date) out += `      postDate: "${item.date}",\n`;

    // For Florida/USA entries, embed localized scripts per city
    if (city === "Florida" || city === "USA") {
      out += `      localizedScripts: {\n`;
      for (const c of SWFL_CITIES) {
        const cacheKey = `${item.shortcode}_${c.replace(/\s/g, "_")}`;
        const cachePath = path.join(__dirname, "output/script_cache", `${cacheKey}.txt`);
        let locScript = "";
        try { locScript = fs.readFileSync(cachePath, "utf-8"); } catch {}
        out += `        "${c}": "${esc(locScript || item.script)}",\n`;
      }
      out += `      },\n`;
    }

    out += `    },\n`;
  }
  out += `  ],\n`;
}

out += `};

export function getDigestForCity(city: SupportedCity): LiveDigestItem[] {
  return CITY_DIGESTS[city] || CITY_DIGESTS["Cape Coral"];
}

export function getLiveDigestContent(city: SupportedCity = "Cape Coral"): DiscoveredContent[] {
  return getDigestForCity(city).map((item) => ({
    url: item.url,
    title: item.title,
    caption: item.caption,
    platform: "instagram" as const,
    creatorHandle: item.authorHandle,
    creatorName: item.authorHandle,
    thumbnail: "",
    views: item.views,
    likes: item.likes,
    comments: item.comments,
    engagementRate: item.viralityScore,
    discoveredAt: item.postDate || new Date().toISOString().split("T")[0],
  }));
}
`;

const outPath = path.join(__dirname, "../src/data/live-digest.ts");
fs.writeFileSync(outPath, out);
console.log("Generated live-digest.ts with " + Object.keys(cleanByScope).length + " scopes");
