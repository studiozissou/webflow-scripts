Build a feature end-to-end using the appropriate agents.

## Notion push: Building (if Notion connected)
Update queue.json: set this slug's status to Building.
Push to Notion: update Status to "Building", set Last Updated.
If Notion fails, log warning and continue.

## Prerequisites

Before starting the build, check for:
- `.env.test` with STAGING_URL (needed for verify loop)
- `tests/acceptance/SLUG.spec.js` (generated during /plan)
- `.claude/scripts/purge-cdn.sh` (needed for CDN cache busting)

If any are missing, warn the user but continue — the verify loop will be skipped.

## Process

0. **Log slug** (if `log-slug.sh` exists): Run `.claude/scripts/log-slug.sh build_start <feature-slug>`.
1. Read the spec from `.claude/specs/` (if it exists) or ask for a description.
2. Read all relevant existing files before writing anything.

### Selector verification (if Webflow MCP connected)

Before writing JS targeting elements by class or data attribute:
1. Use `element_snapshot_tool` to read target page DOM
2. Confirm every selector exists
3. If missing, stop and ask — do not assume it appears at runtime
4. Document confirmed selectors in CLAUDE.md under "## Known selectors"

### Spacing check

Before writing any layout code:
- Use Client First spacer divs for vertical rhythm between components
- Use flex or grid for component-internal layout
- Absolute placements: nearest approximation, add comment:
  `/* manual placement — verify against design */`
- Never create custom spacing variables or classes if Client First covers it

### Implementation (fresh context — GSD-inspired)

Spawn a **Task agent** (`subagent_type: code-writer`) to execute steps 3–7 in a fresh context.
This prevents context rot when building multiple components in a single session.

**Context to load into the executor prompt:**
- The full spec from `.claude/specs/SLUG.md`
- The project CLAUDE.md
- The acceptance test from `tests/acceptance/SLUG.spec.js` (if it exists)
- The existing orchestrator.js for this project
- Any files the spec references as dependencies
- Selector verification results from step 2 (if Webflow MCP was used)
- The spacing check rules from the "Spacing check" section above

**Instructions for the executor:**

3. Use the `code-writer` agent to implement the feature.
4. If the feature has motion/animation, apply the `gsap-scrolltrigger` or `barba-js` skill as appropriate.
5. Use the `refactor` agent on all changed files. Instruction: "Refactor the implementation for clarity and pattern compliance. Do not change behaviour."
6. Use the `code-reviewer` agent to review all changes. Handle the verdict:
   - **PASS** — return results to parent context.
   - **WARN** — include warnings in results, then return.
   - **FAIL** — fix the issues, then re-run the code-reviewer. Max 3 review cycles. After 3 failures, return failure report to parent context.
7. Run `/qa-check` automatically.

**Return to parent context:**
- List of files created/modified
- Code-reviewer verdict (PASS/WARN/FAIL)
- QA check results
- Any warnings or blockers

After the executor returns, continue with the verify loop (steps 8–12) in the parent context.

## Verify loop

After code review passes and QA is clean, deploy and test against the live staging site.
Skip this section if the project has no `.env.test`, no acceptance tests, or no `purge-cdn.sh`.

8. Stage, commit, and push:
    ```
    git add .
    git commit -m "feat(SLUG): description of changes"
    git push
    ```

9. Purge the CDN cache:
    Run: `.claude/scripts/purge-cdn.sh`
    This purges changed JS/CSS files from jsDelivr and waits 30s.

10. Run the acceptance tests for this feature:
    ```
    npx playwright test tests/acceptance/SLUG.spec.js --config=tests/playwright.config.js --reporter=list
    ```

11. If ANY test fails:
    a. Read the full failure output carefully
    b. Identify the root cause — is it a code bug, a timing issue, or a wrong selector?
    c. If timing issue: increase the waitForTimeout value and retry
    d. If wrong selector: check the Webflow staging site to confirm the correct selector
    e. If code bug: fix the code
    f. Go back to step 8 (commit, push, purge, test again)
    g. Track iteration count. After 8 failed iterations on the SAME test:
       - Stop and report to the user
       - List what's failing and what you've tried
       - Ask for guidance before continuing

12. If ALL acceptance tests pass:
    a. Run the full smoke test suite:
       `npx playwright test tests/smoke.test.js --config=tests/playwright.config.js --reporter=list`
    b. Run accessibility tests:
       `npx playwright test tests/a11y.test.js --config=tests/playwright.config.js --reporter=list`
    c. Report results of both suites
    d. If smoke or a11y tests fail, report the failures but don't loop —
       these are existing tests, not part of this feature's acceptance criteria

## Rules
- Never start writing code without reading existing files first
- Always check `shared/utils.js` and the project orchestrator before adding new utilities
- Leave no console.log statements in completed code
- Mark all tasks complete in queue.json when done
- Verify all selectors via Webflow MCP before writing JS that targets them (if MCP connected)
- Use Client First spacer divs for vertical rhythm — no margin-top/bottom between components
- **Log slug** (if `log-slug.sh` exists): After marking tasks complete, run `.claude/scripts/log-slug.sh build_end <feature-slug>`

## Wrap up
Before finishing, ask: "Status for SLUG?"
Offer: in-progress / blocked / ready-for-review / done
If blocked, ask: "What's blocking you?"
Log (if `log-slug.sh` exists): `.claude/scripts/log-slug.sh status_CHOSEN SLUG`

## Notion push: final status (if Notion connected)

Based on the status the user chose in the wrap-up:

- **ready-for-review:**
  Update queue.json status to Ready to Review.
  Push to Notion: Status "Ready to Review", clear Blocker field.

- **blocked:**
  Update queue.json status to Blocked.
  Push to Notion: Status "Blocked", set Blocker to the reason the user gave.

- **in-progress** (not done yet, just pausing):
  Update queue.json status to Building.
  Push to Notion: Status "Building".

- **done:**
  Update queue.json status to Done.
  Push to Notion: Status "Done".

Always set Last Updated. If Notion fails, log warning and continue.
