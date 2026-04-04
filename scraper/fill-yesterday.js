/**
 * Fill thin cities with yesterday's posts only
 * Skips all existing shortcodes — no re-scraping
 * Deep pagination (3 pages per query)
 */
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, ".env") });

const SERPAPI_KEY = process.env.SERPAPI_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const { checkAgent } = require("./src/agent-check");
const BIO_CACHE_DIR = "output/bio_cache";
const MASTER_FILE = "output/digest_master_raw.json";
const DATA_FILE = "output/digest_all_with_scope.json";

function toTbsDate(ds) { const [y,m,d] = ds.split("-"); return `${m}/${d}/${y}`; }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const yesterday = "2026-04-03";
const today = "2026-04-04";

const QUERIES = [
  'site:instagram.com/reel intext:"realtor" real estate',
  'site:instagram.com/reel intext:"realty" real estate',
  'site:instagram.com/reel intext:"real estate" homes for sale',
];

const TARGETS = [
  { scope: "Bonita Springs_FL", loc: "Bonita Springs,Florida,United States" },
  { scope: "Lehigh Acres_FL", loc: "Lehigh Acres,Florida,United States" },
  { scope: "Punta Gorda_FL", loc: "Punta Gorda,Florida,United States" },
];

const FL_LOCS = ["florida","cape coral","fort myers","naples","bonita","lehigh","punta gorda","sarasota","tampa","miami","orlando","jacksonville","palm beach","fort lauderdale","clearwater","st. petersburg"];

let apiUsed = 0;

async function serpSearch(q, location) {
  const tbs = `cdr:1,cd_min:${toTbsDate(yesterday)},cd_max:${toTbsDate(today)}`;
  const results = [], seen = new Set();
  for (const start of [0, 100, 200]) {
    const params = new URLSearchParams({ api_key: SERPAPI_KEY, engine: "google", q, location, gl: "us", hl: "en", tbs, num: "100", start: String(start) });
    const res = await fetch(`https://serpapi.com/search.json?${params}`);
    apiUsed++;
    if (!res.ok) break;
    const data = await res.json();
    if (data.error) break;
    let pageNew = 0;
    for (const item of (data.organic_results || [])) {
      const url = item.link || "";
      if (!url.includes("instagram.com/reel/")) continue;
      const m = url.match(/reel\/([A-Za-z0-9_-]+)/);
      if (!m || seen.has(m[1])) continue;
      seen.add(m[1]);
      results.push({ shortcode: m[1], url, title: (item.title || "").replace(" | Instagram", "").trim() });
      pageNew++;
    }
    if (pageNew === 0) break;
    await sleep(500);
  }
  return results;
}

async function getEngagement(url) {
  const m = url.match(/reel\/([A-Za-z0-9_-]+)/);
  if (!m) return null;
  try {
    const params = new URLSearchParams({ variables: JSON.stringify({ shortcode: m[1] }), doc_id: "10015901848480474", lsd: "AVqbxe3J_YA" });
    const res = await fetch("https://www.instagram.com/api/graphql?" + params, { method: "POST", headers: { "User-Agent": "Mozilla/5.0", "X-IG-App-ID": "936619743392459", "X-FB-LSD": "AVqbxe3J_YA", "X-ASBD-ID": "129477", "Content-Type": "application/x-www-form-urlencoded" } });
    if (!res.ok) return null;
    const json = await res.json();
    const media = json?.data?.xdt_shortcode_media;
    if (!media) return null;
    return { shortcode: m[1], url, likes: media.edge_media_preview_like?.count || 0, comments: media.edge_media_to_parent_comment?.count || 0, views: media.video_view_count || 0, caption: media.edge_media_to_caption?.edges?.[0]?.node?.text || "", author: media.owner?.username || "", fullName: media.owner?.full_name || "", locationName: media.location?.name || null };
  } catch { return null; }
}

async function fetchProfile(username) {
  const cp = path.join(BIO_CACHE_DIR, username + ".json");
  if (fs.existsSync(cp)) return JSON.parse(fs.readFileSync(cp, "utf-8"));
  try {
    const res = await fetch(`https://www.instagram.com/${username}/`, { headers: { "User-Agent": "Googlebot/2.1", "Accept": "text/html" } });
    if (!res.ok) return null;
    const html = await res.text();
    const og = html.match(/og:description.*?content="([^"]*)"/i);
    if (!og?.[1]) return null;
    const nm = og[1].match(/from\s+(.+?)(?:\s*\(@|\s*$)/);
    const profile = { username, fullName: nm?.[1]?.trim() || "", bio: nm?.[1]?.trim() || "" };
    fs.writeFileSync(cp, JSON.stringify(profile, null, 2));
    return profile;
  } catch { return null; }
}

async function main() {
  const master = JSON.parse(fs.readFileSync(MASTER_FILE, "utf-8"));
  const existingSC = new Set();
  for (const posts of Object.values(master)) posts.forEach(p => existingSC.add(p.shortcode));
  console.log("Existing shortcodes: " + existingSC.size + " (will skip)\n");

  for (const { scope, loc } of TARGETS) {
    const existing = master[scope] || [];
    const existingAuth = new Set(existing.map(p => (p.author || "").toLowerCase()));
    console.log(scope + " — searching yesterday with 3-page pagination...");

    const newReels = [];
    for (const q of QUERIES) {
      const results = await serpSearch(q, loc);
      for (const r of results) {
        if (!existingSC.has(r.shortcode)) {
          existingSC.add(r.shortcode);
          newReels.push(r);
        }
      }
      await sleep(1000);
    }
    console.log("  Found " + newReels.length + " new reel URLs");

    const newAgents = [];
    for (const r of newReels) {
      const eng = await getEngagement(r.url);
      if (!eng) continue;
      const ak = (eng.author || "").toLowerCase();
      if (!ak || existingAuth.has(ak)) continue;

      if (eng.locationName) {
        const locLower = eng.locationName.toLowerCase();
        if (!FL_LOCS.some(fl => locLower.includes(fl))) {
          console.log("    SKIP @" + eng.author + " — " + eng.locationName);
          continue;
        }
      }

      const profile = await fetchProfile(eng.author);
      const detection = checkAgent({ bio: profile?.bio || "", fullName: profile?.fullName || eng.fullName || "", username: eng.author || "", caption: eng.caption || r.title || "" });
      if (!detection.isAgent) continue;

      const score = Math.round((eng.views / 20) + (eng.likes / 10) + (eng.comments || 0));
      existingAuth.add(ak);
      newAgents.push({ shortcode: eng.shortcode, url: eng.url, likes: eng.likes, comments: eng.comments, views: eng.views, caption: eng.caption, author: eng.author, fullName: eng.fullName, title: r.title, viralityScore: score, date: yesterday, state: scope.replace("_FL", "").replace(/_/g, " "), tier: detection.tier, signals: detection.signals, locationName: eng.locationName });
      console.log("    OK @" + eng.author + " | score:" + score + (eng.locationName ? " | " + eng.locationName : ""));
      await sleep(500);
    }

    master[scope] = [...existing, ...newAgents];
    // Save to both files
    fs.writeFileSync(MASTER_FILE, JSON.stringify(master, null, 2));
    fs.writeFileSync(DATA_FILE, JSON.stringify(master, null, 2));
    console.log("  " + scope + ": +" + newAgents.length + " new, now " + master[scope].length + " total\n");
  }

  console.log("SerpAPI used: " + apiUsed);
  console.log("Done. Master + data files updated.");
}

main().catch(console.error);
