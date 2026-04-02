// Scrape Florida-wide and USA-wide real estate content
// Florida: location=Florida,United States
// USA: location=United States, gl=us

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, ".env") });

const SERPAPI_KEY = process.env.SERPAPI_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const TEMP_DIR = path.resolve(__dirname, "output/temp");
const TRANSCRIPT_DIR = path.resolve(__dirname, "output/transcripts");
const SCRIPT_DIR = path.resolve(__dirname, "output/script_cache");

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
if (!fs.existsSync(TRANSCRIPT_DIR)) fs.mkdirSync(TRANSCRIPT_DIR, { recursive: true });
if (!fs.existsSync(SCRIPT_DIR)) fs.mkdirSync(SCRIPT_DIR, { recursive: true });

const SCOPES = [
  {
    name: "Florida",
    location: "Florida,United States",
    queries: [
      'site:instagram.com/reel "Florida" real estate',
      'site:instagram.com/reel "FL" homes for sale',
      'site:instagram.com/reel "Florida" housing market 2026',
      'site:instagram.com/reel "Florida" realtor home tour',
    ],
  },
  {
    name: "USA",
    location: "United States",
    queries: [
      'site:instagram.com/reel real estate 2026',
      'site:instagram.com/reel homes for sale viral',
      'site:instagram.com/reel housing market 2026',
      'site:instagram.com/reel realtor home tour',
    ],
  },
];

// ---- SerpAPI ----
async function serpSearch(query, location) {
  const params = new URLSearchParams({
    api_key: SERPAPI_KEY,
    engine: "google",
    q: query,
    location: location,
    gl: "us",
    hl: "en",
    tbs: "cdr:1,cd_min:01/01/2026,cd_max:12/31/2026",
    num: "10",
  });
  const res = await fetch(`https://serpapi.com/search.json?${params}`);
  if (!res.ok) { console.log(`  [serp] Error: ${res.status}`); return []; }
  const data = await res.json();
  if (data.error) { console.log(`  [serp] ${data.error}`); return []; }
  return (data.organic_results || []).map(r => ({
    title: r.title,
    url: r.link,
    snippet: r.snippet || "",
  }));
}

async function discoverReels(queries, location) {
  const all = [];
  let searches = 0;
  for (const q of queries) {
    for (let start = 0; start < 30; start += 10) {
      const params = new URLSearchParams({
        api_key: SERPAPI_KEY,
        engine: "google",
        q: q,
        location: location,
        gl: "us",
        hl: "en",
        tbs: "cdr:1,cd_min:01/01/2026,cd_max:12/31/2026",
        num: "10",
        start: String(start),
      });
      console.log(`  [serp] ${q} (start=${start})`);
      const res = await fetch(`https://serpapi.com/search.json?${params}`);
      searches++;
      if (!res.ok) break;
      const data = await res.json();
      if (data.error) break;
      const results = data.organic_results || [];
      all.push(...results.map(r => ({ title: r.title, url: r.link, snippet: r.snippet || "" })));
      if (results.length < 10) break;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  // Dedup by shortcode
  const seen = new Set();
  const unique = all.filter(r => {
    if (!r.url.includes("instagram.com/reel/") && !r.url.includes("instagram.com/p/")) return false;
    const m = r.url.match(/(?:reel|p)\/([A-Za-z0-9_-]+)/);
    const sc = m ? m[1] : r.url;
    if (seen.has(sc)) return false;
    seen.add(sc);
    return true;
  });
  console.log(`  [serp] ${all.length} raw -> ${unique.length} unique (${searches} searches used)\n`);
  return { results: unique, searches };
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
    const res = await fetch(`https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`, {
      headers: {
        "User-Agent": "Instagram 275.0.0.27.98 Android (33/13; 420dpi; 1080x2400; samsung; SM-G991B; o1s; exynos2100; en_US; 458229258)",
        "X-IG-App-ID": "936619743392459",
      },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const u = json?.data?.user;
    if (!u) return null;
    const profile = { username: u.username, fullName: u.full_name || "", bio: u.biography || "", category: u.category_name || "", followers: u.edge_followed_by?.count || 0 };
    fs.writeFileSync(cachePath, JSON.stringify(profile, null, 2));
    return profile;
  } catch { return null; }
}

// ---- Virality scoring ----
// Absolute formula (not normalized):
//   score = (views / 20) + (likes / 10) + comments
//   20 views = 1 point, 10 likes = 1 point, 1 comment = 1 point
//   No cap. Displayed as up to 3 digits in UI.
function scoreAndRank(items) {
  if (!items.length) return [];
  return items.map(item => ({
    ...item,
    viralityScore: Math.round((item.views / 20) + (item.likes / 10) + (item.comments || 0)),
  })).sort((a, b) => b.viralityScore - a.viralityScore);
}

// ---- Main ----
async function main() {
  console.log("\n=== Scraping Florida + USA ===\n");
  const output = {};
  let totalSearches = 0;

  for (const scope of SCOPES) {
    console.log(`\n${"=".repeat(50)}`);
    console.log(`  ${scope.name} (location: ${scope.location})`);
    console.log(`${"=".repeat(50)}\n`);

    // Discover
    const { results, searches } = await discoverReels(scope.queries, scope.location);
    totalSearches += searches;

    // Engagement
    console.log(`[2] Checking engagement for ${results.length} URLs...`);
    const withEngagement = [];
    for (const r of results) {
      const eng = await getEngagement(r.url);
      if (eng && eng.likes >= 10) {
        withEngagement.push({
          ...eng,
          title: r.title.replace(" | Instagram", "").replace(" on Instagram:", "").trim(),
        });
      }
      await new Promise(r => setTimeout(r, 500));
    }
    console.log(`  ${withEngagement.length} passed 10+ likes filter\n`);

    // Score and pick top 5 verified RE agents
    const scored = scoreAndRank(withEngagement);

    console.log(`[3] Selecting top 5 verified RE agents...`);
    const top5 = [];
    for (const item of scored) {
      if (top5.length >= 5) break;

      // Check bio
      const profile = await fetchProfileCached(item.author);
      if (profile) {
        const bio = (profile.bio || "").toLowerCase();
        const fullName = (profile.fullName || "").toLowerCase();
        const username = (item.author || "").toLowerCase();
        const allText = bio + " " + fullName + " " + username;

        const reKeywords = ["realtor", "real estate", "realty", "broker", "keller williams",
          "coldwell banker", "re/max", "remax", "century 21", "compass", "exp realty",
          "sotheby", "berkshire", "listing agent", "buyer agent", "homes for sale",
          "dre#", "licensed", "buying and selling", "buying & selling"];
        const negKeywords = ["media", "news", "data", "podcast", "coach", "mortgage",
          "lender", "investor", "wholesale", "flipper", "photographer", "builder",
          "construction company", "global feed"];

        const hasRE = reKeywords.some(kw => allText.includes(kw));
        const hasNeg = negKeywords.some(kw => allText.includes(kw));

        if (hasRE && !hasNeg) {
          console.log(`  ✅ @${item.author} | 👾 ${item.viralityScore} | ${item.views.toLocaleString()} views | bio match`);
          top5.push(item);
        } else {
          console.log(`  ❌ @${item.author} | skipped (${hasNeg ? "negative keyword" : "no RE keywords in bio"})`);
        }
      } else {
        // Can't fetch bio — use full_name from post data as fallback
        const fullName = (item.title || "").toLowerCase();
        const username = (item.author || "").toLowerCase();
        const hasFallback = ["realtor", "real estate", "realty", "broker"].some(kw =>
          fullName.includes(kw) || username.includes(kw));
        if (hasFallback) {
          console.log(`  ✅ @${item.author} | 👾 ${item.viralityScore} | (no bio, name/username match)`);
          top5.push(item);
        } else {
          console.log(`  ⚠️ @${item.author} | skipped (no bio, no name match)`);
        }
      }
      await new Promise(r => setTimeout(r, 2000));
    }

    console.log(`\n  Selected ${top5.length} verified agents\n`);

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
