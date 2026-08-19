# ready-hit-play-prod — Project Guide

## What this is
Production scripts for https://rhpcircle.webflow.io/ — a creative agency site for Ready Hit Play, Amsterdam.
Vanilla ES2022+, no build step. Single CDN entry via `init.js` → loads deps + modules in sequence.

## Deployment
- `init.js` is the only script tag in Webflow (head). It self-loads everything.
- jsDelivr serves files pinned to a commit hash (e.g. `...@abc1234/projects/ready-hit-play-prod/init.js?v=N`).
- Local dev: serve repo root on localhost; `init.js` detects local origin and loads from disk.
- On deploy: bump `CONFIG.version` in `init.js`, push, update commit hash + `?v=` in Webflow.
- CSS (`ready-hit-play.css`) is also linked from jsDelivr in the same Webflow head block.

## IMPORTANT: All RHP work happens here
- **This folder** (`ready-hit-play-prod/`) is the single source of truth — dev and live.
- `projects/ready-hit-play/` is legacy and not in use.

## Module load order
Defined in `init.js` -> `CONFIG.modules` (load order matters). Read it there; dependency scripts are loaded ahead of the module list in the same file.

## File responsibilities

| File | Version | Responsibility |
|------|---------|----------------|
| `init.js` | 2026.3.12.1 | Loader: load order, dev/CDN URL resolution, health check, `window.RHP` bootstrap, project CSS loading |
| `orchestrator.js` | 2026.8.12.4 | Barba conductor: init/destroy modules per page, transitions (morph in leave), scroll lock, contact pullout, dial namespace restructure |
| `lenis-manager.js` | 2026.2.6.10 | Lenis instance: start/stop on Barba transitions, ScrollTrigger proxy for case scroll wrapper |
| `cursor.js` | 2026.2.18.1 | Custom cursor: 4 states (dot/solid-orange/arrow-orange/arrow-white), data-attribute driven |
| `work-dial.js` | 2026.8.18.3 | Homepage dial: canvas ticks, video pool (sliding window), sector switch with fg-video deadzone, drag/hover; inert while a case study is displayed (`inCaseStudyMode()`) |
| `home-about-slide.js` | 2026.8.12.1 | Home↔about curtain/slide transitions; `leaveAboutToHome(data, opts)` takes an optional `{ duration }` |
| `transition-dial.js` | 2026.8.12.1 | Static teal canvas dial shown during Barba transitions; also paints the static ring into the persistent `#dial_ticks-canvas` for the about→work via-home beat (`paintInto`/`clearCanvas`) |
| `about-dial-ticks.js` | 2026.2.6.10 | Small 6rem static teal dial on about page |
| `about-text-lines.js` | 2026.2.13.1 | Scroll-linked per-line text fade on about page (SplitText + Lenis scroll events) |
| `about-swipers.js` | 2026.8.17.1 | Swiper crossfade sliders on about page **and** their desktop sizing — each `[data-slider]` gets its own `--slide-max-height`; also publishes `--accordion-title-height` for the sticky carousel |
| `home-intro.js` | 2026.2.11.1 | One-time intro sequence on fresh home load (step text → ticks → video → nav) |
| `intro-format.js` | — | Sanitise `[data-text="intro"]` HTML on case pages (decode entities, strip disallowed tags) |
| `earth-parallax.js` | 2026.2.23.1 | Scroll-linked `.earth-image` parallax on case pages (ScrollTrigger) |
| `case-video-controls.js` | 2026.3.10.1 | Case video play/pause, mute, progress bar, viewport auto-pause, auto-hide controls |
| `video-loader.js` | 2026.3.17.1 | Lottie loading spinner on visible videos; MutationObserver for pool swaps; reduced-motion CSS fallback |
| `overland-ai.js` | — | Page-specific: grid hover + mobile benefit video autoplay |
| `utils.js` | — | Copyright year, `rel="noreferrer noopener"` on `_blank` links, UTM form fields |
| `ready-hit-play.css` | — | All styles: dial layout, cursor, state flags, custom properties, Barba namespace scoping |

## Barba namespaces

| Namespace | Scroll | Lenis | Modules active |
|-----------|--------|-------|----------------|
| `home` | CSS-locked (`overflow: hidden`) | Stopped | work-dial (introMode), transition-dial, cursor |
| `about` | Unlocked | Started (window) | about-dial-ticks, about-text-lines, cursor |
| `case` | Unlocked | Started (custom wrapper if present) | earth-parallax, cursor; intro-format on enter |

- Barba wrapper: `data-barba="wrapper"` on the outer shell
- Barba container: `data-barba="container" data-barba-namespace="<name>"` on the page inner div
- Custom event `rhp:barba:afterenter` fired on `window` after each transition; cursor.js + overland-ai.js listen

## Contact pullout

There is **no separate contact page**. Contact is a slide-out panel built into the nav, managed by `orchestrator.js → initContactPullout()`.

| Element | Class | Role |
|---------|-------|------|
| Trigger | `.nav_contact-link` | Opens the pullout on click |
| Panel | `.nav_contact-pullout` | The slide-out form panel |
| Section wrapper | `.section_contact` | `display: none/block` toggled by JS |
| Overlay | `.contact_overlay` | Backdrop; click to close |
| Close button | `.nav_contact-close` | Optional explicit close button |

- **Open:** `.nav_contact-link` click → `.section_contact` display block → `.contact_overlay` opacity 1 (0.2s) + pullout translateX (same time)
- **Close:** overlay or close-button click → reverse animation → `.section_contact` display none on complete
- Available on every page (lives outside Barba container in the nav)

## window.RHP shape
Every module registers itself on `window.RHP` before orchestrator runs, and each exposes a `version` string plus `init(container)` / `destroy()`. For the exact surface of any module, read its registration block at the bottom of its own file.


State classes added by JS to `[data-barba="wrapper"]`:
- `.rhp-home-ready` — home nav/dial visible and interactive
- `.rhp-intro-started` — home intro sequence begun
- `.rhp-cursor-ready` — cursor DOM injected
- `.rhp-nav-hidden` — hides nav (about page)

## Patterns to follow
- **Barba impact (MANDATORY):** Every plan or code change MUST consider the impact on Barba transitions — before (leave), during (transition animation), and after (enter/afterEnter). Specifically: Does the feature add DOM elements, listeners, or GSAP timelines that need init/destroy? Does anything need to survive across transitions (video state, scroll position)? Could animations or DOM mutations conflict with the leave/enter transition? Does the feature re-initialise cleanly on re-entry (home → about → home)? Which namespaces does it run on — confirm it does NOT init on pages where it shouldn't.
- Every module: IIFE, registers on `window.RHP`, exposes `version` string and `init(container)` / `destroy()`
- GSAP: always `gsap.context(() => { ... })` — store the ctx, kill it in `destroy()`
- Lenis: always call `RHP.lenis.stop()` before destroying; `RHP.lenis.start()` on enter
- ScrollTrigger: always `ScrollTrigger.refresh()` after Barba transition + after Lenis starts
- `prefers-reduced-motion`: check before any animation; skip or fast-forward
- Cursor states: set via `data-cursor="<state>"` on Webflow elements (no JS needed for hover); programmatic via `RHP.cursor.setState()`
- Video state: use `RHP.videoState` for cross-transition video time persistence

## Known gotchas

### General
- Home has no Lenis — scroll is CSS-locked; work-dial owns all scroll/drag input
- Case pages may or may not have a custom scroll wrapper (`[data-case-scroll-wrapper]`); `lenis-manager.setupScrollTriggerProxy()` must be called when it does
- `intro-format.js` must run before any SplitText on case pages
- `home-intro.js` runs only on first DOMContentLoaded load, not on Barba re-enter
- `overland-ai.js` re-inits on `rhp:barba:afterenter` (not just on DOMContentLoaded)
- iOS: video autoplay requires a user gesture; work-dial calls `enforceVideoPolicy()` on `pointerdown`
- jsDelivr caches aggressively — always pin a commit hash AND bump `?v=` to bust cache
- Safari nav logo SVG `height="162"` causes oversized rendering — needs explicit size constraint
- **`.home-transition-dial` is the skip-intro control, NOT decoration** (2026-08-13) — `home-scroll-morph.js` binds `pointerdown` to the wrapper (`skipTarget = dialWrapper`) so tapping the small dial skips the intro word-cycle. A blanket `pointer-events: none` on it silently kills that. The `.transition-dial_canvas` **child** is safe to make non-interactive unconditionally — the listener is on the parent, and a non-interactive child passes the event through to it.
- **Decorative canvases still need `pointer-events: none`** (fixed 2026-08-13) — `transition-dial.js` leaves its `aria-hidden` canvas in the DOM after `destroy()`, and the wrapper sits bottom-centre, so on a case study it covered `.case_close-button` and swallowed taps with nothing visible on screen. The wrapper rule is therefore **scoped** to case-study mode: `[data-barba="wrapper"]:has(.dial_layer-fg.is-case-study) .home-transition-dial`. Keyed on the same `.is-case-study` signal `work-dial.js` guards on, so JS and CSS stay in step.

- **Never hand a raw CSS custom property to a GSAP numeric tween** (fixed 2026-08-18) — `min()`, `clamp()` and `calc()` values cannot be parsed as numeric targets, so GSAP silently falls back to complex-string interpolation and **zero-fills the start value**. `--dial-home-width` is `min(65vw, 65svh)` at ≤991px, so `runDialShrinkAnimation()` collapsed the whole case study to 0px in one frame and grew it back. Desktop's `clamp(180px, …)` hid the same bug as an 18% undershoot, because the px floor slot absorbed the start width. Resolve through `_resolveToPx(value, axis)` first. Its probe must be appended to `document.body`, never inside `.dial_component` — the dial carries a `transform: scale()` during the home scroll-morph scrub, which would skew the measurement.

### Work-dial video system
- **The case→home restore has TWO paths — fix both** (2026-08-13) — returning home runs `resume(handoff)` only when the dial was *suspended*; if it was *destroyed* (any route through /about, since `home-to-about` afterEnter calls `views.home.destroy()`) it runs `init()` instead, which has its own separate restore block. A bug fixed in one path can still be live in the other.
- **Never clear `RHP.videoState.caseHandoff` before calling `views.home.init()`** (2026-08-13) — `init()` reads it twice (to boot ACTIVE instead of IDLE, and to restore the sector/playback position) and nulls it itself once applied. Clearing it first makes that whole restore dead code and home silently boots IDLE at index 0.
- **`setVideoSourceAndPoster()`'s dedupe reads `currentSrc`, which lags `src`** (2026-08-13) — after a `src` write, `currentSrc` still reports the *previous* resolved URL until the load progresses. So back-to-back `applyActive()` calls can no-op: the second sees `currentSrc === target` and skips a swap that never happened. Don't call `applyActive(0)` before restoring a handoff index — boot on the target sector directly.
- **Only the IDLE branch of `setDialState()` writes the step headline** (2026-08-13) — ACTIVE relies on `applyActive()`'s scramble, which is skipped on an *initial* apply (`isInitial`, i.e. `lastIndex === -1`). Any path that boots or resumes straight into ACTIVE must write the project title itself or the dial shows the project's video under the generic copy.
- Flash on sector change (unfixed) — `fromTo` with `from: { opacity: 0 }` in `applyActive()` line ~772 forces bgVisible to opacity:0 immediately, causing a brief black flash before the animation completes
- bgVideo stuck at opacity:1 in IDLE on Barba return (fixed v2026.2.27.6) — `resetToVisible` sets it to 1 before init, `applyActive(0)` isInitial=true skips crossfade
- No blur in handoff case (fixed v2026.2.27.6) — `dialState = ACTIVE` set directly, bypassing `setDialState(ACTIVE)` which applies `filter:blur(40px)`
- Pool swap reverse-playback flash
- Background video decode lag ~50ms (3-rAF re-sync tried and reverted)
- `originalBgEl` deletion on pool swap + destroy (RC1 root cause)
- 300ms `setTimeout` for `interactionUnlocked` — known hack, not yet replaced with event-driven approach

### About page — accordions, sliders, sticky carousel
- The about page scrolls **inside `[data-barba="container"]`** (`position: fixed; overflow: auto`), NOT the window. Anything that reads or sets scroll position must target that element, not `window.scrollY`.
- `.accordion-title` elements are already `position: sticky` and stack at `0 / 1x / 2x / 3x` their own height. The WWCF carousel pins at `2x` to sit flush beneath the two titles above it.
- `.accordion-content` ships from Webflow with `overflow: hidden`, which makes it the nearest scrollport and renders **any sticky descendant inert**. `ready-hit-play.css` overrides it to `visible` on desktop. Nothing overflows it (`scrollHeight === clientHeight` on every accordion), so this is safe — but don't reintroduce the hidden overflow or the sticky carousel silently dies.
- The DOM is `.accordion-wrapper > (.accordion-title + .accordion-content)` as **flat siblings**. There is no `.accordion-block` — `about-scroll-accordions.js` still queries for it and is deliberately disabled in `orchestrator.js`.
- Slider height is derived from **rendered column width x intrinsic image aspect ratio**, never from `max-width` (the wrapper's `max-width` is ~655px but it renders at ~479px, which previously inflated every slider by ~160px).
- `about-swipers.js` re-measures via a `ResizeObserver` on the accordion column, not just `window.resize` — the resize event fires *before* the columns reflow, so measuring off it alone sizes a desktop slider from the old mobile width.

### Barba / DOM structure (namespace restructure shipped 2026-03-12)
- `dial_component` + `dial_layer-fg` now persist OUTSIDE Barba container
- `[data-barba="container"]` is inside `dial_layer-fg`
- `data-dial-ns="home"|"work"` attribute on `.dial_component` controls CSS visibility
- Dial morph animations run in Barba `leave()` (pre-swap), not `afterEnter`
- `clearProps: 'all'` after morph relies on CSS `[data-dial-ns]` rules to maintain layout
- **Prerequisite**: Webflow Designer must have dial outside Barba container with correct `data-dial-ns` attributes
- **`.dial_layer-fg` is shared between the dial and the case study** (fixed v2026.8.13.1) — because it persists outside the Barba container, on `/work/` pages it doubles as the case study's scroll container and contains the whole case study, including `.case_close-button`. Any listener bound to it therefore also fires for clicks on case-study content. work-dial's click→navigate handler used to hijack those clicks: it calls `preventDefault()` and then `barba.go()` to the case you are already on, which is a silent no-op, so the close button "just stopped working" whenever the dial was alive and un-suspended on a case page (a transition race — direct page loads never init the dial, so they were never affected). The handler now bails on `.is-case-study` and never swallows a real (non-`"#"`) link click. **When adding listeners to `.dial_layer-fg`, always scope them to the current namespace — do not rely on `suspend()` alone.**

## Version format
`YYYY.M.D.N` — year, month, day, daily build number. Bump `CONFIG.version` in `init.js` on each deploy.

## Testing
Playwright e2e + a11y suites run against the live staging site. Full workflow, suite contents, and the when-to-run policy live in the `rhp-testing` skill — invoke it when testing this project.
