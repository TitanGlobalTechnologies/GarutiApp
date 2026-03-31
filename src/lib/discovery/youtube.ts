/**
 * YouTube Data API v3 client
 * Fetches engagement data for YouTube videos/Shorts
 * Free: 10,000 units/day (1 unit per video lookup)
 */

const API_KEY = process.env.YOUTUBE_API_KEY;
const BASE_URL = "https://www.googleapis.com/youtube/v3";

export interface YouTubeVideoStats {
  videoId: string;
  title: string;
  channelTitle: string;
  description: string;
  publishedAt: string;
  thumbnail: string;
  views: number;
  likes: number;
  comments: number;
}

interface YouTubeAPIResponse {
  items: Array<{
    id: string;
    snippet: {
      title: string;
      channelTitle: string;
      description: string;
      publishedAt: string;
      thumbnails: {
        high?: { url: string };
        medium?: { url: string };
        default?: { url: string };
      };
    };
    statistics: {
      viewCount: string;
      likeCount: string;
      commentCount: string;
    };
  }>;
}

/**
 * Extract video ID from various YouTube URL formats
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /youtu\.be\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Fetch stats for one or more YouTube videos
 * Cost: 1 API unit per call (can batch up to 50 IDs)
 */
export async function getVideoStats(videoIds: string[]): Promise<YouTubeVideoStats[]> {
  if (videoIds.length === 0) return [];

  const params = new URLSearchParams({
    key: API_KEY || "",
    part: "statistics,snippet",
    id: videoIds.slice(0, 50).join(","), // max 50 per request
  });

  const res = await fetch(`${BASE_URL}/videos?${params}`);
  if (!res.ok) {
    throw new Error(`YouTube API error: ${res.status} ${res.statusText}`);
  }

  const data: YouTubeAPIResponse = await res.json();

  return data.items.map((item) => ({
    videoId: item.id,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    description: item.snippet.description,
    publishedAt: item.snippet.publishedAt,
    thumbnail:
      item.snippet.thumbnails.high?.url ||
      item.snippet.thumbnails.medium?.url ||
      item.snippet.thumbnails.default?.url ||
      "",
    views: parseInt(item.statistics.viewCount) || 0,
    likes: parseInt(item.statistics.likeCount) || 0,
    comments: parseInt(item.statistics.commentCount) || 0,
  }));
}

/**
 * Fetch stats for a single video by URL
 */
export async function getVideoStatsByUrl(url: string): Promise<YouTubeVideoStats | null> {
  const videoId = extractVideoId(url);
  if (!videoId) return null;

  const results = await getVideoStats([videoId]);
  return results[0] || null;
}
