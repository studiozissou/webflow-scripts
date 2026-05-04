# Fix: Dial Step Text Reset + Work→About Double Transition

**Slug:** `fix-dial-step-text-and-work-to-about`
**Project:** ready-hit-play-prod
**Type:** bug
**Priority:** P1
**Created:** 2026-05-04

## Problem

Two related bugs on the RHP site:

### Bug 1 — Stale step text on Barba re-entry
**Repro:** home → work → about → home → hover dial → move cursor away (IDLE)
**Expected:** Step text shows "Great stories made undeniable"
**Actual:** Step text shows the title of the last visited project page

**Root cause:** `origStepText` is captured from `stepEl.textContent.trim()` at `init()` time (`work-dial.js:206`). The `[data-text="step"]` element persists outside the Barba container. When the dial is ACTIVE, `scrambleStep()` writes a project title to `stepEl.textContent`. On `destroy()`, the cleanup does NOT reset the text (lines 217-221 only kill tweens and remove `.is-scrambling`). On re-entry, `init()` captures the stale project title as `origStepText`, so IDLE mode scrambles back to that instead of the real default.

### Bug 2 — Double transition work→about
**Repro:** Navigate from any case/work page to the about page
**Expected:** Single curtain slide transition (same visual as home→about)
**Actual:** Two sequential transitions — dial shrinks back (0.8s), then curtain slides in

**Root cause:** The `work-to-about` transition (`orchestrator.js:1900-1933`) runs `runDialShrinkAnimation()` in `leave()` then `homeAboutSlide.leaveHomeToAbout()` in `enter()`. The home→about transition (`orchestrator.js:1844-1867`) has an empty `leave()` and only runs the curtain in `enter()`.

## Approach: Persistent Global + Curtain-Only (Hybrid A+B)

### Bug 1 Fix — `RHP._stepDefault`

1. On first `init()`, store the original step text on `RHP._stepDefault` (persists across Barba transitions since `window.RHP` is a global singleton):
   ```js
   // work-dial.js:206, replace origStepText capture
   if (!RHP._stepDefault) RHP._stepDefault = stepEl ? stepEl.textContent.trim() : '';
   const origStepText = RHP._stepDefault;
   ```

2. In `destroy()` cleanup, reset `stepEl.textContent` for defense-in-depth:
   ```js
   // work-dial.js: add to cleanup.push block near line 217
   cleanup.push(() => {
     if (stepEl && RHP._stepDefault) stepEl.textContent = RHP._stepDefault;
   });
   ```

**Why `RHP._stepDefault`:** The `RHP._` prefix pattern is already established in the codebase (`RHP._dialIntroProgress` at work-dial.js:1265, 1285, 1359). The value persists across Barba transitions because `window.RHP` is initialized once with a `typeof === 'undefined'` guard. On hard reload, it re-reads from the fresh DOM — correct behaviour.

### Bug 2 Fix — Curtain-only work→about

Rewrite the `work-to-about` transition to match `home-to-about`:

```js
{
  name: 'work-to-about',
  from: { namespace: ['case', 'work'] },
  to: { namespace: ['about'] },
  beforeLeave(data) {
    RHP.homeAboutSlide?.resetCurtain?.();
    RHP.lenis?.stop();
    const dialFg = document.querySelector('.dial_layer-fg');
    if (dialFg) dialFg.scrollTop = 0;

    const ns = data.current?.namespace || currentNs;
    if (ns && RHP.views[ns]?.destroy) RHP.views[ns].destroy();
    RHP.workDial?.destroy?.();
    RHP.videoLoader?.destroy?.();

    // Snap dial to home-idle state (invisible behind curtain)
    setDialToHomeState();
  },
  leave() {},  // No animation — curtain drives everything
  enter(data) {
    window.scrollTo(0, 0);
    return RHP.homeAboutSlide?.leaveHomeToAbout
      ? RHP.homeAboutSlide.leaveHomeToAbout(data)
      : undefined;
  },
  afterEnter(data) {
    runAfterEnter(data);
  }
}
```

**Key changes from current:**
- `leave()` is now empty (was `await runDialShrinkAnimation()`)
- `beforeLeave` calls `setDialToHomeState()` instead of `setDialNs('home')` — this does `clearProps: 'all'`, removes `.is-case-study`/`.no-scrollbar`, re-asserts centering, and restores FG overlay opacity
- `afterEnter` no longer needs to clean up shrink animation artifacts

## Files Affected

| File | Lines | Change |
|------|-------|--------|
| `work-dial.js` | 206 | Replace `origStepText` capture with `RHP._stepDefault` |
| `work-dial.js` | ~217 | Add `stepEl.textContent` reset to cleanup array |
| `orchestrator.js` | 1900-1933 | Rewrite `work-to-about` transition (remove shrink, add `setDialToHomeState()`) |

**Total LOC changed:** ~20 lines across 2 files.

## Barba Impact

1. **Init/Destroy lifecycle** — No new DOM elements, listeners, or timelines. Bug 1 adds a cleanup step to the existing `destroy()` path. Bug 2 removes an animation from `leave()`.
2. **State survival** — `RHP._stepDefault` persists across all transitions (intentional). No new state that needs clearing.
3. **Transition interference** — Bug 2 removes the dial shrink animation, which eliminates a potential source of transition interference. The curtain covers the viewport before dial state changes are visible.
4. **Re-entry correctness** — Bug 1 fix ensures `origStepText` is always correct on re-entry. Bug 2 uses `setDialToHomeState()` which leaves the dial in the correct state for about→home return.
5. **Namespace scoping** — No change to namespace scoping. `setDialToHomeState()` already calls `setDialNs('home')`.

## Verify Loop

### Pass/fail criteria
- **Bug 1:** After home→work→about→home, moving cursor away from dial shows "Great stories made undeniable" (not a project title)
- **Bug 1:** After home→about→home, step text is still "Great stories made undeniable"
- **Bug 2:** work→about shows a single curtain slide (no dial shrink visible)
- **Bug 2:** After work→about→home, dial is correctly positioned and interactive
- **Regression:** No console errors on any transition path
- **Regression:** home→work transition still shows dial expand animation
- **Regression:** work→home transition still shows dial shrink animation

### Reproduction steps
1. Navigate to https://rhpcircle.webflow.io
2. Wait for intro to complete
3. Hover over dial to activate a project
4. Click to navigate to a case study (home→work)
5. Click About link (work→about) — should see ONE curtain transition
6. Click logo/home link (about→home)
7. Move cursor away from dial — step text should read "Great stories made undeniable"

### Tier mapping
- Tier 1: Automated checks for step text content, console errors, Barba round-trips
- Tier 2: Registry entry for CDN regression
- Tier 3: Manual — visual feel of curtain timing, animation smoothness

### Regression scope
- home→work expand animation must still work
- work→home shrink animation must still work
- about→home curtain-out must still work
- home→about curtain-in must still work
- Case study content loads correctly after work→about→home→work

## Parallelisation Map

Single stream — both fixes are in 2 files with 20 LOC total. No parallelisation needed.

| Task | Agent | Est. tokens | Sequential? |
|------|-------|-------------|-------------|
| Fix work-dial.js (Bug 1) | code-writer | ~2k | Yes (first) |
| Fix orchestrator.js (Bug 2) | code-writer | ~3k | Yes (after Bug 1) |
| Run acceptance tests | qa | ~5k | Yes (after both) |

## Acceptance Tests

See `tests/acceptance/fix-dial-step-text-and-work-to-about.spec.js`

### Tier 1 — Auto: Playwright local
- `step text shows default after home→work→about→home`
- `step text shows default after home→about→home`
- `work→about: no dial shrink visible (single transition)`
- `work→about→home: dial is interactive`
- `no console errors on work→about path`
- `no console errors on full round-trip`
- `reduced motion: step text correct`

### Tier 2 — Auto: CDN regression
- Registered in `tests/registry.json` as `fix-dial-step-text-and-work-to-about`

### Tier 3 — Manual
- Visual feel of work→about curtain timing (subjective animation quality)
- Cross-browser: Safari work→about transition (Playwright only runs Chromium)
- Mobile: work→about transition on iOS (touch navigation)
