# NEM Life — keep the docs honest about live n8n

**Slug:** `nem-live-state-drift-check`
**Status:** Done — built and verified 2026-08-18
**Priority:** P1
**Type:** chore (tooling + docs)
**Created:** 2026-08-18
**Project:** nem-life
**Workflows:** `NEM Test — /verify` (`uKkMgMYoH5nOLoCR`), `NEM Test — /submit` (`LDI1eWR35lwX6WLp`)

## Problem

Docs asserted live n8n state as fact, with no way to tell when — or whether — anyone had
checked. Three failures inside one week, all the same shape:

1. The prompt-escaping changeset was applied by hand in the n8n UI on **2026-08-13**. Five
   days later the spec, the changeset README and the queue item all still read
   "PREPARED, NOT APPLIED", and the committed `nem-verify.workflow.json` was missing the
   `Report Prompt` node entirely. Following the docs would have applied it a second time.
2. The MailerSend trial cap was recorded as a live go-live blocker across **seven** files
   after Alex had upgraded the account. Several of those files instructed the reader to
   verify with an *already-seen* recipient — advice that, once the cap lifted, actively
   hides a delivery regression.
3. The "n8n API key is failing authentication" blocker was stale too; the key worked fine.

**Root cause is structural, not clerical.** The client and Will both edit n8n by hand, git
never observes those edits, and nothing re-checks. Undated prose has no expiry, so a
reader cannot distinguish "verified this morning" from "written six weeks ago and wrong".

The stakes are higher than tidiness: n8n keeps **no version history** for these workflows,
so a stale snapshot is also a broken rollback point.

## Decisions (Will, 2026-08-18)

| Decision | Choice | Why |
|---|---|---|
| Drift check behaviour | **Fail loudly, never auto-fix** | Drift ran *both ways* — `/submit`'s snapshot was stale in one node and ahead of live in two others. Auto-sync would have destroyed real work. |
| The two repo-ahead items | **Sync repo from live, raise both as tickets** | The snapshot becomes an honest record of what runs; the intent behind the repo-only edits is preserved as work, not lost. |
| Doc convention | **Dated stamps + one generated status file** | Stamps give prose an expiry; the generated file stops prose hand-copying node params it cannot keep current. |

## What was built

### 1. `tools/nem/check-workflow-drift.js`

```
npm run check:nem-drift              # report, exit 1 on drift or failing invariant
npm run check:nem-drift -- --write   # deliberate re-baseline + regenerate LIVE-STATE.md
```

- Pulls both workflows from the n8n API and diffs them against the committed snapshots.
- **Normalises before comparing.** Server-side fields (`id`, `createdAt`, `updatedAt`,
  `versionId`, `shared`, `active`, `triggerCount`) are excluded, as is `staticData` —
  `/submit`'s rate limiter writes per-IP timestamps there, so including it would report
  drift after any real user submits.
- Compares nodes **by name**, ignoring canvas position and array order; n8n reorders freely
  and a node that only moved is not drift.
- **Reports the field that moved**, not two truncated blobs. Values are flattened to
  dot-paths, and for long code strings it narrows to the first differing *line*. The first
  cut printed `JSON.stringify(parameters).slice(0, 220)` per side, which for real nodes is
  an identical shared prefix — a report that reads as "these two things differ, somehow".
- Requires `N8N_API_KEY`, so it cannot run in plain CI. It is a before-you-work check.

### 2. Invariants — the facts the prose kept getting wrong

Named checks reported in `LIVE-STATE.md` and failing the exit code:

*`/verify`* — `Report Prompt` is a Set node on typeVersion 3.5; it stores `systemPrompt` as
a **fixed value**, not an expression (the entire point of the escaping fix); `Generate
Report` sets `max_tokens: 8000`, not the truncating 1024; it reads the prompt from the Set
node; and `Valid?` keeps `Respond Confirmed` and `Mark Consumed` on the fast path, ahead of
the report chain, so the 302 never waits on an LLM round trip.

*`/submit`* — `Store Profile` targets a real data table, not a `REPLACE_` placeholder; the
honeypot gate and per-IP rate limit both exist; verification mail goes via MailerLite.

### 3. `projects/nem-life/.claude/backend/LIVE-STATE.md` (generated)

Node counts, each workflow's live `updatedAt` (the tell that caught the 13 Aug hand-edit),
snapshot-vs-live status, and the invariant table. Marked do-not-hand-edit.

### 4. Doc convention, stated at the top of `backend/README.md`

1. Run the drift check before trusting a structural claim.
2. Live-state claims carry a `Verified DD-MM-YYYY` stamp; **no stamp means unverified**.
3. Link to `LIVE-STATE.md` rather than restating node parameters.
4. Cleared blockers get struck through and dated, never silently deleted — the reader
   needs to see a constraint was reconsidered, not that it vanished.

## What the audit found

`/verify` was already re-synced earlier the same day. `/submit` had drifted in three nodes,
in **both directions**:

| Node | Repo | Live | Disposition |
|---|---|---|---|
| `Store Profile` | `operation: "insert"`, `REPLACE_DATA_TABLE_ID`, `matchingColumns: ["token"]` | `operation: "upsert"`, real table `ib5Yh0yEfNpDqeuU`, token filter | Repo was a pre-deployment template, never re-synced. **Live wins.** |
| `MailerLite: Send Verification` | carries `status: 'active'` | omits it | Repo ahead. Ticket `nem-mailerlite-subscriber-status-active` (P3 — README records double opt-in disabled, so likely benign). |
| `Normalize` | corrected comment: n8n Cloud blocks `$env` | old comment telling you to set an env var | Repo ahead. Ticket `nem-submit-normalize-comment-drift` (P3). |

Both snapshots are now re-baselined from live and the check is clean.

## Verify Loop

**Pass criteria**

- `npm run check:nem-drift` exits **0** and prints `IN SYNC` for both workflows.
- `npm run test:nem` passes — **160 tests** (127 existing + 33 new).
- `LIVE-STATE.md` exists, carries a generation timestamp, and shows every invariant as
  `holds`.
- Introducing drift makes it exit **1** and name the changed field.

**Reproduction — the drift path actually works**

```bash
# perturb a snapshot, then:
npm run check:nem-drift        # expect exit 1, node + field named
git checkout -- projects/nem-life/.claude/backend/nem-submit.workflow.json
npm run check:nem-drift        # expect exit 0
```

Done on 2026-08-18: flipping `Store Profile.operation` to `insert` and tampering with a
comment line produced `parameters.operation  repo insert / live upsert` and the first
differing comment line, exit 1.

**Regression scope**

- Read-only against n8n. No live workflow was mutated. The only writes were one
  `nem_test_profiles` probe row (deleted) during the earlier MailerSend check.
- The existing 127-test suite must stay green; `build:nem` and `typecheck:nem` untouched.

## Test Plan

**Tier 1 — Auto, local:** `tests/nem/nem-workflow-drift.test.js`, 33 tests via
`npm run test:nem`. Covers normalisation, diffing (added/removed/changed nodes, disabled
flags, rewired connections, reordering, server metadata), `hasDrift`, report formatting
including the readable-diff regression, all invariants with a deliberately broken workflow
per invariant, `buildLiveState`, and assertions against the **real committed snapshots** so
the repo's own facts are under test.

**Tier 2 — CDN regression:** N/A. No browser-facing code; nothing to register in
`tests/registry.json`.

**Tier 3 — Manual:** running the check itself, since it needs `N8N_API_KEY` and live
network. It cannot be automated in CI for that reason. One command, before n8n work.

**Acceptance tests (Playwright):** N/A — no DOM, no staging page.

## Barba Impact

N/A — no front-end code.

## Parallelisation

Single stream, one file plus docs. No worktrees or agent teams warranted.

## Follow-ups

- `nem-mailerlite-subscriber-status-active` (P3)
- `nem-submit-normalize-comment-drift` (P3)
- The convention is currently stated in `backend/README.md` only. If a second client repo
  grows the same hand-edited-infrastructure problem, promote it to the root `CLAUDE.md`.
- The check is manual by necessity. If it starts getting skipped, the next step is a
  pre-work hook rather than CI, since CI has no `N8N_API_KEY`.
