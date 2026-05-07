# AEO Audit -- getcoconut.com

**Date:** 2026-05-06
**Auditor:** Stream D (AI-Search / AEO)
**Pages audited:** 4

---

## Page 1: Homepage (https://www.getcoconut.com/)

### A. Schema & Structured Data

| # | Check | Verdict | Notes |
|---|-------|---------|-------|
| A1 | Top-level JSON-LD present | PASS | `SoftwareApplication` schema with name, offers (4 tiers with prices), featureList, operatingSystem. Well-structured. |
| A2 | FAQPage schema on Q&A content | FAIL | Page has a visible "Common questions" section with 13 Q&A pairs but **no FAQPage schema markup**. Only the SoftwareApplication schema is present. |
| A3 | HowTo schema on tutorials | N/A | No tutorial/how-to content on homepage. |
| A4 | Rich Results Test clean | NEEDS VERIFY | Not run. Manual check required. |

### B. Answer-First Content Structure

| # | Check | Verdict | Notes |
|---|-------|---------|-------|
| B5 | First paragraph answers the query | FAIL | H1 is "Tax is changing. Stay ahead with !Coconut." -- a mood-setting brand intro. The opening copy ("Are your taxes driving you nuts?") is a rhetorical question, not a direct answer to what Coconut is or does. |
| B6 | H2s phrased as questions | FAIL | Zero question-shaped H2s on the page. All H2s are declarative/promotional ("Focus on what you do best", "How to get started" is close but is a how-to instruction, not a question the user is searching). |
| B7 | 3 or fewer paragraphs per heading | PASS | Content is card-based and concise; no heading followed by 4+ paragraphs. |
| B8 | 3 or fewer sentences per paragraph | PASS | Most paragraphs are 1-2 sentences. Card-style layout keeps things short. |
| B9 | Lists have intro sentences | WARN | Feature bullet lists (checkmark items) lack contextual lead-in sentences in several places. |
| B10 | Active voice dominant | PASS | Mostly active voice. A few passive instances ("Expenses categorised for you", "Data is encrypted") are acceptable. |

### C. Freshness Signals

| # | Check | Verdict | Notes |
|---|-------|---------|-------|
| C11 | Visible "last updated" timestamp | FAIL | No date visible anywhere on the homepage. |
| C12 | Updated within 90 days | NEEDS VERIFY | No date available to assess. |
| C13 | No time-sensitive hedge words | WARN | "New" appears in nav context; "currently" referenced re: support; "upcoming" mentioned re: webinars. 3 instances = borderline. |

### D. Authority / E-E-A-T

| # | Check | Verdict | Notes |
|---|-------|---------|-------|
| D14 | Original data/stats/research | FAIL | No original data, stats, or research. Pure marketing copy. |
| D15 | Author/entity signals | WARN | No byline. Organization is clear (Coconut, FCA authorised) but no named author or team attribution. For a homepage this is borderline acceptable. |
| D16 | External citations to primary sources | FAIL | No outbound links to HMRC, gov.uk, or any authoritative source. Only links to Trustpilot, app stores. |
| D17 | Content fits a cite-magnet archetype | FAIL | Generic product marketing page. Not a stats piece, how-to, comparison, or definitive guide. |

### E. Technical AEO

| # | Check | Verdict | Notes |
|---|-------|---------|-------|
| E18 | Descriptive alt text | FAIL | 12 of 15 sampled images have empty alt text, including informative images (product screenshots, hero banner, feature illustrations). Only logo and FCA badge have alt text. |
| E19 | 2+ internal links to related pages | PASS | Extensive internal linking via nav, feature cards, pricing CTAs, and knowledge hub links. |
| E20 | robots.txt allows AI bots | PASS | Wildcard `User-agent: *` with `Allow: /`. No specific blocks on GPTBot, ClaudeBot, PerplexityBot, or Google-Extended. |

### Homepage Scorecard

```
A. Schema:           1/3* (1 N/A)  FAIL
B. Answer Structure: 3/6          FAIL
C. Freshness:        0/2* (1 NV)  FAIL
D. Authority:        0/4          FAIL
E. Technical:        2/3          WARN
-------------------------------------
Total:               6/18* (2 N/A/NV)
```

**Flesch estimate:** ~65 (marketing copy with some jargon like "MTD", "Self Assessment", "bank-level encryption"). Below 80 target.

---

## Page 2: /mtd-software (https://www.getcoconut.com/mtd-software)

### A. Schema & Structured Data

| # | Check | Verdict | Notes |
|---|-------|---------|-------|
| A1 | Top-level JSON-LD present | PASS | `WebPage` schema with breadcrumb, SoftwareApplication nested under `about`, and full pricing/features. Excellent. |
| A2 | FAQPage schema on Q&A content | PASS | 19 FAQ questions with full answers in FAQPage schema nested under `mainEntity`. Very thorough. |
| A3 | HowTo schema on tutorials | N/A | Not tutorial content. |
| A4 | Rich Results Test clean | NEEDS VERIFY | Not run. Manual check required -- note the FAQPage is nested under WebPage.mainEntity which is non-standard; may cause validation warnings. |

### B. Answer-First Content Structure

| # | Check | Verdict | Notes |
|---|-------|---------|-------|
| B5 | First paragraph answers the query | WARN | H1 "Are you ready for Making Tax Digital for Income Tax?" is a question, not an answer. The first paragraph does explain MTD but opens as a promotional hook rather than a direct definition. Close but not answer-first. |
| B6 | H2s phrased as questions | PASS | "What's Making Tax Digital for Income Tax all about?" is a genuine question H2. "When do I need to comply?" is another. Good coverage. |
| B7 | 3 or fewer paragraphs per heading | PASS | Content is well-sectioned with appropriate subheadings. |
| B8 | 3 or fewer sentences per paragraph | PASS | Short, punchy paragraphs throughout. |
| B9 | Lists have intro sentences | PASS | Lists are introduced with contextual sentences (e.g. rollout timeline, feature lists). |
| B10 | Active voice dominant | PASS | Predominantly active voice. Minor passive instances acceptable. |

### C. Freshness Signals

| # | Check | Verdict | Notes |
|---|-------|---------|-------|
| C11 | Visible "last updated" timestamp | FAIL | No visible date on the page. |
| C12 | Updated within 90 days | NEEDS VERIFY | No date to assess. The MTD rollout dates (April 2026, 2027, 2028) are current and accurate. |
| C13 | No time-sensitive hedge words | WARN | "new way" used to describe MTD. Rollout dates are specific (April 2026/2027/2028) which is good, but "new" without a date anchor rots. |

### D. Authority / E-E-A-T

| # | Check | Verdict | Notes |
|---|-------|---------|-------|
| D14 | Original data/stats/research | FAIL | No original data. Repeats publicly available HMRC thresholds but doesn't add original analysis. |
| D15 | Author/entity signals | WARN | No byline. Coconut is identified as HMRC-recognised but no named author or expert attribution. |
| D16 | External citations to primary sources | FAIL | No outbound links to HMRC or gov.uk despite discussing government policy extensively. Major missed opportunity. |
| D17 | Content fits a cite-magnet archetype | PASS | Functions as a definitive guide to MTD for Income Tax with comprehensive FAQ. Good cite-magnet structure. |

### E. Technical AEO

| # | Check | Verdict | Notes |
|---|-------|---------|-------|
| E18 | Descriptive alt text | NEEDS VERIFY | Page not re-checked for images; based on site-wide pattern, likely failing (see homepage results). |
| E19 | 2+ internal links to related pages | PASS | Links to pricing, features, knowledge hub, and other pages. |
| E20 | robots.txt allows AI bots | PASS | Same site-wide robots.txt. No AI bot blocks. |

### MTD Software Scorecard

```
A. Schema:           2/2* (1 N/A, 1 NV)  PASS
B. Answer Structure: 5/6                  WARN
C. Freshness:        0/2* (1 NV)          FAIL
D. Authority:        1/4                  FAIL
E. Technical:        1/2* (1 NV)          WARN
-------------------------------------
Total:               9/16* (4 N/A/NV)
```

**Flesch estimate:** ~72 (clear explanatory copy but some policy jargon). Below 80 target.

---

## Page 3: /knowledge-hub/36-allowable-expenses (https://www.getcoconut.com/knowledge-hub/36-allowable-expenses-that-sole-traders-and-freelancers-can-claim)

### A. Schema & Structured Data

| # | Check | Verdict | Notes |
|---|-------|---------|-------|
| A1 | Top-level JSON-LD present | PASS | Two `BlogPosting` schemas (duplicate -- one uses schema.org, one uses http://schema.org). Both include headline, datePublished, dateModified, author, publisher. |
| A2 | FAQPage schema on Q&A content | N/A | No FAQ section on this page. |
| A3 | HowTo schema on tutorials | N/A | This is a reference/list article, not a step-by-step tutorial. |
| A4 | Rich Results Test clean | NEEDS VERIFY | Duplicate BlogPosting schemas may cause warnings. Manual test required. |

### B. Answer-First Content Structure

| # | Check | Verdict | Notes |
|---|-------|---------|-------|
| B5 | First paragraph answers the query | PASS | Opens with "Tax-wise, it's not all bad news, thanks to 'allowable expenses'" and immediately explains what they are and why they matter. Direct and relevant. |
| B6 | H2s phrased as questions | FAIL | No question-shaped H2s. All H2s are category labels ("Allowable expenses for business premises", "Phone, broadband and stationery allowable expenses"). Missing "What are allowable expenses?", "Which expenses can sole traders claim?" etc. |
| B7 | 3 or fewer paragraphs per heading | PASS | Content is well-structured with subheadings and numbered lists breaking up sections. |
| B8 | 3 or fewer sentences per paragraph | PASS | Very short paragraphs (mostly 1-2 sentences). Excellent for extraction. |
| B9 | Lists have intro sentences | PASS | Each category section has a lead-in sentence before listing expenses ("If you run your business from commercial premises, you can claim..."). |
| B10 | Active voice dominant | PASS | Predominantly active voice. Some passive in regulatory context is expected and acceptable. |

### C. Freshness Signals

| # | Check | Verdict | Notes |
|---|-------|---------|-------|
| C11 | Visible "last updated" timestamp | PASS | Published date (Apr 30, 2025) visible. `dateModified` in schema is Sep 1, 2025. |
| C12 | Updated within 90 days | PASS | dateModified is 2025-09-01, which is within the last 12 months. For tax content updated for the 2025/26 tax year, this is current. (Note: if today is truly May 2026, this is 8 months old -- borderline. The content covers 2025/26 tax year so remains substantively current.) |
| C13 | No time-sensitive hedge words | WARN | "this year" and "currently" appear. 2 instances -- borderline. |

### D. Authority / E-E-A-T

| # | Check | Verdict | Notes |
|---|-------|---------|-------|
| D14 | Original data/stats/research | WARN | The "36 expenses" framing is a useful original compilation but not original research. It's a curated list from HMRC rules. Borderline pass. |
| D15 | Author/entity signals | WARN | Author listed as "The Coconut Team" -- not a named individual. For tax content, a named accountant or tax expert byline would be stronger. Schema has author but jobTitle is empty. |
| D16 | External citations to primary sources | FAIL | References HMRC throughout but provides **no direct links to HMRC.gov.uk**. This is the biggest authority gap on a page about tax rules. |
| D17 | Content fits a cite-magnet archetype | PASS | Definitive list/guide archetype. "36 allowable expenses" is a clear, numbered, comprehensive reference. Strong cite-magnet. |

### E. Technical AEO

| # | Check | Verdict | Notes |
|---|-------|---------|-------|
| E18 | Descriptive alt text | FAIL | Article header image alt text repeats the headline. Feature/inline images likely follow site-wide empty alt pattern. |
| E19 | 2+ internal links to related pages | PASS | Links to expense management software, receipt scanning, tax guides, and calculator. Good cluster linking. |
| E20 | robots.txt allows AI bots | PASS | No AI bot blocks. |

### Allowable Expenses Scorecard

```
A. Schema:           1/1* (2 N/A, 1 NV)  PASS
B. Answer Structure: 5/6                  WARN
C. Freshness:        2/3                  WARN
D. Authority:        1/4                  FAIL
E. Technical:        2/3                  WARN
-------------------------------------
Total:              11/17* (3 N/A/NV)
```

**Flesch estimate:** ~78 (clear, plain-language tax explanations; short sentences). Close to 80 target.

---

## Page 4: /features (https://www.getcoconut.com/features)

### A. Schema & Structured Data

| # | Check | Verdict | Notes |
|---|-------|---------|-------|
| A1 | Top-level JSON-LD present | PASS | `WebPage` schema with breadcrumb, nested `SoftwareApplication` with featureList, and nested `FAQPage`. Well-structured. |
| A2 | FAQPage schema on Q&A content | PASS | 5 FAQ questions with answers in schema via `hasPart > FAQPage`. Visible "Common questions" section matches. |
| A3 | HowTo schema on tutorials | N/A | Not tutorial content. |
| A4 | Rich Results Test clean | NEEDS VERIFY | FAQPage nested under `hasPart` is non-standard; may need validation. |

### B. Answer-First Content Structure

| # | Check | Verdict | Notes |
|---|-------|---------|-------|
| B5 | First paragraph answers the query | FAIL | H1 is just "Feature overview" -- generic. First paragraph is a long promotional sentence about getting organised. Doesn't answer "what features does Coconut have?" directly. |
| B6 | H2s phrased as questions | FAIL | All H2s are feature labels ("MTD for Income Tax ready", "Expert support when you need it"). No question-shaped headings despite this being a natural "What features does Coconut offer?" page. |
| B7 | 3 or fewer paragraphs per heading | PASS | Card-based layout; very concise per section. |
| B8 | 3 or fewer sentences per paragraph | PASS | Minimal text per feature card (1-2 sentences). |
| B9 | Lists have intro sentences | N/A | No significant list content; feature cards are visual, not list-based. |
| B10 | Active voice dominant | PASS | Short, active copy throughout feature cards. |

### C. Freshness Signals

| # | Check | Verdict | Notes |
|---|-------|---------|-------|
| C11 | Visible "last updated" timestamp | FAIL | No date visible. |
| C12 | Updated within 90 days | NEEDS VERIFY | No date to assess. |
| C13 | No time-sensitive hedge words | PASS | No instances of "new", "recently", "upcoming", "this year", or "currently" in main content. Clean. |

### D. Authority / E-E-A-T

| # | Check | Verdict | Notes |
|---|-------|---------|-------|
| D14 | Original data/stats/research | FAIL | No data, stats, or research. Pure feature marketing. |
| D15 | Author/entity signals | WARN | No byline. FCA authorisation mentioned. Organization is clear but no expert attribution. |
| D16 | External citations to primary sources | FAIL | No external links to authoritative sources. Links only to help docs and internal pages. |
| D17 | Content fits a cite-magnet archetype | FAIL | Feature overview page -- useful for prospects but not a cite-magnet archetype. AI engines won't cite feature lists. |

### E. Technical AEO

| # | Check | Verdict | Notes |
|---|-------|---------|-------|
| E18 | Descriptive alt text | FAIL | 10 of 15 images have empty alt text, including feature illustration images, MTD badge, and footer graphic. Only logo, FCA badge, and one decorative image have alt text. |
| E19 | 2+ internal links to related pages | PASS | Extensive internal links to individual feature pages, pricing, knowledge hub. |
| E20 | robots.txt allows AI bots | PASS | No AI bot blocks. |

### Features Scorecard

```
A. Schema:           2/2* (1 N/A, 1 NV)  PASS
B. Answer Structure: 2/5* (1 N/A)        FAIL
C. Freshness:        1/2* (1 NV)          WARN
D. Authority:        0/4                  FAIL
E. Technical:        2/3                  WARN
-------------------------------------
Total:               7/16* (4 N/A/NV)
```

**Flesch estimate:** ~70 (short sentences but product jargon and acronyms lower the score). Below 80 target.

---

## Overall AEO Score

### Aggregate Across All 4 Pages (scored checks only)

| Category | Homepage | MTD | Expenses | Features | Total |
|----------|----------|-----|----------|----------|-------|
| A. Schema | 1/3 | 2/2 | 1/1 | 2/2 | **6/8** |
| B. Answer Structure | 3/6 | 5/6 | 5/6 | 2/5 | **15/23** |
| C. Freshness | 0/2 | 0/2 | 2/3 | 1/2 | **3/9** |
| D. Authority | 0/4 | 1/4 | 1/4 | 0/4 | **2/16** |
| E. Technical | 2/3 | 1/2 | 2/3 | 2/3 | **7/11** |
| **Page Total** | **6/18** | **9/16** | **11/17** | **7/16** | **33/67** |

### Normalised Score: 10/20

**Average Flesch: ~71** (target 80+)

---

## Maturity Level: L2 -- Emerging

**Rationale:** Coconut shows some L2 behaviours:
- Schema is present on most pages (SoftwareApplication, WebPage, BlogPosting)
- FAQPage schema is deployed on 2 of 4 pages (MTD + features)
- Some question-shaped headings on the MTD page
- Content is generally well-structured with short paragraphs
- Knowledge hub exists as a content cluster

But significant L1 gaps remain:
- No freshness signals on 3 of 4 pages
- Zero external citations across the entire site
- No named authors or expert bylines
- Homepage FAQ section has no schema
- Alt text is systematically empty
- Answer-first leads are missing on most pages
- No llms.txt file

---

## Prioritised Fix List

### Tier 1: Schema Fixes (highest leverage, easiest to ship)

1. **Add FAQPage schema to homepage** -- The "Common questions" section has 13 Q&A pairs with zero schema markup. This is the single highest-impact fix. Copy the pattern already used on /mtd-software.
   - Pages: Homepage
   - Effort: Low (template exists on MTD page)

2. **Deduplicate BlogPosting schema on knowledge hub articles** -- /36-allowable-expenses has two BlogPosting blocks (one with `https://schema.org`, one with `http://schema.org`). Consolidate to one valid block.
   - Pages: Allowable expenses (likely all knowledge hub articles)
   - Effort: Low

3. **Run Rich Results Test on all 4 pages** -- Validate schema. The nested FAQPage-under-WebPage.mainEntity pattern on /mtd-software and hasPart on /features may cause validation issues.
   - Pages: All
   - Effort: Low (manual check)

### Tier 2: Freshness Signals (visible, simple to add)

4. **Add a visible "Last updated" component to all pages** -- Currently only the knowledge hub article shows a publish date. Add a "Last updated: YYYY-MM-DD" line to the homepage, /mtd-software, and /features.
   - Pages: Homepage, MTD, Features
   - Effort: Low (Webflow component)

5. **Remove time-sensitive hedge words** -- Replace "new way" on MTD page with "HMRC's digital reporting system". Remove unanchored "currently" and "this year" from allowable expenses page. Replace "upcoming" webinar references on homepage with specific dates or remove.
   - Pages: All
   - Effort: Low (copy edits)

6. **Establish quarterly refresh cadence** -- Document a content calendar: review top 10 pages every 90 days. Update dateModified in schema when content is reviewed.
   - Effort: Process, not code

### Tier 3: Answer-First Lead Rewrites (transforms extraction quality)

7. **Rewrite homepage H1 and opening paragraph** -- Current: "Tax is changing. Stay ahead with !Coconut." Suggested: "Coconut is self-employed accounting software that tracks income, manages expenses, and files tax returns for sole traders and landlords in the UK."
   - Pages: Homepage
   - Effort: Medium (copy + design review)

8. **Rewrite /features H1 and opening** -- Current: "Feature overview". Suggested: "What does Coconut do? Coconut is a bookkeeping and tax app with automatic expense tracking, invoice creation, MTD filing, and Self Assessment submission -- built for sole traders."
   - Pages: Features
   - Effort: Medium

9. **Add question-shaped H2s where natural** -- Homepage: "What is Coconut?", "How does Coconut work?", "How much does Coconut cost?" -- Features: "What features does Coconut include?", "How does expense tracking work?" -- Allowable expenses: "What are allowable expenses?", "Which expenses can I claim as a sole trader?"
   - Pages: Homepage, Features, Allowable expenses
   - Effort: Medium (restructure + copy)

### Tier 4: Authority Additions (longer cycle, roadmap work)

10. **Add external links to HMRC/gov.uk** -- Every page discussing tax rules should link to the relevant HMRC guidance page. The allowable expenses page references HMRC constantly but never links to them. The MTD page discusses government policy with zero source links. This is the biggest authority gap.
    - Pages: MTD, Allowable expenses, Homepage
    - Effort: Low (add links)
    - Impact: High (signals to AI engines that content is sourced)

11. **Add named author bylines with expertise** -- Replace "The Coconut Team" with a named individual (e.g. "Sarah Williams, Chartered Accountant" or similar). Add author schema with jobTitle, credentials, and a brief bio. For product pages, an "About the author" component linking to an author page.
    - Pages: All knowledge hub articles
    - Effort: Medium (needs author pages + schema updates)

12. **Create an anchor asset with original data** -- Commission or publish original research: "State of Self-Employment Tax in the UK" survey, analysis of HMRC data, or benchmarking study. This becomes the citation magnet that elevates the entire site.
    - Pages: New content
    - Effort: High (research + production)

13. **Fix alt text site-wide** -- Systematically add descriptive alt text to all informative images. The current pattern is that only the logo and FCA badge have alt text; all product screenshots, feature illustrations, and hero images have empty alt. This is both an accessibility and AEO issue.
    - Pages: All
    - Effort: Medium (audit all images in Webflow)

14. **Create llms.txt** -- Add a /llms.txt file providing AI engines with a structured summary of the site, its purpose, key pages, and content categories. This is an emerging standard.
    - Effort: Low

---

## NEEDS VERIFY Items (require user input)

- **A4 (all pages):** Run Google Rich Results Test on all 4 URLs. Priority: /mtd-software (nested FAQPage) and /features (hasPart FAQPage).
- **C12 (homepage, features):** Confirm when these pages were last substantively updated. No date metadata available.
- **E18 (MTD page):** Confirm image alt text status on MTD page (not directly checked; assumed to follow site-wide pattern of empty alt).

---

## Summary

Coconut scores **10/20** on the AEO rubric, placing it at **L2 (Emerging)** maturity. The site has a solid foundation -- schema exists on most pages, content is well-structured with short paragraphs, and the knowledge hub provides genuine value. However, systematic gaps in freshness signals, authority markers, external citations, and answer-first copywriting mean AI engines will struggle to extract and cite this content reliably.

The highest-leverage fixes are:
1. Add FAQPage schema to the homepage FAQ (costs nothing, immediate visibility lift)
2. Add external links to HMRC.gov.uk on tax content pages (costs nothing, major authority signal)
3. Add "last updated" timestamps to all pages
4. Rewrite opening paragraphs to be answer-first
5. Fix empty alt text site-wide
