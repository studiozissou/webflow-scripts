# ADR-002: Stop-gate policy
**Date:** 2026-11-06
**Status:** Accepted

## Context
Claude could end a turn while work it had written was red: a lint error it introduced, or a unit suite it broke. Rules in CLAUDE.md did not change that, so the `claude-setup-upgrade` spec moves the check into a Stop hook, `.claude/scripts/stop-gate.mjs`. A Stop hook that exits 2 blocks the stop and feeds its stderr back to Claude. Three questions needed a fixed answer: what the gate compares against, what happens when Claude cannot get to green, and how a suite becomes part of the gate.

## Decision

**Baseline.** The baseline is `git merge-base HEAD origin/main`, falling back to `HEAD` when `origin/main` is missing. Changed files are `git diff --name-only <baseline>` plus untracked files that `.gitignore` does not exclude. Diffing against `HEAD` alone would wave through every committed change, and `/build` commits before it stops, so committed but unpushed work must count. Lint fails only when a file's eslint error count (severity 2) is higher than the same file at the baseline; a new file starts at 0. Warnings, ignored files and files no config block covers never block. Known limit: the user's own uncommitted edits in the same checkout count as Claude's.

**Give-up.** Each block increments `.claude/logs/stop-gate-<session_id>.count`. On the third consecutive block for one session (`MAX_ATTEMPTS = 3`), the gate deletes the count, exits 0, prints a JSON `systemMessage` warning and appends a `give-up` line to `.claude/logs/stop-gate.log`. Every exit 0 deletes the count, so a single green stop starts the next round from zero. Count files older than seven days are pruned. Claude Code itself overrides a block after 8 continuations; 3 keeps the token cost well below that.

**Never block on tooling.** No git repo, Node below 22, no eslint, a suite that times out (240 s) or runs zero tests, a suite that needs `webflow-internal` when it is not linked, or any unexpected error: each is a logged skip with exit 0.

**Suites map.** `.claude/scripts/stop-gate-suites.json` maps path prefixes to npm scripts. A suite is mapped only after it passes on main; red or networked suites sit under `excluded` with the reason. Suites that read files from `webflow-internal` carry `needsInternal: true`. Registering a new client is a duty, not an option: once `npm run test:<client>` passes on main, add `projects/<client>/` and `tests/<client>/` to the map (client-onboarding Step 5). An unmapped client is silently unguarded.

T0 run on main, 2026-11-06, Node 22.23:

| Result | Suites |
|--------|--------|
| Green, mapped | `test:wf`, `test:sr`, `test:ea`, `test:rhp`, `test:oost`, `test:rolfing-amsterdam`, `test:sme-audit` (needsInternal), `test:site-audit`, `test:shared`, `test:template`, `test:release`, `test:carsa`, `test:jayshetty`, `test:tsc`, `test:internal` (needs `rsync`) |
| Red, excluded | `test:nem` (dist bundle contract test), `test:za` (known `scanner.test.js` failure) |
| Networked, excluded | `test:za:int` (Notion), `test:sz*` (Playwright against live staging) |

## Consequences
- Positive: zero tokens when green; a red turn gets the failing rule or the last 40 lines of the failing suite, nothing more.
- Positive: pre-existing lint errors and missing tooling never trap a session.
- Negative / trade-offs: a slow mapped suite adds its run time to every stop that touches its paths.
- Negative / trade-offs: after three blocks the work can still stop red; the warning and the log line are the only signal.
- Revisit when a red suite turns green on main (move it from `excluded` into the map) or when the lint scope widens to `shared/` or `.claude/scripts/`.
