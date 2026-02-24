# ADR 001: Dial state machine owned by work-dial.js

**Date:** 2026-02-24
**Status:** Accepted

## Decision
The homepage dial state machine (`IDLE / ACTIVE / ENGAGED`) lives entirely inside `work-dial.js`. Orchestrator does not track dial state or mouse proximity — it only calls `init()` and `destroy()`.

## Reason
- `work-dial.js` already tracks mouse position and proximity internally — state is a natural extension of existing logic.
- The dial is only used on the homepage. Keeping state inside the module means zero overhead on about, case, and contact pages.
- `orchestrator.js` is already large (57KB). Adding state ownership there would couple page lifecycle logic to dial physics.

## Coordination boundary
- `orchestrator.js` sets `interactionUnlocked` via `RHP.workDial.setInteractionUnlocked(true)` after Barba settle.
- `home-intro.js` calls `RHP.workDial.onIntroComplete()` at sequence end.
- work-dial owns everything else: proximity calc, state transitions, video switching, tick rendering.
