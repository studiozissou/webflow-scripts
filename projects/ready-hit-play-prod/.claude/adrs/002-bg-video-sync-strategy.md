# ADR 002 — Bg Video Sync Strategy

**Date:** 2026-02-24
**Status:** Accepted
**Deciders:** Will Morley

---

## Context

The homepage dial has two video elements per project: `.dial_fg-video` (inside the dial) and `.dial_bg-video` (behind the dial). Both play the same video file. When switching projects, the fg video benefits from a sliding-window pool (`poolPrev`, `poolNext`) for instant adjacent-item switches. The bg video has no equivalent and always reloads from scratch, causing a poster flash.

Two options were considered for fixing bg video performance.

---

## Options

### Option A — Bg pool (4 pool elements)
Add `bgPoolPrev` and `bgPoolNext` mirroring the fg pool. On adjacent switch, swap both fg and bg pool elements simultaneously.

**Pros:** Truly instant for both adjacent switches.
**Cons:** 4 preloaded video elements (2× bandwidth per preload for the same file). More complex swap logic — both fg and bg pairs must stay in sync during the swap.

### Option B — Bg src mirroring + seek (chosen)
Don't add a bg pool. Instead, keep bg in sync with the current fg src at all times:
- Skip `setVideoSourceAndPoster(bgVideo, ...)` when `bg.src` already matches the target URL
- On pool swap: bg already has the same src → seek `bg.currentTime = fg.currentTime` → no reload, no poster
- On non-adjacent switch: both fg and bg get new src → crossfade masks the brief poster

**Pros:** Half the bandwidth (one preload per adjacent item, not two). Simpler DOM (2 pool elements, not 4). bg poster flash eliminated for the most common case (adjacent switching). Non-adjacent flash is masked by crossfade.
**Cons:** Non-adjacent switch still reloads both; not instant. (Acceptable — rare interaction.)

---

## Decision

**Option B — Bg src mirroring + seek.**

The dial almost always switches to adjacent projects (prev/next sector). Option B eliminates the poster flash in that case with zero extra bandwidth. A bg pool would double preload bandwidth for the same file, which is wasteful given the videos are already large.

Non-adjacent switches are edge cases; the crossfade transition makes the brief poster-to-video fade acceptable.

---

## Consequences

- `applyActive()` must check `sameUrl(bgVideo.src, v)` before calling `setVideoSourceAndPoster` on bg
- A `playPaired(fg, bg)` helper replaces individual `play()` calls to guarantee sync on start
- A drift sync monitor (RAF loop) catches any runtime drift and corrects it without jumping
- `cleanup` must cancel the RAF loop on `destroy()`
