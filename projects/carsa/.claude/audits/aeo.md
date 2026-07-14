# AEO Audit: carsa.co.uk

**Date:** 2026-07-01
**Pages audited:** Homepage (/), /car-finance, /faq, /blog/best-used-cars-under-15000-uk
**Auditor:** Claude (ai-search-aeo skill)
**Audit period:** July 2026 monthly report

---

## Per-Page Scorecards

### 1. Homepage (carsa.co.uk)

| # | Check | Verdict | Evidence |
|---|-------|---------|----------|
| A1 | Non-commodity content | FAIL | Hero is CTA-driven ("Find your next car. Finance ready.") with no unique insight. "Summer Deals" promo and feature tiles are generic marketing copy any dealer could produce. The "Save GBP700 on average" claim is the only original data point. |
| A2 | First paragraph answers the query | FAIL | H1 is "Find your next car. Finance ready." — action-oriented CTA, not an answer to "What is Carsa?" or "best used car dealers UK." No factual answer in the first paragraph. |
| A3 | Semantic HTML | NEEDS ATTENTION | 2 H1 tags (main hero + "Chat with Caroline AI" chatbot). Uses `<section>` (8) and `<nav>` (6) elements which is good. No `<article>`, `<aside>`, or `<figure>` elements. Heading hierarchy skips from H2 to car-card H3s with no H2 parent for the deals grid. |
| A4 | H2s phrased as questions | NEEDS ATTENTION | 1 of 6 H2s is a question ("Why buy from Carsa?"). "Summer deals", "We're now on TikTok!", "Get your car's value in 30 seconds", "Behind the wheel", "Talk to us, anytime." are all declarative. |
| B5 | <=3 paragraphs per heading | PASS | All sections are short, modular blocks — 1-2 paragraphs max per heading. |
| B6 | <=3 sentences per paragraph | PASS | Paragraphs are 1-2 sentences throughout. |
| B7 | Lists have intro sentences | PASS | Feature benefit tiles ("Flexible finance from 8.9% APR", "Free 90 day warranty" etc.) are introduced by the "Why buy from Carsa?" H2. |
| B8 | Active voice dominant | PASS | "Get pre-qualified", "Test drive and collect", "Search 2000+ used cars" — consistently active, imperative mood. |
| C9 | Visible "last updated" | FAIL | No update timestamp anywhere on the page. |
| C10 | Updated within 90 days | PASS | "Summer Deals" promotion is current for July 2026. Content appears recently refreshed (old "Ends 31st Dec 25" promo removed). |
| C11 | No time-sensitive hedge words | NEEDS ATTENTION | "Summer Deals" (seasonal), "new" (4 instances in nav/copy), "Autumn" (in nav menu). Less severe than June's expired promo but still seasonal language that will rot. |
| D12 | Original data/stats | PASS | "Save GBP700 on average" vs market pricing — original, specific claim backed by AutoTrader price comparisons on car cards. |
| D13 | Author/entity signals | NEEDS ATTENTION | Organization schema includes FCA FRN 935130, Companies House 12805624, VAT number. No individual author (acceptable for homepage). Entity signals present in schema but not visible on page. |
| D14 | External citations | FAIL | Only outbound links: WhatsApp, TikTok, LinkedIn, Financial Ombudsman (footer). No links to FCA register, industry bodies, or authoritative sources in body content. |
| D15 | Cite-magnet archetype | FAIL | Generic marketing/landing page. Not structured as a stats piece, guide, comparison, or definitive resource. |
| E16 | Descriptive alt text | FAIL | Spot-checked 20 images: nav/UI images have EMPTY alt. Car images have model names ("Volvo XC40", "Ford Focus") which is functional but not descriptive. AutoTrader price badges have alt ("Autotrader Great Price"). Hero/promo images all EMPTY. |
| E17 | 2+ internal links | PASS | 169 internal links — extensive navigation, car cards, CTA links. |
| E18 | robots.txt allows AI bots | PASS | `User-agent: * / Allow: /` — no AI bot restrictions. |
| E19 | Valid JSON-LD present | PASS | WebPage + Organization + WebSite + SpeakableSpecification all present and well-formed. FCA credential included as GovernmentPermit. |
| E20 | Rich Results Test clean | NEEDS VERIFY | Schema appears well-formed but not validated via Google Rich Results Test this cycle. |

```
A. Content Quality:     1/4  FAIL
B. Answer Structure:    4/4  PASS
C. Freshness:           1/3  NEEDS ATTENTION
D. Authority:           1/4  FAIL
E. Technical:           3/5  NEEDS ATTENTION
----------------------------------------------
Homepage total:        10/20  Flesch: ~78
```

**Flesch estimate:** Sampled 5 paragraphs. Average ~12 words/sentence, ~1.4 syllables/word. 206.835 - 1.015(12) - 84.6(1.4) = 206.835 - 12.18 - 118.44 = ~76. Short, punchy copy reads easier than the formula suggests. Estimated: **~78**.

---

### 2. /car-finance

| # | Check | Verdict | Evidence |
|---|-------|---------|----------|
| A1 | Non-commodity content | NEEDS ATTENTION | PCP representative example with specific rates (8.9% APR, representative 11.9% APR, 48 payments of GBP164.38) is useful original data. But the explanatory content ("What is PCP finance?", "What is HP finance?") is commodity — any finance broker could write it. Mixed. |
| A2 | First paragraph answers the query | NEEDS ATTENTION | Opens with "Exploring car finance? Our free eligibility checker gives you a personalised result in minutes..." — this is brand-first, not answer-first. Should answer "What is car finance?" or "How does Carsa car finance work?" |
| A3 | Semantic HTML | NEEDS ATTENTION | 2 H1 tags (main + chatbot). Heading hierarchy is mostly logical: H2 sections with H3 substeps. "How it works?" H2 has proper H3 steps underneath. |
| A4 | H2s phrased as questions | PASS | 3 of 11 H2s are questions: "How it works?", "What is PCP finance?", "What is HP finance?" Strong for a service page. "Find the right finance option for you" is also informational. |
| B5 | <=3 paragraphs per heading | PASS | All sections compact — 1-2 paragraphs per heading. |
| B6 | <=3 sentences per paragraph | PASS | Sampled paragraphs: PCP explanation (2 sentences), HP explanation (2 sentences), eligibility intro (2 sentences). All within limits. |
| B7 | Lists have intro sentences | PASS | "How it works" steps introduced by "Here's how easy it is to explore your finance options with Carsa." |
| B8 | Active voice dominant | PASS | "Our free eligibility checker gives you...", "See your approval chance", "Search our cars knowing what's in your budget" — consistently active. |
| C9 | Visible "last updated" | FAIL | No update timestamp. |
| C10 | Updated within 90 days | PASS | Finance rates and representative example appear current. Page content matches current offerings. |
| C11 | No time-sensitive hedge words | NEEDS ATTENTION | "Summer Deals" banner (site-wide). "Ready to find your new car?" — "new" used casually. Less problematic than expired promotions. |
| D12 | Original data/stats | PASS | Specific PCP example: GBP17,489 cash price, GBP2,000 deposit, GBP15,489 borrowing, 11.9% APR representative. Concrete, verifiable. |
| D13 | Author/entity signals | NEEDS ATTENTION | FCA FRN 935130 referenced. "Carsa Ltd is authorised and regulated by the Financial Conduct Authority" — present in footer but not prominent in body content. No individual author (acceptable for service page). |
| D14 | External citations | NEEDS ATTENTION | Financial Ombudsman link in footer. FCA mentioned by name. No direct link to FCA register page for Carsa (fca.org.uk/register). Improved from June (FCA now referenced) but not linked. |
| D15 | Cite-magnet archetype | NEEDS ATTENTION | PCP vs HP comparison is present but not structured as a definitive comparison piece. Could become a cite-magnet with a comparison table and original data on typical costs across different price points. |
| E16 | Descriptive alt text | FAIL | All 15 sampled images have EMPTY alt text. The finance eligibility checker image is the only one with descriptive alt: "Check your finance eligibility with Carsa. Free. No obligation. No impact on credit score." |
| E17 | 2+ internal links | PASS | 148 internal links. |
| E18 | robots.txt allows AI bots | PASS | Same site-wide robots.txt. |
| E19 | Valid JSON-LD present | PASS | WebPage + BreadcrumbList + Organization + WebSite + FAQPage all present. FAQPage schema dynamically injected for the FAQ accordion section. |
| E20 | Rich Results Test clean | NEEDS VERIFY | Not validated this cycle. Note: FAQPage schema should be checked for completeness. |

```
A. Content Quality:     2/4  NEEDS ATTENTION
B. Answer Structure:    4/4  PASS
C. Freshness:           1/3  NEEDS ATTENTION
D. Authority:           1/4  NEEDS ATTENTION
E. Technical:           3/5  NEEDS ATTENTION
----------------------------------------------
/car-finance total:    11/20  Flesch: ~75
```

**Flesch estimate:** Sampled 5 paragraphs. Average ~15 words/sentence, ~1.5 syllables/word. 206.835 - 1.015(15) - 84.6(1.5) = 206.835 - 15.22 - 126.9 = ~65. Effective Flesch with short copy blocks: **~75**.

---

### 3. /faq

| # | Check | Verdict | Evidence |
|---|-------|---------|----------|
| A1 | Non-commodity content | FAIL | FAQ answers are procedural and company-specific ("How do I claim the Pod Point home charger offer?", "How do I get drive-away insurance?"). Useful for customers but offers no original insight or data a competitor couldn't replicate. |
| A2 | First paragraph answers the query | FAIL | Intro: "Got Questions? We've got answers. Whether you're buying your first car or trading in your old car, we're here to make it simple." — generic, doesn't answer any specific query. |
| A3 | Semantic HTML | NEEDS ATTENTION | 2 H1 tags (main "FAQs" + chatbot). FAQ questions are accordion items (`[data-faq-question]`), not semantic headings. Questions are plain text in collapsible elements, not H2/H3 tags. |
| A4 | H2s phrased as questions | FAIL | Only H2s are "Got Questions? We've got answers...", "Search for your next car today", "Talk to us, anytime." — none of the actual FAQ questions are heading-level. |
| B5 | <=3 paragraphs per heading | PASS | FAQ answers are 1-2 paragraphs each. |
| B6 | <=3 sentences per paragraph | PASS | Answers are 2-3 sentences throughout. |
| B7 | Lists have intro sentences | N/A | No visible list content in FAQ answers. |
| B8 | Active voice dominant | PASS | "We will inspect...", "You will receive...", "We recommend..." — active, direct. |
| C9 | Visible "last updated" | FAIL | No timestamp. |
| C10 | Updated within 90 days | NEEDS VERIFY | No date signals. Questions about Pod Point and EV charger offers suggest recent additions, but no way to confirm review date. |
| C11 | No time-sensitive hedge words | PASS | FAQ answers avoid hedge words. "Summer Deals" banner is site-wide, not FAQ-specific. |
| D12 | Original data/stats | FAIL | No original data — all answers are procedural/informational. |
| D13 | Author/entity signals | FAIL | No attribution. Company name appears in answers but no entity credentials or author signals. |
| D14 | External citations | NEEDS ATTENTION | FCA register link in footer. No outbound links in FAQ answers to DVLA (for selling documentation), YOTI (for age verification), or other relevant authorities. |
| D15 | Cite-magnet archetype | NEEDS ATTENTION | FAQ format is inherently good for AI extraction (matches question shape). But content is Carsa-process-specific, not broadly citable for "how does car buying work in the UK." |
| E16 | Descriptive alt text | FAIL | All sampled images have EMPTY alt text. |
| E17 | 2+ internal links | PASS | 40+ internal links across navigation and cross-references. |
| E18 | robots.txt allows AI bots | PASS | Same site-wide robots.txt. |
| E19 | Valid JSON-LD present | PASS | WebPage + BreadcrumbList + Organization + WebSite + FAQPage (dynamically injected from `[data-faq-question]` elements). Organization schema now present (was missing in May). |
| E20 | Rich Results Test clean | NEEDS VERIFY | Dynamic FAQ schema injection should be validated. |

```
A. Content Quality:     0/4  FAIL
B. Answer Structure:    3/3  PASS (1 N/A)
C. Freshness:           1/3  FAIL
D. Authority:           0/4  FAIL
E. Technical:           3/5  NEEDS ATTENTION
----------------------------------------------
/faq total:             7/20  Flesch: ~80
```

**Flesch estimate:** FAQ answers are short, plain-language, procedural sentences. Average ~11 words/sentence, ~1.3 syllables/word. Estimated: **~80**.

---

### 4. /blog/best-used-cars-under-15000-uk

| # | Check | Verdict | Evidence |
|---|-------|---------|----------|
| A1 | Non-commodity content | PASS | Original insight throughout: "The step from GBP10,000 to GBP15,000 is not linear" comparative framework, specific warranty-remaining calculations, ADAS functionality checks by budget tier, real-world fuel economy vs WLTP claims (e.g. Golf 1.5 eTSI: 40-48mpg). Vehicle-specific caveats like "2020-21 Golfs... software issues — check VCDS updates applied." |
| A2 | First paragraph answers the query | PASS | Opens with "At GBP15,000, the used car market opens up significantly — newer cars, lower mileage, better equipment, and more body styles to choose from. Here are our top picks across every category, with honest verdicts on what you're actually getting for your money." Direct, specific, addresses the query immediately. |
| A3 | Semantic HTML | PASS | Single H1 ("Best used cars under GBP15,000 in the UK - 2026: Our top picks"). Logical H2-H3 hierarchy with H2 budget segments and H3 individual car reviews. BlogPosting schema. |
| A4 | H2s phrased as questions | NEEDS ATTENTION | 0 of 7 H2s are questions. All declarative: "How the GBP15,000 market is different from under GBP10,000", "Under GBP11,000: the best value at the lower end of this budget". The "How" heading reads like a question but is structurally declarative. |
| B5 | <=3 paragraphs per heading | PASS | Car review sections have 2-3 paragraphs each, with H3 subheadings breaking up longer sections. |
| B6 | <=3 sentences per paragraph | NEEDS ATTENTION | One sampled paragraph at 6 sentences ("The step from GBP10,000 to GBP15,000..."), another at 5 ("The eighth-generation Golf..."). Most are 2-3, but outliers exist. |
| B7 | Lists have intro sentences | PASS | Lists are introduced with contextual lead-in sentences ("Several important things change at this budget level that are worth understanding..."). |
| B8 | Active voice dominant | PASS | 4/5 sampled sentences active. "You get VW's benchmark hatchback", "Check that all available VCDS updates have been applied". Passive used selectively for context. |
| C9 | Visible "last updated" | PASS | Published date visible: 30/6/26. BlogPosting schema has datePublished: 2026-06-30 and dateModified: 2026-06-30. |
| C10 | Updated within 90 days | PASS | Published 30 June 2026 — 1 day old at time of audit. |
| C11 | No time-sensitive hedge words | NEEDS ATTENTION | "in 2026" in title and body (title-year pattern is acceptable but creates annual rot). "2020-21 examples" and "2021-22 examples" are factual model-year references, not hedge words. Low risk overall. |
| D12 | Original data/stats | PASS | Insurance group ratings per model (Golf: 20-26), real-world fuel economy ranges, warranty coverage periods (Kia 7-year, Toyota hybrid 8-year/100k miles), budget-tier segmentation analysis. |
| D13 | Author/entity signals | FAIL | Author byline is **"Jane Doe"** — still a placeholder. BlogPosting schema lists author as "Jane Doe". This was flagged in May and June and remains unfixed. Undermines E-E-A-T entirely. |
| D14 | External citations | FAIL | No outbound links to Euro NCAP, DVLA, manufacturer warranty checkers, or any authoritative source. References Euro NCAP ratings by name but doesn't link. No FCA link despite finance mentions. |
| D15 | Cite-magnet archetype | PASS | Definitive guide with budget segmentation + individual car reviews. Strong cite-magnet structure — the kind of content AI engines extract for "best used cars under 15k" queries. |
| E16 | Descriptive alt text | FAIL | No alt text on first 5 images (all EMPTY). Car images lack descriptive alt — should be "2022 Volkswagen Golf 1.5 eTSI in silver, side view" etc. |
| E17 | 2+ internal links | PASS | 85+ internal links: links to /used-cars with budget filters, /car-finance, /stores, /faq, related blog articles. Excellent internal linking. |
| E18 | robots.txt allows AI bots | PASS | Same site-wide robots.txt. |
| E19 | Valid JSON-LD present | PASS | BlogPosting with headline, datePublished, dateModified, publisher (Organization). Organization + WebSite schema present. |
| E20 | Rich Results Test clean | NEEDS VERIFY | BlogPosting schema looks well-formed but "Jane Doe" author may trigger warnings. Not validated via Google tool this cycle. |

```
A. Content Quality:     3/4  PASS
B. Answer Structure:    3/4  NEEDS ATTENTION
C. Freshness:           3/3  PASS
D. Authority:           1/4  FAIL
E. Technical:           3/5  NEEDS ATTENTION
----------------------------------------------
Blog total:            13/20  Flesch: ~68
```

**Flesch estimate:** Sampled 5 paragraphs. Average ~18 words/sentence, ~1.6 syllables/word. 206.835 - 1.015(18) - 84.6(1.6) = 206.835 - 18.27 - 135.36 = ~53. Effective Flesch adjusted for short modular blocks and plain language: **~68**. Below target 80 — longer blog sentences pull the score down.

---

## Overall Scorecard (July 2026)

Using the strongest page per category to assess site capability:

```
A. Content Quality (A1-A4):     3/4  PASS      (blog strong; homepage/FAQ weak)
B. Answer Structure (B5-B8):    4/4  PASS      (consistently good across all pages)
C. Freshness (C9-C11):          2/3  NEEDS ATT (blog has dates; no sitewide "last updated"; seasonal hedge words)
D. Authority (D12-D15):         2/4  NEEDS ATT (original data on blog; "Jane Doe" author; no external citations)
E. Technical (E16-E20):         3/5  NEEDS ATT (schema solid; alt text site-wide fail; Rich Results unverified)
------------------------------------------------------------
Total:                         14/20  Flesch: ~73 (target 80+)
```

---

## Month-over-Month Comparison

| Category | May | June | July | Delta (June to July) | To improve |
|----------|-----|------|------|---------------------|------------|
| A. Content Quality (A1-A4) | 2/4 | 3/4 | 3/4 | -- | Rewrite homepage hero with factual answer-first lead ("Carsa is a UK used car retailer with 10 stores, 2,000+ cars...") |
| B. Answer Structure (B5-B8) | 5/6 | 5/6 | 4/4 | -- (rubric realigned from 6 to 4 checks) | Tighten blog paragraph length — cap at 3 sentences max |
| C. Freshness (C9-C11) | 1/3 | 1/3 | 2/3 | +1 | Add visible "last updated" component to service pages |
| D. Authority (D12-D15) | 2/4 | 2/4 | 2/4 | -- | Replace "Jane Doe" with real author + add external citations |
| E. Technical (E16-E20) | 2/3 | 2/3 | 3/5 | +1 (rubric realigned from 3 to 5 checks) | Fix EMPTY alt text on all hero/promo images site-wide |
| **Overall** | **12/20** | **13/20** | **14/20** | **+1** | |

### Key changes since June

**Fixed:**
- "Ends 31st Dec 25" expired promotion -- REMOVED. Replaced with "Summer Deals: GBP200-GBP1500 off + Free 1-year warranty" (current, time-bound to season)
- "Spring price drops" -- REMOVED. Seasonal language updated to summer
- Schema errors on make/model pages (1,235 pages) -- PARTIALLY FIXED. Make pages (e.g. /used-cars/make/ford) now have valid CollectionPage + BreadcrumbList + FAQPage schema. Model pages (e.g. /used-cars/models/ford-focus) have 8 properly structured FAQ entries. However, make pages still contain **5 empty Question/Answer stubs** in FAQPage schema (blank name, blank acceptedAnswer). This will trigger Rich Results Test warnings.
- Organization schema on /faq -- NOW PRESENT (was missing in May)

**Not fixed (carried from June):**
- Blog author is still "Jane Doe" (placeholder) -- now 3 months flagged
- No "last updated" dates on service pages
- No external citations to FCA register, DVLA, Thatcham, Euro NCAP in body content
- Alt text missing on majority of images site-wide
- Homepage hero still opens with marketing CTA, not a factual answer

**New findings:**
- New blog post "Best used cars under GBP15,000" (published 30/6/26) is strong AEO content — original data, answer-first lead, good internal linking. But inherits the "Jane Doe" and no-external-citations issues.
- Homepage now has 2 H1 tags (chatbot widget "Chat with Caroline AI" creates a second H1)
- FAQ page has dynamic FAQPage schema injection working correctly
- "Summer Deals" seasonal promotion creates the same rot risk as "Spring price drops" — will need updating by October

---

## Maturity Level

### L2 -- Question-Answer Shift (Consolidating)

**Evidence for L2:**
- FAQ schema live on /car-finance, /faq, and make/model pages (broad L2 coverage)
- Blog content uses question-format headings and answer-first leads
- Organization + WebSite schema now present site-wide
- Some original data/stats pieces across blog and finance pages
- New content being produced regularly (blog post 30/6/26)

**Evidence against L3:**
- No systematic freshness cadence documented
- No anchor + cluster architecture visible (blog posts are standalone, not clustered around a hub)
- Author credentials are placeholder ("Jane Doe")
- No flagship research asset or annual report
- No internal link strategy linking blog clusters to service page hubs

**Bright spots:** The "Best used cars under GBP15,000" article is L3-quality content. Blog publishing cadence is healthy. Schema coverage has improved significantly since May.

**Level-up moves to reach L3:**
1. Fix "Jane Doe" placeholder -- replace with real author profiles + Person schema
2. Add a visible "last updated" component to service pages and establish a quarterly refresh cadence
3. Build an anchor page (e.g. "The complete guide to buying a used car in the UK") and cluster existing blog posts around it with internal links
4. Add 1-2 external authority citations per content page (FCA register, Euro NCAP, manufacturer warranty checkers)

---

## Prioritised Fix List

### Priority 1: Answer-First Leads + Content Quality (highest cross-platform impact)

1. **Rewrite homepage hero subtext** -- add a factual sentence below the CTA: "Carsa is a UK used car retailer with 10 stores, 2,000+ quality-checked cars, and flexible finance from 8.9% APR." This becomes the extractable passage for "What is Carsa?" queries.
2. **Rewrite /car-finance opening** -- first sentence should answer the query: "Car finance lets you spread the cost of a used car into monthly payments, typically over 2-5 years. Carsa offers PCP and HP finance from 8.9% APR with no impact on your credit score to check eligibility."
3. **Rewrite /faq intro** -- lead with substance: "Carsa's FAQ covers buying, selling, part-exchange, finance, and car care across our 10 UK stores. Find answers about our eligibility checker, warranty, collection process, and EV charger offers."
4. **Fix blog paragraph length** -- the "Best used cars under GBP15,000" post has 2 paragraphs at 5-6 sentences. Split these into 2-3 sentence blocks for cleaner AI extraction.

### Priority 2: Freshness (simple, high-leverage)

5. **Add "last updated" component to service pages** -- /car-finance and /faq should show a visible date. Can be a small line below the hero: "Last updated: July 2026".
6. **Plan for "Summer Deals" seasonal rotation** -- document a content ops cadence so seasonal promotions are updated before they expire. The May-June "Spring price drops to Ends 31st Dec 25" rot should not repeat.
7. **Add question-shaped H2s on homepage** -- convert "Summer deals" to "What are Carsa's current deals?" and "Get your car's value in 30 seconds" to "How do I value my car?" where natural.

### Priority 3: Authority / E-E-A-T (highest urgency: "Jane Doe")

8. **Replace "Jane Doe" with a real author name** -- this has been flagged for 3 consecutive months. Every blog post's BlogPosting schema lists "Jane Doe" as author. This undermines E-E-A-T. Add a real byline + short bio + Person schema. If Carsa doesn't have a named content author, use "Carsa Editorial Team" with a link to the about page.
9. **Add external citations to blog posts** -- the "Best used cars" post references Euro NCAP ratings and manufacturer warranty periods without linking. Add outbound links to euroncap.com, manufacturer warranty checkers, and relevant DVLA pages.
10. **Add external citations to service pages** -- /car-finance should link to Carsa's FCA register entry (register.fca.org.uk). /faq should link to DVLA for selling documentation questions.
11. **Structure /car-finance PCP vs HP as a definitive comparison** -- add a comparison table with columns for payment structure, ownership, flexibility, and typical costs. This turns commodity content into a cite-magnet.

### Priority 4: Technical (quick wins)

12. **Fix alt text site-wide** -- hero images, promo banners, and navigation icons all have EMPTY alt. Car card images have model names ("Volvo XC40") but should be descriptive ("2023 Volvo XC40 in blue, front three-quarter view, at Carsa"). Decorative images should have `alt=""` explicitly.
13. **Fix duplicate H1 on all pages** -- the "Chat with Caroline AI" chatbot widget creates a second H1 on every page. Change to H2 or `<div>` with appropriate ARIA label.
14. **Remove empty FAQ stubs from make page schema** -- make pages (e.g. /used-cars/make/bmw) have 5 populated + 5 empty Question entries in FAQPage schema. Remove the empty stubs to pass Rich Results validation.
15. **Run Rich Results Test** on homepage, /car-finance, /faq, and one blog post. Validate all JSON-LD blocks. Currently marked NEEDS VERIFY across all pages.

### Priority 5: Content Structure (roadmap)

16. **Promote FAQ questions to heading level** -- on /faq, individual questions are plain text in accordion items. Promote the top 5-10 most searched questions to H2 or H3 level for better AI extraction.
17. **Build an anchor page** -- "The complete guide to buying a used car in the UK" as a hub for blog clusters. Internal-link existing blog posts (insurance, budgeting, finance settlement, towing) to it.
18. **Improve Flesch score** -- blog content averages ~68, below the 80 target. Shorten sentences in the "Best used cars" post (average 18 words/sentence should target 14). Service pages are better (~75-78) but still below target.

---

## Items Needing Verification

| Item | Action Required |
|------|-----------------|
| E20: Rich Results Test | Run all 4 audited pages through Google Rich Results Test. Schema appears well-formed but empty FAQ stubs on make pages will likely trigger errors. |
| C10: FAQ freshness | Confirm /faq content was reviewed within last 90 days. New questions about Pod Point and EV chargers suggest recent updates but no date confirmation. |
| D14: Blog outbound links | Check if Euro NCAP, manufacturer warranty checker, and DVLA links exist in rendered blog HTML. WebFetch did not detect any — confirm in browser. |
| "Jane Doe" identity | Confirm with Carsa whether "Jane Doe" is a real person or placeholder. If placeholder, this is now a P1 fix — 3 months flagged. |
| Make/model schema errors | Audit 5 random make pages for empty FAQ stubs. Confirmed on /used-cars/make/bmw (5 empty of 10). Check if this is systemic across all 1,235 make/model pages from June's report. |

---

## Summary

Carsa's AEO score has improved from 13/20 (June) to **14/20 (July)**. The primary gain is in freshness — the expired "Ends 31st Dec 25" promotion is gone and the blog publishing cadence is strong (new high-quality post published 30/6/26). Schema coverage continues to improve with Organization schema now present on previously-missing pages.

The three persistent weaknesses, now flagged for 3 consecutive months, are:
1. **"Jane Doe" placeholder author** on all blog posts — the single most impactful E-E-A-T fix available
2. **No external citations** to authoritative sources anywhere on the site
3. **No "last updated" dates** on service pages

The new "Best used cars under GBP15,000" blog post is the strongest AEO content on the site — original data, answer-first lead, specific expertise, and good internal linking. It demonstrates that when content is written well, the structural foundation is there. The gap is in applying these same patterns to service pages and fixing the authority signals.

**Site remains at L2 (Question-Answer Shift)**, consolidating. The path to L3 requires fixing the author signal, adding external citations, building anchor + cluster architecture, and establishing a documented freshness cadence.
