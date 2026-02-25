# Spec: Seamless Video Sync — Homepage Dial
**Status:** BLOCKED — approach invalidated; see v2 section below
**Created:** 2026-02-24
**Updated:** 2026-02-25

---

## Problem

When switching projects on the homepage dial, there is a 0.5–3s delay before the new video plays. The cause is that `.dial_bg-video` always has its `src` swapped directly in `applyActive()`, triggering a full reload — poster frame shows, then video plays. Additionally, fg and bg videos drift out of sync after switching, causing the fg video to jump back and forth while waiting for bg to catch up.

Two distinct bugs:
1. **Poster flash** — bg video always gets `setVideoSourceAndPoster()` called, reloading from scratch even when the src hasn't changed.
2. **fg/bg drift** — fg and bg are the same video file but start playing at different times, causing visible sync drift and jumpiness.

A third issue was identified on review:
3. **Videos play while not visible** — project `fgVideo` and `bgVideo` continue playing in IDLE state (opacity 0, invisible). `genericVideo` continues playing in ACTIVE/ENGAGED state. This wastes CPU/battery and means the drift monitor cannot be cleanly scoped to when videos are actually visible.

---

## Goals

- Project switches feel instant: video plays immediately with no poster flash
- fg and bg stay in sync within ±0.1s at all times (±0.3s on mobile)
- Switches crossfade with a 0.2s GSAP opacity tween
- `prefers-reduced-motion`: crossfade disabled (hard cut), sync still active
- No video plays while it is not visible to the user
- Scope: homepage only

---

## Out of Scope

- Non-adjacent jumps (rare; acceptable to show a brief crossfade-in from poster)
- Case study page video sync
- Autoplay fallback (separate task)
- Video controls
- Pool videos (`poolPrev`, `poolNext`) — these are a deliberate exception: they play while off-screen so they are buffered and ready for an instant swap

---

## Root Cause Analysis

### Bg video never pooled
The fg video has `poolPrev`/`poolNext` — adjacent items preload and swap instantly. The bg video has no pool. `applyActive()` unconditionally calls `setVideoSourceAndPoster(bgVideo, v, poster)` on every switch, resetting `src` even when fg was served from the pool with the same URL. Result: bg always reloads, always flashes poster.

### Paired play not guaranteed
fg starts playing when `readyState >= 2`; bg starts independently whenever it's ready. They never check each other. If bg takes an extra 200ms to buffer, it's already 200ms behind fg, and then plays at normal speed — it never catches up without jumping.

### Videos not paused when not visible
`setDialState(IDLE)` only sets opacity — it does not pause `fgVideo` or `bgVideo`. `setDialState(ACTIVE)` only sets opacity — it does not pause `genericVideo`. All three continue running invisibly, wasting resources. Additionally, `syncFgToBg()` (the existing partial drift monitor) runs every RAF frame regardless of dial state, meaning it runs in IDLE when there is nothing to sync.

---

## Solution

### 1 — Bg src mirroring (eliminates poster flash for adjacent switches)

Instead of a separate bg pool, keep bg in sync with the fg src at all times:
- On pool swap: bg already has the same src → seek `bg.currentTime = fg.currentTime` → no reload, no poster
- On non-adjacent / pool miss: accept src change on both fg and bg; crossfade masks it

Skip `setVideoSourceAndPoster(bgVideo, ...)` if `sameUrl(bgVideo.src, v)` — only reload when URL actually changes. Explicitly seek bg after every pool swap.

### 2 — Paired play helper

Replace all individual fg/bg `play()` calls with `playPaired(fg, bg)`:
```
function playPaired(fg, bg) {
  const sync = () => { bg.currentTime = fg.currentTime; }
  if (fg.readyState >= 2 && bg.readyState >= 2) {
    sync();
    fg.play().catch(() => {});
    bg.play().catch(() => {});
  } else {
    Promise.all([waitCanPlay(fg), waitCanPlay(bg)]).then(() => {
      sync();
      fg.play().catch(() => {});
      bg.play().catch(() => {});
    });
  }
}
```

Call sites:
- `applyActive()` — replaces independent fg/bg play calls
- `setDialState(ACTIVE)` — replaces independent fg/bg play calls on IDLE → ACTIVE re-entry

### 3 — Pause when not visible

Principle: **any video not visible to the user is paused**.

| Video | Pause when | Resume when |
|---|---|---|
| `fgVideo` + `bgVideo` (project) | `setDialState(IDLE)` | `setDialState(ACTIVE)` via `playPaired()` |
| `genericVideo` | `setDialState(ACTIVE)` | `setDialState(IDLE)` |
| Outgoing `visibleVideo` after pool swap | Demoted to pool slot | — (pool videos may play to stay buffered) |
| All active videos | `document.hidden` (tab hidden) | Tab becomes visible again |

Remove the existing `syncFgToBg()` call from `draw()` — it should not run during IDLE. Replace with the drift monitor below, scoped to ACTIVE/ENGAGED only.

### 4 — Drift sync monitor

A dedicated RAF loop (separate from `draw()`) runs only while `dialState !== IDLE`. On each frame:
```
const drift = Math.abs(fg.currentTime - bg.currentTime);
const threshold = isMobile() ? 0.3 : 0.1;
if (drift > threshold) {
  // pause the one that's ahead; resume when the other catches up
  if (fg.currentTime > bg.currentTime) fg.pause();
  else bg.pause();
} else {
  if (fg.paused && !intentionallyPaused) fg.play().catch(() => {});
  if (bg.paused && !intentionallyPaused) bg.play().catch(() => {});
}
```

Monitor starts when entering ACTIVE/ENGAGED, stops when entering IDLE. Cancelled in `cleanup` on `destroy()`.

`intentionallyPaused` is a boolean flag set to `true` when the tab is hidden or when the user explicitly pauses; prevents the monitor from fighting against deliberate pauses.

### 5 — Crossfade on switch

On `applyActive()`, GSAP tween the incoming fg video wrapper from opacity 0 → 1 over 0.2s linear. Skip if `prefers-reduced-motion`.

```
if (!prefersReduced()) {
  gsap.fromTo(fgWrap, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'linear' });
}
```

No crossfade on IDLE ↔ ACTIVE transitions — `genericVideo` and `bgVideo` opacity changes are instant (they are already behind the dial; the visual transition is the dial UI appearing, not the video itself).

---

## Affected Files

| File | Change |
|---|---|
| `work-dial.js` | All changes — bg src mirroring, `playPaired()`, pause-when-not-visible, drift monitor, crossfade |

No other files need changing.

---

## Acceptance Criteria

- [ ] Adjacent switch (prev/next): video plays immediately, no poster frame visible
- [ ] Non-adjacent switch: crossfade from poster to video (smooth, not jarring)
- [ ] fg and bg are in sync within 0.1s on desktop, 0.3s on mobile
- [ ] fg no longer jumps backward while waiting for bg
- [ ] Crossfade plays on switch; no crossfade when `prefers-reduced-motion`
- [ ] In IDLE state: `fgVideo` and `bgVideo` are paused; `genericVideo` is playing
- [ ] In ACTIVE/ENGAGED state: `fgVideo` and `bgVideo` are playing in sync; `genericVideo` is paused
- [ ] On pool swap: outgoing `visibleVideo` is paused when demoted to pool slot
- [ ] Tab hidden: all active project videos pause; resume on tab return
- [ ] Sync monitor only runs in ACTIVE/ENGAGED, not in IDLE
- [ ] Sync monitor is cleaned up correctly on `destroy()`
- [ ] No console errors on Barba return to home

---

## Tasks

See `queue.json` for task breakdown (IDs: `video-sync-*`).

---

## ADR Required

**ADR 002** — Bg video pooling vs bg sync strategy.
Decision: use bg sync (mirror fg src, seek on swap) rather than a separate bg pool (4 elements, 2× bandwidth for same file). See `.claude/adrs/002-bg-video-sync-strategy.md`.

---

## Why This Approach Was Abandoned (2026-02-25)

Implemented in `work-dial.js` v`2026.2.25.1`–`2026.2.25.6`. Still failing acceptance criteria after six iterations:

- **Adjacent switch lag (0.3s, worsening on repeat)** — The fg pool swap is instant but bg.src must change on every switch, triggering a browser reload each time. Even with the `playPaired` generation-counter fix (v6), the bg reload is unavoidable with this architecture.
- **canplay promise leaks** — When the user switches rapidly, each `waitCanPlay(bg)` promise waits on a `{ once: true }` 'canplay' listener. Mid-load src changes cancel the previous load; the old listener never fires; the fg video (already buffered from pool) stalls waiting for a promise that will never resolve. The gen-counter partially fixes this but the underlying reload lag remains.
- **Pool only helps fg** — The sliding window pool (`poolPrev`/`poolNext`) eliminates fg reload for adjacent switches. There is no equivalent for bg. Adding a bg pool doubles element count and bandwidth for the same files — rejected in ADR 002. But the alternative (bg src mirroring) is exactly the problem.

**Root cause:** Any architecture that changes `video.src` at switch time will have a load lag. The only way to eliminate it is to never change src after initial load.

---

## v2 Architecture: Parallel Video Elements

### Concept

On `init()`, create N fg + N bg `<video>` elements (one per project, max 8). All load simultaneously with `preload="auto"`. They are always in the DOM but hidden (`opacity: 0`, `pointer-events: none`).

On switch: GSAP crossfade the outgoing pair (opacity 0) and incoming pair (opacity 1). **No src changes ever after init.** Zero reload lag for all switches, including non-adjacent.

### Element layout

```
comp
├── .dial_generic-video          (existing IDLE bg)
├── .dial_bg-video[data-idx="0"] (project 0 bg)  opacity: 0 initially
├── .dial_bg-video[data-idx="1"] (project 1 bg)  opacity: 0 initially
│   ...
├── .dial_bg-video[data-idx="7"]
├── .dial_video-wrap             (fg clip circle)
│   ├── .dial_fg-video[data-idx="0"]  opacity: 0 initially
│   ├── .dial_fg-video[data-idx="1"]  opacity: 0 initially
│   │   ...
│   └── .dial_fg-video[data-idx="7"]
```

`applyActive(idx)`:
1. GSAP `to(outgoingFg, { opacity: 0, duration: 0.15 })`
2. GSAP `to(outgoingBg, { opacity: 0, duration: 0.15 })`
3. GSAP `to(incomingFg, { opacity: 1, duration: 0.15 })`
4. GSAP `to(incomingBg, { opacity: 1, duration: 0.15 })`
5. `playPaired(incomingFg, incomingBg)` (both already buffered — this is instant)

### Pause-when-not-visible

Same principle, but simpler: `pause()` all non-active pairs. `play()` only the active pair + genericVideo when IDLE.

### Drift monitor

Unchanged — watches `activeIdx` fg/bg pair. `bg.paused` guard still applies.

### Barba cleanup

`destroy()`: pause + remove all N×2 elements.

### Cost

8 × 2 = 16 simultaneous loads. These are short loop videos (~5–20MB each) served from Vimeo CDN. Browser staggered loading + HTTP/2 multiplexing means this should not degrade page performance significantly. Flag for perf check (task `dial-upgrade-perf`).

### Tasks

See queue entry `video-sync-rearchitect` (status: blocked on design sign-off).
