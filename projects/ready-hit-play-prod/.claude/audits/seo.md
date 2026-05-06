# SEO + Schema Audit — Ready Hit Play

**Site:** https://rhpcircle.webflow.io/
**Production domain:** https://www.readyhitplay.com/
**Date:** 2026-05-04
**Status:** Staging (noindexed via robots.txt `Disallow: /`)
**Launch:** 2026-05-05

---

## Executive Summary

The site has solid JSON-LD coverage on the homepage (Organization + WebSite) and case study pages (CreativeWork + Review + BreadcrumbList), but has critical gaps in basic on-page SEO metadata that must be fixed before launch. The homepage is missing OG tags, and has multiple H1 tags. A duplicate WebSite schema exists on every page. The about page title is a single word ("About") with no brand context.

---

## Findings by Severity

### CRITICAL (must fix before launch)

| # | Issue | Page(s) | Detail |
|---|-------|---------|--------|
| C1 | Multiple H1 tags | Homepage | 2+ H1s: "Ready Hit Play", "be ready". Should be exactly 1. |
| C2 | Multiple H1 tags | About | 3-4 H1s: "About Ready Hit Play", "Goosebumps don't lie.", "Great stories made undeniable." |
| C3 | Multiple H1 tags | Overland AI case | 4 H1s: "Overland AI", "Website", "The market didn't believe...", "ULTRA - Product Launch Film" |
| C4 | No OG tags | Homepage | Missing og:title, og:description, og:image. Social shares will show Webflow defaults. |
| C5 | Poor page title | About | Title is just "About" — should include brand name. |
| C6 | No sitemap.xml | Entire site | /sitemap.xml returns 404. Must enable in Webflow SEO settings. |
| C7 | robots.txt blocks all crawlers | Entire site | `Disallow: /` — must change on production domain at launch. |
| C8 | Duplicate WebSite schema | All pages | Two WebSite schemas on every page: one site-wide head, one page-specific. |

### WARNING (fix within first week)

| # | Issue | Page(s) | Detail |
|---|-------|---------|--------|
| W1 | No OG tags | About | og:title is "About" (generic), no og:image. |
| W2 | No OG image | Case studies | Missing og:image for social sharing of portfolio work. |
| W3 | Canonical tags | All pages | Verify they point to `www.readyhitplay.com` not `.webflow.io`. |
| W4 | No llms.txt | Root | /llms.txt returns 404. Recommended for AI-search visibility. |
| W5 | Review schema author | Overland AI | Author name includes em dash: `"— Byron Boots, CEO"`. Should be just `"Byron Boots"`. |
| W6 | BreadcrumbList references /work | Case studies | Verify `/work` URL resolves on production. |
| W7 | No Person schema for founders | About | Founders named in Organization but no dedicated Person schemas. |
| W8 | Duplicate viewport meta | All | Two `<meta name="viewport">` tags — one Webflow, one custom code. |
| W9 | Privacy Policy missing meta description | Privacy Policy | No description tag set. |

### SUGGESTION (nice-to-have)

| # | Issue | Page(s) | Detail |
|---|-------|---------|--------|
| S1 | Add FAQPage schema | About/Homepage | If FAQ content exists, add markup for rich results. |
| S2 | Add LocalBusiness schema | Homepage | Amsterdam physical presence — enables Maps/Knowledge Panel. |
| S3 | Add datePublished to CreativeWork | Case studies | Helps Google understand freshness. |
| S4 | Consolidate schemas to single @graph | All | Use one `<script>` block per page instead of multiple. |
| S5 | Add WebPage schema | Non-homepage pages | Explicit page classification. |

---

## Per-Page Audit Details

### Homepage (`/`)

| Check | Status | Value |
|-------|--------|-------|
| Title | OK | "Ready Hit Play — Creative Studio, Amsterdam" (43 chars) |
| Meta description | OK | Present (131 chars) |
| H1 count | FAIL | 2+ (should be 1) |
| Canonical | CHECK | Verify points to production domain |
| og:title | OK | Set |
| og:description | OK | Set |
| og:image | FAIL | Missing |
| JSON-LD | PARTIAL | Organization + WebSite (good) + duplicate WebSite |

### About (`/about`)

| Check | Status | Value |
|-------|--------|-------|
| Title | FAIL | "About" (5 chars — no brand context) |
| Meta description | OK | Set via page settings |
| H1 count | FAIL | 3-4 (should be 1) |
| og:title | WARN | "About" (matches poor title) |
| og:image | FAIL | Missing |
| JSON-LD | GOOD | AboutPage + BreadcrumbList + duplicate WebSite |

### Privacy Policy (`/privacy-policy`)

| Check | Status | Value |
|-------|--------|-------|
| Title | OK | "Privacy Policy" (could add brand) |
| Meta description | FAIL | Missing |
| H1 count | OK | 1 |
| JSON-LD | MINIMAL | Only site-wide WebSite schema |

### Overland AI Case Study (`/work/overland-ai`)

| Check | Status | Value |
|-------|--------|-------|
| Title | OK | "Overland AI — Ready Hit Play" (29 chars) |
| Meta description | CHECK | Likely set via CMS |
| H1 count | FAIL | 4 (should be 1) |
| og:image | FAIL | Not set |
| JSON-LD | GOOD | CreativeWork + Review + BreadcrumbList + duplicate WebSite |

---

## Schema Coverage Matrix

| Schema Type | Homepage | About | Case Study | Privacy |
|-------------|----------|-------|------------|---------|
| WebSite | YES (dup) | YES (dup) | YES (dup) | YES |
| Organization | YES | YES (nested) | YES (nested) | NO |
| AboutPage | NO | YES | NO | NO |
| CreativeWork | NO | NO | YES | NO |
| BreadcrumbList | NO | YES | YES | NO |
| Review | NO | NO | YES | NO |
| Person | NO | NO | NO | NO |
| FAQPage | NO | NO | NO | NO |
| LocalBusiness | NO | NO | NO | NO |

---

## Recommended Fixes

### 1. Remove duplicate WebSite schema from site-wide head code
Delete the standalone `<script type="application/ld+json">` WebSite block from Webflow Site Settings > Custom Code > Head.

### 2. Fix About page title and OG
- **Title:** `About Ready Hit Play — Who We Are`
- **OG Title:** same
- **OG Image:** Upload team/brand social card (1200x630)

### 3. Fix H1 hierarchy on all pages
- **Homepage:** Keep only "Ready Hit Play" as H1. Demote animated text to `<span>` or styled `<div>`.
- **About:** Keep only "About Ready Hit Play" as H1. Demote quotes to H2.
- **Case studies:** Keep only project name as H1. Demote section titles to H2.

### 4. Fix Review schema author
```json
"author": {
  "@type": "Person",
  "name": "Byron Boots",
  "jobTitle": "CEO",
  "worksFor": { "@type": "Organization", "name": "Overland AI" }
}
```

### 5. Remove duplicate viewport meta
Delete from site-wide head custom code:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

### 6. Enable sitemap + fix robots.txt at launch
- Webflow Settings > SEO > Toggle "Auto-generate Sitemap" ON
- Webflow Settings > SEO > Toggle indexing ON

### 7. Add OG images to all pages
Set 1200x630 branded social cards on homepage, about, and each CMS case study.

### 8. Add llms.txt (recommended)
Create a page with AI-readable site summary for LLM crawlers.

---

## Launch Checklist (SEO)

- [ ] Remove `Disallow: /` from robots.txt (Webflow indexing toggle)
- [ ] Enable sitemap auto-generation
- [ ] Remove duplicate WebSite schema from site-wide head code
- [ ] Remove duplicate viewport meta from site-wide head code
- [ ] Set OG images on all key pages
- [ ] Update About page title to include brand name
- [ ] Fix H1 hierarchy (1 per page)
- [ ] Fix Review schema author format
- [ ] Verify canonical tags point to `www.readyhitplay.com`
- [ ] Verify `/work` URL resolves (referenced in breadcrumbs)
- [ ] Set meta description on Privacy Policy
- [ ] Test with Google Rich Results Test after publish
- [ ] Test with Facebook Sharing Debugger after OG tags set

---

*Audit performed 2026-05-04. Re-audit recommended 2 weeks post-launch.*
