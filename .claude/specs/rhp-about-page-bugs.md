# Bug Report: RHP About Page — Scroll + GSAP Broken

**Client**: ready-hit-play (dev site — rhpcircle.webflow.io)
**Status**: Ready to Debug
**Created**: 2026-03-12
**Related**: rhp-barba-namespace-restructure, rhp-barba-transition-bugs

## Context

After the namespace restructure, the about page content now sits inside `dial_layer-fg` (inside the Barba container). The home page locks scroll via `RHP.scroll.lock()` (sets `html/body overflow: hidden`). When navigating home → about via Barba, the scroll lock state and Lenis configuration may not be properly reset for the about page's new DOM context.

---

## Bug 6: About page can't be scrolled

**Observed**: After navigating to the about page (or direct-landing), the page content cannot be scrolled.

**Expected**: About page content should scroll normally (either native or via Lenis).

**Likely causes**:
- `RHP.scroll.lock()` from home view sets `html/body overflow: hidden` — if `unlock()` isn't called before about view init, body scroll is blocked
- About content is now inside `dial_layer-fg` (inside Barba container) — but Lenis might be starting on `window` instead of the correct wrapper
- The about page uses `position: fixed; inset: 0` to escape the dial visually (per the namespace restructure spec) — fixed-position content doesn't scroll naturally, it needs its own scroll container with `overflow-y: auto`
- The `about-to-home` and `home-to-about` transitions in the orchestrator might not be calling `RHP.scroll.unlock()` at the right time

**Debug approach**:
1. Check if `html` and `body` have `overflow: hidden` on the about page
2. Check about page DOM structure — is the content inside a scrollable container?
3. Check if `RHP.views.about.init()` is calling `RHP.scroll.unlock()` and `RHP.lenis.start()`
4. If about content is inside `dial_layer-fg`, Lenis may need `wrapper: dialFg` (like the case view) instead of window scroll
5. Check if the about content wrapper has `overflow-y: auto` set

---

## Bug 7: GSAP content reveal on scroll doesn't work (content invisible)

**Observed**: Scroll-triggered GSAP animations on the about page (content sections that reveal as user scrolls) are not firing. Content remains invisible (likely at `opacity: 0` or `y: offset` from the initial animation state).

**Expected**: As the user scrolls down the about page, content sections should animate in (fade up, reveal, etc.).

**Likely causes**:
- If scroll is broken (Bug 6), ScrollTrigger never fires because there's no scroll event
- ScrollTrigger might be configured on the wrong scroller — if content is now inside `dial_layer-fg` or a fixed container, ScrollTrigger needs `scroller: wrapper` instead of defaulting to window
- The GSAP context or ScrollTrigger instances from the previous page might not be cleaned up, preventing reinit
- Webflow IX2 reinit (`_reinitWebflow()`) might conflict with custom GSAP ScrollTriggers
- The about page GSAP animations might be initialized before the content is visible/scrollable, so ScrollTrigger calculates wrong positions

**Debug approach**:
1. Fix Bug 6 first — scroll must work before ScrollTrigger can fire
2. Check if ScrollTrigger instances exist after about page load (`ScrollTrigger.getAll()`)
3. Check if `ScrollTrigger.refresh()` is called after about view init
4. Check what `scroller` the ScrollTriggers are using — if content is in a custom scroll container, they need the matching scroller option
5. Look at the about page's GSAP init code — is it in a separate file or inside the orchestrator?

---

## Bug 8: GSAP logo animation on about page broken

**Observed**: The logo animation on the about page (likely the `.transition-dial` / about-transition logo morph) is not working correctly.

**Expected**: The logo should animate (morph, scale, fade, etc.) as part of the about page transition or scroll.

**Likely causes**:
- The about-transition overlay (`.about-transition`) was moved outside the Barba container as a symbol — it persists across transitions. If the logo animation depends on elements inside the Barba container, it might lose references after a swap
- The `aboutTransitionTL` timeline (from the about-transition-persist work) might not be invalidated/rebuilt for the new DOM structure
- The logo animation might depend on scroll position, which is broken (Bug 6)
- GSAP timeline state might be stale from a previous transition (play/reverse not reset)

**Debug approach**:
1. Check if this is the `aboutTransitionTL` from `about-transition-persist` or a separate about-page-specific animation
2. Check if the logo element exists in the DOM after navigation
3. Check if the timeline is being created/played at the right lifecycle point
4. Check the about-transition code in the prod orchestrator for reference patterns

---

## Priority

Fix in order: Bug 6 → Bug 7 → Bug 8 (scroll must work before ScrollTrigger, and ScrollTrigger before scroll-dependent logo animation).

---

## Related specs
- `.claude/specs/rhp-barba-namespace-restructure.md`
- `.claude/specs/rhp-barba-transition-bugs.md` (home ↔ work transition bugs)
- Memory: "RHP about-transition-persist" section in MEMORY.md
