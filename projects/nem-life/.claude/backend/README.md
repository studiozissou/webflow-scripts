# NEM Test — Backend (n8n)

Backend for the NEM TEST Phase B quiz. The React component
(`src/nem-test-phase-b.tsx`) POSTs to the `/submit` webhook; a verification
email link hits the `/verify` webhook. See the full architecture in
`../specs/nem-test-phase-b.md` § "Backend Architecture".

## Status

**`/submit` is LIVE and verified end-to-end** (2026-07-07). **`/verify` validation core is LIVE + verified** (2026-07-07) — token validation, both redirect branches, locale routing, and the `consumed` flip all tested against live n8n. The report branch (Anthropic → PDF → MailerSend → newsletter) is built but **disabled** pending credentials/decisions.

| Piece | File | Status |
|-------|------|--------|
| `/submit` webhook | `nem-submit.workflow.json` | ✅ **Live + verified** — `https://reus.app.n8n.cloud/webhook/nem-submit` returns `{"status":"ok"}`; row write, honeypot, rate-limit all tested |
| `nem_test_profiles` data table | n8n Data Tables | ✅ **Created + working** (17 cols; Store Profile uses manual mapping so `honeypot`/`rateLimited` are ignored) |
| MailerLite — pending group | `192344920326931926` | ✅ Created ("NEM Test — Pending") |
| MailerLite — custom fields | `nem_token` / `nem_locale` / `nem_verify_url` | ✅ Created (text) |
| MailerLite — double opt-in | account setting | ✅ **Disabled for API/integrations** — subscribers land Active, no MailerLite opt-in email |
| MailerLite — verification automation + email | `mailerlite-verification.md` | ✅ **Built + verified** — email arrives, `{$nem_verify_url}` resolves to the tokened link |
| Component prop wiring | `src/nem-test-phase-b.tsx` | ⏳ Paste submit URL into `submitWebhookUrl` in Webflow Designer |
| `/verify` webhook | `nem-verify.workflow.json` | ✅ **Live (validation core)** — workflow id `uKkMgMYoH5nOLoCR`, active; `https://reus.app.n8n.cloud/webhook/nem-verify?token=…`. Redirects → `nem-life-1.webflow.io/verificatie/{bevestigd,verlopen}` (staging; EN under `/en/verificatie/…`); `consumed` flips on validate. Report branch disabled. |
| Anthropic report | Generate Report node | ✅ **Enabled + verified** (2026-07-07, exec #19) — `Anthropic API` Header Auth cred (`x-api-key`, id `FPiOec7GU6JFfFFf`, Will's own key) wired; `claude-opus-4-8` returns text, locale-correct, profile fields flow through. Retry-on-fail added (3× / 5s) for transient 529s. Running a **clearly-labelled stub** system prompt — swap in Alex's real prompt (one `system:` field on the node) when it lands. |
| PDF generation | Render PDF node | ✅ **Enabled + verified** (2026-07-07, exec #22) — **PDFShift** (`https://api.pdfshift.io/v3/convert/pdf`), body `{ source: html }`, returns `application/pdf` (~40 kB). ⚠️ **Auth is `X-API-Key` header, NOT Basic auth** — use an *HTTP Header Auth* credential (Name `X-API-Key`, Value `sk_…`), id `9e4Kcyv9XnvbS6zx`. Currently `sandbox: true` in the body (free, watermarked) — remove for production. Free plan = 50 credits/mo, 1 MB/doc. |
| MailerSend delivery | Send Report node | ⏳ Needs sender + API key |
| NEM Matters newsletter add | Add To Newsletter node | ⏳ Needs group ID |

### ⏱ Resume here (next session)

1. ~~**Wire `/verify` validation core**~~ ✅ **Done 2026-07-07** — workflow live (id `uKkMgMYoH5nOLoCR`), Data Table `ib5Yh0yEfNpDqeuU` wired into Get Profile + Mark Consumed, `REPLACE_SITE` → `nem-life-1.webflow.io`. All 5 cases pass (valid NL/EN → `/bevestigd`; reused/expired/unknown → `/verlopen`; `consumed` flips only on valid). Confirmation pages live at `/verificatie/bevestigd` + `/verificatie/verlopen` (separate static folder — can't share the `zelftesten` CMS collection slug). EN mirror pages `/en/verificatie/…` still need confirming.
2. Then layer in Anthropic → PDF → MailerSend → newsletter, per the staged order in the `/verify` section below. The 4 report-branch nodes are currently **disabled** in the live workflow — enable them one stage at a time.
3. Finally, paste the submit URL into the component's `submitWebhookUrl` prop so the real quiz hits the live backend.

### 🔑 Handover — keys to transfer to Alex before go-live

These two credentials currently use **Will's personal accounts** for testing. Before production, Alex must create his own and the n8n credentials must be repointed:

| Service | n8n credential | Currently | Action for handover |
|---------|---------------|-----------|---------------------|
| **Anthropic** | `Anthropic API` (id `FPiOec7GU6JFfFFf`, Header Auth `x-api-key`) | Will's own Anthropic API key | Alex creates an Anthropic account + API key → update the credential's Value. Billing then lands on Alex. |
| **PDFShift** | `PDFShift Header` (id `9e4Kcyv9XnvbS6zx`, Header Auth `X-API-Key`) | Will's PDFShift free account (50 credits/mo) | Alex creates a PDFShift account + API key → update the credential's Value. Free tier is only 50 credits/mo + 1 MB/doc, so Alex likely needs a paid plan for real volume. |

Only the credential **Value** changes — the workflow nodes and credential wiring stay as-is. No node edits needed. (MailerSend, when wired, is a third key Alex owns — see below.)

Open decision remaining: none for PDF (PDFShift chosen). Next stage: **MailerSend** delivery.

**Design note (2026-07-07):** `Mark Consumed` was moved onto the *fast path* — it now fires alongside the confirm redirect, not at the tail of the report chain. Rationale: in the original graph `consumed` only flipped after the newsletter-add, so any failure in the report/PDF/email steps left the token replayable. The workflow JSON in this repo reflects the fix.

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
| PDFShift ✅ **chosen + wired** | `https://api.pdfshift.io/v3/convert/pdf` | **`X-API-Key` header** (HTTP Header Auth cred, Name `X-API-Key`, Value `sk_…`) — *not* Basic auth | `source` |
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
