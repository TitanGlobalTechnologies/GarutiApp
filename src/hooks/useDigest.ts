import { useState, useEffect, useCallback } from "react";
import { MOCK_DIGEST_CONTENT } from "../data/mock-digest";
import type { DiscoveredContent } from "../lib/content-pipeline";

// TODO: Replace with Supabase query when pipeline is running
// For now, uses mock data so the app is functional for demos

export function useDigest(marketCity: string, marketState: string) {
  const [content, setContent] = useState<DiscoveredContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDigest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // When Supabase is connected, this will query the daily_digests table
      // For now, use mock data
      await new Promise((r) => setTimeout(r, 500)); // simulate network
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

  return { content, loading, error, refresh: fetchDigest };
}
