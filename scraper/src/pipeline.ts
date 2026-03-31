/**
 * Main Scraper Pipeline
 *
 * Runs once daily per market:
 * 1. SerpAPI → discover Instagram Reel URLs by location
 * 2. Fetch engagement data for each URL
 * 3. Score by virality
 * 4. Pick top 5 (skip repeats unless super viral)
 * 5. Generate conversion-optimized script per Reel (Claude, cached)
 * 6. Output JSON for the app to consume
 */

import { config, Market } from "./config";
import { discoverReels } from "./serpapi";
import { getReelEngagement } from "./instagram";
import { scoreAndRank, pickTop, ScoredContent } from "./virality";
import { generateScript, getCachedScript } from "./script-generator";
import * as fs from "fs";
import * as path from "path";

const OUTPUT_DIR = path.resolve(__dirname, "../output");
const HISTORY_FILE = path.join(OUTPUT_DIR, "shown_history.json");

export interface DigestItem extends ScoredContent {
  script: string;
}

function loadHistory(): Set<string> {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      return new Set(JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8")));
    }
  } catch {}
  return new Set();
}

function saveHistory(shortcodes: Set<string>) {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const arr = Array.from(shortcodes).slice(-500);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(arr, null, 2));
}

/**
 * Run the pipeline for a single market
 */
async function scrapeMarket(market: Market): Promise<DigestItem[]> {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`  Scraping: ${market.city}, ${market.state} ${market.zip}`);
  console.log(`${"=".repeat(50)}\n`);

  // Step 1: Discover Reel URLs via SerpAPI
  console.log("[1/5] Discovering Instagram Reels via SerpAPI...");
  const serpResults = await discoverReels(market.city, market.state, market.zip);
  console.log(`  Found ${serpResults.length} candidate URLs\n`);

  if (serpResults.length === 0) {
    console.log("  No results found. Check your SerpAPI key.");
    return [];
  }

  // Step 2: Fetch engagement data
  console.log("[2/5] Fetching engagement data...");
  const reels = [];

  for (const result of serpResults) {
    if (!result.url.includes("instagram.com/reel/") && !result.url.includes("instagram.com/p/")) {
      continue;
    }
    const engagement = await getReelEngagement(result.url, result.snippet);
    if (engagement) {
      if (!engagement.title && result.title) {
        engagement.title = result.title.replace(" | Instagram", "").replace(" on Instagram", "").trim();
      }
      reels.push(engagement);
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log(`  Got engagement data for ${reels.length} Reels\n`);

  // Step 3: Score by virality
  console.log("[3/5] Calculating virality scores...");
  const scored = scoreAndRank(reels);

  // Step 4: Pick top 5, skip repeats
  console.log("[4/5] Selecting top 5...");
  const history = loadHistory();
  const top = pickTop(scored, config.topN, history);

  for (const item of top) {
    history.add(item.shortcode);
  }
  saveHistory(history);

  console.log(`  Selected ${top.length} Reels:\n`);
  for (const item of top) {
    console.log(`  👾 ${item.viralityScore} — ${item.title.slice(0, 55)}... (${item.views.toLocaleString()} views)`);
  }

  // Step 5: Generate scripts with Claude (cached)
  console.log(`\n[5/5] Generating scripts with Claude...`);
  const digestItems: DigestItem[] = [];

  for (const item of top) {
    const script = await generateScript({
      shortcode: item.shortcode,
      title: item.title,
      caption: item.title, // Use title as caption if we don't have full caption
      city: market.city,
      state: market.state,
      views: item.views,
      likes: item.likes,
      comments: item.comments,
    });

    digestItems.push({ ...item, script });
  }

  console.log(`\n  ✅ ${digestItems.length} scripts ready\n`);
  return digestItems;
}

/**
 * Run the full pipeline for all configured markets
 */
export async function runPipeline(): Promise<Record<string, DigestItem[]>> {
  console.log("");
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║   LAE Content Scraper + Script Generator     ║");
  console.log(`║   Mode: ${config.mode.toUpperCase().padEnd(36)}║`);
  console.log(`║   Markets: ${config.markets.length.toString().padEnd(34)}║`);
  console.log(`║   SerpAPI Key: ${config.serpApiKey ? "✓ Set" : "✗ Missing"}${"".padEnd(26)}║`);
  console.log(`║   Claude Key: ${config.anthropicKey ? "✓ Set" : "✗ Missing"}${"".padEnd(27)}║`);
  console.log("╚══════════════════════════════════════════════╝");

  const results: Record<string, DigestItem[]> = {};

  for (const market of config.markets) {
    const key = `${market.city}_${market.state}`;
    results[key] = await scrapeMarket(market);
  }

  // Save output
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const dateStr = new Date().toISOString().split("T")[0];
  const outputFile = path.join(OUTPUT_DIR, `digest_${dateStr}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  console.log(`📁 Results saved to: ${outputFile}`);

  // Summary
  const totalPosts = Object.values(results).reduce((sum, r) => sum + r.length, 0);
  const totalScripts = Object.values(results).reduce(
    (sum, r) => sum + r.filter((i) => i.script && !i.script.startsWith("[Script")).length,
    0
  );
  console.log(`\n📊 Summary: ${totalPosts} posts, ${totalScripts} scripts generated`);
  console.log(`💰 SerpAPI searches used: ${config.mode === "live" ? config.markets.length * 2 : 0}`);

  return results;
}

// Run if called directly
if (require.main === module) {
  runPipeline().catch(console.error);
}
