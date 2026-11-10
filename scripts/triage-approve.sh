#!/bin/bash
# Run /triage approve headlessly at midday and late afternoon to act on replies in the morning digest thread.
#
# An unattended run posts replies in the digest thread only (acknowledgements and job
# results); it posts no new digest, sends no email and replies to no one else. It starts
# at most 3 background builds for tasks Will approved (scripts/triage-job.sh, which never
# pushes or deploys) and applies Notion changes he approved with `ok changes`. Tools are
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

if [ -e "$INTERNAL_TRIAGE/triage.off" ]; then
  echo "triage-approve: $INTERNAL_TRIAGE/triage.off exists; not running" >&2
  exit 0
fi

ALLOWLIST="$INTERNAL_TRIAGE/allowed-tools.txt"
ALLOWED=()
if [ -f "$ALLOWLIST" ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"
    [ -z "$line" ] || [ "${line:0:1}" = "#" ] || ALLOWED+=("$line")
  done < "$ALLOWLIST"
fi
if [ ${#ALLOWED[@]} -eq 0 ]; then
  echo "FATAL: $ALLOWLIST is missing or lists no tools; refusing to run without a tool allowlist" >&2
  exit 1
fi

cd "$REPO" || { echo "FATAL: cannot cd to $REPO"; exit 1; }

echo "=== triage-approve $(date '+%Y-%m-%d %H:%M:%S') ==="

export PATH="$HOME/.claude/local:$HOME/.local/bin:$HOME/.bun/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

CLAUDE_BIN="${CLAUDE_BIN:-$(type -P claude 2>/dev/null)}"
if [ -z "$CLAUDE_BIN" ]; then
  echo "FATAL: 'claude' not found on PATH. Add its directory to the PATH line above,"
  echo "       or set it in the plist's EnvironmentVariables."
  exit 1
fi

unset ANTHROPIC_API_KEY

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
