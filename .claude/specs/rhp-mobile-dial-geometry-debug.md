# Fix: RHP mobile dial geometry misalignment (intermittent)

## Context

On mobile (iPhone), the dial tick ring occasionally renders at the wrong radius
or position after a work → home Barba transition. The bug is intermittent — it
can't be reproduced 100% of the time. Previous fixes targeting scroll position
and `skipToEnd()` timing didn't resolve it.

The core geometry system: `work-dial.js resize()` reads
`fgWrap.getBoundingClientRect()` to calculate `geom.videoR`, which all tick
dimensions derive from. If this read happens before CSS has settled, or while
mobile Safari's viewport is in flux, the cached geometry is wrong until the
next explicit `resize` event.

**Why it's intermittent:**
- Mobile Safari's address bar show/hide changes `100dvh` dynamically
- The canvas container (`.dial_component`) uses `100dvh` — its center shifts
- The fg-video-wrap uses `min(65vw, 65svh)` — stable, doesn't shift
- `resize()` only fires on `window.resize`, `init()`, and `resume()` — no
  viewport change listener
- Timing of CSS recalc after `data-dial-ns` switch is browser-dependent

## Plan

### Phase 1 — Instrument: diagnostic probe (no fix yet)

Build a throwaway diagnostic snippet that logs geometry state every time
`resize()` runs AND on every `draw()` frame. Deploy on staging to capture the
exact moment the bug occurs.

**What to log (gated behind `DEBUG_GEOM` flag):**

```
[dial-geom] resize:
  canvas: ${r.width}×${r.height}
  fgWrap: ${fr.width}×${fr.height}
  videoR: ${geom.videoR}
  cx/cy: ${geom.cx}/${geom.cy}
  fgCenter: ${geom.fgCX}/${geom.fgCY}
  dvh: ${window.innerHeight}
  svh: ${CSS.supports('height','100svh') ? visualViewport?.height : 'n/a'}
  visualViewport: ${window.visualViewport?.height}×${window.visualViewport?.width}
  dialNs: ${comp.getAttribute('data-dial-ns')}
  introVisible: ${!!document.querySelector('.section_home-intro:not([style*="display: none"])')}
  scrollY: ${window.scrollY}
  caller: ${new Error().stack?.split('\n')[2]?.trim()}
```

Add a per-frame sanity check in `draw()`:
```js
if (DEBUG_GEOM) {
  const fr = fgWrap.getBoundingClientRect();
  const liveR = (Math.min(fr.width, fr.height) / 2) || 0;
  if (Math.abs(liveR - geom.videoR) > 5) {
    console.warn('[dial-geom] DRIFT', { cached: geom.videoR, live: liveR, delta: liveR - geom.videoR });
  }
}
```

This tells us:
- Is `videoR` drifting from live dimensions? (CSS timing issue)
- Is the canvas center (`cx/cy`) mismatched with fg center? (viewport unit mismatch)
- Is `data-dial-ns` correct when resize fires? (namespace timing)
- Is the intro section still taking layout? (scroll offset issue)

**Files:** `work-dial.js` only (add `DEBUG_GEOM` flag, remove before deploy)

### Phase 2 — Fix based on findings

Likely fixes (will choose based on Phase 1 data):

**If drift detected (CSS not settled):**
- Add a `visualViewport.resize` listener alongside `window.resize`
- Add a geometry validation check at the start of `draw()` — if live
  `fgWrap` dimensions differ from cached `geom.videoR` by >2px, auto-call
  `resize()` before drawing

**If canvas center / fg center mismatch (dvh vs svh):**
- Switch `.dial_component` from `100dvh` to `100svh` on mobile
- OR: recalculate canvas center relative to fgWrap on each frame instead of
  caching it

**If namespace timing issue:**
- The `skipToEnd()` in work-to-home `enter()` hook is still needed (just not
  sufficient alone) — re-apply it

### Files to modify

| File | Change |
|------|--------|
| `work-dial.js` | Phase 1: add `DEBUG_GEOM` instrumentation. Phase 2: add self-healing resize or viewport listener |
| `orchestrator.js` | Phase 2 only: re-apply `skipToEnd()` in work-to-home if data confirms it's needed |
| `ready-hit-play.css` | Phase 2 only: if `dvh` vs `svh` mismatch confirmed, switch `.dial_component` height |

### Verification

1. Deploy Phase 1 probe to staging (local HTTPS server or jsDelivr)
2. Reproduce the bug on iPhone — navigate home → work → home multiple times
3. Check console for `[dial-geom] DRIFT` warnings and `resize` logs
4. Compare `videoR` cached vs live, `cx/cy` vs `fgCX/fgCY`, `dvh` vs `visualViewport.height`
5. Use findings to select the right Phase 2 fix
6. After fix: repeat home → work → home × 10 on mobile, confirm no drift warnings
