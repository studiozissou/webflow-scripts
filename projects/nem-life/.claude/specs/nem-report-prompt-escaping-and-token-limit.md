# NEM Test report prompt: make the prompt safe to edit and lift the token limit

**Slug:** `nem-report-prompt-escaping-and-token-limit`
**Status:** Ready to Build
**Priority:** P0
**Type:** fix
**Created:** 2026-07-09
**Project:** nem-life
**Workflow:** `NEM Test — /verify` (n8n id `uKkMgMYoH5nOLoCR`, **active**)
**Repo file:** `projects/nem-life/.claude/backend/nem-verify.workflow.json`

## Summary

Two defects in the `Generate Report` node of the live `/verify` workflow, both of
which detonate the moment Alex's real report prompt is pasted in (resume-list item 4).
This task fixes them and re-syncs the repo JSON to live. It is a prerequisite for
*any* mechanism that lets Alex update the prompt himself — none of the candidate
designs work while the prompt cannot contain an apostrophe.

## Defect 1 — the prompt is code, not data

`Generate Report.parameters.jsonBody` is an n8n expression that builds the Anthropic
request body by string-concatenating JavaScript source:

```js
={{ JSON.stringify({ model: 'claude-opus-4-8', max_tokens: 1024,
     system: 'TEST MODE. …', messages: [ … ] }) }}
```

The system prompt sits between **single quotes inside a JS expression**. Whoever wrote
the current stub worked around this without documenting it: the stub is a single line,
and it uses `\"TESTRAPPORT / TEST REPORT\"` with escaped double quotes rather than any
apostrophe.

Alex's real prompt is long-form Dutch therapy prose. The first `'t`, `je'`, `don't`,
or newline he pastes produces an unterminated string literal. The node throws. Because
the browser already received its 302 from `Respond Confirmed`, **the failure is
completely silent** — no report, no error surfaced to the user or to Alex.

Note the *user* message in the same expression is already safe: it interpolates values
with `+ $json.firstName` rather than embedding them in a literal, so data containing
apostrophes passes through untouched. Only `system:` is affected.

## Defect 2 — `max_tokens` drift

| Source | `max_tokens` |
|---|---|
| Repo `nem-verify.workflow.json` | `8000` |
| **Live n8n** | `1024` |

A full personalised report will truncate mid-sentence at 1024 tokens, and the repo
gives no hint that this is happening. `1024` was almost certainly set to keep the
stub cheap and never reverted.

## Design

Make the prompt **data rather than code** by moving it into a Set node whose value is
a plain (non-expression) string. n8n stores such a field verbatim; `JSON.stringify`
then does all escaping when the request body is built. Any character becomes safe —
apostrophes, double quotes, backslashes, newlines, curly quotes, em dashes.

### New node

`Report Prompt` — `n8n-nodes-base.set`, position ~`[1040, 180]`

- Field `systemPrompt`, type String, holding the prompt text.
- **The value must be entered as a fixed value, not an expression.** In the n8n UI the
  field must not be toggled to Expression mode, and the stored value must not begin
  with `=`. If it does, the text re-enters the JavaScript evaluator and this whole fix
  is undone.
- `includeOtherFields: true` so the profile fields pass through.

### Connection changes

```
before:  Valid? ──true──▶ Respond Confirmed
                        ▶ Mark Consumed
                        ▶ Generate Report

after:   Valid? ──true──▶ Respond Confirmed
                        ▶ Mark Consumed
                        ▶ Report Prompt ──▶ Generate Report
```

`Respond Confirmed` and `Mark Consumed` **must stay on the direct true-branch fan-out**.
If the new node is inserted ahead of them, the 302 waits on prompt resolution and users
sit on a blank page for the duration of the report chain.

### `Generate Report` rewrite

```js
={{ JSON.stringify({
     model: 'claude-opus-4-8',
     max_tokens: 8000,
     system: $('Report Prompt').first().json.systemPrompt,
     messages: [ { role: 'user', content:
       'Locale: ' + $('Validate Token').first().json.locale + '. Write the full report in '
       + ($('Validate Token').first().json.locale === 'en' ? 'English' : 'Dutch')
       + '\n\nFirst name: ' + $('Validate Token').first().json.firstName
       + '\nGender: ' + $('Validate Token').first().json.gender
       + '\nAge category: ' + $('Validate Token').first().json.ageCategory
       + '\nRelationship status: ' + $('Validate Token').first().json.relationshipStatus
       + '\n\nMechanism scores (JSON): ' + $('Validate Token').first().json.scoresJson
       + '\nPrimary mechanism: ' + $('Validate Token').first().json.primaryMechanism
       + '\nSecondary mechanism: ' + ($('Validate Token').first().json.secondaryMechanism || 'none')
       + '\nTotal score: ' + $('Validate Token').first().json.totalScore } ]
   }) }}
```

Two changes beyond `system:` and `max_tokens`:

1. **`$json.*` → `$('Validate Token').first().json.*`.** Inserting `Report Prompt`
   upstream changes what `$json` refers to inside `Generate Report`. `includeOtherFields`
   would paper over this, but explicit node references are robust to future node
   insertions and match what `Build HTML` already does.
2. `retryOnFail` (3× / 5s) is retained — it covers transient Anthropic 529s.

## Out of scope (but discovered — see Blockers)

- MailerSend trial-account send cap (separate P0, see below).
- Silent-failure alerting on the report branch.
- Where the prompt ultimately *lives* (Notion / Data Table / git) and who may edit it.
  That decision is pending a conversation with Alex. This task deliberately parks the
  prompt in a Set node, which is a clean seam: swapping the Set node for a Notion fetch
  or Data Table read later touches one node and no expressions.

## Blockers discovered during planning

**`Send Report` is failing in production on a MailerSend trial account.**
Executions `#30` (09:09) and `#35` (10:07) on 2026-07-09 both died at `Send Report`:

```
422 — {"message":"You have reached trial account unique recipients limit. #MS42225"}
```

In both, `Generate Report` → `Build HTML` → `Render PDF` → `Encode PDF` all succeeded.
Only delivery failed. Because `Mark Consumed` is on the fast path, **the token was
consumed anyway** — the user saw `/bevestigd`, received no report, and cannot retry.
`Add To Newsletter` never ran either, so a consenting user was also not subscribed.

This blocks go-live independently of this task and must be raised with Alex: the
MailerSend account needs upgrading off trial. It also directly constrains how this
task is verified (below).

**Repo/README drift to correct as part of the re-sync step:**

- README says `Add To Newsletter` is "still disabled, still needs group ID". Live, it is
  **enabled** with a real group ID (`157087585777223620`). `Consent?` is enabled too.
- README says MailerSend is "✅ Production" and "All three credentials are now on the
  client's accounts. No credential work blocks go-live." The trial cap contradicts this.
- Repo JSON `max_tokens: 8000` vs live `1024` (this task).
- `n8n_workflow_versions` returns zero versions for this workflow. There is no rollback
  history. Capture the current live JSON into the repo before editing.

## Implementation steps

1. **Snapshot first.** Pull live `uKkMgMYoH5nOLoCR` and commit it verbatim to
   `nem-verify.workflow.json`. There is no version history in n8n to fall back on, so
   this commit *is* the rollback point.
2. Add the `Report Prompt` Set node with `systemPrompt` as a fixed-value string.
   Seed it with the existing stub text for now (Alex's real prompt lands separately).
3. Rewire `Valid?` true-branch → `Report Prompt` → `Generate Report`, preserving the
   direct edges to `Respond Confirmed` and `Mark Consumed`.
4. Rewrite `Generate Report.jsonBody`: `system:` reads the Set node, `max_tokens: 8000`,
   `$json.*` → `$('Validate Token').first().json.*`.
5. Run the verification below.
6. Re-sync `nem-verify.workflow.json` to live and correct the stale README rows.

## Verify Loop

### Pass/fail criteria

- `Report Prompt.parameters.fields` stores `systemPrompt` as a string that **does not
  begin with `=`** (assert on the fetched node JSON — this is the whole point of the fix).
- With a torture-test prompt (below) installed, a `/verify` call produces an execution
  in which `Generate Report` has `status: "success"`. Before the fix, this node throws.
- `Generate Report` output has `stop_reason: "end_turn"`, **not** `"max_tokens"` —
  proves the limit was lifted rather than merely raised.
- `Respond Confirmed` still fires within ~1s of `Valid?`; the 302 does not wait on the
  report chain.
- `Render PDF` returns a binary with `mimeType: application/pdf`, and the report body in
  the PDF ends in a complete sentence.

### Torture-test prompt

Install this as `systemPrompt` for the verification run. It exercises every character
class that breaks the current node:

```
TEST. Alex's prompt — don't truncate.
Hij zei: "'t is goed." Backslash: \ and a curly quote: ’
Write at least 400 words in the requested language.
Line two.

Line four, after a blank line.
```

### Reproduction steps

1. `POST /webhook/nem-submit` with a fixture profile (see `backend/README.md` § Test it).
2. Read the new row's `token` from the `nem_test_profiles` Data Table.
3. `GET https://reus.app.n8n.cloud/webhook/nem-verify?token=<token>`.
4. Inspect the resulting execution via `n8n_executions` (`mode: "error"` if it failed).

### ⚠️ Verification is constrained by the MailerSend trial cap

A full end-to-end run **will 422 at `Send Report`** for any recipient MailerSend has not
already seen, regardless of whether this fix works. Do one of:

- **Preferred:** use a recipient address MailerSend has already delivered to (it is
  within the existing unique-recipient set), so the run completes through `Send Report`; or
- temporarily disable `Send Report` and assert only through `Encode PDF`; or
- execute `Generate Report` alone against a pinned `Validate Token` output.

Do **not** read a `Send Report` 422 as a failure of this task. The report branch is
verified complete at `Encode PDF`.

Every verification run consumes a PDFShift credit (`sandbox` was removed) and bills
Anthropic tokens against Alex's key. Keep runs to a handful.

### Regression scope

- **Fast path.** `Respond Confirmed` and `Mark Consumed` must still fire directly off
  `Valid?`. Confirm the 302 latency has not regressed into the ~10–20s report window.
- **Invalid-token branch.** `Valid?` false → `Respond Invalid` → `/verlopen` is untouched;
  confirm a reused token still redirects there.
- **`/submit` workflow** (`LDI1eWR35lwX6WLp`) is not modified.
- **`nem-verify-report-email-and-pdf-branding`** (queued, P2) edits `Build HTML` and
  `Send Report` in this same workflow. Whichever task lands second **must re-pull live
  before editing**, or it will clobber the other's changes — there is no version history
  to recover from.

### Tier mapping

- **Tier 1 — Auto (Playwright):** *not applicable.* This change has no browser surface;
  it is an n8n workflow edit. No acceptance test file is generated and nothing is added
  to `tests/registry.json`. The equivalent automated check is the n8n execution
  inspection above, driven through the n8n MCP.
- **Tier 2 — CDN regression:** not applicable; no CDN asset changes.
- **Tier 3 — Manual:**
  - Open the PDF attachment and read it end to end. Only a human can judge whether the
    report reads as complete prose rather than a truncated fragment.
  - Confirm in the n8n UI that the `systemPrompt` field renders as a plain text box and
    not an expression (the `=` prefix is invisible in the stored JSON diff if you only
    read the rendered value).

## Barba Impact

N/A — no Barba transitions. This is a backend n8n workflow, not a Webflow page module.

## Agents needed

- `code-writer` — workflow JSON edits, applied live via the n8n MCP.
- `qa` — execution verification, regression on the fast path and invalid-token branch.
