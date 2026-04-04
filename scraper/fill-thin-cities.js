/**
 * Fill thin city tabs — targeted scrape for cities with < 5 posts
 * Searches today + yesterday, AI-verified, location-checked
 */
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, ".env") });

const SERPAPI_KEY = process.env.SERPAPI_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const { checkAgent } = require("./src/agent-check");
const BIO_CACHE_DIR = "output/bio_cache";
const DATA_FILE = "output/digest_all_with_scope.json";

function toTbsDate(ds) { const [y,m,d] = ds.split("-"); return `${m}/${d}/${y}`; }
function getDateStr(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split("T")[0]; }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const QUERIES = [
  'site:instagram.com/reel intext:"realtor" real estate',
  'site:instagram.com/reel intext:"realty" real estate',
  'site:instagram.com/reel intext:"real estate" homes for sale',
];

const CITIES = [
  { scope: "Cape Coral_FL", loc: "Cape Coral,Florida,United States" },
  { scope: "Fort Myers_FL", loc: "Fort Myers,Florida,United States" },
  { scope: "Naples_FL", loc: "Naples,Florida,United States" },
  { scope: "Bonita Springs_FL", loc: "Bonita Springs,Florida,United States" },
  { scope: "Lehigh Acres_FL", loc: "Lehigh Acres,Florida,United States" },
  { scope: "Punta Gorda_FL", loc: "Punta Gorda,Florida,United States" },
];

const FL_LOCATIONS = ["florida","cape coral","fort myers","naples","bonita","lehigh","punta gorda","sarasota","tampa","miami","orlando","jacksonville","palm beach","fort lauderdale","boca raton","clearwater","st. petersburg","lakeland","gainesville","tallahassee"];

let apiUsed = 0;

async function serpSearch(q, location, dateFrom, dateTo) {
  const tbs = `cdr:1,cd_min:${toTbsDate(dateFrom)},cd_max:${toTbsDate(dateTo)}`;
  const params = new URLSearchParams({ api_key: SERPAPI_KEY, engine: "google", q, location, gl: "us", hl: "en", tbs, num: "100" });
  const res = await fetch(`https://serpapi.com/search.json?${params}`);
  apiUsed++;
  if (!res.ok) return [];
  const data = await res.json();
  if (data.error) return [];
  const results = [], seen = new Set();
  for (const item of (data.organic_results || [])) {
    const url = item.link || "";
    if (!url.includes("instagram.com/reel/")) continue;
    const m = url.match(/reel\/([A-Za-z0-9_-]+)/);
    if (!m || seen.has(m[1])) continue;
    seen.add(m[1]);
    results.push({ shortcode: m[1], url, title: (item.title || "").replace(" | Instagram", "").trim() });
  }
  return results;
}

async function getEngagement(url) {
  const m = url.match(/reel\/([A-Za-z0-9_-]+)/);
  if (!m) return null;
  try {
    const params = new URLSearchParams({ variables: JSON.stringify({ shortcode: m[1] }), doc_id: "10015901848480474", lsd: "AVqbxe3J_YA" });
    const res = await fetch("https://www.instagram.com/api/graphql?" + params, {
      method: "POST",
      headers: { "User-Agent": "Mozilla/5.0", "X-IG-App-ID": "936619743392459", "X-FB-LSD": "AVqbxe3J_YA", "X-ASBD-ID": "129477", "Content-Type": "application/x-www-form-urlencoded" },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const media = json?.data?.xdt_shortcode_media;
    if (!media) return null;
    return {
      shortcode: m[1], url,
      likes: media.edge_media_preview_like?.count || 0,
      comments: media.edge_media_to_parent_comment?.count || 0,
      views: media.video_view_count || 0,
      caption: media.edge_media_to_caption?.edges?.[0]?.node?.text || "",
      author: media.owner?.username || "",
      fullName: media.owner?.full_name || "",
      locationName: media.location?.name || null,
    };
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

async function aiCheck(post) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001", max_tokens: 100,
        messages: [{ role: "user", content: `Is @${post.author} an individual real estate agent (not a company/brokerage/media) posting about real estate in Florida? Caption: "${(post.caption || "").slice(0, 300)}"\nLocation: ${post.locationName || "none"}\nAnswer YES or NO only.` }],
      }),
    });
    if (!res.ok) return true;
    const d = await res.json();
    return (d.content[0]?.text || "").toUpperCase().includes("YES");
  } catch { return true; }
}

async function main() {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  const today = getDateStr(0);
  const yesterday = getDateStr(1);

  for (const { scope, loc } of CITIES) {
    const existing = data[scope] || [];
    const need = 5 - existing.length;
    if (need <= 0) { console.log(`${scope}: already has ${existing.length}, skipping`); continue; }

    const existingSC = new Set(existing.map(p => p.shortcode));
    const existingAuth = new Set(existing.map(p => (p.author || "").toLowerCase()));

    console.log(`\n${scope}: has ${existing.length}, need ${need} more`);

    const newReels = [];
    // Search today first, then yesterday
    for (const daysBack of [0, 1]) {
      const dateFrom = getDateStr(daysBack);
      const dateTo = getDateStr(Math.max(0, daysBack - 1));
      console.log(`  Searching ${daysBack === 0 ? "today" : "yesterday"} (${dateFrom})...`);
      for (const q of QUERIES) {
        const results = await serpSearch(q, loc, dateFrom, dateTo);
        for (const r of results) {
          if (!existingSC.has(r.shortcode)) {
            existingSC.add(r.shortcode);
            r._date = dateFrom;
            newReels.push(r);
          }
        }
        await sleep(1000);
      }
    }
    console.log(`  Found ${newReels.length} new reel URLs`);

    const newAgents = [];
    for (const r of newReels) {
      if (newAgents.length >= need) break;
      const eng = await getEngagement(r.url);
      if (!eng) continue;
      const ak = (eng.author || "").toLowerCase();
      if (!ak || existingAuth.has(ak)) continue;

      // Location check — reject if tagged outside FL
      if (eng.locationName) {
        const locLower = eng.locationName.toLowerCase();
        if (!FL_LOCATIONS.some(fl => locLower.includes(fl))) {
          console.log(`    SKIP @${eng.author} — location: ${eng.locationName}`);
          continue;
        }
      }

      // Agent detection
      const profile = await fetchProfile(eng.author);
      const detection = checkAgent({
        bio: profile?.bio || "", fullName: profile?.fullName || eng.fullName || "",
        username: eng.author || "", caption: eng.caption || r.title || "",
      });
      if (!detection.isAgent) continue;

      // AI check
      const ok = await aiCheck(eng);
      if (!ok) { console.log(`    AI REJECT @${eng.author}`); continue; }

      const score = Math.round((eng.views / 20) + (eng.likes / 10) + (eng.comments || 0));
      existingAuth.add(ak);
      newAgents.push({
        shortcode: eng.shortcode, url: eng.url,
        likes: eng.likes, comments: eng.comments, views: eng.views,
        caption: eng.caption, author: eng.author, fullName: eng.fullName,
        title: r.title, viralityScore: score,
        date: r._date, state: scope.replace("_FL", "").replace(/_/g, " "),
        tier: detection.tier, signals: detection.signals,
        locationName: eng.locationName,
      });
      console.log(`    OK @${eng.author} | score:${score} | ${r._date}${eng.locationName ? " | " + eng.locationName : ""}`);
      await sleep(500);
    }

    data[scope] = [...existing, ...newAgents];
    // Save after each city (crash recovery)
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    console.log(`  ${scope}: now ${data[scope].length} posts`);
  }

  console.log(`\nSerpAPI used: ${apiUsed}`);
  console.log("Done.");
}

main().catch(console.error);
