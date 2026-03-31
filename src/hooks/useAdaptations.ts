import { useState, useEffect, useCallback } from "react";
import { getMockAdaptations } from "../data/mock-digest";
import type { ContentAdaptation } from "../lib/gemini";

// TODO: Replace with Supabase query + Gemini API when pipeline is running
// When live, this hook will:
// 1. Check Supabase for cached adaptations for this content URL + user
// 2. If none, call Gemini via edge function with user's market + content style
// 3. Store results in Supabase for caching

export function useAdaptations(contentUrl: string, marketCity: string, contentStyle?: string) {
  const [adaptations, setAdaptations] = useState<ContentAdaptation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdaptations = useCallback(async () => {
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 300));
      // contentStyle will be passed to Gemini prompt when live:
      // generateAdaptations({ ..., agentStyle: contentStyle })
      setAdaptations(getMockAdaptations(contentUrl, marketCity));
    } catch {
      setAdaptations([]);
    } finally {
      setLoading(false);
    }
  }, [contentUrl, marketCity, contentStyle]);

  useEffect(() => {
    fetchAdaptations();
  }, [fetchAdaptations]);

  return { adaptations, loading, refresh: fetchAdaptations };
}
