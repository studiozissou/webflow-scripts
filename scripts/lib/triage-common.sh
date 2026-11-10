#!/bin/bash
# Shared setup for the triage runners (triage-morning.sh, triage-approve.sh, triage-job.sh):
# the allowlist loader, the launchd environment, the claude lookup, the Notion token export
# and the triage.off kill switch. Sourced, never run; each runner resolves it from its own
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

# True when the kill switch $INTERNAL_TRIAGE/triage.off exists.
triage_off() {
  [ -e "$INTERNAL_TRIAGE/triage.off" ]
}
