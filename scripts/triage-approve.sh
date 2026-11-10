#!/bin/bash
# Run /triage approve headlessly at midday and late afternoon to act on replies in the morning digest thread.
#
# An unattended run posts replies in the digest thread only (acknowledgements and job
# results); it posts no new digest, sends no email and replies to no one else.
# It starts at most 3 background builds for tasks the owner approved with `go`, once builds are
# enabled (scripts/triage-job.sh, which never pushes or deploys). It changes Notion only through tools/notion/cli.js: Priority after an
# `ok changes` reply, and Status plus a comment on tasks the owner approved with `go`. Tools are
# limited to .claude/triage/allowed-tools.txt (private), and touching
# .claude/triage/triage.off stops every run.
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

load_allowlist ALLOWED "$INTERNAL_TRIAGE/allowed-tools.txt"

cd "$REPO" || { echo "FATAL: cannot cd to $REPO"; exit 1; }

echo "=== triage-approve $(date '+%Y-%m-%d %H:%M:%S') ==="

triage_env
triage_claude_bin
# tools/notion/cli.js reads and writes tasks over REST with this token.
triage_notion_token

mkdir -p "$REPORT_DIR"

"$CLAUDE_BIN" -p "/triage approve${ARGS:+ $ARGS}" \
  --allowedTools "${ALLOWED[@]}" \
  > "$REPORT"
status=$?

if [ $status -ne 0 ]; then
  echo "triage approve exited $status — see $REPORT"
  exit $status
fi

echo "report written to $REPORT ($(wc -l < "$REPORT" | tr -d ' ') lines)"
echo
