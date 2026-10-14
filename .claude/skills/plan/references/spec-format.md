# Spec format

Save to `.claude/specs/<feature-slug>.md`. The frontmatter is machine-read by `/build`; keep the field names exact.

```markdown
---
slug: <feature-slug>
client: <client>
date: <YYYY-MM-DD>
status: Draft | Review | Approved
size: Small | Medium | Large
agents: [design-critic:visual, seo]
---

# Spec: <Feature Name>

## Goal
One sentence.

## User story
As a <user>, I want to <action> so that <outcome>.

## Acceptance criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Out of scope
- Item

## Assumptions
(auto mode only — every decision taken without the user, with the alternative that was rejected)

## Approach
Chosen approach and why (Medium and Large only).

## Technical notes
Reusable code (file:function), confirmed selectors, constraints from ADRs and CLAUDE.md, dependencies, gotchas.

## Barba Impact
Answers to the five questions below, or "N/A — no Barba transitions".

## Tasks
- [ ] Task 1 (agent: code-writer)
- [ ] Task 2 (agent: qa)

**Execution:** sequential | parallel — file groups: {a.js, a.css} / {b.js}

## ADRs needed
None, or the decision that needs one before work begins.

## Test Plan
### Tier 1 — Auto: Playwright local
### Tier 2 — Auto: CDN regression
### Tier 3 — Manual

## Verify Loop
### Pass/fail criteria
### Reproduction steps
### Tier mapping
### Regression scope

## Acceptance Tests
- test name 1
- test name 2
```

## `agents:` values

Agent name, optionally with a lens after a colon. Valid: `design-critic:ux`, `design-critic:visual`, `design-critic:copy`, `design-critic` (all lenses), `seo`, `schema`, `qa`. Omit the field entirely when no specialist review is needed.

## Barba transition impact

Answer in the spec when the project uses Barba.js:

1. **Init/Destroy lifecycle** — Does the feature add DOM elements, listeners, GSAP timelines or ScrollTriggers? Then it needs `init(container)` and `destroy()`, called from orchestrator.js on `barba.hooks.enter` / `barba.hooks.leave`.
2. **State survival** — Anything persisting across a transition (video position, scroll offset, selection)? Define where it is stored and how it is restored.
3. **Transition interference** — Could the feature's animations or DOM mutations conflict with the leave/enter transition? Check z-index, opacity tweens, elements outside `[data-barba="container"]`.
4. **Re-entry correctness** — home → about → home re-initialises cleanly: no stale listeners, no doubled nodes.
5. **Namespace scoping** — Which namespaces does it run on, and confirmed not to init elsewhere.

## Test plan tiers

- **Tier 1 — Auto: Playwright local.** `tests/acceptance/<slug>.spec.js`: DOM presence, console errors, CSS states, scroll triggers, Barba navigation. Runs during `/build` and `/debug` via browser MCP, no deploy needed.
- **Tier 2 — Auto: CDN regression.** The same spec registered in `tests/registry.json`, run by `/deploy` after the CDN push.
- **Tier 3 — Manual.** What cannot be automated and why: real input (drag, multi-touch, audio), cross-browser (Playwright is Chromium only), device-specific (iOS autoplay, Safari bounce), subjective polish (easing feel). Write "No manual tests needed" when that is true.

## Verify loop

- **Pass/fail criteria** — observable conditions: DOM state (element visible, class present, attribute value), console state (no errors, expected output), visual state (scroll position, animation end state, responsive layout).
- **Reproduction steps** — page URL, user actions (scroll to X, click Y, resize to Z), wait conditions (animation duration, network load).
- **Tier mapping** — Tier 1 tests by name, the Tier 2 registry entry, Tier 3 items with the reason each is manual.
- **Regression scope** — what must not break: Barba transitions, other modules on the page, cross-page state (video handoff, scroll position).
