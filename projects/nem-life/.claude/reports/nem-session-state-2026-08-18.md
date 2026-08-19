# NEM Test — session state, 2026-08-18

Supersedes `nem-session-state-2026-08-17.md` for anything they disagree on.

**Branch:** `worktree-nem-conclusion-ids` — clean, everything pushed.
**PR #6:** open, MERGEABLE/CLEAN, ~21 commits. Will is merging it from another session.
**Tests:** 214 passing (`npm run test:nem`). Typecheck clean. Drift check clean.

---

## The one command to run before touching n8n

```bash
npm run check:nem-drift          # report; exits 1 on drift or a failed invariant
npm run check:nem-drift -- --write   # deliberate re-baseline + regenerate LIVE-STATE.md
```

Alex and Will both edit the workflows by hand and git never sees it, so the committed
snapshots go stale — and n8n keeps no version history, which means a stale snapshot is also
a broken rollback point. `backend/LIVE-STATE.md` is generated and is the only file in the
repo allowed to assert what live currently does.

**It found the thing that started all this:** the prompt-escaping changeset had been applied
by hand on 13 Aug while every doc still said "PREPARED, NOT APPLIED" and the committed
workflow JSON was missing a whole node.

---

## Shipped today

### The report JSON gate (spec §1–3)

```
Generate Report → Parse Report → Valid Report? ─┬─ true ──▶ Build HTML → … → Send Report
                                                └─ false ─▶ Log Failure → Alert Failure
```

Rejects on `not-json`, `missing-key`, `empty-value`, `truncated`. Tolerant about
presentation — whitespace and ``` fences unwrapped — strict about shape. **No repair pass**:
the log exists to establish the real failure rate first.

On failure the user deliberately gets nothing; `Send Report` is unreachable from the failure
branch, and a drift invariant enforces that.

Verified live: exec 49 (valid, report sent), exec 50 (`not-json`, row logged, alert sent,
`Send Report` did not run).

The validator lives in `src/nem-report-parse.js` **and** pasted inside the Code node, because
n8n cannot import. `tests/nem/nem-report-parse.test.js` extracts the node's real source from
the committed snapshot and runs it against the same fixtures, so the two cannot drift.
**Edit the module, re-paste, re-baseline — never only the node.**

### Anonymous completion logging (spec §4)

Fires on answering question 20, for every outcome, into **`nem_test_completions`**
(`bhwShLxPcsQ0xgXq`). **Verified live end to end** by clicking through the published quiz:
`POST /nem-submit` 200, correct rows for both a `dual` and a `flat-high` outcome, nothing in
`nem_test_profiles`.

**Design changed from the spec's one-table plan, deliberately.** `Store Profile` upserts on
`token`, so the later identified submission would have overwritten the completion row and
destroyed the drop-off signal — silently, since with consent two writes onto one row look
like one good row. Keying on `token + event` would then have made `/verify`'s token lookup
ambiguous and risked users getting no report. The separate table avoids both.

The completions table has **no email, name or gender column**, so anonymity is structural
rather than a promise. The beacon sends no `conclusionId` — its F/M segment needs a gender
collected two screens later.

### `/submit` no longer discards the v2 fields

`outcome`, `conclusionKey`, `conclusionId` and `event` were being dropped by `Normalize` and
had no columns. All four now flow through. **Data Table columns CAN be added through the n8n
UI**, even though the public API offers no endpoint — worth knowing before anyone plans a
migration on the opposite assumption.

### MailerSend

Trial cap resolved — Alex upgraded to a paid "Hobby" plan and it is verified by a live send
to a never-before-used recipient (exec 48). Watch the monthly volume quota instead; reports
and failure alerts share the account, so exhausting it silences both.

---

## 🚦 Before go-live

Full checklist in `backend/README.md`. The two that will bite:

1. **`Alert Failure` emails `will@teamzissou.io` and its subject is tagged `[DEV]`.** Both
   must flip together at launch. The drift check asserts they agree, so changing one and
   forgetting the other fails — but it cannot know *when* to flip them.
2. **`Report Prompt` is still a TEST MODE stub**, so live reports read "TESTRAPPORT / TEST
   REPORT". Alex's real prompt is in the Notion doc we cannot read. Installing it is one
   fixed-value edit — keep it a **fixed value**, never an expression, or the escaping fix is
   undone.

Also: Christel's texts are 27 of 108.

---

## Corrections made today

- **jsDelivr is NOT 403ing this repo.** I recorded that yesterday as critical and permanent,
  caused by repo size. It does not reproduce: four hashes including minutes-old commits all
  serve 200, across two clients, with a bogus path still 404ing as a control. It was
  transient. The 672 MB of tracked binaries is still poor hygiene, but it is not an outage
  and should not be told to a client as one.
- ~~**The acceptance suite points at a page with no quiz on it.**~~ **Withdrawn 2026-08-19.**
  Both `/zelftesten/waarom-reageer-ik-zo` and `/quiz-test-phase-b` serve the identical
  `<code-island>` — same `submoduleId`, same 20 question props. Re-pointing the suite would
  have been a wasted change chasing a false lead. A full run against the existing
  `TEST_PAGE_NL` gives **14 passed, 4 failed, 2 flaky**, and the failure snapshots show the
  quiz rendering normally ("Vraag 18 van 20"), so the page is not the problem.
  See `nem-acceptance-failures-2026-08-19.md` for what the four failures actually are.
- The component renders into a **shadow DOM**, so `innerText` and static HTML fetches show
  an empty container. Query `document.querySelector('code-island').shadowRoot`.

---

## Next, in order

1. **§5 intro lines** — 25 fixed teasers, generated from the same CSV path as the conclusion
   texts. Keyed on **mechanism alone, not gender** — the one asymmetry, and the easiest thing
   to get wrong. 25 not 26: both flat outcomes go to the contact link.
2. **§6 report template** — structure and slots for Alex to style. Tell him again that the
   Webflow page is a design surface, not the runtime; it gets exported into n8n.
3. **The three acceptance failures** — re-point the suite first.

External, unchanged: Notion access (P2, not blocking dev), Christel's remaining texts.

## Housekeeping left for Will

- `nem_test_profiles` row id 5 is an all-null row from the blank-email UI test — delete it.
- Revoke the stale `nem-test-pdf-delivery` MailerSend token (Active until Dec 2027).
