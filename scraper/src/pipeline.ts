/**
 * Main Scraper Pipeline
 *
 * Runs once daily per market:
 * 1. Google Custom Search → find Instagram Reel URLs
 * 2. Fetch engagement data for each URL
 * 3. Score by virality
 * 4. Pick top 5 (skip repeats unless super viral)
 * 5. Output JSON for the app to consume
 */

import { config, Market } from "./config";
import { searchInstagramReels, GoogleResult } from "./google-search";
import { getReelEngagement, ReelEngagement } from "./instagram";
import { scoreAndRank, pickTop, ScoredContent } from "./virality";
import * as fs from "fs";
import * as path from "path";

const OUTPUT_DIR = path.resolve(__dirname, "../output");
const HISTORY_FILE = path.join(OUTPUT_DIR, "shown_history.json");

/**
 * Load previously shown shortcodes to avoid repeats
 */
function loadHistory(): Set<string> {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const data = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8"));
      return new Set(data);
    }
  } catch {}
  return new Set();
}

/**
 * Save shown shortcodes
 */
function saveHistory(shortcodes: Set<string>) {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Keep last 500 shortcodes max (rolling window)
  const arr = Array.from(shortcodes).slice(-500);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(arr, null, 2));
}

/**
 * Run the pipeline for a single market
 */
async function scrapeMarket(market: Market): Promise<ScoredContent[]> {
  console.log(`\n=== Scraping: ${market.city}, ${market.state} ${market.zip} ===\n`);

  // Step 1: Discover Reel URLs via Google
  console.log("[1/4] Discovering Instagram Reels via Google...");
  const googleResults = await searchInstagramReels(market.city, market.state);
  console.log(`  Found ${googleResults.length} candidate URLs`);

  if (googleResults.length === 0) {
    console.log("  No results found. Check your Google CSE key and CX.");
    return [];
  }

  // Step 2: Fetch engagement data for each
  console.log("[2/4] Fetching engagement data...");
  const reels: ReelEngagement[] = [];

  for (const result of googleResults) {
    // Only process actual Reel URLs
    if (!result.url.includes("instagram.com/reel/") && !result.url.includes("instagram.com/p/")) {
      continue;
    }

    const engagement = await getReelEngagement(result.url, result.snippet);
    if (engagement) {
      // Use Google title if oEmbed didn't return one
      if (!engagement.title && result.title) {
        engagement.title = result.title.replace(" | Instagram", "").replace(" on Instagram", "").trim();
      }
      reels.push(engagement);
    }

    // Small delay to be respectful
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log(`  Got engagement data for ${reels.length} Reels`);

  // Step 3: Score by virality
  console.log("[3/4] Calculating virality scores...");
  const scored = scoreAndRank(reels);

  // Step 4: Pick top 5, skip repeats
  const history = loadHistory();
  const top = pickTop(scored, config.topN, history);

  // Update history
  for (const item of top) {
    history.add(item.shortcode);
  }
  saveHistory(history);

  console.log(`[4/4] Selected top ${top.length} Reels:`);
  for (const item of top) {
    console.log(`  👾 ${item.viralityScore} — ${item.title.slice(0, 60)}... (${item.views.toLocaleString()} views)`);
  }

  return top;
}

/**
 * Run the full pipeline for all configured markets
 */
export async function runPipeline(): Promise<Record<string, ScoredContent[]>> {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║   LAE Content Scraper — Daily Run        ║");
  console.log(`║   Mode: ${config.mode.toUpperCase().padEnd(32)}║`);
  console.log(`║   Markets: ${config.markets.length.toString().padEnd(29)}║`);
  console.log("╚══════════════════════════════════════════╝");

  const results: Record<string, ScoredContent[]> = {};

  for (const market of config.markets) {
    const key = `${market.city}_${market.state}`;
    results[key] = await scrapeMarket(market);
  }

  // Save output
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const outputFile = path.join(OUTPUT_DIR, `digest_${new Date().toISOString().split("T")[0]}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  console.log(`\n✅ Results saved to: ${outputFile}`);

  // Summary
  const totalPosts = Object.values(results).reduce((sum, r) => sum + r.length, 0);
  console.log(`\n📊 Total: ${totalPosts} posts across ${config.markets.length} markets`);

  return results;
}

// Run if called directly
if (require.main === module) {
  runPipeline().catch(console.error);
}
