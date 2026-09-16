# Carsa custom-code inventory (capture 2026-09-16)

Source: `projects/carsa/.claude/rollback/2026-09-16/` (site-head.html, site-footer.html, `{label}-head.html`, `{label}-body.html`, pages-list.json). Every capture file for an in-scope page was read in full. Blocks were split at each `<script>`, `<style>`, `<link>` or `<meta>` and hashed (whitespace-normalised) so "identical" claims below are exact, not eyeballed.

**Excluded (draft/dev/archive):** 401 · style-guide · sell-car (draft=true, path /sell-car) · static-template-slug-1749539540598 · static-template-slug-1752833204025 · /development/: 500-component-test, car-preparation-v2, chatbot-test, component-page, eligibility-hero-mcp-test, home---sell-car-update, impel-test, our-team, search-demo, selected-results, sell-car-test-landing-page, vdp-cold-banner, vehicle-search-results---highlighted-card, wishlist · /archive/: components-page, home-04-03-2026-pre-sell-car, home-autumn-deals, home-v1-pre-autumn-deals, landing-page-example, old-home, part-exchange-3, testing-calltracks, vehicle-search-results---attention-grabber-test, vehicle-search-results---price-promotion, vehicle-search-results-backup-31-03-2026.

**In scope with no custom code at all** (no head or body capture exists): ai-search (/ai-search), mot-and-car-servicing (/mot-and-car-servicing), detail_blog-category, detail_car-badges, detail_facilities, detail_faq, detail_faq-categories, detail_features, detail_regions, detail_testimonials.

**Inventoried:** site head + site footer + 50 pages carrying code (+10 above with none).

## Shared block glossary

Because the same code is pasted on many pages, each recurring block gets a short ID here. Per-page tables reference the ID; the full row (hooks, endpoints, storage, deps) is given once in the section where the block first appears and is not repeated.

| ID | Comment header in Webflow | Functionally identical variants (hash) |
|---|---|---|
| DRAW-LINE | `<!-- SVG Animations --> <!-- Draw lines -->` | 8b8fb8ae (35 pages); 380f49b5 on detail_used (same code, one comment differs) |
| DRAW-SHAPE | `<!-- Draw shapes -->` | 148d7d2c (14 pages) |
| CHECK-FINANCE | `<!-- Update car card link when finance check is hovered/clicked -->` | cdc2590a (9 pages), 0445f30d (3 pages, prettier-formatted), 58a461f9 (detail_used, comment tweak). All three identical after whitespace strip. |
| VALUATION-LINK | `<!-- Update and open the link for Instant Valuation form -->` | f0650ded (12 pages); 9a863e27 on detail_used (comment differs only) |
| PX-LINK-HOME | `<!-- Update and open the link for PX form -->` | e12fbe55 (home, detail_fuel) |
| PX-LINK-VDP | `<!-- Update and open the link for PX form -->` | 6c9e5e7a (detail_used only; different URL and attribution logic, see VDP section) |
| EQUAL-HEIGHT-MO | `<!-- Set all Car Cards to the height of tallest -->` (MutationObserver, vanilla) | e789373b (home, car-finance-calculator, reserve); fd369613 detail_used (same code reflowed) |
| EQUAL-HEIGHT-JQ | `<!-- Set all Car Cards to the height of tallest -->` (jQuery load/resize) | 59a722bf (detail_servicing-locations, detail_store, detail_stores) |
| FAQ-SCHEMA-MINI | `<!-- Build FAQ schema -->` | 9745016f (car-finance, reserve, part-exchange, value-car) |
| FAQ-SCHEMA-LIST | `<!-- Build schema for FAQs -->` | 0e7e1a67 (faq only) |
| VIEW-ALL | `<!-- Move View all into category list -->` | c50c0ac8 (blog, faq) |
| FS-ATTR | `<!-- Finsweet Attributes -->` attributes@2 loader with `fs-list` | f7adb67f (18 pages). detail_blog uses `fs-toc fs-socialshare fs-copyclip fs-readtime`; detail_fuel adds a second loader with `fs-toc` |
| FS-INPUTACTIVE | `<!-- [Attributes by Finsweet] Input Active Class -->` inputactive@1 | 91da2dec (get-started, detail_used) |
| JETBOOST | `<!-- Jestboost For Stores Map -->` | f84dd199 (5 store pages) |
| MAPBOX-CSS | `<!-- Remove default styles on Mapbox popup -->` | a6faec5c (5 store pages) |
| VSRP-HEAD | VSRP widget stylesheet + preconnect/preload (CARSA-5852) | used-cars, deals, detail_make, detail_models |
| OG-IMAGE | `<!-- Open Graph image for social sharing -->` 3 meta tags | detail_stores, detail_terms, detail_models (same Facebook post PNG); detail_used uses CMS main-image-link |
| MAKE-MODEL-HOME | `<!-- Make/Model selection -->` make-model-redirect v2 | a082f647 (home) |
| MAKE-MODEL-NEAR | `<!-- Make/Model selection -->` make-model-redirect v2 + prefill/facet logic | 3bdcd530 (detail_near) |

---

## Site-wide head (`site-head.html`)

| # | Block | Type | What it does | DOM hooks | External endpoints / hosts | Storage & globals | Deps | Criticality | CMS tokens |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `<!-- Google Tag Manager -->` | inline JS | Standard GTM bootstrap; injects gtm.js for container GTM-MM5N6CP8. | none | www.googletagmanager.com/gtm.js?id=GTM-MM5N6CP8 | `window.dataLayer` created; pushes `{gtm.start, event:'gtm.js'}` | none | CRITICAL | no |
| 2 | `<!-- SITE-WIDE — JSON-LD Schema -->` | JSON-LD | `@graph` of Organization (#organization: legal name, two ContactPoints +44 330 040 1167 and +44 20 4632 2989 WhatsApp, logo, sameAs TikTok/LinkedIn/Trustpilot, FCA FRN 935130, Companies House 12805624, VAT GB356789439), WebSite (#website), WebPage (#webpage with speakable h1/h2/h3). Description text hard-codes "2,000+ cars" and "from 8.9% APR". | none | none (URLs are data only) | none | none | MEDIUM | no |
| 3 | `<!-- Keep this css code to improve the font quality-->` | CSS | Font smoothing on `*`; `.visually-hidden` utility; `html body { color: var(--_primitives---carsa-brand-purple) }` guard against embeds (MUI CssBaseline in VDP carousel) overriding body colour. | `.visually-hidden`, `html body` | none | none | Webflow variable `--_primitives---carsa-brand-purple` | LOW | no |
| 4 | `<!-- Start VWO Async SmartCode -->` preconnect link | `<link rel=preconnect>` | Preconnect to VWO. | none | dev.visualwebsiteoptimizer.com | none | none | LOW | no |
| 5 | VWO SmartCode `<script id="vwoCode">` | inline JS (third-party) | VWO A/B testing loader, account 1130895, v2.1. Hides `body` with a white overlay `#_vis_opt_path_hides` until settings load or 2000 ms tolerance passes. Skips if URL contains `__vwo_disable__`. | injects `#_vis_opt_path_hides` (`._vis_hide_layer` div or style), reads `#vwoCode` nonce | dev.visualwebsiteoptimizer.com/j.php?a=1130895&u=…&vn=2.1(&x=true); ee.gif error beacon | localStorage `_vwo_1130895_config`, `_vwo_1130895_settings` (or sessionStorage if config says `stT:'session'`); globals `window._vwo_code`, `window._vwo_settings_timer`, `window._vis_opt_url`, `VWO` | none | MEDIUM (third-party, affects first paint site-wide) | no |

## Site-wide footer (`site-footer.html`)

| # | Block | Type | What it does | DOM hooks | External endpoints / hosts | Storage & globals | Deps | Criticality | CMS tokens |
|---|---|---|---|---|---|---|---|---|---|
| 1 | (no header) "Menu Scroll Lock" JSDoc | inline JS (IIFE, no jQuery) | When the Webflow nav button's `aria-expanded` flips to true, sets `body{overflow:hidden}` and makes the menu panel scrollable; restores scroll position on close. Bails silently if nav elements are missing. | `.navbar7_component`, `.w-nav-button` (`aria-expanded`), `.navbar8_menu` | none | none | MutationObserver | MEDIUM (navigation) | no |
| 2 | `<!-- Set links for models and promos in menu -->` | inline JS | On DOMContentLoaded, rewrites every `a[data-link="promo"]` href to `/used-cars/deals?cars_sort_reduced-amount-true=desc&cars_promotion_equal=<link text, spaces → +>`. The "models" part of the header no longer exists (only promos). | `a[data-link="promo"]` (reads textContent, writes href) | none | none | none | MEDIUM (navigation links) | no |
| 3 | `<!-- On page load, prepend #find-store-link to #store-list -->` | inline JS (jQuery) | Moves `#find-store-link` to the top of `#store-list` (nav dropdown). | `#store-list`, `#find-store-link` | none | none | jQuery | LOW | no |
| 4 | `<!-- Write UTMs and Referrer to localStorage for 30 days, plus sessionStorage -->` | inline JS (jQuery ready) | Global attribution saver. Parses all `utm_*` from URL and external referrer. ALWAYS writes last-touch to sessionStorage. Writes first-touch to localStorage only if no record / no `expiresAt` / expired, or if the stored record has no UTMs and no referrer but the current visit has either, or if stored has no UTMs and current has UTMs. TTL 30 days. Self-referrals (carsa.co.uk and subdomains) ignored. | none | none | sessionStorage `attribution_session` = `{utms, referrer, referrerDomain, updatedAt}`; localStorage `attribution` = `{utms, referrer, referrerDomain, updatedAt, expiresAt}` | jQuery | CRITICAL | no |
| 5 | `<!-- Add UTMs to Finance Eligibility links -->` | inline JS (jQuery, window load) | Reads localStorage `attribution` (UTMs + referrerDomain; falls back to `store.referrer` host, then `document.referrer` if external; falls back to URL `utm_*` if none stored) and appends them, plus `referrer=<domain>`, to every `a[href*="quote.carsa.co.uk/eligibility/questions"]` without overwriting existing keys. Note: uses localStorage (first-touch) only, not `attribution_session`. | `a[href*="quote.carsa.co.uk/eligibility/questions"]` (writes href) | quote.carsa.co.uk (link target only) | reads localStorage `attribution` | jQuery | CRITICAL | no |
| 6 | `<!-- Make all links opening in a new tab 'noreferrer noopener' … -->` | inline JS, `type="fs-consent"` `fs-consent-categories="essential"` | On DOMContentLoaded sets `rel="noreferrer noopener"` on every `a[target=_blank]` whose href does not contain carsa.co.uk. Only runs if Finsweet Consent re-types the script. | `a[target="_blank"]` | none | none | Finsweet Consent (script is inert without it) | LOW | no |
| 7 | `<!-- Update the copyright year in the footer to the current year -->` | inline JS, `type="fs-consent"` essential | Writes current year into `#year`. Only runs if Finsweet Consent re-types the script. Declares top-level `const currentYear`. | `#year` | none | global `currentYear` | Finsweet Consent | LOW | no |
| 8 | `<!-- Slider Navigation Styling -->` | CSS | Webflow slider dots: 0.5rem, `var(--text)`, opacity .2 / 1 when active. | `.w-slider-dot`, `.w-slider-dot.w-active` | none | none | none | LOW | no |
| 9 | `<!-- Chat Bot -->` stylesheet | `<link rel=stylesheet>` | n8n chat widget CSS. | none | cdn.jsdelivr.net/npm/@n8n/chat/dist/style.css | none | n8n chat | MEDIUM | no |
| 10 | Chat Bot `<style>` | CSS | Brand-purple overrides of `--chat--*` variables, `--real-vh`; ≤991px: hides floating toggle, makes `.chat-window` full-screen using `--real-vh`, restyles header. | `.chat-window-wrapper .chat-header h1`, `.chat-window-toggle`, `.chat-window`, `.chat-header > p` | none | none | n8n chat | LOW | no |
| 11 | Chat Bot `<script type="module">` | inline ES module | Imports `createChat` from n8n CDN; sets `--real-vh` on resize; on mobile injects a `.chat-close-btn` into the chat header (MutationObserver on body); `.chat-nav-trigger` click/Enter toggles the chat; initialises "Chat with Caroline AI" in window mode with metadata `{currentPageUrl, source:'Website'}`; greeting differs for returning users. | `.chat-window-wrapper .chat-header`, `.chat-window-toggle`, `.chat-nav-trigger`, injects `.chat-close-btn` | cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js; webhook `https://carsa.app.n8n.cloud/webhook/88d110ef-b4ab-4c22-9306-1e492c9f7687/chat` | reads localStorage `n8n-chat/sessionId` (set by the widget itself) | n8n chat (ES module) | MEDIUM (third-party lead channel, see Unclear) | no |

---

## Home (`home`, path `/`)

**Head**

| # | Block | Type | What it does | DOM hooks | Endpoints | Storage & globals | Deps | Criticality | CMS |
|---|---|---|---|---|---|---|---|---|---|
| 1 | canonical | `<link>` | `https://www.carsa.co.uk` | – | – | – | – | MEDIUM | no |
| 2 | FS-ATTR (`fs-list`) | external JS module | Loads Finsweet Attributes v2 with the List solution (make/model dropdowns). | `fs-list-*` attrs | cdn.jsdelivr.net/npm/@finsweet/attributes@2/attributes.js | `window.FinsweetAttributes` queue | – | MEDIUM | no |
| 3 | `<style>` | CSS | `#search-submit:disabled {display:none}`; ≤992px hides `.nav_banner`. | `#search-submit`, `.nav_banner` | – | – | – | LOW | no |

**Body**

| # | Block | Type | What it does | DOM hooks | Endpoints | Storage & globals | Deps | Criticality | CMS |
|---|---|---|---|---|---|---|---|---|---|
| 1 | MAKE-MODEL-HOME `<!-- Make/Model selection -->` | inline JS (IIFE, jQuery + Finsweet hook) | On Finsweet `list` instance `models` render: reads `.model-data` items (`model-title`, `make-title`, `model-slug`, `make-slug` attrs), populates `[name="make"]` with sorted unique makes and `[name="model"]` with that make's models (disabled + `.is-disabled` until a make is chosen). Page context from pathname: on `/` it is `other`, so on desktop a change does nothing beyond populating; on mobile (≤991px) computes `/used-cars/make/{slug}?cars_make_equal=…` or `/used-cars/models/{slug}?cars_make_equal=…&cars_model_equal=…` (plus any other URL params), injects `<link rel=prefetch data-carsa-prefetch>` and redirects on `#mobile-search-submit` click. Desktop submit is not handled here (see Unclear). | `.model-data[model-title][make-title][model-slug][make-slug]`, `[name="make"]`, `[name="model"]`, `#mobile-search-submit`, injects `link[data-carsa-prefetch]`, class `.is-disabled` | none | `window.FinsweetAttributes` push; reads URL params except `cars_make_equal`/`cars_model_equal` | jQuery, Finsweet List | MEDIUM | no |
| 2 | PX-LINK-HOME `<!-- Update and open the link for PX form -->` | inline JS (jQuery ready) | Builds `https://quote.carsa.co.uk/value-my-car/enter-vrm?px_vrm=<value>` + attribution params (prefers sessionStorage `attribution_session` UTMs, falls back to localStorage `attribution`, then `referrer=<external domain>`) and sets it as `href` + `target=_blank` on the form's button. Triggers: Enter in `#px-form-large/#px-form-small input`, form submit (prevented), button click, live `input` on `[name="px-vrm"]`. | `#px-form-large`, `#px-form-small`, `[name="px-vrm"]`, `#px-button-large`, `#px-button-small`, the first `a` in each form | quote.carsa.co.uk/value-my-car/enter-vrm | reads sessionStorage `attribution_session`, localStorage `attribution` | jQuery | CRITICAL | no |
| 3 | EQUAL-HEIGHT-MO | inline JS | Equalises height of all `[data-card-height="equal"]` on resize and on ANY body mutation (MutationObserver, subtree). Declares global `setEqualHeight`. | `[data-card-height="equal"]` | – | global `setEqualHeight` | – | LOW | no |
| 4 | DRAW-LINE | inline JS (jQuery + GSAP) | For each `[data-svg="draw-line"]` wrapper: primes stroke-dasharray on stroked SVG shapes and animates dashoffset to 0, sequential per path, total `data-svg-duration` (default 2 s), 200 ms delay. Plays immediately if already in viewport (or after first scroll when `data-svg-start="scroll"`), else via ScrollTrigger `top 80%` once (scroll fallback if no ScrollTrigger). No-op if `gsap` undefined. | `[data-svg="draw-line"]`, `data-svg-start`, `data-svg-duration`; jQuery data `svgDrawInit`; sets `el.__svgDrawLen` | – | – | jQuery, GSAP, ScrollTrigger (optional) | LOW | no |
| 5 | DRAW-SHAPE | inline JS (jQuery + GSAP) | Same trigger logic for `[data-svg="draw-shape"]`: shapes start `y:24, scale:0, opacity:0` and pop in sequentially. jQuery data `svgPopInit`. | `[data-svg="draw-shape"]` | – | – | jQuery, GSAP | LOW | no |
| 6 | VALUATION-LINK | inline JS (jQuery ready, delegated) | Builds `https://sellcar.carsa.co.uk/new-order?vrm=<A-Z0-9 only, upper>&mileage=<trimmed>` + attribution params (same session→local→referrer order as PX-LINK-HOME). On click of `[data-link="valuation"]`: if it is an `<a>` sets href+`target=_blank`, else `window.open(url,'_blank','noopener')`. Enter in any `form input` whose form contains a valuation trigger is prevented and opens/clicks. Live `input` on `form [name="vrm"], form [name="mileage"]` refreshes hrefs. Note `addParams` here has no try/catch (throws on a malformed base, unlike CHECK-FINANCE). | `[data-link="valuation"]`, `form [name="vrm"]`, `form [name="mileage"]` | sellcar.carsa.co.uk/new-order | reads sessionStorage `attribution_session`, localStorage `attribution` | jQuery | CRITICAL | no |

---

## Vehicle Search Results (`used-cars`, `/used-cars`)

**Head**

| # | Block | Type | What it does | DOM hooks | Endpoints | Storage | Deps | Criticality | CMS |
|---|---|---|---|---|---|---|---|---|---|
| 1 | canonical | link | `https://www.carsa.co.uk/used-cars` | – | – | – | – | MEDIUM | no |
| 2 | VSRP stylesheet | `<link rel=stylesheet>` | Styles for the external VSRP search widget. | – | d2zblaqlrfk95e.cloudfront.net/carsa-search.css | – | VSRP widget | MEDIUM | no |
| 3–5 | `<!-- Preconnect + preload the VSRP widget's critical origins (CARSA-5852) -->` | 2× preconnect + 1× `preload as=script` | Warms d2zblaqlrfk95e.cloudfront.net and search.carsa.co.uk; preloads carsa-search.js. The script tag itself is NOT in custom code (must be an on-page embed, see Unclear). | – | d2zblaqlrfk95e.cloudfront.net/carsa-search.js, search.carsa.co.uk | – | – | LOW (perf hints) | no |

**Body**

| # | Block | Type | What it does | DOM hooks | Endpoints | Storage | Deps | Criticality | CMS |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `<!-- Show toast message if user is redirected from VDP 404 -->` | inline JS (jQuery) | If sessionStorage `from404Used === 'true'`, shows `#redirect-message` and removes the key. | `#redirect-message` | – | sessionStorage `from404Used` (read + remove) | jQuery | LOW | no |
| 2 | CHECK-FINANCE (variant 0445f30d) | inline JS (IIFE, delegated on body) | On `mouseover` of `[data-link="check-finance"]` inside an `<a>`: saves original href/`data-analytics-event` into `dataset.originalHref` / `dataset.originalAnalytics`, swaps href to `https://quote.carsa.co.uk/eligibility/questions?vrm=<el vrm attr>` + attribution params (session→local→external referrer) and sets `data-analytics-event="check-finance-car-card-click"`. `mouseout` restores. `click` swaps if not already swapped (touch/keyboard). | `[data-link="check-finance"]` with bare `vrm` attribute, ancestor `a`, `data-analytics-event` | quote.carsa.co.uk/eligibility/questions | reads sessionStorage `attribution_session`, localStorage `attribution` | none | CRITICAL | no |
| 3 | VALUATION-LINK | see Home #6 | | | sellcar.carsa.co.uk | | jQuery | CRITICAL | no |

---

## Deals (`deals`, `/used-cars/deals`) and Makes Template (`detail_make`, `/used-cars/make/{slug}`)

Body code is byte-identical between the two pages.

**Head (deals):** canonical `https://www.carsa.co.uk/used-cars/deals`; VSRP-HEAD (preconnect ×2, preload carsa-search.js, stylesheet carsa-search.css); `<style>.nav_banner{display:none!important}</style>` (LOW, hides the nav banner on Deals at all widths).

**Head (detail_make):** canonical `https://www.carsa.co.uk/used-cars/make/{{wf slug}}` (CMS token: yes); VSRP-HEAD.

**Body (both)**

| # | Block | Criticality | Notes |
|---|---|---|---|
| 1 | CHECK-FINANCE (cdc2590a) | CRITICAL | see used-cars #2 |
| 2 | VALUATION-LINK | CRITICAL | see Home #6 |

---

## Models Template (`detail_models`, `/used-cars/models/{slug}`)

**Head:** canonical `https://www.carsa.co.uk/used-cars/models/{{wf slug}}` (CMS: yes); VSRP-HEAD; OG-IMAGE (static Facebook PNG 1200×630).

**Body**

| # | Block | Type | What it does | DOM hooks | Endpoints | Storage | Deps | Criticality | CMS |
|---|---|---|---|---|---|---|---|---|---|
| 1 | CHECK-FINANCE (0445f30d) | | see used-cars #2 | | quote.carsa.co.uk | | | CRITICAL | no |
| 2 | `<!-- Set description and SEO data if missing -->` | inline JS (jQuery) | If `meta[name=description]` missing/empty, appends one built from `{{wf make:name}} {{wf name}}` boilerplate; if `document.title` empty sets a (very long) default title; always writes the description text into `#description`. | `meta[name="description"]`, `#description`, `document.title` | – | – | jQuery | MEDIUM (SEO) | **yes** (`make:name`, `name`) |
| 3 | (no header) "FAQ Scrub — Carsa /make/ and /models/ pages" | inline JS (IIFE) | Parses every `script[type=application/ld+json]`; in a FAQPage drops Questions with empty name or answer, removes the block entirely if none remain, and deletes `mainEntity` refs to `#faq` from any `@graph` node when no FAQPage survives. | `script[type="application/ld+json"]` | – | – | – | MEDIUM (SEO) | no |
| 4 | VALUATION-LINK | | see Home #6 | | sellcar.carsa.co.uk | | jQuery | CRITICAL | no |

---

## All Models (`models`, `/used-cars/models`)

**Head:** canonical `https://www.carsa.co.uk/all-models` (does NOT match the published path `/used-cars/models`, see Unclear); FS-ATTR (`fs-list`).

**Body**

| # | Block | Type | What it does | DOM hooks | Endpoints | Storage | Deps | Criticality | CMS |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `<!-- Handles dropdown opening and closing and text updates -->` | inline JS (jQuery, delegated) | `pointerdown` on `[data-element='select']` writes its `data-text` (or text) into `#select-text`; on `[fs-list-element='clear']` writes "Any make". `click` on either then (setTimeout 0) dispatches synthetic mousedown/mouseup/click on body so Webflow closes the dropdown, and as fallback clicks the toggle found via the list's `aria-labelledby`. | `#select-text`, `[data-element="select"]`, `[fs-list-element="clear"]`, `.w-dropdown-list`, `.w--open`, `aria-expanded` | – | – | jQuery, Finsweet List, Webflow dropdown | MEDIUM (filter UI) | no |
| 2 | DRAW-LINE | | | | | | | LOW | no |

---

## Postcodes Template (`detail_near`, `/used-cars/near/{slug}`)

**Head**

| # | Block | Type | What it does | DOM hooks | Endpoints | Storage | Deps | Criticality | CMS |
|---|---|---|---|---|---|---|---|---|---|
| 1 | canonical | link | `https://www.carsa.co.uk/used-cars/near/{{wf slug}}` | – | – | – | – | MEDIUM | yes |
| 2 | FS-ATTR (`fs-list`) | ext JS | | | cdn.jsdelivr.net | | | MEDIUM | no |
| 3 | `<style>` | CSS | `#promo-storage{display:none!important}` hides the hidden promo-card source list. | `#promo-storage` | – | – | – | LOW | no |
| 4 | `<!-- Block native form submission on Filter Vehicles form -->` (fix dated 2026-06-16) | inline JS | Capturing `submit` listener on `#wf-form-Filter-Vehicles` that `preventDefault` + `stopImmediatePropagation`, and hides the sibling `.w-form-done` / `.w-form-fail`. Runs immediately if the form exists else on DOMContentLoaded. Stops Webflow counting filter changes as form submissions after a Finsweet CDN update. | `#wf-form-Filter-Vehicles`, `.w-form`, `.w-form-done`, `.w-form-fail` | – | – | – | MEDIUM (filters; regression = page reload on filter change + polluted Webflow form stats) | no |

**Body**

| # | Block | Type | What it does | DOM hooks | Endpoints | Storage | Deps | Criticality | CMS |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `<!-- Show loader while list loads -->` | inline JS (Finsweet hook + jQuery) | On `input`/`change` of any `[fs-list-field]` and on list `filter` hook: shows `.loading`, hides `#results-list-wrapper`, adds `.is-hidden` to `.facet-wrapper` and `.is-loading` to `.filters1_item`; reverses on `afterRender`. Contains commented-out `#mobile-results-button` / `#mobile-loading-button` toggles. | `[fs-list-field]`, `.loading`, `#results-list-wrapper`, `.facet-wrapper.is-hidden`, `.filters1_item.is-loading` | – | `window.FinsweetAttributes` | jQuery, Finsweet List | LOW | no |
| 2 | MAKE-MODEL-NEAR | inline JS | Superset of MAKE-MODEL-HOME. Additions: `computeRedirectURL` has same-page guards and, on make/model pages with "Any", redirects to `/used-cars?<filters>`; mobile `#mobile-search-submit` falls back to the prefetched URL; any other `[fs-list-field]` change on mobile re-computes + re-prefetches (300 ms debounce); prefills make/model dropdowns from page slug (or `cars_make_equal` URL param); `.facet-wrapper` visibility hidden when the selected make/model differs from the page's; on a model page selecting a different make on mobile strips `cars_model_equal` via `history.replaceState`; desktop make page: model change filters in place (no redirect); desktop "Any" make → `/used-cars` with filters. Note: on `/used-cars/near/*` the page context is `other`, so on desktop nothing redirects. | as HOME plus `.facet-wrapper`, `[fs-list-field]` | – | `window.FinsweetAttributes`; URL params `cars_make_equal`, `cars_model_equal` | jQuery, Finsweet List | MEDIUM | no |
| 3 | `<!-- Insert promo cards -->` | inline JS (Finsweet `afterRender`) | After each render removes old `[data-element="promo-card"]` from `#results-list`, then clones each card in `#promo-storage` into the list at `data-position` (1-based) and every `data-repeat` items thereafter. Then hides every `.results_offer-wrapper` after the first one that has a following sibling. | `#results-list`, `#promo-storage [data-element="promo-card"][data-position][data-repeat]`, `.results_offer-wrapper` | – | `window.FinsweetAttributes` | jQuery, Finsweet List | MEDIUM (promotions in results) | no |
| 4 | CHECK-FINANCE (0445f30d) | | | | quote.carsa.co.uk | | | CRITICAL | no |
| 5 | `<!-- Hide mobile filters button if list still loading -->` | inline JS | On window load polls `#desktop-results` count every 400 ms; once unchanged for 10 polls hides `#mobile-filters-loading-link` and shows `#mobile-filters-link` (`display:flex`). Declares global `windowLoaded`. | `#desktop-results`, `#mobile-filters-loading-link`, `#mobile-filters-link` | – | global `windowLoaded` | jQuery | LOW | no |
| 6 | `<!-- Open/close filters list and accordions on mobile without using Webflow interactions -->` | inline JS (jQuery) | ≤991px: `#mobile-filters-link` adds `.is-visible` to `.filters1_filters-wrapper`; `#mobile-search-submit` and `#filters-mobile-close` remove it; rebinds on resize (note `#filters-mobile-close` handler is added on every resize without `.off`). All sizes: `.filters1_filter-group-heading` click toggles `.is-open` on sibling `.filters1_filter-options` and its `.filters1_accordion-icon`. | `#mobile-filters-link`, `#mobile-search-submit`, `#filters-mobile-close`, `.filters1_filters-wrapper.is-visible`, `.filters1_filter-group-heading`, `.filters1_filter-options.is-open`, `.filters1_accordion-icon` | – | – | jQuery | MEDIUM (filter UI) | no |
| 7 | `<!-- Redirect when non-related store is filtered for -->` near-location-redirect v1 | inline JS (IIFE) | Guard: only on `/used-cars/near/*`. If URL has `cars_location_equal`, strips it and `location.replace`s (stale after back-nav). Reloads on bfcache restore (`pageshow` persisted). On Finsweet list ready: finds the location filter group (`input[fs-list-field="location"]` → ancestor `.filters1_filter-group`), marks labels whose `[fs-list-element="facet-count"]` is "0" with `data-near-zero` and hides their `.facet-wrapper` (MutationObserver, 200 ms debounce). Desktop click on a zero-count label: stops propagation, visually checks it, redirects to `/used-cars?cars_location_equal=["<checked names>","<clicked>"]` + all other current params. Mobile: on `#mobile-search-submit`, if any checked location is zero-count, same redirect. | `input[fs-list-field="location"][fs-list-value]`, `label.dropdown1_checkbox-field`, `.is-list-active`, `[fs-list-element="facet-count"]`, `.facet-wrapper`, `.filters1_filter-group`, `#mobile-search-submit`, attr `data-near-zero` | – | `window.FinsweetAttributes`; URL param `cars_location_equal` (JSON array) | Finsweet List | MEDIUM (redirect) | no |
| 8 | `<!-- Trim VRM search of disallowed characters -->` | inline JS (jQuery, not wrapped in ready) | `#vrm-search` input: strips non-alphanumerics and uppercases. | `#vrm-search` | – | – | jQuery | MEDIUM (filter) | no |
| 9 | `<!-- Update Search buttons to add related location filters -->` | inline JS (jQuery ready) | Intends to set `[data-button="search-locations"]` href to `/used-cars?cars_sort_dated-added=desc&cars_location_equal=<JSON array of [data-button="locations"] texts>`. **The filter line is commented out so `filtered` is undefined → ReferenceError; the href is never written.** | `[data-button="locations"]`, `[data-button="search-locations"]` | – | – | jQuery | MEDIUM (broken, see Unclear) | no |
| 10 | VALUATION-LINK | | | | sellcar.carsa.co.uk | | jQuery | CRITICAL | no |

---

## Fuel Types Template (`detail_fuel`, `/used-cars/fuel/{slug}`)

**Head:** canonical `https://www.carsa.co.uk/used-cars/fuel/{{wf slug}}` (CMS: yes); FS-ATTR (`fs-list`); a second FS-ATTR loader with `fs-toc` (two loaders of the same module, see Unclear).

**Body**

| # | Block | Type | What it does | DOM hooks | Endpoints | Storage | Deps | Criticality | CMS |
|---|---|---|---|---|---|---|---|---|---|
| 1 | CHECK-FINANCE (cdc2590a) | | | | quote.carsa.co.uk | | | CRITICAL | no |
| 2 | PX-LINK-HOME | | see Home #2 | `#px-form-large/small`, `[name="px-vrm"]` | quote.carsa.co.uk/value-my-car/enter-vrm | | jQuery | CRITICAL | no |
| 3 | `<!-- Update Search all links -->` | inline JS | Sets every `[data-button="search-similar"]` href to `/used-cars?cars_fuel-type_equal=<{{wf name}} spaces→+>` (or `/used-cars` if empty). | `[data-button="search-similar"]` | – | – | – | MEDIUM | **yes** (`name`) |
| 4 | VALUATION-LINK | | | | sellcar.carsa.co.uk | | jQuery | CRITICAL | no |
| 5 | DRAW-LINE | | | | | | | LOW | no |
| 6 | DRAW-SHAPE | | | | | | | LOW | no |

---

## Promotions Template (`detail_promotions`, `/used-cars/promotions/{slug}`)

**Head:** canonical `www.carsa.co.uk/used-cars/promotions/{{wf slug}}` (**missing `https://`, resolves as a relative URL**, see Unclear; CMS: yes); FS-ATTR (`fs-list`).

**Body**

| # | Block | Type | What it does | DOM hooks | Endpoints | Storage | Deps | Criticality | CMS |
|---|---|---|---|---|---|---|---|---|---|
| 1 | CHECK-FINANCE (cdc2590a) | | | | quote.carsa.co.uk | | | CRITICAL | no |
| 2 | `<!-- Build links to relevant promo filter on Deals page -->` | inline JS (top-level vars + jQuery ready) | Sets `[data-button="search-offer"]` href to `/used-cars/deals?cars_sort_reduced-amount-true=desc&cars_promotion_equal=<encodeURIComponent({{wf pill-description}})>`. Declares globals `promo`, `encoded`, `url`. | `[data-button="search-offer"]` | – | globals `promo`, `encoded`, `url` | jQuery | MEDIUM | **yes** (`pill-description`) |
| 3 | DRAW-LINE | | | | | | | LOW | no |
| 4 | DRAW-SHAPE | | | | | | | LOW | no |

---

## Vehicles Template / VDP (`detail_used`, `/vehicles/used/{slug}`)

**Head**

| # | Block | Type | What it does | DOM hooks | Endpoints | Storage | Deps | Criticality | CMS |
|---|---|---|---|---|---|---|---|---|---|
| 1 | canonical | link | `https://www.carsa.co.uk/vehicles/used/{{wf slug}}` | – | – | – | – | MEDIUM | yes |
| 2–4 | OG-IMAGE | 3× meta | `og:image` = `{{wf main-image-link}}`, 1200×630. | – | – | – | – | MEDIUM | **yes** |
| 5 | FS-INPUTACTIVE | ext JS (defer) | Finsweet Input Active Class v1 (adds `fs-inputactive-class` to checked radio labels). | `fs-inputactive-class` attr | cdn.jsdelivr.net/npm/@finsweet/attributes-inputactive@1/inputactive.js | – | – | MEDIUM | no |
| 6 | FS-ATTR (`fs-list`) | ext JS | | | cdn.jsdelivr.net | | | MEDIUM | no |
| 7–15 | preconnect / dns-prefetch ×9 | link | d1kcoelx4vkza6.cloudfront.net, r.carsa.co.uk, assets.dealernetdms.co.uk, d3e54v103j8qbb.cloudfront.net, cdn.prod.website-files.com (last dns-prefetch lacks scheme). | – | those hosts | – | – | LOW | no |

**Body**

| # | Block | Type | What it does | DOM hooks | Endpoints | Storage & globals | Deps | Criticality | CMS |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `<!-- Add UTMs to Build Deal, Book Test Drive, and Eligibility links -->` | inline JS (jQuery, window load) | Same logic as footer #5 (localStorage `attribution` first-touch, referrer fallbacks, URL utm fallback) applied to `a[href*="quote.carsa.co.uk/build-deal/"]`, `…/book/`, `…/eligibility/questions`. Runs at window load, so it re-processes eligibility links already handled by the footer (idempotent, keys not overwritten). | those three href patterns | quote.carsa.co.uk | reads localStorage `attribution` | jQuery | CRITICAL | no |
| 2 | `<!-- Format numbers into currency, decimal places and commas -->` | inline JS (jQuery ready) | Rewrites numbers inside `[data-number="currency"]` → `£1,234`, `currency-rounded` → rounded, `decimals` → 2dp, `commas` → thousands separators. Uses locale `en-UK` (not a valid BCP-47 tag; browsers fall back). Declares globals `formatCurrency`, `formatDecimals`, `formatCommas`, `formatCurrencyRounded` (later shadowed inside the calculator). | `[data-number="currency"|"currency-rounded"|"decimals"|"commas"]` | – | 4 globals | jQuery | MEDIUM (price display) | no |
| 3 | `<!-- Finance config: single source of truth, fetched once per page load -->` | inline JS | Defines `window.CARSA_FIN` with fallback cfg (representativeApr 10.9; aprByTier Excellent 8.9 / VeryGood 10.9 / Good 10.9 / Fair 16.9 / BelowAverage 16.9; defaultTerm 48; defaultAnnualMileage 8000; defaultDepositAmount 2500), tier map, `APPROVED_FLAT_DEPOSIT=2500`, `depositFor(price)` (first numeric of defaultDepositAmount/defaultDeposit/defaultCashDeposit/representativeDeposit, else 0 for bad price, else 2500), `aprFor(rating)`, `setRadio(input)` (syncs `checked` attr + `fs-inputactive-class`). Fetches finance-config, merges non-empty keys if `representativeApr` is a number 0–40, logs `console.error` + `DD_LOGS` on failure; `CARSA_FIN.ready` = race(fetch, 3 s timeout). | `input[name=…]`, `label[fs-inputactive-class]`, `.is-active` | GET https://consumer-finance.carsanet.co.uk/finance-config | globals `window.CARSA_FIN`, reads `window.DD_LOGS` | – | CRITICAL | no |
| 4 | `<!-- Finance calculator -->` | inline JS (DOMContentLoaded, jQuery) | Reads CMS `price` (bare Number token), `registration-date` (formatted MMM DD, YYYY → parsed → YYYY-MM-DD), `finance-promotion:deposit-contribution` (quoted; empty → 0), `odometer`, `name` (VRM), `finance-type`. `applyPresets()`: `#finance-deposit` = depositFor(price) − contribution; paints `[data-number="deposit"]` (total), `customer-deposit`, `deposit-contribution`; `#deposit-contribution` readonly/tabindex −1/not required; default term radio = `#60` when finance-type is "HP" else `#<cfg.defaultTerm>`; `#finance-mileage` = cfg.defaultAnnualMileage (or first option); credit rating radio `very-good`. `callFinanceAPI()`: POST /quote with `criteria{annualMileage, cashDeposit (customer + contribution), outstandingFinance 0, pxEquity 0, term, apr}`, `vehicle{mileage, price, registrationDate, type:"Car", vrm}`, `requestedBy:"manual"`, fixed `requestUuid 6319f553-…`. Response mapped to ids/`[data-number]`: pcp-price, pcp-term, pcp-optional, pcp-total-amount-payable, pcp-interest-amount, pcp-price-short, pcp-fixed-rate, pcp-excess-mileage, hp-price, hp-price-short, hp-total-amount-payable, hp-total-charges, hp-interest-amount, hp-fixed-rate, hp-term; also `[data-number="term"]`, `contract-length` (term+1), `total-credit`. If `data.pcp.error` non-empty → clicks `#hp-tab-link`, shows `[data-element="pcp-error"]`, hides `pcp-available`; else clicks `#pcp-tab-link`. Tab switch wrapped to stop Safari scroll/hash jump. First quote fires after `CARSA_FIN.ready`. Deposit input debounced 1 s; `#finance-button` click, term/APR radios, mileage `input` re-quote. Enter suppressed in inputs. Falls back to a self-contained FIN stub if `CARSA_FIN` missing. | `#finance-deposit`, `#deposit-contribution`, `#finance-mileage`, `#finance-button`, `#60`, `#<term id>`, `input[data-name="finance-term"]`, `input[data-name="apr"][value=very-good]`, `#hp-tab-link`, `#pcp-tab-link`, `[data-element="pcp-error"|"pcp-available"]`, all `[data-number=…]` above | POST https://consumer-finance.carsanet.co.uk/quote | reads `window.CARSA_FIN` | jQuery, Webflow tabs, Finsweet inputactive | CRITICAL | **yes** (`price`, `registration-date`, `finance-promotion:deposit-contribution`, `finance-type`, `odometer`, `name`) |
| 5 | `<!-- Update APR of finance calculator -->` | inline JS (jQuery ready) | Paints `CARSA_FIN.aprFor(selected rating)` into every `[data-number="apr"]` (keeps `%` if present) and into leaf `.is-apr` text nodes matching "Representative APR n%". On load, on `[data-name="apr"]` change, after `CARSA_FIN.ready`, and on window load. | `[data-number="apr"]`, `.is-apr`, `input[data-name="apr"]` | – | reads `window.CARSA_FIN` | jQuery | CRITICAL (APR) | no |
| 6 | `<!-- Update Get Started link -->` | inline JS (jQuery ready) | Sets `[data-button="booking-options"]` href to `/get-started?vrm=<{{wf name}} lower>&location=<{{wf location:name}}>` + `&storage=true` when `{{wf location:is-storage-location}}` is true. Shadows `location` with a local const. | `[data-button="booking-options"]` | – | – | jQuery | CRITICAL (lead path) | **yes** (`name`, `location:name`, `location:is-storage-location`) |
| 7 | PX-LINK-VDP `<!-- Update and open the link for PX form -->` | inline JS (jQuery ready) | Like PX-LINK-HOME but URL is `https://quote.carsa.co.uk/get-px-valuation/{{wf name}}/?px_vrm=<value>` and attribution uses localStorage `attribution` only (no `attribution_session`), URL utm fallback, external `document.referrer` fallback. Same triggers on `#px-form-large/#px-form-small`, `#px-button-large/small`, `[name="px-vrm"]`. | `#px-form-large`, `#px-form-small`, `#px-button-large`, `#px-button-small`, `[name="px-vrm"]` | quote.carsa.co.uk/get-px-valuation/{vrm}/ | reads localStorage `attribution` | jQuery | CRITICAL | **yes** (`name`) |
| 8 | `<!-- Search similar vehicles button -->` | inline JS | Sets `[data-link="search-similar"]` href to `/used-cars?cars_make_equal=<make>&cars_model_equal=<model>` (spaces → +) from `{{wf make:name}}`, `{{wf model:name}}`. | `[data-link="search-similar"]` | – | – | – | MEDIUM | **yes** |
| 9 | EQUAL-HEIGHT-MO (fd369613) | | | `[data-card-height="equal"]` | | global `setEqualHeight` | | LOW | no |
| 10 | `<!-- Add hidden fields to each form to track conversion pages and UTMs-->` | inline JS (jQuery ready) | For every `form[data-form="add-utms"]`: removes prior injected inputs then appends hidden `conversion_page` (current URL minus utm_* params), `utm_source/medium/campaign/term/content` (always, blank if absent), any extra `utm_*`, and `referrer` (stored referrerDomain or external document.referrer, else blank). UTMs from localStorage `attribution` else URL. | `form[data-form="add-utms"]`, hidden inputs `conversion_page`, `utm_*`, `referrer` | – | reads localStorage `attribution` | jQuery | CRITICAL (lead capture) | no |
| 11 | `<!-- Update make/model count on Similar Cars carousel and banner and hide carousel if 0 -->` | inline JS (jQuery ready) | Writes count of `[data-count="make-model"]` into `[data-number="make-model"]`; if 0 hides `[data-similar="model"]` and shows `[data-similar="make"]`. | those attrs | – | – | jQuery | LOW | no |
| 12 | CHECK-FINANCE (58a461f9) | | | | quote.carsa.co.uk | | | CRITICAL | no |
| 13 | `<!-- Clean Schema + Update if Vehicle Removed -->` | inline JS (IIFE) | For the first JSON-LD block containing `"Product"`: recursively deletes empty-string/null keys, removes `PropertyValue` entries with no value, removes objects left with only `@type`; if `{{wf status}}` is "removed" sets every `offers.availability` to `https://schema.org/SoldOut` and deletes `price`/`priceCurrency`. Rewrites the block text. | `script[type="application/ld+json"]` | – | – | – | MEDIUM (SEO / price integrity) | **yes** (`status`) |
| 14 | DRAW-LINE (380f49b5) | | Same as shared DRAW-LINE. Does NOT define `svg.__svgDrawPlay` (see Unclear re block 16). | `[data-svg="draw-line"]` | | | jQuery, GSAP | LOW | no |
| 15 | VALUATION-LINK (9a863e27) | | | | sellcar.carsa.co.uk | | jQuery | CRITICAL | no |
| 16 | `<!-- Radio CTA: reserve-collect / reserve-test-drive -->` | inline JS (jQuery ready) | VRM = `{{wf name}}` upper. Radios `input[name="Book"]` (ids `reserve-test-drive`, `reserve-collect`): on change updates `[data-button="cta-option"]` text ("Reserve & test drive" / "Reserve & collect"), href (`https://quote.carsa.co.uk/book/<VRM>?postcode=<[data-field=postcode] cleaned>` or `https://quote.carsa.co.uk/build-deal/<VRM>?skip_intro=`) + attribution params (localStorage `attribution`, URL utm fallback, referrer fallbacks), and `data-analytics-event` (`test-drive-cta` / `build-deal-cta`); animates `.details_radio_content` open/closed and `.form7_field-wrapper.is-postcode`; toggles `.is-list-active` on `.details_radio-field`; calls `svg.__svgDrawPlay` on the field's draw-line SVG (undefined on this page). On load checks `#reserve-test-drive`, shows postcode field, builds CTA. Enter in `#cta-postcode` navigates to the CTA href (throws if `#cta-postcode` missing). | `input[name="Book"]`, `#reserve-test-drive`, `#reserve-collect`, `[data-button="cta-option"]`, `[data-field="postcode"]`, `#cta-postcode`, `.details_radio-field`, `.details_radio_content`, `.form7_field-wrapper.is-postcode`, `.is-list-active` | quote.carsa.co.uk/book/, quote.carsa.co.uk/build-deal/ | reads localStorage `attribution` | jQuery | CRITICAL | **yes** (`name`) |
| 17 | `<!-- Battery animation -->` | external JS | Loads `battery-animation.js` from this repo's `main` branch via jsDelivr GitHub CDN (already migrated code). | (see projects/carsa/battery-animation.js) | cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@main/projects/carsa/battery-animation.js | – | – | LOW | no |

---

## Car Finance Calculator (`car-finance-calculator`, `/car-finance-calculator`)

**Head:** canonical `www.carsa.co.uk/car-finance-calculator` (**missing `https://`**); FS-ATTR (`fs-list`).

**Body**

| # | Block | Type | What it does | DOM hooks | Endpoints | Storage & globals | Deps | Criticality | CMS |
|---|---|---|---|---|---|---|---|---|---|
| 1 | (no header) standalone HP calculator | inline JS (DOMContentLoaded, vanilla) | Self-contained copy of the VDP finance logic for a user-entered price. Local `CFG` fallback identical to VDP; fetches finance-config (race with 3 s timeout, `console.error` + `DD_LOGS` on failure). `#finance-car-price` (default "10000") and `#finance-deposit` are `£`-formatted on blur, raw on focus; `#total-price` mirrors price. `applyDefaults()` sets deposit = cfg default (2500), forces term radio `#<cfg.defaultTerm>` (48) via `setRadio`, credit band `very-good`, paints `[data-number="apr"]`. POST /quote with `criteria{annualMileage 8000, cashDeposit, outstandingFinance 0, pxEquity 0, term, apr}` and a **hard-coded dummy vehicle** `{mileage 7617, price, registrationDate "2025-01-22", type "Car", vrm "MD74ZHJ"}`, random `requestUuid`. Maps `hp.payments.regular` → `#hp-price` (2dp) and `#hp-price-short` (floor), `hp.totalAmountPayable`, `hp.totalCharges`, `hp.flatRate` → `#hp-fixed-rate` (1dp %), plus matching `[data-number=…]`; `#hp-term` = "N monthly payments of"; `[data-number="total-credit"]` = price − deposit; `[data-number="deposit"]`. Price `input` re-quotes immediately, deposit debounced 800 ms, radios on change. Enter suppressed. Leaves many `console.log` calls active. | `#finance-deposit`, `#finance-car-price`, `#total-price`, `#hp-term`, `#hp-price`, `#hp-price-short`, `#hp-total-amount-payable`, `#hp-total-charges`, `#hp-fixed-rate`, `input[data-name="finance-term"]`, `input[data-name="apr"]`, `#48` (term id), `[data-number="apr"|"deposit"|"total-credit"|<id>]`, `label[fs-inputactive-class]`, `.w--redirected-checked` | GET https://consumer-finance.carsanet.co.uk/finance-config; POST https://consumer-finance.carsanet.co.uk/quote | reads `window.DD_LOGS`; uses `crypto.randomUUID` | Finsweet inputactive (class only) | CRITICAL | no |
| 2 | (no header) mobile "view results" scroll | inline JS | Click on `[data-analytics-event="finance-calculator-cta-view-results-mobile"]` prevents default and smooth-scrolls to `#finance-calculator-results`. Logs to console. | `[data-analytics-event="finance-calculator-cta-view-results-mobile"]`, `#finance-calculator-results` | – | – | – | LOW | no |
| 3 | CHECK-FINANCE (cdc2590a) | | | | quote.carsa.co.uk | | | CRITICAL | no |
| 4 | EQUAL-HEIGHT-MO | | | | | | | LOW | no |

---

## Car Finance (`car-finance`, `/car-finance`)

**Head:** canonical `https://www.carsa.co.uk/car-finance`; FS-ATTR (`fs-list`).

**Body**

| # | Block | Type | What it does | DOM hooks | Endpoints | Storage & globals | Deps | Criticality | CMS |
|---|---|---|---|---|---|---|---|---|---|
| 1 | FAQ-SCHEMA-MINI `<!-- Build FAQ schema -->` | inline JS (IIFE) | Once (`window.__FAQ_SCHEMA_MINI__`): on DOMContentLoaded collects `[data-faq-question]` / `[data-faq-answer]` pairs inside `[data-faq-item]` within `#section-faq` (whole document if absent) and injects one `<script type=application/ld+json data-faq-jsonld>` FAQPage into head. Does not wait for Finsweet render. | `#section-faq`, `[data-faq-item]`, `[data-faq-question]`, `[data-faq-answer]`, injects `script[data-faq-jsonld]` | – | global `window.__FAQ_SCHEMA_MINI__` | – | MEDIUM (SEO) | no |
| 2 | DRAW-LINE | | | | | | | LOW | no |
| 3 | DRAW-SHAPE | | | | | | | LOW | no |

## Reserve (`reserve`, `/reserve`)

**Head:** canonical `https://www.carsa.co.uk/reserve`; FS-ATTR (`fs-list`).

**Body:** 1 FAQ-SCHEMA-MINI (MEDIUM) · 2 CHECK-FINANCE cdc2590a (CRITICAL) · 3 EQUAL-HEIGHT-MO (LOW) · 4 DRAW-LINE (LOW) · 5 DRAW-SHAPE (LOW). No CMS tokens.

## Part Exchange (`part-exchange`, `/sell-car/part-exchange`)

**Head:** canonical `https://www.carsa.co.uk/sell-car/part-exchange`; FS-ATTR (`fs-list`).

**Body:** 1 VALUATION-LINK (CRITICAL, sellcar.carsa.co.uk) · 2 FAQ-SCHEMA-MINI (MEDIUM) · 3 DRAW-LINE · 4 DRAW-SHAPE. No CMS tokens.

## Value Car (`value-car`, `/sell-car/value-car`)

**Head:** canonical `https://www.carsa.co.uk/sell-car/value-car`; FS-ATTR (`fs-list`).

**Body:** 1 FAQ-SCHEMA-MINI (MEDIUM) · 2 VALUATION-LINK (CRITICAL) · 3 DRAW-LINE · 4 DRAW-SHAPE. Byte-identical to the excluded draft `sell-car` body. No CMS tokens.

---

## Get Started (`get-started`, `/get-started`)

**Head:** canonical `https://www.carsa.co.uk/get-started`; FS-INPUTACTIVE.

**Body**

| # | Block | Type | What it does | DOM hooks | Endpoints | Storage & globals | Deps | Criticality | CMS |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `<!-- Populate page with URL data -->` | inline JS (jQuery ready) | Reads `?vrm`, `?location`, `?storage`. Appends hidden `<input name="vrm">` to the first `form`. Writes location into `[data-text="location"]`, vrm into `[data-text="vrm"]`. If `storage=true` hides `#free-test-drive`. | first `form`, `[data-text="location"]`, `[data-text="vrm"]`, `#free-test-drive` | – | URL params `vrm`, `location`, `storage` | jQuery | CRITICAL (form / lead) | no |
| 2 | `<!-- Update booking link with radio choice, VRM and UTMs, plus add back button link to car -->` | inline JS (jQuery ready) | Attribution from localStorage `attribution` (+ referrer fallbacks, URL utm fallback). On radio change (by radio `id`): `test-drive-free` → `https://quote.carsa.co.uk/book/<vrm>` text "Book free test drive" event `test-drive-free-submit`; `reserve-test-drive` → same URL, "Reserve & book test drive", `reserve-test-drive-submit`, shows `#reservation-note`; `reserve-collect` → `https://quote.carsa.co.uk/build-deal/<vrm>?skip_intro=`, "Reserve & collect", `reserve-collect-submit`, shows note. Sets `#book-button` href/target/`data-analytics-event`/text, removes `.is-disabled`. Fires for a pre-checked radio on load. `#back-button` → `https://www.carsa.co.uk/vehicles/used/<vrm>`. VRM is used as-is from the URL (lower-case from VDP). | `input[type=radio]` ids `test-drive-free`, `reserve-test-drive`, `reserve-collect`; `#book-button`, `#reservation-note`, `#back-button`, `.is-disabled` | quote.carsa.co.uk/book/, quote.carsa.co.uk/build-deal/ | reads localStorage `attribution`; URL `vrm`, `utm_*` | jQuery | CRITICAL | no |
| 3 | `<!-- Show squiggle on radio check -->` | inline JS (jQuery delegated) | On radio change fades `.booking-options-squiggle` inside each `.radio3_field` of the group to 0.75 / 0. | `.radio3_field`, `.booking-options-squiggle` | – | – | jQuery | LOW | no |
| 4 | `<!-- Animate squiggle on radio check-->` | inline JS (jQuery + GSAP) | Variant of DRAW-LINE that does not auto-play: builds the timeline (duration ÷ 1.5) and stores `svg.__svgDrawPlay`; on radio change plays the draw-line SVG inside the same `.radio3_field`. | `[data-svg="draw-line"]`, `.radio3_field`, sets `svg.__svgDrawPlay` | – | – | jQuery, GSAP | LOW | no |
| 5 | `<!-- On page load, get ?vrm= from URL, uppercase it, and update meta title -->` | inline JS (jQuery ready) | `document.title = "Get Started With <VRM> | Carsa"` and mirrors into `meta[name=title]`, `meta[property=og:title]`. | `meta[name="title"]`, `meta[property="og:title"]` | – | URL `vrm` | jQuery | LOW | no |

---

## FAQ (`faq`, `/faq`)

**Head:** canonical `https://www.carsa.co.uk/faq`; FS-ATTR (`fs-list`).

**Body**

| # | Block | Type | What it does | DOM hooks | Endpoints | Storage & globals | Deps | Criticality | CMS |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `<!-- Open specific FAQ if it has been opened from a URL -->` | inline JS (jQuery ready) | If `?question_contain=<slug>` present, after 1000 ms clicks `#<slug>` (comment says 0.5 s). `question_contain` is also a Finsweet List filter param, so Finsweet filters the list AND the element is clicked. | `#<slug>` | – | URL `question_contain` | jQuery, Finsweet | MEDIUM | no |
| 2 | VIEW-ALL `<!-- Move View all into category list -->` | inline JS (jQuery ready) | Prepends `#view-all` into `#category-list`. | `#category-list`, `#view-all` | – | – | jQuery | LOW | no |
| 3 | FAQ-SCHEMA-LIST `<!-- Build schema for FAQs -->` | inline JS (IIFE) | Once (`window.__FAQ_SCHEMA_INIT__`): polls every 150 ms until the count of `[data-faq-question]` inside `#faq-schema-list` (hidden "Render All" list; document if absent) is >0 and unchanged for 1 s (hard stop 15 s), then injects a FAQPage JSON-LD (`script[data-faq-jsonld]`). Waits for Finsweet render, unlike FAQ-SCHEMA-MINI. | `#faq-schema-list`, `[data-faq-item]`, `[data-faq-question]`, `[data-faq-answer]`, injects `script[data-faq-jsonld]` | – | global `window.__FAQ_SCHEMA_INIT__` | – | MEDIUM (SEO) | no |
| 4 | DRAW-LINE | | | | | | | LOW | no |

## Blog (`blog`, `/blog`)

**Head:** canonical `https://www.carsa.co.uk/blog`; FS-ATTR (`fs-list`).
**Body:** 1 VIEW-ALL (LOW, `#category-list`, `#view-all`) · 2 DRAW-LINE (LOW).

## Blogs Template (`detail_blog`, `/blog/{slug}`)

**Head:** canonical `https://www.carsa.co.uk/blog/{{wf slug}}` (CMS: yes); FS-ATTR with `fs-toc fs-socialshare fs-copyclip fs-readtime` (table of contents, share buttons, copy-to-clipboard, read time; MEDIUM).
**Body:** 1 DRAW-SHAPE (LOW).

---

## 404 (`404`, `/404`)

No head code.

| # | Block | Type | What it does | DOM hooks | Endpoints | Storage | Deps | Criticality | CMS |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `<!-- Redirect to VSRP if VDP 404 -->` | inline JS (jQuery ready) | If `#404-message` exists and pathname contains `/vehicles/used/`, sets sessionStorage `from404Used='true'` and navigates to `/used-cars` (where the toast shows). | `#404-message` | – | sessionStorage `from404Used` (write) | jQuery | MEDIUM (redirect) | no |
| 2 | DRAW-SHAPE | | | | | | | LOW | no |

## Car Redirect (`car-redirect`, `/car-redirect`)

Head only.

| # | Block | Type | What it does | DOM hooks | Endpoints | Storage | Deps | Criticality | CMS |
|---|---|---|---|---|---|---|---|---|---|
| 1 | (no header) | inline JS (IIFE) | If `?vrm=` present, `location.replace('https://www.carsa.co.uk/vehicles/used/' + vrm.toLowerCase())`. No canonical, no fallback when vrm absent. | – | www.carsa.co.uk/vehicles/used/ | URL `vrm` | – | MEDIUM (redirect; entry point for external/QR links) | no |

## Payment Success / Payment Failure (`payment-success`, `payment-failure`, `/payments/*`)

Head only, identical on both: `<meta name="robots" content="noindex, nofollow">` (MEDIUM, SEO). No body code.

---

## Store pages: Find Your Store (`stores`, `/stores`), Locations Template (`detail_stores`, `/stores/{slug}`), Sell Locations Template (`detail_store`, `/sell-car/store/{slug}`), Service Locations Template (`detail_servicing-locations`, `/mot-and-car-servicing/servicing-locations/{slug}`), Store Locator (`store-locator`, `/mot-and-car-servicing/store-locator`)

**Head (all five share the same three blocks; canonical differs)**

| # | Block | Type | What it does | DOM hooks | Endpoints | Storage & globals | Deps | Criticality | CMS |
|---|---|---|---|---|---|---|---|---|---|
| a | canonical | link | stores: `https://www.carsa.co.uk/stores` · detail_stores: `https://www.carsa.co.uk/stores/{{wf slug}}` · detail_store: `https://www.carsa.co.uk/sell-car/store/{{wf slug}}` · detail_servicing-locations: `www.carsa.co.uk/mot-and-car-servicing/servicing-locations/{{wf slug}}` (**no scheme**) · store-locator: `www.carsa.co.uk/mot-and-car-servicing/store-locator` (**no scheme**) | – | – | – | – | MEDIUM | yes on the 3 templates |
| b | JETBOOST `<!-- Jestboost For Stores Map -->` | inline JS, `type="fs-consent"` essential | Sets `window.JETBOOST_SITE_ID="cmd4nmdvh00500kwz9p572n6n"` and injects cdn.jetboost.io/jetboost.js. Only runs if Finsweet Consent re-types it. | – | cdn.jetboost.io/jetboost.js | global `window.JETBOOST_SITE_ID` | Finsweet Consent, Jetboost | MEDIUM (store map / list features) | no |
| c | FS-ATTR (`fs-list`) | ext JS | | | cdn.jsdelivr.net | | | MEDIUM | no |
| d | MAPBOX-CSS | CSS | Strips Mapbox popup chrome; sets popup font to `var(--_typography---font-styles--heading)`. | `.mapboxgl-popup-content`, `.mapboxgl-popup` | – | – | Mapbox GL (loaded elsewhere) | LOW | no |
| e | OG-IMAGE (detail_stores only) | 3× meta | static Facebook post PNG 1200×630 | – | cdn.prod.website-files.com | – | – | MEDIUM | no |

**Body**

- `stores`, `store-locator`: no body code.
- `detail_store` and `detail_servicing-locations`: byte-identical bodies: 1 CHECK-FINANCE cdc2590a (CRITICAL) · 2 VALUATION-LINK (CRITICAL) · 3 EQUAL-HEIGHT-JQ (LOW; `$('[data-card-height="equal"]')` on window load/resize, outerHeight) · 4 DRAW-LINE (LOW).
- `detail_stores`: 1 CHECK-FINANCE cdc2590a (CRITICAL) · 2 EQUAL-HEIGHT-JQ (LOW) · 3 DRAW-LINE (LOW).

No CMS tokens in any of these bodies.

---

## Terms Pages Template (`detail_terms`, `/terms/{slug}`)

**Head:** OG-IMAGE only (no canonical). **Body:** DRAW-LINE only.

## Reviews (`reviews`, `/about/reviews`)

**Head:** canonical `https://www.carsa.co.uk/about/reviews`. **Body:** 1 VALUATION-LINK (CRITICAL) · 2 DRAW-LINE · 3 DRAW-SHAPE.

## Careers (`careers`, `/about/careers`)

**Head:** canonical `https://www.carsa.co.uk/about/careers`; a **second full copy of the VWO SmartCode** (preconnect + `#vwoCode` script, minified formatting, same account 1130895). The site-wide copy already runs; this one is a no-op because of the `window._vwo_code ||` guard, but it duplicates the `id="vwoCode"` element. MEDIUM, see Unclear.
**Body:** DRAW-LINE only (Group A body).

## Contact (`contact`, `/contact`)

**Head:** canonical `https://www.carsa.co.uk/contact`. **Body:** Group A (DRAW-LINE only).

## Group A: pages whose body is exactly one DRAW-LINE block (17 pages, byte-identical body hash 147b5f06)

500-deposit-on-us, car-extras, car-paint-interior-protection, careers, carsacover, contact, cosmetic-maintenance-plan, drive-away-car-insurance, electric-vehicle-cover, electric-vehicle-extended-warranty, extended-mechanical-warranty, mot-service-wolverhampton, overview, podpoint, shine-protect-alloy-wheel-protection, williams-ceramic-paint-protection (plus excluded our-team).

Head on each is a single canonical `<link>` (MEDIUM, no CMS tokens) except careers (VWO copy, above). Canonical values that are **malformed**:

- `500-deposit-on-us`: `www.carsa.co.uk/car-care/\n500-deposit-on-us` (no scheme, contains a line break, and points at `/car-care/500-deposit-on-us` although the page lives at `/500-deposit-on-us`).
- `drive-away-car-insurance`: `www.carsa.co.uk/car-care/drive-away-car-insurance` (no scheme).

All others are correct absolute `https://www.carsa.co.uk/<published path>` values.

## Group B: pages whose body is DRAW-LINE + DRAW-SHAPE only (byte-identical body hash 4d8e4c73)

car-preparation (`/about/car-preparation`), carsa (`/about/carsa`), gender-pay-gap-report-april-25 (`/about/gender-pay-gap-report-april-25`), tiktok (`/about/tiktok`) (plus excluded car-preparation-v2, static-template-slug-1749539540598).

Heads: single canonical each. `gender-pay-gap-report-april-25` canonical is `www.carsa.co.uk/about/gender-pay-gap-report-april-25` (**no scheme**). Others correct.

---

## Cross-page duplicates

| Block | Pages |
|---|---|
| DRAW-LINE (36 in-scope pages, 2 functionally identical hashes) | home, 500-deposit-on-us, car-preparation, careers, carsa, gender-pay-gap-report-april-25, reviews, tiktok, blog, car-extras, car-paint-interior-protection, carsacover, cosmetic-maintenance-plan, drive-away-car-insurance, electric-vehicle-cover, electric-vehicle-extended-warranty, extended-mechanical-warranty, mot-service-wolverhampton, overview, podpoint, shine-protect-alloy-wheel-protection, williams-ceramic-paint-protection, car-finance, contact, faq, detail_servicing-locations, reserve, part-exchange, detail_store, value-car, detail_stores, detail_terms, detail_fuel, models, detail_promotions, detail_used (380f49b5 variant). get-started carries a non-autoplay variant. |
| DRAW-SHAPE (14) | home, 404, car-preparation, carsa, gender-pay-gap-report-april-25, reviews, tiktok, detail_blog, car-finance, reserve, part-exchange, value-car, detail_fuel, detail_promotions |
| CHECK-FINANCE (13, three whitespace variants) | used-cars, detail_models, detail_near (0445f30d); car-finance-calculator, detail_servicing-locations, reserve, detail_store, detail_stores, deals, detail_fuel, detail_make, detail_promotions (cdc2590a); detail_used (58a461f9) |
| VALUATION-LINK (13) | home, reviews, detail_servicing-locations, part-exchange, detail_store, value-car, used-cars, deals, detail_fuel, detail_make, detail_models, detail_near, detail_used (9a863e27 variant) |
| PX-LINK-HOME (2) | home, detail_fuel. detail_used has PX-LINK-VDP (different URL: `get-px-valuation/{vrm}/` vs `value-my-car/enter-vrm`, and localStorage-only attribution). |
| EQUAL-HEIGHT-MO (4) / EQUAL-HEIGHT-JQ (3) | MO: home, car-finance-calculator, reserve, detail_used · JQ: detail_servicing-locations, detail_store, detail_stores |
| FAQ-SCHEMA-MINI (4) | car-finance, reserve, part-exchange, value-car (faq has the polling FAQ-SCHEMA-LIST variant; detail_models has the FAQ scrub) |
| VIEW-ALL (2) | blog, faq |
| MAKE-MODEL (2 variants) | home (a082f647, older), detail_near (3bdcd530, newer with prefill/facet/Any handling) |
| FS-ATTR `fs-list` (18) | home, blog, car-finance, car-finance-calculator, faq, detail_servicing-locations, store-locator, reserve, part-exchange, detail_store, value-car, detail_stores, stores, detail_fuel (+ `fs-toc` copy), models, detail_near, detail_promotions, detail_used. detail_blog: toc/socialshare/copyclip/readtime. |
| FS-INPUTACTIVE (2) | get-started, detail_used |
| JETBOOST + MAPBOX-CSS (5) | stores, detail_stores, detail_store, detail_servicing-locations, store-locator |
| VSRP-HEAD (4) | used-cars, deals, detail_make, detail_models |
| OG-IMAGE static PNG (3) | detail_stores, detail_terms, detail_models (detail_used uses CMS image) |
| VWO SmartCode (2) | site-head, careers head |
| Attribution readers (same `getAttributionParams` idiom, 5 flavours) | session-then-local: CHECK-FINANCE, VALUATION-LINK, PX-LINK-HOME · local-only + fallbacks: footer eligibility-UTM, VDP #1, VDP #7, VDP #10, VDP #16, get-started #2 |
| Identical whole-page bodies | Group A (17), Group B (4 in scope), deals = detail_make, detail_store = detail_servicing-locations, value-car = excluded sell-car |

---

## Unclear / needs Will's input

1. **VSRP widget script is not in custom code.** used-cars, deals, detail_make and detail_models preload `carsa-search.js` and load `carsa-search.css` from d2zblaqlrfk95e.cloudfront.net, but no `<script src=…carsa-search.js>` appears in any head/body capture. It must be an on-page Embed element (or injected by GTM). Which is it, and who owns that widget (search.carsa.co.uk)? Tests need to know whether it renders the car cards that CHECK-FINANCE / VALUATION-LINK hook into.
2. **Home make/model search on desktop.** MAKE-MODEL-HOME classifies `/` as `other`, so on desktop a make/model change only repopulates dropdowns and nothing in custom code redirects; only mobile `#mobile-search-submit` navigates. Is the desktop submit a native Webflow form GET to `/used-cars` (the `#search-submit:disabled{display:none}` rule suggests so)? Confirm the expected URL shape for a desktop search so the test can assert it.
3. **detail_near "Update Search buttons to add related location filters" is dead code.** The `filtered` array line is commented out, so `encoded` throws `ReferenceError` and `[data-button="search-locations"]` never gets its href. Was disabling this intentional (BCA/Prep/HQ/Storage filtering was the commented line)? Migrate as-is (broken) or fix?
4. **detail_used Radio CTA calls `svg.__svgDrawPlay`,** but the VDP's DRAW-LINE variant never sets it (only get-started's variant does). Is the squiggle-on-select animation on the VDP expected to work? Also `document.getElementById('cta-postcode').addEventListener` throws if `#cta-postcode` is absent, which would kill nothing else (end of handler) but is worth confirming the id exists on the live template.
5. **Duplicate VWO SmartCode on careers head.** Second copy of account 1130895 loader; guarded by `window._vwo_code ||` so it should be a no-op, but it creates a second `#vwoCode` element. Delete on migration, or keep because VWO support pasted it? Also: is VWO still in active use (it hides `body` for up to 2 s on every page)?
6. **Finsweet Consent gating.** Footer noreferrer, footer copyright year, and JETBOOST on 5 store pages are `type="fs-consent" fs-consent-categories="essential"`. No Finsweet Consent loader appears in any capture (it must be in the Webflow head via an Embed or in GTM). If Consent is no longer installed these three never execute. Confirm Consent is live and which loader/version.
7. **n8n "Caroline AI" chat.** Webhook `carsa.app.n8n.cloud/webhook/88d110ef-…/chat`. Does this count as lead capture (CRITICAL) for test purposes, and is the widget expected on every page including VDP/checkout-adjacent pages? Also the Slack/Impel/Acuity/Calltracks embeds referenced in the brief do not appear in any in-scope capture; only impel-test (dev) and testing-calltracks (archive, no code) exist. Acuity embed lives only in the repo (`acuity-embed.js`), not in Webflow custom code. Confirm they are out of scope.
8. **Malformed canonicals** (no `https://`, so browsers/Google resolve them relative to the page): 500-deposit-on-us (also has a line break and the wrong `/car-care/` path), drive-away-car-insurance, gender-pay-gap-report-april-25, car-finance-calculator, detail_servicing-locations, store-locator, detail_promotions. And `models` (`/used-cars/models`) canonicalises to `https://www.carsa.co.uk/all-models`, which is not a live path. Fix during migration or preserve byte-for-byte?
9. **Car finance calculator page uses a dummy vehicle** (`vrm MD74ZHJ`, reg 2025-01-22, mileage 7617) in the /quote payload. Presumably intentional (generic calculator), but confirm the API is fine with it and that tests should assert those literal values. The page also leaves ~15 `console.log` calls live.
10. **`requestUuid` on VDP is a fixed literal** `6319f553-726a-4e25-83e6-7b6fd792414a` on every quote, whereas the calculator page generates a random UUID. Does consumer-finance care?
11. **detail_used status "removed" handling** rewrites Product JSON-LD to SoldOut; is there any other "removed" behaviour (banner, redirect) expected that lives outside custom code?
12. **finance-config fetch reports to `window.DD_LOGS`.** No Datadog loader appears in custom code. Is Datadog RUM loaded via GTM, or is this dead?
13. **detail_fuel loads `@finsweet/attributes@2` twice** (once with `fs-list`, once with `fs-toc`). Finsweet v2 supports multiple solutions on one tag; is the double load intentional?
14. **Draft `sell-car` page (`/sell-car`)** carries the same body as value-car and is linked from the site nav path (`/sell-car/part-exchange`, `/sell-car/value-car` are children). It is excluded here because draft=true. Confirm `/sell-car` itself is meant to be unpublished.
15. **Two attribution read strategies coexist.** CHECK-FINANCE, VALUATION-LINK and PX-LINK-HOME prefer last-touch `attribution_session`; the footer eligibility rewrite, all VDP link builders, get-started and the hidden-form-field injector use first-touch `attribution` only. Is that the intended model (last-touch for card/valuation CTAs, first-touch for VDP/checkout CTAs), or drift to be unified?
16. **Hard-coded finance fallbacks** (APR 10.9 / 8.9 / 16.9, deposit £2,500, term 48, mileage 8,000) appear in three places (VDP config block, calculator page, and the site-wide JSON-LD description "from 8.9% APR"). Confirm these are the currently approved figures so tests assert the right numbers when the config endpoint is unreachable.
17. **Pages absent from the live sitemap:** `/about/tiktok`, `/get-started`, `/car-redirect`, `/payments/*`, `/mot-and-car-servicing`, `/mot-and-car-servicing/store-locator` are not in sitemap-live.xml (`/faq` is). Are they intentionally excluded (noindex) or missing?

---

## Critical-path summary

Each entry: page · block · what a granular test should assert.

1. **Site-wide head · GTM** — Every page: `window.dataLayer` exists, first entry has `event:'gtm.js'` and `gtm.start`; a request to `https://www.googletagmanager.com/gtm.js?id=GTM-MM5N6CP8` is made.
2. **Site-wide footer · Attribution saver** — Visit `/?utm_source=test&utm_medium=cpc` with external referrer `https://example.com/x`: sessionStorage `attribution_session` = `{utms:{utm_source:'test',utm_medium:'cpc'}, referrer:'https://example.com/x', referrerDomain:'example.com', updatedAt}`; localStorage `attribution` same plus `expiresAt ≈ now + 30d`. Second visit without UTMs: `attribution_session.utms = {}` (always overwritten) while localStorage `attribution` unchanged. Pre-seed localStorage with `{utms:{}, referrerDomain:'', expiresAt: future}` then visit with UTMs → localStorage upgraded. Pre-seed with `expiresAt` in the past → overwritten. Referrer from `www.carsa.co.uk` or `quote.carsa.co.uk` → `referrerDomain ''`.
3. **Site-wide footer · Add UTMs to Finance Eligibility links** — With localStorage `attribution` = `{utms:{utm_source:'a'}, referrerDomain:'bing.com'}`, after window load every `a[href*="quote.carsa.co.uk/eligibility/questions"]` href contains `utm_source=a&referrer=bing.com`; an href that already has `utm_source=z` keeps `z`. With empty storage and URL `?utm_campaign=c` → `utm_campaign=c` appended.
4. **used-cars, deals, detail_make, detail_models, detail_near, detail_fuel, detail_promotions, detail_stores, detail_store, detail_servicing-locations, reserve, car-finance-calculator, detail_used · CHECK-FINANCE** — Given a card `<a href="/vehicles/used/ab12cde" data-analytics-event="card"><span data-link="check-finance" vrm="AB12CDE">` and sessionStorage `attribution_session` = `{utms:{utm_source:'s'}, referrerDomain:'ref.com'}`: on `mouseover` of the span, anchor href = `https://quote.carsa.co.uk/eligibility/questions?vrm=AB12CDE&utm_source=s&referrer=ref.com`, `data-analytics-event="check-finance-car-card-click"`, `dataset.originalHref` = original; on `mouseout` href and analytics restored and dataset keys removed; on `click` without prior hover the swap happens before navigation. Session UTMs win over localStorage UTMs; with neither, external `document.referrer` domain is used; carsa.co.uk referrer ignored.
5. **home, reviews, part-exchange, value-car, used-cars, deals, detail_make, detail_models, detail_near, detail_fuel, detail_store, detail_servicing-locations, detail_used · VALUATION-LINK** — Form with `[name="vrm"]="ab12 cde"`, `[name="mileage"]=" 12000 "`, trigger `<a data-link="valuation">`: after `input`, href = `https://sellcar.carsa.co.uk/new-order?vrm=AB12CDE&mileage=12000` + attribution params (session→local→referrer as in #4) and `target=_blank`. Empty VRM → href unchanged / no open. Non-anchor trigger click → `window.open(url,'_blank','noopener')` and default prevented. Enter in any input of that form → prevented and the trigger is clicked/opened.
6. **home, detail_fuel · PX-LINK-HOME** — `#px-form-large [name="px-vrm"]="AB12CDE"`: `#px-button-large` href = `https://quote.carsa.co.uk/value-my-car/enter-vrm?px_vrm=AB12CDE` + attribution params (session→local→referrer), `target=_blank`; same for `-small`. Form submit and Enter are prevented and the button is clicked. Empty value → href untouched.
7. **detail_used · PX-LINK-VDP** — Same triggers; href = `https://quote.carsa.co.uk/get-px-valuation/<CMS name>/?px_vrm=AB12CDE` + params from localStorage `attribution` (utms + `referrer`), URL utm fallback, external document.referrer fallback. `attribution_session` is NOT consulted.
8. **detail_used · Add UTMs to Build Deal / Book / Eligibility links** — After window load every `a[href*="quote.carsa.co.uk/build-deal/"]`, `…/book/`, `…/eligibility/questions` has stored first-touch UTMs + `referrer` appended without overwriting existing keys.
9. **detail_used · Finance config** — `window.CARSA_FIN.cfg` initially equals the fallback object; a GET to `https://consumer-finance.carsanet.co.uk/finance-config` is made once; when it returns `{representativeApr: 9.9, aprByTier:{…}, defaultTerm: 60, defaultDepositAmount: 1000}` those keys overwrite cfg and `CARSA_FIN.ready` resolves; when it returns `representativeApr: 99` or non-JSON/500 the fallbacks remain and `console.error('finance-config fetch failed', …)` fires; when it hangs >3 s `ready` resolves with fallbacks. `depositFor(15000)` = cfg.defaultDepositAmount (2500 fallback); `depositFor(0)` still returns cfg value when present, else 0. `aprFor('excellent')`=8.9, `'very-good'`=10.9, `'fair'`=16.9, unknown → representativeApr. `setRadio(el)` leaves exactly one radio in the group with `checked` attr and its label with `is-active` (or `fs-inputactive-class` value).
10. **detail_used · Finance calculator** — On load (after ready) exactly one POST to `https://consumer-finance.carsanet.co.uk/quote` with body `{criteria:{annualMileage:<cfg.defaultAnnualMileage>, cashDeposit:<depositFor(price)> (customer box shows depositFor − contribution; contribution added back), outstandingFinance:0, pxEquity:0, term:<cfg.defaultTerm or 60 if finance-type HP>, apr:<aprFor('very-good')>}, vehicle:{mileage:<odometer>, price:<price>, registrationDate:'YYYY-MM-DD', type:'Car', vrm:'<name>'}, requestedBy:'manual', requestUuid:'6319f553-726a-4e25-83e6-7b6fd792414a'}`. `#finance-deposit` = `£2,500` (or £2,500 − contribution), `#deposit-contribution` readonly, `#finance-mileage` = "8000", term radio `#48` checked, apr radio `very-good` checked. With mocked response `{pcp:{payments:{regular:199.5}, term:48, residualValue:5000, totalAmountPayable:12000, totalCharges:1500, flatRate:5.25, excessMileage:'6p'}, hp:{payments:{regular:250.75}, term:48, totalAmountPayable:13000, totalCharges:2000, flatRate:5.5}}`: `#pcp-price`="£199.50", `#pcp-price-short`="£199", `#pcp-term`="48 monthly payments of", `#pcp-optional`="£5,000.00", `#pcp-total-amount-payable`="£12,000.00", `#pcp-interest-amount`="£1,500.00", `#pcp-fixed-rate`="5.3%", `#pcp-excess-mileage`="6p", `#hp-price`="£250.75", `#hp-price-short`="£250", `#hp-total-charges`=`#hp-interest-amount`="£2,000.00", `#hp-fixed-rate`="5.5%", `#hp-term`="48 monthly payments of"; `[data-number="term"]`="48", `contract-length`="49", `total-credit`= £(price − 2500), `deposit`="£2,500", `customer-deposit`, `deposit-contribution`; `#pcp-tab-link` clicked, `[data-element="pcp-available"]` visible, `pcp-error` hidden, scroll position unchanged. With `{pcp:{error:{code:'X'}}, hp:{…}}` → `#hp-tab-link` clicked, `pcp-error` shown. Typing `3000` in `#finance-deposit` repaints `customer-deposit`/`deposit` immediately and POSTs once after 1 s with cashDeposit 3000 (+contribution); blur reformats to `£3,000`; focus strips to `3000`. Changing term radio, apr radio, mileage select, or clicking `#finance-button` each POST once. Enter in those inputs does not submit the form.
11. **detail_used · Update APR** — Before config: every `[data-number="apr"]` shows `10.9` (with `%` preserved if it had one); leaf `.is-apr` text "Representative APR 12.9%" becomes "Representative APR 10.9%"; `.is-apr` elements with children are untouched. After config returns aprByTier.VeryGood 11.4 → repainted "11.4". Selecting apr radio `excellent` → "8.9".
12. **detail_used · Update Get Started link** — `[data-button="booking-options"]` href = `/get-started?vrm=<name lower>&location=<location:name URL-encoded>` and `&storage=true` appended only when `location:is-storage-location` is true.
13. **detail_used · Hidden fields (data-form="add-utms")** — On `/vehicles/used/ab12cde?utm_source=x&foo=1` with empty storage, each `form[data-form="add-utms"]` gets hidden inputs: `conversion_page="https://www.carsa.co.uk/vehicles/used/ab12cde?foo=1"`, `utm_source="x"`, `utm_medium=""`, `utm_campaign=""`, `utm_term=""`, `utm_content=""`, `referrer=""` (or external referrer domain). With localStorage `attribution.utms={utm_source:'s', utm_xyz:'q'}` → `utm_source='s'` and extra `utm_xyz='q'` input; running twice does not duplicate inputs.
14. **detail_used · Radio CTA** — On load `#reserve-test-drive` checked, its `.details_radio-field` has `.is-list-active`, postcode wrapper visible, `[data-button="cta-option"]` text "Reserve & test drive", href `https://quote.carsa.co.uk/book/<VRM upper>` + first-touch attribution, `data-analytics-event="test-drive-cta"`. Typing `sw1a 1aa` in `[data-field="postcode"]` → href gains `?postcode=SW1A1AA`. Selecting `#reserve-collect` → text "Reserve & collect", href `https://quote.carsa.co.uk/build-deal/<VRM>?skip_intro=` + attribution, event `build-deal-cta`, postcode wrapper animates closed. Enter in `#cta-postcode` navigates to the CTA href.
15. **car-finance-calculator · HP calculator** — On load: GET finance-config once; `#finance-car-price`="£10,000" (from its default value), `#total-price`="£10,000", `#finance-deposit`="£2,500", term `#48` checked, apr `very-good` checked, `[data-number="apr"]`="10.9"; one POST /quote with `criteria{annualMileage:8000, cashDeposit:2500, outstandingFinance:0, pxEquity:0, term:48, apr:10.9}`, `vehicle{mileage:7617, price:10000, registrationDate:'2025-01-22', type:'Car', vrm:'MD74ZHJ'}`, `requestedBy:'manual'`, random `requestUuid`. Mocked hp response `{hp:{payments:{regular:210.55}, totalAmountPayable:12633, totalCharges:2633, flatRate:6.25}}` → `#hp-price`="£210.55", `#hp-price-short`="£210", `#hp-total-amount-payable`="£12,633.00", `#hp-total-charges`="£2,633.00", `#hp-fixed-rate`="6.3%", `#hp-term`="48 monthly payments of", `[data-number="total-credit"]`="£7,500", `[data-number="deposit"]`="£2,500". Typing `15000` in price → immediate POST with price 15000 and `#total-price`="£15,000"; blur → "£15,000". Deposit input → POST after 800 ms. apr radio `fair` → `[data-number="apr"]`="16.9" and POST with apr 16.9. Enter suppressed.
16. **get-started · Populate page + booking link** — Visit `/get-started?vrm=ab12cde&location=Bristol&storage=true`: first form has hidden `input[name=vrm]="ab12cde"`, `[data-text="location"]`="Bristol", `[data-text="vrm"]`="ab12cde", `#free-test-drive` hidden, `#back-button` href `https://www.carsa.co.uk/vehicles/used/ab12cde` target `_self`, title "Get Started With AB12CDE | Carsa". Checking radio `#test-drive-free` → `#book-button` href `https://quote.carsa.co.uk/book/ab12cde` + first-touch attribution params, text "Book free test drive", `data-analytics-event="test-drive-free-submit"`, `target=_blank`, `.is-disabled` removed, `#reservation-note` opacity 0; `#reserve-test-drive` → same URL, "Reserve & book test drive", note opacity 1; `#reserve-collect` → `https://quote.carsa.co.uk/build-deal/ab12cde?skip_intro=` + params, "Reserve & collect", `reserve-collect-submit`. Without `storage` param `#free-test-drive` stays visible.

Medium blocks worth a smoke assertion because they change URLs users land on: footer promo-link rewrite (`/used-cars/deals?cars_sort_reduced-amount-true=desc&cars_promotion_equal=<text>`), car-redirect (`?vrm=AB12CDE` → `location.replace` to `/vehicles/used/ab12cde`), 404 → `/used-cars` with `from404Used`, detail_near location redirect (`/used-cars?cars_location_equal=["Bradford"]`), detail_near filter-form submit blocked, detail_fuel / detail_promotions / detail_used search-similar hrefs, faq `?question_contain` deep link, FAQ JSON-LD injection (`script[data-faq-jsonld]` with `@type FAQPage`), detail_used Product JSON-LD scrub (SoldOut when status removed).
