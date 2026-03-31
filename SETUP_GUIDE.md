# GarutiApp — Team Setup Guide

**Last Updated:** March 31, 2026
**Status:** Phase 1-7 Complete (Full V1 + V2 demo-ready with mock data)

---

## What's Been Built So Far

### Commit History

| # | What Was Done | Files Changed |
|---|---|---|
| 1 | **Initial scaffold** — Expo SDK 54, TypeScript, Expo Router, 4 tabs, 8 UI components, NativeWind/Tailwind, dark theme | 30 files |
| 2 | **Implementation plan v1** — 8-phase dev plan, API guide, DB schema, risk register | 1 file |
| 3 | **Zero-cost architecture v2** — Replaced paid APIs with free alternatives ($0/mo MVP) | 2 files |
| 4 | **Phase 1: Auth + Database** — Full auth system, 14-table schema, protected routes, 4 auth screens | 21 files |
| 5 | **Phase 2: Daily Digest Engine** — Content discovery pipeline (Google Search → YouTube/Reddit/Twitter APIs), Gemini AI adaptation engine, Adaptation detail screen with V1-V5 selector + copy-to-clipboard | 12 files |
| 6 | **Phase 3: Conversation Tracker** — Full conversation logging (contact, channel, status, notes), pipeline view with status counts, weekly bar chart, conversation detail screen with status updates, "Log New" form with channel/status chips | 5 files |
| 7 | **Phase 4: Coaching + Gamification** — Full coaching home (12-week curriculum, next session, join button, past sessions with recordings), 90-day guarantee tracker with milestone timeline, accountability pods with member stats, streak system (milestones at 7/14/30/60/90 days, freeze logic), 9 badges/achievements, 7-step onboarding checklist, rebuilt profile with all systems integrated | 7 files |
| 8 | **Phases 5-7: Payments + Notifications + V2** — Pricing screen (3 tiers with feature lists), subscription management (cancel/pause/change), trial countdown banner, useSubscription hook with feature gating, notification preferences, trial banner component, Morning Routine screen (6-step guided flow with timer), Weekly Focus screen (AI-personalized priorities + action checklist + AI insight), 6-tab navigation (Digest/Routine/Tracker/Focus/Coach/Profile) | 12 files |

### Project Structure

```
GarutiApp/
├── app/                          # Expo Router screens
│   ├── _layout.tsx               # Root layout — auth check, phone frame wrapper
│   ├── auth/                     # Auth screens (unprotected)
│   │   ├── _layout.tsx           # Auth stack navigator
│   │   ├── welcome.tsx           # Landing page with value props + trial CTA
│   │   ├── signup.tsx            # Sign up (name, email, password, market city/state)
│   │   ├── signin.tsx            # Sign in + forgot password link
│   │   └── forgot-password.tsx   # Email reset flow with confirmation
│   ├── adaptation/               # Adaptation detail screens
│   │   └── [url].tsx             # View 5 AI adaptations for a post (V1-V5 selector, copy, mark posted)
│   ├── conversation/             # Conversation management screens
│   │   ├── new.tsx               # Log new conversation (contact, channel selector, status, notes)
│   │   └── [id].tsx              # Conversation detail (notes, appointment, status update, delete)
│   ├── subscription/             # Payments and subscription management
│   │   ├── pricing.tsx           # 3-tier pricing (SaaS $99, Bundle $449, Coaching $397) + trial banner
│   │   └── manage.tsx            # Current plan, trial countdown, cancel/pause, billing portal
│   └── (tabs)/                   # Main app screens (protected — requires auth)
│       ├── _layout.tsx           # Bottom tab navigator (6 tabs: Digest/Routine/Tracker/Focus/Coach/Profile)
│       ├── index.tsx             # Daily Digest — top content, adaptations, streak, pull-to-refresh
│       ├── routine.tsx           # Morning Routine (V2) — 6-step guided 10-min flow with timer
│       ├── tracker.tsx           # Conversation Tracker — stats, bar chart, pipeline, contacts
│       ├── focus.tsx             # Weekly Focus (V2) — AI priority, action checklist, insight, 90-day progress
│       ├── coach.tsx             # Coaching Home — sessions, 90-day tracker, pods, past recordings
│       └── profile.tsx           # Profile — streak, badges, onboarding, 90-day progress, settings
├── components/                   # Reusable UI components
│   ├── Badge.tsx                 # Status badge (orange/green/blue/red variants)
│   ├── Card.tsx                  # Card container with optional accent border
│   ├── CTAButton.tsx             # Full-width orange action button
│   ├── ItemRow.tsx               # List row with right-side element
│   ├── PhoneFrame.tsx            # Phone mockup wrapper for web (resizable)
│   ├── ProgressBar.tsx           # Animated progress bar
│   ├── SafeArea.tsx              # Cross-platform safe area (View on web, SafeAreaView on native)
│   ├── ScreenTitle.tsx           # Screen title text
│   ├── StatBox.tsx               # Stat display box (number + label)
│   └── StepItem.tsx              # Step/checklist item (done/current/pending)
├── src/
│   ├── constants/
│   │   └── theme.ts              # Colors, spacing, typography matching mockup
│   ├── data/
│   │   ├── mock-digest.ts        # Mock data for digest demos (realistic Cape Coral RE content)
│   │   ├── mock-conversations.ts # Mock conversation data + status/channel config maps
│   │   └── mock-coaching.ts      # 12-week curriculum, mock sessions, pods, 90-day progress
│   ├── hooks/
│   │   ├── useAuth.ts            # Auth hook (signUp, signIn, signOut, resetPassword, updateProfile)
│   │   ├── useDigest.ts          # Daily digest data hook (mock now, Supabase-ready)
│   │   ├── useAdaptations.ts     # AI adaptation data hook for a specific post
│   │   ├── useConversations.ts   # Conversations CRUD hook (add, update status, delete, filter)
│   │   ├── useConversations.ts   # Conversations CRUD hook (add, update status, delete, filter)
│   │   ├── useCoaching.ts        # Coaching sessions, pods, 90-day progress, curriculum
│   │   ├── useStreak.ts          # Streak tracking, milestones, badges, daily activities
│   │   ├── useOnboarding.ts      # 7-step onboarding checklist with progress tracking
│   │   ├── useSubscription.ts    # Stripe subscription state, trial countdown, feature gating
│   │   ├── useNotifications.ts   # Notification preferences + mock notification feed
│   │   ├── useRoutine.ts         # Morning routine 6-step flow with timer
│   │   └── useWeeklyFocus.ts     # AI weekly focus, action items, insight
│   ├── lib/
│   │   ├── alert.ts              # Cross-platform alert (window.alert on web, Alert.alert on native)
│   │   ├── supabase.ts           # Supabase client with AsyncStorage persistence + isDemoMode
│   │   ├── gemini.ts             # Google Gemini AI — generates 5 adaptations per post ($0/mo)
│   │   ├── content-pipeline.ts   # Orchestrator: discovery → engagement → ranking → AI
│   │   └── discovery/
│   │       ├── index.ts          # Barrel exports for all discovery clients
│   │       ├── google-search.ts  # Google Custom Search API ($0 — 100 queries/day free)
│   │       ├── youtube.ts        # YouTube Data API v3 ($0 — 10K calls/day free)
│   │       ├── reddit.ts         # Reddit JSON API ($0 — no key needed, append .json)
│   │       └── twitter.ts        # Twitter/X API v2 ($0 — 1,500 reads/mo free)
│   ├── providers/
│   │   ├── AuthProvider.tsx      # App-wide auth context provider
│   │   └── ConversationsProvider.tsx  # Shared conversation state across all screens
│   └── types/
│       └── database.ts           # TypeScript types for all 14 database tables
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # Full database schema (run in Supabase SQL Editor)
├── .env.example                  # All required environment variables (template)
├── IMPLEMENTATION_PLAN.md        # Full 18-week dev plan with API guide
├── CONTENT_DISCOVERY_STRATEGY.md # Zero-cost content discovery architecture
├── app.json                      # Expo config (dark mode, deep linking)
├── babel.config.js               # NativeWind babel preset
├── metro.config.js               # NativeWind metro plugin
├── tailwind.config.js            # Custom dark theme colors
├── global.css                    # Tailwind directives
├── tsconfig.json                 # TypeScript config
└── package.json                  # Dependencies and scripts
```

---

## Setup Instructions (Do These In Order)

### Step 1: Clone the Repo

```bash
git clone https://github.com/TitanGlobalTechnologies/GarutiApp.git
cd GarutiApp
npm install
```

### Step 2: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click **"New Project"**
   - Name: `garutiapp`
   - Database password: choose a strong password (save it somewhere safe)
   - Region: **East US (N. Virginia)** — closest to Florida target market
3. Wait ~2 minutes for the project to provision

### Step 3: Get Your Supabase Keys

1. In your Supabase project, go to **Settings → API**
2. Copy these two values:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon (public) key** — starts with `eyJhbG...`

### Step 4: Create Your .env.local File

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in your Supabase values:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...your-anon-key...
```

> **Important:** `.env.local` is gitignored. Never commit API keys to the repo.

### Step 5: Run the Database Migration

1. In your Supabase project, go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Open the file `supabase/migrations/001_initial_schema.sql` from the repo
4. Copy the **entire contents** and paste into the SQL Editor
5. Click **"Run"**
6. You should see "Success. No rows returned" — this is correct

**What this creates:**
- `profiles` — User profiles (auto-created on signup via trigger)
- `content_items` — Scraped Reels/Shorts/Posts from all platforms
- `adaptations` — AI-generated script adaptations (5 per content item)
- `daily_digests` — Daily content digests per user per market
- `conversations` — Logged DMs, comments, calls with status tracking
- `streaks` — Posting streak tracking (auto-created on signup)
- `daily_activities` — Daily action log (opened digest, posted, logged convo)
- `coaching_sessions` — 12-week coaching curriculum sessions
- `pods` — Accountability pods (3-4 agents per pod)
- `pod_members` — Pod membership join table
- `weekly_focus` — AI-personalized weekly priorities (V2)
- `user_devices` — Push notification tokens
- `onboarding_progress` — 7-step onboarding checklist (auto-created on signup)
- `email_events` — Email open/click tracking

All tables have **Row Level Security (RLS)** enabled. Users can only read/write their own data.

### Step 6: Enable Auth Providers (Optional)

Email/password auth works out of the box. For Google and Apple sign-in:

**Google OAuth:**
1. Supabase → **Authentication → Providers → Google**
2. Toggle ON
3. You'll need a Google Cloud OAuth Client ID ([instructions](https://supabase.com/docs/guides/auth/social-login/auth-google))

**Apple Sign-In:**
1. Supabase → **Authentication → Providers → Apple**
2. Toggle ON
3. Requires an Apple Developer account ($99/year)

> Both are optional for MVP. Email/password is sufficient to start.

### Step 7: Run the App

```bash
# Start the dev server (web)
npm run web

# Start for iOS (requires macOS + Xcode)
npm run ios

# Start for Android (requires Android Studio)
npm run android

# Start Expo dev server (QR code for Expo Go app)
npm start
```

The web version opens at `http://localhost:8081` with a phone mockup frame.

---

## How the Auth Flow Works

```
User opens app
  │
  ├─ Not logged in? → /auth/welcome (landing page)
  │   ├─ "Start 14-Day Free Trial" → /auth/signup
  │   │   └─ Fills form → Supabase creates user → auto-creates profile + streak + onboarding
  │   │   └─ "Check your email" confirmation → /auth/signin
  │   └─ "Already have an account?" → /auth/signin
  │       ├─ Enters email + password → Supabase auth → redirected to /(tabs)
  │       └─ "Forgot password?" → /auth/forgot-password → email reset
  │
  └─ Logged in? → /(tabs) (main app)
      ├─ Digest tab — daily content digest
      ├─ Tracker tab — conversation tracking
      ├─ Coach tab — coaching sessions
      └─ Profile tab — user info + settings
```

The root layout (`app/_layout.tsx`) checks auth state on every navigation. Unauthenticated users are always redirected to the welcome screen. Authenticated users are always redirected to the tabs.

---

## Key Design Decisions

| Decision | What We Chose | Why |
|---|---|---|
| Auth persistence | AsyncStorage via Supabase | Session survives app restart on all platforms |
| Shared state via providers | ConversationsProvider wraps app | Log a conversation on one screen, see it instantly on tracker — single source of truth |
| Demo mode | isDemoMode flag in supabase.ts | App runs fully without Supabase keys — mock user, mock data, all features work |
| Cross-platform alerts | showAlert/showConfirm in alert.ts | Alert.alert doesn't work on web — utility uses window.alert/confirm on web, Alert.alert on native |
| Auto-profile creation | Postgres trigger on `auth.users` INSERT | User always has a profile row — no race conditions |
| RLS on all tables | Row-level security policies | Users can only see their own data — no backend middleware needed |
| Trial defaults | 14-day trial, `subscription_tier: 'trial'` | Set automatically on signup — no manual activation needed |
| Phone frame on web | PhoneFrame component (web only) | Clients and team can preview the mobile experience in a browser |

---

## What's Working Now (Demo-Ready)

The app is **fully functional with mock data**. Your team can demo the entire flow without any API keys:

1. Open the app → Welcome screen with value props
2. Sign up (requires Supabase connection) → or view tabs directly in dev mode
3. **Daily Digest** → See 5 top-performing posts across Instagram, YouTube, Reddit
4. **Tap any post** → View 5 AI-generated script adaptations
5. **Switch versions** V1-V5 → Each has a unique hook, script, CTA, and posting time
6. **Copy to clipboard** → Hook, full script, or CTA individually
7. **Mark as Posted** → Logs to conversation tracker
8. **Pull to refresh** → Simulates fetching new digest
9. **Tracker tab** → See 14 conversations this week, 47 this month, 3 appointments
10. **Pipeline view** → DM Received (1), In Conversation (2), Appointment Set (1), Follow-up (1)
11. **Weekly bar chart** → Conversations per day with today highlighted
12. **Tap conversation** → Detail view with avatar, notes, status update buttons
13. **"+ Log New"** → Form with channel selector (DM/Comment/Call/Email), status chips, notes
14. **Update status** → Tap any status to move conversation through the pipeline
15. **Coach tab** → Next session card with "Join Session" button, 12-week curriculum
16. **90-Day Guarantee** → 3/10 appointments tracker with milestone timeline dots
17. **Accountability Pod** → See pod members' streaks, post counts, and last activity
18. **Past Sessions** → Watch recordings of completed coaching sessions
19. **Profile tab** → Streak card (🔥12 days, milestones at 7/14/30/60/90)
20. **Badges** → 6 earned (🎓📱💬📅🔥🏠), 3 locked (⚡🎯👑)
21. **Onboarding checklist** → 7/7 steps complete with progress bar
22. **90-Day Progress** → Posts (38), Conversations (47), Appointments (3), Closings (1)
23. **Routine tab (V2)** → 6-step morning routine with timer (5min/10min)
24. **Tap steps** → Complete each step in order, current step highlighted in orange
25. **Today's Intention** → Daily affirmation card
26. **Active step** → Detailed instructions with script hook for "Post it" step
27. **Routine complete** → 🎉 celebration card with "Reset for Testing" option
28. **Focus tab (V2)** → AI-personalized priority ("Improve Conversation Starters")
29. **Weekly actions** → Tap to toggle 3 action items (checkable checklist)
30. **AI Insight** → 🤖 data-driven recommendation from tracker data
31. **Pricing screen** → 3-tier cards (SaaS $99 / Bundle $449 / Coaching $397)
32. **Trial banner** → "8 days left" countdown with "Choose Plan" link
33. **Manage subscription** → Current plan, cancel/pause/change, billing portal

When API keys are added to `.env.local`, the app switches from mock data to live data automatically.

## Activating Live Data (Optional — For Production)

To switch from mock data to live content discovery, add these free API keys:

| Key | Where to Get It | Cost | What It Unlocks |
|-----|----------------|------|-----------------|
| `GOOGLE_CUSTOM_SEARCH_KEY` | [Google Cloud Console](https://console.cloud.google.com) → Enable Custom Search API | $0 (100/day) | Content discovery across all platforms |
| `GOOGLE_CUSTOM_SEARCH_CX` | [Programmable Search Engine](https://programmablesearchengine.google.com) | $0 | Search engine ID for the above |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com) | $0 (1M tokens/day) | AI-generated adaptations |
| `YOUTUBE_API_KEY` | [Google Cloud Console](https://console.cloud.google.com) → Enable YouTube Data API v3 | $0 (10K/day) | YouTube video engagement stats |
| `TWITTER_BEARER_TOKEN` | [Twitter Developer Portal](https://developer.twitter.com) | $0 (1,500/mo) | Tweet engagement stats |

Reddit requires no API key — it's completely open.

See [CONTENT_DISCOVERY_STRATEGY.md](./CONTENT_DISCOVERY_STRATEGY.md) for the full technical architecture.

## Next Steps (Phase 8: Testing, Polish & Launch)

All features are built. The remaining work is:
1. **Connect Supabase** — Create project, run migration, add keys to `.env.local`
2. **Connect API keys** — Google Search, Gemini, YouTube, Twitter (all free)
3. **Connect Stripe** — Set up products, webhooks, go live
4. **Connect Resend** — Email sequences (trial, churn, coaching upsell)
5. **App Store submission** — iOS build via `eas build`, screenshots, metadata
6. **QA testing** — Full user journey on iOS, Android, and Web

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for the complete 18-week roadmap.

---

## Useful Commands

| Command | What It Does |
|---------|-------------|
| `npm start` | Start Expo dev server (QR code for phone) |
| `npm run web` | Start web version at localhost:8081 |
| `npm run ios` | Run on iOS simulator (macOS only) |
| `npm run android` | Run on Android emulator |
| `npx expo install [package]` | Install an Expo-compatible package |
| `npx eas build --platform ios` | Build for iOS App Store |
| `npx eas build --platform android` | Build for Google Play |

---

## Repo Links

- **GitHub:** https://github.com/TitanGlobalTechnologies/GarutiApp
- **Implementation Plan:** [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)
- **Content Discovery Strategy:** [CONTENT_DISCOVERY_STRATEGY.md](./CONTENT_DISCOVERY_STRATEGY.md)
- **Database Migration:** [supabase/migrations/001_initial_schema.sql](./supabase/migrations/001_initial_schema.sql)
- **Env Template:** [.env.example](./.env.example)
