# Manual Scraping Guide — When SerpAPI Credits Run Out

If you run out of the 250 free SerpAPI searches, you can replicate exactly
what SerpAPI does by hand in a browser. Here's how.

## What SerpAPI Does (Step by Step)

For each search, SerpAPI:
1. Opens Google.com
2. Sets the location to "Cape Coral, Florida, United States" (as if you're searching from there)
3. Enters a search query
4. Filters results to 2026 only
5. Returns the first 10 results (title, URL, snippet)
6. Can paginate to get results 11-20, 21-30, etc.

## The Exact Queries We Run

### Query 1 (pages 1-3 = 30 results):
```
site:instagram.com/reel "cape coral" real estate
```

### Query 2 (pages 1-3 = 30 results):
```
site:instagram.com/reel "cape coral" homes for sale
```

### Query 3 (pages 1-3 = 30 results):
```
site:instagram.com/reel "cape coral" realtor home tour
```

### Query 4 (page 1 only = 10 results):
```
site:instagram.com/reel "cape coral FL" housing market
```

**Total: ~100 results**

## How to Do This Manually

### Step 1: Open Google
Go to [google.com](https://google.com)

### Step 2: Search
Paste this into the search bar:
```
site:instagram.com/reel "cape coral" real estate
```

### Step 3: Filter to 2026
- Click **"Tools"** (below the search bar)
- Click **"Any time"**
- Click **"Custom range..."**
- Set: From **01/01/2026** To **12/31/2026**
- Click **"Go"**

### Step 4: Collect URLs
For each result on the page:
- Copy the Instagram Reel URL (looks like `https://www.instagram.com/reel/ABC123/`)
- Copy the title (the text shown in the search result)
- Note any numbers in the snippet (views, likes)

### Step 5: Paginate
- Scroll to the bottom of the page
- Click **"Next"** to go to page 2
- Repeat collecting URLs
- Click **"Next"** again for page 3

### Step 6: Repeat for Other Queries
Do the same for queries 2, 3, and 4 above.

### Step 7: Save Results
Save the collected URLs in this JSON format:
```json
[
  {
    "title": "Stop buying in Cape Coral until...",
    "url": "https://www.instagram.com/reel/ABC123/",
    "snippet": "48.2K views. The flood zone map changes everything...",
    "position": 1,
    "query": "manual"
  }
]
```

Save this file as:
```
scraper/fixtures/serpapi/cape_coral_all_results.json
```

Then run the scraper in mock mode:
```bash
cd scraper
npm run scrape:mock
```

It will pick up your manually collected URLs and process them normally
(engagement data, virality scoring, Claude script generation).

## Automation Option (Playwright)

If you want to automate this in a browser:

```typescript
// Pseudocode — actual implementation would use Playwright
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Set location via Google URL params
await page.goto('https://www.google.com/search?' +
  'q=site:instagram.com/reel+"cape+coral"+real+estate' +
  '&tbs=cdr:1,cd_min:01/01/2026,cd_max:12/31/2026' +
  '&gl=us&num=10');

// Extract results
const results = await page.$$eval('.g a', links =>
  links.map(a => ({ url: a.href, title: a.textContent }))
);
```

**Warning:** Google will serve CAPTCHAs after ~50-100 automated queries.
For 10-12 queries per day, you'll likely be fine. Use delays between requests.

## SerpAPI Parameters Reference

| Parameter | Value | What It Does |
|-----------|-------|-------------|
| `engine` | `google` | Use Google Search |
| `q` | `site:instagram.com/reel "cape coral" real estate` | The search query |
| `location` | `Cape Coral,Florida,United States` | Search as if from Cape Coral |
| `gl` | `us` | Google country = United States |
| `hl` | `en` | Language = English |
| `tbs` | `cdr:1,cd_min:01/01/2026,cd_max:12/31/2026` | Only 2026 content |
| `num` | `10` | Results per page (max 10) |
| `start` | `0`, `10`, `20` | Pagination offset |

The `tbs` parameter is the key one — `cdr:1` means custom date range,
`cd_min` and `cd_max` set the boundaries.
