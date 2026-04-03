// Scrape posts from YESTERDAY ONLY across all scopes
// Tests the virality formula with fresh 24-hour content

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

const BIO_CACHE_DIR = path.resolve(__dirname, "output/bio_cache");
[TEMP_DIR, TRANSCRIPT_DIR, SCRIPT_DIR, BIO_CACHE_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

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

// Yesterday's date
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const yMonth = String(yesterday.getMonth() + 1).padStart(2, "0");
const yDay = String(yesterday.getDate()).padStart(2, "0");
const yYear = yesterday.getFullYear();
const dateFilter = `cdr:1,cd_min:${yMonth}/${yDay}/${yYear},cd_max:${yMonth}/${yDay}/${yYear}`;
const dateLabel = `${yYear}-${yMonth}-${yDay}`;

console.log(`\nScraping posts from YESTERDAY: ${dateLabel}`);
console.log(`Date filter: ${dateFilter}\n`);

const SCOPES = [
  { name: "Cape Coral_FL", location: "Cape Coral,Florida,United States", queries: [
    'site:instagram.com/reel "cape coral" real estate',
    'site:instagram.com/reel "cape coral" homes',
  ]},
  { name: "Fort Myers_FL", location: "Fort Myers,Florida,United States", queries: [
    'site:instagram.com/reel "fort myers" real estate',
    'site:instagram.com/reel "fort myers" homes',
  ]},
  { name: "Naples_FL", location: "Naples,Florida,United States", queries: [
    'site:instagram.com/reel "naples" real estate Florida',
    'site:instagram.com/reel "naples FL" homes',
  ]},
  { name: "Punta Gorda_FL", location: "Punta Gorda,Florida,United States", queries: [
    'site:instagram.com/reel "punta gorda" real estate',
  ]},
  { name: "Bonita Springs_FL", location: "Bonita Springs,Florida,United States", queries: [
    'site:instagram.com/reel "bonita springs" real estate',
  ]},
  { name: "Lehigh Acres_FL", location: "Lehigh Acres,Florida,United States", queries: [
    'site:instagram.com/reel "lehigh acres" real estate',
  ]},
  { name: "Florida", location: "Florida,United States", queries: [
    'site:instagram.com/reel "Florida" real estate',
    'site:instagram.com/reel "FL" homes for sale',
  ]},
  { name: "USA", location: "United States", queries: [
    'site:instagram.com/reel real estate',
    'site:instagram.com/reel homes for sale',
  ]},
];

// ---- SerpAPI ----
async function serpSearch(query, location) {
  const params = new URLSearchParams({
    api_key: SERPAPI_KEY, engine: "google", q: query,
    location, gl: "us", hl: "en", tbs: dateFilter, num: "10",
  });
  const res = await fetch(`https://serpapi.com/search.json?${params}`);
  if (!res.ok) return [];
  const data = await res.json();
  if (data.error) { console.log(`  [serp] ${data.error}`); return []; }
  return (data.organic_results || []).map(r => ({ title: r.title, url: r.link, snippet: r.snippet || "" }));
}

// ---- Instagram engagement ----
async function getEngagement(url) {
  const m = url.match(/(?:reel|p)\/([A-Za-z0-9_-]+)/);
  if (!m) return null;
  const sc = m[1];
  try {
    const params = new URLSearchParams({
      variables: JSON.stringify({ shortcode: sc }), doc_id: "10015901848480474", lsd: "AVqbxe3J_YA",
    });
    const res = await fetch("https://www.instagram.com/api/graphql?" + params, {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "X-IG-App-ID": "936619743392459", "X-FB-LSD": "AVqbxe3J_YA",
        "X-ASBD-ID": "129477", "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const media = json?.data?.xdt_shortcode_media;
    if (!media) return null;
    return {
      shortcode: sc, url,
      likes: media.edge_media_preview_like?.count || 0,
      comments: media.edge_media_to_parent_comment?.count || 0,
      views: media.video_view_count || media.video_play_count || 0,
      caption: media.edge_media_to_caption?.edges?.[0]?.node?.text || "",
      author: media.owner?.username || "",
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
    if (text) { fs.writeFileSync(cache, text); }
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
      variables: JSON.stringify({ shortcode }), doc_id: "10015901848480474", lsd: "AVqbxe3J_YA",
    });
    const res = await fetch("https://www.instagram.com/api/graphql?" + params, {
      method: "POST",
      headers: { "User-Agent": "Mozilla/5.0", "X-IG-App-ID": "936619743392459",
        "X-FB-LSD": "AVqbxe3J_YA", "X-ASBD-ID": "129477", "Content-Type": "application/x-www-form-urlencoded" },
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
  const user = `Viral Instagram Reel (${scope}):\nTitle: "${title}"\nTranscript/Caption: "${caption}"\n\nRewrite as a conversion-optimized script for a real estate agent. Keep the core topic. Add psychological triggers. End with a question CTA. Return ONLY the script text.`;
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
        fs.writeFileSync(cache, script); return script;
      }
    } catch { if (i < 2) await new Promise(r => setTimeout(r, 5000)); }
  }
  return "[Failed]";
}

// ---- Main ----
async function main() {
  const output = {};
  let totalSearches = 0;

  for (const scope of SCOPES) {
    console.log(`\n=== ${scope.name} ===`);

    // Discover
    const all = [];
    for (const q of scope.queries) {
      console.log(`  [serp] ${q}`);
      const results = await serpSearch(q, scope.location);
      totalSearches++;
      all.push(...results);
      console.log(`  [serp] ${results.length} results`);
      await new Promise(r => setTimeout(r, 1000));
    }

    // Dedup by shortcode
    const seen = new Set();
    const unique = all.filter(r => {
      if (!r.url.includes("instagram.com/reel/") && !r.url.includes("instagram.com/p/")) return false;
      const m = r.url.match(/(?:reel|p)\/([A-Za-z0-9_-]+)/);
      const sc = m ? m[1] : r.url;
      if (seen.has(sc)) return false;
      seen.add(sc); return true;
    });
    console.log(`  ${unique.length} unique reels`);

    if (unique.length === 0) { output[scope.name] = []; continue; }

    // Engagement
    const withEng = [];
    for (const r of unique) {
      const eng = await getEngagement(r.url);
      if (eng) {
        withEng.push({
          ...eng,
          title: r.title.replace(" | Instagram", "").replace(" on Instagram:", "").trim(),
          viralityScore: Math.round((eng.views / 20) + (eng.likes / 10) + (eng.comments || 0)),
        });
      }
      await new Promise(r => setTimeout(r, 300));
    }

    // Sort by virality, then pick top 5 verified RE agents
    withEng.sort((a, b) => b.viralityScore - a.viralityScore);

    console.log(`  ${withEng.length} candidates, selecting verified agents...`);
    const top5 = [];
    const seenAuthors = new Set();
    for (const item of withEng) {
      if (top5.length >= 5) break;

      // Author dedup — 1 post per author
      const authorKey = (item.author || "").toLowerCase();
      if (authorKey && seenAuthors.has(authorKey)) {
        console.log(`    ⏭️  @${item.author} | skipped (duplicate author)`);
        continue;
      }

      const profile = await fetchProfileCached(item.author);
      const detection = checkAgent({
        bio: profile?.bio || profile?.fullName || "",
        fullName: profile?.fullName || "",
        username: item.author || "",
        caption: item.caption || item.title || "",
      });

      if (detection.isAgent) {
        console.log(`    ✅ @${item.author} | 👾 ${item.viralityScore} | ${item.views.toLocaleString()} views | tier:${detection.tier} [${detection.signals.join(",")}]`);
        seenAuthors.add(authorKey);
        top5.push(item);
      } else {
        console.log(`    ❌ @${item.author} | skipped (signals:[${detection.signals.join(",")}] neg:[${detection.negatives.join(",")}])`);
      }
      await new Promise(r => setTimeout(r, 2000));
    }
    console.log(`  Selected ${top5.length} verified agents`);

    // Transcribe + script for top 5
    for (const item of top5) {
      const vp = await downloadVideo(item.shortcode);
      if (vp) { const t = transcribe(item.shortcode); item.transcript = t; }
      const caption = item.transcript || item.caption || item.title;
      item.script = await generateScript(item.shortcode, item.title, caption, scope.name);
      await new Promise(r => setTimeout(r, 300));
    }

    output[scope.name] = top5;
  }

  // Save
  const outFile = path.join(__dirname, `output/digest_yesterday_${dateLabel}.json`);
  fs.writeFileSync(outFile, JSON.stringify(output, null, 2));
  console.log(`\n📁 Saved: ${outFile}`);
  console.log(`💰 SerpAPI searches used: ${totalSearches}`);

  // Show summary
  console.log(`\n=== SUMMARY (yesterday: ${dateLabel}) ===`);
  Object.entries(output).forEach(([scope, items]) => {
    console.log(`  ${scope}: ${items.length} posts found`);
  });
}

main().catch(console.error);
