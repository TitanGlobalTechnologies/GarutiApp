import { useState, useEffect, useCallback, useMemo } from "react";

// TODO: Replace with Supabase queries when connected

export interface OnboardingStep {
  key: string;
  label: string;
  description: string;
  completed: boolean;
  icon: string;
}

export function useOnboarding() {
  const [steps, setSteps] = useState<OnboardingStep[]>([
    {
      key: "step_1_opened_digest",
      label: "Open your first daily digest",
      description: "See what's working in your market",
      completed: true,
      icon: "📊",
    },
    {
      key: "step_2_browsed_adaptations",
      label: "Browse the 5 adaptations",
      description: "Review AI-generated scripts for your market",
      completed: true,
      icon: "🤖",
    },
    {
      key: "step_3_posted_first_reel",
      label: "Post your first adapted Reel",
      description: "Copy a script, record, and post it",
      completed: true,
      icon: "📱",
    },
    {
      key: "step_4_opened_tracker",
      label: "Open the conversation tracker",
      description: "See where your leads are coming from",
      completed: true,
      icon: "📈",
    },
    {
      key: "step_5_logged_conversation",
      label: "Log your first conversation",
      description: "Track a DM, comment, or call from your content",
      completed: true,
      icon: "💬",
    },
    {
      key: "step_6_three_day_streak",
      label: "Open your digest 3 days in a row",
      description: "Build the daily habit",
      completed: true,
      icon: "🔥",
    },
    {
      key: "step_7_three_posts_first_week",
      label: "Post 3 adapted Reels in your first week",
      description: "Consistency is what drives results",
      completed: true,
      icon: "🎯",
    },
  ]);
  const [loading, setLoading] = useState(true);

  const fetchOnboarding = useCallback(async () => {
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 200));
      // Mock: all steps completed (since mock user is on day 42)
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOnboarding();
  }, [fetchOnboarding]);

  const completedCount = useMemo(
    () => steps.filter((s) => s.completed).length,
    [steps]
  );

  const totalSteps = steps.length;
  const progress = completedCount / totalSteps;
  const isComplete = completedCount === totalSteps;

  // For new users — which step to highlight
  const currentStep = useMemo(
    () => steps.find((s) => !s.completed) || steps[steps.length - 1],
    [steps]
  );

  async function completeStep(key: string) {
    setSteps((prev) =>
      prev.map((s) => (s.key === key ? { ...s, completed: true } : s))
    );
  }

  return {
    steps,
    completedCount,
    totalSteps,
    progress,
    isComplete,
    currentStep,
    completeStep,
    loading,
    refresh: fetchOnboarding,
  };
}
