/**
 * Google Custom Search API — discovers Instagram Reel URLs by location
 * Free: 100 queries/day, 10 results per query
 * We use 2 queries per location = 20 candidate Reels
 */

import { config } from "./config";
import * as fs from "fs";
import * as path from "path";

export interface GoogleResult {
  title: string;
  url: string;
  snippet: string;
  displayLink: string;
}

interface GoogleApiResponse {
  items?: Array<{
    title: string;
    link: string;
    snippet: string;
    displayLink: string;
  }>;
  searchInformation?: { totalResults: string };
}

/**
 * Search Google Custom Search API for Instagram Reels in a specific market
 */
async function searchLive(query: string): Promise<GoogleResult[]> {
  const params = new URLSearchParams({
    key: config.googleCseKey,
    cx: config.googleCseCx,
    q: query,
    num: "10",
    // dateRestrict: "w1", // last week — uncomment for production
  });

  const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google CSE error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as GoogleApiResponse;

  return (data.items || []).map((item) => ({
    title: item.title,
    url: item.link,
    snippet: item.snippet,
    displayLink: item.displayLink,
  }));
}

/**
 * Load from cached fixture file
 */
function searchMock(query: string): GoogleResult[] {
  const filename = query
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .toLowerCase()
    .slice(0, 80) + ".json";

  const filepath = path.join(config.fixturesDir, "google", filename);

  if (fs.existsSync(filepath)) {
    return JSON.parse(fs.readFileSync(filepath, "utf-8"));
  }

  console.warn(`[mock] No fixture for query: ${query} (expected: ${filepath})`);
  return [];
}

/**
 * Save live results as a fixture for future mock runs
 */
function saveFixture(query: string, results: GoogleResult[]) {
  const dir = path.join(config.fixturesDir, "google");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filename = query
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .toLowerCase()
    .slice(0, 80) + ".json";

  fs.writeFileSync(path.join(dir, filename), JSON.stringify(results, null, 2));
  console.log(`[fixture] Saved ${results.length} results → ${filename}`);
}

/**
 * Main search function — respects mock/live mode
 */
export async function searchInstagramReels(
  city: string,
  state: string
): Promise<GoogleResult[]> {
  const queries = [
    `site:instagram.com/reel "${city}" real estate`,
    `site:instagram.com/reel "${city} ${state}" homes realtor`,
  ];

  const allResults: GoogleResult[] = [];

  for (const query of queries) {
    console.log(`[search] ${config.mode === "mock" ? "MOCK" : "LIVE"}: ${query}`);

    let results: GoogleResult[];

    if (config.mode === "mock") {
      results = searchMock(query);
    } else {
      results = await searchLive(query);
      saveFixture(query, results); // Auto-save for future mock runs
    }

    allResults.push(...results);
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  return allResults.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
}
