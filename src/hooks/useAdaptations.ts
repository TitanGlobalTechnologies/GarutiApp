import { useState, useEffect, useCallback } from "react";
import { getMockAdaptations } from "../data/mock-digest";
import type { ContentAdaptation } from "../lib/gemini";

// TODO: Replace with Supabase query + Gemini API when pipeline is running

export function useAdaptations(contentUrl: string, marketCity: string) {
  const [adaptations, setAdaptations] = useState<ContentAdaptation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdaptations = useCallback(async () => {
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 300)); // simulate
      setAdaptations(getMockAdaptations(contentUrl, marketCity));
    } catch {
      setAdaptations([]);
    } finally {
      setLoading(false);
    }
  }, [contentUrl, marketCity]);

  useEffect(() => {
    fetchAdaptations();
  }, [fetchAdaptations]);

  return { adaptations, loading, refresh: fetchAdaptations };
}
