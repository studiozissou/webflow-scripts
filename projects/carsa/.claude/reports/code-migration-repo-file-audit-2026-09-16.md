# Carsa repo JS vs live inline code — audit, 16 Sep 2026

Source of truth for "live": `projects/carsa/.claude/rollback/2026-09-16/` (site-head.html, site-footer.html, `{label}-head.html`, `{label}-body.html`), captured via the Webflow MCP on 16 Sep 2026. Page draft/archive status comes from `pages-list.json` in the same folder.

Comparison method: each repo file was read in full, then matched to inline `<script>` blocks by distinctive identifiers (module headers, selectors, URLs) and diffed with whitespace collapsed. "Exact" below means byte-identical after whitespace normalisation.

## Classification table

| Repo file | Class | Lives inline on (live pages unless noted) | Last touched (git) | Summary |
|---|---|---|---|---|
| `acuity-embed.js` | **UNUSED** | nothing (no `data-acuity-embed`, no `acuityscheduling` anywhere) | b72f30c 2026-08-11 | Built for the servicing-location template; never pasted in. |
| `at-price-total.js` | **UNUSED** | nothing (no `.autotrader_price-info`, `[data-price=…]`, `CarsaAtPriceTotal`) | efbb516 2026-09-15 | Written yesterday; not yet deployed to the VDP. |
| `battery-animation.js` | **HOSTED-LIVE** | detail_used body, via `<script src>` | 1a9c306 2026-06-08 | Loaded from `cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@main/projects/carsa/battery-animation.js`. Pinned to **@main**, not a SHA. No inline duplicate exists. |
| `check-finance.js` | **CURRENT** | used-cars, deals, detail_make, detail_models, detail_used, detail_near, detail_fuel, detail_promotions, detail_store, detail_servicing-locations, detail_stores, reserve, car-finance-calculator (13 pages) | b186025 2026-04-02 | Functionally identical everywhere. Only differences are the repo's 3-line module header, a Prettier reformat on 4 pages, and a comment on the VDP copy. |
| `faq-scrub.js` | **CURRENT** | detail_models body | 5436953 2026-07-14 | Identical bar one extra pair of parentheses added by Prettier. Header says "/make/ and /models/" but it is only on the models template; detail_make does not carry it. |
| `filter-submit-fix.js` | **CURRENT** | detail_near head | 5436953 2026-07-14 | Exact match, including the HTML comment banner. (Repo file is an HTML fragment, not a bare JS module.) |
| `global.js` | **EMPTY** | — | deda17a 2026-02-23 | Zero bytes. |
| `homepage.js` | **STALE** | Byte-identical to `old-home` and `home-04-03-2026-pre-sell-car` bodies, both **drafts** under `/archive/`. Live `home` body has diverged. | deda17a 2026-02-23 | See notes: live home dropped 3 of its 8 blocks and replaced the make/model script. |
| `make-model-redirect.js` | **CURRENT** (with a live fork) | detail_near body: **exact**. `home` body carries an **older, reduced v2** of the same module. | 6aa4fe7 2026-05-04 | Two different "v2" builds are live. The home copy lacks the same-page guards, prefill, facet hiding and filter-change prefetch. Details below. |
| `make-model.js` | **UNUSED** | nothing (no `.is-make-model`, no `fs-list-element="empty"` injection anywhere) | 0a7fc42 2026-05-04 | Abandoned empty-state helper for make/model templates. |
| `make-model.old.js` | **CURRENT (legacy, dev/draft pages only)** | search-demo body (live, `/development/search-demo`): exact. Also exact on 4 **draft** SRP pages. selected-results (draft) has a variant reading `e11aebe3_make_equal` instead of `cars_make_equal`. | 0a7fc42 2026-05-04 | Not on any production URL. Production `/used-cars` uses the CloudFront search widget, not Finsweet. |
| `menu-scroll-lock.js` | **CURRENT** | site-footer (site-wide) | c721b9d 2026-05-07 | Identical; repo has two extra doc-comment lines about Android Chrome sticky nav. |
| `near-location-redirect.js` | **CURRENT** | detail_near body | 5436953 2026-07-14 | Exact match. (Repo file is an HTML fragment wrapped in `<script>`.) |
| `vdp.js` | **STALE** (and never deployed) | Counterpart is detail_used body. No `window.__CARSA_VDP` config block and no `vdp.js` script tag exists anywhere in the captures. | c019ae0 2026-06-25 | 13 of 17 sections still match. Finance calculator (§3) and APR updater (§4) have been rewritten live; cold-banner carousel (§16) has been removed live; battery (§17) is now CDN-loaded. Details below. |

## Per-file notes

### acuity-embed.js — UNUSED
Looks for `[data-acuity-embed][data-calendar-id]` and injects an Acuity iframe for owner 33396621. Neither the selector, the owner ID nor the word "acuity" appears in any capture, including `detail_servicing-locations` where it was meant to go. Safe to treat as a pending feature, not a migration target.

### at-price-total.js — UNUSED
Targets `.autotrader_price-info` with `[data-price="at-saving"|"carsa-price"|"at-value"|"at-price"]` on the VDP. Nothing in `detail_used-body.html` references any of those. Committed 15 Sep; deployment is still outstanding.

### battery-animation.js — HOSTED-LIVE
`detail_used-body.html` line 1247:
```html
<script src="https://cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@main/projects/carsa/battery-animation.js"></script>
```
This is the **only** repo file served to the live site. It is pinned to `@main`, so any push to main changes production immediately (jsDelivr caches `@main` for up to 12 h, so changes also land unpredictably). The repo file is the same code as the inline copy that vdp.js §17 still carries. Recommend switching to a SHA or tag pin during phase 1.

### check-finance.js — CURRENT
Thirteen inline copies, all functionally identical to the repo. Differences are cosmetic only:
- Repo adds a 3-line `// Module: check-finance` header.
- used-cars, detail_models, detail_near and detail_used copies have been run through Prettier (drops redundant parentheses around `ss.utms && … ? … : ls.utms || {}`; semantics unchanged because `?:` binds looser than `||`).
- detail_used copy drops the `/* invalid referrer URL */` comment and rewords a hover comment.
Good candidate for a single hosted file replacing 13 pastes.

### faq-scrub.js — CURRENT
One inline copy on `detail_models`. Only change is Prettier adding parentheses: `((item.acceptedAnswer && item.acceptedAnswer.text) || '')`. Same evaluation order. Note the file header claims `/make/` coverage but `detail_make-body.html` does not include it; there is no FAQPage JSON-LD on the make template in this capture either, so nothing is broken.

### filter-submit-fix.js — CURRENT
Exact match with the block in `detail_near-head.html`. Only present on the /near/ template; the other Finsweet SRP variants (search-demo, drafts) do not carry it. The repo file includes the `<!-- -->` banner and `<script>` wrapper, so it cannot be loaded as-is from a CDN without stripping the HTML.

### global.js — EMPTY
Zero bytes, unchanged since the initial import in February.

### homepage.js — STALE
The repo file is byte-identical to the archived draft pages `old-home` and `home-04-03-2026-pre-sell-car` (both `draft: true`, published under `/archive/`). The live home page (`home-body.html`) has moved on:

| Block | homepage.js (repo / archived drafts) | Live home body |
|---|---|---|
| Make/Model selection | Old jQuery version: `[name="cars_make_equal"]`/`[name="cars_model_equal"]`, "Any make"/"Any model" labels, uses first list instance, no redirects | make-model-redirect v2 (reduced variant, see below): `[name="make"]`/`[name="model"]`, "Any" labels, finds `instance === 'models'`, redirects to `/used-cars/make/{slug}` and `/used-cars/models/{slug}` |
| "Show search button while form is loading" (`#search-instant` / `#search-submit` MutationObserver) | present | **removed**; replaced by CSS `#search-submit:disabled { display:none }` in home-head |
| "Clear non-relevant field on price tab change" (`#price-monthly-tab`, `#price-full-tab`) | present | **removed** |
| PX form link builder | present | present, identical |
| Equal-height cards | jQuery, runs on `load resize` only | vanilla, runs on `resize` **and** a `MutationObserver` on `document.body` (re-equalises after Finsweet renders) |
| Draw-line SVG | present | present, identical |
| Draw-shape SVG | present | present, identical |
| Instant valuation form | present | present, identical |

Recommendation: retire `homepage.js` and re-extract from `home-body.html`.

### make-model-redirect.js — CURRENT on /near/, older fork on home
The repo file is an **exact** match for the block in `detail_near-body.html`. The block in `home-body.html` also calls itself "make-model-redirect v2" but is an earlier cut. Differences between the repo/near version and the live home version:

- **Mobile submit fallback**: repo falls back to `pendingRedirectURL` when `computeRedirectURL()` returns null; home does not.
- **Filter-change prefetch**: repo re-computes and prefetches on any `[fs-list-field]` change on mobile (300 ms debounce, skipping make/model); home has no such handler.
- **Same-page guards in `computeRedirectURL`**: repo returns null when the chosen make/model matches the current page slug and, on make/model pages with "Any" selected, redirects to `/used-cars` carrying the other filters; home always builds a redirect and returns null for "Any".
- **Prefill from page context**: repo pre-selects the make (and model) from the URL slug on make/model pages; home does not prefill.
- **Facet count visibility**: repo hides `.facet-wrapper` when the selected make/model differs from the page's own; home does not.
- **Make change handler**: repo dispatches native `input` + `change` events on the model select and, on mobile model pages, strips `cars_model_equal` from the URL via `history.replaceState` when a different make is chosen; home only calls `.trigger('input')`.
- **"Any" on desktop make/model pages**: repo redirects to `/used-cars` preserving other filters; home hard-navigates to `/used-cars` and drops them.
- **Current-page make lookup on model pages**: repo falls back to CMS `.model-data` when `cars_make_equal` is absent from the URL; home only reads the URL param.
- **Model change on desktop make page**: repo filters in place (no redirect); home redirects to the model page.

Since the home page is `type: 'other'` in `getPageContext()`, most of the missing branches never fire there, so the home fork is not obviously broken. But it is a second copy to maintain. Treat `detail_near` as canonical and migrate home to the same file.

### make-model.js — UNUSED
Injects a Finsweet `fs-list-element="empty"` placeholder into `#results-list-wrapper` and swaps to `.filters1_empty.is-make-model` on zero results. `is-make-model` appears nowhere in the captures and `#results-list-wrapper` only appears on Finsweet-based SRP pages, none of which carry this script. Abandoned.

### make-model.old.js — CURRENT on dev/draft pages only
Exact match on `search-demo` (`/development/search-demo`, not draft) and on the four draft SRP variants (`vehicle-search-results---attention-grabber-test`, `---highlighted-card`, `---price-promotion`, `-backup-31-03-2026`). The `selected-results` draft carries a fork that reads `e11aebe3_make_equal` / `e11aebe3_model_equal` from the URL instead of `cars_make_equal` / `cars_model_equal`. No production URL uses this file; production `/used-cars`, `/used-cars/deals`, make and model templates load the CloudFront `carsa-search` widget instead. Candidate for deletion once the dev pages are pruned.

### menu-scroll-lock.js — CURRENT
Site-wide, first block of `site-footer.html`. Identical apart from two doc-comment lines the repo adds ("Uses overflow:hidden (not position:fixed) to avoid breaking the sticky navbar positioning on Android Chrome"). Good first candidate to host.

### near-location-redirect.js — CURRENT
Exact match with the block in `detail_near-body.html`. As with filter-submit-fix, the repo file is an HTML fragment (`<!-- -->` + `<script>` wrapper) and needs unwrapping before it can be served as JS.

### vdp.js — STALE, never deployed
The bundle expects Webflow to set `window.__CARSA_VDP` and then load `vdp.js`; neither exists in `detail_used-body.html` or head. The live VDP is still all inline (17 blocks + the battery CDN tag). Section-by-section against the live body:

| § | Section | Status vs live |
|---|---|---|
| 1 | UTM link appender | match |
| 2 | Number formatter | match (live functions are global; repo wraps in IIFE) |
| 3 | Finance calculator | **STALE** (see below) |
| 4 | APR updater | **STALE** (see below) |
| 5 | Get Started link | match |
| 6 | PX form link builder | match |
| 7 | Search similar vehicles | match |
| 8 | Equal-height cards | match |
| 9 | Form UTM hidden fields | match |
| 10 | Make/model count | match |
| 11 | Check-finance | match |
| 12 | Clean schema / removed car | match |
| 13 | SVG draw-line | match (repo's "BUG: missing opening {" comment is wrong; both versions are syntactically fine) |
| 14 | Instant valuation | match |
| 15 | Radio CTA | match (repo adds a null guard on `#cta-postcode`) |
| 16 | Cold banner carousel (Swiper 12) | **REMOVED live**: no `cold-banner`, `section_vdp-cold-banner` or `swiper` anywhere in the captures |
| 17 | Battery animation | **moved to CDN** (`battery-animation.js@main`); if vdp.js were loaded alongside it, both would bind click handlers on the same trigger |

Live also has a **new block the repo lacks**: "Finance config: single source of truth" which defines `window.CARSA_FIN` (default cfg: representativeApr 10.9, aprByTier Excellent 8.9 / VeryGood 10.9 / Good 10.9 / Fair 16.9 / BelowAverage 16.9, defaultTerm 48, defaultAnnualMileage 8000, defaultDepositAmount 2500), fetches `https://consumer-finance.carsanet.co.uk/finance-config` with a 3 s timeout and a 40% APR sanity cap, and exposes `aprFor()`, `depositFor()`, `setRadio()` and `ready`.

§3 Finance calculator, concrete differences (repo → live):
- Deposit default: hardcoded £2,000 → `FIN.depositFor(price)` (£2,500 flat or config `defaultDepositAmount`) **minus** a CMS deposit contribution read from `finance-promotion:deposit-contribution`.
- New DOM: `#deposit-contribution` (made readonly, tabindex -1, not required), `[data-number="customer-deposit"]`, `[data-number="deposit-contribution"]`; `[data-number="deposit"]` now shows the total (customer + contribution) and `[data-number="total-credit"]` is price minus that total.
- API payload `cashDeposit` = customer deposit + contribution.
- Default term: `#48` → `String(cfg.defaultTerm)` (HP still `#60`), set via `FIN.setRadio` so the `checked` attribute and Finsweet `fs-inputactive-class` stay in sync.
- Default mileage: first non-empty option → `cfg.defaultAnnualMileage` (8000) if present, else first non-empty.
- APR: hardcoded tier table → `FIN.aprFor(rating)`.
- Mapping additions: `pcp-fixed-rate` (`pcp.flatRate`, "x.x%"), `hp-fixed-rate` (`hp.flatRate`), `hp-interest-amount` (`hp.totalCharges`).
- First quote: immediate → after `FIN.ready` resolves, presets re-applied, then one call.
- Deposit `input` handler repaints both customer-deposit and total deposit.
- Same hardcoded `requestUuid` remains in both.

§4 APR updater, concrete differences: repo only reacts to `change` on `[data-name="apr"]` with a hardcoded table and writes `[data-number="apr"]`. Live `paintApr()` uses `FIN.aprFor`, runs on load, on `FIN.ready`, on `window.load` and on delegated `change`; preserves a trailing "%" where the element already has one; and additionally rewrites leaf `.is-apr` text nodes matching "Representative APR n.n%".

Recommendation: do not migrate from `vdp.js`. Re-extract from `detail_used-body.html`, keeping the `CARSA_FIN` block, and drop §16.

## Live external dependency list

Every `src=`, stylesheet `href=`, ES-module `import` and dynamically injected `.src` pointing off-site in the 16 Sep captures. "Pinned" describes the version lock in the URL.

### Repo-hosted (cdn.jsdelivr.net/gh/studiozissou)
| URL | Page(s) | Pinned |
|---|---|---|
| `https://cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@main/projects/carsa/battery-animation.js` | detail_used (body) | **@main, not SHA** |

This is the only reference to the repo. No other `studiozissou`, `webflow-scripts`, `vdp.js`, `homepage.js` or `global.js` URL exists in any capture.

### Carsa-hosted CloudFront (search widget)
| URL | Page(s) | Pinned |
|---|---|---|
| `https://d2zblaqlrfk95e.cloudfront.net/carsa-search.js` (as `<link rel="preload" as="script">`; the executing `<script>` tag is not in the freeform code, so it must sit in an on-page Embed element) | used-cars, deals, detail_make, detail_models | unversioned |
| `https://d2zblaqlrfk95e.cloudfront.net/carsa-search.css` (stylesheet) | used-cars, deals, detail_make, detail_models, search-demo | unversioned |
| `https://d2zblaqlrfk95e.cloudfront.net` (preconnect only) | used-cars, deals, detail_make, detail_models | — |
| `https://search.carsa.co.uk` (preconnect only) | used-cars, deals, detail_make, detail_models | — |
| `https://d1kcoelx4vkza6.cloudfront.net`, `https://r.carsa.co.uk/`, `https://assets.dealernetdms.co.uk` (preconnect / dns-prefetch only, VDP image origins) | detail_used (head) | — |
| `https://d3e54v103j8qbb.cloudfront.net` (preconnect; this is Webflow's own asset CDN) | detail_used (head) | — |

### Third-party scripts and styles
| URL | Page(s) | Pinned |
|---|---|---|
| `https://cdn.jsdelivr.net/npm/@finsweet/attributes@2/attributes.js` (`async type="module" fs-list`) | 34 pages: blog, car-finance, car-finance-calculator, detail_blog, detail_fuel (twice, lines 5 and 11), detail_near, detail_promotions, detail_servicing-locations, detail_store, detail_stores, detail_used, faq, home, models, part-exchange, reserve, search-demo, selected-results, sell-car, static-template-slug-1749539540598, store-locator, stores, value-car, plus the draft/archive pages old-home, home-04-03-2026-pre-sell-car, home-autumn-deals, home-v1-pre-autumn-deals, home---sell-car-update, sell-car-test-landing-page and the four vehicle-search-results-* drafts | major only (`@2`, floats minor/patch) |
| `https://cdn.jsdelivr.net/npm/@finsweet/attributes-inputactive@1/inputactive.js` (`defer`) | detail_used, get-started | major only (`@1`) |
| `https://cdn.jsdelivr.net/npm/@n8n/chat/dist/style.css` (stylesheet) and `https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js` (ES import) | site-footer (site-wide); also chatbot-test (draft) | **unpinned, latest** |
| `https://cdn.jetboost.io/jetboost.js` (injected by inline loader, `JETBOOST_SITE_ID cmd4nmdvh00500kwz9p572n6n`) | detail_servicing-locations, detail_store, detail_stores, store-locator, stores (all head) | unversioned |
| `https://www.googletagmanager.com/gtm.js?id=GTM-MM5N6CP8` (injected) | site-head (site-wide) | n/a |
| `https://dev.visualwebsiteoptimizer.com/j.php?a=1130895…` (VWO SmartCode, injected) | site-head (site-wide); duplicated inline on careers and our-team heads | n/a |
| `//integrator.swipetospin.com` | impel-test (`/development/impel-test`) | unversioned |

### Network endpoints called from inline JS (not scripts, listed for completeness)
- `https://consumer-finance.carsanet.co.uk/finance-config` (GET) and `/quote` (POST): detail_used, car-finance-calculator.
- `https://carsa.app.n8n.cloud/webhook/88d110ef-b4ab-4c22-9306-1e492c9f7687/chat`: site-footer chat widget.
- Outbound link targets built at runtime: `quote.carsa.co.uk` (eligibility, build-deal, book, get-px-valuation, value-my-car), `sellcar.carsa.co.uk/new-order`.

## Takeaways for phase 1

1. Only one repo file is live, and it is `@main`-pinned. Pin it to a SHA before anything else is hosted.
2. Six files are directly hostable as-is or after stripping an HTML wrapper: menu-scroll-lock, check-finance, faq-scrub, filter-submit-fix, near-location-redirect, make-model-redirect (use the /near/ version; reconcile home to it).
3. Three files are dead (acuity-embed, make-model, global) and two are pending deployment (at-price-total) or legacy on dev pages only (make-model.old).
4. homepage.js and vdp.js must be re-extracted from the fresh captures, not migrated; the VDP finance calculator in particular has grown a config layer the repo has never seen.
