# Fix: Dial Tick Centering Drift on Mobile

**Slug:** `fix-dial-tick-centering-drift`
**Project:** ready-hit-play
**Type:** bug
**Priority:** P1
**Created:** 2026-04-28

## Problem

The homepage dial's canvas tick ring drifts off-centre on mobile, especially
after Barba transitions back to home. The tick ring appears randomly offset
from the fg-video circle. The bug persists permanently — the existing
self-healing check never corrects it.

Screenshot evidence: tick ring shifted ~20px right of the fg-video circle on
iPhone Safari after about→home Barba transition.

## Root Cause

**Two issues combine:**

1. **`geom.cx`/`geom.cy` assume canvas center = tick center** (line 966-967).
   `resize()` sets `geom.cx = canvas.width / 2`, but the fg-video is positioned
   by CSS (`place-items: center` + `margin: auto`) and may not be at the exact
   canvas center — especially during layout settling after a Barba transition
   when `clearProps: 'all'` strips inline styles and CSS `:has()` selectors
   recompute.

2. **Self-healing only checks radius, not center** (line 1229-1235). The
   60-frame geometry drift check compares `videoR` but never validates
   `cx`/`cy`. So if the radius is correct but the center is off, the drift
   persists forever.

## Solution: Hybrid A+C

### Part C — Root fix: derive tick center from fgWrap position

Change `resize()` to compute `geom.cx`/`geom.cy` from the fgWrap's position
relative to the canvas, instead of assuming `canvas.width / 2`.

**Before** (`work-dial.js:966-972`):
```js
geom.cx = r.width / 2;
geom.cy = r.height / 2;

const fr = fgWrap.getBoundingClientRect();
geom.videoR = (Math.min(fr.width, fr.height) / 2) || REF_R;
geom.fgCX = fr.left + fr.width / 2;
geom.fgCY = fr.top + fr.height / 2;
```

**After:**
```js
const fr = fgWrap.getBoundingClientRect();
geom.videoR = (Math.min(fr.width, fr.height) / 2) || REF_R;
geom.fgCX = fr.left + fr.width / 2;
geom.fgCY = fr.top + fr.height / 2;

// Tick center derived from fgWrap position relative to canvas —
// CSS is the source of truth for where the video circle sits
geom.cx = (fr.left - r.left) + fr.width / 2;
geom.cy = (fr.top  - r.top)  + fr.height / 2;
```

**Why this works:** The fg-video is positioned by CSS (`place-items: center` +
`margin: auto`), which is the correct, stable center. By deriving `cx`/`cy`
from fgWrap's viewport position minus canvas's viewport position, the ticks
always draw around the fg-video regardless of canvas box model quirks.

**Impact on hit-testing:** `onPointerMove` (line 1032-1033) and `onPointerDown`
(line 1112) both compute distance from pointer to `geom.cx`/`geom.cy` in
canvas-local space. With the new derivation, hit-testing is now fgWrap-centered
too — which is actually MORE correct (we want interaction zones centered on the
video, not on the canvas).

### Part A — Backstop: extend self-healing to validate center

Extend the 60-frame self-healing check to also compare the live fgWrap center
against cached `geom.cx`/`geom.cy`. If center drift exceeds 2px, trigger
`resize()`.

**Before** (`work-dial.js:1229-1235`):
```js
if (fgWrap && state.frameCount % 60 === 0) {
  const fr = fgWrap.getBoundingClientRect();
  const liveR = (Math.min(fr.width, fr.height) / 2) || 0;
  if (liveR > 0 && Math.abs(liveR - geom.videoR) > 4) {
    debugGeom() && console.warn('[dial-geom] DRIFT', { cached: geom.videoR, live: liveR, delta: liveR - geom.videoR });
    resize();
  }
}
```

**After:**
```js
if (fgWrap && state.frameCount % 60 === 0) {
  const fr = fgWrap.getBoundingClientRect();
  const liveR = (Math.min(fr.width, fr.height) / 2) || 0;
  const radiusDrift = liveR > 0 && Math.abs(liveR - geom.videoR) > 4;

  // Center drift: compare live fgWrap center (canvas-local) against cached cx/cy
  const cr = canvas.getBoundingClientRect();
  const liveCX = (fr.left - cr.left) + fr.width / 2;
  const liveCY = (fr.top  - cr.top)  + fr.height / 2;
  const centerDrift = Math.abs(liveCX - geom.cx) > 2 || Math.abs(liveCY - geom.cy) > 2;

  if (radiusDrift || centerDrift) {
    debugGeom() && console.warn('[dial-geom] DRIFT', {
      type: radiusDrift ? 'radius' : 'center',
      cachedR: geom.videoR, liveR,
      cachedCX: geom.cx, liveCX,
      cachedCY: geom.cy, liveCY
    });
    resize();
  }
}
```

## Files Affected

| File | Lines | Change |
|------|-------|--------|
| `work-dial.js` | 966-972 | Reorder fgWrap read, derive `cx`/`cy` from fgWrap |
| `work-dial.js` | 1229-1235 | Add center drift check to self-healing |

**Total:** ~25 LOC net change, 1 file.

## Barba Impact

1. **Init/Destroy lifecycle** — No new DOM elements, listeners, or timelines.
   Existing `init()`/`destroy()` unchanged.
2. **State survival** — No state changes. `geom` is recalculated on every
   `resize()` call.
3. **Transition interference** — None. The fix makes `resize()` produce better
   values; it doesn't change when `resize()` is called.
4. **Re-entry correctness** — Improved. On home→about→home, `resize()` now
   derives center from CSS-positioned fgWrap instead of assuming canvas center.
5. **Namespace scoping** — `resize()` only runs when `alive` is true (set in
   `init()`, cleared in `destroy()`). No cross-namespace risk.

**Edge case:** If `resize()` is called while fgWrap has `opacity: 0` /
`visibility: hidden` (about namespace), `getBoundingClientRect()` still returns
correct geometry for invisible elements — only `display: none` returns zero
rects. The fgWrap uses opacity/visibility, not display:none, so this is safe.

## Tasks

1. **Implement Part C** — Reorder fgWrap read in `resize()`, derive `cx`/`cy`
2. **Implement Part A** — Extend self-healing center check
3. **Update debug logging** — Ensure `debugGeom()` log in `resize()` shows the
   new derivation path
4. **Bump version** — `work-dial.js` version string
5. **Test** — Run acceptance tests, manual mobile verify

## Parallelisation Map

All tasks are sequential (single file, each builds on previous):
- Stream 1: Tasks 1→2→3→4→5 (code-writer, ~15 min, ~2k tokens)
- No parallel streams needed — single-file change

## Verify Loop

### Pass/fail criteria
- Canvas tick ring is visually centered on the fg-video circle at 375×812 viewport
- After home→about→home Barba transition, ticks remain centered
- After about→home Barba transition, ticks remain centered
- No console errors on any transition path
- `window.__DEBUG_GEOM = true` shows `cx`/`cy` values within 2px of
  `(fr.left - cr.left) + fr.width / 2` derivation
- Self-healing fires and corrects if artificial drift is introduced

### Reproduction steps
1. Navigate to `https://rhpcircle.webflow.io` on mobile (375×812)
2. Wait for intro morph to complete
3. Navigate to About (tap "WHO WE ARE")
4. Wait for about transition to complete
5. Navigate back to Home (tap logo)
6. Observe: tick ring should be centered on fg-video circle

### Tier mapping
- **Tier 1 (auto):** `fix-dial-tick-centering-drift.spec.js` — geometry
  validation, Barba round-trip, console errors
- **Tier 2 (CDN regression):** Registered in `tests/registry.json`
- **Tier 3 (manual):**
  - Real iPhone Safari (address bar show/hide affects dvh) — Playwright only
    runs Chromium
  - Device rotation — Playwright can't simulate real orientation change
  - Visual polish — is the tick ring "pixel-perfect" centered? Subjective

### Regression scope
- Barba transitions must still work (home↔about, home↔case)
- Desktop dial interaction (pointer distance, sector switching) must be unaffected
- Mobile tap-to-activate must still work
- Self-healing must not fire spuriously on stable layouts

## Acceptance Tests

| # | Test | Type |
|---|------|------|
| 1 | Dial canvas present at mobile viewport | Element |
| 2 | No JS errors on home load (mobile) | Console |
| 3 | Tick center matches fgWrap center within 5px | Geometry |
| 4 | Tick center correct after home→about→home cycle | Barba |
| 5 | Tick center correct after about→home direct | Barba |
| 6 | No JS errors during Barba round-trip | Console |
| 7 | Self-healing corrects artificial drift | Backstop |
| 8 | Content visible with reduced motion | A11y |
