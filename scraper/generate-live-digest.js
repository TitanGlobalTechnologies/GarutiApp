/**
 * FRESHNESS RULE (NEVER FORGET):
 * 1. ALL posts from yesterday take priority. Rank by virality. Fill the tab.
 * 2. If yesterday has fewer than 5 posts → grab from yesterday-1 (day before).
 *    Pick the most viral from that day to complete 5 total.
 * 3. Yesterday-1 posts appear AFTER yesterday's posts in the tab.
 * 4. If still fewer than 5 → go to yesterday-2. Same logic. Max 7 days back.
 * 5. Display order is ALWAYS virality descending within each date group.
 * 6. NEVER show an older post ahead of a newer post, regardless of virality.
 */
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
  // USA tab removed — Florida is the aggregate of everything
};

const SWFL_CITIES = ["Cape Coral", "Fort Myers", "Naples", "Bonita Springs", "Lehigh Acres", "Punta Gorda"];

// Only these scopes get written to TypeScript — state scopes (Georgia, etc.)
// feed the hierarchy pools but don't become tabs in the app
const OUTPUT_SCOPES = new Set([
  "Cape Coral", "Fort Myers", "Naples", "Bonita Springs",
  "Lehigh Acres", "Punta Gorda", "Florida",
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
const MAX_POSTS_USA = 5;
const now = new Date();

// SCRAPE TARGET DATE: pass via CLI arg, or default to yesterday.
// Usage: node generate-live-digest.js 2026-04-06
// This is the date we ACTUALLY scraped for. Posts after this date are junk.
const SCRAPE_TARGET = process.argv[2] || (() => {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
})();
console.log("Scrape target date: " + SCRAPE_TARGET + " (posts after this date excluded)");

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

// ── CITY HARD GATE: verify post actually mentions the city ──
// This is THE #1 PRIORITY. A post must mention its city in location tag, caption, title, or transcript.
// Same rules for Instagram AND YouTube. No exceptions.
const CITY_VERIFY = {
  "Cape Coral_FL": ["cape coral", "capecoral", "#capecoral"],
  "Fort Myers_FL": ["fort myers", "ft myers", "ft. myers", "fortmyers", "#fortmyers"],
  "Naples_FL": ["naples", "#naples"],
  "Bonita Springs_FL": ["bonita springs", "bonitasprings", "#bonitasprings"],
  "Lehigh Acres_FL": ["lehigh acres", "lehighacres", "#lehighacres"],
  "Punta Gorda_FL": ["punta gorda", "puntagorda", "#puntagorda", "charlotte county"],
};

function postMentionsCity(item, scopeKey) {
  const aliases = CITY_VERIFY[scopeKey];
  if (!aliases) return true; // Florida or non-city scope — no city check needed
  const loc = (item.locationName || "").toLowerCase();
  const cap = (item.caption || "").toLowerCase();
  const title = (item.title || "").toLowerCase();
  const transcript = (item.transcript || "").toLowerCase();
  const allText = loc + " " + cap + " " + title + " " + transcript;
  if (!aliases.some(a => allText.includes(a))) return false;

  // Multi-city check: if the post mentions 3+ different cities, it's a regional/SWFL
  // market update, not about this specific city. Bump to Florida instead.
  let citiesMentioned = 0;
  for (const [otherScope, otherAliases] of Object.entries(CITY_VERIFY)) {
    if (otherAliases.some(a => allText.includes(a))) citiesMentioned++;
  }
  if (citiesMentioned >= 3) return false; // regional post — not city-specific
  return true;
}

// ── SPANISH FILTER: English only ──
const SPANISH_SIGNALS = [
  "comprar casa", "bienes raices", "inmueble", "hipoteca", "primera vez",
  "sin residencia", "prestamo", "asi puedes", "credito", "inversionista",
  "ventas de casas", "tu casa", "tu hogar", "aqui te", "mira este",
  "propiedad en venta", "agente de bienes", "empieza la historia",
];
function isSpanish(item) {
  const text = ((item.caption || "") + " " + (item.title || "") + " " + (item.transcript || "")).toLowerCase();
  return SPANISH_SIGNALS.some(s => text.includes(s));
}

// ── Step 1: Clean all posts per scope (dedup + freshness + CITY VERIFICATION) ──
const cleanByScope = {};
let locationRejected = 0;
let cityGateRejected = 0;
for (const [key, items] of Object.entries(data)) {
  const city = cityMap[key] || key;
  const isFlScope = key.includes("_FL") || key === "Florida";
  const isCityScope = key.includes("_FL") && key !== "Florida";

  const fresh = items.filter(item => {
    const dateStr = item.date || item.postDate;
    if (!dateStr) return true;
    const d = new Date(dateStr);
    return (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24) <= MAX_AGE_DAYS;
  });

  // CITY HARD GATE: post must mention its assigned city
  // This applies to BOTH Instagram AND YouTube
  const cityVerified = fresh.filter(item => {
    if (!isCityScope) return true; // Florida scope — skip city check
    if (postMentionsCity(item, key)) return true;
    cityGateRejected++;
    return false;
  });

  // Spanish filter: English only
  const englishOnly = cityVerified.filter(item => {
    if (isSpanish(item)) {
      console.log("  REJECTED: @" + (item.author || item.authorHandle) + " in " + key + " — spanish");
      return false;
    }
    return true;
  });

  // Location gate: reject out-of-area posts from FL scopes
  const locationClean = englishOnly.filter(item => {
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
  // Filter: only keep posts from scrape target date or earlier.
  // Posts AFTER the scrape target are "today" junk that slipped in.
  const quality = deduped.filter(item => {
    const d = item.date || item.postDate;
    if (!d) return false;
    if (d > SCRAPE_TARGET) return false; // after scrape target = junk
    if ((item.viralityScore || 0) < 1) return false; // score 0 = broken
    return true;
  });
  // Sort: date-grouped (newest date first), virality within each date
  quality.sort(freshFirstSort);
  // Keep all posts for hierarchy building
  cleanByScope[city] = quality;
}
if (cityGateRejected > 0) console.log("City gate rejected " + cityGateRejected + " posts that don't mention their assigned city");
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

// ── Filter out garbage before hierarchy ──
// Only keep posts from scrape target date or earlier. No score-0. Max 7 days old.
const HIERARCHY_MAX_AGE = 7;
const usablePosts = allPosts.filter(p => {
  const dateStr = p.date || p.postDate;
  if (!dateStr) return false;
  if (dateStr > SCRAPE_TARGET) return false; // after scrape target = junk
  if ((p.viralityScore || 0) < 1) return false;
  const d = new Date(dateStr);
  return (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24) <= HIERARCHY_MAX_AGE;
});

console.log("Usable posts (no today, no score-0, max 7d): " + usablePosts.length + " of " + allPosts.length);

// ── Hierarchy: FL = all cities + FL search, USA = everything ──
const isFlScope = (p) => p._scope === "Florida" || SWFL_CITIES.includes(p._scope);

// FLORIDA = all FL city posts + Florida scope posts
// Freshness first: yesterday's top virality, then day-2, etc.
const flPool = usablePosts.filter(isFlScope);
flPool.sort(freshFirstSort);
const floridaTop = dedupTopN(flPool, MAX_POSTS);

// Override the Florida entry
cleanByScope["Florida"] = floridaTop;

console.log("Hierarchy built:");
console.log("  FL:  " + floridaTop.map(p => "👾" + p.viralityScore + " @" + (p.author || p.authorHandle) + " [" + p._scope + "] " + (p.date || "")).join(", "));

// ── Build debug metadata for each tab ──
const debugInfo = {};
for (const [city, items] of Object.entries(cleanByScope)) {
  if (!OUTPUT_SCOPES.has(city)) continue;
  const sources = {};
  for (const p of items) {
    const src = (p.platform || "instagram") + " via " + (p._scope || city);
    sources[src] = (sources[src] || 0) + 1;
  }
  debugInfo[city] = {
    totalPosts: items.length,
    topScore: items.length > 0 ? items[0].viralityScore : 0,
    sources,
  };
}
if (debugInfo["Florida"]) debugInfo["Florida"]._composition = "All SWFL city posts + Florida-wide search. Freshness > Virality.";

console.log("\nDebug info per tab:");
for (const [city, info] of Object.entries(debugInfo)) {
  console.log("  " + city + ": " + info.totalPosts + " posts, top score: " + info.topScore + " | sources: " + JSON.stringify(info.sources));
}

// ── Step 3: Generate TypeScript ──
let out = `/**
 * Live digest data for all SWFL cities
 * Generated: ${now.toISOString().split("T")[0]}
 *
 * TAB HIERARCHY:
 *   City tabs: posts found specifically for that city
 *   Florida tab: ALL city posts + Florida-wide search (union of all FL data)
 *   USA tab: ALL posts from ALL scopes (cities + FL + all states + USA search)
 *
 * RULES:
 *   - Freshness > Virality: yesterday first, then day-2, etc.
 *   - No "today" posts (no views yet)
 *   - No score-0 posts (broken enrichment)
 *   - 5 posts per tab max
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
  platform?: string;
  sourceTab?: string;
  localizedScripts?: Record<string, string>;
  hasSpeech?: boolean;
}

export type SupportedCity = "Cape Coral" | "Fort Myers" | "Naples" | "Bonita Springs" | "Lehigh Acres" | "Punta Gorda" | "Florida";

// Debug: shows what search queries feed each tab
export const TAB_DEBUG: Record<string, string> = {
  "Cape Coral": "YT API: 'Cape Coral real estate/homes/realtor' | SerpAPI: site:youtube.com/shorts 'cape coral' + geo:Cape Coral,FL",
  "Fort Myers": "YT API: 'Fort Myers real estate/homes/realtor' | SerpAPI: site:youtube.com/shorts + geo:Fort Myers,FL",
  "Naples": "YT API: 'Naples Florida real estate/homes/realtor' | SerpAPI: site:youtube.com/shorts + geo:Naples,FL",
  "Bonita Springs": "YT API: 'Bonita Springs real estate/homes/realtor' | SerpAPI: site:youtube.com/shorts + geo:Bonita Springs,FL",
  "Lehigh Acres": "YT API: 'Lehigh Acres real estate/homes/realtor' | SerpAPI: site:youtube.com/shorts + geo:Lehigh Acres,FL",
  "Punta Gorda": "YT API: 'Punta Gorda real estate/homes/realtor' | SerpAPI: site:youtube.com/shorts + geo:Punta Gorda,FL",
  "Florida": "= Cape Coral + Fort Myers + Naples + Bonita Springs + Lehigh Acres + Punta Gorda + Florida-wide search (geo:Florida, queries: real estate/realtor/homes for sale). Top 5 by freshness then virality.",
};

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
    out += `      platform: "${item.platform || "instagram"}",\n`;
    if (item._scope && item._scope !== city) out += `      sourceTab: "${item._scope}",\n`;

    // For Florida/USA entries, embed localized scripts per city
    if (city === "Florida") {
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
    platform: (item.platform || "instagram") as "instagram" | "youtube",
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
