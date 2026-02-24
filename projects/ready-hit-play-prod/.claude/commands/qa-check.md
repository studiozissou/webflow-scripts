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
5. Run Playwright tests against the staging URL (see below).
6. If all critical items pass, confirm the feature is QA-approved.
7. Update the relevant task in `.claude/queue.json` to include `"qa": "approved"`.

## Critical items (must all PASS before shipping)
- No console errors
- Works on mobile
- prefers-reduced-motion respected
- Barba transitions clean up correctly
- No layout shift (CLS) caused by animations
- All interactive elements keyboard accessible

## Playwright tests (staging URL: https://rhpcircle.webflow.io)

Run from `projects/ready-hit-play-prod/`:

```bash
# Full suite (smoke + a11y)
npm test

# Smoke only (faster — use after every code change)
npm run test:smoke

# Accessibility only
npm run test:a11y

# View HTML report after a run
npm run test:report
```

Test files live in `tests/`:
- `smoke.test.js` — page load, JS errors, key elements, Barba transitions, nav links
- `a11y.test.js` — WCAG 2.1 AA (axe-core), keyboard focus, reduced-motion fallbacks

**Note:** Tests run against the live staging URL. Deploy to jsDelivr first, then run
tests to verify. Local changes are not tested until committed and the Webflow
`<script>` tag is updated with the new commit hash.
