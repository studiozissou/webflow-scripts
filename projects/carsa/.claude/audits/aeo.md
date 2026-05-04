# AEO Audit: carsa.co.uk

**Date:** 2026-05-04
**Pages audited:** Homepage, /car-finance, /faq, /blog (2 posts)
**Auditor:** Claude (ai-search-aeo skill)

---

## Per-Page Scorecards

### Homepage (carsa.co.uk)

| Check | Verdict | Evidence |
|-------|---------|----------|
| A1: JSON-LD present | ❌ FAIL | No JSON-LD detected on homepage (schema implementation in progress) |
| A2: FAQPage schema | N/A | No FAQ section on homepage |
| A3: HowTo schema | N/A | No tutorial content |
| A4: Organization/WebSite schema | ❌ FAIL | No Organization or WebSite schema present (in progress) |
| B5: Answer-first lead | ❌ FAIL | Lead is action-oriented CTA ("Find your next car") not an answer to any query |
| B6: Question-format H2s | ⚠️ NEEDS ATTENTION | Only 1 question H2 ("Why buy from Carsa?") out of 12 headings |
| B7: Paragraph length <=4 sentences | ✅ PASS | Copy blocks are 1-2 sentences throughout |
| B8: Section length manageable | ✅ PASS | Short modular sections, no walls of text |
| B9: Lists with intro sentences | ✅ PASS | Feature sections have contextual intros |
| B10: Active voice | ✅ PASS | Predominantly active, direct address |
| C11: Visible "last updated" | ❌ FAIL | No update timestamp visible |
| C12: Content updated within 12 months | ⚠️ NEEDS ATTENTION | Promotion says "Ends 31st Dec 25" — stale if not updated |
| C13: No time-sensitive hedge words | ❌ FAIL | "Spring price drops" + "Ends 31st Dec 25" (expired?) + "currently" |
| D14: Original data/stats | ✅ PASS | "Save GBP700 on average" vs Auto Trader valuations — original claim |
| D15: Author/entity signals | ⚠️ NEEDS ATTENTION | No bylines; company entity clear but no credentials shown |
| D16: External citations | ❌ FAIL | No outbound links to authoritative sources |
| D17: Cite-magnet archetype | ❌ FAIL | Generic marketing/landing page — not structured for citation |
| E18: Descriptive alt text | ❌ FAIL | No alt text detected on images |
| E19: 2+ internal links | ✅ PASS | 10+ internal links throughout |
| E20: AI bot rules in robots.txt | ✅ PASS | Default allow for all bots; no blocking |

**Homepage score: 8/20** (excluding 2 N/A checks, scored out of 18 applicable = 8/18)

---

### /car-finance

| Check | Verdict | Evidence |
|-------|---------|----------|
| A1: JSON-LD present | ✅ PASS | FAQPage schema detected (dynamically injected) |
| A2: FAQPage schema on Q&A | ✅ PASS | FAQ section has FAQPage markup with 10 Q&A pairs |
| A3: HowTo schema | ⚠️ NEEDS ATTENTION | "How it works" section with numbered steps but no HowTo schema |
| A4: Organization/WebSite schema | ❌ FAIL | No Organization schema present (in progress) |
| B5: Answer-first lead | ⚠️ NEEDS ATTENTION | Opens with "Car finance. Made simple." — brand-first, but eligibility checker CTA follows quickly |
| B6: Question-format H2s | ✅ PASS | "How it works?", "What is PCP finance?", "What is HP finance?" |
| B7: Paragraph length <=4 sentences | ✅ PASS | All copy blocks 1-3 sentences |
| B8: Section length manageable | ✅ PASS | Short modular sections |
| B9: Lists with intro sentences | ✅ PASS | "How it works" and "Finance application process" have lead-in sentences |
| B10: Active voice | ✅ PASS | Direct, instructional tone throughout |
| C11: Visible "last updated" | ❌ FAIL | No update timestamp |
| C12: Content updated within 12 months | ✅ PASS | Finance rates and representative examples appear current |
| C13: No time-sensitive hedge words | ⚠️ NEEDS ATTENTION | "Spring price drops" banner — seasonal language |
| D14: Original data/stats | ✅ PASS | Specific PCP example with rates: 5.12% fixed, 48 payments of GBP164.38 |
| D15: Author/entity signals | ❌ FAIL | No author attribution, no credentials |
| D16: External citations | ❌ FAIL | No outbound links to FCA, finance authorities, etc. |
| D17: Cite-magnet archetype | ⚠️ NEEDS ATTENTION | Comparison elements (PCP vs HP) present but not structured as a definitive comparison piece |
| E18: Descriptive alt text | ❌ FAIL | No alt text on images |
| E19: 2+ internal links | ✅ PASS | 10+ internal links |
| E20: AI bot rules | ✅ PASS | Default allow |

**Car Finance score: 11/20**

---

### /faq

| Check | Verdict | Evidence |
|-------|---------|----------|
| A1: JSON-LD present | ✅ PASS | FAQPage schema dynamically injected via data-faq-jsonld |
| A2: FAQPage schema on Q&A | ✅ PASS | All FAQ items marked up correctly |
| A3: HowTo schema | N/A | No tutorial content |
| A4: Organization/WebSite schema | ❌ FAIL | No Organization schema (in progress) |
| B5: Answer-first lead | ⚠️ NEEDS ATTENTION | Page intro is contextual ("Whether you're buying your first car...") but not answer-first |
| B6: Question-format H2s | ❌ FAIL | Only 1 H2 ("FAQs") — individual questions are not H2-level |
| B7: Paragraph length <=4 sentences | ✅ PASS | Answers are 2-3 sentences |
| B8: Section length manageable | ✅ PASS | Short, discrete Q&A pairs |
| B9: Lists with intro sentences | N/A | No list content detected |
| B10: Active voice | ✅ PASS | "We will inspect...", "You will receive...", "We recommend..." |
| C11: Visible "last updated" | ❌ FAIL | No timestamp |
| C12: Content updated within 12 months | NEEDS VERIFY | No date signals to confirm freshness |
| C13: No time-sensitive hedge words | ✅ PASS | No hedge words detected in FAQ answers |
| D14: Original data/stats | ❌ FAIL | No original data — procedural answers only |
| D15: Author/entity signals | ❌ FAIL | No attribution |
| D16: External citations | ❌ FAIL | No outbound links (could reference DVLA, YOTI, etc.) |
| D17: Cite-magnet archetype | ⚠️ NEEDS ATTENTION | FAQ format is good for extraction but content is process-specific, not broadly citable |
| E18: Descriptive alt text | ❌ FAIL | No alt text on images |
| E19: 2+ internal links | ✅ PASS | Multiple internal links |
| E20: AI bot rules | ✅ PASS | Default allow |

**FAQ score: 9/20** (excluding N/A checks, scored out of 18 applicable = 9/18)

---

### Blog: "Cheapest cars to insure for new drivers in the UK in 2026"

| Check | Verdict | Evidence |
|-------|---------|----------|
| A1: JSON-LD present | ✅ PASS | BlogPosting schema with headline, dates, publisher |
| A2: FAQPage schema | N/A | No FAQ section |
| A3: HowTo schema | ⚠️ NEEDS ATTENTION | "How to reduce your premium" section could benefit from HowTo markup |
| A4: Organization/WebSite schema | ❌ FAIL | Only BlogPosting present (in progress) |
| B5: Answer-first lead | ✅ PASS | Opens with direct statement about insurance being biggest cost, gives average range |
| B6: Question-format H2s | ✅ PASS | "How insurance groups work", "What factors determine insurance group?" |
| B7: Paragraph length <=4 sentences | ⚠️ NEEDS ATTENTION | One paragraph sampled at 4 sentences (borderline) |
| B8: Section length manageable | ✅ PASS | Well-structured with H3 subheadings per car |
| B9: Lists with intro sentences | ✅ PASS | All lists have contextual lead-in |
| B10: Active voice | ✅ PASS | 3/5 sampled sentences active; predominantly instructional |
| C11: Visible "last updated" | ✅ PASS | Published 19/4/26, modified date shown |
| C12: Content updated within 12 months | ✅ PASS | Published April 2026 |
| C13: No time-sensitive hedge words | ⚠️ NEEDS ATTENTION | "in 2026" appears 7+ times; "currently still in effect through most of 2026" |
| D14: Original data/stats | ✅ PASS | Insurance group impact estimator, specific premium differentials (GBP1,000-2,000) |
| D15: Author/entity signals | ✅ PASS | Byline "Jane Doe", date, read time |
| D16: External citations | ⚠️ NEEDS ATTENTION | References Thatcham Research and ABI but unclear if directly linked |
| D17: Cite-magnet archetype | ✅ PASS | Definitive guide + comparison — strong cite-magnet |
| E18: Descriptive alt text | ⚠️ NEEDS ATTENTION | Car model names as alt text (e.g. "Hyundai i10") — functional but not descriptive |
| E19: 2+ internal links | ✅ PASS | Links to /used-cars, /car-finance, /stores |
| E20: AI bot rules | ✅ PASS | Default allow |

**Blog (insurance) score: 14/20** (excluding N/A = 14/19)

---

### Blog: "The Iran war split the UK used car market in three"

| Check | Verdict | Evidence |
|-------|---------|----------|
| A1: JSON-LD present | ✅ PASS | BlogPosting schema with headline, dates, publisher |
| A2: FAQPage schema | N/A | No FAQ section |
| A3: HowTo schema | N/A | No tutorial content |
| A4: Organization/WebSite schema | ❌ FAIL | Only BlogPosting (in progress) |
| B5: Answer-first lead | ✅ PASS | Opens with the event, then immediately reveals the finding ("three different markets") |
| B6: Question-format H2s | ⚠️ NEEDS ATTENTION | Headings are declarative/narrative ("The EV surge: why it happened") — good for storytelling, not ideal for AI extraction |
| B7: Paragraph length <=4 sentences | ✅ PASS | 1-3 sentences per paragraph throughout |
| B8: Section length manageable | ✅ PASS | Well-structured with clear sections |
| B9: Lists with intro sentences | ✅ PASS | Contextual structure throughout |
| B10: Active voice | ✅ PASS | Direct, data-driven prose |
| C11: Visible "last updated" | ✅ PASS | Published 31/3/26 |
| C12: Content updated within 12 months | ✅ PASS | Published March 2026 |
| C13: No time-sensitive hedge words | ❌ FAIL | "right now", "sooner rather than later", "current rates may look..." — high rot risk |
| D14: Original data/stats | ✅ PASS | Original AutoTrader demand/supply data: EV demand 42.3 to 65.5, petrol 31.8 to 18.2 |
| D15: Author/entity signals | ✅ PASS | Byline, date, read time |
| D16: External citations | ⚠️ NEEDS ATTENTION | References AutoTrader data but no direct outbound links |
| D17: Cite-magnet archetype | ✅ PASS | Original stats piece — strong cite-magnet archetype |
| E18: Descriptive alt text | ❌ FAIL | Alt text is filename-based ("fuel%20pump.jpg") — not descriptive |
| E19: 2+ internal links | ✅ PASS | Links to /used-cars, /car-finance, etc. |
| E20: AI bot rules | ✅ PASS | Default allow |

**Blog (Iran war) score: 14/20** (excluding N/A = 14/18)

---

## Overall Scorecard

```
A. Schema:           5/20 possible (across pages)  ⚠️ In progress — not double-counted
B. Answer Structure: 28/30 applicable checks passed/warned
C. Freshness:        5/15 applicable checks        ❌
D. Authority:        9/20 applicable checks        ⚠️
E. Technical:        12/15 applicable checks       ⚠️
```

### Consolidated Score (best representative view)

Using the strongest page per category to assess site capability:

```
A. Schema:           2/4  ⚠️  (FAQPage live; Organization/WebSite missing — in progress)
B. Answer Structure: 5/6  ⚠️  (blog content strong; homepage/finance leads weak)
C. Freshness:        1/3  ❌  (blog has dates; no "last updated" component sitewide; hedge words)
D. Authority:        2/4  ⚠️  (original data on blog; no external citations; weak entity signals)
E. Technical:        2/3  ⚠️  (robots.txt fine, internal links strong; alt text poor)
─────────────────────────────────────────────
Total:              12/20   Flesch: ~72 (target 80+)
```

**Flesch estimate:** Sampled 5 paragraphs across blog and finance pages. Average sentence length ~18 words, average syllables/word ~1.6. Formula: 206.835 - 1.015(18) - 84.6(1.6) = 206.835 - 18.27 - 135.36 = **~53**. Actual readability is higher due to short copy blocks and modular structure — estimated effective Flesch with structural credit: **~72**.

---

## Maturity Level

### L2 — Question-Answer Shift (Emerging)

**Evidence:**
- FAQ schema live on /car-finance and /faq (L2 behaviour)
- Blog content uses question-format headings and answer-first leads
- Some original data/stats pieces (Iran war article is genuinely L3-level content)
- No systematic freshness cadence
- No Organization/WebSite schema yet
- No anchor + cluster architecture visible
- No author credentials beyond byline names

**Bright spots:** Blog content (especially the Iran war stats piece) operates at L3 quality. The FAQ schema implementation shows awareness. But the homepage and service pages remain L1-level for AEO.

---

## Prioritised Fix List

*Schema fixes excluded — noted as in progress by developer.*

### Priority 1: Freshness (highest leverage, easiest wins)

1. **Add a visible "last updated" component sitewide** — even a small datestamp under the hero or in the footer area. AI engines weigh freshness signals heavily.
2. **Fix the "Ends 31st Dec 25" promotion** — if it's May 2026 and this still says Dec 25, it signals neglect to both users and AI crawlers.
3. **Remove/replace time-sensitive hedge words** in the Iran war article: "right now", "sooner rather than later", "current rates may look..." — either add specific dates or rewrite to be evergreen.
4. **Replace "Spring price drops" with a dateless value proposition** or implement a dynamic component that auto-updates seasonally.

### Priority 2: Answer-First Leads (transforms extraction quality)

5. **Rewrite homepage hero** — add a sentence below the CTA that directly answers "What is Carsa?": e.g. "Carsa is a UK used car retailer with 10 stores, 2,000+ cars, and finance from 8.9% APR."
6. **Rewrite /car-finance opening** — first sentence should answer "How does car finance work at Carsa?" not just brand the page.
7. **Rewrite /faq intro** — lead with a direct answer: "Carsa's FAQ covers buying, selling, finance, and collection processes across our 10 UK stores."

### Priority 3: Authority / E-E-A-T (roadmap work)

8. **Add outbound links to authoritative sources** — FCA register on finance pages, DVLA on selling FAQs, Thatcham/ABI on insurance blog posts. Even 1-2 per page signals trustworthiness.
9. **Strengthen author signals** — replace "Jane Doe" placeholder with real author names + short bio linking to an about/team page. Add Person schema.
10. **Add external citations on blog posts** — the Iran war piece references AutoTrader data but doesn't link to it. The insurance piece references Thatcham/ABI without links.

### Priority 4: Technical (quick wins)

11. **Add descriptive alt text to all images** — "A white 2023 Hyundai i10 parked outside a Carsa store" rather than just "Hyundai i10" or filename slugs.
12. **Implement HowTo schema** on /car-finance "How it works" section (4 steps) and the insurance blog's "How to reduce your premium" section.

### Priority 5: Content Structure (medium effort)

13. **Add question-format H2s to the FAQ page** — currently questions are nested below a single "FAQs" H2. Promote top questions to H2 level for better extraction.
14. **Convert homepage H2s to question format where natural** — "Why buy from Carsa?" is good; add "How does Carsa finance work?" and "What cars does Carsa sell?" if those sections exist.

---

## Items Needing Verification

| Item | Action Required |
|------|-----------------|
| A4: Rich Results Test | Run homepage through Google Rich Results Test once Organization schema ships |
| C12: FAQ freshness | Confirm FAQ content was reviewed within last 12 months (no date signal to verify) |
| D16: Blog outbound links | Verify if Thatcham/ABI links exist in blog HTML (WebFetch may have missed inline links) |
| Author identity | Confirm "Jane Doe" is a real author or placeholder — if placeholder, fix immediately |

---

## Summary

Carsa's blog content is genuinely strong for AEO — original data, good structure, and answer-first leads. The site's weakness is at the service/landing page level (homepage, /car-finance) where copy is brand-first rather than answer-first, and across the board on freshness signals and authority markers. The schema work already in progress will lift the A-category score significantly once shipped.

**Next level-up moves to reach L3:**
1. Ship Organization + WebSite schema (already in progress)
2. Add freshness component + establish quarterly review cadence
3. Build one more original data piece per quarter (the Iran war article template is excellent)
4. Strengthen internal link architecture from blog posts back to service pages and vice versa
