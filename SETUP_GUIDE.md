# GarutiApp — Team Setup Guide

**Last Updated:** March 30, 2026
**Status:** Phase 1 Complete (Auth + Database + Core UI)

---

## What's Been Built So Far

### Commit History

| # | What Was Done | Files Changed |
|---|---|---|
| 1 | **Initial scaffold** — Expo SDK 54, TypeScript, Expo Router, 4 tabs, 8 UI components, NativeWind/Tailwind, dark theme | 30 files |
| 2 | **Implementation plan v1** — 8-phase dev plan, API guide, DB schema, risk register | 1 file |
| 3 | **Zero-cost architecture v2** — Replaced paid APIs with free alternatives ($0/mo MVP) | 2 files |
| 4 | **Phase 1: Auth + Database** — Full auth system, 14-table schema, protected routes, 4 auth screens | 21 files |

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
│   └── (tabs)/                   # Main app screens (protected — requires auth)
│       ├── _layout.tsx           # Bottom tab navigator (Digest, Tracker, Coach, Profile)
│       ├── index.tsx             # Daily Digest — top Reels, adaptations, streak
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
│   ├── hooks/
│   │   └── useAuth.ts            # Auth hook (signUp, signIn, signOut, resetPassword, updateProfile)
│   ├── lib/
│   │   └── supabase.ts           # Supabase client with AsyncStorage persistence
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

## Next Steps (Phase 2: Daily Digest Engine)

Phase 2 is the core value prop — content discovery + AI adaptations. It requires:

1. Google Custom Search API key (free, 100 queries/day)
2. YouTube Data API v3 key (free, 10K calls/day)
3. Google Gemini API key (free, 1M tokens/day)

See [CONTENT_DISCOVERY_STRATEGY.md](./CONTENT_DISCOVERY_STRATEGY.md) for the full technical architecture.

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
