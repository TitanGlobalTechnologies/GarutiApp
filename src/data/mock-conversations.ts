/**
 * Mock conversation data for development and demos
 */

import type { Conversation, ConversationStatus, ConversationChannel } from "../types/database";

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "conv-1",
    user_id: "mock-user",
    contact_name: "Maria G.",
    source_content_id: null,
    channel: "dm",
    status: "appointment_set",
    notes: "Interested in Cape Coral waterfront. Appointment set for Thursday 2PM.",
    last_activity_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2h ago
    appointment_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "conv-2",
    user_id: "mock-user",
    contact_name: "David R.",
    source_content_id: null,
    channel: "comment",
    status: "in_conversation",
    notes: "Asked about neighborhoods under $400K. Sent him the list.",
    last_activity_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    appointment_date: null,
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "conv-3",
    user_id: "mock-user",
    contact_name: "Jennifer T.",
    source_content_id: null,
    channel: "dm",
    status: "dm_received",
    notes: "Saw insurance hack Reel, asked about FL buyer tips.",
    last_activity_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    appointment_date: null,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "conv-4",
    user_id: "mock-user",
    contact_name: "Mike S.",
    source_content_id: null,
    channel: "call",
    status: "follow_up_needed",
    notes: "Called after seeing new construction Reel. Wants to see 3 properties. Need to schedule.",
    last_activity_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    appointment_date: null,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "conv-5",
    user_id: "mock-user",
    contact_name: "Sarah L.",
    source_content_id: null,
    channel: "dm",
    status: "closed_won",
    notes: "Closed! Found her a 3-bed in Zone X. $385K. Commission: $11,550.",
    last_activity_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    appointment_date: null,
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "conv-6",
    user_id: "mock-user",
    contact_name: "Tom B.",
    source_content_id: null,
    channel: "email",
    status: "in_conversation",
    notes: "Relocating from Ohio. Looking for $300-400K range.",
    last_activity_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    appointment_date: null,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
];

export const MOCK_WEEKLY_STATS = {
  thisWeek: 14,
  thisMonth: 47,
  appointments: 3,
  closings: 1,
  weeklyTrend: [
    { day: "Mon", count: 3 },
    { day: "Tue", count: 5 },
    { day: "Wed", count: 4 },
    { day: "Thu", count: 6 },
    { day: "Fri", count: 5 },
    { day: "Sat", count: 2 },
    { day: "Sun", count: 1 },
  ],
};

export const STATUS_CONFIG: Record<ConversationStatus, { label: string; variant: "orange" | "green" | "blue" | "red" }> = {
  dm_received: { label: "DM Received", variant: "orange" },
  in_conversation: { label: "In Conversation", variant: "blue" },
  appointment_set: { label: "Appointment Set", variant: "green" },
  follow_up_needed: { label: "Follow-up Needed", variant: "red" },
  closed_won: { label: "Closed Won", variant: "green" },
  closed_lost: { label: "Closed Lost", variant: "red" },
};

export const CHANNEL_ICONS: Record<ConversationChannel, string> = {
  dm: "💬",
  comment: "💭",
  call: "📞",
  email: "📧",
  other: "📱",
};
