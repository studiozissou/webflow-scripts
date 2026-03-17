# feat-video-buffering-ux

## Summary
Comprehensive video buffering UX: (A) Lottie loading spinner on all visible videos, (B) eliminate reverse-frame jerk on pool swap seeks, (C) keep BG video frame-locked to FG at all times — including during buffering/loading, so both videos stall on the same frame.

Consolidates and supersedes:
- `feat-video-loading-spinner` (spinner only)
- `fix-pool-swap-reverse-frames` (reverse-frame jerk)

## Motivation
On slow connections, three things break the illusion:
1. **No feedback** — video stalls with no visual indicator; user thinks site is frozen.
2. **Reverse-frame jerk** — on homepage sector switch, pool swap seeks backwards and the browser briefly renders intermediate frames in reverse order.
3. **BG/FG desync during buffering** — FG stalls but BG keeps playing (or both stall on different frames), creating a visible mismatch between the sharp foreground and blurred background.

---

## Part A: Lottie Loading Spinner

### Lottie Asset
- URL: `https://cdn.prod.website-files.com/641ab9fdf6e779f347e7e659/642558fa09463525f4cc1053_spinner1-white.json`
- Renderer: SVG (lottie_light)
- Loop: true
- Autoplay: true (when container is visible)

### Target Video Elements

| Video | Selector | Container for spinner | Notes |
|-------|----------|----------------------|-------|
| Home FG | `.dial_fg-video` | `#fg-video-wrap` | Swapped from pool — spinner must re-attach on pool swap |
| Work/case page — all visible videos | `[data-barba="container"] video` | Closest positioned parent | Catches `video.video-cover` in `.section_case-video`, videos in `.dial_video-wrap`, and any other `<video>` on the page |

### Excluded from spinner
- `.dial_generic-video` — plays during home intro sequence (IDLE state). Spinner would break the choreographed intro flow.
- `.dial_bg-video` — blurred at 40px, spinner invisible behind blur.
- Pool videos (`poolPrev`, `poolNext`, `bgPoolPrev`, `bgPoolNext`) — hidden off-screen at -9999px, preloading only.
- Any video with `opacity: 0` or dimensions ≤ 1px (pool/hidden detection).

### New module: `video-loader.js`
IIFE module registered on `window.RHP.videoLoader`. Follows standard pattern: `init(container)` / `destroy()` / `version`.

### Dependency: `lottie-web` (light)
- CDN: `https://cdn.jsdelivr.net/npm/lottie-web@5.12.2/build/player/lottie_light.min.js`
- Loaded in `init.js` `CONFIG.deps` array, before modules
- Exposes `window.lottie` (or `window.bodymovin`)

### How video-loader.js works

1. **`init(container)`**: Query target videos in two passes:
   - **Pass 1 (persistent dial):** Attach to `.dial_fg-video` inside `#fg-video-wrap`. Skip `.dial_generic-video` and `.dial_bg-video`.
   - **Pass 2 (Barba container):** Query `[data-barba="container"] video` to catch ALL visible videos on the current page. Skip any video that is a pool element (opacity 0, dimensions ≤ 1px, or positioned off-screen).
   - For each qualifying video, call `attachSpinner(videoEl)`.
2. **`attachSpinner(videoEl)`**:
   - Find the spinner's positioning parent (the video's closest positioned ancestor or explicit container).
   - Create a `<div class="rhp-video-spinner">` — absolute positioned, centered, pointer-events none, z-index above video.
   - Call `lottie.loadAnimation({ container, path: SPINNER_URL, renderer: 'svg', loop: true, autoplay: false })`.
   - Listen for video events:
     - `waiting` → show spinner (fade in 0.3s, `anim.play()`)
     - `playing` → hide spinner (fade out 0.3s, `anim.pause()` after fade)
     - `canplay` → hide spinner
     - `error` → hide spinner (don't leave spinner stuck)
   - **Initial load check**: if `videoEl.readyState < 2` at attach time, show spinner immediately. Listen for `canplay`/`loadeddata` to hide.
3. **`detachSpinner(videoEl)`**: Remove DOM, destroy Lottie instance, remove event listeners.
4. **`destroy()`**: Detach all spinners, clear internal map.

### Spinner DOM structure
```html
<div class="rhp-video-spinner" aria-hidden="true" style="pointer-events: none;">
  <!-- Lottie SVG injected here -->
</div>
```

### CSS (in `ready-hit-play.css`)
```css
.rhp-video-spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 48px;
  height: 48px;
  z-index: 5;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
}
.rhp-video-spinner.is-active {
  opacity: 1;
}
```

### MutationObserver for dynamic videos
The home dial swaps pool videos into `#fg-video-wrap` at runtime. `video-loader.js` uses a MutationObserver on `#fg-video-wrap` (childList) to detect when a new `.dial_fg-video` appears and attach a spinner. Old spinners are cleaned up when their video is removed.

### prefers-reduced-motion
If `prefers-reduced-motion: reduce`, skip the Lottie animation entirely. Instead, show a static CSS spinner (simple `border` + `border-top-color` + `@keyframes spin`) as a lightweight alternative.

---

## Part B: Eliminate Reverse-Frame Jerk on Pool Swap

### Problem
In `work-dial.js` `applyActive()`, when switching to a previously-visited sector:
1. `restoreVideoStateFromIndex(poolNext, idx)` seeks the pool video to saved `currentTime S`
2. Pool video was preloading at time `T` where `T > S`
3. Browser renders intermediate frames in reverse (T → S) for ~2–4 frames
4. User sees a brief backwards playback flash

### Root cause
`restoreVideoStateFromIndex()` (line ~465) sets `videoEl.currentTime` synchronously, but the browser seek is async. The video element renders whatever frames it has decoded while seeking backwards. The poster was already cleared (`poolPrev.poster = ''` at line ~634), so there's nothing to mask this.

### Fix: poster-mask during seek
In `applyActive()` pool swap path (`work-dial.js`):

1. **Before making pool video visible:** Do NOT clear the poster yet. Keep it as a visual mask.
2. **After appending to `#fg-video-wrap`:** If seeking backwards (`savedTime < poolEl.currentTime`), set a temporary CSS class `.is-seeking` on the video that shows the poster/last-good-frame over the video.
3. **Listen for `seeked` event** (once): Remove `.is-seeking`, clear poster, resume normal display.
4. **If seeking forward** (or same position): No mask needed — forward seeks don't render in reverse.
5. **Timeout guard:** If `seeked` doesn't fire within 500ms, remove `.is-seeking` anyway to prevent stuck state.

### CSS for seek mask
```css
.dial_fg-video.is-seeking {
  /* Keep poster visible over video frames during backwards seek */
  object-fit: cover; /* already set, just confirming */
}
```

Alternative approach (simpler): Instead of poster masking, set `videoEl.opacity = 0` during seek, then fade in on `seeked`. This avoids any poster flash entirely — the previous frame stays visible underneath (via the pool swap crossfade timing).

### Files changed
- `work-dial.js` — pool swap path in `applyActive()`, ~15 lines changed

---

## Part C: BG Frame-Locked to FG During Buffering

### Problem
Currently the drift monitor (`driftMonitorTick`, line ~519) only corrects BG position when:
- FG is actively playing (`!visibleVideo.paused`)
- Drift exceeds threshold (0.1s desktop / 0.3s mobile)

When FG enters `waiting` state (buffering), `visibleVideo.paused` is still `false` (waiting ≠ paused), but FG stops advancing frames. BG may continue playing or may stall on a **different frame** — the drift monitor won't correct because FG isn't advancing, so drift stays below threshold until BG gets ahead.

### Root cause
- No `waiting`/`seeking` event listeners on FG video
- `intentionallyPaused` flag only tracks tab visibility, not buffering state
- Drift monitor is reactive (corrects after drift), not proactive (prevents drift)

### Fix: FG buffering event listeners in `work-dial.js`

Add event listeners on `visibleVideo` (and re-attach after pool swaps):

1. **`waiting` event on FG** → immediately:
   - Set `bg.currentTime = fg.currentTime` (snap BG to exact FG frame)
   - Pause BG (`bg.pause()`)
   - Set internal flag `fgBuffering = true`

2. **`playing` event on FG** → immediately:
   - Set `bg.currentTime = fg.currentTime` (re-snap before resuming)
   - Resume BG (`bg.play()`)
   - Set `fgBuffering = false`

3. **`seeking` event on FG** → immediately:
   - Set `bg.currentTime = fg.currentTime` (match seek target)

4. **`seeked` event on FG** → immediately:
   - Set `bg.currentTime = fg.currentTime` (confirm match after seek completes)
   - If not `fgBuffering`, resume BG

5. **Drift monitor update**: Add `fgBuffering` check — if `fgBuffering === true`, snap BG to FG position every frame (even if drift < threshold) and keep BG paused. This catches edge cases where events are missed or race.

### Event listener lifecycle
- Attached in `playPaired()` after FG starts playing (or in a new `syncBgToFg()` helper)
- Re-attached after every pool swap (new `visibleVideo` reference)
- Removed in `destroy()` cleanup array
- Stored as named functions so `removeEventListener` works

### Case page BG sync (orchestrator.js)
The case page drift correction (orchestrator.js line ~1300, `setInterval` every 500ms) should also get the same treatment:
- Listen for `waiting`/`playing` on the case FG video
- Pause/snap BG on `waiting`, resume on `playing`

### Files changed
- `work-dial.js` — new event listeners (~30 lines), drift monitor update (~5 lines)
- `orchestrator.js` — case page BG sync enhancement (~15 lines)

---

## Barba Impact

1. **Init/Destroy lifecycle**:
   - `video-loader.js` (Part A): `init(container)` / `destroy()` per namespace via orchestrator.
   - Parts B & C are inside `work-dial.js` and `orchestrator.js` — already managed by existing Barba lifecycle.
   - FG buffering event listeners (Part C) must be cleaned up in `work-dial.destroy()` and re-attached in `work-dial.init()`.
2. **State survival**: No state persists across transitions. `fgBuffering` flag resets on destroy. Spinners are ephemeral.
3. **Transition interference**: Spinner is `position: absolute`, `pointer-events: none`. Seek mask is brief (< 500ms). No conflict with dial morph or overlay transitions.
4. **Re-entry correctness**: All event listeners removed in destroy, re-attached in init. MutationObserver stopped and restarted. No stale callbacks.
5. **Namespace scoping**:
   - Part A (spinner): All namespaces — no-op where no videos exist.
   - Part B (seek mask): Home only (pool swaps only happen on homepage dial).
   - Part C (BG sync): Home (drift monitor in work-dial.js) + case (interval sync in orchestrator.js).

## Load Order
In `init.js` `CONFIG.modules`, add `video-loader.js` after `case-video-controls.js` and before `orchestrator.js`:
```
...
10. case-video-controls.js
11. video-loader.js        ← NEW
12. orchestrator.js
13. utils.js
14. overland-ai.js
```

In `CONFIG.deps`, add lottie-web light:
```
{ id: 'lottie', src: 'https://cdn.jsdelivr.net/npm/lottie-web@5.12.2/build/player/lottie_light.min.js' }
```

## Task Breakdown

| # | Task | Agent | Est. tokens | Parallel? |
|---|------|-------|-------------|-----------|
| 1 | Add lottie-web light to `init.js` deps + `video-loader.js` to module list + health check | code-writer | 2K | — |
| 2 | Create `video-loader.js` module (IIFE, init/destroy, MutationObserver, event wiring) | code-writer | 8K | After 1 |
| 3 | Add `.rhp-video-spinner` CSS to `ready-hit-play.css` | code-writer | 1K | Parallel with 2 |
| 4 | Wire `video-loader` init/destroy in `orchestrator.js` views | code-writer | 2K | After 2 |
| 5 | Part B: Add seek-mask logic to pool swap path in `work-dial.js` `applyActive()` | code-writer | 3K | After 2 |
| 6 | Part C: Add FG buffering event listeners + `fgBuffering` flag in `work-dial.js` | code-writer | 4K | Parallel with 5 |
| 7 | Part C: Enhance case page BG sync in `orchestrator.js` with waiting/playing listeners | code-writer | 2K | After 6 |
| 8 | Update CLAUDE.md file responsibilities table + known gotchas | code-writer | 1K | After all |

### Parallelisation Map
- **Stream A** (sequential): 1 → 2 → 4 → 5
- **Stream B** (parallel with A after task 2): 3 (CSS)
- **Stream C** (parallel with Stream A task 5): 6 → 7
- **Stream D** (after all): 8 (docs)
- Recommendation: Sequential build (single code-writer). Parts B and C modify the same file (`work-dial.js`) so they should not run in parallel worktrees.

## Verification
1. Load homepage on localhost — spinner appears briefly on FG video if not cached, fades out on `canplay`
2. Throttle network to Slow 3G — spinner clearly visible; BG and FG stall on the same frame (verify via DevTools: `fg.currentTime === bg.currentTime` while both are waiting)
3. Rapid sector switching on homepage dial (drag back and forth) — no reverse-frame flicker on any swap
4. Navigate to a work page — spinner appears on all visible case videos during load
5. Navigate home → case → home via Barba — no console errors, no orphaned spinner DOM, no doubled event listeners
6. Check `window.RHP.videoLoader.version` exists in console
7. Check DevTools: `.rhp-video-spinner` elements have `pointer-events: none` and `aria-hidden="true"`
8. Enable `prefers-reduced-motion` — CSS fallback spinner (no Lottie)
9. Tab away and back — videos resume in sync (existing behavior preserved)
10. Run `npm test` — existing smoke + a11y tests still pass
11. Run acceptance tests: `npx playwright test tests/acceptance/feat-video-buffering-ux.spec.js`

## Acceptance Tests
See `tests/acceptance/feat-video-buffering-ux.spec.js`:
1. `spinner container exists on homepage FG video` — `.rhp-video-spinner` attached inside `#fg-video-wrap`
2. `spinner on every visible work page video` — count spinners ≥ visible videos in Barba container
3. `spinner on .section_case-video video` — `.rhp-video-spinner` attached inside `.section_case-video`
4. `spinner has correct CSS (absolute, centered, pointer-events none)` — computed styles check
5. `spinner has aria-hidden="true"` — accessibility
6. `no JS errors on homepage` — console error check
7. `no JS errors on work page` — console error check
8. `Barba home→case→home: no orphaned spinners` — count check after round-trip
9. `RHP.videoLoader is registered` — `window.RHP.videoLoader` with init/destroy/version
10. `prefers-reduced-motion: no JS errors` — fallback works
11. `no WCAG 2.1 AA violations on homepage` — axe-core audit
