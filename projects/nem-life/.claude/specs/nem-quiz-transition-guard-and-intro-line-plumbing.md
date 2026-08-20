# Spec — Quiz transition guard, shared acceptance helpers, and intro-line plumbing

**Slug:** `nem-quiz-transition-guard-and-intro-line-plumbing`
**Project:** nem-life (NEM Test)
**Created:** 2026-08-19
**Status:** Ready to Build

Closes three carried-forward items in one pass, because they interlock: the component fix
(A) is what lets the test helpers (B) drop their retry, and (C) is the server half of work
whose client half is already merged.

| Queue id | Part |
|---|---|
| `nem-swallowed-click-during-question-fade` | A |
| *(carry-forward in `nem-acceptance-failures-2026-08-19.md`)* | B |
| `nem-intro-lines-client-side` — n8n follow-up slice | C |

**Source of truth for the diagnosis:** `.claude/reports/nem-acceptance-failures-2026-08-19.md`
and `.claude/reports/nem-session-state-2026-08-18.md`.

---

## Part A — Guard the question transition

### The defect, precisely

`projects/nem-life/src/nem-test-phase-b.tsx:584-609`. `selectAnswer` schedules a two-stage
chain and nothing guards re-entry:

```
t=0    click        setAnswers(...)                      // pill shows selected
t=200  fadeDelay    setAnimating(true)                   // quiz-fade-out, 300ms
t=500  fadeDuration setCurrentStep(s => s + 1)           // key changes -> subtree REMOUNTS
                    setAnimating(false)                  // quiz-fade-in, 400ms
```

The answer pills (`:921`) carry no `disabled` and no `pointer-events` guard, and the wrapper
is `<div key={currentStep}>` (`:820`), so the whole subtree is replaced at t=500. Two
separate faults follow:

1. **Re-entrancy — a data bug, not just a UX one.** A second click inside the ~500ms window
   runs `selectAnswer` again with the *same* `currentStep`. It overwrites the answer already
   recorded for that question **and** schedules a second advance, so `setCurrentStep` fires
   twice and the quiz jumps from N to N+2. The skipped question keeps `null`, which flows
   into `calculateScores` and the completion beacon.

2. **The remount seam — the dead click.** A click dispatched into the node being replaced
   lands on a detached handler and does nothing. This is what the acceptance suite sees as
   an intermittent failure to advance, and what a real user sees as a pill that needs
   pressing twice.

The old blind `waitForTimeout(600)` in the suite hid both completely. Waiting on the question
heading actually changing is what surfaced them.

### The fix

A ref for correctness, state for rendering. The ref is load-bearing: two clicks dispatched in
the same tick both read the same render's `isTransitioning`, so state alone is not a lock.

```tsx
const transitionLock = useRef(false);
const [isTransitioning, setIsTransitioning] = useState(false);
const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

const selectAnswer = useCallback((answerIndex: number) => {
  if (transitionLock.current) return;
  transitionLock.current = true;
  setIsTransitioning(true);

  const updatedAnswers = answers.map((a, i) => (i === currentStep ? answerIndex : a));
  setAnswers(updatedAnswers);

  const fadeDelay    = prefersReducedMotion ? 0 : 200;
  const fadeDuration = prefersReducedMotion ? 0 : 300;

  timers.current.push(setTimeout(() => {
    setAnimating(true);
    timers.current.push(setTimeout(() => {
      if (currentStep < 19) {
        setCurrentStep((s) => s + 1);
      } else {
        sendCompletionBeacon(updatedAnswers);
        setPhase("profile");
      }
      setAnimating(false);
      /* Cleared in the same batch as the step change, so the freshly mounted node is
       * already interactive. The guard costs no perceived latency. */
      transitionLock.current = false;
      setIsTransitioning(false);
    }, fadeDuration));
  }, fadeDelay));
}, [answers, currentStep, prefersReducedMotion, sendCompletionBeacon]);
```

Also required:

- **`disabled={isTransitioning}` on the answer pills** (`:918-921`). This is what makes
  Playwright's actionability check wait for the new node instead of clicking the doomed one,
  which closes the remount seam without a single line of test-side retry.
- **`disabled={isTransitioning}` on the back button** (`:843`) and an early
  `if (transitionLock.current) return;` in `goBack`. A back click mid-transition currently
  decrements `currentStep` while a pending advance is still queued, and the two fight.
- **Keep the disabled pill looking normal.** `cursor: isTransitioning ? "default" : "pointer"`
  and an explicit `opacity: 1`. The selected pill is the user's confirmation that the click
  registered — it must not grey out for half a second.
- **Hover handlers no-op while transitioning.** `onMouseEnter` / `onMouseLeave` (`:940-955`)
  mutate `e.currentTarget.style` directly; extend the existing `if (!isSelected)` guard to
  `if (!isSelected && !isTransitioning)`.
- **Clear the timers on unmount.** The chain currently leaks two timers per question and
  fires state updates into an unmounted tree if the user navigates away mid-fade.
  `useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);`

### Explicitly not changing

Fade timings stay at 200/300/400ms. Shortening the window was considered and rejected — it
changes the feel of the quiz, and the guard fixes the defect on its own.

### Reduced motion

With `prefersReducedMotion` both delays are 0, so the lock is held for two macrotasks
(~0-2 frames). Harmless, but the acceptance suite asserts the quiz still advances normally
under `prefers-reduced-motion: reduce` so the guard cannot regress into a stuck state.

### Rebuild

`src/nem-test-phase-b.tsx` is the source; `dist/nem-test-phase-b.webflow.tsx` is generated
and pasted into Webflow. After editing, run `npm run build:nem` (which also runs
`typecheck:nem`). CI gates `main` on generated-file drift — an unregenerated `dist/` fails
the build.

---

## Part B — One shared helper module for the quiz suites

### Why

Three specs each carry a private copy of the same helpers:

| Spec | `waitForTimeout` calls | State |
|---|---|---|
| `nem-test-conclusion-logic-v2.spec.js` | 0 | fixed 2026-08-19, 19 pass / 0 fail / 1 flaky |
| `nem-test-phase-b.spec.js` | **45** | not re-run since the fix |
| `nem-report-json-and-error-visibility.spec.js` | **15** | not re-run since the fix |

Both stale files also run on the config default `timeout: 30_000`. Expect the same timeouts
that produced the four "failures" on the first suite — the arithmetic is in the failures
report: ~15.6s of pure sleep per run-through, doubled in any test that compares two outcomes.

Duplication is also what let C6 drift: it hand-rolled the flow, so it never picked up the fix
that stopped every other test clicking a start button the live page does not have.

### The module

`tests/acceptance/helpers/nem-quiz.js`, lifted from the corrected
`nem-test-conclusion-logic-v2.spec.js:52-158`:

```js
export const STAGING = process.env.STAGING_URL || 'https://nem-life-1.webflow.io';
export const TEST_PAGE_NL = '/zelftesten/waarom-reageer-ik-zo';
export const TEST_PAGE_EN = '/en/zelftesten/waarom-reageer-ik-zo';
export const TOTAL_QUESTIONS = 20;
export const QUIZ_TEST_TIMEOUT_MS = 90_000;

export const ANSWER_LABELS_NL = ['nooit','zelden','soms','regelmatig','heel vaak'];
export const ANSWER_LABELS_EN = ['never','rarely','sometimes','regularly','very often'];

export function questionHeading(page)                      // h3, also the readiness signal
export async function waitForReady(page)
export async function readQuestion(page)                   // bounded innerText + sentinel
export async function loadPage(page, path, query)          // waits for question 1
export async function answerQuestion(page, label)          // waits for the heading to change
export async function answerAllQuestions(page, label)
export async function answerByLabels(page, labels[])       // conclusion-logic style
export async function answerByIndices(page, idx[], labels) // phase-b style (DUAL_PROFILE)
export async function fillProfileScreen(page, genderLabel = null)
export async function getConclusionText(page)
```

Both answer forms are needed: `nem-test-conclusion-logic-v2` drives the quiz with label
strings, `nem-test-phase-b` and `nem-report-json` use an index array (`DUAL_PROFILE`).
`fillProfileScreen(page, genderLabel = null)` subsumes phase-b's separate
`fillProfileScreenWithGender`.

Every comment explaining *why* a wait is shaped the way it is moves with the code — the
bounded `innerText` timeout, the "assert committed values rather than timing them" note on
the profile screen, and the budget rationale. They are the record of two wrong turns and are
worth more than the code they sit above.

### Ordering against Part A

1. Extract the module and repoint all three specs, **retry still in place**. Suites stay
   green and behaviour is unchanged.
2. Land Part A.
3. **Then** delete the retry from `answerQuestion` and re-run all three.

The retry disappearing without new flakiness is the proof that Part A worked. Removing it
first would just convert a known flake into a red suite.

### Beacon waits

`nem-report-json-and-error-visibility.spec.js` sleeps `waitForTimeout(2000)` seven times
waiting for the completion POST. Replace with an awaited matcher on the existing
`captureSubmit(page)` promise (`:65`) so the test proceeds the moment the request lands and
fails loudly if it never does, rather than asserting on an empty capture after 2s.

### Budget

`test.setTimeout(QUIZ_TEST_TIMEOUT_MS)` in a `beforeEach` in both stale specs. The sleeps are
gone, but two run-throughs against live staging still deserve headroom. Do not raise the
global config default — the non-quiz suites should keep failing fast.

---

## Part C — Intro-line plumbing (n8n)

### State

The client half is merged (`3d30e60`, `5c17265`) and covered by 21 unit tests. The component
already sends `introLine` in the `/submit` payload (`nem-test-phase-b.tsx:711`). The server
half does not exist:

| Hop | File / node | State |
|---|---|---|
| `/submit` `Normalize` | `backend/nem-submit.workflow.json` | does not read `b.introLine` |
| `/submit` `Store Profile` | same | no column in map or schema |
| `nem_test_profiles` | n8n Data Table `ib5Yh0yEfNpDqeuU` | **no `introLine` column** |
| `/verify` `Build HTML` | `backend/nem-verify.workflow.json` | reads the row as `p` — free once the column lands |

### Deliverable — a changeset, not a live edit

`projects/nem-life/.claude/backend/changesets/nem-intro-line-plumbing/`

```
README.md                       what, why, and the order to apply in
normalize.jsCode.js             full replacement for Normalize
store-profile.columns.json      the added mapping entry + schema entry
build-html.jsCode.js            full replacement for Build HTML
verify.sh                       asserts live matches, exits 1 on drift
```

Will adds the column in the n8n UI (the public API has no endpoint for it — established
2026-08-18) and applies the three node edits. Nothing here touches a live active workflow
unattended.

**Snapshot live and commit before editing.** n8n keeps no version history for these
workflows, so a stale snapshot is also a broken rollback point. Run `npm run check:nem-drift`
first; that is how the already-applied prompt-escaping changeset was discovered.

### `Normalize`

One line, in the v2 block so the grouping still reads:

```js
    outcome: b.outcome || '',
    conclusionKey: b.conclusionKey || '',
    conclusionId: b.conclusionId || '',
    // Selected client-side from the conclusion key alone — no gender. Empty until Alex's
    // Intro lines tab is exported; Build HTML renders nothing rather than a gap.
    introLine: (b.introLine || '').toString(),
```

### `Store Profile`

Add to `columns.value`:

```json
"introLine": "={{ $json.introLine }}"
```

and the matching `columns.schema` entry (`type: "string"`, all flags as siblings).

### `Build HTML` — lead paragraph under the heading

```js
const introLine = String(p.introLine || '').trim();
```

```js
  + '<style>' /* … existing … */
  + '.intro{font-family:Georgia,serif;font-size:18px;font-style:italic;color:#5a5757;margin:0 0 24px}'
  /* … */
  + '</style></head><body><h1>' + heading + '</h1>'
  + (introLine ? '<p class="intro">' + esc(introLine) + '</p>' : '')
  + '<p>' + greeting + ' ' + esc(p.firstName || '') + ',</p>'
  + body
```

Two properties matter and are both asserted:

- **Escaped.** Through the existing `esc()`. The lines are Christel's prose and will contain
  `&` and quotes, exactly like the section bodies.
- **Absent when empty.** No empty `<p>`, no stray margin. This is what lets the plumbing ship
  before the copy exists.

`reportText` is left alone — it is the plain-text alternative built from the five model
sections, and the intro line is fixed editorial copy, not model output.

### Drift invariants

`tools/nem/check-workflow-drift.js`, on the pattern already at `:202` and `:209`:

- `"Normalize keeps introLine"`
- `"Store Profile persists introLine"`
- `"Build HTML renders the intro line above the greeting, escaped"`

### Node test

New `tests/nem/nem-build-html.test.js`, using the extraction trick from
`nem-report-parse.test.js` — pull `Build HTML`'s real `jsCode` out of the committed snapshot
and run it against fixtures, so the module and the node cannot drift. Cases:

1. a populated `introLine` renders as `<p class="intro">` between the `<h1>` and the greeting
2. `&`, `<`, `>` and quotes in the line are escaped
3. `introLine: ''`, `null` and `undefined` each render **no** `<p class="intro">` at all
4. a whitespace-only line is treated as empty
5. the five sections and the greeting are unchanged in every case

### Not in scope

Alex's copy. `NL_INTRO` and `EN_INTRO` in `src/nem-intro-lines.js` are both `{}` because the
Intro lines tab does not exist in his sheet yet. Send him
`.claude/research/nem-intro-lines-template.csv`. This slice ships the pipeline; the copy drops
in later with no further code change.

---

## Barba Impact

**N/A — no Barba transitions.** nem-life has no Barba integration (`src/init.js` contains no
reference to it). The quiz is a Webflow code component rendering into a shadow DOM, mounted
by Webflow's own federation, and it owns its own lifecycle. The timer cleanup added in Part A
is plain React unmount hygiene, not a Barba concern.

---

## Task breakdown

| # | Task | Agent | Depends on |
|---|---|---|---|
| A1 | Guard `selectAnswer` with ref + state; clear timers on unmount | code-writer | — |
| A2 | `disabled` + cursor/opacity/hover on pills and back button | code-writer | A1 |
| A3 | `npm run build:nem`, commit regenerated `dist/` | code-writer | A2 |
| B1 | Create `helpers/nem-quiz.js`; repoint all three specs, retry intact | refactor | — |
| B2 | Replace beacon sleeps with the awaited `captureSubmit` matcher | refactor | B1 |
| B3 | 90s `beforeEach` budget in both stale specs | refactor | B1 |
| B4 | Delete the retry from `answerQuestion` | refactor | A3, B1 |
| B5 | Re-run all three acceptance specs | qa | B4 |
| C1 | Write the changeset (4 files + `verify.sh`) | code-writer | — |
| C2 | Three drift invariants | code-writer | C1 |
| C3 | `tests/nem/nem-build-html.test.js` | code-writer | C1 |
| C4 | Hand off: Will adds the column, applies, runs `verify.sh` | — | C1-C3 |
| D1 | Full review of the diff | code-reviewer | A3, B5, C3 |

### Parallelisation Map

**Two independent streams.** No file overlap at all:

| Stream | Files | Agent | Est. |
|---|---|---|---|
| **1 — A then B** | `src/nem-test-phase-b.tsx`, `dist/`, `tests/acceptance/**` | code-writer → refactor → qa | ~60-75 min (B5 is a live staging run, ~12 min of it) |
| **2 — C** | `backend/changesets/**`, `backend/*.workflow.json`, `tools/nem/`, `tests/nem/` | code-writer | ~35 min |

- **Sequential within stream 1:** A3 gates B4 gates B5. That chain is the whole point of the
  ordering and must not be collapsed.
- **Worktrees:** yes, if running both streams at once — separate worktrees, no shared paths,
  merge cleanly. Sequential in one worktree is also fine and simpler; the streams only
  genuinely need to be parallel if wall-clock matters.
- **Agent teams:** not warranted. Two streams, one agent each.
- **Join:** D1 reviews the merged diff.

### ADR needed?

**No.** Part A applies an established React pattern to one component; B is a straight
extraction the failures report already recommended; C follows the changeset workflow set by
`nem-report-prompt-escaping`. No decision here is hard to reverse.

---

## Test Plan

### Tier 1 — Auto: local / staging (runs during `/build` and `/debug`)

**New Playwright spec — `tests/acceptance/nem-quiz-transition-guard.spec.js`** (Part A).

**New node test — `tests/nem/nem-build-html.test.js`** (Part C, hermetic, no browser).

**Extended drift check** — `npm run check:nem-drift` gains three invariants (Part C).

**Re-runs** — the three existing acceptance specs, which are the real proof of Part B:

```bash
npx playwright test --config=tests/acceptance/playwright.config.js nem-test-conclusion-logic-v2
npx playwright test --config=tests/acceptance/playwright.config.js nem-test-phase-b
npx playwright test --config=tests/acceptance/playwright.config.js nem-report-json
```

`.env.test` does not exist locally; every spec falls back to `https://nem-life-1.webflow.io`,
so the runs work without it. Create it from `.env.test.example` if you need a different
staging target.

### Tier 2 — Auto: CDN regression (runs during `/deploy`)

`nem-quiz-transition-guard` registered in `tests/registry.json` under `testPages`. Note the
key is `testPages`, not `entries`.

### Tier 3 — Manual

| Check | Why it cannot be automated |
|---|---|
| Does a 500ms inert pill *feel* right, or read as a dead UI? | Subjective. The whole fix trades a dead click for a brief inert one; only a human can say the trade landed. |
| Tap during the fade on a real phone | Touch has its own dispatch and a ~300ms synthetic-click delay Playwright does not model. |
| Safari and Firefox | The Playwright config runs Chromium only. `disabled` plus CSS-animation interaction is engine-specific. |
| The intro line in the **rendered PDF** | `Render PDF` is an external service; only a real `/verify` execution produces the artefact. |
| The intro line reads well once Alex's copy lands | Editorial. Blocked on the Intro lines tab existing. |

---

## Verify Loop

### Part A — pass/fail

**Reproduce:** `https://nem-life-1.webflow.io/zelftesten/waarom-reageer-ik-zo`, wait for the
question 1 `h3`, click any answer pill, then click a second pill **within 400ms**.

Pass when all of these hold:

- During the transition every answer pill and the back button report `disabled`
  (`[disabled]` matches; `isDisabled()` is true).
- The second click does **not** change the recorded answer for the current question and does
  **not** advance the quiz by two. After the transition the heading is exactly one question
  further on.
- Clicking through all 20 questions, one click each, always advances — **zero retries
  needed**. `answerQuestion` with the retry removed passes 20/20.
- The pill's background and border are unchanged while disabled — the selected pill still
  reads as selected, and computed `opacity` is `1`.
- Under `prefers-reduced-motion: reduce` the quiz advances normally and never sticks with the
  pills disabled.
- Console is clean through a full run — in particular no "state update on unmounted
  component" warning from the timer chain.

### Part B — pass/fail

- `grep -c waitForTimeout` is **0** in all three quiz specs.
- All three import from `tests/acceptance/helpers/nem-quiz.js`; no spec defines its own
  `loadPage`, `answerQuestion` or `fillProfileScreen`.
- `answerQuestion` contains no retry loop.
- Three suites, **0 failed and 0 flaky**. One flaky is a fail here: the last flaky test was
  the swallowed click, so Part A must have removed it.
- `nem-test-conclusion-logic-v2` still passes 19/19 — the extraction must not regress the
  suite that was already green.

### Part C — pass/fail

- `npm run test:nem` green, including the new `nem-build-html.test.js`.
- `npm run check:nem-drift` exits 0 with the three new invariants reporting.
- After Will applies: `verify.sh` exits 0, and one live `/verify` execution produces a report
  whose first body paragraph after the `<h1>` is the intro line. With the tables still empty,
  the correct observed result is **no intro paragraph and no gap** — that is a pass, not a
  skip.

### Regression scope — what must not break

- **The completion beacon.** Part A touches the branch that calls `sendCompletionBeacon` at
  question 20. Section A of `nem-report-json-and-error-visibility.spec.js` must stay green:
  one row in `nem_test_completions`, none in `nem_test_profiles`, no personal fields.
- **The conclusion engine.** Untouched, but `nem-test-conclusion-logic-v2` is the guard
  against an accidental change to `answers` handling — the re-entrancy fix edits exactly the
  code that writes that array.
- **Flat outcomes.** `flat-low` / `flat-high` route to the contact link and never produce a
  report. Part C must not make an intro line appear on that path; the client already returns
  `''` when `result.skipsReport`, and the changeset must not paper over that.
- **The v2 fields through `/submit`.** `Normalize` and `Store Profile` are being edited;
  `outcome`, `conclusionKey`, `conclusionId` and `event` must still arrive. Invariants
  `:202` and `:209` already assert this and must keep passing.
- **`Send Report` unreachable from the failure branch.** The existing invariant at `:163`
  must keep passing after the `Build HTML` edit.

### How `/build` knows this is working

Four commands and one human read:

```bash
npm run test:nem            # Part C, hermetic
npm run check:nem-drift     # Part C, live n8n
npm run build:nem           # Part A, regenerates dist + typechecks
npx playwright test --config=tests/acceptance/playwright.config.js nem-   # Parts A + B
```

Green on all four, with **0 flaky** on the Playwright run, means A and B are done. C is done
when `verify.sh` exits 0 after Will's paste. The Tier 3 feel check is the only thing left to
a human.

---

## Acceptance Tests

`tests/acceptance/nem-quiz-transition-guard.spec.js`:

1. `answer pills are disabled while the question transition is in flight`
2. `the back button is disabled while the transition is in flight`
3. `a second click during the fade does not skip a question`
4. `a second click during the fade does not overwrite the recorded answer`
5. `twenty single clicks advance twenty questions with no retry`
6. `the selected pill stays visually selected while disabled`
7. `the quiz advances normally under prefers-reduced-motion`
8. `pills re-enable as soon as the next question renders`
9. `no console errors through a full run`

Part B has no acceptance test of its own — it is test infrastructure, and its verification is
the re-run of the three existing suites. Part C has no browser surface at all: the intro line
appears only in the emailed report, so it is covered by `tests/nem/nem-build-html.test.js`,
the drift invariants, and one live execution.
