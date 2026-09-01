# Changeset — nem-prompt-input-contract

**Spec:** `../../specs/nem-report-json-and-error-visibility.md` (§7)
**Prepared:** 2026-09-01
**Applies to:** `/submit` (`LDI1eWR35lwX6WLp`) and `/verify` (`uKkMgMYoH5nOLoCR`)
**Tests:** `tests/nem/nem-prompt-input-contract.test.js`, `tests/nem/nem-workflow-drift.test.js`

## What

Alex's system prompt reads three things from the user message that `/verify` never sent:
the intro line, the conclusion text the user already saw, and a gender spelled
`Female` / `Male`. It also assumes Dutch only, says the model does not calculate, and puts
the first name exactly once, inside `opening`. This changeset closes every one of those
gaps **before** the prompt is installed, so the install stays a single fixed-value edit.

| § | Change | Where |
|---|---|---|
| 7a | Send `Intro line:` in the user message | `Generate Report` |
| 7b | Send `Conclusion text:` — the component now sends it, `/submit` stores it | component, `Normalize`, `Store Profile`, `Generate Report` |
| 7c | Spell gender `Female` / `Male` in the message only; the stored value stays `vrouw` / `man` | `Generate Report` |
| 7d | Gate non-`nl` locales to `Log Failure` + alert; never call Anthropic | new `Locale Supported?` and `Unsupported Locale` nodes |
| 7e | Drop `Total score:` | `Generate Report` |
| 7f | Drop `Beste {firstName},` — the prompt owns the address | `Build HTML` |

The client half is in `src/nem-test-phase-b.tsx` and ships with the next Webflow paste of
`dist/nem-test-phase-b.webflow.tsx`. Until that paste, `conclusionText` arrives empty and
the message carries `Conclusion text: ` with nothing after it — harmless, and the prompt
is not installed yet anyway.

## Why a changeset, not a live edit

The n8n public API cannot add a Data Table column (established 2026-08-18), and nothing
here should touch a live active workflow unattended. Will applies by hand; the repo
snapshots in `../..` already match what live will look like afterwards, so
`npm run check:nem-drift` reports drift until the paste happens and exits 0 once it has.

## Order to apply in

Before starting: `npm run check:nem-drift` — expect drift ONLY in `Normalize`,
`Store Profile`, `Build HTML`, `Generate Report`, the two new nodes and the connections.
Any other drift means live has moved since this changeset was prepared: stop, re-snapshot
(`--write`), and rebuild this changeset on top. n8n keeps no version history, so a stale
snapshot is a broken rollback point.

### `/submit` first — the column must exist before `/verify` can read it

1. **Add the column** — n8n UI → Data Tables → `nem_test_profiles` (`ib5Yh0yEfNpDqeuU`)
   → add column `conclusionText`, type **string**. (UI only; the API cannot do this.)
2. **`Normalize`** — replace the node's code with `normalize.jsCode.js` (one added field
   plus its comment; the rest is byte-identical to live).
3. **`Store Profile`** — in the column mapping add `conclusionText` = `{{ $json.conclusionText }}`
   (the entry in `store-profile.columns.json`). The schema entry lands automatically once
   the column exists; if editing raw JSON, the same file carries the schema object.

### `/verify` — either by hand, or with the partial-update payload

By hand:

4. **Add `Locale Supported?`** — an IF node, `{{ $json.locale }}` string **equals** `nl`
   (`locale-supported.node.json` is the full node for reference).
5. **Add `Unsupported Locale`** — a Code node with `unsupported-locale.jsCode.js`.
6. **Rewire** — on `Valid?`'s true branch, replace the `Report Prompt` connection with
   `Locale Supported?`. **Leave `Respond Confirmed` and `Mark Consumed` where they are**,
   or the 302 starts waiting on the report chain. Then `Locale Supported?` true →
   `Report Prompt`, false → `Unsupported Locale` → `Log Failure`.
7. **`Generate Report`** — replace the JSON body with `generate-report.jsonBody.txt`. The
   field must stay in Expression mode (it starts with `=`).
8. **`Build HTML`** — replace the node's code with `build-html.jsCode.js`.

Or, steps 4–8 in one go: `partial-update.operations.json` is the payload for
`mcp__n8n__n8n_update_partial_workflow`. Run it with `validateOnly: true` first, read the
result, then apply for real. Node positions are cosmetic and ignored by the drift check.

9. **Verify** — `./verify.sh` from this directory: exits 0 when live matches the
   committed snapshots and every invariant holds.
10. **Prove the gate** — run one `locale: en` token through `/verify` and read the
    execution: `Unsupported Locale` → `Log Failure` → `Alert Failure`, no `Generate Report`
    run, a `nem_report_failures` row with reason `unsupported-locale`. Then one `vrouw`
    token: the `Generate Report` input shows `Gender: Female`, an `Intro line:` and a
    `Conclusion text:`, and no `Total score:`.

## Files

| File | Role |
|---|---|
| `normalize.jsCode.js` | Full replacement for `/submit` → `Normalize` |
| `store-profile.columns.json` | The added mapping entry + schema entry for `Store Profile` |
| `generate-report.jsonBody.txt` | Full replacement for `/verify` → `Generate Report` body |
| `build-html.jsCode.js` | Full replacement for `/verify` → `Build HTML` |
| `locale-supported.node.json` | The new `Locale Supported?` IF node |
| `unsupported-locale.jsCode.js` | The new `Unsupported Locale` Code node |
| `partial-update.operations.json` | Steps 4–8 as one `n8n_update_partial_workflow` payload |
| `verify.sh` | Asserts live matches the snapshots; exits 1 on drift |

Every node file is generated from the committed snapshots and
`tests/nem/nem-prompt-input-contract.test.js` asserts they stay byte-identical — edit the
snapshot, regenerate, never edit these by hand. This changeset supersedes
`nem-intro-line-plumbing`'s copies of `Build HTML` and `Normalize`.

## Guarantees (asserted by the unit tests and the drift invariants)

- The user message carries `Intro line:` and `Conclusion text:`, with paragraph breaks
  intact, and never `Total score:`. An older row with neither field still produces a
  well-formed message — no `undefined`.
- `vrouw` / `female` → `Gender: Female`; `man` / `male` → `Gender: Male`; anything else
  passes through unchanged. The stored value is untouched — `conclusionId` derives from it.
- The PDF has no `Beste …,` line; the intro line sits between the `<h1>` and `opening`.
- A non-`nl` token never reaches `Report Prompt` or `Generate Report`. It produces the
  exact failure record `Log Failure` and `Alert Failure` already map (`reason`, `detail`,
  `rawResponse: ''`, `executionId`, `failedAt`, plus the profile fields).
- `Respond Confirmed` and `Mark Consumed` stay on the `Valid?` fast path — the 302 is
  unaffected.
- The anonymous completion beacon does **not** carry `conclusionText`; gender is unknown
  at question 20, so there is nothing to send.

## Still not this changeset

- **Installing the prompt.** Waits on Alex marking the runtime page final, and on the
  defect list sent 2026-09-01 being applied to his Notion page.
- **Alex's two decisions** (spec §7): the relationship-status taxonomy, and whether flat
  outcomes get a report. Live behaviour is kept for both until he answers.
