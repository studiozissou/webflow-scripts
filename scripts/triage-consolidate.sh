#!/bin/bash
# Run /triage consolidate headlessly at 18:00 to turn the day's session corrections into learnings.
#
# First `node tools/triage/cli.js learnings extract` (pure Node, no model) turns the pointer
# inbox into .claude/triage/learnings/excerpts-<date>.json. With no candidates it writes the
# "No learnings today." digest itself and claude does not run. Otherwise an unattended run
# posts at most one "Learnings:" comment per excerpted Notion task, adds dated lines to
# ~/.claude/context/learnings.md and places learnings/digest-<date>.md, all through
# tools/triage/cli.js learnings; it sends no message, posts nothing to Slack and never writes
# Description, Notes, Priority or Status. Tools are limited to
# .claude/triage/consolidate-allowed-tools.txt (private), and touching
# .claude/triage/triage.off stops every run.
#
# Scheduled by scripts/triage-consolidate.plist. Run by hand to test:
#   bash scripts/triage-consolidate.sh
#   TRIAGE_ARGS="--dry-run" bash scripts/triage-consolidate.sh

set -uo pipefail

REPO="${TRIAGE_REPO:-$HOME/webflow-scripts}"
INTERNAL_TRIAGE="${INTERNAL_TRIAGE:-$REPO/.claude/triage}"
ARGS="${TRIAGE_ARGS:-}"
REPORT_DIR="$INTERNAL_TRIAGE/reports"
STAMP=$(date '+%Y-%m-%d')
REPORT="$REPORT_DIR/$STAMP-consolidate.md"

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)
# shellcheck source=lib/triage-common.sh
source "$SCRIPT_DIR/lib/triage-common.sh" || { echo "FATAL: cannot load $SCRIPT_DIR/lib/triage-common.sh" >&2; exit 1; }

if triage_off; then
  echo "triage-consolidate: $INTERNAL_TRIAGE/triage.off exists; not running" >&2
  exit 0
fi

load_allowlist ALLOWED "$INTERNAL_TRIAGE/consolidate-allowed-tools.txt"
triage_real_dir

cd "$REPO" || { echo "FATAL: cannot cd to $REPO"; exit 1; }

echo "=== triage-consolidate $(date '+%Y-%m-%d %H:%M:%S') ==="

triage_env

if ! extract=$(node tools/triage/cli.js learnings extract); then
  echo "FATAL: learnings extract failed; not running /triage consolidate" >&2
  exit 1
fi
echo "$extract"

if printf '%s' "$extract" | grep -q '"noModel": true'; then
  echo "no learnings today; digest written"
  exit 0
fi

triage_claude_bin
# tools/triage/cli.js learnings comment posts through the Notion REST client with this token.
triage_notion_token

mkdir -p "$REPORT_DIR"

"$CLAUDE_BIN" -p "/triage consolidate${ARGS:+ $ARGS}" \
  --add-dir "$TRIAGE_REAL_DIR" \
  --allowedTools "${ALLOWED[@]}" \
  > "$REPORT"
status=$?

if [ $status -ne 0 ]; then
  echo "triage consolidate exited $status — see $REPORT"
  exit $status
fi

echo "report written to $REPORT ($(wc -l < "$REPORT" | tr -d ' ') lines)"
echo
