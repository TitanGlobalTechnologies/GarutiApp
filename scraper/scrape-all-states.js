/**
 * LAE All-States + Cities Scraper (SerpAPI edition)
 *
 * Uses SerpAPI for Google searches — zero CAPTCHAs, 100 results per call.
 * Yesterday-first with day-by-day lookback if a scope is sparse.
 *
 * Full pipeline: SerpAPI -> engagement -> agent detection
 *                -> video download -> Whisper transcription -> Claude scripts
 *
 * Output: digest_all_with_scope.json (feeds generate-live-digest.js)
 *
 * Usage:
 *   node scrape-all-states.js                     # Full run
 *   node scrape-all-states.js --skip-transcribe    # Search + agents only
 *   node scrape-all-states.js --skip-states        # Cities + FL only
 *   node scrape-all-states.js --only-cities        # SWFL cities only
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, ".env") });

const { checkAgent } = require("./src/agent-check");

// ── Config ──
const SERPAPI_KEY = process.env.SERPAPI_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const TEMP_DIR = path.resolve(__dirname, "output/temp");
const TRANSCRIPT_DIR = path.resolve(__dirname, "output/transcripts");
const SCRIPT_DIR = path.resolve(__dirname, "output/script_cache");
const BIO_CACHE_DIR = path.resolve(__dirname, "output/bio_cache");

for (const dir of [TEMP_DIR, TRANSCRIPT_DIR, SCRIPT_DIR, BIO_CACHE_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

if (!SERPAPI_KEY) {
  console.error("Missing SERPAPI_KEY in .env");
  process.exit(1);
}

// ── Three query variants ──
const QUERIES = [
  'site:instagram.com/reel intext:"realtor" real estate',
  'site:instagram.com/reel intext:"realty" real estate',
  'site:instagram.com/reel intext:"real estate" homes for sale',
];

const SWFL_CITIES = ["Cape Coral", "Fort Myers", "Naples", "Bonita Springs", "Lehigh Acres", "Punta Gorda"];

// ── Search targets ──
const ALL_TARGETS = [
  { scope: "Cape Coral_FL",    location: "Cape Coral,Florida,United States",        type: "city" },
  { scope: "Fort Myers_FL",    location: "Fort Myers,Florida,United States",        type: "city" },
  { scope: "Naples_FL",        location: "Naples,Florida,United States",            type: "city" },
  { scope: "Bonita Springs_FL",location: "Bonita Springs,Florida,United States",    type: "city" },
  { scope: "Lehigh Acres_FL",  location: "Lehigh Acres,Florida,United States",      type: "city" },
  { scope: "Punta Gorda_FL",   location: "Punta Gorda,Florida,United States",       type: "city" },
  { scope: "Florida",          location: "Florida,United States",                    type: "state" },
  { scope: "Georgia",          location: "Georgia,United States",                    type: "nearby" },
  { scope: "Alabama",          location: "Alabama,United States",                    type: "nearby" },
  { scope: "South Carolina",   location: "South Carolina,United States",             type: "nearby" },
  { scope: "North Carolina",   location: "North Carolina,United States",             type: "nearby" },
  { scope: "Tennessee",        location: "Tennessee,United States",                  type: "nearby" },
  { scope: "Mississippi",      location: "Mississippi,United States",                type: "nearby" },
  { scope: "Louisiana",        location: "Louisiana,United States",                  type: "nearby" },
  { scope: "Texas",            location: "Texas,United States",                      type: "nearby" },
  { scope: "Virginia",         location: "Virginia,United States",                   type: "nearby" },
  { scope: "New York",         location: "New York,United States",                   type: "nearby" },
];

// Minimum verified agents per scope before stopping lookback
const MIN_AGENTS = { city: 5, state: 5, nearby: 1 };

// ── Location filter: reject posts clearly from outside the target area ──
// States we search — posts tagged in these states are allowed
const ALLOWED_STATES = new Set([
  "florida", "georgia", "alabama", "south carolina", "north carolina",
  "tennessee", "mississippi", "louisiana", "texas", "virginia", "new york",
]);
// SWFL cities + common FL cities — posts tagged here are always allowed
const ALLOWED_CITIES = new Set([
  "cape coral", "fort myers", "naples", "bonita springs", "lehigh acres", "punta gorda",
  "miami", "orlando", "tampa", "jacksonville", "st. petersburg", "sarasota",
  "clearwater", "tallahassee", "gainesville", "lakeland", "palm beach",
  "west palm beach", "boca raton", "fort lauderdale", "hollywood",
]);
// Cities that mean "definitely not our area" — hard reject
const REJECTED_LOCATIONS = [
  "los angeles", "san francisco", "san diego", "seattle", "portland",
  "chicago", "detroit", "denver", "phoenix", "las vegas", "boston",
  "minneapolis", "salt lake", "honolulu", "anchorage",
];

/**
 * Check if a post's location is in our target area.
 * Returns: "ok" (allowed), "reject" (wrong area), "unknown" (no location data)
 */
function checkLocation(eng, targetScope) {
  const locName = (eng.locationName || "").toLowerCase();
  const locCity = (eng.locationCity || "").toLowerCase();
  const caption = (eng.caption || "").toLowerCase();

  // Layer 1: Instagram location tag
  if (locName || locCity) {
    // Hard reject: known out-of-area cities
    for (const bad of REJECTED_LOCATIONS) {
      if (locName.includes(bad) || locCity.includes(bad)) return "reject";
    }
    // Check if location matches an allowed state or city
    for (const state of ALLOWED_STATES) {
      if (locName.includes(state)) return "ok";
    }
    for (const city of ALLOWED_CITIES) {
      if (locName.includes(city) || locCity.includes(city)) return "ok";
    }
    // Tagged location exists but doesn't match our area — suspicious but allow
    // (could be a suburb or neighborhood name we don't recognize)
  }

  // Layer 2: Caption analysis — check for out-of-area signals
  for (const bad of REJECTED_LOCATIONS) {
    // Look for patterns like "#LosAngelesRealtor" or "Los Angeles real estate"
    if (caption.includes(bad + " realtor") || caption.includes(bad + " real estate") ||
        caption.includes(bad + "realtor") || caption.includes("#" + bad.replace(/ /g, ""))) {
      return "reject";
    }
  }

  return "unknown"; // no location data — allow by default
}
const MAX_LOOKBACK_DAYS = 7;

// ══════════════════════════════════════════════════════════
//  Helpers
// ══════════════════════════════════════════════════════════

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/** Get YYYY-MM-DD for N days ago */
function getDateStr(daysBack) {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return d.toISOString().split("T")[0];
}

/** Convert YYYY-MM-DD to MM/DD/YYYY for SerpAPI tbs param */
function toTbsDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return `${m}/${d}/${y}`;
}

function bar(current, total, width = 30) {
  const filled = Math.round((current / total) * width);
  return "\u2588".repeat(filled) + "\u2591".repeat(width - filled);
}

function elapsed(startMs) {
  const s = Math.round((Date.now() - startMs) / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m${sec.toString().padStart(2, "0")}s` : `${sec}s`;
}

function eta(startMs, current, total) {
  if (current === 0) return "...";
  const avgMs = (Date.now() - startMs) / current;
  const remaining = Math.round((avgMs * (total - current)) / 1000);
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  return m > 0 ? `~${m}m${s.toString().padStart(2, "0")}s` : `~${s}s`;
}

// ══════════════════════════════════════════════════════════
//  SerpAPI search
// ══════════════════════════════════════════════════════════

let serpApiUsed = 0;

async function serpSearch(query, location, dateFrom, dateTo) {
  const tbs = `cdr:1,cd_min:${toTbsDate(dateFrom)},cd_max:${toTbsDate(dateTo)}`;
  const params = new URLSearchParams({
    api_key: SERPAPI_KEY,
    engine: "google",
    q: query,
    location: location,
    gl: "us",
    hl: "en",
    tbs: tbs,
    num: "100",
  });

  const res = await fetch(`https://serpapi.com/search.json?${params}`);
  serpApiUsed++;

  if (!res.ok) {
    const err = await res.text();
    console.log(`       [serpapi] Error ${res.status}: ${err.slice(0, 100)}`);
    return [];
  }

  const data = await res.json();
  if (data.error) {
    console.log(`       [serpapi] ${data.error}`);
    return [];
  }

  // Extract Instagram reel URLs
  const results = [];
  const seen = new Set();
  for (const item of (data.organic_results || [])) {
    const url = item.link || "";
    if (!url.includes("instagram.com/reel/") && !url.includes("instagram.com/p/")) continue;
    const m = url.match(/(?:reel|p)\/([A-Za-z0-9_-]+)/);
    if (!m) continue;
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    results.push({
      shortcode: m[1],
      url: url,
      title: (item.title || "").replace(" | Instagram", "").replace(" on Instagram:", "").trim(),
      snippet: item.snippet || "",
    });
  }
  return results;
}

// ══════════════════════════════════════════════════════════
//  Instagram engagement + bio (cached)
// ══════════════════════════════════════════════════════════

const engagementCache = new Map();
const agentCache = new Map();

async function getEngagement(url) {
  const m = url.match(/(?:reel|p)\/([A-Za-z0-9_-]+)/);
  if (!m) return null;
  const sc = m[1];
  if (engagementCache.has(sc)) return engagementCache.get(sc);
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
    if (!res.ok) { engagementCache.set(sc, null); return null; }
    const json = await res.json();
    const media = json?.data?.xdt_shortcode_media;
    if (!media) { engagementCache.set(sc, null); return null; }
    // Extract location data (free — already in the response)
    const loc = media.location || null;
    let locationName = null;
    let locationCity = null;
    if (loc) {
      locationName = loc.name || null;
      try {
        const addr = typeof loc.address_json === "string" ? JSON.parse(loc.address_json) : loc.address_json;
        locationCity = addr?.city_name || null;
      } catch {}
    }

    const result = {
      shortcode: sc, url,
      likes: media.edge_media_preview_like?.count || 0,
      comments: media.edge_media_to_parent_comment?.count || 0,
      views: media.video_view_count || media.video_play_count || 0,
      caption: media.edge_media_to_caption?.edges?.[0]?.node?.text || "",
      author: media.owner?.username || "",
      fullName: media.owner?.full_name || "",
      isVideo: media.is_video || false,
      videoUrl: media.video_url || null,
      locationName,
      locationCity,
      locationLat: loc?.lat || null,
      locationLng: loc?.lng || null,
    };
    engagementCache.set(sc, result);
    return result;
  } catch { engagementCache.set(sc, null); return null; }
}

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
    fs.writeFileSync(cachePath, JSON.stringify(profile, null, 2));
    return profile;
  } catch { return null; }
}

// ══════════════════════════════════════════════════════════
//  Transcription (Whisper, cached)
// ══════════════════════════════════════════════════════════

async function getVideoUrl(shortcode) {
  const cached = engagementCache.get(shortcode);
  if (cached?.videoUrl) return cached.videoUrl;
  try {
    const params = new URLSearchParams({
      variables: JSON.stringify({ shortcode }),
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
    return json?.data?.xdt_shortcode_media?.video_url || null;
  } catch { return null; }
}

async function transcribeReel(shortcode) {
  const cachePath = path.join(TRANSCRIPT_DIR, `${shortcode}.txt`);
  if (fs.existsSync(cachePath)) {
    return { transcript: fs.readFileSync(cachePath, "utf-8"), cached: true };
  }
  const videoUrl = await getVideoUrl(shortcode);
  if (!videoUrl) return { transcript: "", cached: false };

  const videoPath = path.join(TEMP_DIR, `${shortcode}.mp4`);
  if (!fs.existsSync(videoPath)) {
    try {
      const res = await fetch(videoUrl);
      if (!res.ok) return { transcript: "", cached: false };
      fs.writeFileSync(videoPath, Buffer.from(await res.arrayBuffer()));
    } catch { return { transcript: "", cached: false }; }
  }

  try {
    const pyScript = path.join(TEMP_DIR, `_w_${shortcode}.py`);
    const vp = videoPath.replace(/\\/g, "/");
    fs.writeFileSync(pyScript, `import whisper\nmodel = whisper.load_model("base")\nresult = model.transcribe("${vp}", language="en")\nprint(result["text"])\n`);
    const result = execSync(`python "${pyScript}"`, {
      stdio: "pipe", timeout: 120000,
      env: { ...process.env, PATH: (process.env.PATH || "") + ";C:\\Users\\gaba\\AppData\\Local\\Microsoft\\WinGet\\Links" },
    }).toString().trim();
    try { fs.unlinkSync(pyScript); } catch {}
    if (result) {
      fs.writeFileSync(cachePath, result);
      try { fs.unlinkSync(videoPath); } catch {}
    }
    return { transcript: result, cached: false };
  } catch { return { transcript: "", cached: false }; }
}

// ══════════════════════════════════════════════════════════
//  Script generation (Claude API, cached)
// ══════════════════════════════════════════════════════════

let _systemPrompt = null;
function getSystemPrompt() {
  if (_systemPrompt) return _systemPrompt;
  try {
    const kbPath = path.join(__dirname, "src/knowledge-base.ts");
    const src = fs.readFileSync(kbPath, "utf-8");
    const m = src.match(/CONVERSION_SYSTEM_PROMPT = `([\s\S]*?)`;/);
    if (m) { _systemPrompt = m[1]; return _systemPrompt; }
  } catch {}
  _systemPrompt = "You are an elite real estate content strategist. Write 80-150 word video scripts that convert viewers into leads. NEVER use em dashes or semicolons. End with a specific question CTA.";
  return _systemPrompt;
}

function buildScriptPrompt(title, caption, city, state, views, likes, comments) {
  return `Here is a viral Instagram Reel about real estate in ${city}, ${state}:

Title: "${title}"
Caption/Transcript: "${caption}"
Performance: ${views.toLocaleString()} views, ${likes.toLocaleString()} likes, ${comments.toLocaleString()} comments

The "Caption/Transcript" above may be a REAL TRANSCRIPT of what the person actually said in the video. If it sounds like spoken words (not hashtags or emojis), treat it as the actual script they used and base your rewrite on their specific talking points, data, and arguments.

Rewrite this as a conversion-optimized script for a real estate agent in ${city}, ${state}.

The script must:
- Keep what made the original go viral (the core topic, angle, and key talking points)
- If a transcript is provided, capture the same energy and arguments but rewrite for the agent's voice
- Add psychological triggers to drive viewers to DM or comment
- Include specific ${city} details and data points
- End with a conversation-starting CTA (a specific question, not "DM me")
- Be 80-150 words (30-60 seconds when spoken)

Return ONLY the script text. No labels or formatting.`;
}

async function generateScript(shortcode, title, caption, city, state, views, likes, comments) {
  const cachePath = path.join(SCRIPT_DIR, `${shortcode}.txt`);
  if (fs.existsSync(cachePath)) {
    return { script: fs.readFileSync(cachePath, "utf-8"), cached: true };
  }
  if (!ANTHROPIC_KEY) {
    return { script: `[No API key - topic: ${title}]`, cached: false };
  }

  const systemPrompt = getSystemPrompt();
  const userPrompt = buildScriptPrompt(title, caption, city, state, views, likes, comments);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 500,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });
      if (!res.ok) {
        if (attempt < 3) { await sleep(attempt * 5000); continue; }
        return { script: `[Script failed: ${title}]`, cached: false };
      }
      const data = await res.json();
      const script = data.content[0]?.text || "";
      if (script && !script.startsWith("The transcript") && !script.startsWith("I need")) {
        fs.writeFileSync(cachePath, script);
        return { script, cached: false };
      }
    } catch {
      if (attempt < 3) await sleep(attempt * 5000);
    }
  }
  return { script: `[Script failed: ${title}]`, cached: false };
}

// ══════════════════════════════════════════════════════════
//  Hierarchy
// ══════════════════════════════════════════════════════════

function dedupTopN(posts, n) {
  const seenSC = new Set();
  const seenAuth = new Set();
  const result = [];
  for (const p of posts) {
    if (result.length >= n) break;
    if (seenSC.has(p.shortcode)) continue;
    const author = (p.author || "").toLowerCase();
    if (author && seenAuth.has(author)) continue;
    seenSC.add(p.shortcode);
    if (author) seenAuth.add(author);
    result.push(p);
  }
  return result;
}

// ══════════════════════════════════════════════════════════
//  Main
// ══════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const skipTranscribe = args.includes("--skip-transcribe");
  const skipStates = args.includes("--skip-states");
  const onlyCities = args.includes("--only-cities");

  let targets = ALL_TARGETS;
  if (onlyCities) targets = targets.filter(t => t.type === "city");
  else if (skipStates) targets = targets.filter(t => t.type !== "nearby");

  const today = new Date().toISOString().split("T")[0];
  const startTime = Date.now();

  // ── Header ──
  console.log("");
  console.log("\u2554" + "\u2550".repeat(62) + "\u2557");
  console.log("\u2551  LAE Scraper \u2014 SerpAPI + Fresh-First" + " ".repeat(24) + "\u2551");
  console.log("\u2551  " + `${targets.length} targets | 3 queries | 100 results/search`.padEnd(60) + "\u2551");
  console.log("\u2551  " + `Q1: "realtor" | Q2: "realty" | Q3: "real estate"`.padEnd(60) + "\u2551");
  console.log("\u2551  " + `Lookback: up to ${MAX_LOOKBACK_DAYS} days | Date: ${today}`.padEnd(60) + "\u2551");
  console.log("\u255A" + "\u2550".repeat(62) + "\u255D");
  console.log("");

  // ── Phase 1: SerpAPI Search + Agent Detection ──
  console.log("\u2500\u2500 Phase 1: SerpAPI Search + Agent Detection " + "\u2500".repeat(19));
  console.log("");

  const scopeResults = {};
  const globalSeenShortcodes = new Set();
  let totalAgents = 0;

  for (let i = 0; i < targets.length; i++) {
    const { scope, location, type } = targets[i];
    const minAgents = MIN_AGENTS[type] || 3;
    const pct = Math.round((i / targets.length) * 100);
    const typeTag = type === "city" ? "\uD83C\uDFD9\uFE0F " : type === "state" ? "\uD83C\uDF0A" : "\uD83C\uDF0E";

    console.log(`  ${bar(i, targets.length)} ${pct}% | ${i}/${targets.length} done | ${totalAgents} agents | API: ${serpApiUsed} used | ${elapsed(startTime)}`);
    console.log(`  ${typeTag} ${scope} (need ${minAgents}+ agents)`);

    // ── Lookback loop: yesterday first, then day by day ──
    const agents = [];
    const seenAuthors = new Set();
    const scopeSeenSC = new Set();

    for (let dayBack = 1; dayBack <= MAX_LOOKBACK_DAYS; dayBack++) {
      const dateFrom = getDateStr(dayBack);
      const dateTo = getDateStr(dayBack - 1);
      const dayLabel = dayBack === 1 ? "yesterday" : `${dayBack}d ago`;

      console.log(`     \uD83D\uDCC5 ${dateFrom} (${dayLabel}) \u2014 3 queries x 100 results`);

      // Run all 3 queries for this day
      const dayReels = [];
      for (let qi = 0; qi < QUERIES.length; qi++) {
        const q = QUERIES[qi];
        console.log(`       Q${qi + 1}: ${q.replace('site:instagram.com/reel ', '')}`);
        const results = await serpSearch(q, location, dateFrom, dateTo);

        for (const r of results) {
          if (!globalSeenShortcodes.has(r.shortcode) && !scopeSeenSC.has(r.shortcode)) {
            globalSeenShortcodes.add(r.shortcode);
            scopeSeenSC.add(r.shortcode);
            r._searchDate = dateFrom;
            dayReels.push(r);
          }
        }
        console.log(`         ${results.length} reels, ${dayReels.length} new this day`);

        // 1s between API calls
        await sleep(1000);
      }

      if (dayReels.length === 0) {
        console.log(`       (no new reels for this day)`);
        if (dayBack < MAX_LOOKBACK_DAYS && agents.length < minAgents) {
          console.log(`       \u23EA ${agents.length}/${minAgents} agents, looking back...`);
          continue;
        }
        break;
      }

      // Check engagement + agent detection for this day's reels
      console.log(`       Checking ${dayReels.length} reels for engagement + agents...`);
      for (const r of dayReels) {
        const eng = await getEngagement(r.url);
        if (!eng) continue;

        const authorKey = (eng.author || "").toLowerCase();
        if (!authorKey || seenAuthors.has(authorKey)) continue;

        let detection;
        if (agentCache.has(authorKey)) {
          detection = agentCache.get(authorKey);
        } else {
          const profile = await fetchProfileCached(eng.author);
          detection = checkAgent({
            bio: profile?.bio || profile?.fullName || "",
            fullName: profile?.fullName || eng.fullName || "",
            username: eng.author || "",
            caption: eng.caption || r.title || "",
          });
          agentCache.set(authorKey, detection);
        }

        if (detection.isAgent) {
          // Location filter — reject posts clearly from outside our target area
          const locCheck = checkLocation(eng, scope);
          if (locCheck === "reject") {
            const where = eng.locationName || eng.locationCity || "caption signals";
            console.log(`       \u274C @${eng.author} | REJECTED — wrong location: ${where}`);
            continue;
          }

          const score = Math.round((eng.views / 20) + (eng.likes / 10) + (eng.comments || 0));
          seenAuthors.add(authorKey);
          agents.push({
            shortcode: eng.shortcode, url: eng.url,
            likes: eng.likes, comments: eng.comments, views: eng.views,
            caption: eng.caption, author: eng.author, fullName: eng.fullName,
            title: r.title, viralityScore: score,
            date: r._searchDate || today,
            state: scope.replace("_FL", "").replace(/_/g, " "),
            tier: detection.tier, signals: detection.signals,
            locationName: eng.locationName, locationCity: eng.locationCity,
          });
          const locTag = eng.locationName ? ` | \uD83D\uDCCD ${eng.locationName}` : "";
          console.log(`       \u2705 @${eng.author} | \uD83D\uDC7E ${score} | ${eng.views.toLocaleString()} views | tier:${detection.tier}${locTag}`);
        }
        await sleep(500 + Math.random() * 500);
      }

      console.log(`       \u2192 ${agents.length} agents so far for ${scope}`);

      if (agents.length >= minAgents) {
        console.log(`       \u2714\uFE0F  Hit ${minAgents}+ agents, moving on`);
        break;
      }
      if (dayBack < MAX_LOOKBACK_DAYS) {
        console.log(`       \u23EA Only ${agents.length}/${minAgents}, looking back 1 more day...`);
      } else {
        console.log(`       \u23F9\uFE0F  Reached ${MAX_LOOKBACK_DAYS}-day lookback limit`);
      }
    }

    agents.sort((a, b) => b.viralityScore - a.viralityScore);
    scopeResults[scope] = agents;
    totalAgents += agents.length;
    console.log(`     \u2192 ${agents.length} verified agents total\n`);

    // Crash recovery
    const partialFile = path.join(__dirname, "output/digest_partial.json");
    fs.writeFileSync(partialFile, JSON.stringify(scopeResults, null, 2));
  }

  // Final Phase 1 stats
  console.log(`  ${bar(targets.length, targets.length)} 100% | ${targets.length}/${targets.length} done | ${totalAgents} agents | API: ${serpApiUsed} used | ${elapsed(startTime)}`);
  console.log(`  SerpAPI budget: ${serpApiUsed} used this run, ~${106 - serpApiUsed} estimated remaining`);
  console.log("");

  // ── Phase 2: Transcription ──
  if (!skipTranscribe) {
    console.log("\u2500\u2500 Phase 2: Transcription (Whisper) " + "\u2500".repeat(28));
    console.log("");

    const uniqueForTranscribe = [];
    const seenSC = new Set();
    for (const agents of Object.values(scopeResults)) {
      for (const a of agents) {
        if (!seenSC.has(a.shortcode)) { seenSC.add(a.shortcode); uniqueForTranscribe.push(a); }
      }
    }

    let tCached = 0, tNew = 0, tFailed = 0;
    for (let j = 0; j < uniqueForTranscribe.length; j++) {
      const a = uniqueForTranscribe[j];
      const pct = Math.round(((j + 1) / uniqueForTranscribe.length) * 100);
      process.stdout.write(`\r  ${bar(j + 1, uniqueForTranscribe.length)} ${pct}% | ${j + 1}/${uniqueForTranscribe.length} | @${(a.author || "").padEnd(20)} | cached:${tCached} new:${tNew} fail:${tFailed}   `);

      const { transcript, cached } = await transcribeReel(a.shortcode);
      a.transcript = transcript;
      if (cached) tCached++;
      else if (transcript) tNew++;
      else tFailed++;

      // Propagate to all scope copies
      for (const scope of Object.values(scopeResults)) {
        for (const post of scope) {
          if (post.shortcode === a.shortcode) post.transcript = transcript;
        }
      }
    }
    console.log(`\n     Done: ${tCached} cached, ${tNew} new, ${tFailed} failed\n`);
  }

  // ── Phase 3: Script Generation ──
  if (!skipTranscribe) {
    console.log("\u2500\u2500 Phase 3: Script Generation (Claude) " + "\u2500".repeat(24));
    console.log("");

    const uniqueForScript = [];
    const seenSC2 = new Set();
    for (const agents of Object.values(scopeResults)) {
      for (const a of agents) {
        if (!seenSC2.has(a.shortcode)) { seenSC2.add(a.shortcode); uniqueForScript.push(a); }
      }
    }

    let sCached = 0, sNew = 0;
    for (let j = 0; j < uniqueForScript.length; j++) {
      const a = uniqueForScript[j];
      const pct = Math.round(((j + 1) / uniqueForScript.length) * 100);
      process.stdout.write(`\r  ${bar(j + 1, uniqueForScript.length)} ${pct}% | ${j + 1}/${uniqueForScript.length} | @${(a.author || "").padEnd(20)} | cached:${sCached} new:${sNew}   `);

      const city = a.state || "Florida";
      const state = SWFL_CITIES.includes(a.state) ? "FL" : a.state || "FL";
      const caption = a.transcript || a.caption || a.title;

      const { script, cached } = await generateScript(
        a.shortcode, a.title, caption, city, state, a.views, a.likes, a.comments
      );
      a.script = script;
      if (cached) sCached++;
      else sNew++;

      for (const scope of Object.values(scopeResults)) {
        for (const post of scope) {
          if (post.shortcode === a.shortcode) post.script = script;
        }
      }
      if (!cached) await sleep(300);
    }
    console.log(`\n     Done: ${sCached} cached, ${sNew} new (~$${(sNew * 0.01).toFixed(2)})\n`);
  }

  // ── Phase 4: Build hierarchy + save ──
  console.log("\u2500\u2500 Phase 4: Build Hierarchy + Save " + "\u2500".repeat(28));
  console.log("");

  const allPosts = [];
  for (const [scope, posts] of Object.entries(scopeResults)) {
    for (const p of posts) allPosts.push({ ...p, _scope: scope });
  }
  allPosts.sort((a, b) => b.viralityScore - a.viralityScore);

  // Florida = FL statewide + SWFL city scopes
  const flPool = allPosts.filter(p =>
    p._scope === "Florida" || SWFL_CITIES.some(c => p._scope.startsWith(c))
  );
  const flTop = dedupTopN(flPool, 5);

  // USA = ALL posts from all scopes
  const usaTop = dedupTopN(allPosts, 5);

  console.log(`  USA tab (${usaTop.length}): ${usaTop.map(p => "\uD83D\uDC7E" + p.viralityScore + " @" + p.author + " [" + p._scope + "]").join(", ")}`);
  console.log(`  FL  tab (${flTop.length}): ${flTop.map(p => "\uD83D\uDC7E" + p.viralityScore + " @" + p.author + " [" + p._scope + "]").join(", ")}`);
  for (const city of SWFL_CITIES) {
    const key = `${city}_FL`;
    const posts = scopeResults[key] || [];
    if (posts.length > 0) {
      console.log(`  ${city} (${posts.length}): ${posts.slice(0, 3).map(p => "\uD83D\uDC7E" + p.viralityScore + " @" + p.author).join(", ")}${posts.length > 3 ? "..." : ""}`);
    }
  }

  // Don't pre-build Florida/USA scopes — generate-live-digest.js builds them
  // from the raw city + state scopes (avoids cross-scope duplicates)

  // Save raw scopes only
  const outFile = path.join(__dirname, "output/digest_all_with_scope.json");
  fs.writeFileSync(outFile, JSON.stringify(scopeResults, null, 2));
  console.log(`\n  \uD83D\uDCC1 Saved: ${outFile}`);

  const stateNation = { Florida: flTop, USA: usaTop };
  fs.writeFileSync(path.join(__dirname, "output/digest_state_nation.json"), JSON.stringify(stateNation, null, 2));
  console.log(`  \uD83D\uDCC1 Saved: digest_state_nation.json`);

  try { fs.unlinkSync(path.join(__dirname, "output/digest_partial.json")); } catch {}

  // Summary
  console.log("");
  console.log("\u2554" + "\u2550".repeat(62) + "\u2557");
  console.log("\u2551  DONE" + " ".repeat(56) + "\u2551");
  console.log("\u2551  " + `${totalAgents} agents | ${targets.length} targets | ${elapsed(startTime)} total`.padEnd(60) + "\u2551");
  console.log("\u2551  " + `SerpAPI: ${serpApiUsed} searches used`.padEnd(60) + "\u2551");
  console.log("\u2551  " + `Next: node localize-scripts.js && node generate-live-digest.js`.padEnd(60) + "\u2551");
  console.log("\u255A" + "\u2550".repeat(62) + "\u255D");
  console.log("");
}

main().catch(err => {
  console.error("\n\u274C Fatal error:", err.message);
  console.error("  Partial results saved in output/digest_partial.json");
  console.error(`  SerpAPI searches used: ${serpApiUsed}`);
  process.exit(1);
});
