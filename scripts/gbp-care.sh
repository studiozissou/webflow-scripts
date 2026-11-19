#!/bin/bash
# Run the weekly Google Business Profile care runner for every configured client and leave a pack per client.
#
# It only reads Google: tools/gbp/care/run.js wraps every request in a read-only guard and has no
# import route to the apply code. It drafts reply and post text with `claude -p` and no tools, writes
# projects/<slug>/.claude/care/gbp-<date>.{md,json} and posts one counts-only message to the digest
# Slack channel through tools/slack/cli.js. Nothing is applied; that is `npm run gbp:approve`, by hand.
#
# Touching .claude/care/gbp.off stops every run; projects/<slug>/.claude/care/gbp.off pauses one client.
#
# Only one run at a time: it holds .claude/care/run.lock (with its pid) and exits 0 while a live run
# holds it. Credentials come from the Keychain through scripts/gbp-env.sh; a locked keychain exits 1
# with no pack.
#
# Scheduled by scripts/gbp-care.plist (Monday 07:30). Run by hand to test:
#   bash scripts/gbp-care.sh

set -uo pipefail

REPO="${GBP_CARE_REPO:-$HOME/webflow-scripts}"
CARE_DIR="$REPO/.claude/care"

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)
# shellcheck source=lib/triage-common.sh
source "$SCRIPT_DIR/lib/triage-common.sh" || { echo "FATAL: cannot load $SCRIPT_DIR/lib/triage-common.sh" >&2; exit 1; }

if [ -e "$CARE_DIR/gbp.off" ]; then
  echo "gbp-care: $CARE_DIR/gbp.off exists; not running" >&2
  exit 0
fi

LOCK="$CARE_DIR/run.lock"
mkdir -p "$CARE_DIR"
if ! mkdir "$LOCK" 2>/dev/null; then
  holder=$(cat "$LOCK/pid" 2>/dev/null)
  if [ -n "$holder" ] && kill -0 "$holder" 2>/dev/null; then
    echo "gbp-care: already running (pid $holder); not running" >&2
    exit 0
  fi
  rm -rf "$LOCK"
  mkdir "$LOCK" || { echo "FATAL: cannot take $LOCK" >&2; exit 1; }
fi
echo $$ > "$LOCK/pid"
trap 'rm -rf "$LOCK"' EXIT

cd "$REPO" || { echo "FATAL: cannot cd to $REPO"; exit 1; }

echo "=== gbp-care $(date '+%Y-%m-%d %H:%M:%S') ==="

triage_env
triage_claude_bin
export CLAUDE_BIN
# tools/slack/cli.js posts the counts message as the bot with this token.
triage_slack_token || true

GBP_CARE_REPO="$REPO" bash scripts/gbp-env.sh node tools/gbp/care/run.js --all
status=$?

echo "gbp-care exited $status"
exit $status
