#!/bin/bash
# Run /triage approve headlessly at midday and late afternoon to act on replies in the morning digest thread.
#
# An unattended run posts replies in the digest thread only (acknowledgements and job
# results); it posts no new digest, sends no email and replies to no one else.
# It starts at most 3 background builds for tasks the owner approved with `go`, once builds are
# enabled (scripts/triage-job.sh, which never pushes or deploys). It changes Notion only through tools/notion/cli.js: Priority after an
# `ok changes` reply, and Status plus a comment on tasks the owner approved with `go`. Tools are
# limited to .claude/triage/allowed-tools.txt (private), and touching
# .claude/triage/triage.off stops every run. The chat daemon (scripts/triage-chat.sh) also runs this
# script for a grammar reply in the digest thread; a lock at .claude/triage/tmp/approve.lock keeps
# runs from overlapping.
#
# Scheduled by scripts/triage-approve.plist. Run by hand to test:
#   bash scripts/triage-approve.sh
#   TRIAGE_ARGS="--dry-run" bash scripts/triage-approve.sh

set -uo pipefail

REPO="${TRIAGE_REPO:-$HOME/webflow-scripts}"
INTERNAL_TRIAGE="${INTERNAL_TRIAGE:-$REPO/.claude/triage}"
ARGS="${TRIAGE_ARGS:-}"
REPORT_DIR="$INTERNAL_TRIAGE/reports"
STAMP=$(date '+%Y-%m-%d')
REPORT="$REPORT_DIR/$STAMP-approve-$(date '+%H%M').md"

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)
# shellcheck source=lib/triage-common.sh
source "$SCRIPT_DIR/lib/triage-common.sh" || { echo "FATAL: cannot load $SCRIPT_DIR/lib/triage-common.sh" >&2; exit 1; }

if triage_off; then
  echo "triage-approve: $INTERNAL_TRIAGE/triage.off exists; not running" >&2
  exit 0
fi

# One approve run at a time, launchd or the chat daemon, so two runs never both write
# processedTs. mkdir is atomic; the trap drops the lock on every exit. A lock older than
# TRIAGE_APPROVE_LOCK_STALE seconds is from a run that died and is removed. A run that cannot
# get the lock within TRIAGE_APPROVE_LOCK_WAIT seconds exits 0; a reply it missed waits for the next run.
LOCK="$INTERNAL_TRIAGE/tmp/approve.lock"
LOCK_WAIT="${TRIAGE_APPROVE_LOCK_WAIT:-300}"
LOCK_STALE="${TRIAGE_APPROVE_LOCK_STALE:-900}"
mkdir -p "$INTERNAL_TRIAGE/tmp" || { echo "FATAL: cannot create $INTERNAL_TRIAGE/tmp" >&2; exit 1; }
waited=0
until mkdir "$LOCK" 2>/dev/null; do
  mtime=$(stat -f %m "$LOCK" 2>/dev/null || stat -c %Y "$LOCK" 2>/dev/null) || continue
  if [ $(( $(date +%s) - mtime )) -gt "$LOCK_STALE" ] && rmdir "$LOCK" 2>/dev/null; then
    echo "triage-approve: removed stale lock $LOCK" >&2
    continue
  fi
  if [ "$waited" -ge "$LOCK_WAIT" ]; then
    echo "triage-approve: locked by another approve run for ${waited}s; not running" >&2
    exit 0
  fi
  sleep 1
  waited=$((waited + 1))
done
trap 'rmdir "$LOCK" 2>/dev/null' EXIT
trap 'exit 143' TERM
trap 'exit 130' INT
trap 'exit 129' HUP

load_allowlist ALLOWED "$INTERNAL_TRIAGE/allowed-tools.txt"
triage_real_dir

cd "$REPO" || { echo "FATAL: cannot cd to $REPO"; exit 1; }

echo "=== triage-approve $(date '+%Y-%m-%d %H:%M:%S') ==="

triage_env
triage_claude_bin
# tools/notion/cli.js reads and writes tasks over REST with this token.
triage_notion_token
# tools/slack/cli.js posts the acknowledgements and job results as the bot with this token.
triage_slack_token || true

mkdir -p "$REPORT_DIR"

"$CLAUDE_BIN" -p "/triage approve${ARGS:+ $ARGS}" \
  --add-dir "$TRIAGE_REAL_DIR" \
  --allowedTools "${ALLOWED[@]}" \
  > "$REPORT"
status=$?

if [ $status -ne 0 ]; then
  echo "triage approve exited $status — see $REPORT"
  exit $status
fi

echo "report written to $REPORT ($(wc -l < "$REPORT" | tr -d ' ') lines)"
echo
