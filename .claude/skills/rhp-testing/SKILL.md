---
name: rhp-testing
description: Playwright end-to-end and accessibility testing workflow for the ready-hit-play-prod Webflow project — setup, suite contents, the two-tier assertion model, and when to run (or not run) each suite. Use when testing, QA-ing, or adding tests to Ready Hit Play.
---

## Testing

Playwright end-to-end tests run against the live Webflow staging site (`https://rhpcircle.webflow.io`).

### Setup
```bash
cd projects/ready-hit-play-prod
npm install          # installs @playwright/test + @axe-core/playwright
npx playwright install chromium
```

### Running tests
```bash
npm test             # all tests
npm run test:smoke   # smoke suite only
npm run test:a11y    # accessibility suite only
npm run test:report  # open last HTML report
```

### Test suites

**`tests/smoke.test.js`** — Functional correctness
- Homepage: no JS errors, all RHP modules loaded (`window.RHP.scriptsOk`), key DOM elements present
- Dial: `dial_generic-video` created, `#dial_ticks-canvas` present
- Nav: about-link and logo-link have valid hrefs
- Barba transitions: home → about, about → home (no JS errors, correct namespace mounts)
- About page: loads clean, dial canvas present

**`tests/a11y.test.js`** — Accessibility (WCAG 2.1 AA)
- axe-core WCAG 2.1 AA audit on homepage and about page
- Canvas `#dial_ticks-canvas` has `aria-hidden="true"` (decorative)
- Nav links are keyboard focusable (tabIndex ≥ 0)
- `prefers-reduced-motion`: nav visible after intro, workDial initialised, about text not stuck invisible

### How tests detect loaded scripts
`waitForRHP(page)` polls `window.RHP?.scriptsOk === true` (set by `init.js` after all modules report in). Tests timeout at 20 s if scripts fail to load — check the Webflow head block or jsDelivr URL.

### Known limitations / Webflow constraints
- `.nav_logo-link` is rendered as a `<div>` by Webflow (not `<a>`), so it has no `href` attribute. The smoke test for this element checks keyboard/ARIA accessibility instead of href. Fix in Webflow designer: change it to a Link Block pointing to `/`.
- `aria-label` on `<p>` and `<div>` elements is added automatically by GSAP SplitText v3.12+ for accessibility. These elements must have a `role` attribute that supports naming (e.g. `role="group"`) — set by our JS before calling SplitText.
- Home intro animation hides the nav until the sequence completes. Tests that check nav visibility use Playwright's `toBeVisible()` which polls until the element appears (10 s default timeout).
- Webflow's own generated HTML (badges, Finsweet attrs, etc.) may contribute WCAG violations outside our control. Add offending selectors to `EXCLUDE_FROM_AUDIT` in `a11y.test.js` only if the violation is provably from Webflow HTML, not our code.

### When to run smoke tests
- After pushing a fix and updating the jsDelivr URL in Webflow — confirms nothing is catastrophically broken before sign-off
- Before marking any queue item `PENDING_HUMAN_REVIEW`
- After a dependency update (GSAP, Lenis, Finsweet, Barba, etc.)

### When to run a11y tests
- A new page or section has been built
- Copy or heading structure has changed
- Before any client-facing review or launch

### When NOT to run either
- Mid-build, iterating locally — too slow, wrong feedback loop
- Only a comment, variable name, or non-functional code changed

**The rule:** commit → push → update jsDelivr hash → `npm run test:smoke` → if clean, human review. Playwright is a gate before sign-off, not a development tool.

### Two-tier assertion model
Follow the monorepo-level convention in the repo root `CLAUDE.md` § Page Testing Convention:
- **Hard `expect()`** — functional breakage (404 links, missing forms, console errors, broken images, overflow, H1 issues)
- **Soft `test.info().annotations`** — design drift (copy differences, nav labels, footer text). These log as `design-drift` warnings in the HTML report but never fail the run.

### Adding a new test
1. Add to the relevant suite (`smoke.test.js` for functional, `a11y.test.js` for a11y).
2. Use `waitForRHP(page)` in `beforeEach` so tests only run after scripts are confirmed loaded.
3. Keep timeouts generous for elements that animate in (use `await expect(el).toBeVisible()` rather than assuming immediate availability).
4. Decide: hard failure or design drift? Use `expect()` for functional checks, `test.info().annotations.push({ type: 'design-drift', description })` for content/copy checks.
5. Run `/qa-check` after the feature is built — the QA checklist includes running the test suite.
