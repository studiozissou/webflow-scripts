# Carsa Code Migration to GitHub

**Slug:** `carsa-code-migration`
**Client:** Carsa
**Status:** Planning
**Priority:** P1
**Created:** 2026-07-06
**Supersedes:** `projects/carsa/.claude/specs/github-migration.md` (original proposal — this spec refines the approach)

## Summary

Migrate all Carsa inline custom code from Webflow to Carsa's GitHub (`focalstrategy/carsa-website-support` → `webflow/scripts/`), delivered via CDN. Page-by-page, 1:1 copy of existing inline code — no refactoring. Each page is tested before and after. Rollback possible at every stage with a single command.

## Phases

| Phase | What | Starts |
|---|---|---|
| 1 | Per-page migration (1:1 copy to CDN) | Now |
| 2 | Site-wide scripts migration | After all pages verified |
| 3 | Init.js (single entry point, route-based loading) | After site-wide verified |
| 4 | Modularise (extract shared modules, deduplicate) | After init.js stable |
| 5 | Refactor (jQuery removal, ES2022+, performance) | After modularise stable |

Each phase is independent. No phase starts until the previous is verified and approved. Rollback to any previous phase is always possible.

---

## Decision Point: CDN Source

**Current:** VDP served from `cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@{SHA}/projects/carsa/vdp.js` (Will's public repo).

**Target:** `cdn.jsdelivr.net/gh/focalstrategy/carsa-website-support@{SHA}/webflow/scripts/{file}.js` (Carsa's repo).

**Blocker:** jsDelivr only works with **public** GitHub repos. If `focalstrategy/carsa-website-support` is private, alternatives needed:
- A: Keep serving from `studiozissou/webflow-scripts` (current, works)
- B: Make `focalstrategy/carsa-website-support` public
- C: Use a different CDN (Cloudflare Pages, GitHub Pages, Vercel)
- D: Use Webflow registered scripts API (inline max 2000 chars)

**Action:** Verify repo visibility before Phase 1 begins.

---

## Phase 1: Per-Page Migration

### Workflow (per page)

```
1. CAPTURE  — Pull current inline code from Webflow (MCP get_page_freeform_code)
2. SAVE     — Save rollback copy to projects/carsa/.claude/rollback/{slug}.html
3. CREATE   — Save as .js file → PR to focalstrategy/carsa-website-support webflow/scripts/
4. ANALYSE  — Document what the code does, dependencies, DOM selectors, API calls
5. TEST     — Write Playwright tests, run against LIVE site (baseline green)
6. SWAP     — Replace inline code with <script src="CDN/{slug}.js"> via MCP set_page_freeform_code
7. PUBLISH  — Publish whole site
8. TEST     — Run same Playwright tests against production
9. VERIFY   — Manual spot check of interactive features
10. DONE    — Commit, tag, move to next page
```

### Page Migration Order

**Static pages (unique per-page code):**

| # | Page | Path | Complexity | Key Features |
|---|---|---|---|---|
| 1 | Homepage | `/` | Medium-high | Make/model dropdowns, search toggle, price tabs, PX form, equal-height cards, SVG draw-line + draw-shape, valuation form |
| 2 | SRP | `/used-cars` | High | 3 Finsweet list hooks, 404 redirect, results counter, mobile filter toggle, VRM sanitiser, check-finance |
| 3 | Deals | `/used-cars/deals` | High | Identical to SRP |
| 4 | Finance Calculator | `/car-finance-calculator` | Medium | Calculator logic (8KB), mobile CTA, check-finance, equal-height cards |
| 5 | Get Started | `/get-started` | Medium | URL param parser, radio styler, draw-line variant, title updater |
| 6 | Part Exchange | `/part-exchange` | Medium | PX attribution, FAQ schema, draw-line, draw-shape |
| 7 | Value Car | `/value-car` | Medium | FAQ schema, valuation builder, draw-line, draw-shape |
| 8 | FAQ Index | `/faq` | Medium | FAQ JSON-LD (83KB!), question scroll, category reorder |
| 9 | Car Finance | `/car-finance` | Low | FAQ schema generator only |
| 10 | All Models | `/all-models` | Low | Dropdown label handler only |

**CMS templates (5 representative samples each):**

| # | Template | Path | Samples |
|---|---|---|---|
| 11 | VDP | `/vehicles/*` | gn20phv + 4 TBD (1 EV, 1 sold, 1 reserved, 1 high-value) — **repo move only, already externalised** |
| 12 | Models | `/models/*` | fiesta, corsa, golf, qashqai, yaris |
| 13 | Makes | `/make/*` | ford, vauxhall, volkswagen, nissan, toyota |
| 14 | Fuel Types | `/fuel/*` | petrol, diesel, electric, hybrid, plug-in-hybrid |
| 15 | Near/Postcodes | `/near/*` | birmingham, manchester, london, southampton, bolton |
| 16 | Blog Post | `/blog/*` | 5 diverse posts (TBD at build time) |

**Easy pages (24 — global scripts only, no unique code):**
Verified after Phase 2. No per-page code to migrate.

### CMS Config Block Pattern

Pages with CMS template tokens (`{{wf ...}}`) keep a minimal inline config block. The external script reads from the global:

```html
<!-- Stays in Webflow body code (CMS tokens only work inline) -->
<script>
window.__CARSA_MODELS = {
  makeName: "{{wf {"path":"make:name","type":"PlainText"} }}",
  makeSlug: "{{wf {"path":"make:slug","type":"PlainText"} }}"
};
</script>

<!-- Swapped: inline code replaced with CDN script -->
<script src="https://cdn.jsdelivr.net/gh/.../webflow/scripts/models.js"></script>
```

**Pages needing CMS config blocks:** VDP (done), Models, Makes, Fuel Types, Near, Blog Post.
**Pages with NO CMS tokens (pure swap):** Homepage, SRP, Deals, Finance Calculator, Get Started, Part Exchange, Value Car, FAQ Index, Car Finance, All Models.

---

## Phase 2: Site-Wide Scripts Migration

After all per-page migrations verified.

**Site footer scripts to migrate (8 blocks → 1 external file):**

| Script | Size | Dependencies |
|---|---|---|
| Attribution saver (UTM + referrer) | ~3KB | Vanilla JS |
| Finance UTM appender | ~2KB | Vanilla JS |
| Model & promo link builder | ~500B | Vanilla JS |
| Store list prepend | ~70B | jQuery |
| Noreferrer/noopener utility | ~200B | Vanilla JS |
| Copyright year updater | ~100B | Vanilla JS |
| n8n chat bot | ~2.8KB | @n8n/chat CDN |
| Menu scroll lock | ~1KB | Vanilla JS |

**Stays in Webflow (not migrated):**
- Site head: GTM, VWO, JSON-LD Organization schema, font-smoothing CSS
- Site footer: Slider dot CSS (styling, not JS)
- All third-party scripts (Calltracks, Mixpanel, Finsweet, GSAP, Trustpilot, jQuery)

---

## Phase 3: Init.js

Single entry point replaces all per-page `<script>` tags:
1. One `<script src="init.js">` in Webflow site-wide head
2. `init.js` reads `window.location.pathname`, loads only needed modules
3. Handles CDN vs localhost switching for local dev
4. New CMS items work automatically (route patterns, not hardcoded paths)

**Result:** Zero per-page custom code in Webflow. One script tag in site settings.

---

## Phase 4: Modularise

Extract duplicated code into shared modules:

| Module | Currently duplicated in |
|---|---|
| `attribution.js` | Homepage, VDP, site-wide (4x) |
| `svg-animations.js` | Homepage, VDP, Part Exchange, Value Car (2-4x) |
| `utils.js` | Homepage, VDP, Finance Calc (equal-height, copyright, noopener) |
| `valuation.js` | Homepage, VDP, Value Car (2-3x) |
| `check-finance.js` | VDP, SRP, Models, Fuel, Near (5x) |
| `faq-schema.js` | FAQ Index, Car Finance, Part Exchange, Value Car (4x) |

Each page script shrinks as shared code moves to modules. No behaviour changes.

---

## Phase 5: Refactor

Per-module improvements (done page by page, module by module):
- jQuery removal → vanilla JS
- ES2022+ syntax
- `DEBUG && console.log(...)` pattern
- `prefers-reduced-motion` support on animations
- Performance improvements
- Unit tests per module

---

## Rollback Strategy

### Saved data
Before ANY changes:
- `projects/carsa/.claude/rollback/site-head.html` — site-wide head
- `projects/carsa/.claude/rollback/site-footer.html` — site-wide footer
- `projects/carsa/.claude/rollback/{page-slug}-head.html` — per-page head
- `projects/carsa/.claude/rollback/{page-slug}-body.html` — per-page body

### Git safety
- Each page migration = 1 commit
- Each phase boundary = 1 git tag (`carsa-migration/phase-1-homepage`, etc.)
- CDN URLs pinned to commit SHAs — old versions never disappear
- No force-pushes

### User commands
Say any of these at any time:

| Command | Effect |
|---|---|
| "Roll back homepage" | Restore homepage inline code from saved file via MCP |
| "Roll back to before Phase 2" | Restore all pages + site-wide to pre-Phase-2 state |
| "Roll back everything" | Full restoration to original state before any migration |

---

## Barba Impact

N/A — no Barba transitions on Carsa site.

---

## Test Plan

### Tier 1 — Auto: Playwright local

Tests in `tests/acceptance/carsa-code-migration.spec.js`. Tests added incrementally as each page is migrated.

**Homepage tests (first migration):**

| Test | What it checks |
|---|---|
| `homepage-no-errors` | Zero JS console errors on page load |
| `homepage-make-dropdown` | Make dropdown populates with options |
| `homepage-search-button` | Search submit button present |
| `homepage-price-tabs` | Price tab elements present |
| `homepage-px-form` | PX form links present with `quote.carsa.co.uk` base URL |
| `homepage-equal-height` | `[data-card-height="equal"]` containers present |
| `homepage-svg-draw-line` | `[data-svg="draw-line"]` containers present |
| `homepage-svg-draw-shape` | `[data-svg="draw-shape"]` containers present |
| `homepage-valuation-links` | Valuation form links present with `sellcar.carsa.co.uk` base URL |
| `homepage-mobile` | Key elements visible at 375px |

**Generic tests (applied to every migrated page):**

| Test | What it checks |
|---|---|
| `{page}-no-errors` | Zero JS console errors |
| `{page}-cdn-loaded` | CDN script tag present and returns 200 |

### Tier 2 — Auto: CDN regression

Registered in `tests/registry.json` as `carsa-code-migration`. Runs after each deploy.

### Tier 3 — Manual

| Check | Why manual |
|---|---|
| Make/model dropdown → actual redirect | Real Finsweet CMS list interaction + navigation |
| Finance calculator produces correct numbers | API call to `api.carsa.co.uk` |
| PX form submission completes | Real form flow through `quote.carsa.co.uk` |
| SVG animation timing/quality | Subjective visual quality |
| Cross-browser (Safari, Firefox) | Playwright only runs Chromium |
| Mobile device-specific | Real device testing |

---

## Verify Loop

### Pass/fail criteria (per migrated page)

All must pass:
1. **Zero JS console errors** — no `pageerror` events
2. **All interactive elements present** — selectors from code analysis match DOM
3. **CDN script loaded** — `<script src="cdn.jsdelivr.net/...">` returns 200
4. **No inline code remaining** — page custom code block empty (or CMS config only)
5. **Existing Playwright tests pass** — VDP, near-location, visual regression specs green

### Reproduction steps (homepage)

1. Navigate to `https://www.carsa.co.uk/`
2. Open console — verify zero errors
3. Click a make in dropdown → verify model dropdown populates
4. Scroll to SVG section → verify animation triggers
5. Check PX form links → verify `quote.carsa.co.uk` base URL
6. Check valuation links → verify `sellcar.carsa.co.uk` base URL
7. Resize to 375px → verify mobile layout

### Tier mapping

- Criteria 1-4: Tier 1 (Playwright, automated)
- Same tests post-deploy: Tier 2 (registry)
- Redirect flow, calc, Safari/Firefox, mobile: Tier 3 (manual)

### Regression scope

- Other pages unaffected (each page migrated independently)
- Schema JSON-LD in site head untouched
- Third-party scripts (GTM, VWO, Calltracks, Mixpanel, Trustpilot, Finsweet, GSAP, jQuery) unaffected
- Existing Carsa test specs (`carsa-vdp-script-externalisation`, `carsa-near-location-redirect`, `carsa-visual-regression`) must stay green

---

## Task Breakdown

### Phase 0: Code Capture (read-only)

| # | Task | Agent | Depends on |
|---|---|---|---|
| 0.1 | Pull site-wide head + footer code via MCP (`get_site_freeform_code`) | code-writer | — |
| 0.2 | List all pages via MCP (`list_pages`), pull per-page head + body code (`get_page_freeform_code`) for every page | code-writer | — |
| 0.3 | Save all captured code to `projects/carsa/.claude/rollback/` | code-writer | 0.1, 0.2 |
| 0.4 | Cross-reference captured code with existing files in `projects/carsa/` — identify what's already extracted vs what's new | code-writer | 0.3 |

**Output:** Complete snapshot of all Carsa custom code in `rollback/`, nothing changed on the site.

### Phase 1

| # | Task | Agent | Depends on |
|---|---|---|---|
| 1.0 | Verify CDN source repo visibility (public/private) | manual | — |
| 1.1 | Rollback files confirmed (from Phase 0) | — | Phase 0 |
| 1.2 | Migrate homepage | code-writer + qa | 1.0, 1.1 |
| 1.3 | Migrate SRP | code-writer + qa | 1.2 |
| 1.4 | Migrate Deals | code-writer + qa | 1.3 |
| 1.5 | Migrate Finance Calculator | code-writer + qa | 1.2 |
| 1.6 | Migrate Get Started | code-writer + qa | 1.2 |
| 1.7 | Migrate Part Exchange | code-writer + qa | 1.2 |
| 1.8 | Migrate Value Car | code-writer + qa | 1.2 |
| 1.9 | Migrate FAQ Index | code-writer + qa | 1.2 |
| 1.10 | Migrate Car Finance | code-writer + qa | 1.2 |
| 1.11 | Migrate All Models | code-writer + qa | 1.2 |
| 1.12 | Move VDP to Carsa repo (update CDN URL) | code-writer | 1.0 |
| 1.13 | Migrate Models template (5 samples) | code-writer + qa | 1.2 |
| 1.14 | Migrate Makes template (5 samples) | code-writer + qa | 1.2 |
| 1.15 | Migrate Fuel Types template (5 samples) | code-writer + qa | 1.2 |
| 1.16 | Migrate Near/Postcodes template (5 samples) | code-writer + qa | 1.2 |
| 1.17 | Migrate Blog Post template (5 samples) | code-writer + qa | 1.2 |
| 1.18 | Verify 24 easy pages (global scripts work) | qa | All above |

### Phase 2-5

Detailed breakdown deferred until Phase 1 is complete.

---

## Parallelisation Map

### Phase 1

**Sequential** — user explicitly wants page-by-page: migrate, publish, test, verify, then next page. Lowest risk.

**Exception:** Task 1.12 (VDP repo move) is independent — can run in parallel with any page migration.

After homepage (1.2) is verified, tasks 1.3-1.11 are sequential but independent of each other. If risk tolerance increases, could batch 2-3 pages per publish cycle.

### Recommendation
- Sequential execution (user preference: lowest risk)
- No worktrees needed
- Single session per page migration

---

## Acceptance Tests

See `tests/acceptance/carsa-code-migration.spec.js` for machine-runnable tests.

Tests listed above in Test Plan section. Additional tests added incrementally as each page is migrated — the test file grows with each page.
