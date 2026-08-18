# Spec: nem-report-json-and-error-visibility

**Client:** NEM Life
**Slug:** `nem-report-json-and-error-visibility`
**Created:** 2026-08-17
**Status:** Ready to Build — slice 1 (§1–3) planned 2026-08-18, see Build plan
**Priority:** P0
**Type:** feature
**Workflow:** `NEM Test — /verify` (n8n id `uKkMgMYoH5nOLoCR`, active) and `/submit` (`LDI1eWR35lwX6WLp`)

**Sources**
- Email: *NEM TEST — proposed changes to the report output, and a request*, Alex → Will, 2026-08-12
- Email: Will → Alex, 2026-08-13 (agreement + strict-JSON requirement)
- Email: Alex → Will, 2026-08-17 (strict JSON confirmed; asks for malformed responses to surface)
- Will, 2026-08-17: *"log the flat scores and any JSON errors then send an email to Alex if
  there's an error (via n8n)"*, then: *"we should log all completions anonymously for
  completeness — send it off once the questions are answered"*

---

## Summary

Alex has restructured the report so Claude returns **content only, as JSON** — no headings,
no markdown, no pagination targets. All formatting moves client-side into the PDF template.

Three pieces of work follow from that, and from Alex's 17 Aug question:

1. **The JSON contract** — the prompt insists on strict JSON; `/verify` parses it instead of
   treating the response as prose.
2. **Error visibility** — a malformed response must never fail silently. It gets logged and
   emailed to Alex.
3. **Anonymous completion logging** — every completed test emits a row the moment the
   questions are answered, so Alex has the raw data on all of it in one place. Flat outcomes
   currently send nothing at all; this covers them as a side effect rather than a special
   case.

> **⚠️ Source of truth changed (2026-08-17).** Alex has consolidated everything into the
> Notion doc *NEM TEST 01 Waarom reageer ik zo? — source*. His words: "if it contradicts
> something in an earlier email, the doc wins — please flag it, because then it's the doc
> that needs fixing."
>
> **We cannot read that doc.** It lives in Alex's own Notion workspace (`alexanderreus`),
> not one we have access to — fetching it returns 404. So this spec is written from the
> email thread, which is now second-order. **Ask Alex for access before building**, or every
> detail below is a guess at what the doc says. This is the first thing to raise on Monday.

---

## Background

### Why the output changed

The original prompt asked for two A4 pages with sections allocated per page. Alex's point,
and it is correct: pagination is not observable to Claude. It depends on font, margins and
even the length of the reader's first name, none of which exist until the template renders.
So the model was being asked to hit a target it cannot measure, and padded or squeezed prose
to guess at it.

### What this supersedes

This **resolves Defect 1** in `nem-verify-report-email-and-pdf-branding` — markdown arriving
as literal `#` and `**` in the PDF. That defect was confirmed live on 2026-08-13. It
disappears by construction here: the model no longer emits formatting at all.

---

## Design

### 1. The JSON contract

`Generate Report` asks for, and `/verify` expects, exactly this shape:

```json
{
  "opening":  "…",
  "reaction": "…",
  "origin":   "…",
  "cost":     "…",
  "closing":  "…"
}
```

| Key | Target length | Notes |
|---|---|---|
| `opening` | 80–110 words | |
| `reaction` | 250–300 words | the substantive section |
| `origin` | 120–150 words | |
| `cost` | 110–130 words | |
| `closing` | 45–60 words | |

Every value is **plain Dutch prose**: no headings, no markdown, no bullet characters, no
formatting of any kind. Word counts are targets for the prompt, not validation thresholds —
a report is not rejected for being 240 words in `reaction`. Alex expects to tune them after
testing.

**Not generated, and therefore not in the JSON:** the fixed disclaimer, the title page, the
date, and the intro line. All are template-side. Text that never varies should not pass
through a generative step.

### 2. Validation, and what happens when it fails

`Generate Report` is followed by a **`Parse Report`** Code node that is the only place the
model's output is trusted or rejected.

```
Generate Report ──▶ Parse Report ──┬── valid ──▶ Build HTML ──▶ Render PDF ──▶ …
                                   └── invalid ─▶ Log Failure ──▶ Alert Alex
```

`Parse Report` fails the payload when any of these hold:

- the body is not parseable as JSON
- the parsed value is not an object
- any of the five keys is missing
- any value is not a non-empty string

Anthropic's `stop_reason` is checked too: `max_tokens` means the JSON was truncated
mid-string and will not parse anyway, but it gives a far more useful failure reason than
"unexpected end of input".

**Deliberately not doing:** a repair pass that asks the model to fix its own JSON. It doubles
latency and cost on the exact path that is already misbehaving, and the failure rate is
currently unknown. Revisit once the logging below says how often this actually happens.

### 3. Error visibility (Alex's 17 Aug request)

> *"I'd like it to surface to us somehow rather than fail silently — otherwise we won't know
> how often it happens, or that someone never got their report. A simple notification would
> be enough."*

Two outputs, both in n8n:

**Log** — a row in a `nem_report_failures` Data Table:

| Column | Example |
|---|---|
| `timestamp` | `2026-08-17T14:22:10Z` |
| `token` | the verify token, so the run can be traced |
| `firstName` | for the follow-up email Alex may want to send |
| `email` | ditto |
| `locale` | `nl` |
| `conclusionId` | `01F-SR-EM` |
| `reason` | `not-json` \| `missing-key` \| `empty-value` \| `truncated` |
| `rawResponse` | first 2000 chars, for diagnosis |
| `executionId` | links straight to the n8n execution |

**Alert** — a plain-text MailerSend email to Alex naming the reason, the affected user, and
the execution ID. One email per failure. If failures ever become frequent enough for that to
be noise, batch them — but do not pre-solve that; the point of the log is to find out.

> **⚠️ The alert shares the MailerSend account the reports go out on.** ~~That account was
> capped on a trial plan, so an alert about a failed report could itself fail to send.~~
> **Resolved 2026-08-18** — Alex upgraded to a paid plan, so the recipient cap is gone and
> this is no longer a live risk. It remains a real single point of failure in principle: if
> the send path itself is what broke, the alert about it rides the same path. Worth revisiting
> if the plan's monthly quota is ever hit, since that would silence reports and alerts together.

### 4. Anonymous completion logging — every completion, not just flat ones

**Decision (Will, 2026-08-17).** The first version of this section logged only flat outcomes,
because those were the ones sending nothing. Will's steer replaced it with something better:
**log every completed test anonymously, the moment the twenty questions are answered.**

That is the stronger design for three reasons:

- **All the raw data lands in one table.** Comparing flat rates against dual rates, or
  checking whether the 8/16 threshold is set sensibly, needs both populations — a flat-only
  log can only ever describe its own half.
- **It removes the special case.** No "flat fires a beacon, non-flat fires at opt-in" split
  in the component. One beacon, one code path, fired at one moment.
- **It captures drop-off.** Someone who finishes the questions and then abandons the opt-in
  is currently invisible. That gap between completions and reports is the conversion number
  worth watching, and it is unobtainable if only report-senders are recorded.

**When it fires: on answering question 20.** Note what is and is not known at that point —
`outcome` and `conclusionKey` depend only on the answers, so they are available; the
`conclusionId` is not, because its `F`/`M` segment needs the gender collected on the *next*
screen. That is a fair trade for firing before anyone can drop out. `conclusionKey` plus the
`gender` on the later identified row reconstructs the ID whenever it is actually wanted.

```js
POST /webhook/nem-submit
{
  token,                        // joins this row to the identified one, if it arrives
  locale,
  event: "completion",
  outcome,                      // single | dual | flat-low | flat-high
  conclusionKey,
  scores: { selfRejection, emotionalNumbing, falsePower, fear, falseHope },
  totalScore,
  timestamp
}
```

No name, no email, no consent flag, no profile fields — none of them exist yet at question
20, and waiting for them is what reintroduces the drop-off blind spot.

**Two rows per user, joined on `token`.** The completion row above always fires. The existing
identified submission still fires later, for the people who opt in, carrying `event:
"submission"` alongside the personal details. Alex joins them on the token. `Store Profile`
must therefore accept a row with a null email — **confirm that column is nullable before
building, or every completion log will 500.**

Rejected: showing the opt-in to flat users so their email could be captured. It asks for an
email and then gives a contact link rather than the promised report, and it contradicts the
10 Aug call decision.

### 5. Intro lines (Alex's 12 Aug point 2, agreed 13 Aug)

An intro line is the teaser on the report's title page, e.g. for `fear`:
*"Je durft het echt niet te doen, ook al weet je dat het kan"*.

Moving from Claude-generated to **selected client-side**, exactly like the conclusion texts —
fixed text, no risk of rephrasing.

- **25 lines**: 5 single mechanisms + 20 directional duals.
- **Not gender-specific.** Conclusion texts are looked up on key + gender; intro lines on
  **key alone**. This is the one asymmetry in the lookup and the easiest thing to get wrong.
- Stored in a new **Intro lines** tab in `NEM_TEST_01_Default_texts`.

**Why 25 and not 26.** Alex asked whether flat-high should get one, reasoning that it
receives a report. It does not: the 10 Aug call put both flat outcomes on the contact link
with no report. Will confirmed 25 on 13 Aug. If the Notion source doc says 26, the doc and
the flat-routing decision contradict each other — flag it rather than implementing both.

Implementation mirrors `nem-conclusion-texts.js`: another generated module from the same CSV
export path, since it is the same sheet.

### 6. Webflow report template (Alex's 12 Aug point 3)

Alex asked for a basic report template — structure and slots, he takes the formatting from
there. Tracked here so it is not lost, but it is a **separate build task**, not part of this
one.

Will's constraint, already sent 13 Aug: the PDF generator will **not** pull the design from
the live Webflow page. Once the design is final it gets exported to HTML/CSS and stored in
the n8n workflow. Alex should know the Webflow page is a design surface, not the runtime.

Slots the template must expose: title, first name, date, intro line, the five JSON sections,
and the fixed disclaimer.

---

## Files affected

| File | Change |
|---|---|
| `projects/nem-life/.claude/backend/nem-verify.workflow.json` | `Report Prompt` demands strict JSON; new `Parse Report`, `Log Failure`, `Alert Alex` nodes; `Build HTML` consumes five fields |
| `projects/nem-life/.claude/backend/nem-submit.workflow.json` | accept anonymous rows with a null email; `event` column to separate completions from submissions |
| `projects/nem-life/src/nem-test-phase-b.tsx` | fire the anonymous completion beacon on question 20; render the intro line |
| `projects/nem-life/src/nem-intro-lines.js` | new — generated, 25 key-only lines |
| `tools/nem/build-conclusion-texts.js` | extend to emit the intro-lines tab |
| `projects/nem-life/.claude/backend/nem_report_failures.csv` | new Data Table schema |
| `tests/acceptance/nem-report-json-and-error-visibility.spec.js` | new — Tier 1 |
| `tests/nem/nem-report-parse.test.js` | new — unit tests for the validator |

---

## Verify Loop

### Pass/fail criteria

**JSON contract**
- `Parse Report` emits five non-empty string fields for a well-formed response.
- A response containing markdown (`#`, `**`, `- `) is a **prompt** failure, not a parse
  failure: it parses fine. Assert on the rendered PDF that no literal `#` or `**` appears.

**Malformed handling** — force each of these and assert the branch taken:
| Injected response | Expected `reason` |
|---|---|
| `not json at all` | `not-json` |
| `{"opening":"x"}` | `missing-key` |
| `{"opening":"", …}` | `empty-value` |
| truncated mid-string | `truncated` |

- In every case: a `nem_report_failures` row exists, an email reaches Alex, and
  `Send Report` does **not** fire. A user must never receive a half-built PDF.
- The 302 to `/bevestigd` is unaffected — failures happen after the fast path.

**Completion logging**
- Answering question 20 produces a submit POST with `event: "completion"`, all five scores,
  `outcome`, `conclusionKey`, and no personal details — for **every** outcome, not just flat.
- It fires before the profile screen, so `conclusionId` is absent and `gender` is null.
- The row lands in the Data Table with a null email rather than erroring.
- Opting in later produces a **second** row with `event: "submission"` and the same `token`.
- A flat outcome produces the completion row and no second row; no opt-in screen is shown.
- The beacon is fire-and-forget: a slow or failing webhook must not block the conclusion
  screen from rendering.

**Intro lines**
- All 25 keys resolve; no reachable non-flat outcome produces a blank intro line.
- The same key returns the same line for `man` and `vrouw` — the lookup ignores gender.

### Reproduction steps

1. `POST /webhook/nem-submit` with a fixture profile; read the `token` from
   `nem_test_profiles`.
2. `GET https://reus.app.n8n.cloud/webhook/nem-verify?token=<token>`.
3. Inspect the execution via `n8n_executions`.
4. For malformed cases, pin `Generate Report`'s output to the fixture rather than burning
   Anthropic tokens on deliberately broken responses.

### Tier mapping

- **Tier 1 — unit (`node --test`):** `tests/nem/nem-report-parse.test.js` covers the
  validator against all four failure modes plus valid input. This is where the real coverage
  lives; it needs no n8n and no network.
- **Tier 1 — Playwright:** `tests/acceptance/nem-report-json-and-error-visibility.spec.js`
  covers the flat beacon (network interception) and the intro line rendering.
- **Tier 2 — CDN regression:** registered in `tests/registry.json`.
- **Tier 3 — Manual:**
  - Read a generated PDF end to end. Only a human can judge whether five separately
    generated sections read as one coherent report rather than five essays.
  - Confirm the alert email is legible and actionable in a real inbox.

### Regression scope

- **The fast path.** `Respond Confirmed` and `Mark Consumed` stay on the direct `Valid?`
  true-branch fan-out. Any new node must sit **below y=360** on the canvas — n8n v1 runs
  parallel branches in canvas y-order, and a node above `Respond Confirmed` delays the 302.
  This bit us on 2026-08-13; see `nem-report-prompt-escaping-and-token-limit`.
- **`nem-verify-report-email-and-pdf-branding`** edits `Build HTML` and `Send Report` in the
  same workflow. Whichever lands second **must re-pull live first** — there is no version
  history to recover from.
- The existing 27 conclusion texts and the component's conclusion routing are untouched.

---

## Barba Impact

N/A — no Barba transitions. The component is a self-contained React island; the rest is n8n.

---

---

## Build plan — slice 1 (planned 2026-08-18)

Sections 1–3 only. Completion logging (§4), intro lines (§5) and the report template (§6)
stay queued as separate work.

### Decisions taken (Will, 2026-08-18)

| Question | Answer | Consequence |
|---|---|---|
| The stub returns prose, which `Parse Report` will reject | **Rewrite the stub to emit the five-key JSON** | The whole chain stays exercisable now, and Alex's real prompt later drops in as a like-for-like replacement rather than a re-wiring. |
| Alert channel | **MailerSend, SPOF recorded** | Matches what Alex asked for. If the send path is what broke, the alert dies with it — a known limit, not an oversight. Revisit only if the log shows it mattering. |
| Slice size | **§1–3** | One coherent change to `/verify` plus one new Data Table. |

### The thing that makes this urgent to get right

`Parse Report` is a gate on the live report path. The moment it lands, **anything it rejects
sends a user nothing**. So the stub prompt and the parser must change in the *same* apply —
shipping the parser against the current prose-emitting stub would route every real user to
the failure branch. That coupling is the whole risk in this slice.

### Order of work

1. **`tests/nem/nem-report-parse.test.js` first.** Pure validator, no n8n, no network:
   the five-key happy path, and each of `not-json` / `missing-key` / `empty-value` /
   `truncated`, plus `stop_reason: "max_tokens"` mapping to `truncated` rather than a bare
   parse error. Whitespace-only values count as empty. This is where the real coverage lives.
2. **Extract the validator to `projects/nem-life/src/nem-report-parse.js`** so the same code
   is unit-tested here and pasted into the `Parse Report` Code node — not written twice.
3. **Create the `nem_report_failures` Data Table.** ⚠️ **n8n's public API makes a table
   schema immutable after creation** — there is no add-column. Get all nine columns right
   first time: `timestamp`, `token`, `firstName`, `email`, `locale`, `conclusionId`,
   `reason`, `rawResponse`, `executionId`. Confirmed 2026-08-18: only `nem_test_profiles`
   exists today.
4. **Rewrite the `Report Prompt` stub** to demand strict JSON in the contract shape, still
   clearly labelled TEST MODE. Keep it a **fixed value** — an expression re-breaks the
   escaping fix, and `npm run check:nem-drift` will fail if it regresses.
5. **Add `Parse Report`, `Log Failure`, `Alert Alex`** and rewire `Generate Report`'s output.
6. **Re-baseline** with `npm run check:nem-drift -- --write` and commit the snapshot.

### Constraints carried in from what we already know

- **Snapshot live before touching the workflow.** n8n keeps no version history, and on
  2026-08-13 an unrecorded hand-edit meant the repo copy was missing a whole node. Run
  `npm run check:nem-drift` first; if it reports drift, resolve that before editing.
- **New nodes sit below y=360.** n8n v1 runs parallel branches in canvas y-order, so a node
  above `Respond Confirmed` delays the 302 and leaves the token replayable.
- **Apply as a node-level diff, never a whole-workflow import.**
- **`nem-verify-report-email-and-pdf-branding` also rewrites `Build HTML`.** Whichever lands
  second must re-pull live first. This slice should land first; it removes that spec's
  Defect 1 by construction.
- Pin `Generate Report`'s output to fixtures when testing the four failure modes rather than
  burning Anthropic tokens on deliberately broken responses.

### Not blocked by Notion

The real prompt text is the only thing waiting on Alex's doc, and installing it is a single
fixed-value edit to one node. Everything above is buildable now (Will, 2026-08-18).

### Resolved from "Open questions"

- **Q4, does `Store Profile`'s email column allow null?** Still open, but it belongs to §4
  (completion logging), not this slice. Noted 2026-08-18: n8n Data Table columns expose only
  a type (`string`/`number`/`boolean`/`date`) through the API, with no nullable flag, so this
  has to be answered by trying a write rather than by reading the schema.

## Open questions

1. **Notion access.** We cannot read the doc that Alex has declared authoritative. Blocking
   for confidence, not for starting.
2. **Word counts** are targets, not limits — confirm nothing validates against them.
3. **Alert volume.** One email per failure until the log shows the real rate.
4. **Does `Store Profile`'s email column allow null?** Must be answered before completion
   logging is built — every row now arrives without an email.

## Agents needed

- `code-writer` — workflow JSON, component beacon, intro-lines generator
- `qa` — the four malformed cases, flat-logging regression, fast-path latency
