# Pre-Launch Technical + Performance Audit

**Site:** https://rhpcircle.webflow.io/  
**Client:** Ready Hit Play (Creative Agency, Amsterdam)  
**Date:** 2026-05-04  
**Auditor:** Claude (automated — no Chrome DevTools MCP available this session)  
**Status:** Pre-launch (launching 2026-05-05)

---

## Lighthouse Scores (Estimated)

> NOTE: Chrome DevTools MCP was not available in this session. Lighthouse could not
> be run programmatically. The scores below are **estimates** based on source code
> analysis and known characteristics of the site architecture. A manual Lighthouse
> run is required before launch.

### Homepage (Desktop) — Estimated

| Category | Estimated Score | Rationale |
|----------|----------------|-----------|
| Performance | 40–60 | Heavy video (8x Vimeo 1080p), ~325 KB custom JS (unminified), render-blocking Webflow CSS + jQuery, no lazy-loaded videos |
| Accessibility | 70–80 | Has `lang`, `h1`, focus-visible outlines, aria-hidden canvas; but missing alt text on CMS poster images, nav logo is a `<div>` not `<a>` |
| Best Practices | 70–80 | HTTPS, SRI on Webflow assets; but loads jQuery unused, duplicate viewport meta, no CSP headers |
| SEO | 40–50 | No meta description, no OG image, no canonical, robots.txt blocks all crawlers |

### Homepage (Mobile) — Estimated

| Category | Estimated Score | Rationale |
|----------|----------------|-----------|
| Performance | 25–45 | Same video payload on mobile, large JS parse cost, no code splitting, body overflow:hidden delays LCP |
| Accessibility | 70–80 | Same as desktop |
| Best Practices | 70–80 | Same as desktop |
| SEO | 40–50 | Same as desktop |

### About Page (Desktop) — Estimated

| Category | Estimated Score | Rationale |
|----------|----------------|-----------|
| Performance | 55–70 | Less video, still loads all modules; Webflow IX2 + GSAP potential conflict |
| Accessibility | 65–75 | `.about-team_bio` hidden until IX3 loads (flash if JS slow); OG title is just "About" |
| Best Practices | 70–80 | Same stack |
| SEO | 50–60 | Has og:title and twitter:title ("About") but no description, no OG image, no canonical |

---

## Technical Checklist

| Check | Status | Notes |
|-------|--------|-------|
| robots.txt present | PRESENT but BLOCKING | `User-agent: * / Disallow: /` — blocks ALL crawlers. Must be updated before launch. |
| sitemap.xml present | NOT FOUND (404) | No sitemap generated. Enable in Webflow Settings > SEO > Auto-generate sitemap. |
| Custom 404 page | CONFIGURED | Custom styled 404 with Barba.js transitions and link back to homepage. |
| Favicon set | YES | 32x32 PNG favicon + 256x256 Apple Touch Icon configured via Webflow. |
| SSL / HTTPS | YES | Webflow provides HTTPS on all `.webflow.io` subdomains and custom domains. |
| Canonical domain consistency | NOT SET | No `<link rel="canonical">` on any page. Schema.org references `www.readyhitplay.com` but pages serve from `rhpcircle.webflow.io`. Must add canonical tags pointing to production domain. |
| Meta description (homepage) | MISSING | No `<meta name="description">` on homepage. |
| Meta description (about) | MISSING | No `<meta name="description">` on about page. |
| OG image | MISSING | No `og:image` on any page. Social shares will show no preview. |
| OG title (homepage) | MISSING | Homepage has no `og:title` at all. |
| OG title (about) | PARTIAL | Set to "About" — should be "About | Ready Hit Play". |
| Twitter card | MISSING | No `twitter:card` meta tag on any page. |
| Analytics (GA4 / GTM) | NOT INSTALLED | No Google Analytics, GTM, or any analytics script detected. |
| Cookie consent mechanism | NOT PRESENT | No cookie banner, no consent script. Required under GDPR (NL-based agency). |
| H1 tag present | YES | Homepage: `<h1 class="visually-hidden">Ready Hit Play</h1>` (screen-reader only). |
| Structured data | PARTIAL | Schema.org WebSite type present; missing Organization, LocalBusiness for Amsterdam office. |
| `lang` attribute | YES | `<html lang="en">` set correctly. |
| Webflow badge | UNKNOWN | Cannot verify from reference HTML — check Webflow hosting plan settings. |

---

## Performance Budget Summary

### Scripts (Custom — unminified, served via jsDelivr)

| File | Size (bytes) | Size (KB) | Notes |
|------|-------------|-----------|-------|
| orchestrator.js | 80,430 | 78.5 KB | OVER BUDGET (>50 KB). Main Barba conductor. |
| work-dial.js | 79,401 | 77.5 KB | OVER BUDGET. Homepage dial + video pool. |
| home-scroll-morph.js | 43,140 | 42.1 KB | Near budget. Scroll-linked morphing. |
| cursor.js | 23,767 | 23.2 KB | OK |
| case-video-controls.js | 19,132 | 18.7 KB | OK |
| init.js | 17,182 | 16.8 KB | OK |
| home-about-slide.js | 8,003 | 7.8 KB | OK |
| video-loader.js | 7,785 | 7.6 KB | OK |
| about-text-lines.js | 6,072 | 5.9 KB | OK |
| transition-dial.js | 4,997 | 4.9 KB | OK |
| about-swipers.js | 4,667 | 4.6 KB | OK |
| about-dial-ticks.js | 4,548 | 4.4 KB | OK |
| work-nav.js | 3,866 | 3.8 KB | OK |
| about-scroll-accordions.js | 3,783 | 3.7 KB | OK |
| about-icon-scale.js | 3,312 | 3.2 KB | OK |
| lenis-manager.js | 3,809 | 3.7 KB | OK |
| home-intro.js | 3,117 | 3.0 KB | OK |
| intro-format.js | 2,010 | 2.0 KB | OK |
| about-accordion-scroll.js | 1,747 | 1.7 KB | OK |
| utils.js | 1,559 | 1.5 KB | OK |
| **TOTAL custom JS** | **322,327** | **~315 KB** | Unminified. Estimated ~180 KB minified, ~55 KB gzipped. |

### Scripts (Third-party dependencies)

| Library | Source | Est. Size (min+gz) | Notes |
|---------|--------|---------------------|-------|
| jQuery 3.5.1 | Cloudfront (Webflow) | ~30 KB gz | NOT USED by custom code. Loaded by Webflow automatically. |
| webflow.js | Webflow CDN | ~15 KB gz | IX2 engine, form handling, nav. |
| GSAP 3.14.2 core | Webflow CDN | ~25 KB gz | Used heavily. |
| ScrollTrigger | Webflow CDN | ~12 KB gz | Used. |
| SplitText (Club) | Webflow CDN | ~5 KB gz | Used. |
| ScrollSmoother | Webflow CDN | ~6 KB gz | Loaded but NOT used (Lenis handles smooth scroll). |
| Flip | Webflow CDN | ~7 KB gz | Used. |
| ScrambleTextPlugin | jsDelivr | ~3 KB gz | Used. |
| Barba.js core | unpkg | ~7 KB gz | Used. |
| Lenis 1.3.17 | unpkg | ~5 KB gz | Used. |
| lottie-web (light) | jsDelivr | ~40 KB gz | Used for loading spinner. |
| **TOTAL deps** | — | **~155 KB gz** | — |

### CSS

| File | Size | Notes |
|------|------|-------|
| rhpcircle.webflow.shared.css | Unknown (CDN) | Render-blocking. Webflow-generated. |
| ready-hit-play.css | 38 KB (unminified) | Custom styles via jsDelivr. Not minified. |
| lenis.css | ~2 KB | Via unpkg. |

### Fonts

| Font | Source | Notes |
|------|--------|-------|
| Unknown | Webflow CDN (likely) | Not visible in reference HTML head — likely loaded via CSS @font-face in Webflow stylesheet. Check network waterfall. |

### Estimated TTI Impact

- **Desktop:** 3–5s (heavy JS parse + video decode + sequential module loading)
- **Mobile 4G:** 5–8s (same payload, slower CPU, no code splitting)

---

## Issues by Category

### CRITICAL

1. **robots.txt blocks all crawlers**  
   `Disallow: /` prevents Google from indexing any page.  
   **Fix:** Change to `Allow: /` in Webflow Settings > SEO > robots.txt, or set specific disallows for staging paths only.  
   **Location:** Webflow Dashboard > Site Settings > SEO tab

2. **No sitemap.xml**  
   Google cannot discover pages efficiently.  
   **Fix:** Enable auto-sitemap in Webflow Settings > SEO.  
   **Location:** Webflow Dashboard > Site Settings > SEO tab

3. **No analytics installed**  
   Cannot measure traffic, conversions, or user behavior from day one.  
   **Fix:** Add GTM container or GA4 tag to Webflow Project Settings > Custom Code > Head.  
   **Location:** Webflow Dashboard > Project Settings > Custom Code

### HIGH

4. **No meta descriptions on any page**  
   Google will auto-generate snippets (unpredictable). CTR impact.  
   **Fix:** Add in Webflow Page Settings for each page.  
   **Location:** Webflow Designer > Page Settings > SEO Settings

5. **No OG image / Twitter card**  
   Social shares will show blank or Webflow default.  
   **Fix:** Upload a 1200x630 OG image in Webflow Page Settings > Open Graph.  
   **Location:** Webflow Designer > Page Settings > Open Graph Settings

6. **No canonical tag**  
   Risk of duplicate content between `rhpcircle.webflow.io` and `www.readyhitplay.com`.  
   **Fix:** Will auto-resolve when custom domain is connected and staging is password-protected. Verify canonical is set to `https://www.readyhitplay.com/` on each page.  
   **Location:** Webflow auto-generates canonical when custom domain is primary.

7. **No cookie consent (GDPR)**  
   Agency is Netherlands-based. Even without analytics, cookie consent is legally required if any cookies are set (Webflow sets session cookies).  
   **Fix:** Implement cookie banner. Brief already exists at `projects/ready-hit-play-prod/.claude/briefs/cookie-banner-copy.html`.  
   **Location:** Webflow custom code or third-party (CookieYes, Iubenda, etc.)

8. **ScrollSmoother loaded but unused**  
   ~6 KB gzipped loaded on every page but Lenis handles smooth scrolling.  
   **Fix:** Remove `ScrollSmoother.min.js` from the Webflow body scripts (it is loaded by Webflow's GSAP integration, not by init.js — must be removed from Webflow Designer > Page Settings > Before </body>).  
   **Location:** Webflow Designer > Page body code / GSAP integration settings

### MEDIUM

9. **jQuery loaded but unused**  
   Custom code uses zero jQuery. ~30 KB gzipped wasted.  
   **Fix:** Cannot easily remove (Webflow bundles it). Accept or move to Webflow's "disable jQuery" option if available on plan.  
   **Location:** Webflow Dashboard > Project Settings > General

10. **orchestrator.js (78.5 KB) and work-dial.js (77.5 KB) exceed 50 KB budget**  
    Large unminified files increase parse time on mobile.  
    **Fix (short-term):** These are unminified source. jsDelivr serves them without minification unless `.min.js` extension is used. Consider adding a build step or using jsDelivr's built-in minification (`/gh/.../file.min.js` auto-minifies).  
    **Fix (long-term):** Code-split work-dial video pool logic into a separate lazy-loaded chunk.  
    **Location:** `/Users/willmorley/Library/Mobile Documents/com~apple~CloudDocs/Projects/Webflow Scripts/webflow-scripts/projects/ready-hit-play-prod/orchestrator.js`, `/Users/willmorley/Library/Mobile Documents/com~apple~CloudDocs/Projects/Webflow Scripts/webflow-scripts/projects/ready-hit-play-prod/work-dial.js`

11. **All 19 modules loaded sequentially on every page**  
    About page loads work-dial.js, home-intro.js, home-scroll-morph.js even though they are home-only.  
    **Fix:** init.js already loads all modules; orchestrator.js only inits relevant ones. Consider lazy-loading page-specific modules only when needed.  
    **Location:** `/Users/willmorley/Library/Mobile Documents/com~apple~CloudDocs/Projects/Webflow Scripts/webflow-scripts/projects/ready-hit-play-prod/init.js:84-105`

12. **Duplicate viewport meta tag**  
    Webflow generates `<meta content="width=device-width, initial-scale=1" name="viewport"/>` and custom code adds another with `viewport-fit=cover`.  
    **Fix:** Remove the custom viewport meta from Webflow head code; add `viewport-fit=cover` to Webflow's native viewport setting if possible, or accept the override (browsers use last-declared).  
    **Location:** Webflow custom head code embed

13. **CMS poster images missing alt text**  
    All `dial_cms-poster` images have `alt=""` (empty). Should describe the case study.  
    **Fix:** Add alt text in Webflow CMS for each case study's poster image.  
    **Location:** Webflow CMS > Case Studies collection

14. **Nav logo is a `<div>` not a link**  
    `.nav_logo-link` is rendered as `<div>` — not keyboard-navigable as a home link.  
    **Fix:** Change to Link Block in Webflow Designer pointing to `/`.  
    **Location:** Webflow Designer > Nav component

15. **Webflow IX2 interaction on about page (`.about-team_bio` visibility)**  
    `html.w-mod-js:not(.w-mod-ix3) :is(.about-team_bio) {visibility: hidden !important;}` — if IX2 engine fails to load or is slow, bios stay invisible.  
    **Fix:** Ensure custom GSAP code has a fallback timeout to reveal `.about-team_bio` if IX2 has not acted within 3s.  
    **Location:** About page, Webflow-generated style tag

### LOW

16. **Schema.org could be richer**  
    Only `WebSite` type present. Add `Organization` with logo, address, social profiles.  
    **Fix:** Add JSON-LD in Webflow custom code head.

17. **lottie-web (40 KB gz) for a loading spinner**  
    A CSS-only spinner would save the entire library.  
    **Fix:** Replace Lottie loading animation with CSS keyframe spinner.  
    **Location:** `/Users/willmorley/Library/Mobile Documents/com~apple~CloudDocs/Projects/Webflow Scripts/webflow-scripts/projects/ready-hit-play-prod/video-loader.js`

18. **Barba + third-party deps loaded from unpkg (no SRI)**  
    `unpkg.com/@barba/core` and `unpkg.com/lenis@1.3.17` have no integrity hashes.  
    **Fix:** Pin to specific versions with SRI hashes, or switch to jsDelivr (supports SRI).  
    **Location:** `/Users/willmorley/Library/Mobile Documents/com~apple~CloudDocs/Projects/Webflow Scripts/webflow-scripts/projects/ready-hit-play-prod/init.js:75-76`

19. **Copyright year hardcoded to 2025 in contact pullout**  
    `<span id="year">2025</span>` — utils.js updates this dynamically but if JS fails, it shows 2025.  
    **Fix:** Update HTML to 2026 as fallback, keep JS dynamic update.  
    **Location:** Homepage reference HTML line 368 (contact pullout footer)

---

## Quick Wins (Do Before Launch)

1. **Update robots.txt** — Change `Disallow: /` to `Allow: /` (Webflow SEO settings). 1 minute.
2. **Enable sitemap** — Webflow SEO settings toggle. 1 minute.
3. **Add meta descriptions** — Homepage + About in Webflow Page Settings. 5 minutes.
4. **Add OG image** — Upload 1200x630 share image per page. 10 minutes.
5. **Install GTM/GA4** — Paste GTM snippet in Project Settings > Custom Code > Head. 5 minutes.
6. **Update copyright year** — Change `2025` to `2026` in Webflow Designer contact pullout. 1 minute.

## Longer-term Improvements

1. **Cookie consent banner** — Implement using brief at `.claude/briefs/cookie-banner-copy.html`.
2. **Remove ScrollSmoother** — Audit Webflow GSAP integration; remove unused plugin.
3. **Minify custom JS** — Use jsDelivr's `.min.js` suffix or add a simple build step.
4. **Lazy-load page-specific modules** — Split init.js module list by namespace.
5. **Replace Lottie with CSS spinner** — Eliminate 40 KB dependency.
6. **Add SRI hashes** — Pin Barba and Lenis with integrity attributes.
7. **Fix nav logo** — Convert from `<div>` to `<a>` Link Block in Designer.
8. **Add Organization schema** — Rich JSON-LD with logo, address, socialLinks.
9. **Disable jQuery** — If Webflow plan supports it and no IX2 interactions need it.

---

## Manual Verification Required

The following items could not be tested without Chrome DevTools / live browser:

- [ ] Actual Lighthouse scores (run in Chrome DevTools > Lighthouse)
- [ ] Core Web Vitals (LCP, FID/INP, CLS) from field data
- [ ] Font loading strategy (FOIT/FOUT behavior)
- [ ] Video decode performance on mobile (frame drops)
- [ ] Actual network waterfall and TTI measurement
- [ ] Cookie behavior (what cookies Webflow sets without analytics)
- [ ] Custom domain DNS + SSL configuration
- [ ] Webflow badge visibility on free/paid plan
- [ ] Form submission functionality (contact pullout)
- [ ] 301 redirects from old URLs (if applicable)

---

*Generated 2026-05-04. Re-run with Chrome DevTools MCP for live Lighthouse data.*
