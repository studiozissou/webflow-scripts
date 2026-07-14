# AEO Audit: ulobby.eu

**Date:** 2026-06-08
**Auditor:** Stream D (automated)
**SEMRush AI Search Score:** 75
**Pages audited:**
- Homepage: https://www.ulobby.eu
- Solutions: https://www.ulobby.eu/solutions
- Blog article: https://www.ulobby.eu/blog/stakeholder-mapping-and-how-to-use-it-in-your-public-affairs-efforts

---

## Scorecard

```
A. Content Quality:     2/4  ⚠️
B. Answer Structure:    2/4  ⚠️
C. Freshness:           1/3  ❌
D. Authority:           1/4  ❌
E. Technical:           2/5  ⚠️
─────────────────────────────
Total:                  8/20  Flesch: ~55 (target 80+)
```

**Maturity Level: L1 — Keyword Foundation**

---

## Detailed Check Results

### A. Content Quality & Originality (2/4)

**1. Non-commodity content — FAIL**
Homepage and Solutions pages use standard B2B SaaS messaging ("one platform", "keep track", "manage your work"). The copy could belong to any PA/SRM tool with a find-and-replace on the brand name. The blog article on stakeholder mapping is stronger — it provides a specific matrix framework and the "20-25 true key stakeholders" heuristic — but still lacks proprietary data, benchmarks, or first-hand case studies. Across the three pages, there is no original research, no customer metrics, and no competitive differentiation backed by evidence.

*Fix:* Add original data points to key pages. Examples: "Ulobby users track an average of X stakeholders per issue", "Teams using Ulobby reduced reporting time by Y%". Even one real number per page transforms citability.

**2. First paragraph answers the query — PASS**
Homepage opens with "Software for Public Affairs professionals" and immediately explains the core value (monitoring, stakeholders, reporting in one place). Solutions page opens with "Ulobby is the Public Affairs software teams use to manage their work over time." Blog article opens by explaining what stakeholder mapping is and why it matters. All three leads are direct and answer-first.

**3. Semantic HTML — FAIL**
Webflow's default output is div-heavy. No evidence of `<article>`, `<section>`, or `<figure>` wrappers being used intentionally on the homepage or solutions page. The blog article has some implied structure from the Webflow CMS but lacks explicit semantic containers. Heading hierarchy is acceptable (single H1, H2s for sections) but the HTML is div-soup underneath.

*Fix:* In Webflow, add custom attributes: `role="article"` on blog post wrappers, use Webflow's built-in section element rather than divs, add `<figure>` wrappers around images with captions.

**4. H2s phrased as questions — FAIL**
Zero question-shaped H2s across all three pages. The blog article headings are all imperative/declarative ("Identify your stakeholders", "Plotting stakeholders into your map", "Taking action"). The Solutions page uses benefit statements ("Built for the way Public Affairs teams work"). None match the question patterns users type into AI engines.

*Fix:* Rewrite key H2s as questions. Examples: "What is stakeholder mapping?" instead of the intro paragraph, "How do you plot stakeholders on a matrix?", "What actions should you take based on your stakeholder map?". On Solutions: "How does Ulobby support Public Affairs work?" On Homepage: "What is a Public Affairs platform?"

---

### B. Answer-First Structure (2/4)

**5. 3 or fewer paragraphs per heading — NEEDS ATTENTION**
Blog article: "Identify your stakeholders" has ~4 paragraphs, "Taking action" has ~4 paragraphs. Both exceed the 3-paragraph limit. Homepage and Solutions pages are within bounds.

*Fix:* Add subheadings to break up the longer blog sections. E.g. under "Identify your stakeholders", add an H3 for "How many stakeholders should you track?"

**6. 3 or fewer sentences per paragraph — FAIL**
Blog article paragraphs average 3-4 sentences, with several running to 5 sentences. The opening paragraph is 3 long sentences that could be 5-6 shorter ones. Homepage is better (2-3 sentences). Solutions is clean.

*Fix:* Edit blog content to cap paragraphs at 3 sentences. Split the opening paragraph into two.

**7. Lists have an explanatory intro sentence — PASS**
The blog article's stakeholder quadrant list is introduced with "In general terms, action can be guided by which of the four squares in the matrix the stakeholder is placed in:". Solutions page tabs have brief intros. Passes.

**8. Active voice dominant — PASS**
Sampled sentences across all three pages are predominantly active voice. "Ulobby gives teams one shared system", "Your mapping must always capture these types of gatekeepers", "Make sure to maintain a good connection". Passive constructions are the exception.

---

### C. Freshness Signals (1/3)

**9. Visible "last updated" timestamp — FAIL**
No visible update date on homepage or solutions page. Blog article shows a published date (Dec 03, 2025) and a modified date (Jan 28, 2026) in JSON-LD but the visible display only shows the publish date. There is no "last updated" component on any page.

*Fix:* Add a visible "Last updated: YYYY-MM-DD" line to all key pages and blog articles. In Webflow, bind the CMS "Updated on" field to a visible text block on the blog template.

**10. Updated within 90 days — FAIL**
Blog article was last modified Jan 28, 2026 — over 4 months ago. Homepage and Solutions pages have no visible or schema-level update dates. No documented refresh cadence exists.

*Fix:* Establish a quarterly content refresh cadence. Review and update top 5 pages every 90 days. Even minor copy tweaks reset the freshness signal.

**11. No time-sensitive hedge words — PASS**
Homepage references "Trends for Public Affairs in 2026" (a blog title, acceptable). Blog article uses "currently" once. Solutions page is clean. Under the threshold of 3 instances.

---

### D. Authority / E-E-A-T (1/4)

**12. Original data, stats, or research cited — FAIL**
No original data on any page. The blog article's "20-25 stakeholders" figure is presented as a rule of thumb without source. No charts, no benchmarks, no survey results, no case study metrics. This is the biggest gap for AEO — pages with specific data get cited 3x more than qualitative-only content.

*Fix:* Create a flagship anchor asset: "State of Public Affairs [Year]" report with original survey data. In the short term, add specific numbers from customer usage to key pages (anonymised).

**13. Author/entity signals present — PASS**
Blog article has a byline (Mariann Malchau Olsen) with BlogPosting schema including author as Person. Organization schema is present site-wide. This passes, though author bios with credentials would strengthen it.

**14. External citations to primary sources — FAIL**
Zero external links to research, official documents, or authoritative sources across all three pages. The blog article on stakeholder mapping cites no academic frameworks, no EU policy documents, and no industry reports. All links are internal or CTAs.

*Fix:* Add 2-3 outbound links per blog article to authoritative sources (EU policy databases, academic stakeholder theory, industry association reports).

**15. Content fits a cite-magnet archetype — FAIL**
Homepage: marketing landing page (not a cite-magnet). Solutions: product page (not a cite-magnet). Blog article: closest to a how-to guide but lacks the depth, specificity, and structure to serve as a definitive resource. None of the audited pages are stats pieces, comprehensive guides, or structured comparisons.

*Fix:* Reposition the stakeholder mapping article as a definitive guide (add depth, examples, downloadable template). Create at least one stats-based anchor asset per quarter.

---

### E. Technical (2/5)

**16. Descriptive alt text — FAIL**
Multiple images across all three pages have empty or missing alt attributes. Logo images, hero images, and blog post images all lack descriptive alt text. This is a consistent issue.

*Fix:* Audit all images site-wide. Add descriptive alt text to every informative image. Mark purely decorative images with empty alt deliberately (Webflow: custom attribute `alt=""`).

**17. 2+ internal links to related pages — PASS**
All three pages have substantial internal linking through navigation, CTAs, related posts, and footer links. The blog article links to 3 related posts and multiple product pages. This passes.

**18. robots.txt allows AI bots — PASS**
robots.txt contains only a sitemap reference (`Sitemap: https://www.ulobby.eu/sitemap.xml`). No blocks for GPTBot, ClaudeBot, PerplexityBot, or Google-Extended. Default-allow. AI bots can crawl freely.

**19. Valid JSON-LD present — NEEDS ATTENTION**
JSON-LD is present across pages: Organization (115 instances site-wide), Article/BlogPosting (89 valid), SoftwareApplication (22 invalid per SEMRush). The homepage has WebPage + Organization + SoftwareApplication schema. The blog has BlogPosting schema. However, SEMRush flags 22 SOFTWARE_APP instances as invalid. Additionally, no canonical tags exist on any page — while not strictly a JSON-LD issue, it undermines the structured data's effectiveness.

*Fix:* Fix the 22 invalid SoftwareApplication schema instances (likely missing required fields like `operatingSystem` or `applicationCategory`). Add canonical tags to every page.

**20. Rich Results Test clean — NEEDS VERIFY**
Not run during this audit. The 22 invalid SoftwareApplication instances strongly suggest Rich Results Test would flag errors.

*Fix:* Run Google Rich Results Test on homepage and a blog article. Fix any errors flagged.

---

## Flesch Reading Ease Estimate

Sampled paragraphs from the blog article:

- Opening paragraph: long sentences, multi-clause, formal tone. ~12 words/sentence average, moderate syllable density.
- "First of all you will need to identify..." — 3 sentences averaging 20+ words each.
- Solutions page copy: shorter, cleaner. ~15 words/sentence.

**Estimated Flesch score: ~55** (college-level reading). This is well below the 80+ target. The content uses complex sentence structures, PA jargon ("gatekeepers", "indirect influence"), and formal academic-adjacent tone.

*Fix:* Simplify sentence structures. Target 15 words per sentence max. Break compound sentences. Replace jargon with plain language where the audience allows it (note: PA professionals expect some domain terminology, so aim for Flesch 65-70 as a realistic target for this audience).

---

## Maturity Assessment: L1 — Keyword Foundation

**Evidence:**
- Product/landing pages with branded messaging, minimal structured content strategy
- No FAQ blocks anywhere on the site
- No content hub or anchor asset
- No semantic clustering (blog articles exist but are not linked into topical clusters)
- No freshness components
- Blog content is sporadic, not systematic
- Zero question-shaped headings

**Level-up actions to reach L2:**

1. **Write answer-first leads on top 5 pages** — Homepage, Solutions, and 3 top blog articles. Ensure the first paragraph directly answers the implied query.
2. **Add FAQ blocks to Solutions and product pages** — 5-8 questions per page, with FAQPage schema. Match questions to what PA professionals actually search for.
3. **Start tracking AI referrer traffic** — Set up analytics segments for chatgpt.com, perplexity.ai, claude.ai, gemini.google.com, and copilot.microsoft.com referrers.

---

## Prioritised Fix List

### Priority 1: Answer-first structure + content quality (highest cross-platform impact)

| # | Fix | Pages | Effort |
|---|-----|-------|--------|
| 1 | Rewrite H2s as questions on blog articles and Solutions page | All | Low |
| 2 | Add subheadings to blog sections with 4+ paragraphs | Blog | Low |
| 3 | Shorten paragraphs to max 3 sentences across blog content | Blog | Low |
| 4 | Add non-commodity content: specific numbers, case study data, or benchmarks to homepage and Solutions | Homepage, Solutions | Medium |
| 5 | Add FAQ blocks (5-8 Qs) to Solutions page with FAQPage schema | Solutions | Medium |

### Priority 2: Freshness signals (simple to add, universally rewarded)

| # | Fix | Pages | Effort |
|---|-----|-------|--------|
| 6 | Add visible "Last updated" component to all pages and blog template | All | Low |
| 7 | Establish quarterly content refresh cadence; update top 5 pages | All | Low (process) |
| 8 | Review and update blog articles older than 90 days | Blog | Medium |

### Priority 3: Authority additions (longer cycle, roadmap work)

| # | Fix | Pages | Effort |
|---|-----|-------|--------|
| 9 | Add 2-3 external citations per blog article to authoritative sources | Blog | Low |
| 10 | Create a flagship anchor asset ("State of Public Affairs" report) | New page | High |
| 11 | Add author bios with credentials to blog bylines | Blog template | Low |
| 12 | Simplify readability — target Flesch 65-70 for PA audience | All | Medium |

### Priority 4: Schema + technical fixes (quality signals)

| # | Fix | Pages | Effort |
|---|-----|-------|--------|
| 13 | Fix 22 invalid SoftwareApplication schema instances | Site-wide | Medium |
| 14 | Add canonical tags to every page | Site-wide | Low |
| 15 | Add descriptive alt text to all informative images | Site-wide | Medium |
| 16 | Improve semantic HTML (section, article, figure elements) | Site-wide | Medium |
| 17 | Run Rich Results Test and fix any flagged errors | Site-wide | Low |

### Needs user input

| # | Item | Action needed |
|---|------|---------------|
| A | Rich Results Test (check 20) | Run manually at https://search.google.com/test/rich-results |
| B | AI referrer tracking | Confirm analytics platform and set up referrer segments |
| C | Content refresh cadence | Confirm who owns quarterly review and which pages are priority |

---

## Multi-locale note

The site serves 4 locales (EN, DA, NO, SV). This audit was conducted against the English locale only. The same structural issues (missing questions H2s, no FAQ blocks, no freshness components, missing alt text, no canonical tags) are very likely present across all locales. The canonical tag issue is especially critical for a multi-locale site — without hreflang + canonical tags, AI engines may struggle to distinguish locale variants and could cite the wrong language version.

**Recommendation:** After fixing the English pages, replicate the structural fixes across DA, NO, and SV locales. Add hreflang tags and canonical tags as a priority technical fix.
