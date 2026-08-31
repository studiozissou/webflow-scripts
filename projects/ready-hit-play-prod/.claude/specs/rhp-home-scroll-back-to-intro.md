# rhp-home-scroll-back-to-intro — Scroll back from the dial to the intro landing view (desktop only)

**Status:** Blocked — awaiting Ryan's go-ahead (estimate to be sent 2026-09-01)
**Priority:** P1 once approved
**Requested by:** Ryan Crisman, 2026-08-26 (WhatsApp)
**Estimate:** 2 hours quoted, may stretch to 3 (see Estimate section)

## Summary

On the RHP homepage, once the intro scroll-morph completes, the only way back to the
landing view (large logo + intro) is clicking the horizontal RHP logo in the nav, which
calls `replay()`. Ryan wants to scroll back and forth between the landing view and the
circle (work dial). **The forward morph is a ScrollTrigger scrub on desktop** — scrolling
down scrubs the animation with the scroll position — so the way back must scrub too, not
play a canned reverse. Desktop only — mobile keeps the locked-scroll dial model, as
already agreed with Ryan on 2026-08-26.

## Research summary

- During the intro, scroll is **unlocked** and native scroll drives the scrub
  (orchestrator.js:516 `if (options.introMode) RHP.scroll.unlock()`).
- After morph completion, `_applyCompleteState()` (home-scroll-morph.js:707) kills the
  scrub timeline + ScrollTrigger (`_killScrub()`), stops Lenis, scrolls to 0 and calls
  `RHP.scroll.lock()` — home scroll is CSS-locked from then on.
- On **desktop the dial ignores wheel input entirely**: `onWheel` in work-dial.js:1296
  bails unless `isMobile()`. So wheel events in the completed home state currently go
  nowhere — a wheel-up gesture has **no input conflict** on desktop.
- `replay()` (home-scroll-morph.js:939) already does ~80% of what a scrub-back needs:
  re-shows the intro section + overlay, re-applies `is-intro-small`, re-splits the logo
  text, reverses the nav/step-text side effects, rebuilds the scrub timeline
  (`_resizeHandler()`), and seeks `progress(1)`. Only its final step is gesture-specific:
  a 1.2s `gsap.to(scrubTL, { progress: 0 })` tween with ScrollTrigger disabled.
- `_replaying` and `complete` module flags already guard re-entrancy.
- Barba re-entry lands via `skipToEnd()` → `_applyCompleteState(false)` — a single hook
  point covers both the fresh-scroll path and the Barba path.

## Assumptions (made in lieu of clarifying questions — session ran unattended)

1. ~~"Scroll back" means a wheel-up gesture triggers the 1.2s reverse morph~~ —
   **corrected by Will 2026-08-31**: the forward direction scrubs on desktop, so the
   back direction must scrub symmetrically. Chosen approach updated to B below.
2. The scrub-back re-arms from dial IDLE state only. While a project is ACTIVE/ENGAGED
   the gesture is ignored — reversing the morph mid-video-engagement would fight
   work-dial state. (Open question for Ryan.)
3. Mobile/touch (≤991px) excluded entirely.

## Approach comparison

| Approach | Confidence | Complexity | Key risk | Reusable code |
|----------|-----------|------------|----------|---------------|
| A: Wheel gesture triggers `replay()`'s 1.2s reverse tween | — | Low | **Rejected**: asymmetric with the scrubbed forward direction; feels wrong | `replay()` |
| B: **Wheel-up re-arms the scrub** — restore scroll to trigger end, keep ScrollTrigger enabled, native scroll scrubs both ways | 85 | Medium | State restoration at re-arm must fully undo `_applyCompleteState` side effects | `replay()` body minus its final tween |
| C: Never kill the scrub / keep scroll permanently unlocked in the complete state | 30 | High | Breaks the locked-scroll model the dial, mobile height-freeze, and Barba paths depend on | partial |

**Chosen: B.** Refactor `replay()` into a shared `_prepareReverse()` (everything up to and
including `scrubTL.progress(1)`) plus two finishes: the existing tween finish (logo click
keeps working unchanged) and a new scrub finish (wheel-up). Scrolling down again scrubs
forward and re-completes via the existing scrub-end path — back-and-forth in both
directions, both scrubbed.

## Design

New `_armScrollBack()` / `_disarmScrollBack()` + `_rearmScrub()` in `home-scroll-morph.js`:

- `wheel` listener on `window`, passive (never preventDefault), armed only by
  `_applyCompleteState()` (covers both scrub-end and Barba `skipToEnd` paths), disarmed
  in `_prepareReverse()` and `destroy()`.
- Handler guards: `_isDesktop()`, `complete === true`, `!_replaying`, dial state IDLE
  (skip guard gracefully if accessor unavailable), not case-study mode, contact pullout
  not open.
- Accumulate upward `deltaY`; at ~100–150px within a rolling ~500ms window, call
  `_rearmScrub()`. Threshold is deliberately small (it only gates *entering* scrub mode)
  but nonzero so a single accidental tick doesn't kick the user out of the dial state.
  Reset accumulator on any downward delta.
- `_rearmScrub()` = `_prepareReverse()` then, instead of the progress tween:
  1. remove `.rhp-home-ready` (nav hide tweens already run in `_prepareReverse`)
  2. keep the rebuilt ScrollTrigger **enabled**
  3. `RHP.scroll.unlock()` + `RHP.lenis.start()` (mirrors orchestrator's introMode state)
  4. set `scrollY` to the trigger's end position (`st.end`) instantly — GSAP transforms at
     `progress(1)` already match the current visual, so no paint jump
  5. from here native scroll owns the morph both ways; the existing scrub-end complete
     path re-fires `_applyCompleteState()` when the user scrubs forward to the end again
- Reaching progress 0 (fully scrubbed back): ScrollTrigger `onLeaveBack` (or progress
  check in the scrub's `onUpdate`) restores the fresh-load resting state — fade logo to 1,
  re-init logo hover, re-lock dial (already locked by `_prepareReverse`).
- `prefers-reduced-motion`: scrub is position-driven (no duration), so it degrades
  naturally; the reduced-motion fast-path in the forward build already applies.
- No DOM added; no CSS changes expected.

## Implementation steps

1. Refactor `replay()` → extract `_prepareReverse()`; keep `replay()` behaviour identical
   for the logo click (regression-sensitive).
2. Add gesture state + `_armScrollBack`/`_disarmScrollBack`/`_rearmScrub` (~60–80 LOC net).
3. Arm in `_applyCompleteState()`, disarm in `_prepareReverse()` and `destroy()`.
4. Handle the progress-0 resting-state restore (onLeaveBack).
5. Deploy: bump `CONFIG.version` in init.js, push, update jsDelivr commit hash + `?v=` in
   Webflow head, publish.

Single file (+ init.js version bump). One stream — **no parallelisation**: single-agent
build (code-writer), no worktree team needed beyond the standard one.

## Barba impact

1. **Init/destroy:** listener added/removed inside home-scroll-morph's existing lifecycle;
   `destroy()` must call `_disarmScrollBack()` and clean up as today (existing `_killScrub`
   path covers the re-armed ScrollTrigger).
2. **State survival:** none needed — gesture state is transient. If Barba navigates away
   mid-scrub-back, `destroy()` runs the same cleanup as a mid-forward-scrub exit.
3. **Transition interference:** none — armed only in the completed home state; the
   listener is passive and never preventDefaults; re-armed scrub state is torn down by
   the existing destroy path.
4. **Re-entry:** `skipToEnd()` → `_applyCompleteState()` re-arms cleanly; disarm is
   idempotent (guard on stored handler ref, same pattern as `_resizeHandler`).
5. **Namespace scoping:** home only — the module only runs on the home namespace; guards
   additionally bail in case-study mode (`.dial_layer-fg` is shared — see project gotchas).

## Estimate assessment (for the reply to Ryan)

- **Build:** ~1h — the `replay()` refactor supplies most of the mechanics; new work is the
  re-arm (unlock + scroll restore + enabled ST), the threshold, and the progress-0 restore.
- **QA:** scrub-back feel, partial scrub-back then forward again, logo-click replay
  regression, Barba re-entry (home→about→home, home→case→home), reduced motion — 30–45 min.
- **Deploy:** hash bump + Webflow head update + publish + live check — 15–20 min.

**1 hour is not credible for the scrubbed version. 2 hours is the right quote**, with the
honest caveat that if the complete-state restoration fights back it could run into a
third — quote 2, or 2–3 if Ryan wants certainty. (The 1-hour figure only ever fit a
non-scrubbed, gesture-triggered reverse, which would feel asymmetric and is rejected.)

## Test plan

### Tier 1 — Auto: Playwright local
`tests/acceptance/rhp-home-scroll-back-to-intro.spec.js`:
- `scrolling down through the intro completes the morph` (baseline forward path)
- `wheel up from the completed state returns to the intro landing view`
- `forward scroll works again after scrolling back` (back-and-forth round trip)
- `single small wheel tick does not trigger the reverse` (threshold guard)
- `no console errors on home during back-and-forth`
- `reduced motion: reverse completes near-instantly`

### Tier 2 — Auto: CDN regression
Registered in `tests/registry.json` as `rhp-home-scroll-back-to-intro` (expected to fail
until built — same convention as nem-quiz-transition-guard).

### Tier 3 — Manual
- Scrub-back feel and the re-arm moment (any visible jump when scroll position is
  restored to the trigger end) — subjective, needs a human eye
- Trackpad inertia at the re-arm threshold (Mac trackpad momentum can't be simulated
  faithfully in Playwright)
- Safari + Firefox wheel delta scale differences (Playwright runs Chromium)
- Confirm gesture correctly ignored while a project video is ACTIVE/ENGAGED (drag state
  needs real pointer choreography)
- Logo-click replay still feels identical (shares `_prepareReverse`)

## Verify loop

**Reproduction:** load `https://rhpcircle.webflow.io/` on desktop viewport (1440×900),
scroll/wheel down until the morph completes, then wheel up continuously (≥150px to
re-arm, then keep scrolling up to scrub back).

**Pass criteria:**
- After forward morph: `[data-barba="wrapper"]` has `.rhp-home-ready`; `window.scrollY === 0`.
- After wheel-up past threshold: `.rhp-home-ready` removed; `.section_home-intro` has
  layout (`display` not `none`); continued upward scroll visibly scrubs the morph back;
  at rest the large interactive logo is visible (opacity → 1).
- Wheel down again: morph scrubs forward and completes; `.rhp-home-ready` returns.
- Partial back-scrub then forward again works without re-arming glitches.
- Logo-click replay from the completed state still works exactly as before.
- Console: no errors at any step.
- A single wheel tick of −50px does NOT remove `.rhp-home-ready`.

**Tier mapping:** the class/display/round-trip/console/threshold checks are Tier 1 tests
listed by name; scrub feel, re-arm jump, non-Chromium browsers, ACTIVE/ENGAGED
suppression, and replay-feel regression are Tier 3.

**Regression scope (must not break):**
- Logo-click `replay()` — same `_prepareReverse()` path, must behave identically.
- Barba home→about→home and home→case→home re-entry still lands in the completed state
  with the gesture re-armed, nav visible, dial interactive.
- Navigating away mid-scrub-back leaves no stale ScrollTrigger/listeners (destroy path).
- Mobile behaviour untouched — no wheel listener active ≤991px; dial wheel-rotation on
  coarse pointers unaffected.
- Case-study scroll never swallowed (listener is passive + bails in case-study mode).

## Acceptance tests

Human-readable list above (Tier 1); machine-runnable file:
`tests/acceptance/rhp-home-scroll-back-to-intro.spec.js`.

## Open questions for Ryan

1. Should scrolling back also work while a project video is engaged, or only from the
   resting dial state? (Quoted: resting state only.)
