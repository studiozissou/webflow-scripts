Bring the main checkout up to date, then remove worktrees and branches whose work is already in main. Never touches unmerged work.

> **Safety invariant:** a worktree or branch is disposable **only** when
> `git rev-list --count origin/main..BRANCH` returns `0`. That means every commit
> on it is already contained in `origin/main`, so removing it cannot lose work.
> Anything with a non-zero count is reported and left alone. Do not use any other
> test for "merged" — branch names, dates, and PR status are not evidence.

## Step 1 — Refresh

1. Run `git fetch origin` from the repo root so `origin/main` is current. Every
   later comparison depends on this; skipping it makes the counts lie.
2. Run `git status -sb` in the main checkout.
3. If the main checkout is behind, run `git pull`. If it is also ahead (diverged),
   stop and report — do not merge or rebase automatically.
4. If the pull is blocked by uncommitted changes, stash them, pull, then pop.
   Report if the pop conflicts and leave the stash in place.

## Step 2 — Inventory

For every directory in `.claude/worktrees/*/`:

- Branch name (`git -C DIR rev-parse --abbrev-ref HEAD`)
- Commits not in main (`git rev-list --count origin/main..BRANCH`)
- Uncommitted files (`git -C DIR status --porcelain`)

Present a table before removing anything:

```
| Worktree | Not in main | Uncommitted | Action  |
|----------|-------------|-------------|---------|
| feat-a   | 0           | 0           | remove  |
| feat-b   | 3           | 2           | keep    |
```

## Step 3 — Remove merged worktrees

For each worktree with **0** commits not in main:

1. If it has uncommitted files, first save them:
   `git -C DIR diff > /tmp/tidy-backup/BRANCH.patch`
   Report the backup path. Untracked files are **not** captured by a diff — if any
   exist, list them and skip that worktree rather than forcing.
2. `git worktree remove --force DIR`
3. After the loop, `git worktree prune`.

## Step 4 — Prune merged branch refs

For each `worktree-*` branch with 0 commits not in main, run `git branch -d BRANCH`.

`git -d` may refuse a branch that is merged to main but ahead of its own stale
remote ref. Before falling back to `git branch -D`, prove it is safe:

```
git merge-base --is-ancestor BRANCH origin/main
```

Only force-delete if that exits 0. Otherwise leave the branch and report why.

## Step 5 — Report developer cache sizes

Worktree disk is source code — the only way to reclaim it is to remove the
worktree, which Step 3 already does. The large, genuinely reclaimable space sits
outside the repo in package-manager caches. Measure it, report it, stop there.

1. Measure:
   ```
   du -sh ~/.npm ~/Library/Caches ~/.cache 2>/dev/null
   df -h /System/Volumes/Data | tail -1
   ```
2. Report each size, and the free space remaining on the disk.
3. If free space is under 20G, or those caches together exceed 5G, print this
   command for the user to run in their own terminal:
   ```
   cmm clean dev
   ```

**This step never deletes anything.** Do not run `cmm clean`, `cmm purge`, or any
`--force` variant from here. Two reasons: `cmm` is a full-screen interactive tool,
so run non-interactively it paints one frame and exits with
`Error: bodyDidNotComplete`; and `--force` skips the review step with no dry-run
available, so nothing proves in advance what it will take. Report the numbers,
print the command, let the user decide.

Do not reach for `cmm purge` on this repo. There is one `node_modules`, at the
repo root, and it is in active use — the worktrees carry none, so `purge` has
nothing safe to find here.

## Step 6 — Report

State plainly:

- Worktrees removed, and the count before/after
- Branch refs pruned
- **What was kept and why** — list each remaining worktree with its unmerged
  commit count, so leftover work is visible rather than silently accumulating
- Any backup patch paths
- Disk still used by `.claude/worktrees` (`du -sh`)
- Developer cache sizes from Step 5, plus the `cmm clean dev` command if
  either threshold was crossed

## Notes

- Worktrees accumulate because each background job creates one for isolation and
  nothing removes it on exit — the keep-or-remove prompt needs a human. The
  branches are pushed, so only the folders are clutter.
- Never delete a worktree that is currently locked without checking why; a lock
  usually means a session is still running in it.
- `cmm clean dev` respects the CleanMyMac ignore list. The Playwright browsers
  (`~/Library/Caches/ms-playwright`) are already on it — they are a slow
  re-download and the RHP test suite depends on them. Check
  `cmm ignore list` before recommending a clean.
- This command never pushes, merges, or opens PRs. Use `/merge-worktrees` to
  integrate unmerged work first, then `/tidy` to clear what that leaves behind.
