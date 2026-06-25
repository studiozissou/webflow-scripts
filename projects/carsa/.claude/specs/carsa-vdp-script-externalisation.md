# carsa-vdp-script-externalisation

## Summary

Test whether externalising Carsa VDP inline scripts (~45KB across 19 `<script>` blocks) to a single CDN-hosted file improves Lighthouse Performance scores and page load speed. Phase 1 moves scripts as-is (preserving jQuery deps) into a single `vdp.js` bundle on jsDelivr. Phase 2 refactors to vanilla ES2022+, deduplicates shared helpers, and splits into modular files loaded via an `init.js` loader.

## Problem

The Carsa VDP (`/vehicles/*`) currently has 19 inline `<script>` blocks totalling ~45KB in Webflow page custom code. These scripts are:

1. Gallery handler
2. WhatsApp link builder
3. Location info display
4. EV charge time calculator
5. Finance calculator (9.7KB)
6. APR handler
7. PX valuation builder (6.3KB)
8. Get-started link builder
9. Similar cars link builder
10. Equal-height card setter
11. Form UTM appender
12. Make/model counter
13. Check-finance link builder
14. Removed-car redirect handler
15. GTM data layer push
16. Plus 4 additional small scripts

**Impact:** Every VDP page load parses all 45KB inline. Browsers cannot cache inline scripts, so returning visitors re-parse the same code. Externalising to a single CDN file enables HTTP caching (jsDelivr serves with `cache-control: public, max-age=31536000` for pinned commits).

## Test pages

6 VDP URLs for baseline and comparison Lighthouse runs:

| # | URL | Notes |
|---|-----|-------|
| 1 | `https://www.carsa.co.uk/vehicles/used/gn20phv` | Standard |
| 2 | `https://www.carsa.co.uk/vehicles/used/vk72rzv` | Standard |
| 3 | `https://www.carsa.co.uk/vehicles/used/bl73dmu` | Standard |
| 4 | `https://www.carsa.co.uk/vehicles/used/ow74xxv` | Standard |
| 5 | `https://www.carsa.co.uk/vehicles/used/fd23hgg` | Standard |
| 6 | `https://www.carsa.co.uk/vehicles/used/oe22lfp` | Standard |

## Phase 1: Single VDP Bundle (Approach A)

### Goal
Prove/disprove that externalising inline scripts improves Lighthouse Performance score and loading speed.

### Step 1 — Baseline Lighthouse
Run Lighthouse Performance audit on all 6 VDP URLs with scripts inline (current state). Record:
- Performance score
- FCP (First Contentful Paint)
- LCP (Largest Contentful Paint)
- TBT (Total Blocking Time)
- CLS (Cumulative Layout Shift)
- Speed Index

Save results to `projects/carsa/.claude/audits/lighthouse/vdp-baseline-YYYY-MM-DD.json`.

### Step 2 — User provides VDP scripts
User copies all 19 inline `<script>` blocks from the Webflow VDP page settings and pastes them.

### Step 3 — Add to GitHub and host
1. Create `projects/carsa/vdp.js` — concatenate all 19 scripts in their original execution order
2. Each script wrapped in its own IIFE if not already: `(function(){ ... })();`
3. Preserve all jQuery dependencies as-is (jQuery is loaded site-wide before body scripts)
4. Push to GitHub

**CMS token audit:** Before concatenating, scan each script for Webflow CMS template tokens (`{{wf:...}}` patterns or inline `var x = "..."` that look like server-injected values). Any script that relies on server-injected values needs those values moved to `data-*` attributes on DOM elements — this requires Webflow Designer changes. Document findings and flag to user.

### Step 4 — Build functional tests
Write acceptance tests that verify all VDP script functionality works when loaded externally:
- No console errors
- Finance calculator renders
- Check-finance links build correctly
- Gallery initialises
- Equal-height cards apply
- PX valuation form works
- WhatsApp link generates

### Step 5 — User adds loader scripts to Webflow
User adds two things to Webflow VDP page settings:

**Head code:**
```html
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
```

**Body code:**
```html
<script src="https://cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@COMMIT_HASH/projects/carsa/vdp.js"></script>
```

User removes all 19 existing inline `<script>` blocks from VDP page settings.

### Step 6 — Post-change Lighthouse
Run identical Lighthouse Performance audit on all 6 VDP URLs. Record same metrics as Step 1.

Save results to `projects/carsa/.claude/audits/lighthouse/vdp-external-YYYY-MM-DD.json`.

### Step 7 — Diff and report
Generate a comparison report:

| Metric | Baseline (avg) | External (avg) | Delta |
|--------|---------------|----------------|-------|
| Performance | ? | ? | ? |
| FCP | ? | ? | ? |
| LCP | ? | ? | ? |
| TBT | ? | ? | ? |
| CLS | ? | ? | ? |
| Speed Index | ? | ? | ? |

Save to `projects/carsa/.claude/audits/lighthouse/vdp-perf-comparison-YYYY-MM-DD.md`.

### Files affected (Phase 1)

| File | Status | Description |
|------|--------|-------------|
| `projects/carsa/vdp.js` | New | Single concatenated VDP bundle (~45KB) |
| `projects/carsa/.claude/audits/lighthouse/vdp-baseline-*.json` | New | Baseline Lighthouse results |
| `projects/carsa/.claude/audits/lighthouse/vdp-external-*.json` | New | Post-change Lighthouse results |
| `projects/carsa/.claude/audits/lighthouse/vdp-perf-comparison-*.md` | New | Diff report |
| `tests/acceptance/carsa-vdp-script-externalisation.spec.js` | New | Acceptance tests |

---

## Phase 2: Modular Refactor (Approach C)

### Goal
Optimise: refactor jQuery to vanilla JS, deduplicate shared helpers, split into modular files with `init.js` loader.

### Step 1 — Code review
Review `vdp.js` for:
- jQuery usage — identify every `$()`, `.on()`, `.find()`, `.val()`, `.attr()`, `.css()` call
- Duplicated helpers — `getAttributionParams()` (appears 4x across site), `addParams()`, `setEqualHeight()`
- Dead code
- Security issues (XSS via CMS values, unescaped interpolation)

### Step 2 — Refactor to vanilla ES2022+
- Replace all jQuery calls with `document.querySelector`, `addEventListener`, etc.
- Extract shared helpers to `projects/carsa/utils/attribution.js` and `projects/carsa/utils/dom.js`
- Each script becomes its own module file (e.g. `vdp-gallery.js`, `vdp-finance-calc.js`)
- All modules wrapped in IIFEs with `init()` function pattern

### Step 3 — Create `init.js` loader
Follow NEM Life pattern:
- `document.currentScript.src` for base URL resolution
- Route detection: `/vehicles/` path triggers VDP module loading
- `loadScript()` Promise wrapper with dedup guard
- `DOMContentLoaded` gate + `boot().catch(() => {})`
- Single `<script>` tag in Webflow head — no body script needed

### Step 4 — Push, commit, update Webflow hash
1. Push refactored code to GitHub
2. Get new commit hash
3. Update Webflow head script tag with new hash
4. Wait 30s for jsDelivr to index

### Step 5 — Run auto tests on live page
Run acceptance tests against live site to verify all functionality works post-refactor.

### Files affected (Phase 2)

| File | Status | Description |
|------|--------|-------------|
| `projects/carsa/init.js` | New | Route-based module loader |
| `projects/carsa/vdp-gallery.js` | New | Gallery module |
| `projects/carsa/vdp-finance-calc.js` | New | Finance calculator module |
| `projects/carsa/vdp-check-finance.js` | New | Check-finance link builder |
| `projects/carsa/vdp-px-valuation.js` | New | PX valuation form |
| `projects/carsa/vdp-whatsapp.js` | New | WhatsApp link builder |
| `projects/carsa/vdp-equal-height.js` | New | Equal-height card utility |
| `projects/carsa/vdp-battery.js` | New | EV battery animation |
| `projects/carsa/utils/attribution.js` | New | Shared UTM/attribution helpers |
| `projects/carsa/utils/dom.js` | New | Shared DOM utilities |
| `projects/carsa/vdp.js` | Delete | Replaced by modular files |
| Plus remaining VDP modules | New | One file per script |

---

## Barba Impact

N/A — no Barba transitions on Carsa.

---

## Verify Loop

### Pass/fail criteria

**Phase 1:**
1. All 6 VDP pages load without console errors when using external `vdp.js`
2. Finance calculator renders and accepts input
3. Check-finance links contain correct `quote.carsa.co.uk` URL with VRM
4. Gallery images are navigable
5. Equal-height cards have matching heights
6. WhatsApp link contains vehicle VRM
7. Removed-car handler redirects correctly (if vehicle is removed)
8. Lighthouse Performance scores recorded for all 6 pages (baseline and external)

**Phase 2:**
9. All Phase 1 criteria still pass after jQuery removal
10. No jQuery references remain in any module file
11. `init.js` correctly loads only VDP modules on `/vehicles/*` pages
12. `init.js` does NOT load VDP modules on non-VDP pages

### Reproduction steps

1. Navigate to any of the 6 test VDP URLs
2. Open DevTools Console — verify no errors
3. Check Network tab — verify `vdp.js` loads from `cdn.jsdelivr.net` (Phase 1) or `init.js` + modules load (Phase 2)
4. Interact with finance calculator, PX form, gallery
5. Run Lighthouse audit in Performance mode

### Tier mapping

- **Tier 1 (auto):** `tests/acceptance/carsa-vdp-script-externalisation.spec.js` — console errors, element presence, external script loading
- **Tier 2 (CDN regression):** registered in `tests/registry.json` — runs on `/deploy`
- **Tier 3 (manual):** Lighthouse audit comparison (requires manual DevTools run for consistent throttling), visual gallery interaction, finance calculator end-to-end with real VRM

### Regression scope

- Site-wide scripts (UTM tracking, SVG animations, n8n chat) must continue to work — they are not touched
- Other pages must not be affected — `vdp.js` only loads on VDP pages
- Finsweet CMS filtering on SRP is unaffected

---

## Test Plan

### Tier 1 — Auto: Playwright local
1. No console errors on VDP page load
2. External script tag present (`cdn.jsdelivr.net` src)
3. Finance calculator element visible
4. Check-finance link has `quote.carsa.co.uk` href
5. Gallery container present and has images
6. Equal-height cards have uniform height
7. No inline `<script>` blocks with VDP-specific code remain (Phase 1 post-migration)

### Tier 2 — Auto: CDN regression
- Registered in `tests/registry.json` as `carsa-vdp-script-externalisation`
- Runs after commit + push + CDN hash update

### Tier 3 — Manual (remaining — not automatable)
- **Lighthouse Performance audit** — requires consistent throttling settings and incognito mode; automated Lighthouse via CLI varies too much for reliable comparison. Run manually in DevTools with "Applied Slow 4G" and "4x CPU slowdown" for consistent results.
- **Finance calculator end-to-end** — enter real VRM, verify redirect to `quote.carsa.co.uk` with correct params. Cannot automate cross-domain redirect (Playwright can't follow to external domain and verify landing page state).
- **Visual gallery interaction** — swipe/click through images, verify no layout shift or broken thumbnails. Subjective quality check.
- **EV battery animation** — accordion open triggers GSAP bar width animation. Timing/easing is subjective.
- **Form submission data arrives in Webflow** — automated tests verify hidden fields are populated, but confirming submission data actually arrives in the Webflow form dashboard requires manual check.

---

## Acceptance Tests

See `tests/acceptance/carsa-vdp-script-externalisation.spec.js`

### Console errors
1. `no JS errors on VDP page load` — navigate to VDP, wait for scripts, assert zero pageerror events
2. `no console errors on additional VDP pages` — run error check on 2 more test URLs for coverage

### External script
3. `external vdp.js script tag is present` — check for `<script>` with `cdn.jsdelivr.net` src containing `carsa/vdp.js`

### VDP features
4. `finance calculator element is visible` — assert finance calculator container is attached and visible
5. `check-finance link has correct href` — assert link href contains `quote.carsa.co.uk`
6. `gallery container has images` — assert gallery wrapper contains at least 1 `<img>` element
7. `equal-height cards have uniform height` — measure card heights, assert max difference < 2px

### Attribution (NEW — automated)
8. `UTM params appended to Build Deal / Book / Eligibility links` — navigate with `?utm_source=playwright&utm_medium=test`, assert all `quote.carsa.co.uk` links have UTM params in href
9. `Get Started link includes VRM and location` — assert `[data-button="booking-options"]` href contains `/get-started`, `vrm=`, and `location=`
10. `Search Similar link includes make/model params` — assert `[data-link="search-similar"]` href contains `/used-cars`

### Form hidden fields (NEW — automated)
11. `forms with data-form="add-utms" get hidden UTM inputs` — navigate with UTM params, assert hidden inputs `utm_source`, `utm_medium`, `conversion_page` exist with correct values

### Part exchange (NEW — automated)
12. `PX form builds correct valuation URL on input` — fill `[name="px-vrm"]` with test VRM, assert button href updates to include the entered VRM

### Check finance (NEW — automated)
13. `check-finance links have correct domain and VRM` — assert `[data-link="check-finance"]` href contains `quote.carsa.co.uk`

### CMS config (NEW — automated)
14. `window.__CARSA_VDP is populated with CMS values` — assert `__CARSA_VDP.price` is a number > 0 and `__CARSA_VDP.vrm` is a non-empty string

---

## Parallelisation Map

### Phase 1

| Stream | Agent | Tasks | Est. tokens | Dependencies |
|--------|-------|-------|-------------|--------------|
| A: Baseline Lighthouse | perf | Run 6 Lighthouse audits, save results | ~5K | None |
| B: Script concatenation | code-writer | Receive scripts, audit CMS tokens, create vdp.js | ~8K | User provides scripts |
| C: Acceptance tests | qa | Write + register tests | ~4K | None (template-based) |

- **A and C** can run in parallel (independent)
- **B** blocks on user providing scripts
- **A** must complete before Step 6 (post-change Lighthouse)
- Post-change Lighthouse (Step 6) blocks on B + user updating Webflow

**Recommendation:** Parallel streams A+C, then sequential B → deploy → Step 6 → diff. No worktrees needed — single branch workflow.

### Phase 2

| Stream | Agent | Tasks | Est. tokens | Dependencies |
|--------|-------|-------|-------------|--------------|
| D: Code review | code-reviewer | Review vdp.js for jQuery, dupes, security | ~5K | Phase 1 complete |
| E: Refactor modules | refactor | jQuery→vanilla, split into modules | ~15K | D complete |
| F: Build init.js | code-writer | Create route-detecting loader | ~5K | E complete |
| G: Live tests | qa | Run acceptance tests on live site | ~3K | F deployed |

- **D→E→F→G** is sequential (each depends on previous)
- No parallelisation opportunity in Phase 2
