# Spec: `/next` Status Command + Git Hygiene Automation

**Slug:** `next-command-and-git-hygiene`
**Client:** Studio Zissou (internal tooling)
**Status:** Ready to Build
**Priority:** P1
**Created:** 2026-08-31
**Source:** Meta-analysis of 756 user messages and 249 commits, 2026-08-10 → 2026-08-31

## Summary

Two linked pieces of internal tooling, both aimed at overhead measured in the last
three weeks of transcripts rather than guessed at:

1. **`/next`** — one command that answers "what's next?" per client, from sources
   that are still live (specs, git, worktrees) rather than the deprecated
   `queue.json`. Replaces `/status`.
2. **Git hygiene automation** — close the loop that lets worktrees and branches
   accumulate, so `/tidy` stops being a thing that has to be remembered.

## Problem — measured, not assumed

### Evidence from the transcripts (2026-08-10 → 2026-08-31)

| Signal | Count |
|--------|-------|
| "what's next" / "next step" | 21 |
| "progress?" / "is it done?" / "status of" | 9 |
| "resume" / "save progress" / "wrap" / `/compact` | 27 |
| Git: merge / worktree / pull / push messages | 60 |

Roughly 45% of all user messages in the window were operational overhead rather
than creative direction.

### Why "what's next?" cannot currently be answered

- `/status` reads `.claude/queue.json`, which was **deprecated on 2026-08-18**
  ("let's remove the queue.json and the Notion sync from /plan /build and /debug.
  it's deprecated"). Ten commands and two skills still reference it.
- 183 spec files exist (127 under `projects/*/.claude/specs/`, 56 top-level).
  **62 are marked `Ready to Build`.**
- Of those 62, the created dates are: 11 × March, 19 × April, 4 × May, 6 × June,
  3 × July, 12 × August. **40 of 62 are three to five months stale.**

The `**Status:**` header is therefore *not trustworthy on its own* — it is written
at spec-creation time and almost never corrected when work ships or is abandoned.
Any command that naively lists `Ready to Build` returns 62 rows, most of them
dead, which is worse than returning nothing.

The status vocabulary has also drifted badly — 28 distinct values across the
corpus, including free prose like `Status: User confirms these are already in the
updated HTML.` and `Status: Partial — work→work fixed, work→home unsolved`.

### Why worktrees and branches accumulate

- 73 branches, 8 worktrees at time of analysis.
- Each background job creates a worktree for isolation; removing it needs a human
  answer to the keep-or-remove prompt, which a background job never gets.
- `/tidy` handles this correctly but is **manual**. The launchd agent
  (`scripts/tidy-worktrees.plist`) runs **weekly, Monday 09:00** — slow enough
  that a normal week's jobs pile up before it fires.
- `.claude/settings.json` defines hooks for `PostToolUse`, `Stop` and
  `Notification`, but **nothing on `SessionEnd`** — so no worktree ever reaps
  itself.

### Bonus defect found while verifying the above

The existing `Stop` hook resolves its log directory with:

```
LOGDIR="$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null || pwd)/.claude/logs"
```

`$0` is not a path to the repo in a hook context, so `git rev-parse` fails and it
falls through to `pwd` — writing `.claude/logs/sessions.log` into **whatever
directory the session happened to be in**. The result is **21 stray
`sessions.log` files** scattered across the repo, including inside
`projects/the-signalling-company/assets/logos/` and `assets/flags/`. This is the
source of the untracked `.claude/` directories that keep appearing in
`git status`. Cheap to fix, and squarely in scope for "git hygiene" — added as
Task 6.

## Approach

Three approaches were considered inline (the plan skill's parallel-agent
exploration was skipped deliberately — this is a two-file tooling change with no
competing architectures worth three agents' cost):

| Approach | Verdict |
|----------|---------|
| **A. Trust `**Status:**`, normalise the vocabulary first** | Rejected alone. Requires triaging 183 specs by hand before the command returns anything useful. |
| **B. Ignore specs, derive state purely from git** | Rejected. Git says what changed, never what was *intended* next. Loses all planned-but-unstarted work. |
| **C. Corroborate spec status against git activity (chosen)** | Reads the status header but *ranks* by corroborating evidence. Degrades gracefully against the existing mess, and normalising the vocabulary becomes optional cleanup rather than a prerequisite. |

### Corroboration rule (the core of `/next`)

A spec is surfaced as **Active** only when its status is buildable **and** it has
corroborating recent evidence:

- its slug appears in a commit subject or body within the last 21 days, **or**
- its file was created or modified within the last 21 days, **or**
- a live worktree or branch carries its slug.

Everything else buildable becomes **Stale backlog** — collapsed to a count per
client, with a one-line prompt to triage, never dumped in full.

This is what makes the output one screen instead of 62 rows.

## Files Affected

| File | Change | Notes |
|------|--------|-------|
| `.claude/commands/next.md` | **New** | The `/next` command |
| `.claude/commands/status.md` | Rewrite as a thin alias to `/next` | Keeps muscle memory working; drops the `queue.json` read |
| `.claude/settings.json` | Add `hooks.SessionEnd`; fix the `Stop` hook's `LOGDIR` | Worktree self-reap + stray-log fix. **Extend** the existing `hooks` block, never replace it |
| `scripts/tidy-worktrees.sh` | Add `--auto` non-interactive mode | Used by the hook and the agent |
| `scripts/tidy-worktrees.plist` | Weekly → daily 09:00 | Shrinks the accumulation window |
| `.claude/commands/tidy.md` | Document `--auto` and the hook | So the automation is discoverable |

## Task Breakdown

### Task 1 — `/next` command
Write `.claude/commands/next.md`. It must:

1. **Gather** (read-only, no writes):
   - `git fetch origin`, then `git log --since=21.days --all --pretty=%s%n%b`
   - Every `**Status:**` and `**Created:**` header under `projects/*/.claude/specs/`
     and `.claude/specs/`
   - `git worktree list` + per-worktree `git rev-list --count origin/main..BRANCH`
     and `git status --porcelain`
   - Open PRs via `gh pr list --state open --json number,title,headRefName` (skip
     silently if `gh` is unavailable or unauthenticated)
2. **Classify** each spec against the corroboration rule above.
3. **Tolerate status drift** — match case-insensitively on the leading token of
   the status value, mapping to four buckets:
   - *buildable*: `Ready to Build`, `Ready to Plan`, `Ready to implement`,
     `Ready to action`, `Approved`, `planned`
   - *in flight*: `Planning`, `Draft`, `Partial`
   - *closed*: `Done`, `CLOSED`, `✅`
   - *blocked*: `BLOCKED`, any value containing `blocked on`
   Anything unmatched → *unparsed*, counted and reported once, never guessed at.
4. **Output**, in this order, capped at one screen:
   - **Needs you** — anything blocked on a human: unmerged worktrees, open PRs,
     specs marked blocked. This goes first because it is the only section the user
     cannot delegate.
   - **Active per client** — max 3 rows each: spec name, status, last git touch.
   - **Stale backlog** — one line per client: `Carsa: 9 buildable specs, none
     touched since April — triage?`
   - **Recommended next action** — exactly one, named concretely.
5. Never write files, never merge, never push.

### Task 2 — Retire `queue.json` from `/status`
Rewrite `.claude/commands/status.md` to delegate to `/next`. Twelve files
reference `queue.json` in total (10 commands, 2 skills); this task touches only
`status.md`. Do **not** touch the other **eleven** — out of scope here, list them
in the report for a separate cleanup.

### Task 3 — Worktree self-reap hook
Add a `SessionEnd` entry to the **existing** `hooks` block in
`.claude/settings.json` — `PostToolUse`, `Stop` and `Notification` are already
defined there and must be preserved:

```json
"SessionEnd": [
  { "hooks": [ { "type": "command",
                 "command": "bash scripts/tidy-worktrees.sh --auto --self" } ] }
]
```

`--self` reaps **only the worktree the ending session was in**, and only when
`git rev-list --count origin/main..BRANCH` is `0` and `git status --porcelain` is
empty. Any other condition: leave it and log a line. The hook must exit 0 always
— a failed cleanup must never fail a session.

### Task 4 — `--auto` mode in `tidy-worktrees.sh`
Non-interactive: apply the existing safety invariant, remove what provably
qualifies, print what it kept and why. Must inherit the invariant from `/tidy`
verbatim — `origin/main..BRANCH == 0` is the *only* disposability test.

### Task 5 — Daily agent
`scripts/tidy-worktrees.plist`: `StartCalendarInterval` weekday-1 → every day at
09:00. Reload with `launchctl unload/load`.

### Task 6 — Fix the stray `sessions.log` bug
In the `Stop` hook, resolve the log directory from the environment rather than
`$0`. Claude Code exposes the project directory to hooks; use
`${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}` and bail
quietly if neither resolves, rather than falling through to `pwd`.

Then clean up what the bug already created:

- Delete the 21 stray `*/.claude/logs/sessions.log` files and any now-empty
  `.claude/logs/` and `.claude/` directories they leave behind, **excluding** the
  legitimate top-level `.claude/logs/` and each project's real
  `projects/*/.claude/logs/`.
- Add `**/.claude/logs/` to `.gitignore` **only** if the top-level log is not
  intended to be tracked — check `git ls-files .claude/logs/` before deciding.

Deleting files is destructive: list every path first and get confirmation before
removing. Untracked strays are unrecoverable once gone.

## Parallelisation Map

| Stream | Tasks | Agent | Depends on |
|--------|-------|-------|------------|
| A | Task 1, Task 2 | code-writer | — |
| B | Task 4, Task 5 | code-writer | — |
| C | Task 3, Task 6 | code-writer | Task 4 (`--auto` must exist first) |

A and B are independent and can run in parallel. C follows B. Tasks 3 and 6 both
edit `.claude/settings.json`, so they must run in the same stream, not parallel.
Recommendation: **parallel, no worktrees** (small, non-conflicting file sets),
**no agent teams** — the whole change is ~3 files of markdown and ~60 lines of bash.

## Barba Impact

**N/A — no Barba transitions.** This is repo tooling; it ships no browser code.

## Test Plan

### Tier 1 — Auto
No Playwright. This change ships no browser code, so the acceptance-test generator
does not apply — there is no `tests/acceptance/` target for a slash command. Verify
by execution instead:

- `bash scripts/tidy-worktrees.sh --auto --self` in a **clean, fully-merged**
  throwaway worktree → worktree removed, exit 0.
- Same, in a worktree with **one unmerged commit** → worktree kept, reason
  printed, exit 0.
- Same, with **uncommitted changes** → kept, reason printed, exit 0.
- `/next` on the current repo → completes, and the Active section contains
  **no spec whose last git touch is older than 21 days**.

### Tier 2 — CDN regression
**Not applicable.** Nothing is served from the CDN by this change; no
`tests/registry.json` entry.

### Tier 3 — Manual

- Confirm the SessionEnd hook actually fires — end a session in a disposable
  worktree and check it is gone. *Cannot be automated: requires a real session
  lifecycle, which the test harness does not simulate.*
- Confirm the launchd agent fires at the new cadence. *Cannot be automated:
  depends on wall-clock time and the user's machine being awake.*
- Judge whether `/next`'s recommended action is the **right** one. *Cannot be
  automated: correctness here is editorial, not mechanical.*

## Verify Loop

**Pass criteria**

- `/next` returns in one screen with the four sections in order, on a repo with
  183 specs and 8 worktrees.
- Zero rows in *Active* are corroborated only by a stale `**Status:**` header.
- *Stale backlog* is a per-client count, never an enumeration.
- Exactly one recommended next action, naming a real spec, worktree or PR.
- `grep -c queue.json .claude/commands/status.md` → `0`.
- `tidy-worktrees.sh --auto` never removes a worktree with unmerged commits or
  uncommitted files. This is the safety-critical assertion — test it before the
  hook is wired up.
- After Task 6, ending a session in a subdirectory creates **no** new
  `.claude/logs/` there:
  `find . -name sessions.log | grep -vc '^./.claude/logs\|^./projects/[^/]*/.claude/logs'`
  → `0`.
- The `PostToolUse`, `Stop` and `Notification` hooks all still exist and fire
  after `settings.json` is edited — confirm the prettier-on-write hook still runs.

**Reproduction**

1. From the repo root, run `/next`.
2. Compare its *Active* list against `git log --since=21.days --all --oneline`.
3. Create a throwaway worktree, commit nothing, end the session, confirm removal.
4. Create a second one, commit something unmerged, end the session, confirm it
   **survives**.

**Regression scope — must not break**

- `/tidy` interactive behaviour and its safety invariant.
- `/merge-worktrees`.
- Any command still legitimately reading `queue.json` (all nine left untouched).
- Session shutdown must not be slowed or failed by the hook — it exits 0
  unconditionally.

## Open Questions

1. Is 21 days the right corroboration window? It is one full work cycle for this
   repo, but it is a judgement call, tunable in one place.
2. ~~Should `/next` read Notion?~~ **Resolved 2026-08-31 — yes.** Notion is read
   by the skill, but deliberately *not* by `gather.py`, which stays fast and
   offline-safe; a Notion outage degrades the report instead of failing it.

   It earned its place immediately: Notion is the only source that knows about
   other people. The first run surfaced four chase-ups (Rishi 12 days overdue,
   Yoni, Tomek ×3, Ryan due same day) that neither git nor the specs can see.
   Cross-checking it against git also caught **two P0 tasks still open whose work
   had already shipped** — NEM conclusion engine v2 (`e877442`, 17 Aug) and the
   MailerSend upgrade (`fe0a49f`, 18 Aug). That cross-check is now part of the
   skill.

## Out of Scope

- Removing `queue.json` from the other eleven files (9 commands + 2 skills).
- The Webflow footer-loader rollout (the largest single time sink at ~35
  messages) — deferred by explicit choice.
- `/client-update` generator — deferred by explicit choice.
- MCP preflight and fallbacks — deferred by explicit choice.
