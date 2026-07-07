# NEM Test — Backend (n8n)

Backend for the NEM TEST Phase B quiz. The React component
(`src/nem-test-phase-b.tsx`) POSTs to the `/submit` webhook; a verification
email link hits the `/verify` webhook. See the full architecture in
`../specs/nem-test-phase-b.md` § "Backend Architecture".

## Status

**`/submit` is LIVE and verified end-to-end** (2026-07-07). `/verify` is built but not yet wired.

| Piece | File | Status |
|-------|------|--------|
| `/submit` webhook | `nem-submit.workflow.json` | ✅ **Live + verified** — `https://reus.app.n8n.cloud/webhook/nem-submit` returns `{"status":"ok"}`; row write, honeypot, rate-limit all tested |
| `nem_test_profiles` data table | n8n Data Tables | ✅ **Created + working** (17 cols; Store Profile uses manual mapping so `honeypot`/`rateLimited` are ignored) |
| MailerLite — pending group | `192344920326931926` | ✅ Created ("NEM Test — Pending") |
| MailerLite — custom fields | `nem_token` / `nem_locale` / `nem_verify_url` | ✅ Created (text) |
| MailerLite — double opt-in | account setting | ✅ **Disabled for API/integrations** — subscribers land Active, no MailerLite opt-in email |
| MailerLite — verification automation + email | `mailerlite-verification.md` | ✅ **Built + verified** — email arrives, `{$nem_verify_url}` resolves to the tokened link |
| Component prop wiring | `src/nem-test-phase-b.tsx` | ⏳ Paste submit URL into `submitWebhookUrl` in Webflow Designer |
| `/verify` webhook | `nem-verify.workflow.json` | ⏳ **Built, not wired** — see `/verify` section below; wire in stages |
| Anthropic report | Generate Report node | ⏳ Needs API key + Alex's prompt |
| PDF generation | Render PDF node | ⏳ Needs a service chosen (PDFShift / PDF.co / api2pdf) |
| MailerSend delivery | Send Report node | ⏳ Needs sender + API key |
| NEM Matters newsletter add | Add To Newsletter node | ⏳ Needs group ID |

### ⏱ Resume here (next session)

1. **Wire `/verify` validation core** — import `nem-verify.workflow.json`, set the Data Table ID (both Data Table nodes) + `REPLACE_SITE`, temporarily disconnect *Generate Report*, and test: valid token → 302 to `/zelftest/bevestigd` + `consumed` flips true; reused token → 302 to `/zelftest/verlopen`. (Needs those two Webflow pages to exist.)
2. Then layer in Anthropic → PDF → MailerSend → newsletter, per the staged order in the `/verify` section below.
3. Finally, paste the submit URL into the component's `submitWebhookUrl` prop so the real quiz hits the live backend.

Two open decisions to make first: **do you have an Anthropic API key?** and **which PDF service?**

---

## `/submit` workflow

Node graph:

```
Webhook (POST /nem-submit, responseNode)
  → Normalize (flatten payload, derive ip / expiresAt / verifyUrl)
  → Honeypot filled?  ──true──▶ Respond {status:"ok"}   (silent fake success)
        │false
        ▼
     Rate limit (≤3 / IP / hour, workflow static data)
  → Rate limited?     ──true──▶ Respond {status:"rate_limited"}
        │false
        ▼
     Store Profile (n8n Data Table insert, token-keyed)
  → MailerLite: Send Verification (upsert to "pending" group → triggers email)
  → Respond {status:"ok"}
```

This matches the component's contract exactly: it reads `honeypot`, returns
`{status:"rate_limited"}` on abuse (the component shows the "probeer later
opnieuw" message), and otherwise returns `{status:"ok"}` so the component
advances to Screen 6.

### Design decisions (differ slightly from the spec — confirm if you disagree)

1. **Rate limit uses n8n workflow static data.** It's ephemeral and
   single-workflow — exactly right for a per-IP hit counter. Caveat: it's
   per-n8n-instance and resets if the workflow is re-imported. Fine for basic
   abuse protection. (Note: static data can't be used for the *profile* store —
   it's scoped to one workflow, and `/verify` is a separate workflow that needs
   to read the data back. That's what the Data Table below is for.)
2. **Verification email is sent by upserting the subscriber into a dedicated
   MailerLite "pending" group**, which fires a MailerLite automation. This keeps
   the *newsletter* group clean (the spec's requirement) — the subscriber only
   joins NEM Matters in `/verify`, after confirming. The token + verify URL ride
   along as subscriber custom fields so the email template can link them.
3. **Durable data lives in an n8n Data Table** (`nem_test_profiles`), keyed by
   `token`, so the `/verify` workflow can read the profile back. Built-in, no
   external account. Swap for Postgres/Redis later without touching the
   component.

---

## Import & setup

### 1. Import the workflow
n8n → Workflows → Import from File → `nem-submit.workflow.json`.

### 2. Create the Data Table

n8n → **Data Tables** → New → name it **`nem_test_profiles`**. Add these
columns (the *Store Profile* node auto-maps input fields to matching names):

| Column | Type | Notes |
|--------|------|-------|
| `token` | String | primary lookup key for `/verify` |
| `email` | String | |
| `firstName` | String | |
| `gender` | String | |
| `ageCategory` | String | |
| `relationshipStatus` | String | |
| `locale` | String | `nl` / `en` |
| `scoresJson` | String | 5 mechanism scores, JSON string |
| `primaryMechanism` | String | |
| `secondaryMechanism` | String | may be empty |
| `totalScore` | Number | |
| `nemMattersConsent` | Boolean | |
| `ip` | String | |
| `receivedAt` | String | ISO timestamp |
| `expiresAt` | String | ISO timestamp, +48h |
| `consumed` | Boolean | `/verify` flips this to true |
| `verifyUrl` | String | |

Then open the *Store Profile* node and select `nem_test_profiles` in the
**Data Table** dropdown (this replaces the `REPLACE_DATA_TABLE_ID` placeholder
with the table's real ID).

### 3. Create the MailerLite credential

**MailerLite** — an *HTTP Header Auth* credential:
- Name: `Authorization`
- Value: `Bearer <YOUR_MAILERLITE_API_KEY>`

Assign it to the *MailerLite: Send Verification* node.

### 4. Set placeholders

Set these as n8n environment variables (the nodes read the env var first,
falling back to the placeholder), or edit the nodes directly:

| Placeholder | Env var | Where |
|-------------|---------|-------|
| `REPLACE_DATA_TABLE_ID` | — | Store Profile → pick table in dropdown (step 2) |
| `REPLACE_PENDING_GROUP_ID` | `MAILERLITE_PENDING_GROUP_ID` | MailerLite node body |
| `https://REPLACE_ME/webhook/nem-verify` | `NEM_VERIFY_WEBHOOK_URL` | Normalize node |

### 5. MailerLite setup

1. **Custom fields** (Subscribers → Fields) — add text fields:
   `nem_token`, `nem_locale`, `nem_verify_url`.
2. **Groups** — create a group **"NEM Test — Pending"**. Copy its ID into
   `MAILERLITE_PENDING_GROUP_ID`. (The newsletter group "NEM Matters" is joined
   later, in `/verify`.)
3. **Automation** — trigger: *when subscriber joins "NEM Test — Pending"* →
   send the verification email. Build one email per locale (NL + EN); branch on
   the `nem_locale` field. In the email body, the confirm button links to
   `{$nem_verify_url}`.

### 6. Activate & grab the URL
Activate the workflow. Copy the **Production** webhook URL from the Webhook node
(e.g. `https://<your-n8n>/webhook/nem-submit`).

### 7. Wire the component
In the Webflow Designer, select the *NEM Test Phase B* component and paste that
URL into the **Submit Webhook URL** prop. (Set it per-locale if the NL and EN
pages should hit the same endpoint — they can; locale travels in the payload.)

---

## Test it (before wiring the component)

```bash
curl -sS -X POST "https://<your-n8n>/webhook/nem-submit" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "test-'"$(uuidgen)"'",
    "locale": "nl",
    "firstName": "Test",
    "email": "will+nem-submit-test@teamzissou.io",
    "relationshipStatus": "in-een-relatie",
    "gender": "vrouw",
    "ageCategory": "31-40",
    "honeypot": "",
    "scores": {"valseHoop":14,"valseMacht":11,"zelfafwijzing":9,"angst":7,"emotioneleVerdoving":3},
    "primaryMechanism": "valseHoop",
    "secondaryMechanism": "valseMacht",
    "totalScore": 44,
    "nemMattersConsent": true,
    "timestamp": "2026-07-07T12:00:00Z"
  }'
# expect: {"status":"ok"}
```

Then check: (a) a new row in the `nem_test_profiles` data table, (b) the
subscriber in the "NEM Test — Pending" group, (c) the verification email in the
inbox.

**Honeypot test:** resend with `"honeypot": "bot"` → still `{"status":"ok"}`,
but no data-table row and no email.

**Rate-limit test:** fire 4× fast from the same IP → the 4th returns
`{"status":"rate_limited"}`.

---

---

## `/verify` workflow

Triggered by the verification email link (`GET /webhook/nem-verify?token=…`).

Node graph:

```
Webhook (GET ?token=)
  → Get Profile (Data Table lookup by token)
  → Validate Token (exists? not expired? not consumed?)
  → Valid? ──false──▶ Respond 302 → /zelftest/verlopen (expired/used page)
        │true
        ├──▶ Respond 302 → /zelftest/bevestigd   (redirect the browser NOW)
        └──▶ Generate Report (Anthropic API, claude-opus-4-8)
               → Build HTML (wrap report text in a print template)
               → Render PDF (HTML-to-PDF service)
               → Send Report (MailerSend, PDF attachment)
               → Consent? ──true──▶ Add To Newsletter (MailerLite NEM Matters)
                     │              └──▶ Mark Consumed (Data Table update)
                     └──false───────────▶ Mark Consumed
```

**Why the browser is redirected before the report finishes:** report generation +
PDF + email takes ~10–20s. The `Valid?` node fans out — one branch responds to
the browser immediately (302 to the confirmation page), the other runs the slow
report pipeline in the background. The user never waits.

### Prerequisites you must supply

| Placeholder | What it is | Status |
|-------------|-----------|--------|
| `REPLACE_DATA_TABLE_ID` | Same `nem_test_profiles` table (2 nodes: Get Profile, Mark Consumed) | ✅ exists |
| `REPLACE_SITE` | Your Webflow domain, e.g. `nemlife.nl` (2 redirect nodes) | you set |
| `REPLACE_WITH_ALEX_SYSTEM_PROMPT_FROM_NOTION` | Alex's report system prompt (Notion source-of-truth) | Alex owns |
| `REPLACE_PDF_API_URL` | HTML-to-PDF service endpoint | **decision needed** |
| `REPLACE_FROM` | Verified MailerSend sender, e.g. `test@nemlife.nl` | you set |
| `REPLACE_NEM_MATTERS_GROUP_ID` | The MailerLite newsletter group ID | you set |

### Credentials (3 new)

- **Anthropic** — HTTP Header Auth: Name `x-api-key`, Value `<your Anthropic API key>` → *Generate Report* node.
- **PDF service** — HTTP Header Auth (or Basic, per your chosen service) → *Render PDF* node.
- **MailerSend** — HTTP Header Auth: Name `Authorization`, Value `Bearer <MailerSend API key>` → *Send Report* node.
- **MailerLite** — reuse the existing Header Auth credential from `/submit` → *Add To Newsletter* node.

### PDF service — the open decision

n8n Cloud has no built-in PDF generation, so *Render PDF* POSTs the HTML to an
external HTML-to-PDF API and captures the returned PDF as a binary (`data`),
which *Send Report* then base64-attaches. The body is currently `{ "source": html }`
(PDFShift-style). Swap the URL + body shape to match whichever you pick:

| Service | Endpoint | Auth | Body key |
|---------|----------|------|----------|
| PDFShift | `https://api.pdfshift.io/v3/convert/pdf` | Basic (api key as user) | `source` |
| PDF.co | `https://api.pdf.co/v1/pdf/convert/from/html` | `x-api-key` header | `html` |
| api2pdf | `https://v2.api2pdf.com/chrome/html` | `Authorization` header | `html` |

### Recommended wiring order (test in stages — don't flip it all on at once)

1. **Validation core** — set the Data Table ID + `REPLACE_SITE`, disconnect
   *Generate Report* temporarily, activate, and test: a valid token → 302 to
   `/bevestigd` + row's `consumed` flips true; a reused/expired token → 302 to
   `/verlopen`. (You'll need the two Webflow pages to exist.)
2. **Anthropic** — add the API key credential + Alex's prompt; Execute the
   *Generate Report* node on a pinned profile and confirm you get report text.
3. **PDF** — pick a service, set the URL/body/credential, confirm a PDF binary.
4. **Delivery** — MailerSend sender + credential; confirm the email arrives with
   the PDF; then the MailerLite newsletter add + `Mark Consumed`.
5. Finally, set `NEM_VERIFY_WEBHOOK_URL` is already hard-coded in `/submit`'s
   Normalize node (`https://reus.app.n8n.cloud/webhook/nem-verify`), so once
   `/verify` is active the confirm-button links resolve automatically.

### Things to verify on import (couldn't test against live n8n)

- **Data Table `get` / `update`** node param shapes (`filters.conditions`) — open
  *Get Profile* and *Mark Consumed*, confirm the table + token condition, re-save.
- **RespondToWebhook redirect** — the redirect nodes use `respondWith: "redirect"`
  + `responseCode: 302`; if your n8n version labels it differently, set "Redirect"
  in the node's Respond With dropdown and paste the URL.
- **MailerSend attachment** references the PDF via `$binary.data.data` — confirm
  the *Render PDF* node outputs binary under the property name `data`.
