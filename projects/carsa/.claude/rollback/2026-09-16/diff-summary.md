# Carsa page-settings code drift: 7 Jul 2026 -> 16 Sep 2026

Source: `diffs/*.diff` (17 files). Each diff was read in full, then every `<script>`/`<style>` block was re-compared with whitespace, comments and quote style normalised to separate real behaviour changes from reformatting. July file names differ from September ones (e.g. `srp-body.html` -> `used-cars-body.html`); the September name is used below.

Legend: **BUSINESS-CRITICAL** = touches finance calculator / APR / quote.carsa.co.uk / sellcar.carsa.co.uk / api.carsa.co.uk / UTM-attribution-storage / forms / GTM-dataLayer / prices.

---

## Site-wide

### site-head (`site-head.diff`)
- **Altered: `<!-- Keep this css code to improve the font quality -->` style block.** Adds one CSS rule `html body { color: var(--_primitives---carsa-brand-purple); }` with a comment saying it guards body text colour against embeds that inject their own body rule (Material UI CssBaseline in the VDP carousel). Styling-only, but a real change: increases specificity of the body colour site-wide.
- `<!-- Google Tag Manager -->`, `<!-- SITE-WIDE — JSON-LD Schema -->`, VWO and the "DO NOT EDIT" block are byte-identical. GTM/dataLayer untouched.

### site-footer (`site-footer.diff`)
- **Altered: `<!-- Set links for models and promos in menu -->`.** The `// --- MODELS ---` half was deleted: `a[data-link="model"]` anchors in the menu are no longer rewritten to `/used-cars?cars_sort_dated-added=desc&cars_model_equal=<Model+Name>`. The `// --- PROMOS ---` half (`a[data-link="promo"]` -> `/used-cars/deals?cars_sort_reduced-amount-true=desc&cars_promotion_equal=`) is unchanged. Behaviour change: model links in the nav now keep whatever href Webflow gives them. Consistent with the Finsweet `cars_*_equal` query-param filtering being retired on the SRP (see below).
- All other footer blocks identical, including `<!-- Write UTMs and Referrer to localStorage for 30 days, plus sessionStorage -->` and `<!-- Add UTMs to Finance Eligibility links -->` (attribution storage untouched).

---

## Sell-car pages

### part-exchange head (`part-exchange-head.diff`)
- **Canonical changed** from `https://www.carsa.co.uk/part-exchange` to `https://www.carsa.co.uk/sell-car/part-exchange`. No script changes. SEO-relevant; suggests the page moved under `/sell-car/`.

### value-car head (`value-car-head.diff`)
- **Canonical changed** from `https://www.carsa.co.uk/value-car` to `https://www.carsa.co.uk/sell-car/value-car`. No script changes. Same note as above.

### detail_store head (`detail_store-head.diff`, July name `sell-locations-tpl-head`)
- **Removed: `<!-- Open Graph image for social sharing -->`** (`og:image`, `og:image:width` 1200, `og:image:height` 630 pointing at the "Carsa Facebook post - 1" PNG). Store pages now fall back to Webflow's default OG image. Jetboost, Finsweet and Mapbox popup style blocks identical.

### search-demo head (`search-demo-head.diff`)
- **Added: `<!-- VSRP search widget styles (CARSA-5852) -->`** stylesheet `https://d2zblaqlrfk95e.cloudfront.net/carsa-search.css`. Finsweet Attributes script and `#promo-storage` style are still present here (unlike the live SRP pages). Additive only.

---

## Search results family (VSRP, deals, make, model)

These four pages changed the same way: the Finsweet-Attributes-driven listing was stripped from page settings and replaced by preloads for the new "VSRP search widget" (Jira CARSA-5852). Note the widget script `carsa-search.js` is only **preloaded** in the head; nothing in page settings actually executes it, so it must be loaded from an on-page embed. Worth confirming during migration.

### used-cars head (`used-cars-head.diff`, July `srp-head`)
- **Removed: `<!-- Finsweet Attributes -->`** (`@finsweet/attributes@2` with `fs-list`).
- **Removed:** untitled `<style>#promo-storage{display:none!important}</style>`.
- **Removed (BUSINESS-CRITICAL, forms): `<!-- Block native form submission on Filter Vehicles form -->`.** This IIFE attached a capturing `submit` listener on `#wf-form-Filter-Vehicles` calling `preventDefault` + `stopImmediatePropagation`, and hid `.w-form-done` / `.w-form-fail`. It was the June 2026 fix for Finsweet's CDN update causing filter interactions to be counted as Webflow form submissions. With it gone, if the Finsweet filter form still exists on the page, native submits are no longer blocked.
- **Added: `<!-- Preconnect + preload the VSRP widget's critical origins (CARSA-5852) -->`**: `preconnect` to `https://d2zblaqlrfk95e.cloudfront.net` and `https://search.carsa.co.uk`, `preload as=script` of `.../carsa-search.js`, plus `<link rel=stylesheet>` for `.../carsa-search.css`. Canonical unchanged.

### used-cars body (`used-cars-body.diff`, July `srp-body`)
- **Removed: `<!-- Show loader while list loads -->`** (Finsweet `list` hooks toggling `.loading`, `#results-list-wrapper`, `.facet-wrapper.is-hidden`, `.filters1_item.is-loading` on `[fs-list-field]` input).
- **Removed: `<!-- Make/Model selection -->`** ("make-model-redirect v2" module). Populated `[name="make"]` / `[name="model"]` selects from `.model-data[model-title][make-title][model-slug][make-slug]`, built redirects to `/used-cars/make/{slug}` and `/used-cars/models/{slug}` carrying `cars_make_equal` / `cars_model_equal` plus other query params, prefetched via `link[data-carsa-prefetch]`, handled `#mobile-search-submit`, and used `history.replaceState`. Whole module gone.
- **Removed: `<!-- Insert promo cards -->`** (cloned `#promo-storage [data-element="promo-card"]` into `#results-list` at `data-position` / `data-repeat`, hid trailing `.results_offer-wrapper`). Promo cards are no longer injected from page settings.
- **Removed: `<!-- Hide mobile filters button if list still loading -->`** (polled `#desktop-results` count, then swapped `#mobile-filters-loading-link` for `#mobile-filters-link`).
- **Removed: `<!-- Open/close filters list and accordions on mobile without using Webflow interactions -->`** (`#mobile-filters-link`, `#mobile-search-submit`, `#filters-mobile-close`, `.filters1_filters-wrapper.is-visible`, `.filters1_filter-group-heading` accordion).
- **Removed: `<!-- Trim VRM search of disallowed characters -->`** (`#vrm-search` input sanitiser).
- **Kept, identical:** `<!-- Show toast message if user is redirected from VDP 404 -->` (reads/removes `sessionStorage.from404Used`), `<!-- Update car card link when finance check is hovered/clicked -->` (BUSINESS-CRITICAL, untouched: `[data-link="check-finance"]` -> `https://quote.carsa.co.uk/eligibility/questions?vrm=` with UTMs from `sessionStorage/localStorage` keys `attribution_session` / `attribution`, sets `data-analytics-event="check-finance-car-card-click"`), `<!-- Update and open the link for Instant Valuation form -->` (BUSINESS-CRITICAL, untouched: `[data-link="valuation"]` -> `https://sellcar.carsa.co.uk/new-order?vrm=&mileage=` + attribution params).
- Net: file went from 9 blocks to 3. Only the toast, finance-check and valuation scripts survive.

### deals head (`deals-head.diff`)
- Same pattern as used-cars head: **removed** `<!-- Finsweet Attributes -->`, `#promo-storage` style, and **`<!-- Block native form submission on Filter Vehicles form -->` (BUSINESS-CRITICAL, forms)**. **Added** the CARSA-5852 preconnect/preload/stylesheet block. The `.nav_banner { display:none!important }` rule is kept (now in its own style block).

### deals body (`deals-body.diff`)
- **Removed:** `<!-- Show loader while list loads -->`, `<!-- Make/Model selection -->` (this page had the older jQuery v1 version with `setDropdownsFromURL` reading `cars_make_equal` / `cars_model_equal` and clicking `[fs-list-element="tag-remove"]`), `<!-- Insert promo cards -->`, `<!-- Hide mobile filters button if list still loading -->`, `<!-- Open/close filters list and accordions on mobile ... -->`, `<!-- Trim VRM search of disallowed characters -->`.
- **Kept, identical:** `<!-- Update car card link when finance check is hovered/clicked -->` (quote.carsa.co.uk, BUSINESS-CRITICAL, untouched) and `<!-- Update and open the link for Instant Valuation form -->` (sellcar.carsa.co.uk, BUSINESS-CRITICAL, untouched).
- 8 blocks -> 2.

### detail_make head (`detail_make-head.diff`, July `makes-template-head`)
- **Removed:** `<!-- Finsweet Attributes -->`, `#promo-storage` style, **`<!-- Block native form submission on Filter Vehicles form -->` (BUSINESS-CRITICAL, forms)**.
- **Added:** CARSA-5852 preconnect/preload + `carsa-search.css` stylesheet. Canonical unchanged.

### detail_make body (`detail_make-body.diff`, July `makes-template-body`)
- **Removed:** `<!-- Make/Model selection -->` (v2 module), `<!-- Hide mobile filters button if list still loading -->`, `<!-- Open/close filters list and accordions on mobile ... -->`, `<!-- Trim VRM search of disallowed characters -->`.
- **Removed:** untitled script `/** Make / Model template */` which injected a `[fs-list-element="empty"]` "No vehicles found" element into `#results-list-wrapper` and swapped `.filters1_layout` for `.filters1_empty.is-make-model` on zero-result pages.
- **Removed:** untitled script `/** FAQ Scrub — Carsa /make/ and /models/ pages */` which pruned empty questions from `FAQPage` JSON-LD and removed the `#faq` `mainEntity` ref from `CollectionPage`. SEO-relevant: make pages with empty CMS FAQ fields may now emit invalid FAQPage schema. (This block is still present on the models template.)
- **Reformatted only: `<!-- Update car card link when finance check is hovered/clicked -->`** (BUSINESS-CRITICAL block, but the only differences are indentation and two redundant parentheses around `(ls.utms || {})`; token-level compare shows no logic change).
- **Kept, identical:** `<!-- Update and open the link for Instant Valuation form -->` (sellcar.carsa.co.uk).
- 8 blocks -> 2.

### detail_models head (`detail_models-head.diff`, July `models-template-head`)
- **Removed:** `<!-- Finsweet Attributes -->`, `#promo-storage` style, **`<!-- Block native form submission on Filter Vehicles form -->` (BUSINESS-CRITICAL, forms)**.
- **Added:** CARSA-5852 preconnect/preload + `carsa-search.css`. `<!-- Open Graph image for social sharing -->` meta tags kept. Canonical unchanged.

### detail_models body (`detail_models-body.diff`, July `models-template-body`)
- **Removed:** `<!-- Make/Model selection -->` (v2 module), `<!-- Insert promo cards -->`, `<!-- Hide mobile filters button if list still loading -->`, `<!-- Open/close filters list and accordions on mobile ... -->`, untitled `Make / Model template` empty-state script, `<!-- Trim VRM search of disallowed characters -->`.
- **De-duplicated (BUSINESS-CRITICAL, sellcar.carsa.co.uk): `<!-- Update and open the link for Instant Valuation form -->`.** July had this block **twice** (identical copies); September has one. Both copies bound delegated `click`/`keydown`/`input` handlers on `[data-link="valuation"]`, so July could fire `window.open` twice for non-anchor triggers. Removing the duplicate is a fix, not a regression, but it is a behaviour change.
- **Kept, identical:** `<!-- Update car card link when finance check is hovered/clicked -->` (quote.carsa.co.uk), `<!-- Set description and SEO data if missing -->`, untitled `FAQ Scrub` script.
- 11 blocks -> 4.

---

## Vehicle detail page (VDP)

### detail_used head (`detail_used-head.diff`, July `vdp-template-head`)
- **Removed:** untitled `<style>#cta-default {display: none}</style>`. The element with id `cta-default` is no longer hidden by CSS from page settings. Behaviour change (a CTA becomes visible unless hidden elsewhere); no reference to `cta-default` exists in either July or September body code.
- Preconnect/dns-prefetch links and the Finsweet blocks are identical.

### detail_used body (`detail_used-body.diff`, July `vdp-template-body`) — BUSINESS-CRITICAL
- **Added: `<!-- Finance config: single source of truth, fetched once per page load -->`.** New global `window.CARSA_FIN` with: `cfg` fallbacks (`representativeApr 10.9`, `aprByTier {Excellent 8.9, VeryGood 10.9, Good 10.9, Fair 16.9, BelowAverage 16.9}`, `defaultTerm 48`, `defaultAnnualMileage 8000`, `defaultDepositAmount 2500`); `APPROVED_FLAT_DEPOSIT = 2500`; helpers `depositFor(price)`, `aprFor(rating)`, `setRadio(input)` (also syncs `checked` attribute, `w--redirected-checked` and the Finsweet `fs-inputactive-class` / `is-active` label class); and a `fetch('https://consumer-finance.carsanet.co.uk/finance-config')` merged into `cfg` when `representativeApr` is a number 0..40, raced against a 3 s timeout into `CARSA_FIN.ready`. Fetch failure logs `console.error` and, if `window.DD_LOGS` exists, a Datadog error. **New external dependency and new APR source: `consumer-finance.carsanet.co.uk`.**
- **Altered: `<!-- Finance calculator -->`.** Real logic changes on top of heavy comment stripping:
  - APR by credit rating now comes from `CARSA_FIN.aprFor` (fallback table above). **"very-good"/"good" moved from 11.9% to 10.9%**; excellent 8.9 and fair 16.9 unchanged.
  - **Default deposit moved from £2,000 to £2,500** (`depositFor`), and defaults are re-applied after the config fetch resolves (`FIN.ready.then(applyPresets; callFinanceAPI)`), so the first API call waits for live config instead of firing immediately.
  - **New CMS field `finance-promotion:deposit-contribution`** read into `cmsContribution` (quoted token, defaults 0). Customer deposit field `#finance-deposit` now shows `totalDeposit - contribution`; the quote is made on `cashDeposit + cmsContribution`; new display targets `[data-number="customer-deposit"]`, `[data-number="deposit-contribution"]`, and a new read-only `#deposit-contribution` input (readonly, `required=false`, `tabindex=-1`). `[data-number="deposit"]` and `[data-number="total-credit"]` now use the total deposit.
  - Default term still 60 for HP, otherwise `cfg.defaultTerm` (48) applied via `setRadio` rather than `.checked = true`.
  - Default mileage select `#finance-mileage` now prefers the option equal to `cfg.defaultAnnualMileage` (8000) before falling back to the first non-empty option.
  - Mapping table gains `pcp-fixed-rate` (`pcp.flatRate` as `x.x%`), `hp-fixed-rate` (`hp.flatRate`), `hp-interest-amount` (`hp.totalCharges`). PCP-error -> HP tab switching logic unchanged. The finance API endpoint/payload shape otherwise unchanged (still `cmsPrice`, registration date, VRM).
- **Altered: `<!-- Update APR of finance calculator -->`.** Was a hard-coded `[data-name="apr"]` change handler writing 8.9/11.9/16.9 into `[data-number="apr"]`. Now `paintApr()` reads `CARSA_FIN.aprFor`, preserves a trailing `%` if the element already had one, and additionally rewrites leaf-node `.is-apr` text matching "Representative APR nn.n%". Runs on load, on `FIN.ready`, on `window.load`, and on change. Same 11.9 -> 10.9 shift for very-good/good.
- **Renamed header only:** `<!-- SVG Animations --><!-- Draw lines -->` -> `<!-- SVG Animations: draw lines -->`; GSAP draw-line code token-identical.
- **Comment/whitespace only (verified token-identical):** `<!-- Add UTMs to Build Deal, Book Test Drive, and Eligibility links -->` (quote.carsa.co.uk build-deal/book/eligibility, `localStorage.attribution`), `<!-- Format numbers into currency, decimal places and commas -->`, `<!-- Update Get Started link -->`, `<!-- Update and open the link for PX form -->` (quote.carsa.co.uk/get-px-valuation), `<!-- Search similar vehicles button -->`, `<!-- Set all Car Cards to the height of tallest -->`, `<!-- Add hidden fields to each form to track conversion pages and UTMs-->` (`form[data-form="add-utms"]`), `<!-- Update make/model count on Similar Cars carousel ... -->`, `<!-- Update car card link when finance check is hovered/clicked -->`, `<!-- Clean Schema + Update if Vehicle Removed -->`, `<!-- Update and open the link for Instant Valuation form -->` (sellcar), `<!-- Radio CTA: reserve-collect / reserve-test-drive -->`, `<!-- Battery animation -->`. Attribution and form-tracking logic is unchanged despite the large diff footprint.

---

## Car finance calculator page

### car-finance-calculator body (`car-finance-calculator-body.diff`, July `finance-calc-body`) — BUSINESS-CRITICAL
- **Altered: untitled main `document.addEventListener("DOMContentLoaded", ...)` calculator script.** Mirrors the VDP change but self-contained (no `CARSA_FIN` global):
  - Adds a local `CFG` with the same fallbacks and the same `fetch('https://consumer-finance.carsanet.co.uk/finance-config')` + 3 s race (`cfgReady`), same DD_LOGS error reporting.
  - `aprFor(rating)` now reads `CFG.aprByTier`; **very-good/good 11.9% -> 10.9%**.
  - **Default deposit £2,000 -> £2,500** via `depositDefault()`; `[data-number="deposit"]` now repainted in `updateStaticOutputs`.
  - Replaces the `fixAprLoadMismatch` IIFE and the per-group `is-active` juggling in `wireScopedRadios` with a shared `setRadio()` that also toggles `w--redirected-checked` and the Finsweet active class.
  - `applyDefaults()` now **forces term 48 even when Webflow has 24 checked in the HTML** (previous code only set 48 if nothing was checked), and forces the `very-good` APR radio. Runs once immediately and again after `cfgReady`, and the initial API call now waits for `cfgReady`.
  - Payload `annualMileage` **10000 -> `CFG.defaultAnnualMileage` (8000)**. Vehicle stub (mileage 7617, VRM MD74ZHJ, price from `#finance-car-price`) unchanged.
  - Mapping gains `hp-fixed-rate` (`hp.flatRate`).
  - Leaves the existing `console.log("[Static Outputs] ...")` in place.
- `<!-- Update car card link when finance check is hovered/clicked -->` and `<!-- Set all Car Cards to the height of tallest -->` identical.

---

## Net drift

Every one of the 17 changed files carries at least one functional change; none is whitespace-only. Grouped by page that is 12 pages/areas with material drift: site head, site footer, part-exchange, value-car, store template, search-demo, used-cars, deals, make template, model template, VDP, car-finance-calculator. The seven that matter are the SRP family (4 pages), the VDP, the finance calculator page and the site footer.

Biggest changes, in order of risk:

1. **Finance calculator rewired to a remote config (VDP + car-finance-calculator).** APR, term, mileage and deposit now come from `https://consumer-finance.carsanet.co.uk/finance-config` with in-page fallbacks. Visible number changes even with fallbacks: very-good/good APR 11.9% -> 10.9%, default deposit £2,000 -> £2,500, calculator-page mileage 10,000 -> 8,000, VDP now honours a CMS `deposit-contribution` field and shows customer vs total deposit separately, new `pcp/hp-fixed-rate` and `hp-interest-amount` outputs. The first quote is delayed by up to 3 s waiting for config. Any acceptance test asserting July finance figures will fail.
2. **Finsweet listing retired on used-cars, deals, make and model pages** in favour of the CARSA-5852 VSRP widget (`search.carsa.co.uk`, `d2zblaqlrfk95e.cloudfront.net/carsa-search.{js,css}`). Removed from page settings: Finsweet Attributes loader, loader/skeleton toggling, make/model redirect module (both v1 on deals and v2 elsewhere), promo card injection, mobile filter drawer and accordion, VRM sanitiser, make/model empty-state injection, and the June "Block native form submission on Filter Vehicles form" fix. The widget script itself is only preloaded from page settings, so it must be loaded on-page. The `cars_*_equal` URL contract these pages used is presumably obsolete.
3. **Conversion links untouched.** The quote.carsa.co.uk finance-check hover/click rewriter, the sellcar.carsa.co.uk Instant Valuation builder, the PX valuation link, the UTM/referrer localStorage+sessionStorage writer, the hidden-field form injector and GTM are token-identical to July on every page that still has them (one duplicate Instant Valuation block on the model template was removed).
4. **Smaller behaviour changes:** menu model links no longer rewritten (site footer); FAQ-schema scrub removed from the make template only; `#cta-default` no longer hidden on the VDP; OG image removed from store template; canonicals for part-exchange and value-car moved under `/sell-car/`; site-wide `html body` colour guard added.
