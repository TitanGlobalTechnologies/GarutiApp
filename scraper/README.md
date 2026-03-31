# LAE Content Scraper

Discovers the most viral real estate Instagram Reels in specific Florida markets.
Runs once daily, picks top 5 per location, generates virality scores.

## Architecture

```
Google Custom Search API (free, 100/day)
  → Discovers Instagram Reel URLs for each market
  → 10 results per query, 2 queries per location = 20 candidates

instagrapi (open source Python library)
  → Fetches engagement data for each discovered Reel
  → Views, likes, comments → virality score

Claude API (your key)
  → Generates one script per unique Reel (cached forever)
```

## Setup

```bash
cd scraper
npm install
cp .env.example .env    # Add your API keys
npm run scrape          # Run with live APIs
npm run scrape:mock     # Run with cached fixtures (no API calls)
```

## Virality Score Formula

Each metric is normalized to 0-100 within the batch, then weighted:

```
score = (views_normalized * 0.4) + (likes_normalized * 0.3) + (comments_normalized * 0.3)
```

Top post gets ~95, lowest gets ~40. Posts are ranked by score descending.
