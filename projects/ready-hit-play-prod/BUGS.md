# RHP — Bug & Task Backlog

## Fixed

### F4: home showed the generic dial instead of the project just closed
- **Status:** Fixed 2026-08-13 — reported after the F1–F3 staging deploy
- **Area:** orchestrator / work-dial — case→home return
- **Symptom:** going home → about → work → home landed on the homepage with the generic headline ("Great stories made undeniable") over the *first* project's video, instead of the project just closed out of. The bg canvas was generic for the same reason (it mirrors the fg video). On the simpler home → work → home path the video was right but the headline still read generic.
- **Root cause:** three defects stacked on the "returning from a case study" restore, which only runs when the dial was **destroyed** rather than suspended — i.e. exactly when `home → about` destroyed it (`home-to-about` afterEnter calls `RHP.views.home.destroy()`):
  1. `orchestrator.js` set `RHP.videoState.caseHandoff = null` on the line *before* `RHP.views.home.init()`. `work-dial.init()` reads that handoff twice — once to boot ACTIVE instead of IDLE, once in its "restore handoff index and playback position" block — so the whole restore was unreachable dead code and home always booted IDLE at index 0.
  2. `init()` called `applyActive(0)` before the restore. Not just a wasted load: it sets `src` to project 0 while `currentSrc` still reports the case video's URL for a frame, so the follow-up `applyActive(handoffIndex)` trips `setVideoSourceAndPoster`'s dedupe guard (`currentSrc === target`) and skips the swap — stranding project 0's video under the correct project's title.
  3. Neither `setDialState(ACTIVE)` nor an *initial* `applyActive()` writes the step headline — only the IDLE branch scrambles it — so both return paths kept the generic copy. (This one also affected the suspend/resume path, and predates F1.)
- **Fix:** let `init()` consume the handoff instead of clearing it first; boot `applyActive()` at the handoff sector; skip the generic-reel fade-in when the dial boots ACTIVE; and write the project headline on both the init-restore and resume paths.
- **Tests:** `tests/acceptance/fix-home-restore-closed-project.spec.js` (4 tests, registered critical) — verified to fail against the unfixed build

### F2: mobile — transition dial canvas covers the case close button
- **Status:** Fixed 2026-08-13 — found while verifying F1's deploy
- **Area:** CSS / transition-dial
- **Symptom:** on mobile, after entering a case study via a Barba transition, the close button could not be tapped. Nothing was visibly drawn over it, so the button just looked dead. Direct page loads were unaffected.
- **Root cause:** `transition-dial.js` appends a decorative `aria-hidden` `.transition-dial_canvas` into `.home-transition-dial`. Its `destroy()` removes listeners but leaves the canvas in the DOM, and `.home-transition-dial` had no `pointer-events` rule — so the canvas stayed hit-testable. On mobile that wrapper sits bottom-centre, landing exactly over `.case_close-button` at the end of a case study. The sibling `.transition-dial` already set `pointer-events: none` for this reason; `.home-transition-dial` was missing it.
- **Fix:** `pointer-events: none` on `.home-transition-dial` — **scoped to case-study mode** via `[data-barba="wrapper"]:has(.dial_layer-fg.is-case-study)` — plus an unscoped rule on `.transition-dial_canvas` (Flip reparents that canvas between wrappers).
- **Tests:** `tests/acceptance/fix-transition-dial-blocks-close-button.spec.js` (3 tests, registered critical)

### F3: home intro could not be skipped by tapping the small dial
- **Status:** Fixed 2026-08-13 — self-inflicted regression from F2, reported immediately
- **Area:** CSS / home-scroll-morph
- **Symptom:** on the homepage, tapping the small dial no longer skipped the intro word-cycle.
- **Root cause:** F2's first fix put a **blanket** `pointer-events: none` on `.home-transition-dial`. That wrapper is not decorative — `home-scroll-morph.js` binds `pointerdown` to it as the skip-intro control (`const skipTarget = dialWrapper || dialEl`, commented "that's the visible/tappable").
- **Fix:** scope the rule to case-study mode only, keyed on the same `.is-case-study` signal `work-dial.js` uses. The canvas child keeps its unconditional rule — safe, because the listener is on the parent and a non-interactive child passes events through.
- **Tests:** `tests/acceptance/fix-home-intro-dial-tap-to-skip.spec.js` (3 tests, registered critical) — verified to fail against the blanket rule

### F1: intermittent close button failure on /work/ pages
- **Status:** Fixed 2026-08-13 (work-dial v2026.8.13.1) — reported by Ryan on the 2026-08-10 call
- **Area:** work-dial / Barba transitions
- **Symptom:** on project pages the close button sometimes "wouldn't register" — clicking it did nothing. Not reproducible on demand.
- **Root cause:** `work-dial.js` bound a bubbling click listener on `.dial_layer-fg` that calls `preventDefault()` + `stopPropagation()` then `barba.go(activeCase)`. `.dial_layer-fg` persists outside the Barba container and on `/work/` pages becomes the case study's scroll container, containing `.case_close-button`. Whenever the dial was alive and un-suspended on a case page, the close click was cancelled and redirected to the case already showing — a silent no-op. Only `suspend()` prevented this, so any transition race that left the dial un-suspended killed the button. Direct page loads never init the dial (orchestrator "direct-land" path), which is why fresh loads always worked.
- **Fix:** handler bails when `.dial_layer-fg` has `.is-case-study`, and never swallows a click originating on a real (non-`"#"`) link.
- **Tests:** `tests/acceptance/fix-case-close-button-dial-hijack.spec.js` (5 tests, registered critical)

## Barba Transitions — Video Persistence

### B1: bg + fg videos destroyed after home -> work transition
- **Status:** Open
- **Area:** orchestrator / work-dial / Barba transitions
- bg and fg videos should persist during and after home -> work transition. Currently destroyed after transition completes. Same issue for work -> home.

### B2: fg video shows as circle during home -> work transition
- **Status:** Open
- **Area:** CSS / orchestrator transition
- fg video appears circular instead of rectangular. Needs to fill the height specified in the code that sets the top/hero video height on work pages (leaves room at bottom for page title).

### B3: videos don't autoplay on work pages after Barba transition
- **Status:** Open
- **Area:** orchestrator / Barba enter hooks
- Work page videos stop autoplaying when navigated to via Barba. Likely missing play() calls in afterEnter or video elements not re-initialized.

### B4: bg/fg video switching inconsistent after Barba transition
- **Status:** Open
- **Area:** work-dial video pool
- Link and UI switch correctly, but video doesn't follow. Likely a video pool state issue — pool references stale after transition.

## Barba Transitions — About Page

### B5: scroll broken + GSAP content reveal stuck hidden on about page
- **Status:** Open
- **Area:** orchestrator / lenis-manager / about namespace
- After namespace HTML update: scroll doesn't work, GSAP content reveal animations stay hidden, HIT logo animation doesn't trigger. All broken following namespace restructure.

### B6: work -> about: .dial_layer-fg should scroll to top
- **Status:** Open
- **Area:** orchestrator transition
- On work -> about, fg layer should scroll to top. After transition, homepage should show the just-visited project with dial in active state. Revert to normal dial on mouse move.

### B7: about -> home: transition layer fades out too early
- **Status:** Open
- **Area:** orchestrator / about-transition-persist
- Transition overlay fades before the transition completes, causing a flash of the about page large logo. Also, transition logo doesn't quite reach its destination position.

### B8: dial missing inside .about_dial-link after work -> about transition
- **Status:** Open
- **Area:** orchestrator / about-dial-ticks
- After work -> about transition, the small dial inside `.about_dial-link` doesn't render.

## Mobile

### M1: upgrade dial for mobile (spec TBD)
- **Status:** Blocked — waiting for spec
- **Area:** work-dial / CSS
- Upgrade dial interaction to work on mobile per spec (to be provided).

### M2: autoplay video fallback for mobile
- **Status:** Open
- **Area:** work-dial / work pages / orchestrator
- Figure out fallback when autoplay is blocked: homepage fg/bg, work hero, work laptop videos, work column layout videos.

### M3: mobile responsiveness
- **Status:** Open
- **Area:** CSS / all modules
- General mobile responsiveness pass.

## Design / Content Updates

### D1: update laptop mockups
- **Status:** Open
- **Area:** assets / work pages
- Replace current laptop mockup images/videos with updated versions.

### D2: about page team section animations
- **Status:** Open
- **Area:** about namespace / GSAP
- Add animations to the team section on the about page.

### D3: video title responsive scale
- **Status:** Open
- **Area:** CSS / work pages
- Video title text needs responsive scaling across breakpoints.

## Performance

### P1: video quality optimization
- **Status:** Open
- **Area:** assets / work-dial
- Add lower quality videos for bg. Tighten fg video resolution. Reduce bandwidth / decode overhead.
