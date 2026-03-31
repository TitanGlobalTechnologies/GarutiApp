/**
 * Google Custom Search API client
 * Discovers social media content by location + keywords across all platforms
 * Free: 100 queries/day
 */

const API_KEY = process.env.GOOGLE_CUSTOM_SEARCH_KEY;
const CX = process.env.GOOGLE_CUSTOM_SEARCH_CX;
const BASE_URL = "https://www.googleapis.com/customsearch/v1";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  displayLink: string;
  thumbnail?: string;
  platform: "instagram" | "youtube" | "reddit" | "twitter" | "tiktok" | "facebook";
}

interface GoogleSearchResponse {
  items?: Array<{
    title: string;
    link: string;
    snippet: string;
    displayLink: string;
    pagemap?: {
      cse_thumbnail?: Array<{ src: string }>;
      metatags?: Array<Record<string, string>>;
    };
  }>;
  searchInformation?: {
    totalResults: string;
  };
}

function detectPlatform(url: string): SearchResult["platform"] {
  if (url.includes("instagram.com")) return "instagram";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("reddit.com")) return "reddit";
  if (url.includes("twitter.com") || url.includes("x.com")) return "twitter";
  if (url.includes("tiktok.com")) return "tiktok";
  if (url.includes("facebook.com")) return "facebook";
  return "instagram"; // fallback
}

export async function searchGoogle(
  query: string,
  options: { dateRestrict?: string; num?: number } = {}
): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    key: API_KEY || "",
    cx: CX || "",
    q: query,
    num: String(options.num || 10),
  });

  if (options.dateRestrict) {
    params.set("dateRestrict", options.dateRestrict);
  }

  const res = await fetch(`${BASE_URL}?${params}`);
  if (!res.ok) {
    throw new Error(`Google Search API error: ${res.status} ${res.statusText}`);
  }

  const data: GoogleSearchResponse = await res.json();

  return (data.items || []).map((item) => ({
    title: item.title,
    url: item.link,
    snippet: item.snippet,
    displayLink: item.displayLink,
    thumbnail: item.pagemap?.cse_thumbnail?.[0]?.src,
    platform: detectPlatform(item.link),
  }));
}

/**
 * Discover content for a specific market across all platforms
 */
export async function discoverContentForMarket(
  city: string,
  state: string,
  platforms: SearchResult["platform"][] = ["instagram", "youtube", "reddit", "twitter"]
): Promise<SearchResult[]> {
  const allResults: SearchResult[] = [];
  const location = `"${city}" ${state}`;

  const queries: Record<string, string> = {
    instagram: `site:instagram.com/reel ${location} real estate`,
    youtube: `site:youtube.com/shorts ${location} real estate`,
    reddit: `site:reddit.com ${location} real estate`,
    twitter: `site:x.com ${location} realtor OR "real estate"`,
    tiktok: `site:tiktok.com ${location} real estate`,
    facebook: `site:facebook.com ${location} real estate agent`,
  };

  for (const platform of platforms) {
    try {
      const results = await searchGoogle(queries[platform], {
        dateRestrict: "w1", // last week
        num: 10,
      });
      allResults.push(...results);
    } catch (err) {
      console.warn(`Failed to search ${platform} for ${city}, ${state}:`, err);
    }
  }

  return allResults;
}
