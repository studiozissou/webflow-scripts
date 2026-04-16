# RHP — Home Intro Mobile/Tablet (≤991px)

**Slug:** `rhp-home-intro-mobile`
**Client:** Ready Hit Play
**Priority:** P1
**Status:** Planning
**Date:** 2026-04-15
**Approach:** B — Mobile morph fork inside `home-scroll-morph.js`

## Summary

Fix 6 issues with the home intro experience on mobile/tablet (≤991px):

1. **FG video visible on page load** — `dial_layer-fg` has no mobile CSS hide rule; shows through intro overlay
2. **Section height** — change `.section_home-intro` from 100svh to 250svh on mobile for more scroll space
3. **Logo fade-out** — fade logo out when section starts leaving viewport (bottom at bottom of viewport → section 100% out of top)
4. **Auto-engage ACTIVE** — dial transitions IDLE→ACTIVE automatically on morph complete (no tap needed)
5. **Dial position** — dial is slightly off-center on mobile initial load (image 2)
6. **BG video canvas** — blurred background canvas not appearing/playing during mobile scroll interaction

## Architecture

### Approach B: Mobile morph fork

Fork `buildTimeline()` inside `home-scroll-morph.js` with a separate `buildMobileTimeline()`. Desktop code completely untouched. 3 files affected:

| File | Changes |
|------|---------|
| `ready-hit-play.css` | Section height 250svh @ ≤991px; fg layer opacity:0 on home mobile |
| `home-scroll-morph.js` | New `buildMobileTimeline()` function; logo fade-out ScrollTrigger; auto-engage ACTIVE on complete |
| `work-dial.js` | Expose `forceActive()` public method (thin wrapper around private `setDialState(ACTIVE)` + `_mobileActiveLocked = true`) |

## Detailed Changes

### 1. CSS: Hide FG layer on mobile home

**File:** `ready-hit-play.css`
**Location:** After line 348 (the `@media (hover: hover)` block)

Add a mobile-specific rule to hide `dial_layer-fg` on home during intro:

```css
/* Mobile: hide fg layer on home until ACTIVE state (JS sets opacity:1 via setDialState).
   Desktop uses @media (hover: hover) above; mobile needs an explicit rule because
   hover:none devices don't match the desktop media query. */
@media (hover: none), (pointer: coarse) {
  .dial_component[data-dial-ns="home"] .dial_layer-fg {
    opacity: 0;
  }
}
```

This mirrors the desktop behavior at line 340-348 but for touch devices.

### 2. CSS: Section height 250svh on mobile

**File:** `ready-hit-play.css`
**Location:** New `@media (max-width: 991px)` block after the `.section_home-intro` rules (after line 411)

```css
@media (max-width: 991px) {
  main.main-wrapper:has([data-barba="container"][data-barba-namespace="home"]) .section_home-intro {
    height: 250svh;
    min-height: 250svh;
  }
}
```

### 3. JS: Fork buildTimeline for mobile

**File:** `home-scroll-morph.js`
**Location:** Inside `init()`, replace `buildTimeline()` call with branch

```js
// In init(), line ~446:
if (_isDesktop()) {
  buildTimeline();
} else {
  buildMobileTimeline();
}
// Resize handler also needs the branch:
_resizeHandler = _isDesktop() ? buildTimeline : buildMobileTimeline;
```

### 4. JS: buildMobileTimeline() — new function

**File:** `home-scroll-morph.js`

The mobile timeline does NOT use Flip.fit. Instead it:

a. **Word reveal** — reuses existing bell-curve SplitText pattern (lines 414-440) verbatim
b. **Logo fade-out** — separate ScrollTrigger: when bottom of section hits bottom of viewport, scrub logo opacity from 1→0. Finishes when section bottom exits top of viewport.
c. **Dial grows** — simple scale tween from small→large (no Flip, no position calc needed since dial stays centered)
d. **Step text** — fade in during last 10% (same as desktop)
e. **On complete** — calls `_applyMobileCompleteState()` which:
   - Calls `RHP.workDial.forceActive()` (auto-engage, no tap needed)
   - Sets `_mobileActiveLocked = true` inside work-dial
   - Locks scroll
   - Hides section
   - Shows nav via `.rhp-home-ready`

```js
function buildMobileTimeline() {
  _killScrub();

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;

  // Reset transforms
  gsap.set(dialWrapper, { clearProps: FLIP_CLEAR });
  gsap.set(logoEl, { clearProps: FLIP_CLEAR });

  if (prefersReduced()) {
    scrollTrigger = ScrollTrigger.create({
      trigger: sectionEl,
      start: 'top top',
      end: 'bottom top',
      onLeave: onMorphComplete,
      onEnterBack: onMorphReverse,
      invalidateOnRefresh: true
    });
    return;
  }

  // --- Mobile scrub timeline ---
  // Scrub over the full 250svh section height
  scrubTL = gsap.timeline({
    scrollTrigger: {
      trigger: sectionEl,
      start: 'top top',
      end: 'bottom top', // full section scroll
      scrub: 0.5,
      onLeave: onMorphComplete,
      onEnterBack: onMorphReverse,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        if (self.progress > 0 && logoSplitData.length) {
          _destroyLogoText();
        }
        if (RHP.transitionDial?.resize) RHP.transitionDial.resize();
      }
    }
  });

  // --- Dial: grow from small to large (centered, no position change) ---
  // Calculate scale factor from current (small) to target (large)
  const dialRect = dialWrapper.getBoundingClientRect();
  const REF_R = 253;
  const TICK_RING_EXPAND = 1 + 24 / REF_R + 22.51 / REF_R + 1.686 / REF_R;
  const dialComp = document.querySelector('.dial_component[data-dial-ns="home"]');
  let dTargetSize = 0;
  if (dialComp) {
    const raw = getComputedStyle(dialComp).getPropertyValue('--dial-large-width').trim();
    if (raw) {
      const tmp = document.createElement('div');
      tmp.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;width:' + raw;
      dialComp.appendChild(tmp);
      dTargetSize = tmp.offsetWidth * TICK_RING_EXPAND;
      dialComp.removeChild(tmp);
    }
  }
  if (!dTargetSize) dTargetSize = 1;
  const dSourceMax = Math.max(dialRect.width, dialRect.height) || 1;
  const dScale = dTargetSize / dSourceMax;

  // Dial grows (stays centered in .home-intro_bottom → .home-intro_middle)
  const midRect = middleSlot.getBoundingClientRect();
  const dx = (midRect.left + midRect.width / 2) - (dialRect.left + dialRect.width / 2);
  const dy = (midRect.top + midRect.height / 2) - (dialRect.top + dialRect.height / 2);

  scrubTL.to(dialWrapper, {
    x: dx, y: dy, scale: dScale,
    ease: 'power3.inOut', duration: 1
  }, 0);

  // --- Logo: fade out as section exits viewport ---
  // Start: bottom of section at bottom of viewport (progress ~0.6 for 250svh)
  // End: section fully out of viewport top
  // For a 250svh section: bottom reaches viewport bottom at ~60% scroll, fully out at 100%
  scrubTL.to(logoEl, {
    opacity: 0,
    ease: 'none',
    duration: 0.4 // last 40% of scroll
  }, 0.6);

  // --- Step text: fade in during last 10% ---
  if (stepTextEl) {
    scrubTL.to(stepTextEl, { opacity: 1, duration: 0.1, ease: 'power1.out' }, 0.9);
  }

  // --- Mobile word reveal (bell curve per word) ---
  if (logoSplitData.length) {
    logoSplitData.forEach(d => {
      const tgts = [d.upper, d.lower].filter(Boolean);
      gsap.set(tgts, { opacity: 0 });
      gsap.set(d.allWords, { yPercent: 100, opacity: 0 });
    });

    const SEG = 0.28;
    logoSplitData.forEach((data, i) => {
      const start = i * SEG;
      const mid = start + SEG / 2;
      const tgts = [data.upper, data.lower].filter(Boolean);

      scrubTL.to(tgts, { opacity: 1, duration: SEG / 2 }, start);
      scrubTL.to(data.allWords, {
        yPercent: 0, opacity: 1, duration: SEG / 2, ease: 'none'
      }, start);

      scrubTL.to(data.allWords, {
        yPercent: -100, opacity: 0, duration: SEG / 2, ease: 'none'
      }, mid);
      scrubTL.to(tgts, { opacity: 0, duration: SEG / 2 }, mid);
    });
  }

  scrollTrigger = scrubTL.scrollTrigger || null;
}
```

### 5. JS: Auto-engage ACTIVE on morph complete

**File:** `home-scroll-morph.js`
**Location:** `onMorphComplete()` (line 552)

After the existing `_applyCompleteState(true)` call, add:

```js
// Auto-engage ACTIVE state on mobile (no tap needed)
if (!_isDesktop() && RHP.workDial?.forceActive) {
  RHP.workDial.forceActive();
}
```

### 6. JS: Expose forceActive() on work-dial

**File:** `work-dial.js`
**Location:** Public API return object (~line 1628)

Add a new public method:

```js
forceActive() {
  if (!alive) return;
  _mobileActiveLocked = true;
  if (dialState !== DIAL_STATES.ACTIVE) {
    setDialState(DIAL_STATES.ACTIVE);
  }
}
```

This:
- Sets `_mobileActiveLocked = true` so IDLE revert is blocked
- Calls the private `setDialState(ACTIVE)` which handles bg canvas, fg layer, generic video transitions
- Solves both the bg canvas visibility bug and the auto-engage requirement

### 7. CSS: Dial position fix

**File:** `ready-hit-play.css`

The dial position issue on mobile (image 2) is caused by `.home-intro_bottom` using `position: absolute; bottom: 2rem` inside a 100svh section. With the move to 250svh, the bottom slot will be even further off. The fix:

On mobile, the `.home-intro_bottom` position needs to be relative to the viewport, not the 250svh section:

```css
@media (max-width: 991px) {
  .home-intro_bottom {
    position: fixed;
    bottom: 2rem;
  }
}
```

Or alternatively, keep it absolute but set `bottom: calc(250svh - 100svh + 2rem)` so it appears in the initial viewport. The exact approach depends on the layout intent — the fixed approach keeps the dial visible during scroll.

**Note:** The "slightly out of position" issue in image 2 may also be caused by the `getBoundingClientRect()` measurement happening before the section settles into layout. The `invalidateOnRefresh: true` + resize rebuild pattern should self-correct, but if the initial measurement is off, the dial will snap on first scroll. The `buildMobileTimeline` approach avoids Flip.fit entirely, so position is simpler.

## Barba Impact

1. **Init/Destroy lifecycle:** Changes are inside `home-scroll-morph.js` which already has proper `init(container)` / `destroy()`. The new `buildMobileTimeline()` uses the same `ctx = gsap.context()` scope and `_killScrub()` cleanup. `forceActive()` in work-dial is stateless (no listeners).

2. **State survival:** `_mobileActiveLocked` is module-scoped in work-dial.js and resets on `destroy()`. No cross-transition state to persist.

3. **Transition interference:** The logo fade-out and dial grow are inside the scrub timeline, which is killed in `_killScrub()` before any Barba transition. No z-index or opacity conflicts.

4. **Re-entry correctness:** `skipToEnd()` already handles Barba re-entry (home→about→home) by jumping to final state. The mobile path adds no new listeners that could leak. `_mobileActiveLocked` is set in work-dial `init()` scope and cleaned on `destroy()`.

5. **Namespace scoping:** Runs only on `home` namespace. The `:has([data-barba-namespace="home"])` CSS guard prevents the section from showing on about/case.

## Verify Loop

### Pass/fail criteria
- [ ] On mobile (≤991px), `dial_layer-fg` is NOT visible during intro (opacity: 0)
- [ ] `.section_home-intro` has computed height of 250svh on mobile
- [ ] Logo words animate in/out via scroll (bell-curve SplitText pattern)
- [ ] Logo fades out when section bottom reaches viewport bottom
- [ ] Logo is fully transparent when section is completely out of viewport
- [ ] Dial grows from small→large during scroll morph
- [ ] After morph completes, dial is in ACTIVE state (bg canvas visible + blurred, fg video visible)
- [ ] No tap required to engage ACTIVE state on mobile
- [ ] Dial is centered correctly on mobile at load (no position offset)
- [ ] BG video canvas is visible and playing with blur(40px) during ACTIVE state
- [ ] Generic (idle) video is hidden when ACTIVE state engages
- [ ] No console errors during the entire flow
- [ ] Barba re-entry (home→about→home) works: dial at large size, ACTIVE state, no stale listeners

### Reproduction steps
1. Open https://rhpcircle.webflow.io on a mobile viewport (375×812 or 768×1024)
2. Observe: FG video should NOT be visible during intro; generic video plays behind intro overlay
3. Scroll down slowly through the 250svh section
4. Observe: logo words reveal via SplitText; dial grows in center
5. When section bottom reaches viewport bottom, logo should start fading
6. Continue scrolling until section is fully out — logo should be opacity 0
7. Scroll morph completes: nav appears, dial is ACTIVE (blurred bg, fg video circle, step text)
8. Verify: no tap needed to see fg video and bg canvas

### Tier mapping
- Tier 1 (auto): `tests/acceptance/rhp-home-intro-mobile.spec.js` — element visibility, CSS states, console errors, responsive viewport
- Tier 2 (CDN regression): registered in `tests/registry.json`
- Tier 3 (manual): listed below

### Regression scope
- Desktop home intro must be UNCHANGED — verify Flip.fit morph still works at >991px
- Barba transitions: home→about, home→case, about→home, case→home must all work on mobile
- Work-dial state machine: IDLE→ACTIVE→ENGAGED→IDLE cycle must work after auto-engage
- Contact pullout panel must still open/close on mobile

## Test Plan

### Tier 1 — Auto: Playwright local
Tests in `tests/acceptance/rhp-home-intro-mobile.spec.js`:
1. FG layer hidden on mobile home load (opacity: 0)
2. Section height is 250svh on mobile viewport
3. No console errors on mobile home load
4. Dial ACTIVE state after scroll morph (bg canvas opacity: 1, fg layer opacity: 1)
5. Desktop home intro unchanged (Flip.fit morph, 100svh section)
6. Reduced motion: content visible without animation on mobile
7. Barba re-entry: home→about→home clean on mobile

### Tier 2 — Auto: CDN regression
- Entry in `tests/registry.json` with id `rhp-home-intro-mobile`

### Tier 3 — Manual
- **Logo word animation timing feel** — SplitText bell-curve stagger tuning (subjective quality)
- **Logo fade-out smoothness** — opacity transition during section exit (animation feel)
- **Dial position centering** — sub-pixel alignment verification on actual devices
- **BG canvas blur quality** — visual blur rendering on iOS Safari and Android Chrome
- **iOS video autoplay** — requires real device testing (Playwright only runs Chromium)
- **Safari scroll bounce** — scroll-lock behavior at 250svh end on Safari mobile

## Parallelisation Map

| Stream | Task | Agent | Est. LOC | Dependencies |
|--------|------|-------|----------|--------------|
| A | CSS: fg hide + section height | code-writer | ~20 | None |
| B | JS: buildMobileTimeline() | code-writer | ~80 | None (parallel with A) |
| C | JS: forceActive() + auto-engage | code-writer | ~15 | None (parallel with A, B) |
| D | JS: dial position fix | code-writer | ~10 | Depends on A (section height) |
| E | Acceptance tests | code-writer | ~60 | Depends on A, B, C |
| F | QA + regression | qa | — | Depends on E |

**Recommendation:** Streams A, B, C can run in parallel. D depends on A. E depends on all code streams. Use sequential execution (single agent) for simplicity — total ~185 LOC across 3 files is manageable in one pass.

## Tasks

1. **CSS fixes** — Add mobile fg hide rule + 250svh section height + dial position fix
2. **buildMobileTimeline()** — New function in home-scroll-morph.js with mobile scroll morph, logo fade, word reveal
3. **forceActive()** — Expose public method on RHP.workDial; call from onMorphComplete on mobile
4. **Acceptance tests** — Write Playwright tests for mobile viewport
5. **QA verification** — Run tests, check regression on desktop
