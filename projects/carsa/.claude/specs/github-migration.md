# Proposal: Carsa Custom Code Migration to GitHub

**Client:** Carsa (via Tomek Stacharski)
**Date:** 2026-04-07
**Author:** Will Morley
**Status:** Draft proposal

---

## The Problem

Carsa's custom code is currently scattered across Webflow's interface — embedded directly in Site Settings, Page Settings, and in-canvas code embeds.

- **Performance burden.** ~130KB of JavaScript scattered across 40+ pages, much of it duplicated. Browsers parse the same code repeatedly instead of loading cached modules once.
- **No test coverage.** Changes go live untested, bugs only found by users.
- **Hard to update.** Updating shared logic (like UTM tracking) means manually editing every page that uses it. The same helper appears 4 separate times.
- **No central overview.** Finding a specific script means clicking through individual pages in the Designer.
- **No version history.** If something breaks, there's no way to see what changed or roll back.
- **No code review.** Multiple people can edit code in Webflow with no review process and no audit trail.

---

## What We Found

We scanned **every published page and one example of each CMS template** on the live site — 28 static pages + 17 CMS templates.

### Site-Wide Scripts (loaded on every page)
| Script | Purpose | Size |
|--------|---------|------|
| Google Analytics (GA4) | Analytics tracking | External |
| Google Tag Manager (GTM) | Tag management | External |
| Mixpanel | Analytics | External |
| VWO (Visual Website Optimizer) | A/B testing | ~500KB inline (!!) |
| Calltracks | Call tracking / dynamic number insertion | External |
| Finsweet Attributes v2 | CMS filtering, sorting, load more | External |
| Finsweet Components | Component library | External |
| GSAP + ScrollTrigger + DrawSVG + EasePack | Animations | External |
| jQuery 3.5.1 | DOM manipulation (Webflow default) | External |
| Trustpilot widget | Review display | External |
| n8n Chat widget | Chatbot | ~2.8KB inline + CDN |
| UTM/attribution saver | Tracks referrer and UTM params | ~3KB inline |
| UTM form appender | Adds UTMs to form hidden fields | ~2KB inline |
| Noopener/noreferrer utility | Security: adds rel attrs to external links | 193 bytes inline |
| Copyright year updater | Sets current year in footer | 101 bytes inline |
| Model link builder | Builds /used-cars links for model cards | 638 bytes inline |
| Store list reorder | Moves "find store" link to top of list | 70 bytes inline |
| SVG draw-line animation | GSAP-powered line drawing on scroll | ~4.5KB inline |
| SVG draw-shape animation | GSAP-powered shape pop-up on scroll | ~3.5KB inline |

### Page-by-Page Scan Results

#### Complex (significant unique code, CMS tokens, multiple interactions)
| Page | Unique Scripts | Size |
|------|---------------|------|
| **Vehicle Detail (VDP)** `/vehicles/*` | 19 scripts: gallery, WhatsApp link, location info, EV charge time, finance calculator (9.7KB), APR handler, PX valuation builder (6.3KB), get-started link, similar cars link, equal-height cards, form UTM appender, make-model counter, check-finance link, removed-car handler, GTM data layer. Uses CMS tokens (VRM, make, model, location, status). | **~45KB** |
| **Used Cars (SRP)** `/used-cars` | 8 scripts: 3 Finsweet list hooks (loader 1.3KB, filter/URL builder 5.3KB, count updater 1.5KB), 404 redirect banner, desktop results counter, mobile filter toggle, VRM input sanitiser, check-finance link | **~15KB** |
| **Deals** `/used-cars/deals` | Shares identical SRP scripts | **~15KB** |

#### Medium (moderate unique code or shared modules)
| Page | Unique Scripts | Size |
|------|---------------|------|
| **Homepage** `/` | Make/Model filter, search button state, price tab toggle, PX form builder, equal-height cards, valuation form builder, GA hero tracking | ~12KB |
| **FAQ Index** `/faq` | FAQ JSON-LD schema (83KB!), question scroll handler, category list reorder, FAQ schema generator (2.5KB) | ~86KB |
| **Finance Calculator** `/car-finance-calculator` | Calculator logic (8KB), mobile CTA scroll, check-finance link, equal-height cards | ~12KB |
| **Get Started** `/get-started` | URL param parser, radio button styler, draw-line variant, title updater | ~4KB |
| **Models Template** `/models/*` | Meta description builder, similar cars search link, check-finance link. Uses CMS tokens (make, model). | ~4.7KB |
| **Postcodes Template** `/near/*` | Check-finance link, location button handler. Uses CMS tokens. | ~3.6KB |

#### Low (1-2 small scripts or shared modules only)
| Page | Unique Scripts | Size |
|------|---------------|------|
| **Part Exchange** `/part-exchange` | PX attribution builder, FAQ schema, draw-line, draw-shape | ~12KB (mostly shared) |
| **Value Car** `/value-car` | FAQ schema, valuation builder, draw-line, draw-shape | ~11KB (mostly shared) |
| **Car Finance** `/car-finance` | FAQ schema generator | ~1.7KB |
| **All Models** `/all-models` | Dropdown label handler | ~1.4KB |
| **Blog Post** `/blog/*` | Tooltip widget, inline finance calculator | ~4KB |
| **Makes Template** `/make/*` | Search link builder. Uses CMS tokens (make). | ~3.4KB |
| **Fuel Types Template** `/fuel/*` | Check-finance link, search link. Uses CMS tokens (fuel). | ~3.5KB |

#### Easy (global scripts only — no unique page code)
| Pages | Count |
|-------|-------|
| Contact, Stores Index, Blog Index | 3 |
| About Carsa, Car Preparation, Careers | 3 |
| Car Care: overview, carsaCover, carsaCover EV, carsaProtect, carsaExtras, driveaway insurance, podpoint, extended warranty | 8 |
| Payment Success, Payment Failure | 2 |
| 404 | 1 |
| **CMS templates (global only):** Store Detail, FAQ Detail, Blog Category, FAQ Category, Promotions, Regions, Terms | 7 |
| **Total easy pages** | **24** |

*Note: Testimonials, Features, Car Badges, and Facilities are reference collections used inside other pages — they don't have public-facing template pages with custom code.*

### Key Numbers
- **45 pages/templates total** (28 static + 17 CMS templates)
- **21 pages with unique scripts** that need individual migration
- **24 pages with global scripts only** — covered automatically by `init.js`
- **~130KB+ of inline JavaScript** across the site (excluding VWO's 500KB)
- **4 duplicated copies** of the `getAttributionParams()` UTM helper
- **3 duplicated copies** of the `addParams()` URL builder
- **2 duplicated copies** of `setEqualHeight()` card utility
- **2 duplicated copies** of the SVG draw-line / draw-shape animation blocks (~8KB each time)
- **2 duplicated copies** of the valuation link builder
- **0 version control** on any of it

---

## What We Propose

Move all custom JavaScript to a GitHub repository, organised into modules, and load it via a single CDN-hosted entry file.

### How It Would Work

1. **One `init.js` file** loaded in Webflow's site-wide head code — the **only** script tag needed. No per-page code in Webflow at all.
2. `init.js` reads the current URL path and automatically loads only the modules that page needs. For example, `/used-cars` loads the search and filter modules; `/vehicles/*` loads the VDP module. New CMS items (vehicles, blog posts) work automatically — no code changes needed.
3. All code lives in GitHub, with full version history, code review, and rollback capability.
4. Deployed via jsDelivr CDN (free, fast, pinned to a specific commit hash for safety).
5. Local development supported — developers can test changes on localhost before pushing live.
6. **All existing per-page code is removed from Webflow** after migration. The only remaining Webflow custom code is third-party scripts (analytics, VWO, etc.) in Site Settings.

### Proposed Module Structure

| Module | Contains | Pages |
|--------|----------|-------|
| `init.js` | Loader, page detection, CDN/local URL switching | All |
| `attribution.js` | UTM tracking, referrer capture, form UTM injection (currently duplicated 4x) | All |
| `utils.js` | Copyright year, noopener links, equal-height cards (currently duplicated 2x) | All |
| `chat.js` | n8n chat widget initialisation | All |
| `svg-animations.js` | Draw-line + draw-shape GSAP animations (currently duplicated 2x) | Home, Part Exchange, Value Car, Get Started |
| `search.js` | Make/Model filter, search button state, price tab toggle, VRM sanitiser, mobile filters | Home, Used Cars |
| `valuation.js` | PX form builder, valuation link builder (currently duplicated 2-3x) | Home, Part Exchange, Value Car, VDP |
| `check-finance.js` | Finance eligibility link builder | Used Cars, VDP, Calculator |
| `finance-calculator.js` | Calculator logic, APR handler, formatter utilities | VDP, Calculator, Blog (embed) |
| `vdp.js` | Vehicle-specific: gallery, WhatsApp, location info, EV charge, similar cars, removed handler | VDP only |
| `get-started.js` | URL param parser, radio styler, title updater | Get Started only |
| `faq-schema.js` | JSON-LD FAQ schema generator | Finance, Part Exchange, Value Car |
| `srp.js` | Finsweet list hooks, results counter, 404 redirect | Used Cars only |

---

## Benefits

### For Carsa
- **Faster page loads.** Deduplicated code means less JavaScript for browsers to parse. The VDP alone drops from ~45KB of inline scripts to loading only what it needs from cached CDN modules.
- **Safer updates.** Every change is tracked in Git. If something breaks, we can see exactly what changed and roll back in minutes — not hours of debugging in Webflow.
- **One place to look.** All custom code is visible in a single GitHub repository. No more hunting through Page Settings page by page.
- **Easier collaboration.** Multiple developers can work on different parts of the code without overwriting each other's work.
- **Testable.** We can run automated checks before deploying to catch bugs before they reach customers.

### For Development
- **Single source of truth.** Change the UTM tracking logic once, it updates everywhere.
- **Code review.** Changes can be reviewed before going live.
- **Local development.** Test changes on localhost before pushing to production.
- **Progressive rollout.** Pin Webflow to a known-good commit hash. Deploy new code only when ready.

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Temporary breakage during migration** | Medium | Medium | Migrate page by page, test each before moving to the next. Keep old inline code as fallback until verified. |
| **CDN downtime** (jsDelivr) | Very low | High | jsDelivr has 99.9%+ uptime and multi-CDN failover. We can add a fallback CDN URL if needed. |
| **CMS template scripts with dynamic values** | Medium | Medium | VDP scripts currently use Webflow CMS template tokens (e.g., VRM, make, model injected server-side). These need to be passed via `data-*` attributes on DOM elements instead of inline script variables. Requires Webflow Designer changes. |
| **Third-party script conflicts** | Low | Medium | VWO, Calltracks, and GTM remain in Webflow (they need to load before our code). Only custom Carsa code moves to GitHub. |

---

## Timeline & Pricing

The work is split into 4 phases. Each phase completes before the next begins, so there's a clear checkpoint at each stage.

### Phase 1 — Setup & Import (capture all existing code)

Extract all custom code from every Webflow page and save it into individual files in the GitHub repo — one file per page. Create the repo structure, `init.js` loader with route-based module loading, CDN pipeline, and local dev environment. Document which scripts run on which pages (route map).

**Checkpoint:** Every page's code is captured in GitHub. Nothing has changed on the live site.

### Phase 2 — Automated Test Coverage (safety net before refactoring)

Build regression tests against the **existing** code so we can verify nothing breaks during refactoring. Tests run against the live site and check that each page's functionality works as expected — console errors, key DOM elements, form submissions, filter interactions, CMS data rendering.

**Checkpoint:** Full test suite running green against the live site. This is our safety net for Phase 3.

### Phase 3 — Refactor into Modules

Refactor all code into clean, deduplicated ES2022+ modules (see module structure above). Remove jQuery dependency. Run the test suite after each module to confirm nothing broke.

**Checkpoint:** All modules built, tests passing against localhost. Ready to deploy page by page.

### Phase 4 — Page-by-Page Replacement

Replace each page's inline Webflow code with the new GitHub-hosted modules. Each page is updated in Webflow Designer, then tested before moving to the next.

#### Page count by complexity

| Complexity | Pages | Count |
|-----------|-------|-------|
| **Complex** | VDP, SRP, Deals | 3 |
| **Medium** | Homepage, FAQ Index, Finance Calculator, Get Started, Models Template, Postcodes Template | 6 |
| **Low** | Part Exchange, Value Car, Car Finance, All Models, Blog Post, Makes Template, Fuel Types Template | 7 |
| **Easy** | Contact, Stores, Blog Index, About (×3), Car Care (×8), Payments (×2), 404, + 7 CMS templates (global only) | 24 |
| **Total** | | **40** |

*Note: 4 CMS collections (Testimonials, Features, Car Badges, Facilities) are reference-only — no public template pages.*

#### Time per page (including testing)

| Complexity | Per page | What's involved |
|-----------|---------|-----------------|
| **Complex** | 30 min | Add `data-*` attributes for CMS tokens in Webflow Designer, remove all inline scripts from Page Settings, verify all interactions work (forms, filters, finance calc), run automated tests, manual spot check. |
| **Medium** | 15 min | Remove inline scripts from Page Settings, verify key interactions, run automated tests. Some may need `data-*` attributes for CMS tokens. |
| **Low** | 10 min | Remove inline scripts from Page Settings, run automated tests, quick visual check. |
| **Easy** | 2 min | No per-page code to remove — just verify global modules load correctly. Batch-tested (one test covers all). |

| Complexity | Count | Per page | Total time |
|-----------|-------|----------|------------|
| Complex | 3 | 30 min | 1.5 hours |
| Medium | 6 | 15 min | 1.5 hours |
| Low | 7 | 10 min | 1.15 hours |
| Easy | 24 | 2 min | 0.8 hours |
| Final regression run + cross-browser (Chrome, Safari, mobile) | — | — | 1 hour |
| **Phase 4 total** | **40** | | **6 hours** |

**Checkpoint:** All pages live on the new system. Old inline code fully removed from Webflow.

---

### Total

| Phase | What | Time | Cost |
|-------|------|------|------|
| 1. Setup & Import | Capture all existing code into GitHub | 1 hour | £100 |
| 2. Test Coverage | Build regression tests as safety net | 1 hour | £100 |
| 3. Refactor | Build clean ES2022+ modules, deduplicate, remove jQuery | 2 hours | £200 |
| 4. Page Replacement | Update each page in Webflow, verify, go live | 6 hours | £600 |
| **Total** | | **10 hours** | **£1,000** |

---

### What's Included
- Full migration of all custom Carsa code to GitHub (all 45 pages/templates)
- Refactor to modern vanilla JavaScript (ES2022+, no jQuery dependency)
- Deduplication of all shared logic (UTM tracking, URL builders, animations)
- Route-based `init.js` loader — zero per-page code in Webflow after migration
- `prefers-reduced-motion` support on all animations
- **Full automated regression test suite** covering all pages — runs before and after every future change
- CMS template updates in Webflow Designer (data attributes)

### What's Not Included
- VWO, GTM, GA4, Calltracks, Mixpanel — these third-party scripts stay in Webflow Site Settings (they need to load before our code and are managed by Carsa's marketing/analytics team)
- Trustpilot widget — stays as Webflow embed
- Any new feature development — this is migration/refactor of existing code only

### Ongoing Maintenance (Optional)
After migration, we can run an automated code review and refactor once a month — checking for unused code, dependency updates, performance regressions, and test suite health.

| Option | What | Cost/month |
|--------|------|------------|
| Monthly review & refactor | 1 hour: automated regression run, code audit, dependency check, minor refactoring | £100 |

---

## Recommendation

This is a straightforward win. The migration:
- Cuts ~30% of JavaScript weight (jQuery removal + deduplication)
- Eliminates the "find and edit 4 copies" problem — change code once, it updates everywhere
- Gives full version history and rollback capability
- Makes the codebase testable and reviewable — automated regression tests catch bugs before they reach customers
- Removes all custom code from Webflow Page Settings — just one script tag in Site Settings

The investment pays for itself within 2-3 update cycles, since every future change goes from "hunt through Webflow pages" to "edit one file, push, done."

---

## Next Steps

1. Tomek reviews and confirms
2. Work can start immediately
3. Each phase completes before the next begins — clear checkpoints at every stage
4. Estimated 1-2 weeks elapsed to complete
