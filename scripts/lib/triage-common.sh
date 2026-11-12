#!/bin/bash
# Shared setup for the triage runners (triage-morning.sh, triage-approve.sh, triage-job.sh,
# triage-consolidate.sh, triage-chat.sh) and the learnings-pointer.sh SessionEnd hook: the allowlist loader,
# the launchd environment, the claude lookup, the Notion and Slack token exports, the triage.off kill
# switch and the learnings inbox append. Sourced, never run; each runner resolves it from its own
# directory. A helper that cannot continue sets TRIAGE_ERROR, prints it and exits 1.

# Print each non-blank, non-comment line of a list file, trimmed. Prints nothing when the
# file is missing, so callers fail closed on an empty result.
read_list() {
  local file=$1 line
  [ -f "$file" ] || return 0
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"
    [ -z "$line" ] || [ "${line:0:1}" = "#" ] || printf '%s\n' "$line"
  done < "$file"
}

# Load the list file $2 into the array named $1. No list means no run: nobody is there to
# answer a permission prompt, and running without a tool gate is not an option.
load_allowlist() {
  local __var=$1 __file=$2 __line __n=0
  [[ "$__var" =~ ^[A-Z_][A-Z0-9_]*$ ]] || { echo "load_allowlist: bad variable name $__var" >&2; exit 1; }
  eval "$__var=()"
  while IFS= read -r __line; do
    eval "$__var+=(\"\$__line\")"
    __n=$((__n + 1))
  done < <(read_list "$__file")
  if [ "$__n" -eq 0 ]; then
    TRIAGE_ERROR="$__file is missing or lists no tools; refusing to run without a tool allowlist"
    echo "FATAL: $TRIAGE_ERROR" >&2
    exit 1
  fi
}

# launchd starts with a minimal PATH, and Claude Code is commonly installed to any of
# these. Resolve it rather than hardcoding, so a reinstall elsewhere does not break the
# schedule silently.
#
# The interactive shell wrapper unsets ANTHROPIC_API_KEY so Claude Code uses the OAuth
# login rather than API-key billing. Match that here, so a scheduled run bills the same way.
triage_env() {
  export PATH="$HOME/.claude/local:$HOME/.local/bin:$HOME/.bun/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
  unset ANTHROPIC_API_KEY
}

# Set CLAUDE_BIN, keeping one already set. type -P searches PATH only, ignoring the shell
# function that wraps claude in the user's interactive profile: launchd will not have it,
# but a manual test run would.
triage_claude_bin() {
  CLAUDE_BIN="${CLAUDE_BIN:-$(type -P claude 2>/dev/null || true)}"
  if [ -z "$CLAUDE_BIN" ]; then
    TRIAGE_ERROR="claude not found on PATH; add its directory to triage_env in scripts/lib/triage-common.sh, or set CLAUDE_BIN in the plist's EnvironmentVariables"
    echo "FATAL: $TRIAGE_ERROR" >&2
    exit 1
  fi
}

# Export NOTION_TOKEN from the Keychain item mcp/notion-triage for tools/notion/cli.js,
# keeping one already set. Never printed. Build jobs never call this.
triage_notion_token() {
  [ -z "${NOTION_TOKEN:-}" ] || return 0
  local token
  if token=$(security find-generic-password -s mcp -a notion-triage -w 2>/dev/null) && [ -n "$token" ]; then
    export NOTION_TOKEN="$token"
  else
    echo "WARNING: Keychain item mcp/notion-triage not found; Notion task reads and writes will fail" >&2
  fi
}

# Export SLACK_BOT_TOKEN from the Keychain item mcp/slack-bot for tools/slack/cli.js and, with
# the argument app, SLACK_APP_TOKEN from mcp/slack-app for the chat daemon's socket, keeping
# values already set. Never printed. Returns 1 after a warning when one is missing; the caller
# decides whether that is fatal. Build jobs never call this.
triage_slack_token() {
  local kind var token rc=0
  for kind in bot "$@"; do
    case "$kind" in
      bot) var=SLACK_BOT_TOKEN ;;
      app) var=SLACK_APP_TOKEN ;;
      *) echo "triage_slack_token: unknown token $kind" >&2; return 1 ;;
    esac
    [ -z "${!var:-}" ] || continue
    if token=$(security find-generic-password -s mcp -a "slack-$kind" -w 2>/dev/null) && [ -n "$token" ]; then
      export "$var=$token"
    else
      echo "WARNING: Keychain item mcp/slack-$kind not found; Slack calls that need $var will fail" >&2
      rc=1
    fi
  done
  return $rc
}

# Set TRIAGE_REAL_DIR to $INTERNAL_TRIAGE with symlinks resolved. .claude/triage is a symlink
# into the private repo, outside the working directory, so a headless run refuses every write
# there unless the runner passes this folder with --add-dir. The Edit rules in the allowlist
# still limit writes to state.json, tmp/ and reports/.
triage_real_dir() {
  TRIAGE_REAL_DIR=$(cd "$INTERNAL_TRIAGE" 2>/dev/null && pwd -P) || {
    TRIAGE_ERROR="cannot resolve $INTERNAL_TRIAGE"
    echo "FATAL: $TRIAGE_ERROR" >&2
    exit 1
  }
}

# True when the kill switch $INTERNAL_TRIAGE/triage.off exists.
triage_off() {
  [ -e "$INTERNAL_TRIAGE/triage.off" ]
}

# Append one JSON line $3 to $1/inbox.jsonl, unless the kill switch file $2 exists, the line is
# empty or not one line, or the triage dir that holds $1 is missing (no private repo on this
# machine: create nothing). Never fails the caller: a session end or a job must not break on it.
# One printf >> per line, which is atomic for lines this small.
triage_learnings_pointer() {
  local dir=$1 off=$2 line=$3
  [ -n "$line" ] && [[ "$line" != *$'\n'* ]] || return 0
  [ ! -e "$off" ] && [ -d "$(dirname "$dir")" ] || return 0
  mkdir -p "$dir" 2>/dev/null && printf '%s\n' "$line" >> "$dir/inbox.jsonl" 2>/dev/null
  return 0
}
