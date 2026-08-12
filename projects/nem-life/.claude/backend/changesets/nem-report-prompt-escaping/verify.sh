#!/usr/bin/env bash
#
# Drives one submit -> verify round trip against the live NEM Test backend, so the
# `nem-report-prompt-escaping-and-token-limit` fix can be verified in an n8n execution.
#
#   ./verify.sh                      # NL profile, already-seen recipient
#   ./verify.sh --locale en          # EN profile
#   ./verify.sh --email a@b.com      # override recipient
#   ./verify.sh --submit-only        # stop after /submit, print the token
#
# The component generates the token client-side, so this script does too — which means
# it never needs to read the Data Table back to find it.
#
# READ BEFORE RUNNING
#
#   * Every run bills a PDFShift credit and Anthropic tokens against the CLIENT's keys.
#     `sandbox` was removed from PDFShift. Keep runs to a handful.
#   * /submit rate-limits to 3 per IP per hour. The 4th returns {"status":"rate_limited"}.
#   * MailerSend is on a trial account: `Send Report` will 422 for any recipient it has
#     not already delivered to. That is NOT a failure of the escaping fix — the report
#     branch is verified complete at `Encode PDF`. Default recipient below is one
#     MailerSend has already seen.

set -euo pipefail

SUBMIT_URL="${NEM_SUBMIT_WEBHOOK_URL:-https://reus.app.n8n.cloud/webhook/nem-submit}"
VERIFY_URL="${NEM_VERIFY_WEBHOOK_URL:-https://reus.app.n8n.cloud/webhook/nem-verify}"

LOCALE="nl"
# Deliberately an address MailerSend has already delivered to — see the trial-cap note.
EMAIL="will+nem-submit-test@teamzissou.io"
SUBMIT_ONLY=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --locale)      LOCALE="$2"; shift 2 ;;
    --email)       EMAIL="$2"; shift 2 ;;
    --submit-only) SUBMIT_ONLY=1; shift ;;
    -h|--help)     sed -n '2,25p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

TOKEN="verify-$(uuidgen)"

if [[ "$LOCALE" == "en" ]]; then
  FIRST_NAME="Sjoerd d'Anjou"   # apostrophe: proves profile interpolation is unaffected
  GENDER="man"
  RELATIONSHIP="in-a-relationship"
else
  FIRST_NAME="Sjoerd d'Anjou"
  GENDER="man"
  RELATIONSHIP="in-een-relatie"
fi

echo "token   : $TOKEN"
echo "locale  : $LOCALE"
echo "email   : $EMAIL"
echo

payload=$(cat <<JSON
{
  "token": "$TOKEN",
  "locale": "$LOCALE",
  "firstName": "$FIRST_NAME",
  "email": "$EMAIL",
  "relationshipStatus": "$RELATIONSHIP",
  "gender": "$GENDER",
  "ageCategory": "31-40",
  "honeypot": "",
  "scores": {"valseHoop":14,"valseMacht":11,"zelfafwijzing":9,"angst":7,"emotioneleVerdoving":3},
  "primaryMechanism": "valseHoop",
  "secondaryMechanism": "valseMacht",
  "totalScore": 44,
  "nemMattersConsent": true,
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
JSON
)

echo "--> POST /nem-submit"
submit_response=$(curl -sS -X POST "$SUBMIT_URL" \
  -H "Content-Type: application/json" \
  -d "$payload")
echo "    $submit_response"

case "$submit_response" in
  *rate_limited*)
    echo
    echo "RATE LIMITED — 3 submits per IP per hour. Wait, or run from another IP." >&2
    exit 1 ;;
  *'"status":"ok"'*) ;;
  *)
    echo
    echo "Unexpected /submit response. Stopping before /verify." >&2
    exit 1 ;;
esac

if [[ "$SUBMIT_ONLY" == "1" ]]; then
  echo
  echo "Stopping after /submit as asked. Verify by hand with:"
  echo "  curl -sSi \"$VERIFY_URL?token=$TOKEN\""
  exit 0
fi

echo
echo "--> GET /nem-verify (expect 302; the report chain runs in the background)"
started=$(date +%s)
verify_headers=$(curl -sS -o /dev/null -D - "$VERIFY_URL?token=$TOKEN")
elapsed=$(( $(date +%s) - started ))

echo "$verify_headers" | sed -n '1p;/^[Ll]ocation:/p' | sed 's/^/    /'
echo "    redirect latency: ${elapsed}s"

if [[ "$elapsed" -gt 3 ]]; then
  echo
  echo "WARNING: the 302 took ${elapsed}s. Respond Confirmed should fire within ~1s of"
  echo "Valid?. If it is waiting on the report chain, Respond Confirmed or Mark Consumed"
  echo "has been pulled off the direct true-branch fan-out. Check the connections." >&2
fi

cat <<EOF

Next: inspect the execution.

  mcp__n8n__n8n_executions  action: "list", workflowId: "uKkMgMYoH5nOLoCR", limit: 3
  mcp__n8n__n8n_executions  action: "get",  id: <id>, mode: "error"   # if it failed

Pass criteria:
  - Generate Report        status "success"           (before the fix this node throws)
  - Generate Report output stop_reason "end_turn"     (NOT "max_tokens")
  - Render PDF             binary, application/pdf
  - Send Report            may 422 on the MailerSend trial cap — not a failure of this fix
  - the PDF body ends in a complete sentence

Replay the same token to confirm the invalid branch still works:
  curl -sSi "$VERIFY_URL?token=$TOKEN"     # expect 302 -> /verificatie/verlopen
EOF
