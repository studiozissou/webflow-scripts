# Spec: Homepage Dial Upgrade — Idle State (State 3)
**Client:** ready-hit-play-prod
**Date:** 2026-02-24
**Status:** Draft

## Goal
Add a third dial state (Idle/Far) that activates when the mouse is outside the dial's proximity zone, showing a generic looping background video and a fully teal dial with no active sector.

---

## Current behaviour (baseline)

| State | Trigger | Dial | Video |
|-------|---------|------|-------|
| 1 — Active | Mouse within proximity zone, outside `.dial_layer-fg` | Orange sector highlight | Per-project bg video |
| 2 — Engaged | Mouse hovering `.dial_layer-fg` | Orange sector highlight (locked) | Per-project fg video (blur bg) |

---

## New behaviour

| State | Trigger | Dial | Video |
|-------|---------|------|-------|
| 1 — Active | Mouse within proximity zone, outside `.dial_layer-fg` | Orange sector highlight | Per-project bg video |
| 2 — Engaged | Mouse hovering `.dial_layer-fg` | Orange sector highlight (locked) | Per-project fg video (blur bg) |
| **3 — Idle** | **Mouse outside proximity zone** | **Fully teal (no sector)** | **Generic bg video, looping** |

**Default state on fresh page load:** State 3 (Idle). Remains Idle until intro animation completes AND mouse enters proximity zone.

**On Barba return from case study:** Restores to State 1, locked to the returned case study's index. State switching disabled until page is fully ready and mouse has moved.

---

## Proximity threshold

- **Reference:** 200px beyond the outer edge of the tick ring at 3000px viewport width.
- **Formula:** `threshold = outerTickRadius + (200 * (dialEl.offsetWidth / 3000))`
  - `outerTickRadius = (dialEl.offsetWidth / 2) * TICK_RING_EXPAND`
  - `TICK_RING_EXPAND = 1.184` (existing constant in work-dial.js)
- Recalculate on resize (dial size is responsive).
- Distance measured from dial canvas centre to mouse position.

---

## Generic video

```js
const GENERIC_VIDEO_URL = 'https://player.vimeo.com/progressive_redirect/playback/1167326952/rendition/1080p/file.mp4%20%281080p%29.mp4?loc=external&log_user=0&signature=4c9f59a80eb73bfb63fbb583702ad948afb7ca16fe99d5c12a85733e282f76bc';
```

- Hardcoded constant in `work-dial.js`.
- Plays in the background video slot (same element as per-project bg video).
- Loops, muted, no controls.
- Loaded/preloaded on init before intro completes.
- fg video hidden in State 3.

---

## State machine

States live entirely in `work-dial.js`. Orchestrator coordinates the unlock timing.

```
DIAL_STATES = { IDLE: 'idle', ACTIVE: 'active', ENGAGED: 'engaged' }
```

**Transitions:**
- `IDLE → ACTIVE`: mouse enters proximity zone AND `interactionUnlocked === true`
- `ACTIVE → IDLE`: mouse exits proximity zone
- `ACTIVE → ENGAGED`: mouse enters `.dial_layer-fg`
- `ENGAGED → ACTIVE`: mouse leaves `.dial_layer-fg`
- `ENGAGED → IDLE`: mouse exits proximity zone (skip ACTIVE)

**`interactionUnlocked` flag:**
- Fresh load: set `false` on init; set `true` after `home-intro.js` signals completion (new callback `onIntroComplete`).
- Barba return from case study: set `false` on init; set `true` after orchestrator fires a "dial ready" signal (after `afterEnter` + short settle delay, or on first mousemove if page is loaded).
- When `interactionUnlocked === false`, mouse proximity checks are skipped — dial stays in current state.

---

## Canvas rendering in Idle state

- All 96 ticks rendered in flat teal (`#05EFBF`) — no orange gradient, no sector highlight.
- `activeIndex` is treated as `null` when state is `IDLE`.
- Tick attraction physics (length + warmth toward pointer) still active in IDLE so the dial feels alive even at distance. Disable if this causes confusion — revisit in QA.

---

## Intro animation update (`home-intro.js`)

- On fresh load: generic video starts loading/playing immediately (before step-text animation begins).
- Intro sequence unchanged in timing — generic video plays in bg throughout.
- At sequence end: call `RHP.workDial.onIntroComplete()` (new method) to set `interactionUnlocked = true`.
- After Barba transition (not fresh load): no intro plays; orchestrator sets `interactionUnlocked = true` after settle.

---

## Barba handoff (`orchestrator.js`)

- Existing `RHP.videoState.caseHandoff` stores `{ index, currentTime }` on case-study leave.
- On home `afterEnter` with handoff present: init dial in ACTIVE state locked to handoff index; set `interactionUnlocked = false`; after a short settle (e.g. 300ms or on first in-range mousemove) set `interactionUnlocked = true`.
- Crossfade from handoff video to generic is **out of scope** — handled in separate "seamless video sync" task.

---

## Acceptance criteria

- [ ] On fresh page load, dial is fully teal and generic video plays before intro begins
- [ ] Dial stays in State 3 (Idle) throughout the intro animation
- [ ] After intro completes, moving mouse into proximity zone switches to State 1
- [ ] Moving mouse outside proximity zone from State 1 returns to State 3
- [ ] Moving mouse outside proximity zone from State 2 returns to State 3 (not State 1)
- [ ] Proximity threshold scales correctly with dial size on resize
- [ ] Generic video loops seamlessly, muted
- [ ] On Barba return from case study, dial is in State 1 locked to returned case study index
- [ ] State switching is disabled on Barba return until page is settled and mouse has moved
- [ ] about-dial, transition-dial, case study pages are untouched
- [ ] No jank on state transitions (no layout thrash, no canvas flash)
- [ ] `prefers-reduced-motion` respected — ticks still visible but no attraction animation

---

## Out of scope

- Crossfade between generic video ↔ project video (belongs to "seamless video sync" task)
- Mobile experience (separate task)
- GSAP Flip (separate task — Barba transitions)
- about-page dial, transition-dial, case study dial
- Video controls

---

## Technical notes

- `work-dial.js` is the primary file. `home-intro.js` and `orchestrator.js` need minor coordination changes only.
- Generic video should be assigned to a dedicated `<video>` element or reuse the existing bg video slot — check whether the sliding-window pool logic conflicts with generic video. Safest approach: a dedicated always-present `<video>` for generic, hidden/shown by state, so the project video pool is untouched.
- Tick attraction physics currently runs on `mousemove`. In State 3 the mouse may be far away — ensure the attraction calculation handles large distances without visual weirdness (it likely already caps out gracefully).
- `interactionUnlocked` must survive the intro animation timing — do not use a hard timeout; use the intro completion callback so slow connections don't cause a race.
- After Barba return, the dial canvas must be re-measured (`dialEl.getBoundingClientRect()`) since the element may have been replaced by Barba.

---

## Tasks

- [ ] Add `GENERIC_VIDEO_URL` constant and dedicated generic `<video>` element management to `work-dial.js` (agent: code-writer)
- [ ] Implement `DIAL_STATES` state machine + `interactionUnlocked` flag in `work-dial.js` (agent: code-writer)
- [ ] Implement proximity threshold calculation (scaled, recalculated on resize) in `work-dial.js` (agent: code-writer)
- [ ] Update canvas tick renderer to draw fully teal when state is `IDLE` (agent: code-writer)
- [ ] Add `onIntroComplete()` callback method to `work-dial.js`; call it from `home-intro.js` at sequence end (agent: code-writer)
- [ ] Update `orchestrator.js` Barba home `afterEnter` to set `interactionUnlocked` after settle on handoff return (agent: code-writer)
- [ ] QA: test all state transitions on desktop, fresh load, and Barba return (agent: qa)
- [ ] Perf: verify generic video doesn't block init or cause layout shift (agent: perf)
