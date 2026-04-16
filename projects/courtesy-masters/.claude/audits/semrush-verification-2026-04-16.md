# SEMRush Site Audit — Verification Pass

**Date:** 2026-04-16
**Source:** SEMRush Site Audit crawl, project 29290391, 4 CSV exports
**Pages crawled:** 100
**Images crawled:** 1,337
**Hreflang declarations:** 665
**Meta description checks:** 9,018

---

## Purpose

Cross-reference every claim in `reports/intake-report-2026-04-15.md` and `audits/seo.md` against SEMRush's JavaScript-rendered crawl data. The original intake was performed with a static HTML analysis that did not execute JavaScript — which caused **significant false negatives** on a Webflow site that injects SEO metadata via client-side scripts (Webflow Localiser).

---

## Original audit claims — verification

### ❌ Original: "Meta descriptions may not render in HTML"

**SEMRush verdict: PASS.** 0 pages missing meta description (0/9,018 checks failed). 0 duplicate meta descriptions. All pages, including CMS detail pages, have unique meta descriptions that render post-JS.

### ❌ Original: "og:url via JS only, og:image absent, og:title/description missing"

**SEMRush verdict: PASS on 95/100 pages.** The 5 pages without OG are expected utility pages: `courtesymasters.com/` (301 redirect to www), `/llms.txt`, `/robots.txt`, `/search`, `/sitemap.xml`. All 100 "real" pages have full Open Graph coverage.

### ❌ Original: "Twitter cards completely absent on any page"

**SEMRush verdict: PASS on 95/100 pages.** Same 5 utility pages as above; all real content pages have Twitter cards.

### ❌ Original: "Canonical tags not detected on interior pages — Webflow default may be disabled"

**SEMRush verdict: PASS.** 94/100 self-canonical, 1 intentional canonical-to-other, 5 utility pages (expected). 0 broken canonical URLs, 0 pages with multiple canonical URLs.

### ❌ Original: "All images missing alt text site-wide — WCAG 2.1 Level A failure"

**SEMRush verdict: PASS.** **0/1,337 images missing ALT attributes.** This was the biggest error in the original audit. Alt text coverage is effectively complete.

### ❌ Original: "Multiple H1s on homepage, /for-candidates, /for-royals. Heading hierarchy broken (H2 → H4 → H5 jumps)"

**SEMRush verdict: FAIL on 3 pages only — but NOT the pages originally named.** The actual offenders are three insights posts:

- `/insights/anthropic-human-judgement`
- `/insights/from-macro-to-micro`
- `/insights/why-a-strong-brand-identity-matters`

SEMRush did not flag any H2→H4→H5 hierarchy jumps. 0/95 pages missing H1. The homepage, `/for-candidates`, and `/for-royals` are fine.

### ❌ Original: "Sitemap missing all CMS item URLs (jobs, insights, case studies)"

**SEMRush verdict: PASS.** 94/100 pages in sitemap. The 6 not in sitemap are utility pages (robots.txt, sitemap.xml, llms.txt, search, non-www redirect).

### ⚠ Original: "Schema JSON-LD — Organization schema partial (homepage only). BreadcrumbList JS-only. No JobPosting, FAQPage, Article, or Person schema"

**SEMRush verdict: PARTIALLY CORRECT but understated coverage.** 16/100 pages have JSON-LD:

| Schema type | Pages | Detail |
|-------------|-------|--------|
| Product snippet | 16 | Homepage, all 6 locale homepages, 3 insights, 3 case studies, 3 jobs, contact page (likely auto-generated from Webflow default; not obviously useful for a recruitment site) |
| Article | 6 | 3 insights + 3 case studies (inconsistent — not applied to the other 16 insights or 3 case studies) |
| Job posting | 3 | Only 3 of ~22 live jobs |

**What's missing (confirms original audit):** FAQPage (0), Person (0), Organization proper (0 — the "Product snippet" is not Organization), BreadcrumbList as HTML (0 — crawler confirms no static breadcrumb schema).

### ✓ Original: "robots.txt present but malformed LLMS directive"

**SEMRush verdict: CONFIRMED.** 1/1 check flagged "Invalid robots.txt format".

### ✓ Original: "Dev/test pages published"

**SEMRush verdict: PARTIAL CONFIRM.** Crawl only covered 100 pages so dev pages may not have been sampled. Requires manual verification via Webflow Designer.

---

## New findings from SEMRush (not in original audit)

### 1. Hreflang conflicts on `/jobs?tab=...`

One URL has 3 hreflang issues: `/jobs?tab=succesfully-closed-jobs` (note the **typo — "succesfully" should be "successfully"**).

3/665 hreflang conflicts total across the site — scoped to query-param variants of `/jobs`. Low impact but should be resolved.

### 2. 27 page titles too long (>60 characters)

Titles that exceed Google's display limit of ~60 chars get truncated in SERPs. 27 pages affected, including:

- Homepage (EN + all 5 locale homepages)
- `/for-employers`
- `/services`
- `/confidentiality`
- `/departments-for-employers`
- All 3 jobs with JobPosting schema (ironic — the jobs with schema also have overly long titles)
- 3 case studies with Article schema
- 16 multilingual variants of `/businesspartners`, `/corporate-social-responsibility`, etc.

### 3. 94/100 pages with low text-to-HTML ratio

Signals design-heavy, content-light pages. Normal for a Webflow-built brand site but flags the content-depth opportunity previously identified in the AEO audit.

### 4. 28 broken external links

Spread across 28 pages, concentrated on `/departments-candidates/*` and `/departments-for-employers/*`. Needs a link-by-link cleanup.

### 5. 95 pages with unminified JS/CSS

Webflow's default — low priority. Cloudflare/jsDelivr optimisation can minify on delivery.

### 6. `/search` page blocked from crawling

1 page flagged. Likely intentional (internal search results shouldn't be indexed) but confirm that `robots.txt` or `<meta name="robots">` is set correctly.

### 7. Schema.org (Microdata): 0 on all pages

Confirms no Microdata fallback — all structured data is JSON-LD only (correct modern pattern).

### 8. AI bot blocking

The "Blocked AI search bots" column is populated — indicates some AI crawler restrictions are in place. Needs cross-reference with `llms.txt` and robots.txt to verify intent.

---

## Corrected severity matrix

| Issue | Original severity | Verified severity | Affected |
|-------|------------------|--------------------|----------|
| Meta description missing | Medium (site-wide) | **PASS** | 0 pages |
| OG tags | High (all pages) | **PASS** | 95/100 — utility pages only |
| Twitter cards | High (all pages) | **PASS** | 95/100 — utility pages only |
| Canonical | Medium (interior) | **PASS** | 94 self, 5 utility |
| hreflang in `<head>` | Medium | **PASS** | Full coverage |
| Image alt text | **Critical** (0% coverage) | **PASS** | 0/1,337 images missing |
| Multiple H1 (homepage + for-candidates + for-royals) | High | **INCORRECT — actual: 3 insights posts** | Low (3 pages) |
| Heading hierarchy H2→H4→H5 | High | **NOT FLAGGED by crawler** | None detected |
| Sitemap missing CMS URLs | Medium | **PASS** | 94/100 in sitemap |
| Schema JSON-LD | High | **Partial** — 16% coverage, inconsistent | See table in §"original: schema" above |
| robots.txt malformed | Low | **CONFIRMED** | 1 file |

---

## Remaining High-severity issues (verified, scoped correctly)

1. **Schema coverage gaps** — 19/22 jobs missing JobPosting, 30 FAQs have no FAQPage, 16 insights missing Article, 6 team bios missing Person, 0 BreadcrumbList in HTML. This is the single largest remaining SEO opportunity.

2. **3 insights posts with multiple H1 + duplicate H1/title:**
   - `/insights/anthropic-human-judgement`
   - `/insights/from-macro-to-micro`
   - `/insights/why-a-strong-brand-identity-matters`

   Likely caused by the Insights Collection Template having the article H1 AND a decorative heading styled as H1. Fix once at template level.

3. **27 page titles too long** — truncated in SERPs. Fix by shortening titles or updating title templates for CMS-driven pages.

4. **Hreflang conflict on `/jobs?tab=succesfully-closed-jobs`** — 3 hreflang issues + URL typo. Fix by either noindexing the query-param variant or correcting the tab parameter + hreflang mapping.

5. **28 broken external links** — concentrated on `/departments-*/` pages. Needs link-by-link audit.

6. **Custom code risk (Egenix dependency)** — unchanged, still the top operational risk (see main report §Custom Code Migration Plan).

---

## New Medium-severity issues

7. **`/search` page blocked from crawling** — verify intentional
8. **"Blocked AI search bots"** column populated — needs audit to confirm which bots are blocked and whether that aligns with the client's AEO goals
9. **Low text-to-HTML ratio on 94 pages** — content depth opportunity (especially for the 5 non-NL locales, per SEO sub-audit §1.3)

---

## Implications for the proposal

The Option 1, 2, 3 proposals (`proposals/proposal-options-2026-04-16.md`) should be **reworked** based on these findings:

- **Option 1 scope reduces significantly** — no alt-text sweep needed, no OG-tag rollout needed, no sitemap fix needed. The remaining work is: Egenix migration, 3 insights H1 fix, title length optimisation, 28 broken link cleanup, 4 Collection Templates SEO field binding (still relevant for new CMS items even though existing ones render meta), and hreflang conflict cleanup.

- **Option 2 grows in relative value** — the remaining wins are mostly schema expansion + AEO restructuring + content depth, which is Option 2 territory. The foundation is stronger than we thought.

- **Option 3 retainer** unchanged.

Overall: the site is in materially better technical shape than the original audit suggested. The remediation investment should be rescoped downward, and the "growth and schema" workstream should be weighted more heavily.

---

*Generated from SEMRush exports on 2026-04-16. Source CSVs archived to `~/Downloads/www.courtesymasters.com_*_20260416.csv`.*
