/**
 * Instagram Engagement Fetcher
 *
 * Gets REAL like_count, comment_count, view_count for Instagram posts.
 * Written from scratch — no external dependencies, just native fetch().
 *
 * Two methods:
 * 1. GraphQL endpoint (no cookies, but may not return likes/comments)
 * 2. Magic params endpoint (needs X-Ig-App-Id header, returns full metrics)
 *
 * Both use Instagram's internal API endpoints that return JSON.
 */

import { config } from "./config";

export interface RealEngagement {
  shortcode: string;
  url: string;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  caption: string;
  authorUsername: string;
  timestamp: number;
  isVideo: boolean;
}

/**
 * Extract shortcode from Instagram URL
 * instagram.com/reel/ABC123/ → ABC123
 * instagram.com/p/ABC123/ → ABC123
 */
export function extractShortcode(url: string): string | null {
  const match = url.match(/instagram\.com\/(?:reel|p)\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Method 1: GraphQL endpoint
 * No cookies needed — just User-Agent and X-Ig-App-Id
 * Returns video views/plays but may not return likes/comments
 */
async function fetchGraphQL(shortcode: string): Promise<Partial<RealEngagement> | null> {
  try {
    const variables = JSON.stringify({ shortcode });
    const params = new URLSearchParams({
      variables,
      doc_id: "10015901848480474",
      lsd: "AVqbxe3J_YA",
    });

    const res = await fetch(`https://www.instagram.com/api/graphql?${params}`, {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "X-IG-App-ID": "936619743392459",
        "X-FB-LSD": "AVqbxe3J_YA",
        "X-ASBD-ID": "129477",
        "Sec-Fetch-Site": "same-origin",
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!res.ok) return null;

    const json = (await res.json()) as any;
    const media = json?.data?.xdt_shortcode_media;
    if (!media) return null;

    return {
      shortcode: media.shortcode,
      viewCount: media.video_view_count || media.video_play_count || 0,
      caption: media.edge_media_to_caption?.edges?.[0]?.node?.text || "",
      authorUsername: media.owner?.username || "",
      timestamp: media.taken_at_timestamp || 0,
      isVideo: media.is_video || false,
      // GraphQL sometimes has these nested differently
      likeCount: media.edge_media_preview_like?.count || 0,
      commentCount: media.edge_media_to_parent_comment?.count || media.edge_media_preview_comment?.count || 0,
    };
  } catch (err) {
    return null;
  }
}

/**
 * Method 2: Magic params (?__a=1&__d=dis)
 * Returns full metrics including like_count, comment_count, view_count
 * Needs X-Ig-App-Id header (stable, rarely changes)
 */
async function fetchMagicParams(shortcode: string): Promise<Partial<RealEngagement> | null> {
  try {
    const res = await fetch(`https://www.instagram.com/p/${shortcode}/?__a=1&__d=dis`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "X-IG-App-ID": "936619743392459",
        "Sec-Fetch-Site": "same-origin",
      },
    });

    if (!res.ok) return null;

    const json = (await res.json()) as any;
    const items = json?.items?.[0];
    if (!items) return null;

    return {
      shortcode: items.code || shortcode,
      likeCount: items.like_count || 0,
      commentCount: items.comment_count || 0,
      viewCount: items.view_count || items.play_count || 0,
      caption: items.caption?.text || "",
      authorUsername: items.user?.username || "",
      timestamp: items.taken_at || 0,
      isVideo: items.media_type === 2,
    };
  } catch (err) {
    return null;
  }
}

/**
 * Get real engagement data for an Instagram post
 * Tries Method 2 first (full metrics), falls back to Method 1
 */
export async function getRealEngagement(url: string): Promise<RealEngagement | null> {
  const shortcode = extractShortcode(url);
  if (!shortcode) {
    console.log(`  [ig] Could not extract shortcode from: ${url}`);
    return null;
  }

  // Try magic params first (more complete data)
  const method2 = await fetchMagicParams(shortcode);
  if (method2 && (method2.likeCount! > 0 || method2.viewCount! > 0)) {
    console.log(`  [ig] ✓ ${shortcode}: ${method2.likeCount} likes, ${method2.commentCount} comments, ${method2.viewCount} views (magic params)`);
    return {
      shortcode,
      url,
      likeCount: method2.likeCount || 0,
      commentCount: method2.commentCount || 0,
      viewCount: method2.viewCount || 0,
      caption: method2.caption || "",
      authorUsername: method2.authorUsername || "",
      timestamp: method2.timestamp || 0,
      isVideo: method2.isVideo || false,
    };
  }

  // Fall back to GraphQL
  const method1 = await fetchGraphQL(shortcode);
  if (method1 && (method1.likeCount! > 0 || method1.viewCount! > 0)) {
    console.log(`  [ig] ✓ ${shortcode}: ${method1.likeCount} likes, ${method1.commentCount} comments, ${method1.viewCount} views (graphql)`);
    return {
      shortcode,
      url,
      likeCount: method1.likeCount || 0,
      commentCount: method1.commentCount || 0,
      viewCount: method1.viewCount || 0,
      caption: method1.caption || "",
      authorUsername: method1.authorUsername || "",
      timestamp: method1.timestamp || 0,
      isVideo: method1.isVideo || false,
    };
  }

  console.log(`  [ig] ✗ ${shortcode}: could not fetch engagement data`);
  return null;
}

/**
 * Test the engagement fetcher with a known post
 */
async function test() {
  console.log("Testing Instagram engagement fetcher...\n");

  // Use one of the real URLs we scraped
  const testUrl = "https://www.instagram.com/reel/DV15dKKDYts/";
  const result = await getRealEngagement(testUrl);

  if (result) {
    console.log("\nResult:");
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log("\nFailed to get engagement data.");
    console.log("This likely means Instagram is blocking the request.");
    console.log("The methods may need an updated X-IG-App-ID or doc_id.");
  }
}

if (require.main === module) {
  test().catch(console.error);
}
