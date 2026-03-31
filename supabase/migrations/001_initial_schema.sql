-- LAE Initial Schema
-- Run this in Supabase SQL Editor or via supabase db push

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  market_city TEXT NOT NULL DEFAULT '',
  market_state TEXT NOT NULL DEFAULT '',
  experience_years INTEGER,
  content_style TEXT,
  stripe_customer_id TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'trial'
    CHECK (subscription_tier IN ('trial', 'saas', 'coaching', 'bundle')),
  subscription_status TEXT NOT NULL DEFAULT 'trialing'
    CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled', 'paused')),
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  notification_preferences JSONB DEFAULT '{"digest": true, "streak": true, "coaching": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, market_city, market_state)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'market_city', ''),
    COALESCE(NEW.raw_user_meta_data->>'market_state', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- CONTENT ITEMS (scraped Reels/Shorts/Posts)
-- ============================================
CREATE TABLE public.content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL
    CHECK (platform IN ('instagram', 'youtube', 'twitter', 'reddit', 'tiktok', 'facebook')),
  external_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  caption TEXT,
  creator_handle TEXT,
  creator_name TEXT,
  market_city TEXT NOT NULL,
  market_state TEXT NOT NULL,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2),
  relevance_score DECIMAL(5,2),
  thumbnail_url TEXT,
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  content_date TIMESTAMPTZ,
  is_flagged BOOLEAN DEFAULT FALSE,
  UNIQUE(platform, external_id)
);

ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;

-- Content items are readable by all authenticated users
CREATE POLICY "Authenticated users can read content"
  ON public.content_items FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- AI ADAPTATIONS
-- ============================================
CREATE TABLE public.adaptations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL CHECK (version_number BETWEEN 1 AND 5),
  hook_text TEXT NOT NULL,
  full_script TEXT NOT NULL,
  suggested_post_time TEXT,
  cta_text TEXT,
  is_selected BOOLEAN DEFAULT FALSE,
  is_posted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.adaptations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own adaptations"
  ON public.adaptations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own adaptations"
  ON public.adaptations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert adaptations"
  ON public.adaptations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- DAILY DIGESTS
-- ============================================
CREATE TABLE public.daily_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  digest_date DATE NOT NULL,
  market_city TEXT NOT NULL,
  market_state TEXT NOT NULL,
  content_item_ids UUID[] NOT NULL,
  top_adaptation_id UUID REFERENCES adaptations(id),
  is_viewed BOOLEAN DEFAULT FALSE,
  viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, digest_date)
);

ALTER TABLE public.daily_digests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own digests"
  ON public.daily_digests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own digests"
  ON public.daily_digests FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- CONVERSATIONS
-- ============================================
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  source_content_id UUID REFERENCES content_items(id),
  channel TEXT NOT NULL DEFAULT 'dm'
    CHECK (channel IN ('dm', 'comment', 'call', 'email', 'other')),
  status TEXT NOT NULL DEFAULT 'dm_received'
    CHECK (status IN ('dm_received', 'in_conversation', 'appointment_set', 'follow_up_needed', 'closed_won', 'closed_lost')),
  notes TEXT,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  appointment_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own conversations"
  ON public.conversations FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- STREAKS
-- ============================================
CREATE TABLE public.streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  streak_freezes_remaining INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own streak"
  ON public.streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own streak"
  ON public.streaks FOR UPDATE
  USING (auth.uid() = user_id);

-- Auto-create streak on profile creation
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.streaks (user_id) VALUES (NEW.id);
  INSERT INTO public.onboarding_progress (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile();

-- ============================================
-- DAILY ACTIVITIES (for streak calculation)
-- ============================================
CREATE TABLE public.daily_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  opened_digest BOOLEAN DEFAULT FALSE,
  posted_content BOOLEAN DEFAULT FALSE,
  logged_conversation BOOLEAN DEFAULT FALSE,
  completed_routine BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, activity_date)
);

ALTER TABLE public.daily_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own activities"
  ON public.daily_activities FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- COACHING SESSIONS
-- ============================================
CREATE TABLE public.coaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id UUID NOT NULL,
  week_number INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 12),
  theme TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  session_date TIMESTAMPTZ NOT NULL,
  meeting_url TEXT,
  recording_url TEXT,
  prep_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.coaching_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read sessions"
  ON public.coaching_sessions FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- ACCOUNTABILITY PODS
-- ============================================
CREATE TABLE public.pods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cohort_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pods ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.pod_members (
  pod_id UUID REFERENCES pods(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (pod_id, user_id)
);

ALTER TABLE public.pod_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pod members can read own pods"
  ON public.pods FOR SELECT
  TO authenticated
  USING (id IN (SELECT pod_id FROM pod_members WHERE user_id = auth.uid()));

CREATE POLICY "Pod members can read own membership"
  ON public.pod_members FOR SELECT
  USING (user_id = auth.uid() OR pod_id IN (SELECT pod_id FROM pod_members WHERE user_id = auth.uid()));

-- ============================================
-- WEEKLY FOCUS (V2)
-- ============================================
CREATE TABLE public.weekly_focus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  focus_title TEXT NOT NULL,
  focus_description TEXT,
  action_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_analysis TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

ALTER TABLE public.weekly_focus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own weekly focus"
  ON public.weekly_focus FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- USER DEVICES (push notification tokens)
-- ============================================
CREATE TABLE public.user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  push_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, push_token)
);

ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own devices"
  ON public.user_devices FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- ONBOARDING PROGRESS
-- ============================================
CREATE TABLE public.onboarding_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  step_1_opened_digest BOOLEAN DEFAULT FALSE,
  step_2_browsed_adaptations BOOLEAN DEFAULT FALSE,
  step_3_posted_first_reel BOOLEAN DEFAULT FALSE,
  step_4_opened_tracker BOOLEAN DEFAULT FALSE,
  step_5_logged_conversation BOOLEAN DEFAULT FALSE,
  step_6_three_day_streak BOOLEAN DEFAULT FALSE,
  step_7_three_posts_first_week BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own onboarding"
  ON public.onboarding_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding"
  ON public.onboarding_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- EMAIL EVENT TRACKING
-- ============================================
CREATE TABLE public.email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ
);

ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own email events"
  ON public.email_events FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_content_items_market ON content_items(market_city, market_state, discovered_at DESC);
CREATE INDEX idx_adaptations_user ON adaptations(user_id, created_at DESC);
CREATE INDEX idx_conversations_user ON conversations(user_id, status, created_at DESC);
CREATE INDEX idx_daily_digests_user ON daily_digests(user_id, digest_date DESC);
CREATE INDEX idx_daily_activities_user ON daily_activities(user_id, activity_date DESC);
CREATE INDEX idx_email_events_user ON email_events(user_id, email_type);
