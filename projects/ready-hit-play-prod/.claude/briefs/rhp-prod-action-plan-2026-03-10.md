# RHP Prod — Prioritised Action Plan

**Created:** 2026-03-10
**Status:** In Progress

---

## Context

The RHP prod queue has 20 open items (non-Done). Many are interrelated — the dial/video system has a chain of bugs and features that gate each other. This plan triages everything into a workable day, grouping by dependency chain and impact.

---

## Queue Summary — All Open Items

### P0 — Triage
| ID | Type | Status | Description |
|----|------|--------|-------------|
| `dial-upgrade-qa` | QA | Triage | QA the dial state machine upgrade — test all state transitions (IDLE/ACTIVE/ENGAGED) on desktop fresh load and Barba return. Verifies the P0 dial upgrade work that shipped. |
| `dial-upgrade-perf` | QA | Triage | Perf audit of the generic video element added in the dial upgrade — check load impact, layout shift, memory. |

### P1 — Active / Blocked
| ID | Type | Status | Description |
|----|------|--------|-------------|
| `feat-bg-video-pool` | Feature | Ready to Review | BG video sliding-window pool (mirrors FG pool for instant adjacent switches). Was rolled back — 3-rAF re-sync made lag worse. Needs review of current state before re-shipping. |
| `feat-bg-video-pool-qa` | QA | Building | QA for the BG pool — adjacent/non-adjacent switches, blur, drift, Barba cleanup. Blocked until pool ships. |
| `video-sync-qa` | QA | Triage | Full QA of the video sync system. **Blocked on** `feat-bg-video-pool`. |
| `fix-dial-bgvideo-barba` | Bug | Triage | **Critical:** Dial + bg video completely broken after Barba transitions. Root causes identified in spec: `originalBgEl` deleted on pool swap, `dial_layer-fg` inside Barba container, `resetToVisible` fighting init. Requires Webflow Designer change + JS fixes. |
| `fix-pool-swap-reverse-frames` | Bug | Triage | FG pool swap plays ~2-4 frames in reverse on adjacent switch. Caused by seek-backwards after pool element was preloading ahead. |
| `feat-dial-engaged-circle-hitbox` | Feature | Done (already implemented) | Replace square bounding box with circular distance check for ACTIVE→ENGAGED transition. **Already uses Math.hypot circular check** at work-dial.js:893-896. |
| `feat-video-controls-case` | Feature | Triage | Add video controls (play/pause/scrub) to case study pages. Needs design input — what controls, what style? |
| `fix-autoplay-fallback-mobile` | Bug | Triage | Mobile autoplay blocked by browser policy. Need fallback (poster frame + play button, or user-gesture trigger). |
| `feat-transition-layer-gsap-flip` | Feature | Triage | GSAP Flip-based transition layer for the dial — circle morphs smoothly between pages. Big feature, depends on Barba survival fix shipping first. |

### P2 — Lower Priority
| ID | Type | Status | Description |
|----|------|--------|-------------|
| `feat-about-team-animations` | Feature | Triage | Scroll-triggered animations on the about page team section. Standalone — no deps. |
| `feat-scroll-to-top-transition` | Feature | Triage | Smooth scroll-to-top when returning from work page to homepage. |
| `feat-case-video-intersection` | Feature | Triage | Pause case study videos when scrolled out of view, resume on scroll back. IntersectionObserver-based. Standalone. |
| `feat-video-title-responsive-scale` | Feature | Triage | Scale video title text responsively. CSS clamp or JS resize. |
| `feat-update-laptop-mockups` | Feature | Triage | Update laptop mockup images. Content/asset task — not code. |
| `feat-video-controls-autohide` | Feature | Triage | Auto-hide video title + controls after 3-8s idle. Depends on `feat-video-controls-case` shipping first. |
| `fix-mobile-responsiveness` | Bug | Triage | General mobile responsiveness issues. Vague — needs scoping. |
| `feat-transition-polish` | Feature | Triage | General transition polish. Vague — needs scoping. |
| `fix-safari-nav-logo-hit-larger` | Bug | **Done** | Safari renders HIT logo SVG larger than READY/PLAY. **Fixed:** CSS height override on `.nav_logo-wrapper-2.is-nav svg`. |

---

## Recommended Priority Order

### Tier 1 — Quick wins (unblock review + ship confidence)

**1. `fix-safari-nav-logo-hit-larger`** ✅ DONE
- One-line CSS fix in `ready-hit-play.css`

**2. `dial-upgrade-qa`** ~20 min
- QA the already-shipped dial state machine
- Run smoke tests + manual state transition checks

**3. `dial-upgrade-perf`** ~15 min
- Perf check on generic video load

### Tier 2 — Critical bug chain (Barba survival)

**4. `fix-dial-bgvideo-barba`** ~2-3 hrs
- **Highest-impact bug.** Dial is completely broken after any Barba transition.
- Spec: `.claude/specs/fix-dial-barba-video-survival.md`
- Requires Webflow Designer change (move `dial_layer-fg` outside container) — confirm approach first
- Touches: `work-dial.js`, `orchestrator.js`, `ready-hit-play.css`

**5. `fix-pool-swap-reverse-frames`** ~30 min
- Fix reverse-frame flash on FG pool swap
- Approach: add `skipBackwardSeek` flag to `restoreVideoStateFromIndex` — only seek forward on pool swaps

**6. `feat-dial-engaged-circle-hitbox`** ✅ ALREADY DONE
- Already uses `Math.hypot` circular distance check — no work needed

### Tier 3 — BG pool review + QA

**7. `feat-bg-video-pool` review** ~1 hr
- Review current state after rollback
- Decide: re-ship as-is (without 3-rAF hack), or lower drift threshold to 0.05s

**8. `feat-bg-video-pool-qa` + `video-sync-qa`** ~30 min
- Run after pool ships

### Tier 4 — Stretch goals (if time permits)

**9. `feat-case-video-intersection`** ~30 min — standalone IntersectionObserver
**10. `feat-about-team-animations`** ~1 hr — standalone scroll animations

---

## Items NOT recommended for today

- `fix-autoplay-fallback-mobile` — needs design decision
- `feat-video-controls-case` — needs design input
- `feat-transition-layer-gsap-flip` — blocked on #4
- `fix-mobile-responsiveness` / `feat-transition-polish` — too vague
- `feat-video-controls-autohide` — blocked on video controls
- `feat-update-laptop-mockups` — asset/content task

---

## Verification

After each item:
- Run `npm run test:smoke` from `projects/ready-hit-play-prod/`
- Manual browser check on staging
- Update `queue.json` status
