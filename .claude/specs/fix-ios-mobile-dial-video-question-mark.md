# Fix iOS Mobile Dial — Video "?" Icon + Browser Bar Displacement

**Slug:** `fix-ios-mobile-dial-video-question-mark`
**Priority:** P1
**Status:** Planning
**Project:** ready-hit-play
**Created:** 2026-04-29

## Problem

Two iOS Safari mobile bugs on the RHP homepage dial:

### Bug 1: Native "?" icon on fg-video
iOS Safari paints a native "?" placeholder icon on `<video>` elements that have no `src` at first paint. The Webflow HTML `<video class="dial_fg-video" preload="metadata">` has no `src` attribute — JS sets it later in `applyActive(0)`. Once iOS paints the "?", it persists in a compositor layer even after `src` is set and the video plays. CSS `::webkit-media-controls` suppression does not work — the icon bypasses all CSS pseudo-element targeting.

The "?" only clears if the element goes through a full `visibility:hidden` → `visibility:visible` cycle after the video has valid decoded data.

### Bug 2: Browser bar displacement
After the scroll morph completes, the height freeze (`dialEl.style.height = window.innerHeight + 'px'`) races with `scrollTo(0, 0)`. iOS may not have updated `innerHeight` by the time the freeze samples it. Additionally, `visualViewport` resize events (bar show/hide after morph) fire `work-dial.resize()` but do NOT re-apply the height freeze, causing the dial to shift.

## Root Cause Analysis

### Bug 1 — Gaps where video is visible without src:
1. **Gap 1 (initial load):** Webflow `<video class="dial_fg-video" preload="metadata">` is in the HTML with no `src`. No CSS rule hides `.dial_layer-fg` on initial home load. iOS paints "?" before any JS runs.
2. **Gap 3 (most likely):** `preload="metadata"` on an empty video triggers the "?" eagerly.
3. **Gap 4 (Barba return):** `freshFg` element created at init line ~1418-1425 is appended visible with no `src`.

### Bug 2 — Race condition:
1. `scrollTo(0, 0)` at line 713 can trigger bar reappearance
2. Height freeze at line 719 samples `window.innerHeight` immediately after — but iOS may not have settled
3. `visualViewport` resize fires `work-dial.resize()` (geometry) but does not re-freeze the height

## Solution

### Approach: CSS initial-hide + early preload + visualViewport re-freeze

**Bug 1 fix — three layers:**
1. **CSS rule** (instant, before JS): `.dial_fg-video { visibility: hidden; }` scoped to mobile via `@media (hover: none), (pointer: coarse)` — prevents "?" on first paint
2. **Early src preload** (JS init): Set the first video's `src` immediately in work-dial `init()`, before `applyActive(0)`. Read the CMS `data-video` attribute from the first `.dial_cms-item`. The morph scroll takes several seconds — plenty of time for the video to buffer.
3. **Reveal gate** (JS): Set `visibility: visible` only after `readyState >= 2` (has decoded frame). Apply to: initial fg-video, `freshFg` creation, and pool swap paths.

**Bug 2 fix — two changes:**
1. **Use `visualViewport.height`** for the freeze value: `window.visualViewport?.height || window.innerHeight`
2. **Re-freeze on visualViewport resize**: Add a handler in `home-scroll-morph.js` that re-applies the freeze when `complete === true` (post-morph only)

## Files Affected

| File | Changes |
|------|---------|
| `ready-hit-play.css` | Add mobile-scoped `.dial_fg-video { visibility: hidden }` rule |
| `work-dial.js` | Early src preload in `init()`; `visibility:visible` reveal gate after `loadeddata`; `freshFg` created with `visibility:hidden`; pool swap paths include `visibility:visible` |
| `home-scroll-morph.js` | Height freeze uses `visualViewport.height`; add `visualViewport` resize re-freeze handler; cleanup in `destroy()` |

## Implementation Details

### CSS (ready-hit-play.css)

```css
/* Hide fg-video on mobile until JS reveals after src load — prevents iOS "?" */
@media (hover: none), (pointer: coarse) {
  .dial_fg-video { visibility: hidden; }
}
```

Place before the existing `.dial_fg-video` color/text-fill rules. Mobile-only scope ensures desktop video is unaffected.

### JS — work-dial.js

#### 1. Early src preload (in `init()`, before `applyActive(0)`)

After `visibleVideo` is first obtained (or after `freshFg` is created), immediately set src from first CMS item:

```js
// Early preload: set src before applyActive so iOS has data when video becomes visible
var firstItem = items[0];
if (firstItem && visibleVideo) {
  var firstSrc = getVideoUrl(firstItem, 'fg');
  if (firstSrc) {
    visibleVideo.src = firstSrc;
    try { visibleVideo.load(); } catch(e) {}
  }
}
```

#### 2. Reveal gate (helper function)

```js
function revealFgVideo(videoEl) {
  if (!videoEl) return;
  if (videoEl.readyState >= 2) {
    videoEl.style.visibility = 'visible';
    return;
  }
  var revealed = false;
  var reveal = function() {
    if (revealed) return;
    revealed = true;
    videoEl.style.visibility = 'visible';
  };
  videoEl.addEventListener('loadeddata', reveal, { once: true });
  setTimeout(reveal, 5000); // fallback
}
```

Call `revealFgVideo(visibleVideo)` after src is set in:
- `applyActive()` `!didSwap` branch (after `setVideoSourceAndPoster`)
- `freshFg` creation path (after `fgWrap.appendChild`)
- Pool swap mobile paths (after `fgWrap.appendChild(poolPrev/poolNext)`)

#### 3. freshFg creation

```js
freshFg.style.visibility = 'hidden'; // prevent iOS "?" before src set
```

#### 4. Pool swap cssText

Both mobile swap paths must include `visibility:visible` since pool videos have confirmed `readyState >= 2`:

```js
poolPrev.style.cssText = fgVideoBaseStyle + 'opacity:1;visibility:visible;';
```

### JS — home-scroll-morph.js

#### 1. Height freeze value

```js
const h = window.visualViewport?.height || window.innerHeight;
```

#### 2. Re-freeze on visualViewport resize

```js
// Re-freeze dial height when iOS browser bar changes (only post-morph)
var _vpResizeHandler = null;
if (window.visualViewport) {
  _vpResizeHandler = function() {
    if (!complete || !dialEl) return;
    var h = window.visualViewport?.height || window.innerHeight;
    dialEl.style.height = h + 'px';
  };
  window.visualViewport.addEventListener('resize', _vpResizeHandler, { passive: true });
}
```

Cleanup in `destroy()`:
```js
if (_vpResizeHandler && window.visualViewport) {
  window.visualViewport.removeEventListener('resize', _vpResizeHandler);
}
```

## Barba Impact

1. **Init/Destroy lifecycle:** No new DOM elements or listeners outside existing patterns. The `visualViewport` resize handler is cleaned up in `destroy()`. The `revealFgVideo` helper uses `{ once: true }` listeners — no leak risk.
2. **State survival:** No new state to persist. The height freeze is inline style on `dialEl`, cleared in `replay()` and `destroy()`.
3. **Transition interference:** No new GSAP timelines or z-index changes. The CSS `visibility:hidden` rule is mobile-only and overridden by inline `visibility:visible` set by JS.
4. **Re-entry correctness:** `freshFg` path already handles Barba return — adding `visibility:hidden` to it follows the same pattern. The `revealFgVideo` gate ensures clean reveal on re-entry.
5. **Namespace scoping:** Changes only affect `home` namespace (dial is only interactive on home). The CSS rule targets `.dial_fg-video` globally but only the home page has an active fg-video.

## Verify Loop

### Pass/fail criteria

1. **No "?" icon visible** at any point during: initial load, morph scroll, post-morph idle, sector switching, Barba about→home return
2. **Video plays normally** after morph completes — no blank circle, no delayed reveal beyond 5s
3. **Dial layout stable** when iOS browser bar appears/disappears (tap URL bar, scroll gestures)
4. **Height freeze value correct** — matches `visualViewport.height` at the moment of freeze
5. **No console errors** on homepage load, morph, and sector switching
6. **Desktop unaffected** — video visible immediately, no visibility:hidden flash

### Reproduction steps

1. Navigate to `https://rhpcircle.webflow.io/` on iOS Safari mobile
2. Scroll through the 300svh intro morph
3. After morph completes, observe the dial — no "?" should be visible
4. Tap the URL bar to trigger browser bar — dial should not shift
5. Wait for bar to hide again — dial should remain stable
6. Navigate to about page and back (Barba) — no "?" on return
7. On desktop (1440x900) — video should be visible immediately, no flash

### Tier mapping

- **Tier 1 (auto):** Console errors, DOM presence of `visibility:visible` on fg-video after load, `visualViewport` handler registered
- **Tier 2 (CDN regression):** Registry entry runs above checks after deploy
- **Tier 3 (manual):** iOS Safari physical device — "?" icon visibility, browser bar tap, morph scroll timing. Cannot be automated because Playwright uses Chromium (no iOS Safari compositor behavior).

### Regression scope

- Barba transitions (home→about→home, home→case→home)
- Video playback on all sectors (sector switching)
- Desktop video reveal (must not be affected by mobile CSS rule)
- Pool swap video quality (pool videos must show immediately)
- Generic video spinner (must still appear during initial load)

## Task Breakdown

1. **CSS: Add mobile-scoped visibility:hidden rule** — `ready-hit-play.css`
   - Agent: code-writer
   - Depends on: nothing

2. **JS: Add revealFgVideo helper + early src preload** — `work-dial.js`
   - Agent: code-writer
   - Depends on: Task 1 (CSS rule must exist for the reveal to matter)

3. **JS: Wire reveal into all fg-video lifecycle paths** — `work-dial.js`
   - Agent: code-writer
   - Depends on: Task 2

4. **JS: visualViewport height freeze + re-freeze handler** — `home-scroll-morph.js`
   - Agent: code-writer
   - Depends on: nothing (independent of Bug 1 fix)

5. **Clean up debug artifacts** — `work-dial.js`, `ready-hit-play.css`
   - Agent: refactor
   - Depends on: Tasks 1-4

6. **Manual iOS Safari verification** — physical device
   - Agent: manual (user)
   - Depends on: Tasks 1-5

## Parallelisation Map

```
Stream A (Bug 1):  Task 1 → Task 2 → Task 3 → Task 5
Stream B (Bug 2):  Task 4 ─────────────────────→ Task 5
                                                    ↓
                                                  Task 6 (manual)
```

- Tasks 1-3 are sequential (each builds on previous)
- Task 4 is independent — can run in parallel with Stream A
- Task 5 depends on both streams completing
- **Recommendation:** Sequential within each stream, parallel between streams. No worktrees needed — changes are in different files. Single agent can handle both streams sequentially in one pass.

## Acceptance Tests

See `tests/acceptance/fix-ios-mobile-dial-video-question-mark.spec.js`

- `fg-video has visibility visible after RHP init` — checks inline visibility:visible is set
- `fg-video has a valid src after RHP init` — confirms early preload worked
- `no console errors on homepage` — standard smoke
- `dial component has inline height after morph` — checks height freeze exists
- `desktop: fg-video is visible without delay` — regression check for desktop
- `Barba round-trip: fg-video visible after return` — about→home re-entry
