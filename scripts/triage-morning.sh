#!/bin/bash
# Run /triage headlessly on weekday mornings and save the report for the user to read.
#
# An unattended run posts one digest to the digest Slack channel, posts job result
# replies in that digest thread, and creates Gmail drafts; it sends no email and replies
# to no one else. It also files tasks in Notion and moves newsletters to Gmail's trash,
# recoverable for 30 days. Tools are limited to .claude/triage/allowed-tools.txt (private),
# and touching .claude/triage/triage.off stops every run.
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

if [ -e "$INTERNAL_TRIAGE/triage.off" ]; then
  echo "triage-morning: $INTERNAL_TRIAGE/triage.off exists; not running" >&2
  exit 0
fi

# No allowlist means no run: nobody is there to answer a permission prompt, and running
# without a tool gate is not an option.
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

echo "=== triage-morning $(date '+%Y-%m-%d %H:%M:%S') ==="

# launchd starts with a minimal PATH, and Claude Code is commonly installed to any of
# these. Resolve it rather than hardcoding, so a reinstall elsewhere does not break the
# schedule silently.
export PATH="$HOME/.claude/local:$HOME/.local/bin:$HOME/.bun/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

# type -P searches PATH only, ignoring the shell function that wraps claude in the user's
# interactive profile — launchd will not have it, but a manual test run would.
CLAUDE_BIN="${CLAUDE_BIN:-$(type -P claude 2>/dev/null)}"
if [ -z "$CLAUDE_BIN" ]; then
  echo "FATAL: 'claude' not found on PATH. Add its directory to the PATH line above,"
  echo "       or set it in the plist's EnvironmentVariables."
  exit 1
fi

# The interactive shell wrapper unsets this so Claude Code uses the OAuth login rather
# than API-key billing. Match that here, so a scheduled run bills the same way.
unset ANTHROPIC_API_KEY

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
