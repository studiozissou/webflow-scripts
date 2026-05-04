# rhp-about-swipers — Swiper.js Crossfade Sliders on About Page

## Summary

Replace Webflow native sliders on the RHP about page with two Swiper.js instances (`[data-slider="1"]` and `[data-slider="2"]`). CMS-filled slides with crossfade transition, autoplay, swipe, and pause-on-hover. Slider max-height derived from existing `about-icon-scale.js` CSS vars.

## Requirements

- **Two sliders:** `[data-slider="1"]` (4 CMS slides) and `[data-slider="2"]` (3 CMS slides), both inside `.section_about-hero > .accordion-wrapper` under accordion "WHERE IT COMES FROM"
- **Effect:** Crossfade, 750ms, ease
- **Autoplay:** 4s per slide, loops infinitely
- **Pause on hover:** Autoplay pauses when mouse enters slider container
- **Swipe:** Touch/pointer swipe changes slide (prev/next)
- **No navigation:** No prev/next arrows, no pagination dots
- **Max height:** `100svh - var(--top-offset) - var(--header-height) - var(--titles-height)` — reuses CSS vars set by `about-icon-scale.js`
- **1 slide per view**
- **CMS content per slide:** `.about_image-wrapper` (img) + `.spacer-medium.is-caption` (text)
- **Reduced motion:** Skip crossfade, show first slide statically, no autoplay

## Approach

**Swiper.js CDN** — Load Swiper CSS + JS conditionally on `/about` page only (following the `overland-ai` page-gate pattern in `init.js`). Create new `about-swipers.js` module. Retire `about-slider-autoheight.js`.

## DOM Structure (validated via live scan)

```
.section_about-hero
  .padding-global.padding-section-about
    .about_r-link > .icon-embed-r          ← R logo (about-icon-scale.js)
    .about_header                           ← header block
    .accordion-wrapper
      .accordion-title                      ← "What we know"
      .accordion-content
      .accordion-title.is-2                 ← "WHERE IT COMES FROM"
      .accordion-content
        ...
        .accordion-column-wrapper
          .accordion-column
            div.swiper.w-dyn-list[data-slider="1"]    ← SLIDER 1
              div.swiper-wrapper.w-dyn-items[role=list]
                div.swiper-slide.w-dyn-item[role=listitem]  × 4
                  .about_image-wrapper > img
                  .spacer-medium.is-caption > text
          .accordion-column.is-second
            div.swiper.w-dyn-list[data-slider="2"]    ← SLIDER 2
              div.swiper-wrapper.w-dyn-items[role=list]
                div.swiper-slide.w-dyn-item[role=listitem]  × 3
                  .about_image-wrapper > img
                  .spacer-medium.is-caption > text
      .accordion-title.is-3                 ← "WHY READY HIT PLAY EXISTS"
      .accordion-content
      .accordion-title.is-4                 ← "Services"
      .accordion-content
```

**Note:** 2 additional `.swiper` elements with empty `data-slider=""` exist in the same accordion column. These are ignored (selector targets only `[data-slider="1"]` and `[data-slider="2"]`).

## Files Affected

| File | Change | Est. LOC |
|------|--------|----------|
| `about-swipers.js` | **New module** — IIFE, `init(container)` / `destroy()`, two Swiper instances | ~100 |
| `init.js` | Add Swiper CSS/JS as conditional deps (about page gate), add module to `CONFIG.modules`, add health check + version table entry, remove `about-slider-autoheight.js` | ~15 |
| `orchestrator.js` | Replace `aboutSliderAutoheight` calls with `aboutSwipers` in `views.about.init()` / `destroy()` | 4 |
| `ready-hit-play.css` | Add `[data-slider]` max-height rule using existing CSS vars, crossfade stacking styles | ~15 |

**Total: ~135 LOC across 4 files (1 new, 3 modified)**

## Implementation Detail

### about-swipers.js

```js
(() => {
  'use strict';
  const VERSION = '2026.5.4.1';
  const DEBUG = false;

  let active = false;
  let instances = [];

  function prefersReduced() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }

  function init(container) {
    if (active) return;
    if (!container) return;
    if (typeof Swiper === 'undefined') return; // guard: Swiper not loaded

    const sliders = container.querySelectorAll('[data-slider="1"], [data-slider="2"]');
    if (!sliders.length) return;

    active = true;

    sliders.forEach(el => {
      const reduced = prefersReduced();
      const swiper = new Swiper(el, {
        effect: 'fade',
        fadeEffect: { crossFade: true },
        speed: reduced ? 0 : 750,
        autoplay: reduced ? false : {
          delay: 4000,
          disableOnInteraction: false,
          pauseOnMouseEnter: true
        },
        loop: true,
        slidesPerView: 1,
        grabCursor: true,
        allowTouchMove: true,
        // No nav, no pagination
      });
      instances.push(swiper);
    });
  }

  function destroy() {
    if (!active) return;
    active = false;
    instances.forEach(s => { try { s.destroy(true, true); } catch(e) {} });
    instances = [];
  }

  window.RHP = window.RHP || {};
  window.RHP.aboutSwipers = { init, destroy, version: VERSION };
})();
```

### init.js changes

1. **Conditional Swiper loading** (after line 213, following `isOverlandPage` pattern):
```js
const isAboutPage = /\/about(\/|$)/.test(window.location.pathname);
if (isAboutPage) {
  await loadStylesheet('https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css');
  await loadScript('https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js');
}
```

2. **Module list** (line ~91): Replace `about-slider-autoheight.js` with `about-swipers.js`

3. **Health check** (line ~251): Replace `aboutSliderAutoheight` check with `aboutSwipers`

4. **Version table** (line ~278): Replace entry

### orchestrator.js changes

Lines 791, 804: Replace `RHP.aboutSliderAutoheight` with `RHP.aboutSwipers`:
```js
// init (line 791)
RHP.aboutSwipers?.init?.(container);

// destroy (line 804)
RHP.aboutSwipers?.destroy?.();
```

### ready-hit-play.css additions

```css
/* Swiper sliders: max-height = viewport minus accordion titles (vars from about-icon-scale.js) */
.section_about-hero [data-slider] {
  max-height: calc(100svh - var(--top-offset, 0px) - var(--header-height, 0px) - var(--titles-height, 0px));
  overflow: hidden;
}
.section_about-hero [data-slider] .swiper-slide {
  height: auto;
}
.section_about-hero [data-slider] img {
  width: 100%;
  height: auto;
  object-fit: cover;
}
```

## Barba Impact

1. **Init/Destroy lifecycle:** `about-swipers.js` exposes `init(container)` / `destroy()`. Orchestrator calls them in `views.about.init()` / `views.about.destroy()`. Swiper instances are fully destroyed (including internal RAF loops, event listeners, autoplay timers) via `swiper.destroy(true, true)`.
2. **State survival:** No state needs to persist across transitions. Sliders restart from slide 0 on re-entry — acceptable for a background content carousel.
3. **Transition interference:** Sliders are inside `.accordion-content` within `[data-barba="container"]`. No z-index or opacity conflicts with leave/enter transitions. The curtain transition covers the viewport before about content reveals.
4. **Re-entry correctness:** `destroy()` fully tears down Swiper instances. `init()` creates fresh instances. No stale listeners or doubled DOM. Tested pattern: home → about → home → about.
5. **Namespace scoping:** Only runs on `about` namespace. Orchestrator gates it via `views.about`.

## Dependency Note: Swiper Loading Timing

Swiper CSS + JS are loaded conditionally in `init.js` based on URL path. On Barba transitions to `/about`, the scripts are already loaded from the initial page load (init.js runs once on DOMContentLoaded). If the user lands directly on a non-about page and navigates to about via Barba, Swiper won't be loaded.

**Mitigation:** The `init.js` path check uses `window.location.pathname` at initial load time. For Barba transitions, the URL changes but `init.js` doesn't re-run. Two options:
- **Option A (simple):** Always load Swiper on all pages (~190KB total, cached after first load)
- **Option B (lazy):** Load Swiper dynamically in `about-swipers.js` init if `typeof Swiper === 'undefined'`, using `RHP.loadScript()` which is exposed on `window.RHP`

**Recommendation:** Option B (lazy load in module) — keeps non-about pages lean, uses existing `RHP.loadScript` infrastructure.

## Task Breakdown

| # | Task | Agent | Depends On |
|---|------|-------|------------|
| 1 | Create `about-swipers.js` module with lazy Swiper loading | code-writer | — |
| 2 | Update `init.js`: add module, remove `about-slider-autoheight.js`, update health checks | code-writer | — |
| 3 | Update `orchestrator.js`: swap `aboutSliderAutoheight` → `aboutSwipers` | code-writer | — |
| 4 | Add CSS rules to `ready-hit-play.css` for slider max-height and slide styling | code-writer | — |
| 5 | QA: run acceptance tests, verify on staging | qa | 1-4 |

## Parallelisation Map

**Independent streams (can run simultaneously):**
- Stream A: Tasks 1 + 2 (new module + init.js wiring) — code-writer, ~15 min, ~2K tokens
- Stream B: Tasks 3 + 4 (orchestrator + CSS) — code-writer, ~10 min, ~1K tokens

**Sequential dependencies:**
- Task 5 (QA) gates on all of 1-4

**Recommendation:** Parallel execution of A + B, then sequential QA. No worktrees needed (changes are in separate files with no merge conflicts).

## Verify Loop

### Pass/fail criteria
1. Two Swiper instances initialised on about page (check `document.querySelectorAll('[data-slider] .swiper-wrapper-initialized')` or Swiper's `swiper-initialized` class)
2. Crossfade transitions occur every 4s (slide changes, opacity transition visible)
3. Autoplay pauses on mouse hover, resumes on mouse leave
4. Touch swipe advances to next/prev slide
5. No console errors on about page load
6. Slider max-height does not exceed `100svh - titles` (no vertical overflow)
7. Clean Barba round-trip: home → about → home → about — no errors, sliders re-init
8. Reduced motion: no autoplay, first slide visible statically
9. `about-slider-autoheight.js` no longer referenced in module list or orchestrator

### Reproduction steps
1. Navigate to `https://rhpcircle.webflow.io/about`
2. Scroll to "WHERE IT COMES FROM" accordion (should auto-open via scroll)
3. Observe slider 1 (left column) and slider 2 (right column)
4. Wait 4s — slide should crossfade to next
5. Hover over slider — autoplay should pause
6. Swipe left on slider — should advance to next slide
7. Navigate to home via nav, then back to about — sliders should re-init cleanly

### Tier mapping
- **Tier 1 (auto):** Swiper init, slide count, autoplay advance, console errors, Barba re-entry, reduced motion — `tests/acceptance/rhp-about-swipers.spec.js`
- **Tier 2 (CDN regression):** Registered in `tests/registry.json`
- **Tier 3 (manual):**
  - Crossfade visual smoothness (750ms ease subjective quality) — can't assert animation curve feel
  - Touch swipe on real iOS/Android device — Playwright only runs Chromium
  - Pause-on-hover timing precision — mouse event simulation imprecise

### Regression scope
- About page icon scale (`about-icon-scale.js`) must still work — same CSS vars, no conflict
- About team hover must still work
- About entrance curtain reveal must still work
- Barba home ↔ about transitions must remain clean
- `about-slider-autoheight.js` removal must not cause health check warnings

## Acceptance Tests

See `tests/acceptance/rhp-about-swipers.spec.js`

1. `swiper containers are present` — `[data-slider="1"]` and `[data-slider="2"]` exist
2. `swiper initialised on both sliders` — `.swiper-initialized` class present
3. `correct slide counts` — slider 1 has ≥3 slides, slider 2 has ≥2 slides
4. `autoplay advances slide` — active slide index changes after 5s wait
5. `no console errors on about page` — zero `pageerror` events
6. `barba re-entry: home → about → home → about` — sliders re-init, no errors
7. `reduced motion: no autoplay` — slide index unchanged after 5s
8. `slider max-height within viewport` — bounding rect height ≤ viewport height
