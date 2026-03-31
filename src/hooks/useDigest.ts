import { useState, useEffect, useCallback } from "react";
import { MOCK_DIGEST_CONTENT } from "../data/mock-digest";
import type { DiscoveredContent } from "../lib/content-pipeline";

// TODO: Replace with Supabase query when pipeline is running
// When live, this hook will:
// 1. Query daily_digests table for today's digest filtered by user's market
// 2. Join with content_items to get full content data
// 3. If no digest exists yet, trigger the discovery pipeline via edge function
// The marketCity/marketState params drive the Google Custom Search queries:
//   site:instagram.com "{marketCity}" real estate
//   site:youtube.com/shorts "{marketCity} {marketState}" realtor

export function useDigest(marketCity: string, marketState: string) {
  const [content, setContent] = useState<DiscoveredContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDigest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await new Promise((r) => setTimeout(r, 500));
      // Mock data uses Cape Coral — when live, results will match marketCity/marketState
      setContent(MOCK_DIGEST_CONTENT);
    } catch (err: any) {
      setError(err.message || "Failed to load digest");
    } finally {
      setLoading(false);
    }
  }, [marketCity, marketState]);

  useEffect(() => {
    fetchDigest();
  }, [fetchDigest]);

  return { content, loading, error, refresh: fetchDigest, marketCity, marketState };
}
