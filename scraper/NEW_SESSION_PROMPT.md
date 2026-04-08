# GarutiApp -- Local Authority Engine (LAE) -- Complete Context for New Session

> **READ THIS ENTIRE DOCUMENT BEFORE WRITING A SINGLE LINE OF CODE.**
> Every rule in this document was learned from a mistake. Break a rule and you will waste the user's time and money.

---

## WHAT THIS APP DOES (2 sentences)

GarutiApp finds the most viral real estate Instagram Reels and YouTube Shorts posted YESTERDAY in a user's local market (SW Florida), verifies the poster is a real licensed agent, and shows the top 5 per city. It then transcribes what the agent SAID in the video and generates a conversion-optimized script the user can record as their own version.

---

## WHO THE USER IS

- **Client:** John Garuti, real estate agent in SW Florida
- **Developer:** Gabriel (gaba) at Titan Global Technologies
- **Target users:** Non-technical real estate agents in SW Florida
- **User location:** Developer is in Brazil. All scraping must target US content.

---

## THE ABSOLUTE NON-NEGOTIABLE RULES

These are the 5 rules that were violated repeatedly and caused the most frustration. They are listed in priority order. If you violate ANY of these, the session is a failure.

### RULE 1: LOCATION VERIFICATION IS THE ENTIRE POINT OF THE APP

A post MUST mention its assigned city in the content (location tag, caption, title, transcript, or hashtags) before it can be placed in that city's tab. SerpAPI geolocation does NOT mean the result is FROM that city -- it means Google searched AS IF you were in that city. The results can be from anywhere in the country.

**What went wrong:** On April 8, audit showed 28 out of 30 city posts were WRONG. Fort Myers #1 was from Port St. Lucie. Punta Gorda #1 was from Hollywood, FL. Cape Coral had ZERO posts actually about Cape Coral. The entire app was showing garbage data.

**The fix that works:** Every post goes through a "city hard gate" that checks if the city name (or alias) appears in location tag + caption + title + transcript. If it does not, the post is REJECTED from that city tab and bumped to Florida or rejected entirely.

**City aliases to check:**
- Cape Coral: "cape coral", "capecoral", "#capecoral"
- Fort Myers: "fort myers", "ft myers", "ft. myers", "fortmyers", "#fortmyers"
- Naples: "naples" (careful: "naples" alone might match Naples, Italy -- combine with florida context)
- Bonita Springs: "bonita springs", "bonitasprings", "#bonitasprings"
- Lehigh Acres: "lehigh acres", "lehighacres", "#lehighacres"
- Punta Gorda: "punta gorda", "puntagorda", "#puntagorda", "charlotte county"

### RULE 2: FRESHNESS > VIRALITY -- NO EXCEPTIONS

Yesterday's posts ALWAYS come first. Only backfill from older days to reach 5 posts. NEVER rank an old viral post above a fresh post.

**Sorting logic:**
1. Get ALL posts from yesterday. Rank by virality score. Those are your first picks.
2. If yesterday has 5+ posts, DONE. Show top 5 by virality within yesterday.
3. If yesterday has only 3, go to day-before-yesterday, grab top 2 by virality from that day.
4. Display order: [yesterday posts by virality DESC] then [day-2 posts by virality DESC].
5. A post with 0 virality from yesterday BEATS a post with 10,000 virality from 3 days ago.
6. "Today" posts are USELESS -- they have no views yet. Yesterday is the freshest useful data.
7. Max lookback: 7 days.

### RULE 3: NEVER DELETE SCRAPED DATA

Each SerpAPI call costs money. Raw data files (digest_all_with_scope.json, yt_shorts_raw.json, etc.) must NEVER be overwritten or deleted. Filter into separate output files. Keep originals intact.

**What went wrong:** ai-audit.js was REMOVING posts from digest_all_with_scope.json, destroying paid-for data. Had to re-scrape at additional cost.

**The fix:** Filtering reads from raw data and writes to a separate file. The raw file is never modified. Reject lists go in audit_rejects.json. generate-live-digest.js reads rejects and skips them without touching the source.

### RULE 4: SCRIPTS FROM SPEECH ONLY

Scripts replicate what was SAID on camera. If nobody spoke (b-roll with music), there is NO script. Never fabricate a script from captions. Captions are marketing text, not spoken words.

**Threshold:** 15+ words of real transcribed speech = script eligible. Below that = "No speech to script" label in the UI.

### RULE 5: FLORIDA >= ANY CITY, USA >= FLORIDA (Tab Hierarchy)

The Florida tab is the UNION of all 6 city tabs + Florida-wide search results. If Naples top post has score 60, Florida's top post MUST be >= 60. Same logic: USA >= Florida. If the hierarchy is broken, the app looks broken.

---

## TAB HIERARCHY (how the app displays content)

```
USA tab     = ALL posts from ALL scopes (cities + FL + 10 nearby states + USA-wide)
              Top 5 by freshness-then-virality. Deduped.

Florida tab = ALL SWFL city posts + Florida-wide search results
              Top 5 by freshness-then-virality. Deduped.
              Florida ALWAYS >= any individual city's top score.

City tab    = ONLY posts verified to mention that specific city
              Top 5 by freshness-then-virality. Deduped.
```

**Supported cities:** Cape Coral, Fort Myers, Naples, Bonita Springs, Lehigh Acres, Punta Gorda

**Author dedup:** 1 post per author per tab. Same agent can appear across tabs but only once per tab.

---

## TECH STACK

- **Frontend:** React Native + Expo SDK 54, TypeScript, Expo Router
- **Styling:** NativeWind/Tailwind + inline StyleSheet (premium dark theme #0A0A0F)
- **Backend:** None yet (Supabase planned). App runs in demo mode with static data in `src/data/live-digest.ts`
- **Deployment:** Vercel (static web export from `dist/` folder)
- **Scraper:** Node.js/TypeScript in `scraper/` directory
- **Repo:** https://github.com/TitanGlobalTechnologies/GarutiApp
- **Live URL:** https://dist-eight-rouge-48.vercel.app

---

## FILE PATHS (all relative to GarutiApp/)

### Scraper (scraper/)
- `scraper/.env` -- API keys (SERPAPI_KEY, ANTHROPIC_API_KEY, YOUTUBE_API_KEY). Gitignored.
- `scraper/scrape-all-states.js` -- Main Instagram scraper. SerpAPI Google engine. 6 cities + FL + 10 states.
- `scraper/scrape-youtube-shorts.js` -- YouTube Shorts scraper. SerpAPI Google + YouTube Data API.
- `scraper/generate-live-digest.js` -- Reads raw data, applies filters, builds hierarchy, outputs live-digest.ts.
- `scraper/localize-scripts.js` -- Generates per-city script versions via Claude API.
- `scraper/audit-cities.js` -- Checks if city posts actually mention their city (diagnostic tool).
- `scraper/src/agent-check.js` -- Tiered agent detection (shared by all scrapers).
- `scraper/src/youtube-engagement.js` -- YouTube Data API v3 enrichment.
- `scraper/src/youtube-transcript.js` -- Free transcript fetcher via Python youtube-transcript-api.
- `scraper/src/knowledge-base.ts` -- Claude script generation prompts.

### Raw Data (scraper/output/)
- `output/digest_all_with_scope.json` -- Master Instagram data. DO NOT DELETE.
- `output/digest_master_raw.json` -- Master combined (IG + YT) data. DO NOT DELETE.
- `output/yt_shorts_raw.json` -- Raw YouTube data. DO NOT DELETE.
- `output/audit_rejects.json` -- Shortcodes to filter out (bad posts).
- `output/bio_cache/` -- Cached Instagram profile bios.
- `output/transcripts/` -- Cached video transcripts.
- `output/script_cache/` -- Cached Claude-generated scripts.

### Frontend (src/)
- `src/data/live-digest.ts` -- THE output file that powers the app. Generated by generate-live-digest.js. Contains all posts for all tabs.
- `src/data/swfl-zipcodes.ts` -- Zip code mapping for cities.

---

## THE COMPLETE PIPELINE

```
1. SEARCH (SerpAPI)
   Instagram: site:instagram.com/reel queries with geolocation per target
   YouTube: site:youtube.com/shorts with intext:"{city}" for cities,
            geolocation-only for states
   Date filter: yesterday first (tbs date range)

2. ENGAGEMENT (free APIs)
   Instagram: GraphQL endpoint (views, likes, comments, locationName, caption)
   YouTube: Data API v3 videos.list (views, likes, comments, publishedAt)

3. VIRALITY SCORING
   Instagram: score = (views / 20) + (likes / 10) + comments
   YouTube:   score = (views / 20) + (likes / 10) + comments   [SAME formula, not deflated]
   Score < 1 = reject (broken data)

4. LOCATION VERIFICATION (BEFORE agent detection)
   City posts: verify city mentioned in location + caption + title + transcript
   If not mentioned: bump to Florida or reject
   Out-of-area gate: reject posts mentioning non-FL states/cities

5. AGENT DETECTION (tiered system)
   Tier 1 (instant): license #, "realtor" in bio/username, 60+ brokerage names
   Tier 2 (need 2+): RE role phrases, transaction terms, ranking claims
   Negative overrides: coaches, mortgage, lender, photographer, builder, flipper

6. TRANSCRIPTION (Whisper, local Python, free)
   Download video, run Whisper, get spoken words
   15+ words = speech detected = script eligible

7. SCRIPT GENERATION (Claude API)
   Only for posts with real speech
   Conversion-optimized rewrite of what was said
   No em dashes, no semicolons, conversational tone

8. HIERARCHY BUILDING (generate-live-digest.js)
   City = only verified city posts
   Florida = all city posts + FL-wide posts, top 5
   USA = all posts from all scopes, top 5
   Sort: freshness first, virality within same date

9. OUTPUT (live-digest.ts)
   TypeScript file with all posts for all tabs
   Imported by React Native frontend
   Deployed to Vercel as static web app
```

---

## API BUDGET AND KEYS

| API | Cost | Monthly Limit | Notes |
|-----|------|---------------|-------|
| SerpAPI | per search | 250/month | Instagram run = ~72 searches. YouTube = ~20. Budget carefully. |
| YouTube Data API v3 | per quota unit | 10,000/day | search.list = 100 units. videos.list = 1 unit per 50 videos. |
| Claude API (Anthropic) | per token | Pay as you go | Used for script generation. Cache per shortcode. |
| Instagram GraphQL | free | unlimited | Engagement data, no key needed. |
| youtube-transcript-api | free | unlimited | Python library, no key needed. |
| Return YouTube Dislike API | free | unlimited | Fallback for YT engagement. |
| Googlebot bio fetch | free | unlimited | Fetch IG profiles as Googlebot for bio. |

Keys are in `scraper/.env`. Never commit this file.

---

## SEARCH QUERY STRATEGY

### Instagram (SerpAPI Google engine)

**Per city (6 cities):**
```
site:instagram.com/reel intext:"{city}" OR intext:"{citynospace}"
site:instagram.com/reel intext:"{city}" OR intext:"{citynospace}" "homes" OR homes
```
With `location: "{city},Florida,United States"` and `tbs` date filter for yesterday.

**Agent-keyword queries (all 17 targets: 6 cities + FL + 10 states):**
```
site:instagram.com/reel intext:"realtor" real estate
site:instagram.com/reel intext:"realty" real estate
site:instagram.com/reel intext:"real estate" homes for sale
```

### YouTube (SerpAPI Google engine for cities, YouTube Data API for enrichment)

**Per city:**
```
site:youtube.com/shorts intext:"{city}" real estate
site:youtube.com/shorts intext:"{city}"
```
The `intext:` operator searches transcripts via Google indexing, which both finds the video AND verifies location.

**Per state:**
```
site:youtube.com/shorts intext:"{state}" intext:"realtor"
site:youtube.com/shorts intext:"{state}" intext:"real estate"
site:youtube.com/shorts intext:"{state}" intext:"listing"
site:youtube.com/shorts intext:"{state}" intext:"homes for sale"
```

**CRITICAL: No state/city names in queries when using geolocation.** The `location` SerpAPI param handles targeting. Putting "Florida" in the query double-filters and kills results. Only use state names in `intext:` operators.

---

## VIRALITY FORMULA

**ONE formula for BOTH platforms:**
```
score = Math.round((views / 20) + (likes / 10) + comments)
```

**What went wrong:** The YouTube scraper originally used `views/200` (10x deflation), making YouTube posts invisible next to Instagram posts. A YouTube post with 15,000 views scored 75, while an Instagram post with 15,000 views scored 750. Fixed April 8 to use the same formula.

The query planner HTML file (`scraper/query-planner.html`) STILL shows the old deflated YouTube formula. Ignore it. The code is the source of truth.

---

## MISTAKES THAT WERE MADE (learn from these)

### Mistake 1: Trusting geolocation = location
SerpAPI `location` param means "search as if you're in this place." It does NOT mean results are from that place. A search geolocated to Cape Coral returns results from agents in Cleveland, DMV, Hollywood, etc. EVERY post must be verified via content before city assignment.

### Mistake 2: Deleting raw data
ai-audit.js was modifying digest_all_with_scope.json directly, removing posts. This destroyed paid-for SerpAPI data. The fix: write reject lists to a separate file, read them during filtering.

### Mistake 3: YouTube virality deflation
YouTube formula used views/200 while Instagram used views/20. This made YouTube posts invisible in mixed tabs. Both platforms now use the same formula.

### Mistake 4: Showing "today" posts
Posts from today have 0-10 views. They haven't gone viral yet. The Florida tab was showing today's score-0 posts above yesterday's score-39 posts because of strict freshness sort. Fix: exclude today entirely. Yesterday is the freshest useful day.

### Mistake 5: Score-0 posts shown in app
215 posts had score 0 from failed enrichment (API returned 0 views/likes). These were displayed in the app. Fix: filter out score < 1 before display.

### Mistake 6: Broken tab hierarchy
Florida was showing lower scores than individual cities, which breaks user trust. Fix: Florida = union of all city posts + FL-wide search, pick top 5 globally.

### Mistake 7: Fabricating scripts from captions
Scripts were generated from caption text for posts where nobody spoke on camera. Users watched the video, saw nobody talking, lost trust. Fix: only generate scripts from Whisper transcripts with 15+ words.

### Mistake 8: Playwright scraper triggered CAPTCHAs
The original scraper used Playwright to automate Google searches. From a Brazil IP, even single queries triggered CAPTCHAs. Fix: replaced with SerpAPI which handles geolocation, date filtering, and anti-bot natively. Playwright code is legacy, kept for reference.

### Mistake 9: Not verifying agent before showing post
Some displayed posts were from media companies, builders, investors, mortgage brokers -- not real estate agents. The tiered agent detection system catches these but it must run on EVERY post before display.

### Mistake 10: City posts appearing in wrong city tab from IG scraper
The Instagram scraper (scrape-all-states.js) assigned posts to city scopes based on which SerpAPI geo-target returned them. But the same post can appear in multiple geo-targets. The city hard gate in generate-live-digest.js is the safety net, but the scraper itself should also verify.

---

## CURRENT STATE OF THE APP (as of April 8, 2026)

### What works:
- YouTube Shorts scraper with city hard gate (location verification via intext:)
- generate-live-digest.js with city hard gate + out-of-area rejection
- Tab hierarchy (Florida = union of cities)
- Agent detection (tiered system)
- Freshness-first sorting
- Score-0 filtering
- Author dedup

### What is broken RIGHT NOW (from audit-cities.js run):
1. **Cape Coral: 5/5 posts are WRONG.** None mention Cape Coral. Posts from Costa Rica realtor, Newcastle Australia, generic national agents. The Instagram scraper did not run with intext:"{city}" queries, only agent-keyword queries with geolocation.
2. **Fort Myers: 5/5 posts are WRONG.** #1 is from Port St. Lucie (score 1428). #2 from Tampa. Others are generic national.
3. **Bonita Springs: 5/5 posts are WRONG.** #1 from Tampa. Others from Newport Beach, random national.
4. **Lehigh Acres: 5/5 posts are WRONG.** #1 from Vacaville CA. #2 from Zephyrhills FL.
5. **Punta Gorda: 5/5 posts are WRONG.** #1 from Hollywood FL. #2 from Miami Beach. #3 from Orlando.
6. **Naples: 1/5 wrong.** 4 posts correctly verified (naplesv2k, robertaj.naples, blazeluxuryhomes, buylivesellnaples). 1 wrong (moniquehope from "the hills").
7. **Florida: 1/5 wrong.** Jupiter FL post not flagged but is actually fine (Jupiter is in FL). The rest check out.

**Root cause:** The Instagram data in digest_all_with_scope.json comes from the old `scrape-all-states.js` run that used agent-keyword queries with geolocation but NO city verification. The city hard gate exists in generate-live-digest.js but it is being applied to the LIVE DIGEST OUTPUT, not to the raw IG data. The raw IG data has already been filtered into city scopes based on which geo-target returned them, which is wrong.

**The fix:** The generate-live-digest.js city hard gate IS running (the code is there at line 166-187) but the Instagram posts don't contain the city name because they were found via generic "realtor" queries, not city-specific queries. The solution is:
1. Run Instagram scraper with city-specific queries: `site:instagram.com/reel intext:"{city}"` (same pattern as YouTube)
2. OR: re-process existing raw data and only keep posts that mention their city
3. The YouTube data is largely correct because it uses `intext:"{city}"` which pre-verifies location

---

## DAILY WORKFLOW (what to run)

```bash
# 1. Scrape Instagram (cities + FL + states)
cd GarutiApp/scraper
node scrape-all-states.js

# 2. Scrape YouTube Shorts
node scrape-youtube-shorts.js

# 3. Generate localized scripts for FL/USA posts
node localize-scripts.js

# 4. Generate the live digest (applies all filters, builds hierarchy)
node generate-live-digest.js

# 5. Build and deploy
cd .. && npx expo export --platform web
# Patch dist/index.html with PWA tags
cd dist && vercel --prod --yes
```

---

## DEPLOYMENT NOTES

- `npx expo export --platform web` overwrites dist/index.html each time
- Must re-add PWA meta tags, service worker, and reset script after each export
- `dist/` folder can get locked by Vercel -- use `--output-dir dist2` then copy if needed
- PWA files are in `pwa/` directory
- Reset URL: add `?reset` to clear cache

---

## WHAT NEEDS TO HAPPEN NEXT (priority order)

1. **Fix Instagram city scraper queries.** Change from agent-keyword-only queries to include `intext:"{city}"` queries per city. This is the same pattern that works for YouTube. Without this, city tabs will always be wrong for Instagram posts.

2. **Re-run Instagram scrape with fixed queries.** The current data (digest_all_with_scope.json) has 26/30 city posts wrong. Need a fresh scrape with city-verified data.

3. **Run full pipeline end-to-end.** scrape-all-states.js -> scrape-youtube-shorts.js -> localize-scripts.js -> generate-live-digest.js -> deploy.

4. **Verify output with audit-cities.js.** After every scrape, run the audit to confirm location accuracy before deploying.

5. **Set up daily automation.** Cron job for the full pipeline.

---

## HOW TO VERIFY YOUR WORK

After ANY change to the scraper or digest generator:

```bash
# Run the audit
node audit-cities.js

# Expected output: "All 5 verified" for every city
# If ANY city shows "WRONG?" posts, DO NOT DEPLOY
```

Check the hierarchy:
- Florida top score must be >= the highest city top score
- Every city post must mention that city in its content
- No score-0 posts anywhere
- No "today" posts (only yesterday and older)
- 1 author per tab max

---

## SUMMARY FOR THE AI

You are building a content discovery app for real estate agents. The app shows them the most viral RE content from their local city, so they can create their own version. The pipeline is: search -> verify location -> verify agent -> score -> rank by freshness -> display.

The #1 mistake that keeps happening is: assigning posts to city tabs without verifying the post is actually FROM that city. This destroys the app's core value. ALWAYS verify location from content, NEVER trust geolocation-based search results alone.

The #2 mistake is: breaking the freshness rule. Yesterday's mediocre post beats last week's viral hit. Always.

The #3 mistake is: deleting raw data. Every scrape costs money. Filter, don't destroy.

If you follow these rules, the app works. If you break them, you waste time and money.
