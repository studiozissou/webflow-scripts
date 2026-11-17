#!/bin/bash
# Draft each goal client's monthly report headlessly through /site-audit --report-only --unattended, queue a review task per draft, and send nothing to a client.

set -uo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)
REPO="${SITE_REPORT_REPO:-$(cd "$SCRIPT_DIR/.." && pwd -P)}"
DIR="${SITE_REPORT_DIR:-$HOME/webflow-internal/site-report}"
PROJECTS="${SITE_REPORT_PROJECTS:-$REPO/projects}"
ALLOWLIST="${SITE_REPORT_ALLOWLIST:-$DIR/allowed-tools.txt}"
NOTION_CLI="${SITE_REPORT_NOTION_CLI:-$REPO/tools/notion/cli.js}"
MAX_SECONDS="${SITE_REPORT_MAX_SECONDS:-1800}"
MONTH="${SITE_REPORT_MONTH:-}"

if [ -z "$MONTH" ]; then
  MONTH=$(date -v1d -v-1m '+%Y-%m' 2>/dev/null || date -d "$(date '+%Y-%m-01') -1 month" '+%Y-%m')
fi
if ! [[ "$MONTH" =~ ^[0-9]{4}-(0[1-9]|1[0-2])$ ]]; then
  echo "FATAL: report month '$MONTH' is not YYYY-MM" >&2
  exit 1
fi

join_names() {
  local out="" name
  for name in "$@"; do out="${out:+$out, }$name"; done
  printf '%s' "$out"
}

RUN=()
SKIPPED=()
for goals in "$PROJECTS"/*/.claude/reports/goals.json; do
  [ -e "$goals" ] || continue
  reports=$(dirname "$goals")
  client=$(basename "$(dirname "$(dirname "$reports")")")
  if [ -e "$reports/site-report.off" ]; then
    SKIPPED+=("skipped: $client (off)")
  elif [ -e "$reports/report-$MONTH.done" ]; then
    SKIPPED+=("skipped: $client (done)")
  else
    RUN+=("$client")
  fi
done

if [ "${SITE_REPORT_DRY_RUN:-}" = "1" ]; then
  echo "would run: $(join_names ${RUN[@]+"${RUN[@]}"})"
  for line in ${SKIPPED[@]+"${SKIPPED[@]}"}; do echo "$line"; done
  [ ! -e "$DIR/site-report.off" ] || echo "global off switch $DIR/site-report.off exists: a real run does nothing"
  exit 0
fi

if [ -e "$DIR/site-report.off" ]; then
  echo "site-report-monthly: $DIR/site-report.off exists; not running" >&2
  exit 0
fi

source "$SCRIPT_DIR/lib/triage-common.sh" || { echo "FATAL: cannot load $SCRIPT_DIR/lib/triage-common.sh" >&2; exit 1; }

LOCK="$DIR/monthly.lock"
mkdir -p "$DIR"
if ! mkdir "$LOCK" 2>/dev/null; then
  holder=$(cat "$LOCK/pid" 2>/dev/null)
  if [ -n "$holder" ] && kill -0 "$holder" 2>/dev/null; then
    echo "site-report-monthly: already running (pid $holder); not running" >&2
    exit 0
  fi
  rm -rf "$LOCK"
  mkdir "$LOCK" || { echo "FATAL: cannot take $LOCK" >&2; exit 1; }
fi
echo $$ > "$LOCK/pid"
trap 'rm -rf "$LOCK"' EXIT

load_allowlist ALLOWED "$ALLOWLIST"
triage_env
triage_claude_bin
triage_notion_token

mkdir -p "$DIR/logs"
LOG="$DIR/logs/$MONTH.log"
log() { printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" | tee -a "$LOG"; }

cd "$REPO" || { echo "FATAL: cannot cd to $REPO" >&2; exit 1; }

log "=== site-report-monthly for $MONTH ==="
for line in ${SKIPPED[@]+"${SKIPPED[@]}"}; do log "$line"; done
if [ ${#RUN[@]} -eq 0 ]; then
  log "nothing to run"
  exit 0
fi

FAILED=0
for client in "${RUN[@]}"; do
  reports="$PROJECTS/$client/.claude/reports"
  ADD=()
  for place in "$PROJECTS/$client/.claude" "$PROJECTS/$client/comms"; do
    real=$(cd "$place" 2>/dev/null && pwd -P) && ADD+=(--add-dir "$real")
  done
  log "running: $client"
  perl -e 'alarm shift; exec @ARGV' "$MAX_SECONDS" "$CLAUDE_BIN" -p "/site-audit $client --report-only --unattended" \
    ${ADD[@]+"${ADD[@]}"} \
    --allowedTools "${ALLOWED[@]}" \
    >> "$LOG" 2>&1 < /dev/null
  status=$?
  if [ "$status" -eq 142 ]; then
    log "failed: $client (timed out after ${MAX_SECONDS}s)"
    FAILED=$((FAILED + 1))
  elif [ "$status" -ne 0 ]; then
    log "failed: $client (claude exited $status)"
    FAILED=$((FAILED + 1))
  elif [ ! -e "$reports/report-$MONTH.done" ]; then
    log "failed: $client (claude exited 0 but wrote no report-$MONTH.done, so nothing was pushed)"
    FAILED=$((FAILED + 1))
  else
    log "ok: $client"
    if node "$NOTION_CLI" create-task --title "Review $client report" >> "$LOG" 2>&1; then
      log "task: review task created for $client"
    else
      log "warning: draft pushed for $client but the review task failed; create it by hand"
    fi
  fi
done

log "finished: ${#RUN[@]} tried, $FAILED failed"
[ "$FAILED" -eq 0 ]
