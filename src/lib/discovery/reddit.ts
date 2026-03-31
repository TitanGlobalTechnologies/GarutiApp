/**
 * Reddit Public JSON API client
 * Fetches engagement data from any public Reddit post
 * Free: No API key needed. ~10 req/min unauthenticated.
 */

export interface RedditPostStats {
  title: string;
  author: string;
  subreddit: string;
  score: number;
  upvoteRatio: number;
  comments: number;
  url: string;
  permalink: string;
  selftext: string;
  createdAt: Date;
}

/**
 * Fetch stats for a Reddit post by URL
 * Just appends .json to the URL — no API key needed
 */
export async function getRedditPostStats(postUrl: string): Promise<RedditPostStats | null> {
  try {
    // Normalize URL and append .json
    let jsonUrl = postUrl.replace(/\?.*$/, ""); // strip query params
    if (!jsonUrl.endsWith("/")) jsonUrl += "/";
    jsonUrl += ".json";

    const res = await fetch(jsonUrl, {
      headers: { "User-Agent": "LAE-ContentDiscovery/1.0" },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const post = data[0]?.data?.children?.[0]?.data;
    if (!post) return null;

    return {
      title: post.title,
      author: post.author,
      subreddit: post.subreddit,
      score: post.score,
      upvoteRatio: post.upvote_ratio,
      comments: post.num_comments,
      url: post.url,
      permalink: `https://www.reddit.com${post.permalink}`,
      selftext: post.selftext || "",
      createdAt: new Date(post.created_utc * 1000),
    };
  } catch {
    return null;
  }
}
