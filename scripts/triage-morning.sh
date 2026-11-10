#!/bin/bash
# Run /triage headlessly on weekday mornings and save the report for the user to read.
#
# An unattended run posts one digest to the digest Slack channel, posts job result
# replies in that digest thread, and creates Gmail drafts; it sends no email and replies
# to no one else. It changes Notion only through tools/notion/cli.js: Priority after an
# `ok changes` reply, and Status plus a comment on tasks Will approved with `go`. It also
# moves newsletters to Gmail's trash, recoverable for 30 days. Tools are limited to
# .claude/triage/allowed-tools.txt (private), and touching .claude/triage/triage.off stops
# every run.
#
# Scheduled by scripts/triage-morning.plist. Run by hand to test:
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

# No allowlist means no run: nobody is there to answer a permission prompt, and running
# without a tool gate is not an option.
ALLOWLIST="$INTERNAL_TRIAGE/allowed-tools.txt"
ALLOWED=()
while IFS= read -r t; do ALLOWED+=("$t"); done < <(read_list "$ALLOWLIST")
if [ ${#ALLOWED[@]} -eq 0 ]; then
  echo "FATAL: $ALLOWLIST is missing or lists no tools; refusing to run without a tool allowlist" >&2
  exit 1
fi

cd "$REPO" || { echo "FATAL: cannot cd to $REPO"; exit 1; }

echo "=== triage-morning $(date '+%Y-%m-%d %H:%M:%S') ==="

triage_env

# type -P searches PATH only, ignoring the shell function that wraps claude in the user's
# interactive profile — launchd will not have it, but a manual test run would.
CLAUDE_BIN="${CLAUDE_BIN:-$(type -P claude 2>/dev/null)}"
if [ -z "$CLAUDE_BIN" ]; then
  echo "FATAL: 'claude' not found on PATH. Add its directory to triage_env in scripts/lib/triage-common.sh,"
  echo "       or set it in the plist's EnvironmentVariables."
  exit 1
fi

# tools/notion/cli.js reads open tasks over REST with this token.
if [ -z "${NOTION_TOKEN:-}" ]; then
  if token=$(security find-generic-password -s mcp -a notion-triage -w 2>/dev/null) && [ -n "$token" ]; then
    export NOTION_TOKEN="$token"
  else
    echo "WARNING: Keychain item mcp/notion-triage not found; open tasks will not load" >&2
  fi
  unset token
fi

mkdir -p "$REPORT_DIR"

# --allowedTools is what makes an unattended run possible: nobody is there to answer a
# permission prompt at 08:30, so any tool not on the list is denied instead of asked.
#
# stderr goes to the launchd log, not into the report. The report is something the user
# actually reads over coffee, and a stray warning spliced into the middle of a table is
# enough to make it look broken.
"$CLAUDE_BIN" -p "/triage${ARGS:+ $ARGS}" \
  --allowedTools "${ALLOWED[@]}" \
  > "$REPORT"
status=$?

if [ $status -ne 0 ]; then
  echo "triage exited $status — see $REPORT"
  exit $status
fi

echo "report written to $REPORT ($(wc -l < "$REPORT" | tr -d ' ') lines)"
echo
