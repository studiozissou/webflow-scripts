# fix-case-video-autoplay-barba

**Status:** Ready to Build
**Priority:** High — user-facing video playback regression
**Client:** Ready Hit Play
**Created:** 2026-04-21

## Problem

Videos inside `.section_case-video` (with controls) don't autoplay when scrolled into view after a Barba page transition. They remain paused at `currentTime: 0`.

## Root Cause

In `case-video-controls.js`, the `handleVisibility` IntersectionObserver callback (line 76-79) has a guard that prevents first-time play:

```js
if (!video._rhpAutoPaused) return;  // line 79
```

This guard means the observer **only resumes** videos that were previously auto-paused. After a Barba transition, new video elements have `_rhpAutoPaused = undefined`, so the observer returns early on first viewport entry — the video never plays.

### Why it works on direct page load
The browser's native `autoplay` attribute fires on initial page load. The observer then handles subsequent pause/resume cycles.

### Why `wireNoControlsSection` doesn't have this bug
It calls `tryPlay(video)` immediately (line 452), giving an initial play trigger. The observer then manages subsequent visibility changes.

### Why the handoff video works
The orchestrator explicitly calls `.play()` on the first case video (line 1578).

## Fix

Add first-viewport-entry play logic to `handleVisibility`. When a video enters the viewport for the first time (`_rhpAutoPaused` is undefined and `_rhpUserPaused` is not set), call `tryPlay()`.

### Code change

**File:** `case-video-controls.js`
**Location:** `handleVisibility` function, line 76-79 (the `isIntersecting` branch)

**Before:**
```js
/* --- scrolled back in --- */
if (video._rhpUserPaused) return;
if (!video._rhpAutoPaused) return;
```

**After:**
```js
/* --- scrolled back in --- */
if (video._rhpUserPaused) return;

/* First viewport entry (post-Barba): _rhpAutoPaused not yet set */
if (!video._rhpAutoPaused) {
  tryPlay(video).then(result => {
    if (result.ok) video._rhpGestureUnlocked = true;
  });
  return;
}
```

This mirrors the pattern in `wireNoControlsSection` (line 452-458).

## Files Affected

| File | Change | Lines |
|------|--------|-------|
| `case-video-controls.js` | Add first-entry play in `handleVisibility` | ~76-83 |

**Complexity:** Low (1 file, ~5 LOC added)

## Barba Impact

1. **Init/Destroy lifecycle** — No change. Existing `init(container)` / `destroy()` pattern is unaffected.
2. **State survival** — No new state. Uses existing `_rhpAutoPaused` and `_rhpGestureUnlocked` flags.
3. **Transition interference** — None. The fix only triggers when a video enters the viewport after the transition is complete.
4. **Re-entry correctness** — `destroy()` disconnects the observer and clears flags. On re-entry, `init()` creates a fresh observer. The new logic handles the fresh-element case correctly.
5. **Namespace scoping** — Only active on `case`/`work` namespaces (where `caseVideoControls.init()` is called by orchestrator).

## Verify Loop

### Pass/fail criteria
- After home → work Barba transition, scrolling a `.section_case-video` into view starts video playback
- After about → work Barba transition, same behaviour
- After case → case Barba transition, same behaviour
- Direct page load still works (browser `autoplay` + observer resume)
- No console errors on any transition path
- `_rhpUserPaused` still respected — if user pauses, scrolling out and back in does NOT auto-resume

### Reproduction steps
1. Navigate to `https://rhpcircle.webflow.io/`
2. Click a case study (triggers home → work Barba transition)
3. Scroll down to `.section_case-video` with controls
4. Observe: video should be playing when section is 30%+ visible

### Tier mapping
- **Tier 1 (auto):** `tests/acceptance/fix-case-video-autoplay-barba.spec.js` (already exists)
- **Tier 2 (CDN regression):** Registered in `tests/registry.json` as `fix-case-video-autoplay-barba`
- **Tier 3 (manual):** Safari/Firefox video autoplay policy differences; iOS gesture requirement

### Regression scope
- Viewport auto-pause must still work (scroll video out → pauses)
- User-pause flag must still be respected
- Volume fade on pause/resume must still work
- `wireNoControlsSection` videos unaffected (separate observer)
- Handoff video seek + play unaffected

## Test Plan

### Tier 1 — Auto: Playwright local
Existing `tests/acceptance/fix-case-video-autoplay-barba.spec.js` covers:
- `controlled videos play after home → work Barba nav`
- `controlled videos play after about → work Barba nav`
- `controlled videos play on direct page load` (regression)
- `no JS errors on home → work transition`

### Tier 2 — Auto: CDN regression
Already registered in `tests/registry.json` (id: `fix-case-video-autoplay-barba`).

### Tier 3 — Manual
- Safari: confirm autoplay policy doesn't block muted video after Barba transition
- iOS: confirm gesture-unlock flow still works (tap overlay → video plays)
- Firefox: confirm IntersectionObserver threshold 0.3 fires correctly

## Parallelisation Map

Single-file, ~5 LOC change. No parallelisation needed.

| Stream | Agent | Est. time | Est. tokens |
|--------|-------|-----------|-------------|
| 1. Implement fix | code-writer | 2 min | ~2k |
| 2. Run Tier 1 tests | qa | 3 min | ~3k |

Sequential: implement → test. No worktrees needed.
