# Fix: Case Video Autoplay After Barba Transition

**Slug:** `fix-case-video-autoplay-barba`
**Priority:** P1
**Status:** Planning
**Files:** `case-video-controls.js`, `orchestrator.js` (minor)

## Problem

On work/case pages reached via Barba transition (any route), all videos except
the persistent fg video (`#fg-video-wrap > .dial_fg-video`) appear paused.
On direct page load, the same videos autoplay correctly.

## Root Cause

`wireSection()` in `case-video-controls.js` wires play/pause buttons,
mute, progress bar, and IntersectionObserver — but **never calls `play()`**.

On initial page load the browser processes the HTML `autoplay` attribute
and starts playback natively. After a Barba DOM swap, dynamically inserted
`<video>` elements do not get native `autoplay` processing, so controlled
sections stay paused.

The orchestrator's `runAfterEnter` already handles:
- **Handoff video** (line 1487) → `caseVideoEl.play()`
- **No-controls sections** (line 1507) → `wireNoControlsSection()` → `tryPlay()`
- **Column videos** (line 1513) → `v.play()`

But **controlled sections** (with `.case-video_control-wrapper`) get only
`wireSection()` via `caseVideoControls.init()` — no `play()` call.

## Fix

### Option A — Fix in `wireSection` (recommended)

Add a `tryPlay(video)` call at the end of `wireSection()`, after controls are
wired. This mirrors what `wireNoControlsSection` already does for its videos.

```js
// case-video-controls.js — wireSection(), after all control wiring
tryPlay(video).then(result => {
  if (result.ok) video._rhpGestureUnlocked = true;
});
```

**Why this is best:**
- Single, minimal change in the module that owns the videos
- Idempotent on direct page load (video already playing, `play()` resolves instantly)
- Consistent with `wireNoControlsSection` pattern
- No orchestrator changes needed
- No risk of double-play on handoff video (handoff is played before `init()` runs)

### What NOT to change

- `work-dial.js` — user is working on fg-video in two worktrees; no changes here
- `orchestrator.js` — the autoplay logic belongs in `case-video-controls.js`
  (module ownership per ADR-001)

## Barba Impact

1. **Init/Destroy lifecycle** — No new listeners or DOM. `wireSection` already
   has full cleanup. The `tryPlay` promise is fire-and-forget (no cleanup needed).
2. **State survival** — No new state. `_rhpGestureUnlocked` is already managed.
3. **Transition interference** — None. `tryPlay` runs after `afterEnter`.
4. **Re-entry correctness** — `destroy()` clears observers + flags. Fresh
   `wireSection` on re-entry will call `tryPlay` again. Clean.
5. **Namespace scoping** — `caseVideoControls.init()` is only called on
   case/work pages (via `RHP.views.case.init`).

## Tasks

1. Add `tryPlay(video)` call at end of `wireSection()` in `case-video-controls.js`
2. Bump VERSION string
3. Run acceptance tests

## Verify Loop

### Pass/fail criteria
- After Barba transition (home → work): all `.section_case-video` videos with
  controls are playing (not paused)
- After Barba transition (about → work): same
- Direct page load on a work page: videos still autoplay (no regression)
- No console errors on any transition route
- No play overlay appears on controlled sections (overlays are for no-controls only)

### Reproduction steps
1. Navigate to `https://rhpcircle.webflow.io` (home)
2. Click any dial sector to navigate to a case study (home → work)
3. Scroll down to video sections — verify videos are playing
4. Navigate back to home, then to about, then to a case study (about → work)
5. Verify videos are playing
6. Directly load a case study URL — verify videos autoplay

### Tier mapping
- **Tier 1 (auto):** Playwright tests check video `.paused` state after Barba nav
- **Tier 3 (manual):** Visual confirmation that video playback looks correct
  (timing, no stutter)

### Regression scope
- Barba transitions must still work (morph, scroll reset, namespace switch)
- Handoff video seek+play must still work
- No-controls sections must still get `wireNoControlsSection` treatment
- Column videos must still auto-play
- fg-video must NOT be affected (persists outside Barba)

## Test Plan

### Tier 1 — Auto: Playwright
- `controlled-video-plays-after-home-to-work`: Navigate home → work, assert
  `.section_case-video video.video-cover` is not paused
- `controlled-video-plays-after-about-to-work`: Navigate about → work, assert same
- `controlled-video-plays-on-direct-load`: Direct-load work page, assert same
- `no-console-errors`: No errors on home → work and about → work transitions

### Tier 2 — Auto: CDN regression
- Register in `tests/registry.json` after tests are written

### Tier 3 — Manual
- Visual confirmation that video playback timing looks correct (no stutter, no flash)
- Cross-browser check (Safari, Firefox) — Playwright only runs Chromium
