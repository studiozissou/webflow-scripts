Build a feature end-to-end using the appropriate agents.

## Model split
- **Opus max-effort** for all code-writing, hypothesising, and refactoring work (steps 3–5, bug fixes in the verify loop)
- **Sonnet** for all 3 code-reviewer agents (step 6), qa-check, and verification passes (steps 6–7, steps 8–17)

## Notion push: Building (if Notion connected)
Update queue.json: set this slug's status to Building.
Push to Notion: update Status to "Building", set Last Updated.
If Notion fails, log warning and continue.

## Test inventory

Before starting the build, read `tests/registry.json` and check for `tests/acceptance/SLUG.spec.js`.

Present a test inventory:
```
Test inventory for SLUG:
  Tier 1 (auto local):  tests/acceptance/SLUG.spec.js — [exists / missing]
  Tier 2 (CDN regress): registered in registry.json — [yes (N total entries) / no]
  Tier 3 (manual):      see spec — [N items / none]
  Playwright MCP:       [connected / not connected]
```

If Tier 1 tests are missing, warn: "No acceptance tests for this slug — verify loop will run smoke + a11y only. Consider running `/plan` first to generate tests."

## Process

0. **Log slug** (if `log-slug.sh` exists): Run `.claude/scripts/log-slug.sh build_start <feature-slug>`.
1. Read the spec from `.claude/specs/` (if it exists) or ask for a description.

### Verify-loop gate

After reading the spec, check that it contains an explicit verify loop — a section describing how to confirm the feature works after implementation (acceptance tests, MCP checks, manual steps, or a combination).

**Search for:** a heading or section matching "verify", "verification", "test plan", "acceptance", or "how to confirm" in the spec.

- **Found:** continue to step 2.
- **Not found:**
  1. Flag: *"No verify loop found in the spec for SLUG."*
  2. Re-read the full spec one more time to make sure you didn't miss it (could be named differently or embedded in another section).
  3. If still not found, ask the user via `AskUserQuestion`:

     **"The spec has no verify loop — how should we handle this?"**
     1. **"Generate one now" (Recommended)** — Draft a verify loop section (acceptance criteria, Playwright assertions, MCP checks if applicable, manual items) and append it to the spec file. Then continue.
     2. **"Skip — I'll verify manually"** — Log "verify loop: skipped by user" and continue without one.
     3. **"Stop — let me update the spec first"** — Halt the build so the user can add a verify loop to the spec themselves.

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
- The acceptance test from `tests/acceptance/SLUG.spec.js` (from test inventory)
- The existing orchestrator.js for this project
- Any files the spec references as dependencies
- Selector verification results from step 2 (if Webflow MCP was used)
- The spacing check rules from the "Spacing check" section above

**Instructions for the executor:**

3. Use the `code-writer` agent with `model: "opus"` to implement the feature.
4. If the feature has motion/animation, apply the `gsap-scrolltrigger` or `barba-js` skill as appropriate.
5. Use the `refactor` agent with `model: "opus"` on all changed files. Instruction: "Refactor the implementation for clarity and pattern compliance. Do not change behaviour."
6. **Multi-perspective code review** — spawn 3 parallel `code-reviewer` agents (all `model: "sonnet"`), each with a distinct review lens. Each reviewer scores every issue 0–100 confidence; only issues ≥80 are surfaced.

   **Reviewer A — Simplicity & DRY:**
   > "Review for unnecessary complexity, code duplication, premature abstraction, and over-engineering. Score each issue 0–100 confidence. Only report issues you are ≥80% confident about. Return a structured list: file, line, issue, confidence, suggested fix."

   **Reviewer B — Bugs & Correctness:**
   > "Review for logic errors, off-by-one mistakes, null/undefined access, race conditions, missing error handling at system boundaries, and edge cases. Score each issue 0–100 confidence. Only report issues you are ≥80% confident about. Return a structured list: file, line, issue, confidence, suggested fix."

   **Reviewer C — Conventions & Patterns:**
   > "Review against the project CLAUDE.md guidelines, existing codebase patterns, naming conventions, and architectural decisions from ADRs. Check for console.log without DEBUG guard, default exports in shared/, and missing init/destroy lifecycle methods. Score each issue 0–100 confidence. Only report issues you are ≥80% confident about. Return a structured list: file, line, issue, confidence, suggested fix."

   **Merge results into a unified verdict:**
   - Collect all issues from all 3 reviewers
   - Deduplicate: if two reviewers flag the same line, keep the higher confidence score
   - **PASS** (no issues ≥80) — return results to parent context
   - **WARN** (issues ≥80 but none ≥95) — include warnings in results, then return
   - **FAIL** (any issue ≥95) — fix the critical issues, then re-run all 3 reviewers. Max 3 review cycles. After 3 failures, return failure report to parent context
7. Run `/qa-check` automatically.

**Return to parent context:**
- List of files created/modified
- Code-reviewer verdict (PASS/WARN/FAIL)
- QA check results
- Any warnings or blockers

After the executor returns, continue with the verify loop (steps 8–17) in the parent context.

Reference the `playwright-webflow` skill for MCP guard and ad-hoc check patterns.

## Verify loop (Playwright MCP only — no CLI tests)

After code review passes and QA is clean, run the verify loop.

> **IMPORTANT:** `/build` and `/debug` verify loops use Playwright MCP exclusively. Code hasn't been deployed to CDN yet, so `npx playwright test` against the staging URL will test OLD code — not your changes. CLI test suites (`npm test`, `npx playwright test`) are reserved for `/deploy`, which runs them AFTER pushing to CDN.

**What runs:** MCP browser checks against the staging URL (which loads your localhost code if dev server is running, or tests the live DOM structure if not). The goal is to verify DOM state, console health, visual correctness, and spec pass/fail criteria — all through MCP tools.

**Prerequisite:** Playwright MCP must be connected. If not connected, skip to the **Fallback** section below.

8. `browser_navigate` to STAGING_URL
9. **Console check** — `browser_console_messages`, filter benign noise. FAIL on real errors.
10. **DOM snapshot** — `browser_snapshot`, confirm spec selectors exist on the page.
11. **Desktop screenshot** — `browser_resize` 1280×800, `browser_take_screenshot`
12. **Mobile screenshot** — `browser_resize` 375×812, `browser_take_screenshot`
13. **Scroll-triggered check** (if feature has scroll animations) — scroll to section, wait per `playwright-webflow` timing table, `browser_take_screenshot`
14. **Spec verify-loop criteria** — walk through each pass/fail criterion from the spec's "## Verify Loop" section using MCP tools:
    - DOM assertions → `browser_snapshot` + check for elements/classes/attributes
    - Visual assertions → `browser_take_screenshot` at the specified viewport/scroll position
    - Interaction assertions → `browser_click`/`browser_hover`/`browser_evaluate` to trigger, then snapshot/screenshot to confirm
    - Console assertions → `browser_console_messages` filtered for expected output
    - For each criterion, log: `[PASS]` or `[FAIL] — {what went wrong}`
15. **Smoke checks via MCP** — replicate core smoke concerns through MCP (not CLI):
    - `browser_console_messages` — no JS errors on the page
    - `browser_snapshot` — key DOM elements present (nav, barba container, critical modules)
    - `browser_navigate` to 2–3 other pages (home, about, a case study) — confirm no console errors after Barba transition
    - `browser_evaluate` — `window.RHP?.scriptsOk === true` on each page

16. If ANY check fails:
    a. Read the failure carefully
    b. Identify the root cause — is it a code bug, a timing issue, or a wrong selector?
    c. If timing issue: add a `browser_evaluate` wait or increase delay and retry
    d. If wrong selector: verify against `browser_snapshot` DOM
    e. If code bug: fix the code
    f. Go back to step 8 (re-verify)
    g. Track iteration count. After 8 failed iterations on the SAME check:
       - Stop and report to the user
       - List what's failing and what you've tried
       - Offer the user a choice via `AskUserQuestion`:

         **"How should we proceed with the failing check?"**
         1. **"Ralph-wiggum mode — keep iterating" (Recommended for timing/flake issues)** — Switch to autonomous loop: keep fixing and re-checking until it passes or hits a hard cap of 20 total iterations. Each iteration: read failure → apply smallest possible fix → re-verify. No user interaction until pass or cap.
         2. **"Skip this check and continue"** — Log it as a known issue, continue with remaining checks.
         3. **"Stop and I'll investigate manually"** — End the build loop, preserve all changes, report full diagnostics.

       If user chooses ralph-wiggum mode:
       - Log: "Entering ralph-wiggum TDD loop — iterating until green or 20 total iterations"
       - Continue the fix → re-verify cycle autonomously
       - On each iteration, append a one-line summary to the build output: `[ralph #{n}] {what changed} → {pass/fail}`
       - If the check passes: log "Ralph-wiggum loop resolved after {n} iterations", continue to step 17
       - If 20 total iterations reached: stop, report full history, ask for manual intervention

### Step 16.5 — Bridge (MCP → regression tests)

For each bug found by MCP in steps 8–15:
1. Generate a regression spec using the bridge template from the `playwright-webflow` skill
   - Place in `tests/acceptance/SLUG-regression.spec.js`
2. Do NOT run the generated spec now — it targets the CDN URL and code isn't deployed yet
3. Include in the commit; it will run during `/deploy`

Skip if no MCP bugs were found.

> **Note:** `/build` verifies via MCP only. CLI test suites (`npm test`, acceptance specs, smoke, a11y, full registry) all run during `/deploy` after the code is live on CDN.

**Fallback** (no Playwright MCP): Cannot run MCP verify loop. Instead:
- Read the spec's verify-loop criteria and present them as a **manual checklist** for the user
- Log: "MCP not connected — verify loop skipped, manual verification required before `/deploy`"
- Do NOT run `npx playwright test` — it would test old deployed code, not the current changes

17. If ALL MCP checks pass:
    - Report the full pass/fail summary from step 14
    - Note: "CLI test suites (smoke, a11y, acceptance, registry) will run during `/deploy` after CDN push"

## Rules
- Never start writing code without reading existing files first
- Always check `shared/utils.js` and the project orchestrator before adding new utilities
- Leave no console.log statements in completed code
- Mark all tasks complete in queue.json when done
- Verify all selectors via Webflow MCP before writing JS that targets them (if MCP connected)
- Use Client First spacer divs for vertical rhythm — no margin-top/bottom between components
- **Log slug** (if `log-slug.sh` exists): After marking tasks complete, run `.claude/scripts/log-slug.sh build_end <feature-slug>`

## Wrap up

### Manual Test Checklist

Before asking for status, present the **Tier 3 — Manual Test Checklist**:

1. Read the spec's "Tier 3 — Manual" section (generated during `/plan`)
2. Add anything discovered during the build that can't be automated
3. Present to the user with checkboxes
4. If there are no manual tests, note "No manual tests needed" and continue

### Status question

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
