#!/usr/bin/env bash
#
# Verifies the nem-rate-limit-completions changeset has been applied to the live n8n
# /submit workflow. Exits 0 when live matches the committed snapshot and every invariant
# holds — including the one this changeset added:
#
#   - Rate limit ignores completion pings — they are logging, not submissions
#
# Exits 1 on any drift or failed invariant. Requires N8N_API_KEY.

set -euo pipefail

# Repo root is six levels up from this changeset directory.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../../.." && pwd)"

cd "$ROOT"
echo "--> npm run check:nem-drift (live vs committed snapshots + invariants)"
npm run check:nem-drift

echo
echo "Live matches the committed snapshot — completion pings no longer spend a rate-limit slot."
