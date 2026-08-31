#!/bin/bash
# Run /triage headlessly on weekday mornings and save the report for the user to read.
#
# The run is unattended, so nothing that needs approval happens: no Notion writes, no
# Slack or email sends. It produces the triage report, any Gmail drafts, and the
# newsletter cleanup — which is safe without approval because it only ever moves mail to
# Gmail's trash, recoverable for 30 days.
#
# Scheduled by scripts/triage-morning.plist. Run by hand to test:
#   bash scripts/triage-morning.sh
#   TRIAGE_ARGS="--no-delete" bash scripts/triage-morning.sh

set -uo pipefail

REPO="${TRIAGE_REPO:-$HOME/webflow-scripts}"
ARGS="${TRIAGE_ARGS:-}"
REPORT_DIR="$REPO/.claude/triage/reports"
STAMP=$(date '+%Y-%m-%d')
REPORT="$REPORT_DIR/$STAMP.md"

cd "$REPO" || { echo "FATAL: cannot cd to $REPO"; exit 1; }

echo "=== triage-morning $(date '+%Y-%m-%d %H:%M:%S') ==="

# launchd starts with a minimal PATH, and Claude Code is commonly installed to any of
# these. Resolve it rather than hardcoding, so a reinstall elsewhere does not break the
# schedule silently.
export PATH="$HOME/.claude/local:$HOME/.local/bin:$HOME/.bun/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

# type -P searches PATH only, ignoring the shell function that wraps claude in the user's
# interactive profile — launchd will not have it, but a manual test run would.
CLAUDE_BIN=$(type -P claude 2>/dev/null)
if [ -z "$CLAUDE_BIN" ]; then
  echo "FATAL: 'claude' not found on PATH. Add its directory to the PATH line above,"
  echo "       or set it in the plist's EnvironmentVariables."
  exit 1
fi

# The interactive shell wrapper unsets this so Claude Code uses the OAuth login rather
# than API-key billing. Match that here, so a scheduled run bills the same way.
unset ANTHROPIC_API_KEY

mkdir -p "$REPORT_DIR"

# --dangerously-skip-permissions is what makes an unattended run possible at all: there is
# nobody to answer a permission prompt at 08:30. The triage skill is what keeps that safe —
# it never sends or writes anything needing approval, and only ever trashes newsletters.
"$CLAUDE_BIN" -p "/triage $ARGS" \
  --dangerously-skip-permissions \
  > "$REPORT" 2>&1
status=$?

if [ $status -ne 0 ]; then
  echo "triage exited $status — see $REPORT"
  exit $status
fi

echo "report written to $REPORT ($(wc -l < "$REPORT" | tr -d ' ') lines)"
echo
