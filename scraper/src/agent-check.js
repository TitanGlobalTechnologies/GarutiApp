/**
 * Real Estate Agent Detection — Tiered System
 *
 * Tier 1 (1 match = agent): License numbers, "realtor" in bio/username, brokerage names
 * Tier 2 (need 2+ matches): RE role phrases, transaction terms, ranking claims
 * Negative overrides: coaches, trainers, media, mortgage, etc.
 *
 * Based on analysis of 25 real agent Instagram profiles across all follower tiers.
 */

// ─── TIER 1: Standalone qualifiers (any ONE = agent) ───

const BROKERAGE_NAMES = [
  // Major national franchises
  "keller williams", "kellerwilliams",
  "coldwell banker", "coldwellbanker",
  "re/max", "remax", "re max",
  "century 21", "century21",
  "compass real estate", "compass realty", "@compass",
  "exp realty", "exprealty",
  "berkshire hathaway", "bhhs",
  "sotheby", "sothebys",
  "douglas elliman", "elliman",
  "era real estate", "era realty",
  "corcoran group", "corcoran real estate", "corcoran realty", "the corcoran group",
  "better homes and gardens real estate", "bhg real estate", "bhgre",
  "homeservices of america",
  "howard hanna",
  "weichert",
  "real brokerage", "real broker",
  "redfin",
  "realty one group", "realtyonegroup",
  "homesmart",
  "exit realty", "exitrealty",
  "united real estate",
  "nexthome", "next home realty",
  "fathom realty", "fathomrealty",
  "lpt realty", "lptrealty",
  "epique realty",
  // Luxury / boutique
  "christie's international", "christies real estate", "christies international",
  "engel & volkers", "engel and volkers", "engelvolkers", "engel volkers",
  "the agency re", "theagencyre",
  "nest seekers", "nestseekers",
  "brown harris stevens", "brown harris",
  "coldwell banker global luxury", "cb global luxury",
  "one sotheby",
  // Regional
  "long & foster", "long and foster", "longandfoster",
  "baird & warner", "baird and warner",
  "crye-leike", "crye leike", "cryeleike",
  "windermere real estate", "windermere realty",
  "allen tate",
  "edina realty",
  "ebby halliday",
  "houlihan lawrence",
  "william raveis", "raveis real estate",
  "harry norman",
  "@properties",
  "latter & blum", "latter and blum",
  "watson realty",
  "samson properties",
  "michael saunders",
  "the keyes company", "keyes company",
  "john r. wood", "john r wood",
  "premier plus realty",
  "lamacchia realty",
  "alain pinel",
  "pacific union",
  "pinnacle estate",
  "side real estate",
  "stribling",
  "halstead real estate",
  "citi habitats",
  "triplemint",
];

// License number patterns (regex)
const LICENSE_PATTERNS = [
  /dre\s*#/i,
  /bre\s*#/i,
  /lic\s*#/i,
  /bs\.\d/i,
  /license\s*#/i,
  /licensed\s+(real estate|realtor|agent|broker)/i,
];

// ─── TIER 2: Need 2+ signals ───

const TIER2_SIGNALS = [
  // RE role phrases
  { keywords: ["real estate agent", "real estate broker", "real estate advisor", "real estate professional"], label: "re_role" },
  // Transaction context
  { keywords: ["just listed", "just sold", "under contract", "closing day", "homes sold", "career sales", "transactions"], label: "transactions" },
  // Ranking claims in RE context
  { keywords: ["#1 agent", "#1 realtor", "top agent", "top realtor", "top producer", "#1 team"], label: "ranking" },
  // Luxury RE
  { keywords: ["luxury real estate", "luxury realtor", "luxury homes", "luxury listing", "luxury broker"], label: "luxury_re" },
  // Buyer/seller agent roles
  { keywords: ["listing agent", "buyer agent", "buyers agent", "seller agent", "sellers agent", "homes for sale", "home tour"], label: "agent_role" },
  // Sales volume in RE context
  { keywords: ["million sold", "billion sold", "million in sales", "billion in sales", "in career sales"], label: "sales_volume" },
  // RE action phrases
  { keywords: ["buying and selling", "buying & selling", "your next home", "dream home", "home search", "open house", "new listing"], label: "re_actions" },
  // RE-specific hashtags
  { keywords: ["#realtor", "#realtorlife", "#realtorsofinstagram", "#justlisted", "#justsold", "#listingagent"], label: "re_hashtags" },
];

// ─── NEGATIVE OVERRIDES ───

// Phrases that override even Tier 1 matches (someone serving agents, not an agent)
const NEGATIVE_PHRASES = [
  "for realtors",
  "for real estate agents",
  "for agents",
  "helping realtors",
  "helping agents grow",
  "training realtors",
  "training agents",
  "coaching realtors",
  "coaching agents",
  "humor brand",
  "humor in real estate",
  "social media for",
  "marketing for realtors",
  "marketing for agents",
  "academy",
  "where agents hang out",
  // Ads / services targeting agents (not agents themselves)
  "be featured",
  "we feature your",
  "feature your listing",
  "get your listing featured",
  "promote your listing",
  "we promote your",
  "advertise your",
  "dm us to be featured",
  "dm to be featured",
  "tag us to be featured",
];

// Single-word negatives (reject if present AND no Tier 1 brokerage/license match)
const NEGATIVE_KEYWORDS = [
  "mortgage",
  "mortgages",
  "lender",
  "lending",
  "loan officer",
  "loan originator",
  "photographer",
  "stager",
  "interior design",
  "builder",
  "construction company",
  "wholesale",
  "flipper",
  "news",
  "aggregator",
  "global feed",
];

// ─── DETECTION FUNCTION ───

/**
 * Check if an Instagram account belongs to a real estate agent.
 *
 * @param {object} params - { bio, fullName, username, caption }
 * @returns {{ isAgent: boolean, tier: number, signals: string[], negatives: string[] }}
 */
function checkAgent(params) {
  const { bio = "", fullName = "", username = "", caption = "" } = params;
  const allText = (bio + " " + fullName + " " + username + " " + caption).toLowerCase();
  const bioAndName = (bio + " " + fullName + " " + username).toLowerCase();

  const signals = [];
  const negatives = [];
  const usernameLower = username.toLowerCase();

  // ── Step 0: Username hard rejects — if the account NAME contains these, never an agent ──
  const USERNAME_REJECTS = ["mortgage", "lending", "lender", "loan", "title company", "escrow", "inspector", "apprais"];
  for (const term of USERNAME_REJECTS) {
    if (usernameLower.includes(term)) {
      return { isAgent: false, tier: 0, signals, negatives: [`username:${term}`] };
    }
  }

  // ── Step 1: Check negative override phrases (these disqualify immediately) ──
  for (const phrase of NEGATIVE_PHRASES) {
    if (allText.includes(phrase)) {
      negatives.push(phrase);
    }
  }
  if (negatives.length > 0) {
    return { isAgent: false, tier: 0, signals, negatives };
  }

  // ── Step 2: Check negative keywords ──
  for (const kw of NEGATIVE_KEYWORDS) {
    if (allText.includes(kw)) {
      negatives.push(kw);
    }
  }

  // ── Step 3: Check Tier 1 (standalone qualifiers) ──

  // 3a: License number patterns
  for (const pattern of LICENSE_PATTERNS) {
    if (pattern.test(allText)) {
      signals.push("license:" + pattern.source);
      break;
    }
  }

  // 3b: "realtor" in bio or username (strongest standalone signal)
  if (bioAndName.includes("realtor")) {
    signals.push("realtor_in_profile");
  }

  // 3c: Brokerage name
  for (const brokerage of BROKERAGE_NAMES) {
    if (allText.includes(brokerage)) {
      signals.push("brokerage:" + brokerage);
      break; // One brokerage match is enough
    }
  }

  // If any Tier 1 signal AND no hard negatives → agent
  const hasTier1 = signals.length > 0;
  if (hasTier1 && negatives.length === 0) {
    return { isAgent: true, tier: 1, signals, negatives };
  }
  // Tier 1 with negatives: only allow if we have brokerage OR license (strong override)
  if (hasTier1 && negatives.length > 0) {
    const hasHardProof = signals.some(s => s.startsWith("license:") || s.startsWith("brokerage:"));
    if (hasHardProof) {
      return { isAgent: true, tier: 1, signals, negatives };
    }
  }

  // ── Step 4: Check Tier 2 (need 2+ distinct signal categories) ──
  const tier2Matches = new Set();
  for (const group of TIER2_SIGNALS) {
    for (const kw of group.keywords) {
      if (allText.includes(kw)) {
        tier2Matches.add(group.label);
        break; // One match per group is enough
      }
    }
  }

  if (tier2Matches.size >= 2 && negatives.length === 0) {
    return { isAgent: true, tier: 2, signals: [...tier2Matches], negatives };
  }

  return { isAgent: false, tier: 0, signals: [...tier2Matches], negatives };
}

module.exports = { checkAgent, BROKERAGE_NAMES, LICENSE_PATTERNS };
