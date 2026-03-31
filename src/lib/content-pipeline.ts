/**
 * Content Pipeline Orchestrator
 * Ties together: Google Search discovery → Platform engagement → Ranking → AI adaptation
 */

import { discoverContentForMarket, SearchResult } from "./discovery";
import { getVideoStatsByUrl } from "./discovery/youtube";
import { getRedditPostStats } from "./discovery/reddit";
import { getTweetStatsByUrl } from "./discovery/twitter";
import { generateAdaptations, ContentAdaptation } from "./gemini";
import type { ContentItem, ContentPlatform } from "../types/database";

export interface DiscoveredContent {
  url: string;
  title: string;
  caption: string;
  platform: ContentPlatform;
  creatorHandle: string;
  creatorName: string;
  thumbnail: string;
  views: number;
  likes: number;
  comments: number;
  engagementRate: number;
  discoveredAt: string;
}

export interface DigestWithAdaptations {
  content: DiscoveredContent[];
  adaptations: Map<string, ContentAdaptation[]>; // url → adaptations
}

/**
 * Calculate engagement rate from raw metrics
 */
function calculateEngagement(views: number, likes: number, comments: number): number {
  if (views === 0) return 0;
  return parseFloat((((likes + comments) / views) * 100).toFixed(2));
}

/**
 * Enrich a search result with platform-specific engagement data
 */
async function enrichWithEngagement(result: SearchResult): Promise<DiscoveredContent> {
  const base: DiscoveredContent = {
    url: result.url,
    title: result.title,
    caption: result.snippet,
    platform: result.platform,
    creatorHandle: "",
    creatorName: "",
    thumbnail: result.thumbnail || "",
    views: 0,
    likes: 0,
    comments: 0,
    engagementRate: 0,
    discoveredAt: new Date().toISOString(),
  };

  try {
    switch (result.platform) {
      case "youtube": {
        const stats = await getVideoStatsByUrl(result.url);
        if (stats) {
          base.views = stats.views;
          base.likes = stats.likes;
          base.comments = stats.comments;
          base.title = stats.title;
          base.creatorHandle = stats.channelTitle;
          base.creatorName = stats.channelTitle;
          base.thumbnail = stats.thumbnail;
          base.engagementRate = calculateEngagement(stats.views, stats.likes, stats.comments);
        }
        break;
      }
      case "reddit": {
        const stats = await getRedditPostStats(result.url);
        if (stats) {
          base.likes = stats.score;
          base.comments = stats.comments;
          base.title = stats.title;
          base.creatorHandle = stats.author;
          base.creatorName = stats.author;
          base.caption = stats.selftext || result.snippet;
          base.engagementRate = stats.upvoteRatio * 100;
        }
        break;
      }
      case "twitter": {
        const stats = await getTweetStatsByUrl(result.url);
        if (stats) {
          base.likes = stats.likes;
          base.comments = stats.replies;
          base.views = stats.impressions;
          base.caption = stats.text;
          base.engagementRate = calculateEngagement(stats.impressions, stats.likes, stats.replies);
        }
        break;
      }
      // Instagram, TikTok, Facebook — use Google snippet data only (no free engagement API)
      default: {
        // Extract handle from URL if possible
        const handleMatch = result.url.match(/instagram\.com\/([^/]+)/);
        if (handleMatch) base.creatorHandle = handleMatch[1];
        break;
      }
    }
  } catch (err) {
    console.warn(`Failed to enrich ${result.platform} URL:`, err);
  }

  return base;
}

/**
 * Run the full content discovery pipeline for a market
 */
export async function runPipeline(
  city: string,
  state: string,
  topN: number = 5
): Promise<DiscoveredContent[]> {
  // Step 1: Discover via Google Search
  const searchResults = await discoverContentForMarket(city, state);

  // Step 2: Enrich with platform-specific engagement
  const enriched = await Promise.all(searchResults.map(enrichWithEngagement));

  // Step 3: Rank by engagement (prioritize YouTube and Reddit where we have real data)
  const ranked = enriched.sort((a, b) => {
    // Prioritize items with real engagement data
    const aScore = a.views + a.likes * 10 + a.comments * 20;
    const bScore = b.views + b.likes * 10 + b.comments * 20;
    return bScore - aScore;
  });

  // Step 4: Return top N
  return ranked.slice(0, topN);
}

/**
 * Generate AI adaptations for top content
 */
export async function generateDigestAdaptations(
  content: DiscoveredContent[],
  agentCity: string,
  agentState: string,
  agentStyle?: string
): Promise<Map<string, ContentAdaptation[]>> {
  const adaptationsMap = new Map<string, ContentAdaptation[]>();

  for (const item of content) {
    const adaptations = await generateAdaptations({
      originalTitle: item.title,
      originalCaption: item.caption,
      platform: item.platform,
      creatorHandle: item.creatorHandle || "unknown",
      engagementMetrics: `${item.views.toLocaleString()} views, ${item.engagementRate}% engagement`,
      agentMarketCity: agentCity,
      agentMarketState: agentState,
      agentStyle,
    });
    adaptationsMap.set(item.url, adaptations);
  }

  return adaptationsMap;
}
