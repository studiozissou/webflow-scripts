# Spec: Case Video — Progress Bar, Viewport Auto-Pause, Auto-Hide Controls

**Slug**: `feat-case-video-progress-autohide`
**Priority**: P0
**Status**: Ready to Build
**Agent**: code-writer
**Supersedes**: `feat-case-video-intersection`, `feat-video-controls-autohide`

## Context

RHP work pages (`/work/*`) have `.section_case-video` blocks with play/pause and mute/unmute controls (`.case-video_control-wrapper`). The existing `case-video-controls.js` module wires those icon toggles. Three enhancements are needed:

1. **Progress bar** — a clickable scrub bar at the bottom of each controlled video, matching the ref design
2. **Viewport auto-pause** — videos pause when scrolled out of view (with volume fade), resume when scrolled back in, respecting manual pause intent
3. **Auto-hide controls** — controls + title fade out after 2s of mouse inactivity over the video, fade back in on mouse movement

## Files to Modify

| File | Action |
|------|--------|
| `case-video-controls.js` | Extend with progress bar + IntersectionObserver + userPaused flag + auto-hide |
| `ready-hit-play.css` | Add progress bar + auto-hide styles |

Reference only (no changes): `orchestrator.js` (already wires init/destroy at lines 351, 358)

## DOM Structure (Existing)

```html
<section class="section_case-video">
  <div class="dial_video-wrap is-case-study w-embed">
    <video class="video-cover" autoplay muted loop playsinline preload="metadata" src="..."></video>
  </div>
  <div class="case-video_control-wrapper">
    <h2 class="text-size-regular text-color-white">Video title</h2>
    <div class="case-video_controls">
      <div class="play-pause">...</div>
      <div class="mute-unmute">...</div>
    </div>
  </div>
</section>
```

Only sections with `.case-video_control-wrapper` get the new features.

## Design

### 1. Progress Bar

**DOM injection** (JS-created, appended to `.section_case-video`):

```html
<div class="case-video_progress-track">
  <div class="case-video_progress-hover"></div>  <!-- white 30% hover preview -->
  <div class="case-video_progress-fill"></div>    <!-- teal #05EFBF fill -->
</div>
```

- Track background via `::before` pseudo — `rgba(255,255,255,0.2)`
- Fill renders on top of hover (DOM order), so hover only shows ahead of progress
- Height: `0.5rem`, `position: absolute; bottom: 0`
- `data-cursor="dot"` on the track element so the custom cursor stays as white dot on hover (no native `cursor: pointer` — native cursor is already hidden sitewide by `RHP.cursor`)
- `.section_case-video { position: relative }` enforced in CSS

**Progress update**: `requestAnimationFrame` loop reads `video.currentTime / video.duration`, sets `fill.style.width`. Guarded by `isFinite(video.duration)`. Loops naturally reset since `<video loop>` resets `currentTime` to 0.

**Hover preview**: `mousemove` on track sets `hoverBar.style.width` to cursor %. `mouseleave` resets to 0. Teal fill on top masks the overlap — no need to compute gap.

**Click to seek**: `track.click` → `video.currentTime = clickPct * video.duration`

### 2. Viewport Auto-Pause with Volume Fade

**IntersectionObserver** with `threshold: 0.3` — created in `init()`, each controlled section observed.

**Scrolled out:**
1. Skip if already paused
2. Save volume: `video._rhpSavedVolume = video.volume`
3. Set `video._rhpAutoPaused = true`
4. If unmuted: GSAP fade `volume → 0` over 0.5s, then `video.pause()` in `onComplete`
5. If muted or reduced-motion: immediate `video.pause()`

**Scrolled back in:**
1. Skip if `video._rhpUserPaused` (respect manual pause)
2. Skip if not `video._rhpAutoPaused`
3. `video.play()`, then GSAP fade `volume → savedVolume` over 0.5s
4. `.play().catch(() => {})` for autoplay policy

**userPaused flag**: Modify existing `onPlayPauseClick` — set `_rhpUserPaused = true` on pause, `false` on play.

**GSAP cleanup**: `gsap.killTweensOf(video, 'volume')` before every new tween (handles rapid scroll). In `destroy()`, kill all tweens for all wired videos via a `Set`.

### 3. Auto-Hide Controls on Inactivity

**Desktop:**
- Mouse idle over `.section_case-video` for 2s → fade out `.case-video_control-wrapper` + `.case-video_progress-track` via GSAP (`opacity → 0, duration: 0.4`)
- Any `mousemove` → cancel timer, fade in (`opacity → 1, duration: 0.3`), restart 2s timer
- `mouseleave` → clear timer, show controls
- While controls are hidden, hide the **custom cursor element** too (cinematic feel): `gsap.to(cursorWrapper, { opacity: 0 })` where `cursorWrapper = document.querySelector('.cursor_dot-wrapper')`. Restore on mousemove: `gsap.to(cursorWrapper, { opacity: 1 })`. This avoids modifying the cursor module — just fades its DOM element.

**Mobile** (`hover: none, pointer: coarse`):
- Tap-to-toggle controls visible/hidden
- Auto-hide after 3s of no further taps
- Tapping play/pause/mute does NOT trigger the toggle (`stopPropagation` on control elements)
- Detect mobile via `window.matchMedia('(hover: none) and (pointer: coarse)')`

**Implementation:**
- Per-section idle timer (`setTimeout`), cleared on mousemove/tap/mouseleave
- `gsap.killTweensOf(controlWrapper)` before each fade tween
- Custom cursor: fade `.cursor_dot-wrapper` opacity to 0 when controls hide, back to 1 when controls show. Query once in `wireSection`, guard with null check (cursor doesn't init on mobile).
- All timers and tweens cleaned up in `destroy()`

**What fades:** `.case-video_control-wrapper` + `.case-video_progress-track`. NOT the video.

## Edge Cases

| Case | Handling |
|------|----------|
| `duration` NaN (not loaded) | `isFinite()` guard — fill stays 0% |
| Seek while paused | Works natively; RAF updates fill |
| Rapid scroll in/out | `killTweensOf` before each new tween |
| User pause → scroll out → scroll back | `_rhpUserPaused` prevents resume |
| Video muted | Volume fade skipped, direct pause/play |
| `prefers-reduced-motion` | Instant volume change (no tween) |
| Autoplay blocked | `.catch(() => {})` silent fail |
| Section without controls | `wireSection` early return — no bar, no observer |
| Controls hidden + click video area | Desktop: mousemove fires first → controls show + cursor reappears → click lands on visible control. Mobile: tap toggles |
| Cursor wrapper not found | Null guard — cursor doesn't init on mobile, so `.cursor_dot-wrapper` won't exist. Skip cursor fade. |
| Rapid mousemove during fade-out | `killTweensOf` on control wrapper before each fade tween |
| Video paused while controls hidden | Controls stay in their current state; auto-hide timer still runs |

## Barba Impact

1. **Init/Destroy lifecycle** — Adds DOM elements (progress bar), event listeners (mousemove, click, IO), RAF loops, GSAP tweens (volume + control opacity), and setTimeout timers. All registered in `cleanups[]` and `wiredVideos` Set. `destroy()` runs on `beforeLeave` (orchestrator line 1302/1332) — cancels RAFs, disconnects IO, clears timers, kills GSAP tweens, removes injected DOM.

2. **State survival** — No state survives transitions. `_rhpUserPaused` / `_rhpAutoPaused` flags cleaned on destroy. Video handoff `currentTime` read (orchestrator lines 1321-1330) unaffected by pause/volume. In-flight GSAP volume tweens killed by `gsap.killTweensOf` in `destroy()` — prevents post-destroy callbacks.

3. **Transition interference** — Progress bar + controls inside `[data-barba="container"]`, replaced by Barba DOM swap. No z-index or opacity conflicts. `.is-controls-hidden` class removed on swap.

4. **Re-entry correctness** — `destroy()` clears everything; `init()` runs fresh on new container. No stale listeners, no doubled DOM.

5. **Namespace scoping** — Only runs on `case` namespace (orchestrator lines 351/358).

## Implementation Steps

1. **CSS** — Add to `ready-hit-play.css`: progress bar styles (track, fill, hover, `::before` rail), section `position: relative`, `.is-controls-hidden` cursor rule, control wrapper transition base
2. **Progress bar JS** — In `wireSection`: create DOM, start RAF loop, add mousemove/mouseleave/click handlers, push to cleanup
3. **IntersectionObserver** — Create in `init()`, observe each controlled section, `handleVisibility` callback with volume fade
4. **userPaused flag** — Modify `onPlayPauseClick` to track intent
5. **Auto-hide controls** — Per-section idle timer, GSAP fade tweens, mobile tap-to-toggle, cursor hide/show via `.cursor_dot-wrapper` opacity
6. **Cleanup** — `wiredVideos` Set for GSAP tween cleanup in `destroy()`, observer disconnect, RAF cancel, DOM removal, timers cleared
7. **Version bump** — Update `VERSION` string

## Verification

1. Load a work page locally (e.g. `/work/overland-ai`)
2. **Progress bar**: tracks playback, resets on loop, hover preview shows ahead of fill only, click seeks correctly
3. **Viewport pause**: Scroll video out of view → volume fades → pauses. Scroll back → resumes with fade-in
4. **Manual pause respect**: Click pause → scroll out → scroll back → stays paused. Click play → normal cycle resumes
5. **Auto-hide (desktop)**: Hover over video, stop moving mouse → controls fade out after 2s. Move mouse → fade back in. Cursor hidden while controls hidden.
6. **Auto-hide (mobile)**: Tap video → controls toggle. After 3s of no taps, controls auto-hide. Tapping play/pause/mute does NOT trigger toggle.
7. **Barba**: Navigate away and back → no console errors, no orphaned observers/timers
8. Run `npm test` (smoke + a11y) after deploying to staging
