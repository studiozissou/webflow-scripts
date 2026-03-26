Inspect all active git worktrees, prioritise by oldest commit, merge each into the current branch one by one with smoke tests between merges, and clean up after each successful merge.

## Step 1 — Inventory

1. Run `git worktree list` to get all active worktrees.
2. Filter out the main worktree (the one that IS the repo root) — only process secondary worktrees.
3. If zero secondary worktrees exist, report "No worktrees to merge" and stop.
4. For each worktree, gather:
   - Branch name
   - Path on disk
   - First divergence commit date (`git log main..BRANCH --reverse --format='%ai' | head -1`)
   - Number of commits ahead of main (`git rev-list main..BRANCH --count`)
   - Files changed (`git diff main..BRANCH --stat`)
   - Any file overlap with other worktree branches (potential conflict risk)

## Step 2 — Prioritise and present

Sort worktrees by first divergence commit date (oldest first — integrates longest-running work first to minimise drift).

Present a merge plan:

```
Worktree merge plan (oldest first):

| # | Branch | Age | Commits | Files changed | Conflict risk |
|---|--------|-----|---------|---------------|---------------|
| 1 | feat-a | 3d  | 4       | 3             | None          |
| 2 | feat-b | 1d  | 2       | 5             | feat-a (2 shared files) |

Tests between merges: Yes (smoke)
Cleanup: Auto after each merge
```

If any branches share modified files, flag the conflict risk. If high overlap exists, suggest reordering (merge the dependency first) and explain why.

Ask via `AskUserQuestion`:
- **"Merge in this order" (Recommended)** — proceed as shown
- **"Let me reorder"** — user provides custom order
- **"Cancel"** — abort

## Step 3 — Merge loop

For each worktree in order:

### 3a. Pre-merge check

1. Ensure the current branch is clean (`git status --porcelain` is empty). If not, ask the user to commit or stash first.
2. Confirm the worktree branch is up to date with its own changes (no uncommitted work in the worktree directory).

### 3b. Merge

```bash
git merge BRANCH --no-ff -m "merge: BRANCH into CURRENT_BRANCH"
```

Use `--no-ff` to preserve the branch history as a merge commit.

### 3c. Handle conflicts

If the merge has conflicts:
1. Run `git diff --name-only --diff-filter=U` to list conflicted files.
2. Show each conflict with context (`git diff` on the conflicted files).
3. **Stop and ask the user** how to resolve. Do NOT auto-resolve.
4. After user resolves, stage the files and complete the merge: `git commit --no-edit`.
5. If the user wants to abort this particular merge: `git merge --abort`, skip this branch, continue to the next.

### 3d. Smoke test

After a successful merge, run a verification pass appropriate to the project's test setup.

**Detect the verification strategy:**

1. **CDN-deployed projects with local source switch** (project has `?rhp=local` or similar URL-param source switching via `init.js`):
   - The staging site can load scripts from localhost when `?rhp=local` is appended (persists to `localStorage`)
   - **If local dev server is running** (e.g. `:8080`):
     - `npm test` works — but tests must navigate with the local source param so they test merged code, not CDN code
     - Before running tests, verify the local server is up: `curl -sf http://localhost:8080/ > /dev/null`
     - Run: `RHP_SOURCE=local npm test` (if the test suite supports it), or set localStorage before each test via Playwright's `storageState`
     - If the test suite doesn't support a local-source flag, use Playwright MCP instead (see below)
   - **Playwright MCP** (if connected):
     - `browser_navigate` to `STAGING_URL?rhp=local`
     - `browser_console_messages` — no JS errors
     - `browser_snapshot` — key DOM elements present
     - `browser_evaluate` — `window.RHP?.scriptsOk === true` (or equivalent health check)
   - **Fallback** (no local server, no MCP): skip automated tests, log "CDN project — smoke tests deferred to `/deploy`", and do a **merge-level sanity check**:
     - Scan merged files for syntax errors (`node --check FILE` for .js files)
     - Check for obvious conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
     - Verify no `console.log` without `DEBUG &&` guard

2. **Local-testable projects** (tests run against local files, no CDN dependency):
   - Check for `package.json` with a test script — use `npm test`
   - If no test script, check for a `tests/` directory with a config — use `npx playwright test`
   - If no tests found, log "No test suite found — skipping smoke test" and continue

3. Run the chosen verification. Report results.

4. If verification **fails**:
   - Show the failures
   - Ask via `AskUserQuestion`:
     - **"Fix and continue"** — user fixes, re-runs tests, then proceed
     - **"Revert this merge and skip"** — `git reset --hard HEAD~1`, skip this branch, continue
     - **"Stop here"** — halt the entire merge sequence

5. If verification **passes**: continue to cleanup.

### 3e. Cleanup

After a successful merge + passing tests:

```bash
git worktree remove PATH_TO_WORKTREE
git branch -d BRANCH
```

If branch deletion fails (not fully merged warning), use `-D` only after confirming the merge commit exists in the current branch history.

Log: `Merged and cleaned up: BRANCH`

## Step 4 — Summary

After all worktrees are processed, present a summary:

```
Merge summary:
  Merged:  feat-a, feat-b (2)
  Skipped: feat-c (conflict — user aborted) (1)
  Failed:  none

Current branch: main
Total new commits: 6
Tests: all passing
```

If any branches were skipped, list them with the reason and remind the user they still have active worktrees (`git worktree list`).
