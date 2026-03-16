# RHP Queue — Parallelisation Map

## Dependency Graph

```
                    ┌─────────────────────────────────────────────┐
                    │              PHASE 1 (parallel)             │
                    │                                             │
  ┌─────────────────┼──────────────┐  ┌──────────────────────────┐│
  │  Stream A: Video system        │  │  Stream B: About page    ││
  │  orchestrator.js (video hooks) │  │  about-text-lines.js     ││
  │  work-dial.js                  │  │  about-dial-ticks.js     ││
  │  ready-hit-play.css            │  │  lenis-manager.js        ││
  │                                │  │  orchestrator.js (about  ││
  │  B1 video persistence [P0]    │  │    namespace init)       ││
  │    ↓                           │  │                          ││
  │  B2 video shape [P0]          │  │  B5 scroll+reveal [P0]  ││
  │  B3 video autoplay [P0]       │  │  B8 about dial [P1]     ││
  │  B4 video pool [P1]           │  │                          ││
  └────────────────────────────────┘  └──────────────────────────┘│
                    │                                             │
                    └─────────────────────────────────────────────┘
                                       │
                    ┌──────────────────────────────────────────────┐
                    │           PHASE 2 (after Phase 1)            │
                    │                                              │
  ┌─────────────────┼──────────────┐  ┌───────────────────────────┐│
  │  Stream C: Transition polish   │  │  Stream D: About features ││
  │  orchestrator.js (transition   │  │                           ││
  │    functions only)             │  │  D2 team animations [P2] ││
  │                                │  │     (needs B5 done)      ││
  │  B6 work→about scroll [P1]   │  │                           ││
  │  B7 about→home flash [P1]    │  │                           ││
  └────────────────────────────────┘  └───────────────────────────┘│
                    └──────────────────────────────────────────────┘
                                       │
                    ┌──────────────────────────────────────────────┐
                    │        ANYTIME (no code dependencies)        │
                    │                                              │
                    │  D1 laptop mockups [P2]  — Webflow assets   │
                    │  D3 video title scale [P2] — CSS only       │
                    │  P1 video quality [P2] — asset re-encode    │
                    └──────────────────────────────────────────────┘
                                       │
                    ┌──────────────────────────────────────────────┐
                    │       PHASE 3 (after Phase 1 + 2 stable)    │
                    │                                              │
                    │  M2 mobile autoplay fallback [P2]           │
                    │  M3 mobile responsiveness [P2]              │
                    │                                              │
                    │  M1 mobile dial [P2] — BLOCKED on spec      │
                    └──────────────────────────────────────────────┘
```

## Phase 1 — The Big Win

### Why these two streams can run in parallel

| Criteria | Stream A (Video) | Stream B (About) |
|----------|------------------|-------------------|
| **Barba namespace** | home (+ transitions) | about |
| **Primary files** | work-dial.js, orchestrator video hooks | about-text-lines.js, about-dial-ticks.js, lenis-manager.js |
| **orchestrator.js sections** | Video pinning in leave/enter, afterEnter play calls, videoState | About view init/destroy, module init calls |
| **DOM selectors** | `.dial_video-wrap`, `.dial_fg-video`, `.dial_bg-video` | `.section_about-*`, `.about_dial-wrapper`, `#dial_ticks-canvas` |
| **Shared state** | `RHP.videoState` | `RHP.lenis` (provider, not consumer conflict) |

**No file contention** on the primary modules. The only shared file is `orchestrator.js`, but the sections are cleanly separated:
- Stream A edits: `runHomeToWorkTransition`, `runWorkToHomeTransition`, Barba `leave`/`afterEnter` video hooks, `views.home`
- Stream B edits: `views.about.init()`, `views.about.destroy()`, about namespace Lenis setup

**Recommendation: parallel with worktrees** to avoid orchestrator.js merge conflicts. Merge Stream B first (smaller diff), then Stream A on top.

### Stream A: Video system (B1 → B2, B3, B4)

| Step | Task | Deps | Files |
|------|------|------|-------|
| A1 | B1: Make fg+bg videos persist through home↔work transition | — | orchestrator.js, work-dial.js |
| A2 | B2: Video shape — circle to rectangle morph | A1 | orchestrator.js, CSS |
| A3 | B3: Restore autoplay on work pages after Barba | A1 | orchestrator.js |
| A4 | B4: Fix video pool references after Barba | A1 | work-dial.js |

A2, A3, A4 can be **micro-parallelised** after A1 (different concerns within the video system), but practically they're quick sequential fixes once A1 is solved.

### Stream B: About page (B5 + B8)

| Step | Task | Deps | Files |
|------|------|------|-------|
| B1 | B5: Fix scroll, content reveal, HIT logo | — | orchestrator.js (about init), about-text-lines.js, lenis-manager.js, CSS |
| B2 | B8: Fix about dial canvas rendering | B1 | about-dial-ticks.js, orchestrator.js (about init) |

Sequential within stream — B8 likely resolves as a side-effect of fixing B5's namespace init.

## Phase 2 — Transition Polish

Depends on Phase 1 because transitions need both working video (A) and working about page (B) to test.

| Task | Deps | Files |
|------|------|-------|
| B6: work→about scroll + dial state | A done, B done | orchestrator.js, work-dial.js, lenis-manager.js |
| B7: about→home overlay + logo | A done, B done | orchestrator.js, CSS |

B6 and B7 are **different transition directions** (different orchestrator functions) — could be parallel but both touch orchestrator.js. Sequential is safer, ~30 min total.

D2 (about team animations) can run parallel to C since it's a new module, not editing transition code.

## Anytime Tasks (no code deps)

These can run **at any time**, even during Phase 1:

| Task | What | Who |
|------|------|-----|
| D1 | Replace laptop mockups | Designer/Webflow — manual asset swap |
| D3 | Video title clamp() | CSS-only — 10 min, zero risk |
| P1 | Re-encode videos | ffmpeg/Handbrake — no code until assets ready |

## Estimation

| Mode | Est. wall time | Est. tokens | Notes |
|------|---------------|-------------|-------|
| **All sequential** | ~4-5 hours | ~400k | Baseline |
| **Phase 1 parallel** | ~2.5-3 hours | ~440k | Streams A+B overlap saves ~1.5h |
| **Phase 1 parallel + anytime tasks during** | ~2.5-3 hours | ~460k | D1/D3/P1 are free to slot in |

## Recommendation

**Phase 1: Parallel with worktrees** — Stream A and Stream B run simultaneously.
- Stream A agent: code-writer (orchestrator video hooks + work-dial)
- Stream B agent: code-writer (about namespace init + about modules)
- Merge order: B first, then A (A has larger diff surface)

**Phase 2: Sequential** — B6 then B7, both need manual transition testing.

**Anytime: Interleave** — D1, D3, P1 whenever there's a gap or waiting for review.

**Phase 3: Sequential, later** — M2 and M3 are P2 and need the full system working first.
