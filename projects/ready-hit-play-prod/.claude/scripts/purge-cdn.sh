#!/bin/bash
# Purge changed JS/CSS files from jsDelivr cache after push.
# Waits 30s for propagation before exiting.
# Usage: .claude/scripts/purge-cdn.sh

set -e

REMOTE_URL=$(git remote get-url origin 2>/dev/null)
if [ -z "$REMOTE_URL" ]; then
  echo "Error: not a git repo or no remote set."
  exit 1
fi

# Extract user/repo from GitHub URL
# Handles both SSH (git@github.com:user/repo.git) and HTTPS (https://github.com/user/repo.git)
REPO=$(echo "$REMOTE_URL" | sed -E 's#.*github\.com[:/]([^/]+/[^/.]+)(\.git)?$#\1#')
HASH=$(git rev-parse HEAD)

# Find JS and CSS files that changed in the last commit
CHANGED_FILES=$(git diff --name-only HEAD~1 -- '*.js' '*.css' 2>/dev/null)

if [ -z "$CHANGED_FILES" ]; then
  echo "No JS/CSS files changed in last commit. Nothing to purge."
  exit 0
fi

echo "Purging jsDelivr cache for $REPO @ ${HASH:0:7}..."
echo ""

for file in $CHANGED_FILES; do
  PURGE_URL="https://purge.jsdelivr.net/gh/$REPO@$HASH/$file"
  echo "  Purging: $file"
  RESPONSE=$(curl -s -w "%{http_code}" "$PURGE_URL")
  HTTP_CODE="${RESPONSE: -3}"
  if [ "$HTTP_CODE" != "200" ]; then
    echo "  Warning: purge returned HTTP $HTTP_CODE for $file"
  fi
done

echo ""
echo "Purge requests sent. Waiting 30s for edge propagation..."
sleep 30
echo "Ready to test against $REPO @ ${HASH:0:7}"
