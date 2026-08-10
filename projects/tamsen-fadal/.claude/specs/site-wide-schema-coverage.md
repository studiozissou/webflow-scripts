# Site-wide schema coverage — tamsenfadal.com

**Slug:** `site-wide-schema-coverage`
**Client:** Tamsen Fadal
**Status:** Ready to Build
**Created:** 2026-08-06
**Parent work:** Item 2 of the approved SEO entity scope (2h / $260)

---

## Problem

Only **4 of 25 page templates** emit any JSON-LD. 21 templates covering **130 sitemap
pages** emit nothing at all. SEMrush independently reports **409 of 833 crawled pages
with no structured data items**.

Of the four that do emit something, two are wrong in ways that actively work against
the branded-search goal:

- `/blog/*` (250 pages) emits `BlogPosting` with an **inline** `Person` author instead of
  a reference to the site's `#person` node. Google therefore sees an unconnected
  "Tamsen Fadal" on 250 pages. This is the largest single source of entity
  fragmentation on the site.
- `/podcast` emits `PodcastSeries` citing an Apple Podcasts URL that **404s**, crediting
  the wrong guest on one episode, and self-asserting an `aggregateRating`.

The site-wide entity graph (`WebSite` / `Organization` / `Person`) exists on the
**homepage only**, so no other page can resolve an `@id` reference.

## Goal

Every content page emits valid JSON-LD that resolves to a **single** entity graph, so
Google and AI-search crawlers see one Tamsen Fadal, one publisher, one website.

---

## Research summary

### Coverage map (generated, `tools/entity-audit/schema-coverage.js`)

| Template | Pages | Current schema | Action |
| --- | ---: | --- | --- |
| `/blog/*` | 250 | `BlogPosting` (inline Person) | **Replace** |
| `/podcast/*` | 100 | none | **Add** |
| `/menopause-education-hub/*` | 16 | `WebPage` (no entity link) | **Upgrade** |
| `/shop/*` | 11 | none | **Add** |
| `/` | 1 | `Organization`,`Person`,`WebPage`,`WebSite` | **Move to site head** |
| `/podcast` | 1 | `PodcastSeries` (broken) | **Replace** |
| 18 standalone pages | 18 | none | **Add** |
| `/book-how-to-menopause/*` | 1 | none | **Add** |
| `/menopause-support-provider-directory/*` | 1 | none | **Add** |

### Constraints discovered

1. **Schema belongs in HEAD code**, not footer — confirmed by the client. Site-wide
   graph goes in **site head**; per-page schema in that **page's head**.
2. **`set_page_freeform_code` REPLACES the entire box.** The About page head already
   holds a canonical tag and Swiper CSS; the site head holds `google-site-verification`,
   GTM, and Finsweet. Every write MUST be **read → append → write** or working code is
   destroyed. This is the single biggest risk in the build.
3. **Pages have a first-class `jsonLdSchema` field.** Corrected during the build — an
   earlier assumption that the homepage graph lived in an in-canvas HTML Embed was
   wrong. Webflow exposes a dedicated per-page structured-data field, readable via
   `query_pages_schema_markup` and writable via `bulk_update_pages_schema_markup`.
   This is strictly better than page head code: it is a dedicated field, so there is no
   read-append-write risk, and many pages can be set in a single call.
   → **Static pages: write the `jsonLdSchema` field via MCP, in bulk.**

3b. **CMS collections have no schema field.** Checked field by field on Blogs, Podcast
   Episodes, Events, Education Hub Resources and Shop Collections — none has one. CMS
   *template* schema therefore still needs Webflow's escaped dynamic-field bindings
   (`+{{field}}`), which cannot be written through the API.
   → **CMS templates are delivered as files for manual paste.**
4. **Adding code ≠ publishing.** Approved sequence: add via MCP → publish → test.
5. Webflow serves fully rendered HTML, so static blocks are visible to all crawlers
   including SEMrush (JS rendering is DISABLED on their crawl) and AI-search bots.

### Reusable code

| File | Use |
| --- | --- |
| `tools/entity-audit/lib/extract.js` | `extractJsonLd`, `jsonLdTypes` — detection |
| `tools/entity-audit/validate-schema.js` | JSON, required-property, cross-file `@id` checks |
| `tools/entity-audit/gen-page-schema.js` | generates static blocks from live titles/meta |
| `tools/entity-audit/schema-coverage.js` | coverage map; re-run to verify progress |
| `tools/entity-audit/build-test-payload.js` | assembles Rich Results Test payloads |
| `projects/tamsen-fadal/schema/*.html` | already-built, already-validated blocks |

---

## Approach

**Static blocks generated from a repo config** (chosen over runtime JS injection and
per-item CMS fields).

Source of truth is this repo. A generator emits static `<script type="application/ld+json">`
blocks. Static pages are written via Webflow MCP; CMS templates are handed over as files
because they need `+{{field}}` bindings the API cannot express.

Rejected:
- **Runtime JS injection** — one file, but injected client-side. SEMrush's crawl has JS
  rendering disabled and most AI-search bots don't execute JS, so it would undercut the
  exact AEO/entity goal this work exists to serve.
- **Per-item CMS fields** — 350+ items to populate by hand, editors hand-writing JSON,
  no validation before publish.

### Entity graph shape

One graph, defined once in site head, referenced everywhere by `@id`:

```
https://www.tamsenfadal.com/#website    WebSite
https://www.tamsenfadal.com/#publisher  Organization (Take Flight Productions LLC)
https://www.tamsenfadal.com/#person     Person (Tamsen Fadal)
```

Every page-level node references those `@id`s rather than redefining them.

> **Person `description` is out of scope.** It is gated on the approved bio. The existing
> live description carries over untouched; swap it in site head when the bio lands and it
> updates everywhere at once.

---

## Scope

**In:** all 21 content templates + site-wide graph + fixing the 3 broken/weak existing blocks.
**Out:** 404, 401, checkout, PayPal checkout, order confirmation, style guide — no search
value, and several are noindex.
**Out:** Person `description` rewrite (bio-gated).

---

## Tasks

| # | Task | Delivery | Agent | Depends on |
| --- | --- | --- | --- | --- |
| 1 | Site-wide graph → site head code | MCP | schema | — |
| 2 | Remove now-duplicated graph from homepage head | MCP | schema | 1 |
| 3 | 18 standalone pages → page head | MCP | schema | 1 |
| 4 | About → ProfilePage | MCP | schema | 1 |
| 5 | Book → Book | MCP | schema | 1 |
| 6 | Podcast listing → corrected PodcastSeries | MCP | schema | 1 |
| 7 | `/podcast/*` template → PodcastEpisode | **file, manual paste** | schema | 1 |
| 8 | `/blog/*` template → replace BlogPosting | **file, manual paste** | schema | 1 |
| 9 | `/menopause-education-hub/*` → upgrade WebPage | **file, manual paste** | schema | 1 |
| 10 | `/shop/*` → Product/CollectionPage | **file, manual paste** | schema | 1 |
| 11 | Events template → Event | **file, manual paste** | schema | 1 |
| 12 | Audit 423 REVIEW_SNIPPET items, strip self-serving | MCP + file | seo | — |
| 13 | Publish + validate each page | MCP + chrome | qa | all |

### Parallelisation map

**Stream A (sequential, gates everything):** Task 1 → 2. The site graph must exist before
any `@id` reference resolves.

**Stream B (parallel after 1):** Tasks 3–6 — independent MCP page writes, no shared state.
~4 pages per batch. Est. 20 min.

**Stream C (parallel after 1):** Tasks 7–11 — file generation only, no API calls, fully
independent of Stream B. Est. 25 min.

**Stream D (independent, can start now):** Task 12 — review-snippet audit touches nothing
Streams A–C touch.

**Recommendation:** sequential for Stream A, then B ∥ C ∥ D. **No worktrees** — Stream B
mutates Webflow (external state, not files) and Stream C writes to distinct files, so
there is no file contention. **No agent teams** — the work is I/O-bound MCP calls, not
reasoning-heavy.

### ADR needed?

No. The delivery-mechanism decision (static vs runtime vs CMS field) is recorded in this
spec's Approach section, which is sufficient — it changes no shared architecture and sets
no precedent beyond this project's schema work.

---

## Barba impact

**N/A — no Barba transitions.** The tamsen-fadal project is a standard multi-page Webflow
site with no SPA routing. Schema is static markup in `<head>`, injected at build time by
Webflow, with no JS lifecycle, listeners, or timelines to init or destroy.

---

## Verify loop

### Pass / fail criteria

A page passes when **all** hold:

1. `document.querySelectorAll('script[type="application/ld+json"]').length >= 1`
2. Every block `JSON.parse`s without throwing
3. The parsed graph contains at least one `@type` appropriate to the page
   (e.g. `Book` on `/book-how-to-menopause`, `PodcastEpisode` on `/podcast/*`)
4. Every `{"@id": "..."}` reference resolves to a node defined in the site-wide graph
5. **No page emits more than one node with the same `@id`** (catches the
   homepage-duplication risk from Task 2)
6. Pre-existing head content still present — canonical tag, `google-site-verification`,
   GTM container `GTM-WFRDD6ZD` (catches the read-append-write failure)
7. Google Rich Results Test reports **0 errors**
8. No new console errors on the page

### Reproduction steps

```
1. node tools/entity-audit/schema-coverage.js
   → every content template shows blocks >= 1
2. node tools/entity-audit/validate-schema.js projects/tamsen-fadal/schema/*.html
   → 0 errors, 0 warnings, all @id references resolve
3. npx playwright test tests/acceptance/site-wide-schema-coverage.spec.js
4. Rich Results Test (code mode) per template via build-test-payload.js
```

Wait conditions: Webflow publish propagates in ~30–60s. Allow 60s after publish before
re-testing, or the crawl returns the pre-publish HTML.

### Tier mapping

**Tier 1 — Playwright local** (`tests/acceptance/site-wide-schema-coverage.spec.js`):
- `site-wide graph present on every sampled page`
- `all JSON-LD blocks parse`
- `all @id references resolve`
- `no duplicate @id across blocks`
- `pre-existing head code preserved`
- `page-appropriate @type present`
- `no console errors`

**Tier 2 — CDN regression:** registered in `tests/registry.json` as
`site-wide-schema-coverage`; runs on `/deploy`.

**Tier 3 — Manual:**
- **Rich Results Test per template** — Google's validator is a rate-limited external
  service behind reCAPTCHA; cannot be reliably scripted in CI.
- **CMS template paste** — Webflow's `+{{field}}` bindings are inserted through the
  Designer UI and cannot be written through the API.
- **Knowledge Panel / SERP effect** — propagation takes days to weeks; not observable in
  a test run.

### Regression scope

Must NOT break:
- **Existing head code on every page touched** — canonical tags, GTM, Finsweet, Swiper
  CSS, per-page styles. This is the highest-risk regression; mitigated by read-append-write
  and asserted in Tier 1.
- The homepage's existing entity graph — removed only after the site-wide one is live
  (Task 2 depends on Task 1), so there is never a window with zero graph.
- Form tracking, theme footer links, accessibility widget in site footer code — untouched,
  but site-level writes must preserve them.
- Existing `tf-newsletter` and `tf-contact` acceptance tests must still pass.

---

## Acceptance tests

Test infra: Playwright present in `devDependencies`; no `.env.test` — existing Tamsen
specs hard-code the production URL, so this spec follows that convention.

| Test | Asserts |
| --- | --- |
| `site-wide entity graph is present` | `#website`, `#publisher`, `#person` all defined |
| `all JSON-LD blocks parse` | no `JSON.parse` throw on any block |
| `all @id references resolve` | every bare `{"@id"}` matches a defined node |
| `no duplicate @id definitions` | catches homepage double-graph |
| `page-appropriate type present` | per-page `@type` expectation |
| `pre-existing head code preserved` | canonical + GTM still in head |
| `no console errors` | clean console on every sampled page |

---

## Open questions / blockers

| Item | Status |
| --- | --- |
| Person `description` | **Blocked** — approved bio |
| CMS template pastes (tasks 7–11) | Manual step by client |
| 423 REVIEW_SNIPPET source | Unknown until task 12 audit runs |
| `/shop/*` — Product vs CollectionPage | Needs a look at what the shop items actually are (affiliate links vs owned products) — affects whether `Offer`/price is honest |
