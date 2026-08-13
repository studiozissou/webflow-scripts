# Changeset — `nem-report-prompt-escaping-and-token-limit`

## ✅ APPLIED AND VERIFIED — 2026-08-13

Live on `uKkMgMYoH5nOLoCR`. Kept for the record and for the execution-order finding below.

**Proof it worked** (execution 45, torture prompt installed):

| Criterion | Result |
|---|---|
| `Generate Report` with apostrophes, nested quotes, backslash, curly quote, em dash, blank lines | ✅ `success` — throws under the old node |
| `stop_reason` | ✅ `end_turn`, not `max_tokens` |
| `output_tokens` | ✅ **1217** — above the old 1024 cap, so the report would have been truncated before |
| Report body | ✅ complete Dutch prose, ends mid-thought nowhere |
| `Render PDF` | ✅ 2-page `application/pdf` |
| Fast path | ✅ 302 immediate, `Mark Consumed` fires |
| Invalid branch | ✅ replay → `/verificatie/verlopen` |
| `Send Report` | ❌ 422 MailerSend trial cap — expected, separate P0 |

---

## ⚠️ The trap: n8n v1 execution order follows canvas position, not connection order

Discovered the hard way in execution 44. The node was first placed at `[1040, 60]` —
*above* `Respond Confirmed` at `[900, 180]`. With `executionOrder: v1`, n8n runs a
parallel fan-out **top to bottom by y-position**, so the entire report chain ran before
the redirect: the browser waited **27 seconds** and got a `200` instead of an immediate
`302`, and `Mark Consumed` never fired at all, leaving the token replayable.

Connection array order does **not** decide this. Position does.

**`Report Prompt` must sit below `Mark Consumed`.** It is at `[1040, 460]`; `Mark Consumed`
is at `[900, 360]`. If anyone drags it above y=360 on the canvas, the fast path silently
breaks again — no error, just a 27-second blank page and an unconsumed token.

The same rule applies to any future node added to the `Valid?` true branch.

---

Original prepare-notes follow.

**Spec:** `../../specs/nem-report-prompt-escaping-and-token-limit.md`
**Workflow:** `NEM Test — /verify`, n8n id `uKkMgMYoH5nOLoCR`, **active**
**Tests:** `tests/nem/nem-verify-report-body.test.js` — 21 passing

## Read this first — two things changed since the spec was written

### 1. The n8n API key is failing auth

```
mcp__n8n__n8n_get_workflow → AUTHENTICATION_ERROR: Failed to authenticate with n8n
```

`n8n_health_check` succeeds (it doesn't authenticate), so the instance is up — it is
the key that is stale. **Refresh `N8N_API_KEY` before anything else.** Until then,
spec step 1 (snapshot live as the rollback point) cannot run, and there is no version
history in n8n to fall back on. Do not edit the workflow before the snapshot exists.

### 2. The spec asserts on a node shape that no longer exists

The spec's verify loop says:

> `Report Prompt.parameters.fields` stores `systemPrompt` as a string that does not begin with `=`

`parameters.fields` is the Set node **v2** shape. Current Set is **typeVersion 3.5**,
which stores assignments at:

```
parameters.assignments.assignments[0]  →  { id, name, type, value }
```

So the assertion is:

```
parameters.assignments.assignments[0].value  must not start with `=`
```

The spec has been corrected in place. `report-prompt.node.json` uses the 3.5 shape and
the test suite asserts `parameters.fields === undefined` so the legacy shape cannot creep back.

## Why this is a node-level diff, not a workflow import

The repo's `nem-verify.workflow.json` **has drifted from live** and is the older copy:

| | Repo JSON | Live |
|---|---|---|
| `Generate Report.max_tokens` | `8000` | `1024` |
| `Generate Report.system` | `REPLACE_WITH_ALEX_SYSTEM_PROMPT_FROM_NOTION` | a stub prompt |
| `Add To Newsletter` | disabled, `REPLACE_NEM_MATTERS_GROUP_ID` | enabled, group `157087585777223620` |
| `Consent?` gate | disabled | enabled |

Importing the repo file would silently revert the newsletter wiring that was verified
live on 2026-07-09 (exec #37). So the change is expressed as
`partial-update.operations.json` — a surgical diff that touches three things and is
immune to the drift.

## Files

| File | What it is |
|---|---|
| `partial-update.operations.json` | The payload for `mcp__n8n__n8n_update_partial_workflow`. This is the thing you apply. |
| `generate-report.jsonBody.txt` | The rewritten expression, on its own, for pasting into the n8n UI by hand. |
| `report-prompt.node.json` | The `Report Prompt` Set node, standalone. |
| `torture-prompt.txt` | The verification prompt from the spec. Every character class that breaks the current node. |
| `verify.sh` | Drives a submit → verify round trip and prints the token so you can inspect the execution. |

`tests/nem/nem-verify-report-body.test.js` asserts that the first three agree with each
other byte-for-byte, so they cannot drift apart.

## What the change does

```
before:  Valid? ──true──▶ Respond Confirmed
                        ▶ Mark Consumed
                        ▶ Generate Report

after:   Valid? ──true──▶ Respond Confirmed        (unchanged — fast path)
                        ▶ Mark Consumed            (unchanged — fast path)
                        ▶ Report Prompt ──▶ Generate Report
```

Three edits:

1. **Add `Report Prompt`** — a Set node holding `systemPrompt` as a *fixed value*.
   n8n stores fixed values verbatim; `JSON.stringify` in the next node does all the
   escaping. Apostrophes, quotes, backslashes, newlines, curly quotes, em dashes all
   become safe.
2. **Rewire the `Valid?` true branch** so `Report Prompt` sits ahead of `Generate Report`.
   `Respond Confirmed` and `Mark Consumed` stay on the direct fan-out — if either ends up
   behind the report chain, the browser's 302 waits ~10–20s on a blank page.
3. **Rewrite `Generate Report.jsonBody`** — `system:` reads the Set node, `max_tokens`
   goes `1024 → 8000`, and `$json.*` becomes `$('Validate Token').first().json.*`
   (inserting a node upstream rebinds `$json`).

## Apply

```bash
# 0. Prove the change still holds together
node --test tests/nem/nem-verify-report-body.test.js     # expect 21 pass
```

1. **Refresh `N8N_API_KEY`**, then confirm: `mcp__n8n__n8n_get_workflow` on
   `uKkMgMYoH5nOLoCR` with `mode: "structure"` should return the node graph.

2. **Snapshot live and commit it verbatim** to `../../backend/nem-verify.workflow.json`.
   *This commit is the rollback point.* n8n has no version history for this workflow.

3. **Dry run:** send `partial-update.operations.json` through
   `mcp__n8n__n8n_update_partial_workflow` with `validateOnly: true`. Read the result.

4. **Apply** the same payload with `validateOnly` removed.

5. **Verify** (below).

6. Re-pull live → commit to `nem-verify.workflow.json`, and correct the stale README rows
   listed in the spec.

Doing it by hand in the n8n UI instead is fine — the three edits are small. If you paste
`generate-report.jsonBody.txt` into the UI, paste it **as-is**: the `\n` sequences are
single backslashes there because they sit inside a JS string literal. Inside
`partial-update.operations.json` the same sequences appear as `\\n` because that file is
JSON. Don't copy one into the other by hand; the test guards the pair.

## Verify

Install `torture-prompt.txt` as the `systemPrompt` value for the verification run, then:

```bash
./verify.sh                    # submit + verify round trip, prints the token
```

Then inspect the execution with `mcp__n8n__n8n_executions` (`action: "get"`,
`mode: "error"` if it failed). Pass criteria:

- `Report Prompt` → `parameters.assignments.assignments[0].value` does **not** start with `=`
- `Generate Report` has `status: "success"` — before the fix this node throws
- `Generate Report` output has `stop_reason: "end_turn"`, **not** `"max_tokens"`
- `Respond Confirmed` fires within ~1s of `Valid?` — the 302 does not wait on the report
- `Render PDF` returns a binary with `mimeType: application/pdf`, and the report body in
  the PDF ends in a complete sentence

Then swap the torture prompt back out for the stub (or Alex's real prompt, if it has landed).

### Two constraints on verification

**MailerSend is still on a trial account** (separate P0:
`nem-mailersend-trial-account-blocks-report-delivery`). A full run **will 422 at
`Send Report`** for any recipient MailerSend has not already seen — regardless of whether
this fix works. Use an already-seen recipient, or disable `Send Report` and assert only
through `Encode PDF`. **Do not read a `Send Report` 422 as a failure of this task.**

**Every run costs money.** `sandbox` was removed from PDFShift, so each run bills a
credit, and Anthropic tokens bill against Alex's key. Keep it to a handful of runs.

## Regression scope

- `Respond Confirmed` and `Mark Consumed` still fire directly off `Valid?`
- `Valid?` false → `Respond Invalid` → `/verlopen` untouched; a reused token still redirects there
- `/submit` (`LDI1eWR35lwX6WLp`) is not modified
- **Sequencing:** `nem-verify-report-email-and-pdf-branding` (P2) edits `Build HTML` and
  `Send Report` in this same workflow. Whichever lands second **must re-pull live before
  editing**. See `../../specs/nem-verify-report-email-and-pdf-branding.md`.
