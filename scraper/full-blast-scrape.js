/**
 * FULL BLAST SCRAPE — 10 pages deep per query, yesterday only
 * Cities first, then FL statewide, then all states
 * Saves everything, never deletes
 */
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, ".env") });

const SERPAPI_KEY = process.env.SERPAPI_KEY;
const { checkAgent } = require("./src/agent-check");
const BIO_CACHE_DIR = "output/bio_cache";
const MASTER_FILE = "output/digest_master_raw.json";

function toTbsDate(ds) { const [y,m,d] = ds.split("-"); return `${m}/${d}/${y}`; }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const yesterday = "2026-04-03";
const today = "2026-04-04";
let apiUsed = 0;

const QUERIES_AGENT = [
  'site:instagram.com/reel intext:"realtor" real estate',
  'site:instagram.com/reel intext:"realty" real estate',
  'site:instagram.com/reel intext:"real estate" homes for sale',
];
const QUERIES_LOCATION = [
  'site:instagram.com/reel "{city}" homes for sale',
  'site:instagram.com/reel "{city}" property listing',
  'site:instagram.com/reel "{city}" luxury home tour',
];

const FL_LOCS = ["florida","cape coral","fort myers","naples","bonita","lehigh","punta gorda","sarasota","tampa","miami","orlando","jacksonville","palm beach","fort lauderdale","clearwater","st. petersburg","lakeland","gainesville"];

const TARGETS = [
  // Cities first
  { scope: "Cape Coral_FL", loc: "Cape Coral,Florida,United States", type: "city" },
  { scope: "Fort Myers_FL", loc: "Fort Myers,Florida,United States", type: "city" },
  { scope: "Naples_FL", loc: "Naples,Florida,United States", type: "city" },
  { scope: "Bonita Springs_FL", loc: "Bonita Springs,Florida,United States", type: "city" },
  { scope: "Lehigh Acres_FL", loc: "Lehigh Acres,Florida,United States", type: "city" },
  { scope: "Punta Gorda_FL", loc: "Punta Gorda,Florida,United States", type: "city" },
  // FL statewide
  { scope: "Florida", loc: "Florida,United States", type: "state" },
  // Other states
  { scope: "Georgia", loc: "Georgia,United States", type: "nearby" },
  { scope: "Alabama", loc: "Alabama,United States", type: "nearby" },
  { scope: "South Carolina", loc: "South Carolina,United States", type: "nearby" },
  { scope: "North Carolina", loc: "North Carolina,United States", type: "nearby" },
  { scope: "Tennessee", loc: "Tennessee,United States", type: "nearby" },
  { scope: "Mississippi", loc: "Mississippi,United States", type: "nearby" },
  { scope: "Louisiana", loc: "Louisiana,United States", type: "nearby" },
  { scope: "Texas", loc: "Texas,United States", type: "nearby" },
  { scope: "Virginia", loc: "Virginia,United States", type: "nearby" },
  { scope: "New York", loc: "New York,United States", type: "nearby" },
];

// 10 pages deep
async function serpSearchDeep(q, location) {
  const tbs = `cdr:1,cd_min:${toTbsDate(yesterday)},cd_max:${toTbsDate(today)}`;
  const results = [], seen = new Set();
  for (let page = 0; page < 10; page++) {
    const start = page * 100;
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
    // Stop if no new results
    if (pageNew === 0) break;
    await sleep(300);
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

function bar(c, t, w = 30) { const f = Math.round((c/t)*w); return "\u2588".repeat(f) + "\u2591".repeat(w-f); }

async function main() {
  const master = JSON.parse(fs.readFileSync(MASTER_FILE, "utf-8"));
  const existingSC = new Set();
  for (const posts of Object.values(master)) posts.forEach(p => existingSC.add(p.shortcode));

  console.log("\n\u2554" + "\u2550".repeat(60) + "\u2557");
  console.log("\u2551  FULL BLAST SCRAPE — 10 pages deep, yesterday only" + " ".repeat(9) + "\u2551");
  console.log("\u2551  " + `${TARGETS.length} targets x 3 queries x 10 pages | Skip ${existingSC.size} existing`.padEnd(58) + "\u2551");
  console.log("\u255A" + "\u2550".repeat(60) + "\u255D\n");

  const startTime = Date.now();
  let totalNew = 0;

  for (let i = 0; i < TARGETS.length; i++) {
    const { scope, loc, type } = TARGETS[i];
    const isFL = type === "city" || type === "state";
    const existing = master[scope] || [];
    const existingAuth = new Set(existing.map(p => (p.author || "").toLowerCase()));

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`  ${bar(i, TARGETS.length)} ${i}/${TARGETS.length} | ${totalNew} new | API: ${apiUsed} | ${elapsed}s`);
    const cityName = scope.replace("_FL", "").replace(/_/g, " ");
    const locQueries = (type === "city") ? QUERIES_LOCATION.map(q => q.replace("{city}", cityName)) : [];
    const allQueries = [...QUERIES_AGENT, ...locQueries];
    console.log(`  ${scope} — ${allQueries.length} queries x 10 pages deep`);

    const newReels = [];
    for (let qi = 0; qi < allQueries.length; qi++) {
      const results = await serpSearchDeep(allQueries[qi], loc);
      for (const r of results) {
        if (!existingSC.has(r.shortcode)) {
          existingSC.add(r.shortcode);
          newReels.push(r);
        }
      }
      console.log(`    Q${qi+1}: ${results.length} results, ${newReels.length} new total`);
    }

    // Check engagement + agent detection
    const newAgents = [];
    for (const r of newReels) {
      const eng = await getEngagement(r.url);
      if (!eng) continue;
      const ak = (eng.author || "").toLowerCase();
      if (!ak || existingAuth.has(ak)) continue;

      // Location filter for FL scopes
      if (isFL && eng.locationName) {
        const locLower = eng.locationName.toLowerCase();
        if (!FL_LOCS.some(fl => locLower.includes(fl))) {
          continue; // silent skip for speed
        }
      }

      const profile = await fetchProfile(eng.author);
      const detection = checkAgent({ bio: profile?.bio || "", fullName: profile?.fullName || eng.fullName || "", username: eng.author || "", caption: eng.caption || r.title || "" });
      if (!detection.isAgent) continue;

      const score = Math.round((eng.views / 20) + (eng.likes / 10) + (eng.comments || 0));
      existingAuth.add(ak);
      newAgents.push({ shortcode: eng.shortcode, url: eng.url, likes: eng.likes, comments: eng.comments, views: eng.views, caption: eng.caption, author: eng.author, fullName: eng.fullName, title: r.title, viralityScore: score, date: yesterday, state: scope.replace("_FL", "").replace(/_/g, " "), tier: detection.tier, signals: detection.signals, locationName: eng.locationName });
      await sleep(400);
    }

    master[scope] = [...existing, ...newAgents];
    totalNew += newAgents.length;

    // Save after every target (crash recovery)
    fs.writeFileSync(MASTER_FILE, JSON.stringify(master, null, 2));
    console.log(`    +${newAgents.length} agents → ${master[scope].length} total\n`);
  }

  // Also save as working file
  fs.writeFileSync("output/digest_all_with_scope.json", JSON.stringify(master, null, 2));

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log("\u2554" + "\u2550".repeat(60) + "\u2557");
  console.log("\u2551  DONE" + " ".repeat(54) + "\u2551");
  console.log("\u2551  " + `${totalNew} new agents | API: ${apiUsed} searches | ${elapsed}s`.padEnd(58) + "\u2551");
  console.log("\u255A" + "\u2550".repeat(60) + "\u255D");
}

main().catch(err => {
  console.error("FATAL:", err.message);
  console.error("Partial data saved to " + MASTER_FILE);
});
