#!/bin/bash
# Run the Den Haag outreach pipeline once a week: discover lookalikes, scan, score GBPs, triage and draft emails into the Notion Prospects DB; it sends no email.
#
# Private data lives in $OUTREACH_DIR (default ~/webflow-internal/outreach). Touch
# $OUTREACH_DIR/outreach.off to stop every run. One run at a time via $OUTREACH_DIR/weekly.lock.
#
# Scheduled by scripts/outreach-weekly.plist (Monday 07:00). Run by hand to test:
#   bash scripts/outreach-weekly.sh
#   OUTREACH_ARGS="--dry-run --limit 3" bash scripts/outreach-weekly.sh

set -uo pipefail

REPO="${OUTREACH_REPO:-$HOME/webflow-scripts}"
OUTREACH_DIR="${OUTREACH_DIR:-$HOME/webflow-internal/outreach}"
ARGS="${OUTREACH_ARGS:---discover --budget 3}"

if [ -e "$OUTREACH_DIR/outreach.off" ]; then
  echo "outreach-weekly: $OUTREACH_DIR/outreach.off exists; not running" >&2
  exit 0
fi

LOCK="$OUTREACH_DIR/weekly.lock"
mkdir -p "$OUTREACH_DIR"
if ! mkdir "$LOCK" 2>/dev/null; then
  holder=$(cat "$LOCK/pid" 2>/dev/null)
  if [ -n "$holder" ] && kill -0 "$holder" 2>/dev/null; then
    echo "outreach-weekly: already running (pid $holder); not running" >&2
    exit 0
  fi
  rm -rf "$LOCK"
  mkdir "$LOCK" || { echo "FATAL: cannot take $LOCK" >&2; exit 1; }
fi
echo $$ > "$LOCK/pid"
trap 'rm -rf "$LOCK"' EXIT

cd "$REPO" || { echo "FATAL: cannot cd to $REPO" >&2; exit 1; }

if [ -z "${NOTION_TOKEN:-}" ]; then
  if token=$(security find-generic-password -s mcp -a notion-triage -w 2>/dev/null) && [ -n "$token" ]; then
    export NOTION_TOKEN="$token"
  else
    echo "WARNING: Keychain item mcp/notion-triage not found; Notion writes will fail" >&2
  fi
fi

if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  if key=$(security find-generic-password -s mcp -a anthropic-api-key -w 2>/dev/null) && [ -n "$key" ]; then
    export ANTHROPIC_API_KEY="$key"
  fi
fi

echo "=== outreach-weekly $(date '+%Y-%m-%d %H:%M:%S') ==="
MAX_SECONDS="${OUTREACH_MAX_SECONDS:-2700}"
# shellcheck disable=SC2086
perl -e 'alarm shift; exec @ARGV' "$MAX_SECONDS" node tools/outreach/cli.js run --data "$OUTREACH_DIR/den-haag" --prompt "$OUTREACH_DIR/prompt.md" $ARGS
status=$?
echo "outreach-weekly exited $status"
exit $status
