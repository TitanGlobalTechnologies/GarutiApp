import { useState, useEffect, useCallback, useMemo } from "react";
import {
  MOCK_SESSIONS,
  MOCK_POD,
  MOCK_90DAY_PROGRESS,
  COACHING_CURRICULUM,
} from "../data/mock-coaching";
import type { CoachingSession } from "../types/database";

// TODO: Replace with Supabase queries when connected

export interface PodMember {
  id: string;
  name: string;
  market: string;
  avatarColor: string;
  initials: string;
  currentStreak: number;
  lastPosted: string;
  totalPosts: number;
  totalConversations: number;
}

export interface NinetyDayProgress {
  currentDay: number;
  totalDays: number;
  targetAppointments: number;
  stats: {
    totalPosts: number;
    totalConversations: number;
    totalAppointments: number;
    totalClosings: number;
  };
  paceStatus: "on_track" | "behind" | "ahead";
  paceMessage: string;
  milestones: Array<{ day: number; label: string; reached: boolean }>;
}

export interface CurriculumWeek {
  week: number;
  theme: string;
  title: string;
  description: string;
  prepInstructions: string;
  communityAssignment: string;
}

export function useCoaching() {
  const [sessions, setSessions] = useState<CoachingSession[]>([]);
  const [podMembers, setPodMembers] = useState<PodMember[]>([]);
  const [progress, setProgress] = useState<NinetyDayProgress>(MOCK_90DAY_PROGRESS);
  const [loading, setLoading] = useState(true);

  const fetchCoaching = useCallback(async () => {
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 400));
      setSessions(MOCK_SESSIONS);
      setPodMembers(MOCK_POD.members);
      setProgress(MOCK_90DAY_PROGRESS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoaching();
  }, [fetchCoaching]);

  // Find the next upcoming session
  const nextSession = useMemo(() => {
    const now = new Date();
    const upcoming = sessions
      .filter((s) => new Date(s.session_date) > now)
      .sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime());
    return upcoming[0] || null;
  }, [sessions]);

  // Find the current week number based on progress
  const currentWeek = useMemo(() => {
    return Math.ceil(progress.currentDay / 7);
  }, [progress.currentDay]);

  // Get curriculum for a specific week
  const getCurriculum = (week: number): CurriculumWeek | undefined => {
    return COACHING_CURRICULUM.find((c) => c.week === week);
  };

  // Days until next session
  const daysUntilNextSession = useMemo(() => {
    if (!nextSession) return null;
    const diff = new Date(nextSession.session_date).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [nextSession]);

  // Past sessions (with recordings)
  const pastSessions = useMemo(() => {
    const now = new Date();
    return sessions
      .filter((s) => new Date(s.session_date) <= now)
      .sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime());
  }, [sessions]);

  return {
    sessions,
    nextSession,
    pastSessions,
    currentWeek,
    daysUntilNextSession,
    podMembers,
    podName: MOCK_POD.name,
    progress,
    getCurriculum,
    loading,
    refresh: fetchCoaching,
  };
}
