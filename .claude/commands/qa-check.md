Run a QA checklist on a feature or file.

## Usage
Provide the feature name and/or file path(s) to check.

## Steps
1. Read all relevant files.
2. Use the `qa` agent to run the full QA checklist.
3. For each FAIL item, provide:
   - File and line number
   - What is wrong
   - Suggested fix
4. Output the full checklist with PASS / FAIL / SKIP status.
5. If the project has a test suite (`npm test`), run Playwright tests against the staging URL.
   - Deploy to jsDelivr/CDN first — local changes are not tested until committed and the Webflow script tag is updated.
   - Run `npm test` from the project directory.
   - If tests fail, report failures alongside the QA checklist.
6. If all critical items pass, confirm the feature is QA-approved.
7. Update the relevant task in `.claude/queue.json` to include `"qa": "approved"`.

## Critical items (must all PASS before shipping)
- No console errors
- Works on mobile
- prefers-reduced-motion respected
- Barba transitions clean up correctly
- No layout shift (CLS) caused by animations
- All interactive elements keyboard accessible
