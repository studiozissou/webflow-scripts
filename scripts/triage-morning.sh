#!/bin/bash
# Run /triage headlessly on weekday mornings and save the report for the user to read.
#
# An unattended run posts one digest to the digest Slack channel, posts replies in that
# digest thread (acknowledgements and job results), and creates Gmail drafts; it sends no
# email and replies to no one else.
# It also starts at most 3 background builds for tasks the owner approved with `go`, once builds are enabled.
# It changes Notion only through tools/notion/cli.js: Priority after an `ok changes` reply,
# and Status plus a comment on tasks the owner approved with `go`. It also moves newsletters to
# Gmail's trash, recoverable for 30 days. Tools are limited to
# .claude/triage/allowed-tools.txt (private), and touching .claude/triage/triage.off stops
# every run.
#
# Before /triage it reads the open Notion tasks and the goals into .claude/triage/world/
# (tasks-<date>.json, goals-<date>.json) with tools/notion/cli.js, then writes the session
# snapshot (.claude/triage/world/<date>.json) with `node tools/triage/cli.js snapshot collect`:
# plain Node, no model, read-only outside those files. A failed read or collect is a warning;
# the digest still runs.
#
# Scheduled by scripts/triage-morning.plist (Mon-Fri 08:00). Run by hand to test:
#   bash scripts/triage-morning.sh
#   TRIAGE_ARGS="--no-delete" bash scripts/triage-morning.sh

set -uo pipefail

REPO="${TRIAGE_REPO:-$HOME/webflow-scripts}"
INTERNAL_TRIAGE="${INTERNAL_TRIAGE:-$REPO/.claude/triage}"
ARGS="${TRIAGE_ARGS:-}"
REPORT_DIR="$INTERNAL_TRIAGE/reports"
STAMP=$(date '+%Y-%m-%d')
REPORT="$REPORT_DIR/$STAMP.md"

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)
# shellcheck source=lib/triage-common.sh
source "$SCRIPT_DIR/lib/triage-common.sh" || { echo "FATAL: cannot load $SCRIPT_DIR/lib/triage-common.sh" >&2; exit 1; }

if triage_off; then
  echo "triage-morning: $INTERNAL_TRIAGE/triage.off exists; not running" >&2
  exit 0
fi

load_allowlist ALLOWED "$INTERNAL_TRIAGE/allowed-tools.txt"
triage_real_dir

cd "$REPO" || { echo "FATAL: cannot cd to $REPO"; exit 1; }

echo "=== triage-morning $(date '+%Y-%m-%d %H:%M:%S') ==="

triage_env
triage_claude_bin
# tools/notion/cli.js reads and writes tasks over REST with this token.
triage_notion_token
# tools/slack/cli.js posts the digest and its thread replies as the bot with this token.
triage_slack_token || true

mkdir -p "$REPORT_DIR"

WORLD_DIR="$INTERNAL_TRIAGE/world"
SNAPSHOT_ARGS=()

# Write `node tools/notion/cli.js <$3...>` to $2 through a temp file and add `$1 $2` to
# SNAPSHOT_ARGS. A failure leaves no partial file and drops the flag, so the snapshot keeps
# what it already had today. Needs NOTION_TOKEN, exported above.
notion_rows() {
  local flag=$1 file=$2 command=$3
  shift 2
  if mkdir -p "$WORLD_DIR" && node tools/notion/cli.js "$@" > "$file.tmp" && mv "$file.tmp" "$file"; then
    SNAPSHOT_ARGS+=("$flag" "$file")
  else
    rm -f "$file.tmp"
    echo "WARNING: notion $command failed; snapshot collect runs without $flag" >&2
  fi
}

notion_rows --tasks "$WORLD_DIR/tasks-$STAMP.json" tasks --open
notion_rows --goals "$WORLD_DIR/goals-$STAMP.json" goals

# The snapshot's JSON summary goes to the launchd log with stderr, not into the report.
if ! node tools/triage/cli.js snapshot collect ${SNAPSHOT_ARGS[@]+"${SNAPSHOT_ARGS[@]}"} >&2; then
  echo "WARNING: snapshot collect failed; /triage runs without a fresh session snapshot" >&2
fi

# --allowedTools is what makes an unattended run possible: nobody is there to answer a
# permission prompt at 08:00, so any tool not on the list is denied instead of asked.
#
# stderr goes to the launchd log, not into the report. The report is something the user
# actually reads over coffee, and a stray warning spliced into the middle of a table is
# enough to make it look broken.
"$CLAUDE_BIN" -p "/triage${ARGS:+ $ARGS}" \
  --add-dir "$TRIAGE_REAL_DIR" \
  --allowedTools "${ALLOWED[@]}" \
  > "$REPORT"
status=$?

if [ $status -ne 0 ]; then
  echo "triage exited $status — see $REPORT"
  exit $status
fi

echo "report written to $REPORT ($(wc -l < "$REPORT" | tr -d ' ') lines)"
echo
