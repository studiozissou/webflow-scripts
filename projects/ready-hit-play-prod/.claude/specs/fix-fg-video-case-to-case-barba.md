# Spec: FG Video Not Updating on Case→Case Barba Transitions

**Slug:** `fix-fg-video-case-to-case-barba`
**Client:** ready-hit-play-prod
**Status:** Ready to Build
**Priority:** P1
**Created:** 2026-04-10

---

## Context

The foreground video (`.dial_fg-video` inside `#fg-video-wrap`) lives **outside** the Barba `[data-barba="container"]` — it persists across all page transitions. This is intentional (see ADR: `feat-dial-fg-outside-barba.md`) so the canvas rAF loop can keep drawing through page swaps without stuttering.

When navigating from one case study to another (e.g. `/work/overland-ai` → `/work/remote`), the FG video retains the previous case's teaser because nothing tells it to update.

**Discovered during:** `feat-work-nav-prev-next` build. Clicking the prev/next work-nav buttons triggers a work→work Barba transition, but the FG video still shows the original case's footage.

---

## Root Cause

Two code paths load case pages, and **neither updates the FG video on re-entry**:

### 1. `bootCurrentView()` (orchestrator.js:1504) — Direct page load
```js
if (fgSrc && fgVideo && !fgVideo.src) {
  fgVideo.src = fgSrc;
  fgVideo.play().catch(function() {});
}
```
The `!fgVideo.src` guard means this runs **once**. If the user loads a second case page directly (unlikely in SPA, but possible via refresh), the guard blocks the update because `fgVideo.src` is already set from the first case.

### 2. `runAfterEnter()` (orchestrator.js:1669–1677) — Barba transitions
```js
if (ns === 'case' || ns === 'work') {
  setNavHeight();
  // ... dial opacity, BG canvas setup ...
  startCaseBgDraw();
}
```
This block starts the BG canvas draw loop but **never reads or sets `fgVideo.src`**. On work→work transitions, the previous case's video keeps playing.

---

## Solution

### Approach: URL equality guard + add population logic to `runAfterEnter()`

**Minimal diff — 1 file, ~20 lines changed.**

### Change 1: `runAfterEnter()` — Add FG video population (the fix)

In the `if (ns === 'case' || ns === 'work')` block (line 1669), **before** `startCaseBgDraw()`:

1. Read `fg-video` / `fg-video-mobile` from `.case-studies_wrapper` inside `data.next.container`
2. Resolve the URL to absolute (for comparison with `video.src` which is always absolute)
3. If the new URL differs from `fgVideo.src`: set `currentTime = 0`, assign `src`, call `play()`
4. If same URL (e.g. same-case navigation): skip — no reload needed

```js
// Populate persistent FG video from new case's data attributes
var nextContainer = data.next?.container;
var caseWrapper = nextContainer?.querySelector('.case-studies_wrapper');
var isMobile = window.matchMedia('(hover: none), (pointer: coarse)').matches;
var fgSrc = (isMobile && caseWrapper?.getAttribute('fg-video-mobile'))
          || caseWrapper?.getAttribute('fg-video') || '';
var fgVideo = document.querySelector('#fg-video-wrap > .dial_fg-video');
if (fgSrc && fgVideo) {
  var resolvedSrc = new URL(fgSrc, location.href).href;
  if (fgVideo.src !== resolvedSrc) {
    fgVideo.currentTime = 0;
    fgVideo.src = fgSrc;
    fgVideo.play().catch(function() {});
  }
}
```

### Change 2: `bootCurrentView()` — Replace guard for consistency

Replace the `!fgVideo.src` guard at line 1504 with the same URL equality check:

```js
// Before:
if (fgSrc && fgVideo && !fgVideo.src) {
// After:
if (fgSrc && fgVideo) {
  var resolvedSrc = new URL(fgSrc, location.href).href;
  if (fgVideo.src !== resolvedSrc) {
    fgVideo.currentTime = 0;
    fgVideo.src = fgSrc;
    fgVideo.play().catch(function() {});
  }
}
```

### Why BG mirroring is free

`startCaseBgDraw()` (orchestrator.js:1459–1482) queries the FG video element and draws it into the BG canvas via `ctx.drawImage()` in a rAF loop. It does NOT use a separate BG video element on case pages. Once the FG video's `src` is updated, the canvas automatically draws the new content. No additional BG update code needed — ADR-002's pool mirroring applies to the home dial only.

---

## Files Affected

| File | Lines | Change |
|------|-------|--------|
| `orchestrator.js` | ~1504 | Replace `!fgVideo.src` guard with URL equality check |
| `orchestrator.js` | ~1669–1677 | Add FG video population before `startCaseBgDraw()` |

**Complexity:** Low (1 file, ~20 LOC net, no new modules)

---

## Barba Impact

### 1. Init/Destroy lifecycle
No new DOM elements, event listeners, GSAP timelines, or ScrollTrigger instances are created. The fix reads an existing DOM element's attribute and sets a property on an existing `<video>` element. No new init/destroy bookkeeping required.

### 2. State survival
`fgVideo.src` is the sole state that needs to change. It survives naturally because the element is outside Barba's container. `RHP.videoState` is not affected — `caseHandoff` is only written on home→case, not case→case.

### 3. Transition interference
No animations or DOM mutations are added. The `fgVideo.src` assignment happens in `afterEnter` (post-swap), which is after all morph animations in `leave()` have completed. No z-index, opacity, or timing conflicts.

### 4. Re-entry correctness
The URL equality check (`fgVideo.src !== resolvedSrc`) ensures:
- Same-case re-entry: no reload, no flicker
- Different-case re-entry: src updates, video restarts at 0
- No stale listeners or doubled DOM nodes (we're not adding any)

### 5. Namespace scoping
The fix runs only inside `if (ns === 'case' || ns === 'work')` — it does not execute on home, about, or contact pages.

---

## Verify Loop

### Pass/fail criteria
1. **FG video src matches new case** — After work→work transition, `document.querySelector('#fg-video-wrap > .dial_fg-video').src` contains the `fg-video` attribute value from the new case's `.case-studies_wrapper`
2. **Video plays from start** — `fgVideo.currentTime` is near 0 (< 1s) after the transition
3. **BG canvas draws new content** — The `.dial_bg-canvas` reflects the new video frames (visual check)
4. **No console errors** — Zero `pageerror` events during the transition
5. **Same-case navigation skips reload** — If navigating to the same case, `fgVideo.src` does not change and no reload flicker occurs

### Reproduction steps
1. Navigate to `https://rhpcircle.webflow.io/work/overland-ai`
2. Wait for RHP scripts to init (`window.RHP.scriptsOk === true`)
3. Click `a[data-button="work-next"]` to navigate to the next case
4. Wait 2500ms for Barba transition to complete
5. Verify `#fg-video-wrap > .dial_fg-video` has a new `src` value
6. Verify `currentTime < 1`

### Tier mapping
- **Tier 1 (auto — Playwright):** Tests 1, 2, 4 — see acceptance test file
- **Tier 2 (auto — CDN regression):** Registered in `tests/registry.json`
- **Tier 3 (manual):**
  - Visual confirmation that BG canvas draws new video (canvas content can't be asserted via Playwright without screenshot diffing)
  - Safari/Firefox cross-browser (Playwright only runs Chromium)
  - Mobile device autoplay behaviour (iOS gesture requirement)

### Regression scope
- Home→case transitions must still work (FG video populated on first case visit)
- Case→home transitions must still capture `caseHandoff` state
- Home dial resume after case→home must not be affected
- `video-loader.js` Lottie spinners should still appear on FG video loading

---

## Test Plan

### Tier 1 — Auto: Playwright local
See `tests/acceptance/fix-fg-video-case-to-case-barba.spec.js`

### Tier 2 — Auto: CDN regression
Registered in `tests/registry.json` — runs on `/deploy`

### Tier 3 — Manual
- BG canvas draws correct new video (visual — canvas content not assertable)
- Safari: video autoplay after case→case transition
- Firefox: transition smoothness
- iOS: autoplay gesture requirement respected
- Mobile viewport: `fg-video-mobile` attribute used correctly

---

## Parallelisation Map

| Stream | Task | Agent | Est. LOC | Sequential dep |
|--------|------|-------|----------|----------------|
| A | Implement fix in orchestrator.js | code-writer | 20 | — |
| B | Write acceptance tests | code-writer | 80 | — |
| — | QA verify loop | qa | — | A |

**Recommendation:** Sequential — single-file fix, not worth worktree overhead. A then B, then QA.

---

## Acceptance Tests

See `tests/acceptance/fix-fg-video-case-to-case-barba.spec.js` for machine-runnable tests:

1. `FG video src updates after work→work Barba transition`
2. `FG video currentTime resets to near 0 after transition`
3. `same-case navigation does not reload the video`
4. `no JS errors during case→case transition`
5. `FG video still loads correctly on direct page load`
6. `home→case→case→home round-trip has no errors`
