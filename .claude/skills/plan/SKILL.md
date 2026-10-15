---
name: plan
description: Plan a feature before writing any code — parallel codebase research, a size gate, the PM questions that matter, a spec with a verify loop and routed review agents, and acceptance tests. Use whenever the user asks to plan, spec, scope or think through a feature or fix before building it, and before any multi-file change, even if they only say "how should we do X".
argument-hint: <feature description> [--size mini|small|medium|large] [--auto]
effort: high
---

Plan a feature before writing any code. The output is a spec that `/build` can execute without asking questions, plus acceptance tests that prove it works.

Branch: !`git branch --show-current 2>/dev/null || true`

## Modes

**Interactive** (default): ask two sets of questions up front, brief then setup, and otherwise only at the decision points below.

**Auto** (`--auto`, or when this runs as a background job with no live user): never block on a question. Take the recommended option at each decision point and record every choice under a `## Assumptions` heading in the spec so the user can veto at review. A plan that stalls on a question nobody can answer is worth less than a plan with stated assumptions.

## 0. Size gate

Size sets the agent budget for both `/plan` and `/build`. Most work here is small, and a six-agent pipeline on a two-line fix costs more than it finds.

| Size | Signals | `/plan` agents | `/build` agents |
|------|---------|----------------|-----------------|
| Mini | One file, a few lines, no new DOM or behaviour | None: Grep and Read inline | None: code and self-review in the parent |
| Small | `fix-*`, one or two files, no new module | Agent 1 only | code-writer, one reviewer |
| Medium | New module or 3–5 files | Agents 1–2, plus 3–4 when DOM is touched | Full wave 1, wave 2 from `agents:` |
| Large | New page, cross-project change, new dependency, ADR | All of step 1, approach explorers, architect | Full |

Read just enough (Grep, Read, no agents) to understand the request. Then ask two `AskUserQuestion` calls, brief first, because its answers can change the size:

**Brief** (one call, up to four questions): from the `pm-questioning` skill's five questions, ask only those the request and the inline read leave open, preferring the ones that change scope or size. Skip the call when nothing is open. Auto: write the answers as assumptions.

**Setup** (one call): recommend a size, and check `~/.claude/usage-5h` (first field is the 5-hour usage percent): from 50% recommend one size smaller, from 75% recommend Mini. Then ask the two setup questions in the same call:

1. **Size** (single select): all four sizes, the recommended one first with "(Recommended)" and a one-line reason drawn from the signals. Skip this question if `--size` was passed.
2. **Agents** (multiSelect): every agent this `/plan` run could spawn (research agents 1–4, approach explorers, architect; group to fit four options). Mark those the recommended size allows "(Recommended)" and give each a one-line reason, e.g. "Explore: codebase patterns — 3+ modules to scan, saves reading them here". Say in the question that every agent re-reads files from scratch, so each one costs about as much as a fresh session. Anything left unticked is done inline with Grep and Read.

Spawn only the ticked agents, whatever the size table says. Auto: take the recommendations. Record the size in the spec frontmatter, since `/build` reads its budget from there.

Outside the approved list, spawn nothing. Search directly instead.

## 1. Research (read-only)

Spawn the agents the size allows in one message so they run concurrently. Sonnet is enough for all of them. Mini does this step inline with Grep and Read.

- **Agent 1 — Codebase patterns** (`Explore`): existing code similar to this feature; reusable functions in `shared/site-utilities.js`, the project orchestrator, related page modules.
- **Agent 2 — Specs, ADRs, conventions** (`Explore`): relevant specs, ADRs and CLAUDE.md sections; constraints and decisions already made.
- **Agent 3 — Designer DOM** (only if the feature touches DOM and Webflow MCP is connected): `element_snapshot_tool` on the target page for structure and selectors.
- **Agent 4 — Live DOM** (only if the feature touches DOM and a browser MCP is connected): navigate to the staging URL (`.env.test` STAGING_URL, then project CLAUDE.md, else skip), `take_snapshot`, compare with Agent 3 for injected elements, CMS items and JS-modified classes. Optionally `lighthouse_audit` for an accessibility and performance baseline.

Write a **Research Summary**: reusable code (file and function), patterns to follow, constraints, confirmed selectors (Designer and live, with discrepancies), Lighthouse baseline.

## 2. Follow-up questions

Only when the research raised something the brief did not settle: one `AskUserQuestion` call, up to four questions, each citing the finding behind it. Usually there is none. Auto: write the answers as assumptions.

## 2.5 Approach exploration (Medium and Large only)

Formulate three genuinely different approaches and fill the comparison table in `references/approach-exploration.md`. Medium: compare them inline from the research summary. Large: spawn one `Explore` agent per approach in parallel using the template there. Interactive: `AskUserQuestion` with the three approaches plus "Hybrid". Auto: take the highest-confidence approach.

## 3. Spec

**Story-led copy.** When the feature's deliverable includes narrative copy and `.claude/skills/storyteller/` exists, run the `storyteller` skill's craft mode before writing the spec. Narrative copy means an About page, a case study, a founder story, a landing-page narrative or a story-led blog post.
- Interactive mode: let the user pick the story.
- Auto mode: take the recommended option and list the other two under Assumptions.

Record the chosen story, with its cards, beats and hook, under Approach. Skip this silently when the skill is not linked.

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

Check for test infrastructure: `tests/acceptance/` at the repo or project root, plus Playwright in `package.json`. If present, follow `references/acceptance-tests.md` to write `tests/acceptance/<slug>.spec.js` and register it in `tests/registry.json`. If absent, or the size is Mini, say so in the spec and skip. Do not run the tests now; `/build` and `/deploy` run them.

## 7. Verify loop self-check

Re-read the spec's `## Verify Loop`. If it does not answer "how does `/build` know this feature is working?" with observable pass/fail criteria, reproduction steps, tier mapping and regression scope, rewrite it. `/build` halts on a spec without one.

## 8. Approval

Interactive: `AskUserQuestion` with "Save spec" (recommended) and "Review changes first". Auto: save, then list the assumptions in the final message.

## Output

- `.claude/specs/<feature-slug>.md` with `agents:` frontmatter and a verify loop
- `tests/acceptance/<feature-slug>.spec.js` and a `tests/registry.json` entry (when infra exists)
- Size, chosen approach, agents routed, blockers and open questions
