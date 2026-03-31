import { useState, useEffect, useCallback } from "react";
import { LIVE_DIGEST } from "../data/live-digest";

// Returns the cached script for a specific Reel
// Script was generated once by Claude and cached forever

export function useAdaptations(contentUrl: string, marketCity: string, contentStyle?: string) {
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchScript = useCallback(async () => {
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 200));

      // Find the script from live digest data
      const item = LIVE_DIGEST.find((d) => d.url === contentUrl);
      if (item) {
        setScript(item.script);
      } else {
        setScript("Script not found for this reel. Run the scraper to generate it.");
      }
    } catch {
      setScript("");
    } finally {
      setLoading(false);
    }
  }, [contentUrl, marketCity, contentStyle]);

  useEffect(() => {
    fetchScript();
  }, [fetchScript]);

  // Return in the format the digest screen expects
  const adaptations = script
    ? [{ versionNumber: 1, hook: "", fullScript: script, suggestedPostTime: "", cta: "" }]
    : [];

  return { adaptations, script, loading, refresh: fetchScript };
}
