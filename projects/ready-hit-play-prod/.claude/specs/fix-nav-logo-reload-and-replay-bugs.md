# Fix: Nav Logo Reload After Barba Re-entry + Replay Bugs

**Slug:** `fix-nav-logo-reload-and-replay-bugs`
**Project:** ready-hit-play-prod
**Type:** fix
**Priority:** P1
**Status:** Planning
**Created:** 2026-05-04

## Problem

Three bugs in the nav logo click behaviour on the homepage:

### Bug 1 — Logo click does nothing after Barba re-entry
**Repro:** home → about → home → click nav logo
**Expected:** Page reloads, morph restarts from scroll position 0
**Actual:** Nothing happens — click is swallowed silently

**Root cause:** `skipToEnd()` sets `complete = true` + `initialised = true` but never
assigns `_resizeHandler` (only set inside `init()` at line 615). `replay()` guard at
line 843 (`if (_replaying || !_resizeHandler) return`) early-exits because
`_resizeHandler` is null.

### Bug 2 — Spaces lost in logo text during replay on fresh visit
**Repro:** Fresh home load → scroll through morph → click nav logo (desktop)
**Expected:** Logo text reads "WITH GREAT IDEAS" during reverse morph
**Actual:** Logo text reads "WITHGREAT IDEAS" — inter-word spaces dropped

**Root cause:** `_splitLogoText()` calls `_revertLogoText()` which calls
`SplitText.revert()` on each split instance. SplitText's `revert()` doesn't always
restore whitespace between word-wrapped elements. When the text is immediately
re-split, the restored HTML has lost inter-word spaces.

### Bug 3 — Double dial visible after complex navigation + replay
**Repro:** home → work → about → home → click nav logo (if replay were working)
**Expected:** Single transition dial visible during morph replay
**Actual:** Two dials visible — work-dial ticks canvas + transition dial

**Root cause:** `replay()` adds `.is-intro-small` to `dialEl` which hides
`#dial_ticks-canvas` via `opacity: 0 !important` and resizes the dial to small.
But the work-dial's video layers and the dial component itself remain visible at
their current large size. The `.home-transition` overlay should cover them, but
after complex navigation paths, inline GSAP styles (from prior morph animations
or `clearProps` remnants) may prevent full visual coverage. Additionally,
`replay()` doesn't call `RHP.workDial.destroy()` or explicitly hide the work-dial
video layers.

## Approach — "Reload flag" (Approach A)

Two-pronged fix:

1. **After Barba re-entry → `window.location.reload()`** (all devices)
   - Track `_arrivedViaBarba` flag in `home-scroll-morph.js`
   - Set it `true` in `skipToEnd()`
   - Expose as getter on the public API
   - In `initNavLogoLink()` (orchestrator.js), check flag before replay branch
   - If true → `window.location.reload()` — clean, bulletproof

2. **On fresh visit → fix `replay()` bugs 2 + 3**
   - **Space fix:** Store original `innerHTML` of each target element before the
     first `SplitText` split. On revert, restore from snapshot instead of relying
     on `SplitText.revert()`.
   - **Double dial fix:** In `replay()`, explicitly hide work-dial video layers
     and call `RHP.workDial.setAttractionEnabled(false)` +
     `RHP.workDial.setInteractionUnlocked(false)` (already done) AND hide the
     `#dial_ticks-canvas` + `.dial_generic-video` via `gsap.set(..., { opacity: 0 })`
     before the reverse morph starts. Restore in `onComplete`.

## Files Affected

| File | Change | LOC est. |
|------|--------|----------|
| `home-scroll-morph.js` | Add `_arrivedViaBarba` flag, innerHTML snapshot, dial hide in replay | ~35 |
| `orchestrator.js` | Check `arrivedViaBarba` in `initNavLogoLink()` | ~5 |

**Total:** ~40 LOC across 2 files

## Implementation Details

### 1. `home-scroll-morph.js` — Flag + innerHTML snapshot

```js
// New module-scoped vars
let _arrivedViaBarba = false;
let _logoOriginalHTML = new Map(); // target element → original innerHTML

// In skipToEnd():
_arrivedViaBarba = true;

// In init():
_arrivedViaBarba = false; // fresh load, not Barba

// In destroy():
_arrivedViaBarba = false;
_logoOriginalHTML.clear();

// Public API addition:
get arrivedViaBarba() { return _arrivedViaBarba; }
```

### 2. `home-scroll-morph.js` — SplitText space fix

```js
// In _splitLogoText(), before splitting:
targets.forEach(t => {
  if (!_logoOriginalHTML.has(t)) {
    _logoOriginalHTML.set(t, t.innerHTML);
  }
});

// In _revertLogoText(), replace SplitText.revert() with innerHTML restore:
function _revertLogoText() {
  logoSplitData.forEach(d => {
    d.splits.forEach(s => { try { s.revert(); } catch (_) {} });
  });
  // Restore original HTML to fix SplitText whitespace loss
  _logoOriginalHTML.forEach((html, el) => {
    if (el && el.isConnected) el.innerHTML = html;
  });
  logoSplitData = [];
}
```

### 3. `home-scroll-morph.js` — Double dial fix in `replay()`

```js
// In replay(), after adding is-intro-small (line 861):
// Explicitly hide work-dial visuals that is-intro-small doesn't cover
const ticksCanvas = dialEl?.querySelector('#dial_ticks-canvas');
const genericVideo = dialEl?.querySelector('.dial_generic-video');
if (ticksCanvas) gsap.set(ticksCanvas, { opacity: 0 });
if (genericVideo) gsap.set(genericVideo, { opacity: 0 });

// In replay() onComplete, restore:
if (ticksCanvas) gsap.set(ticksCanvas, { clearProps: 'opacity' });
if (genericVideo) gsap.set(genericVideo, { clearProps: 'opacity' });
```

### 4. `orchestrator.js` — `initNavLogoLink()` reload check

```js
// Inside the click handler, replace the current morph.complete branch:
if (ns === 'home' && morph?.complete === true && typeof morph.replay === 'function') {
  // After Barba re-entry: always reload (all devices)
  if (morph.arrivedViaBarba) {
    window.location.reload();
    return;
  }
  // Touch devices (tablet & below): full reload to restart morph cleanly
  if (!window.matchMedia?.('(hover: hover)').matches) {
    window.location.reload();
    return;
  }
  morph.replay();
  return;
}
```

## Barba Impact

1. **Init/Destroy lifecycle** — No new DOM elements, listeners, or GSAP instances.
   The `_arrivedViaBarba` flag is a simple boolean. Existing `init()` and `destroy()`
   both reset it. No new lifecycle methods needed.

2. **State survival** — `_arrivedViaBarba` persists across the transition by design
   (set in `skipToEnd()` during Barba enter, read in `initNavLogoLink()` click handler
   after the transition completes). Cleared on `destroy()` and `init()`.

3. **Transition interference** — None. The flag check happens in the click handler,
   not during any transition animation. The `window.location.reload()` call is a
   clean exit from the SPA — Barba transitions are not involved.

4. **Re-entry correctness** — This is the core fix. After home → about → home,
   the flag is `true` and logo click reloads cleanly. After a fresh load, the flag
   is `false` and `replay()` runs with the space + double-dial fixes.

5. **Namespace scoping** — Only affects `home` namespace (logo click handler already
   gates on `ns === 'home'`).

## Task Breakdown

### Task 1: Add `_arrivedViaBarba` flag and public getter
- **File:** `home-scroll-morph.js`
- **Agent:** code-writer
- **Depends on:** nothing

### Task 2: Fix SplitText space loss with innerHTML snapshot
- **File:** `home-scroll-morph.js`
- **Agent:** code-writer
- **Depends on:** nothing (can parallel with Task 1)

### Task 3: Fix double dial in `replay()` by hiding work-dial visuals
- **File:** `home-scroll-morph.js`
- **Agent:** code-writer
- **Depends on:** nothing (can parallel with Tasks 1-2)

### Task 4: Check `arrivedViaBarba` in `initNavLogoLink()`
- **File:** `orchestrator.js`
- **Agent:** code-writer
- **Depends on:** Task 1 (needs the getter to exist)

### Task 5: Acceptance tests + registry
- **Agent:** code-writer (sonnet)
- **Depends on:** Tasks 1-4

## Parallelisation Map

| Stream | Tasks | Agent | Est. LOC |
|--------|-------|-------|----------|
| A | Tasks 1+2+3 (all in home-scroll-morph.js) | code-writer | ~30 |
| B | Task 4 (orchestrator.js) | code-writer | ~5 |
| C | Task 5 (tests) | code-writer | ~80 |

- **Stream A + B** can run in parallel (different files), but since changes are small,
  sequential in a single agent is simpler and avoids merge conflicts.
- **Stream C** depends on A+B completion.
- **Recommendation:** Sequential single-agent execution. Total change is ~40 LOC
  across 2 files — parallelisation overhead exceeds benefit.

## Verify Loop

### Pass/fail criteria

1. **Bug 1 fixed:** After home → about → home, clicking nav logo triggers
   `window.location.reload()` — page fully reloads, scroll morph starts from
   scroll position 0, single small dial visible in intro state.
2. **Bug 2 fixed:** On fresh home load, scroll through morph, click nav logo —
   during reverse morph, logo text reads "WITH GREAT IDEAS" (spaces preserved).
3. **Bug 3 fixed:** On fresh home load, scroll through morph, click nav logo —
   only the transition dial (teal tick ring) is visible during reverse morph.
   No second dial (work-dial canvas/video) visible.
4. **No console errors** on any of the above paths.
5. **Existing replay behaviour preserved:** On fresh visit, desktop logo click
   still triggers the smooth reverse-morph animation (not a reload).

### Reproduction steps

**Bug 1 verify:**
1. Navigate to `/` (fresh load)
2. Scroll through the morph until it completes
3. Click the about link in the nav
4. Wait for about page to load
5. Click the nav logo (navigates home via Barba)
6. Wait for home page to load (morph is skipped via `skipToEnd`)
7. Click the nav logo again
8. **Assert:** Page reloads (URL stays `/`, full DOMContentLoaded event fires)

**Bug 2 verify:**
1. Navigate to `/` (fresh load)
2. Scroll through the morph until it completes
3. Click the nav logo (triggers `replay()`)
4. **Assert:** During the reverse animation, logo text in `.is-about-upper` /
   `.is-about-lower` preserves spaces ("WITH GREAT" not "WITHGREAT")

**Bug 3 verify:**
1. Navigate to `/` (fresh load)
2. Scroll through the morph until it completes
3. Click the nav logo (triggers `replay()`)
4. **Assert:** Only one dial ring visible. `#dial_ticks-canvas` has `opacity: 0`.
   `.dial_generic-video` has `opacity: 0`. Only `.home-transition-dial` teal ring visible.

### Tier mapping

- **Tier 1 (auto):** Tests `logo-reload-after-barba-reentry`, `no-console-errors-barba-reentry`,
  `replay-text-spaces-preserved`, `replay-single-dial-visible`, `replay-still-works-fresh-visit`
- **Tier 2 (CDN regression):** Registered in `tests/registry.json`
- **Tier 3 (manual):**
  - Visual quality of reverse morph animation timing (subjective)
  - Cross-browser: Safari SplitText revert behaviour may differ
  - Mobile: touch device reload path unchanged but verify no regression

### Regression scope

- Barba transitions: home↔about, home↔work must still work
- Scroll morph forward play: must complete normally on fresh load
- Work-dial: must re-enable correctly after morph completes (both fresh + post-reload)
- Contact pullout: logo click while pullout is open (not affected, pullout is separate)

## Test Plan

### Tier 1 — Auto: Playwright local
- `logo-reload-after-barba-reentry`: Navigate home→about→home, click logo, assert page reload
- `no-console-errors-barba-reentry`: No JS errors during the above flow
- `replay-text-spaces-preserved`: Fresh load, complete morph, click logo, check text content
- `replay-single-dial-visible`: Fresh load, complete morph, click logo, check dial visibility
- `replay-still-works-fresh-visit`: Fresh load, complete morph, click logo, assert `.rhp-home-ready` removed (replay ran, not reload)
- `no-console-errors-replay`: No JS errors during fresh-visit replay

### Tier 2 — Auto: CDN regression
- Registered in `tests/registry.json` after implementation

### Tier 3 — Manual
- Reverse morph animation quality (easing, timing feel) — subjective
- Safari: SplitText whitespace behaviour post-revert
- Mobile: touch device reload path (already shipped, verify no regression)
- Complex path: home→work→about→home→logo click → reload works cleanly

## Acceptance Tests

See `tests/acceptance/fix-nav-logo-reload-and-replay-bugs.spec.js`

1. `logo click reloads after Barba re-entry (about→home)`
2. `logo click reloads after Barba re-entry (work→about→home)`
3. `no console errors during Barba re-entry reload flow`
4. `replay preserves text spaces on fresh visit`
5. `replay shows single dial on fresh visit`
6. `replay runs (not reload) on fresh visit desktop`
7. `no console errors during fresh-visit replay`
