import { useState, useEffect, useCallback } from "react";
import { getDigestForCity, SupportedCity } from "../data/live-digest";

export function useAdaptations(contentUrl: string, marketCity: string, contentStyle?: string) {
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchScript = useCallback(async () => {
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 200));

      // Search only within the user's city
      const cityItems = getDigestForCity(marketCity as SupportedCity);
      const item = cityItems.find((d) => d.url === contentUrl);
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

  const adaptations = script
    ? [{ versionNumber: 1, hook: "", fullScript: script, suggestedPostTime: "", cta: "" }]
    : [];

  return { adaptations, script, loading, refresh: fetchScript };
}
