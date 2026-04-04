const fs = require("fs");
const path = require("path");

const data = JSON.parse(fs.readFileSync(path.join(__dirname, "output/digest_all_with_scope.json"), "utf-8"));

// Load audit reject list (if it exists) — filter out rejected posts without modifying raw data
let auditRejects = new Set();
try {
  const rejectData = JSON.parse(fs.readFileSync(path.join(__dirname, "output/audit_rejects.json"), "utf-8"));
  auditRejects = new Set(rejectData.rejectShortcodes || []);
  if (auditRejects.size > 0) console.log("Audit reject list: " + auditRejects.size + " posts will be filtered out");
} catch {}

// Remove rejected posts from each scope (in memory only, raw file untouched)
for (const [key, items] of Object.entries(data)) {
  data[key] = items.filter(item => !auditRejects.has(item.shortcode));
}

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
const MAX_POSTS_USA = 5;   // USA tab: 5 posts, same as all other tabs
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

// ── HARD LOCATION GATE — last line of defense ──
// If a post in an FL scope has ANY of these in locationName, caption, or title → reject
const OUT_OF_AREA_SIGNALS = [
  "los angeles", "san francisco", "san diego", "seattle", "portland",
  "chicago", "detroit", "denver", "phoenix", "las vegas", "boston",
  "houston", "dallas", "austin", "san antonio", "atlanta", "columbus ohio",
  "sacramento", "tucson", "philadelphia", "pittsburgh", "cleveland",
  "milwaukee", "indianapolis", "st. louis", "kansas city", "brooklyn",
  "manhattan", "amelia island", "hollywood", "weston", "idaho",
  "maryland", "california", "arizona", "connecticut", "oregon", "montana",
  "pennsylvania", "kentucky", "ohio", "illinois", "massachusetts", "maine",
  "colorado", "minnesota", "michigan", "hawaii", "utah", "nevada",
  "#losangelesrealtor", "#houstonrealtor", "#dallasrealtor", "#atlantarealtor",
  "#chicagorealtor", "#austinrealtor", "#denverrealtor", "#seattlerealtor",
];

// Signals that are definitive even standalone (state/country names in captions)
const HARD_STATE_SIGNALS = [
  "of california", "in california", "california inc", "california realtor",
  "of arizona", "in arizona", "arizona realtor",
  "of oregon", "in oregon", "oregon realtor",
  "of montana", "in montana", "of idaho", "in idaho",
  "of ohio", "in ohio", "of maryland", "in maryland",
  "of connecticut", "in connecticut", "of pennsylvania", "in pennsylvania",
  "of kentucky", "in kentucky", "of maine", "in maine",
  "of colorado", "in colorado", "of michigan", "in michigan",
  "of minnesota", "in minnesota", "of illinois", "in illinois",
  "of massachusetts", "in massachusetts", "of hawaii", "in hawaii",
  "of utah", "in utah", "of nevada", "in nevada",
  "of washington state", "in washington state",
];

function isOutOfArea(item) {
  const loc = (item.locationName || "").toLowerCase();
  const cap = (item.caption || "").toLowerCase();
  const title = (item.title || "").toLowerCase();

  // Instagram location tag — definitive
  for (const signal of OUT_OF_AREA_SIGNALS) {
    if (loc.includes(signal)) return signal;
  }

  // Caption/title near "realtor" or "real estate"
  for (const signal of OUT_OF_AREA_SIGNALS) {
    if (cap.includes(signal + " realtor") || cap.includes(signal + " real estate") ||
        cap.includes("#" + signal.replace(/ /g, "") + "realtor") ||
        cap.includes("#" + signal.replace(/ /g, "") + "realestate") ||
        title.includes(signal + " real")) {
      return signal;
    }
  }

  // Hard state signals — standalone in caption
  for (const signal of HARD_STATE_SIGNALS) {
    if (cap.includes(signal) || title.includes(signal)) return signal;
  }

  // Hashtag check — #utah, #arizona, #california etc. as standalone hashtags
  const NON_FL_STATE_HASHTAGS = [
    "#utah", "#arizona", "#california", "#oregon", "#montana", "#idaho",
    "#ohio", "#maryland", "#connecticut", "#pennsylvania", "#kentucky",
    "#maine", "#colorado", "#michigan", "#minnesota", "#illinois",
    "#massachusetts", "#hawaii", "#nevada", "#washington", "#wisconsin",
    "#indiana", "#missouri", "#iowa", "#kansas", "#oklahoma", "#nebraska",
    "#arkansas", "#westvirginia", "#northdakota", "#southdakota", "#wyoming",
    "#vermont", "#newhampshire", "#rhodeisland", "#delaware", "#newmexico",
    "#alaska",
  ];
  for (const tag of NON_FL_STATE_HASHTAGS) {
    if (cap.includes(tag) || title.includes(tag)) return tag;
  }

  return null;
}

// ── Step 1: Clean all posts per scope (dedup + freshness + location gate) ──
const cleanByScope = {};
let locationRejected = 0;
for (const [key, items] of Object.entries(data)) {
  const city = cityMap[key] || key;
  const isFlScope = key.includes("_FL") || key === "Florida";

  const fresh = items.filter(item => {
    const dateStr = item.date || item.postDate;
    if (!dateStr) return true;
    const d = new Date(dateStr);
    return (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24) <= MAX_AGE_DAYS;
  });

  // Location gate: reject out-of-area posts from FL scopes
  const locationClean = fresh.filter(item => {
    if (!isFlScope) return true;
    const badSignal = isOutOfArea(item);
    if (badSignal) {
      console.log("  REJECTED: @" + (item.author || item.authorHandle) + " in " + key + " — " + badSignal);
      locationRejected++;
      return false;
    }
    return true;
  });
  const seenSC = new Set();
  const seenAuth = new Set();
  const deduped = locationClean.filter(item => {
    const sc = item.shortcode;
    const author = (item.author || item.authorHandle || "").toLowerCase();
    if (seenSC.has(sc)) return false;
    if (author && seenAuth.has(author)) return false;
    seenSC.add(sc);
    if (author) seenAuth.add(author);
    return true;
  });
  // Sort: date-grouped (newest date first), virality within each date
  deduped.sort(freshFirstSort);
  // Keep all posts for hierarchy building
  cleanByScope[city] = deduped;
}
if (locationRejected > 0) console.log("Location gate rejected " + locationRejected + " out-of-area posts");

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
// ── Hierarchy: FL = all cities + FL search, USA = everything ──
const isFlScope = (p) => p._scope === "Florida" || SWFL_CITIES.includes(p._scope);

// FLORIDA = all FL city posts + Florida scope posts, date-grouped then virality
const flPool = freshOnly.filter(isFlScope);
flPool.sort(freshFirstSort);
const floridaTop = dedupTopN(flPool, MAX_POSTS);

// USA = ALL posts from ALL scopes, top 5 by virality
const usaPool = [...freshOnly].sort((a, b) => b.viralityScore - a.viralityScore);
const usaTop = dedupTopN(usaPool, MAX_POSTS);

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
  const maxForScope = MAX_POSTS;
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
    if (item.hasSpeech === false) out += `      hasSpeech: false,\n`;

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
