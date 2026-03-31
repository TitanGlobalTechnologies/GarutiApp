/**
 * Mock data for development and demos
 * Used when no API keys are configured
 */

import type { DiscoveredContent } from "../lib/content-pipeline";
import type { ContentAdaptation } from "../lib/gemini";

export const MOCK_DIGEST_CONTENT: DiscoveredContent[] = [
  {
    url: "https://www.instagram.com/reel/example1",
    title: '"Stop buying in Cape Coral until you check this..."',
    caption: "Stop buying in Cape Coral until you check the flood zone map. That home was in Zone AE — $3,200/yr flood insurance. The home two streets over? Zone X — no flood insurance required.",
    platform: "instagram",
    creatorHandle: "suncoast_realtor",
    creatorName: "Suncoast Realtor",
    thumbnail: "",
    views: 48200,
    likes: 2024,
    comments: 187,
    engagementRate: 4.2,
    discoveredAt: new Date().toISOString(),
  },
  {
    url: "https://youtube.com/shorts/example2",
    title: '"3 Cape Coral neighborhoods under $400K"',
    caption: "Three neighborhoods in Cape Coral where you can still find homes under $400K. The waterfront lots on the south side, the area near the new parkway extension, and the new development off Pine Island Road.",
    platform: "youtube",
    creatorHandle: "capecorallife",
    creatorName: "Cape Coral Life",
    thumbnail: "",
    views: 31700,
    likes: 1204,
    comments: 93,
    engagementRate: 3.8,
    discoveredAt: new Date().toISOString(),
  },
  {
    url: "https://www.instagram.com/reel/example3",
    title: '"Insurance hack every FL buyer needs"',
    caption: "The insurance hack every Florida buyer needs to know. Specific construction features can drop your premium by $2,000-$4,000 per year. Hip roofs, impact windows, and updated electrical.",
    platform: "instagram",
    creatorHandle: "fl_homes_daily",
    creatorName: "FL Homes Daily",
    thumbnail: "",
    views: 27100,
    likes: 949,
    comments: 76,
    engagementRate: 3.5,
    discoveredAt: new Date().toISOString(),
  },
  {
    url: "https://www.reddit.com/r/RealEstate/comments/example4",
    title: "Cape Coral market update — prices stabilizing after 6 months of drops",
    caption: "Just closed on 3 properties this month in Cape Coral. The market is finally stabilizing. Inventory is down 12% from last month. Buyers who waited are now competing again.",
    platform: "reddit",
    creatorHandle: "FL_Agent_Mike",
    creatorName: "FL Agent Mike",
    thumbnail: "",
    views: 0,
    likes: 342,
    comments: 89,
    engagementRate: 87.5,
    discoveredAt: new Date().toISOString(),
  },
  {
    url: "https://youtube.com/shorts/example5",
    title: '"New construction in Cape Coral that nobody knows about"',
    caption: "I just found 4 new construction communities in Cape Coral that aren't even on Zillow yet. Starting at $350K for a 3-bed 2-bath with a pool. These builders are offering $15K in closing cost credits.",
    platform: "youtube",
    creatorHandle: "cape_coral_homes",
    creatorName: "Cape Coral Homes",
    thumbnail: "",
    views: 19800,
    likes: 812,
    comments: 64,
    engagementRate: 4.1,
    discoveredAt: new Date().toISOString(),
  },
];

export const MOCK_ADAPTATIONS: Record<string, ContentAdaptation[]> = {
  "https://www.instagram.com/reel/example1": [
    {
      versionNumber: 1,
      hook: "Everyone's talking about Cape Coral flooding — here's what nobody tells you about the NEW construction zones...",
      fullScript: "Everyone's talking about Cape Coral flooding — here's what nobody tells you about the NEW construction zones. I've been watching the permit data and there are 3 neighborhoods where brand new homes are going up that most buyers don't even know about yet. The prices? Still under $400K for a 3-bedroom. But here's the thing — these won't last.",
      suggestedPostTime: "Tuesday 8:30 AM EST",
      cta: "Which Cape Coral neighborhood are you looking in? Drop it in the comments and I'll tell you what's happening there right now.",
    },
    {
      versionNumber: 2,
      hook: "I pulled the FEMA flood zone map for every Cape Coral neighborhood — you need to see this...",
      fullScript: "I pulled the FEMA flood zone map for every single Cape Coral neighborhood and what I found will save you thousands. Two streets apart — one home has mandatory flood insurance at $3,200 per year, the other has zero. Same price, same square footage. The difference? The flood zone boundary runs right between them.",
      suggestedPostTime: "Wednesday 12:00 PM EST",
      cta: "Send me any Cape Coral address and I'll check the flood zone for you — free. Just DM me.",
    },
    {
      versionNumber: 3,
      hook: "The #1 mistake Cape Coral buyers make that costs them $3,200 every single year...",
      fullScript: "The number one mistake Cape Coral buyers make that costs them $3,200 every single year. They fall in love with a house before checking the flood zone. In Cape Coral, the flood zones change street by street. One side of the road is Zone X — no flood insurance needed. Cross the street? Zone AE — mandatory flood insurance.",
      suggestedPostTime: "Thursday 7:45 AM EST",
      cta: "Are you house hunting in Cape Coral right now? Tell me your price range and I'll send you a list of homes in Zone X.",
    },
    {
      versionNumber: 4,
      hook: "Before you buy ANYTHING in Cape Coral, check this free tool...",
      fullScript: "Before you buy anything in Cape Coral, check this free tool that could save you thousands. Go to the FEMA flood map viewer and type in any address. It'll show you the exact flood zone. Zone X means no mandatory flood insurance. Zone AE means you're paying $2,000 to $4,000 per year on top of your mortgage.",
      suggestedPostTime: "Monday 9:00 AM EST",
      cta: "Want me to run a flood zone check on your favorite Cape Coral listing? DM me the address.",
    },
    {
      versionNumber: 5,
      hook: "My client almost bought this Cape Coral home — until I checked one thing...",
      fullScript: "My client almost closed on a home in Cape Coral that looked perfect. Great price, nice neighborhood, everything checked out. Until I pulled the flood zone map. Zone AE. That means mandatory flood insurance at $3,200 per year. I found her a comparable home two streets over in Zone X. Same price, same square footage, zero flood insurance. She's saving $3,200 every single year.",
      suggestedPostTime: "Friday 11:30 AM EST",
      cta: "When are you planning to buy in Cape Coral? This year or next? Let me know and I'll send you the smart buyer checklist.",
    },
  ],
};

/** Get mock adaptations for a content URL, or generate default ones */
export function getMockAdaptations(url: string, city: string): ContentAdaptation[] {
  if (MOCK_ADAPTATIONS[url]) return MOCK_ADAPTATIONS[url];

  // Generate generic adaptations for URLs not in the mock data
  return Array.from({ length: 5 }, (_, i) => ({
    versionNumber: i + 1,
    hook: `[Adaptation ${i + 1}] Top-performing content adapted for ${city} market...`,
    fullScript: `This is adaptation version ${i + 1} of the original content, customized for the ${city} real estate market. When API keys are configured, this will be generated by AI.`,
    suggestedPostTime: ["Monday 9 AM", "Tuesday 8:30 AM", "Wednesday 12 PM", "Thursday 7:45 AM", "Friday 11:30 AM"][i],
    cta: `Looking to buy or sell in ${city}? DM me — I'll send you this week's market data.`,
  }));
}
