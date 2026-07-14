# Technical & Analytics Audit — Ulobby

**Date:** 2026-06-08 | **URL:** https://www.ulobby.eu | **Source:** SEMRush API + WebFetch verification

## Health Metrics

| Metric | Score |
|--------|-------|
| Overall Health | 85 |
| HTTPS | 100 |
| Performance | 100 |
| Crawlability | 93 |
| Linking | 79 |
| Markups | 90 |
| AI Search | 75 |

## Checks

| Check | Status | Notes |
|-------|--------|-------|
| robots.txt | PASS | Present, valid, no errors. Sitemap referenced. |
| sitemap.xml | PASS | Healthy. 285 URLs across 4 locales. Format valid. |
| SSL / HTTPS | PASS | 100% HTTPS. No mixed content. Valid certificate. |
| Canonical domain | PASS | Both `ulobby.eu` and `www.ulobby.eu` resolve. Primary is `www.ulobby.eu`. |
| Analytics (GTM) | PASS | GTM-TFHLQ84T detected on homepage. |
| Cookie consent | PASS | Cookiebot present site-wide. |
| Custom 404 | PASS | 404 page configured in Webflow (confirmed via page list). |
| Favicon | NEEDS VERIFY | Not confirmed via WebFetch (stripped by markdown conversion). Check in browser. |

## Critical Issues

### 1. No canonical tags on any page

**Severity:** Critical | **Scope:** All 273 crawled pages

SEMRush confirms all 273 pages have empty or missing `<link rel="canonical">` tags. This is a significant SEO risk:
- Search engines may index duplicate locale variants
- Paginated blog pages (`?eb3f9b85_page=1`) compete with base URLs
- Crawl budget wasted on duplicate content

**Fix:** Add self-referencing canonical tags to all pages. Webflow supports this natively in Page Settings > SEO. For CMS pages, use the canonical URL field. For locale variants, canonical should point to the page's own URL (not cross-locale).

### 2. Cookiebot malformed links (171 errors)

**Severity:** High | **Scope:** Site-wide (all 171 crawled HTML pages)

Cookiebot injects `<a href="javascript:Cookiebot.renew()">` which crawlers interpret as a malformed URL (`https://javascript:Cookiebot.renew()`). This is the single largest error source.

**Fix:** Replace with `<button onclick="Cookiebot.renew()">Renew consent</button>` or check Cookiebot dashboard for a data-attribute trigger option.

### 3. Analytics/consent alignment risk

**Severity:** High | **Scope:** Compliance

GTM (`GTM-TFHLQ84T`) appears to load without waiting for Cookiebot consent. Under GDPR (relevant for EU/DK/Scandi market), analytics must not fire before user consent.

**Fix:** Configure GTM to use Cookiebot's consent signal. Either:
1. Use Cookiebot's GTM template (recommended)
2. Set GTM tags to fire only after `CookiebotOnAccept` event
3. Use GTM Consent Mode v2 with Cookiebot as consent provider

### 4. 97 pages blocked from crawling

**Severity:** Medium | **Scope:** 97 pages

robots.txt or noindex rules block 97 pages. This may be intentional (locale redirects, utility pages) but should be verified. If legitimate content pages are blocked, this impacts indexing.

**NEEDS VERIFY:** Review which pages are blocked and whether this is intentional.

## Lighthouse Audits

**Source:** Chrome DevTools MCP — Lighthouse navigation mode, desktop | **Date:** 2026-06-08

### Summary Table

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

### Aggregate Scores

| Category | Min | Median | Max |
|----------|-----|--------|-----|
| Accessibility | 91 | 94.5 | 99 |
| Best Practices | 77 | 77 | 77 |
| SEO | 83 | 83 | 92 |
| Agentic Browsing | 19 | 50 | 100 |
| LCP (ms) | 163 | 191 | 277 |
| CLS | 0.00 | 0.00 | 0.00 |

No page scored below 50 in Accessibility or SEO. No page scored below 77 in Best Practices.

### Key Findings

**Performance (excellent):**
- CLS is 0.00 across all pages — no layout shift issues
- LCP ranges from 163ms (Contact) to 277ms (Stakeholder mapping blog) — all well under the 2,500ms "good" threshold
- TTFB consistently 36-58ms — fast server response
- Render delay is the largest LCP component on most pages (100-200ms), driven by third-party script evaluation (Cookiebot, GTM, reCAPTCHA)
- Forced reflow detected on `/solutions` and `/plans` — minor, caused by JS querying layout properties during render

**Best Practices (consistent 77 across all pages):**
- Identical score site-wide suggests a single systemic issue (likely Cookiebot's `javascript:` href pattern or third-party cookie usage)

**Accessibility (91-99, strong):**
- Blog articles score slightly lower (91-94) than utility pages (99)
- Blog listing at 92 — likely image alt text or link text issues on article cards
- Solutions pages at 97 — clean

**SEO (83-92):**
- Utility pages (Plans, Contact, Demo) score 92
- Content pages (Homepage, Blog, Solutions, Articles) score 83
- The 9-point gap likely driven by missing canonical tags and duplicate meta on content pages

**Agentic Browsing (19-100, highly variable):**
- `/blog/what-is-public-affairs` scores 19 — lowest across site
- Blog articles generally score low (19-50) — poor structured data for AI extraction
- Solutions detail pages and Contact/Demo score 100
- Homepage and blog listing at 50
- This aligns with the AEO audit finding (8/20) — blog content is not structured for AI citation

### Performance Insights (recurring across pages)

| Insight | Pages affected | Severity |
|---------|---------------|----------|
| Render-blocking requests | All 10 | Low (0ms estimated savings — already fast) |
| Third-party script impact | All 10 | Medium (Cookiebot, GTM, reCAPTCHA on every page) |
| Cache policy gaps | 7/10 | Low (5.8kB wasted on blog, minor elsewhere) |
| LCP discovery delay | 6/10 | Low (image not in initial HTML on blog pages) |
| Forced reflow | 2/10 | Low (Solutions, Plans — JS layout queries) |
| Network dependency chains | All 10 | Low (chains exist but fast resolution) |

### Recommendations

1. **Investigate Best Practices 77** — check Lighthouse report details for the specific failing audits (likely `javascript:` URLs from Cookiebot and third-party cookie issues)
2. **Blog LCP optimisation** — stakeholder mapping article at 277ms has 200ms render delay; consider preloading the hero image and deferring non-critical scripts
3. **Agentic Browsing on blog** — add structured data (FAQPage, BreadcrumbList), question-shaped H2s, and answer-first paragraphs to improve AI extractability (aligns with AEO remediation plan)

## Status Codes

| Code | Count |
|------|-------|
| 2xx | 270 |
| 3xx | 2 |
| 4xx | 1 |

## Crawl Depth Distribution

| Depth | Pages |
|-------|-------|
| 0 | 5 |
| 1 | 23 |
| 2 | 96 |
| 3 | 117 |
| 4 | 32 |

32 pages at depth 4+ (mostly blog articles behind pagination). SEMRush flags these as needing improved internal linking.

## Internal Linking Distribution

| Incoming links | Pages |
|----------------|-------|
| 1 | 5 |
| 2-5 | 154 |
| 6-15 | 23 |
| 16-50 | 84 |
| 51-150 | 2 |

5 pages have only 1 incoming internal link — these are orphan-risk pages.
