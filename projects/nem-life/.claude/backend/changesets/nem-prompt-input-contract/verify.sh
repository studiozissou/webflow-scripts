#!/usr/bin/env bash
#
# Verifies the nem-prompt-input-contract changeset has been applied to the live n8n
# workflows. Exits 0 when live matches the committed snapshots (which already carry the
# §7 contract) and every invariant holds — including the eight added by this changeset:
#
#   - Normalize keeps conclusionText
#   - Store Profile persists conclusionText
#   - Generate Report sends the intro line
#   - Generate Report sends the conclusion text
#   - Generate Report does not send the total score
#   - Generate Report spells gender the prompt's way: Female / Male
#   - Build HTML does not greet
#   - Unsupported locales are logged and alerted, never sent to Anthropic
#
# Exits 1 on any drift or failed invariant. Requires N8N_API_KEY (the drift checker
# reads it; see tools/nem/check-workflow-drift.js).
#
# NOTE: the Data Table column itself (nem_test_profiles.conclusionText) is not visible to
# the workflows API, so this script cannot assert it exists. If Store Profile maps the
# column but the table lacks it, the first live /submit execution errors on Store Profile —
# check one execution after applying.

set -euo pipefail

# Repo root is six levels up from this changeset directory.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../../.." && pwd)"

cd "$ROOT"
echo "--> npm run check:nem-drift (live vs committed snapshots + invariants)"
npm run check:nem-drift

echo
echo "Live matches the committed snapshots — the §7 prompt input contract is applied."
echo "Now prove the gate with one locale:en token and one vrouw token (README step 10)."
