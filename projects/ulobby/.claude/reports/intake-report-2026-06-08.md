# Site Intake Report — Ulobby

**Date:** 2026-06-08 | **Live URL:** https://www.ulobby.eu | **Staging URL:** N/A

## Summary

Ulobby is an AI-powered Public Affairs platform founded in Copenhagen in 2016, serving PA professionals and decision-makers across Denmark, the EU, and Scandinavia. The site is built on Webflow with four locale variants (EN, DA, NO, SV) totalling 273 crawled pages, including a CMS-driven blog. The overall SEMRush health score is 85/100 with strong fundamentals: HTTPS is perfect, SSL is valid, robots.txt and sitemap are healthy, GTM analytics and Cookiebot consent are present, and the heading hierarchy is clean across spot-checked pages. Blog articles carry valid BlogPosting schema with author Person markup, and Organization schema covers the site.

However, one critical structural gap undermines much of this foundation: canonical tags are missing on every single page. For a multi-locale site, this is severe — search engines cannot resolve duplicate content between EN, DA, NO, and SV variants, paginated blog pages compete with base URLs, and link equity is diluted across duplicates. Compounding this, Cookiebot injects 171 malformed `javascript:` links that inflate the error count, 22 SoftwareApplication schema instances are invalid, and GTM appears to fire before Cookiebot consent — a GDPR compliance risk for an EU-focused business. On the content side, the AEO score is 8/20 (L1 maturity): pages lack question-shaped headings, FAQ blocks, original data, external citations, freshness signals, and descriptive alt text. The Flesch reading ease estimate of ~55 is well below the 80+ target, though a realistic goal for this PA audience is 65-70.

**Verdict:** The site has solid technical bones but needs urgent canonical tag restoration, schema cleanup, GDPR consent alignment, and a structured content strategy to move from keyword-only SEO into AI answer engine visibility. The asset bandwidth data also reveals optimisation opportunities — PNGs account for 48.6% of 3.06 GB monthly bandwidth, with a single portrait image consuming 959 MB alone.

---

## Passing

| Check | Status | Notes |
|-------|--------|-------|
| robots.txt | PASS | Present, valid, no errors. Sitemap referenced. |
| sitemap.xml | PASS | Healthy. 285 URLs across 4 locales. Format valid. |
| SSL / HTTPS | PASS | 100% HTTPS. No mixed content. Valid certificate. |
| Canonical domain | PASS | Both `ulobby.eu` and `www.ulobby.eu` resolve. Primary is `www.ulobby.eu`. |
| Analytics (GTM) | PASS | GTM-TFHLQ84T detected on homepage. |
| Cookie consent | PASS | Cookiebot present site-wide. |
| Custom 404 | PASS | 404 page configured in Webflow (confirmed via page list). |
| OG tags | PASS | Present on 171/273 pages (published content). |
| Heading hierarchy | PASS | Clean H1 > H2 > H3 on spot-checked pages. No heading level skips. |
| Organization schema | PASS | Valid JSON-LD on 115 pages. |
| BlogPosting schema | PASS | 89 valid instances with author Person. |
| Viewport meta | PASS | `width=device-width, initial-scale=1` on all tested pages. |
| Draft pages | PASS | All 6 drafts return 404 (not indexed). No dev/test pages published. |
| robots.txt AI bot access | PASS | No blocks for GPTBot, ClaudeBot, PerplexityBot, or Google-Extended. |
| Active voice | PASS | Content is predominantly active voice across sampled pages. |
| List introductions | PASS | Lists are properly introduced with explanatory sentences. |
| Internal linking (core pages) | PASS | Substantial cross-linking through nav, CTAs, related posts, and footer. |
| Status codes | PASS | 270 pages returning 2xx, only 2 redirects and 1 error. |

---

## Needs Attention

### SEO — Meta & Open Graph

| Issue | Severity | Count | Detail |
|-------|----------|-------|--------|
| Duplicate meta titles | Error | 12 | All blog listing pages sharing "Insights \| Ulobby" — `/blog`, `/da/blog`, `/no/blogg`, `/sv/blog` + paginated variants. |
| Duplicate meta descriptions | Error | 12 | Same blog listing pages as above. |
| Missing meta descriptions | Error | 4 | Newsletter pages across all 4 locales. |
| Titles too long (>60 chars) | Warning | 7 | "The five focus areas..." (EN, NO, SV) and "Navigating the complexity of PA..." (EN, DA, NO, SV). |
| H1 duplicates title tag | Notice | 85 | 50% of crawled pages. Common Webflow pattern — low severity. Differentiate on key commercial pages. |
| Twitter Cards partial | Notice | — | 167/273 pages. 106 pages without — likely utility and paginated variants. |

### SEO — Structure & Schema

| Issue | Severity | Count | Detail |
|-------|----------|-------|--------|
| Missing canonical tags | Critical | 273 | No canonical tag on ANY crawled page. Causes duplicate content across locales and paginated pages. |
| Invalid SoftwareApplication schema | Error | 22 | Missing `aggregateRating`/`review` and `offers`. `contactPoint` not recognized on SoftwareApplication type. Affects solution pages + homepages across all 4 locales. |
| Hreflang conflicts | Error | 4 | Contradictory declarations within same page source. |
| Missing hreflang | Warning | 12 | Newer or utility pages without hreflang tags. |
| Hreflang language mismatch | Notice | 63 | Content language doesn't match declared hreflang — likely incomplete translations. |
| Multiple H1 tags | Notice | 9 | Plans (all locales), Technology (all locales), 1 DA blog article. All show exactly 2 H1s. |
| Orphaned sitemap pages | Notice | 37 | In sitemap but not linked from any crawled page. |
| Crawl depth > 3 clicks | Notice | 32 | Blog articles behind pagination. |
| Pages with only 1 internal link | Notice | 5 | Orphan-risk pages needing improved internal linking. |
| Missing BreadcrumbList schema | Gap | — | Would improve SERP display for blog and nested pages. |
| Missing FAQPage schema | Gap | — | No FAQ blocks on any page. |
| Missing WebSite + SearchAction schema | Gap | — | Would enable sitelinks search box. |

### Technical — Custom Code

| Issue | Severity | Count | Detail |
|-------|----------|-------|--------|
| Cookiebot malformed links | Error | 171 | `href="javascript:Cookiebot.renew()"` on all crawled pages. Crawlers interpret as broken URL. |
| GTM/Cookiebot consent alignment | High | Site-wide | GTM appears to fire before Cookiebot consent. GDPR risk for EU/DK/Scandi market. |
| Pages blocked from crawling | Needs verify | 97 | robots.txt or noindex rules. May be intentional (locale redirects, utility pages) — requires verification. |

### Content & Accessibility

| Issue | Severity | Count | Detail |
|-------|----------|-------|--------|
| Missing alt text | Error | Multiple | Plans page (logo SVG), Technology page (6+ images), Homepage (logo), and likely more site-wide. |
| Non-descriptive anchor text | Notice | 437 | Generic "Read more", "Learn more", icon-only links. |
| Links with no anchor text | Notice | 109 | Image/icon links without alt or aria-label. |
| No question-shaped H2s | AEO gap | All pages | Zero question-format headings across entire site. |
| Paragraphs too long | AEO gap | Blog | Several blog sections exceed 3-paragraph limit per heading; paragraphs average 3-5 sentences. |
| No visible "last updated" dates | AEO gap | All pages | Blog shows publish date only. No freshness component on any page. |
| No original data or research | AEO gap | All pages | No proprietary benchmarks, survey data, or case study metrics. |
| No external citations | AEO gap | Blog | Zero outbound links to authoritative sources. |
| Flesch reading ease ~55 | AEO gap | All | College-level reading; target 65-70 for PA audience. |
| Semantic HTML (div-heavy) | AEO gap | All | No `<article>`, `<section>`, or `<figure>` wrappers used intentionally. |

### CMS Hygiene

| Issue | Severity | Detail |
|-------|----------|--------|
| Unnecessary template pages | Notice | 6 collections (Pricing Features, Team Members, Blog Categories, Features, Quizzes, Transparent Democracy) have template pages they don't need. |
| Slug inconsistency | Notice | Blog Categories slug is `category` — should be `blog-categories` for consistency. |
| Content not optimized | Notice | 24 pages flagged by SEMRush content suggestions. |
| Low text-to-HTML ratio | Notice | 17 pages flagged — expected for design-heavy SaaS landing pages. No action required. |
| Incomplete translations | Notice | 63 pages with content not matching declared locale. DA/NO/SV URLs likely falling back to English. |

---

## Missing or Broken

| Check | Detail |
|-------|--------|
| Canonical tags | Missing on ALL 273 crawled pages. Webflow auto-generates these by default — something has overridden or disabled them. |
| llms.txt | Not found at site root. Required for AI search visibility. |
| Broken external links — thepublicaffairsengine.com | 16 links across 4 blog articles in all locales. Domain expired / DNS failure. |
| Broken external links — Bluesky | 3 links returning 429. Transient rate limiting — no action needed. |
| Favicon | Not confirmed via WebFetch (stripped by markdown conversion). Needs browser verification. |
| FAQ blocks | Absent from all pages. No FAQPage schema anywhere on site. |
| Author bios | Blog bylines exist but lack credential details or bio pages. |
| "Last updated" component | No visible freshness signal on any page or blog template. |
| Content refresh cadence | No documented update schedule. Blog article last modified Jan 28, 2026 (4+ months ago). |

---

## Lighthouse Audits

**Source:** Chrome DevTools MCP — Lighthouse navigation mode, desktop | **Date:** 2026-06-08

| Page | A11y | Best Practices | SEO | Agentic | LCP (ms) | CLS |
|------|------|---------------|-----|---------|----------|-----|
| `/` (Homepage) | 93 | 77 | 83 | 50 | 176 | 0.00 |
| `/solutions` | 97 | 77 | 83 | 100 | 175 | 0.00 |
| `/blog` | 92 | 77 | 83 | 50 | 200 | 0.00 |
| `/solutions/stakeholder-overview` | 97 | 77 | 83 | 100 | 197 | 0.00 |
| `/plans` | 95 | 77 | 92 | 69 | 221 | 0.00 |
| `/contact` | 99 | 77 | 92 | 100 | 163 | 0.00 |
| `/demo` | 99 | 77 | 92 | 100 | 184 | 0.00 |
| `/blog/stakeholder-mapping...` | 91 | 77 | 83 | 43 | 277 | 0.00 |
| `/blog/...srm-...crm` | 94 | 77 | 83 | 50 | 186 | 0.00 |
| `/blog/what-is-public-affairs` | 94 | 77 | 83 | 19 | 253 | 0.00 |

**Aggregates:** A11y 91-99 (median 94.5) | Best Practices 77 flat | SEO 83-92 | LCP 163-277ms | CLS 0.00 across all pages.

**Key findings:**
- Performance is excellent — all LCP under 300ms, zero CLS
- Best Practices locked at 77 site-wide (Cookiebot `javascript:` links)
- Blog articles score lowest on Agentic Browsing (19-50) — confirms AEO gap
- Solutions/Contact/Demo score 100 on Agentic Browsing
- SEO scores split: utility pages 92, content pages 83 (missing canonicals, duplicate meta)

Full analysis in `audits/structure.md`.

---

## SEMRush Organic Intelligence

**Source:** SEMRush Organic Research API | **Date:** 2026-06-08

### Domain Overview (All Markets)

| Database | Organic Keywords | Organic Traffic | Traffic Cost ($) | Organic Rank |
|----------|-----------------|----------------|-----------------|-------------|
| DK | 16 | 89 | 72 | 161,001 |
| US | 72 | 21 | 225 | 6,575,163 |
| NO | 2 | 0 | 0 | — |
| SE | 3 | 0 | 0 | — |
| UK | 4 | 0 | 0 | — |
| DE | 2 | 0 | 0 | — |

**Summary:** Ulobby's organic footprint is concentrated in Denmark (primary market) and US (secondary, likely due to English-language blog content). Norwegian and Swedish markets have near-zero organic visibility despite dedicated locale subfolders. Total estimated organic traffic across all markets: ~110 visits/month.

### Top Ranking Keywords — Denmark

| Keyword | Position | Volume | Traffic | Traffic % | URL |
|---------|----------|--------|---------|-----------|-----|
| ulobby | 1 | 70 | 64 | 72.2% | /da |
| public affairs | 11 | 390 | 8 | 9.4% | /da |
| public affairs manager | 7 | 140 | 6 | 6.5% | /da/blog/first-100-days-pa |
| offentlige anliggender | 5 | 50 | 5 | 5.3% | /da |
| public affairs betydning | 8 | 30 | 2 | 2.0% | /da/blog/first-100-days-pa |
| stakeholder mapping | 14 | 90 | 1 | 1.5% | /da/blog/stakeholder-mapping |
| interessentanalyse | 11 | 50 | 1 | 1.2% | /da/blog/stakeholder-mapping |
| stakeholder mapping template | 16 | 70 | 1 | 0.7% | /da/blog/stakeholder-mapping |

**Observation:** 72% of Danish organic traffic comes from branded search ("ulobby"). Only 28% comes from non-branded terms. The site ranks for high-value PA industry terms ("public affairs" #11, "stakeholder mapping" #14) but not yet in top-5 positions where click-through rates spike. The blog's stakeholder mapping article is the strongest non-branded asset.

### Top Ranking Keywords — US

| Keyword | Position | Volume | Traffic | Traffic % | URL |
|---------|----------|--------|---------|-----------|-----|
| public affairs | 19 | 22,200 | 6 | 29.4% | / |
| affairs public | 19 | 1,300 | 1 | 3.3% | / |
| start up lobbying software | 5 | 30 | 1 | 4.3% | / |
| public affairs career | 17 | 720 | 0 | 1.3% | /blog/first-100-days-pa |
| public affair | 20 | 4,400 | 0 | 1.0% | / |
| stakeholder mapping | 14 | 6,600 | 1 | 5.6% | /blog/stakeholder-mapping |
| stakeholder analysis | 31 | 14,800 | 0 | 0.4% | /blog/stakeholder-mapping |

**Observation:** US rankings are driven by high-volume head terms ("public affairs" 22.2k volume, "stakeholder analysis" 14.8k volume) where Ulobby sits on page 2. Even small position improvements on these terms would yield significant traffic gains. "Start up lobbying software" at #5 is a niche long-tail win.

### Top Ranking Keywords — Norway & Sweden

| Market | Keyword | Position | Volume |
|--------|---------|----------|--------|
| NO | ulobby | 1 | 10 |
| NO | public affairs | 18 | 210 |
| SE | ulobby | 2 | 10 |
| SE | public affairs | 19 | 480 |
| SE | stakeholder mapping | 28 | 590 |

**Observation:** Norwegian and Swedish presence is branded-only or deep page 2. The /no and /sv locale subfolders are not generating meaningful organic traffic, likely because many pages remain untranslated (63 language-mismatch pages flagged in SEO audit).

### Top Pages by Traffic — Denmark

| URL | Keywords | Traffic | Traffic % |
|-----|----------|---------|-----------|
| /da | 6 | 85 | 95.5% |
| /da/blog/first-100-days-pa | 3 | 8 | 9.0% |
| /da/blog/stakeholder-mapping | 3 | 2 | 2.2% |
| /da/blog/ethics-image-pa | 1 | 0 | 0.2% |

**Observation:** The Danish homepage captures 95% of organic traffic. Only 2 blog articles generate measurable traffic. The remaining 60+ Danish pages (solutions, plans, about, other blog posts) are not ranking for any tracked keywords. This is a content distribution problem — the site has valuable content that search engines are not surfacing.

### Organic Competitors — Denmark

| Competitor | Common Keywords | SE Keywords | SE Traffic |
|-----------|----------------|-------------|------------|
| lynglund.dk | 2 | 142 | 38 |
| valgpuls.dk | 2 | 85 | 7 |
| bertel.dk | 2 | 259 | 90 |
| publicaffairsgroup.dk | 2 | 26 | 10 |
| da.wikipedia.org | 2 | 1,419,858 | 3,810,791 |
| tfroes.dk | 1 | 93 | 19 |
| samfundsfag-c.systime.dk | 1 | 614 | 293 |
| altinget.dk | 1 | 89,085 | 90,252 |

**Observation:** Direct competitors (lynglund.dk, publicaffairsgroup.dk) are very small — all under 150 keywords. The PA software space in Denmark is underserved in organic search. Ulobby's biggest organic competitors are informational sites (Wikipedia, Altinget, educational sites) ranking for PA terminology, not competing SaaS platforms. This represents an opportunity to own the category with relatively modest content investment.

### 12-Month Organic Trend — Denmark

| Month | Keywords | Traffic |
|-------|----------|---------|
| Jul 2025 | 15 | 72 |
| Aug 2025 | 16 | 95 |
| Sep 2025 | 15 | 81 |
| Oct 2025 | 17 | 95 |
| Nov 2025 | 16 | 89 |
| Dec 2025 | 17 | 103 |
| Jan 2026 | 18 | 132 |
| Feb 2026 | 17 | 116 |
| Mar 2026 | 17 | 105 |
| Apr 2026 | 16 | 94 |
| May 2026 | 16 | 89 |
| Jun 2026 | 16 | 89 |

**Trend:** Stable keyword count (15-18) with a traffic peak in Jan 2026 (132). No significant growth or decline. The keyword count has plateaued — new content or optimisation is needed to expand the footprint.

### 12-Month Organic Trend — US

| Month | Keywords | Traffic |
|-------|----------|---------|
| Jul 2025 | 27 | 0 |
| Aug 2025 | 29 | 2 |
| Sep 2025 | 32 | 3 |
| Oct 2025 | 36 | 3 |
| Nov 2025 | 42 | 3 |
| Dec 2025 | 48 | 5 |
| Jan 2026 | 53 | 6 |
| Feb 2026 | 60 | 8 |
| Mar 2026 | 65 | 11 |
| Apr 2026 | 68 | 15 |
| May 2026 | 71 | 19 |
| Jun 2026 | 72 | 21 |

**Trend:** Strong upward trajectory — keywords nearly tripled from 27 to 72, traffic grew from 0 to 21. The English-language blog content is steadily gaining US visibility. This growth is organic (no new content detected) suggesting existing content is being discovered and promoted by Google over time. Remediation work (canonical tags, schema fixes, heading restructure) should accelerate this trend.

### Key Takeaways

1. **Branded dependency:** 72% of Danish traffic comes from "ulobby" branded search. Non-branded visibility is the growth lever.
2. **Blog is the organic engine:** The stakeholder mapping and first-100-days articles are the only non-branded traffic drivers. More content in this pattern (domain frameworks, how-to guides) would expand the keyword footprint.
3. **US momentum is real:** 2.7x keyword growth in 12 months with zero content investment. The English blog is being discovered. Accelerating this with targeted content could make the US a meaningful traffic source.
4. **Nordic locales are dormant:** NO and SV have 2-3 keywords each. The 63 untranslated pages explain why — search engines cannot rank content that does not match the declared language.
5. **Category is uncontested:** No direct PA software competitor in Denmark has more than 150 keywords. Ulobby can own this category with modest, sustained effort.
6. **Canonical tag fix is urgent for organic growth:** Without canonicals, the 4 locale variants of each page compete against each other, diluting the equity that is producing the US growth trend.

---

## Competitor Benchmark

**Source:** SEMRush Organic Research API | **Date:** 2026-06-08

### Competitive Landscape

| Competitor | Market | Common KWs | Organic KWs | Traffic | Threat |
|-----------|--------|-----------|-------------|---------|--------|
| CiviClick.com | US | 13 | 938 | 758 | **High** |
| PublicAffairsNetworking.com | US | 8 | 337 | 1,161 | Medium |
| Engagifii.com | US | 4 | 162 | 360 | Low |
| Substantia.dk | DK | 1 | 91 | 941 | Low |
| PublicAffairsGroup.dk | DK | 1 | 17 | 0 | Low |

**CiviClick is the primary threat** — 2.7x keyword growth in 12 months (340→905), capturing the entire "advocacy software" category where Ulobby has zero presence. Combined volume of CiviClick's product keywords: ~2,150/mo.

**Denmark is uncontested** — no PA software competitor has meaningful SEO. "Lobbyisme" (880 vol/mo) is unclaimed by anyone.

### Top Keyword Gaps

| Keyword | Volume | Current Leader | Ulobby Status |
|---------|--------|---------------|---------------|
| advocacy software | 720 | CiviClick #2 | Not ranking |
| lobbyisme (DK) | 880 | PAG #77 | Not ranking |
| what is public affairs | 1,000 | PAN #1 | Not ranking |
| grassroots advocacy software | 260 | CiviClick #1 | Not ranking |
| public affairs (US) | 22,200 | — | #19 (page 2) |
| stakeholder management (DK) | 90 | Hartkorn #6 | #11 (improve to top 5) |

### 12-Month Trend (US — Ulobby vs CiviClick)

- **Ulobby:** Keywords 31→70 (2.3x), traffic 0→6 (rankings too low for clicks)
- **CiviClick:** Keywords 340→905 (2.7x), traffic 313→792 (capturing product-category clicks)
- **Gap is widening** — CiviClick adds ~50 keywords/month while Ulobby adds ~3

### Strategic Priorities

1. **Create "Lobbying Software" / "Advocacy Software" landing page** — highest-value gap
2. **Publish Danish guide on "lobbyisme"** (880 vol, no competition)
3. **Push "public affairs" from #19 to page 1** with content depth and internal linking
4. **Build comparison content** ("Best Public Affairs Software 2026") before CiviClick owns it

Full analysis in `audits/competitor-benchmark-2026-06-08.md`.

---

## AEO Score

| Category | Score | Detail |
|----------|-------|--------|
| A. Content Quality & Originality | 2/4 | First-paragraph leads are answer-first (PASS). But content is commodity B2B SaaS messaging, zero proprietary data, no question-shaped H2s, div-heavy semantic HTML. |
| B. Answer-First Structure | 2/4 | Lists have intro sentences (PASS), active voice dominant (PASS). But blog sections exceed 3 paragraphs per heading, paragraphs run to 4-5 sentences. |
| C. Freshness Signals | 1/3 | No hedge words (PASS). But no visible "last updated" dates, no content updated within 90 days. |
| D. Authority / E-E-A-T | 1/4 | Author/entity signals present (PASS). But no original data, no external citations, no cite-magnet content archetypes. |
| E. Technical | 2/5 | AI bots allowed (PASS), 2+ internal links per page (PASS). But missing alt text, 22 invalid schema, Rich Results Test not run. |
| **Total** | **8/20** | **Maturity Level: L1 — Keyword Foundation** |

**Flesch Reading Ease:** ~55 (target 65-70 for PA audience, 80+ general target)

**Level-up actions to reach L2:**
1. Write answer-first leads on top 5 pages (Homepage, Solutions, 3 top blog articles)
2. Add FAQ blocks to Solutions and product pages (5-8 questions per page with FAQPage schema)
3. Start tracking AI referrer traffic (chatgpt.com, perplexity.ai, claude.ai, gemini.google.com, copilot.microsoft.com)

---

## Recommended Next Steps

### Justification tags

- **SEO** — search ranking, crawlability, SERP CTR
- **AEO** — AI answer engine citations (ChatGPT, Perplexity, SGE)
- **Perf** — page speed, Core Web Vitals, LCP
- **De-risk** — business continuity, dependency removal, compliance
- **Trust** — credibility signals
- **A11y** — accessibility, WCAG
- **Conv** — conversion (forms, funnels)
- **Ops** — operational efficiency, CMS hygiene, handover quality

---

### P0 — Week 1 — Critical fixes and compliance

Quick wins under 1 hour each: restore missing canonical tags, fix the GDPR consent-firing order, and clean up the malformed Cookiebot links that inflate error counts.

| # | Task | Effort | Justification | Automation | Client item | Owner |
|---|------|--------|---------------|------------|-------------|-------|
| 1 | **Re-enable canonical tags on all 273 pages** — check Site Settings > SEO for auto-canonical; inspect custom `<head>` code for blank/malformed `<link rel="canonical">` override | TBD | **SEO** — without canonicals, all 4 locale variants compete as duplicates; link equity diluted; paginated blog pages cannibalise base URLs | SEMI | .5 | Will |
| 2 | **Fix GTM/Cookiebot consent firing order** — configure GTM to use Cookiebot's consent signal via GTM Consent Mode v2 or Cookiebot GTM template | TBD | **De-risk** — GDPR non-compliance for EU/DK/Scandi market; analytics firing before consent | MANUAL | .5 | Will |
| 3 | **Fix 171 malformed Cookiebot links** — replace `<a href="javascript:Cookiebot.renew()">` with `<button onclick="Cookiebot.renew()">` or use Cookiebot data-attribute trigger | TBD | **SEO** — 171 errors inflating site audit; crawlers interpret `javascript:` as broken URLs | SEMI | .5 | Will |
| 4 | **Fix 22 invalid SoftwareApplication schema** — remove from solution pages entirely; on homepage either add required `aggregateRating`+`offers` or remove | TBD | **SEO** — invalid structured data triggers Rich Results errors; undermines schema credibility | AUTO | .5 | Will |
| 5 | **Remove 16 broken thepublicaffairsengine.com links** across 4 blog articles in all locale variants | TBD | **SEO** — dead external links erode trust signals and waste crawl resources | SEMI | .25 | Will |

**P0 total: 2.25 hours — €270**

---

### P1 — Week 1-2 — SEO structure and meta cleanup

Highest-ROI items that address duplicate content signals, missing metadata, and heading structure.

| # | Task | Effort | Justification | Automation | Client item | Owner |
|---|------|--------|---------------|------------|-------------|-------|
| 6 | **Fix 12 duplicate blog listing titles** — translate per locale, append page numbers on paginated pages | TBD | **SEO** — duplicate titles dilute SERP CTR across locale variants | SEMI | .25 | Will |
| 7 | **Fix 12 duplicate blog listing meta descriptions** — unique descriptions per locale with page numbers | TBD | **SEO** — duplicate descriptions reduce click-through from search results | SEMI | .25 | Will |
| 8 | **Add 4 missing meta descriptions** on newsletter pages (`/newsletter`, `/da/newsletter`, `/no/newsletter`, `/sv/newsletter`) | TBD | **SEO** — missing descriptions mean Google auto-generates snippets | AUTO | .25 | Will |
| 9 | **Fix 9 pages with multiple H1 tags** — change secondary H1 to H2 on Plans and Technology templates | TBD | **SEO** — multiple H1s confuse heading hierarchy signals | AUTO | .25 | Will |
| 10 | **Shorten 7 long title tags** (>60 chars) on blog articles about "100 days as PA professional" and "Navigating PA complexity" | TBD | **SEO** — truncated titles in SERPs reduce CTR | SEMI | .25 | Will |
| 11 | **Fix 4 hreflang conflicts** — audit contradictory declarations within page source | TBD | **SEO** — conflicting hreflang confuses search engines about locale targeting | SEMI | .5 | Will |
| 12 | **Add hreflang to 12 missing pages** | TBD | **SEO** — pages without hreflang may be indexed under wrong locale | SEMI | .25 | Will |
| 13 | **Verify 97 pages blocked from crawling** — confirm whether blocks are intentional (locale redirects, utility pages) or accidental | TBD | **SEO** — legitimate content pages may be excluded from indexing | MANUAL | .25 | Will |
| 14 | **Audit 37 orphaned sitemap pages** — link internally if discoverable, remove from sitemap if deprecated | TBD | **SEO** — orphaned pages waste crawl budget and may index stale content | SEMI | .25 | Will |

**P1 total: 2.5 hours — €300**

---

### P2 — Week 2-3 — Schema enrichment and accessibility

Client-visible improvements: new schema types for rich results, alt text remediation, and CMS cleanup.

| # | Task | Effort | Justification | Automation | Client item | Owner |
|---|------|--------|---------------|------------|-------------|-------|
| 15 | **Add BreadcrumbList schema** to blog articles and nested pages (`/about/*`, `/solutions/*`) | TBD | **SEO** — enables breadcrumb display in SERPs; improves site structure signals | AUTO | .5 | Will |
| 16 | **Create llms.txt** with company description, capabilities, target audience, office locations, and key page links | TBD | **AEO** — enables AI engines to understand site identity and scope | AUTO | .25 | Will |
| 17 | **Add descriptive alt text to all informative images** — audit site-wide; mark decorative images with empty alt deliberately | TBD | **A11y** — missing alt text fails WCAG 2.1 Level A; also weakens image search and AEO signals | SEMI | .25 | Will |
| 18 | **Fix non-descriptive anchor text on key CTAs** — replace "Read more" with "Read: [Article Title]"; replace "Learn more" with specific action text | TBD | **SEO, A11y** — 437 non-descriptive + 109 empty anchor text links hurt link context signals and screen reader UX | SEMI | .5 | Will |
| 19 | **Add accessible text to 109 image/icon links** — add alt text or aria-label to links without anchor text | TBD | **A11y** — links without accessible names fail WCAG 2.4.4 | SEMI | .5 | Will |
| 20 | **Remove 6 unnecessary CMS template pages** (Pricing Features, Team Members, Blog Categories, Features, Quizzes, Transparent Democracy) | TBD | **Ops** — unnecessary templates create indexable pages that dilute crawl budget | MANUAL | .25 | Will |
| 21 | **Fix Blog Categories slug** from `category` to `blog-categories` | TBD | **Ops** — slug consistency improves CMS maintainability | MANUAL | .25 | Will |
| 22 | **Optimise top image assets** — compress/convert Mariann_181225.png and other top bandwidth offenders (see Asset Optimisation section) | TBD | **Perf** — single image consuming 959 MB/month; PNGs account for 48.6% of 3.06 GB bandwidth | SEMI | .25 | Will |

**P2 total: 2.75 hours — €330**

---

### P3 — Week 3-4 — AEO content structure and freshness

Editorial foundation work: question-shaped headings, FAQ blocks, freshness signals, and readability improvements.

| # | Task | Effort | Justification | Automation | Client item | Owner |
|---|------|--------|---------------|------------|-------------|-------|
| 23 | **Rewrite key H2s as questions** on blog articles and Solutions page — e.g. "What is stakeholder mapping?", "How does Ulobby support Public Affairs work?" | TBD | **AEO** — question-shaped headings match AI engine query patterns; zero question H2s currently | MANUAL | 2 | Will (draft) + Ulobby (approve) |
| 24 | **Add FAQ blocks (5-8 questions) to Solutions and product pages** with FAQPage schema | TBD | **AEO, SEO** — enables FAQ rich results; provides answer-first content for AI engines | SEMI | 1 | Will (build + schema) + Ulobby (write FAQ content) |
| 25 | **Add visible "Last updated" component** to all key pages and blog template — bind Webflow CMS "Updated on" field | TBD | **AEO** — freshness signals are universally rewarded by AI engines; currently absent on all pages | AUTO | .5 | Will |
| 26 | **Break up long blog sections** — add subheadings to sections with 4+ paragraphs; cap paragraphs at 3 sentences | TBD | **AEO** — chunked content is easier for AI engines to extract and cite | MANUAL | — | **Ulobby** (content decision) |
| 27 | **Improve semantic HTML** — use Webflow section elements instead of divs; add `role="article"` on blog wrappers; add `<figure>` around captioned images | TBD | **AEO, SEO** — semantic containers help AI engines identify content boundaries | SEMI | 1 | Will |
| 28 | **Add 2-3 external citations per blog article** to authoritative sources (EU policy databases, academic frameworks, industry reports) | TBD | **AEO, Trust** — outbound links to primary sources boost authority signals; currently zero external citations | MANUAL | — | **Ulobby** (content decision — they choose which sources to endorse) |
| 29 | **Differentiate H1 from title tag** on key commercial pages (Homepage, Plans, Solutions) for better SERP CTR | TBD | **SEO** — 85 pages with identical H1 and title; differentiating improves click-through | MANUAL | 1 | Will (draft) + Ulobby (approve copy) |
| 30 | **Add WebSite + SearchAction schema** to homepage | TBD | **SEO** — enables sitelinks search box in SERPs | AUTO | .5 | Will |

**P3 total: 6 hours — €720**

---

### P4 — Ongoing (retainer) — Growth, authority, and content operations

Longer-cycle work: original research, content refresh cadence, translation completeness, and AI referrer tracking.

| # | Task | Effort | Justification | Automation | Client item | Owner |
|---|------|--------|---------------|------------|-------------|-------|
| 32 | **Establish quarterly content refresh cadence** — review and update top 5 pages every 90 days; even minor copy tweaks reset freshness | TBD | **AEO** — blog content last modified 4+ months ago; no documented refresh schedule | MANUAL | — | **Ulobby** (content/ops decision) |
| 33 | **Add non-commodity content** — proprietary data points to Homepage and Solutions (e.g. "Ulobby users track an average of X stakeholders per issue") | TBD | **AEO, Trust** — commodity B2B messaging is not citable; one real number per page transforms citability | MANUAL | — | **Ulobby** (product decision — they own the data) |
| 34 | **Create flagship anchor asset** — "State of Public Affairs [Year]" report with original survey data | TBD | **AEO, Trust** — stats-based content gets cited 3x more than qualitative-only pages | MANUAL | — | **Ulobby** (product/content decision — survey design, data collection) |
| 35 | **Add author bios with credentials** to blog bylines | TBD | **AEO, Trust** — strengthens E-E-A-T signals; currently bylines exist but lack credential details | MANUAL | 1 | Will (build template) + Ulobby (provide bio content) |
| 36 | **Address 63 hreflang language mismatches** — audit translation completeness for DA, NO, SV locales; prioritise Homepage, Plans, Solutions, and top blog articles | TBD | **SEO** — content not matching declared locale confuses search engines and may deliver wrong-language results | MANUAL | .5 | Will (audit) + **Ulobby** (translate content) |
| 37 | **Simplify readability** — target Flesch 65-70 for PA audience; shorten sentences to 15 words max, break compound structures | TBD | **AEO** — current Flesch ~55 (college-level) is below target; simpler text is easier for AI engines to parse and cite | MANUAL | — | **Ulobby** (content decision — brand voice trade-off) |
| 38 | **Set up AI referrer tracking** — create analytics segments for chatgpt.com, perplexity.ai, claude.ai, gemini.google.com, copilot.microsoft.com | TBD | **AEO** — no visibility into AI-driven traffic currently; needed to measure AEO improvements | MANUAL | — | Will |
| 39 | **Run Rich Results Test** on homepage and blog articles; fix any flagged errors | TBD | **SEO** — 22 invalid SoftwareApplication instances strongly suggest errors; not yet verified | MANUAL | .5 | Will |
| 40 | **Review 24 pages flagged for content optimisation** by SEMRush | TBD | **SEO** — SEMRush content suggestions may reveal quick keyword and structure wins | MANUAL | — | Will (audit) + **Ulobby** (decide on content changes) |

**P4 total: 2 hours — €240**

---

## Pricing Summary

**Rate:** €120/hr (standard)

| Phase | Hours | Cost | Timeline |
|-------|-------|------|----------|
| P0 — Critical fixes & compliance | 2.25h | €270 | Week 1 |
| P1 — SEO structure & meta cleanup | 2.5h | €300 | Week 1-2 |
| P2 — Schema enrichment & accessibility | 2.75h | €330 | Week 2-3 |
| P3 — AEO content structure & freshness | 6h | €720 | Week 3-4 |
| **Fixed project total (P0-P3)** | **13.5h** | **€1,620** | **4 weeks** |
| P4 — Ongoing growth & authority | 2h | €240 | Retainer |

**Note:** Tasks without hour estimates (marked "—" in Client item column) are content or product decisions that require client input — not billable remediation work. These include: content refresh cadence, proprietary data points, flagship report, readability simplification, AI referrer tracking, and SEMRush content review.

**Option A — Fixed project:** €1,620 for P0-P3 (13.5 hours over 4 weeks). 50% upfront, 50% on completion.

**Option B — Monthly retainer:** €480/month (4h included). P0-P3 delivered across first 3-4 months, then P4 ongoing work fills remaining hours. Minimum 4-month commitment = €1,920 total.

---

## Custom Code Inventory

| Script | Source | Version | Risk |
|--------|--------|---------|------|
| Google Tag Manager | `googletagmanager.com/gtm.js?id=GTM-TFHLQ84T` | Current | Low |
| Cookiebot | `consent.cookiebot.com/uc.js` (cbid: `da2535e9-91e3-426d-800d-df7a62b06625`) | Latest | Medium (malformed link issue) |
| Google reCAPTCHA | `google.com/recaptcha/api.js` | Latest | Low |
| jQuery | `d3e54v103j8qbb.cloudfront.net/js/jquery-3.5.1.min.dc5e7f18c8.js` | 3.5.1 | Low (Webflow bundled) |
| Webflow Framework | `cdn.prod.website-files.com/.../js/webflow.*.js` (3 chunks) | Built-in | Low |
| Webflow CSS | `cdn.prod.website-files.com/.../css/ulobbyv2.webflow.shared.*.min.css` | Built-in | Low (SRI present) |

**Assessment:** 3 third-party scripts (GTM, Cookiebot, reCAPTCHA) — all standard SaaS tools, not custom code. No custom GitHub-hosted dependencies. No GSAP, Finsweet, or animation libraries. No Custom Code Migration Plan required.

---

## Asset Optimisation

### Bandwidth by file type (30-day period, April-May 2026)

| File type | Bandwidth | % of total | Assets | Requests |
|-----------|-----------|------------|--------|----------|
| Images | 2.4 GB | 78.2% | 230 | 13,192 |
| Fonts | 0.45 GB | 14.7% | 6 | 6,025 |
| JavaScript | 0.16 GB | 5.3% | 16 | 7,598 |
| CSS | 0.05 GB | 1.7% | 6 | 2,174 |
| **Total** | **3.06 GB** | **100%** | **258** | **28,989** |

PNGs alone account for **48.6% of total bandwidth (1.49 GB)**. While this is borderline against the 50% threshold, the data clearly shows significant optimisation opportunities.

### Top offender assets

| Asset | File size | 30-day bandwidth | Requests | Issue |
|-------|-----------|------------------|----------|-------|
| Mariann_181225.png | 2.26 MB | 959 MB | 446 | Portrait image served as uncompressed PNG at 2.26 MB per request |
| Ulobby_general_06_green (1).png | 1.5 MB | 118 MB | — | Large PNG; should be WebP |
| IMG_0342-kopi.jpeg | 3.5 MB | 107 MB | — | Oversized JPEG; needs compression and resize |
| Artboard 1 copy 18@4x-Ulobby_SoMe.jpg | — | 104 MB | — | @4x export — likely 4x larger than needed for web display |
| Ulobby_general_02_red.png | — | 97 MB | — | Large PNG; should be WebP |
| 1754555821591.jpeg | — | 96 MB | — | Uncompressed upload |
| Ulobby_general_04_green.png | — | 80 MB | — | Large PNG; should be WebP |

### Font bandwidth note

3 Inter font files (woff2, ~100 KB each) are consuming **407 MB** over 6,000+ requests. The file sizes are appropriate for woff2, but the request volume suggests these fonts are not being cached effectively. Verify `Cache-Control` headers on font assets.

### Why this is happening

1. **PNGs used where WebP would suffice** — brand images and portraits uploaded as full-resolution PNGs without conversion
2. **@4x exports** — design assets exported at 4x resolution for social media, served on web without resize
3. **No responsive image sizing** — Webflow supports responsive images via `srcset`, but assets appear to serve a single resolution
4. **High request volume on portrait image** — Mariann_181225.png is likely used on multiple pages (blog author, about, team) and served at full resolution each time

### Remediation phases

**Phase 1 — Quick wins (no design changes):**
- Re-export top 7 offender images as WebP at appropriate web dimensions (max 1600px wide, 80% quality)
- Replace Mariann_181225.png with a compressed WebP version (~150-200 KB target)
- Verify font `Cache-Control` headers are set to long-duration (1 year)

**Phase 2 — Structural (Webflow settings):**
- Enable Webflow responsive images (`srcset`) on all image elements
- Set appropriate `sizes` attributes to prevent oversized downloads on mobile
- Audit remaining 230 image assets for compression opportunities

### Expected impact

| Metric | Current | After Phase 1 | After Phase 2 |
|--------|---------|---------------|---------------|
| Monthly image bandwidth | 2.4 GB | ~1.2 GB | ~0.8 GB |
| Top offender (Mariann) | 959 MB | ~60 MB | ~40 MB |
| PNG share of bandwidth | 48.6% | ~25% | ~15% |

---

## Automation Summary

- **AUTO:** 6 tasks (#4, #8, #9, #15, #16, #25, #30) — can be executed immediately with `/build`
- **SEMI:** 14 tasks (#1, #3, #5, #6, #7, #10, #11, #12, #14, #17, #18, #19, #22, #24, #27) — need user input before automation
- **MANUAL:** 20 tasks (#2, #13, #20, #21, #23, #26, #28, #29, #31, #32, #33, #34, #35, #36, #37, #38, #39, #40) — require human action

---

## Sub-audits

- [Structure audit](../audits/structure.md) — Technical health, robots, sitemap, SSL, crawlability, linking
- [SEO audit](../audits/seo.md) — Meta tags, schema, hreflang, broken links, heading structure
- [Content audit](../audits/content.md) — Forms, alt text, CMS hygiene, custom code inventory, translations
- [AEO audit](../audits/aeo.md) — AI answer engine optimisation scorecard (8/20, L1 maturity)
- [SEMRush site audit](../audits/semrush-2026-06-08.md) — Full error/warning/notice breakdown from SEMRush API

---

*Report generated by automated site audit. Manual verification recommended for items marked "NEEDS VERIFY".*
