# GarutiApp — Team Setup Guide

**Last Updated:** March 31, 2026
**Status:** Phase 1-2 Complete (Auth + Database + Core UI + Daily Digest Engine)

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
│   └── (tabs)/                   # Main app screens (protected — requires auth)
│       ├── _layout.tsx           # Bottom tab navigator (Digest, Tracker, Coach, Profile)
│       ├── index.tsx             # Daily Digest — top content, adaptations, streak, pull-to-refresh
│       ├── tracker.tsx           # Conversation Tracker — stats, bar chart, contacts
│       ├── coach.tsx             # Coaching Home — sessions, 90-day tracker, pods
│       └── profile.tsx           # Profile — user info, progress, settings
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
│   │   └── mock-digest.ts        # Mock data for demos (realistic Cape Coral RE content)
│   ├── hooks/
│   │   ├── useAuth.ts            # Auth hook (signUp, signIn, signOut, resetPassword, updateProfile)
│   │   ├── useDigest.ts          # Daily digest data hook (mock now, Supabase-ready)
│   │   └── useAdaptations.ts     # AI adaptation data hook for a specific post
│   ├── lib/
│   │   ├── supabase.ts           # Supabase client with AsyncStorage persistence
│   │   ├── gemini.ts             # Google Gemini AI — generates 5 adaptations per post ($0/mo)
│   │   ├── content-pipeline.ts   # Orchestrator: discovery → engagement → ranking → AI
│   │   └── discovery/
│   │       ├── index.ts          # Barrel exports for all discovery clients
│   │       ├── google-search.ts  # Google Custom Search API ($0 — 100 queries/day free)
│   │       ├── youtube.ts        # YouTube Data API v3 ($0 — 10K calls/day free)
│   │       ├── reddit.ts         # Reddit JSON API ($0 — no key needed, append .json)
│   │       └── twitter.ts        # Twitter/X API v2 ($0 — 1,500 reads/mo free)
│   ├── providers/
│   │   └── AuthProvider.tsx      # App-wide auth context provider
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

## Next Steps (Phase 3: Conversation Tracker)

Phase 3 builds the conversation tracking system so agents can log DMs, comments, and calls with source attribution. This is the data that proves ROI and triggers the coaching upsell.

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
