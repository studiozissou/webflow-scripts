# fix-autoplay-fallback-mobile

> Mobile autoplay fallback: detect `.play()` rejection and show tap-to-play UI

**Priority:** P1
**Status:** Planning
**Approach:** B — Inline detection per module (no new file)
**Created:** 2026-03-26

---

## Summary

When a browser blocks video autoplay (iOS Low Power Mode, data saver, corporate MDM), RHP currently swallows the `.play()` rejection silently — videos stay black with no user feedback. This spec adds detection at each `.play()` call site and shows contextual tap-to-play UI:

1. **Homepage** — "Step into the circle" becomes "Tap here to play". Ticks + nav animate normally. Tap starts fg/bg videos. Text reverts to "Step into the circle" after tap (stays visible in IDLE, fades on IDLE→ACTIVE dial state change as normal).
2. **Case page videos WITH controls** — control UI stays visible until play is tapped, then uses existing timed auto-hide.
3. **Case page videos WITHOUT controls** (RHP-managed `.video-cover` only, NOT Webflow `.w-background-video`) — SVG play button overlay centred on video. Tap starts video, overlay disappears.
4. **Viewport auto-pause** — continues working on all pages. Once a user taps to play, auto-resume on scroll-back (no re-tap needed).

---

## Trigger condition

Detect actual `.play()` promise rejection (`NotAllowedError`), not touch device detection. Most mobile users with muted autoplay will never see fallback UI.

---

## Architecture

### Shared pattern (duplicated per module, ~5 LOC each)

```js
/** Try to play a video. Returns { ok, error }. */
async function tryPlay(video) {
  try {
    await video.play();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e };
  }
}
```

Each module copies this pattern inline. No shared module, no load-order dependency.

### Per-video gesture unlock tracking

Each module tracks unlocked videos locally:
- `work-dial.js`: boolean `_autoplayUnlocked` flag (only one set of dial videos)
- `case-video-controls.js`: `video._rhpGestureUnlocked = true` property per element
- `orchestrator.js`: `video._rhpGestureUnlocked = true` for no-controls videos

On Barba destroy, video elements are removed — stale flags go with them (correct behaviour: fresh page = fresh detection).

---

## File changes

### 1. `home-intro.js` (~35 LOC delta)

**`fadeInIntroVideo()` (line 106–126):**
- Replace bare `introVideo.play()` with `tryPlay(introVideo)`
- On rejection:
  - Get `[data-text="step"]` element
  - Save original `aria-label` value
  - Set `textContent = "Tap here to play"` (clear SplitText children, set plain text)
  - Update `aria-label` to "Tap here to play"
  - Add `click` listener on `.dial_layer-fg` (once)
  - On tap: call `introVideo.play()`, restore original step text content + aria-label, resolve the fade-in promise
- On success: proceed as normal (existing flow)

**Sequence change:**
- Current: step text → ticks → video → nav
- With autoplay blocked: step text → ticks → video attempt fails → text swaps to "Tap here to play" → nav animates in → user taps → video plays → text reverts to "Step into the circle" (stays visible in IDLE, fades on IDLE→ACTIVE state change as normal)

The `fadeInIntroVideo` promise resolves either way (success or after showing tap prompt), so ticks + nav proceed regardless.

**Destroy cleanup:** Remove click listener via AbortController if user never tapped.

### 2. `work-dial.js` (~30 LOC delta)

**`enforceVideoPolicy()` (line 51–71):**
- Replace the inner `tryPlay` one-liner with the async version
- On rejection of ANY video: set `_autoplayBlocked = true` module flag
- This flag is checked by `playFg()` and generic video play calls

**`playFg()` (line 507–518):**
- No return type change needed — keep void
- After `fg.play().catch()`, check if `_autoplayBlocked` is true
- If blocked and not `_autoplayUnlocked`: don't retry (video stays paused, step text already shows "Tap here to play" via home-intro)

**Generic video play (line 226):**
- Wrap in `tryPlay()`, set `_autoplayBlocked` on rejection

**Key insight:** work-dial doesn't need its own tap UI — home-intro.js owns the step text and dial-fg tap listener. work-dial just needs to know autoplay is blocked so it doesn't keep retrying `.play()` in loops.

**Tab visibility resume (`onVis`, line 938):**
- If `_autoplayUnlocked`, call `play()` normally
- If still blocked, skip play attempts

### 3. `case-video-controls.js` (~45 LOC delta)

**`wireSection()` — videos WITH controls:**

In the mobile path (line 277–305):
- Replace the initial `resetIdleTimer(3000)` with a `tryPlay()` check on section init
- On rejection:
  - Set `controlsHidden = false`
  - Call `showControls()` — controls stay visible indefinitely
  - Do NOT start the idle timer
  - The existing `.play-pause` click handler (line 99) already calls `video.play()` — wrap it with `tryPlay()` too
  - On successful play from tap: set `video._rhpGestureUnlocked = true`, start idle timer (`resetIdleTimer(3000)`)
- On success: proceed as normal (start 3000ms idle timer)

**`handleVisibility()` — viewport auto-pause (line 39–81):**

Scroll-back resume path (line 71):
- If `video._rhpGestureUnlocked === true`: call `video.play()` (auto-resume, existing behaviour)
- If NOT unlocked (user never tapped): keep video paused, ensure controls visible via `showControls()`
- This preserves the "once tapped, auto-resume" requirement

**New: `wireNoControlsSection()` function (~40 LOC):**

For `.section_case-video` elements where `wireSection()` would early-return (no `.case-video_control-wrapper`), plus `.section_case-video-laptop` videos:
- Query `.video-cover` inside the section
- Call `tryPlay(video)` on init
- On rejection:
  - Create SVG play overlay (the user's provided SVG) as a `<div>` positioned absolute, centred, `pointer-events: auto`
  - Style: `color: white`, `width: 52px`, `height: 51px`, `cursor: pointer`, `z-index: 5`
  - Add to the video's positioned parent (`.dial_video-wrap.is-case-study` or similar)
  - Add CSS class `.rhp-play-overlay` for styling
  - On click: `video.play()`, set `video._rhpGestureUnlocked = true`, remove overlay with `gsap.to(opacity: 0, 0.3s)` then `el.remove()`
- Attach `IntersectionObserver` (same 0.3 threshold as existing) for viewport auto-pause:
  - Scroll out: pause
  - Scroll back: if `_rhpGestureUnlocked`, auto-resume; else show overlay again
- On success: no overlay needed

**Destroy:** Remove overlays, disconnect observers.

### 4. `orchestrator.js` (~20 LOC delta)

**Case page video autoplay (lines 1696–1704):**
- Currently: `document.querySelectorAll('.section_case-video video').forEach(v => v.play().catch(() => {}))`
- Change: call `RHP.caseVideoControls.wireNoControlsSection(section)` for sections without control wrappers
- This delegates autoplay detection + overlay to case-video-controls.js

**No other changes needed in orchestrator** — home-intro.js and work-dial.js handle homepage, case-video-controls.js handles case pages.

### 5. `ready-hit-play.css` (~20 LOC)

```css
/* Autoplay fallback — play overlay for no-controls videos */
.rhp-play-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  pointer-events: auto;
  cursor: pointer;
}

.rhp-play-overlay svg {
  width: 52px;
  height: 51px;
  color: #fff;
  opacity: 0.9;
  transition: opacity 0.2s;
}

.rhp-play-overlay:hover svg,
.rhp-play-overlay:active svg {
  opacity: 1;
}

/* Step text tap-to-play state */
[data-text="step"].is-tap-to-play {
  cursor: pointer;
}
```

---

## Barba Impact

1. **Init/Destroy lifecycle:** `case-video-controls.wireNoControlsSection()` adds DOM elements (play overlays) and IntersectionObservers. These MUST be cleaned up in `destroy()`. The existing `case-video-controls.destroy()` already kills wired sections — extend to include no-controls sections.

2. **State survival:** No cross-transition state needed. `_rhpGestureUnlocked` is per-element and dies with the element on Barba swap. Each page entry re-detects autoplay status — correct, because browser autoplay policy can change between navigations (e.g., user interacted).

3. **Transition interference:** Play overlays live inside `.section_case-video` (inside Barba container) — no z-index conflict with leave/enter transitions. Homepage step text swap happens inside `.dial_component` which persists outside Barba container, but text is restored on tap or `destroy()`.

4. **Re-entry correctness:** home → about → home: `home-intro.js` only runs on first DOMContentLoaded (not Barba re-enter). On re-enter, `work-dial.init()` re-runs `enforceVideoPolicy()` which re-detects autoplay. If still blocked, work-dial's `_autoplayBlocked` flag stays true. The step text is handled by `home-intro.skip()` on re-enter which resets to "Step into the circle".

5. **Namespace scoping:**
   - `home-intro.js` — home only (guarded by `hasRun` + only called from home boot)
   - `work-dial.js` — home only (init only on home namespace)
   - `case-video-controls.js` — case only (init only on case namespace)

---

## Verify Loop

### Pass/fail criteria

| Check | Type | Condition |
|-------|------|-----------|
| Homepage: step text shows "Tap here to play" when autoplay blocked | Functional | `[data-text="step"]` textContent === "Tap here to play" |
| Homepage: tap on dial fg starts video | Functional | `.dial_fg-video` is playing after click on `.dial_layer-fg` |
| Homepage: step text reverts to "Step into the circle" after tap | Functional | `[data-text="step"]` textContent === "Step into the circle" |
| Homepage: ticks + nav animate even when blocked | Functional | `#dial_ticks-canvas` visible AND `.nav` visible while step text shows tap prompt |
| Case controls: UI visible when autoplay blocked | Functional | `.case-video_control-wrapper` opacity === 1 before user interaction |
| Case controls: tap play starts video + hides UI after 3s | Functional | `.play-pause .is-play` display changes, controls hide after 3000ms |
| Case no-controls: SVG overlay visible when blocked | Functional | `.rhp-play-overlay` attached and visible |
| Case no-controls: tap overlay starts video + removes overlay | Functional | Video playing, `.rhp-play-overlay` removed from DOM |
| Viewport auto-pause: video pauses on scroll out | Functional | Video paused when `IntersectionObserver` reports <0.3 visible |
| Viewport auto-resume: video resumes on scroll back after tap | Functional | Video playing after scrolling back into view (no overlay shown) |
| No console errors on any page | Functional | Zero `pageerror` events |
| Barba re-entry: clean state after home→about→home | Functional | No stale tap listeners, no orphaned overlays |

### Reproduction steps

1. **Simulate autoplay block:** In Playwright, use `page.addInitScript` to override `HTMLVideoElement.prototype.play` to reject with `NotAllowedError`
2. **Homepage:** Navigate to `/`, wait for RHP init, check step text content
3. **Homepage tap:** Click `.dial_layer-fg`, verify video plays, verify step text reverts
4. **Case page:** Navigate to `/work/microsoft`, check controls visible on `.section_case-video`
5. **Case no-controls:** Check `.rhp-play-overlay` on laptop mockup video sections
6. **Scroll test:** Scroll `.section_case-video` out of viewport, check video paused; scroll back, check resumed

### Tier mapping

- **Tier 1 (auto, local):** All pass/fail criteria above — Playwright can simulate autoplay block via `addInitScript`
- **Tier 2 (auto, CDN):** Same tests run post-deploy from registry
- **Tier 3 (manual):** Real iOS Low Power Mode testing on physical device; Safari autoplay behaviour; real gesture unlock verification

### Regression scope

- Barba transitions (home↔about↔case) — must not break
- Existing desktop autoplay (should never trigger fallback) — regression test
- `case-video-controls` existing functionality (progress bar, mute, auto-hide on desktop)
- `home-intro` animation sequence on desktop
- `video-loader.js` spinner should still appear during buffering (orthogonal to autoplay block)

---

## Task breakdown

### Task 1: Homepage autoplay detection + tap-to-play
**File:** `home-intro.js`
**Agent:** code-writer
**Est:** ~35 LOC
**Dependencies:** None

1. Add `tryPlay()` helper at top of IIFE
2. Modify `fadeInIntroVideo()` to use `tryPlay()` + swap step text on rejection
3. Add tap listener on `.dial_layer-fg` (AbortController-guarded)
4. On tap: play video, restore step text to "Step into the circle", resolve fade-in promise
5. Ensure sequence continues (ticks + nav) regardless of autoplay result
6. Cleanup in destroy

### Task 2: work-dial autoplay awareness
**File:** `work-dial.js`
**Agent:** code-writer
**Est:** ~30 LOC
**Dependencies:** Task 1 (shared understanding of step text state)

1. Add `tryPlay()` helper + `_autoplayBlocked` + `_autoplayUnlocked` flags
2. Modify `enforceVideoPolicy()` inner play to detect rejection
3. Guard `playFg()` and generic video play against retry-when-blocked
4. Guard `onVis` tab-resume against blocked state
5. Set `_autoplayUnlocked = true` when home-intro tap succeeds (listen for `rhp:autoplay:unlocked` custom event from home-intro)

### Task 3: Case videos WITH controls — persistent UI on block
**File:** `case-video-controls.js`
**Agent:** code-writer
**Est:** ~25 LOC
**Dependencies:** None (independent from Tasks 1–2)

1. Add `tryPlay()` helper at top of IIFE
2. In mobile `wireSection()` init: use `tryPlay()` instead of immediate `resetIdleTimer(3000)`
3. On rejection: `showControls()`, skip idle timer, wait for play-pause click
4. On play-pause click success: set `video._rhpGestureUnlocked = true`, start idle timer
5. In `handleVisibility()` scroll-back: check `_rhpGestureUnlocked` before auto-resume

### Task 4: Case videos WITHOUT controls — SVG play overlay
**File:** `case-video-controls.js`
**Agent:** code-writer
**Est:** ~45 LOC
**Dependencies:** None (independent)

1. Add `wireNoControlsSection(section)` function
2. Query `.video-cover` without `.case-video_control-wrapper` sibling
3. `tryPlay()` on init — on rejection, inject SVG overlay
4. Overlay click: play video, set `_rhpGestureUnlocked`, remove overlay
5. IntersectionObserver (0.3 threshold): pause on scroll-out, auto-resume on scroll-back if unlocked
6. Track overlays + observers for destroy cleanup

### Task 5: CSS for play overlay + step text state
**File:** `ready-hit-play.css`
**Agent:** code-writer
**Est:** ~20 LOC
**Dependencies:** None

1. `.rhp-play-overlay` positioning + flex centering
2. SVG sizing + color
3. Hover/active states
4. `[data-text="step"].is-tap-to-play` cursor style

### Task 6: Orchestrator wiring for no-controls case videos
**File:** `orchestrator.js`
**Agent:** code-writer
**Est:** ~20 LOC
**Dependencies:** Task 4

1. In case `afterEnter`: identify sections without `.case-video_control-wrapper`
2. Call `RHP.caseVideoControls.wireNoControlsSection(section)` for each
3. Ensure `destroy()` calls the corresponding cleanup

### Task 7: Acceptance tests
**File:** `tests/acceptance/fix-autoplay-fallback-mobile.spec.js`
**Agent:** code-writer
**Est:** pre-written (see below)
**Dependencies:** Tasks 1–6

### Task 8: QA + smoke test
**Agent:** qa
**Dependencies:** Task 7

Run smoke + acceptance tests. Manual check on iOS if available.

---

## Parallelisation Map

| Stream | Tasks | Agent | Est. tokens | Notes |
|--------|-------|-------|-------------|-------|
| A — Homepage | Task 1, Task 2 | code-writer | 15k | Sequential (T2 depends on T1) |
| B — Case page | Task 3, Task 4, Task 6 | code-writer | 20k | T3+T4 parallel, T6 after T4 |
| C — CSS | Task 5 | code-writer | 5k | Independent |
| D — Tests | Task 7 | code-writer | 8k | After A+B+C |
| E — QA | Task 8 | qa | 10k | After D |

**Recommendation:** Streams A, B, C in parallel (3 worktrees). Stream D sequential after merge. Stream E sequential after D. No Agent Teams needed — tasks are independent enough for worktree isolation.

---

## Test Plan

### Tier 1 — Auto: Playwright local
See acceptance tests in `tests/acceptance/fix-autoplay-fallback-mobile.spec.js`

### Tier 2 — Auto: CDN regression
Registered in `tests/registry.json` — runs on `/deploy`

### Tier 3 — Manual
- **Real iOS Low Power Mode:** Physical iPhone, enable Low Power Mode, navigate to rhpcircle.webflow.io — verify "Tap here to play" appears on home, play overlay on case videos
- **Safari autoplay behaviour:** Safari has stricter autoplay policies than Chrome — test on macOS Safari with autoplay disabled in preferences
- **Gesture unlock persistence:** On case page, tap to play, scroll away, scroll back — verify auto-resume without re-tap (real device only, IntersectionObserver behaviour can differ)
- **Cross-browser controls visibility:** Firefox mobile may have different control rendering — visual check

---

## Acceptance Tests

| # | Test name | Tier |
|---|-----------|------|
| 1 | homepage: step text shows "Tap here to play" when autoplay blocked | T1 |
| 2 | homepage: ticks and nav still animate when autoplay blocked | T1 |
| 3 | homepage: tap on dial starts video playback | T1 |
| 4 | homepage: step text reverts to "Step into the circle" after tap | T1 |
| 5 | case controls: control UI visible when autoplay blocked | T1 |
| 6 | case controls: play tap starts video and begins auto-hide timer | T1 |
| 7 | case no-controls: SVG play overlay present when autoplay blocked | T1 |
| 8 | case no-controls: tap overlay starts video and removes overlay | T1 |
| 9 | viewport: video pauses when scrolled out of view | T1 |
| 10 | viewport: video auto-resumes on scroll-back after gesture unlock | T1 |
| 11 | no console errors on homepage with autoplay blocked | T1 |
| 12 | no console errors on case page with autoplay blocked | T1 |
| 13 | Barba re-entry: no stale overlays or listeners after home→about→home | T1 |
| 14 | desktop: autoplay works normally, no fallback UI shown | T1 |
| 15 | reduced motion: fallback UI still functional | T1 |
