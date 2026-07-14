# SEO & Schema Audit — Ulobby

**Date:** 2026-06-08 | **URL:** https://www.ulobby.eu | **Source:** SEMRush Site Audit (project 29959209) + WebFetch spot-checks

**Overall Health:** 85/100 | **AI Search Score:** 75/100

---

## Summary Table

| Check | Status | Notes |
|-------|--------|-------|
| Meta titles | WARNING | 12 duplicates (blog listings), 7 too long |
| Meta descriptions | WARNING | 4 missing (newsletter), 12 duplicates (blog) |
| OG tags | PASS | Present on 171/273 pages |
| Twitter Cards | PARTIAL | 167/273 pages |
| Canonical tags | CRITICAL | Missing on ALL 273 pages |
| H1 tags | WARNING | 9 pages with 2x H1s; 85 pages H1=title |
| Heading hierarchy | PASS | Clean H1>H2>H3 on spot-checked pages |
| Schema.org JSON-LD | WARNING | 204 valid, 22 invalid SOFTWARE_APP |
| Sitemap | PASS | 285 URLs, healthy; 37 orphaned pages |
| llms.txt | FAIL | Not found |
| Hreflang | WARNING | 4 bad, 12 missing, 63 language mismatches |
| Broken external links | WARNING | 19 broken — dead thepublicaffairsengine.com |

---

## 1. Meta Titles

**12 duplicate titles** — all blog listing pages sharing "Insights | Ulobby":
- `/blog`, `/da/blog`, `/no/blogg`, `/sv/blog` + paginated variants (`?eb3f9b85_page=1`, `?page=2`)

**7 titles too long** (>60 chars):
- "The five focus areas on your first 100 days as a PA professional" (EN, NO, SV)
- "Navigating the complexity of PA: Why SRM is more than just another CRM" (EN, DA, NO, SV)

**Fix:** Translate blog listing titles per locale. Append page numbers on paginated pages. Shorten long titles.

## 2. Meta Descriptions

**4 missing** — all newsletter pages (`/newsletter`, `/da/newsletter`, `/no/newsletter`, `/sv/newsletter`)

**12 duplicates** — same blog listing pages as duplicate titles.

**Fix:** Add unique locale-appropriate descriptions to newsletter pages. Differentiate blog descriptions per locale.

## 3. OG & Twitter Tags

- **OG tags:** 171/273 pages (PASS for published content)
- **Twitter Cards:** 167/273 pages
- 102 pages without OG tags — likely utility pages and paginated variants
- Blog articles confirmed with og:title, og:description, og:image

## 4. Canonical Tags — CRITICAL

**No canonical tags on ANY of the 273 crawled pages.**

Without canonicals:
- Search engines cannot resolve duplicate content between locale variants
- Paginated blog pages compete with base URLs
- Link equity diluted across duplicates

**Context:** Webflow auto-generates canonicals by default. Something has overridden or disabled them.

**Fix:**
1. Check Site Settings > SEO > ensure auto-canonical is enabled
2. Check custom `<head>` code for blank/malformed `<link rel="canonical">` that overrides Webflow's
3. Verify paginated pages canonicalize to the base `/blog` URL

## 5. H1 Tags

**9 pages with multiple H1s** (all showing exactly 2):
- `/plans` (EN, DA, NO, SV) — likely hidden component or pricing table header
- `/about/technology` (EN, DA, NO, SV) — "Technology" + "Applied graph theory..."
- 1 DA blog article

**85 pages** where H1 duplicates the title tag. Common Webflow pattern, low severity. Differentiate on key commercial pages for better SERP CTR.

**Fix:** In Webflow Designer, change secondary H1 elements to H2 on Plans and Technology templates.

## 6. Heading Hierarchy

Spot-checked pages show clean hierarchy:
- **Homepage:** H1 > H2 > H3
- **Plans:** H1 > H2 > H3 (structured around pricing tiers)
- **Blog articles:** H1 > H2 (clean article structure)

No heading level skips detected.

## 7. Schema.org JSON-LD

### Coverage

| Schema Type | Valid | Invalid | Location |
|-------------|-------|---------|----------|
| ARTICLE (BlogPosting) | 89 | 0 | Blog articles, all locales |
| ORGANIZATION | 115 | 0 | Site-wide |
| SOFTWARE_APP | 0 | 22 | Solutions pages + homepages |
| **Total** | 204 | 22 | — |

- 115 pages with JSON-LD, 97 pages without
- Homepage has WebPage + Organization + SoftwareApplication
- Blog has BlogPosting with author Person

### SOFTWARE_APP Errors (22 pages)

All on solution pages and homepage variants across 4 locales:
1. Missing required `aggregateRating` or `review`
2. Missing `offers` on solution sub-pages
3. `contactPoint` not recognized on SoftwareApplication type (valid only on Organization)

**Fix (recommended):** Remove SoftwareApplication from solution pages entirely. Organization schema already covers the company. Only keep SoftwareApplication on homepage where `offers` is already present, and add required `aggregateRating` or remove it there too.

### Schema Gaps

- **BreadcrumbList** — not present. Would improve SERP display for blog articles and nested pages (`/about/*`, `/solutions/*`)
- **FAQPage** — absent. Should be added to any page with FAQ-style content
- **WebSite** with SearchAction — missing from homepage. Would enable sitelinks search box
- **Person** — blog articles correctly use inline author Person. No additional needed.

## 8. Sitemap

- **285 URLs** in sitemap.xml — healthy
- Referenced in robots.txt — correct
- **37 orphaned pages** — in sitemap but not linked from any crawled page

**Fix:** Audit orphaned pages. Link internally if they should be discoverable, or remove from sitemap if deprecated.

## 9. llms.txt

**FAIL — not found.** Confirmed by SEMRush (issue #137).

**Fix:** Create llms.txt with company description, key capabilities, target audience, office locations, and links to key pages.

## 10. Hreflang

| Issue | Count | Severity |
|-------|-------|----------|
| Pages with hreflang | 268 | — |
| x-default configured | 259 | PASS |
| Hreflang conflicts in source | 4 | Error |
| Missing hreflang entirely | 12 | Warning |
| Language mismatch (content vs declared) | 63 | Notice |

- **4 conflicts:** Contradictory declarations within same page source
- **12 missing:** Likely newer or utility pages
- **63 mismatches:** Content not fully translated from English to DA/NO/SV

**Fix:**
1. Audit and correct the 4 conflicting pages
2. Add hreflang to the 12 missing pages
3. Flag 63 mismatch pages for translation

## 11. Broken External Links

| Target | Count | Status | Cause |
|--------|-------|--------|-------|
| thepublicaffairsengine.com | 16 | DNS failure | Domain expired |
| bsky.app (Bluesky) | 3 | 429 | Rate limited (transient) |

Affected blog articles (all 4 locale variants):
- "Three trends that will characterize Public Affairs in 2021"
- "The five focus areas on your first 100 days as a PA professional"
- "The 5 most sought after competencies in a PA professional"
- "Let's talk about ethics and image of Public Affairs"
- "Flugten fra X" (Bluesky 429s only — transient, ignore)

**Fix:** Remove or replace all `thepublicaffairsengine.com` links across all locale variants.

## 12. Additional SEO Notices

| Issue | Count | Notes |
|-------|-------|-------|
| Non-descriptive anchor text | 437 | "Read more", "Learn more", icon-only |
| Links with no anchor text | 109 | Image/icon links without alt or aria-label |
| Crawl depth > 3 clicks | 32 | Blog articles behind pagination |
| Pages blocked from crawling | 97 | robots.txt rules |
| Content not optimized | 24 | SEMRush content suggestions |

---

## Priority Fixes

### P0 — Critical
1. **Re-enable canonical tags** on all 273 pages
2. **Fix 22 invalid SoftwareApplication schema** — remove from solution pages

### P1 — Warning
3. Fix 12 duplicate blog listing titles (translate per locale, add page numbers)
4. Fix 12 duplicate blog listing meta descriptions
5. Add 4 missing meta descriptions on newsletter pages
6. Fix 9 pages with multiple H1s (Plans + Technology templates)
7. Remove 19 broken external links (thepublicaffairsengine.com)
8. Fix 4 hreflang conflicts + add hreflang to 12 missing pages
9. Fix 171 malformed Cookiebot links
10. Shorten 7 long title tags

### P2 — Enhancement
11. Create llms.txt
12. Add BreadcrumbList schema to blog and nested pages
13. Add FAQPage schema where applicable
14. Audit 37 orphaned sitemap pages
15. Address 63 hreflang language mismatches (translation)
16. Differentiate H1 from title on key commercial pages
17. Improve anchor text on key CTAs
