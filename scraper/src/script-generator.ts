/**
 * Claude Script Generator with Caching
 *
 * Generates ONE conversion-optimized script per unique Reel.
 * Cached forever — same Reel = same script (never regenerated).
 * Uses the conversion knowledge base for psychological triggers.
 *
 * Cost: ~$0.01 per script (Claude Sonnet, ~150 words output)
 */

import { config } from "./config";
import { CONVERSION_SYSTEM_PROMPT, buildScriptPrompt } from "./knowledge-base";
import * as fs from "fs";
import * as path from "path";

const CACHE_DIR = path.resolve(__dirname, "../output/script_cache");

/**
 * Get cache path for a Reel shortcode
 */
function getCachePath(shortcode: string): string {
  return path.join(CACHE_DIR, `${shortcode}.txt`);
}

/**
 * Check if a script is already cached for this Reel
 */
export function getCachedScript(shortcode: string): string | null {
  const cachePath = getCachePath(shortcode);
  if (fs.existsSync(cachePath)) {
    return fs.readFileSync(cachePath, "utf-8");
  }
  return null;
}

/**
 * Save a generated script to cache
 */
function cacheScript(shortcode: string, script: string) {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(getCachePath(shortcode), script);
}

/**
 * Generate a script using Claude API
 */
async function callClaude(systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as {
    content: Array<{ type: string; text: string }>;
  };

  return data.content[0]?.text || "";
}

/**
 * Generate a conversion-optimized script for a Reel
 * Checks cache first — only calls Claude if not cached
 */
export async function generateScript(params: {
  shortcode: string;
  title: string;
  caption: string;
  city: string;
  state: string;
  views: number;
  likes: number;
  comments: number;
}): Promise<string> {
  // Check cache first
  const cached = getCachedScript(params.shortcode);
  if (cached) {
    console.log(`  [script] Cache HIT for ${params.shortcode}`);
    return cached;
  }

  console.log(`  [script] Cache MISS for ${params.shortcode} — generating with Claude...`);

  if (!config.anthropicKey) {
    console.log(`  [script] No ANTHROPIC_API_KEY set — using placeholder`);
    return `[Script would be generated here for: ${params.title}. Add ANTHROPIC_API_KEY to .env to enable.]`;
  }

  // Build the prompt using our conversion knowledge base
  const userPrompt = buildScriptPrompt({
    originalTitle: params.title,
    originalCaption: params.caption,
    city: params.city,
    state: params.state,
    views: params.views,
    likes: params.likes,
    comments: params.comments,
  });

  // Call Claude
  const script = await callClaude(CONVERSION_SYSTEM_PROMPT, userPrompt);

  // Cache it forever
  cacheScript(params.shortcode, script);
  console.log(`  [script] Generated and cached (${script.split(" ").length} words)`);

  return script;
}
