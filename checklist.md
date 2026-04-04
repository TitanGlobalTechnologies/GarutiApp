# LAE Quality Checklist
**Checked every hour. Reset and re-verify continuously.**

## 1. Location Accuracy (MUST BE 100%)
- [ ] Every FL city post verified against Instagram location tag
- [ ] Every FL city post caption scanned for 60+ out-of-area signals
- [ ] Every FL city post transcript scanned for out-of-area city/state mentions
- [ ] Every FL city post author bio checked for non-FL market indicators
- [ ] Location gate in generate-live-digest.js active and catching rejections
- [ ] Location filter in scrape-all-states.js active (checkLocation function)
- [ ] AI audit LOCATION check passing for all displayed posts
- [ ] No posts tagged in: LA, Houston, Dallas, Austin, Atlanta, Chicago, Boston, Seattle, Portland, Denver, Phoenix, Las Vegas, San Francisco, San Diego, Sacramento, Tucson, Philadelphia, Pittsburgh, Cleveland, Milwaukee, Indianapolis, St. Louis, Kansas City, Columbus OH, Brooklyn, Manhattan, Amelia Island, Hollywood
- [ ] No captions containing: #utah, #arizona, #california, #oregon, #montana, #idaho, #ohio, #maryland, #connecticut, #pennsylvania, #kentucky, #maine, #colorado, #michigan, #minnesota, #illinois, #massachusetts, #hawaii, #nevada, #washington, #wisconsin, #indiana, #missouri, #iowa, #kansas, #oklahoma, #nebraska, #arkansas, #westvirginia, #northdakota, #southdakota, #wyoming, #vermont, #newhampshire, #rhodeisland, #delaware, #newmexico, #alaska
- [ ] No captions containing: "of california", "in california", "california inc", "of arizona", "in arizona", "of oregon", "in oregon", "of montana", "in montana", "of idaho", "in idaho", "of ohio", "in ohio", "of maryland", "in maryland", "of connecticut", "in connecticut"
- [ ] Nearby state posts (for USA tab) are from the United States, not Canada/UK/Philippines/India
- [ ] No corporate/national accounts appearing in local city tabs

## 2. Post Count
- [ ] Every city tab has at least 5 posts
- [ ] Florida tab has at least 5 posts
- [ ] USA tab has exactly 5 posts
- [ ] No empty tabs visible to users

## 3. Script Faithfulness
- [ ] Every script is a faithful rewrite of the video transcript
- [ ] No script fabricated from caption alone (transcript must have 15+ words of real speech)
- [ ] Script-to-transcript word overlap > 10% (shared distinctive words)
- [ ] No scripts for b-roll/music-only videos
- [ ] "Generate Script" button greyed out for posts without speech
- [ ] Scripts capture the original talking points, arguments, data, personality
- [ ] Scripts do not invent topics the agent did not discuss

## 4. Agent Verification
- [ ] Every post by an individual RE agent (not brokerage, media, magazine, podcast, coach)
- [ ] AI audit AGENT check passing for all displayed posts
- [ ] Username hard-reject active: mortgage, lending, lender, loan, media, magazine, show, podcast
- [ ] Corporate accounts blocked: exprealty, edinarealty, kellerwilliamsrealty, coldwellbanker, realtor.com, zillow, redfin, nationalassociationofrealtors
- [ ] Negative phrases active: "for realtors", "helping agents", "be featured", "we feature your", "promote your listing", "dm to be featured", "academy"
- [ ] AI audit RELEVANT check: content is about RE (not dogs, lifestyle, unrelated)

## 5. Script Quality
- [ ] All scripts 80-150 words
- [ ] No em dashes (—) or semicolons (;)
- [ ] Every script ends with a question CTA
- [ ] No scripts start with: "I want to give you", "The content provided", "The transcript", "[Script failed", "[Script pending", "I need"
- [ ] Scripts sound conversational, not corporate
- [ ] Scripts mention relevant local details when the original did

## 6. Freshness
- [ ] No posts from today (we only show yesterday and older)
- [ ] Yesterday's posts appear first in every tab
- [ ] Day-before-yesterday posts appear second (only if needed to fill 5)
- [ ] Older posts only appear if not enough from recent days
- [ ] Posts sorted by virality within each date group
- [ ] Date labels correct: "Yesterday" (green), older dates (grey)

## 7. Hierarchy Logic
- [ ] USA = top 5 by virality from ALL states + FL + cities combined
- [ ] Florida = top 5 freshest from all FL cities + FL statewide search
- [ ] City tabs = posts from that city's search only
- [ ] No cross-tab duplicate authors within the same tab
- [ ] No cross-tab duplicate shortcodes within the same tab
- [ ] USA and Florida show different content

## 8. UI/UX
- [ ] Instagram icon renders (SVG data URI, not empty square)
- [ ] Clicking Instagram icon opens correct reel with ?igsh=1
- [ ] Tab scroll-into-view works on tap
- [ ] Username truncated at 16 chars with maxWidth 120
- [ ] No "Install the App" banner
- [ ] City dropdown switches content correctly
- [ ] Service worker only intercepts same-origin requests

## 9. Data Integrity
- [ ] Raw data never deleted (digest_master_raw.json preserved)
- [ ] Audit rejects in separate file (audit_rejects.json)
- [ ] Good transcripts tracked (good_transcripts.json)
- [ ] All scrape results saved incrementally (crash recovery)
- [ ] Script cache preserved between runs
- [ ] Transcript cache preserved between runs
- [ ] Bio cache preserved between runs

## 10. Search Coverage
- [ ] Agent-keyword queries active: "realtor", "realty", "real estate"
- [ ] Location-property queries active for city scopes: "{city} homes for sale", "{city} property listing", "{city} luxury home tour"
- [ ] Location queries catch agents who don't use RE keywords in captions (property tours, home tours, luxury listings)
- [ ] Both query groups run for every city scope
- [ ] Only agent-keyword queries run for state/FL scopes (no city name to substitute)

## 11. Deployment
- [ ] Vercel deployment accessible
- [ ] ?reset clears old service worker cache
- [ ] PWA manifest + icons present
- [ ] Local server testable before pushing to production

---
**Last checked:** [timestamp]
**Checked by:** [auto/manual]
**Issues found:** [count]
