#!/usr/bin/env bash
#
# Verifies the nem-report-webflow-template changeset has been applied to the live n8n
# /verify workflow. Exits 0 when live matches the committed snapshot (which already carries
# the template-filling Build HTML) and every invariant holds — including the two this
# changeset added:
#
#   - Build HTML fills the published Webflow template, fetched from TEMPLATE_URL
#   - Build HTML fills the intro-line slot escaped, and removes the block when empty
#
# Exits 1 on any drift or failed invariant. Requires N8N_API_KEY (the drift checker
# reads it; see tools/nem/check-workflow-drift.js).
#
# NOTE: the published template itself is not visible to the workflows API. After applying,
# trigger one live /verify and open the PDF — no "Lorem ipsum" may appear, and the olive
# header must carry the logo.

set -euo pipefail

# Repo root is six levels up from this changeset directory.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../../.." && pwd)"

cd "$ROOT"
echo "--> npm run check:nem-drift (live vs committed snapshots + invariants)"
npm run check:nem-drift

echo
echo "Live matches the committed snapshot — Build HTML fills the Webflow template."
