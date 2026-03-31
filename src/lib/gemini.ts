/**
 * Google Gemini AI client
 * Generates 5 content adaptations per post for real estate agents
 * Free: 15 req/min, 1M tokens/day
 */

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-1.5-flash";
const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export interface ContentAdaptation {
  versionNumber: number;
  hook: string;
  fullScript: string;
  suggestedPostTime: string;
  cta: string;
}

export interface AdaptationRequest {
  originalTitle: string;
  originalCaption: string;
  platform: string;
  creatorHandle: string;
  engagementMetrics: string; // e.g., "48.2K views, 4.2% engagement"
  agentMarketCity: string;
  agentMarketState: string;
  agentStyle?: string;
}

/**
 * Generate 5 AI adaptations of a social media post
 */
export async function generateAdaptations(
  request: AdaptationRequest
): Promise<ContentAdaptation[]> {
  const prompt = `You are a real estate social media content strategist. Your job is to help real estate agents create local content that starts conversations and generates appointments.

Given this top-performing ${request.platform} post:

Original Creator: @${request.creatorHandle}
Title/Hook: "${request.originalTitle}"
Caption/Script: "${request.originalCaption}"
Performance: ${request.engagementMetrics}

Generate 5 adapted versions for a real estate agent in ${request.agentMarketCity}, ${request.agentMarketState}.
${request.agentStyle ? `Agent's content style: ${request.agentStyle}` : ""}

RULES:
- Keep the same hook structure that made the original successful
- Localize ALL references to ${request.agentMarketCity}, ${request.agentMarketState}
- Each version should have a different angle but same core message
- Include a conversation-starting CTA (not just "DM me" — ask a specific question)
- Scripts should be 30-60 seconds when spoken aloud
- Suggest the best posting time for the ${request.agentMarketCity} market

Return ONLY a JSON array with exactly 5 objects. No markdown, no code fences. Each object must have these keys:
- "hook": the attention-grabbing first line (1-2 sentences)
- "fullScript": the complete 30-60 second script
- "suggestedPostTime": best day/time to post (e.g., "Tuesday 8:30 AM EST")
- "cta": the conversation-starting call-to-action`;

  if (!API_KEY) {
    // Return mock adaptations when no API key is set
    return generateMockAdaptations(request);
  }

  const res = await fetch(`${BASE_URL}?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!res.ok) {
    console.warn(`Gemini API error: ${res.status}. Falling back to mock data.`);
    return generateMockAdaptations(request);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  try {
    // Extract JSON from response (handle potential markdown wrapping)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array found");

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.map((item: any, i: number) => ({
      versionNumber: i + 1,
      hook: item.hook || "",
      fullScript: item.fullScript || item.full_script || "",
      suggestedPostTime: item.suggestedPostTime || item.suggested_post_time || "",
      cta: item.cta || "",
    }));
  } catch {
    console.warn("Failed to parse Gemini response. Using mock data.");
    return generateMockAdaptations(request);
  }
}

/**
 * Mock adaptations for development / when no API key is set
 */
function generateMockAdaptations(request: AdaptationRequest): ContentAdaptation[] {
  const city = request.agentMarketCity;
  return [
    {
      versionNumber: 1,
      hook: `Everyone's talking about ${city} real estate — here's what nobody's telling you about the NEW construction zones...`,
      fullScript: `Everyone's talking about ${city} real estate — here's what nobody's telling you about the NEW construction zones. I've been watching the permit data and there are 3 neighborhoods where brand new homes are going up that most buyers don't even know about yet. The prices? Still under $400K for a 3-bedroom. But here's the thing — these won't last. Last month alone, 12 of these sold before they even hit MLS. If you're looking in ${city}, you need to know about these areas before everyone else catches on.`,
      suggestedPostTime: "Tuesday 8:30 AM EST",
      cta: `Which ${city} neighborhood are you looking in? Drop it in the comments and I'll tell you what's happening there right now.`,
    },
    {
      versionNumber: 2,
      hook: `3 ${city} neighborhoods under $400K that nobody's talking about...`,
      fullScript: `3 ${city} neighborhoods under $400K that nobody is talking about. Number one — check the area near the new parkway extension. Homes are still priced 15% below comparable neighborhoods. Number two — the waterfront lots on the south side. Yes, waterfront, under $400K. Number three — the new development off Pine Island Road where they just approved a new school district. All three of these areas are seeing price increases month over month. If you wait until summer, you're going to pay $30-50K more.`,
      suggestedPostTime: "Wednesday 12:00 PM EST",
      cta: `Want me to send you the exact addresses in these 3 neighborhoods? Comment "SEND" below.`,
    },
    {
      versionNumber: 3,
      hook: `The insurance hack every ${city} buyer needs to know before signing...`,
      fullScript: `The insurance hack every ${city} buyer needs to know before signing anything. Florida insurance rates went up 40% last year. But here's what most agents won't tell you — there are specific construction features that can drop your premium by $2,000-$4,000 per year. I'm talking about hip roofs, impact windows, and updated electrical. When I help my buyers in ${city}, the first thing I check isn't the kitchen — it's the roof shape and the electrical panel. That one check has saved my clients tens of thousands over the life of their mortgage.`,
      suggestedPostTime: "Thursday 7:45 AM EST",
      cta: `Are you currently looking in ${city}? Tell me your budget and I'll show you homes that already have these insurance-saving features built in.`,
    },
    {
      versionNumber: 4,
      hook: `Stop buying in ${city} until you check this one thing...`,
      fullScript: `Stop buying in ${city} until you check this one thing. I just had a client almost close on a home that looked perfect — great price, nice neighborhood, everything checked out. Until I pulled the flood zone map. That home was in Zone AE, which means mandatory flood insurance at $3,200 per year. The home two streets over? Zone X — no flood insurance required. Same price, same square footage, $3,200 per year difference. In ${city}, the flood zones can change street by street. Always check the FEMA map before you fall in love with a property.`,
      suggestedPostTime: "Monday 9:00 AM EST",
      cta: `Send me an address in ${city} and I'll check the flood zone for you — free. Just DM me the street address.`,
    },
    {
      versionNumber: 5,
      hook: `I tracked every ${city} home sale this month — here's the pattern I found...`,
      fullScript: `I tracked every single home sale in ${city} this month and I found a pattern that could save you money. Homes listed on Thursday and Friday are selling for 3-5% more than homes listed on Monday. Why? Because weekend open houses create urgency and competitive offers. But here's the flip side — if you're a BUYER, the best deals are happening on homes that have been listed for 14+ days. Sellers get anxious after two weekends with no offers. That's when you come in with a strong but fair offer. I just helped a buyer save $22,000 using this exact strategy.`,
      suggestedPostTime: "Friday 11:30 AM EST",
      cta: `When are you planning to buy in ${city}? This year or next? Let me know and I'll send you the timing strategy that matches your timeline.`,
    },
  ];
}
