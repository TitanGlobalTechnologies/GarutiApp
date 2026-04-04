/**
 * AI Content Audit — Claude verifies every post before it goes live
 *
 * For each post, asks Claude:
 * 1. Is this by a real estate agent? (not a company, media, coach, mortgage)
 * 2. Is this about real estate? (not dogs, lifestyle, unrelated content)
 * 3. What location is this about? (FL? Other state? Can't tell?)
 *
 * Removes posts that fail. Runs after scraping, before generate-live-digest.js.
 *
 * Usage: node ai-audit.js
 */

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, ".env") });

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const TRANSCRIPT_DIR = path.resolve(__dirname, "output/transcripts");
const DATA_FILE = path.resolve(__dirname, "output/digest_all_with_scope.json");

const SWFL_CITIES = ["Cape Coral", "Fort Myers", "Naples", "Bonita Springs", "Lehigh Acres", "Punta Gorda"];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function auditPost(post, scope) {
  const transcript = (() => {
    try { return fs.readFileSync(path.join(TRANSCRIPT_DIR, post.shortcode + ".txt"), "utf-8"); }
    catch { return ""; }
  })();

  const isFlScope = scope.includes("_FL") || scope === "Florida";
  const prompt = `You are auditing Instagram Reels for a real estate app serving SW Florida agents.

Post by: @${post.author}
Title: "${post.title || ""}"
Caption: "${(post.caption || "").slice(0, 500)}"
Transcript: "${(transcript || "").slice(0, 500)}"
Instagram location tag: ${post.locationName || "none"}
Scope: ${scope}

Answer these 4 questions with YES or NO and a brief reason:

1. AGENT: Is this posted by an individual real estate agent (not a brokerage company, media company, magazine, podcast, coach/trainer selling courses, mortgage company, or national association)?

2. RELEVANT: Is the content about real estate (buying, selling, listing, market updates, agent life, home tours)? Not about dogs, lifestyle unrelated to RE, random content?

3. LOCATION: ${isFlScope ? "Is this agent likely based in or serving Florida / SW Florida? Check the caption, hashtags, transcript, and location tag for clues. If they mention other states like California, Texas, Ohio etc. as their market, answer NO." : "This post is from a national search (scope: " + scope + "). Is this agent based ANYWHERE in the United States? Answer YES if they are a US-based agent. Only answer NO if they are clearly from Canada, UK, Philippines, or another country. Being from Texas, South Carolina, Tennessee etc. is FINE — answer YES."}

4. SPEECH: Look at the Transcript above. Does it contain real spoken dialogue about real estate — someone actually TALKING about properties, market, buying, selling, or agent tips? If the transcript is empty, contains only music lyrics, single words, gibberish, song fragments, or non-RE chatter, answer NO. We need posts where the agent is speaking on camera so we can recreate their script.

Reply in EXACTLY this format:
AGENT: YES/NO — reason
RELEVANT: YES/NO — reason
LOCATION: YES/NO — reason
SPEECH: YES/NO — reason`;

  for (let i = 0; i < 2; i++) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 300,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) { await sleep(3000); continue; }
      const data = await res.json();
      const text = data.content[0]?.text || "";

      const agentMatch = text.match(/AGENT:\s*(YES|NO)/i);
      const relevantMatch = text.match(/RELEVANT:\s*(YES|NO)/i);
      const locationMatch = text.match(/LOCATION:\s*(YES|NO)/i);
      const speechMatch = text.match(/SPEECH:\s*(YES|NO)/i);

      return {
        agent: agentMatch?.[1]?.toUpperCase() === "YES",
        relevant: relevantMatch?.[1]?.toUpperCase() === "YES",
        location: locationMatch?.[1]?.toUpperCase() === "YES",
        speech: speechMatch?.[1]?.toUpperCase() === "YES",
        raw: text,
      };
    } catch { await sleep(3000); }
  }
  return { agent: true, relevant: true, location: true, speech: true, raw: "audit failed — keeping post" };
}

async function main() {
  if (!ANTHROPIC_KEY) { console.error("Missing ANTHROPIC_API_KEY"); process.exit(1); }

  const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));

  // Collect unique posts
  const allPosts = [];
  const seen = new Set();
  for (const [scope, posts] of Object.entries(data)) {
    for (const p of posts) {
      if (!seen.has(p.shortcode)) {
        seen.add(p.shortcode);
        allPosts.push({ ...p, _scope: scope });
      }
    }
  }

  console.log(`\nAI Content Audit — ${allPosts.length} posts\n`);

  const rejected = [];
  let passed = 0;

  for (let i = 0; i < allPosts.length; i++) {
    const p = allPosts[i];
    process.stdout.write(`\r  [${i + 1}/${allPosts.length}] @${(p.author || "").padEnd(25)}   `);

    const result = await auditPost(p, p._scope);

    if (!result.agent || !result.relevant || !result.location) {
      // Hard reject — not an agent, not RE content, or wrong location
      const reasons = [];
      if (!result.agent) reasons.push("NOT_AGENT");
      if (!result.relevant) reasons.push("NOT_RE_CONTENT");
      if (!result.location) reasons.push("WRONG_LOCATION");
      rejected.push({ shortcode: p.shortcode, author: p.author, scope: p._scope, reasons, raw: result.raw });
      console.log(`\n    REJECT @${p.author} (${p._scope}) — ${reasons.join(", ")}`);
      console.log(`    ${result.raw.replace(/\n/g, "\n    ")}`);
    } else {
      passed++;
      // Mark speech status — posts without speech keep showing but script is disabled
      if (!result.speech) {
        for (const posts of Object.values(data)) {
          for (const pp of posts) {
            if (pp.shortcode === p.shortcode) pp.hasSpeech = false;
          }
        }
        console.log(`\n    KEPT @${p.author} (${p._scope}) — NO_SPEECH (script disabled)`);
      }
    }

    await sleep(300);
  }

  // Save reject list to separate file — NEVER modify raw data
  const rejectFile = path.resolve(__dirname, "output/audit_rejects.json");
  const rejectSCs = rejected.map(r => r.shortcode);
  fs.writeFileSync(rejectFile, JSON.stringify({ rejected, rejectShortcodes: rejectSCs }, null, 2));

  // Mark hasSpeech on the data (non-destructive — adds field, doesn't remove posts)
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

  console.log(`\n\n=== AUDIT COMPLETE ===`);
  console.log(`  Passed: ${passed}`);
  console.log(`  Rejected: ${rejected.length}`);
  console.log(`  Reject list saved to: ${rejectFile}`);
  if (rejected.length > 0) {
    console.log(`\n  Rejected (will be filtered by generate-live-digest.js):`);
    rejected.forEach(r => console.log(`    @${r.author} (${r.scope}) — ${r.reasons.join(", ")}`));
  }
  console.log(`\n  Data saved. Run: node generate-live-digest.js`);
}

main().catch(console.error);
