import { useState, useEffect, useCallback } from "react";
import { MOCK_CONVERSATIONS, MOCK_WEEKLY_STATS } from "../data/mock-conversations";
import type { Conversation, ConversationStatus, ConversationChannel } from "../types/database";

// TODO: Replace with Supabase queries when connected

export interface WeeklyStats {
  thisWeek: number;
  thisMonth: number;
  appointments: number;
  closings: number;
  weeklyTrend: Array<{ day: string; count: number }>;
}

export interface NewConversation {
  contactName: string;
  channel: ConversationChannel;
  status: ConversationStatus;
  notes: string;
  sourceContentId?: string;
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [stats, setStats] = useState<WeeklyStats>(MOCK_WEEKLY_STATS);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 400));
      setConversations(MOCK_CONVERSATIONS);
      setStats(MOCK_WEEKLY_STATS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  async function addConversation(newConvo: NewConversation): Promise<Conversation> {
    const convo: Conversation = {
      id: `conv-${Date.now()}`,
      user_id: "mock-user",
      contact_name: newConvo.contactName,
      source_content_id: newConvo.sourceContentId || null,
      channel: newConvo.channel,
      status: newConvo.status,
      notes: newConvo.notes || null,
      last_activity_at: new Date().toISOString(),
      appointment_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setConversations((prev) => [convo, ...prev]);
    setStats((prev) => ({
      ...prev,
      thisWeek: prev.thisWeek + 1,
      thisMonth: prev.thisMonth + 1,
    }));

    return convo;
  }

  async function updateStatus(id: string, status: ConversationStatus) {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, status, updated_at: new Date().toISOString(), last_activity_at: new Date().toISOString() }
          : c
      )
    );

    if (status === "appointment_set") {
      setStats((prev) => ({ ...prev, appointments: prev.appointments + 1 }));
    }
  }

  async function deleteConversation(id: string) {
    setConversations((prev) => prev.filter((c) => c.id !== id));
  }

  const byStatus = (status: ConversationStatus) =>
    conversations.filter((c) => c.status === status);

  return {
    conversations,
    stats,
    loading,
    addConversation,
    updateStatus,
    deleteConversation,
    byStatus,
    refresh: fetchConversations,
  };
}
