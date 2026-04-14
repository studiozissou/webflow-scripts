# Designpowers vs Superpowers vs Current Setup

**Date:** 2026-04-10
**Source:** Research session comparing two GitHub repos against current setup
**Status:** Open — pick adoption path when ready

## Repos researched
- https://github.com/Owl-Listener/designpowers (MC Dean) — design workflow system
- https://github.com/obra/superpowers (Jesse Vincent) — software dev process discipline

---

## Headline finding

**Superpowers is already installed** as `superpowers@5.0.7` plugin. All 14 of its skills (brainstorming, TDD, systematic-debugging, writing-plans, executing-plans, subagent-driven-development, verification-before-completion, using-git-worktrees, etc.) are active via its SessionStart hook. Nothing to do.

**Designpowers is not installed.** It overlaps less than expected — it lives at the "why/what" layer (discovery, strategy, taste, personas, inclusive design) where the current setup stops at the "how" layer (build with GSAP, deploy via jsDelivr, test with Playwright). Cherry-pick ideas; don't install the plugin.

---

## Current setup totals (for context)

| Category | Count |
|---|---|
| Project skills (`.claude/skills/`) | 26 |
| Project agents (`.claude/agents/`) | 13 |
| Project commands (`.claude/commands/`) | 35 |
| Superpowers plugin skills (active) | 14 |
| Figma plugin skills (active) | 7 |
| Feature-dev plugin agents (active) | 3 |

The current setup is a **superset** of Superpowers — Superpowers provides process discipline, project layer adds Webflow/GSAP/Barba domain knowledge.

---

## Designpowers — gap analysis

### Things Designpowers does that current setup doesn't

| Designpowers feature | Current equivalent | Gap |
|---|---|---|
| **Taste calibration** — formalised aesthetic preferences as propagatable constraint with 3-tier classification (strong opinions / soft patterns / anti-patterns) | `art-director` agent + `design-context` skill | Partial — no persistent taste profile that constrains all downstream agents across sessions |
| **Design Debt Register** — deferred design compromises tracked with ID, severity, affected personas, status | None | Yes — tech debt tracked via queue.json, design debt vanishes |
| **Inclusive personas** — 4-6 personas including stress cases (motor impairment, cognitive load, poor connectivity) | None | Yes — a11y is reactive (axe-core), not persona-driven |
| **Reconciliation protocol** — deterministic conflict resolution: a11y > usability > brief > opinion > persona arbitration > escalate | None | Minor — agents have distinct domains so rarely conflict |
| **Synthetic user testing** — persona walkthroughs before real testing | QA agent + Playwright | Partial — functional only, not persona perspective |
| **Design retrospective → memory feedback loop** — retros auto-update taste memory | Manual MEMORY.md updates | Could automate the loop |

### Things Designpowers doesn't have

- Webflow/Chrome DevTools/Playwright/Figma MCP integrations
- Animation/interaction skills (GSAP, Barba, Three.js, Rive, etc.)
- Acceptance test generation + regression registry
- CDN deploy pipeline
- Queue + Notion sync
- Pricing/estimation/proposal workflow

---

## Adoption options (pick one or stack them)

### Option A — Taste Profile System (highest ROI)
**What:** Per-client `taste-profile.md` in `.claude/briefs/<client>/` capturing strong opinions, soft patterns, anti-patterns. New `taste-profile` skill that loads it. Feed to `art-director`, `content`, `ux-researcher` as a constraint. Update after each `/design-review` cycle.

**Why:** `design-context` already gathers per-session input but nothing persists across sessions. This makes taste stick to clients.

**Effort:** Small. New skill + per-client file template + agent prompt updates.

**Files touched:**
- `.claude/skills/taste-profile/SKILL.md` (new)
- `.claude/briefs/<client>/taste-profile.md` (new per client)
- `.claude/agents/art-director.md` (load taste profile)
- `.claude/agents/content.md` (load taste profile)
- `.claude/agents/ux-researcher.md` (load taste profile)
- `.claude/commands/design-review.md` (trigger taste profile update)

### Option B — Design Debt Register
**What:** Add `design-debt` section to queue.json or standalone `.claude/design-debt.json`. Track ID, description, severity, affected pages, status, deferred-date. Surface in `/status` output.

**Why:** Currently track tasks but not design compromises. "We shipped this CTA colour knowing it's off-brand" disappears.

**Effort:** Small. Schema decision + `/status` command update + add-to-debt slash command or skill.

**Files touched:**
- `.claude/design-debt.json` or queue.json schema extension
- `.claude/commands/status.md` (surface debt)
- New: `/design-debt-add` command or addition to `/design-review`

### Option C — Reconciliation Protocol
**What:** Add to `/build` Step 6 (3 parallel code reviewers): when reviewers disagree, resolve in order a11y > usability > spec > taste > opinion. Document the decision in the verify loop.

**Why:** Multiple reviewers can produce conflicting recommendations. Deterministic priority prevents stalemate.

**Effort:** Tiny. Update `/build.md` Step 6 prompt.

**Files touched:**
- `.claude/commands/build.md`

### Option D — Inclusive Personas per Client
**What:** Add persona definitions to client briefs. Include 1-2 stress-case personas (motor impairment, cognitive load, poor connectivity). Feed to `ux-researcher` and `qa` during `/audit-page` and `/design-review`.

**Why:** Shifts a11y from "did we pass axe-core?" to "can Maria with tremors use this?"

**Effort:** Medium. Brief template update + agent prompt updates + per-client backfill.

**Files touched:**
- `.claude/briefs/<client>/personas.md` (new per client)
- `.claude/agents/ux-researcher.md`
- `.claude/agents/qa.md`
- `.claude/commands/audit-page.md`
- `.claude/commands/design-review.md`

### Option E — Auto retrospective → memory feedback
**What:** After major builds, run a quick retrospective that auto-updates MEMORY.md and the taste profile.

**Why:** Manual memory updates skip the feedback loop. Taste drifts across projects.

**Effort:** Small but needs care given the on-demand-only memory rule (no auto-loading allowed).

**Files touched:**
- `.claude/commands/build.md` (add retro step at end)
- `.claude/skills/meta-wrap-up/SKILL.md` (or new skill)

---

## Skip these (not worth adopting)

- **Designpowers full plugin install** — duplicates `/design-review`, `/design-iterate`, `art-director` agent. Adds 29 skills assuming a different workflow.
- **Design debate skill** — `/plan` Step 2.5 already explores 3 architectural approaches in parallel. Aesthetic debate adds overhead without clear benefit for marketing-site builds.
- **Synthetic user testing as a separate phase** — Playwright + Chrome DevTools cover functional testing. Better to fold persona perspectives into existing QA than spin up a parallel flow.

---

## Recommended stacking order

1. **Option A (Taste Profile)** — start here, highest ROI, smallest effort
2. **Option C (Reconciliation Protocol)** — tiny addition, prevents future stalemates in `/build`
3. **Option B (Design Debt Register)** — small effort, fills a real tracking gap
4. **Option D (Personas)** — medium effort, only if a11y becomes a stronger priority for current clients
5. **Option E (Auto retro)** — only after A is in place

---

## Open questions before adoption

- Per-client taste profiles, or per-project? (RHP and Carsa have very different aesthetics)
- Where should design debt live — queue.json extension or standalone file?
- Should personas be per-client (in briefs) or per-project (in queue)?
- Does the taste profile feed Nano Banana prompts as well as agent prompts?
