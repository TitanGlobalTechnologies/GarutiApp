import { useState, useEffect, useCallback, useMemo } from "react";

// TODO: Replace with Supabase queries when connected

export interface StreakMilestone {
  days: number;
  icon: string;
  label: string;
  reached: boolean;
}

export interface Badge {
  id: string;
  icon: string;
  label: string;
  description: string;
  earned: boolean;
  earnedAt: string | null;
}

export interface DailyActivity {
  openedDigest: boolean;
  postedContent: boolean;
  loggedConversation: boolean;
  completedRoutine: boolean;
}

export function useStreak() {
  const [currentStreak, setCurrentStreak] = useState(12);
  const [longestStreak, setLongestStreak] = useState(12);
  const [freezesRemaining, setFreezesRemaining] = useState(1);
  const [todayActivity, setTodayActivity] = useState<DailyActivity>({
    openedDigest: true,
    postedContent: true,
    loggedConversation: false,
    completedRoutine: false,
  });
  const [loading, setLoading] = useState(true);

  const fetchStreak = useCallback(async () => {
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 200));
      // Mock data loaded in state defaults above
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStreak();
  }, [fetchStreak]);

  // Streak milestones
  const milestones: StreakMilestone[] = useMemo(
    () => [
      { days: 7, icon: "🔥", label: "1 Week", reached: currentStreak >= 7 },
      { days: 14, icon: "⚡", label: "2 Weeks", reached: currentStreak >= 14 },
      { days: 30, icon: "💎", label: "1 Month", reached: currentStreak >= 30 },
      { days: 60, icon: "🏆", label: "2 Months", reached: currentStreak >= 60 },
      { days: 90, icon: "👑", label: "90 Days", reached: currentStreak >= 90 },
    ],
    [currentStreak]
  );

  // Next milestone
  const nextMilestone = useMemo(
    () => milestones.find((m) => !m.reached) || milestones[milestones.length - 1],
    [milestones]
  );

  // Badges / achievements
  const badges: Badge[] = useMemo(
    () => [
      {
        id: "onboarding",
        icon: "🎓",
        label: "Onboarding Complete",
        description: "Completed all 7 onboarding steps",
        earned: true,
        earnedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "first-post",
        icon: "📱",
        label: "First Post",
        description: "Posted your first adapted Reel/Short",
        earned: true,
        earnedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "first-conversation",
        icon: "💬",
        label: "First Conversation",
        description: "Logged your first conversation from content",
        earned: true,
        earnedAt: new Date(Date.now() - 38 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "first-appointment",
        icon: "📅",
        label: "First Appointment",
        description: "Set your first appointment from a content lead",
        earned: true,
        earnedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "7-day-streak",
        icon: "🔥",
        label: "7-Day Streak",
        description: "Posted content 7 days in a row",
        earned: true,
        earnedAt: new Date(Date.now() - 33 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "first-closing",
        icon: "🏠",
        label: "First Closing",
        description: "Closed your first deal from content-driven lead",
        earned: true,
        earnedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "14-day-streak",
        icon: "⚡",
        label: "14-Day Streak",
        description: "Posted content 14 days in a row",
        earned: false,
        earnedAt: null,
      },
      {
        id: "10-appointments",
        icon: "🎯",
        label: "Guarantee Met",
        description: "Hit 10 appointments in 90 days",
        earned: false,
        earnedAt: null,
      },
      {
        id: "90-day-graduate",
        icon: "👑",
        label: "90-Day Graduate",
        description: "Completed the full 90-day program",
        earned: false,
        earnedAt: null,
      },
    ],
    []
  );

  // Log a daily activity
  async function logActivity(activity: Partial<DailyActivity>) {
    setTodayActivity((prev) => ({ ...prev, ...activity }));
    // Check if any activity was logged today — maintain streak
  }

  // Use a streak freeze
  async function useFreeze() {
    if (freezesRemaining > 0) {
      setFreezesRemaining((prev) => prev - 1);
      return true;
    }
    return false;
  }

  const earnedBadges = badges.filter((b) => b.earned);
  const unearnedBadges = badges.filter((b) => !b.earned);

  return {
    currentStreak,
    longestStreak,
    freezesRemaining,
    todayActivity,
    milestones,
    nextMilestone,
    badges,
    earnedBadges,
    unearnedBadges,
    logActivity,
    useFreeze,
    loading,
    refresh: fetchStreak,
  };
}
