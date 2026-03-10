# /debug Command

## Model split
- **Opus max-effort** for hypothesising (step 2), instrumentation (step 3), and fix application (step 5)
- **Sonnet** for confirmation/regression checks (step 6) and post-fix review

## Usage
```
/debug "brief description of the problem"
```

---

## Pre-Flight (read-only)

1. **Read CLAUDE.md** — note deployment model, known gotchas, module load order
2. **Check queue.json** — is there an existing item related to this problem? If yes, reference it throughout
3. **Check recent git diff** — `git diff HEAD~3` — any changes that correlate with the problem appearing?
4. **Confirm environment** — ask if not obvious:
   - Staging or production?
   - Localhost detection active? Is `npx serve .` running?
   - jsDelivr URL — does it match current `git rev-parse HEAD`?

---

## Notion push: Debugging
If this debug session is related to a tracked task (user names a slug):
Update queue.json status to Debugging.
Push to Notion: Status "Debugging", set Last Updated.
If Notion fails, log warning and continue.
If not related to a tracked task, skip this step.

---

## Diagnostic Loop

Activate the **debug skill** and run its full loop:

1. **Isolate** — confirm error is real, repeatable, and scoped
   - **MCP-assisted reproduction** (if MCP connected — reference `playwright-webflow` skill for guard):
     - `browser_navigate` to the affected page, capture `browser_console_messages` + `browser_snapshot`
     - If interaction-triggered: replay clicks/hovers/scrolls with `browser_click`/`browser_hover`, take screenshots at each step
     - If responsive: `browser_resize` to the reported breakpoint, take screenshot
     - If network-related: `browser_network_requests` for failed requests
     - Record: "Reproduced via MCP" or "Could not reproduce via MCP"
   - If MCP is not connected, continue with standard code-reading isolation
2. **Hypothesise** — state H1–H3 ranked before touching anything
   2b. **Test Design** — for each hypothesis, specify the test that would confirm or falsify it (Playwright E2E, Node unit, MCP ad-hoc, or "None" with reason). Reference the `playwright-webflow` skill for bridge template and timing.
3. **Instrument** — targeted logging only, no logic changes
4. **Validate** — run instrumented code, one hypothesis at a time
5. **Fix** — use the **opus model** when applying fixes. Apply only after hypothesis is confirmed; if confidence < 80% pause and ask
6. **Confirm** — verify fix, check for regressions, remove all instrumentation
   - **MCP-assisted verification** (if MCP was used in Isolate):
     - Replay the exact same MCP steps from Isolate
     - Compare before/after screenshots
     - Verify original error is gone from `browser_console_messages`
     - If error persists: return to step 2 with new evidence

---

## Post-Fix

1. **Bridge regression test** — capture the bug as a permanent test:
   - Search `tests/acceptance/` for an existing test covering this case
   - If not covered: generate a regression spec using the bridge template from the `playwright-webflow` skill
     - Use the debug summary (error, root cause, reproduction steps) as the basis — works even without MCP
     - If MCP was used: include the exact reproduction steps from the Isolate phase
   - Run the generated spec — include in the fix commit if it passes
   - If it fails or no spec is appropriate, skip and note in the debug log

2. **Write debug log** to `.claude/logs/debug-[slug]-[YYYY-MM-DD].md` using this format:
```
## Debug Summary
**Problem:** [input description]
**Error:** [exact error message or behaviour]
**Root cause:** [confirmed hypothesis]
**Fix applied:** [what changed and why]
**Confirmed:** [how verified]
**MCP used:** [yes — reproduced + verified / no]
**Regression test:** [path to spec or "not applicable"]
**Test design:** [H1: type — assertion / H2: type — assertion / None: reason]
**Related queue item:** [slug or none]
**Gotcha added to CLAUDE.md:** [yes / no — include entry if yes]
```

2. **Update CLAUDE.md** — if root cause reveals a recurring pattern, add it to Known Gotchas

3. **Promote if needed** — if the confirmed fix requires a proper build (non-trivial change, touches multiple files, needs QA):
   - Ask: *"This looks non-trivial — shall I add it to the queue as Ready to Build?"*
   - If yes: create queue item with slug, summary, and link to debug log

---

## Test Foundation

Before closing the session, assess and grow the project's test coverage:

1. **Check existing coverage** — does `tests/acceptance/` have specs for the affected page or module?
   - If yes: confirm the bridge regression test (from Post-Fix step 1) is integrated
   - If no: flag the gap

2. **Baseline recommendation** (if no test suite exists for the project):
   Ask: *"There are no acceptance tests for [project]. Want me to scaffold canary + smoke + a11y baseline from the test templates?"*
   Reference templates:
   - `tests/templates/canary.spec.template.js`
   - `tests/templates/smoke.test.template.js`
   - `tests/templates/a11y.test.template.js`
   If user agrees, generate the baseline tests before closing.

3. **Run the regression test** (if bridge test was written in Post-Fix):
   ```
   npx playwright test tests/acceptance/debug-[slug].spec.js --config=tests/acceptance/playwright.config.js --reporter=list
   ```
   Report result. If it fails, flag but don't block — it's a regression net, not a gate.

4. **Flaky test handling** — if a regression test passes locally but fails inconsistently on staging:
   - Mark with `test.fixme('flaky on staging — [reason]')` rather than deleting
   - Note in the debug log: "Regression test: quarantined — [reason]"
   - The test stays in the codebase as documentation of the bug, runnable when staging stabilises

5. **Failure ceiling** — if the bridge regression test fails after 2 attempts:
   - Log it as "Regression test: pending — could not stabilise" in the debug log
   - Do NOT block the debug session from closing
   - The fix still ships; the test is a best-effort addition

6. **Test Foundation is opt-in** — if the user declines the baseline recommendation, log "Test baseline: declined" and move on. No debug session should be blocked by test infrastructure gaps.

---

## Notion push: post-debug status
If this was related to a tracked task:
Ask user for status (same as /build wrap-up: ready-for-review / blocked / building).
Update queue.json and push to Notion accordingly.
If Notion fails, log warning and continue.

---

## Rules
- Read-only until a hypothesis is confirmed — no speculative edits
- Never change two things simultaneously
- Never commit a fix that still has debug instrumentation in it
- If the problem can't be reproduced, say so and stop — don't guess
- Every hypothesis must have a corresponding test design (Playwright, Unit, MCP, or explicit "None/Skip") before instrumentation begins — but test design never blocks the diagnostic loop
- Regression tests are best-effort: quarantine flaky tests with `test.fixme()`, don't delete them
