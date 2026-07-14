# Technical + Lighthouse Audit — NEM Life

**Date:** 2026-05-07
**Site:** nem-life-1.webflow.io

## Technical Infrastructure

| Check | Status | Detail |
|-------|--------|--------|
| robots.txt | Present (blocking) | `User-agent: * / Disallow: /` — blocks all crawlers from entire site |
| sitemap.xml | Present | Exists with hreflang entries (nl-NL, en-NL, x-default). References /en locale |
| Custom 404 | Present | Returns proper 404 status with custom page content |
| Favicon | Default Webflow | Using default Webflow favicon (`cdn.prod.website-files.com/img/favicon.ico`), no custom favicon |
| SSL | Pass | HTTPS active on webflow.io staging domain |
| Canonical tag | Missing | No `<link rel="canonical">` found on homepage |
| Analytics | Not installed | No GA4, GTM, or other analytics scripts detected |
| Cookie consent | Not installed | No cookie consent banner or mechanism found |
| Consent alignment | N/A | No analytics or cookies requiring consent are present |
| Meta description | Missing | No meta description on homepage (or most pages) |
| OG tags | Missing | No og:title, og:description, or og:image on homepage |

### Custom scripts loaded (via jsDelivr / this repo)

| Script | Source |
|--------|--------|
| init.js | `cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@75de97a/projects/nem-life/src/init.js` |
| card-links.js | `...nem-life/src/card-links.js` |
| method-cars-fade.js | `...nem-life/src/method-cars-fade.js` |
| swiper-init.js | `...nem-life/src/swiper-init.js` |
| blog-share.js | `...nem-life/src/blog-share.js` |
| back-to-top.js | `...nem-life/src/back-to-top.js` |
| GSAP 3 | `cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js` |
| ScrollTrigger | `cdn.jsdelivr.net/npm/gsap@3/dist/ScrollTrigger.min.js` |
| Swiper 11 | `cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js` |
| jQuery 3.5.1 | Loaded by Webflow (default) |
| Google WebFont Loader | `ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js` |

## Lighthouse Scores — Desktop

| Page | Accessibility | SEO | Best Practices |
|------|--------------|-----|----------------|
| Home (`/`) | 89 | 58 | 100 |
| NEM Method (`/nem-methode`) | 93 | 66 | 100 |
| Our Mission (`/missie-nem-life`) | 91 | 92 | 100 |
| Blog listing (`/inzichten`) | 93 | 58 | 100 |
| Testimonials listing (`/ervaringen`) | 93 | 58 | 100 |
| Christel (`/link-in-bio/christel`) | 93 | 66 | 100 |
| Terms (`/voorwaarden`) | 92 | 58 | 100 |
| Blog article (`/inzichten/de-kracht-van-ondersteuning`) | 92 | 58 | 100 |
| Testimonial (`/ervaringen/dexter`) | 93 | 58 | 100 |

## Lighthouse Scores — Mobile

| Page | Accessibility | SEO | Best Practices |
|------|--------------|-----|----------------|
| Home (`/`) | 84 | 58 | 100 |
| NEM Method (`/nem-methode`) | 88 | 66 | 100 |
| Our Mission (`/missie-nem-life`) | 86 | 66 | 100 |
| Blog listing (`/inzichten`) | 88 | 58 | 100 |
| Testimonials listing (`/ervaringen`) | 88 | 58 | 100 |
| Christel (`/link-in-bio/christel`) | 88 | 66 | 100 |
| Terms (`/voorwaarden`) | 87 | 58 | 100 |
| Blog article (`/inzichten/de-kracht-van-ondersteuning`) | 87 | 58 | 100 |
| Testimonial (`/ervaringen/dexter`) | 88 | 58 | 100 |

## Recurring Accessibility Issues

1. **Color contrast insufficient** (every page, desktop + mobile) — Background and foreground colors do not have a sufficient contrast ratio. Multiple `<p>` elements fail WCAG AA.

2. **Links without discernible name** (every page, desktop + mobile) — The back-to-top link (`<a href="#" class="back-to-top">`) has no accessible name (no text, no aria-label).

3. **Label/content name mismatch** (7 of 9 pages) — Article card links have `aria-label="Lees meer"` but their visible text content is the article title. The aria-label should match or contain the visible text.

4. **Buttons without accessible name** (every page on mobile) — The mobile hamburger menu button has no accessible name.

5. **Touch targets too small** (Home, desktop + mobile) — Swiper pagination dots (`.hero_pagination-dot`, `.articles_pagination-dot`) are too small for reliable touch interaction.

6. **Heading order skipped** (Blog article template) — Heading elements jump levels (e.g., H1 to H3), breaking sequential descending order.

## Recurring SEO Issues

1. **Page blocked from indexing** (every page) — `robots.txt` contains `Disallow: /` which blocks all search engine crawlers from the entire site. This is expected for a staging/webflow.io domain but must be changed before going live on the production domain.

2. **Missing meta description** (7 of 9 pages) — Only `/missie-nem-life` has a meta description. All other pages are missing one. This impacts SERP click-through rates.

3. **Missing canonical tags** — No `<link rel="canonical">` detected, which can lead to duplicate content issues (especially with the /en locale variant in the sitemap).

4. **Invalid robots.txt** — Lighthouse flags the robots.txt as not valid on some pages. The blanket `Disallow: /` is technically valid but blocks everything.

5. **Missing OG/social tags** — No Open Graph meta tags (og:title, og:description, og:image) found, reducing social sharing effectiveness.

## Recurring Best Practices Issues

No Best Practices issues detected. All 9 pages scored **100** on both desktop and mobile.

## Summary

| Category | Desktop avg | Mobile avg |
|----------|------------|------------|
| Accessibility | 92 | 87 |
| SEO | 64 | 61 |
| Best Practices | 100 | 100 |

### Priority fixes before launch

1. **robots.txt** — Change `Disallow: /` to `Allow: /` on the production domain
2. **Meta descriptions** — Add unique meta descriptions to all pages in Webflow page settings
3. **Canonical tags** — Configure canonical URLs in Webflow (especially important with the /en locale)
4. **OG tags** — Add og:title, og:description, og:image per page
5. **Custom favicon** — Replace default Webflow favicon with NEM Life branding
6. **Back-to-top link** — Add `aria-label="Terug naar boven"` to the back-to-top anchor
7. **Mobile menu button** — Add `aria-label="Menu"` to the hamburger button
8. **Card link aria-labels** — Remove or fix `aria-label="Lees meer"` on article cards so accessible name matches visible content
9. **Color contrast** — Audit text/background combinations for WCAG AA compliance (4.5:1 ratio)
10. **Cookie consent + Analytics** — Install cookie consent mechanism and analytics before launch
