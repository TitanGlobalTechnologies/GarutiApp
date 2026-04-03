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

function esc(str) {
  return (str || "")
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$")
    .replace(/\n/g, " ")
    .replace(/\r/g, "")
    .replace(/"/g, '\\"');
}

let out = `/**
 * Live digest data for all SWFL cities
 * Real scraped content with verified Instagram engagement
 * Generated: ${new Date().toISOString().split("T")[0]}
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

const MAX_AGE_DAYS = 7;
const MAX_POSTS = 5;
const now = new Date();

for (const [key, items] of Object.entries(data)) {
  const city = cityMap[key] || key;

  // --- Safety net: filter stale posts (max 7 days old) ---
  const fresh = items.filter(item => {
    const dateStr = item.date || item.postDate;
    if (!dateStr) return true; // no date = keep (legacy data)
    const d = new Date(dateStr);
    const ageDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
    return ageDays <= MAX_AGE_DAYS;
  });

  // --- Safety net: dedup by shortcode + author (1 post per author) ---
  const seenShortcodes = new Set();
  const seenAuthors = new Set();
  const deduped = fresh.filter(item => {
    const sc = item.shortcode;
    const author = (item.author || item.authorHandle || "").toLowerCase();
    if (seenShortcodes.has(sc)) return false;
    if (author && seenAuthors.has(author)) return false;
    seenShortcodes.add(sc);
    if (author) seenAuthors.add(author);
    return true;
  });

  // Cap at top 5
  const final = deduped.slice(0, MAX_POSTS);

  const dropped = items.length - final.length;
  if (dropped > 0) {
    console.log(`  ${city}: ${items.length} → ${final.length} posts (dropped ${dropped}: stale/duplicate)`);
  }

  out += `  "${city}": [\n`;
  for (const item of final) {
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
      const cities = ["Cape Coral", "Fort Myers", "Naples", "Bonita Springs", "Lehigh Acres", "Punta Gorda"];
      out += `      localizedScripts: {\n`;
      for (const c of cities) {
        const cacheKey = `${item.shortcode}_${c.replace(/\\s/g, "_")}`;
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
console.log("Generated live-digest.ts with " + Object.keys(data).length + " cities, " + Object.values(data).reduce((s, a) => s + a.length, 0) + " total input posts");
