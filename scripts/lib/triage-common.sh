#!/bin/bash
# Shared setup for the triage runners (triage-morning.sh, triage-approve.sh, triage-job.sh):
# the allowlist reader, the launchd environment and the triage.off kill switch. Sourced,
# never run; each runner resolves it from its own directory.

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

# True when the kill switch $INTERNAL_TRIAGE/triage.off exists.
triage_off() {
  [ -e "$INTERNAL_TRIAGE/triage.off" ]
}
