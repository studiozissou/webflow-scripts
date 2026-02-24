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

## Module load order (defined in `init.js` `CONFIG.modules`)
1. `lenis-manager.js`
2. `cursor.js`
3. `work-dial.js`
4. `transition-dial.js`
5. `about-dial-ticks.js`
6. `about-text-lines.js`
7. `home-intro.js`
8. `intro-format.js`
9. `earth-parallax.js`
10. `orchestrator.js`
11. `utils.js`
12. `overland-ai.js` (only on `/case-studies/overland-ai`)

Dependencies loaded before modules: GSAP 3.14.2, ScrollTrigger, SplitText (Club), Barba, Lenis 1.3.17.

## File responsibilities

| File | Version | Responsibility |
|------|---------|----------------|
| `init.js` | 2026.2.20.2 | Loader: load order, dev/CDN URL resolution, health check, `window.RHP` bootstrap |
| `orchestrator.js` | 2026.2.18.1 | Barba conductor: init/destroy modules per page, transitions, scroll lock, contact pullout |
| `lenis-manager.js` | 2026.2.6.10 | Lenis instance: start/stop on Barba transitions, ScrollTrigger proxy for case scroll wrapper |
| `cursor.js` | 2026.2.18.1 | Custom cursor: 4 states (dot/solid-orange/arrow-orange/arrow-white), data-attribute driven |
| `work-dial.js` | 2026.2.20.1 | Homepage dial: canvas ticks, video pool (sliding window), sector switch, drag/hover |
| `transition-dial.js` | 2026.2.18.1 | Static teal canvas dial shown during Barba transitions |
| `about-dial-ticks.js` | 2026.2.6.10 | Small 6rem static teal dial on about page |
| `about-text-lines.js` | 2026.2.13.1 | Scroll-linked per-line text fade on about page (SplitText + Lenis scroll events) |
| `home-intro.js` | 2026.2.11.1 | One-time intro sequence on fresh home load (step text → ticks → video → nav) |
| `intro-format.js` | — | Sanitise `[data-text="intro"]` HTML on case pages (decode entities, strip disallowed tags) |
| `earth-parallax.js` | 2026.2.23.1 | Scroll-linked `.earth-image` parallax on case pages (ScrollTrigger) |
| `overland-ai.js` | — | Page-specific: grid hover + mobile benefit video autoplay |
| `utils.js` | — | Copyright year, `rel="noreferrer noopener"` on `_blank` links, UTM form fields |
| `ready-hit-play.css` | — | All styles: dial layout, cursor, state flags, custom properties, Barba namespace scoping |

## Barba namespaces

| Namespace | Scroll | Lenis | Modules active |
|-----------|--------|-------|----------------|
| `home` | CSS-locked (`overflow: hidden`) | Stopped | work-dial (introMode), transition-dial, cursor |
| `about` | Unlocked | Started (window) | about-dial-ticks, about-text-lines, cursor |
| `case` | Unlocked | Started (custom wrapper if present) | earth-parallax, cursor; intro-format on enter |
| `contact` | Unlocked | Started (window) | cursor |

- Barba wrapper: `data-barba="wrapper"` on the outer shell
- Barba container: `data-barba="container" data-barba-namespace="<name>"` on the page inner div
- Custom event `rhp:barba:afterenter` fired on `window` after each transition; cursor.js + overland-ai.js listen

## window.RHP shape
Every module registers itself here before orchestrator runs. Key entries:
```
RHP.lenis          — { start, stop, resize, onScroll, offScroll, setupScrollTriggerProxy, version }
RHP.cursor         — { init, destroy, refresh, setPosition, setState, setLockedToDot, getCurrentState, transitionDuration, version }
RHP.workDial       — { init, destroy, getActiveIndex, setIntroComplete, setAttractionEnabled, version }
RHP.transitionDial — { init, destroy, version }
RHP.aboutDialTicks — { init, destroy, resize, version }
RHP.aboutTextLines — { init, destroy, getThresholds, version }
RHP.homeIntro      — { run }
RHP.earthParallax  — { init, destroy, getParallaxAmount, version }
RHP.formatIntroText — Function
RHP.scroll         — { lock, unlock }  (CSS-level, set by orchestrator)
RHP.views          — { home, about, case, contact } each { init, destroy }
RHP.videoState     — { byIndex: {}, caseHandoff: null }  (shared between work-dial and orchestrator)
```

## CSS custom properties (key ones)
- `--dial-large-width/height` — homepage dial size (clamp-based, responsive)
- `--dial-small-width/height` — about page dial (6rem)
- `--dial-case-width/height/border-radius/aspect-ratio` — case study dial targets for GSAP tween
- `--transition-dial-bottom` — transition dial vertical offset
- `--_primitives---colors--orange` — `#ff8200`, read by cursor.js via `getComputedStyle`

State classes added by JS to `[data-barba="wrapper"]`:
- `.rhp-home-ready` — home nav/dial visible and interactive
- `.rhp-intro-started` — home intro sequence begun
- `.rhp-cursor-ready` — cursor DOM injected
- `.rhp-nav-hidden` — hides nav (about page)

## Patterns to follow
- Every module: IIFE, registers on `window.RHP`, exposes `version` string and `init(container)` / `destroy()`
- GSAP: always `gsap.context(() => { ... })` — store the ctx, kill it in `destroy()`
- Lenis: always call `RHP.lenis.stop()` before destroying; `RHP.lenis.start()` on enter
- ScrollTrigger: always `ScrollTrigger.refresh()` after Barba transition + after Lenis starts
- `prefers-reduced-motion`: check before any animation; skip or fast-forward
- Cursor states: set via `data-cursor="<state>"` on Webflow elements (no JS needed for hover); programmatic via `RHP.cursor.setState()`
- Video state: use `RHP.videoState` for cross-transition video time persistence

## Known gotchas
- Home has no Lenis — scroll is CSS-locked; work-dial owns all scroll/drag input
- Case pages may or may not have a custom scroll wrapper (`[data-case-scroll-wrapper]`); `lenis-manager.setupScrollTriggerProxy()` must be called when it does
- `intro-format.js` must run before any SplitText on case pages
- `home-intro.js` runs only on first DOMContentLoaded load, not on Barba re-enter
- `overland-ai.js` re-inits on `rhp:barba:afterenter` (not just on DOMContentLoaded)
- iOS: video autoplay requires a user gesture; work-dial calls `enforceVideoPolicy()` on `pointerdown`
- jsDelivr caches aggressively — always pin a commit hash AND bump `?v=` to bust cache

## Version format
`YYYY.M.D.N` — year, month, day, daily build number. Bump `CONFIG.version` in `init.js` on each deploy.
