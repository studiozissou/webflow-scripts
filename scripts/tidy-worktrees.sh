#!/bin/bash
# Remove git worktrees and branches whose commits are already contained in
# origin/main, and fast-forward the main checkout.
#
# Safety invariant: a worktree or branch is removed ONLY when
#   git rev-list --count origin/main..BRANCH  ==  0
# i.e. every commit on it is already in origin/main. Anything else is left alone.
#
# Run manually, or weekly via the launchd agent in scripts/tidy-worktrees.plist.

set -uo pipefail

REPO="${TIDY_REPO:-$HOME/webflow-scripts}"
BACKUP_DIR="$REPO/.claude/worktrees-backup"

cd "$REPO" || { echo "FATAL: cannot cd to $REPO"; exit 1; }

echo "=== tidy-worktrees $(date '+%Y-%m-%d %H:%M:%S') ==="

# --- Step 1: refresh -------------------------------------------------------
git fetch origin --quiet || { echo "FATAL: fetch failed, aborting (counts would be stale)"; exit 1; }

ahead=$(git rev-list --count origin/main..main)
behind=$(git rev-list --count main..origin/main)

if [ "$ahead" != "0" ] && [ "$behind" != "0" ]; then
  echo "main has diverged (ahead $ahead, behind $behind) — not touching it, resolve by hand"
elif [ "$behind" != "0" ]; then
  if [ -n "$(git status --porcelain)" ]; then
    echo "main is behind $behind but working tree is dirty — skipping pull"
  else
    git merge --ff-only origin/main --quiet && echo "main fast-forwarded $behind commit(s)"
  fi
else
  echo "main already up to date"
fi

# --- Step 2/3: remove merged worktrees -------------------------------------
removed=0; kept=0
for d in "$REPO"/.claude/worktrees/*/; do
  [ -d "$d" ] || continue
  name=$(basename "$d")

  branch=$(git -C "$d" rev-parse --abbrev-ref HEAD 2>/dev/null) || { echo "  skip   $name (unreadable)"; kept=$((kept+1)); continue; }
  unmerged=$(git rev-list --count "origin/main..$branch" 2>/dev/null) || { echo "  skip   $name (no such branch)"; kept=$((kept+1)); continue; }

  if [ "$unmerged" != "0" ]; then
    echo "  keep   $name ($unmerged commit(s) not in main)"
    kept=$((kept+1))
    continue
  fi

  # Untracked files are not recoverable from a diff — never force past them.
  untracked=$(git -C "$d" ls-files --others --exclude-standard | head -5)
  if [ -n "$untracked" ]; then
    echo "  keep   $name (merged, but has untracked files):"
    echo "$untracked" | sed 's/^/           /'
    kept=$((kept+1))
    continue
  fi

  if [ -n "$(git -C "$d" status --porcelain)" ]; then
    mkdir -p "$BACKUP_DIR"
    git -C "$d" diff > "$BACKUP_DIR/$name.patch"
    echo "  backed up uncommitted changes -> $BACKUP_DIR/$name.patch"
  fi

  if git worktree remove --force "$d" 2>/dev/null; then
    echo "  REMOVE $name"
    removed=$((removed+1))
  else
    echo "  FAILED $name"
    kept=$((kept+1))
  fi
done
git worktree prune

# --- Step 4: prune merged branch refs --------------------------------------
pruned=0
while read -r b; do
  [ -n "$b" ] || continue
  [ "$(git rev-list --count "origin/main..$b" 2>/dev/null)" = "0" ] || continue
  if git branch -d "$b" >/dev/null 2>&1; then
    pruned=$((pruned+1))
  elif git merge-base --is-ancestor "$b" origin/main 2>/dev/null; then
    # Merged into main but ahead of its own stale remote ref — provably safe.
    git branch -D "$b" >/dev/null 2>&1 && pruned=$((pruned+1))
  else
    echo "  branch $b not pruned (not provably contained in origin/main)"
  fi
done < <(git for-each-ref --format='%(refname:short)' 'refs/heads/worktree-*')

# --- Step 5: report --------------------------------------------------------
echo "--- worktrees removed: $removed | kept: $kept | branch refs pruned: $pruned"
echo "--- disk in .claude/worktrees: $(du -sh "$REPO/.claude/worktrees" 2>/dev/null | cut -f1)"
echo
