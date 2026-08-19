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

## Step 5 — Report

State plainly:

- Worktrees removed, and the count before/after
- Branch refs pruned
- **What was kept and why** — list each remaining worktree with its unmerged
  commit count, so leftover work is visible rather than silently accumulating
- Any backup patch paths
- Disk still used by `.claude/worktrees` (`du -sh`)

## Notes

- Worktrees accumulate because each background job creates one for isolation and
  nothing removes it on exit — the keep-or-remove prompt needs a human. The
  branches are pushed, so only the folders are clutter.
- Never delete a worktree that is currently locked without checking why; a lock
  usually means a session is still running in it.
- This command never pushes, merges, or opens PRs. Use `/merge-worktrees` to
  integrate unmerged work first, then `/tidy` to clear what that leaves behind.
