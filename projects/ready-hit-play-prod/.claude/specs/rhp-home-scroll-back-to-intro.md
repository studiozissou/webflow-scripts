# rhp-home-scroll-back-to-intro — Scroll back from the dial to the intro landing view (desktop only)

**Status:** Blocked — awaiting Ryan's go-ahead (estimate to be sent 2026-09-01)
**Priority:** P1 once approved
**Requested by:** Ryan Crisman, 2026-08-26 (WhatsApp)
**Estimate:** 2 hours quoted (see Estimate section)

## Summary

On the RHP homepage, once the intro scroll-morph completes, the only way back to the
landing view (large logo + intro) is clicking the horizontal RHP logo in the nav, which
calls `replay()`. Ryan wants to scroll back and forth between the landing view and the
circle (work dial). Desktop only — mobile keeps the locked-scroll dial model, as already
agreed with Ryan on 2026-08-26.

## Research summary

- After morph completion, `_applyCompleteState()` (home-scroll-morph.js:707) stops Lenis,
  scrolls to 0 and calls `RHP.scroll.lock()` — home scroll is CSS-locked from then on.
- On **desktop the dial ignores wheel input entirely**: `onWheel` in work-dial.js:1296
  bails unless `isMobile()`. So wheel events in the completed home state currently go
  nowhere — a wheel-up gesture has **no input conflict** on desktop.
- `replay()` (home-scroll-morph.js:939) already implements the full reverse morph:
  re-shows the intro section, reverses the scrub timeline over 1.2s, restores nav/logo
  state, then **unlocks scroll and re-enables ScrollTrigger** — so after a reverse the
  user can scroll forward through the morph again. Both directions come free.
- `_replaying` and `complete` module flags already guard re-entrancy.
- Barba re-entry lands via `skipToEnd()` → `_applyCompleteState(false)` — a single hook
  point covers both the fresh-scroll path and the Barba path.

## Assumptions (made in lieu of clarifying questions — session ran unattended)

1. "Scroll back" means a **wheel-up gesture triggers the existing 1.2s reverse morph**,
   not a 1:1 scrubbed reverse where the morph tracks live scroll position. A true scrub
   conflicts with the locked-scroll / dial-owns-input architecture and is a half-day-plus
   job (see approach B). Worth one clarifying line in the reply to Ryan.
2. The gesture works from dial IDLE state. While a project is ACTIVE/ENGAGED the gesture
   is ignored — reversing the morph mid-video-engagement would fight work-dial state.
3. Mobile/touch (≤991px) excluded entirely.

## Approach comparison (assessed inline)

| Approach | Confidence | Complexity | Key risk | Reusable code |
|----------|-----------|------------|----------|---------------|
| A: Wheel gesture triggers existing `replay()` | 90 | Low | Trackpad inertia double-fires (guarded by `_replaying`/`complete` + threshold) | home-scroll-morph.js:`replay()` — the whole reverse |
| B: True bidirectional scroll scrub (unlock scroll, keep ScrollTrigger alive in complete state) | 35 | High | Breaks the locked-scroll model the dial and mobile height-freeze depend on; large QA surface | partial |
| C: Native scroll / scroll-snap | 10 | n/a | Infeasible — home scroll is CSS-locked by design | none |

**Chosen: A.** Reuses the tested reverse path; smallest diff; both directions already work
after `replay()` completes.

## Design

New private `_armScrollBack()` / `_disarmScrollBack()` in `home-scroll-morph.js`:

- `wheel` listener on `window`, passive, armed only by `_applyCompleteState()` (covers
  both scrub-end and Barba `skipToEnd` paths), disarmed in `replay()` start and `destroy()`.
- Handler guards: `_isDesktop()`, `complete === true`, `!_replaying`, dial state is IDLE
  (`RHP.workDial` state accessor; skip guard gracefully if unavailable), not case-study
  mode, contact pullout not open.
- Accumulate upward `deltaY`; fire `replay()` when the accumulated delta crosses
  ~250–300px within a rolling ~500ms window; reset accumulator on any downward delta.
  This filters trackpad inertia tails and accidental single ticks.
- No DOM added, no CSS changes expected.

## Implementation steps

1. Add gesture module-scoped state + `_armScrollBack`/`_disarmScrollBack` to
   home-scroll-morph.js (~40 LOC).
2. Arm in `_applyCompleteState()`, disarm at top of `replay()` and in `destroy()`.
3. Expose nothing new on `window.RHP` — internal only.
4. Deploy: bump `CONFIG.version` in init.js, push, update jsDelivr commit hash + `?v=` in
   Webflow head, publish.

Single file (+ init.js version bump). One stream — **no parallelisation**: single-agent
build (code-writer), no worktree team needed beyond the standard one.

## Barba impact

1. **Init/destroy:** listener added/removed inside home-scroll-morph's existing lifecycle;
   `destroy()` must call `_disarmScrollBack()`.
2. **State survival:** none needed — gesture state is transient.
3. **Transition interference:** none — armed only in the completed home state; `replay()`
   disarms before animating. Listener is passive and never preventDefaults.
4. **Re-entry:** `skipToEnd()` → `_applyCompleteState()` re-arms cleanly; disarm is
   idempotent (guard on stored handler ref, same pattern as `_resizeHandler`).
5. **Namespace scoping:** home only — the module only runs on the home namespace; guards
   additionally bail in case-study mode (`.dial_layer-fg` is shared — see project gotchas).

## Estimate assessment (for the reply to Ryan)

- **Build:** 30–45 min (small, reuses `replay()`).
- **QA:** wheel vs trackpad tuning, dial-state guards, Barba re-entry (home→about→home,
  home→case→home), reduced motion — 30–45 min.
- **Deploy:** hash bump + Webflow head update + publish + live check — 15–20 min.

**1 hour is possible if everything lands first try; 2 hours is the honest quote.**
Caveat for Ryan: this covers the gesture-triggered version (scroll up → landing view
animates back over ~1.2s). A version where the animation literally scrubs with the
scroll position both ways is a different architecture (approach B) — half a day plus.

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
- Trackpad inertia feel (Mac trackpad momentum can't be simulated faithfully in Playwright)
- Safari + Firefox wheel delta scale differences (Playwright runs Chromium)
- Subjective: reverse morph timing/easing feel at 1.2s
- Confirm gesture correctly ignored while a project video is ACTIVE/ENGAGED (drag state
  needs real pointer choreography)

## Verify loop

**Reproduction:** load `https://rhpcircle.webflow.io/` on desktop viewport (1440×900),
scroll/wheel down until the morph completes, then wheel up ≥300px within ~0.5s.

**Pass criteria:**
- After forward morph: `[data-barba="wrapper"]` has `.rhp-home-ready`; `window.scrollY === 0`.
- After wheel-up gesture: `.rhp-home-ready` removed within 2s; `.section_home-intro` has
  layout (`display` not `none`); interactive logo visible (opacity → 1).
- Wheel down again: morph scrubs forward and completes; `.rhp-home-ready` returns.
- Console: no errors at any step.
- A single wheel tick of −50px does NOT remove `.rhp-home-ready`.

**Tier mapping:** all of the above are Tier 1 tests listed by name; Tier 3 covers inertia
feel, non-Chromium browsers, and ACTIVE/ENGAGED-state suppression.

**Regression scope (must not break):**
- Logo-click `replay()` still works (shares the same path).
- Barba home→about→home and home→case→home re-entry still lands in the completed state
  with the gesture re-armed, nav visible, dial interactive.
- Mobile behaviour untouched — no wheel listener active ≤991px; dial wheel-rotation on
  coarse pointers unaffected.
- Case-study scroll never swallowed (listener is passive + bails in case-study mode).

## Acceptance tests

Human-readable list above (Tier 1); machine-runnable file:
`tests/acceptance/rhp-home-scroll-back-to-intro.spec.js`.

## Open questions for Ryan

1. Gesture-triggered reverse (quoted) vs true scrubbed reverse (half-day plus) — confirm
   the quoted behaviour matches what he pictures.
2. Should scrolling back also work while a project video is engaged, or only from the
   resting dial state? (Quoted: resting state only.)
