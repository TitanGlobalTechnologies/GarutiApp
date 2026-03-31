export type SubscriptionTier = "trial" | "saas" | "coaching" | "bundle";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "paused";
export type ConversationChannel = "dm" | "comment" | "call" | "email" | "other";
export type ConversationStatus =
  | "dm_received"
  | "in_conversation"
  | "appointment_set"
  | "follow_up_needed"
  | "closed_won"
  | "closed_lost";
export type ContentPlatform = "instagram" | "youtube" | "twitter" | "reddit" | "tiktok" | "facebook";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  market_city: string;
  market_state: string;
  experience_years: number | null;
  content_style: string | null;
  stripe_customer_id: string | null;
  subscription_tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string | null;
  onboarding_completed: boolean;
  notification_preferences: {
    digest: boolean;
    streak: boolean;
    coaching: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface ContentItem {
  id: string;
  platform: ContentPlatform;
  external_id: string;
  url: string;
  title: string | null;
  caption: string | null;
  creator_handle: string | null;
  creator_name: string | null;
  market_city: string;
  market_state: string;
  views: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  engagement_rate: number | null;
  relevance_score: number | null;
  thumbnail_url: string | null;
  discovered_at: string;
  content_date: string | null;
  is_flagged: boolean;
}

export interface Adaptation {
  id: string;
  content_item_id: string;
  user_id: string;
  version_number: number;
  hook_text: string;
  full_script: string;
  suggested_post_time: string | null;
  cta_text: string | null;
  is_selected: boolean;
  is_posted: boolean;
  created_at: string;
}

export interface DailyDigest {
  id: string;
  user_id: string;
  digest_date: string;
  market_city: string;
  market_state: string;
  content_item_ids: string[];
  top_adaptation_id: string | null;
  is_viewed: boolean;
  viewed_at: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  contact_name: string;
  source_content_id: string | null;
  channel: ConversationChannel;
  status: ConversationStatus;
  notes: string | null;
  last_activity_at: string;
  appointment_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Streak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  streak_freezes_remaining: number;
  created_at: string;
  updated_at: string;
}

export interface DailyActivity {
  id: string;
  user_id: string;
  activity_date: string;
  opened_digest: boolean;
  posted_content: boolean;
  logged_conversation: boolean;
  completed_routine: boolean;
  created_at: string;
}

export interface CoachingSession {
  id: string;
  cohort_id: string;
  week_number: number;
  theme: string;
  title: string;
  description: string | null;
  session_date: string;
  meeting_url: string | null;
  recording_url: string | null;
  prep_instructions: string | null;
  created_at: string;
}

export interface OnboardingProgress {
  user_id: string;
  step_1_opened_digest: boolean;
  step_2_browsed_adaptations: boolean;
  step_3_posted_first_reel: boolean;
  step_4_opened_tracker: boolean;
  step_5_logged_conversation: boolean;
  step_6_three_day_streak: boolean;
  step_7_three_posts_first_week: boolean;
  completed_at: string | null;
  created_at: string;
}
