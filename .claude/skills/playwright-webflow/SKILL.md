---
name: playwright-webflow
description: Guides the agent through Playwright timing for Webflow staging sites — typical wait times for GSAP, Barba, Finsweet, and IX2. Activates when writing or debugging Playwright tests for Webflow pages.
---

<objective>
Provide timing guidance for Playwright tests against Webflow staging sites, where custom JS, GSAP animations, and Finsweet attributes need extra wait time beyond standard page load.
</objective>

<quick_start>
Typical wait times for Webflow staging sites:

| What you're waiting for | waitForTimeout value |
|---|---|
| Page load (networkidle) | Built into goto, no extra wait needed |
| Custom JS initialisation | 1500-2000ms |
| GSAP animation to complete | 1000-2000ms (depends on duration) |
| ScrollTrigger to fire after scroll | 500-1000ms |
| Finsweet CMS Filter to process | 800-1200ms |
| Finsweet CMS Load to render | 1000-1500ms |
| Barba page transition | 1500-2500ms |
| Lenis smooth scroll to settle | 500-1000ms |
| Webflow interactions (IX2) | 500-1500ms |
</quick_start>

<workflow>
When a test fails on timing:
1. First try increasing the wait by 50%
2. If still failing, use `page.waitForSelector` or `page.waitForFunction` instead of a fixed timeout — these are more reliable
3. Example:
```js
await page.waitForFunction(() =>
  document.querySelector('.hero-title').style.opacity === '1',
  { timeout: 5000 }
);
```
</workflow>

<success_criteria>
- Tests use `page.waitForFunction` or `page.waitForSelector` over fixed `waitForTimeout` where possible
- Fixed timeouts are within the ranges listed in the timing table
- Staging-specific slowness accounted for (not optimised for prod speed)
- No test relies solely on `networkidle` for custom JS readiness
</success_criteria>

<mcp_availability_guard>
Before any MCP live browser step, check connectivity:

1. Attempt `browser_navigate` to the staging URL
2. Staging URL resolution order: `.env.test` STAGING_URL → project CLAUDE.md staging URL → skip
3. If the navigate call fails or MCP tools are not connected:
   - Log: "MCP browser not available — skipping live checks"
   - Continue with the rest of the command (all MCP steps are optional)
4. If successful: proceed with MCP ad-hoc checks

Every command that uses MCP checks MUST wrap them in this guard so the command never fails due to missing MCP.
</mcp_availability_guard>

<mcp_adhoc_checks>
Reusable MCP check patterns referenced by /build, /debug, /qa-check, and /refactor:

**Console error check:**
1. `browser_navigate` to target URL, wait for load
2. `browser_console_messages` — capture all messages
3. Filter benign noise: third-party scripts, analytics, favicon 404s, gtag, Google Fonts warnings
4. Any remaining `error` level messages → FAIL with details

**Responsive check (mobile):**
1. `browser_resize` to 375×812 (iPhone viewport)
2. `browser_navigate` to target URL
3. `browser_evaluate`: `document.documentElement.scrollWidth > document.documentElement.clientWidth` → if true, horizontal overflow detected → FAIL
4. `browser_take_screenshot` for visual record

**CLS measurement:**
1. `browser_evaluate` — inject PerformanceObserver:
```js
new Promise(resolve => {
  let cls = 0;
  new PerformanceObserver(list => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) cls += entry.value;
    }
  }).observe({ type: 'layout-shift', buffered: true });
  setTimeout(() => resolve(cls), 5000);
})
```
2. Thresholds: < 0.1 → PASS, 0.1–0.25 → WARN, > 0.25 → FAIL

**Animation verification:**
1. `browser_evaluate` — scroll to target section: `document.querySelector(SELECTOR).scrollIntoView()`
2. Wait per timing table (e.g. 2000ms for GSAP animation)
3. `browser_take_screenshot` for visual record
4. `browser_evaluate` — check computed styles or GSAP state:
```js
gsap.globalTimeline.getChildren().length
```
5. Compare against expected count from the spec

**Desktop screenshot:**
1. `browser_resize` to 1280×800 (MacBook Pro 13")
2. `browser_navigate` to target URL
3. `browser_take_screenshot`

**Keyboard a11y spot check:**
1. `browser_press_key` Tab 5 times
2. After each Tab, `browser_evaluate`:
```js
document.activeElement.matches(':focus-visible') && document.activeElement.tagName
```
3. If any Tab lands on a non-interactive element or focus ring is invisible → WARN
</mcp_adhoc_checks>

<bridge_test_template>
When an MCP check discovers a bug, capture it as a permanent Playwright test spec:

**Template:** `tests/acceptance/SLUG-regression.spec.js`
```js
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

const STAGING_URL = process.env.STAGING_URL;

test.describe('SLUG regression — DESCRIPTION', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(STAGING_URL + '/PAGE_PATH', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // custom JS init
  });

  // Found via MCP live check — see .claude/logs/debug-SLUG-DATE.md
  test('DESCRIPTION_OF_BUG should not recur', async ({ page }) => {
    // REPRODUCTION_STEPS
    await page.waitForFunction(() => CONDITION, { timeout: 5000 });
    // ASSERTION
  });
});
```

**Rules:**
- Always include a comment linking to the debug log or MCP finding
- Prefer `waitForFunction` over `waitForTimeout` for assertions
- Use the timing table from `<quick_start>` for any fixed waits
- Run the generated test before including in the commit — only commit if it passes
- Place in `tests/acceptance/` alongside existing specs
</bridge_test_template>
