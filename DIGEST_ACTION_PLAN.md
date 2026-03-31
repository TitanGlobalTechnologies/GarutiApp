# Daily Digest — Action Plan to Go Live

**Date:** March 31, 2026
**Goal:** Make the Daily Digest screen functional with real data
**Scope:** ONLY the digest screen — nothing else

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DAILY DIGEST SCREEN                       │
│  User sees top reels → picks one → generates script → edits │
└─────────────────────────┬───────────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
   ┌───────────┐   ┌───────────┐   ┌───────────┐
   │  SerpAPI   │   │ YouTube   │   │  Reddit   │
   │ (250/mo)   │   │ Data API  │   │ .json     │
   │            │   │ (free)    │   │ (free)    │
   │ Instagram  │   │ 10K/day   │   │ No key    │
   │ TikTok     │   │           │   │           │
   └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
         │                │                │
         └────────────────┼────────────────┘
                          ▼
                ┌───────────────────┐
                │  Content Cache    │
                │  (Supabase table) │
                └────────┬──────────┘
                         ▼
                ┌───────────────────┐
                │  User picks reel  │
                └────────┬──────────┘
                         ▼
                ┌───────────────────┐
                │  Check script     │
                │  cache            │
                │  ┌─ HIT → show   │
                │  └─ MISS ↓       │
                │   Claude API     │
                │   (generate once)│
                │   → cache it     │
                │   → show script  │
                └───────────────────┘
```

---

## Search Budget: 250 SerpAPI Searches/Month

### Rule: Use SerpAPI ONLY for platforms with no free API

| Platform | Method | Cost | Why |
|----------|--------|------|-----|
| **Instagram** | SerpAPI | 100 searches/mo | No free API for public Reel discovery |
| **TikTok** | SerpAPI | 100 searches/mo | No free API for public content discovery |
| **YouTube** | YouTube Data API v3 | FREE (10K units/day) | Official API is free and gives better data |
| **Reddit** | .json endpoint | FREE (no key needed) | Just append .json to any URL |
| **Reserve** | SerpAPI | 50 searches/mo | Retries, experiments, new markets |

### Refresh Schedule: Every 3 Days

- 200 searches / ~10 cycles per month = **20 searches per cycle**
- 10 Instagram queries + 10 TikTok queries per cycle
- Daily digest pulls from cache between refreshes
- Supports **2-3 markets** comfortably

### Exact Queries (Cape Coral FL Example)

**Instagram (5 per cycle):**
```
site:instagram.com/reel "cape coral" real estate
site:instagram.com/reel "cape coral FL" homes for sale
site:instagram.com/reel "cape coral" new construction
site:instagram.com/reel "cape coral" waterfront home
site:instagram.com/reel "cape coral" realtor tour
```

**TikTok (5 per cycle):**
```
site:tiktok.com "cape coral" real estate
site:tiktok.com "cape coral FL" home tour
site:tiktok.com "cape coral" housing market
site:tiktok.com "cape coral" new build
site:tiktok.com "cape coral" property investment
```

**SerpAPI params:** `location=Cape Coral,Florida` or `location=33914`, `gl=us`, `tbs=qdr:w` (past week)

**YouTube (free, unlimited):**
```
YouTube Data API: search?q="cape coral" real estate&type=video&videoDuration=short&order=viewCount
YouTube Data API: search?q="cape coral FL" homes&type=video&videoDuration=short&order=viewCount
```

**Reddit (free, unlimited):**
```
https://www.reddit.com/r/RealEstate/search.json?q=cape+coral&sort=new&t=week
https://www.reddit.com/r/florida/search.json?q=cape+coral+real+estate&sort=new&t=week
```

---

## Script Generation: Claude API + Cache

### Flow
```
User picks a reel
  → Check AsyncStorage: script:instagram_ABC123
    → HIT → show instantly (zero API calls)
    → MISS → Check Supabase: cached_scripts where platform='instagram' AND external_id='ABC123'
      → HIT → save to AsyncStorage → show
      → MISS → Call Claude API → save to Supabase → save to AsyncStorage → show
```

### Caching Rules
- **Cache key:** `platform + external_id` (stable, never changes)
- **Cache duration:** Forever (a reel's content never changes)
- **Generate once:** Same reel = same script for all users in that market
- **User edits:** Stored separately in `user_script_edits` table (personal, not shared)
- **Cost:** ~$0.53/month for 50 unique scripts with Claude Sonnet

### Database Tables

```sql
-- Shared script cache (one per reel per market)
CREATE TABLE cached_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  external_id TEXT NOT NULL,
  market_city TEXT NOT NULL,
  market_state TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_title TEXT,
  source_caption TEXT,
  generated_script TEXT NOT NULL,
  model_used TEXT DEFAULT 'claude-sonnet-4-6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, external_id, market_city)
);

-- Personal edits (per user, per script)
CREATE TABLE user_script_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cached_script_id UUID REFERENCES cached_scripts(id) ON DELETE CASCADE,
  edited_script TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, cached_script_id)
);
```

---

## Testing Without Burning Searches

### Mock Mode (SERPAPI_MODE=mock)

1. Make **1 real SerpAPI call** per query pattern
2. Save the full JSON response to `tests/fixtures/serpapi/`
3. Environment flag: `SERPAPI_MODE=mock` reads from fixtures, `SERPAPI_MODE=live` hits the API
4. All development and testing uses mock mode
5. Only production scheduled jobs use live mode

### Test Fixtures to Create
```
tests/fixtures/serpapi/
  instagram_cape_coral_real_estate.json
  instagram_cape_coral_homes.json
  tiktok_cape_coral_real_estate.json
  tiktok_cape_coral_home_tour.json
  youtube_cape_coral_results.json
  reddit_cape_coral_results.json
```

---

## Implementation Steps (in order)

### Step 1: Switch from Gemini to Claude API
- [ ] Update `src/lib/gemini.ts` → rename to `src/lib/ai.ts`
- [ ] Switch to Anthropic SDK (`@anthropic-ai/sdk`)
- [ ] Update prompt for single script generation (not 5 versions)
- [ ] Add `ANTHROPIC_API_KEY` to env
- [ ] Test with one hardcoded reel caption

### Step 2: Build SerpAPI Client
- [ ] Create `src/lib/discovery/serpapi.ts`
- [ ] Implement search with location param (zip code or city,state)
- [ ] Support `site:instagram.com/reel` and `site:tiktok.com` queries
- [ ] Parse results into our `DiscoveredContent` format
- [ ] Add `SERPAPI_KEY` to env
- [ ] Implement mock mode (`SERPAPI_MODE=mock|live`)

### Step 3: Build Test Fixtures
- [ ] Make 1 real SerpAPI call per query pattern (burn ~10 searches total)
- [ ] Save full JSON responses to `tests/fixtures/serpapi/`
- [ ] All further development uses mock mode

### Step 4: Build Content Pipeline (real)
- [ ] Update `src/lib/content-pipeline.ts` to use real clients
- [ ] SerpAPI for Instagram + TikTok
- [ ] YouTube Data API for YouTube
- [ ] Reddit .json for Reddit
- [ ] Merge, deduplicate, and rank by engagement
- [ ] Calculate virality score from real metrics
- [ ] Store discovered content in Supabase `content_items` table

### Step 5: Build Script Cache
- [ ] Create `cached_scripts` and `user_script_edits` tables in Supabase
- [ ] Update `useAdaptations` hook → rename to `useScript`
- [ ] Implement cache-check flow: AsyncStorage → Supabase → Claude API
- [ ] Store generated scripts in cache
- [ ] Handle user edits separately

### Step 6: Wire Digest Screen to Real Data
- [ ] Update `useDigest` hook to query Supabase `content_items` instead of mock data
- [ ] Update digest screen to show real content with real virality scores
- [ ] Update "Generate Script" to use the cache-aware `useScript` hook
- [ ] Test full flow: real content → real script → edit → save

### Step 7: Build Refresh Cron Job
- [ ] Create Supabase Edge Function: `refresh-content`
- [ ] Runs every 3 days (or manually triggered)
- [ ] Queries SerpAPI + YouTube + Reddit for each active market
- [ ] Stores results in `content_items`
- [ ] Respects 250/month budget (counts searches used)

---

## Environment Variables Needed

```env
# Claude API (script generation)
ANTHROPIC_API_KEY=sk-ant-...

# SerpAPI (Instagram + TikTok discovery)
SERPAPI_KEY=...
SERPAPI_MODE=mock          # mock | live

# YouTube Data API (free)
YOUTUBE_API_KEY=AIza...

# Supabase (database + cache)
EXPO_PUBLIC_SUPABASE_URL=https://...
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

---

## Cost Summary

| Service | Monthly Cost | What It Does |
|---------|-------------|-------------|
| SerpAPI | $0 (free 250/mo) | Instagram + TikTok content discovery |
| YouTube API | $0 (free 10K/day) | YouTube Shorts discovery + engagement |
| Reddit API | $0 (free, no key) | Reddit post discovery + engagement |
| Claude API | ~$0.53 | Script generation (~50 unique scripts) |
| Supabase | $0 (free tier) | Database + cache |
| **Total** | **~$0.53/month** | |

---

## What This Achieves

When complete, the Daily Digest screen will:
1. Show **real** top-performing reels from the user's market (not mock data)
2. Pull from Instagram, TikTok, YouTube, and Reddit
3. Display real virality scores based on actual engagement metrics
4. Generate a **real** AI script when the user picks a reel
5. Cache scripts so Claude is only called once per unique reel
6. Let users edit and copy scripts to clipboard
7. All for ~$0.53/month in API costs
