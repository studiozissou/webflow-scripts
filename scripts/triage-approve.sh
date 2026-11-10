#!/bin/bash
# Run /triage approve headlessly at midday and late afternoon to act on replies in the morning digest thread.
#
# An unattended run posts replies in the digest thread only (acknowledgements and job
# results); it posts no new digest, sends no email and replies to no one else. It starts
# at most 3 background builds for tasks Will approved (scripts/triage-job.sh, which never
# pushes or deploys). It changes Notion only through tools/notion/cli.js: Priority after an
# `ok changes` reply, and Status plus a comment on tasks Will approved with `go`. Tools are
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

ALLOWLIST="$INTERNAL_TRIAGE/allowed-tools.txt"
ALLOWED=()
while IFS= read -r t; do ALLOWED+=("$t"); done < <(read_list "$ALLOWLIST")
if [ ${#ALLOWED[@]} -eq 0 ]; then
  echo "FATAL: $ALLOWLIST is missing or lists no tools; refusing to run without a tool allowlist" >&2
  exit 1
fi

cd "$REPO" || { echo "FATAL: cannot cd to $REPO"; exit 1; }

echo "=== triage-approve $(date '+%Y-%m-%d %H:%M:%S') ==="

triage_env

CLAUDE_BIN="${CLAUDE_BIN:-$(type -P claude 2>/dev/null)}"
if [ -z "$CLAUDE_BIN" ]; then
  echo "FATAL: 'claude' not found on PATH. Add its directory to triage_env in scripts/lib/triage-common.sh,"
  echo "       or set it in the plist's EnvironmentVariables."
  exit 1
fi

if [ -z "${NOTION_TOKEN:-}" ]; then
  if token=$(security find-generic-password -s mcp -a notion-triage -w 2>/dev/null) && [ -n "$token" ]; then
    export NOTION_TOKEN="$token"
  else
    echo "WARNING: Keychain item mcp/notion-triage not found; Notion task reads will fail" >&2
  fi
  unset token
fi

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
