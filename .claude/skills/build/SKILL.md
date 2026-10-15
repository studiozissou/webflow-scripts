---
name: build
description: Build a planned feature end-to-end from its spec — agents scaled to the spec's size (none for Mini; for larger work a fresh-context code-writer, refactor pass, three parallel code reviewers and the spec's routed specialist review wave), QA, then a browser-MCP verify loop against the spec's pass/fail criteria. Use whenever the user asks to build, implement, execute or ship a spec or feature slug, even if they only name the slug.
argument-hint: <feature-slug> [--size mini|small|medium|large] [--auto]
effort: high
---

Build a feature end-to-end from its spec. The spec says what to build and how to know it works; this skill supplies the agents and the order.

Worktree: !`git rev-parse --git-dir 2>/dev/null || true`

## Modes

**Interactive** (default): ask at the decision points marked below.

**Auto** (`--auto`, or when this runs as a background job with no live user): take the recommended option, record it in the build summary, keep going. The only hard stop in auto mode is the 20-iteration cap in the verify loop.

## 1. Find the spec and gate it

- Try `.claude/specs/<slug>.md`, then glob `.claude/specs/*<slug>*.md`. One partial match: use it. Several: list them and ask (auto: take the most recently modified). None: ask for a description (auto: stop, nothing to build).
- Read the frontmatter: `size`, `agents`, and the **Execution** note under Tasks.
- **Size and agents.** Recommend the spec's `size:`, or a different size when the spec has none or the files its tasks touch point elsewhere (signals in `../plan/SKILL.md` step 0). Check `~/.claude/usage-5h` (first field is the 5-hour usage percent): from 50% recommend one size smaller, from 75% recommend Mini. Then ask once with `AskUserQuestion`, two questions in the same call:
  1. **Size** (single select): all four sizes, the recommended one first with "(Recommended)" and a one-line reason. Skip if `--size` was passed.
  2. **Agents** (multiSelect), four options: "code-writer", "refactor", "code reviewers" (three for Medium and up, one for Small) and "specialist wave" (naming the spec's `agents:`). Mark those the recommended size allows "(Recommended)", each with a one-line reason tied to this spec. Say in the question that every agent re-reads files from scratch, so each one costs about as much as a fresh session.

  Whatever the table below says, spawn only the ticked agents; an unticked step runs in the parent (implement, self-review) or is skipped (refactor, specialist wave). Auto: take the recommendations. A size that differs from the spec goes back into its `size:`.
- **Verify-loop gate.** The spec needs a section describing how to confirm the feature works (headed verify, verification, test plan, acceptance, or how to confirm). Missing: re-read once more, then interactive `AskUserQuestion` with "Generate one now" (recommended), "Skip — I'll verify manually", "Stop — let me update the spec". Auto: generate one from the acceptance criteria and append it to the spec.

Size sets the agent budget for steps 4–8:

| Size | Implement | Refactor | Wave 1 | Wave 2 | QA |
|------|-----------|----------|--------|--------|----|
| Mini | In the parent, no agent | Skip | Self-review with the conventions lens, no agent | Skip | Skip |
| Small | One code-writer, `model: "sonnet"` | Skip | One code-reviewer, correctness lens | Only if `agents:` is set | Only as wave 2 `qa`, when `agents:` lists it |
| Medium, Large | Step 4 | Step 5 | Step 6 | Step 7 | Step 8 |

## 2. Test inventory

Read `tests/registry.json` (repo root or project root) and check for `tests/acceptance/<slug>.spec.js`. Report:

```
Test inventory for <slug>:
  Tier 1 (auto local):  tests/acceptance/<slug>.spec.js — exists | missing
  Tier 2 (CDN regress): registry.json — yes (N entries) | no
  Tier 3 (manual):      see spec — N items | none
  Browser MCP:          Chrome DevTools | Playwright | not connected
```

Missing Tier 1 tests only narrow the verify loop to smoke and a11y; say so and continue.

## 3. Read before writing

Read every file the spec touches, the project orchestrator, and `shared/utils.js`. New utilities go in `shared/` only when nothing there already does the job.

**Selectors** (Webflow MCP connected): `element_snapshot_tool` on the target page and confirm every selector the spec names. A missing selector is a stop, not an assumption; ask (auto: record it as a blocker and build the rest). Note confirmed selectors in the project CLAUDE.md under "## Known selectors".

**Spacing**: Client First spacer divs between components, flex or grid inside them, nearest approximation for absolute placements with a `/* manual placement — verify against design */` comment, no custom spacing classes where Client First has one.

## 4. Implement in a fresh context

Spawn one `code-writer` agent per file group in the spec's Execution note (one agent when it says sequential). Each gets: the full spec, the project CLAUDE.md, the acceptance test, the orchestrator, the files the spec names, the confirmed selectors, and the spacing rules above. `code-writer` has the GSAP, Barba and Client First skills preloaded, so the prompt does not need to restate them. Small passes `model: "sonnet"` on the Agent call; Medium and Large leave it unset so code-writer keeps its own Opus.

The executor only writes code. It returns the list of files created or modified. Review, QA and verification run here in the parent, because a subagent cannot spawn agents of its own, and the reviewers need a context that has not just written the code.

## 5. Refactor pass

Spawn `refactor` on the changed files: "Refactor for clarity and pattern compliance. Do not change behaviour."

## 6. Review wave 1 — code (three parallel reviewers)

Spawn three `code-reviewer` agents in one message with the lenses in `references/review-prompts.md` (simplicity, correctness, conventions). Merge per the rules there: PASS, WARN, or FAIL. On FAIL fix the critical issues and re-run all three; at most three cycles, then report the failure and stop (auto: continue to the verify loop and mark the build WARN).

## 7. Review wave 2 — specialists from the spec

Read `agents:` from the spec frontmatter. For each entry spawn that agent in parallel with: the diff, the spec, and the lens after the colon (`design-critic:copy` means the copy lens). Each returns the same PASS/WARN/FAIL format with issues scored 0–100 and only ≥80 surfaced. On FAIL fix and re-run wave 2 only; at most two cycles. No `agents:` field means no wave 2, which is the right outcome for most fixes.

Specialist review is read-only, so a FAIL here costs one fix cycle. This wave is why `/plan` tags the feature: the tags are the only thing that brings design, SEO or QA eyes onto a build without the user remembering to ask.

**Keep the main session lean.** Review runs here, and everything here is re-read on every later turn, so the 15-line reply cap in `references/review-prompts.md` is what keeps a build cheap. Never quote, restate or merge reviewer replies back out in full; after each cycle write one line ("wave 1 cycle 2: FAIL, fixed `nav.js:42` null check; re-running") and act on that.

## 8. QA

Medium and Large: run `/qa-check`. Mini and Small skip it; see the size table.

## 9. Verify loop

Follow `references/verify-loop.md`: project-aware dev server, browser MCP checks against the spec's pass/fail criteria, the fix-and-retry loop, and the bridge that turns MCP-found bugs into regression specs. Browser MCP only; CLI test suites run in `/deploy` after the CDN push, because against the CDN they would test old code.

## 10. Wrap up

- Present the spec's Tier 3 manual checklist plus anything found during the build that cannot be automated, or "No manual tests needed".
- Build summary: files changed, wave 1 and wave 2 verdicts, QA result, verify-loop pass/fail per criterion, blockers.
- Interactive: ask "Status for <slug>?" with in-progress / blocked / ready-for-review / done. Auto: set ready-for-review, or blocked with the reason.

## Rules

- Never write code before reading the existing files
- Check `shared/utils.js` and the orchestrator before adding a utility
- No bare `console.log`; a settings hook flags any that slip through
- Verify selectors via Webflow MCP before targeting them, when connected
- Client First spacer divs for vertical rhythm, never margin between components
