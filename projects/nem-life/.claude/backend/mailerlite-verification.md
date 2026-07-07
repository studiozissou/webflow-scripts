# MailerLite — Verification Email + Automation

The `/submit` workflow upserts the subscriber into the **NEM Test — Pending**
group with three custom fields (`nem_token`, `nem_locale`, `nem_verify_url`).
This automation sends the double-opt-in verification email; clicking the confirm
button hits the `/verify` webhook, which generates + delivers the report.

## Prerequisites (done)

- ✅ Group: **NEM Test — Pending** (`192344920326931926`)
- ✅ Custom fields (text): `nem_token`, `nem_locale`, `nem_verify_url`

## Automation

**Subscribers → Automations → Create → Start from scratch**

1. **Trigger:** *When subscriber joins a group* → **NEM Test — Pending**
2. **Condition step:** field **`nem_locale`** *is equal to* `en`
   - **Yes** branch → send the **EN** email below
   - **No** branch (default, covers `nl`) → send the **NL** email below
3. Save + set the automation **Active**.

> The confirm button's URL in both emails must be the personalization tag
> **`{$nem_verify_url}`** (not a hardcoded link). MailerLite swaps in the
> per-subscriber verification URL stored by `/submit`.

---

## Email — NL (default branch)

**Subject:** `Nog één stap: bevestig je e-mailadres`
**Preheader:** `Bevestig je adres en we sturen je persoonlijke rapport direct naar je inbox.`

**Body:**

> Hoi {$name},
>
> Je hebt de NEM Test ingevuld — mooi dat je deze stap zet.
>
> Bevestig hieronder je e-mailadres. Daarna stellen we je persoonlijke rapport
> samen en sturen we het direct naar je inbox.
>
> **[ Bevestig mijn e-mailadres ]** → `{$nem_verify_url}`
>
> Heb je deze test niet ingevuld? Dan kun je deze mail rustig negeren.
>
> Warme groet,
> Het NEM Life team

**Button label:** `Bevestig mijn e-mailadres`

---

## Email — EN (nem_locale = en)

**Subject:** `One more step: confirm your email`
**Preheader:** `Confirm your address and we'll send your personal report straight to your inbox.`

**Body:**

> Hi {$name},
>
> You've completed the NEM Test — good on you for taking this step.
>
> Confirm your email address below. We'll then put together your personal
> report and send it straight to your inbox.
>
> **[ Confirm my email ]** → `{$nem_verify_url}`
>
> Didn't take this test? You can safely ignore this email.
>
> Warm regards,
> The NEM Life team

**Button label:** `Confirm my email`

---

## Note on the confirm link (until `/verify` exists)

`/submit` builds `nem_verify_url` from `NEM_VERIFY_WEBHOOK_URL`, which isn't set
yet — so right now the stored URL is the `https://REPLACE_ME/webhook/nem-verify`
placeholder and the confirm button won't resolve. That's expected: build and
test the email layout now; once the `/verify` workflow is deployed, set
`NEM_VERIFY_WEBHOOK_URL` (or edit the Normalize node) and the link goes live.
