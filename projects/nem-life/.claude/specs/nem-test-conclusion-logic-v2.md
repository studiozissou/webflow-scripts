# Spec: nem-test-conclusion-logic-v2

**Client:** NEM Life
**Slug:** `nem-test-conclusion-logic-v2`
**Created:** 2026-08-10
**Status:** Ready to Build
**Supersedes (in part):** `nem-test-phase-b` — the "Conclusion key ordering (canonical, resolved 2026-07-14)" decision is **reversed** by this spec.

**Sources**
- Call: *Alex & Christel / Will Morley — 30min*, 2026-08-10 ([Notion](https://app.notion.com/p/studiozissou/Alex-amp-Christel-Will-Morley-30min-Meeting-3b8e1848bb5181c4aaf1fff0dbbf3be8))
- Email: *RE: NEM TEST — a few proposed changes to the conclusion screen*, Will → Alex, 2026-08-06
- Sheet: [conclusion text template](https://docs.google.com/spreadsheets/d/1QAMqUNL9lqjM-I1CtUdVmInf2TXMO08-BLhYek5qf6w/edit?gid=2092861656) (Alex's revised template, NL + EN parallel columns)

---

## Summary

Seven changes to the NEM Test conclusion engine, agreed on the 2026-08-10 call and priced at €480 excl. BTW (4h, accepted by Alex on the call):

1. **Directional dual texts** — dual conclusion keys become order-dependent (`leading_following`), growing the table from 15 to 27 keys per gender.
2. **Minimum score gate** — a mechanism cannot be named unless it scores ≥ 8/16. Applies to primary *and* secondary.
3. **Flat-low outcome** — nothing clears the threshold → "not much stands out" text + contact link.
4. **Flat-high outcome** — everything is elevated and undifferentiated → "several things at once" text + contact link, **report skipped**.
5. **English keys everywhere** — mechanism keys, conclusion keys and backend node names move from Dutch to English for future handoff.
6. **Unique conclusion IDs** — every one of the 54 conclusion rows gets a short decodable code (`01F-SR-FP`) so Alex can direct Christel to a specific text.
7. **Debug mode** — a toggle that renders the conclusion ID + key next to the text, so a human tester can instantly verify which variant fired.

---

## Background

### Current state (as of 2026-08-10)

The Phase B component is feature-complete and the backend runs end-to-end on test accounts. The conclusion engine lives in two files:

- `projects/nem-life/src/nem-test-scoring.js` — pure scoring engine, `calculateScores()` + `conclusionKeyFor()`
- `projects/nem-life/src/nem-test-phase-b.tsx` — React component, holds the conclusion text tables and renders Screen 4

> **✅ Build prerequisite cleared 2026-08-17.** `projects/nem-life/src/nem-test-scoring.js`, `tests/nem/nem-test-scoring.test.js` and `nem-test-phase-b.tsx` were untracked when this spec was written; they were committed in `378f9e9` and are on `main`. The baseline exists — the queued task `nem-test-commit-scoring-engine-baseline` is done.

### What this changes vs Phase B

| Area | Phase B (now) | This spec |
|---|---|---|
| Dual keys | 10 unordered pairs, canonicalised | 20 directional pairs |
| Keys per gender | 15 | 27 (5 single + 20 dual + 2 generic) |
| Total texts | 30 (NL only, 2 genders) | 108 (2 genders × 2 languages × 27) |
| Minimum score | none | 8/16 for primary and secondary |
| Flat profiles | not detected | `flat-low` and `flat-high` |
| Tiebreak | body + situational questions | fixed mechanism order |
| Key language | Dutch | English |
| Conclusion IDs | none | 54 unique codes |
| Debug mode | `const DEBUG = false` (unused) | renders ID + key + scores |
| Outcome → report | primary/secondary only | + `outcome`, `conclusionKey`, `conclusionId` |

---

## Design

### 1. English key migration

Mechanism identifiers move to English. **Stored data is not migrated** — the n8n data table holds one sample row and test records only, so historic values stay Dutch (decision: 2026-08-10).

| Dutch (current) | English (new) | Conclusion key | ID code |
|---|---|---|---|
| `zelfafwijzing` | `selfRejection` | `self-rejection` | `SR` |
| `emotioneleVerdoving` | `emotionalNumbing` | `emotional-numbing` | `EM` |
| `valseMacht` | `falsePower` | `false-power` | `FP` |
| `angst` | `fear` | `fear` | `FR` |
| `valseHoop` | `falseHope` | `false-hope` | `FH` |

Generic outcome keys: `geen-uitkomst` → `flat-low`, `meervoudig` → `flat-high`.

**Question numbering does not change.** `MECHANISM_MAP` question indices, `bodyQ` and `situationalQ` stay exactly as they are — only the object keys are renamed. The Dutch mechanism *names* remain in the user-facing NL copy; this is a code-identifier change only.

### 2. Conclusion key scheme (directional)

```
single    self-rejection
dual      self-rejection_false-power      (leading first, following second)
dual      false-power_self-rejection      (a DIFFERENT text)
generic   flat-low
generic   flat-high
```

`conclusionKeyFor(primary, secondary)` **stops canonicalising**. It returns `${primary}_${secondary}` in leading-then-following order. The 14 Jul canonical-ordering fix is deliberately reversed: it existed because the table only held 10 unordered pairs, and the table now holds all 20.

> The original bug that the canonical fix solved — a key that misses the table renders a **blank** conclusion — is still live as a risk. The guard is now a completeness test asserting all 27 keys exist in every table, rather than key rewriting.

### 3. Conclusion IDs

**Revised 2026-08-17.** Alex had already built his sheet with his own ID column
(`01-03F` — text set, sequential row, gender) before this spec's scheme was applied.
The format below merges the two: his text-set prefix, this spec's decodable body.

Format: `{SET}{GENDER}-{MECH}[-{MECH}]`, or `{SET}{GENDER}-LOW|HIGH` for flat outcomes.

```
01F-FR          vrouw   single    fear
01F-SR-FP       vrouw   dual      self-rejection → false-power
01F-FP-SR       vrouw   dual      false-power → self-rejection
01F-LOW         vrouw   flat      flat-low
01F-HIGH        vrouw   flat      flat-high
01M-SR          man     single    self-rejection
```

- Text set: `01` — Alex's current sheet is `NEM_TEST_01_Default_texts`. The prefix
  leaves room for alternate text sets later without renumbering anything.
- Gender: `F` (vrouw), `M` (man)
- Mechanism: `SR`, `EM`, `FP`, `FR`, `FH`

**The type segment is gone.** An earlier draft of this spec used `{GENDER}-{TYPE}-…`
(`F-D-SR-FP`). Type is inferable from how many mechanisms the ID names — none is flat,
one is single, two is dual — so the segment carried no information. Dropping it pays
for the `01` prefix and keeps the ID the same length as before.

**Mechanism codes are two letters throughout,** including `FR` for fear. A single-letter
`F` would collide with the `F` gender segment when read by eye. A test pins this.

#### Why not simply adopt Alex's `01-03F`?

His is positional. Insert or reorder a row and every ID below it shifts, silently
remapping onto different texts — and there is no way to detect that from the ID alone.
His is also opaque: `01-03F` cannot be read without the sheet open, which costs whenever
an ID travels without the sheet (a Slack message, a support email, a bug report).
This format is derived from the outcome, so reordering the sheet cannot remap anything,
and it reads on its own.

The one thing his format has that this does not is a sequential row number, so
"row 14" no longer reads off the ID. The sheet has native row numbers for that.

#### Generation

54 IDs total: 2 genders × (2 + 5 + 20). Derived programmatically by
`conclusionIdFor(gender, { outcome, primary, secondary }, textSet)` in
`projects/nem-life/src/nem-test-conclusion-ids.js` — never hand-maintained, so the
sheet and the code cannot drift.

`node tools/nem/generate-conclusion-ids.js` writes all 54 rows to
`projects/nem-life/.claude/research/nem-conclusion-ids.csv` in Alex's sheet row order,
so the `key` and `ID` columns paste in line for line. The generated `key` column was
diffed against the sheet's own key column on 2026-08-17 and is identical row for row.

The CSV is also published as a Google Sheet in Will's Drive, **`NEM_TEST_01_Conclusion_IDs`**
([link](https://docs.google.com/spreadsheets/d/1vIfnZqCCcJ7goaIBsm0MYasTs85CRZcPns5ArOcqGVA/edit)),
created 2026-08-17. Not yet shared with Alex.

> **Alex's own sheet was not modified, and cannot be from here.** The Drive integration
> exposes create, copy, read, share and *metadata* update only — there is no cell or
> range write. Regenerating his sheet wholesale was rejected: it holds Christel's 27
> finished Dutch texts, and the read path flattens in-cell paragraph breaks to spaces,
> so a round-trip would silently destroy her paragraphing. The ID column has to be
> pasted into his sheet by hand, by him or by Will.

The same module owns `conclusionKeyFor`, so the keys the component looks up at runtime
and the keys Christel writes against are produced by one function.

### 4. Scoring algorithm v2

Constants:

```js
const MIN_MECHANISM_SCORE = 8;  // out of 16 — average of "soms"
const SECONDARY_GAP       = 3;  // unchanged from Phase B
const FLAT_SPREAD         = 3;  // max - min
```

Evaluation order (**order matters** — flat-low is checked before flat-high):

```
sorted = mechanisms sorted by score DESC, ties broken by TIEBREAK_ORDER index ASC
max = sorted[0].score
min = sorted[4].score

1. if (max < MIN_MECHANISM_SCORE)
       → outcome 'flat-low',  primary null, secondary null, key 'flat-low'

2. else if (min >= MIN_MECHANISM_SCORE && (max - min) <= FLAT_SPREAD)
       → outcome 'flat-high', primary null, secondary null, key 'flat-high'

3. else
       primary   = sorted[0].mechanism
       secondary = sorted[1].mechanism  IF sorted[1].score >= MIN_MECHANISM_SCORE
                                        AND (max - sorted[1].score) <= SECONDARY_GAP
                                        ELSE null
       outcome   = secondary ? 'dual' : 'single'
       key       = secondary ? `${primary}_${secondary}` : primary
```

Worked examples (the acceptance criteria for the unit tests):

| Scores (SR, EM, FP, FR, FH) | Outcome | Key |
|---|---|---|
| 3, 0, 0, 0, 0 | `flat-low` | `flat-low` |
| 7, 7, 7, 7, 7 | `flat-low` | `flat-low` |
| 16, 16, 16, 16, 16 | `flat-high` | `flat-high` |
| 14, 13, 12, 12, 11 | `flat-high` | `flat-high` |
| 8, 8, 8, 8, 8 | `flat-high` | `flat-high` |
| 14, 11, 4, 2, 1 | `dual` | `self-rejection_emotional-numbing` |
| 14, 6, 4, 2, 1 | `single` | `self-rejection` |
| 14, 10, 4, 2, 1 | `single` | `self-rejection` (gap 4 > 3) |
| 9, 8, 3, 2, 1 | `dual` | `self-rejection_emotional-numbing` |
| 16, 15, 14, 3, 2 | `dual` | `self-rejection_emotional-numbing` (min 2 → not flat) |

Boundary notes worth stating explicitly, because they are the cases most likely to be argued later:
- `7,7,7,7,7` is flat-low, not flat-high — max is below the naming threshold.
- `8,8,8,8,8` is flat-high — everything clears the threshold and spread is 0.
- `16,15,14,3,2` is **not** flat despite three high scores, because `min` is 2. Flat means *undifferentiated*, not *several high*.

### 5. Tiebreak — fixed order

Email item 2 (agreed): Christel's fixed order **replaces** the body + situational tiebreak.

```js
const TIEBREAK_ORDER = ['selfRejection', 'emotionalNumbing', 'falsePower', 'fear', 'falseHope'];
```

This matches the existing `MECHANISM_MAP` declaration order.

> **✅ Confirmed 2026-08-17 (Will): the order above is Christel's.** It is a clinical
> judgement, not an inference, and needs no further validation. Still worth mentioning
> to Alex in passing so he knows it is baked in.
>
> **But the justification written here was wrong.** This spec claimed the order also
> matches the row order of Alex's sheet. It does not: the sheet
> (`NEM_TEST_01_Default_texts`, read 2026-08-17) lists mechanisms as
> **fear → self-rejection → false-hope → false-power → emotional-numbing**. The order is
> right; the reason given for it was not. Do not "correct" `TIEBREAK_ORDER` to match the
> sheet — they are different things.
>
> The sheet row order lives separately as `SHEET_ORDER` in `nem-test-conclusion-ids.js`
> and drives row order in the generated ID CSV only.

`bodyQ` and `situationalQ` stay in `MECHANISM_MAP` — they are still referenced by the report prompt and may return as a second-level rule. They are simply no longer used for tiebreaking.

### 6. Screen 4 routing

| Outcome | Renders | Onward |
|---|---|---|
| `single` / `dual` | conclusion text + bridge line | CTA → Screen 5 opt-in → report (unchanged) |
| `flat-low` | `flat-low` text + contact link | **no opt-in, no report** |
| `flat-high` | `flat-high` text + contact link | **no opt-in, no report** |

Decision (2026-08-10 call): flat-high routes to contact instead of a report — *"to take someone very seriously, it is important that they make contact."* Flat-low gets the same treatment so it is not a dead end (email item 3).

Contact link is a plain anchor to the existing contact page — **not** an embedded form. A dedicated form for this case is a future nice-to-have (call, explicit).

New component props, editable per locale in Designer:

| Prop | NL default | EN default |
|---|---|---|
| `contactUrl` | `/contact` | `/en/contact` |
| `contactLinkLabel` | "Neem contact met ons op" | "Get in touch" |

> **⚠️ Verify the contact URLs** against the live site before build — they are assumed, not confirmed.

### 7. Debug mode

Activated by **either**:
- component prop `debugMode` (boolean, default `false`), or
- URL query param `?nemdebug=1`

The query param is what makes this usable — Alex and Christel can toggle it on the live staging page without Designer access, and Playwright can drive it.

When active, a monospace badge renders directly above the conclusion text:

```
01F-SR-FP · self-rejection_false-power · SR 14 EM 11 FP 4 FR 2 FH 1 · dual
```

Marked `data-element="conclusion-debug"` and `aria-hidden="true"` (it is QA scaffolding, not content). Absent from the DOM entirely when debug is off — not merely hidden, so it can never leak to a real user via CSS.

The existing unused `const DEBUG = false` at `nem-test-phase-b.tsx:37` is replaced by this.

### 8. Passing the outcome to the report engine

Email item 4 (agreed). The submit payload gains three fields:

```js
outcome:       'single' | 'dual' | 'flat-low' | 'flat-high',
conclusionKey: 'self-rejection_false-power',
conclusionId:  '01F-SR-FP',
```

Backend changes:
- `nem-submit.workflow.json` — Normalize node passes the three new fields; Store Profile maps three new data-table columns.
- `nem_test_profiles.csv` — header + sample row updated to match.
- `nem-verify.workflow.json` — Generate Report node includes `conclusionKey` and `outcome` in the prompt so the report reflects the same outcome the user saw on screen.
- **Manual step:** the three columns must be added to the `nem_test_profiles` data table in the n8n UI before the workflow import. n8n will not create them.

> **Known consequence — flag to Alex.** Because flat-low and flat-high skip the opt-in, those outcomes never reach the backend, so they generate no stored rows. Alex asked on the call to *"monitor score patterns over time"* — under this design flat outcomes are invisible in that data. Options for later: an anonymous beacon submit (no name/email) for flat outcomes, or a client-side analytics event. **Not in this scope** — raise it with Alex.

### 9. Spreadsheet deliverable

Alex is waiting on Will's go-ahead before he and Christel fill in the text (call action item). Deliverable: the same 54 rows with the `key` column translated to English and the `ID` column populated.

Generated to `projects/nem-life/.claude/research/nem-conclusion-ids.csv` by a small script so it is derived from the same code that builds the keys at runtime — the sheet and the component cannot disagree.

> **⚠️ Do not edit Alex's Google Sheet directly.** It is a shared document. Generate the CSV, then confirm with Will how it reaches Alex (paste, import, or a new sheet).

---

## Files affected

| File | Change |
|---|---|
| `projects/nem-life/src/nem-test-conclusion-ids.js` | **Done 2026-08-17** — keys, IDs and the 54-row enumeration. Owns `conclusionKeyFor()` and `conclusionIdFor()` |
| `tests/nem/nem-conclusion-ids.test.js` | **Done 2026-08-17** — 17 tests over the key/ID scheme |
| `tools/nem/generate-conclusion-ids.js` | **Done 2026-08-17** — writes the 54-row CSV for Alex |
| `projects/nem-life/src/nem-test-scoring.js` | Rewrite — English keys, min-score gate, flat detection, fixed-order tiebreak. Imports keys/IDs from `nem-test-conclusion-ids.js` rather than redefining them |
| `projects/nem-life/src/nem-test-phase-b.tsx` | 27-key × 2-gender × 2-locale tables, flat routing, contact link, debug badge, payload fields |
| `tests/nem/nem-test-scoring.test.js` | Invert canonical-key tests → directional; add flat, min-score, tiebreak, ID and completeness cases |
| `tests/acceptance/nem-test-conclusion-logic-v2.spec.js` | New — Tier 1 acceptance |
| `projects/nem-life/.claude/backend/nem-submit.workflow.json` | 3 new payload fields + data-table columns |
| `projects/nem-life/.claude/backend/nem-verify.workflow.json` | Pass outcome + conclusionKey to report prompt |
| `projects/nem-life/.claude/backend/nem_test_profiles.csv` | Header + sample row |
| `projects/nem-life/.claude/specs/nem-test-phase-b.md` | Mark the canonical-key decision superseded; update the conclusion-key table |
| `projects/nem-life/.claude/research/nem-conclusion-ids.csv` | **Done 2026-08-17** — generated 54-row sheet, key column verified against Alex's sheet |
| `tests/registry.json` | Register acceptance test |
| `.claude/queue.json` | Task entries |

---

## Amendment — 2026-08-17 (Alex's 12 & 17 Aug emails)

Two changes land on top of this spec. Both are specced in full in
`nem-report-json-and-error-visibility.md`; recorded here because they change what this
engine feeds and what the component does.

### Flat outcomes must now log

As built, a flat outcome renders the contact link and **sends nothing at all** —
`handleSubmit` never runs, so there is no record that the test was taken. Alex therefore
cannot see how often flat profiles occur, which is exactly the number needed to judge
whether `MIN_MECHANISM_SCORE` and `FLAT_SPREAD` are set sensibly.

**Decision (Will, 2026-08-17): fire an anonymous beacon when a flat conclusion renders.**
Scores, outcome, `conclusionId`, and the profile fields already collected — but
`firstName: null`, `email: null`, and `reportSkipped: true`. No opt-in screen, nothing extra
asked of the user.

This does **not** change the routing decision from the 10 Aug call: flat outcomes still skip
the report and still go to the contact link. Only the silence changes.

### Intro lines join the client-side lookup

25 fixed lines (5 single + 20 directional duals), selected client-side like the conclusion
texts. **Looked up on key alone — they are not gender-specific.** That asymmetry against the
conclusion texts (key + gender) is the easiest thing here to get wrong.

25, not 26: Alex asked whether flat-high should get one since it "does receive a report". It
does not — this spec routes both flat outcomes to contact. Confirmed with him 13 Aug. If the
new Notion source doc says otherwise, that is a contradiction to flag rather than implement.

### Source of truth moved

Alex has made the Notion doc *NEM TEST 01 Waarom reageer ik zo? — source* authoritative over
all earlier emails. **We do not have access to it** (404 — it is in his workspace). Until
that is fixed, this spec and its siblings are written from the email thread, which Alex has
explicitly demoted. Get access before building anything downstream of it.

---

## Build Plan — remaining work (2026-08-17)

Planned mid-build, after the pure-logic layer landed. This section is the ordered
remainder; everything marked **Done** above is finished and green.

### State

| Layer | Status |
|---|---|
| Keys, IDs, 54-row enumeration | ✅ Done — 19 tests |
| Scoring engine v2 | ✅ Done — 42 tests, all 10 worked examples |
| Component (`nem-test-phase-b.tsx`) | 🟡 Edited, **unverified** |
| Acceptance test | 🔴 Written, but 4 assertions use the superseded ID grammar |
| Backend (2 workflows + CSV) | 🔴 Not started |
| Christel's copy | ⛔ Blocked on a faithful export — not ours to write |

### Ordered tasks

| # | Task | Agent | Depends on | Parallel? |
|---|---|---|---|---|
| 1 | Verify the component edits — typecheck, imports resolve, no stale Dutch identifiers | qa | — | — |
| 2 | Update the 4 stale ID assertions to the `01F-SR-FP` grammar | code-writer | — | ∥ with 1 |
| 3 | Backend: 3 payload fields through `nem-submit`, plus data-table columns | code-writer | 1 | ∥ with 4 |
| 4 | Backend: `nem-verify` passes `outcome` + `conclusionKey` to the report prompt | code-writer | 1 | ∥ with 3 |
| 5 | `nem_test_profiles.csv` header + sample row | code-writer | 3 | — |
| 6 | Mark the canonical-key decision superseded in `nem-test-phase-b.md` | pm | — | ∥ with all |
| 7 | Code review + full test run | code-reviewer, qa | 1–6 | — |

### Parallelisation map

- **Stream A (logic):** tasks 1, 2 — local, no network, fast.
- **Stream B (backend):** tasks 3, 4, 5 — all touch n8n. **Serialise against each other
  in n8n itself**: both workflows must be re-pulled live before editing, because
  `nem-report-prompt-escaping` already edited `nem-verify` and there is no version
  history to recover from.
- **Stream C (docs):** task 6 — independent of everything.
- Worktrees: not needed. Agent teams: not needed — the work is small and the
  serialisation constraint is in n8n, not in the repo.

### Blockers carried into the build

1. **Christel's copy cannot be loaded from the Drive read path** — it flattens in-cell
   paragraph breaks to spaces. The component ships with placeholders in the `REAL_*`
   overlays until a faithful CSV export exists. Not a code blocker; a content one.
2. **The n8n API key expiry** — the key was refreshed for the 13 Aug prompt fix. Confirm
   it is still valid before starting tasks 3–5, or they will fail at the first pull.
3. **Contact URLs are assumed**, not confirmed: `/contact` and `/en/contact`. Verify
   against the live site before sign-off.
4. **`TIEBREAK_ORDER` is inferred** — see § 5. Does not block the build.

### Deliberately out of scope

- Writing any conclusion copy. That is Christel's, and the sheet is the source of truth.
- A dedicated contact form for flat outcomes — the call agreed a plain anchor, with a
  form as a future nice-to-have.
- Migrating stored Dutch mechanism values in the data table (decision: 2026-08-10).

---

## Task breakdown

| # | Task | Agent | Depends on |
|---|---|---|---|
| 1 | Commit the untracked scoring engine + unit test baseline | — | — |
| 2 | Rewrite `nem-test-scoring.js` (keys, directional, flat, IDs, tiebreak) | code-writer | 1 |
| 3 | Rewrite `nem-test-scoring.test.js` — TDD, write first | code-writer | 1 |
| 4 | Generate `nem-conclusion-ids.csv` (54 rows) | code-writer | 2 |
| 5 | Component: 108-text tables + English keys | code-writer | 2 |
| 6 | Component: flat routing + contact link props | code-writer | 5 |
| 7 | Component: debug badge + `?nemdebug=1` | code-writer | 5 |
| 8 | Component: payload gains outcome/key/id | code-writer | 5 |
| 9 | Backend: submit workflow + CSV columns | code-writer | — |
| 10 | Backend: verify workflow passes outcome to prompt | code-writer | 9 |
| 11 | Acceptance tests | qa | 6, 7 |
| 12 | Update `nem-test-phase-b.md` superseded sections | pm | 2 |
| 13 | Code review | code-reviewer | 2–10 |

### Parallelisation Map

**Sequential gate:** Task 1 (commit baseline) blocks everything. Task 3 (tests) then Task 2 (implementation) — TDD order, per global CLAUDE.md.

| Stream | Tasks | Agent | Est. time | Est. tokens |
|---|---|---|---|---|
| A — Scoring core | 3 → 2 → 4 | code-writer | 45 min | ~40k |
| B — Component | 5 → 6, 7, 8 | code-writer | 60 min | ~70k |
| C — Backend | 9 → 10 | code-writer | 25 min | ~25k |
| D — Docs/sheet | 12 | pm | 10 min | ~10k |

- **A gates B** — the component imports the scoring module's exports.
- **C and D are fully independent** — can run alongside A from the start.
- **Recommendation:** run C and D in parallel with A; run B after A completes; then 11 and 13 sequentially.
- **Worktrees:** yes — C touches only `.claude/backend/`, A and B touch only `src/`. No file overlap.
- **Agent teams:** not warranted. Four streams with one real dependency edge; a single executor working A → B with C interleaved is simpler than coordinating a team.

---

## Barba Impact

**N/A — no Barba transitions.** The NEM Life site does not use Barba.js. The NEM Test is a self-contained React component mounted on a single Webflow page; there is no SPA navigation, no `data-barba` container, and no cross-page state to preserve. Component state resets naturally on a full page load.

---

## Verify Loop

### Pass/fail criteria

**Scoring engine** (`node --test`, no browser):
1. All 10 worked examples in §4 return the exact documented `outcome` and `conclusionKey`.
2. Every ordered `(primary, secondary)` pair produces a distinct key — 20 dual keys, no collisions.
3. `conclusionKeyFor('selfRejection','falsePower') !== conclusionKeyFor('falsePower','selfRejection')` — the directional assertion, inverting the old canonical test.
4. `conclusionIdFor()` returns all 54 IDs, all unique, matching the format in §3.
5. **Completeness:** every one of the 27 keys exists in all four text tables (NL/EN × man/vrouw). This is the guard against blank conclusions.
6. Ties resolve by `TIEBREAK_ORDER`, not by body + situational.

**Component** (Playwright against staging):
7. A dual profile renders non-empty `[data-element="conclusion-text"]` and a CTA to the opt-in.
8. A flat-low profile (all answers "nooit") renders the flat-low text, a contact link, and **no** opt-in CTA.
9. A flat-high profile (all answers "heel vaak") renders the flat-high text, a contact link, and **no** opt-in CTA.
10. `?nemdebug=1` renders `[data-element="conclusion-debug"]` containing a well-formed ID; without the param the element is **absent from the DOM**.
11. No console errors on any of the above.
12. Conclusion text differs between `gender=man` and `gender=vrouw` for the same answers.

### Reproduction steps

- Page: `https://nem-life-1.webflow.io/zelftesten/waarom-reageer-ik-zo` (NL), `/en/zelftesten/waarom-reageer-ik-zo` (EN)
  > ⚠️ `tests/registry.json` records this page as `/zelftest/...` while `tests/acceptance/nem-test-phase-b.spec.js` uses `/zelftesten/...`. Confirm which is live and fix the stale one during the build.
- Start → answer all 20 questions → profile screen (gender + age + relationship) → conclusion.
- Flat-low: every question "nooit". Flat-high: every question "heel vaak". Dual: use the worked example in §4.
- Waits: 1–2s after the profile submit for the React state transition; no GSAP on this screen.

### Tier mapping

**Tier 1 — Auto, local (`/build`, `/debug`)**
- `tests/nem/nem-conclusion-ids.test.js` via `node --test` — the key and ID scheme. 17 tests, passing as of 2026-08-17.
- `tests/nem/nem-test-scoring.test.js` via `node --test` — criteria 1–6. Runs with no network, no staging, no deploy. This is where the real coverage lives.
- `tests/acceptance/nem-test-conclusion-logic-v2.spec.js` — criteria 7–12, against staging.

**Tier 2 — Auto, CDN regression (`/deploy`)**
- Registered in `tests/registry.json` as `nem-test-conclusion-logic-v2`.
- Existing `nem-test-phase-b` acceptance suite **must** re-run — this spec changes its assumptions and some of its assertions will legitimately need updating.

**Tier 3 — Manual**
- **Dutch and English conclusion copy reads correctly for each gender** — 108 texts; correctness is editorial, and only Alex and Christel can judge it. Automation can only prove a text is present and non-empty.
- **Full end-to-end email delivery** — depends on live n8n + MailerSend + a real inbox. Also carries the outstanding pre-holiday blocker in the mail-sending platform, which must be retested independently (separate action item from the call).
- **Report content reflects the outcome** — requires an Anthropic API call and human reading of the generated PDF.
- **Cross-browser (Safari, Firefox)** — Playwright runs Chromium only here.

### Regression scope

Must not break:
- The 20-question flow, profile screen, opt-in and confirmation screens — untouched, but the conclusion sits between them.
- The existing `nem-test-phase-b` acceptance suite (expect deliberate, reviewed updates — not silent failures).
- Locale detection and the NL/EN split.
- The submit webhook contract — fields are **added**, never renamed or removed, so an un-updated n8n workflow keeps working.
- Honeypot, rate limiting and token generation — untouched.

---

## Open questions

1. **Christel's tiebreak order** — inferred from sheet row order. Confirm with Alex. Non-blocking.
2. **Contact page URLs** — `/contact` and `/en/contact` assumed. Verify before build.
3. **Flat outcomes are invisible in the data** — flat-low/high never submit, so they generate no rows. Raise with Alex given his interest in monitoring score patterns.
4. **Sheet delivery** — how the updated 54-row CSV reaches Alex. Will's call.
5. **Test page path** — `/zelftest/` vs `/zelftesten/` discrepancy between registry and existing spec file.

## Acceptance Tests

See `tests/acceptance/nem-test-conclusion-logic-v2.spec.js`:

- `renders a non-empty conclusion for a dual profile`
- `dual profile shows the opt-in CTA`
- `flat-low profile shows contact link and no opt-in CTA`
- `flat-high profile shows contact link and no opt-in CTA`
- `debug badge is absent from the DOM without the query param`
- `debug badge renders a well-formed conclusion ID with ?nemdebug=1`
- `conclusion text differs between man and vrouw for identical answers`
- `English locale renders an English conclusion`
- `no console errors through the full conclusion flow`
- `respects prefers-reduced-motion on the conclusion transition`
