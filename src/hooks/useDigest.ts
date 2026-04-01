import { useState, useEffect, useCallback } from "react";
import { getLiveDigestContent, SupportedCity } from "../data/live-digest";
import type { DiscoveredContent } from "../lib/content-pipeline";

export function useDigest(marketCity: string, marketState: string) {
  const [content, setContent] = useState<DiscoveredContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDigest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await new Promise((r) => setTimeout(r, 300));
      setContent(getLiveDigestContent(marketCity as SupportedCity));
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
