# `/test-page` — Comprehensive Page Analysis Command

**Date:** 2026-04-02
**Status:** Draft
**Replaces:** `/audit-page`
**Slug:** `test-page-command`

## Summary

A two-phase page analysis command that uses Chrome DevTools MCP as its primary engine. Phase 1 diagnoses (read-only), Phase 2 acts (auto-fix, regression baseline, cross-browser). Supports light mode (~15s) and full mode (~90s). Optionally compares production against Figma designs via the art-director agent. Generates a regression baseline (JSON + Playwright spec) for future runs.

## Usage

```
/test-page <URL> [--figma <FIGMA_URL>] [--screenshot <PATH>]
```

- `URL` — the page to test (staging or production)
- `--figma` — optional Figma file/node URL for design comparison
- `--screenshot` — optional screenshot path(s) to compare against production

## Architecture: Two-Phase (Diagnose then Fix)

Chrome DevTools MCP shares a single browser connection, so all browser diagnostics run sequentially in the main agent. The only parallelism is the Figma/art-director comparison, which runs alongside Phase 1 diagnostics.

```
/test-page URL [--figma URL]
  |
  +-- Gate 1: "Light or Full?" (~15s/~25k vs ~90s/~45k)
  |
  +-- Phase 1: DIAGNOSE (read-only)
  |     |
  |     +-- Chrome DevTools (sequential, main agent)
  |     |     Light: console + CLS + Lighthouse (all 4) + mobile check + screenshot
  |     |     Full:  + perf trace + memory snapshot + network analysis + keyboard a11y + DOM snapshot
  |     |
  |     +-- [parallel if --figma] Art-director agent: Figma vs production comparison
  |     |
  |     +-- Collate into prioritised issue list
  |
  +-- Phase 2: ACT (gated, sequential)
        |
        +-- Present prioritised issues (Critical > High > Medium > Low)
        |
        +-- Gate 2: "Auto-fix N simple issues via Webflow MCP?" (if connected)
        |
        +-- Gate 3: "Generate regression baseline?" -> JSON + Playwright spec
        |
        +-- Gate 4: "Cross-browser test?" (~30s/engine, ~10k/engine)
        |     Chromium only (default) / + Firefox / + WebKit / All three
        |
        +-- [If Lighthouse scores seem off] Gate 5: "Re-run Lighthouse N times and average?"
        |
        +-- Final report
```

## Phase 1: Diagnose

### Step 0 — MCP availability guard

Reference the `chrome-devtools` skill's `<mcp_availability_guard>`:

1. Try `list_pages` (Chrome DevTools MCP)
   - Connected: proceed with Chrome DevTools
2. If not available, try `browser_navigate` (Playwright MCP)
   - Connected: use Playwright fallback (limited — no Lighthouse, no perf traces, no memory)
3. Neither connected:
   - "No browser MCP available. Provide a URL and I'll use WebFetch for basic HTML analysis only."

### Step 1 — Mode gate

Ask the user:

| Mode | What it runs | Est. time | Est. tokens |
|------|-------------|-----------|-------------|
| **Light** (smoke test) | Console errors, CLS, Lighthouse (all 4 categories), mobile overflow check, desktop + mobile screenshots | ~15s | ~25k |
| **Full** (deep analysis) | Everything in Light + performance trace, memory snapshot, network request analysis, keyboard a11y (5-tab check), full DOM snapshot | ~90s | ~45k |

### Step 2 — Light mode checks (always run)

Run sequentially in the main agent using Chrome DevTools MCP:

#### 2a. Navigate and screenshot
1. `resize_page` width: 1280, height: 800
2. `navigate_page` to target URL
3. Wait 2000ms for JS init
4. `take_screenshot` format: png → save as `.claude/research/test-page/<slug>-desktop-<date>.png`

#### 2b. Console errors
1. `list_console_messages` types: `["error"]`
2. Filter benign noise: third-party (gtag, analytics, Google Fonts), favicon 404, browser extensions
3. Classify remaining: Critical (uncaught exception, module fail) / High (runtime error) / Medium (deprecation)

#### 2c. CLS measurement
1. `evaluate_script` — inject PerformanceObserver (see `chrome-devtools` skill CLS pattern)
2. Wait 5000ms
3. Thresholds: < 0.1 PASS, 0.1–0.25 WARN, > 0.25 FAIL

#### 2d. Mobile check
1. `emulate` viewport: { width: 375, height: 812 }
2. `navigate_page` to target URL (emulate resets on navigation — re-apply if needed)
3. `evaluate_script`: `() => { return document.documentElement.scrollWidth > document.documentElement.clientWidth }`
   - true → FAIL (horizontal overflow)
4. `take_screenshot` → save as `.claude/research/test-page/<slug>-mobile-<date>.png`

#### 2e. Lighthouse audit (all 4 categories)
1. `navigate_page` to target URL (fresh load — Lighthouse needs clean state)
2. `lighthouse_audit` categories: `["performance", "accessibility", "best-practices", "seo"]`
3. Thresholds per category:
   - >= 90: PASS
   - 70–89: WARN
   - < 70: FAIL
4. If any score < 70 or variance seems high, flag for Gate 5 (re-run offer)

### Step 3 — Full mode checks (only if Full selected)

Continue sequentially after light checks:

#### 3a. Network analysis
1. `list_network_requests` — get all requests
2. Flag: requests with status 4xx/5xx, requests > 500KB, render-blocking scripts, unoptimised images (no WebP), third-party scripts > 100KB
3. `get_network_request` on flagged items for details

#### 3b. Performance trace
1. `navigate_page` to target URL (fresh load)
2. `performance_start_trace`
3. Wait 5000ms (captures initial load + early interactions)
4. `performance_stop_trace`
5. `performance_analyze_insight` category: "loading" — identify bottlenecks
6. `performance_analyze_insight` category: "rendering" — identify jank

#### 3c. Memory snapshot
1. `take_memory_snapshot`
2. Report: total heap size, top retained objects, potential leak indicators

#### 3d. Keyboard accessibility
1. `press_key` Tab × 5
2. After each Tab, `evaluate_script`:
```js
() => {
  const el = document.activeElement;
  return {
    tag: el.tagName,
    focusVisible: el.matches(':focus-visible'),
    role: el.getAttribute('role'),
    ariaLabel: el.getAttribute('aria-label')
  };
}
```
3. WARN if focus lands on non-interactive element or `:focus-visible` is false

#### 3e. DOM snapshot
1. `take_snapshot` — accessibility tree
2. Flag: missing ARIA labels on interactive elements, empty alt text on images, heading hierarchy issues (skipped levels)

### Step 4 — Figma comparison (parallel with Steps 2–3)

**Only runs if `--figma` or `--screenshot` provided.**

Spawn an art-director agent (subagent_type: `"art-director"`, model: `"sonnet"`) with:

```
You are comparing a live production page against its Figma design.

## Production screenshots
[attach desktop + mobile screenshots from Steps 2a/2d]

## Figma design
[If --figma: call get_screenshot and get_design_context with the Figma URL]
[If --screenshot: use the provided screenshot paths]

## Your task
1. Compare layout, spacing, typography, colour between design and production
2. Score design fidelity: 0–100
3. List specific discrepancies:
   - Spacing differences (px values if possible)
   - Colour mismatches (hex values)
   - Typography differences (font, size, weight, line-height)
   - Missing or extra elements
   - Responsive differences
4. Categorise each: Critical (user-visible, breaks design intent) / Medium (noticeable) / Low (minor)

## Output
- **Fidelity score:** X/100
- **Discrepancies:** prioritised list with screenshot annotations
- **Recommendation:** top 3 fixes for highest design impact
```

### Step 5 — Collate results

Merge all findings into a single prioritised issue list:

```
## Test Results: <URL>
Date: YYYY-MM-DD | Mode: Light/Full | Figma: Yes/No

### Scores
| Category | Score | Status |
|----------|-------|--------|
| Performance | XX | PASS/WARN/FAIL |
| Accessibility | XX | PASS/WARN/FAIL |
| Best Practices | XX | PASS/WARN/FAIL |
| SEO | XX | PASS/WARN/FAIL |
| CLS | X.XX | PASS/WARN/FAIL |
| Design Fidelity | XX/100 | (if Figma) |

### Issues (N total)

#### Critical (must fix)
1. [Issue] — [Source: Lighthouse/Console/CLS/Network/A11y/Figma] — [Auto-fixable: Yes/No]

#### High
...

#### Medium
...

#### Low
...
```

## Phase 2: Act

### Step 6 — Present results

Show the collated report to the user. Highlight:
- Total issue count by severity
- Lighthouse scores with PASS/WARN/FAIL indicators
- Auto-fixable issue count (if Webflow MCP connected)

### Step 7 — Auto-fix gate (if Webflow MCP connected)

**Auto-fixable issues (bounded allowlist):**
- Missing alt text on images → `element_tool` to add alt text
- Missing ARIA labels → `element_tool` to add aria-label
- Missing meta description → `data_pages_tool` to update
- Colour contrast failures where the fix is a variable swap → `style_tool`
- Missing `rel="noopener noreferrer"` on external links → `element_tool`

**NOT auto-fixable (always manual):**
- Layout/structure changes
- Content rewrites
- Animation changes
- JavaScript fixes
- Anything requiring new elements

Ask: "Found N auto-fixable issues. Apply fixes via Webflow MCP? (shows list)"

Fix sequentially. Report each fix: what changed, before/after value, element selector.

### Step 8 — Regression baseline gate

Ask: "Generate regression baseline for future comparison?"

If yes, generate two artefacts:

#### 8a. JSON baseline

Save to `.claude/research/test-page/<slug>-baseline-<date>.json`:

```json
{
  "version": 1,
  "url": "https://...",
  "date": "YYYY-MM-DD",
  "mode": "light|full",
  "lighthouse": {
    "performance": 92,
    "accessibility": 98,
    "bestPractices": 95,
    "seo": 100
  },
  "cls": 0.04,
  "consoleErrors": 0,
  "networkRequests": {
    "total": 42,
    "failed": 0,
    "oversized": []
  },
  "mobileOverflow": false,
  "a11y": {
    "keyboardScore": "5/5",
    "missingAria": 0,
    "missingAlt": 0
  },
  "figma": {
    "fidelityScore": 85,
    "discrepancies": 3
  },
  "memory": {
    "heapSize": "12MB"
  }
}
```

#### 8b. Playwright regression spec

Generate from `tests/templates/smoke.test.template.js` pattern. Save to `tests/acceptance/test-page-<slug>.spec.js`:

```js
// @ts-check
import { test, expect } from '@playwright/test';

const URL = process.env.STAGING_URL || '<fallback-url>';

test.describe('<slug> — regression baseline', () => {
  let jsErrors;

  test.beforeEach(async ({ page }) => {
    jsErrors = [];
    page.on('pageerror', (err) => jsErrors.push(err));
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
  });

  test('no unexpected console errors', async () => {
    const unexpected = jsErrors.filter(
      (e) => !['gtag', 'analytics', 'favicon'].some((k) => e.message.includes(k))
    );
    expect(unexpected).toHaveLength(0);
  });

  test('no horizontal overflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(overflow).toBe(false);
  });

  test('CLS below threshold', async ({ page }) => {
    const cls = await page.evaluate(() => {
      return new Promise((resolve) => {
        let clsValue = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) clsValue += entry.value;
          }
        }).observe({ type: 'layout-shift', buffered: true });
        setTimeout(() => resolve(clsValue), 5000);
      });
    });
    expect(cls).toBeLessThan(0.25);
  });

  test('page-wrapper present', async ({ page }) => {
    await expect(page.locator('.page-wrapper')).toBeAttached();
  });

  test('external links have rel noopener', async ({ page }) => {
    const links = page.locator('a[target="_blank"]');
    const count = await links.count();
    for (let i = 0; i < count; i++) {
      const rel = await links.nth(i).getAttribute('rel');
      expect(rel).toContain('noopener');
    }
  });
});
```

#### 8c. Register in tests/registry.json

Create or update `tests/registry.json`:
```json
{
  "version": 1,
  "lastUpdated": "YYYY-MM-DD",
  "entries": [
    {
      "id": "test-page-<slug>",
      "file": "tests/acceptance/test-page-<slug>.spec.js",
      "type": "regression",
      "source": "test-page",
      "critical": false,
      "slug": "<slug>",
      "created": "YYYY-MM-DD",
      "description": "Regression baseline for <URL>"
    }
  ]
}
```

### Step 9 — Cross-browser gate

Ask with time/token estimates:

| Option | Extra time | Extra tokens |
|--------|-----------|-------------|
| Chromium only (done) | 0 | 0 |
| + Firefox | ~30s | ~10k |
| + WebKit (Safari) | ~30s | ~10k |
| All three | ~60s | ~20k |

If selected, run the Playwright regression spec (from Step 8b) with the additional browser engines:
```
npx playwright test tests/acceptance/test-page-<slug>.spec.js --project=firefox
npx playwright test tests/acceptance/test-page-<slug>.spec.js --project=webkit
```

Report any cross-browser-specific failures.

### Step 10 — Lighthouse re-run gate

If any Lighthouse score was < 70 or the user questions a score:

Ask: "Lighthouse scores can vary between runs. Re-run N times and average? (adds ~30s per run)"

If yes:
1. Run `lighthouse_audit` N more times (each with a fresh `navigate_page`)
2. Average scores across all runs
3. Report: individual run scores + average + standard deviation
4. Use averaged scores in the final report

### Step 11 — Final report

Save to `.claude/research/test-page/<slug>-report-<date>.md` with:
- All scores and issues from Step 5
- Auto-fix results (if applied)
- Cross-browser results (if run)
- Lighthouse averages (if re-run)
- Screenshots (desktop + mobile paths)
- Figma comparison (if run)
- Regression baseline location (if generated)
- Comparison with previous baseline (if one exists)

## Regression comparison (subsequent runs)

When `/test-page` is run on a URL that has an existing baseline:

1. Load the most recent JSON baseline from `.claude/research/test-page/<slug>-baseline-*.json`
2. After Phase 1 diagnostics, compare current results against baseline
3. Flag regressions:
   - Lighthouse score dropped by >= 5 points in any category
   - CLS increased above threshold
   - New console errors not in baseline
   - Network requests: new 4xx/5xx, new oversized assets
   - Memory heap size increased by > 20%
   - Design fidelity score dropped by >= 10 points
4. Present comparison table:
   ```
   | Metric | Baseline | Current | Delta | Status |
   |--------|----------|---------|-------|--------|
   | Perf   | 92       | 88      | -4    | OK     |
   | A11y   | 98       | 85      | -13   | REGRESS|
   ```
5. After report, offer to update the baseline with current values

## Files affected

| File | Action |
|------|--------|
| `.claude/commands/test-page.md` | **Create** — the command file |
| `.claude/commands/audit-page.md` | **Delete** — replaced by test-page |
| `.claude/commands/cheatsheet.md` | **Edit** — replace `/audit-page` with `/test-page` in Auditing table |
| `.claude/research/test-page/` | **Create dir** — output location for reports, screenshots, baselines |

## Barba Impact

N/A — this is a command/workflow addition, not a runtime feature. No Barba transitions affected.

## Auto-fix allowlist

These are the ONLY issues `/test-page` will offer to auto-fix via Webflow MCP. Everything else is flagged for manual resolution.

| Issue | Webflow MCP tool | Risk |
|-------|-----------------|------|
| Missing image alt text | `element_tool` | Low — adds alt, doesn't change layout |
| Missing ARIA label on interactive element | `element_tool` | Low — adds attribute |
| Missing meta description | `data_pages_tool` | Low — adds meta tag |
| Missing `rel="noopener noreferrer"` on external links | `element_tool` | Low — adds attribute |
| Colour contrast (variable swap only) | `style_tool` | Medium — only if the fix is swapping to an existing design token |

## Verify Loop

### Pass/fail criteria
- Command completes without error for both Light and Full modes
- Chrome DevTools MCP guard works (falls back gracefully if not connected)
- Lighthouse scores are captured for all 4 categories
- Console errors are filtered correctly (no false positives from extensions/third-party)
- CLS is measured and classified correctly
- Mobile overflow is detected when present
- Figma comparison produces a fidelity score (if --figma provided)
- Regression baseline JSON is valid and contains all expected fields
- Playwright spec runs and passes against the target URL
- Cross-browser gate works (Playwright runs with selected engines)
- Report is saved to correct location with correct format
- Subsequent run detects regressions against baseline

### Reproduction steps
1. Open Chrome, navigate to any Webflow staging site
2. Run `/test-page <staging-url>` — choose Light mode
3. Verify: console check, CLS, Lighthouse, mobile check, screenshots all complete
4. Run `/test-page <staging-url>` — choose Full mode
5. Verify: all Light checks + perf trace, memory, network, keyboard a11y, DOM snapshot
6. Run `/test-page <staging-url> --figma <figma-url>` — verify art-director comparison runs in parallel
7. Accept regression baseline generation — verify JSON + Playwright spec created
8. Run `/test-page <staging-url>` again — verify it detects the existing baseline and shows comparison
9. Accept cross-browser — verify Playwright runs with selected engines

### Tier mapping
- **Tier 1 (Auto):** Playwright regression spec from Step 8b runs during `/build` and `/debug`
- **Tier 2 (CDN):** Spec registered in `tests/registry.json`, runs during `/deploy`
- **Tier 3 (Manual):**
  - Verify Lighthouse scores visually make sense (automated scores can vary +-5)
  - Verify screenshots look correct (no automated pixel comparison)
  - Verify Figma comparison catches real discrepancies (subjective)
  - Cross-browser rendering accuracy (Playwright only checks JS errors and layout, not visual)

### Regression scope
- `/qa-check` Stream C browser checks must continue working (shared Chrome DevTools patterns)
- `/build` verify loop must not be affected
- No runtime JS changes — this is command-only

## Test Plan

### Tier 1 — Auto: Playwright local
- `test-page-command.spec.js` — tests the generated regression spec template runs without error
- Console error filtering works
- CLS measurement returns a number
- Mobile overflow detection works

### Tier 2 — Auto: CDN regression
- Registered in `tests/registry.json` after first `/test-page` run generates a baseline

### Tier 3 — Manual
- Lighthouse scores are reasonable (known Lighthouse variance)
- Screenshots are visually correct
- Figma comparison catches real design discrepancies
- Art-director fidelity score is calibrated (subjective)
- Why manual: visual quality and Lighthouse variance cannot be reliably automated

## Acceptance Tests

1. `loads-without-error` — command runs to completion in Light mode
2. `full-mode-extras` — Full mode runs all additional checks
3. `figma-comparison` — art-director agent produces fidelity score when --figma provided
4. `regression-baseline-created` — JSON + Playwright spec saved to correct paths
5. `regression-comparison` — subsequent run detects and displays baseline comparison
6. `cross-browser-gate` — Playwright runs with selected engines
7. `auto-fix-gate` — Webflow MCP fixes only allowlisted issues
8. `lighthouse-rerun` — multiple runs produce averaged scores
9. `graceful-fallback` — works with Playwright fallback if Chrome DevTools not connected
10. `webfetch-fallback` — basic HTML analysis if no browser MCP connected
