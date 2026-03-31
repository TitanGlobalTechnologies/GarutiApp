# Content Discovery Strategy — Zero-Cost Architecture

**Version:** 1.0
**Date:** March 30, 2026
**Status:** Research Complete — Ready for Implementation

---

## Executive Summary

Instead of using platform-specific APIs with restrictive limits (Instagram's 30-hashtag cap) or expensive scraping services (Apify at $49/mo, BrightData at $500/mo), we use **Google as a universal content discovery layer** across ALL social platforms.

**Total monthly cost at MVP: $0**

---

## The Approach

```
┌──────────────────────────────────────────────────────┐
│           STEP 1: DISCOVER (Google Search)            │
│                                                      │
│  Google Custom Search API (100 free queries/day)     │
│  ┌─────────────────────────────────────────────┐     │
│  │ site:instagram.com "Cape Coral" real estate  │     │
│  │ site:youtube.com "Cape Coral" realtor shorts │     │
│  │ site:reddit.com "Cape Coral" real estate     │     │
│  │ site:twitter.com "Cape Coral" realtor        │     │
│  └─────────────────────────────────────────────┘     │
│  Returns: URLs, titles, snippets, dates              │
└──────────────────────┬───────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│         STEP 2: ANALYZE (Platform-Specific)           │
│                                                      │
│  YouTube → Data API v3 (FREE, 10K calls/day)         │
│    ✅ views, likes, comments, title, channel         │
│                                                      │
│  Reddit → Public JSON API (FREE, no key needed)      │
│    ✅ score, upvote_ratio, comments, author          │
│                                                      │
│  Twitter/X → API v2 Free Tier (1,500 reads/mo)       │
│    ✅ likes, retweets, replies, impressions          │
│                                                      │
│  Instagram → Embed page scrape (fragile, free)       │
│    ⚠️ likes sometimes, comments sometimes            │
│    Fallback: oEmbed for basic metadata only          │
│                                                      │
│  Facebook → No viable free method                    │
│    ❌ Skip at MVP. Add later with paid scraper.      │
└──────────────────────┬───────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│          STEP 3: RANK & ADAPT (AI Engine)             │
│                                                      │
│  Google Gemini API Free Tier                         │
│    15 req/min, 1M tokens/day — $0/month              │
│    OR Groq free tier (Llama 3 / Mixtral)             │
│                                                      │
│  Score content by engagement metrics                 │
│  Generate 5 AI adaptations per top post              │
│  Store in Supabase (free tier)                       │
└──────────────────────────────────────────────────────┘
```

---

## Step 1: Content Discovery via Google Search

### Google Custom Search JSON API

**Why this is the play:**
- Google already indexes and ranks ALL public social media content
- Location-specific results are built into Google's natural indexing
- Supports ALL advanced search operators (site:, inurl:, intitle:, date filters)
- Works for ANY platform with one unified approach
- **100 queries/day FREE = 3,000/month**

**Setup Steps:**
1. Go to [programmablesearchengine.google.com](https://programmablesearchengine.google.com)
2. Create a Custom Search Engine
   - Set "Search the entire web" = ON
   - Name it "LAE Content Discovery"
3. Get your Search Engine ID (cx)
4. Go to [console.cloud.google.com](https://console.cloud.google.com)
5. Enable "Custom Search API"
6. Create an API Key
7. Store both `cx` and API key in environment variables

**API Call:**
```
GET https://www.googleapis.com/customsearch/v1
  ?key=YOUR_API_KEY
  &cx=YOUR_SEARCH_ENGINE_ID
  &q=site:instagram.com "Cape Coral" real estate
  &dateRestrict=w1          (last week)
  &num=10                   (results per page)
```

**Response includes:** title, link (URL), snippet, displayLink, pagemap (thumbnails)

**Query Templates by Platform:**

| Platform | Query Template |
|----------|---------------|
| Instagram Reels | `site:instagram.com/reel "Cape Coral" real estate` |
| Instagram Posts | `site:instagram.com/p "Cape Coral" realtor` |
| YouTube Shorts | `site:youtube.com/shorts "Cape Coral" real estate` |
| YouTube Videos | `site:youtube.com/watch "Cape Coral FL" real estate` |
| Reddit | `site:reddit.com "Cape Coral" real estate` |
| Twitter/X | `site:x.com "Cape Coral" realtor OR "real estate"` |
| TikTok | `site:tiktok.com "Cape Coral" real estate` |
| Facebook | `site:facebook.com "Cape Coral" real estate agent` |

**Query Budget (5 markets, daily refresh):**

| Queries | Calculation | Count |
|---------|-------------|-------|
| 5 markets × 4 platforms × 1 query each | Base discovery | 20/day |
| Remaining budget for variations/keywords | Extra coverage | 80/day |
| **Total** | | **100/day (FREE limit)** |

That's **5 markets fully covered** with room to spare. When you need more:
- **Serper.dev**: 2,500 free credits to start, then $50/mo for 50,000 searches
- **SerpAPI**: $50/mo for 5,000 searches
- **Self-hosted SearxNG**: Free forever (just need a $5/mo VPS)

### Scaling Beyond Free Tier

| Users | Markets | Queries/Day | Solution | Cost |
|-------|---------|-------------|----------|------|
| < 100 | 5 | ~50 | Google Custom Search free | $0 |
| 100-500 | 10-20 | ~200 | Serper.dev | $50/mo |
| 500+ | 50+ | ~1,000 | SerpAPI Business | $250/mo |

---

## Step 2: Post Engagement Analysis (Per Platform)

### YouTube — BEST SOURCE (Excellent, Free)

**Method:** YouTube Data API v3 (official, free)
**Cost:** $0 (10,000 units/day, each video lookup = 1 unit = 10,000 videos/day)

**What you get:** viewCount, likeCount, commentCount, title, channelTitle, description, publishedAt, thumbnails

**Setup:**
1. Google Cloud Console → Enable YouTube Data API v3
2. Create API Key
3. Call: `GET https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=VIDEO_ID&key=KEY`

**Code Example (Edge Function):**
```typescript
async function getYouTubeStats(videoId: string) {
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`
  );
  const data = await res.json();
  const item = data.items[0];
  return {
    title: item.snippet.title,
    channel: item.snippet.channelTitle,
    views: parseInt(item.statistics.viewCount),
    likes: parseInt(item.statistics.likeCount),
    comments: parseInt(item.statistics.commentCount),
    publishedAt: item.snippet.publishedAt,
    thumbnail: item.snippet.thumbnails.high.url,
  };
}
```

**Verdict:** Rock-solid. Best free data source. Prioritize YouTube content.

---

### Reddit — EXCELLENT (Free, No Key Needed)

**Method:** Append `.json` to any Reddit URL
**Cost:** $0 (no API key needed for public data)
**Rate Limit:** ~10 req/min unauthenticated, 60 req/min with free OAuth

**What you get:** score (net upvotes), upvote_ratio, num_comments, title, selftext, author, subreddit, created_utc

**Code Example:**
```typescript
async function getRedditStats(postUrl: string) {
  const jsonUrl = postUrl.endsWith('/') 
    ? postUrl + '.json' 
    : postUrl + '/.json';
  const res = await fetch(jsonUrl, {
    headers: { 'User-Agent': 'LAE-ContentDiscovery/1.0' }
  });
  const data = await res.json();
  const post = data[0].data.children[0].data;
  return {
    title: post.title,
    author: post.author,
    score: post.score,
    upvoteRatio: post.upvote_ratio,
    comments: post.num_comments,
    subreddit: post.subreddit,
    createdAt: new Date(post.created_utc * 1000),
  };
}
```

**Gotcha:** `score` is fuzzed by Reddit (anti-spam). `upvote_ratio` is more reliable. No view count available.

**Verdict:** Incredibly easy. Second-best free data source.

---

### Twitter/X — USABLE (Free Tier, Low Volume)

**Method:** Twitter API v2 Free Tier
**Cost:** $0 (1,500 tweet reads/month)
**Rate Limit:** 1 app, read-only

**What you get:** like_count, retweet_count, reply_count, quote_count, impression_count, text, author_id

**Setup:**
1. Apply at [developer.twitter.com](https://developer.twitter.com)
2. Create a project + app
3. Get Bearer Token
4. Call: `GET https://api.twitter.com/2/tweets/TWEET_ID?tweet.fields=public_metrics,created_at`

**Gotcha:** 1,500 reads/month is very low. At 5 markets × 10 tweets each = 50 tweets/day = 1,500/month exactly. Tight but workable for MVP.

**Verdict:** Usable for MVP but limited. Prioritize YouTube and Reddit over Twitter.

---

### Instagram — FRAGILE (Free but Unreliable)

**Method:** Embed page scrape (the only free path that sometimes works)
**Cost:** $0
**Reliability:** Poor — breaks frequently, rate-limited aggressively

**What sometimes works:**
- Fetch `https://www.instagram.com/p/SHORTCODE/embed/`
- Parse the embedded HTML for JSON data containing like_count, comment_count
- Extract caption and author from the embed

**What you reliably get via oEmbed:**
- `GET https://api.instagram.com/oembed?url=POST_URL` (requires access token since ~2020)
- Returns: title (caption), author_name, thumbnail_url
- Does NOT return: likes, views, comments

**Rate Limits:** Expect IP blocks after ~100-200 requests/hour

**Gotchas:**
- Instagram serves a React shell — basic fetch + HTML parsing usually fails
- The embed endpoint is the only viable free path
- View counts on Reels are often missing from embeds
- Meta requires an access token even for oEmbed now

**MVP Recommendation for Instagram:**
1. Use Google Search to discover Instagram Reel URLs
2. Display the post title/caption and thumbnail from Google's search snippet (free)
3. Link directly to the Instagram post (let users see engagement natively)
4. Skip engagement scraping at MVP — show Google snippet data instead
5. Add paid scraping (Apify Reel scraper) later when revenue justifies it

**Verdict:** Don't spend engineering time fighting Instagram's anti-scraping at MVP. Use Google snippet data + direct links.

---

### Facebook — SKIP AT MVP

**Why:** Facebook is effectively locked down. No free method to get engagement data. Pages redirect to login walls for unauthenticated users.

**Future:** Add Facebook content via paid scraper (Apify) when revenue justifies it. Or rely on Google snippet data (title + description) + direct links, same as Instagram approach.

---

### TikTok — BONUS (Discoverable via Google)

**Method:** Google discovers TikTok URLs. TikTok oEmbed is public.
**oEmbed:** `GET https://www.tiktok.com/oembed?url=TIKTOK_URL`
- Returns: title, author_name, thumbnail_url, html (embed)
- Does NOT return: likes, views, comments

**Verdict:** Same approach as Instagram — use Google snippet data + direct link. Add engagement scraping later.

---

## Step 3: AI Content Adaptation — $0/month

### Google Gemini API (Free Tier) — RECOMMENDED

**Why:** 15 requests/minute, 1 million tokens/day. Completely free. Quality is competitive with Claude for structured content tasks.

**Setup:**
1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Create an API key
3. Use `gemini-1.5-flash` model (fastest, free tier)

**API Call:**
```typescript
async function generateAdaptations(content: {
  hook: string;
  script: string;
  platform: string;
  market: string;
  agentStyle: string;
}) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a real estate content strategist. Given this top-performing ${content.platform} post from ${content.market}:

Original Hook: "${content.hook}"
Original Script: "${content.script}"

Generate 5 adapted versions for a real estate agent in ${content.market}.
Style preference: ${content.agentStyle}

For each adaptation, provide:
1. Hook (attention-grabbing first line)
2. Full script (30-60 seconds)
3. Best posting time for ${content.market}
4. Conversation-starting CTA

Return as JSON array with keys: hook, script, postingTime, cta`
          }]
        }]
      })
    }
  );
  return await res.json();
}
```

**Capacity at Free Tier:**
- 1M tokens/day = ~400 adaptation sets/day (5 versions each)
- 5 markets × 5 top posts × 1 adaptation set = 25 sets/day
- **Using only 6% of free capacity** — massive room to grow

**Fallback Options (also free):**
| Service | Free Tier | Speed | Quality |
|---------|-----------|-------|---------|
| Google Gemini 1.5 Flash | 1M tokens/day | Fast | Good |
| Groq (Llama 3 70B) | 30 req/min, daily limits | Very Fast | Good |
| Cloudflare Workers AI | 10K neurons/day | Medium | Decent |
| Together.ai | $1 free credit | Fast | Good |

**When to upgrade to Claude:** When you have paying customers and want premium-quality adaptations. Use Claude Haiku 4.5 ($5-20/mo) or Sonnet 4.6 ($60-150/mo) at that point.

---

## Complete Zero-Cost MVP Stack

| Component | Service | Monthly Cost |
|-----------|---------|-------------|
| Content Discovery | Google Custom Search API (100/day free) | **$0** |
| YouTube Engagement | YouTube Data API v3 (10K/day free) | **$0** |
| Reddit Engagement | Public JSON API (no key needed) | **$0** |
| Twitter Engagement | API v2 Free Tier (1,500/mo) | **$0** |
| Instagram/FB/TikTok | Google snippet data + direct links | **$0** |
| AI Adaptations | Google Gemini 1.5 Flash (1M tokens/day) | **$0** |
| Backend + Auth + DB | Supabase Free Tier | **$0** |
| Email | Resend Free (100/day) | **$0** |
| Push Notifications | Expo Push (free) | **$0** |
| Web Hosting | Vercel Free Tier | **$0** |
| App Builds | Expo EAS Free Tier | **$0** |
| Scheduled Jobs | GitHub Actions (2K min/mo private) | **$0** |
| Payments | Stripe (2.9% + $0.30/txn) | **$0 fixed** |
| **TOTAL FIXED COST** | | **$0/month** |

*Stripe fees are variable and only incurred when revenue comes in.*

---

## Daily Pipeline Schedule

```
5:00 AM EST — GitHub Actions cron triggers Supabase Edge Function
  │
  ├─ For each market (Cape Coral, Austin, Charlotte, Tampa, etc.):
  │   ├─ Query Google Custom Search: Instagram Reels for this market
  │   ├─ Query Google Custom Search: YouTube Shorts for this market
  │   ├─ Query Google Custom Search: Reddit posts for this market
  │   └─ Query Google Custom Search: Twitter posts for this market
  │
  ├─ Collect all URLs from search results
  │
  ├─ For YouTube URLs: Fetch engagement data via YouTube Data API
  ├─ For Reddit URLs: Fetch engagement data via .json endpoint
  ├─ For Twitter URLs: Fetch engagement data via API v2
  ├─ For Instagram/TikTok: Use Google snippet data (title, description)
  │
  ├─ Score and rank all content by engagement metrics
  ├─ Select top 5 per market
  │
  └─ For each top 5 post:
      └─ Generate 5 AI adaptations via Gemini API
      └─ Store in Supabase

7:00 AM EST — Daily digests ready for all users
8:30 AM EST — Push notification: "Your daily digest is ready"
```

---

## Scaling Costs (When Revenue Justifies It)

| Stage | Users | Monthly Revenue | Monthly Cost | Action |
|-------|-------|----------------|-------------|--------|
| MVP | 0-50 | $0-5K | $0 | Free tier everything |
| Early Growth | 50-200 | $5K-20K | ~$50 | Serper.dev for more queries |
| Growth | 200-500 | $20K-50K | ~$150 | + Claude Haiku + Supabase Pro |
| Scale | 500+ | $50K+ | ~$500 | + Apify for Instagram + Claude Sonnet |

---

## Key Tradeoffs at $0/month

| Tradeoff | Impact | Mitigation |
|----------|--------|------------|
| Gemini vs Claude quality | Slightly less refined adaptations | Better prompts, user feedback loop |
| No Instagram engagement data | Can't rank IG posts by metrics at MVP | Use Google's ranking (already engagement-weighted), add later |
| No Facebook data | Missing one platform | Real estate content lives on IG/YT/TikTok more than FB |
| 100 Google queries/day cap | Limited to ~5 markets at MVP | Enough for validation. Scale to Serper at $50/mo |
| DIY scraping maintenance | Code can break if platforms change | Start with most stable sources (YouTube, Reddit) |
| Twitter 1,500/mo limit | Very tight | Prioritize YouTube + Reddit. Twitter is supplementary. |

---

## Implementation Priority

1. **Week 1:** Set up Google Custom Search + YouTube Data API + Reddit JSON
2. **Week 2:** Build Gemini adaptation pipeline + Supabase storage
3. **Week 3:** Add Twitter/X API v2 + Instagram Google snippet fallback
4. **Week 4:** Build daily cron pipeline on GitHub Actions
5. **When profitable:** Graduate to paid tiers (Serper, Claude, Apify)

---

*This architecture validates the product at zero cost. Spend money only after proving product-market fit.*
