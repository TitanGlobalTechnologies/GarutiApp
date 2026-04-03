// Lookback scraper — fills gaps for cities that don't have 5 posts from yesterday
// Goes back one day at a time until we find enough posts or hit 7-day max
// Uses SerpAPI (burns searches) for each new day checked
// Saves everything for future reuse

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

[TEMP_DIR, TRANSCRIPT_DIR, SCRIPT_DIR, BIO_CACHE_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// ---- Reuse functions from other scrapers ----

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

async function serpSearch(query, location, dateFilter) {
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
      fullName: media.owner?.full_name || "",
    };
  } catch { return null; }
}

function isAgentOld(profile, username) {
  // DEPRECATED — kept for reference, now using checkAgent from agent-check.js
  const allText = ((profile?.bio || "") + " " + (profile?.fullName || "") + " " + (username || "")).toLowerCase();
  const reKW = ["realtor", "real estate", "realty", "broker", "keller williams",
    "coldwell banker", "re/max", "remax", "century 21", "compass", "exp realty",
    "sotheby", "berkshire", "listing agent", "buyer agent", "homes for sale",
    "dre#", "licensed", "buying and selling", "buying & selling"];
  const negKW = ["media", "news", "data", "podcast", "coach", "mortgage",
    "lender", "investor", "wholesale", "flipper", "photographer", "builder",
    "construction company", "global feed"];
  return reKW.some(kw => allText.includes(kw)) && !negKW.some(kw => allText.includes(kw));
}

// ---- Main lookback logic ----

async function lookbackCity(cityName, state, location, targetPosts = 5, maxDaysBack = 7) {
  console.log(`\n=== Lookback: ${cityName}, ${state} (max ${maxDaysBack} days) ===\n`);

  const allPosts = [];
  const seenShortcodes = new Set();
  const seenAuthors = new Set();
  let totalSearches = 0;

  for (let daysBack = 1; daysBack <= maxDaysBack; daysBack++) {
    if (allPosts.length >= targetPosts) break;

    const date = new Date();
    date.setDate(date.getDate() - daysBack);
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const yyyy = date.getFullYear();
    const dateFilter = `cdr:1,cd_min:${mm}/${dd}/${yyyy},cd_max:${mm}/${dd}/${yyyy}`;
    const dateLabel = `${yyyy}-${mm}-${dd}`;

    console.log(`  Day -${daysBack} (${dateLabel}):`);

    // Check if we already scraped this day
    const cacheFile = path.join(__dirname, `output/lookback_${cityName.replace(/\s/g, "_")}_${dateLabel}.json`);
    let results;

    if (fs.existsSync(cacheFile)) {
      results = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
      console.log(`    [cache] Loaded ${results.length} cached results`);
    } else {
      // Scrape this day
      const queries = [
        `site:instagram.com/reel "${cityName}" real estate`,
        `site:instagram.com/reel "${cityName}" homes`,
      ];
      results = [];
      for (const q of queries) {
        console.log(`    [serp] ${q}`);
        const r = await serpSearch(q, location, dateFilter);
        totalSearches++;
        results.push(...r);
        console.log(`    [serp] ${r.length} results`);
        await new Promise(r => setTimeout(r, 1500));
      }
      // Save for future reuse
      fs.writeFileSync(cacheFile, JSON.stringify(results, null, 2));
    }

    // Dedup
    const unique = results.filter(r => {
      if (!r.url.includes("instagram.com/reel/") && !r.url.includes("instagram.com/p/")) return false;
      const m = r.url.match(/(?:reel|p)\/([A-Za-z0-9_-]+)/);
      const sc = m ? m[1] : r.url;
      if (seenShortcodes.has(sc)) return false;
      seenShortcodes.add(sc);
      return true;
    });

    // Check engagement + agent verification
    for (const r of unique) {
      if (allPosts.length >= targetPosts) break;

      const eng = await getEngagement(r.url);
      if (!eng) { await new Promise(r => setTimeout(r, 300)); continue; }

      // Check if agent using tiered detection
      const profile = await fetchProfileCached(eng.author);
      const detection = checkAgent({
        bio: profile?.bio || profile?.fullName || "",
        fullName: profile?.fullName || "",
        username: eng.author || "",
        caption: eng.caption || r.title || "",
      });

      if (detection.isAgent) {
        // Author dedup — 1 post per author
        const authorKey = (eng.author || "").toLowerCase();
        if (authorKey && seenAuthors.has(authorKey)) {
          console.log(`    ⏭️  @${eng.author} | skipped (duplicate author)`);
          await new Promise(r => setTimeout(r, 300));
          continue;
        }
        const virality = Math.round((eng.views / 20) + (eng.likes / 10) + (eng.comments || 0));
        console.log(`    ✅ @${eng.author} | 👾 ${virality} | ${eng.views} views | ${dateLabel}`);
        seenAuthors.add(authorKey);
        allPosts.push({
          ...eng,
          title: r.title.replace(" | Instagram", "").replace(" on Instagram:", "").trim(),
          viralityScore: virality,
          date: dateLabel,
          daysOld: daysBack,
        });
      } else {
        console.log(`    ❌ @${eng.author} | skipped (signals:[${detection.signals.join(",")}] neg:[${detection.negatives.join(",")}])`);
      }
      await new Promise(r => setTimeout(r, 2000));
    }

    console.log(`    → ${allPosts.length}/${targetPosts} posts found so far`);
  }

  // Sort by virality
  allPosts.sort((a, b) => b.viralityScore - a.viralityScore);

  console.log(`\n  Final: ${allPosts.length} posts for ${cityName}`);
  allPosts.forEach(p => console.log(`    👾 ${p.viralityScore} | @${p.author} | ${p.date}${p.daysOld > 1 ? " (" + p.daysOld + " days ago)" : ""}`));

  return { posts: allPosts.slice(0, targetPosts), searchesUsed: totalSearches };
}

// ---- Run for cities that need lookback ----

async function main() {
  // Load yesterday's results to see which cities need more posts
  const yesterdayFile = fs.readdirSync("output").filter(f => f.startsWith("digest_yesterday_")).sort().pop();
  if (!yesterdayFile) { console.log("No yesterday data found. Run scrape-yesterday.js first."); return; }

  const yesterday = JSON.parse(fs.readFileSync(path.join("output", yesterdayFile)));
  const stateNames = { FL: "Florida" };

  const citiesNeedingMore = [];
  const cityLocations = {
    "Cape Coral_FL": "Cape Coral,Florida,United States",
    "Fort Myers_FL": "Fort Myers,Florida,United States",
    "Naples_FL": "Naples,Florida,United States",
    "Punta Gorda_FL": "Punta Gorda,Florida,United States",
    "Bonita Springs_FL": "Bonita Springs,Florida,United States",
    "Lehigh Acres_FL": "Lehigh Acres,Florida,United States",
  };

  for (const [key, items] of Object.entries(yesterday)) {
    if (key === "Florida" || key === "USA") continue;
    if (items.length < 5) {
      citiesNeedingMore.push({ key, count: items.length, existing: items });
    }
  }

  if (citiesNeedingMore.length === 0) {
    console.log("All cities have 5 posts. No lookback needed.");
    return;
  }

  console.log("Cities needing lookback:");
  citiesNeedingMore.forEach(c => console.log(`  ${c.key}: ${c.count}/5 posts`));

  let totalSearches = 0;

  for (const city of citiesNeedingMore) {
    const cityName = city.key.split("_")[0];
    const state = city.key.split("_")[1];
    const location = cityLocations[city.key];
    if (!location) continue;

    const needed = 5 - city.count;
    const { posts, searchesUsed } = await lookbackCity(cityName, state, location, needed, 7);
    totalSearches += searchesUsed;

    // Merge with existing yesterday posts (dedup by shortcode + author)
    const mergeSeenSC = new Set();
    const mergeSeenAuth = new Set();
    const merged = [...city.existing, ...posts].filter(p => {
      const sc = p.shortcode;
      const auth = (p.author || "").toLowerCase();
      if (mergeSeenSC.has(sc)) return false;
      if (auth && mergeSeenAuth.has(auth)) return false;
      mergeSeenSC.add(sc);
      if (auth) mergeSeenAuth.add(auth);
      return true;
    });
    merged.sort((a, b) => (b.viralityScore || 0) - (a.viralityScore || 0));
    yesterday[city.key] = merged.slice(0, 5);
  }

  // Save updated data
  const outFile = path.join(__dirname, "output/digest_with_lookback.json");
  fs.writeFileSync(outFile, JSON.stringify(yesterday, null, 2));
  console.log(`\n📁 Saved: ${outFile}`);
  console.log(`💰 SerpAPI searches used for lookback: ${totalSearches}`);

  // Summary
  console.log("\n=== FINAL SUMMARY ===");
  Object.entries(yesterday).forEach(([k, v]) => {
    console.log(`  ${k}: ${v.length} posts`);
  });
}

main().catch(console.error);
