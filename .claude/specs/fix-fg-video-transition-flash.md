# Fix: fg-video flash during work→home and work→work transitions

**Slug:** `fix-fg-video-transition-flash`
**Client:** Ready Hit Play
**Status:** Partial — work→work fixed, work→home unsolved
**Created:** 2026-04-23

## Problem

The foreground video (`#fg-video-wrap > .dial_fg-video`) briefly disappears or goes transparent during:

1. **Work → Home** transitions (case study back to homepage dial)
2. **Work → Work** transitions (navigating between case studies)

## Root Cause

### Work → Home

The flash is a 1-frame opacity gap caused by this sequence in `runAfterEnter()`:

1. `setDialNs('home')` (line 1490) — CSS `[data-dial-ns="home"] .dial_layer-fg { opacity: 0 }` becomes applicable
2. `clearProps: 'all'` on `dialFg` (line 1526) — removes inline `opacity: 1` that was masking the CSS rule → **video disappears**
3. Mobile guard (line 1557-1558) — explicitly sets `dialFg` opacity to 0 ("prevent stale video flash")
4. One rAF later: `resume()` → `setDialState(ACTIVE)` → `gsap.to(dialFg, { opacity: 1, duration: 0.3 })` — **video fades back**

The 1-frame gap between steps 2-3 and step 4 is the flash.

### Work → Work

Falls through to the default `rhp-core` Barba transition which:

1. Calls `RHP.workDial?.destroy?.()` — tears down suspended work-dial entirely
2. Empty `leave()` — no animation
3. `afterEnter` re-inits everything from scratch

The full destroy/re-init cycle causes a visible video teardown.

## Solution (Approach A: Patch opacity gap + add work→work transition)

### Change 1: Re-assert opacity after clearProps (orchestrator.js)

After `clearProps: 'all'` on `dialFg` at line 1526, immediately re-assert `opacity: 1` when returning to home with a suspended work-dial:

```javascript
// Line ~1527 (after clearProps)
if (ns === 'home' && RHP.workDial?.isSuspended?.()) {
  window.gsap.set(dialFg, { opacity: 1 });
}
```

### Change 2: Remove mobile opacity:0 guard (orchestrator.js)

Remove lines 1557-1558 that force `dialFg` opacity to 0 on mobile during home entry from a suspended state. The "stale video" they prevent IS the video we want to show (continuity).

Before:
```javascript
if (dialFg && window.gsap && RHP.workDial?.isSuspended?.()) {
  window.gsap.set(dialFg, { opacity: 0 });
}
```

After: Remove this block entirely.

### Change 3: Add work→work Barba transition (orchestrator.js)

Add a dedicated transition before the default `rhp-core` fallback (~line 1920):

```javascript
/* ---- Work -> Work (case to case) ---- */
{
  name: 'work-to-work',
  from: { namespace: ['case', 'work'] },
  to: { namespace: ['case', 'work'] },

  beforeLeave(data) {
    RHP.lenis?.stop();
    // Scroll to top so fg-video is visible for continuity
    const dialFg = document.querySelector('.dial_layer-fg');
    if (dialFg) dialFg.scrollTop = 0;

    const ns = data.current?.namespace || currentNs;
    // Destroy outgoing case view (ScrollTrigger, Lenis, controls)
    // but do NOT destroy work-dial — leave it suspended
    if (ns && RHP.views[ns]?.destroy) RHP.views[ns].destroy();
    RHP.videoLoader?.destroy?.();
  },

  leave() {
    // No animation — instant swap, fg-video persists in #fg-video-wrap
  },

  enter() {
    window.scrollTo(0, 0);
  },

  afterEnter(data) {
    // runAfterEnter handles case/work ns:
    // - sets dialFg opacity:1
    // - calls _updateCaseVideos() (swaps src with frame overlay for continuity)
    // - starts case BG draw
    // - inits new case view
    runAfterEnter(data);
  }
}
```

Key differences from the default `rhp-core` fallback:
- Does NOT call `RHP.workDial?.destroy?.()` — leaves work-dial suspended
- `_updateCaseVideos()` in `runAfterEnter` handles video source swap with canvas frame overlay for seamless continuity

## Files Affected

| File | Lines | Change |
|------|-------|--------|
| `orchestrator.js` | ~1527 | Add `gsap.set(dialFg, { opacity: 1 })` after clearProps for home+suspended |
| `orchestrator.js` | 1552-1559 | Remove mobile opacity:0 guard block |
| `orchestrator.js` | ~1920 | Add `work-to-work` Barba transition before default fallback |

## Barba Impact

1. **Init/Destroy lifecycle** — No new DOM elements or listeners. Existing `_updateCaseVideos()` handles video swap. Case view `destroy()` / `init()` unchanged.
2. **State survival** — Work-dial stays suspended across work→work (already suspended from home→work). `RHP.videoState.lastCaseIndex` updated by `runAfterEnter`.
3. **Transition interference** — No new animations. The fg-video wrap stays at opacity:1 throughout. `_updateCaseVideos()` uses a canvas frame overlay to mask the source swap.
4. **Re-entry correctness** — home→work→work→home path: work-dial resumes correctly via existing `resume()` path. home→work→work→work: each work→work transition destroys/re-inits case view cleanly.
5. **Namespace scoping** — `work-to-work` only matches `from: ['case', 'work'] → to: ['case', 'work']`. Does not affect home or about transitions.

## Verify Loop

### Pass/fail criteria

1. **Work → Home:** fg-video stays visible at all times during dial shrink animation. No opacity flash, no transparent frame.
2. **Work → Work:** fg-video stays visible during case-to-case navigation. Old video frame shows as overlay until new video loads and plays.
3. **Home → Work:** existing behavior unchanged — dial expands, fg-video morphs from circle to rectangle.
4. **No console errors** on any transition path.
5. **Mobile:** same behavior as desktop — no flash on work→home.

### Reproduction steps

1. Navigate to https://rhpcircle.webflow.io/
2. Hover/tap the dial to activate a case study, click through to work page
3. Click the back/logo link to return home — **fg-video should stay visible throughout shrink**
4. Repeat step 2, then navigate to a different case study link — **fg-video should persist**
5. Test on mobile viewport (390x844) for both paths

### Tier mapping

- Tier 1: Playwright tests for DOM state (fg-video opacity, element visibility)
- Tier 2: Registry entry for regression
- Tier 3: Manual visual check for animation smoothness (frame-level timing)

### Regression scope

- Home → Work transition must still work (dial expand)
- Home → About, About → Home transitions unaffected
- Work-dial suspend/resume cycle still functions
- Video handoff (currentTime persistence) still works
- `_updateCaseVideos` frame overlay still appears and removes correctly

## Task Breakdown

1. **Patch opacity gap in runAfterEnter** — Add `gsap.set(dialFg, { opacity: 1 })` after clearProps when `ns === 'home'` and work-dial is suspended. Remove mobile opacity:0 guard.
   - Agent: code-writer
   - Est: ~10 LOC

2. **Add work→work Barba transition** — Insert new transition before default fallback.
   - Agent: code-writer
   - Est: ~25 LOC

3. **Verify + test** — Run existing smoke tests, add acceptance tests for the two transition paths.
   - Agent: qa

## Parallelisation Map

- Tasks 1 and 2 are in the same file (orchestrator.js) — **sequential** (same file, risk of merge conflicts)
- Task 3 depends on 1+2 — **sequential** (needs code changes to test)
- Recommendation: sequential, no worktrees needed, single code-writer agent

## Acceptance Tests

See `tests/acceptance/fix-fg-video-transition-flash.spec.js`

| Test | Type |
|------|------|
| fg-video visible during work→home shrink | Tier 1 |
| fg-video visible during work→work swap | Tier 1 |
| no console errors on work→home | Tier 1 |
| no console errors on work→work | Tier 1 |
| home→work still works after fix | Tier 1 |
| visual smoothness of transition | Tier 3 (manual) |
