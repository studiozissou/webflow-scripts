#!/bin/bash
# Export the Google Business Profile credentials from the Keychain, then run the given command.
#
# Reads the same items as ~/bin/mcp-gbp: service mcp, accounts gbp-client-id, gbp-client-secret
# and gbp-refresh-token, into GBP_CLIENT_ID, GBP_CLIENT_SECRET and GBP_REFRESH_TOKEN. Never prints
# a value. A read that fails (a locked keychain under launchd, or a missing item) exits 1 before the
# command runs, so no pack is written. With GBP_CARE_FIXTURE set it skips the Keychain entirely.
#
# Used by package.json:
#   npm run gbp:care -- --client <slug> --dry-run
#   npm run gbp:approve -- <slug> 1 3

set -uo pipefail

if [ $# -eq 0 ]; then
  echo "usage: bash scripts/gbp-env.sh <command> [args...]" >&2
  exit 2
fi

read_item() {
  local var=$1 account=$2 value
  if ! value=$(/usr/bin/security find-generic-password -s mcp -a "$account" -w 2>/dev/null) || [ -z "$value" ]; then
    echo "Keychain item mcp/$account unreadable (locked keychain?); no pack written" >&2
    exit 1
  fi
  export "$var=$value"
}

if [ -z "${GBP_CARE_FIXTURE:-}" ]; then
  read_item GBP_CLIENT_ID gbp-client-id
  read_item GBP_CLIENT_SECRET gbp-client-secret
  read_item GBP_REFRESH_TOKEN gbp-refresh-token
fi

exec "$@"
