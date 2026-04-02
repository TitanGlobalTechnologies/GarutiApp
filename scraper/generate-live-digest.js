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
}

export type SupportedCity = "Cape Coral" | "Fort Myers" | "Naples" | "Bonita Springs" | "Lehigh Acres" | "Punta Gorda";

export const CITY_DIGESTS: Record<SupportedCity, LiveDigestItem[]> = {\n`;

for (const [key, items] of Object.entries(data)) {
  const city = cityMap[key] || key;
  out += `  "${city}": [\n`;
  for (const item of items) {
    out += `    {\n`;
    out += `      shortcode: "${item.shortcode}",\n`;
    out += `      url: "${item.url}",\n`;
    out += `      title: "${esc(item.title)}",\n`;
    out += `      authorHandle: "${esc(item.authorHandle)}",\n`;
    out += `      views: ${item.views},\n`;
    out += `      likes: ${item.likes},\n`;
    out += `      comments: ${item.comments},\n`;
    out += `      viralityScore: ${item.viralityScore},\n`;
    out += `      script: "${esc(item.script)}",\n`;
    out += `      caption: "${esc(item.caption || item.title)}",\n`;
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
    discoveredAt: new Date().toISOString(),
  }));
}
`;

const outPath = path.join(__dirname, "../src/data/live-digest.ts");
fs.writeFileSync(outPath, out);
console.log("Generated live-digest.ts with " + Object.keys(data).length + " cities, " + Object.values(data).reduce((s, a) => s + a.length, 0) + " posts");
