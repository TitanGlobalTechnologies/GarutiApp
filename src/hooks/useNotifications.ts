import { useState, useCallback } from "react";

// TODO: Replace with expo-notifications + Supabase when configured
// This hook manages notification preferences and simulates push setup

export interface NotificationPreferences {
  dailyDigest: boolean;
  digestTime: string; // "08:30"
  streakReminder: boolean;
  coachingReminder: boolean;
  conversationFollowUp: boolean;
  trialEnding: boolean;
  weeklyReport: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  type: "digest" | "streak" | "coaching" | "conversation" | "system";
}

const DEFAULT_PREFS: NotificationPreferences = {
  dailyDigest: true,
  digestTime: "08:30",
  streakReminder: true,
  coachingReminder: true,
  conversationFollowUp: true,
  trialEnding: true,
  weeklyReport: true,
};

const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "n1",
    title: "Your Daily Digest is Ready",
    body: "3 new top Reels in Cape Coral. See your adaptations →",
    time: "8:30 AM",
    read: true,
    type: "digest",
  },
  {
    id: "n2",
    title: "🔥 Keep Your Streak!",
    body: "Post today to keep your 12-day streak alive. You're 2 days from ⚡!",
    time: "10:00 AM",
    read: false,
    type: "streak",
  },
  {
    id: "n3",
    title: "Coaching Session Tomorrow",
    body: "Week 6: Turning DMs Into Appointments — Thursday 12:00 PM ET",
    time: "Yesterday",
    read: true,
    type: "coaching",
  },
  {
    id: "n4",
    title: "Follow-up Needed",
    body: "You haven't followed up with Mike S. in 2 days",
    time: "Yesterday",
    read: false,
    type: "conversation",
  },
  {
    id: "n5",
    title: "Trial Ending Soon",
    body: "8 days left. Choose a plan to keep your data.",
    time: "2 days ago",
    read: true,
    type: "system",
  },
];

export function useNotifications() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);
  const [pushPermission, setPushPermission] = useState<"granted" | "denied" | "undetermined">("undetermined");

  async function requestPushPermission() {
    // TODO: Call Notifications.requestPermissionsAsync()
    // For now, simulate granting
    setPushPermission("granted");
    return "granted";
  }

  const updatePreference = useCallback(
    (key: keyof NotificationPreferences, value: boolean | string) => {
      setPreferences((prev) => ({ ...prev, [key]: value }));
      // TODO: Persist to Supabase profiles.notification_preferences
    },
    []
  );

  function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    preferences,
    updatePreference,
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    pushPermission,
    requestPushPermission,
  };
}
