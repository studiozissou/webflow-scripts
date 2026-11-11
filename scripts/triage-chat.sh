#!/bin/bash
# Start the triage chat daemon (tools/triage/chat-daemon.js): a Slack Socket Mode connection that
# answers the owner's messages in the digest channel as the Daybook bot.
#
# What it may send: replies in the digest channel only, posted by the daemon itself with the bot
# token, plus the 👀 and ⏸ reactions. A grammar reply in the digest thread (go, skip, ok changes,
# link, keep, drop) runs scripts/triage-approve.sh, which keeps its own allowlist and lock. Every
# other message runs claude -p in chat mode with .claude/triage/chat-allowed-tools.txt (private):
# no Slack send, no email send, no git push, no Keychain. The message goes on stdin, never argv.
# Touching .claude/triage/triage.off pauses every run; the daemon stays up and reacts ⏸.
#
# Both tokens come from the Keychain only (mcp/slack-bot, mcp/slack-app). A missing token, a
# missing chat allowlist or an unresolvable folder exits 1 with a FATAL line, and the plist's
# ThrottleInterval keeps launchd from spinning on it.
#
# Kept alive by scripts/triage-chat.plist. Run by hand to test:
#   bash scripts/triage-chat.sh

set -uo pipefail

REPO="${TRIAGE_REPO:-$HOME/webflow-scripts}"
INTERNAL_TRIAGE="${INTERNAL_TRIAGE:-$REPO/.claude/triage}"

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)
# shellcheck source=lib/triage-common.sh
source "$SCRIPT_DIR/lib/triage-common.sh" || { echo "FATAL: cannot load $SCRIPT_DIR/lib/triage-common.sh" >&2; exit 1; }

cd "$REPO" || { echo "FATAL: cannot cd to $REPO" >&2; exit 1; }

echo "=== triage-chat $(date '+%Y-%m-%d %H:%M:%S') ==="

triage_env
triage_claude_bin
# The chat runs read and write Notion through tools/notion/cli.js with this token.
triage_notion_token
if ! triage_slack_token app; then
  echo "FATAL: the chat daemon needs both Keychain items mcp/slack-bot and mcp/slack-app; see .claude/specs/triage-chat.md (Slack app)" >&2
  exit 1
fi
load_allowlist CHAT_ALLOWED "$INTERNAL_TRIAGE/chat-allowed-tools.txt"
triage_real_dir

# Chat runs may write specs and plans, which are symlinks into the private repo like triage/.
real_dir() {
  (cd "$1" 2>/dev/null && pwd -P) || { echo "FATAL: cannot resolve $1" >&2; exit 1; }
}
SPECS_REAL_DIR=$(real_dir "$REPO/.claude/specs") || exit 1
PLANS_REAL_DIR=$(real_dir "$REPO/.claude/plans") || exit 1

export CLAUDE_BIN TRIAGE_REAL_DIR SPECS_REAL_DIR PLANS_REAL_DIR INTERNAL_TRIAGE
export TRIAGE_REPO="$REPO"

exec node tools/triage/chat-daemon.js
