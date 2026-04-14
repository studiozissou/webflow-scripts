# RHP — Home Intro Scroll Choreography

**Slug:** `rhp-home-intro-scroll-choreography`
**Status:** Ready to Build
**Priority:** P1
**Project:** ready-hit-play-prod
**Created:** 2026-04-14
**Supersedes:** `rhp-home-intro-scroll-morph`, `rhp-home-intro-dial-flip-lock`
**Approach:** GSAP Flip.fit scrubbed (Approach B)

---

## Summary

Choreograph the homepage intro scroll animation where the logo and a transition dial animate to their final positions as the user scrolls through `.section_home-intro`. Uses GSAP `Flip.fit()` scrubbed via ScrollTrigger to move elements between layout slots.

### Visual Flow (from screenshots)

1. **Page load:** Large "READY HIT PLAY" logo (`#interactive-logo`) centred in `.home-intro_middle`. Small transition dial (96 ticks, teal) below in `.home-intro_bottom`. Main work-dial at `opacity: 0`. Nav items hidden.
2. **Mid-scroll (~50%):** Logo has moved upward and shrunk. Dial has moved upward and grown. "WHO WE ARE" and "CONTACT" nav items visible at sides.
3. **Near-complete (~90%):** Logo is small at `.home-intro_top`. Dial is large at `.home-intro_middle`, showing "GREAT STORIES MADE UNDENIABLE" tagline.
4. **100% scroll (morph complete):** Intro section hidden. Main work-dial shown (same position/size as the now-hidden transition dial). Nav logo visible. Step text fades in. Scroll locks. User is on the main homepage.

---

## New HTML Structure

The Webflow Designer has been updated. The old `.home-intro_logo-slot` and `.nav_logo-wrapper-2:not(.is-nav)` structure is **removed**.

```
.section_home-intro
  .home-intro_top          ← logo end position (empty on load)
  .home-intro_middle       ← logo start position
    #interactive-logo      ← the existing .nav_logo-wrapper-2 instance (large)
  .home-intro_bottom       ← dial start position
    .home-transition-dial  ← wrapper for transition-dial canvas (small)
```

Key elements:
- **`#interactive-logo`** — The same SVG wordmark used in the nav (`.nav_logo-wrapper-2`), placed as a separate instance in the intro section. Starts large in `.home-intro_middle`.
- **`.home-transition-dial`** — A div that hosts the transition-dial canvas. Starts small in `.home-intro_bottom`.
- **`.home-intro_top`** — Empty slot; the logo's end position after the scroll morph.
- **`.home-intro_middle`** — The dial's end position (also the logo's start position).

---

## Approach: GSAP Flip.fit Scrubbed

### Why Flip.fit

`Flip.fit()` computes the transform (translate + scale) needed to visually move one element to match another element's position and size. By capturing these transforms and scrubbing them via a ScrollTrigger timeline, we get:

- Smooth scroll-linked animation between layout slots
- No DOM reparenting (elements stay in their original containers)
- Automatic handling of position + scale deltas
- Clean `clearProps` at completion to hand back to CSS

### Animation Sequence

**ScrollTrigger config:**
```js
trigger: sectionEl,        // .section_home-intro
start: 'top top',
end: '+=100%',             // scroll 1x viewport height
scrub: 0.5,                // smooth lerp
onLeave: onMorphComplete,
onEnterBack: onMorphReverse,
invalidateOnRefresh: true
```

**Scrub timeline (0–100% scroll progress):**

| Element | From | To | Scrub range | Notes |
|---------|------|----|-------------|-------|
| `.home-transition-dial` | `.home-intro_bottom` (small) | `.home-intro_middle` (large) | 0–1.0 | `Flip.fit(dialWrapper, middleSlot)` vars scrubbed |
| `#interactive-logo` | `.home-intro_middle` (large) | `.home-intro_top` (small) | 0–1.0 | `Flip.fit(logoEl, topSlot)` vars scrubbed |
| `--dial-live-width/height` | `var(--dial-small-width)` | `var(--dial-large-width)` | 0–1.0 | Drives `.dial_layer-fg` sizing (work-dial reads these) |
| Step text (`.is-step`) | `opacity: 0` | `opacity: 1` | 0.9–1.0 | Last 10% fade-in |

**On morph complete (100% scroll, `onLeave`):**
1. Set `.section_home-intro` to `display: none` (or `.home-transition` parent if applicable)
2. Clear Flip transforms on dial wrapper and logo (`clearProps: 'transform,x,y,scale'`)
3. Commit CSS vars: `--dial-live-width: var(--dial-large-width)`, `--dial-live-height: var(--dial-large-height)`
4. Add `.rhp-home-ready` to `[data-barba="wrapper"]` → CSS FOUC rule falls off, nav items become visible
5. Show main work-dial (opacity 0 → 1 or just let CSS handle via `.rhp-home-ready`)
6. Hide transition dial (destroy or just hidden by the intro section being `display: none`)
7. Animate nav items in (logo drops from `yPercent: -100`, about slides from `xPercent: -100`, contact from `xPercent: 100`) — **except nav logo** which is just revealed via class toggle
8. Step text SplitText entrance (words slide up, staggered)
9. Unlock dial: `setIntroComplete()`, `setAttractionEnabled(true)`, `setInteractionUnlocked(true)`
10. Lock scroll: `RHP.lenis.stop()`, `RHP.scroll.lock()`
11. Redraw dial canvas: `window.dispatchEvent(new Event('resize'))` — work-dial repaints at large size

### Canvas Pixellation Prevention

`transition-dial.js` already sizes the canvas backing buffer at the **large** viewport target (line 50–51: `dialLargeBase = Math.max(180, Math.min(innerHeight * 0.5, innerWidth * 0.7))`). CSS `width: 100%; height: 100%` handles display scaling. When Flip.fit scales the wrapper from small → large, the canvas renders at full resolution throughout. No explicit resize/redraw needed during the scrub — only at morph complete when we `dispatchEvent(new Event('resize'))` to trigger work-dial's repaint.

---

## Files Affected

| File | Change type | Est. LOC |
|------|-------------|----------|
| `home-scroll-morph.js` | **Major refactor**: rewrite `_queryDOMRefs()`, `buildTimeline()`, `onMorphComplete()`, `replay()`, `skipToEnd()` for new HTML + Flip.fit | ~180 |
| `ready-hit-play.css` | **Moderate**: add `.home-intro_top`, `.home-intro_middle`, `.home-intro_bottom`, `.home-transition-dial` styles; update/remove `.home-intro_logo-slot` rules; add `#interactive-logo` sizing | ~50 |
| `transition-dial.js` | **Minor**: update `SEL.container` from `.transition-dial` to `.home-transition-dial` (or make configurable) | ~5 |
| `orchestrator.js` | **Minor**: verify `transitionDial.init()` runs before `homeScrollMorph.init()` on fresh home load; version bump | ~5 |
| `init.js` | **Minor**: update inline FOUC CSS if needed; version bump | ~5 |
| `home-intro.js` | **No change** — still just marks scope classes and fires event |

### Removed / Obsolete

- `.home-intro_logo-slot` — CSS rules can be removed
- `.nav_logo-wrapper-2:not(.is-nav)` inside intro slot — no longer exists
- `.about-hero_ready` hover interaction in intro — removed (the new `#interactive-logo` is a simple SVG, no upper/lower text reveal)
- `_initIntroLogoHover()` / `_destroyIntroLogoHover()` — delete entirely

---

## Detailed Changes

### 1. `home-scroll-morph.js` — Major Refactor

#### `_queryDOMRefs(container)` (replaces lines 58–70)

```js
function _queryDOMRefs(container) {
  sectionEl = document.querySelector('.section_home-intro');
  topSlot = sectionEl?.querySelector('.home-intro_top') || null;
  middleSlot = sectionEl?.querySelector('.home-intro_middle') || null;
  bottomSlot = sectionEl?.querySelector('.home-intro_bottom') || null;
  logoEl = document.querySelector('#interactive-logo');
  dialWrapper = document.querySelector('.home-transition-dial');
  navLogoLink = document.querySelector('.nav_logo-link');
  navLogoWrapper = document.querySelector('.nav_logo-link .nav_logo-wrapper-2.is-nav');
  dialEl = document.querySelector('.dial_component[data-dial-ns="home"]');
  stepTextEl = document.querySelector('.dial_component[data-dial-ns="home"] .heading-style-h7.is-step') ||
    document.querySelector('.dial_component[data-dial-ns="home"] [data-text="step"]');
}
```

New module-scoped refs: `topSlot`, `middleSlot`, `bottomSlot`, `logoEl`, `dialWrapper`.
Removed refs: `introSlot`, `introLogoEl`.

#### Init guard (replaces lines 161–171)

```js
if (!sectionEl || !topSlot || !middleSlot || !bottomSlot || !logoEl || !dialWrapper || !dialEl) {
  DEBUG && console.warn('[home-scroll-morph] required DOM missing', { ... });
  return;
}
```

#### Delete `_initIntroLogoHover()` and `_destroyIntroLogoHover()` (lines 74–147)

The new `#interactive-logo` is a simple SVG wordmark — no about-hero-style upper/lower text reveal. All hover interaction code is removed.

#### `buildTimeline()` (replaces lines 197–288)

```js
const buildTimeline = () => {
  // Kill previous
  if (scrubTL) {
    if (scrubTL.scrollTrigger) scrubTL.scrollTrigger.kill();
    scrubTL.kill();
    scrubTL = null;
  }
  if (scrollTrigger) { scrollTrigger.kill(); scrollTrigger = null; }

  // Reset any leftover transforms so Flip measures rest state
  gsap.set(dialWrapper, { clearProps: 'transform,x,y,scale' });
  gsap.set(logoEl, { clearProps: 'transform,x,y,scale' });

  if (prefersReduced()) {
    scrollTrigger = ScrollTrigger.create({
      trigger: sectionEl,
      start: 'top top',
      end: '+=100%',
      onLeave: onMorphComplete,
      onEnterBack: onMorphReverse,
      invalidateOnRefresh: true
    });
    return;
  }

  // Capture Flip.fit vars for dial: bottom → middle
  const dialFitVars = Flip.fit(dialWrapper, middleSlot, {
    scale: true,
    getVars: true  // returns tween vars instead of playing
  });

  // Capture Flip.fit vars for logo: middle → top
  const logoFitVars = Flip.fit(logoEl, topSlot, {
    scale: true,
    getVars: true
  });

  scrubTL = gsap.timeline({
    scrollTrigger: {
      trigger: sectionEl,
      start: 'top top',
      end: '+=100%',
      scrub: 0.5,
      onLeave: onMorphComplete,
      onEnterBack: onMorphReverse,
      invalidateOnRefresh: true
    }
  });

  // Dial: move from bottom slot to middle slot + grow
  scrubTL.to(dialWrapper, {
    ...dialFitVars,
    ease: 'power3.inOut',
    duration: 1
  }, 0);

  // Logo: move from middle slot to top slot + shrink
  scrubTL.to(logoEl, {
    ...logoFitVars,
    ease: 'power3.inOut',
    duration: 1
  }, 0);

  // CSS vars: drive work-dial sizing (dial_layer-fg reads these)
  scrubTL.to(dialEl, {
    '--dial-live-width': 'var(--dial-large-width)',
    '--dial-live-height': 'var(--dial-large-height)',
    ease: 'power3.inOut',
    duration: 1
  }, 0);

  // Step text: fade in during last 10%
  if (stepTextEl) {
    scrubTL.to(stepTextEl, { opacity: 1, duration: 0.1, ease: 'power1.out' }, 0.9);
  }

  scrollTrigger = scrubTL.scrollTrigger || null;
};
```

**Key: `Flip.fit(el, target, { getVars: true })`** returns a tween vars object (with `x`, `y`, `scaleX`, `scaleY`, etc.) without playing the animation. We spread these vars into `scrubTL.to()` so the transform is linked to scroll progress.

#### `onMorphComplete()` (replaces lines 411–427)

Same structure but updated:
1. Hide `.section_home-intro` via `gsap.set(sectionEl, { display: 'none' })`
2. No `_destroyIntroLogoHover()` call (removed)
3. Clear Flip transforms: `gsap.set([dialWrapper, logoEl], { clearProps: 'transform,x,y,scale,scaleX,scaleY' })`
4. Call `_applyCompleteState(true)` (unchanged)

#### `_applyCompleteState(animate)` (lines 307–409)

Mostly unchanged. Key updates:
- Nav logo entrance: **skip nav logo animation** (user says "apart from nav logo") — just reveal it via `.rhp-home-ready` class toggle. Remove the `navLogo` `yPercent: -100` → `0` tween. Nav about and contact still animate in.
- Step text: fades in after swap (existing SplitText entrance is kept)

#### `replay()` (replaces lines 477–511)

Updated to:
1. Re-show `.section_home-intro` (`display: ''`)
2. Remove `.rhp-home-ready`
3. Reset dial/logo to start positions (clearProps, let CSS handle)
4. Init transition dial canvas again if destroyed
5. Rebuild scrub timeline via `_resizeHandler()`
6. Re-lock dial, unlock scroll, smooth-scroll to top

#### `skipToEnd(container)` (replaces lines 451–475)

Updated to:
1. Re-query DOM refs
2. Hide intro section
3. Set CSS vars to dial-large
4. Clear any Flip transforms
5. Mark complete, call `_applyCompleteState(false)`

### 2. `ready-hit-play.css` — Layout Slots

```css
/* New: intro layout slots */
.home-intro_top {
  position: absolute;
  top: 2rem;
  left: 50%;
  transform: translateX(-50%);
  width: var(--logo-small-width, 15rem);
  /* Logo end position — matches nav logo size/position */
}

.home-intro_middle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  /* Logo starts here (large), dial ends here (large) */
}

.home-intro_bottom {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.home-transition-dial {
  width: var(--dial-small-width, 6rem);
  height: var(--dial-small-height, 6rem);
  /* Transition dial starts small here */
}

/* #interactive-logo starts large in .home-intro_middle */
#interactive-logo {
  width: var(--logo-large-width, 90vw);
  max-width: var(--logo-large-max-width, 93rem);
}
```

**Remove:** `.home-intro_logo-slot` rules (lines 406–444), `.about-hero_ready` hover text rules for the slot.

### 3. `transition-dial.js` — Selector Update

```js
const SEL = {
  container: '.home-transition-dial'  // was '.transition-dial'
};
```

Or make it configurable: `init(container, selector)`. Since the module is also used during Barba transitions (where the selector might be different), consider keeping both selectors:

```js
function init(container = document, customSelector) {
  const sel = customSelector || SEL.container;
  const wrapper = container.querySelector(sel) || document.querySelector(sel);
  ...
}
```

### 4. `orchestrator.js` — Call Order Verification

Current home view init (line 447–448):
```js
RHP.workDial?.init?.(container, { introMode: options.introMode === true });
RHP.transitionDial?.init?.(container);
```

This is correct — `transitionDial.init()` runs before `homeScrollMorph.init()` (which is deferred until `rhp:home-intro:complete` event). No change needed beyond version bump.

---

## Barba Impact

1. **Init/Destroy lifecycle:** `home-scroll-morph.js` adds GSAP tweens + ScrollTrigger via `gsap.context()`. `destroy()` kills ScrollTrigger → timeline → reverts ctx. `transition-dial.js` has its own `init()/destroy()` lifecycle. Both are called by `orchestrator.js` views.home.init/destroy. **Compliant.**

2. **State survival:** No state needs to persist across Barba transitions. Video state is handled by `work-dial.js`'s `suspend()/resume()` path. **N/A.**

3. **Transition interference:** `.section_home-intro` is at `z-index: 2`, above the Barba container. During a Barba leave animation, the intro section is either already `display: none` (morph completed) or should be hidden. `onMorphComplete` sets it to `display: none`. If the user navigates away before morph completes (e.g. clicks a nav link during the scroll), `destroy()` will kill the scrub timeline and the orchestrator's `views.home.destroy()` handles cleanup. **Safe.**

4. **Re-entry correctness:** `skipToEnd(container)` handles Barba re-entry. It re-queries DOM, hides intro section, sets final state. `replay()` handles the nav logo click to re-show the intro. **Compliant.**

5. **Namespace scoping:** Runs only on `home` namespace. `.section_home-intro` is scoped via CSS `:has([data-barba-namespace="home"])` — hidden on all other namespaces. **Compliant.**

---

## Task Breakdown

### Task 1: CSS layout slots + FOUC rules
**Agent:** code-writer
**Files:** `ready-hit-play.css`
- Add `.home-intro_top`, `.home-intro_middle`, `.home-intro_bottom`, `.home-transition-dial`, `#interactive-logo` styles
- Remove `.home-intro_logo-slot` and associated hover text rules
- Update FOUC comments to reference new structure
- Verify `--dial-live-width/height` fallback still works

### Task 2: Update transition-dial.js selector
**Agent:** code-writer
**Files:** `transition-dial.js`
- Update `SEL.container` to `.home-transition-dial`
- Or add configurable selector parameter to `init()`

### Task 3: Rewrite home-scroll-morph.js
**Agent:** code-writer
**Files:** `home-scroll-morph.js`
- Rewrite `_queryDOMRefs()` for new HTML selectors
- Delete `_initIntroLogoHover()` / `_destroyIntroLogoHover()`
- Rewrite `buildTimeline()` with `Flip.fit(el, target, { getVars: true })` + ScrollTrigger scrub
- Update `onMorphComplete()` to clear Flip transforms
- Update `_applyCompleteState()` — skip nav logo animation, keep about/contact slide-in + step text SplitText
- Update `replay()` for new element refs
- Update `skipToEnd()` for new element refs
- Update init guard for new required elements
- Version bump

### Task 4: Verify orchestrator wiring
**Agent:** code-writer
**Files:** `orchestrator.js`
- Confirm `transitionDial.init()` runs before scroll-morph deferred init
- Version bump

### Task 5: Update init.js FOUC CSS
**Agent:** code-writer
**Files:** `init.js`
- Update inline FOUC CSS block if any selectors changed
- Version bump

### Task 6: Acceptance tests
**Agent:** qa
**Files:** `tests/acceptance/rhp-home-intro-scroll-choreography.spec.js`
- See acceptance tests section below

---

## Parallelisation Map

| Stream | Tasks | Agent | Est. tokens | Sequential gate |
|--------|-------|-------|-------------|-----------------|
| A: CSS | Task 1 | code-writer | ~2k | None |
| B: transition-dial | Task 2 | code-writer | ~1k | None |
| C: home-scroll-morph | Task 3 | code-writer | ~8k | After A, B (needs CSS slots to exist for Flip measurements) |
| D: orchestrator + init | Task 4, 5 | code-writer | ~2k | After C |
| E: tests | Task 6 | qa | ~4k | After C |

**Recommendation:** Tasks 1 + 2 can run in parallel. Task 3 runs after both complete. Tasks 4+5 and 6 can run in parallel after Task 3.

Worktrees: No — changes span shared files (CSS, orchestrator) that would conflict.
Agent teams: Optional — a 2-agent team could run Streams A+B in parallel, then hand off to a single agent for C→D.

---

## Verify Loop

### Pass/fail criteria

1. **Pre-scroll state:**
   - `#interactive-logo` is visible and large (width close to `90vw` or `--logo-large-width`) inside `.home-intro_middle`
   - `.home-transition-dial` is visible and small (`--dial-small-width` = 6rem) inside `.home-intro_bottom`
   - Main work-dial (`.dial_component[data-dial-ns="home"]`) has `--dial-live-width` set to `var(--dial-small-width)`
   - Nav items (`.nav_logo-link`, `.nav_about-link`, `.nav_contact-link`) are hidden (CSS FOUC rule active)
   - Step text (`.heading-style-h7.is-step`) is hidden (`opacity: 0`)

2. **Mid-scroll state (~50%):**
   - `#interactive-logo` has a Flip transform applied (non-zero `translate` + `scale < 1`)
   - `.home-transition-dial` has a Flip transform applied (non-zero `translate` + `scale > 1`)

3. **Post-scroll state (morph complete):**
   - `.section_home-intro` has `display: none`
   - `[data-barba="wrapper"]` has `.rhp-home-ready` class
   - Nav about and contact links are visible
   - Step text is visible
   - `window.RHP.homeScrollMorph.complete === true`
   - No JS console errors

4. **Replay (nav logo click):**
   - `.section_home-intro` re-appears
   - `.rhp-home-ready` removed from wrapper
   - Scroll position returns to top
   - Scrub timeline is rebuilt and functional

5. **Barba re-entry (home → about → home):**
   - Intro section is `display: none` (skipped)
   - Main work-dial is visible at large size
   - Nav items visible
   - No JS errors

### Reproduction steps

1. Navigate to `https://rhpcircle.webflow.io/`
2. Wait for RHP scripts to load (`window.RHP.scriptsOk === true`)
3. Verify pre-scroll state
4. Scroll down 1x viewport height (or `window.scrollTo({ top: window.innerHeight, behavior: 'auto' })`)
5. Wait 1.5s for scrub + morph complete
6. Verify post-scroll state
7. Click nav logo
8. Verify replay resets to pre-scroll state
9. Navigate to about page, then back to home
10. Verify Barba re-entry state

### Tier mapping

- **Tier 1 (auto):** Tests 1–5 in acceptance spec (pre-scroll, mid-scroll, post-scroll, console errors, Barba re-entry)
- **Tier 2 (CDN regression):** Registry entry runs all Tier 1 tests after deploy
- **Tier 3 (manual):**
  - Visual smoothness of the scroll-linked animation (easing feel, no jank)
  - Canvas tick crispness at large size (no pixellation)
  - Cross-browser: Safari scroll behaviour, Firefox Flip compatibility
  - Mobile: touch scroll scrub responsiveness
  - Replay animation fluidity (smooth scroll-to-top + re-scrub)

### Regression scope

- Barba transitions (home → about, home → case, case → home) must still work
- Work-dial interaction (hover, drag, sector switch) must work after morph complete
- Video playback (idle video, project videos) must work after morph complete
- Contact pullout must work on home page
- Custom cursor must work throughout

---

## Test Plan

### Tier 1 — Auto: Playwright local

Tests in `tests/acceptance/rhp-home-intro-scroll-choreography.spec.js`:

1. `#interactive-logo visible and large on load`
2. `.home-transition-dial visible and small on load`
3. `main work-dial has dial-small CSS vars on load`
4. `nav items hidden on load`
5. `step text hidden on load`
6. `scroll morph completes after full scroll`
7. `.section_home-intro hidden after morph`
8. `.rhp-home-ready present after morph`
9. `nav about and contact visible after morph`
10. `step text visible after morph`
11. `RHP.homeScrollMorph.complete is true after morph`
12. `no console errors on load`
13. `no console errors after morph`
14. `reduced motion: content visible without animation`
15. `Barba re-entry: intro skipped, dial visible`
16. `accessibility: no WCAG 2.1 AA violations (soft)`

### Tier 2 — Auto: CDN regression

Registered in `tests/registry.json` under slug `rhp-home-intro-scroll-choreography`.

### Tier 3 — Manual

- Animation smoothness and easing feel (subjective quality)
- Canvas tick crispness at large size (visual pixellation check)
- Safari scroll-linked animation behaviour
- Firefox `Flip.fit()` compatibility
- Mobile touch scroll scrub responsiveness
- Replay animation fluidity on nav logo click
- Visual continuity of the swap (transition dial → work dial should be imperceptible)

---

## Acceptance Tests

See `tests/acceptance/rhp-home-intro-scroll-choreography.spec.js` (generated separately).

| Test name | What it verifies |
|-----------|-----------------|
| `#interactive-logo visible and large on load` | Logo in `.home-intro_middle`, width > 50vw |
| `.home-transition-dial visible and small on load` | Dial canvas in `.home-intro_bottom`, width ~6rem |
| `main work-dial has dial-small CSS vars on load` | `--dial-live-width` is `var(--dial-small-width)` |
| `nav items hidden on load` | `.nav_logo-link`, `.nav_about-link`, `.nav_contact-link` not visible |
| `step text hidden on load` | `.heading-style-h7.is-step` opacity 0 |
| `scroll morph completes after full scroll` | `window.RHP.homeScrollMorph.complete === true` |
| `.section_home-intro hidden after morph` | `display: none` |
| `.rhp-home-ready present after morph` | Class on wrapper |
| `nav about and contact visible after morph` | toBeVisible() |
| `step text visible after morph` | opacity > 0 |
| `no console errors on load` | Zero pageerror events |
| `no console errors after morph` | Zero pageerror events through scroll |
| `reduced motion: content visible` | With `prefers-reduced-motion: reduce`, nav + dial visible |
| `Barba re-entry: intro skipped` | Navigate away + back, intro section `display: none`, dial visible |
| `accessibility` | axe-core WCAG 2.1 AA (soft assert) |

---

## Designer Prerequisites

These must be in place before JS can be tested:

1. `.section_home-intro` contains `.home-intro_top`, `.home-intro_middle`, `.home-intro_bottom` as children
2. `#interactive-logo` is the `.nav_logo-wrapper-2` SVG wordmark, placed inside `.home-intro_middle`
3. `.home-transition-dial` is an empty div inside `.home-intro_bottom` (transition-dial.js will create the canvas)
4. `.home-intro_top` is sized/positioned to match where the nav logo sits
5. `.home-intro_middle` is centred, full-width
6. `.home-intro_bottom` is positioned at the bottom of the section

**Status:** User confirms these are already in the updated HTML.
