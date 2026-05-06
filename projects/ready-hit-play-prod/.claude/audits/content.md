# Content + Code Inventory Audit — Ready Hit Play

**Date:** 2026-05-04
**URL:** https://rhpcircle.webflow.io/

---

## Code Inventory

| Script | Source | Version | Risk | Notes |
|--------|--------|---------|------|-------|
| GSAP Core | cdn.prod.website-files.com | 3.15.0 | HIGH | Webflow IX2 loader |
| GSAP Core | cdn.prod.website-files.com | 3.14.2 | HIGH | Custom code (DUPLICATE) |
| GSAP ScrollTrigger | cdn.prod.website-files.com | 3.15.0 | HIGH | Webflow IX2 |
| GSAP ScrollTrigger | cdn.prod.website-files.com | 3.14.2 | HIGH | Custom code (DUPLICATE) |
| GSAP SplitText | cdn.prod.website-files.com | 3.15.0 | HIGH | Webflow IX2 |
| GSAP SplitText | cdn.prod.website-files.com | 3.14.2 | HIGH | Custom code (DUPLICATE) |
| GSAP ScrollSmoother | cdn.prod.website-files.com | 3.15.0 | MEDIUM | Webflow IX2 only |
| GSAP Flip | cdn.prod.website-files.com | 3.15.0 | HIGH | Webflow IX2 |
| GSAP Flip | cdn.jsdelivr.net/npm/gsap | 3.14.2 | HIGH | Custom code (DUPLICATE) |
| GSAP ScrambleTextPlugin | cdn.prod.website-files.com | 3.15.0 | HIGH | Webflow IX2 |
| GSAP ScrambleTextPlugin | cdn.prod.website-files.com | 3.14.2 | HIGH | Custom code (DUPLICATE) |
| Barba.js | unpkg.com/@barba/core | **NO PIN** | CRITICAL | Unpinned — can break at any time |
| Lenis | unpkg.com/lenis | 1.3.17 | LOW | Smooth scroll, pinned |
| lottie-web | cdn.jsdelivr.net/npm/lottie-web | 5.12.2 | LOW | Animation player, pinned |
| jQuery | d3e54v103j8qbb.cloudfront.net | 3.5.1 | LOW | Webflow default |
| Webflow Runtime | cdn.prod.website-files.com | Latest | MEDIUM | Auto-updated by Webflow |
| Lenis CSS | unpkg.com/lenis | 1.3.17 | LOW | Smooth scroll styles |
| RHP Stylesheet | cdn.jsdelivr.net/gh/studiozissou | @203194b | CRITICAL | Third-party hosted |
| init.js | cdn.jsdelivr.net/gh/studiozissou | @203194b | CRITICAL | Entry point |
| lenis-manager.js | cdn.jsdelivr.net/gh/studiozissou | @203194b | HIGH | Smooth scroll orchestration |
| cursor.js | cdn.jsdelivr.net/gh/studiozissou | @203194b | HIGH | Custom cursor |
| work-dial.js | cdn.jsdelivr.net/gh/studiozissou | @203194b | CRITICAL | Case study nav wheel |
| transition-dial.js | cdn.jsdelivr.net/gh/studiozissou | @203194b | HIGH | Page transition controller |
| about-dial-ticks.js | cdn.jsdelivr.net/gh/studiozissou | @203194b | HIGH | About page dial animation |
| about-text-lines.js | cdn.jsdelivr.net/gh/studiozissou | @203194b | HIGH | About text reveal |
| about-swipers.js | cdn.jsdelivr.net/gh/studiozissou | @203194b | HIGH | About swiper carousel |
| about-scroll-accordions.js | cdn.jsdelivr.net/gh/studiozissou | @203194b | HIGH | About accordion scroll |
| about-icon-scale.js | cdn.jsdelivr.net/gh/studiozissou | @203194b | MEDIUM | About icon scaling |
| about-accordion-scroll.js | cdn.jsdelivr.net/gh/studiozissou | @203194b | MEDIUM | About accordion scroll |
| home-intro.js | cdn.jsdelivr.net/gh/studiozissou | @203194b | HIGH | Homepage intro animation |
| home-scroll-morph.js | cdn.jsdelivr.net/gh/studiozissou | @203194b | HIGH | Homepage scroll morphing |
| home-about-slide.js | cdn.jsdelivr.net/gh/studiozissou | @203194b | HIGH | Home to About transition |
| intro-format.js | cdn.jsdelivr.net/gh/studiozissou | @203194b | MEDIUM | Intro text formatting |
| earth-parallax.js | cdn.jsdelivr.net/gh/studiozissou | @203194b | MEDIUM | Parallax background |
| case-video-controls.js | cdn.jsdelivr.net/gh/studiozissou | @203194b | HIGH | Case study video player |
| video-loader.js | cdn.jsdelivr.net/gh/studiozissou | @203194b | HIGH | Video loading controller |
| work-nav.js | cdn.jsdelivr.net/gh/studiozissou | @203194b | HIGH | Work/case navigation |
| orchestrator.js | cdn.jsdelivr.net/gh/studiozissou | @203194b | CRITICAL | Master animation controller |
| utils.js | cdn.jsdelivr.net/gh/studiozissou | @203194b | HIGH | Shared utilities |

**Total custom scripts:** 20+ (all on third-party GitHub)
**Total third-party deps:** 6 (GSAP, Barba, Lenis, lottie, jQuery, Webflow)

---

## Critical Risks

### 1. Barba.js Unpinned Version (CRITICAL)

- **Load URL:** `https://unpkg.com/@barba/core`
- **Issue:** No version specified — unpkg serves latest
- **Impact:** A breaking change upstream kills all page transitions instantly
- **Fix:** Pin to `@barba/core@2.10.3` (or whatever version is currently in use)

### 2. GSAP Version Conflict (HIGH)

- **Problem:** GSAP 3.15.0 (Webflow IX2) AND 3.14.2 (custom code) both load on every page
- **Load order:** 3.14.2 loads AFTER 3.15.0, overwriting the global `gsap` object
- **Impact:** ~60KB duplicate payload, potential namespace conflicts
- **Fix:** Either remove Webflow IX2 animations or update custom code to 3.15.0

### 3. CSS Loaded Twice (MEDIUM)

- **File:** `ready-hit-play.css`
- **Loads:** Once with `?v=1` (init.js early load), once with `?v=2026.5.4.2` (init.js module load)
- **Fix:** Remove one load call in init.js

### 4. All Custom Code on Third-Party GitHub (CRITICAL)

- **Host:** `cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@203194b`
- **Scope:** 20+ production scripts + 1 CSS file
- **Risks:**
  - studiozissou account suspension = instant production outage
  - GitHub repo deletion = no recovery
  - jsDelivr outage or block = no fallback CDN
  - IP/licensing unclear (code in third-party repo)
- **Status:** CODE MIGRATION REQUIRED

---

## Code Migration Plan

**Target:** Move all production code to client-owned infrastructure.

### Repo Structure
```
readyhitplay/rhp-webflow/
├── src/           ← source modules (current files)
├── dist/          ← production bundles (if build step added)
├── vendor/        ← vendored third-party libs (Barba, Lenis)
└── package.json
```

### CDN Pattern
```
cdn.jsdelivr.net/gh/readyhitplay/rhp-webflow@vX.Y.Z/src/init.js
```

### Version-Pinning Rules
- Production always pinned to a tagged release (`@v1.0.0`), never `@latest`
- Staging can use `@main` for testing
- Commit-hash pinning (`@abc1234`) acceptable as interim step

### Purge Workflow
```
https://purge.jsdelivr.net/gh/readyhitplay/rhp-webflow@vX.Y.Z/src/init.js
```

### Risk Mitigations
- Mirror on Cloudflare R2 as fallback CDN
- `onerror` fallback in init.js to load from secondary CDN
- Version lock file in Webflow custom code comments

---

## Content Findings

| Page | Images | Missing Alt | Forms | OG:Image | Notes |
|------|--------|-------------|-------|----------|-------|
| Homepage | 6 | 6/6 (100%) | 0 | Missing | All case study thumbnails lack alt text |
| About | 6 | 6/6 (100%) | 0 | Missing | Same thumbnails inherited from home |
| Case Studies | Dynamic | Dynamic | 0 | Missing | Content loaded via Barba |

### Images Missing Alt Text (Homepage)

1. `12_Closing Looping Video 1.avif` — Closing animation thumbnail
2. `Remote - Building_Thumbnail 1.avif` — Case study: Remote/Building
3. `Stoke - More than a Launch_Thumbnail 1.avif` — Case study: Stoke
4. `Starfish - Otter_Thumbnail 1.avif` — Case study: Starfish/Otter
5. `Tommy Loop - Thumbnail 1.avif` — Case study: Tommy Loop
6. `msft-quietlyfearless_thumbnail1.avif` — Case study: MSFT Quietly Fearless

### Other Content Checks

| Check | Status | Notes |
|-------|--------|-------|
| Mobile viewport | PASS | `width=device-width, initial-scale=1` |
| Forms | N/A | No forms — contact is pullout panel |
| Dev/test pages | PASS | None detected |
| Text-to-HTML ratio | PASS | Healthy for design-heavy site |
| CMS hygiene | PASS | No typos detected |
| Low text content | NOTE | Expected — cinematic/visual site |

---

## Network Summary

- **Total requests:** 73
- **Failed requests:** 0
- **Console errors:** 0
- **Console warnings:** 0
- **Lighthouse Accessibility:** 90/100
- **Lighthouse Best Practices:** 100/100
- **Lighthouse SEO:** 100/100

---

## Recommendations Priority

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| CRITICAL | Pin Barba.js version | 30 min | Prevent breaking changes |
| CRITICAL | Migrate code to owned repo | 2-3 days | Eliminate SPOF |
| HIGH | Resolve GSAP 3.14.2/3.15.0 conflict | 2-4 hours | Reduce payload, prevent bugs |
| HIGH | Add alt text to 6 images | 15 min | Accessibility + SEO |
| MEDIUM | Remove duplicate CSS load | 20 min | Reduce requests |
| MEDIUM | Add OG:Image | 10 min | Social sharing preview |
