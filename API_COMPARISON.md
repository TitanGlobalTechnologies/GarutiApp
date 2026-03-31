# API Strategy Comparison: SERP vs Individual Platform APIs

**Date:** March 31, 2026
**Purpose:** Team decision document — which approach to use for content discovery

---

## The Question

We need to discover top-performing real estate social media content in specific geographic markets (e.g., Cape Coral FL, Austin TX). Two approaches:

- **Approach A:** Use a SERP service (Google search results) as a universal discovery layer
- **Approach B:** Use each platform's official API individually

---

## Side-by-Side Comparison

### Cost Comparison

| Service | Approach A (SERP) | Approach B (Individual APIs) |
|---------|-------------------|------------------------------|
| **Instagram** | Serper.dev: included in $50/mo | Graph API: Free (but 30 hashtag/week limit) + Apify $49/mo for scraping |
| **YouTube** | Serper.dev: included | Data API v3: **Free** (10,000 units/day) |
| **Reddit** | Serper.dev: included | JSON API: **Free** (no key needed) |
| **Twitter/X** | Serper.dev: included | Free tier: write-only. **Read = $200/mo** (Basic) |
| **TikTok** | Serper.dev: included | Research API: Free but **2-8 week approval**, very selective |
| **Facebook** | Serper.dev: included | Graph API: Free (App Review required) |
| **Total MVP** | **$50/mo** (Serper.dev) | **$0-249/mo** (Free APIs + optional Twitter $200 + Apify $49) |
| **Total at scale** | **$130-250/mo** (SerpAPI) | **$50-300/mo** (Apify + Twitter) |

### Data Quality Comparison

| Data Point | SERP Results | Individual APIs |
|------------|-------------|-----------------|
| **Post URL** | ✅ Yes | ✅ Yes |
| **Post title/caption** | ⚠️ Snippet only (truncated) | ✅ Full text |
| **Thumbnail** | ✅ Yes | ✅ Yes |
| **View count** | ⚠️ Sometimes (if Google shows it) | ✅ Exact number (YouTube, TikTok) |
| **Like count** | ❌ No | ✅ Yes (all platforms except Facebook varies) |
| **Comment count** | ❌ No | ✅ Yes (all platforms) |
| **Share/retweet count** | ❌ No | ✅ Yes (Twitter, Reddit, TikTok) |
| **Engagement rate** | ❌ Cannot calculate | ✅ Can calculate from real metrics |
| **Creator profile** | ⚠️ Name only | ✅ Full profile (handle, follower count, bio) |
| **Post date** | ⚠️ Approximate | ✅ Exact timestamp |
| **Content recency** | ⚠️ Google's ranking (not chronological) | ✅ Sortable by date |
| **Location filtering** | ⚠️ Keyword only ("Cape Coral") | ⚠️ Varies by platform (see below) |

### Platform-by-Platform Breakdown

| Platform | SERP Discovery | Official API | Verdict |
|----------|---------------|-------------|---------|
| **YouTube** | Google indexes Shorts well. Get URL + title + sometimes view count from snippets. | **Best API available.** Free, 10K units/day, instant setup, returns views/likes/comments/full metadata. No approval needed. | **Use API** — it's free and gives 10x more data |
| **Instagram** | Google indexes Reels poorly. Many results are profile pages, not individual Reels. No engagement data. | Graph API: 30 hashtag/week limit, no location search, needs App Review. Apify scraper fills gaps but TOS risk. | **SERP for discovery + Apify for engagement** — or accept limited hashtag API |
| **Reddit** | Google indexes Reddit well. Get post title + snippet + subreddit. | Append `.json` to any URL → full data for free. No key needed. Upvotes, comments, full text. | **Use .json API** — it's literally free and instant |
| **Twitter/X** | Google indexes tweets. Get text + author. No metrics. | Free tier is write-only. Read access = $200/mo. Data is unreliable (X changes policies frequently). | **SERP for discovery, skip metrics** — $200/mo not worth it for MVP |
| **TikTok** | Google indexes TikTok moderately. Get URL + title. No metrics. | Research API requires application (2-8 weeks, selective). No public search API exists. | **SERP is the only option** unless approved for Research API |
| **Facebook** | Google indexes public Page posts. No engagement data. | Graph API needs App Review. Can get Page post reactions/comments. Personal posts are blocked. | **SERP for discovery** — Facebook API adds complexity for limited value |

### Setup & Time to Market

| Factor | SERP Approach | Individual APIs |
|--------|--------------|-----------------|
| **Time to first result** | Minutes (API key → search → results) | YouTube: minutes. Instagram: 2-5 days (App Review). TikTok: 2-8 weeks. Twitter read: instant but $200/mo. |
| **Approval processes** | None — just an API key | Instagram: App Review. Facebook: App Review. TikTok: Research application. Twitter: account approval. |
| **Risk of API revocation** | Low (you're querying Google, not the platforms) | Medium — Instagram/Facebook can revoke. Twitter changes policies often. TikTok is selective. |
| **Maintenance** | Low — one API, one format | High — 4-6 different APIs, different auth flows, different rate limits, different data formats |
| **Legal risk** | Gray area (scraping Google results) | Safe (using official APIs as intended) |

### Scalability

| Scale | SERP | Individual APIs |
|-------|------|-----------------|
| **5 markets** | 25 queries/day (well within free tier) | Easily handled by all free tiers |
| **20 markets** | 100 queries/day (Serper.dev $50/mo) | YouTube free. Instagram hits 30 hashtag limit. Need Apify. |
| **50+ markets** | 250 queries/day ($50-130/mo) | YouTube free. Instagram needs Apify ($49-499/mo). Reddit free. |
| **Content freshness** | Delayed — Google indexes on its own schedule (hours to days) | Real-time — API returns current data |

---

## Recommended Hybrid Strategy

**Don't choose one or the other. Use both strategically.**

| Platform | Discovery Method | Engagement Data | Cost |
|----------|-----------------|-----------------|------|
| **YouTube** | YouTube Data API search | YouTube Data API stats | **$0** |
| **Reddit** | Google Custom Search or Serper | Reddit `.json` endpoint | **$0** |
| **Instagram** | Serper.dev (SERP discovery) | Apify scraper (when budget allows) | **$0-49/mo** |
| **TikTok** | Serper.dev (SERP discovery) | None at MVP (apply for Research API now) | **$0** |
| **Twitter/X** | Serper.dev (SERP discovery) | Skip at MVP (not worth $200/mo) | **$0** |
| **Facebook** | Serper.dev (SERP discovery) | Skip at MVP | **$0** |

### MVP Phase (Month 1-3): $0-50/mo

```
YouTube ──→ YouTube Data API (free, rich data, instant)
Reddit  ──→ Google Custom Search (free) → Reddit .json (free)
Instagram → Google Custom Search (free) → link to post (no metrics)
TikTok  ──→ Google Custom Search (free) → link to post (no metrics)
Twitter ──→ Google Custom Search (free) → link to post (no metrics)
```

**Total: $0/month** using Google Custom Search free tier (100 queries/day)

### Growth Phase (Month 3-6): $50-100/mo

```
YouTube ──→ YouTube Data API (free)
Reddit  ──→ Reddit .json (free)
Instagram → Serper.dev ($50/mo) → Apify for metrics ($49/mo) ←── ADD
TikTok  ──→ Serper.dev (included) + Research API if approved
Twitter ──→ Serper.dev (included)
```

**Total: $50-100/month**

### Scale Phase (Month 6+): $100-300/mo

```
YouTube ──→ YouTube Data API (free)
Reddit  ──→ Reddit API with OAuth (free, higher limits)
Instagram → Instagram Graph API + Apify supplement
TikTok  ──→ TikTok Research API (if approved) + Serper fallback
Twitter ──→ X API Basic ($200/mo) ←── ADD only if ROI justifies
Facebook ──→ Graph API (if demand exists)
```

---

## Decision Matrix for Team Discussion

| Question | SERP Wins | Individual APIs Win |
|----------|-----------|-------------------|
| Speed to market? | ✅ One API, instant setup | |
| Data quality? | | ✅ Full metrics, exact numbers |
| Cost at MVP? | Tie ($0 both ways) | Tie |
| Cost at scale? | ✅ Predictable pricing | |
| Maintenance burden? | ✅ One integration | |
| Content freshness? | | ✅ Real-time data |
| Instagram Reels? | ✅ No API limits | |
| YouTube Shorts? | | ✅ Free, rich data, no limits |
| Legal safety? | | ✅ Official APIs = safe |
| TikTok? | ✅ Only option without Research API | |

### Bottom Line

**YouTube and Reddit → Always use their APIs (free and superior).**
**Instagram and TikTok → SERP is better for discovery (no API limits, no approval).**
**Twitter → SERP for now ($200/mo for reads isn't worth it at MVP).**

The hybrid approach gives us the best of both worlds: SERP for broad discovery where APIs are limited, and official APIs where they're free and rich.

---

## Action Items

- [ ] Set up Google Custom Search API (free, 5 minutes) — covers MVP
- [ ] Set up YouTube Data API v3 (free, 5 minutes) — best data source
- [ ] Apply for TikTok Research API NOW (2-8 week approval)
- [ ] Evaluate Serper.dev at $50/mo when scaling past 5 markets
- [ ] Evaluate Apify at $49/mo when Instagram engagement data becomes critical
- [ ] Re-evaluate Twitter/X API at $200/mo only after reaching $20K+ MRR
