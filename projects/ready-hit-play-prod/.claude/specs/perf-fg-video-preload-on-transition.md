# perf-fg-video-preload-on-transition

## Summary
Preload all foreground video URLs during the Barba `beforeLeave` phase of case→home transitions, giving the browser a 1–1.5s head start while the dial shrink animation plays. Uses hidden `<video>` elements (same proven mechanism as the existing pool) with connection-aware gating and prioritised load order.

## Problem
When navigating from a work/case page back to home, the fg videos haven't buffered and the user sees Lottie loading spinners on all sectors. The current system only starts loading videos in `afterEnter` after `resume()` is called — by which point the videos are already visible and playing (triggering `waiting` events → spinner).

## Approach: Leave-phase preload with mitigations

### How it works
1. In orchestrator.js `beforeLeave` for case→home (`work-to-home` transition), collect all fg video URLs from `.dial_cms-item` elements (persistent outside Barba container)
2. Create hidden `<video>` elements with appropriate `preload` attributes to warm the browser HTTP/media cache
3. Prioritise: handoff sector `preload="auto"`, ±1 adjacent `preload="auto"`, remaining sectors `preload="metadata"`
4. Gate on connection quality: skip entirely on 2g/slow-2g, limit to 3 videos on 3g, full preload on 4g/wifi/unknown
5. Clean up preload elements in `runAfterEnter` after `resume()` completes

### Why hidden `<video>` elements (not `fetch()` or `<link rel="preload">`)
- `fetch()` opaque responses and `<video>.src` use **separate browser cache partitions** — zero benefit
- `<link rel="preload" as="video">` fails for cross-origin Vimeo URLs (CORS rejection)
- Hidden `<video preload="auto">` is the same mechanism the existing pool uses — proven to work with Vimeo progressive redirect URLs

### Connection-aware gating
```
navigator.connection.effectiveType:
  '4g' / undefined / wifi → preload ALL (handoff ±1 auto, rest metadata)
  '3g'                    → preload handoff ±1 only (auto), skip rest
  '2g' / 'slow-2g'       → skip preloading entirely
```

### Prioritised load order
1. **Handoff sector** (the case study the user just visited) — `preload="auto"` (full buffer)
2. **±1 adjacent** sectors — `preload="auto"` (full buffer)
3. **Remaining sectors** — `preload="metadata"` (DNS + TLS + headers only, ~few KB each)

### Timing budget
- `beforeLeave` fires → preload elements created (0ms)
- `runDialShrinkAnimation()` runs for 0.8s (non-reduced-motion)
- Barba DOM swap + `enter` + `afterEnter` + double-rAF: ~200-400ms
- Total head start: **~1.0–1.5s** before `resume()` sets `video.src` on pool elements
- On fast connections (fiber/5G): first few seconds of all videos buffered
- On moderate connections (4G): handoff sector fully buffered, adjacent partially

## Implementation

### File changes

#### 1. `orchestrator.js` — `beforeLeave` for work-to-home (~lines 2057-2076)

Add a `_preloadFgVideos(handoffIndex)` helper at IIFE scope:

```js
// ── FG video preload for case→home transition ──

var _preloadEls = [];
var _preloadAbort = null;

function _preloadFgVideos(handoffIndex) {
  // Clean up any prior preload
  _cleanupPreload();

  // Connection gate
  var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  var ect = conn && conn.effectiveType;
  if (ect === '2g' || ect === 'slow-2g') return;
  var limitTo3 = (ect === '3g');

  // Collect CMS items (outside Barba container, always available)
  var items = document.querySelectorAll('.dial_cms-item');
  if (!items.length) return;

  var N = Math.min(8, items.length);
  var isMobile = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  // Build priority list: [handoff, handoff-1, handoff+1, rest...]
  var order = [];
  if (typeof handoffIndex === 'number') order.push(handoffIndex);
  var prev = ((handoffIndex || 0) - 1 + N) % N;
  var next = ((handoffIndex || 0) + 1) % N;
  if (order.indexOf(prev) === -1) order.push(prev);
  if (order.indexOf(next) === -1) order.push(next);
  if (!limitTo3) {
    for (var i = 0; i < N; i++) {
      if (order.indexOf(i) === -1) order.push(i);
    }
  }

  // Create hidden video elements
  var frag = document.createDocumentFragment();
  order.forEach(function(idx, rank) {
    var item = items[idx];
    if (!item) return;
    var url = item.getAttribute(isMobile ? 'data-video-mobile' : 'data-video')
           || item.getAttribute('data-video');
    if (!url) return;

    var el = document.createElement('video');
    el.setAttribute('preload', rank < 3 ? 'auto' : 'metadata');
    el.setAttribute('muted', '');
    el.setAttribute('playsinline', '');
    el.muted = true;
    el.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;left:-9999px;';
    el.src = url;
    try { el.load(); } catch(e) {}
    frag.appendChild(el);
    _preloadEls.push(el);
  });

  // Append to dial_component (persistent element)
  var comp = document.querySelector('.dial_component');
  if (comp) comp.appendChild(frag);
}

function _cleanupPreload() {
  _preloadEls.forEach(function(el) {
    try { el.pause(); } catch(e) {}
    el.removeAttribute('src');
    try { el.load(); } catch(e) {}
    el.remove();
  });
  _preloadEls = [];
}
```

**Hook into `beforeLeave` (~line 2057):**
```js
beforeLeave(data) {
  RHP.lenis?.stop();
  // ... existing caseHandoff capture ...

  // NEW: Start preloading fg videos for home return
  var handoffIdx = RHP.videoState?.lastCaseIndex;
  _preloadFgVideos(typeof handoffIdx === 'number' ? handoffIdx : 0);

  // ... existing destroy calls ...
}
```

**Hook cleanup into `runAfterEnter` after resume (~line 1710):**
```js
// After resume() or init() completes:
_cleanupPreload();
```

### No changes to work-dial.js
The preload elements are separate from the pool. They only warm the browser cache. When `resume()` calls `setVideoSourceAndPoster(poolPrev, urlPrev, ...)`, the browser finds the URL in its media cache and skips the network round-trip.

### No changes to video-loader.js
Preload elements are 1×1px and off-screen — `_isPoolOrHidden()` already excludes them from spinner attachment.

### No changes to CSS
Preload elements use inline styles matching the existing pool pattern.

## Barba Impact

1. **Init/Destroy lifecycle** — Preload elements are created in `beforeLeave` and cleaned up in `runAfterEnter`. No new `init()`/`destroy()` methods needed — cleanup is inline.
2. **State survival** — No new state. Uses existing `RHP.videoState.lastCaseIndex` for the handoff sector.
3. **Transition interference** — Preload elements are 1×1px, off-screen, opacity:0, pointer-events:none. No visual or layout interference with the dial shrink animation.
4. **Re-entry correctness** — `_cleanupPreload()` runs on every `runAfterEnter`, so repeated case→home→case→home cycles don't accumulate elements.
5. **Namespace scoping** — Only activates in `work-to-home` (and `rhp-core` fallback) `beforeLeave`. Does not run on about transitions.

## Verify Loop

### Pass/fail criteria
- After case→home transition, fg video for the handoff sector plays without showing the Lottie spinner (or shows it for <200ms)
- Adjacent sectors (±1) also load faster than baseline
- On 2g connection emulation, no preload elements are created (connection gate works)
- No preload `<video>` elements remain in the DOM after `runAfterEnter` completes
- No console errors during the transition
- No memory leak: repeated case→home→case→home cycles don't accumulate video elements

### Reproduction steps
1. Navigate to `https://rhpcircle.webflow.io/`
2. Wait for home intro to complete
3. Click any case study (e.g. hover dial, click sector)
4. Wait for case page to load
5. Click the logo/nav to return home
6. Observe: fg video should appear without spinner (or with very brief spinner)
7. Move cursor to adjacent sectors — videos should load faster than before

### Tier mapping
- **Tier 1 (auto)**: Playwright tests check preload element creation/cleanup, console errors, video readyState after transition
- **Tier 2 (CDN regression)**: Registered in `tests/registry.json`
- **Tier 3 (manual)**:
  - Visual confirmation that spinner is absent/brief (subjective timing)
  - Mobile Safari: verify preload elements don't cause audio policy warnings
  - Throttled network (Chrome DevTools): verify connection gate works
  - Cross-browser: Safari video cache behaviour may differ from Chrome

### Regression scope
- Barba transitions: home→case, case→home, home→about, about→home must all still work
- Work-dial pool system: pool swap, sector switching, generic video — unchanged
- Video-loader spinners: still work for case page videos and non-preloaded scenarios
- Memory: no accumulation of video elements across navigation cycles

## Parallelisation Map

| Task | Agent | Est. time | Est. tokens | Dependencies |
|------|-------|-----------|-------------|--------------|
| 1. Add `_preloadFgVideos` + `_cleanupPreload` helpers | code-writer | 5 min | 8k | None |
| 2. Hook into `beforeLeave` + `runAfterEnter` | code-writer | 3 min | 4k | Task 1 |
| 3. Code review | code-reviewer | 3 min | 6k | Task 2 |
| 4. Acceptance tests | qa | 3 min | 4k | Task 2 |

**Recommendation:** Sequential (4 tasks, low complexity, all in orchestrator.js). No worktrees needed.

## Test Plan

### Tier 1 — Auto: Playwright local
See `tests/acceptance/perf-fg-video-preload-on-transition.spec.js`
- Preload elements created during case→home leave phase
- Preload elements cleaned up after home afterEnter
- No console errors during transition
- Video readyState ≥ 1 (metadata loaded) for handoff sector after transition
- Connection gate: no preload on emulated 2g
- Barba re-entry: case→home→case→home without element accumulation

### Tier 2 — Auto: CDN regression
Registered in `tests/registry.json` as `perf-fg-video-preload-on-transition`

### Tier 3 — Manual
- **Spinner absence/brevity**: Subjective visual check — spinner should not appear or flash <200ms. Cannot automate because spinner visibility timing depends on network speed.
- **Mobile Safari**: Verify no audio policy warnings from preload elements (requires real device).
- **Network throttle**: Chrome DevTools → Slow 3G → verify only 3 preload elements; Offline → verify no errors.
- **Safari cache behaviour**: Safari may handle video caching differently — verify on real Safari.
