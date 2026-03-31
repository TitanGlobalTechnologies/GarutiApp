import { useState, useMemo, useCallback } from "react";

// TODO: Replace with Supabase state when connected

export interface RoutineStep {
  id: number;
  title: string;
  description: string;
  durationMin: number;
  status: "done" | "current" | "pending";
}

export function useRoutine() {
  const [steps, setSteps] = useState<RoutineStep[]>([
    { id: 1, title: "Open today's digest", description: "1 min — Review top 3 local Reels", durationMin: 1, status: "done" },
    { id: 2, title: "Pick your Reel for today", description: "1 min — Choose from 5 adaptations", durationMin: 1, status: "done" },
    { id: 3, title: "Customize your adaptation", description: "3 min — Make it yours", durationMin: 3, status: "done" },
    { id: 4, title: "Post it", description: "2 min — Share to Reels + Shorts", durationMin: 2, status: "current" },
    { id: 5, title: "Log a new conversation", description: "2 min — Track a lead from your content", durationMin: 2, status: "pending" },
    { id: 6, title: "See streak + weekly focus", description: "1 min — Set your intention", durationMin: 1, status: "pending" },
  ]);

  const [intention, setIntention] = useState(
    "I'm an agent who posts every day and starts conversations that lead to appointments."
  );

  const totalMinutes = steps.reduce((sum, s) => sum + s.durationMin, 0);
  const completedMinutes = steps
    .filter((s) => s.status === "done")
    .reduce((sum, s) => sum + s.durationMin, 0);

  const currentStep = useMemo(
    () => steps.find((s) => s.status === "current") || steps[0],
    [steps]
  );

  const progress = completedMinutes / totalMinutes;

  const completeStep = useCallback((stepId: number) => {
    setSteps((prev) => {
      const updated = prev.map((s) => {
        if (s.id === stepId) return { ...s, status: "done" as const };
        if (s.id === stepId + 1 && s.status === "pending") return { ...s, status: "current" as const };
        return s;
      });
      return updated;
    });
  }, []);

  const resetRoutine = useCallback(() => {
    setSteps((prev) =>
      prev.map((s, i) => ({
        ...s,
        status: i === 0 ? ("current" as const) : ("pending" as const),
      }))
    );
  }, []);

  const isComplete = steps.every((s) => s.status === "done");

  return {
    steps,
    currentStep,
    intention,
    setIntention,
    totalMinutes,
    completedMinutes,
    progress,
    completeStep,
    resetRoutine,
    isComplete,
  };
}
