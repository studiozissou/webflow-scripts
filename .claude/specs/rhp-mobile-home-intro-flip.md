# RHP — Mobile Home Intro: Logo Scroll Reveal + Shrink-to-Nav

**Slug:** `rhp-mobile-home-intro-flip`
**Client:** Ready Hit Play
**Priority:** P1
**Status:** Planning
**Date:** 2026-04-23
**Approach:** A — Single timeline, proportional phases
**Supersedes:** Extends `rhp-home-intro-mobile` (which established `buildMobileTimeline()`)

## Summary

Extend the mobile home intro from 250svh to 300svh. Keep the existing bell-curve
word reveal (READY/HIT/PLAY) over the first 250svh. Add a Flip.fit logo
shrink+translate to nav position over the last 50svh — matching the desktop
morph behavior.

## Architecture

### Single timeline, proportional phases

Modify `buildMobileTimeline()` in `home-scroll-morph.js` to work over 300svh.
Define a boundary constant `REVEAL = 250/300` (≈0.833):

- **Reveal phase (0 → REVEAL):** Existing bell-curve word reveal + dial grow.
  All existing position values scaled by `REVEAL`.
- **Flip phase (REVEAL → 1.0):** Logo shrink+translate to nav using the same
  Flip.fit math from `buildTimeline()` (desktop).

Two files affected. Desktop code completely untouched.

| File | Changes |
|------|---------|
| `ready-hit-play.css` | Section 250→300svh |
| `home-scroll-morph.js` | Rescale `buildMobileTimeline()` to REVEAL/FLIP phases; port nav measurement math |

**Note:** `.home-intro_middle` does NOT need `position: fixed` — it's inside
`.home-transition` which is already fixed. The logo stays in the viewport
throughout the 300svh scroll because its ancestor is fixed-positioned.

## Detailed Changes

### 1. CSS: Section height 300svh

**File:** `ready-hit-play.css`

```css
/* Line 449-452: change 250svh → 300svh */
@media (max-width: 991px) {
  main.main-wrapper:has([data-barba="container"][data-barba-namespace="home"]) .section_home-intro {
    height: 300svh;
    min-height: 300svh;
  }
}

/* Line 483 comment: update 250svh → 300svh */
```

**No position change needed for `.home-intro_middle`** — it lives inside
`.home-transition` which is already `position: fixed`. The logo stays in the
viewport throughout the scroll because its ancestor is fixed-positioned. The
Flip.fit math works correctly (`getBoundingClientRect()` returns viewport-relative
coords for elements inside a fixed ancestor).

### 2. JS: Rescale buildMobileTimeline() with REVEAL/FLIP phases

**File:** `home-scroll-morph.js`, function `buildMobileTimeline()` (line 460)

#### 2a. Phase constants

```js
const REVEAL = 250 / 300;   // 0.8333 — word reveal + dial grow
const FLIP   = 1 - REVEAL;  // 0.1667 — logo shrink + translate to nav
```

#### 2b. Dial grow: scale duration to REVEAL

```js
// Was: duration: 1 (full timeline)
// Now: duration: REVEAL (finishes growing before flip phase)
scrubTL.to(dialWrapper, {
  x: dx, y: dy, scale: dScale,
  ease: 'power3.inOut', duration: REVEAL
}, 0);
```

#### 2c. Remove logo fade-out

Delete the current logo fade-out (lines 528-532):
```js
// DELETE:
scrubTL.to(logoEl, { opacity: 0, ease: 'none', duration: 0.4 }, 0.6);
```

#### 2d. Add Flip.fit logo shrink+translate (port from buildTimeline)

Port the nav wrapper measurement math from `buildTimeline()` (lines 349-381):

```js
// --- Logo shrink + translate to nav (replaces fade-out) ---
const navWrapper = document.querySelector('.nav_logo-wrapper-2.is-nav');
const navLink = document.querySelector('.nav_logo-link') || topSlot;
const navWrapperRect = navWrapper
  ? navWrapper.getBoundingClientRect()
  : navLink.getBoundingClientRect();
const logoRect = logoEl.getBoundingClientRect();

const ilFirstSvg = logoEl.querySelector('svg');
const navFirstSvg = navWrapper?.querySelector('svg');
let lScale;
if (ilFirstSvg && navFirstSvg) {
  const ilSvgWidth = ilFirstSvg.getBoundingClientRect().width;
  const navSvgWidth = navFirstSvg.getBoundingClientRect().width;
  const cssScale2 = logoEl.offsetWidth > 0 ? logoRect.width / logoEl.offsetWidth : 1;
  lScale = (navSvgWidth / ilSvgWidth) * cssScale2;
} else {
  lScale = navWrapperRect.width / (logoEl.offsetWidth || logoRect.width);
}

const ilLogoCenterX = logoRect.left + logoRect.width / 2;
const ilLogoCenterY = logoRect.top + logoRect.height / 2;
const lx = (navWrapperRect.left + navWrapperRect.width / 2) - ilLogoCenterX;
const ly = (navWrapperRect.top + navWrapperRect.height / 2) - ilLogoCenterY;

scrubTL.to(logoEl, {
  x: lx, y: ly, scale: lScale,
  ease: 'power3.inOut', duration: FLIP
}, REVEAL);
```

**Key prerequisite:** `.nav_logo-wrapper-2.is-nav` must have non-zero dimensions
on mobile before `.rhp-home-ready` is added. The CSS FOUC rule (line 28-34) uses
`opacity: 0 !important` (not `display: none`), so `getBoundingClientRect()`
returns valid non-zero values. Confirmed via live DOM inspection: nav logo at
x:112, y:29, w:166, h:18 on 390×844 mobile viewport.

#### 2e. Scale word reveal SEG

```js
// Was: const SEG = 0.28;
// Now: scale into the reveal phase
const SEG = 0.28 * REVEAL;  // ≈0.233
```

Word positions: 0, 0.233, 0.467 (all complete by ~0.7, well within REVEAL=0.833).

#### 2f. Step text: keep at end of timeline

```js
// Stays at 0.9 (during the flip phase, 90% of 300svh = 270svh scroll point)
if (stepTextEl) {
  scrubTL.to(stepTextEl, { opacity: 1, duration: 0.1, ease: 'power1.out' }, 0.9);
}
```

### 3. Comment update

**File:** `home-scroll-morph.js`, line 674

```js
// Was: "on mobile the intro section is 250svh"
// Now: "on mobile the intro section is 300svh"
```

## What stays unchanged

- **Desktop `buildTimeline()`** — completely untouched
- **`onMorphComplete()`** — already handles clearProps, section hide, .rhp-home-ready
- **`replay()`** — calls `_resizeHandler()` which rebuilds `buildMobileTimeline()`,
  seeks `scrubTL.progress(1)` (logo at nav position), then tweens 1→0 (logo back
  to center). Works correctly because:
  - At progress=1, logo is at nav position (x:lx, y:ly, scale:lScale)
  - At progress=0, logo is at rest (center of viewport, no transforms)
  - The `gsap.to(logoEl, { opacity: 1 })` in replay.onComplete is a no-op
    (logo opacity stays 1 throughout — no fade-out in new design)
- **`skipToEnd()`** — bypasses animation entirely (Barba re-entry)
- **`_killScrub()` / `destroy()`** — kills the single scrubTL (unchanged)
- **`onMorphReverse()`** — unreachable under normal CSS-locked scroll (unchanged)
- **`forceActive()` on work-dial** — already implemented from rhp-home-intro-mobile spec

## Barba Impact

1. **Init/Destroy lifecycle:** No new listeners or DOM elements. Changes are
   inside `buildMobileTimeline()` which uses the existing `ctx = gsap.context()`
   scope and `_killScrub()` cleanup. No change needed.

2. **State survival:** No new cross-transition state. `_mobileActiveLocked` in
   work-dial already handles ACTIVE persistence.

3. **Transition interference:** The logo shrink+translate is inside the scrub
   timeline, killed by `_killScrub()` before any Barba transition. The fixed
   positioning of `.home-intro_middle` is CSS-only and scoped to mobile — no
   interference with transitions.

4. **Re-entry correctness:** `skipToEnd()` hides `.section_home-intro` (which
   hides the fixed `.home-intro_middle` too) and lands in final state. No new
   leak vectors.

5. **Namespace scoping:** Runs only on `home` namespace. The `:has([data-barba-namespace="home"])`
   CSS guard prevents the section height from applying on about/case.

## Verify Loop

### Pass/fail criteria
- [ ] On mobile (≤991px), `.section_home-intro` has computed height of 300svh
- [ ] Logo words animate in/out via scroll (bell-curve SplitText pattern), logo stays centered in viewport (ancestor .home-transition is fixed)
- [ ] After word reveal completes (~70% scroll), logo is still visible in viewport
- [ ] During last 50svh of scroll, logo shrinks and translates to nav position
- [ ] At morph complete, nav logo is visible and matches the interactive logo's final position
- [ ] Dial grows from small→large during reveal phase (finishes by 250svh scroll)
- [ ] After morph completes, dial is in ACTIVE state (auto-engaged, no tap needed)
- [ ] No console errors during the entire flow
- [ ] Barba re-entry (home→about→home) works cleanly
- [ ] Replay (nav logo click on home) works: logo grows back from nav to center
- [ ] Desktop home intro is completely unchanged (100svh, Flip.fit, no word reveal)
- [ ] Reduced motion: morph completes instantly without animation

### Reproduction steps
1. Open https://rhpcircle.webflow.io on a mobile viewport (390×844)
2. Scroll slowly through the intro section
3. Observe: logo words (READY, HIT, PLAY) reveal via bell-curve, logo centered in viewport
4. Continue scrolling past the word reveal (~70% of scroll)
5. At ~83% scroll (250svh), logo begins shrinking toward nav position
6. At 100% scroll (300svh), morph completes: nav visible, dial ACTIVE
7. Tap the nav logo → replay reverses the morph back to center

### Tier mapping
- Tier 1 (auto): `tests/acceptance/rhp-mobile-home-intro-flip.spec.js`
- Tier 2 (CDN regression): registered in `tests/registry.json`
- Tier 3 (manual): see below

### Regression scope
- Desktop home intro must be UNCHANGED
- Barba transitions (home↔about, home↔case) on mobile
- Work-dial state machine post-morph
- Contact pullout panel on mobile
- Nav logo replay on mobile

## Test Plan

### Tier 1 — Auto: Playwright local
Tests in `tests/acceptance/rhp-mobile-home-intro-flip.spec.js`:
1. Section height is 300svh on mobile viewport (390×844)
2. Logo stays in viewport during scroll (ancestor .home-transition is fixed)
3. No console errors on mobile home load + scroll through intro
4. Morph complete after full scroll: `.rhp-home-ready` class present
5. Dial ACTIVE state after morph (bg canvas opacity: 1, fg layer opacity: 1)
6. Desktop regression: section height still 100svh at 1440px viewport
7. Reduced motion: morph completes without animation, nav visible
8. Barba re-entry: home→about→home clean on mobile

### Tier 2 — Auto: CDN regression
- Entry in `tests/registry.json` with id `rhp-mobile-home-intro-flip`

### Tier 3 — Manual
- **Logo shrink animation quality** — subjective: does the scale+translate look smooth? Is the easing right? (power3.inOut may need tuning)
- **Word reveal timing feel** — the scaled SEG (0.233 vs 0.28) changes the reveal pacing; may feel faster
- **Logo-to-nav alignment** — sub-pixel alignment at final position on real iOS/Android devices
- **Safari scroll bounce** — scroll lock at 300svh end on Safari mobile
- **Replay reverse** — visual quality of logo growing back from nav to center on mobile
- **iOS video autoplay** — requires real device (Playwright only runs Chromium)

## Parallelisation Map

| Stream | Task | Agent | Est. LOC | Dependencies |
|--------|------|-------|----------|--------------|
| A | CSS: 300svh section height | code-writer | ~5 | None |
| B | JS: rescale buildMobileTimeline + flip math | code-writer | ~45 | None (parallel with A) |
| C | Acceptance tests | code-writer | ~80 | Depends on A, B |
| D | QA + regression | qa | — | Depends on C |

**Recommendation:** Streams A and B can run in parallel but total is ~50 LOC
across 2 files — execute sequentially in one pass for simplicity. Then tests.

## Tasks

1. **CSS: 300svh section height** — Change section height 250→300svh; update comment
2. **JS: Rescale buildMobileTimeline with REVEAL/FLIP phases** — Add REVEAL/FLIP constants; scale dial grow, word reveal, step text; remove fade-out; add Flip.fit shrink+translate; update comment at line 674
3. **Acceptance tests** — Write Playwright tests for mobile 390×844 viewport
4. **QA verification** — Run tests, verify desktop regression, check replay
