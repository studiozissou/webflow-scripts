# Spec: Replace BG Video with Canvas Mirror

**Status:** Approved
**Date:** 2026-03-19
**Project:** ready-hit-play-prod

## Problem

The homepage dial has a bg video (always behind 40px blur) that mirrors the fg video. Two independent `<video>` decoders can never be truly frame-locked — there's always 1-2 frame drift. The codebase has ~250 lines of complex sync code (drift monitor, playPaired, pool swaps, buffering listeners) trying to keep them close.

## Solution

Replace the bg `<video>` with a `<canvas>` that draws the fg video frame every rAF tick. Under 40px blur, this is visually identical but guarantees pixel-perfect sync. Also eliminates the bg video stream entirely (bandwidth win) and ~200 lines of sync code.

## Files to modify

| File | Change |
|------|--------|
| `work-dial.js` | Replace bg video pool with canvas, remove drift/sync code, add drawImage to draw loop |
| `orchestrator.js` | Replace case page bg video sync (interval + listeners) with canvas rAF draw |
| `ready-hit-play.css` | Update `.dial_bg-video` selectors to `.dial_bg-canvas`, remove `object-fit: cover` |

## Implementation Details

### work-dial.js

**Remove:**
- `bgPoolPrev` + `bgPoolNext` creation and all bg pool cleanup code
- `bgLoadWindowIndices` variable
- `bgVisible` and `bgVideoRef` variables (repurpose to canvas ref)
- `playPaired()` function (~40 lines) — replace with simple fg-only play (`playFg()`)
- `attachFgSyncListeners()` + `detachFgSyncListeners()` (~42 lines)
- `driftMonitorTick()`, `startDriftMonitor()`, `stopDriftMonitor()` (~50 lines)
- `fgBuffering`, `_fgSyncListeners`, `playPairedGen` variables
- `_bgRevealAbort` AbortController
- All bg pool hit/miss check logic in `applyActive()` (bgPoolPrevReady, bgPoolNextReady, etc.)
- bg pool source loading, bg crossfade tweens, bg save/restore state
- bg video creation in boot section (freshBg element)

**Add:**
- `bgCanvas` element (class `dial_bg-canvas`, `aria-hidden="true"`)
- `bgCtx` = `bgCanvas.getContext('2d')`
- Resize: `bgCanvas.width = r.width * 0.5; bgCanvas.height = r.height * 0.5` (half-res — blur hides detail)
- In `draw()` function: `bgCtx.drawImage(srcVideo, 0, 0, bgCanvas.width, bgCanvas.height)` where srcVideo is `visibleVideo || genericVideo`
- `playFg(fg)` — simple fg-only play replacing `playPaired(fg, bg)`

**Update:**
- `setDialState(IDLE)`: animate `bgCanvas` opacity to 0
- `setDialState(ACTIVE)`: animate `bgCanvas` opacity to 1 (no deferred reveal needed — canvas always has a frame if draw loop is running)
- Boot: canvas starts at opacity:0
- Handoff: no `bg.currentTime` needed; canvas draws fg frame automatically
- `onVis()`: remove bg video pause/play/sync; canvas freezes when draw stops
- Suspend/resume: no bg pool refs needed; draw() stop/restart handles canvas
- Cleanup: remove canvas on destroy

### orchestrator.js

**Remove:**
- `_caseBgSyncId` interval and cleanup
- `_caseFgSyncListeners` event listeners
- Case page bg video src/play/sync code

**Add:**
- `_caseBgRafId` for rAF loop
- `startCaseBgDraw()` — rAF loop: `bgCtx.drawImage(caseFg, 0, 0, bgCanvas.width, bgCanvas.height)`
- `stopCaseBgDraw()` — cancel rAF
- Call `startCaseBgDraw()` in case afterEnter
- Call `stopCaseBgDraw()` in case leave cleanup

### ready-hit-play.css

- Rename `.dial_bg-video` → `.dial_bg-canvas` in all selectors
- Remove `object-fit: cover` (not applicable to canvas)
- Set `filter: blur(40px)` as CSS default (bg is always blurred when visible)
- Keep FOUC prevention rule with new class name

## Performance

| Metric | Before (2 videos) | After (canvas) |
|--------|-------------------|----------------|
| Video streams | 3 active (fg + bg + generic) + 2 pool | 1 active (fg) + generic |
| Bandwidth | ~2x video bitrate for bg | Zero bg bandwidth |
| rAF work | Drift monitor (currentTime reads) | drawImage (~0.1ms at half-res) |
| DOM elements | 7 video elements | 3 video (fg + pools) + 1 canvas |
| JS complexity | ~250 lines sync code | ~15 lines drawImage |

## Barba Lifecycle

| Transition | Canvas behavior |
|-----------|-----------------|
| Home load | draw() loop starts; canvas opacity:0 in IDLE |
| IDLE→ACTIVE | Canvas fades to opacity:1; draw loop already running |
| Home→About | suspend() stops draw(); canvas freezes (invisible under blur during morph) |
| About→Home | resume() restarts draw() |
| Home→Case | suspend(); orchestrator starts case bg rAF |
| Case→Home | resume(); canvas shows fg frame at handoff time |
| Direct /case | Orchestrator case afterEnter starts rAF |

## Mobile Considerations

- `drawImage(video)` works on iOS Safari when video is playing + muted
- Half-resolution canvas (~480x270 on mobile) is very cheap
- CSS `filter: blur()` is GPU-composited on iOS
- No known issues — standard pattern used by video filters, AR overlays, etc.

## Verification

1. Local dev: hover dial → bg canvas shows blurred fg video, frame-locked
2. Sector switch → bg canvas instantly shows new sector (no pool swap delay)
3. Mouse leave → bg canvas fades out, generic video fades in
4. Barba transitions: all paths (home↔about, home↔case) — no black flash
5. Mobile iOS Safari: drawImage works from playing muted video
6. DevTools Performance: fewer video decode entries, drawImage <0.5ms/frame
7. Network tab: only 1 project video downloading at a time
