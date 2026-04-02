/**
 * Virality Score Calculator
 *
 * Formula (absolute, not normalized):
 *   score = (views / 20) + (likes / 10) + comments
 *
 * Rationale:
 *   - 20 views = 1 point (views are passive, low value)
 *   - 10 likes = 1 point (active engagement, medium value)
 *   - 1 comment = 1 point (highest value, real conversation)
 *
 * No cap on maximum. Displayed as up to 3 digits in the UI.
 * A post with 100K views, 5K likes, 200 comments = 5000 + 500 + 200 = 5700
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
  viralityScore: number;
}

/**
 * Calculate virality score for a single post
 */
export function calculateVirality(views: number, likes: number, comments: number): number {
  return Math.round((views / 20) + (likes / 10) + comments);
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

  const scored: ScoredContent[] = items.map((item) => ({
    ...item,
    viralityScore: calculateVirality(item.views, item.likes, item.comments),
  }));

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
  const seenInBatch = new Set<string>();

  for (const item of scored) {
    if (results.length >= topN) break;

    if (seenInBatch.has(item.shortcode)) continue;

    if (previousShortcodes.has(item.shortcode) && item.viralityScore <= 90) {
      continue;
    }

    seenInBatch.add(item.shortcode);
    results.push(item);
  }

  return results;
}
