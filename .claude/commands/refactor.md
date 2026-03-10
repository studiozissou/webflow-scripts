Refactor code after a feature or project build — improve structure, then verify with review and tests.

## Usage
- Single file: `/refactor projects/<client>/orchestrator.js`
- Feature scope: `/refactor projects/<client>/` — review all modules for cross-file improvements
- Slug scope: `/refactor [slug]` — refactor files touched by a specific queue item

## Process

### 0. Plan (plan mode)
Enter plan mode. Read all target files and analyse them against the refactor targets below.

- List every proposed change with file, location, and what will change
- For each change, write a plain English summary explaining *why* this improves the code (no jargon — a non-developer should be able to follow it)
- For each change, include at least one concrete test describing how to verify the behaviour is preserved (e.g. "check element X still shows Y", "grep for Z returns zero matches")
- Group changes by type (extraction, cleanup, pattern unification, etc.)
- Flag any changes that are borderline behaviour changes
- Exit plan mode and wait for user approval before touching any code

### 0.5. MCP baseline capture (skip if no MCP)

Reference the `playwright-webflow` skill for MCP guard and ad-hoc check patterns.

Before any code changes, capture the current state for comparison:
1. **Desktop screenshot** — `browser_resize` 1280×800, `browser_navigate`, `browser_take_screenshot`
2. **Mobile screenshot** — `browser_resize` 375×812, `browser_navigate`, `browser_take_screenshot`
3. **Console baseline** — `browser_console_messages`, record count and types
4. **Animation state** (if refactoring animation code) — scroll to animated section, wait per timing table, screenshot + `browser_evaluate` to capture GSAP timeline/ScrollTrigger counts
5. **DOM snapshot** — `browser_snapshot` of affected sections

Store these as the baseline for step 3.5 comparison.

If MCP is not connected, log "MCP browser not available — skipping baseline capture" and continue.

### 1. Refactor (Opus max-effort)
Apply the approved changes using the `refactor` agent with `model: "opus"` at max effort.

- Apply changes using Edit (prefer targeted edits over full rewrites)
- Skip any changes the user rejected in the plan review
- Work one file at a time

### 2. Review (Sonnet)
Use the `code-reviewer` agent with `model: "sonnet"` on every file that was changed.

- Run a structured PASS / WARN / FAIL review
- If any FAIL verdicts: fix, then re-review until clean
- WARN verdicts: flag to user, proceed if acknowledged

### 3. Test
Run the project's test suite to verify nothing broke.

- Run `npm test` from the project directory
- If tests fail: fix the regression, return to step 2
- If no test suite exists: run `/qa-check` on the changed files instead

### 3.5. MCP post-refactor comparison (skip if no MCP or no baseline)

Repeat the same captures as step 0.5 and compare:
1. **Visual match** — desktop and mobile screenshots should be visually identical to baseline
2. **No new console errors** — error count should not increase vs. baseline
3. **Same GSAP counts** — timeline/ScrollTrigger instance counts should match baseline
4. **DOM structure** — key selectors from baseline should still be present

If differences are found:
- Report with before/after details
- Ask user to confirm the difference is expected (refactoring sometimes intentionally changes DOM)

If a pre-existing bug is found in both baseline and post-refactor:
- Offer to generate a regression test using the bridge template from the `playwright-webflow` skill

Repeat steps 2–3.5 until review passes and tests are green.

## Common refactor targets
- Duplication across modules → extract to shared utility
- Pattern drift (same thing done differently in two places) → unify
- Dead code from iteration → remove
- Large orchestrators doing too many things → extract page modules
- Repeated DOM queries → cache in `const` at module scope
- Callback chains → async/await
- Inline animation timelines → named timeline functions
- Missing `destroy()` / cleanup on Barba transitions
- Magic numbers → named constants

## Rules
- Do not change behaviour — refactoring only
- Do not add features, comments, or type annotations to unchanged code
- Preserve the IIFE + `window.RHP` module pattern
- Every edit must pass the review + test loop before moving to the next file
