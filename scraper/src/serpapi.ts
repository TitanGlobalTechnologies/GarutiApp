/**
 * SerpAPI Client — discovers Instagram Reels by location
 *
 * Uses SerpAPI's Google Search endpoint with:
 * - site:instagram.com/reel filter
 * - Location targeting via zip code or city,state
 * - Date filter for recent content (past week)
 *
 * Free tier: 250 searches/month. We use ~2 per location per run.
 */

import { config } from "./config";
import * as fs from "fs";
import * as path from "path";

export interface SerpResult {
  title: string;
  url: string;
  snippet: string;
  position: number;
}

interface SerpApiResponse {
  organic_results?: Array<{
    title: string;
    link: string;
    snippet: string;
    position: number;
  }>;
  search_information?: {
    total_results: number;
    query_displayed: string;
  };
  error?: string;
}

/**
 * Search SerpAPI for Instagram Reels in a specific market
 */
async function searchLive(query: string, location: string): Promise<SerpResult[]> {
  const params = new URLSearchParams({
    api_key: config.serpApiKey,
    engine: "google",
    q: query,
    location: location,
    gl: "us",
    hl: "en",
    tbs: "qdr:w", // past week
    num: "10",
  });

  console.log(`  [serpapi] Querying: ${query}`);
  console.log(`  [serpapi] Location: ${location}`);

  const res = await fetch(`https://serpapi.com/search.json?${params}`);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`SerpAPI error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as SerpApiResponse;

  if (data.error) {
    throw new Error(`SerpAPI error: ${data.error}`);
  }

  const results = (data.organic_results || []).map((item) => ({
    title: item.title,
    url: item.link,
    snippet: item.snippet || "",
    position: item.position,
  }));

  console.log(`  [serpapi] Got ${results.length} results`);
  return results;
}

/**
 * Load from cached fixture
 */
function searchMock(query: string): SerpResult[] {
  const filename = query
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .toLowerCase()
    .slice(0, 80) + ".json";

  const filepath = path.join(config.fixturesDir, "serpapi", filename);

  if (fs.existsSync(filepath)) {
    return JSON.parse(fs.readFileSync(filepath, "utf-8"));
  }

  // Fall back to google fixtures if serpapi fixtures don't exist yet
  const googlePath = path.join(config.fixturesDir, "google", filename);
  if (fs.existsSync(googlePath)) {
    console.log(`  [mock] Using Google fixture as fallback: ${filename}`);
    const googleResults = JSON.parse(fs.readFileSync(googlePath, "utf-8"));
    return googleResults.map((r: any, i: number) => ({
      title: r.title,
      url: r.url,
      snippet: r.snippet,
      position: i + 1,
    }));
  }

  console.warn(`  [mock] No fixture found for: ${filename}`);
  return [];
}

/**
 * Save live results as fixture for future mock runs
 */
function saveFixture(query: string, results: SerpResult[]) {
  const dir = path.join(config.fixturesDir, "serpapi");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filename = query
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .toLowerCase()
    .slice(0, 80) + ".json";

  fs.writeFileSync(path.join(dir, filename), JSON.stringify(results, null, 2));
  console.log(`  [fixture] Saved ${results.length} results → ${filename}`);
}

/**
 * Discover Instagram Reels for a market using SerpAPI
 * Uses 2 queries per location (burns 2 of 250 monthly searches in live mode)
 */
export async function discoverReels(
  city: string,
  state: string,
  zip: string
): Promise<SerpResult[]> {
  const location = `${city},${state},United States`;

  const queries = [
    `site:instagram.com/reel "${city}" real estate`,
    `site:instagram.com/reel "${city} ${state}" homes realtor`,
  ];

  const allResults: SerpResult[] = [];

  for (const query of queries) {
    console.log(`[search] ${config.mode === "mock" ? "MOCK" : "LIVE"}: ${query}`);

    let results: SerpResult[];

    if (config.mode === "mock") {
      results = searchMock(query);
    } else {
      results = await searchLive(query, location);
      saveFixture(query, results); // Auto-save for future mock runs
      // Respect rate limits
      await new Promise((r) => setTimeout(r, 1000));
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
