# Changeset — nem-intro-line-plumbing

> ## ✅ APPLIED — do not apply again
>
> Confirmed against live on **2026-09-01**: `npm run check:nem-drift` reported both
> workflows IN SYNC with `introLine` in `Normalize`, `Store Profile` and `Build HTML`.
>
> `build-html.jsCode.js` and `normalize.jsCode.js` here are the record of what was
> applied, not the current node code — both nodes were edited again by
> `../nem-prompt-input-contract` (§7), which now owns the byte-identity tests for them.

**Spec:** `../../specs/nem-quiz-transition-guard-and-intro-line-plumbing.md` (Part C)
**Prepared:** 2026-08-19
**Applies to:** `/submit` (`LDI1eWR35lwX6WLp`) and `/verify` (`uKkMgMYoH5nOLoCR`)

## What

Plumbs `introLine` — the report's fixed editorial lead paragraph, selected client-side
from the conclusion key alone (no gender) — from the `/submit` payload through the
`nem_test_profiles` table into the `/verify` report HTML.

The client half is already live: the component has sent `introLine` in the `/submit`
payload since `3d30e60`. This changeset is the server half. The copy itself does not
exist yet (`NL_INTRO` / `EN_INTRO` are both `{}` until Alex's Intro lines tab is
exported), so after applying, the correct observed result is **no intro paragraph and no
gap** — that is a pass, not a skip. The copy drops in later with no further code change.

## Why a changeset, not a live edit

The n8n public API has no endpoint for adding a Data Table column (established
2026-08-18), and nothing here should touch a live active workflow unattended. Will
applies by hand; the repo snapshots in `../..` are already updated to match what live
will look like afterwards, so `npm run check:nem-drift` reports drift until the paste
happens and exits 0 once it has.

## Order to apply in

Before starting: `npm run check:nem-drift` — expect drift ONLY in `Normalize`,
`Store Profile` and `Build HTML`. Any other drift means live has moved since this
changeset was prepared: stop and re-snapshot first (`--write`), then rebuild this
changeset on top. n8n keeps no version history, so a stale snapshot is a broken
rollback point.

1. **Add the column** — n8n UI → Data Tables → `nem_test_profiles` (`ib5Yh0yEfNpDqeuU`)
   → add column `introLine`, type **string**. (UI only; the API cannot do this.)
2. **`/submit` → `Normalize`** — replace the node's code with `normalize.jsCode.js`
   (one added field; the rest is byte-identical to live).
3. **`/submit` → `Store Profile`** — in the column mapping add
   `introLine` = `{{ $json.introLine }}` (the entry in `store-profile.columns.json`).
   The schema entry lands automatically once the column exists; if editing raw JSON,
   the same file carries the schema object to insert.
4. **`/verify` → `Build HTML`** — replace the node's code with `build-html.jsCode.js`
   (three added lines: the `introLine` const, the `.intro` CSS rule, the conditional
   `<p class="intro">` between the `<h1>` and the greeting).
5. **Verify** — `./verify.sh` from this directory: exits 0 when live matches the
   committed snapshots and every invariant holds.

## Files

| File | Role |
|---|---|
| `normalize.jsCode.js` | Full replacement for `/submit` → `Normalize` |
| `store-profile.columns.json` | The added mapping entry + schema entry for `Store Profile` |
| `build-html.jsCode.js` | Full replacement for `/verify` → `Build HTML` |
| `verify.sh` | Asserts live matches the snapshots; exits 1 on drift |

These three node files are generated from the committed snapshots, and
`tests/nem/nem-build-html.test.js` asserts they stay byte-identical — edit the
snapshot, regenerate, never edit these by hand.

## Guarantees (asserted by `tests/nem/nem-build-html.test.js` and the drift invariants)

- The intro line renders as `<p class="intro">` between the `<h1>` and the greeting.
- It goes through `esc()` — Christel's prose contains `&` and quotes, like the sections.
- Empty, null, undefined or whitespace-only lines render **nothing**: no empty `<p>`,
  no stray margin. This is what lets the plumbing ship before the copy exists.
- `reportText` is untouched — it is the plain-text alternative built from the five
  model sections; the intro line is fixed editorial copy, not model output.
- Flat outcomes are unaffected: the client sends `''` when `result.skipsReport`, and
  an empty line renders nothing.
