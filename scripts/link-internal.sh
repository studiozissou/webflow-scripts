#!/bin/bash
# Symlink internal docs from the private webflow-internal checkout into this public checkout.
#
# Usage:
#   scripts/link-internal.sh                 link every internal path (safe to re-run)
#   scripts/link-internal.sh --unlinked [DIR] list real, ignored internal folders in DIR that are not links
#   scripts/link-internal.sh --install-hook  run this script automatically after checkout and worktree add
#
# A real folder is replaced by a link only after every file in it exists unchanged in the
# private checkout. New files are copied across first; conflicting files stop that path.

set -uo pipefail

INTERNAL="${WEBFLOW_INTERNAL:-$HOME/webflow-internal}"
TOP_PATHS=(.claude/specs .claude/research .claude/briefs .claude/plans .claude/screenshots .claude/reference .claude/triage .claude/queue.json)

repo_root() {
  local root
  root=$(git -C "${1:-.}" rev-parse --show-toplevel 2>/dev/null) || return 1
  [ -n "$root" ] && [ -e "$root/.git" ] || return 1
  echo "$root"
}

internal_paths() {
  local root=$1 d
  printf '%s\n' "${TOP_PATHS[@]}"
  {
    for d in "$INTERNAL"/projects/*/.claude "$root"/projects/*/.claude; do
      [ -e "$d" ] && echo "projects/$(basename "$(dirname "$d")")/.claude"
    done
  } | sort -u
}

list_unlinked() {
  local root p
  root=$(repo_root "${1:-.}") || { echo "link-internal: not a git checkout" >&2; return 1; }
  while read -r p; do
    [ -e "$root/$p" ] && [ ! -L "$root/$p" ] || continue
    git -C "$root" check-ignore -q "$p" || continue
    echo "$p"
  done < <(internal_paths "$root")
}

install_hook() {
  local root hooks hook
  root=$(repo_root .) || { echo "link-internal: not a git checkout" >&2; return 1; }
  hooks="$(cd "$root" && git rev-parse --path-format=absolute --git-common-dir)/hooks"
  hook="$hooks/post-checkout"
  if [ -e "$hook" ] && ! grep -q 'link-internal' "$hook"; then
    echo "link-internal: $hook already exists; add a call to scripts/link-internal.sh by hand" >&2
    return 1
  fi
  mkdir -p "$hooks"
  cat > "$hook" <<'HOOK'
#!/bin/bash
# link-internal: symlink private internal docs into every checkout and new worktree.
[ "${3:-0}" = "1" ] || exit 0
root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
[ -x "$root/scripts/link-internal.sh" ] && "$root/scripts/link-internal.sh" || true
HOOK
  chmod +x "$hook"
  echo "link-internal: installed $hook"
}

same_content() {
  local dst=$1 src=$2
  if [ -d "$dst" ]; then
    ! rsync -r --dry-run --checksum --itemize-changes "$dst"/ "$src"/ 2>/dev/null | grep -q '^>f'
  else
    cmp -s "$dst" "$src"
  fi
}

link_all() {
  local root p src dst linked=0 status=0
  root=$(repo_root .) || { echo "link-internal: not a git checkout" >&2; return 1; }
  if [ ! -d "$INTERNAL" ]; then
    echo "link-internal: $INTERNAL not found; clone studiozissou/webflow-internal there, then re-run"
    return 0
  fi

  while read -r p; do
    src="$INTERNAL/$p"
    dst="$root/$p"

    if [ -L "$dst" ]; then
      [ "$(readlink "$dst")" = "$src" ] && continue
      rm "$dst"
    elif [ -e "$dst" ]; then
      if [ -d "$dst" ]; then
        mkdir -p "$src"
        rsync -a --ignore-existing "$dst"/ "$src"/
      elif [ ! -e "$src" ]; then
        mkdir -p "$(dirname "$src")"
        cp -p "$dst" "$src"
      fi
      if ! same_content "$dst" "$src"; then
        echo "link-internal: $p differs from $src; left as-is, merge by hand"
        status=1
        continue
      fi
      rm -rf "$dst"
    fi

    [ -e "$src" ] || continue
    mkdir -p "$(dirname "$dst")"
    ln -s "$src" "$dst"
    linked=$((linked + 1))
  done < <(internal_paths "$root")

  [ "$linked" -gt 0 ] && echo "link-internal: linked $linked path(s) from $INTERNAL"
  return $status
}

case "${1:-}" in
  --unlinked) list_unlinked "${2:-.}" ;;
  --install-hook) install_hook ;;
  "") link_all ;;
  *) echo "usage: $0 [--unlinked [DIR] | --install-hook]" >&2; exit 2 ;;
esac
