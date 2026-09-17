# Carsa code migration — Phase 0 report (16 Sep 2026)

**Spec:** `specs/carsa-code-migration.md` · **Branch:** `worktree-carsa-migration-phase-0` · **Site changes made:** none (read-only MCP calls only)

## What was done

| Task | Result | Where |
|---|---|---|
| 0.1 Re-capture | Site head/footer + all 90 pages pulled via Webflow MCP. 128 non-empty blocks saved; 42 empty. Registered scripts and applied page scripts recorded. | `rollback/2026-09-16/` (`parse-capture.py`, `extract-site-code.py`, `pages-list.json`) |
| 0.2 Diff vs 7 Jul | 76 identical · 17 changed · 12 new · 0 gone. All 17 changes are real behaviour changes. | `rollback/2026-09-16/diff-vs-july.md`, `diffs/`, `diff-summary.md` |
| 0.3 Prune | 59 pages in scope, 31 dropped. **Needs your confirmation** — list below. | this file |
| 0.4 Repo file audit | 5 current, 2 stale, 4 unused, 1 empty, 1 hosted live (`battery-animation.js` @main). | `reports/code-migration-repo-file-audit-2026-09-16.md` |
| 0.5 Routes | Confirmed against live sitemap (5,527 URLs). Route map in the spec is correct; `/used-cars/models/*` (460), `/used-cars/make/*` (48), `/used-cars/near/*` (39), `/used-cars/fuel/*` (7), `/used-cars/promotions/*` (3), `/sell-car/store/*` (10), `/stores/*` (13), `/blog/*` (107), `/terms/*` (12), `/vehicles/used/*` (4,799). | `rollback/2026-09-16/sitemap-live.xml` |
| 0.6 Tests | 5 spec files, **206 tests** (was 40). Granular for finance, attribution and lead forms; one presence check per animation. Full script inventory written. | `tests/acceptance/carsa-code-migration*.spec.js`, `helpers/carsa.js`, `reports/code-migration-script-inventory-2026-09-16.md` |
| 0.7 Run on live | **Green.** 211 tests: 188 pass, 21 skipped (Phase 1 loader guards, gated on `CARSA_PHASE1=1`), 2 expected failures (live bugs, see below). Three runs on 16 Sep; the first surfaced 48 failures that resolved to selector drift, a widget rebuild and the live findings below. | `npm run test:sz:acceptance -- carsa-code-migration` |
| 0.8 Registry + staging | Registered (4 new entries, 1 updated). **Staging run done** (`STAGING_URL_CARSA=https://carsa-v2.webflow.io`): same shape as live — 186 pass, 21 gated, 2 expected failures; no staging-only differences beyond the Webflow runtime error below being consistent rather than intermittent. | `tests/registry.json` |

## Three findings that change the plan

1. **The search pages are no longer Webflow custom code.** `/used-cars`, `/used-cars/deals`, and the make and model templates now run Carsa's own widget (`d2zblaqlrfk95e.cloudfront.net/carsa-search.js`, ticket CARSA-5852). Page settings keep only the 404 toast, the check-finance hover and the valuation builder. The spec's `srp.js`/`deals.js`/`makes.js`/`models.js` modules shrink to those three blocks, and the Finsweet filter tests in the old spec were testing code that no longer exists. `/used-cars/near/*` and `/used-cars/fuel/*` still use Finsweet.
2. **The finance calculator was rewired since July.** Both the VDP and `/car-finance-calculator` now fetch APR, term, mileage and deposit from `consumer-finance.carsanet.co.uk/finance-config` (3 s timeout, in-page fallbacks: 10.9 % / 8.9 % / 16.9 %, £2,500 deposit, 48 months). The VDP also honours a CMS `deposit-contribution` field. `vdp.js` in the repo is stale on exactly this section and must be re-extracted, not migrated.
3. **Some live code is in-canvas embeds the API cannot read.** Found by comparing the captures with the live HTML: the WhatsApp nav link (every page), the VDP footer WhatsApp link, the VDP "car-info" location sentence, the VDP cold-banner Swiper loader, the reservation widget on `/reserve`, and the `carsa-search.js` executing tag. These stay in Webflow whatever we do; the migration scope is page-settings code only. Captured for the baseline in `rollback/2026-09-16/embeds/` (cold banner supplied by Will in full; the rest lifted from the live HTML).

## Prune list (0.3) — please confirm

**Keep (59):** every non-draft page outside `/development/` and `/archive/`. That is the 20 CMS templates, the 31 static pages in the sitemap, plus 8 live pages not in the sitemap (all return 200): `/get-started`, `/about/tiktok`, `/car-redirect`, `/payments/payment-success`, `/payments/payment-failure`, `/mot-and-car-servicing`, `/mot-and-car-servicing/store-locator`, `/404`.

**Drop (31):** 26 drafts (`sell-car` — 301s to value-car, `vehicle-search-results-backup-31-03-2026`, `home-04-03-2026-pre-sell-car`, `sell-car-test-landing-page`, `home---sell-car-update`, `chatbot-test`, the four `vehicle-search-results---*` variants, `home-v1-pre-autumn-deals`, `home-autumn-deals`, `vdp-cold-banner`, `selected-results`, `components-page`, `testing-calltracks`, `wishlist`, `landing-page-example`, `part-exchange-3`, `style-guide`, `old-home`, two `static-template-slug-*`), plus 5 live-but-dev pages (`500-component-test`, `component-page`, `car-preparation-v2`, `impel-test`, `eligibility-hero-mcp-test`, `search-demo`, `our-team`) and `/ai-search` (401, password-protected).

Of the kept pages, 10 carry no custom code at all (`ai-search` aside): `mot-and-car-servicing` and the `detail_blog-category`, `car-badges`, `facilities`, `faq`, `faq-categories`, `features`, `regions`, `testimonials` templates.

## Drift since July (0.2)

Material: site head (body-colour guard), site footer (menu model-link rewrite removed), part-exchange and value-car (canonicals moved under `/sell-car/`), store template (OG image removed), used-cars / deals / make / models (Finsweet → VSRP widget), VDP (finance config, APR paint, cold banner moved to embed, contribution field), car-finance-calculator (finance config). Conversion-link scripts (check-finance, valuation, PX, attribution saver, hidden fields, GTM) are token-identical to July everywhere they survive. Full detail in `diff-summary.md`.

## Scripts I am not sure about — your call

1. **Near template `[data-button="search-locations"]` is dead code.** The line defining `filtered` is commented out, so the block throws `ReferenceError: filtered is not defined` on every `/used-cars/near/*` load and the button never gets its href. Fix, or migrate as-is? (Test written as an expected failure; the error is allow-listed in `KNOWN_ERRORS`.) - remove
2. **VDP "car-info" embed renders "in our  store."** when the CMS location is empty (seen on `a26eta`). In-canvas, not custom code. 
3. **VDP radio CTA calls `svg.__svgDrawPlay`** but the VDP's draw-line variant never defines it, so the squiggle-on-select never plays. Intentional? - not intentional, can we fix?
4. **Duplicate VWO SmartCode** on `/about/careers` and `/development/our-team` heads (same account as site head). Delete on migration? And is VWO still in use — it hides `body` for up to 2 s on every page. what is vwo? definitely dedupe at a minimum — **17 Sep: Will decided to remove VWO entirely for now** (site head + the duplicate on `/about/careers`). It is on every page and hides `body` for up to 2 s. To be done as a Phase 1 site-head edit with Will's go-ahead; rollback copy is `rollback/2026-09-16/site-head.html`.
5. **Finsweet Consent gating.** The noopener fix, the copyright year and Jetboost are `type="fs-consent"`; no Consent loader is in any capture, so it must be an embed or GTM. If Consent isn't installed those never run. Which is it? - remove type="fs-consent" from them. we'll bundle all of these into the site script which will be necessary for users for functionality
6. **`/car-finance-calculator` quotes a hard-coded demo car** (`MD74ZHJ`, 7,617 miles, reg 2025-01-22) and leaves ~15 `console.log` calls live. Intentional? - vrm is intentional. it's being used as an example car for the calculator. console.log calls not sure but should be the same on vdp? if yes then intentional. instinct is to not try to fix this yet for fear of breaking it and maybe get to it in the refactor
7. **VDP `requestUuid` is a fixed literal** on every `/quote`; the calculator page generates a random one. Does consumer-finance care? don't thing so but flag for later review
8. **Two attribution models coexist**: check-finance, valuation and homepage PX prefer last-touch (`attribution_session`); the footer eligibility rewrite, all VDP link builders, get-started and the hidden-field injector use first-touch (`attribution`) only. Intended (last-touch for card CTAs, first-touch for checkout CTAs) or drift to unify? - keep as is but flag for review when rwe refactor
9. **Broken canonicals** (not migration, but seen in passing): `/used-cars/models` canonicalises to `https://www.carsa.co.uk/all-models` (not a live path); `500-deposit-on-us` has a line break and the wrong `/car-care/` path; `store-locator`, `servicing-locations`, `drive-away-car-insurance`, `gender-pay-gap-report-april-25`, `car-finance-calculator`, `detail_promotions` lack `https://`. Fix during migration or preserve byte-for-byte? - create notion task with /triage to fix separately — **created 17 Sep:** [Fix broken canonical tags on 8 Carsa pages](https://app.notion.com/p/3dee1848bb51819a884de0be02ecff0e) (P2, Doer Claude)
10. **`finance-config` failure logs to `window.DD_LOGS`** — no Datadog loader in custom code. Via GTM, or dead? dead i think
11. **Fuel template loads `@finsweet/attributes@2` twice** (`fs-list` and `fs-toc`). v2 supports both on one tag. - i fixed this
12. **`homepage.js` in the repo is the archived homepage**, not the live one (live home replaced the make/model block with an older fork of `make-model-redirect` v2 and dropped the price-tab and search-button scripts). Re-extract from `home-body.html`. - yes
13. **Out of scope confirm:** Impel (`impel-test`, dev only), Acuity (repo only, never pasted), Calltracks (archive page, no code), Slack — none appear in live custom code. - correct
14. **Duplicate `#px-form-small` ids on the VDP** (details quote form and the hero PX form). jQuery only binds the first. - flag for review in refactor. it currently works fine

## Found by the live run (16 Sep) — dead or broken blocks

All characterised in the suite (`*-block-dead` tests, `test.fail` for the two bugs). Each is a block that can be dropped rather than migrated, or a bug to fix in `global.js`:

| # | Block | Page(s) | What the run showed | Suggest |
|---|---|---|---|---|
| A | noopener / noreferrer fix | site footer | `type="fs-consent"` → Finsweet Consent executes it after `DOMContentLoaded`, so its listener never fires. WhatsApp, Facebook, TikTok, LinkedIn, Instagram, YouTube links ship with `rel=""`. | Fix in `global.js` (run immediately, no listener) — matches your fs-consent decision |
| B | Copyright year | site footer | Throws `Cannot set properties of null (setting 'innerText')` on pages with no `#year` (`/get-started`, `/payments/*`). | Null-guard in `global.js` |
| C | Make/model redirect v2 | homepage | No `select[name=make]` or `.model-data` on the live home; the search is a plain Webflow form. Block never binds. | Drop from `homepage.js` |
| D | PX link builder | homepage | No `px-vrm` input; the hero form is the valuation form. | Drop from `homepage.js` |
| E | "Move View all" | `/faq` | Neither `#category-list` nor `#view-all` exists (both exist on `/blog`). | Drop from `faq-index.js` |
| F | FAQ schema (mini) | `/reserve` | No `#section-faq` or `[data-faq-question]`; nothing injected. | Drop from reserve module |
| G | 404 redirect toast | `/used-cars`, `/used-cars/deals` | Split in half: the script is only on `/used-cars` (where `#redirect-message` no longer exists) and the element is only on `/used-cars/deals` (where the script was never pasted). The VDP-404 → `/used-cars` redirect works but the message never shows anywhere. | Put element and script on the same page, or drop both |
| H | Search-locations link | near template | Already on your list (remove). The target button doesn't exist either. | Remove |
| I | `carsa-search` widget cards | `/used-cars`, deals | 50 `check-finance` hooks rendered, 25 visible; the hover swap still works on them. Not a bug — confirms the hover block must survive on widget pages. | Keep |

Not ours: `Cannot read properties of undefined (reading 'length')` (intermittent on live, consistent on staging for `/car-finance`, the near template and the VDP) comes from Webflow's own runtime chunk (`webflow.achunk.58f76f29….js` → `webflow.achunk.36b8fb49….js`), not from custom code. Allow-listed in `KNOWN_ERRORS` so it cannot mask a migration regression by accident; worth a note to Tomek as a Webflow interactions issue.

## Live dependencies to clear before Phase 1

- `battery-animation.js` from `studiozissou/webflow-scripts@main` on every VDP — unpinned (spec D7). - include in scripts in PR
- `CarsaAtPriceTotal` registered script v1.1.0 from `webflow-scripts@efbb516…` on the VDP template — SHA-pinned but still on our repo via jsDelivr. - include in scripts in PR
- `carsa-search.js/.css` (CloudFront, unversioned), Finsweet Attributes v2 on 34 pages (major-pinned), n8n chat (unpinned `@n8n/chat`), Jetboost on 5 store pages (unversioned). let's include these but i don't own cloudfront or n8n so not sure what to do about them. they are added by carsa dev team

## Test suite (0.6)

| Spec | Tests | Covers |
|---|---|---|
| `carsa-code-migration.spec.js` | 37 | Homepage, Phase 1 loader guards (will fail until Phase 1 ships — pre-existing), VSRP-widget search pages, 404 toast, per-page generic guards |
| `carsa-code-migration-global.spec.js` | 26 | Attribution first/last-touch semantics (7 tests), eligibility link decoration, promo links, store list, noopener, year, WhatsApp, menu lock, chat (3), GTM, site schema |
| `carsa-code-migration-finance.spec.js` | 29 | VDP calculator (16) and calculator page (13): config once, defaults, full `/quote` payload, every HP/PCP output id, static outputs, PCP error → HP tab, deposit debounce + formatting, term/APR change, APR labels, Enter suppression, config-failure fallback, contribution lock, live API smoke |
| `carsa-code-migration-leads.spec.js` | 32 | Check-finance hover/mouse-out/click fallback/session-beats-local, valuation (4 pages + Enter popup + empty), PX (home, VDP, submit popup), VDP CTAs (default, postcode, reserve-collect), VDP link decoration, get-started (prefill, 3 options, storage, stored-beats-url, no vrm), hidden fields (seeded + URL fallback), contact |
| `carsa-code-migration-pages.spec.js` | 82 | FAQ (3), blog, models index, models/make templates (SEO, FAQ scrub, widget), fuel, near (8 incl. 1 expected failure), promotions, Jetboost (3), blog post, reserve (2), 404 redirect, car-redirect, animations (5), health sweep over 39 static pages + 10 templates |

Finance tests mock `consumer-finance.carsanet.co.uk` with `page.route` so numbers are deterministic; one real-API smoke test per calculator stays live. `KNOWN_ERRORS` in the helper allow-lists the near-template bug only.

**Note:** the repo is `"type": "module"`, so the July `carsa-code-migration.spec.js` (CommonJS `require`) could never have run. All five specs now use `import`. Final count after the live run: 211 tests (main 36 / global 26 / finance 29 / leads 34 / pages 86).

## Next

1. You: confirm the prune list and answer the "not sure" items that affect tests (1, 5, 6, 8).
2. You: OK a Playwright run → `npm run test:sz:acceptance -- carsa-code-migration` against live, then fix selectors until green (0.7), then once against staging with `STAGING_URL_CARSA=https://carsa-v2.webflow.io` (0.8).
3. Still open before Phase 1: D12 (who merges and deploys in `focalstrategy/carsa-website-support`).
