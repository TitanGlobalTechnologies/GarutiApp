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
import { getRealEngagement, RealEngagement } from "./instagram-engagement";
import { scoreAndRank, pickTop, ScoredContent } from "./virality";
import { generateScript, getCachedScript } from "./script-generator";
import { transcribeReel } from "./transcribe";
import { isRealEstateAgent } from "./bio-checker";
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
  console.log("  Target: 100 unique Reel URLs from 2026 only\n");
  const { results: serpResults, searchesUsed } = await discoverReels(market.city, market.state, market.zip);
  console.log(`\n  Found ${serpResults.length} unique Reel URLs (used ${searchesUsed} SerpAPI searches)\n`);

  if (serpResults.length === 0) {
    console.log("  No results found. Check your SerpAPI key or try different queries.");
    return [];
  }

  console.log(`  Processing top ${Math.min(serpResults.length, 100)} of ${serpResults.length} results...\n`);

  // Step 2: Fetch REAL engagement data from Instagram
  console.log("[2/5] Fetching REAL engagement data from Instagram...");
  console.log("  (This checks actual likes/views/comments for each post)\n");

  const MIN_LIKES = 10; // Filter threshold — only keep posts with real engagement
  const reelsWithEngagement: Array<{
    shortcode: string;
    url: string;
    title: string;
    authorHandle: string;
    authorName: string;
    thumbnailUrl: string;
    views: number;
    likes: number;
    comments: number;
    caption: string;
  }> = [];

  let checked = 0;
  let skipped = 0;

  for (const result of serpResults) {
    if (!result.url.includes("instagram.com/reel/") && !result.url.includes("instagram.com/p/")) {
      continue;
    }

    const engagement = await getRealEngagement(result.url);
    checked++;

    if (engagement && engagement.likeCount >= MIN_LIKES) {
      const title = result.title.replace(" | Instagram", "").replace(" on Instagram:", "").trim();
      reelsWithEngagement.push({
        shortcode: engagement.shortcode,
        url: engagement.url,
        title: title || engagement.caption.slice(0, 80),
        authorHandle: engagement.authorUsername,
        authorName: engagement.authorUsername,
        thumbnailUrl: "",
        views: engagement.viewCount,
        likes: engagement.likeCount,
        comments: engagement.commentCount,
        caption: engagement.caption,
        fullName: engagement.authorFullName || "",
        followers: engagement.followers || 0,
      } as any);
    } else if (engagement) {
      skipped++;
    }

    // Rate limit: 500ms between requests to be respectful
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\n  Checked ${checked} posts | Passed filter (${MIN_LIKES}+ likes): ${reelsWithEngagement.length} | Filtered out: ${skipped}\n`);
  const reels = reelsWithEngagement;

  // Step 3: Score by virality
  console.log("[3/5] Calculating virality scores...");
  const scored = scoreAndRank(reels);

  // Step 4: Pick top 5 from verified real estate agents
  // Walk down the ranked list, check bio for each candidate, keep only agents
  console.log("[4/7] Selecting top 5 verified real estate agents...");
  console.log("  (Checking bios starting from highest virality score)\n");

  const history = loadHistory();
  const seenInBatch = new Set<string>();
  const top: ScoredContent[] = [];
  let bioChecked = 0;
  let skippedNotAgent = 0;

  for (const item of scored) {
    if (top.length >= config.topN) break;
    if (seenInBatch.has(item.shortcode)) continue;
    if (history.has(item.shortcode)) continue;

    // Check if this person is a real estate agent
    bioChecked++;
    const detection = await isRealEstateAgent({
      username: item.authorHandle || item.authorName,
      fullName: (item as any).fullName || "",
      caption: (item as any).caption || item.title,
    });

    if (detection.isAgent) {
      console.log(`  ✅ @${item.authorHandle} (score:${detection.score}, ${detection.confidence}) → 👾 ${item.viralityScore} | ${item.views.toLocaleString()} views`);
      seenInBatch.add(item.shortcode);
      top.push(item);
    } else {
      console.log(`  ❌ @${item.authorHandle} (score:${detection.score}) — skipped [${detection.negativeMatches.join(",") || "no RE keywords"}]`);
      skippedNotAgent++;
    }

    // Rate limit: 2s between bio fetches
    await new Promise((r) => setTimeout(r, 2000));
  }

  for (const item of top) {
    history.add(item.shortcode);
  }
  saveHistory(history);

  console.log(`\n  Bio-checked ${bioChecked} candidates, skipped ${skippedNotAgent} non-agents, selected ${top.length} agents\n`);

  // Step 5: Transcribe videos
  console.log("[5/7] Transcribing videos with Whisper...");

  const transcripts: Record<string, string> = {};
  for (const item of top) {
    const transcript = await transcribeReel(item.shortcode);
    transcripts[item.shortcode] = transcript;
  }

  console.log(`\n[6/7] Generating scripts with Claude (using real transcripts)...`);
  const digestItems: DigestItem[] = [];

  for (const item of top) {
    const transcript = transcripts[item.shortcode] || "";
    const captionOrTranscript = transcript || (item as any).caption || item.title;

    const script = await generateScript({
      shortcode: item.shortcode,
      title: item.title,
      caption: captionOrTranscript,
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
  const totalSearches = config.mode === "live"
    ? Object.keys(results).length * 12 // ~12 per market
    : 0;
  console.log(`💰 SerpAPI searches used this run: ~${totalSearches}`)
  console.log(`💰 Monthly budget: 250 | Remaining: ~${250 - totalSearches}`);

  return results;
}

// Run if called directly
if (require.main === module) {
  runPipeline().catch(console.error);
}
