# feat-video-loading-spinner

## Summary
Add a Lottie loading spinner overlay to every visible video element on the RHP site. The spinner fades in when a video is buffering or hasn't loaded its first frame, and fades out when playback resumes. Uses `lottie-web` (light build, ~50KB gzip) loaded as a new dependency in `init.js`.

## Motivation
On slow connections or large video files, videos can stall without any visual feedback. The user sees a frozen frame and may think the site is broken. A centered loading spinner communicates that content is loading.

## Lottie Asset
- URL: `https://cdn.prod.website-files.com/641ab9fdf6e779f347e7e659/642558fa09463525f4cc1053_spinner1-white.json`
- Renderer: SVG (lottie_light)
- Loop: true
- Autoplay: true (when container is visible)

## Target Video Elements

| Video | Selector | Container for spinner | Notes |
|-------|----------|----------------------|-------|
| Home FG | `.dial_fg-video` | `#fg-video-wrap` | Swapped from pool — spinner must re-attach on pool swap |
| Work/case page — all visible videos | `[data-barba="container"] video` | Closest positioned parent | Catches `video.video-cover` in `.section_case-video`, videos in `.dial_video-wrap`, and any other `<video>` on the page |

### Excluded
- `.dial_generic-video` — plays during home intro sequence (IDLE state). Showing a spinner here would break the choreographed intro flow and draw attention to a background element the user isn't focused on yet.
- `.dial_bg-video` — blurred at 40px, spinner invisible
- Pool videos (`poolPrev`, `poolNext`, `bgPoolPrev`, `bgPoolNext`) — hidden off-screen at -9999px, preloading only
- Any video with `opacity: 0` or dimensions ≤ 1px (pool/hidden detection)

## Architecture

### New module: `video-loader.js`
IIFE module registered on `window.RHP.videoLoader`. Follows standard pattern: `init(container)` / `destroy()` / `version`.

### Dependency: `lottie-web` (light)
- CDN: `https://cdn.jsdelivr.net/npm/lottie-web@5.12.2/build/player/lottie_light.min.js`
- Loaded in `init.js` `CONFIG.deps` array, before modules
- Exposes `window.lottie` (or `window.bodymovin`)

### How it works

1. **`init(container)`**: Query target videos in two passes:
   - **Pass 1 (persistent dial):** Attach to `.dial_fg-video` inside `#fg-video-wrap`. Skip `.dial_generic-video` and `.dial_bg-video`.
   - **Pass 2 (Barba container):** Query `[data-barba="container"] video` to catch ALL visible videos on the current page (covers `video.video-cover`, videos in `.dial_video-wrap`, and any other `<video>` on work pages). Skip any video that is a pool element (opacity 0, dimensions ≤ 1px, or positioned off-screen).
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
If `prefers-reduced-motion: reduce`, skip the Lottie animation entirely. Instead, show a static CSS spinner (simple `border` + `border-top-color` + `@keyframes spin`) as a lightweight alternative. This avoids unnecessary animation for users who've opted out.

## Barba Impact

1. **Init/Destroy lifecycle**: `video-loader.js` exposes `init(container)` / `destroy()`. Orchestrator calls `init` on `afterEnter` for all namespaces, `destroy` on `leave`.
2. **State survival**: No state needs to persist across transitions. Spinners are ephemeral — destroyed on leave, re-created on enter.
3. **Transition interference**: Spinner is `position: absolute` inside video containers, `pointer-events: none`, low z-index. No conflict with dial morph animations or overlay transitions. The dial lives outside Barba container — the MutationObserver on `#fg-video-wrap` continues to work because dial is persistent.
4. **Re-entry correctness**: `destroy()` removes all spinners + observer. `init()` re-queries and re-attaches. No stale listeners or doubled DOM.
5. **Namespace scoping**: Runs on ALL namespaces (home, about, case, contact). Only attaches to videos that actually exist on the page. About and contact have no videos — init is a no-op.

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
| 1 | Add lottie-web light to `init.js` deps + `video-loader.js` to module list | code-writer | 2K | — |
| 2 | Create `video-loader.js` module (IIFE, init/destroy, MutationObserver, event wiring) | code-writer | 8K | After 1 |
| 3 | Add `.rhp-video-spinner` CSS to `ready-hit-play.css` | code-writer | 1K | Parallel with 2 |
| 4 | Wire `video-loader` init/destroy in `orchestrator.js` views | code-writer | 2K | After 2 |
| 5 | Update `init.js` health check to include `videoLoader` | code-writer | 1K | Parallel with 4 |
| 6 | Update CLAUDE.md file responsibilities table | code-writer | 1K | After 4 |

### Parallelisation Map
- **Stream A** (sequential): Tasks 1 → 2 → 4
- **Stream B** (parallel with A): Task 3 (CSS), Task 5 (health check)
- **Stream C** (after all): Task 6 (docs)
- Recommendation: Sequential build (single code-writer), tasks are small and interdependent. No worktrees needed.

## Verification
1. Load homepage on localhost — spinner should appear briefly on FG video if not cached, then fade out when `canplay` fires
2. Throttle network to Slow 3G in DevTools — spinner should be clearly visible during video load
3. Navigate home → case → home via Barba — no console errors, no orphaned spinner DOM
4. Check `window.RHP.videoLoader.version` exists in console
5. Check with DevTools: `.rhp-video-spinner` elements have `pointer-events: none` and `aria-hidden="true"`
6. Enable `prefers-reduced-motion` in DevTools — confirm CSS fallback spinner (no Lottie)
7. Run `npm test` — existing smoke + a11y tests still pass
8. Run acceptance tests: `npx playwright test tests/acceptance/feat-video-loading-spinner.spec.js`

## Acceptance Tests
See `tests/acceptance/feat-video-loading-spinner.spec.js`:
1. `spinner container exists on homepage FG video` — `.rhp-video-spinner` attached inside `#fg-video-wrap`
2. `spinner container exists on case study video` — `.rhp-video-spinner` attached inside `.section_case-video`
3. `spinner has correct CSS (absolute, centered, pointer-events none)` — computed styles check
4. `spinner has aria-hidden="true"` — accessibility
5. `no JS errors on homepage` — console error check
6. `no JS errors on case page` — console error check
7. `Barba home→case→home: no orphaned spinners` — count check after round-trip
8. `RHP.videoLoader is registered` — `window.RHP.videoLoader` exists with init/destroy/version
9. `prefers-reduced-motion: spinner container still present` — fallback works
10. `no WCAG 2.1 AA violations on homepage` — axe-core audit
