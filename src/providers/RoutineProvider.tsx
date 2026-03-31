import React, { createContext, useContext, useState, useCallback } from "react";

/**
 * Tracks which routine step the user just tapped so destination screens
 * can show a visual highlight cue on the relevant area.
 *
 * Flow: User taps step in Routine → we set activeHighlight → navigate →
 * destination screen reads activeHighlight and shows a glow/pulse →
 * highlight auto-clears after a few seconds.
 */

export type HighlightTarget =
  | "digest-screen"
  | "digest-reels-list"
  | "adaptation-versions"
  | "adaptation-post-button"
  | "tracker-log-button"
  | "focus-screen"
  | null;

interface RoutineContextType {
  activeHighlight: HighlightTarget;
  setHighlight: (target: HighlightTarget, autoClearMs?: number) => void;
  clearHighlight: () => void;
}

const RoutineContext = createContext<RoutineContextType>({
  activeHighlight: null,
  setHighlight: () => {},
  clearHighlight: () => {},
});

export function RoutineProvider({ children }: { children: React.ReactNode }) {
  const [activeHighlight, setActiveHighlight] = useState<HighlightTarget>(null);

  const setHighlight = useCallback((target: HighlightTarget, autoClearMs = 3000) => {
    setActiveHighlight(target);
    if (target && autoClearMs > 0) {
      setTimeout(() => setActiveHighlight(null), autoClearMs);
    }
  }, []);

  const clearHighlight = useCallback(() => {
    setActiveHighlight(null);
  }, []);

  return (
    <RoutineContext.Provider value={{ activeHighlight, setHighlight, clearHighlight }}>
      {children}
    </RoutineContext.Provider>
  );
}

export function useRoutineHighlight() {
  return useContext(RoutineContext);
}
