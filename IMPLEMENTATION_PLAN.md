# Local Authority Engine — Implementation Plan

**Version:** 3.5 — Phases 1-7 Complete (Guided Routine + Highlight System)
**Date:** March 30, 2026
**Prepared for:** John Garuti / Titan Global Technologies
**Product:** Local Authority Engine (LAE) Mobile App + Web
**Stack:** React Native + Expo (TypeScript), Supabase, Stripe, Claude AI

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Phase 1: Foundation — Auth, Database & Core UI](#2-phase-1-foundation--weeks-1-2)
3. [Phase 2: Daily Digest Engine](#3-phase-2-daily-digest-engine--weeks-3-4)
4. [Phase 3: Conversation Tracker](#4-phase-3-conversation-tracker--weeks-5-6)
5. [Phase 4: Coaching, Gamification & Accountability](#5-phase-4-coaching-gamification--accountability--weeks-7-8)
6. [Phase 5: Payments & Trial System](#6-phase-5-payments--trial-system--weeks-9-10)
7. [Phase 6: Email Automation & Push Notifications](#7-phase-6-email-automation--push-notifications--weeks-11-12)
8. [Phase 7: V2 Features — Morning Routine, Weekly Focus, AI Engine](#8-phase-7-v2-features--weeks-13-16)
9. [Phase 8: Testing, Polish & Launch](#9-phase-8-testing-polish--launch--weeks-17-18)
10. [API Intelligence Guide](#10-api-intelligence-guide)
11. [Database Schema](#11-database-schema)
12. [Risk Register & Mitigations](#12-risk-register--mitigations)
13. [Team Roles & Responsibilities](#13-team-roles--responsibilities)
14. [Cost Projections](#14-cost-projections)

---

## 0. CRITICAL PATH — Do This Before Anything Else

> **These items have lead times and must be started immediately, in parallel with development.**

### Week 0 Actions (Start NOW)

- [ ] ~~Submit Instagram Graph API App Review~~ **NO LONGER NEEDED** — We use Google Search for content discovery instead of platform APIs. See [CONTENT_DISCOVERY_STRATEGY.md](./CONTENT_DISCOVERY_STRATEGY.md).

- [ ] **Set up Google Custom Search API** (takes 5 minutes, free)
  - Create a Programmable Search Engine at [programmablesearchengine.google.com](https://programmablesearchengine.google.com)
  - Enable Custom Search API in Google Cloud Console
  - Get API Key — 100 free queries/day

- [ ] **Set up Google Gemini API** (takes 5 minutes, free)
  - Get API key at [aistudio.google.com](https://aistudio.google.com)
  - 1M free tokens/day — replaces Claude at MVP for $0/month

- [ ] **Register Apple Developer Account** ($99/year, approval takes 24-48 hours)
  - [developer.apple.com/programs/enroll](https://developer.apple.com/programs/enroll)
  - Required for: iOS push notifications, App Store submission, Apple Sign-In

- [ ] **Register Google Play Developer Account** ($25 one-time, approval takes 24-48 hours)
  - [play.google.com/console](https://play.google.com/console)

- [ ] **Set up Stripe account and start business verification** (1-2 business days)
  - [stripe.com](https://stripe.com) — requires EIN and bank account

- [ ] **Register domain** for the web app and email sending (e.g., `localauthorityengine.com`)
  - Needed for: Resend email domain verification, web deployment, deep links

- [ ] **Set up YouTube Data API v3** (takes 5 minutes, free — 10,000 units/day)
  - Enable in Google Cloud Console, create API key

- [ ] **Apply for Twitter/X API v2 Free Tier** (takes 1-2 days)
  - Get Bearer Token at [developer.twitter.com](https://developer.twitter.com)
  - 1,500 tweet reads/month free

### Content Discovery Strategy Change

> **We are NOT using Instagram Graph API or Apify.** Instead, we use Google Search (via Google Custom Search API) as a universal discovery layer across ALL platforms. This eliminates the Instagram 30-hashtag limit, removes the need for platform-specific API approvals, and costs $0/month.
>
> See **[CONTENT_DISCOVERY_STRATEGY.md](./CONTENT_DISCOVERY_STRATEGY.md)** for the full technical architecture, code examples, and scaling plan.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                          │
│  React Native + Expo (iOS, Android, Web)                │
│  Expo Router (navigation) │ NativeWind (styling)        │
│  Zustand (state) │ React Query (data fetching)          │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS / WebSocket
┌──────────────────────▼──────────────────────────────────┐
│                   BACKEND LAYER                          │
│  Supabase                                               │
│  ├── Auth (email, Google, Apple sign-in)                │
│  ├── PostgreSQL Database (all app data)                 │
│  ├── Edge Functions (serverless API logic)              │
│  ├── Realtime (live updates for tracker/coaching)       │
│  ├── Storage (user avatars, cached content)             │
│  └── Row Level Security (data isolation per user)       │
└──────┬──────────┬───────────┬──────────┬────────────────┘
       │          │           │          │
┌──────▼──┐ ┌────▼────┐ ┌───▼────┐ ┌───▼─────┐
│ Stripe  │ │ Claude  │ │ Content│ │ Email   │
│ Payments│ │ AI API  │ │ APIs   │ │ Service │
│         │ │         │ │(IG/YT) │ │(Resend) │
└─────────┘ └─────────┘ └────────┘ └─────────┘
```

### Key Architecture Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Mobile Framework | React Native + Expo | Single codebase → iOS, Android, Web |
| Backend | Supabase | Auth + DB + Realtime + Edge Functions in one platform. Free tier for MVP. |
| AI Provider (MVP) | Google Gemini | Free tier: 1M tokens/day. Upgrade to Claude when revenue justifies. |
| AI Provider (Scale) | Anthropic Claude | Haiku for bulk, Sonnet for quality, Opus for complex analysis. |
| Payments | Stripe | Industry standard. Supports subscriptions, trials, webhooks. |
| Email | Resend | Developer-friendly, React Email templates, generous free tier. |
| Content Discovery | Google Custom Search | Free 100 queries/day. Universal across all platforms via site: operator. |
| Engagement Data | YouTube API + Reddit JSON + X API | All free. See CONTENT_DISCOVERY_STRATEGY.md. |
| Push Notifications | Expo Notifications | Built into Expo. Free. Works on iOS, Android, Web. |

---

## 2. Phase 1: Foundation — Weeks 1-2 ✅ COMPLETE

**Goal:** Authentication, database, core navigation, and base UI components working end-to-end.

### Week 1: Authentication & Database

#### Tasks
- [ ] **1.1** Set up Supabase project (production instance)
  - Create project at [supabase.com](https://supabase.com)
  - Configure auth providers: Email/Password, Google OAuth, Apple Sign-In
  - Set up Row Level Security (RLS) policies
  - Store connection keys in environment variables (`.env.local`)

- [ ] **1.2** Design and create database schema (see [Section 11](#11-database-schema))
  - Run migration scripts for all tables
  - Seed sample data for development
  - Set up database types generation (`supabase gen types typescript`)

- [ ] **1.3** Build authentication screens
  - Welcome/onboarding splash screen
  - Sign Up screen (name, email, password, city/market, experience level)
  - Sign In screen
  - Forgot Password flow
  - Apple Sign-In + Google Sign-In buttons

- [ ] **1.4** Create Supabase client configuration
  - Install `@supabase/supabase-js`
  - Create `src/lib/supabase.ts` with client initialization
  - Set up auth state listener
  - Create `src/hooks/useAuth.ts` hook
  - Handle session persistence with `expo-secure-store`

#### Deliverables
- User can sign up, sign in, and sign out
- User profile stored in Supabase with market/city preference
- Protected routes (tabs only accessible when authenticated)

### Week 2: Core UI Polish & Navigation

#### Tasks
- [ ] **2.1** Finalize all reusable components (already scaffolded)
  - Card, Badge, StatBox, ProgressBar, StepItem, ItemRow, CTAButton
  - Add loading skeletons for all components
  - Add pull-to-refresh on scrollable screens
  - Add haptic feedback on button presses (mobile)

- [ ] **2.2** Implement proper navigation structure
  - Auth stack (Welcome → SignUp → SignIn)
  - Main tab stack (Digest, Tracker, Coach, Profile)
  - Modal screens (adaptation detail, conversation detail, settings)
  - Deep linking support (`garutiapp://`)

- [ ] **2.3** Build Profile screen with real data
  - Display user info from Supabase
  - Market/city selector
  - Experience level
  - Notification preferences toggle
  - Account management (change password, delete account)

- [ ] **2.4** Set up development tooling
  - ESLint + Prettier configuration
  - Husky pre-commit hooks
  - CI/CD with GitHub Actions (lint + type check on PR)
  - Environment variable management (`.env.local`, `.env.production`)

#### Deliverables
- Complete auth flow working on iOS, Android, and Web
- Polished UI matching mockup exactly
- Profile screen with editable user data
- CI/CD pipeline running

---

## 3. Phase 2: Daily Digest Engine — Weeks 3-4 ✅ COMPLETE

**Goal:** The core value proposition. Agents see top-performing Reels/Shorts from their market every morning with 5 AI adaptations.

### Week 3: Content Discovery Pipeline

#### Tasks
- [ ] **3.1** Build content scraping infrastructure
  - Set up Apify account for Instagram Reels scraping
  - Configure YouTube Data API v3 for Shorts discovery
  - Create Supabase Edge Function: `discover-content`
  - Define scraping parameters per market (location, hashtags, keywords)
  - Store discovered content in `content_items` table

- [ ] **3.2** Build content ranking algorithm
  - Score content by: views, likes, comments, saves, shares, engagement rate
  - Weight recent content higher (last 7 days)
  - Filter for real estate relevance (keyword matching + AI classification)
  - Rank top 10 per market per day, surface top 3-5 to users

- [ ] **3.3** Set up scheduled content discovery
  - Supabase cron job (or Apify schedule) runs daily at 5:00 AM EST
  - Discovers content for all active markets
  - Stores results in database
  - Marks content as "ready for digest"

- [ ] **3.4** Create content moderation layer
  - AI-based content filtering (remove spam, inappropriate content)
  - Flag content that may violate fair housing laws
  - Manual review queue for flagged items (admin dashboard)

#### Market-Specific Discovery Strategy
```
For each active market (e.g., "Cape Coral, FL"):
  1. Search Instagram Reels:
     - Hashtags: #capecoralrealestate, #capecoralflorida, #capecoralrealtor
     - Location tags: Cape Coral, FL
     - Account types: Real estate agents, realtors
  2. Search YouTube Shorts:
     - Query: "Cape Coral real estate" + "homes for sale Cape Coral"
     - Filter: Shorts only, last 7 days, sorted by view count
  3. Score and rank all discovered content
  4. Select top 5 for daily digest
```

### Week 4: AI Adaptation Engine + Digest UI

#### Tasks
- [ ] **4.1** Build AI adaptation pipeline
  - Create Supabase Edge Function: `generate-adaptations`
  - For each top Reel/Short, call Claude API to generate 5 adaptations
  - Prompt engineering for real estate content adaptation:
    - Maintain hook structure
    - Localize to agent's specific market
    - Match agent's voice/style (from profile preferences)
    - Include call-to-action variations
  - Store adaptations in `adaptations` table linked to content

- [ ] **4.2** Build Daily Digest screen (full implementation)
  - Header: market name + streak counter
  - Top Performing Reels card (ranked list with engagement rates)
  - Each Reel: thumbnail, title, creator, view count, engagement rate
  - Tap Reel → Adaptation detail screen (5 versions)
  - "Your Top Adaptation" card (AI-selected best match for user)
  - "See All 5 Adaptations" CTA button

- [ ] **4.3** Build Adaptation Detail screen
  - Show original Reel preview/link
  - Display 5 AI-generated script adaptations
  - Each adaptation: hook text, full script, suggested posting time
  - "Copy to Clipboard" button per adaptation
  - "Mark as Posted" button (logs to conversation tracker)
  - Share button (open Instagram/YouTube to post)

- [ ] **4.4** Implement digest delivery timing
  - Daily digest ready by 7:00 AM in user's timezone
  - "New digest available" in-app indicator
  - Cache yesterday's digest for reference

#### Deliverables
- Content discovery running daily for target markets
- AI generating 5 adaptations per top Reel
- Full Daily Digest screen with real data
- Adaptation detail screen with copy/share functionality

---

## 4. Phase 3: Conversation Tracker — Weeks 5-6 ✅ COMPLETE

**Goal:** Agents log every DM, comment, and call that came from their content. This data drives the coaching upsell and proves ROI.

### Week 5: Tracker Core

#### Tasks
- [ ] **5.1** Build conversation logging flow
  - "+ Log New Conversation" button → modal form
  - Fields: contact name, source (which Reel/Short), channel (DM, comment, call, email), status, notes
  - Status options: DM Received, In Conversation, Appointment Set, Follow-up Needed, Closed, Lost
  - Auto-link to content item if from a tracked Reel
  - Quick-log option: just name + status (minimum friction)

- [ ] **5.2** Build Conversations list screen
  - Recent conversations sorted by date
  - Status badges (color-coded: green=appointment, blue=in conversation, orange=DM, red=follow-up)
  - Search and filter by status, date range, source
  - Tap conversation → detail view with full history/notes

- [ ] **5.3** Build weekly stats dashboard
  - Stat boxes: This Week, This Month, Appointments
  - Weekly trend bar chart (conversations per day)
  - Source attribution: which Reels drove the most conversations

### Week 6: Tracker Analytics & Pipeline

#### Tasks
- [ ] **5.4** Build conversation pipeline view
  - Kanban-style view: DM Received → In Conversation → Appointment Set → Closed
  - Drag-and-drop status updates (web), swipe actions (mobile)
  - Pipeline value estimate (average commission × appointments)

- [ ] **5.5** Implement conversation reminders
  - "Follow-up Needed" conversations get reminder notifications
  - Auto-flag conversations with no activity for 48+ hours
  - "Stale conversation" nudge in daily digest

- [ ] **5.6** Build source attribution analytics
  - Which Reel/Short generated the most conversations?
  - Which adaptation version performed best?
  - Engagement rate → Conversation rate correlation
  - This data feeds the Weekly Focus AI (V2)

#### Deliverables
- Full conversation logging with status tracking
- Weekly stats dashboard with bar chart
- Pipeline view with source attribution
- Follow-up reminder system

---

## 5. Phase 4: Coaching, Gamification & Accountability — Weeks 7-8 ✅ COMPLETE

**Goal:** Build the coaching tier experience and the gamification that keeps agents coming back daily.

### Week 7: Coaching Home

#### Tasks
- [ ] **6.1** Build Coaching Home screen (full implementation)
  - Next Session card (date, time, topic, coach name, prep instructions)
  - 90-Day Guarantee Tracker (appointments / 10 target, progress bar, days remaining)
  - Accountability Pod (3-4 agents paired by market similarity)
  - Pod member cards: name, market, last posted, streak

- [ ] **6.2** Build session management
  - Session schedule stored in database (12-week cohort curriculum)
  - Session details: week number, theme, focus topic, prep homework
  - Link to join live session (Zoom/Google Meet integration or external link)
  - Session recording access (post-session)

- [ ] **6.3** Build accountability pod system
  - Auto-assign agents to pods of 3-4 based on: market, experience level, start date
  - Pod chat (Supabase Realtime)
  - Pod leaderboard (who's posting most, who has most conversations)
  - Pod visibility: see each other's streaks and posting activity

### Week 8: Gamification & Streaks

#### Tasks
- [ ] **6.4** Build streak system
  - Track daily actions: opened digest, posted Reel, logged conversation
  - Streak counter on Daily Digest header
  - Streak milestones: 7 days (🔥), 14 days (⚡), 30 days (💎), 60 days (🏆), 90 days (👑)
  - Streak freeze: 1 free miss per week without breaking streak

- [ ] **6.5** Build badge/achievement system
  - Onboarding complete (7-step checklist)
  - First post, First conversation, First appointment
  - Weekly consistency badges
  - 90-day program completion badge

- [ ] **6.6** Build 90-Day Progress Dashboard
  - Day X of 90 progress bar
  - Stats: total posts, total conversations, appointments, closings
  - Milestone markers on timeline
  - "On track" / "Behind" / "Ahead" indicator vs peer average

- [ ] **6.7** Onboarding checklist (in-app)
  - 7-step guided checklist (from GTM doc Section 12):
    1. Open your first daily digest
    2. Browse the 5 adaptations
    3. Post your first adapted Reel
    4. Open the conversation tracker
    5. Log your first conversation
    6. Open your digest 3 days in a row
    7. Post 3 adapted Reels in your first week
  - Progress bar visible during first 7 days
  - Completion unlocks badge + congratulatory message

#### Deliverables
- Coaching Home with session schedule and 90-day tracker
- Accountability pods with real-time chat
- Streak system with milestones
- Onboarding checklist
- Badge/achievement system

---

## 6. Phase 5: Payments & Trial System — Weeks 9-10 ✅ COMPLETE

**Goal:** Stripe integration for all three tiers, 14-day free trial, subscription management.

### Week 9: Stripe Integration

#### Tasks
- [ ] **7.1** Set up Stripe account and products
  - Create 3 subscription products:
    - **SaaS Only:** $99/month
    - **Coaching Only:** $397/month
    - **Bundle (flagship):** $449/month
  - Configure 14-day free trial on SaaS and Bundle
  - Set up founding member pricing ($79/mo SaaS, limited to first 100)
  - Create Stripe Customer Portal for self-serve management

- [ ] **7.2** Build pricing/plan selection screen
  - Three-tier pricing cards (SaaS / Coaching / Bundle)
  - Bundle highlighted as "Most Popular" / "Recommended"
  - Feature comparison table
  - 90-day guarantee badge on coaching tiers
  - "Start 14-Day Free Trial" CTA

- [ ] **7.3** Implement Stripe Checkout
  - Use Stripe Checkout Sessions (redirect to Stripe-hosted page)
  - Alternative: Stripe Payment Sheet (in-app for mobile)
  - Handle successful payment → activate subscription in Supabase
  - Handle failed payment → show retry UI

- [ ] **7.4** Set up Stripe webhooks
  - Create Supabase Edge Function: `stripe-webhook`
  - Handle events:
    - `customer.subscription.created` → activate user's plan
    - `customer.subscription.updated` → update plan level
    - `customer.subscription.deleted` → downgrade to free
    - `invoice.payment_failed` → flag account, send retry email
    - `customer.subscription.trial_will_end` → trigger Day 12 email

### Week 10: Trial Logic & Subscription Gates

#### Tasks
- [ ] **7.5** Implement feature gating
  - Free/Trial users: full access for 14 days
  - SaaS tier ($99): daily digest + adaptations + conversation tracker
  - Coaching tier ($397): coaching home + sessions + accountability pods
  - Bundle tier ($449): everything
  - Expired trial: show "upgrade" overlay, preserve data for 90 days

- [ ] **7.6** Build trial countdown UI
  - "X days left in trial" banner
  - Day 12: "Trial ends in 48 hours" prominent notification
  - Day 14: "Trial ended" screen with upgrade CTA
  - "What you'll lose" messaging (streak, conversation history, digest)

- [ ] **7.7** Implement subscription management
  - Profile → Subscription section
  - Current plan display
  - Upgrade/downgrade options
  - Cancel subscription (with exit survey from GTM doc)
  - Pause account option (1 month at $0)
  - Reactivation flow

- [ ] **7.8** Apple App Store & Google Play billing (for native apps)
  - Implement `expo-in-app-purchases` or `react-native-iap`
  - Handle App Store / Play Store subscription management
  - Note: Apple takes 30% cut on in-app purchases (factor into pricing)
  - Consider directing users to web for subscription to avoid App Store cut

#### Deliverables
- Stripe subscriptions for all 3 tiers
- 14-day free trial with countdown UI
- Feature gating based on subscription level
- Self-serve subscription management
- Webhook handling for all payment events

---

## 7. Phase 6: Email Automation & Push Notifications — Weeks 11-12 ✅ COMPLETE (UI/hooks ready, awaiting Resend + Expo Push keys)

**Goal:** Implement all email sequences from the GTM doc + push notifications for daily engagement.

### Week 11: Email Infrastructure

#### Tasks
- [ ] **8.1** Set up Resend account
  - Configure sending domain (verify DNS records)
  - Set up API key
  - Create React Email templates for all sequences

- [ ] **8.2** Build trial email sequence (14 emails from GTM Section 11)
  - Day 0: "Your first local content digest is ready" (welcome + quick-start)
  - Day 1: "Here's what agents in [city] posted this week"
  - Day 3: "Did you post your first adapted Reel?"
  - Day 5: Case study / testimonial email
  - Day 7: "Your Week 1 recap" (personalized usage stats)
  - Day 10: Soft coaching introduction
  - Day 12: "Your trial ends in 48 hours" (loss aversion)
  - Day 13: "Last day: lock in your $99/month"
  - Day 16: "We saved your data" (win-back)
  - Day 21: "Last chance: 7-day trial extension"

- [ ] **8.3** Build post-purchase email sequence
  - Day 1: "Welcome — you're in" (optimization guide)
  - Week 1: "Your first week as a member" (usage stats + tips)
  - Week 2: "You've got a referral code" (Give $50, Get $50)
  - Week 4: "Your Month 1 progress report" + coaching upsell
  - Week 8: Hard coaching upsell (case study)
  - Month 3: NPS survey + testimonial request + annual billing offer

- [ ] **8.4** Build churn prevention sequences
  - 3 days no login: "Your digest is waiting"
  - 7 days no login: "Quick question — is everything working OK?"
  - 14 days no login: "Free coaching session offer"
  - Cancellation initiated: Exit survey + alternatives (pause, downgrade)
  - 7 days post-cancel: "The door's open whenever you're ready"

- [ ] **8.5** Build coaching upsell sequence (behavioral triggers)
  - Fires when 2+ conditions met: 12+ posts in 30 days, 3+ conversations logged, 80%+ digest opens, visited coaching page 2+ times
  - Trigger + 0: "You're generating conversations. Here's the next step."
  - Trigger + 3: Case study email
  - Trigger + 7: "$350/month exclusive offer"
  - Trigger + 14: "Last call on $350/month"

### Week 12: Push Notifications & Scheduling

#### Tasks
- [ ] **8.6** Set up Expo Push Notifications
  - Configure `expo-notifications` in app
  - Request notification permissions on onboarding
  - Store push tokens in Supabase `user_devices` table
  - Create Supabase Edge Function: `send-push-notification`

- [ ] **8.7** Implement notification triggers
  - Daily digest ready: 8:30 AM in user's timezone
  - Streak at risk: "Post today to keep your 12-day streak!"
  - New conversation logged: "Maria G. just responded to your Reel"
  - Coaching session reminder: 1 hour before session
  - Follow-up needed: "You haven't followed up with David R. in 2 days"
  - Trial ending: Day 12, 13, 14 push notifications

- [ ] **8.8** Build email/notification orchestration
  - Create Supabase Edge Function: `orchestrate-comms`
  - Runs on schedule (every hour)
  - Checks user states and triggers appropriate emails/notifications
  - Respects quiet hours (no notifications 10 PM - 7 AM)
  - De-duplicates (don't send email AND push for same event)

#### Deliverables
- Complete email automation (trial, post-purchase, churn, coaching upsell)
- Push notifications for all key events
- Notification preferences screen
- Communication orchestration system

---

## 8. Phase 7: V2 Features — Weeks 13-16 ✅ COMPLETE

**Goal:** Add the V2 screens (Morning Routine, Weekly Focus) and automated AI content engine.

### Week 13-14: Morning Routine

#### Tasks
- [ ] **9.1** Build Morning Routine screen
  - Guided 10-minute daily flow with timer
  - 6 steps (from mockup):
    1. Open today's digest (1 min)
    2. Pick your Reel for today (1 min)
    3. Customize your adaptation (3 min)
    4. Post it (2 min)
    5. Log yesterday's conversations (2 min)
    6. See streak + weekly focus (1 min)
  - Step-by-step progress with checkmarks
  - "Today's Intention" card (daily affirmation)
  - Active step detail with CTA

- [ ] **9.2** Add Morning Routine tab to navigation
  - Update bottom nav: Digest | Routine | Tracker | Coach
  - Routine only visible to V2 users or after 7-day streak

### Week 15-16: Weekly Focus + AI Automation

#### Tasks
- [ ] **9.3** Build Weekly Focus screen
  - AI-personalized weekly priority (from tracker data analysis)
  - "Improve Conversation Starters" / "Post More Consistently" / etc.
  - This week's actions (3 specific steps)
  - 90-Day Authority Progress dashboard (Day X of 90, posts, conversations, appointments, closings)

- [ ] **9.4** Build AI Weekly Analysis Engine
  - Supabase Edge Function: `weekly-analysis`
  - Runs every Monday at 6:00 AM
  - Analyzes user's tracker data from past week
  - Identifies weakest metric (posting consistency, engagement, conversation conversion, appointment setting)
  - Generates personalized priority + 3 action items via Claude API
  - Stores in `weekly_focus` table

- [ ] **9.5** Automate content discovery pipeline
  - Move from manual/semi-automated to fully automated
  - Apify scheduled actors running daily per market
  - Auto-ranking with AI classification
  - Auto-generation of adaptations (batch process overnight)
  - Admin dashboard for content moderation queue

#### Deliverables
- Morning Routine guided flow
- Weekly Focus with AI-personalized priorities
- Fully automated content discovery + adaptation pipeline
- Admin content moderation dashboard

---

## 9. Phase 8: Testing, Polish & Launch — Weeks 17-18

**Goal:** QA, performance optimization, App Store submission, and launch.

### Week 17: Testing & QA

#### Tasks
- [ ] **10.1** End-to-end testing
  - Full user journey: signup → trial → digest → post → track → convert
  - Test all 3 subscription tiers
  - Test trial expiration flow
  - Test on iOS (iPhone 12-16), Android (Pixel, Samsung), Web (Chrome, Safari, Firefox)

- [ ] **10.2** Performance optimization
  - Image/asset optimization
  - Lazy loading for lists
  - Offline support (cache last digest)
  - App bundle size optimization

- [ ] **10.3** Security audit
  - Verify all RLS policies on Supabase
  - Ensure no API keys exposed in client bundle
  - Test payment security (PCI compliance via Stripe)
  - Verify fair housing compliance (no discriminatory content filtering)

### Week 18: Launch

#### Tasks
- [ ] **10.4** App Store submission
  - Generate iOS build: `eas build --platform ios`
  - Generate Android build: `eas build --platform android`
  - App Store screenshots and metadata
  - App Store review preparation (privacy policy, terms of service)
  - Submit to Apple App Store (allow 1-2 weeks for review)
  - Submit to Google Play Store (allow 1-3 days for review)

- [ ] **10.5** Web deployment
  - Deploy web version to Vercel or Netlify
  - Configure custom domain
  - Set up SSL certificate
  - Configure web analytics (PostHog or Mixpanel)

- [ ] **10.6** Launch checklist
  - [ ] All email sequences tested and active
  - [ ] Stripe webhooks verified in production
  - [ ] Push notifications tested on real devices
  - [ ] Content discovery pipeline running for launch markets
  - [ ] Admin dashboard accessible
  - [ ] Error monitoring set up (Sentry)
  - [ ] Analytics tracking all key events
  - [ ] Legal: Terms of Service published
  - [ ] Legal: Privacy Policy published
  - [ ] Legal: Fair housing disclaimer in content

#### Deliverables
- App live on iOS App Store, Google Play, and Web
- All systems tested and operational
- Monitoring and error tracking in place
- Launch markets active with daily content

---

## 10. API Intelligence Guide

### 10.1 Instagram Content Discovery

#### The Challenge
Instagram's official Graph API has **severe limitations** for content discovery:
- **No geographic/location search** for Reels — you cannot filter by city or zip code
- **30 unique hashtags per 7-day rolling window** per user — this is a hard limit and the single biggest constraint
- Reels are returned as `media_type=VIDEO`; no dedicated "Reels-only" filter — must filter by `media_product_type=REELS`
- You **cannot** download or get video file URLs for content you don't own — only `permalink`

#### Official Instagram Graph API (Limited Use)

**When to use it:** For hashtag-based discovery within the 30/week limit, and for features where users connect their own account.

**Setup Steps:**
1. Create a Facebook Developer account at [developers.facebook.com](https://developers.facebook.com)
2. Create a new App (type: Business)
3. Add the "Instagram Graph API" product
4. Required permissions: `instagram_basic`, `instagram_manage_insights`, `pages_read_engagement`
5. **Submit for App Review** — prepare a screencast demo. Takes 3-10 business days. **START THIS IMMEDIATELY.**
6. Get a long-lived access token (60-day expiry, auto-refresh)

**Key Endpoints:**
- `GET /ig_hashtag_search?q=capecoralrealestate` — find hashtag IDs
- `GET /{hashtag-id}/top_media` — discover top posts/Reels for a hashtag
- `GET /{hashtag-id}/recent_media` — discover recent posts/Reels
- `GET /{media-id}?fields=like_count,comments_count,permalink,media_type,media_product_type`

**Rate Limits:** 200 calls/user/hour. **Max 30 unique hashtags per 7-day rolling window.**

**Practical Impact of the 30-Hashtag Limit:**
- 10 markets × 3 hashtags each = 30 hashtags = AT THE LIMIT for one week
- If you need more markets or hashtags, you MUST use Apify or BrightData as a supplement
- Plan your hashtag list carefully and rotate strategically

#### Recommended Primary Approach: Apify (Supplementing Official API)

**What is Apify?**
A cloud platform for web scraping and automation with pre-built "actors" (scrapers) for Instagram.

**Setup Steps:**
1. Create account at [apify.com](https://apify.com)
2. Subscribe to a plan ($49/month for 100 Actor compute units — enough for ~50 market scrapes/day)
3. Use the "Instagram Reel Scraper" actor or "Instagram Hashtag Scraper" actor
4. Configure per market:
   - Input: hashtags (e.g., `#capecoralrealestate`), location IDs, or account URLs
   - Output: Reel URL, caption, view count, like count, comment count, timestamp, creator info
5. Schedule actors to run daily at 5:00 AM EST
6. Output feeds into Supabase via webhook or API call

**Pricing:** $49/mo (Starter) → $499/mo (Scale). Start with Starter.

**Rate Limits:** Depends on plan. Starter = 100 compute units/month ≈ 50-100 scrapes/day.

**Gotchas:**
- Instagram may block scrapers periodically — Apify handles proxy rotation
- Content may be removed between scraping and user viewing — handle gracefully
- Must comply with Instagram's Terms of Service for commercial use
- Do NOT store Instagram user data beyond what's publicly visible
- Consider using multiple scraping approaches (hashtag + location + account-based) for redundancy

**Alternative: BrightData**
- More expensive but more reliable for large-scale scraping
- Offers pre-built Instagram datasets
- Better for scale (1000+ markets)
- Pricing: starts at $500/mo

#### Official Instagram Graph API (Limited Use)

**When to use it:** For features where users connect their own Instagram account (e.g., auto-posting, viewing their own analytics).

**Setup Steps:**
1. Create a Facebook Developer account at [developers.facebook.com](https://developers.facebook.com)
2. Create a new App (type: Business)
3. Add the "Instagram Graph API" product
4. Required permissions: `instagram_basic`, `instagram_content_publish`, `pages_show_list`
5. Submit for App Review (required for production access) — takes 2-5 business days
6. Get a long-lived access token (60-day expiry, auto-refresh)

**Key Endpoints:**
- `GET /{ig-user-id}/media` — Get user's own media
- `POST /{ig-user-id}/media` — Create media container (for auto-posting, V2)
- `POST /{ig-user-id}/media_publish` — Publish media

**Rate Limits:** 200 calls/user/hour, 4800 calls/user/day

**Gotchas:**
- App Review can take up to 2 weeks if issues are found
- Instagram Content Publishing API requires a Business or Creator account
- No public content search/discovery via official API
- Rate limits are per-user, not per-app

---

### 10.2 YouTube Data API v3

**What it does:** Search for YouTube Shorts by query, filter by location relevance, get video statistics.

**Setup Steps:**
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (e.g., "LAE-Production")
3. Enable "YouTube Data API v3" in the API Library
4. Create credentials → API Key
5. (Optional) Restrict API key to YouTube Data API only + your app's IP/domain
6. Store API key in environment variables

**Key Endpoints:**
```
GET /youtube/v3/search
  ?q=Cape+Coral+real+estate
  &type=video
  &videoDuration=short      (filters for Shorts: <60 seconds)
  &order=viewCount
  &publishedAfter=2026-03-23T00:00:00Z  (last 7 days)
  &maxResults=25
  &key=YOUR_API_KEY

GET /youtube/v3/videos
  ?id=VIDEO_ID_1,VIDEO_ID_2
  &part=statistics,snippet
  &key=YOUR_API_KEY
```

**Pricing:** FREE tier = 10,000 units/day. Each search request = 100 units. Each video details request = ~3 units. So ~100 searches/day + statistics lookups = well within free tier.

**Rate Limits:** 10,000 units/day (free). Can request quota increase if needed.

**Gotchas:**
- YouTube API does NOT have a "Shorts" filter — use `videoDuration=short` (under 4 min) and filter client-side by aspect ratio or duration <60s
- No location-based filtering in search — must use location keywords in query string
- Search results are not perfectly ranked by engagement — fetch video stats separately and re-rank
- Quota resets daily at midnight Pacific Time

---

### 10.3 Anthropic Claude API

**What we use it for:** Generate 5 AI adaptations of each top Reel/Short script, personalized to the agent's market and voice.

**Setup Steps:**
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an account and add billing information
3. Navigate to API Keys → Create New Key
4. Store API key in environment variables
5. Install SDK: `npm install @anthropic-ai/sdk`

**Models to Use:**
- **Claude Sonnet 4.6** (`claude-sonnet-4-6`): For daily adaptation generation. Fast, cost-effective. ~$3/1M input tokens, ~$15/1M output tokens.
- **Claude Haiku 4.5** (`claude-haiku-4-5-20251001`): For content classification (is this real estate content?). Cheapest option. ~$0.80/1M input tokens, ~$4/1M output tokens.
- **Claude Opus 4.6** (`claude-opus-4-6`): For weekly focus analysis and complex reasoning. Best quality. ~$15/1M input tokens, ~$75/1M output tokens.

**Example Adaptation Prompt:**
```
You are a real estate content strategist. Given the following top-performing
Instagram Reel from {market}:

Original Hook: "{original_hook}"
Original Script: "{original_script}"
Views: {views}, Engagement Rate: {engagement_rate}%

Generate 5 adapted versions for a real estate agent in {agent_market}.
The agent's style is: {agent_style_preference}

For each adaptation:
1. Rewrite the hook for the local market
2. Adapt the full script (30-60 seconds)
3. Suggest best posting time
4. Include a conversation-starting CTA

Keep the same structure that made the original successful.
```

**Cost Estimate:**
- ~500-800 tokens input + ~2000-3000 tokens output per adaptation set (5 versions)
- 5 content items/day × 100 users = 500 adaptation requests/day
- **With Haiku 4.5:** ~$0.001-0.01 per generation batch → ~$5-20/month at 100 users (recommended for production)
- **With Sonnet 4.6:** ~$2-5/day → ~$60-150/month at 100 users (use for higher quality if needed)
- **Recommendation:** Use Haiku 4.5 for daily adaptations (bulk), Sonnet 4.6 for weekly focus analysis, Opus 4.6 only for complex reasoning tasks

**Cost Optimization:**
- Use Claude's **prompt caching** (`cache_control` on system prompts) — can cut costs by up to 90% since the system prompt is identical across all adaptation requests
- Cache adaptations in database — never regenerate for the same content + same market
- Batch adaptation generation overnight (off-peak = potentially faster responses)

**Rate Limits:**
- Tier 1 (new accounts): 50 requests/minute, 40,000 tokens/minute
- Tier 2 ($100+ spend): 1,000 requests/minute
- Request a tier upgrade early if scaling

**Gotchas:**
- New accounts start at Tier 1 — may need to request upgrade before launch
- Implement retry logic with exponential backoff for rate limit errors
- Cache adaptations — don't regenerate for the same content
- Monitor token usage to control costs

---

### 10.4 Stripe API

**What we use it for:** Subscription billing for all 3 tiers, 14-day free trial, invoice management, customer portal.

**Setup Steps:**
1. Create account at [stripe.com](https://stripe.com)
2. Complete business verification (requires business EIN, bank account)
3. Get API keys: Dashboard → Developers → API Keys
   - Publishable key (client-side): `pk_live_...`
   - Secret key (server-side only): `sk_live_...`
4. Install SDK: `npm install stripe` (server) + `@stripe/stripe-react-native` (mobile)
5. Create Products and Prices in Stripe Dashboard:
   - Product: "LAE SaaS" → Price: $99/month (recurring)
   - Product: "LAE Coaching" → Price: $397/month (recurring)
   - Product: "LAE Bundle" → Price: $449/month (recurring)
   - Add founding member prices: $79/month (SaaS), $349/month (Bundle)
6. Configure Customer Portal: Dashboard → Settings → Customer Portal
7. Set up webhooks: Dashboard → Developers → Webhooks → Add endpoint
   - Endpoint URL: `https://your-supabase-url.supabase.co/functions/v1/stripe-webhook`
   - Events to listen for:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
     - `invoice.payment_succeeded`
     - `customer.subscription.trial_will_end`
     - `checkout.session.completed`

**Pricing:** 2.9% + $0.30 per transaction. No monthly fee.

**Gotchas:**
- Test everything in Stripe Test Mode first (`pk_test_...`, `sk_test_...`)
- Webhook signatures MUST be verified to prevent fraud
- Apple App Store requires using their billing for in-app purchases (30% cut). Consider:
  - Option A: Use Stripe only for web signups, Apple billing for in-app
  - Option B: Direct all subscriptions through web (show "Subscribe at localauthorityengine.com" in app)
  - Option C: Build both and let user choose (most work, best UX)
- Handle failed payments gracefully (dunning): 3 retry attempts over 7 days before canceling
- Store Stripe Customer ID in Supabase `users` table for lookup

---

### 10.5 Supabase

**What we use it for:** Everything backend — auth, database, real-time subscriptions, edge functions (serverless), file storage.

**Setup Steps:**
1. Create project at [supabase.com](https://supabase.com)
2. Choose region closest to target users (US East for Florida-based launch)
3. Get connection details: Project Settings → API
   - `SUPABASE_URL`: `https://xxxxx.supabase.co`
   - `SUPABASE_ANON_KEY`: Public key for client-side
   - `SUPABASE_SERVICE_ROLE_KEY`: Server-side only (for edge functions)
4. Configure Auth providers:
   - Email/Password (default, already enabled)
   - Google OAuth: Settings → Auth → Providers → Google (requires Google Cloud OAuth credentials)
   - Apple Sign-In: Settings → Auth → Providers → Apple (requires Apple Developer account)
5. Enable Edge Functions: `supabase functions deploy`
6. Enable Realtime: Database → Replication → Enable for tables that need live updates

**Free Tier Limits:**
- 500 MB database
- 1 GB file storage
- 2 GB bandwidth
- 50,000 monthly active users
- 500,000 Edge Function invocations
- Unlimited API requests

**Pro Plan ($25/month):**
- 8 GB database
- 100 GB file storage
- 250 GB bandwidth
- Unlimited MAUs
- 2M Edge Function invocations
- Daily backups

**Recommendation:** Start on Free tier for development. Move to Pro ($25/mo) at launch.

**Gotchas:**
- Free tier pauses after 1 week of inactivity — use Pro for production
- Row Level Security (RLS) must be enabled on ALL tables — without it, any user can read/write all data
- Edge Functions have a **60-second execution limit** — long-running tasks (e.g., scraping, batch AI generation) must be handled via Apify or broken into smaller chunks
- Supabase client in React Native needs `AsyncStorage` adapter for session persistence

---

### 10.6 Expo Push Notifications

**What we use it for:** Daily digest reminders, streak alerts, coaching session reminders, conversation follow-up nudges.

**Setup Steps:**
1. Install: `npx expo install expo-notifications expo-device expo-constants`
2. Configure in `app.json`:
   ```json
   {
     "expo": {
       "plugins": ["expo-notifications"],
       "notification": {
         "icon": "./assets/notification-icon.png",
         "color": "#F97316"
       }
     }
   }
   ```
3. Request permissions in app (on onboarding screen)
4. Get push token: `Notifications.getExpoPushTokenAsync()`
5. Store token in Supabase `user_devices` table
6. Send notifications from Edge Functions using Expo Push API:
   ```
   POST https://exp.host/--/api/v2/push/send
   {
     "to": "ExponentPushToken[xxxx]",
     "title": "Your Daily Digest is Ready",
     "body": "3 new top Reels in Cape Coral. See your adaptations →",
     "data": { "screen": "digest" }
   }
   ```

**Pricing:** FREE for up to 5,000 notifications/month. Then pay-as-you-go.

**iOS Setup:**
- Requires Apple Developer account ($99/year)
- Generate APNs key in Apple Developer Portal
- Upload to Expo: `eas credentials` → configure push key
- Push notifications do NOT work in iOS Simulator — test on real device

**Android Setup:**
- Generate Firebase Cloud Messaging (FCM) key
- Upload `google-services.json` to Expo project
- Notifications work in Android emulator

**Gotchas:**
- iOS requires explicit user permission — ask at the right moment (after they see value, not on first launch)
- Push tokens can expire — implement token refresh logic
- Web push notifications require service worker setup (Expo handles this)
- Test with `expo-notifications` `scheduleNotificationAsync` for local notifications (no server needed)

---

### 10.7 Resend (Email Service)

**What we use it for:** All transactional emails — trial sequences, churn prevention, coaching upsell, welcome emails, progress reports.

**Setup Steps:**
1. Create account at [resend.com](https://resend.com)
2. Add and verify sending domain: Settings → Domains → Add Domain
   - Add 3 DNS records (SPF, DKIM, return-path)
   - Verification takes 5-60 minutes
3. Get API key: Settings → API Keys → Create
4. Install SDK: `npm install resend` (for Edge Functions)
5. (Optional) Install `@react-email/components` for designing email templates in JSX

**Pricing:**
- Free: 100 emails/day, 1 domain
- Pro ($20/month): 50,000 emails/month, custom domains, analytics
- Scale ($100/month): 500,000 emails/month

**Recommendation:** Start Free for development. Pro ($20/mo) at launch.

**Key Features:**
- React Email integration (design emails in JSX/TSX)
- Webhook support for delivery events (opened, clicked, bounced)
- Domain authentication (SPF, DKIM) for high deliverability

**Gotchas:**
- Free tier is 100 emails/day — fine for dev but not launch
- Email deliverability depends on domain reputation — warm up gradually
- Always include unsubscribe link (CAN-SPAM compliance)
- Test emails with [mail-tester.com](https://mail-tester.com) to check spam score

---

## 11. Database Schema

### Core Tables

```sql
-- Users (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  market_city TEXT NOT NULL,         -- e.g., "Cape Coral"
  market_state TEXT NOT NULL,        -- e.g., "FL"
  experience_years INTEGER,
  content_style TEXT,                -- voice preference for AI adaptations
  stripe_customer_id TEXT,
  subscription_tier TEXT DEFAULT 'trial',  -- trial, saas, coaching, bundle
  subscription_status TEXT DEFAULT 'trialing',
  trial_ends_at TIMESTAMPTZ,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  notification_preferences JSONB DEFAULT '{"digest": true, "streak": true, "coaching": true}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content Items (scraped Reels/Shorts)
CREATE TABLE public.content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,            -- 'instagram' or 'youtube'
  external_id TEXT NOT NULL,         -- Instagram media ID or YouTube video ID
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
  relevance_score DECIMAL(5,2),      -- AI-determined relevance
  thumbnail_url TEXT,
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  content_date TIMESTAMPTZ,
  is_flagged BOOLEAN DEFAULT FALSE,  -- moderation flag
  UNIQUE(platform, external_id)
);

-- AI Adaptations
CREATE TABLE public.adaptations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,   -- 1-5
  hook_text TEXT NOT NULL,
  full_script TEXT NOT NULL,
  suggested_post_time TEXT,
  cta_text TEXT,
  is_selected BOOLEAN DEFAULT FALSE, -- user picked this one
  is_posted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily Digests
CREATE TABLE public.daily_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  digest_date DATE NOT NULL,
  market_city TEXT NOT NULL,
  market_state TEXT NOT NULL,
  content_item_ids UUID[] NOT NULL,  -- array of top 5 content items
  top_adaptation_id UUID REFERENCES adaptations(id),
  is_viewed BOOLEAN DEFAULT FALSE,
  viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, digest_date)
);

-- Conversations
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  source_content_id UUID REFERENCES content_items(id),
  channel TEXT NOT NULL,             -- 'dm', 'comment', 'call', 'email', 'other'
  status TEXT NOT NULL DEFAULT 'dm_received',
    -- 'dm_received', 'in_conversation', 'appointment_set', 'follow_up_needed', 'closed_won', 'closed_lost'
  notes TEXT,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  appointment_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Streaks
CREATE TABLE public.streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  streak_freezes_remaining INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Daily Activity Log (for streak calculation)
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

-- Coaching Sessions
CREATE TABLE public.coaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id UUID NOT NULL,
  week_number INTEGER NOT NULL,      -- 1-12
  theme TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  session_date TIMESTAMPTZ NOT NULL,
  meeting_url TEXT,
  recording_url TEXT,
  prep_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Accountability Pods
CREATE TABLE public.pods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cohort_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.pod_members (
  pod_id UUID REFERENCES pods(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (pod_id, user_id)
);

-- Weekly Focus (V2)
CREATE TABLE public.weekly_focus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  focus_title TEXT NOT NULL,
  focus_description TEXT,
  action_items JSONB NOT NULL,       -- array of {title, description, completed}
  ai_analysis TEXT,                  -- raw AI output
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- User Devices (push notification tokens)
CREATE TABLE public.user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  push_token TEXT NOT NULL,
  platform TEXT NOT NULL,            -- 'ios', 'android', 'web'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, push_token)
);

-- Onboarding Progress
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

-- Email Event Tracking
CREATE TABLE public.email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,          -- 'trial_day_0', 'trial_day_3', etc.
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ
);
```

### Indexes

```sql
CREATE INDEX idx_content_items_market ON content_items(market_city, market_state, discovered_at DESC);
CREATE INDEX idx_adaptations_user ON adaptations(user_id, created_at DESC);
CREATE INDEX idx_conversations_user ON conversations(user_id, status, created_at DESC);
CREATE INDEX idx_daily_digests_user ON daily_digests(user_id, digest_date DESC);
CREATE INDEX idx_daily_activities_user ON daily_activities(user_id, activity_date DESC);
CREATE INDEX idx_email_events_user ON email_events(user_id, email_type);
```

---

## 12. Risk Register & Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| 1 | Instagram blocks scraping | High | Critical | Use Apify (handles proxy rotation). Have BrightData as backup. Build manual content submission as fallback. |
| 2 | Apple rejects app (content scraping concerns) | Medium | High | Frame as "content curation" not "scraping." Don't show Instagram UI elements. Link to original content. |
| 3 | AI adaptations produce poor/generic content | Medium | High | Extensive prompt engineering. User feedback loop ("rate this adaptation"). A/B test Claude models. |
| 4 | High churn in Month 1 (industry avg 10%) | High | High | Aggressive onboarding (7-step checklist). First win in 48 hours. Churn prevention email sequences. |
| 5 | Apple 30% cut makes pricing unviable | High | Medium | Direct subscriptions through web. Show "Subscribe at web URL" in app. Only use IAP if Apple requires it. |
| 6 | Content discovery misses relevant Reels | Medium | Medium | Multiple discovery methods (hashtag, location, account-based). User-submitted content. Manual curation for launch markets. |
| 7 | Stripe webhook failures | Low | High | Implement webhook retry logic. Store webhook events. Reconciliation job runs daily. |
| 8 | Fair housing compliance issues | Low | Critical | AI content filter for discriminatory language. Legal review of all automated content. Disclaimer on all adaptations. |
| 9 | Scale: too many markets to scrape | Medium | Medium | Start with 5 markets at launch. Add markets based on demand. Batch processing for off-peak hours. |
| 10 | User data privacy (CCPA/GDPR) | Low | High | Privacy policy. Data deletion on request. Minimal data collection. Supabase RLS for isolation. |

---

## 13. Team Roles & Responsibilities

| Role | Responsibilities | Phase Focus |
|------|-----------------|-------------|
| **Lead Developer** | Architecture decisions, code review, complex features (AI pipeline, payments) | All phases |
| **Frontend Developer** | UI screens, components, navigation, animations | Phases 1-4, 7 |
| **Backend Developer** | Supabase schema, Edge Functions, API integrations, email automation | Phases 2-3, 5-6 |
| **AI/ML Engineer** | Prompt engineering, content ranking algorithm, weekly focus AI | Phases 2, 7 |
| **QA Engineer** | Testing, bug reports, device compatibility, performance | Phases 1-8 |
| **Designer** | UI polish, App Store assets, email templates, marketing materials | Phases 1, 8 |
| **Product Owner (John Garuti)** | Requirements, priorities, user testing, content strategy, coaching curriculum | All phases |

---

## 14. Cost Projections

### MVP Monthly Operating Costs (Zero-Cost Architecture)

| Service | Plan | Monthly Cost |
|---------|------|-------------|
| Supabase | Free Tier | $0 |
| Google Custom Search | Free (100/day) | $0 |
| Google Gemini AI | Free (1M tokens/day) | $0 |
| YouTube Data API | Free (10K/day) | $0 |
| Reddit JSON API | Free (no key) | $0 |
| Twitter/X API v2 | Free (1,500/mo) | $0 |
| Resend | Free (100 emails/day) | $0 |
| Expo Push | Free | $0 |
| Vercel (web) | Free Tier | $0 |
| Expo EAS (builds) | Free Tier | $0 |
| GitHub Actions (cron) | Free (2K min/mo) | $0 |
| Stripe | 2.9% + $0.30/txn | Variable (revenue-based) |
| Apple Developer | Annual | $8.25/mo ($99/yr) |
| Google Play | One-time $25 | $0 |
| **Total Fixed Cost** | | **$0/month** |

*Stripe fees only incurred when revenue comes in. Apple Developer is the only fixed annual cost ($99/yr).*

### Scaling Costs (When Revenue Justifies)

| Stage | Users | Est. MRR | Monthly Cost | New Services |
|-------|-------|---------|-------------|-------------|
| MVP | 0-50 | $0-5K | $0 | Free tier everything |
| Early Growth | 50-200 | $5K-20K | ~$50 | + Serper.dev ($50/mo) |
| Growth | 200-500 | $20K-50K | ~$150 | + Supabase Pro ($25) + Claude Haiku ($20) |
| Scale | 500+ | $50K+ | ~$500 | + Apify for IG ($49) + Claude Sonnet ($150) |

### Revenue vs Cost at Scale

| Users | Est. MRR | Operating Cost | Gross Margin |
|-------|---------|----------------|-------------|
| 50 | $5,000 | $0 | ~100% |
| 200 | $20,000 | $50 | 99.8% |
| 500 | $50,000 | $150 | 99.7% |
| 1,000 | $100,000 | $500 | 99.5% |

*Note: Stripe processing fees (2.9% + $0.30) are additional and scale with revenue.*

---

## Timeline Summary

```
WEEK  1-2   ██████  Phase 1: Foundation (Auth, DB, Core UI)          ✅ DONE
WEEK  3-4   ██████  Phase 2: Daily Digest Engine (Content + AI)      ✅ DONE
WEEK  5-6   ██████  Phase 3: Conversation Tracker                    ✅ DONE
WEEK  7-8   ██████  Phase 4: Coaching, Gamification, Streaks         ✅ DONE
WEEK  9-10  ██████  Phase 5: Payments & Trial System                 ✅ DONE
WEEK 11-12  ██████  Phase 6: Email Automation & Notifications        ✅ DONE (UI ready)
WEEK 13-16  ████████████  Phase 7: V2 Features (Morning Routine)     ✅ DONE
WEEK 17-18  ██████  Phase 8: Testing, Polish & Launch                ⬜ NEXT
```

**Total timeline: 18 weeks (4.5 months) to full V1+V2 launch**
**V1 launch possible at Week 12 (3 months) with core features**

---

## Appendix: Quick-Start Checklist for the Team

### Accounts to Create (Do This First) — All Free Except Apple ($99/yr)
- [ ] [Google Cloud Console](https://console.cloud.google.com) — Custom Search API + YouTube API + Gemini (ALL FREE)
- [ ] [Programmable Search Engine](https://programmablesearchengine.google.com) — Content discovery (free)
- [ ] [Google AI Studio](https://aistudio.google.com) — Gemini API key (free)
- [ ] [Supabase](https://supabase.com) — Backend (free tier)
- [ ] [Stripe](https://stripe.com) — Payments (free to set up, pay per transaction)
- [ ] [Twitter Developer](https://developer.twitter.com) — X API v2 free tier
- [ ] [Resend](https://resend.com) — Email (free tier)
- [ ] [Apple Developer](https://developer.apple.com) — iOS App Store ($99/year — ONLY paid account)
- [ ] [Google Play Console](https://play.google.com/console) — Android ($25 one-time)
- [ ] [Expo](https://expo.dev) — Build service (free tier)
- [ ] [Sentry](https://sentry.io) — Error monitoring (free tier)
- [ ] [Anthropic Console](https://console.anthropic.com) — Claude AI (for LATER — when upgrading from Gemini)

### Environment Variables Needed
```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Google Custom Search (content discovery)
GOOGLE_CUSTOM_SEARCH_KEY=AIza...
GOOGLE_CUSTOM_SEARCH_CX=your_search_engine_id

# Google Gemini AI (free tier — MVP)
GEMINI_API_KEY=AIza...

# Claude AI (upgrade path — when revenue justifies)
ANTHROPIC_API_KEY=sk-ant-...

# YouTube Data API v3
YOUTUBE_API_KEY=AIza...

# Twitter/X API v2
TWITTER_BEARER_TOKEN=AAAA...

# Resend
RESEND_API_KEY=re_...

# Expo Push
EXPO_ACCESS_TOKEN=...
```

---

*This document is a living plan. Update as decisions are made and priorities shift.*
*Generated with assistance from Claude Code — Titan Global Technologies*
