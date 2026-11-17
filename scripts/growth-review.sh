#!/bin/bash
# Run /growth-review headlessly on Monday mornings for studiozissou.io and save the run output.
#
# The skill (projects/studio-zissou/.claude/skills/growth-review, private) does the work: Search
# Console through tools/studio-zissou/report.js, Semrush and PostHog through their MCPs, tiering
# through tools/studio-zissou/recommend.js and the publish guard. See ADR-003.
#
# Kill switch: projects/studio-zissou/.claude/experiments/autopilot.off makes the run read-only
# (--dry-run is added); the report and DM still say what would have happened.
# Live publish: SZ_GROWTH_LIVE=0 (the default) stops every live publish; AUTO items are logged as
# "downgraded: live disabled" and staged instead. Set it to 1 in the plist at go-live (T8).
#
# Only one run at a time: it holds experiments/growth-review.lock (with its pid) and exits 0 while
# a live run holds it. Tools are limited to growth-review/allowed-tools.txt (private).
#
# Scheduled by scripts/growth-review.plist (Monday 08:00). Run by hand to test:
#   GROWTH_ARGS="--dry-run" bash scripts/growth-review.sh
#   SZ_GROWTH_LIVE=0 bash scripts/growth-review.sh

set -uo pipefail

REPO="${GROWTH_REPO:-$HOME/webflow-scripts}"
SZ_DIR="${GROWTH_SZ_DIR:-$REPO/projects/studio-zissou/.claude}"
ARGS="${GROWTH_ARGS:-}"
export SZ_GROWTH_LIVE="${SZ_GROWTH_LIVE:-0}"
REPORT_DIR="$SZ_DIR/reports"
STAMP=$(date '+%Y-%m-%d')
REPORT="$REPORT_DIR/run-$STAMP.md"

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)
# shellcheck source=lib/triage-common.sh
source "$SCRIPT_DIR/lib/triage-common.sh" || { echo "FATAL: cannot load $SCRIPT_DIR/lib/triage-common.sh" >&2; exit 1; }

if [ -e "$SZ_DIR/experiments/autopilot.off" ] && [[ " $ARGS " != *" --dry-run "* ]]; then
  echo "growth-review: autopilot.off exists; running read-only" >&2
  ARGS="${ARGS:+$ARGS }--dry-run"
fi

LOCK="$SZ_DIR/experiments/growth-review.lock"
mkdir -p "$SZ_DIR/experiments"
if ! mkdir "$LOCK" 2>/dev/null; then
  holder=$(cat "$LOCK/pid" 2>/dev/null)
  if [ -n "$holder" ] && kill -0 "$holder" 2>/dev/null; then
    echo "growth-review: already running (pid $holder); not running" >&2
    exit 0
  fi
  rm -rf "$LOCK"
  mkdir "$LOCK" || { echo "FATAL: cannot take $LOCK" >&2; exit 1; }
fi
echo $$ > "$LOCK/pid"
trap 'rm -rf "$LOCK"' EXIT

load_allowlist ALLOWED "$SZ_DIR/growth-review/allowed-tools.txt"
SZ_REAL_DIR=$(cd "$SZ_DIR" && pwd -P) || { echo "FATAL: cannot resolve $SZ_DIR" >&2; exit 1; }

cd "$REPO" || { echo "FATAL: cannot cd to $REPO" >&2; exit 1; }

echo "=== growth-review $(date '+%Y-%m-%d %H:%M:%S') args='$ARGS' live=$SZ_GROWTH_LIVE ==="

triage_env
triage_claude_bin

mkdir -p "$REPORT_DIR"

GROWTH_SCHEDULED=1 "$CLAUDE_BIN" -p "/growth-review${ARGS:+ $ARGS}" \
  --add-dir "$SZ_REAL_DIR" \
  --allowedTools "${ALLOWED[@]}" \
  > "$REPORT"
status=$?

if [ $status -ne 0 ]; then
  echo "growth-review exited $status — see $REPORT"
  exit $status
fi

echo "run output written to $REPORT ($(wc -l < "$REPORT" | tr -d ' ') lines)"
