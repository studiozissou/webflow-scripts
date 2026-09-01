# beehiiv welcome survey not triggering for jayshetty.me signups

Date: 2026-08-27
Reported by: Becca (relayed from Taylor, TDW lead writer)
Status: Root cause identified — fix is in Zapier, not in the Webflow site or this repo

## Symptom

Subscribers with these beehiiv sources do not receive TDW's welcome survey:

- `api: jayshetty.me: popup`
- `api: jayshetty.me: referral`
- `api: jayshetty.me: footer`
- `api: jayshetty.me: banner`

## The chain

1. Visitor submits a native Webflow form on jayshetty.me (popup / banner / footer / referral).
2. Webflow stores the submission and fires its Zapier trigger.
3. Zapier runs a beehiiv **Create a Subscriber** action.
4. beehiiv creates the subscriber via `POST /v2/publications/{id}/subscriptions`.

Verified via Webflow MCP (site `64c10a2010e1a379d08bf030`): the subscribe forms are
native Webflow forms with `redirectUrl: null` and no custom submit handler. There is no
beehiiv or Zapier code in this repo, in the site's custom code, or in n8n. The `api:`
prefix on every source string is beehiiv's own label for subscribers created through the
API, which confirms Zapier is the writer.

## Root cause

`send_welcome_email` defaults to **`false`** on the beehiiv create-subscription endpoint.
Nothing in the Zap is setting it to `true`, so every API-created subscriber is added
silently. Subscribers who sign up through beehiiv's own hosted forms are unaffected,
which is why the problem looks source-specific.

## Important caveat — the rep's advice may only be half the fix

The beehiiv rep pointed at `send_welcome_email: true`. That flag only fires the single
built-in **Welcome Email**. It does **not** enroll anyone in an **Automation**.

Two different things can deliver a "welcome survey" in beehiiv:

| If the survey lives in... | The fix is... |
|---|---|
| The built-in Welcome Email | Set **Send Welcome Email = true** in the Zap's Create a Subscriber action |
| An Automation / workflow | Enroll explicitly — API `automation_ids: ["<id>"]`, or add a second Zapier step **Add a Subscriber to an Automation** |

A survey flow is more commonly built as an Automation, so confirm with Taylor which one
it is before assuming the toggle alone will fix it. API-created subscribers are not
reliably auto-enrolled into automations.

## Fix (in Zapier — no site deploy needed)

For each Zap covering popup / referral / footer / banner:

1. Open the **Create a Subscriber** beehiiv action.
2. Set **Send Welcome Email** to `true`.
3. If the survey is an Automation, add a second beehiiv action —
   **Add a Subscriber to an Automation** — with the survey's Automation ID, mapped to the
   email from step 1.
4. Republish each Zap. There may be one Zap per source or one with branching; all four
   need the change.

No beehiiv login is required — everything is set on the Zapier side. The Automation ID,
if needed, can be read in Zapier via the **List All Automations** search action.

## Backfill

Existing subscribers already added without the flag will not retroactively receive the
survey. If TDW wants them caught up, they can build a beehiiv segment on those four
source values and bulk-enroll it into the automation. That is a beehiiv-side job for
Taylor, not a Zapier change.

## Relevant API reference

`POST https://api.beehiiv.com/v2/publications/{publicationId}/subscriptions`

| Param | Type | Default |
|---|---|---|
| `send_welcome_email` | boolean | `false` |
| `automation_ids` | array | `null` |
| `reactivate_existing` | boolean | `false` |
| `utm_source` | string | `null` |

Docs: https://developers.beehiiv.com/api-reference/subscriptions/create
