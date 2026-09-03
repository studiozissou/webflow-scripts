# Spec: nem-report-json-and-error-visibility

**Client:** NEM Life
**Slug:** `nem-report-json-and-error-visibility`
**Created:** 2026-08-17
**Status:** §7 **APPLIED to live 2026-09-02** (changeset `backend/changesets/nem-prompt-input-contract/`; both workflows IN SYNC, all invariants green). §1–3 built and verified live 2026-08-18 (execs 49 happy / 50 failure); §4–5 built 2026-08-18/19; §6 still Ready to Build, blocked on Alex's design. Remaining: the manual gate/gender execution checks (changeset README step 10), the Webflow paste of `dist/`, and installing Alex's final prompt once he marks the page final (a **provisional** prompt built from his 2026-08-31 capture was installed 2026-09-02 — changeset `backend/changesets/nem-provisional-runtime-prompt/` — so real reports render end to end meanwhile).
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

**Two rows per user, joined on `token` — in two separate tables.**

> **⚠️ Design corrected 2026-08-18. This section originally specified one table.** It said
> both rows land in `nem_test_profiles`, distinguished by an `event` column, and that
> `Store Profile` "must accept a row with a null email". That does not work, and the way it
> fails is quiet.
>
> `Store Profile` is an **upsert keyed on `token`**. The later identified submission would
> therefore find the completion row and *update* it rather than adding a second row —
> destroying exactly the completion-versus-submission gap the feature exists to measure.
> Worse, it would not surface in testing: for a user who opts in, two writes onto one row
> look like one perfectly good row.
>
> Keying the upsert on `token + event` fixes that but creates a second problem. `/verify`'s
> `Get Profile` and `Mark Consumed` both look up **by token alone**, so with two rows per
> token the lookup could return the anonymous one — which has no email — and a user who did
> everything right would silently never receive their report. Fixing that means editing the
> live report path, which has no version history.
>
> So completions go to their own table instead. `/verify` is untouched, `Get Profile` still
> finds exactly one row per token, and all the new risk stays in new code.

Completions are written to **`nem_test_completions`** (`bhwShLxPcsQ0xgXq`):
`token`, `completedAt`, `locale`, `outcome`, `conclusionKey`, `scoresJson`, `totalScore`, `ip`.

**There is no email, name or gender column, by design.** "Anonymous" stops being a promise
we keep and becomes something the storage cannot hold — a later change cannot quietly start
filling a field that does not exist. Given what the test asks people about, that is worth
having structurally rather than by convention.

Identified submissions continue to `nem_test_profiles` exactly as before, carrying
`event: "submission"`. Alex joins the two on `token` — a spreadsheet operation, and he is
exporting to analyse either way.

*(For the record: a blank email does save fine in `nem_test_profiles`, confirmed
2026-08-18. The one-table design was unsafe for the upsert reason above, not that one.)*

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

### 7. Prompt input contract — what the user message must carry (added 2026-09-01)

On 2026-09-01 Will pasted Alex's full system prompt (page state 2026-08-31, saved at
`.claude/research/nem-system-prompt-2026-08-31.md`) and it was diffed against what
`Generate Report` actually sends (`.claude/research/nem-system-prompt-reconciliation-2026-09-01.md`).
The output side (§1) matches. The **input** side does not: the prompt reads fields from the
user message that `/verify` never puts there. Installing the real prompt over the current
user message would have Claude writing "in the same register as the intro line" it was
never shown. This slice closes that gap **before** the prompt is installed, so the install
stays the single fixed-value edit §"Not blocked by Notion" promised.

**The user message `Generate Report` sends today**

```
Locale: nl. Write the full report in Dutch.

First name: …
Gender: vrouw
Age category: 41-50
Relationship status: in-een-relatie

Mechanism scores (JSON): {…}
Primary mechanism: falseHope
Secondary mechanism: selfRejection | none
Total score: 47
```

**What the prompt (§1.1, 1.2, 1.4, 1.5) expects, and what changes**

| # | Prompt expects | Today | Change |
|---|---|---|---|
| 7a | The **intro line** shown on the title page, as register context | Not sent. `introLine` is already a column on `nem_test_profiles` and `Build HTML` reads it. | Append `'\nIntro line: ' + introLine` to the jsonBody. One-line edit. |
| 7b | The **conclusion text** the user already saw | Not sent, and **not stored** — only `conclusionKey` / `conclusionId`. The texts live in `src/nem-conclusion-texts.js`; n8n has no copy. | Component adds `conclusionText` to the submit payload; `/submit` `Store Profile` gains a `conclusionText` column; jsonBody appends `'\nConclusion text: ' + conclusionText`. |
| 7c | Gender `Female` / `Male` | `vrouw` / `man` (nl), `female` / `male` (en) | Map in the jsonBody: `{vrouw:'Female', female:'Female', man:'Male', male:'Male'}[gender]`. Do not change the stored value — `conclusionId` derives from it. |
| 7d | Dutch prose only; the forbidden-word list is Dutch | `locale=en` → "Write the full report in English." | **Gate `en`.** Route it to `Log Failure` with reason `unsupported-locale` and the Alex alert, and do not call Anthropic. No English layer exists (the English CSV column is empty — `nem-conclusion-texts.test.js` asserts it). |
| 7e | Nothing about totals ("you do not calculate") | `Total score: 47` | Drop the line. |
| 7f | First name once, at the start of `opening` | `Build HTML` also prints `Beste {firstName},` above the body | Remove the greeting line from `Build HTML`; the prompt owns the address. |
| 7g | Age `18-30 year` … | `18-30` … | No change — unambiguous. |
| 7h | Mechanism names | camelCase slugs `falseHope` … | No change — unambiguous; the Dutch label is Alex's to name in the prompt if he wants it. |

**7b is the only structural change.** n8n Data Table schemas are **immutable through the
public API** (learned building §3 — no add-column). Check the UI first: if a column can be
added there, do that. If not, the fallback is to pass `conclusionText` through the token
instead of storing it — i.e. `/verify` looks it up from `conclusionKey + gender` using a
copy of `nem-conclusion-texts.js` pasted into a Code node. The second path duplicates the
texts into n8n, which the 2026-08-17 build deliberately avoided; prefer the column.

**Contradictions this surfaced — Alex decides, we do not implement either side silently**

| | Prompt says | Product does | Default until Alex answers |
|---|---|---|---|
| Relationship status | Single ± children / With a partner ± children / Other (§1.5) | Form offers `alleenstaand`, `in-een-relatie`, `gescheiden`, `anders` — no children axis, has "divorced" | Keep the live form. Ask Alex to rewrite §1.5 to the four values, since it is "a modifier only" either way. |
| Flat outcomes | "Where no primary mechanism is supplied … build the report around that picture" (§1.4) | Flat users get the contact link and no report (10 Aug call; §5 above) | Keep no-report. Ask Alex to delete the §1.4 clause. `/verify` never receives a flat token, so nothing to build. |

**Defects in the prompt text itself** — fixed as far as we can in the saved capture
(`.claude/research/nem-system-prompt-2026-08-31.md`, change list in its header): typos, the
stray first-person note at the top of §2.3, the stale §2.1 cross-reference. The truncated
Male 50+ block under Emotional numbing is clinical content and stays Alex's: the capture
marks it as a missing variant so the prompt's own §1.5 fallback applies. Alex's Notion page
is the source of truth, so these fixes need re-applying there — list sent 2026-09-01.

**Not in this slice:** installing the prompt (waits on Alex marking the runtime page final)
and the Publish Prompt workflow (`nem-test-phase-b.md` → "Report prompt — runtime link").

---

## Files affected

| File | Change |
|---|---|
| `projects/nem-life/.claude/backend/nem-verify.workflow.json` | `Report Prompt` demands strict JSON; new `Parse Report`, `Log Failure`, `Alert Alex` nodes; `Build HTML` consumes five fields |
| `projects/nem-life/.claude/backend/nem-submit.workflow.json` | branch on `event`: completions to `nem_test_completions`, submissions unchanged to `nem_test_profiles` |
| `projects/nem-life/src/nem-test-phase-b.tsx` | fire the anonymous completion beacon on question 20; render the intro line |
| `projects/nem-life/src/nem-intro-lines.js` | new — generated, 25 key-only lines |
| `tools/nem/build-conclusion-texts.js` | extend to emit the intro-lines tab |
| `projects/nem-life/.claude/backend/nem_report_failures.csv` | new Data Table schema |
| `tests/acceptance/nem-report-json-and-error-visibility.spec.js` | new — Tier 1; §7: assert the submission POST carries `conclusionText` |
| `tests/nem/nem-report-parse.test.js` | new — unit tests for the validator |
| `projects/nem-life/.claude/backend/nem-verify.workflow.json` (§7) | `Generate Report` jsonBody: intro line, conclusion text, gender map, no total, `en` gated; `Build HTML`: drop the greeting |
| `projects/nem-life/.claude/backend/nem-submit.workflow.json` (§7) | `Store Profile`: `conclusionText` column |
| `projects/nem-life/src/nem-test-phase-b.tsx` (§7) | submit payload gains `conclusionText` |
| `tools/nem/check-workflow-drift.js` + `tests/nem/nem-workflow-drift.test.js` (§7) | three new invariants on the `Generate Report` jsonBody |

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
- The row lands in `nem_test_completions`, and **no** row appears in `nem_test_profiles`.
- The completion path does **not** trigger the MailerLite verification email — there is no
  address to send one to.
- Opting in later produces a **second** row with `event: "submission"` and the same `token`.
- A flat outcome produces the completion row and no second row; no opt-in screen is shown.
- The beacon is fire-and-forget: a slow or failing webhook must not block the conclusion
  screen from rendering.

**Intro lines**
- All 25 keys resolve; no reachable non-flat outcome produces a blank intro line.
- The same key returns the same line for `man` and `vrouw` — the lookup ignores gender.

**Prompt input contract (§7)**
- `Generate Report`'s jsonBody contains `Intro line:` and `Conclusion text:` and does **not**
  contain `Total score:` — asserted by `npm run check:nem-drift` against the live workflow.
- The submission POST from the component carries a non-empty `conclusionText` that equals
  the text rendered on the conclusion screen — Playwright, network interception.
- A `nem_test_profiles` row written after the change has `conclusionText` populated.
- For a `vrouw` profile the user message reads `Gender: Female`; for `man`, `Gender: Male`.
- A token whose row has `locale: en` produces a `nem_report_failures` row with reason
  `unsupported-locale`, an alert to Alex, no Anthropic call and no `Send Report`.
- The rendered PDF has no `Beste …,` line; the first name appears once, inside `opening`.

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
  covers the flat beacon (network interception) and the intro line rendering. §7 wants
  *"the submission payload carries the conclusion text the user saw"* — **not written at
  plan time**: the suite's own note says the submission POST is not observable until
  `nem-submit-second-row-not-written-on-optin` (P1) is fixed, so it would land red for an
  unrelated reason. `/build` adds it alongside the `introLine` payload assertion the same
  note defers.
- **Tier 1 — drift (`npm run check:nem-drift`, needs `N8N_API_KEY`):** three §7 invariants
  for `/build` to add to `tools/nem/check-workflow-drift.js` — *Generate Report sends the
  intro line*, *Generate Report sends the conclusion text*, *Generate Report does not send
  the total score*. They fail against today's snapshot by design; add them in the same
  commit as the jsonBody change so the invariant list never describes a workflow that
  does not exist.
- **Tier 3 — Manual (§7):** the `en` gate and the gender mapping are n8n-execution checks —
  run one `vrouw` and one `locale: en` token through `/verify` and read the execution. Not
  automatable without an n8n API key in CI.
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
5. **(§7) Relationship-status taxonomy** — prompt §1.5 and the live form disagree. Default:
   keep the form; Alex rewrites §1.5. Asked 2026-09-01.
6. **(§7) Flat outcomes** — prompt §1.4 writes a report for them; the product routes them to
   the contact link. Default: keep no-report; Alex deletes the clause. Asked 2026-09-01.
7. **(§7) Can a column be added to `nem_test_profiles` in the n8n UI?** Decides whether
   `conclusionText` is stored (preferred) or looked up in `/verify` from a pasted copy of the
   texts. Check before building 7b.
8. **(§7) Runtime prompt page access** — `399c706b69c080eab095f89476b4fa21` 404s via the MCP
   until Alex's 31 Aug share is accepted. Needed to install the prompt, not to build §7.

## Agents needed

- `code-writer` — workflow JSON, component beacon, intro-lines generator
- `qa` — the four malformed cases, flat-logging regression, fast-path latency

## Build plan — §7 (planned 2026-09-01)

Order, and why: tests first, then the one structural change, then the edits that depend on
it, then the ones that do not.

1. **Drift invariants first** (`tools/nem/check-workflow-drift.js` + its unit test): they fail
   against today's snapshot and pass once the jsonBody is right. Same commit as step 5.
2. **Playwright test** for `conclusionText` in the submission POST — appended to the existing
   spec file once the submission POST is observable (see Tier mapping).
3. **Answer open question 7** (column in the UI?). Add `conclusionText` to `nem_test_profiles`
   and to `Store Profile` in `/submit`.
4. **Component:** `conclusionText` in the submit payload (`nem-test-phase-b.tsx` ~line 625),
   `npm run build:nem`, paste, verify the new `moduleId`.
5. **`/verify`:** re-pull live (`npm run check:nem-drift`), then edit `Generate Report`'s
   jsonBody (7a–7e) and `Build HTML` (7f) as node-level diffs. Add the `en` gate as an IF
   ahead of `Generate Report`, its false-branch into the existing `Log Failure` → `Alert
   Alex` chain with reason `unsupported-locale`. New nodes **below y=360**.
6. **Re-baseline** with `npm run check:nem-drift -- --write`, commit the snapshot, run one
   `vrouw` token and one `en` token through and read the executions (Tier 3).

Parallelisation: 1–2 and 3–4 are independent streams; 5 waits on 3 (the column must exist
before the jsonBody reads it). One worktree, one agent — the workflow edits are small and the
live-pull-before-edit rule makes two people in `/verify` at once a liability.
