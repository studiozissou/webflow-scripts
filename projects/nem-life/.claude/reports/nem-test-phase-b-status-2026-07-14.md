# NEM TEST Phase B — Test Rerun & Status

**Date:** 2026-07-14
**Trigger:** MailerSend account paid → unblocks the E2E email/PDF-delivery tests. Asked to rerun tests and scope remaining work.

## Could the tests be rerun? No — not from the web/remote session

The remote execution environment's egress policy blocks the hosts the suite needs:

| Host | Result | Needed by |
|------|--------|-----------|
| `nem-life-1.webflow.io` | `403` policy denial | **all 52 tests** (every test navigates to staging) |
| `studiozissou.webflow.io` | blocked | — |
| `api.mailersend.com` | blocked | Tier 3 MailerSend check |
| `gmail.googleapis.com` | reachable | Tier 3 Gmail check (still needs OAuth creds) |

This is an org network-policy denial — not to be routed around. Secondary blockers if run elsewhere: Playwright `1.58.2` wants Chromium rev 1208 (only 1194 pre-installed here), and the E2E tests need `MAILERSEND_API_KEY` + Gmail OAuth, which aren't in the repo.

**Verdict:** tests must be run locally (or from a network-unrestricted runner with the secrets). Nothing about the code is failing — the environment simply can't reach staging.

## What "mailers paid" unblocks

The 2 `@e2e-email` tests (Tier 3), the only ones touching MailerSend/PDF delivery:
- `E2E: MailerSend API check › verification email sent`
- `E2E: Gmail inbox check › full flow: submit → verification email → verify link → PDF report`

The submit webhook is already baked into the component (`https://reus.app.n8n.cloud/webhook/nem-submit`), so submit was live; the **report-delivery (PDF via MailerSend) half is what paid turns on.**

## How to run locally

```bash
npm install && npx playwright install chromium
# .env.test at repo root:
#   NEM_SUBMIT_WEBHOOK_URL=https://reus.app.n8n.cloud/webhook/nem-submit
#   MAILERSEND_API_KEY=ms_...
#   GMAIL_CLIENT_ID=...  GMAIL_CLIENT_SECRET=...  GMAIL_REFRESH_TOKEN=...
npm run test:sz:acceptance
npx playwright test tests/acceptance/nem-test-phase-b.spec.js --grep @e2e-email
```

## What's left to do

1. **🔴 Conclusion texts still dummy (launch blocker).** `src/nem-test-phase-b.tsx:161-202` — all 30 Screen-4 texts are `[DUMMY man]/[DUMMY vrouw] … Alex schrijft deze tekst nog` placeholders. Alex owes 15 keys × 2 genders, NL **and** EN. Blocks launch content, not the technical flow.
2. **🟡 Run the newly-live E2E mail loop** and confirm the PDF actually lands (`has:attachment`). Needs Gmail OAuth per spec § E2E signup flow automation.
3. **🟡 EN `ctaButtonText` not localised** — test at `nem-test-phase-b.spec.js:733` documents staging's EN CTA falling back to Dutch "Ontvang mijn rapport". Localise in the Webflow EN locale.
4. **🟢 Tier 4 manual** — iOS Safari pill stacking + PDF visual quality (Chromium automation can't cover).

## State of this session

No code changes. Dependencies installed; generated `test-results/` cleaned. Only this report added.
