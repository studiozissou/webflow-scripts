# fix-fg-video-case-to-case-barba

> FG video not updating on case→case Barba transitions

**Status:** Planning → Ready to Build
**Priority:** P1
**Type:** Bug fix
**Agent:** code-writer
**Created:** 2026-04-09
**Updated:** 2026-04-15

---

## Problem

When navigating between work pages via Barba (e.g. `/work/overland-ai` → `/work/remote` using prev/next buttons), the persistent foreground teaser video (`#fg-video-wrap > .dial_fg-video`) does not update to show the new page's video. The BG canvas (`.dial_bg-canvas`), which mirrors the FG video via a rAF draw loop, also remains stale.

**Root cause:** `#fg-video-wrap` and `.dial_fg-video` live **outside** the Barba container (namespace restructure shipped 2026-03-12). Barba swaps the container contents, but the persistent video element's `src` is never updated. `bootCurrentView()` sets the FG video src on direct-land but guards with `!fgVideo.src` — on case→case Barba nav the video already has a src from the previous page, so the guard prevents any update. `runAfterEnter()` has no FG video update logic at all.

## Approach: Shared utility (`_updateCaseVideos`)

Extract a `_updateCaseVideos(container)` helper in `orchestrator.js` that reads `.case-studies_wrapper` attributes from the given container, updates the persistent FG video `src`, calls `.load()` and `.play()`. Called from:

1. **`bootCurrentView()`** — replaces inline block at L1265-1273 (direct-land)
2. **`runAfterEnter()`** — new call inside the `if (ns === 'case' || ns === 'work')` block at L1404, **before** `startCaseBgDraw()` (Barba nav)

The BG canvas updates automatically — `startCaseBgDraw()` captures the FG video element reference at call time and its rAF loop draws whatever frame is currently playing. No separate BG src manipulation needed.

## Implementation

### New helper function (~12 LOC)

Insert before `bootCurrentView()` (around L1252):

```js
/**
 * Update persistent FG video from the new case page's CMS attributes.
 * BG canvas is fed by startCaseBgDraw() rAF loop — updates automatically.
 */
function _updateCaseVideos(container) {
  var caseWrapper = container?.querySelector('.case-studies_wrapper');
  if (!caseWrapper) return;
  var isMobile = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  var fgSrc = (isMobile && caseWrapper.getAttribute('fg-video-mobile'))
              || caseWrapper.getAttribute('fg-video') || '';
  var fgVideo = document.querySelector('#fg-video-wrap > .dial_fg-video');
  if (fgSrc && fgVideo) {
    fgVideo.src = fgSrc;
    fgVideo.load();
    fgVideo.play().catch(function() {});
  }
}
```

### Call site 1: `bootCurrentView()` (L1265-1273)

Replace the inline FG video block with:

```js
_updateCaseVideos(container);
```

Remove the `!fgVideo.src` guard — it's unnecessary on direct-land (video src is always empty at boot) and the helper is idempotent.

### Call site 2: `runAfterEnter()` (L1404-1412)

Add before `startCaseBgDraw()`:

```js
if (ns === 'case' || ns === 'work') {
  setNavHeight();
  if (dialFg && window.gsap) {
    window.gsap.set(dialFg, { opacity: 1 });
  }
  // Update persistent FG video to new case page's teaser
  _updateCaseVideos(data.next.container);
  // BG canvas: set blur + opacity, start rAF draw loop (mirrors case fg video)
  const bgCanvas = document.querySelector('.dial_bg-canvas');
  if (bgCanvas && window.gsap) window.gsap.set(bgCanvas, { filter: 'blur(40px)', opacity: 1 });
  startCaseBgDraw();
}
```

### Files affected

| File | Change | LOC |
|------|--------|-----|
| `orchestrator.js` | Add `_updateCaseVideos()`, update `bootCurrentView()`, update `runAfterEnter()` | ~15 |

**Complexity:** Low (1 file, ~15 LOC)

## Barba Impact

1. **Init/Destroy lifecycle** — No new DOM elements, listeners, or timelines. The helper only sets a `src` attribute on an existing persistent element. No cleanup needed.
2. **State survival** — The FG video element persists across all transitions (outside Barba container). The src swap is a hard replacement — no state needs to survive from the old page.
3. **Transition interference** — The src swap happens in `afterEnter`, after the morph animation has completed. No z-index, opacity, or animation conflicts.
4. **Re-entry correctness** — `_updateCaseVideos()` is idempotent. Navigating case→home→case, or case→case→case, will always read the current container's attributes and set the correct src.
5. **Namespace scoping** — Only called when `ns === 'case' || ns === 'work'`. Does not run on home or about pages.

## Verify Loop

### Pass/fail criteria

- [ ] **FG video src matches new page** — After case→case Barba nav, `document.querySelector('#fg-video-wrap > .dial_fg-video').src` contains the URL from the new page's `.case-studies_wrapper[fg-video]` attribute
- [ ] **FG video is playing** — `fgVideo.paused === false` within 3s of transition completing
- [ ] **BG canvas mirrors new FG** — `.dial_bg-canvas` is rendering frames from the new FG video (visual check)
- [ ] **No console errors** — Zero `pageerror` events during case→case navigation
- [ ] **Direct-land still works** — Navigating directly to `/work/remote` loads the correct FG video
- [ ] **Home→case still works** — Existing home→case transition + video handoff is unaffected

### Reproduction steps

1. Navigate to `https://rhpcircle.webflow.io/work/overland-ai`
2. Wait for page load + video playing
3. Click the "next" work-nav button (or manually trigger `barba.go('/work/remote')`)
4. Wait for Barba transition to complete (1.5-2.5s)
5. Verify the FG video now shows Remote's teaser, not Overland AI's

### Tier mapping

- **Tier 1 (auto):** `fix-fg-video-case-to-case-barba.spec.js` — FG src assertion, console errors, Barba lifecycle
- **Tier 2 (CDN regression):** Registered in `tests/registry.json`
- **Tier 3 (manual):**
  - Visual: BG canvas blur quality matches new FG video (subjective)
  - iOS Safari: autoplay after case→case nav (requires real device gesture)
  - Mobile: `fg-video-mobile` attribute used on `(hover: none)` devices

### Regression scope

- Home→case video handoff (`RHP.videoState.caseHandoff`) — must NOT break
- Case→home video handoff (`RHP.videoState.caseHandoff` read in resume) — must NOT break
- `startCaseBgDraw()` rAF loop — must still capture correct element
- `video-loader.js` Lottie spinners — must still attach to FG video
- Work-nav prev/next hrefs — unrelated, but test alongside

## Parallelisation Map

| Stream | Task | Agent | Est. LOC | Parallel? |
|--------|------|-------|----------|-----------|
| A | Implement `_updateCaseVideos()` + both call sites | code-writer | 15 | — |
| B | Run acceptance tests | qa | — | After A |

**Recommendation:** Sequential — single-file change, too small for parallel streams or worktrees.

## Task Breakdown

1. **Implement `_updateCaseVideos()` helper** — Add function, replace `bootCurrentView` inline block, add call in `runAfterEnter`. Single file: `orchestrator.js`.
2. **Verify** — Run acceptance tests (Tier 1), check direct-land + case→case + home→case manually.

## Acceptance Tests

| # | Test name | What it verifies |
|---|-----------|-----------------|
| 1 | FG video src updates after case→case Barba nav | `fgVideo.src` matches new page's `fg-video` attribute |
| 2 | FG video is playing after case→case nav | `fgVideo.paused === false` |
| 3 | No console errors during case→case nav | Zero `pageerror` events |
| 4 | Direct-land on case page loads correct FG video | `fgVideo.src` matches page's `fg-video` attribute |
| 5 | Home→case transition preserves video handoff | FG video plays (not blank) after home→case |
| 6 | Multiple case→case navigations work | Navigate through 3 case pages, FG src correct each time |
