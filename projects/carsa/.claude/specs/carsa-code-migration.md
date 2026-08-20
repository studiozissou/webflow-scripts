# Carsa Code Migration to GitHub — v2

**Slug:** `carsa-code-migration`
**Client:** Carsa (Tomek Stacharski)
**Status:** Planning — approved approach, awaiting build
**Priority:** P1
**Created:** 2026-07-06 · **Revised:** 2026-08-20
**Supersedes:** v1 of this file (7 Jul, per-page tags first) and `github-migration.md` (7 Apr proposal)
**Related:** `carsa-vdp-script-externalisation.md`, `carsa-visual-regression.md`, `reports/vdp-externalisation-findings-2026-06-25.md`

## Summary

Move every piece of Carsa custom JavaScript out of Webflow and into `projects/carsa/` in `studiozissou/webflow-scripts`, served by jsDelivr pinned to commit SHAs. A single `init.js` in the site-wide **footer** owns a route map and loads one module per page type. Pages migrate one at a time (complex pages solo, others in batches of 2–3); each page is re-captured and diffed immediately before its swap, tested before and after, and can be rolled back with one edit. Refactoring happens last, inside the repo, behind the tests.

Performance is not the pitch. Cold-load LCP did not move when the VDP was externalised in June (+16ms, noise). The wins are version control, rollback, review, tests, cross-page caching on repeat visits, and an end to "hunt through Page Settings".

## Where we got to (audit, 20 Aug 2026)

| Date | What happened | Evidence |
|---|---|---|
| 7 Apr | Proposal written (4 phases, £1,000). Not sent in that form. | `specs/github-migration.md` |
| 25 Jun | VDP externalised to `vdp.js` on staging. 19 inline blocks → 1 file, 19 Playwright tests green, perf traces show no LCP change. Findings report: "pending live publish". | `vdp.js`, `carsa-vdp-script-externalisation.spec.js`, `audits/lighthouse/staging/` |
| 6–7 Jul | Spec v1 written. **Phase 0 capture complete**: 127 head/body files in `.claude/rollback/` incl. site head/footer. Homepage baseline tests (10). Visual-regression PoC. | `rollback/`, `carsa-code-migration.spec.js` |
| 7 Jul | Slack to Tomek: MCP can now read code blocks; Tomek: "yes please" to a new estimate. **Estimate drafts never sent** (blank numbers). | `slack/code-migration-estimate-for-tomek-2026-07-07.txt` |
| 5 Aug | Tomek: "All the VSRP are now served client side", AT prices now in CMS. SRP/VDP code has drifted since the 7 Jul snapshot. | Slack DM |
| 20 Aug | **Live VDP is back to inline.** 27 inline `<script>` blocks, no `__CARSA_VDP`, no `vdp.js` tag. Only `battery-animation.js` loads from CDN — from `@main`, unpinned. Same on staging. | `curl https://www.carsa.co.uk/vehicles/used/a26eta` |

Net: the repo side is ~40% done (capture, VDP file, test harness, loader pattern elsewhere in the monorepo). The Webflow side is at zero. Nothing has shipped to live.

## Decisions (20 Aug)

| # | Decision | Why |
|---|---|---|
| D1 | Scope is the whole site, all phases. | User choice. |
| D2 | Host everything in `studiozissou/webflow-scripts`, served by jsDelivr at pinned SHAs — **built portable from day one** so moving to Carsa's CloudFront (SST) later is a one-URL change. See *Portability* below. | `focalstrategy/carsa-website-support` is **private** → jsDelivr cannot serve it. Carsa already ships `carousel-embed` from `d1kcoelx4vkza6.cloudfront.net` via SST, so a handoff path exists when they want it. |
| D3 | Loader-first, in the site **footer**, not the head. | Webflow injects jQuery, `webflow.js` and GSAP at the end of `<body>` *before* footer custom code. `vdp.js` calls `$()` at top level; a head loader would throw and abort whole modules. The 8 existing footer scripts already rely on this order. |
| D4 | Re-capture and diff each page immediately before its swap; ask Tomek to freeze that page's embeds once it is on CDN. | Tomek edits embeds directly (APR hunt, 7 Jul). July snapshot is stale. |
| D5 | Complex pages (VDP, SRP, Deals) each get their own publish; medium/low pages go 2–3 per publish. | ~12 publishes instead of ~21, without bisecting headaches on the pages that matter. |
| D6 | Effort is framed as **Claude / Will / Tomek's side**, not hours. | Most steps are automatable; Will's cost is spot-checks and go/no-go calls. |
| D8 | Claude publishes staging **and** live via Webflow MCP. Will is the go/no-go gate before each live publish, not the clicker. | MCP publish is available in this setup. Live publishes are outward-facing, so they still wait for Will's explicit go. |
| D7 | `battery-animation.js` gets pinned to a SHA in the same publish as the loader. | Unpinned `@main` is a live regression vector and has no immutable caching. |

## Architecture

### Loader contract (`projects/carsa/init.js`)

Reuse `projects/the-signalling-company/init.js` and `projects/ready-hit-play-prod/init.js` for: `document.currentScript` base-URL derivation, commit-hash pinning, `loadScript()` promise helper, wave loading. New for Carsa: a route map and a dependency gate.

```
<!-- Webflow → Site settings → Custom code → Footer (before </body>) -->
<script src="https://cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@{SHA}/projects/carsa/init.js"></script>
```

- Derives `BASE` from its own `src` so every module loads from the same pinned SHA.
- Dependency gate: resolves when `window.jQuery` and `window.gsap` exist, bounded poll (≤3s) then proceeds anyway with `DEBUG` warning. Finsweet needs no gate (queue-push API).
- Route map: `pathname` → module list. Patterns, not paths, so new CMS items work automatically.
- Loads `global.js` on every route first, then page modules.
- `?local=1` or `localhost` host → loads from `http://localhost:8000/projects/carsa/` for dev.
- Unknown route → `global.js` only. A route with no inline code removed yet is simply absent from the map, so the loader is safe to ship before any page migrates.

| Route pattern | Modules |
|---|---|
| `*` | `global.js` |
| `/` | `homepage.js` |
| `/used-cars` | `srp.js` |
| `/used-cars/deals` | `deals.js` |
| `/vehicles/*` | `vdp.js` (includes battery animation) |
| `/car-finance-calculator` | `finance-calculator.js` |
| `/get-started` | `get-started.js` |
| `/part-exchange` | `part-exchange.js` |
| `/value-car` | `value-car.js` |
| `/faq` | `faq-index.js` |
| `/car-finance` | `car-finance.js` |
| `/all-models` | `all-models.js` |
| `/used-cars/model/*` | `models.js` |
| `/used-cars/make/*` | `makes.js` |
| `/used-cars/fuel/*` | `fuel.js` |
| `/used-cars/near/*` | `near.js` (fold in `near-location-redirect.js`) |
| `/blog/*` | `blog.js` |

Route paths for CMS collections must be confirmed against the live sitemap before build (Webflow forces the collection slug into the path — see MEMORY.md, Carsa URL structure).

### Module contract

- Plain classic scripts (not ES modules) so the 1:1 copies keep working unchanged. ES modules are a Phase 5 concern.
- One file per page type. Phase 1 files are byte-for-byte copies of the inline blocks with only the `<script>` wrappers removed and a one-sentence header.
- CMS-token pages keep a minimal inline config block in Webflow (`window.__CARSA_VDP`, `__CARSA_MODELS`, `__CARSA_MAKES`, `__CARSA_FUEL`, `__CARSA_NEAR`, `__CARSA_BLOG`). Pattern already built for VDP in `specs/vdp-webflow-body-code.html`. The module reads the global; it never contains `{{wf ...}}`.
- Pages needing a config block: VDP, Models, Makes, Fuel, Near, Blog, Promotions template. Pure swaps (no CMS tokens): Homepage, SRP, Deals, Finance Calculator, Get Started, Part Exchange, Value Car, FAQ, Car Finance, All Models.

### Portability (hosting can move with one URL change)

Rules every module and the loader follow from the first commit, so a handoff to Carsa's CloudFront — or anywhere — never requires touching code:

- **No absolute self-references.** `init.js` derives `BASE` from `document.currentScript.src`; modules never hard-code `cdn.jsdelivr.net`, `studiozissou` or a SHA. Assets a module needs (none today) would be resolved from `BASE` too.
- **Flat folder, no build.** `projects/carsa/*.js` is the deployable unit as-is. Copying the folder to another origin is the whole migration.
- **One place to change.** The footer tag URL is the only reference to the host. Switching hosts = change that tag, publish.
- **No jsDelivr-only features.** No `/combine/`, no `@latest`, no `.min` auto-minify paths. Plain files at plain paths.
- **Cache contract documented, not assumed.** Tests assert `immutable` on pinned URLs; the handoff note says what to do if the new host prefers revalidate (relax one test).
- **Repo-relative tests.** `STAGING_URL_CARSA` drives the suite; no test hard-codes the CDN host beyond the loader-pinning assertion, which is a single regex constant (`LOADER_RE`) to update.
- `projects/carsa/README.md` (to be written in Phase 1) carries the route map, the contract above, and the three-step "move hosts" procedure from the engineer handoff note.

### Pinning and publishing

- Every Webflow publish references exactly one SHA, in one place (the footer tag). Adding or changing a module = bump that SHA in site settings and publish. The bump rides along with the page's inline-removal publish, so no extra cycle.
- jsDelivr serves pinned commits with `cache-control: public, max-age=31536000, immutable`. Old SHAs never disappear, which is the rollback mechanism.
- Never reference `@main` from Webflow.

### Drift check (before every swap, and weekly after)

1. Pull the page's current head + body via Webflow MCP (`data_scripts_tool`, as Phase 0 did; see `rollback/parse-rollback.py`).
2. Save as `rollback/{slug}-{head,body}.YYYY-MM-DD.html`.
3. `diff` against the previous capture. Any change → fold into the module before swapping, and note it in the commit.
4. After a page is live on CDN, the check should show an *empty* body code (or config block only). Anything else means someone re-pasted inline code; flag to Tomek, do not overwrite.

Claude runs this; the only manual part is reading a non-empty diff.

## Phases and task breakdown

Legend — **C** Claude (MCP incl. staging/live publish, git, Playwright, file writing) · **W** Will (go/no-go, judgment, real-device checks) · **T** Tomek / Carsa side.

### Phase 0 — Re-capture and reconcile (no site changes)

| # | Task | Who | Notes |
|---|---|---|---|
| 0.1 | Re-pull site head/footer + all page head/body via MCP; save dated copies | C | Needs Webflow MCP connected to Carsa in the session |
| 0.2 | Diff against 7 Jul snapshot; list every page that changed | C | Expect SRP/VDP/AT-price changes |
| 0.3 | Prune the page list: drop drafts/backups (`home-autumn-deals`, `srp-backup`, `part-ex-dnu`, `search-demo`, etc.) — confirm with live sitemap | C, W confirms | Cruft in `rollback/` would otherwise become dead modules |
| 0.4 | Diff existing repo files (`vdp.js`, `homepage.js`, `check-finance.js`, `near-location-redirect.js`, `menu-scroll-lock.js`, `faq-scrub.js`, `make-model*.js`) against fresh captures; mark each as current / stale / unused | C | `make-model.old.js` and empty `global.js` look like abandoned attempts |
| 0.5 | Confirm CMS route paths against sitemap | C | |

**Checkpoint:** fresh, pruned, diffed snapshot. Nothing changed on site.

### Phase 1 — Loader + site-wide scripts (publish 1)

| # | Task | Who |
|---|---|---|
| 1.1 | Write `init.js` (route map, dep gate, base URL, local switch) | C |
| 1.2 | Write `global.js` = the 8 footer scripts, 1:1 (model/promo links, store-list prepend, attribution saver, finance UTM appender, noopener, copyright year, menu scroll lock, n8n chat). Slider CSS stays in Webflow. | C |
| 1.3 | Acceptance tests: loader 200 + pinned, `global.js` loaded once, footer behaviours present on 3 page types, zero console errors, no double-init | C |
| 1.4 | Run tests against live as baseline (inline still in place) → green | C |
| 1.5 | Replace the 8 footer blocks with the loader tag via MCP `set_site_freeform_code`; pin `battery-animation.js` SHA on the VDP body code; write `projects/carsa/README.md` | C |
| 1.6 | Publish to **staging** via MCP | C |
| 1.7 | Run tests against `carsa-v2.webflow.io`; spot-check menu, chat widget, UTM storage | C tests, **W** feel-check |
| 1.8 | Go/no-go | **W** |
| 1.9 | Publish **live** via MCP; re-run tests against live; drift check shows footer = loader tag only | C |

**Checkpoint:** every page now loads `init.js` + `global.js` from cache on repeat visits. Zero per-page changes yet.

### Phase 2 — Page migration (publishes 2–12)

Per page (or batch) loop — the same 9 steps every time:

| Step | Who |
|---|---|
| a. Drift check (pull, diff, fold changes) | C |
| b. Write module file (1:1), add route to `init.js`, commit | C |
| c. Write page tests from the inline code: selectors it touches, links it builds, globals it sets, storage it writes, JSON-LD it emits | C |
| d. Run tests against live (inline) → baseline green | C |
| e. Via MCP: remove inline blocks from page body (leave config block if CMS page); bump footer SHA | C |
| f. Publish staging (MCP) → tests → Will spot-checks → Will says go → publish live (MCP) | C publishes and tests; **W** spot-checks and gives the go |
| g. Re-run tests against live | C |
| h. Ask Tomek not to edit that page's embeds again | **T** |
| i. Tag commit `carsa-migration/{page}` | C |

Order and batching (complex solo, others 2–3 per publish):

| Publish | Pages | Why here |
|---|---|---|
| 2 | VDP (redo) | Agreed with Tomek; module and 19 tests exist, need re-diff |
| 3 | SRP | Agreed with Tomek; changed in Aug |
| 4 | Deals | Differs from SRP by ~970 lines — own module, own publish |
| 5 | Homepage | `homepage.js` + 10 tests exist, re-diff |
| 6 | Finance Calculator + Get Started | |
| 7 | Part Exchange + Value Car + Car Finance | Share FAQ-schema and draw-line code |
| 8 | FAQ Index + All Models | FAQ has an 83KB inline JSON-LD — decide whether it moves or stays (SEO: keep inline) |
| 9 | Models + Makes templates | Config blocks; 5 sample slugs each |
| 10 | Fuel + Near templates | Near folds in `near-location-redirect.js` |
| 11 | Blog + Promotions templates | |
| 12 | Sweep: 24 global-only pages verified by one batched test | C |

CMS templates: one swap per template (the template page, not per item); the 5 sample slugs are *verification* targets, not separate swaps.

**Checkpoint:** zero inline JS in Webflow except config blocks, GTM/VWO/JSON-LD in the head, third-party tags.

### Phase 3 — Modularise (repo only, no Designer edits)

Extract the six duplicated helpers into shared files loaded by `init.js` before page modules: `attribution.js` (6 variants today), `svg-animations.js`, `utils.js` (equal-height, copyright, noopener), `valuation.js`, `check-finance.js` (exists), `faq-schema.js`. Each extraction = one commit, tests green before and after, one SHA bump + publish per 2–3 extractions.

| Who | What |
|---|---|
| C | All extraction, tests, commits, SHA bumps, staging + live publishes (~3) |
| W | Go/no-go per publish |

### Phase 4 — Refactor (repo only)

Per module: fix the known VDP issues (hardcoded `requestUuid`, unthrottled MutationObserver, two `formatCurrency`s), `DEBUG &&` logging, `prefers-reduced-motion`, ES2022 syntax, unit tests where logic is pure (URL builders, formatters). jQuery removal is **optional** — Webflow ships jQuery regardless, so it saves nothing; do it only for clarity where a module is being touched anyway.

### Phase 5 — Engineer handoff (optional, any time after Phase 1)

Because of the portability rules, this is not really a phase: copy `projects/carsa/` into Carsa's repo, serve it from their SST/CloudFront stack, change the footer tag URL, publish. See `comms/code-migration-engineer-handoff-2026-08-20.md`. Can happen whenever Tomek wants it, without pausing the migration.

## What is automatable vs manual

| Activity | Automatable | Manual |
|---|---|---|
| Capture inline code, save rollback, diff | ✅ MCP + git | |
| Write modules (1:1 copy), loader, config blocks | ✅ | |
| Write and run Playwright tests (presence, links, storage, console, schema shape, cache headers) | ✅ | |
| Remove inline code / set footer tag in Webflow | ✅ MCP `set_*_freeform_code` | |
| Publish staging | ✅ MCP | |
| Publish live | ✅ MCP, after Will's go | ✅ Will — go/no-go only |
| Finance calculator numbers, PX/valuation form submit, make→model redirect | | ✅ Will — hits live APIs / creates leads |
| Safari, Firefox, real iOS/Android | | ✅ Will — Playwright runs Chromium |
| Menu/chat/animation feel | | ✅ Will |
| Code freeze per page | | ✅ Tomek |
| Daily regression + Slack alert (visual suite) | ✅ once CI exists | CI secrets/webhook setup — Will, once |

Rule of thumb: every page costs Will ~10 minutes clicking through the page's interactions on staging and one "go". Everything else — capture, code, tests, Webflow edits, both publishes, post-publish verification — is Claude.

## Rollback

- Per page: restore `rollback/{slug}-body.html` via MCP, publish. One command: "roll back {page}".
- Whole site: set footer tag back to the previous SHA, publish. Old SHAs are immutable on jsDelivr.
- Before Phase 1 publishes live, `rollback/site-footer.html` (7 Jul) plus its dated re-capture are the restore points.
- Every page swap is one commit and one tag; no force pushes.

## Architectural decisions needing an ADR

1. **Footer loader with dependency gate** (D3) — record because the July spec and TSC/RHP loaders differ on placement and gating; future projects should inherit the footer-plus-gate rule for Webflow sites that depend on platform-injected jQuery/GSAP.
2. **Classic scripts now, ES modules later** — record so nobody converts to `type="module"` mid-migration and breaks the 1:1 guarantee.

Both are small; run `/plan` for each before `/build` Phase 1 (`/architect` is deprecated).

## Barba Impact

N/A — no Barba transitions on Carsa.

## Parallelisation Map

| Stream | Tasks | Agent | Depends on | Parallel? |
|---|---|---|---|---|
| S1 Capture | 0.1–0.5 | code-writer (MCP) | Webflow MCP connected | Sequential, one session |
| S2 Loader | 1.1, 1.2 | code-writer | S1 | Can start from July snapshot while S1 runs; reconcile after |
| S3 Loader tests | 1.3 | qa | 1.2 | Parallel with 1.2 after the footer script list is fixed |
| S4 Page modules | 2.b per page | code-writer | Phase 1 live | Modules for several pages can be written in parallel in worktrees; **swaps are sequential** (one publish at a time) |
| S5 Page tests | 2.c per page | qa | 2.b | Parallel with S4 per page |
| S6 Visual-regression CI | `carsa-visual-regression` spec | code-writer + qa | none | Fully independent of this spec; can run alongside |

Recommendation: worktrees yes for S4/S5 (one per page); agent teams no; publishes strictly sequential and gated on Will.

## Test Plan

### Tier 1 — Auto: Playwright local (`tests/acceptance/carsa-code-migration.spec.js`)

Runs against `STAGING_URL_CARSA` (default `https://www.carsa.co.uk`). Already present: 10 homepage tests. Added in this revision:

| Test | Checks |
|---|---|
| `loader-present-and-pinned` | Footer tag points at `cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@{40-hex or 7-hex}/projects/carsa/init.js`, never `@main` |
| `loader-returns-200-immutable` | `init.js` response 200 with `immutable` cache-control |
| `global-loaded-once` | Exactly one `global.js` script element after load, on `/`, `/used-cars`, a VDP |
| `global-copyright-year` | Footer year element shows current year |
| `global-noopener` | Every external `a[target=_blank]` has `rel` containing `noopener` |
| `global-attribution-storage` | Visiting with `?utm_source=test` writes the attribution keys to `localStorage` |
| `global-menu-scroll-lock` | Opening `.w-nav-button` toggles body scroll lock class |
| `global-chat-widget` | n8n chat root mounts within 5s |
| `no-inline-footer-scripts` | After Phase 1: zero `<script>` blocks between the Webflow runtime bundle and `init.js` (guards against re-paste) |
| `srp-no-errors`, `srp-results-counter`, `srp-mobile-filter-toggle`, `srp-vrm-sanitiser`, `srp-valuation-link`, `srp-check-finance-hover` | SRP baseline before/after swap |
| `deals-no-errors`, `deals-promo-cards` | Deals baseline |
| `vdp-*` | Delegated to `carsa-vdp-script-externalisation.spec.js` (19 tests) — re-run unchanged |
| `{page}-no-errors`, `{page}-inline-removed` | Generic pair added per page as it migrates |

Pre-swap these run against inline code and must be green (baseline); post-swap they must stay green.

### Tier 2 — Auto: CDN regression

Registered in `tests/registry.json` as `carsa-code-migration`. `/deploy` runs it after each SHA bump. `carsa-vdp-script-externalisation`, `carsa-near-location-redirect` and `carsa-visual-regression` entries must also stay green.

### Tier 3 — Manual

| Check | Why manual |
|---|---|
| Make → model dropdown redirect lands on filtered SRP | Real Finsweet interaction + navigation |
| Finance calculator numbers match inline version | Live call to `api.carsa.co.uk` |
| PX / valuation form reaches `quote.` / `sellcar.carsa.co.uk` with UTMs | Would create real leads |
| Chat widget opens, menu lock feels right, SVG draw timing | Subjective |
| Safari, Firefox, iOS Safari, Android Chrome | Playwright is Chromium-only |
| Tomek confirms no-one re-pastes inline code on migrated pages | Human process |

## Verify Loop

### Pass/fail criteria

Phase 1 (loader) passes when, on live, all of:
1. `document.querySelector('script[src*="/projects/carsa/init.js"]')` exists and its `src` contains `@` followed by a hex SHA, not `main`.
2. `init.js` and `global.js` return 200 with `cache-control` containing `immutable`.
3. Zero `pageerror` events on `/`, `/used-cars`, one `/vehicles/*`, one `/used-cars/near/*`.
4. Footer behaviours observable: year element = current year; all external `_blank` links have `noopener`; `localStorage` attribution keys set after a `?utm_source=` visit; chat root mounted.
5. Site footer custom code (via MCP) contains only the loader tag and the slider CSS.

Each page in Phase 2 passes when:
1. Page body custom code is empty or contains only its `window.__CARSA_*` config block.
2. The page's module loads once (`script[src*="/{module}.js"]` count = 1) and the route did not load on an unrelated page.
3. Zero `pageerror` events.
4. All page-specific Tier 1 tests that were green pre-swap are green post-swap.
5. Drift check 24h later still shows the body code empty.

### Reproduction steps (Phase 1 on staging)

1. Open `https://carsa-v2.webflow.io/` with DevTools Network tab.
2. Confirm `init.js` then `global.js` load after `webflow.*.js` and the GSAP files; both from `cdn.jsdelivr.net`.
3. Reload — both show "(disk cache)" / 0 B transferred.
4. Open the mobile menu at 375px; body should not scroll behind it.
5. Scroll to footer: year is current; open the chat bubble.
6. Visit `/?utm_source=verify&utm_medium=test`, then Application → Local Storage: attribution keys present.
7. Navigate to `/used-cars` and a VDP: no console errors, `global.js` not re-requested.

### Tier mapping

- Criteria 1–4 (Phase 1) and 1–4 (per page): Tier 1 tests above, also run as Tier 2 post-deploy.
- Criterion 5 (drift): Claude via MCP, scheduled weekly; reported, not asserted.
- Redirect flow, calculator values, form submission, cross-browser, feel: Tier 3.

### Regression scope

- Third-party tags untouched: GTM, VWO, GA4, Mixpanel, Calltracks, Trustpilot, Finsweet, GSAP, jQuery, carousel-embed (`d1kcoelx4vkza6.cloudfront.net/bundle.js`).
- Site-head JSON-LD and the 29 schema embeds in `projects/carsa/schema/` untouched.
- FAQ page's 83KB JSON-LD stays inline (SEO) unless decided otherwise.
- Pages not yet migrated must behave identically after each publish — the generic `{page}-no-errors` sweep covers them.
- Existing specs stay green: `carsa-vdp-script-externalisation`, `carsa-near-location-redirect`, `carsa-service-migration`, `carsa-visual-regression`.

## Acceptance Tests

Machine-runnable: `tests/acceptance/carsa-code-migration.spec.js`. Names as listed in Tier 1. Do not run until `/build`; Phase 1 baseline run happens against live with inline code still in place.

## Open questions

1. Does the FAQ page's 83KB inline JSON-LD move to a module (smaller HTML) or stay inline (Google reads inline JSON-LD most reliably)? Default: stays.
2. Which five sample slugs per CMS template? Pick at Phase 2 from the sitemap; include one sold/reserved VDP and one EV.
3. ~~Can the Webflow MCP publish?~~ Resolved 20 Aug: yes, staging and live (D8).
4. Does Tomek want the engineer handoff at all, or is jsDelivr from our repo acceptable long-term? Either works; portability rules make it a non-blocking question.

## Agents

`code-writer` (modules, loader, MCP edits and publishes), `qa` (tests, verify loop), `perf` (optional: confirm cache behaviour post-Phase 1), `pm` (queue entries if wanted later). ADRs via `/plan`.
