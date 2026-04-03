// Scrape Florida-wide and USA-wide real estate content
// Uses day-by-day lookback (yesterday first, max 7 days)
// Enforces 1 post per author (unique agents only)

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, ".env") });

const { checkAgent } = require("./src/agent-check");

const SERPAPI_KEY = process.env.SERPAPI_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const TEMP_DIR = path.resolve(__dirname, "output/temp");
const TRANSCRIPT_DIR = path.resolve(__dirname, "output/transcripts");
const SCRIPT_DIR = path.resolve(__dirname, "output/script_cache");

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
if (!fs.existsSync(TRANSCRIPT_DIR)) fs.mkdirSync(TRANSCRIPT_DIR, { recursive: true });
if (!fs.existsSync(SCRIPT_DIR)) fs.mkdirSync(SCRIPT_DIR, { recursive: true });

const MAX_DAYS_BACK = 7;
const TARGET_POSTS = 5;

const SCOPES = [
  {
    name: "Florida",
    location: "Florida,United States",
    queries: [
      'site:instagram.com/reel intext:"realtor" "Florida"',
      'site:instagram.com/reel intext:"real estate agent" "Florida"',
      'site:instagram.com/reel intext:"broker" "Florida" homes',
      'site:instagram.com/reel "keller williams" OR "coldwell banker" OR "re/max" OR "compass" "Florida"',
    ],
  },
  {
    name: "USA",
    location: "United States",
    queries: [
      'site:instagram.com/reel intext:"realtor" home tour',
      'site:instagram.com/reel intext:"real estate agent" homes',
      'site:instagram.com/reel intext:"just listed" OR intext:"just sold"',
      'site:instagram.com/reel "keller williams" OR "coldwell banker" OR "re/max" OR "compass" real estate',
    ],
  },
];

// ---- Date helpers ----
function formatDateFilter(date) {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `cdr:1,cd_min:${mm}/${dd}/${yyyy},cd_max:${mm}/${dd}/${yyyy}`;
}

function formatDateLabel(date) {
  return date.toISOString().split("T")[0];
}

// ---- SerpAPI (single page, single day) ----
async function serpSearchDay(query, location, dateFilter) {
  const params = new URLSearchParams({
    api_key: SERPAPI_KEY,
    engine: "google",
    q: query,
    location: location,
    gl: "us",
    hl: "en",
    tbs: dateFilter,
    num: "10",
  });
  const res = await fetch(`https://serpapi.com/search.json?${params}`);
  if (!res.ok) { console.log(`    [serp] Error: ${res.status}`); return []; }
  const data = await res.json();
  if (data.error) { console.log(`    [serp] ${data.error}`); return []; }
  return (data.organic_results || []).map(r => ({
    title: r.title,
    url: r.link,
    snippet: r.snippet || "",
  }));
}

// ---- Instagram engagement ----
async function getEngagement(url) {
  const m = url.match(/(?:reel|p)\/([A-Za-z0-9_-]+)/);
  if (!m) return null;
  const sc = m[1];
  try {
    const params = new URLSearchParams({
      variables: JSON.stringify({ shortcode: sc }),
      doc_id: "10015901848480474",
      lsd: "AVqbxe3J_YA",
    });
    const res = await fetch("https://www.instagram.com/api/graphql?" + params, {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "X-IG-App-ID": "936619743392459",
        "X-FB-LSD": "AVqbxe3J_YA",
        "X-ASBD-ID": "129477",
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const media = json?.data?.xdt_shortcode_media;
    if (!media) return null;
    return {
      shortcode: sc,
      url,
      likes: media.edge_media_preview_like?.count || 0,
      comments: media.edge_media_to_parent_comment?.count || 0,
      views: media.video_view_count || media.video_play_count || 0,
      caption: media.edge_media_to_caption?.edges?.[0]?.node?.text || "",
      author: media.owner?.username || "",
      isVideo: media.is_video || false,
    };
  } catch { return null; }
}

// ---- Transcribe ----
function transcribe(shortcode) {
  const cache = path.join(TRANSCRIPT_DIR, `${shortcode}.txt`);
  if (fs.existsSync(cache)) return fs.readFileSync(cache, "utf-8");

  const video = path.join(TEMP_DIR, `${shortcode}.mp4`);
  if (!fs.existsSync(video)) return "";

  const pyScript = path.join(TEMP_DIR, "_w.py");
  fs.writeFileSync(pyScript, `import whisper\nmodel = whisper.load_model("base")\nresult = model.transcribe("${video.replace(/\\/g, "/")}", language="en")\nprint(result["text"])\n`);
  try {
    const result = execSync(`python "${pyScript}"`, {
      stdio: "pipe", timeout: 120000,
      env: { ...process.env, PATH: (process.env.PATH || "") + ";C:\\Users\\gaba\\AppData\\Local\\Microsoft\\WinGet\\Links" },
    });
    const text = result.toString().trim();
    if (text) { fs.writeFileSync(cache, text); console.log(`  [whisper] ${shortcode}: ${text.split(" ").length} words`); }
    try { fs.unlinkSync(pyScript); } catch {}
    return text;
  } catch { return ""; }
}

// ---- Download video ----
async function downloadVideo(shortcode) {
  const fp = path.join(TEMP_DIR, `${shortcode}.mp4`);
  if (fs.existsSync(fp)) return fp;
  try {
    const params = new URLSearchParams({
      variables: JSON.stringify({ shortcode }),
      doc_id: "10015901848480474",
      lsd: "AVqbxe3J_YA",
    });
    const res = await fetch("https://www.instagram.com/api/graphql?" + params, {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0", "X-IG-App-ID": "936619743392459",
        "X-FB-LSD": "AVqbxe3J_YA", "X-ASBD-ID": "129477",
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    const json = await res.json();
    const videoUrl = json?.data?.xdt_shortcode_media?.video_url;
    if (!videoUrl) return null;
    const vid = await fetch(videoUrl);
    const buf = Buffer.from(await vid.arrayBuffer());
    fs.writeFileSync(fp, buf);
    console.log(`  [dl] ${shortcode}.mp4 (${(buf.length/1024/1024).toFixed(1)}MB)`);
    return fp;
  } catch { return null; }
}

// ---- Claude script ----
async function generateScript(shortcode, title, caption, scope) {
  const cache = path.join(SCRIPT_DIR, `${shortcode}.txt`);
  if (fs.existsSync(cache)) return fs.readFileSync(cache, "utf-8");
  if (!ANTHROPIC_KEY) return "[No API key]";

  const system = "You are an elite real estate content strategist. Write scripts that convert viewers into leads. NEVER use em dashes or semicolons. Write like a human texting a friend. Scripts must be 80-150 words, end with a specific question as CTA.";
  const user = `Viral Instagram Reel (${scope} level):\nTitle: "${title}"\nTranscript/Caption: "${caption}"\n\nRewrite as a conversion-optimized script for a real estate agent. Keep the core topic. Add psychological triggers. End with a question CTA. Return ONLY the script text.`;

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
        fs.writeFileSync(cache, script);
        console.log(`  [claude] ${shortcode}: ${script.split(" ").length} words`);
        return script;
      }
      if (i < 2) await new Promise(r => setTimeout(r, 3000));
    } catch { if (i < 2) await new Promise(r => setTimeout(r, 5000)); }
  }
  return "[Failed]";
}

// ---- Bio fetcher (cached) ----
const BIO_CACHE_DIR = path.resolve(__dirname, "output/bio_cache");
if (!fs.existsSync(BIO_CACHE_DIR)) fs.mkdirSync(BIO_CACHE_DIR, { recursive: true });

async function fetchProfileCached(username) {
  const cachePath = path.join(BIO_CACHE_DIR, `${username}.json`);
  if (fs.existsSync(cachePath)) return JSON.parse(fs.readFileSync(cachePath, "utf-8"));
  try {
    const res = await fetch(`https://www.instagram.com/${username}/`, {
      headers: { "User-Agent": "Googlebot/2.1 (+http://www.google.com/bot.html)", "Accept": "text/html" },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const ogDesc = html.match(/og:description.*?content="([^"]*)"/i);
    if (!ogDesc?.[1]) return null;
    const desc = ogDesc[1].replace(/&#064;/g, "@");
    const nameMatch = desc.match(/from\s+(.+?)(?:\s*\(@|\s*$)/);
    const fullName = nameMatch?.[1]?.trim() || "";
    const profile = { username, fullName, bio: fullName, category: "", followers: 0 };
    const fMatch = desc.match(/([\d,.]+[KkMm]?)\s*Followers/i);
    if (fMatch) {
      const raw = fMatch[1].replace(/,/g, "");
      if (raw.endsWith("K") || raw.endsWith("k")) profile.followers = parseFloat(raw) * 1000;
      else if (raw.endsWith("M") || raw.endsWith("m")) profile.followers = parseFloat(raw) * 1000000;
      else profile.followers = parseInt(raw) || 0;
    }
    fs.writeFileSync(cachePath, JSON.stringify(profile, null, 2));
    return profile;
  } catch { return null; }
}

// ---- Virality scoring ----
function scoreAndRank(items) {
  if (!items.length) return [];
  return items.map(item => ({
    ...item,
    viralityScore: Math.round((item.views / 20) + (item.likes / 10) + (item.comments || 0)),
  })).sort((a, b) => b.viralityScore - a.viralityScore);
}

// ---- Main ----
async function main() {
  console.log("\n=== Scraping Florida + USA (lookback, max " + MAX_DAYS_BACK + " days) ===\n");
  const output = {};
  let totalSearches = 0;

  for (const scope of SCOPES) {
    console.log(`\n${"=".repeat(50)}`);
    console.log(`  ${scope.name} (location: ${scope.location})`);
    console.log(`${"=".repeat(50)}\n`);

    const top5 = [];
    const seenShortcodes = new Set();
    const seenAuthors = new Set();

    // Day-by-day lookback: yesterday first, then day before, etc.
    for (let daysBack = 1; daysBack <= MAX_DAYS_BACK; daysBack++) {
      if (top5.length >= TARGET_POSTS) break;

      const date = new Date();
      date.setDate(date.getDate() - daysBack);
      const dateFilter = formatDateFilter(date);
      const dateLabel = formatDateLabel(date);

      console.log(`\n  --- Day ${daysBack}: ${dateLabel} ---`);

      // Discover reels for this single day
      const dayResults = [];
      for (const q of scope.queries) {
        console.log(`    [serp] ${q}`);
        const results = await serpSearchDay(q, scope.location, dateFilter);
        totalSearches++;
        dayResults.push(...results);
        await new Promise(r => setTimeout(r, 1000));
      }

      // Dedup by shortcode within this day's results
      const unique = dayResults.filter(r => {
        if (!r.url.includes("instagram.com/reel/") && !r.url.includes("instagram.com/p/")) return false;
        const m = r.url.match(/(?:reel|p)\/([A-Za-z0-9_-]+)/);
        const sc = m ? m[1] : r.url;
        if (seenShortcodes.has(sc)) return false;
        seenShortcodes.add(sc);
        return true;
      });

      console.log(`    ${dayResults.length} raw -> ${unique.length} new unique URLs`);

      // Check engagement + verify agent + dedup by author
      for (const r of unique) {
        if (top5.length >= TARGET_POSTS) break;

        const eng = await getEngagement(r.url);
        if (!eng) continue;

        // Author dedup
        const authorKey = (eng.author || "").toLowerCase();
        if (authorKey && seenAuthors.has(authorKey)) {
          console.log(`    ⏭️  @${eng.author} | skipped (duplicate author)`);
          continue;
        }

        // Check if RE agent using tiered detection
        const profile = await fetchProfileCached(eng.author);
        const detection = checkAgent({
          bio: profile?.bio || profile?.fullName || "",
          fullName: profile?.fullName || "",
          username: eng.author || "",
          caption: eng.caption || r.title || "",
        });

        if (!detection.isAgent) {
          console.log(`    ❌ @${eng.author} | skipped (tier:${detection.tier} signals:[${detection.signals.join(",")}] neg:[${detection.negatives.join(",")}])`);
        }

        if (detection.isAgent) {
          const score = Math.round((eng.views / 20) + (eng.likes / 10) + (eng.comments || 0));
          console.log(`    ✅ @${eng.author} | 👾 ${score} | ${eng.views.toLocaleString()} views | ${dateLabel}`);
          seenAuthors.add(authorKey);
          top5.push({
            ...eng,
            title: r.title.replace(" | Instagram", "").replace(" on Instagram:", "").trim(),
            viralityScore: score,
            date: dateLabel,
          });
        }

        await new Promise(r => setTimeout(r, 800));
      }

      console.log(`    Running total: ${top5.length}/${TARGET_POSTS} agents`);
    }

    // Sort final list by virality score
    top5.sort((a, b) => b.viralityScore - a.viralityScore);

    console.log(`\n  Selected ${top5.length} verified agents for ${scope.name}\n`);

    // Transcribe + generate scripts
    console.log(`[4] Transcribing + generating scripts...`);
    for (const item of top5) {
      const videoPath = await downloadVideo(item.shortcode);
      await new Promise(r => setTimeout(r, 300));
      let transcript = "";
      if (videoPath) transcript = transcribe(item.shortcode);
      const caption = transcript || item.caption || item.title;
      item.script = await generateScript(item.shortcode, item.title, caption, scope.name);
    }

    output[scope.name] = top5;
    console.log(`\n  ✅ ${scope.name}: ${top5.length} posts ready`);
  }

  // Save
  const outFile = path.join(__dirname, "output/digest_state_nation.json");
  fs.writeFileSync(outFile, JSON.stringify(output, null, 2));
  console.log(`\n📁 Saved: ${outFile}`);
  console.log(`💰 SerpAPI searches used: ${totalSearches}`);
}

main().catch(console.error);
