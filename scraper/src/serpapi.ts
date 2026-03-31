/**
 * SerpAPI Client — discovers Instagram Reels by location
 *
 * Strategy: Run multiple query variations, paginate each to 30 results,
 * collect 100+ unique Reel URLs, pick top 5 by virality.
 *
 * Budget: ~10 API calls per daily run (10 × 25 days = 250/month)
 *
 * MANUAL REPLICATION NOTES (if SerpAPI credits run out):
 * =====================================================
 * Each SerpAPI call is equivalent to this Google search:
 *
 * 1. Go to google.com
 * 2. Search: site:instagram.com/reel "cape coral" real estate
 * 3. Click Tools → Any time → Custom range → 01/01/2026 to 12/31/2026
 * 4. Copy the first 10 result URLs
 * 5. Click "Next" for page 2, copy 10 more
 * 6. Click "Next" for page 3, copy 10 more
 * 7. Repeat with different search terms:
 *    - site:instagram.com/reel "cape coral" homes for sale
 *    - site:instagram.com/reel "cape coral" realtor home tour
 *    - site:instagram.com/reel "cape coral FL" housing market
 *
 * The location parameter makes Google show results as if you're
 * searching from Cape Coral, FL — so local content ranks higher.
 *
 * SerpAPI params we use:
 *   engine: google
 *   q: site:instagram.com/reel "cape coral" real estate
 *   location: Cape Coral,Florida,United States
 *   gl: us
 *   hl: en
 *   tbs: cdr:1,cd_min:01/01/2026,cd_max:12/31/2026  (2026 only)
 *   num: 10
 *   start: 0 (page 1), 10 (page 2), 20 (page 3)
 * =====================================================
 */

import { config } from "./config";
import * as fs from "fs";
import * as path from "path";

export interface SerpResult {
  title: string;
  url: string;
  snippet: string;
  position: number;
  query: string; // which query found this
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

// Query variations — each targets a different angle of Cape Coral RE content
const QUERY_TEMPLATES = [
  `site:instagram.com/reel "{city}" real estate`,
  `site:instagram.com/reel "{city}" homes for sale`,
  `site:instagram.com/reel "{city}" realtor home tour`,
  `site:instagram.com/reel "{city} {state}" housing market`,
];

// How many pages per query (10 results each)
const PAGES_PER_QUERY = 3; // 3 pages × 10 results = 30 per query

/**
 * Single SerpAPI call — one page of results
 */
async function searchPage(
  query: string,
  location: string,
  start: number
): Promise<SerpResult[]> {
  const params = new URLSearchParams({
    api_key: config.serpApiKey,
    engine: "google",
    q: query,
    location: location,
    gl: "us",
    hl: "en",
    tbs: "cdr:1,cd_min:01/01/2026,cd_max:12/31/2026", // 2026 only
    num: "10",
    start: String(start),
  });

  const res = await fetch(`https://serpapi.com/search.json?${params}`);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`SerpAPI error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as SerpApiResponse;

  if (data.error) {
    throw new Error(`SerpAPI error: ${data.error}`);
  }

  return (data.organic_results || []).map((item) => ({
    title: item.title,
    url: item.link,
    snippet: item.snippet || "",
    position: item.position + start,
    query,
  }));
}

/**
 * Load from cached fixture
 */
function loadMockResults(city: string): SerpResult[] {
  // Load all google fixtures as fallback
  const googleDir = path.join(config.fixturesDir, "google");
  const serpDir = path.join(config.fixturesDir, "serpapi");
  const allResults: SerpResult[] = [];

  for (const dir of [serpDir, googleDir]) {
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith(".json")) continue;
      if (!file.includes(city.toLowerCase().replace(/\s/g, "_"))) continue;
      try {
        const data = JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8"));
        for (const item of data) {
          allResults.push({
            title: item.title,
            url: item.url || item.link,
            snippet: item.snippet || "",
            position: allResults.length + 1,
            query: "mock",
          });
        }
      } catch {}
    }
  }

  return allResults;
}

/**
 * Save live results as fixtures
 */
function saveFixtures(city: string, results: SerpResult[]) {
  const dir = path.join(config.fixturesDir, "serpapi");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filename = `${city.toLowerCase().replace(/\s/g, "_")}_all_results.json`;
  fs.writeFileSync(path.join(dir, filename), JSON.stringify(results, null, 2));
  console.log(`  [fixture] Saved ${results.length} results → ${filename}`);
}

/**
 * Discover Instagram Reels for a market
 *
 * Live mode: Runs 4 queries × 3 pages = ~10-12 SerpAPI calls
 * Returns up to 100+ candidate URLs (deduped)
 */
export async function discoverReels(
  city: string,
  state: string,
  zip: string
): Promise<{ results: SerpResult[]; searchesUsed: number }> {
  const location = `${city},${state},United States`;

  if (config.mode === "mock") {
    console.log(`  [mock] Loading cached results for ${city}`);
    const results = loadMockResults(city);
    console.log(`  [mock] Loaded ${results.length} cached results`);
    return { results, searchesUsed: 0 };
  }

  // LIVE MODE
  const allResults: SerpResult[] = [];
  let searchesUsed = 0;

  const queries = QUERY_TEMPLATES.map((t) =>
    t.replace("{city}", city).replace("{state}", state)
  );

  for (const query of queries) {
    for (let page = 0; page < PAGES_PER_QUERY; page++) {
      const start = page * 10;
      console.log(`  [serpapi] Query: ${query} (page ${page + 1}, start=${start})`);

      try {
        const results = await searchPage(query, location, start);
        searchesUsed++;

        console.log(`  [serpapi] Got ${results.length} results (total searches used: ${searchesUsed})`);
        allResults.push(...results);

        // If fewer than 10 results, no more pages for this query
        if (results.length < 10) break;

        // Rate limit: 1 second between calls
        await new Promise((r) => setTimeout(r, 1000));
      } catch (err: any) {
        console.error(`  [serpapi] Error: ${err.message}`);
        break; // Stop paginating this query on error
      }
    }
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  const unique = allResults.filter((r) => {
    // Only keep actual Instagram Reel URLs
    if (!r.url.includes("instagram.com/reel/") && !r.url.includes("instagram.com/p/")) {
      return false;
    }
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  console.log(`\n  [serpapi] TOTAL: ${allResults.length} raw → ${unique.length} unique Reel URLs`);
  console.log(`  [serpapi] Searches used this run: ${searchesUsed}`);

  // Save as fixture for future mock runs
  saveFixtures(city, unique);

  return { results: unique, searchesUsed };
}
