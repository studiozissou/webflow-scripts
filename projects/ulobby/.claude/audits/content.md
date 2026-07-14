# Content & Code Inventory Audit — Ulobby

**Date:** 2026-06-08 | **URL:** https://www.ulobby.eu | **Source:** WebFetch + SEMRush data

## Forms

| Form | Location | Confirmation | Redirect | Status |
|------|----------|-------------|----------|--------|
| Demo request | `/demo` | Inline "Thank you" message | None | PASS (functional) |
| Contact | `/contact` | Inline message | None | PASS |
| Newsletter | `/newsletter` | Inline message | None | PASS |

**Note:** No forms redirect to a dedicated thank-you page — all use inline confirmation. Consider redirecting to `/thank-you` for clearer UX and conversion tracking.

## Image Accessibility

### Missing alt text found on:

- **Plans page** (`/plans`): Logo image `Group%202.svg` missing alt
- **Technology page** (`/about/technology`): Multiple missing —
  - Logo image, hero background SVG
  - Solutions section `.webp` image
  - Data-driven reports image
  - Council membership logo
  - GDPR logo
- **Homepage**: Logo image lacks alt text; inconsistent coverage throughout

**Recommendation:** Audit all content images site-wide. Add descriptive alt text: `alt="[object] + [context]"` (e.g. "GDPR certification logo").

## Viewport

**Status:** PASS — `<meta content="width=device-width, initial-scale=1" name="viewport"/>` present on all tested pages.

## CMS Hygiene

### Collections with unnecessary template pages

| Collection | Items | Needs template? | Has template? |
|-----------|-------|-----------------|---------------|
| Pricing Features | 30 | No (taxonomy) | Yes — unnecessary |
| Team Members | 12 | No (displayed inline) | Yes — unnecessary |
| Blog Categories | 3 | No (taxonomy) | Yes — unnecessary |
| Features | 15 | No (displayed inline) | Yes — unnecessary |
| Quizzes | 1 | No | Yes — unnecessary |
| Transparent Democracy | 1 | No | Yes — unnecessary |

### Slug inconsistency
- Blog Categories slug is `category` — should be `blog-categories` for consistency

### Draft pages
All 6 drafts properly return 404 (not indexed):
- Style Guide, Newsletter v1, Terms & Conditions, Maturity Model Quiz Template, Transparent Democracy Template, Solutions Template (old)

**Status:** PASS — no dev/test pages are published.

## Low Text-to-HTML Ratio

17 pages flagged by SEMRush. Primarily landing pages, Solutions, and Plans — expected for design-heavy B2B SaaS. **No action required** unless conversion metrics indicate issues.

## Non-descriptive Anchor Text

- **437 links** with non-descriptive text ("Read more", "Learn more", icon-only)
- **109 links** with no anchor text at all (image links without alt, icon-only without aria-label)

**Recommendation:** Implement descriptive link text strategy:
- Blog listing: "Read: [Article Title]" instead of "Read more"
- CTAs: "Request a demo" instead of "Learn more"

## Custom Code Inventory

| Script | Source | Version | Risk |
|--------|--------|---------|------|
| Google Tag Manager | `googletagmanager.com/gtm.js?id=GTM-TFHLQ84T` | Current | Low |
| Cookiebot | `consent.cookiebot.com/uc.js` (cbid: `da2535e9-91e3-426d-800d-df7a62b06625`) | Latest | Medium (malformed link issue) |
| Google reCAPTCHA | `google.com/recaptcha/api.js` | Latest | Low |
| jQuery | `d3e54v103j8qbb.cloudfront.net/js/jquery-3.5.1.min.dc5e7f18c8.js` | 3.5.1 | Low (Webflow bundled) |
| Webflow Framework | `cdn.prod.website-files.com/.../js/webflow.*.js` (3 chunks) | Built-in | Low |
| Webflow CSS | `cdn.prod.website-files.com/.../css/ulobbyv2.webflow.shared.*.min.css` | Built-in | Low (SRI present) |

### Code migration assessment
- **3 third-party scripts** (GTM, Cookiebot, reCAPTCHA) — at threshold but all are standard SaaS tools, not custom code
- **No custom GitHub-hosted dependencies** detected
- **No GSAP, Finsweet, or animation libraries**
- **Verdict:** No code migration flag required

## Translation Completeness

- **63 pages** with hreflang language mismatch (SEMRush)
- Content language doesn't match declared hreflang — likely incomplete translations falling back to English on DA/NO/SV URLs
- **Recommendation:** Audit translation completeness for DA, NO, SV locales. Prioritise homepage, Plans, Solutions, and top blog articles.
