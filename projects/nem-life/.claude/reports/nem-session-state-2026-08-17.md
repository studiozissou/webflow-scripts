# NEM Test — session state, 2026-08-17

Where the work got to, so it can be picked up cold.

**Branch:** `worktree-nem-conclusion-ids` (worktree at `.claude/worktrees/nem-conclusion-ids`)
**Not yet on `origin/main`:** 7 commits, `2063fce` … `304ca65`. PR #3 merged earlier work; these came after.
**Working tree:** clean, everything pushed.

---

## Done and verified

### Conclusion engine v2 — built, pasted, live on staging

All seven changes from the 2026-08-10 call (€480 excl. BTW, accepted):
directional dual keys, an 8/16 minimum score gate, `flat-low`/`flat-high` outcomes,
English keys, 54 unique IDs, debug mode, and the enriched submit payload.

| Layer | File | State |
|---|---|---|
| Keys + IDs + 54-row enumeration | `src/nem-test-conclusion-ids.js` | done, 19 tests |
| Scoring engine | `src/nem-test-scoring.js` | done, 42 tests, all 10 worked examples |
| Christel's copy | `src/nem-conclusion-texts.js` | generated, 27/108 written |
| Component | `src/nem-test-phase-b.tsx` | done, pasted into Webflow, published |
| Pasteable bundle | `dist/nem-test-phase-b.webflow.tsx` | generated, typechecks clean |

**127 unit tests pass** (`npm run test:nem`).

### The ID scheme: `01F-SR-FP`

Alex's text-set prefix plus a decodable body. Derived from the outcome, never from row
position, so reordering his sheet cannot silently remap an ID onto a different text.
All 54 are in his sheet — Will pasted them, and every `gender + key + ID` triple was
diffed against the generated set and matched exactly.

### The build chain — this is the important bit to understand

Everything in Webflow runs in **one** custom code component, so relative imports do not
resolve there. The repo keeps the modules separate (they cannot be unit-tested from
inside a `.tsx`) and generates the single pasteable file:

```
Alex's sheet → CSV export (committed) → build-conclusion-texts.js
            → nem-conclusion-texts.js ─┐
        nem-test-conclusion-ids.js ────┼→ build-component.js → dist/*.webflow.tsx
              nem-test-scoring.js ─────┤                        (paste this)
              nem-test-phase-b.tsx ────┘
```

`npm run build:nem` runs both generators **and** the typecheck. Never hand-edit the
generated file; never paste `nem-test-phase-b.tsx` directly.

**`npm run typecheck:nem`** exists because Webflow compiles the component with `tsc` and
refuses it on any error. The first paste produced 23 errors — all from plain-JS modules
being inlined into a TypeScript file, where `{}` infers as the empty type and `[]` as
`never[]`. Fixed at source, and the typecheck now gates every build. **TypeScript is
pinned to 5.x**: 7.x is the native port and does not expose the compiler API the comment
stripper uses.

### Christel's texts — 27 of 108

Female Dutch is complete and in the component with paragraph breaks intact. Male Dutch
and both English columns are unwritten and fall through to visible placeholders.

**Never copy-paste her copy, and never take it from a rendered Drive read** — both
flatten in-cell paragraph breaks into spaces. Use the CSV export path
(`download_file_content` with `exportMimeType: text/csv`, or File → Download → CSV).
The render also splits on blank lines into separate `<p>`s; without that the paragraphs
are preserved in the data and then collapsed by HTML.

---

## Open, in priority order

### 1. ~~MailerSend trial cap~~ — RESOLVED 2026-08-18

**Alex upgraded to a paid "Hobby" plan** (his email, 18 Aug 09:46: *"If I need to upgrade to
a higher package: just shoot."*) and it is **verified end-to-end**, not just taken on trust.

Probe run the same morning: one row inserted straight into `nem_test_profiles` with a fresh
token and a never-before-used recipient, then `GET /verify?token=…`. Execution **48** shows
all 14 nodes green including `Send Report`, and the report email arrived at 10:14:42Z. Probe
row deleted afterwards. This is the check that matters, because the cap was on unique
*recipients* — retesting with a known address would have passed even while broken.

Previously: exec 45 (13 Aug) 422'd with `#MS42225` after producing a real PDF; only delivery
failed. Credential `699carSHScI1ng0W`, sending from `hallo@nemmatters.com`.

**Still outstanding, unrelated:** Will's own pre-handover MailerSend trial token
`nem-test-pdf-delivery` is Active, All-domains, until Dec 2027 and should be revoked.

**Watch instead:** the Hobby plan has a monthly send quota rather than a recipient cap. If it
is ever hit, reports *and* the failure alerts ride the same account and go quiet together.

### 2. jsDelivr is refusing to serve this repo — affects every client

```
GET cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@<sha>/…
→ 403  "Package size exceeded the configured limit of 50 MB."
```

The repo is **672 MB**. `projects/nem-life` alone is 155 MB: 93 MB `audit/`, 37 MB
`designs/`, 21 MB `debug/`, all tracked. Actual source is 176 KB.

Every Webflow site in this monorepo that loads JS from jsDelivr is silently broken. Found
via the NEM staging console (`init.js` refused, served as `text/plain`). **Not** a NEM
Test problem and unrelated to the component — but the most serious thing found today.
Needs a decision on where the binary assets should live; note jsDelivr sizes the whole
package, so history matters, not just HEAD.

### 3. Acceptance suite — 11 passed, 5 flaky, 4 failed

First real browser verification. The engine works: correct IDs in the debug badge, flat
routing, contact link.

The original run failed all 20 in one shared helper — `reachConclusion` clicked a start
button that does not exist on the live page (question 1 renders immediately). Fixed in
`304ca65`. The suite had been written from the spec on 10 Aug and never run.

**Still undiagnosed, needs one clean run with output captured properly** (I truncated my
own log with `tail`):
- `flat-high and flat-low render different copy`
- `debug badge is hidden from assistive technology`
- `English locale renders a non-empty conclusion`

Run serially — staging times out under parallel workers:
```
npx playwright test --config=tests/acceptance/playwright.config.js \
  tests/acceptance/nem-test-conclusion-logic-v2.spec.js --workers=1 --timeout=180000
```

### 4. Notion source doc — we cannot read it

Alex declared *NEM TEST 01 Waarom reageer ik zo? — source* authoritative over every
earlier email on 17 Aug: "if it contradicts an email, the doc wins". It 404s for us —
his workspace. Every spec is therefore written from a source he has explicitly demoted.
Queued as P0 blocked. **Ask on Monday.**

### 5. Not started — the 17 Aug email work

Specced in `nem-report-json-and-error-visibility.md`, six queue tasks:

- **JSON contract** — five keys (`opening`, `reaction`, `origin`, `cost`, `closing`),
  plain Dutch, no formatting. A `Parse Report` node rejects four failure modes.
  Deliberately no self-repair pass.
- **Error visibility** — Alex's direct request. Log every failure to a Data Table, email
  him. Note the alert shares the same MailerSend account the reports go out on — no longer
  capped, but still a shared point of failure if the plan quota is hit.
- **Anonymous completion logging** — Will's steer, improved mid-session from flat-only to
  **every** completion, fired at question 20. `outcome` and `conclusionKey` are available
  there; `conclusionId` is not, because its gender segment comes from the profile screen
  that follows. Two rows per user joined on `token`. Confirm the profiles table's email
  column is nullable first.
- **Intro lines** — 25, key-only lookup, **not** gender-specific. That asymmetry against
  the conclusion texts is the easiest thing to get wrong. 25 not 26; both flat outcomes
  route to contact.
- **Webflow report template** — structure and slots for Alex to style. Tell him it is a
  design surface, not the runtime: it gets exported to HTML/CSS into n8n.

### 6. Superseded — do not build

**Defect 1 in `nem-verify-report-email-and-pdf-branding` (the markdown converter).**
Alex's JSON restructure removes the problem by construction. The branding work itself
still stands, but land the JSON contract first — both rewrite `Build HTML`, and there is
no n8n version history to recover from, so whichever is second must re-pull live.

---

## Emails

**Drafted, unsent, in Gmail:**
- Reply to Alex's 17 Aug message (threaded): answers the malformed-JSON question, asks
  for Notion access, reports the live engine, the 54 IDs, Christel's texts and debug mode,
  and flags MailerSend.
- **An earlier draft in the same thread is superseded and should be deleted.**

## Rollback

`projects/nem-life/rollback/` holds the live Webflow component captured before the paste,
plus the pre-v2 repo version. The live one had drifted from the repo, so git history was
not a rollback point for it.

## Debug mode

`?nemdebug=1` on the test URL renders ID, key and scores above the conclusion. Absent
from the DOM entirely when off. This is what lets Alex and Christel check variants
themselves.
