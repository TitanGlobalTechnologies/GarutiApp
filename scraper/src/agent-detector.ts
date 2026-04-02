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

  // Brokerage names (top US brokerages)
  "keller williams",
  "coldwell banker",
  "re/max",
  "remax",
  "re max",
  "century 21",
  "century21",
  "compass",
  "exp realty",
  "exp realty",
  "sotheby",
  "berkshire hathaway",
  "bhhs",
  "weichert",
  "howard hanna",
  "douglas elliman",
  "the keyes company",
  "the agency",
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
