#!/bin/bash
# Build one approved Claude task with /plan --auto then /build --auto on its own job/<slug> branch and worktree, run its tests, and write result.json; it never pushes, deploys or publishes.
#
# Started detached by tools/triage/lib/jobs.js:
#   scripts/triage-job.sh <slug> <pageId> <threadTs> <jobDir>
# <jobDir> holds meta.json {pageId, slug, threadTs, label, task, brief, startedAt, pid}.
# Every exit writes <jobDir>/result.json {status, branch, tests: {passed, total}, summary,
# specPath, browserChecks}. browserChecks is always "not run": an unattended job does not
# run the /build browser verify loop, so that check is left to whoever reviews the branch.
# It exports TRIAGE_BUILD_JOB=1, so tools/notion/cli.js and `jobs start` refuse inside the
# job (defence in depth, not a boundary; see ADR-002). The exit code is 0 only when status
# is "passed". Output goes to
# <jobDir>/job.log. Tools are limited to .claude/triage/job-allowed-tools.txt and
# .claude/triage/job-disallowed-tools.txt (private); the run refuses without both, or
# when the disallowed list does not block git push. .claude/triage/triage.off stops it.

set -euo pipefail

# Set before anything else runs, so every child of the job sees it.
export TRIAGE_BUILD_JOB=1

SLUG="${1:-}"
PAGE_ID="${2:-}"
THREAD_TS="${3:-}"
JOB_DIR="${4:-}"

if [ $# -ne 4 ] || [ -z "$JOB_DIR" ] || [ ! -d "$JOB_DIR" ]; then
  echo "usage: $0 <slug> <pageId> <threadTs> <jobDir>  (jobDir must exist)" >&2
  exit 2
fi
JOB_DIR=$(cd "$JOB_DIR" && pwd)

STATUS=failed
BRANCH=""
TESTS_PASSED=0
TESTS_TOTAL=0
SUMMARY=""
SPEC_PATH=""
STAGE=setup

write_result() {
  local tmp="$JOB_DIR/result.json.tmp"
  if command -v node >/dev/null 2>&1 && \
    R_FILE="$tmp" R_STATUS="$STATUS" R_BRANCH="$BRANCH" R_PASSED="$TESTS_PASSED" R_TOTAL="$TESTS_TOTAL" \
    R_SUMMARY="$SUMMARY" R_SPEC="$SPEC_PATH" node -e '
      const e = process.env;
      const out = {
        status: e.R_STATUS,
        branch: e.R_BRANCH || null,
        tests: { passed: Number(e.R_PASSED) || 0, total: Number(e.R_TOTAL) || 0 },
        summary: e.R_SUMMARY,
        specPath: e.R_SPEC || null,
        browserChecks: "not run"
      };
      require("fs").writeFileSync(e.R_FILE, JSON.stringify(out, null, 2) + "\n");
    '; then
    :
  else
    printf '{"status":"failed","branch":null,"tests":{"passed":0,"total":0},"summary":"node unavailable; see job.log","specPath":null,"browserChecks":"not run"}\n' > "$tmp"
    STATUS=failed
  fi
  mv -f "$tmp" "$JOB_DIR/result.json"
}

finish() {
  local rc=$?
  set +e
  if [ "$rc" -ne 0 ] || [ "$STATUS" != passed ]; then
    STATUS=failed
    [ -n "$SUMMARY" ] || SUMMARY="${TRIAGE_ERROR:-Failed during $STAGE (exit $rc); see job.log}"
  fi
  write_result
  echo "=== triage-job $SLUG $STATUS $(date '+%Y-%m-%d %H:%M:%S'): $SUMMARY ==="
  [ "$STATUS" = passed ] && exit 0
  exit 1
}

fail() {
  SUMMARY="$1"
  echo "triage-job: $1" >&2
  exit 1
}

trap finish EXIT
trap 'exit 143' TERM INT HUP

exec >>"$JOB_DIR/job.log" 2>&1
echo "=== triage-job $(date '+%Y-%m-%d %H:%M:%S') slug=$SLUG page=$PAGE_ID ==="

[[ "$SLUG" =~ ^[a-z0-9][a-z0-9-]{0,79}$ ]] || fail "invalid slug; expected ^[a-z0-9-]+\$"
[[ "$PAGE_ID" =~ ^[A-Za-z0-9-]{1,64}$ ]] || fail "invalid pageId"
[[ "$THREAD_TS" =~ ^[0-9]+\.[0-9]+$ ]] || fail "invalid threadTs"

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)
# shellcheck source=lib/triage-common.sh
source "$SCRIPT_DIR/lib/triage-common.sh" || fail "cannot load $SCRIPT_DIR/lib/triage-common.sh"
triage_env
if [ -z "${REPO_ROOT:-}" ]; then
  common=$(git -C "$SCRIPT_DIR" rev-parse --path-format=absolute --git-common-dir) || fail "scripts/ is not inside a git checkout"
  REPO_ROOT=$(dirname "$common")
fi
INTERNAL_TRIAGE="${INTERNAL_TRIAGE:-$REPO_ROOT/.claude/triage}"

if triage_off; then fail "$INTERNAL_TRIAGE/triage.off exists; job not started"; fi

# Re-checked before each stage, so touching triage.off stops a running job at the next step.
stop_if_off() {
  if triage_off; then fail "triage.off appeared before $1; job stopped"; fi
}

load_allowlist ALLOWED "$INTERNAL_TRIAGE/job-allowed-tools.txt"
load_allowlist DISALLOWED "$INTERNAL_TRIAGE/job-disallowed-tools.txt"
printf '%s\n' "${DISALLOWED[@]}" | grep -q '^Bash(git push' || fail "job-disallowed-tools.txt does not block Bash(git push*); refusing to run"

STAGE=meta
META="$JOB_DIR/meta.json"
[ -f "$META" ] || fail "meta.json missing in $JOB_DIR"
command -v node >/dev/null 2>&1 || fail "node not found on PATH"

meta_field() {
  M_FILE="$META" M_KEY="$1" node -e '
    const m = JSON.parse(require("fs").readFileSync(process.env.M_FILE, "utf8"));
    const v = m[process.env.M_KEY];
    process.stdout.write(v == null ? "" : String(v).replace(/[\r\n]+/g, " ").trim());
  '
}

[ "$(meta_field slug)" = "$SLUG" ] && [ "$(meta_field pageId)" = "$PAGE_ID" ] || fail "meta.json slug or pageId does not match the job arguments"
TASK=$(meta_field task)
BRIEF=$(meta_field brief)
[ -n "$TASK" ] || fail "meta.json has no task"

triage_claude_bin

STAGE=worktree
cd "$REPO_ROOT"
WT="$REPO_ROOT/.claude/worktrees/job-$SLUG"
[ ! -e "$WT" ] || fail "worktree $WT already exists"
fetched=0
for attempt in 1 2 3; do
  if git fetch origin main; then fetched=1; break; fi
  sleep $((attempt * 5))
done
[ "$fetched" = 1 ] || fail "git fetch origin main failed"
git worktree add --no-track "$WT" -b "job/$SLUG" origin/main || fail "git worktree add failed (does branch job/$SLUG already exist?)"
BRANCH="job/$SLUG"

if [ ! -e "$WT/.claude/triage" ] && [ -x "$WT/scripts/link-internal.sh" ]; then
  (cd "$WT" && scripts/link-internal.sh) || echo "triage-job: link-internal.sh reported a problem; continuing"
fi
if [ -d "$REPO_ROOT/node_modules" ] && [ ! -e "$WT/node_modules" ]; then
  ln -s "$REPO_ROOT/node_modules" "$WT/node_modules"
fi

cd "$WT"
export CLAUDE_JOB_DIR="$JOB_DIR"

PLAN_PROMPT="/plan --auto $TASK${BRIEF:+ — $BRIEF} (write the spec as .claude/specs/$SLUG.md; spec slug: $SLUG)"

STAGE=plan
stop_if_off /plan
"$CLAUDE_BIN" -p "$PLAN_PROMPT" --allowedTools "${ALLOWED[@]}" --disallowedTools "${DISALLOWED[@]}" || fail "/plan --auto exited non-zero"
[ -f "$WT/.claude/specs/$SLUG.md" ] || fail "/plan wrote no spec at .claude/specs/$SLUG.md"
SPEC_PATH=".claude/specs/$SLUG.md"

STAGE=build
stop_if_off /build
"$CLAUDE_BIN" -p "/build --auto $SLUG" --allowedTools "${ALLOWED[@]}" --disallowedTools "${DISALLOWED[@]}" || fail "/build --auto exited non-zero"
commits=$(git rev-list --count "origin/main..HEAD")
[ "$commits" -gt 0 ] || fail "/build left no commits on $BRANCH"

STAGE=test
CLIENT=$(awk 'NR==1 && $0!="---" {exit} NR>1 && $0=="---" {exit} /^client:/ {sub(/^client:[[:space:]]*/, ""); gsub(/["'\''[:space:]]/, ""); print; exit}' "$SPEC_PATH")
TEST_SCRIPT=lint
if [[ "$CLIENT" =~ ^[a-z0-9-]+$ ]] && PKG="$WT/package.json" S="test:$CLIENT" node -e 'process.exit(require(process.env.PKG).scripts?.[process.env.S] ? 0 : 1)'; then
  TEST_SCRIPT="test:$CLIENT"
fi

TEST_OUT="$JOB_DIR/test-output.txt"
stop_if_off tests
set +e
npm run --silent "$TEST_SCRIPT" 2>&1 | tee "$TEST_OUT"
test_rc=${PIPESTATUS[0]}
set -e
read -r TESTS_PASSED TESTS_TOTAL < <(awk '/^(# |ℹ )pass [0-9]+$/ {p += $NF} /^(# |ℹ )tests [0-9]+$/ {t += $NF} END {print p + 0, t + 0}' "$TEST_OUT")

if [ "$test_rc" -ne 0 ]; then
  fail "npm run $TEST_SCRIPT failed on $BRANCH: $TESTS_PASSED/$TESTS_TOTAL tests passed"
fi

STATUS=passed
if [ "$TESTS_TOTAL" -gt 0 ]; then
  SUMMARY="Built $BRANCH ($commits commit(s)); npm run $TEST_SCRIPT: $TESTS_PASSED/$TESTS_TOTAL tests passed. Not pushed."
else
  SUMMARY="Built $BRANCH ($commits commit(s)); npm run $TEST_SCRIPT passed (no test counts reported). Not pushed."
fi
