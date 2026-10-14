---
name: plan
description: Plan a feature before writing any code — parallel codebase research, a size gate, the PM questions that matter, a spec with a verify loop and routed review agents, and acceptance tests. Use whenever the user asks to plan, spec, scope or think through a feature or fix before building it, and before any multi-file change, even if they only say "how should we do X".
argument-hint: <feature description> [--auto]
effort: max
---

Plan a feature before writing any code. The output is a spec that `/build` can execute without asking questions, plus acceptance tests that prove it works.

Branch: !`git branch --show-current 2>/dev/null || true`

## Modes

**Interactive** (default): ask the user at the three decision points below.

**Auto** (`--auto`, or when this runs as a background job with no live user): never block on a question. Take the recommended option at each decision point and record every choice under a `## Assumptions` heading in the spec so the user can veto at review. A plan that stalls on a question nobody can answer is worth less than a plan with stated assumptions.

## 0. Size gate

Classify before spending tokens. Most work here is small, and a six-agent pipeline on a two-line fix costs more than it finds.

| Size | Signals | Flow |
|------|---------|------|
| Small | `fix-*`, one or two files, no new module, no new DOM | Research agents 1–2 only, skip step 2.5, at most one clarifying question, short spec |
| Medium | New module or 3–5 files | Full flow |
| Large | New page, cross-project change, new dependency, anything needing an ADR | Full flow, architect agent consulted in step 3 |

State the size and why in one line, then follow that row.

## 1. Research (parallel, read-only)

Spawn these in one message so they run concurrently. Sonnet is enough for all of them.

- **Agent 1 — Codebase patterns** (`Explore`): existing code similar to this feature; reusable functions in `shared/utils.js`, the project orchestrator, related page modules.
- **Agent 2 — Specs, ADRs, conventions** (`Explore`): relevant specs, ADRs and CLAUDE.md sections; constraints and decisions already made.
- **Agent 3 — Designer DOM** (only if Webflow MCP is connected): `element_snapshot_tool` on the target page for structure and selectors.
- **Agent 4 — Live DOM** (only if a browser MCP is connected): navigate to the staging URL (`.env.test` STAGING_URL, then project CLAUDE.md, else skip), `take_snapshot`, compare with Agent 3 for injected elements, CMS items and JS-modified classes. Optionally `lighthouse_audit` for an accessibility and performance baseline.

Write a **Research Summary**: reusable code (file and function), patterns to follow, constraints, confirmed selectors (Designer and live, with discrepancies), Lighthouse baseline.

## 2. Clarifying questions

Use the `pm-questioning` skill. Reference the research findings in the questions so the user decides with the facts in front of them. Auto mode: write the five answers as assumptions instead of asking.

## 2.5 Approach exploration (Medium and Large only)

Formulate three genuinely different approaches, spawn one `Explore` agent per approach in parallel using the template in `references/approach-exploration.md`, and merge into the comparison table there. Interactive: `AskUserQuestion` with the three approaches plus "Hybrid". Auto: take the highest-confidence approach.

## 3. Spec

Write `.claude/specs/<feature-slug>.md` using `references/spec-format.md`. It defines the frontmatter, the required sections (including Barba impact and the verify loop) and the three-tier test plan. Incorporate the research: reusable code, confirmed selectors, existing patterns. Large features: spawn the `architect` agent for the structural decision and flag any ADR needed before work begins.

## 4. Route review agents

Tag the feature by what it touches, then write the resulting agent list into the spec frontmatter as `agents:`. `/build` spawns exactly those agents as a second review wave after code review, so this line is what makes specialist review happen automatically.

| Tag | When | Agent (lens) |
|-----|------|--------------|
| motion, layout | GSAP, CSS, spacing, typography | design-critic (visual) |
| copy | Text content, CTAs, labels, meta descriptions | design-critic (copy) |
| ux | Flows, navigation, forms, states | design-critic (ux) |
| seo, ia | Meta tags, URLs, sitemap, canonical, hreflang | seo |
| schema | JSON-LD touched | schema |
| perf, cms | Script weight, frame budget, CMS lists | qa |

No tags means code review only, which is right for most fixes. Each entry costs one extra read-only review, so tag what the change genuinely touches, not everything it could conceivably affect.

## 5. Tasks and execution note

Break the feature into ordered tasks with the agent for each (code-writer, refactor, qa, and anything from step 4). Add a one-line **Execution** note: sequential by default; if two or more tasks write to disjoint files, name the file groups so `/build` can run them as separate executors. Keep this honest. A parallel plan that nothing consumes is noise.

## 6. Acceptance tests

Check for test infrastructure: `tests/acceptance/` at the repo or project root, plus Playwright in `package.json`. If present, follow `references/acceptance-tests.md` to write `tests/acceptance/<slug>.spec.js` and register it in `tests/registry.json`. If absent, say so in the spec and skip. Do not run the tests now; `/build` and `/deploy` run them.

## 7. Verify loop self-check

Re-read the spec's `## Verify Loop`. If it does not answer "how does `/build` know this feature is working?" with observable pass/fail criteria, reproduction steps, tier mapping and regression scope, rewrite it. `/build` halts on a spec without one.

## 8. Approval

Interactive: `AskUserQuestion` with "Save spec" (recommended) and "Review changes first". Auto: save, then list the assumptions in the final message.

## Output

- `.claude/specs/<feature-slug>.md` with `agents:` frontmatter and a verify loop
- `tests/acceptance/<feature-slug>.spec.js` and a `tests/registry.json` entry (when infra exists)
- Size, chosen approach, agents routed, blockers and open questions
