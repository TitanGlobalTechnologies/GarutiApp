// Generate localized scripts for state/nation posts for each SWFL city
// A USA post about Texas → rewritten for Cape Coral, Fort Myers, Naples, etc.
// Cache key: shortcode_CityName.txt

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, ".env") });

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const SCRIPT_DIR = path.resolve(__dirname, "output/script_cache");
const TRANSCRIPT_DIR = path.resolve(__dirname, "output/transcripts");

const CITIES = ["Cape Coral", "Fort Myers", "Naples", "Bonita Springs", "Lehigh Acres", "Punta Gorda"];

async function generateScript(shortcode, title, caption, city) {
  const cacheKey = `${shortcode}_${city.replace(/\s/g, "_")}`;
  const cachePath = path.join(SCRIPT_DIR, `${cacheKey}.txt`);
  if (fs.existsSync(cachePath)) {
    console.log(`  [cache] ${cacheKey} — already exists`);
    return fs.readFileSync(cachePath, "utf-8");
  }

  const system = `You are an elite real estate content strategist. Write scripts that convert viewers into leads. NEVER use em dashes or semicolons. Write like a human texting a friend. Scripts must be 80-150 words, end with a specific question as CTA.

CRITICAL: The original post may be about a different city or state. You MUST rewrite the script so it is relevant to ${city}, Florida. Do NOT mention the original city or state from the source post. Adapt the talking points, data, and examples to the ${city}, FL market. If the original mentions specific prices, adjust them to be realistic for ${city}. If it mentions local landmarks or neighborhoods, replace with ${city} equivalents or speak generally about the ${city} market.`;

  const user = `Original viral post (may be from a different market):\nTitle: "${title}"\nTranscript/Caption: "${caption}"\n\nRewrite this as a script for a real estate agent in ${city}, Florida. Keep the core topic and what made it viral. Adapt ALL location references to ${city}, FL. End with a question CTA. Return ONLY the script text.`;

  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 500, system, messages: [{ role: "user", content: user }] }),
      });
      if (!res.ok) { if (i < 2) { await new Promise(r => setTimeout(r, 5000)); continue; } return "[Failed]"; }
      const data = await res.json();
      const script = data.content[0]?.text || "";
      if (script && !script.startsWith("The transcript") && !script.startsWith("I need")) {
        fs.writeFileSync(cachePath, script);
        console.log(`  [claude] ${cacheKey} — ${script.split(" ").length} words`);
        return script;
      }
    } catch { if (i < 2) await new Promise(r => setTimeout(r, 5000)); }
  }
  return "[Failed]";
}

async function main() {
  // Load state/nation data
  const allData = JSON.parse(fs.readFileSync("output/digest_all_with_scope.json"));
  const stateNationScopes = ["Florida", "USA"];

  let total = 0;
  for (const scope of stateNationScopes) {
    const items = allData[scope] || [];
    console.log(`\n=== ${scope} (${items.length} posts × ${CITIES.length} cities = ${items.length * CITIES.length} scripts) ===\n`);

    for (const item of items) {
      // Get transcript if available
      const transcriptPath = path.join(TRANSCRIPT_DIR, `${item.shortcode}.txt`);
      const transcript = fs.existsSync(transcriptPath) ? fs.readFileSync(transcriptPath, "utf-8") : "";
      const caption = transcript || item.caption || item.title;

      for (const city of CITIES) {
        total++;
        await generateScript(item.shortcode, item.title, caption, city);
        await new Promise(r => setTimeout(r, 300));
      }
    }
  }

  // Also do yesterday's data if it exists
  const yesterdayFiles = fs.readdirSync("output").filter(f => f.startsWith("digest_yesterday_"));
  for (const file of yesterdayFiles) {
    const yData = JSON.parse(fs.readFileSync(path.join("output", file)));
    for (const scope of stateNationScopes) {
      const items = yData[scope] || [];
      if (items.length === 0) continue;
      console.log(`\n=== ${file} / ${scope} (${items.length} posts × ${CITIES.length} cities) ===\n`);

      for (const item of items) {
        const transcriptPath = path.join(TRANSCRIPT_DIR, `${item.shortcode}.txt`);
        const transcript = fs.existsSync(transcriptPath) ? fs.readFileSync(transcriptPath, "utf-8") : "";
        const caption = transcript || item.caption || item.title;

        for (const city of CITIES) {
          total++;
          await generateScript(item.shortcode, item.title, caption, city);
          await new Promise(r => setTimeout(r, 300));
        }
      }
    }
  }

  console.log(`\n✅ Done! ${total} localized scripts processed.`);
}

main().catch(console.error);
