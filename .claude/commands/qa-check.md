Run a QA checklist on a feature or file.

## Usage
Provide the feature name and/or file path(s) to check.

## Step 1 — Read files
Read all relevant files for the feature.

## Step 2 — Parallelisation gate

Reference the `parallelisation` skill. Present the gate with 3 independent streams:

| # | Stream | Agent type | Est. tokens | Est. wall time |
|---|--------|-----------|-------------|----------------|
| 1 | Code quality + a11y | qa (Explore) | ~20k | ~15s |
| 2 | Animation + Barba integrity | qa (Explore) | ~20k | ~15s |
| 3 | MCP live browser checks | qa (general-purpose) | ~15k | ~20s |

Sequential: ~50s / ~55k tokens. Parallel: ~22s / ~59k tokens (~2.3x faster, +1.1x cost).

Falls back to 2-stream (A + B only) if MCP browser is not connected.

**Recommendation: Parallel** (independent checklists, read-only analysis).

### Stream A — Code quality + accessibility
- No console errors
- Works on mobile
- All interactive elements keyboard accessible
- ARIA labels present and correct
- Colour contrast meets WCAG AA
- CMS edge cases handled (empty collections, long text)

### Stream B — Animation + Barba integrity
- prefers-reduced-motion respected
- Barba transitions clean up correctly (GSAP contexts killed, listeners removed)
- No layout shift (CLS) caused by animations
- ScrollTrigger instances properly refreshed after transitions
- GSAP timelines killed on destroy
- No memory leaks from orphaned listeners or intervals

### Stream C — MCP live browser checks (skip if no MCP)

Reference the `playwright-webflow` skill for MCP guard and ad-hoc check patterns.

1. **Console errors** — navigate to staging URL, capture `browser_console_messages`, filter benign noise. FAIL if real errors remain.
2. **Mobile rendering** — `browser_resize` 375×812, navigate, check horizontal overflow via `browser_evaluate`, take screenshot. FAIL if scrollWidth > clientWidth.
3. **CLS measurement** — inject PerformanceObserver via `browser_evaluate`, wait 5s. PASS < 0.1, WARN 0.1–0.25, FAIL > 0.25.
4. **Animation smoke** — scroll to feature section, wait per timing table, screenshot. `browser_evaluate` to check GSAP timeline count matches expectation.
5. **Keyboard a11y spot check** — Tab through first 5 interactive elements via `browser_press_key`, check `:focus-visible` after each. WARN if focus ring not visible.

If MCP is not connected, log "MCP browser not available — skipping Stream C" and continue with Streams A + B only.

## Step 3 — Merge and report
3. For each FAIL item, provide:
   - File and line number
   - What is wrong
   - Suggested fix
4. Output the full checklist with PASS / FAIL / SKIP status.

## Step 4 — Playwright tests
5. If the project has a test suite (`npm test`), run Playwright tests against the staging URL.
   - Deploy to jsDelivr/CDN first — local changes are not tested until committed and the Webflow script tag is updated.
   - Run `npm test` from the project directory.
   - If tests fail, report failures alongside the QA checklist.

Playwright tests run sequentially after all streams merge.

## Step 4.5 — Bridge (MCP → regression tests)

For each Stream C check that returned FAIL:
1. Search `tests/acceptance/` for an existing test covering this case (grep for the selector, error message, or behaviour)
2. If not already covered: generate a regression spec using the bridge template from the `playwright-webflow` skill
3. Run the generated spec — if it passes, include it in the next commit
4. If it fails, flag it as a manual follow-up (the MCP finding is real but the test needs tuning)

Skip this step if Stream C was skipped (no MCP) or all Stream C checks passed.

## Step 5 — Verdict
6. If all critical items pass, confirm the feature is QA-approved.
7. Update the relevant task in `.claude/queue.json` to include `"qa": "approved"`.

## Critical items (must all PASS before shipping)
- No console errors
- Works on mobile
- prefers-reduced-motion respected
- Barba transitions clean up correctly
- No layout shift (CLS) caused by animations
- All interactive elements keyboard accessible
