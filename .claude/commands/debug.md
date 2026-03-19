# /debug Command

## Model split
- **Opus max-effort** for hypothesising (step 2), instrumentation (step 3), and fix application (step 5)
- **Sonnet** for parallel hypothesis agents (step 2-deep), confirmation/regression checks (step 6), and post-fix review

## Usage
```
/debug "brief description of the problem"
/debug "jam.dev/j/abc123"
```

---

## Pre-Flight (read-only)

1. **Read CLAUDE.md** — note deployment model, known gotchas, module load order
2. **Check queue.json** — is there an existing item related to this problem? If yes, reference it throughout
3. **Test inventory** — read `tests/registry.json`, check for existing acceptance tests related to the affected module/page. Present:
   ```
   Test inventory:
     Registry entries: N total (M critical)
     Related tests:    [list any specs matching affected files/slugs, or "none"]
     Playwright MCP:   [connected / not connected]
   ```
4. **Check recent git diff** — `git diff HEAD~3` — any changes that correlate with the problem appearing?
5. **Confirm environment** — ask if not obvious:
   - Staging or production?
   - Localhost detection active? Is `npx serve .` running?
   - jsDelivr URL — does it match current `git rev-parse HEAD`?
5. **Live DOM verification (if Playwright MCP connected)** — Reference the `playwright-webflow` skill's MCP availability guard. Navigate to the affected page on staging, then `browser_snapshot` to capture the live rendered DOM. Document:
   - Actual selectors and class names present (vs what the code expects)
   - Dynamically injected elements or CMS-rendered items
   - Any missing or unexpected DOM nodes relevant to the reported bug
   - If Playwright MCP is not connected, skip and continue — this step is optional

---

## Notion push: Debugging
If this debug session is related to a tracked task (user names a slug):
Update queue.json status to Debugging.
Push to Notion: Status "Debugging", set Last Updated.
If Notion fails, log warning and continue.
If not related to a tracked task, skip this step.

---

## Jam Intake

If the user provides a Jam URL (`jam.dev/...`) or Jam UUID upfront, run this immediately.

Otherwise, **prompt for a Jam link and design reference** when the bug cannot be automatically tested — i.e. when all hypotheses in Step 2b are marked "None" (visual-only, timing-dependent, interaction-specific, or no DOM signal). Ask:
> *"This bug looks hard to reproduce automatically. Do you have:*
> *1. A Jam recording? Paste a jam.dev link and I'll pull console errors, network failures, and the interaction timeline.*
> *2. A Figma link or screenshot showing the expected behaviour? This helps compare the bug against the intended design."*

If the user provides a Jam link, run the Jam steps below. If they provide a Figma link, run the Design Reference steps below. If they decline both, continue without them.

When a Jam URL or ID is available:

1. **getDetails** — pull description, author, type (video/screenshot), timestamps
2. **getConsoleLogs** (logLevel: `"error"`) — pull JS errors and stack traces
3. **getNetworkRequests** (statusCode: `"4xx"` then `"5xx"`) — pull failed HTTP requests
4. **getUserEvents** — pull the interaction timeline for reproduction steps
5. **Conditional on Jam type** (from getDetails):
   - Video → **analyzeVideo** + **getVideoTranscript** (narration context)
   - Screenshot → **getScreenshots** (visual evidence)
6. **getMetadata** — pull custom SDK metadata if present

Present a structured summary before proceeding:
```
## Jam Bug Report: [title from getDetails]
**Reporter:** [author]  **Type:** [video/screenshot]  **Date:** [timestamp]
**Description:** [from getDetails]
**Console errors:** [count] — [top error summary]
**Failed requests:** [count] — [top failures]
**User flow:** [summarised interaction timeline]
**Visual evidence:** [screenshot description or video analysis summary]
```

Use this summary to pre-fill the Isolate step — skip manual reproduction if the Jam provides sufficient evidence.

### Design Reference (if Figma link or screenshot provided)

If the user provides a design reference alongside or instead of a Jam link:

- **Figma URL** → call **get_design_context** (from Figma MCP) with the fileKey and nodeId. Extract the intended layout, spacing, colours, and component structure. If the node is a specific component, also call **get_screenshot** for a visual snapshot.
- **Screenshot / image file** → read the image directly as visual reference.

Present alongside the Jam summary (or standalone if no Jam):
```
## Expected Design
**Source:** [Figma link or screenshot path]
**Key details:** [layout, colours, spacing, typography, component state — whatever is relevant to the bug]
```

Use the design reference to:
- Compare "what it should look like" against the Jam evidence or live site
- Identify specific CSS/layout deviations in the Isolate step
- Validate the fix matches the intended design in the Confirm step

---

## Diagnostic Loop

Activate the **debug skill** and run its full loop:

1. **Isolate** — confirm error is real, repeatable, and scoped
   - **Jam-sourced isolation** (if Jam Intake ran): use the Jam summary as primary evidence. Console errors seed hypotheses, user events define reproduction steps, screenshots/video provide visual confirmation. Only fall through to MCP reproduction if Jam data is insufficient.
   - **MCP-assisted reproduction** (if MCP connected — reference `playwright-webflow` skill for guard):
     - `browser_navigate` to the affected page, capture `browser_console_messages` + `browser_snapshot`
     - If interaction-triggered: replay clicks/hovers/scrolls with `browser_click`/`browser_hover`, take screenshots at each step
     - If responsive: `browser_resize` to the reported breakpoint, take screenshot
     - If network-related: `browser_network_requests` for failed requests
     - Record: "Reproduced via MCP" or "Could not reproduce via MCP"
   - If MCP is not connected, continue with standard code-reading isolation

1.5. **Investigation gate** — after isolation, ask the user:

   > "Quick fix or deep investigation?"
   > - **Quick** — proceed with standard sequential H1–H3 (Steps 2–6 below, current behaviour)
   > - **Deep** — spawn 3 parallel hypothesis agents (Step 2-deep below)

   Default to **Quick** if isolation evidence points to a single obvious cause (typo, missing selector, wrong variable name).

2. **Hypothesise** (quick mode) — state H1–H3 ranked before touching anything

   **— OR —**

   **2-deep. Parallel hypothesis investigation** (deep mode) — spawn 3 parallel Explore subagents (`subagent_type: "Explore"`, `model: "sonnet"`), one per hypothesis. Each agent receives:
   - The bug description and isolation evidence
   - Error messages, stack traces, Jam data (if available)
   - ONE specific hypothesis to investigate
   - Instructions to: read relevant code paths, check `git log` for related changes, look for similar patterns in CLAUDE.md known issues
   - **Read-only** — agents must not modify files

   Subagent prompt template:
   ```
   You are investigating ONE hypothesis for a bug. Read-only — do not modify files.

   ## Bug Description
   {bug description}

   ## Isolation Evidence
   {error messages, stack traces, reproduction steps, Jam data if available}

   ## Your Hypothesis
   {specific hypothesis}

   ## Your Task
   1. Read the code paths relevant to this hypothesis
   2. Check git history: `git log --oneline -20 -- {relevant files}` for recent changes
   3. Look for similar known issues in CLAUDE.md or .claude/logs/
   4. Find evidence FOR this hypothesis (code that could cause the bug)
   5. Find evidence AGAINST this hypothesis (guards or patterns that should prevent it)
   6. Rate your confidence (0–100)

   ## Return Format
   - **Hypothesis:** {name}
   - **Confidence:** {0-100}
   - **Evidence FOR:** {list with file:line references}
   - **Evidence AGAINST:** {list}
   - **Code locations:** {file:line for each relevant location}
   - **Suggested fix direction:** {1-2 sentences}
   - **Test design:** {Playwright/Unit/MCP/None} — assert {condition}
   ```

   After all 3 agents return, rank by confidence:

   | Hypothesis | Confidence | Evidence | Code Location | Suggested Fix |
   |-----------|-----------|----------|---------------|---------------|
   | H1: ...   | 90        | ...      | file.js:42    | ...           |
   | H2: ...   | 45        | ...      | module.js:88  | ...           |
   | H3: ...   | 20        | ...      | init.js:15    | ...           |

   Proceed to Step 3 starting with the highest-confidence hypothesis.

   2b. **Test Design** — for each hypothesis, specify the test that would confirm or falsify it (Playwright E2E, Node unit, MCP ad-hoc, or "None" with reason). Reference the `playwright-webflow` skill for bridge template and timing. (In deep mode, test designs are included in the subagent returns above.)
3. **Instrument** — targeted logging only, no logic changes
4. **Validate** — run instrumented code, one hypothesis at a time
5. **Fix** — use the **opus model** when applying fixes. Apply only after hypothesis is confirmed; if confidence < 80% pause and ask
6. **Confirm** — verify fix, check for regressions, remove all instrumentation

### Verify loop (Playwright MCP default)

After applying the fix, run a local verify loop — same pattern as `/build`:

   a. `browser_navigate` to the affected page on STAGING_URL
   b. **Console check** — `browser_console_messages`, filter benign noise. FAIL on real errors.
   c. **DOM snapshot** — `browser_snapshot`, confirm the fix is reflected in the DOM.
   d. **Desktop screenshot** — `browser_resize` 1280×800, `browser_take_screenshot`
   e. **Mobile screenshot** — `browser_resize` 375×812, `browser_take_screenshot`
   f. **Reproduction replay** — replay the exact MCP steps from Isolate. Verify original error is gone.
   g. Compare before/after screenshots — flag any visual regressions.
   h. Run the bridge regression test (if generated in Post-Fix step 1 below):
      ```
      npx playwright test tests/acceptance/debug-SLUG.spec.js --config=tests/playwright.config.js --reporter=list
      ```
   i. Run smoke + a11y suites as regression: `npm test`

   On FAIL: fix and re-verify (return to step 5). Track iteration count — after 5 failed iterations, stop and ask user.

   **Fallback** (no MCP): Run regression test and smoke/a11y suites directly via `npx playwright test`. If no tests exist, run smoke + a11y only and warn.

---

## Post-Fix

1. **Bridge regression test** — capture the bug as a permanent test:
   - Search `tests/acceptance/` for an existing test covering this case
   - If not covered: generate a regression spec using the bridge template from the `playwright-webflow` skill
     - Use the debug summary (error, root cause, reproduction steps) as the basis — works even without MCP
     - If MCP was used: include the exact reproduction steps from the Isolate phase
   - Run the generated spec — include in the fix commit if it passes
   - If it fails or no spec is appropriate, skip and note in the debug log

1-registry. **Register in regression database**

If a bridge regression test was generated in step 1:
1. Read `tests/registry.json` in the project root
   - If the file doesn't exist, create it with `{ "version": 1, "lastUpdated": "TODAY", "entries": [] }`
2. If an entry with matching `id` already exists → update its `description` field
3. If new → append an entry with:
   - `id`: the debug slug (e.g. `fix-memory-leak-cleanup`)
   - `file`: path to the generated spec (e.g. `tests/acceptance/fix-memory-leak-cleanup.spec.js`)
   - `type`: `"regression"`, `source`: `"debug"`, `critical`: `false`
   - `slug`: the debug slug
   - `created`: today's date (YYYY-MM-DD)
   - `description`: "Regression — [root cause summary]"
4. Update the top-level `lastUpdated` to today's date
5. Write `tests/registry.json`

Skip if no regression test was generated.

1a. **Manual test list** — identify anything the fix affects that can't be automated:
   - Interactions requiring real user input (drag, multi-touch, audio)
   - Cross-browser (Safari, Firefox) — Playwright only runs Chromium
   - Mobile device-specific (iOS video autoplay, Safari scroll)
   - Visual polish (animation timing feel, easing curves)
   - If the fix is purely logic/code with no manual aspects, note "No manual tests needed"

1b. **Jam comment** (if Jam was used in intake): post a fix summary back to the Jam via **createComment**:
   ```
   Fix applied: [brief description]
   Root cause: [confirmed hypothesis]
   Commit: [git rev-parse HEAD]
   ```

2. **Write debug log** to `.claude/logs/debug-[slug]-[YYYY-MM-DD].md` using this format:
```
## Debug Summary
**Problem:** [input description]
**Error:** [exact error message or behaviour]
**Root cause:** [confirmed hypothesis]
**Fix applied:** [what changed and why]
**Confirmed:** [how verified]
**Jam source:** [Jam URL or "none"]
**MCP used:** [yes — reproduced + verified / no]
**Regression test:** [path to spec or "not applicable"]
**Registry entry:** [id or "not registered"]
**Manual tests:** [list or "none"]
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

## Tier 3 — Manual Test Checklist

Before closing, present the **Tier 3 — Manual Test Checklist** from Post-Fix step 1a to the user with checkboxes. If there are no manual tests, note "No manual tests needed" and continue.

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
