# Carsa Visual Regression Testing System

**Slug:** `carsa-visual-regression`
**Client:** Carsa
**Status:** Planning
**Created:** 2026-07-03
**Target repo:** `focalstrategy/carsa-website-support`

## Summary

Automated visual regression + code health testing system for carsa.co.uk. Uses Playwright `toHaveScreenshot()` for pixel-level visual diffs, with locator-based masking for CMS-heavy pages. Includes console error detection and broken link checks. Runs daily via GitHub Actions cron (lite profile) with manual dispatch for full suite. Reports failures via Slack webhook.

Designed for Carsa first but architectured to be reusable across other client sites via a config-driven page manifest.

## Architecture

### Approach: Playwright `toHaveScreenshot()`

Chosen over BackstopJS (tool sprawl, Docker overhead, dual toolchain) and custom pixelmatch/sharp (native binary risk, coordinate-based mask maintenance, High complexity).

Key advantages:
- Zero new dependencies beyond Playwright
- Locator-based masking auto-adapts to layout changes (no coordinate maintenance)
- Console error + broken link checks run in the same Playwright test suite
- Built-in retry, animation-waiting, and threshold tuning
- `--update-snapshots` flag for baseline refresh

### Target Repo Structure

```
focalstrategy/carsa-website-support/
  package.json                          # Playwright + dotenv deps
  playwright.config.js                  # Desktop + Mobile projects, snapshot config
  .env                                  # SITE_URL, SLACK_WEBHOOK_URL
  tests/
    visual/
      pages.js                          # Page manifest (URL, tier, profile, masks)
      visual.spec.js                    # Visual regression spec
      visual.spec.js-snapshots/         # Baseline PNGs (auto-managed by Playwright)
    checks/
      console-errors.spec.js            # Console error check per page
      broken-links.spec.js              # Broken link detection per page
    helpers.js                          # Shared waitForReady, collectErrors, loadPage
  scripts/
    notify-slack.js                     # Slack webhook poster (called from GHA)
    update-baselines.sh                 # Helper to refresh baselines locally
  .github/
    workflows/
      visual-regression.yml             # Cron + manual dispatch workflow
```

## Page Manifest

### Lite Profile (~11 pages, daily cron)

| Path | Tier | Mask Selectors |
|------|------|----------------|
| `/` | static | None |
| `/used-cars` | cms | `.w-dyn-item`, `[fs-cmsfilter-element="total-count"]`, `.w-pagination-wrapper` |
| `(dynamic VDP)` | cms | Resolve at runtime: scrape first vehicle link from homepage carousel, navigate to it. Mask price, mileage, gallery images, finance quote |
| `/car-finance` | static | None |
| `/car-finance/calculator` | static | None |
| `/value-car` | static | None |
| `/contact` | static | None |
| `/about` | static | None |
| `/deals` | cms | `.w-dyn-item` |
| `/stores` | cms | `.w-dyn-item` |
| `/blog` | cms | `.w-dyn-item` |

### Full Profile (all pages, manual dispatch)

Lite pages plus:

| Path | Tier | Notes |
|------|------|-------|
| `/about/reviews` | cms | Mask review cards |
| `/about/car-preparation` | static | |
| `/about/careers` | static | |
| `/about/tiktok` | static | |
| `/car-care` | static | |
| `/car-care/carsacover` | static | |
| `/car-care/ev-cover` | static | |
| `/car-care/carsaprotect` | static | |
| `/car-care/extras` | static | |
| `/car-care/insurance` | static | |
| `/car-care/podpoint` | static | |
| `/faq` | static | |
| `/part-exchange` | static | |
| `/reserve` | static | |
| `/stores/southampton` | cms | Sample store page — mask hours, stock count |
| `/used-cars/make/ford` | cms | Sample make page — mask car cards |
| `/used-cars/make/ford/model/fiesta` | cms | Sample model page — mask car cards |
| `/used-cars/near/southampton` | cms | Sample near page — mask car cards, counts |
| `/used-cars/fuel/electric` | cms | Sample fuel page — mask car cards |
| `/promotions/sample-promo` | cms | Sample promo — mask promo details |
| `/sell-car/southampton` | cms | Sample sell-car — mask valuation form output |

### Viewports

| Name | Width | Height |
|------|-------|--------|
| Desktop | 1280 | 800 |
| Mobile | 390 | 844 |

Total screenshots: Lite = ~22 (11 pages x 2 viewports), Full = ~42 (21 pages x 2 viewports)

## Visual Test Flow

```
1. Navigate to page URL
2. Wait for document.readyState === 'complete' (20s timeout)
3. Wait 2000ms for Finsweet / custom JS to settle
4. For CMS-tier pages: build mask array from page manifest selectors
5. Call expect(page).toHaveScreenshot(snapshotName, {
     fullPage: true,
     mask: maskLocators,
     maxDiffPixelRatio: 0.01,    // 1% tolerance
     animations: 'disabled'       // freeze CSS animations
   })
6. Playwright handles baseline storage, comparison, and diff generation
```

### Masking Strategy

CMS pages use Playwright's `mask` option with locators:
- `.w-dyn-item` — all CMS collection list items (car cards, blog cards, etc.)
- `[fs-cmsfilter-element="total-count"]` — Finsweet total count display
- `.w-pagination-wrapper` — pagination controls
- Per-page overrides for specific dynamic elements (prices, mileage, gallery)

Masks render as solid-colour rectangles in both baseline and test screenshots, making the diff CMS-agnostic. Locator-based masking auto-adapts to layout changes — if a CMS card moves position, the mask follows it.

## Code Health Checks

### Console Error Detection

For every page in the active profile:
1. Attach `pageerror` + `console.error` listeners before navigation
2. Navigate and wait for page settle
3. Filter out known third-party noise (e.g., Google Maps, analytics, cookie consent)
4. Fail if any first-party JS errors remain

### Broken Link Detection

For every page in the active profile:
1. Collect all `<a href>` values from the rendered DOM
2. Deduplicate and filter (skip `mailto:`, `tel:`, `javascript:`, anchors)
3. HEAD-request each unique URL with 10s timeout
4. Fail if any return 404, 500, or timeout
5. Report broken links with source page and link text

## Scheduling & Triggers

### GitHub Actions Workflow

```yaml
name: Visual Regression
on:
  schedule:
    - cron: '0 7 * * 1-5'    # Weekdays 7am UTC
  workflow_dispatch:
    inputs:
      profile:
        description: 'Test profile to run'
        required: true
        default: 'lite'
        type: choice
        options:
          - lite
          - full
      update_baselines:
        description: 'Update baseline screenshots instead of comparing'
        required: false
        default: false
        type: boolean
```

### Execution Flow

1. Checkout repo
2. `npm ci` + `npx playwright install chromium`
3. If `update_baselines` → run with `--update-snapshots`, commit new baselines, exit
4. Run visual tests for selected profile
5. Run console error + broken link checks
6. On failure: upload diff artifacts, post Slack notification
7. On success: silent (no notification spam)

### Slack Notification

On failure, POST to Slack webhook with a per-failure breakdown. Each issue gets its own line with a direct link to the page and the viewport it failed on — no digging through logs.

The `notify-slack.js` script parses Playwright's JSON report (`--reporter=json`), extracts failed test names (which encode the page path and viewport), and builds the message.

Format:
```
:red_circle: Carsa daily check — 3 issues found

Visual diffs:
  :eyes: /used-cars — desktop — layout shifted
     https://www.carsa.co.uk/used-cars
  :eyes: /car-finance — mobile — CTA button missing
     https://www.carsa.co.uk/car-finance

Console errors:
  :warning: /deals — desktop — Uncaught TypeError: Cannot read property 'filter'
     https://www.carsa.co.uk/deals

:link: <https://github.com/focalstrategy/carsa-website-support/actions/runs/12345|View full run + diff screenshots>
```

Implementation notes for `notify-slack.js`:
- Parse `test-results.json` (Playwright JSON reporter output)
- Group failures by type: visual diff, console error, broken link
- For each failure extract: page path, viewport (from Playwright project name), error summary (first line of failure message)
- Build page URL from `SITE_URL` env var + path
- If zero failures, do not post (silent on success)
- Slack message uses `mrkdwn` format with emoji prefixes per failure type

## Baseline Management

- Baselines stored in `tests/visual/visual.spec.js-snapshots/` directory
- File naming: `{path-slug}-{viewport}-{platform}.png` (auto-managed by Playwright)
- Update baselines: `npx playwright test tests/visual/ --update-snapshots`
- Or via GitHub Actions: trigger manual run with `update_baselines: true`
- Baselines committed to git (estimated ~20-40MB for full suite)
- If repo size becomes an issue (>50MB of PNGs), migrate to Git LFS

## Reusability

The system is config-driven via `pages.js`. To reuse for another client:
1. Fork or copy the `tests/` directory
2. Update `pages.js` with the new site's URL paths, tiers, and mask selectors
3. Update `.env` with the new site URL and Slack webhook
4. Generate new baselines: `npx playwright test --update-snapshots`

Future: extract into a shared npm package or GitHub template repo if 3+ clients use it.

## Barba Impact

N/A — no Barba transitions on Carsa.

## Task Breakdown

### Task 1: Project scaffold (Sequential — gates all others)
- Init `package.json` with Playwright, dotenv, @playwright/test
- Create `playwright.config.js` with desktop + mobile projects
- Create `.env.example` with `SITE_URL` and `SLACK_WEBHOOK_URL`
- Create `tests/helpers.js` with shared utilities
- **Agent:** code-writer
- **Est. tokens:** ~2k | **Est. time:** 5 min

### Task 2: Page manifest (Parallel with 3, 4, 5)
- Create `tests/visual/pages.js` with lite/full profiles
- Define all page paths, tiers, mask selectors
- Export as structured data for consumption by visual.spec.js
- **Agent:** code-writer
- **Est. tokens:** ~2k | **Est. time:** 5 min

### Task 3: Visual regression spec (Parallel with 2, 4, 5)
- Create `tests/visual/visual.spec.js`
- Iterate page manifest, apply masks, call `toHaveScreenshot()`
- Handle full-page screenshots, animation disabling, threshold config
- **Agent:** code-writer
- **Est. tokens:** ~3k | **Est. time:** 10 min

### Task 4: Console error checks (Parallel with 2, 3, 5)
- Create `tests/checks/console-errors.spec.js`
- Iterate pages, collect errors, filter third-party noise
- **Agent:** code-writer
- **Est. tokens:** ~2k | **Est. time:** 5 min

### Task 5: Broken link checks (Parallel with 2, 3, 4)
- Create `tests/checks/broken-links.spec.js`
- Iterate pages, collect links, HEAD-request, report broken
- **Agent:** code-writer
- **Est. tokens:** ~2k | **Est. time:** 5 min

### Task 6: GitHub Actions workflow (Parallel with 7)
- Create `.github/workflows/visual-regression.yml`
- Cron + manual dispatch, artifact upload, Slack step
- **Agent:** code-writer
- **Est. tokens:** ~2k | **Est. time:** 5 min

### Task 7: Slack notification script (Parallel with 6)
- Create `scripts/notify-slack.js`
- Parse Playwright JSON report, format Slack message, POST to webhook
- Create `scripts/update-baselines.sh` helper
- **Agent:** code-writer
- **Est. tokens:** ~2k | **Est. time:** 5 min

### Task 8: Baseline generation + QA (Sequential — after 1-7)
- Run full suite with `--update-snapshots` to generate initial baselines
- Verify baselines look correct (spot-check screenshots)
- Run a comparison pass to confirm green
- **Agent:** qa
- **Est. tokens:** ~3k | **Est. time:** 15 min

## Parallelisation Map

```
Stream A (code-writer): Task 1 → [Task 2 | Task 3 | Task 4 | Task 5] → Task 8
Stream B (code-writer): ─────── → [Task 6 | Task 7] ──────────────────→ ↗
```

- **Tasks 2-5** are fully independent and can run in parallel after Task 1
- **Tasks 6-7** are independent of 2-5 and can run in a second parallel stream
- **Task 8** gates on all prior tasks completing
- **Worktrees:** Not needed — this builds on a separate repo
- **Agent teams:** Optional — a single code-writer can handle sequential, but 2 parallel streams would speed up

## Test Plan

### Tier 1 — Auto: Playwright local
- Visual diff passes for all lite-profile pages at both viewports
- Visual diff passes for all full-profile pages at both viewports
- No console errors on any page
- No broken links on any page
- Masked CMS regions produce stable diffs despite content changes

### Tier 2 — Auto: CI regression
- GitHub Actions cron fires daily and runs lite profile
- Manual dispatch runs selected profile
- Slack notification fires on failure
- Diff artifacts are uploaded and accessible
- `update_baselines` workflow commits new baselines

### Tier 3 — Manual
- **Slack message formatting** — verify the notification renders correctly in Slack (rich preview, link works). Cannot be automated without a real Slack workspace in CI.
- **Baseline review** — visually inspect baseline screenshots to confirm they're clean captures (no loading spinners, no cookie banners mid-animation). Requires human judgement.
- **Git LFS migration** — if repo size exceeds 50MB of PNGs, manually set up Git LFS. One-time decision, not automatable.

## Verify Loop

### Pass/fail criteria
1. `npx playwright test tests/visual/` exits 0 for both lite and full profiles
2. `npx playwright test tests/checks/` exits 0 (no console errors, no broken links)
3. GitHub Actions workflow runs on cron and completes without error
4. On intentional visual change: re-run with `--update-snapshots`, new baselines committed, subsequent run passes
5. On failure: Slack webhook receives notification with correct format

### Reproduction steps
1. Clone `focalstrategy/carsa-website-support`
2. `npm ci && npx playwright install chromium`
3. Copy `.env.example` to `.env`, set `SITE_URL=https://www.carsa.co.uk`
4. Generate baselines: `npx playwright test tests/visual/ --update-snapshots`
5. Run comparison: `npx playwright test tests/visual/`
6. Run code checks: `npx playwright test tests/checks/`
7. Trigger GHA manually via `workflow_dispatch`

### Tier mapping
- Tier 1: Steps 4-6 above (local Playwright)
- Tier 2: Step 7 (GHA workflow)
- Tier 3: Slack format, baseline review, LFS decision

### Regression scope
- No existing visual tests to regress against (greenfield)
- Console error + broken link checks should not produce false positives from third-party scripts (filter list maintained in spec)
- Cron must not interfere with Webflow publish/deploy cycles

## Acceptance Tests

See `tests/acceptance/carsa-visual-regression.spec.js` for machine-runnable tests.

| Test | Description |
|------|-------------|
| `page manifest exports lite and full profiles` | Validates manifest structure |
| `lite profile has 11 pages` | Count check |
| `full profile has 21+ pages` | Count check |
| `every page has a valid path` | Path format validation |
| `cms pages have mask selectors` | Mask array not empty for cms tier |
| `visual — homepage desktop baseline` | Screenshot diff for homepage at 1280x800 |
| `visual — homepage mobile baseline` | Screenshot diff for homepage at 390x844 |
| `console — no errors on homepage` | Console error check |
| `broken links — homepage has no 404s` | Link check on homepage |
