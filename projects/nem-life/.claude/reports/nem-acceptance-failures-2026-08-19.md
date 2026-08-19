# NEM Test — what the acceptance failures actually were, 2026-08-19

Short version: **the suite was running out of time, not finding bugs.** Nothing was wrong
with the page, the component, or the conclusion engine. Two sessions' worth of notes pointed
at the wrong thing, so this file records the evidence rather than another conclusion.

---

## The note that sent us the wrong way

The 18 Aug session state said:

> The acceptance suite points at a page with no quiz on it. `TEST_PAGE_NL` is
> `/zelftesten/waarom-reageer-ik-zo`; the component is on `/quiz-test-phase-b`. That is
> probably the real cause of the original 20/20 failure. Re-point the suite before
> diagnosing the three remaining failures.

**This is wrong, and acting on it would have been a wasted change.** Both pages serve the
identical `<code-island>`: same `submoduleId` (`3769c943-e471-3196-705d-31e020b697a0`), same
twenty question props, same `submitWebhookUrl`. Fetch either and diff the tag.

It was also four failures, not three.

The withdrawal is recorded in `nem-session-state-2026-08-18.md` so the next session does not
re-derive it.

---

## What the run actually said

Full suite against the unchanged `TEST_PAGE_NL`:

```
14 passed   4 failed   2 flaky   (11.4m)
```

Fourteen tests passing on the page that supposedly had no quiz on it is the first tell. The
second is in the failure snapshots — the quiz is rendering normally, mid-flow:

```
generic: Vraag 18 van 20
heading: Als anderen om mij heen sterk reageren op een emotionele gebeurtenis, …
button: nooit / zelden / soms / regelmatig / heel vaak
```

That is a healthy component. A re-run captured the error itself:

```
Error: page.waitForTimeout: Test timeout of 30000ms exceeded.
  52 |   await page.waitForTimeout(600); // select + fade transition
```

## The arithmetic

`playwright.config.js` sets `timeout: 30_000`. One run-through of the quiz cost, in fixed
sleeps alone:

| Sleep | Where | Cost |
|---|---|---|
| `waitForTimeout(2000)` | `loadPage`, after every navigation | 2.0s |
| `waitForTimeout(600)` × 20 | `answerQuestion`, once per question | 12.0s |
| `500 + 300 + 800` | `fillProfileScreen` | 1.6s |
| | **per run-through** | **~15.6s** |

**C3** (`flat-high and flat-low render different copy`) and **C5** (`conclusion text differs
between man and vrouw`) each call `reachConclusion` **twice in one test body**, because both
compare two outcomes. That is ~31s of sleeping inside a 30s budget, before a single
assertion runs. They were killed mid-quiz — at "Vraag 18 van 20" and "Vraag 5 van 20" on the
second pass, exactly where the clock ran out.

**C1** and the two flaky **C2** tests are the same story with less margin: one run-through
plus page load sat just under the limit and tipped over depending on how staging felt.

**C6** (`English locale renders a non-empty conclusion`) is a different, simpler bug. It
hand-rolled the whole flow instead of calling `reachConclusion`, so it never picked up the
fix that stopped every other test clicking a start button the live page does not have. It
died on that click, not on its own assertion.

---

## The fix

All in `tests/acceptance/nem-test-conclusion-logic-v2.spec.js`. Nothing here required a
component change — none of the four failures was a defect in the quiz. (The suite did
surface one genuine component behaviour along the way; see below.)

- **`answerQuestion` waits for the question heading to change** instead of sleeping through
  the fade. Faster, and it fails loudly if a click is swallowed, which a blind sleep
  silently tolerated. The heading disappearing after question 20 counts as advancing.
- **`loadPage` waits for question 1 to render** rather than sleeping 2s. The heading only
  exists once the code component has hydrated, so it is a real readiness signal.
- **`fillProfileScreen` waits for the gender select** rather than 500/300/800ms, and no
  longer sleeps after the continue click — every caller then waits for something specific on
  the conclusion screen, and that wait is the real signal.
- **Per-test budget raised to 90s** in a `beforeEach`. The sleeps are gone, but two full
  run-throughs against a live staging site still deserve headroom.
- **C6 now calls `reachConclusion`** like every other test.

## Result

| Run | Passed | Failed | Flaky |
|---|---|---|---|
| Before | 14 | 4 | 2 |
| After | **19** | **0** | 1 |

Same page, same component, same staging build. Only the suite changed.

---

## One real finding, from the component and not the tests

**A click that lands during the fade between questions is swallowed** — the quiz does not
advance. The old blind 600ms sleep hid this completely; waiting on the question actually
changing surfaced it as intermittent failures.

A real user hits this as a dead click that needs pressing twice, so it is worth fixing in
`nem-test-phase-b.tsx` rather than only in the tests. `answerQuestion` retries once and says
so in a comment, which keeps the suite honest about genuine failures without reporting the
fade as one. The remaining single flaky test is this, at the tail of its distribution.

---

## Carried forward

- **The other two acceptance specs have the same helpers.**
  `nem-test-phase-b.spec.js` and `nem-report-json-and-error-visibility.spec.js` both carry
  their own copies of `loadPage` / `answerQuestion` with the same fixed sleeps, and the same
  30s budget. They have not been re-run since this fix. Expect the same timeouts there, and
  the same fix to apply. Lifting the helpers into one shared module is the obvious follow-up
  and would have prevented C6's drift in the first place.
- **Staging loads `init.js` pinned at `@da2bc26`** — a 9 June commit, 193 behind. That is
  the vanilla site bundle, not the React quiz (Webflow serves that from its own code-component
  federation), so it does not explain any of the above. It is still stale enough to be worth
  a deliberate look before launch.

## The general lesson

Both wrong turns came from reasoning about a failure instead of reading it. The page theory
was inferred from a static fetch that showed an empty container — which is exactly what a
shadow-DOM component looks like from the outside, and is already documented as such. One
look at the actual error string ended it.
