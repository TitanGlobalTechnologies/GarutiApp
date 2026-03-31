import { useState, useEffect, useCallback } from "react";

// TODO: Replace with Supabase + Gemini AI weekly analysis when connected

export interface FocusAction {
  title: string;
  description: string;
  completed: boolean;
}

export interface WeeklyFocusData {
  weekNumber: number;
  focusTitle: string;
  focusDescription: string;
  actions: FocusAction[];
  aiInsight: string;
}

export function useWeeklyFocus() {
  const [focus, setFocus] = useState<WeeklyFocusData>({
    weekNumber: 6,
    focusTitle: "Improve Conversation Starters",
    focusDescription:
      "Your Reels are getting views (avg 2.1K) but your DM conversion is 1.8% — below the 3% target. This week: focus on stronger calls-to-action in your hooks.",
    actions: [
      {
        title: "End every Reel with a question",
        description: 'Instead of "DM me" — ask "What neighborhood are you looking in?"',
        completed: true,
      },
      {
        title: "Reply to every comment within 1 hour",
        description: "Speed = conversion. Set a phone timer.",
        completed: false,
      },
      {
        title: "Practice DM-to-call script 2x this week",
        description: "Use the coaching script from Week 4 session",
        completed: false,
      },
    ],
    aiInsight:
      "Based on your tracker data, your Instagram Reels generate 3x more conversations than YouTube Shorts. Consider doubling your Instagram posting frequency this week while maintaining 1 Short per day.",
  });
  const [loading, setLoading] = useState(true);

  const fetchFocus = useCallback(async () => {
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 300));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFocus();
  }, [fetchFocus]);

  function toggleAction(index: number) {
    setFocus((prev) => ({
      ...prev,
      actions: prev.actions.map((a, i) =>
        i === index ? { ...a, completed: !a.completed } : a
      ),
    }));
  }

  const completedActions = focus.actions.filter((a) => a.completed).length;
  const totalActions = focus.actions.length;
  const actionProgress = completedActions / totalActions;

  return {
    focus,
    loading,
    toggleAction,
    completedActions,
    totalActions,
    actionProgress,
    refresh: fetchFocus,
  };
}
