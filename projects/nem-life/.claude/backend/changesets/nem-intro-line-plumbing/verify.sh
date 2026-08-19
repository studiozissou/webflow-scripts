#!/usr/bin/env bash
#
# Verifies the nem-intro-line-plumbing changeset has been applied to the live n8n
# workflows. Exits 0 when live matches the committed snapshots (which already carry the
# introLine plumbing) and every invariant holds — including the three added by this
# changeset:
#
#   - Normalize keeps introLine
#   - Store Profile persists introLine
#   - Build HTML renders the intro line above the greeting, escaped
#
# Exits 1 on any drift or failed invariant. Requires N8N_API_KEY (the drift checker
# reads it; see tools/nem/check-workflow-drift.js).
#
# NOTE: the Data Table column itself (nem_test_profiles.introLine) is not visible to the
# workflows API, so this script cannot assert it exists. If Store Profile maps the column
# but the table lacks it, the first live /submit execution errors on Store Profile —
# check one execution after applying.

set -euo pipefail

# Repo root is six levels up from this changeset directory.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../../.." && pwd)"

cd "$ROOT"
echo "--> npm run check:nem-drift (live vs committed snapshots + invariants)"
npm run check:nem-drift

echo
echo "Live matches the committed snapshots — the intro-line plumbing is applied."
echo "With the intro-line tables still empty, a live /verify report should show"
echo "NO intro paragraph and no gap. That is a pass, not a skip."
