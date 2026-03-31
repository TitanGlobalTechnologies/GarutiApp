/**
 * Virality Score Calculator
 *
 * Normalizes views, likes, and comments within a batch to 0-100,
 * then applies weighted formula:
 *
 *   score = (views_norm * 0.4) + (likes_norm * 0.3) + (comments_norm * 0.3)
 *
 * Top post gets ~95, lowest gets ~40.
 * Never returns below 10 (everything that made it here has some traction).
 */

export interface ScoredContent {
  url: string;
  shortcode: string;
  title: string;
  authorHandle: string;
  authorName: string;
  thumbnailUrl: string;
  views: number;
  likes: number;
  comments: number;
  viralityScore: number; // 0-100
}

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 50; // all same value
  return ((value - min) / (max - min)) * 100;
}

/**
 * Score and rank a batch of content by virality
 */
export function scoreAndRank(
  items: Array<{
    url: string;
    shortcode: string;
    title: string;
    authorHandle: string;
    authorName: string;
    thumbnailUrl: string;
    views: number;
    likes: number;
    comments: number;
  }>
): ScoredContent[] {
  if (items.length === 0) return [];

  // Find min/max for normalization
  const views = items.map((i) => i.views);
  const likes = items.map((i) => i.likes);
  const comments = items.map((i) => i.comments);

  const minViews = Math.min(...views);
  const maxViews = Math.max(...views);
  const minLikes = Math.min(...likes);
  const maxLikes = Math.max(...likes);
  const minComments = Math.min(...comments);
  const maxComments = Math.max(...comments);

  // Score each item
  const scored: ScoredContent[] = items.map((item) => {
    const viewsNorm = normalize(item.views, minViews, maxViews);
    const likesNorm = normalize(item.likes, minLikes, maxLikes);
    const commentsNorm = normalize(item.comments, minComments, maxComments);

    // Weighted formula
    const rawScore = viewsNorm * 0.4 + likesNorm * 0.3 + commentsNorm * 0.3;

    // Floor at 10, cap at 99
    const viralityScore = Math.round(Math.max(10, Math.min(99, rawScore)));

    return { ...item, viralityScore };
  });

  // Sort by score descending
  scored.sort((a, b) => b.viralityScore - a.viralityScore);

  return scored;
}

/**
 * Pick top N, ensuring no duplicate posts from previous runs
 */
export function pickTop(
  scored: ScoredContent[],
  topN: number,
  previousShortcodes: Set<string> = new Set()
): ScoredContent[] {
  const results: ScoredContent[] = [];

  for (const item of scored) {
    if (results.length >= topN) break;

    // Skip if we've shown this post before (unless super viral — score > 90)
    if (previousShortcodes.has(item.shortcode) && item.viralityScore <= 90) {
      continue;
    }

    results.push(item);
  }

  return results;
}
