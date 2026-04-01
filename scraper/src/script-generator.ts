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

  // Call Claude with retries (handles 529 overloaded errors)
  let script = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      script = await callClaude(CONVERSION_SYSTEM_PROMPT, userPrompt);
      break;
    } catch (err: any) {
      if (attempt < 3 && (err.message.includes("529") || err.message.includes("overloaded"))) {
        console.log(`  [script] Claude overloaded, retrying in ${attempt * 5}s... (attempt ${attempt}/3)`);
        await new Promise((r) => setTimeout(r, attempt * 5000));
      } else {
        console.error(`  [script] Claude error: ${err.message}`);
        script = `[Script generation failed — will retry next run. Topic: ${params.title}]`;
        break;
      }
    }
  }

  // Validate — Claude sometimes returns error messages instead of scripts
  const errorPhrases = ["The transcript", "I need", "To write you a script", "I can't", "I don't have enough"];
  const isErrorScript = errorPhrases.some((p) => script.startsWith(p));

  if (isErrorScript) {
    console.log(`  [script] Claude returned an error response, retrying with title only...`);
    const fallbackPrompt = buildScriptPrompt({
      originalTitle: params.title,
      originalCaption: params.title,
      city: params.city,
      state: params.state,
      views: params.views,
      likes: params.likes,
      comments: params.comments,
    });
    try {
      script = await callClaude(CONVERSION_SYSTEM_PROMPT, fallbackPrompt);
    } catch {
      script = `[Script generation failed — will retry next run. Topic: ${params.title}]`;
    }
  }

  // Cache it forever (unless it's a failure placeholder)
  if (!script.startsWith("[Script generation failed")) {
    cacheScript(params.shortcode, script);
    console.log(`  [script] Generated and cached (${script.split(" ").length} words)`);
  }

  return script;
}
