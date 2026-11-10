#!/bin/bash
# Global SessionEnd hook: append one pointer line {sessionId, transcriptPath, cwd, endedAt, reason} to the private learnings inbox for the 18:00 consolidate run; no model, no network, always exit 0, never prints.
#
# Installed by symlink as ~/.claude/hooks/learnings-pointer.sh and registered as a SessionEnd
# command hook in ~/.claude/settings.json. It writes to the real private folder
# $HOME/webflow-internal/.claude/triage/learnings (never the webflow-scripts symlink), and
# does nothing when $HOME/webflow-internal/.claude/triage/triage.off exists or that triage
# folder is missing. Builds the line with /usr/bin/jq, else node, else skips.
# Tests override paths with TRIAGE_TEST_LEARNINGS_DIR, TRIAGE_TEST_KILL_SWITCH and TRIAGE_TEST_JQ.

exec >/dev/null 2>&1
trap 'exit 0' EXIT

TRIAGE="$HOME/webflow-internal/.claude/triage"
LEARNINGS_DIR="${TRIAGE_TEST_LEARNINGS_DIR:-$TRIAGE/learnings}"
KILL_SWITCH="${TRIAGE_TEST_KILL_SWITCH:-$TRIAGE/triage.off}"
JQ="${TRIAGE_TEST_JQ:-/usr/bin/jq}"

# Cheap exits first, before reading stdin or starting jq.
[ ! -e "$KILL_SWITCH" ] && [ -d "$(dirname "$LEARNINGS_DIR")" ] || exit 0

# Resolve this script through its ~/.claude/hooks symlink to find triage-common.sh.
src=${BASH_SOURCE[0]}
while [ -L "$src" ]; do
  target=$(readlink "$src")
  case $target in /*) src=$target ;; *) src="$(dirname "$src")/$target" ;; esac
done
# shellcheck source=../lib/triage-common.sh
source "$(dirname "$src")/../lib/triage-common.sh" || exit 0

ENDED_AT=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
INPUT=$(head -c 65536)

if [ -x "$JQ" ]; then
  line=$(printf '%s' "$INPUT" | "$JQ" -c --arg endedAt "$ENDED_AT" '
    def s: if type == "string" then . else "" end;
    select(type == "object" and (.session_id | s) != "")
    | { sessionId: (.session_id | s), transcriptPath: (.transcript_path | s), cwd: (.cwd | s), endedAt: $endedAt, reason: (.reason | s) }')
elif command -v node >/dev/null; then
  line=$(printf '%s' "$INPUT" | ENDED_AT="$ENDED_AT" node -e '
    let raw = "";
    process.stdin.on("data", (c) => (raw += c)).on("end", () => {
      let h;
      try { h = JSON.parse(raw); } catch { return; }
      const s = (v) => (typeof v === "string" ? v : "");
      if (!h || typeof h !== "object" || Array.isArray(h) || !s(h.session_id)) return;
      process.stdout.write(JSON.stringify({ sessionId: s(h.session_id), transcriptPath: s(h.transcript_path), cwd: s(h.cwd), endedAt: process.env.ENDED_AT, reason: s(h.reason) }));
    });')
else
  exit 0
fi

triage_learnings_pointer "$LEARNINGS_DIR" "$KILL_SWITCH" "$line"
