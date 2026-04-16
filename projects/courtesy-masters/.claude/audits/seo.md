# SEO Audit — CourtesyMasters

**Date:** 2026-04-15
**Scope:** Technical SEO, on-page SEO, schema, and organic intelligence
**Related:** `reports/intake-report-2026-04-15.md`, `audits/aeo.md`, `audits/structure.md`

---

## Summary

CourtesyMasters has a **healthy SEO foundation** — SSL, GTM, sitemap with CMS URLs, llms.txt, multilingual configuration, full meta/OG/Twitter head on 95/100 pages (post-JS), canonical tags, hreflang across 665 declarations, and near-complete image alt coverage (0/1,337 missing). The remaining material SEO work is: **inconsistent structured-data coverage** (16/100 pages with JSON-LD, JobPosting on only 3/22 jobs, no FAQPage, no Person, no BreadcrumbList as HTML); **3 insights posts with duplicate H1s**; **27 page titles >60 chars** (truncated in SERPs); **28 pages with broken external links**; and **a hreflang conflict on `/jobs?tab=*` with a URL typo**. Organic visibility is modest for a 25+ year brand: 113 keywords in the Dutch market (~59 monthly visits) and near-zero presence in US/UK despite a 6-language site.

**Verdict:** SEO foundation is healthy. The programme is primarily (1) targeted technical clean-up (H1s, titles, broken links, hreflang conflict); (2) schema expansion (JobPosting, FAQPage, Article, Person, Organization, BreadcrumbList); (3) content and authority growth (competitor gap analysis, international SEO, content depth).

---

## 1. Technical SEO

### 1.1 Meta & Open Graph

Head tags are complete post-JS (the site uses Webflow Localiser for client-side SEO head injection; all major crawlers execute JS before reading meta tags).

| Check | Status |
|-------|--------|
| Meta description | 0/9,018 missing, 0 duplicates |
| og:title / og:description / og:image | 95/100 pages (5 exclusions are utility URLs: non-www apex redirect, `/llms.txt`, `/robots.txt`, `/search`, `/sitemap.xml`) |
| Twitter cards | 95/100 pages (same 5 exclusions) |
| Canonical | 94/100 self-canonical, 1 intentional canonical-to-other, 5 utility. 0 broken, 0 duplicates |
| hreflang | 665 declarations across site, 3 conflicts (all on `/jobs?tab=*` query-param variants) |
| Image ALT | 0/1,337 missing |

### 1.1a Remaining meta-layer issues

| Issue | Severity | Detail |
|-------|----------|--------|
| Page titles > 60 chars | Medium | 27 pages truncated in SERPs. Affected: homepage (EN + all 5 locale homepages), `/for-employers`, `/services`, `/confidentiality`, `/departments-for-employers`, all 3 jobs with JobPosting schema, 3 case studies with Article schema, 16 multilingual variants. Fix at CMS title template level. |
| Hreflang conflict on `/jobs?tab=succesfully-closed-jobs` | Low | 3/665 hreflang conflicts, scoped to query-param `tab` variants. URL contains a typo: "succesfully" should be "successfully". Fix: either noindex the query-param variants or correct the `tab` parameter + hreflang mapping. |
| `/for-royals` page | Needs verify | Manual confirmation recommended — status unclear. |

### 1.1b CMS SEO field safety-net binding — ✓ Already in place

Best practice is to have SEO fields bound at the Collection Template level — for resilience (works if Localiser JS fails to load), faster first render, and compatibility with any non-JS-executing crawler.

**Status (verified 2026-04-16):** Confirmed in Webflow Designer — SEO fields are already bound to CMS fields at the Collection Template level on Jobs, Insights, Case Studies, and Team. No further work required. Keep this pattern in place for any net-new Collection Templates.

### 1.2 Structure & Schema

| Issue | Severity | Detail |
|-------|----------|--------|
| H1 duplicates | Medium | 3 insights posts: `/insights/anthropic-human-judgement`, `/insights/from-macro-to-micro`, `/insights/why-a-strong-brand-identity-matters`. Likely a single Insights Collection Template fix (article H1 + decorative heading both styled as H1). 0/95 other pages missing H1. |
| Heading hierarchy | PASS | No hierarchy jumps flagged across the 100 pages crawled. |
| Organization schema | Medium | Homepage has "Product snippet" JSON-LD (likely Webflow default, not appropriate for a recruitment firm). Needs full Organization schema, propagated site-wide. |
| BreadcrumbList as static HTML | High | 0 pages with static BreadcrumbList schema. Only rendered via JS. |
| JobPosting schema | High | Only **3/22** live jobs have JobPosting. 19 missing — Google for Jobs eligibility blocked on those listings. |
| FAQPage schema | High | 30 FAQs site-wide with no schema. |
| Article schema | Medium | Only **3/19** insights + **3/6** case studies have Article. Inconsistent application within collections. |
| Person schema | Medium | 16 team members with no schema. |
| Sitemap | PASS | 94/100 pages in sitemap. 6 not in sitemap are utility URLs (robots.txt, sitemap.xml, llms.txt, search, non-www redirect). CMS items included. |
| robots.txt | Low | Invalid robots.txt format (malformed LLMS directive). |
| Broken external links | Medium | 28 pages with broken outbound links, concentrated on `/departments-candidates/*` and `/departments-for-employers/*`. |
| Low text-to-HTML ratio | Medium | 94/100 pages flagged — signals design-heavy / content-light pages. Normal for a Webflow brand site but reinforces the AEO content-depth recommendation. |
| `/search` blocked from crawling | Low | Likely intentional (internal search shouldn't be indexed). Verify `robots.txt` / `<meta name="robots">` setup is explicit. |
| "Blocked AI search bots" populated | Needs verify | Some AI crawler restrictions are in place. Cross-reference with `llms.txt` and robots.txt to confirm alignment with client's AEO goals. |

### 1.3 International SEO

- 6 languages configured: EN, IT, ES, FR, DE, NL
- `hreflang` present in sitemap with `x-default`
- Localiser is running on the site (noted in Egenix JS)
- Only NL has measurable organic traction (see §2)
- **Concern:** The other 5 locales may be thin translations — verify content depth, local keyword research, and whether any are machine-translated

---

## 2. Organic Intelligence (SEMRush)

### 2.1 Domain Overview

| Market | Rank | Keywords | Est. Traffic | Est. Traffic Cost |
|--------|------|----------|--------------|-------------------|
| NL (primary) | 711,564 | 118 | 59 | $42 |
| US | 11,143,219 | 22 | 2 | $3 |
| UK | 5,739,322 | 6 | 0 | $0 |

### 2.2 Top Ranking Keywords (NL)

| Keyword | Position | Volume | Traffic % | URL |
|---------|----------|--------|-----------|-----|
| courtesy | 3 | 1,000 | 40.7% | /nl |
| vacatures hotel management | 8 | 170 | 6.8% | /nl/vacatures |
| recruitment horeca | 4 | 90 | 5.1% | /nl |
| horeca recruitment | 4 | 90 | 5.1% | /nl |
| vacatures hospitality management | 8 | 110 | 3.4% | /nl/vacatures |
| werving en selectie horeca | 2 | 50 | 1.7% | /nl |
| hospitality headhunter | 5 | 70 | 1.7% | /nl |
| vacature general manager hotel | 5 | 70 | 3.4% | /nl/vacatures/... |

**Analysis:**
- 40% of all traffic comes from branded "courtesy" (likely misspelling searches)
- Strong positions (#2-5) for Dutch hospitality recruitment terms — these are the money keywords
- Job-specific pages rank for specific vacancy titles — indicates strong CMS SEO potential if scaled
- "hospitality headhunter" (#5) and "hospitality industry recruiters" (#6) show emerging EN visibility

### 2.3 Top Pages by Traffic

| URL | Keywords | Traffic | Share |
|-----|----------|---------|-------|
| /nl (homepage NL) | 19 | 35 | 59.3% |
| /nl/vacatures | 10 | 6 | 10.2% |
| /industries-in-hospitaility | 9 | 5 | 8.5% |
| /nl/vacatures/hotel-general-manager-... | 10 | 5 | 8.5% |
| / (homepage EN) | 6 | 4 | 6.8% |

**Concentration risk:** Homepage drives 66% of all organic traffic. Most of the 88 pages generate zero organic visits.

### 2.4 Competitors (NL)

| Competitor | Relevance | Common KWs | Traffic |
|------------|-----------|------------|---------|
| independenthospitality.nl | 0.36 | 11 | 101 |
| mjpeople.nl | 0.24 | 12 | 110 |
| thehospitalityrecruiters.com | 0.19 | 7 | 114 |
| **hospitality-group.nl** | 0.13 | 9 | **1,198** |

**Insight:** `hospitality-group.nl` is the clear NL organic leader at ~20× CM's traffic with 462 keywords. Deep competitive content gap analysis is worthwhile before any content programme.

### 2.5 12-Month Trend (US)

| Month | Keywords | Traffic |
|-------|----------|---------|
| Apr 2025 | 37 | 0 |
| Jul 2025 | 42 | 15 |
| Oct 2025 | 32 | 1 |
| Jan 2026 | 35 | 1 |
| Mar 2026 | 23 | 2 |

**Trend:** Flat to declining. Brief July 2025 spike (post-launch) reverted within 3 months. No sustained growth.

---

## 3. Priority Remediation

### P0 — Foundation (Week 1-2)

1. **Fix 3 insights posts with duplicate H1** — single Insights Collection Template fix. Affected: `/insights/anthropic-human-judgement`, `/insights/from-macro-to-micro`, `/insights/why-a-strong-brand-identity-matters`.
2. **Shorten 27 overly long page titles** (>60 chars) — fix at CMS template level for CMS-driven pages.
3. **Fix hreflang conflict + URL typo on `/jobs?tab=succesfully-closed-jobs`** — correct "succesfully" → "successfully" or noindex query-param variants.
4. **Clean up 28 pages with broken external links** — concentrated on `/departments-*` pages.
5. **Unpublish 7 dev/test pages** (see `audits/content.md`).
6. **Bind CMS SEO fields as safety net on 4 Collection Templates** — resilience and first-render performance. Not urgent but worth doing.
7. **Investigate `/for-royals` status** — manual verification.

### P1 — Structured data (Week 2-4)

8. **JobPosting schema on remaining 19 jobs** (only 3/22 have it today) → Google for Jobs eligibility.
9. **FAQPage schema on the 30 FAQs**.
10. **BreadcrumbList schema in static HTML**, not JS-only.
11. **Full Organization schema site-wide** — replace Webflow-default "Product snippet" on homepage and propagate to every page.
12. **Article schema** on 16+ insights + 3+ case studies currently missing it.
13. **Person schema** on all 16 team bios.

### P2 — Content & authority (Month 2+)

14. Author bylines + updated timestamps + internal linking on insights.
15. Content strategy targeting Dutch money keywords (pos #2-5 indicates room to grow to #1).
16. Competitive gap analysis vs `hospitality-group.nl`.
17. Address low text-to-HTML ratio on 94 pages (content-depth).
18. International SEO review — verify 5 non-NL locales have depth, not thin translations.
19. Audit AI-bot blocking alignment with client's AEO goals (SEMRush "Blocked AI search bots" column populated).
20. Google Search Console access confirmation (only Bing + Yandex verified).

---

*See main report `reports/intake-report-2026-04-15.md` for context on this audit within the wider remediation programme.*
