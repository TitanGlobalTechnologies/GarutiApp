/**
 * Real Estate Agent Detector
 *
 * Determines if an Instagram account belongs to a real estate professional.
 * Uses data from the post GraphQL endpoint (zero extra API calls) plus
 * an optional bio fetch from the profile endpoint.
 *
 * Strategy:
 * 1. Check full_name + username + caption for RE keywords (free, from post data)
 * 2. If inconclusive, fetch bio from profile endpoint (1 extra call)
 * 3. Score and classify
 *
 * Keywords sourced from analysis of real agent bios on Instagram.
 */

/**
 * Keywords that strongly indicate a real estate professional.
 * These are checked against: bio, full_name, username, caption
 * All matching is case-insensitive and checks for substring presence
 * (e.g., "mrjohnrealty" matches "realty")
 */
const STRONG_KEYWORDS = [
  // Core titles
  "realtor",
  "real estate",
  "realty",
  "broker",

  // License indicators
  "dre#",
  "dre #",
  "lic#",
  "lic #",
  "licensed agent",
  "licensed realtor",

  // ─────────────────────────────────────────────────────
  // TIER 1: Major National Franchises (top 20+)
  // ─────────────────────────────────────────────────────

  // 1. Keller Williams Realty — #1 franchise by agent count (~160K agents)
  "keller williams",
  "kellerwilliams",

  // 2. Coldwell Banker — one of oldest brands (est. 1906)
  "coldwell banker",
  "coldwellbanker",

  // 3. RE/MAX — global franchise, 74K+ US agents
  "re/max",
  "remax",
  "re max",

  // 4. Century 21
  "century 21",
  "century21",

  // 5. Compass — largest independent by volume ($231B)
  "compass real estate",
  "compass realty",
  "@compass",

  // 6. eXp Realty — largest cloud brokerage (85K+ agents)
  "exp realty",
  "exprealty",
  "expi",

  // 7. Berkshire Hathaway HomeServices
  "berkshire hathaway",
  "bhhs",

  // 8. ERA Real Estate (Anywhere brand)
  "era real estate",
  "era realty",

  // 9. Sotheby's International Realty
  "sotheby",
  "sothebys",

  // 10. The Corcoran Group (Anywhere brand)
  "corcoran group",
  "corcoran real estate",
  "corcoran realty",

  // 11. Better Homes and Gardens Real Estate (Anywhere brand)
  "better homes and gardens real estate",
  "bhg real estate",
  "bhgre",

  // 12. HomeServices of America (Berkshire Hathaway affiliate)
  "homeservices of america",

  // 13. Howard Hanna Real Estate
  "howard hanna",

  // 14. Douglas Elliman
  "douglas elliman",
  "elliman",

  // 15. Weichert Realtors
  "weichert",

  // 16. The Real Brokerage / REAL Broker
  "real brokerage",
  "real broker",

  // 17. Redfin
  "redfin",

  // 18. Realty ONE Group
  "realty one group",
  "realtyonegroup",

  // 19. HomeSmart International
  "homesmart",

  // 20. EXIT Realty
  "exit realty",
  "exitrealty",

  // 21. United Real Estate
  "united real estate",

  // 22. NextHome
  "nexthome",
  "next home realty",

  // 23. Fathom Realty
  "fathom realty",
  "fathomrealty",

  // 24. LPT Realty
  "lpt realty",
  "lptrealty",

  // 25. Epique Realty
  "epique realty",

  // ─────────────────────────────────────────────────────
  // TIER 2: Luxury / Boutique Brokerages
  // ─────────────────────────────────────────────────────

  // Christie's International Real Estate
  "christie's international",
  "christies real estate",
  "christies international",

  // Engel & Volkers
  "engel & volkers",
  "engel and volkers",
  "engelvolkers",
  "engel volkers",

  // The Agency (luxury brokerage, LA-based)
  "the agency re",
  "theagencyre",

  // Nest Seekers International
  "nest seekers",
  "nestseekers",

  // Brown Harris Stevens (NYC luxury)
  "brown harris stevens",
  "brown harris",

  // Corcoran (luxury arm, also Anywhere franchise)
  "the corcoran group",

  // Coldwell Banker Global Luxury (sub-brand)
  "coldwell banker global luxury",
  "cb global luxury",

  // Stribling & Associates (now part of Compass)
  "stribling",

  // ONE Sotheby's International Realty (FL luxury)
  "one sotheby",

  // ─────────────────────────────────────────────────────
  // TIER 3: Well-Known Regional Brokerages
  // ─────────────────────────────────────────────────────

  // Long & Foster (Mid-Atlantic, 7K+ agents)
  "long & foster",
  "long and foster",
  "longandfoster",

  // Baird & Warner (Chicago, est. 1855)
  "baird & warner",
  "baird and warner",

  // Crye-Leike (Southeast — TN, AR, MS, GA)
  "crye-leike",
  "crye leike",
  "cryeleike",

  // Windermere Real Estate (Pacific Northwest)
  "windermere real estate",
  "windermere realty",

  // Allen Tate (Carolinas)
  "allen tate",

  // Edina Realty (Minnesota / upper Midwest)
  "edina realty",

  // Ebby Halliday (Dallas/North Texas)
  "ebby halliday",

  // Houlihan Lawrence (Westchester / CT)
  "houlihan lawrence",

  // William Raveis (Northeast / New England)
  "william raveis",
  "raveis real estate",

  // Harry Norman Realtors (Atlanta / Georgia)
  "harry norman",

  // @properties (Chicago)
  "@properties",

  // Latter & Blum (Louisiana / Gulf South)
  "latter & blum",
  "latter and blum",

  // Watson Realty (Northeast Florida)
  "watson realty",

  // Samson Properties (Virginia / DC Metro)
  "samson properties",

  // Michael Saunders & Company (Southwest Florida)
  "michael saunders",

  // The Keyes Company (South Florida)
  "the keyes company",
  "keyes company",

  // John R. Wood Properties (Southwest Florida)
  "john r. wood",
  "john r wood",

  // Premier Plus Realty (Southwest Florida)
  "premier plus realty",

  // Lamacchia Realty (Massachusetts)
  "lamacchia realty",

  // Higgins Group Real Estate (Connecticut)
  "higgins group",

  // Randall Realtors (New England)
  "randall realtors",

  // Jack Conway & Company (Massachusetts)
  "jack conway",

  // Alain Pinel Realtors (now Compass, but some agents still reference)
  "alain pinel",

  // Pacific Union (now Compass, but still referenced)
  "pacific union",

  // Pinnacle Estate Properties (LA/Ventura)
  "pinnacle estate",

  // Dilbeck Real Estate (Southern California)
  "dilbeck real estate",

  // Lyon Real Estate (Sacramento)
  "lyon real estate",

  // Citi Habitats (NYC, now part of Corcoran)
  "citi habitats",

  // Halstead (NYC, merged into Brown Harris Stevens)
  "halstead real estate",
  "halstead property",

  // Triplemint (NYC, now part of REAL)
  "triplemint",

  // Side Real Estate (agent-branded platform)
  "side real estate",

  // PLACE Inc (agent platform / brokerage)
  "place inc",

  // Vylla Home (formerly Carrington)
  "vylla home",

  // Offerpad (iBuyer with brokerage arm)
  "offerpad",

  // Movoto (online brokerage)
  "movoto",
];

const MEDIUM_KEYWORDS = [
  // Action phrases agents use
  "buying and selling",
  "buying & selling",
  "homes for sale",
  "your home",
  "dream home",
  "home search",
  "listing agent",
  "buyer agent",
  "buyers agent",
  "seller agent",
  "sellers agent",
  "property",
  "properties",
  "mls",
  "just listed",
  "just sold",
  "open house",
  "new listing",
  "under contract",
  "closing day",
  "home tour",

  // Common agent bio phrases
  "helping you find",
  "helping families",
  "helping buyers",
  "helping sellers",
  "your next home",
  "local expert",
  "market expert",
  "real estate expert",
];

const CAPTION_HASHTAGS = [
  "#realtor",
  "#realtorlife",
  "#realtorsofinstagram",
  "#justlisted",
  "#justsold",
  "#openhouse",
  "#newlisting",
  "#homeforsale",
  "#listingagent",
  "#buyersagent",
  "#realestateteam",
  "#closingday",
];

/** Words that indicate this is NOT an individual agent */
const NEGATIVE_KEYWORDS = [
  "media",
  "news",
  "data",
  "podcast",
  "coach",
  "mortgage",
  "lender",
  "investor",
  "wholesale",
  "flipper",
  "photographer",
  "stager",
  "interior design",
  "builder",
  "construction company",
  "development",
  "global feed",
  "aggregator",
];

function containsAny(text: string, keywords: string[]): string[] {
  const lower = text.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw.toLowerCase()));
}

export interface AgentDetectionResult {
  isAgent: boolean;
  confidence: "high" | "medium" | "low";
  score: number;
  matchedKeywords: string[];
  negativeMatches: string[];
  source: string; // which field(s) matched
}

/**
 * Detect if a post owner is a real estate agent.
 * Uses only data available from the post GraphQL endpoint (zero extra calls).
 *
 * Pass any available fields — the function handles missing data gracefully.
 */
export function detectAgent(params: {
  fullName?: string;
  username?: string;
  caption?: string;
  bio?: string; // Optional — only if we fetch the profile
  followers?: number;
  postCount?: number;
}): AgentDetectionResult {
  let score = 0;
  const matchedKeywords: string[] = [];
  const negativeMatches: string[] = [];
  const sources: string[] = [];

  // Check full_name (strongest free signal)
  if (params.fullName) {
    const strong = containsAny(params.fullName, STRONG_KEYWORDS);
    if (strong.length > 0) {
      score += 40;
      matchedKeywords.push(...strong);
      sources.push("full_name");
    }
    const medium = containsAny(params.fullName, MEDIUM_KEYWORDS);
    if (medium.length > 0) {
      score += 15 * medium.length;
      matchedKeywords.push(...medium);
      sources.push("full_name");
    }
    const neg = containsAny(params.fullName, NEGATIVE_KEYWORDS);
    if (neg.length > 0) {
      score -= 30;
      negativeMatches.push(...neg);
    }
  }

  // Check username
  if (params.username) {
    const strong = containsAny(params.username, STRONG_KEYWORDS);
    if (strong.length > 0) {
      score += 25;
      matchedKeywords.push(...strong);
      sources.push("username");
    }
  }

  // Check caption + hashtags
  if (params.caption) {
    const hashtags = containsAny(params.caption, CAPTION_HASHTAGS);
    if (hashtags.length > 0) {
      score += 5 * hashtags.length;
      matchedKeywords.push(...hashtags);
      sources.push("caption");
    }
    const medium = containsAny(params.caption, MEDIUM_KEYWORDS);
    if (medium.length > 0) {
      score += 3 * medium.length;
      matchedKeywords.push(...medium);
    }
    const neg = containsAny(params.caption, NEGATIVE_KEYWORDS);
    if (neg.length > 0) {
      score -= 15;
      negativeMatches.push(...neg);
    }
  }

  // Check bio (if available — requires extra API call)
  if (params.bio) {
    const strong = containsAny(params.bio, STRONG_KEYWORDS);
    if (strong.length > 0) {
      score += 50; // Bio is the strongest signal when available
      matchedKeywords.push(...strong);
      sources.push("bio");
    }
    const medium = containsAny(params.bio, MEDIUM_KEYWORDS);
    if (medium.length > 0) {
      score += 10 * medium.length;
      matchedKeywords.push(...medium);
      sources.push("bio");
    }
    const neg = containsAny(params.bio, NEGATIVE_KEYWORDS);
    if (neg.length > 0) {
      score -= 30;
      negativeMatches.push(...neg);
    }
  }

  // Follower range bonus (agents typically 300-100K)
  if (params.followers && params.followers >= 300 && params.followers <= 100000) {
    score += 5;
  }
  // Penalty for huge accounts (likely brands/media)
  if (params.followers && params.followers > 500000) {
    score -= 10;
  }

  // Classify
  const isAgent = score >= 30;
  const confidence: "high" | "medium" | "low" =
    score >= 50 ? "high" : score >= 30 ? "medium" : "low";

  return {
    isAgent,
    confidence,
    score,
    matchedKeywords: [...new Set(matchedKeywords)],
    negativeMatches: [...new Set(negativeMatches)],
    source: [...new Set(sources)].join(", "),
  };
}

/**
 * Quick test against known accounts
 */
function test() {
  const tests = [
    { fullName: "Samantha Haringa | SWFL Realtor", username: "samantha.haringa", followers: 52915 },
    { fullName: "Melissa Orta | Southwest, FL Real Estate Broker Associate", username: "melissaortarealtor", followers: 40883 },
    { fullName: "GL Homes", username: "glhomes", followers: 34621 },
    { fullName: "Global Feed", username: "the_globalfeed", followers: 38346 },
    { fullName: "Reventure Data", username: "reventuredata", followers: 249821 },
    { fullName: "Alana | Cape Coral Realtor", username: "alana_sellssunshine", followers: 15000 },
    { fullName: "Diego | Your Fort Myers Realtor", username: "diego.realtor", followers: 8000 },
  ];

  for (const t of tests) {
    const result = detectAgent(t);
    const icon = result.isAgent ? "✅" : "❌";
    console.log(`${icon} @${t.username} | score:${result.score} | ${result.confidence} | matched:[${result.matchedKeywords.join(",")}] | negative:[${result.negativeMatches.join(",")}]`);
  }
}

if (require.main === module) {
  test();
}
