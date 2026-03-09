# RHP Queue: Priority & Parallelization Plan

## Context
15 open tasks in the RHP queue (2 active, 13 in Triage). The homepage dial/video system is the critical path — most P0/P1 bugs live in `work-dial.js`. Several independent workstreams (case pages, CSS fixes, about page) can run in parallel worktrees.

## Conflict Zones (tasks that touch the same files)

| Zone | File(s) | Tasks competing |
|------|---------|----------------|
| **DIAL** | `work-dial.js` | bg-video-pool, fix-barba, reverse-frames, autoplay-mobile, circle-hitbox |
| **ORCH** | `orchestrator.js` | fix-barba, transition-gsap-flip, about-team, scroll-to-top, transition-polish |
| **CASE** | `case-video-controls.js` | video-controls-case, case-video-intersection, controls-autohide |
| **CSS** | `ready-hit-play.css` | safari-logo, video-title-scale, mobile-responsiveness |

`fix-dial-bgvideo-barba` spans DIAL + ORCH — it's the most constrained task.

---

## Execution Plan

### Wave 1 — Unblock the critical path

**Main worktree: Resolve BG video pool rollback**
- `feat-bg-video-pool` (P1, Ready to Review) — try lowering drift threshold to 0.05s per the rollback notes
- Timebox 90 min. If it doesn't work, revert the pool cleanly and move on
- Then `feat-bg-video-pool-qa` if pool survived; cancel `video-sync-qa` if reverted

**Parallel worktree A (CSS chain):**
- `fix-safari-nav-logo-hit-larger` — CSS fix already identified in notes (~15 min)
- `feat-video-title-responsive-scale` — CSS responsive scaling
- `fix-mobile-responsiveness` — CSS mobile fixes

These touch different selectors in `ready-hit-play.css`, no JS conflicts.

### Wave 2 — Critical bugs (after Wave 1 pool decision)

**Main worktree: DIAL chain continues**
1. `fix-dial-bgvideo-barba` (P1 CRITICAL) — dial/bg video broken after Barba transitions. Trace `destroy()` in work-dial.js and `RHP.views.home.destroy()` in orchestrator.js
2. `fix-pool-swap-reverse-frames` (P1) — reverse frames on adjacent switch. Detailed diagnosis already in queue notes

**Parallel worktree B (CASE chain):**
1. `feat-video-controls-case` (P1) — enhance case-video-controls.js
2. `feat-case-video-intersection` (P2) — add IntersectionObserver for pause-on-scroll
3. `feat-video-controls-autohide` (P2) — auto-hide after idle

CASE chain is fully independent — different files, different pages.

### Wave 3 — QA gate + remaining DIAL fixes

**QA (read-only, can parallel with anything):**
- `dial-upgrade-qa` (P0) — QA all state transitions
- `dial-upgrade-perf` (P0) — perf check on generic video

**Main worktree: finish DIAL zone**
- `fix-autoplay-fallback-mobile` (P1) — mobile autoplay in work-dial.js
- `feat-dial-engaged-circle-hitbox` (P1) — circular hit detection

### Wave 4 — ORCH chain (if time permits, or next session)

These all touch `orchestrator.js` — must be sequential and must wait until the Barba fix from Wave 2 is landed:

1. `feat-transition-layer-gsap-flip` (P1) — largest remaining task
2. `feat-about-team-animations` (P2)
3. `feat-scroll-to-top-transition` (P2)
4. `feat-transition-polish` (P2)

### Not code tasks
- `feat-update-laptop-mockups` (P2) — Webflow Designer only, no code. Anytime.

---

## Parallelism at peak (Wave 2)

```
Main worktree     ──▶ fix-dial-bgvideo-barba → fix-pool-swap-reverse-frames
Worktree A (CSS)  ──▶ safari-logo → video-title-scale → mobile-responsiveness
Worktree B (CASE) ──▶ video-controls-case → case-video-intersection → controls-autohide
```

Three concurrent worktrees. A fourth (ORCH) is not safe until the Barba fix lands in main.

---

## Dependency Chains

```
Chain A (DIAL — critical path):
  resolve bg-video-pool → bg-video-pool-qa
    → fix-dial-bgvideo-barba → fix-pool-swap-reverse-frames
    → dial-upgrade-qa + dial-upgrade-perf
    → fix-autoplay-fallback-mobile → feat-dial-engaged-circle-hitbox
    → video-sync-qa (if pool survived)

Chain B (CASE — independent):
  video-controls-case → case-video-intersection → controls-autohide

Chain C (CSS — independent):
  safari-logo → video-title-scale → mobile-responsiveness

Chain D (ORCH — after Chain A Wave 2 lands):
  transition-layer-gsap-flip → about-team-animations → scroll-to-top → transition-polish
```

## Key Risks

1. **BG video pool may not be salvageable** — hard 90-min timebox, revert if it fails. Site works without it.
2. **fix-dial-bgvideo-barba is the riskiest task** — touches both work-dial.js and orchestrator.js. Surgical changes only; test all four Barba routes.
3. **ORCH chain likely spills to next session** — that's fine. Fixing broken Barba transitions (Wave 2) is far more valuable than new transition features (Wave 4).

## Verification
- After each wave: run `npm run test:smoke` against staged Webflow site
- After CSS chain merges: visual check on Safari + mobile viewport sizes
- End of session: full `npm test` (smoke + a11y), update queue.json statuses, deploy to jsDelivr
