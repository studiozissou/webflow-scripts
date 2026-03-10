---
name: debug
description: Guides the agent through a structured debugging methodology for Webflow projects — isolation, hypothesis ranking, instrumentation, and stack-specific checks. Activates when errors, broken behaviour, stack traces, or test failures are detected.
---

<objective>
Diagnose and fix bugs in Webflow custom code projects using a structured loop — isolate, hypothesise, design verification tests, instrument, validate, fix, confirm — with stack-specific checks for GSAP, Barba, Finsweet, and Webflow embeds.
</objective>

<quick_start>
Trigger conditions — auto-activate when any of the following are detected:
- Words: `error`, `broken`, `not working`, `fails`, `undefined`, `null`, `TypeError`, `ReferenceError`, `Cannot read`, `is not a function`
- Pasted stack traces or console output
- Playwright test failures
- User reports unexpected visual behaviour

Guiding rules:
- Never change two things simultaneously
- Never modify production logic to diagnose — instrument first, clean up after
- One hypothesis tested per iteration
- If confidence is below ~80%, stop and ask before applying a fix
</quick_start>

<workflow>
Step 1 — Isolate:
Confirm the error is real and repeatable.
- What is the exact error message?
- Which page, namespace, or component?
- Does it happen on staging, production, or both?
- Is localhost detection active? If so, is `npx serve .` running?
- Is the jsDelivr URL pinned to the correct commit hash?
- **MCP reproduction** (if available): navigate to the page, capture console messages + DOM snapshot, replay interactions with screenshots. See /debug command for full MCP reproduction steps.

Step 2 — Hypothesise:
State 1-3 ranked hypotheses before touching anything. Format:
```
H1 (most likely): [reason]
H2: [reason]
H3: [reason]
```

Step 2b — Test Design:
For each hypothesis, specify the automated test that would confirm or falsify it.

Determine test type:
- Playwright E2E — bug manifests in browser (visual state, timing, DOM, console errors, Barba lifecycle, GSAP output)
- Node unit test — bug is in a pure JS function (validation, data transform, no DOM needed)
- MCP ad-hoc — bug can be checked live via MCP browser tools (reference playwright-webflow skill ad-hoc patterns)
- None — genuinely untestable (CDN 404, third-party auth, visual-only with no DOM signal)

For each hypothesis, write the test spec:
  H1 test: [Playwright/Unit/MCP/None] — assert [condition] on [page/module]
    File: tests/acceptance/debug-[slug].spec.js (or tests/[module].test.js)
    Setup: [navigation / function call / MCP browser_navigate]
    Assert: [what passes if H1 correct, what passes if H1 wrong]

Reference:
- Acceptance test template: .claude/templates/acceptance-test.spec.js
- Bridge test template: playwright-webflow skill <bridge_test_template>
- Timing table: playwright-webflow skill <quick_start>

Skip conditions — skip Step 2b entirely and log "Skipped: [reason]" if:
- User says "skip tests" or the bug is trivially a config/typo fix
- The bug is a one-off that won't recur (wrong env variable, missing file)
- No test infrastructure exists AND user declines to set it up

Do NOT write or run the test yet — just design it. The test gets written after the fix (Post-Fix bridge regression step in /debug command).

Step 3 — Instrument:
Add targeted logging to confirm or rule out H1. Do not change logic yet.
- Use `console.log('[debug][module]', value)` with a clear prefix
- For GSAP: log timeline state, ScrollTrigger instances, Lenis scroll position
- For Barba: log `barba.hooks` lifecycle events, namespace resolution
- For Finsweet: log attribute parsing and CMS load events

Step 4 — Validate:
Run the instrumented code against the failing case.
- Does the log confirm H1?
- If yes: proceed to fix
- If no: rule out H1, move to H2, repeat from Step 3

Step 5 — Fix:
Apply the minimal change that resolves the confirmed hypothesis.
- If confidence >= 80%: apply and report
- If confidence < 80%: state the proposed fix and wait for approval

Step 6 — Confirm:
- Verify the original error no longer occurs
- Check for regressions in related functionality
- Remove all instrumentation (`console.log` debug lines)
- Update CLAUDE.md "Known Gotchas" if this is a recurring pattern
- **MCP verification** (if MCP was used in Isolate): replay the same steps, compare before/after screenshots, verify console errors are gone. See /debug command for full MCP verification steps.
</workflow>

<reference_guides>
Stack-specific checks:

GSAP / ScrollTrigger:
- Is `.kill()` called on old instances before re-init?
- Is `ScrollTrigger.refresh()` needed after DOM changes?
- Are contexts (`gsap.context()`) scoped and cleaned up on Barba leave?
- Is Lenis RAF conflicting with GSAP ticker?

Barba.js:
- Does the failing page have `data-barba="wrapper"` and `data-barba="container"`?
- Does the namespace in `barba.init({ views })` match `data-barba-namespace`?
- Is the init script running after Barba has mounted (not on raw DOMContentLoaded)?
- Are `once`, `enter`, `leave` hooks firing in the expected order?

Webflow Embeds:
- Is the embed inside the correct Webflow region (before `</body>` vs in-page)?
- Is jQuery available if the script depends on it?
- Are embed scripts being re-executed after Barba transitions?

Finsweet Attributes:
- Is `fs-attributes` loaded before DOM is parsed?
- Are CMS Filter / Load / Nest attributes on the correct elements?
- Has `window.fsAttributes.push()` been used for post-load hooks?

jsDelivr / Deployment:
- Does the URL in Webflow match `git rev-parse HEAD`?
- Has the CDN cache been busted (new commit pushed)?
- Is the script 404-ing silently?
</reference_guides>

<success_criteria>
- Root cause identified and confirmed with evidence (not guessed)
- Fix is minimal — only the confirmed issue is changed
- All debug instrumentation removed from committed code
- No regressions in related functionality
- At least one test designed per hypothesis in Step 2b (or explicit "None" with reason)
- Debug summary produced in this format:
```
**Error:** [original error message]
**Root cause:** [confirmed hypothesis]
**Fix applied:** [what changed and why]
**Confirmed:** [how you verified it's resolved]
**Test design:** [H1: Playwright — assert X / H2: Unit — assert Y / or "None: reason"]
**Gotcha added to CLAUDE.md:** [yes / no — and the entry if yes]
```
</success_criteria>
