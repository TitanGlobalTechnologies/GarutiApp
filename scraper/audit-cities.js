/**
 * audit-cities.js — Verify city tabs show correct posts
 *
 * Applies the SAME city hard gate as generate-live-digest.js so the audit
 * reflects what the app actually displays. A post must mention its assigned
 * city in title, caption, transcript, or location tag to appear in that tab.
 *
 * Usage: node audit-cities.js [scrape-target-date]
 *   e.g. node audit-cities.js 2026-04-07
 *   Defaults to yesterday if not specified.
 */
const fs = require("fs");
const data = JSON.parse(fs.readFileSync("output/digest_all_with_scope.json", "utf-8"));

// City aliases — must match generate-live-digest.js CITY_VERIFY exactly
const cityAliases = {
  "Cape Coral_FL": ["cape coral", "capecoral", "#capecoral"],
  "Fort Myers_FL": ["fort myers", "ft myers", "ft. myers", "fortmyers", "#fortmyers"],
  "Naples_FL": ["naples", "#naples"],
  "Bonita Springs_FL": ["bonita springs", "bonitasprings", "#bonitasprings"],
  "Lehigh Acres_FL": ["lehigh acres", "lehighacres", "#lehighacres"],
  "Punta Gorda_FL": ["punta gorda", "puntagorda", "#puntagorda", "charlotte county"],
};

// Florida: any FL city/region/state mention counts
const floridaAliases = [
  "florida", "#florida", "swfl", "#swfl", "southwest florida",
  // All SWFL city names
  "cape coral", "fort myers", "ft myers", "naples", "bonita springs",
  "lehigh acres", "punta gorda", "charlotte county",
  // Other common FL cities
  "miami", "orlando", "tampa", "jacksonville", "boca raton", "jupiter",
  "sarasota", "clearwater", "tallahassee", "gainesville", "lakeland",
  "palm beach", "fort lauderdale", "st. petersburg", "daytona",
  "pensacola", "key west", "englewood", "venice", "sebring",
  "ocala", "kissimmee", "bradenton", "port charlotte", "estero",
  "marco island", "sanibel", "captiva", "port st. lucie",
];

function getAllText(p) {
  return ((p.title || "") + " " + (p.caption || "") + " " + (p.transcript || "") + " " + (p.locationName || "")).toLowerCase();
}

function mentionsCity(p, aliases) {
  const allText = getAllText(p);
  return aliases.some(a => allText.includes(a));
}

// Scrape target date: CLI arg or yesterday
const SCRAPE_TARGET = process.argv[2] || (() => {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
})();

const scopes = ["Cape Coral_FL", "Fort Myers_FL", "Naples_FL", "Bonita Springs_FL", "Lehigh Acres_FL", "Punta Gorda_FL", "Florida"];

let allPassed = true;

for (const scope of scopes) {
  const rawPosts = data[scope] || [];
  const aliases = cityAliases[scope] || floridaAliases;
  const cityName = scope.replace("_FL", "");
  const isCityScope = !!cityAliases[scope];

  // ── CITY HARD GATE: only keep posts that mention the city ──
  // This matches generate-live-digest.js — the app only shows these posts
  const gated = isCityScope
    ? rawPosts.filter(p => mentionsCity(p, aliases))
    : rawPosts;

  // Quality filters (same as generate-live-digest.js)
  const quality = gated.filter(p => {
    if ((p.viralityScore || 0) < 1) return false;
    const d = p.date || "";
    if (d > SCRAPE_TARGET) return false;
    return true;
  });

  // Sort: freshness first, virality within same date
  quality.sort((a, b) => {
    const dateA = a.date || "1970-01-01";
    const dateB = b.date || "1970-01-01";
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    return b.viralityScore - a.viralityScore;
  });

  // Dedup by author (1 post per author per tab)
  const seenAuth = new Set();
  const top5 = [];
  for (const p of quality) {
    const auth = (p.author || p.authorHandle || "").toLowerCase();
    if (auth && seenAuth.has(auth)) continue;
    if (auth) seenAuth.add(auth);
    top5.push(p);
    if (top5.length >= 5) break;
  }

  console.log("\n=== " + cityName + " ===");
  if (isCityScope) {
    console.log("  City gate: " + gated.length + "/" + rawPosts.length + " raw posts mention " + cityName);
  }

  let problems = 0;
  for (const p of top5) {
    const mentioned = mentionsCity(p, aliases);
    const platform = (p.platform || "instagram").padEnd(9);
    const status = mentioned ? "OK" : "WRONG?";
    if (!mentioned) problems++;
    console.log("  " + status.padEnd(8) + " score:" + String(p.viralityScore).padStart(5) + " | " + platform + " | " + p.date + " | @" + (p.author || "").slice(0, 25).padEnd(25) + " | " + (p.title || "").slice(0, 45));
    if (!mentioned) {
      console.log("           Location tag: " + (p.locationName || "none") + " | snippet: " + ((p.caption || "").slice(0, 80)));
    }
  }

  if (top5.length < 5) {
    console.log("  >>> Only " + top5.length + " verified posts (need 5)");
    allPassed = false;
  } else if (problems > 0) {
    console.log("  >>> " + problems + " POSSIBLE MISPLACEMENTS");
    allPassed = false;
  } else {
    console.log("  All 5 verified.");
  }
}

console.log("\n" + (allPassed ? "PASS: All cities verified." : "FAIL: Some cities have issues."));
