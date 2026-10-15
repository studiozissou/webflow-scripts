---
name: build
description: Build a planned feature end-to-end from its spec — agents scaled to the spec's size (none for Mini; for larger work a fresh-context code-writer, or one per file group in its own git worktree when the spec names two or more groups, then a refactor pass, three parallel code reviewers and the spec's routed specialist review wave), QA, then a browser-MCP verify loop against the spec's pass/fail criteria. Use whenever the user asks to build, implement, execute or ship a spec or feature slug, even if they only name the slug.
argument-hint: <feature-slug> [--size mini|small|medium|large] [--auto]
effort: max
---

Build a feature end-to-end from its spec. The spec says what to build and how to know it works; this skill supplies the agents and the order.

Worktree: !`git rev-parse --git-dir 2>/dev/null || true`

## Modes

**Interactive** (default): ask at the decision points marked below.

**Auto** (`--auto`, or when this runs as a background job with no live user): take the recommended option, record it in the build summary, keep going. Auto mode has two hard stops: the 20-iteration cap in the verify loop, and a patch that fails `git apply --check` in step 4b.

## 1. Find the spec and gate it

- Try `.claude/specs/<slug>.md`, then glob `.claude/specs/*<slug>*.md`. One partial match: use it. Several: list them and ask (auto: take the most recently modified). None: ask for a description (auto: stop, nothing to build).
- Read the frontmatter: `size`, `agents`, and the **Execution** note under Tasks.
- **Size.** If `--size` was passed, use it and skip the question. Otherwise recommend the spec's `size:`, or a different size when the spec has none or the files its tasks touch point elsewhere (signals in `../plan/SKILL.md` step 0), then ask with `AskUserQuestion`: all four sizes, the recommended one first with "(Recommended)" and a one-line reason. Auto: take the recommendation. A pick that differs from the spec goes back into its `size:`.
- **Verify-loop gate.** The spec needs a section describing how to confirm the feature works (headed verify, verification, test plan, acceptance, or how to confirm). Missing: re-read once more, then interactive `AskUserQuestion` with "Generate one now" (recommended), "Skip — I'll verify manually", "Stop — let me update the spec". Auto: generate one from the acceptance criteria and append it to the spec.

Size sets the agent budget for steps 4–7:

| Size | Implement | Refactor | Wave 1 | Wave 2 |
|------|-----------|----------|--------|--------|
| Mini | In the parent, no agent | Skip | Self-review with the conventions lens, no agent | Skip |
| Small | One code-writer | Skip | One code-reviewer, correctness lens | Only if `agents:` is set |
| Medium, Large | Step 4 | Step 5 | Step 6 | Step 7 |

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

The spec's Execution note sets the executors:

- **One group, or sequential**: one `code-writer` with no `isolation` parameter, working in the parent tree.
- **Two or more file groups**: one `code-writer` per group, all spawned in one message, each with `isolation: "worktree"` on the Agent call, so no executor can overwrite another's files. `isolation` goes on the call, never in the agent frontmatter. Do not give these executors a `name`: with the agent-teams flag on, a named subagent runs as a teammate in the main working directory and ignores `isolation`, and this skill must not rely on that flag staying off.

Every executor gets: the full spec, the project CLAUDE.md, the acceptance test, the orchestrator, the files the spec names, the confirmed selectors, and the spacing rules above. `code-writer` has the GSAP, Barba and Client First skills preloaded, so the prompt does not need to restate them.

Isolated executors need a patch directory before they are spawned. `CLAUDE_JOB_DIR` is set in a background job. An interactive session falls back to the gitignored `.claude/worktrees-backup/` in the main checkout.

```bash
P_DIR="${CLAUDE_JOB_DIR:-$(git worktree list | head -1 | awk '{print $1}')/.claude/worktrees-backup}/tmp"
mkdir -p "$P_DIR"
```

Number the executors from 1 in spec order. Executor n also gets its own file group only, the spec and acceptance test inline, and the absolute patch path `$P_DIR/<slug>-<n>.patch`. Its worktree is cut from `origin/main`, so it has neither the private `.claude/specs` symlink nor any uncommitted file. Its prompt restates the isolated-worktree rules from `code-writer.md`: no commits, no tests, nothing written under `.claude/` apart from the patch file, and no git command other than the export in step 4b and the read-only `git branch --show-current`.

The executor only writes code. It returns the list of files created or modified, and an isolated one adds the lines `EXECUTOR_PATH=<pwd>` and `EXECUTOR_BRANCH=<git branch --show-current>`. Review, QA and verification run here in the parent, because a subagent cannot spawn agents of its own, and the reviewers need a context that has not just written the code.

## 4b. Integrate isolated executors

Skip this step for a single executor.

As its last action, each isolated executor runs these two commands from its own worktree:

```bash
git add -A -- . ':!.claude/session-mode'
git diff --cached --binary > <patch path>
```

The executor exports its own patch because a parent running as a background job is itself worktree-isolated, and that guard refuses any `git -C <other worktree>` command. `.claude/session-mode` is excluded because it is tracked and changes every session. `.claude/logs` needs no exclusion: it is gitignored, and naming an ignored path makes `git add` exit 1.

After every executor has returned, integrate each one in spec order. An executor that reports no files and whose worktree was removed automatically changed nothing: skip it and note that in the build summary. Take `WT` and `BR` from the completion notification's `worktreePath` and `worktreeBranch`, falling back to the `EXECUTOR_PATH` and `EXECUTOR_BRANCH` lines of its report. `P` is its patch path.

```bash
git apply --check --index "$P"
git apply --index "$P"
git rev-list --count origin/main.."$BR"
git worktree remove --force "$WT"
git branch -D "$BR"
```

Run the lines one at a time. `--index` is what makes new files show in `git diff HEAD`, so the reviewers see them. A missing or empty patch fails the check: `git apply` exits 128 on an empty file. Remove the worktree and branch only when the `rev-list` count is 0, the same invariant `/tidy` uses. Otherwise keep both and name them in the build summary. The patch file stays on disk for debugging.

**When `git apply --check` fails**, integrate no further groups, and keep that worktree and its patch file. Interactive: stop and show the error. Auto: record the blocker (worktree path, branch, patch path), skip to step 10 and set the status to blocked. Either way the summary says which patches were already applied and lists every worktree still on disk. Never resolve a conflict here.

Files the Execution note lists as shared between groups are edited here in the parent, after integration.

## 5. Refactor pass

Spawn `refactor` on the changed files: "Refactor for clarity and pattern compliance. Do not change behaviour."

## 6. Review wave 1 — code (three parallel reviewers)

Spawn three `code-reviewer` agents in one message with the lenses in `references/review-prompts.md` (simplicity, correctness, conventions). Merge per the rules there: PASS, WARN, or FAIL. On FAIL fix the critical issues and re-run all three; at most three cycles, then report the failure and stop (auto: continue to the verify loop and mark the build WARN).

## 7. Review wave 2 — specialists from the spec

Read `agents:` from the spec frontmatter. For each entry spawn that agent in parallel with: the diff, the spec, and the lens after the colon (`design-critic:copy` means the copy lens). Each returns the same PASS/WARN/FAIL format with issues scored 0–100 and only ≥80 surfaced. On FAIL fix and re-run wave 2 only; at most two cycles. No `agents:` field means no wave 2, which is the right outcome for most fixes.

Specialist review is read-only, so a FAIL here costs one fix cycle. This wave is why `/plan` tags the feature: the tags are the only thing that brings design, SEO or QA eyes onto a build without the user remembering to ask.

## 8. QA

Run `/qa-check`.

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
- No git writes between integration and the build commit: the reviewers and the verify loop read `git diff HEAD`, so integrated changes stay uncommitted until the build ends
