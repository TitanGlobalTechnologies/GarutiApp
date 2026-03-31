/**
 * Twitter/X API v2 client (Free Tier)
 * Fetches engagement data for tweets
 * Free: 1,500 tweet reads/month
 */

const BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;
const BASE_URL = "https://api.twitter.com/2";

export interface TwitterPostStats {
  tweetId: string;
  text: string;
  authorId: string;
  likes: number;
  retweets: number;
  replies: number;
  quotes: number;
  impressions: number;
  createdAt: string;
}

/**
 * Extract tweet ID from various X/Twitter URL formats
 */
export function extractTweetId(url: string): string | null {
  const match = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Fetch stats for a single tweet by ID
 * Cost: 1 read (of 1,500/month free)
 */
export async function getTweetStats(tweetId: string): Promise<TwitterPostStats | null> {
  if (!BEARER_TOKEN) return null;

  try {
    const params = new URLSearchParams({
      "tweet.fields": "public_metrics,created_at",
      expansions: "author_id",
    });

    const res = await fetch(`${BASE_URL}/tweets/${tweetId}?${params}`, {
      headers: { Authorization: `Bearer ${BEARER_TOKEN}` },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const tweet = data.data;
    if (!tweet) return null;

    const metrics = tweet.public_metrics || {};
    return {
      tweetId: tweet.id,
      text: tweet.text,
      authorId: tweet.author_id,
      likes: metrics.like_count || 0,
      retweets: metrics.retweet_count || 0,
      replies: metrics.reply_count || 0,
      quotes: metrics.quote_count || 0,
      impressions: metrics.impression_count || 0,
      createdAt: tweet.created_at,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch stats for a tweet by URL
 */
export async function getTweetStatsByUrl(url: string): Promise<TwitterPostStats | null> {
  const tweetId = extractTweetId(url);
  if (!tweetId) return null;
  return getTweetStats(tweetId);
}
