# Carsa Service Site Migration

**Slug:** `carsa-service-migration`
**Client:** Carsa
**Status:** Ready to Build — blocked on Task 0
**Priority:** P1
**Created:** 2026-06-30
**Updated:** 2026-07-09 (v2 — added live-site crawl findings, automation map, decision log)
**Source:** Meeting notes — Rishi Patel / Will Morley, 29 June 2026

> **v2 revision note.** The original spec was written from meeting notes without
> crawling the source site. A full crawl on 2026-07-09 surfaced content defects,
> a missing Storepoint dependency, and an unowned decision about the store
> locator. The build mechanism was also re-scoped: Relume MCP and Claude Design
> were both evaluated and rejected (see Decision Log). Sections added in v2:
> Decision Log, Prerequisites, Source-Site Defects, Automation Map.

## Summary

Migrate all content from `service.carsa.co.uk` (8 pages) to the main `carsa.co.uk` Webflow site. Use existing design system and section patterns. Brand as Carsa-primary, HiQ-secondary ("in partnership with HiQ"), designed for easy HiQ removal within ~6 months.

Acuity scheduling embeds stay for now (Phase 1). Vehicle-aware booking flow (AutoData API) is Phase 2 (out of scope here).

## Context

- Service site is a Webflow microsite (BRIX Templates framework) at `service.carsa.co.uk`
- 5 HiQ franchise locations: Halesowen, Cannock, Bolton, Towcester, Mountsorrel
- All 5 locations already exist in the main site's Stores CMS collection
- ~60 bookings/week across group, £10-15k/month PPC spend
- SEO benefit: consolidating subdomain onto main domain
- Meeting attendees: Will, Rishi, Tomek, Rich, Stephen

## Decision Log

Recorded so these are not re-litigated at build time.

| # | Decision | Verdict | Rationale |
|---|----------|---------|-----------|
| D1 | Use **Relume MCP** to build the pages | **Rejected** | Relume MCP emits React/TSX with Tailwind classes and a `@relume_io/relume-ui` dependency. It produces nothing Webflow can consume — no clipboard JSON, no Webflow components. Relume's Webflow product is a separate manual-paste library that would introduce a second class system alongside Client First. |
| D2 | Use **Claude Design** to mock up pages first | **Rejected** | 6 of 7 hub sections reuse existing Carsa patterns. The only genuinely new component is the partnership callout. The Webflow staging site (`carsa-v2.webflow.io`) is the mockup. |
| D3 | Source of components | **Carsa's own library** | Style Guide (`68348ea61096b37caacd2f9a`), All Components (`688a0ccdc27ff993d907ec83`), Extended Library (`6847dada6d8dfaa1a672a814`). Snapshot via `element_snapshot_tool` at build time. |
| D4 | HTML Embed ban vs Acuity iframe | **Carve-out approved** | `carsa-webflow` SKILL.md states an absolute no-embed rule. Amend it: HTML Embed permitted **solely** for (a) the Acuity booking iframe and (b) JSON-LD schema blocks. All layout remains native Webflow elements. See Task 20. |
| D5 | Target URL path | `/mot-and-car-servicing` | `queue.json` says `/servicing` — stale, predates the spec. Spec wins. Queue description corrected. |

## Prerequisites

### Task 0 — Webflow MCP workspace re-authorisation (**HARD BLOCKER**)

The Webflow MCP is currently OAuth-authorised against a workspace that does not
contain Carsa. Verified 2026-07-09:

- `data_sites_tool > list_sites` returns exactly one site: *The Signalling Company*
  (`6a32b717a48adbce92029295`, workspace `6373a15b26d1775ae7b14055`)
- `get_site` against Carsa's known ID `68348ea61096b37caacd2f95` returns
  `404 resource_not_found` — no access, as distinct from a stale ID

`.mcp.json` defines the Webflow MCP as a bare hosted endpoint
(`https://mcp.webflow.com/mcp`) with no token or site scoping, so access is
governed entirely by the OAuth session in the client. This cannot be switched
from a tool call.

**Until this is resolved, zero Webflow automation is possible** — no reading the
component library, no CMS collection creation, no page building. Tasks 1–8 and
14 are all gated on it.

**Action:** re-authorise the Webflow MCP against workspace `67caba0c5c72084908790f0b`.

### Confirmed available once reconnected

The Data API surface is sufficient to script the build; none of it needs an open
Designer session:

| Tool | Use |
|------|-----|
| `data_cms_tool` | Create Service Locations collection, add `service-location` ref to Stores, populate 5 items |
| `data_pages_tool` | Create pages, set SEO/OG metadata, write JSON-LD via `bulk_update_pages_schema_markup` |
| `data_element_builder` | Build native element trees (Section/Container/Heading/…), bind to CMS fields |
| `data_whtml_builder` | Insert sections from HTML+CSS strings — fastest path for repeated card grids |
| `data_component_builder` | Instantiate existing Carsa components, populate slots |
| `element_snapshot_tool` | Read existing component structure before reuse |

## Service Site Content Inventory

| # | Page | URL | Key Content |
|---|------|-----|-------------|
| 1 | Homepage | `/` | Hero (MOT £39), 4 offer cards, 5 location cards, 6 trust badges, 7 review testimonials |
| 2 | Winter Health Check | `/winter-health-check` | Hero, 8-point checklist, 4 booking CTAs |
| 3 | Store Locator | `/store-locator` | Postcode search + StorePoint map embed |
| 4 | Halesowen Booking | `/mot-service-halesowen` | Acuity embed (calendarID: 11436415) |
| 5 | Cannock Booking | `/mot-service-cannock` | Acuity embed (calendarID: 11436354) |
| 6 | Bolton Booking | `/mot-service-bolton` | Acuity embed (calendarID: 11436404) |
| 7 | Towcester Booking | `/mot-service-towcester` | Acuity embed (calendarID: 11718661) |
| 8 | Mountsorrel Booking | `/mot-service-mountsorrel` | Acuity embed (calendarID: 13865154) |

**Acuity owner account:** `33396621` (shared across all locations)

**Source site:** Webflow, site ID `679361bb056aa22a71aaad31`, BRIX Templates
framework (`brix---*` classes). No CMS collections — every list is a
hand-duplicated static block, which is why the data has drifted (below). No
`sitemap.xml` (generation disabled); `robots.txt` is a 0-byte file.

## Source-Site Defects — Do NOT Migrate

Found in the 2026-07-09 crawl. Each must be **resolved to a canonical value
before** content is entered into the CMS, otherwise the migration launders
existing bugs into the new site.

| # | Defect | Where | Resolution needed |
|---|--------|-------|-------------------|
| B1 | Meta description on `/mot-service-towcester` reads *"Book your MOT in **Halesowen**"* | Towcester page | Write correct Towcester description. Copy-paste error. |
| B2 | Review count inconsistent: **9700+** on home & winter, **9500+** on store-locator & all 5 location pages | 8 pages | Ask Carsa for the current true count. Becomes one CMS/global value, not 8 hardcoded strings. |
| B3 | **Mountsorrel missing entirely** from the winter page's location grid (4 cards, not 5) and from its subhead | `/winter-health-check` | Winter page location grid must render all 5 from CMS. |
| B4 | Bolton & Towcester Saturday hours conflict: `Sat & Sun: Closed` on home vs `08:30–12:30` on winter page | home vs winter | Confirm real hours with Carsa. Single CMS source. |
| B5 | Service Manager names + "NEW" badge exist **only** on the winter page's cards, absent from home | winter page | Decide whether these are CMS fields on Service Locations. Not in the original field schema below. |
| B6 | Multiple `<h1>` per page — "Exclusive Offers" and "Our Locations" section titles are marked `<h1>` | every page | New build uses one `<h1>` per page; section titles are `<h2>`. |
| B7 | Winter page's 8 feature-card labels are `<div>`, not headings | `/winter-health-check` | Use `<h3>`. |
| B8 | Winter page uses a different component library (`a-*` classes) from the rest (`brix-*`) | `/winter-health-check` | Irrelevant post-migration — rebuilt in Client First. Noted so the visual difference isn't mistaken for intent. |
| B9 | Towcester location photo is a **generic placeholder** (`hiq-generic.avif`); home and winter pages use two entirely different photo sets | home vs winter | Source a real Towcester photo. Pick one canonical image per location. |
| B10 | Trustpilot link points to `hiqonline.co.uk` reviews, not Carsa's | all review sections | Ties to HiQ-removal strategy — see below. |

**Owner:** B2, B4, B9 need answers from Carsa (Tomek). B1, B3, B6, B7, B8 are
ours to fix in the build. B5 and B10 are decisions.

## Store Locator / Storepoint — RESOLVED (2026-07-13)

**Decision:** Drop the third-party **Storepoint** widget
(`cdn.storepoint.co/api/v1/js/1679341f058133.js`, map id `1679341f058133`). The
source `/store-locator` page will not be reproduced with its own map. Instead,
**reuse the existing store-locator component already built on the main site's
`/stores` page** for any location-finding UI in the service area.

Consequences:
- One paid third-party dependency removed, and one fewer embed to maintain.
- The `service.carsa.co.uk/store-locator` → `carsa.co.uk/stores` redirect
  (already in the 301 map) is correct as-is and needs no filtered variant.
- The hub page's location section (Section 4) remains the CMS-driven grid of the
  5 service-enabled stores. If a map/postcode-search surface is wanted there too,
  reuse the same `/stores` locator component filtered to service-enabled stores
  (`service-location` ref populated) rather than building anything new.

**Build-time action (needs Task 0):** snapshot the `/stores` page locator
component via `element_snapshot_tool`, confirm it can be filtered by the
`service-location` ref, and reuse it. Recorded as part of Task 3b.

## URL Structure

Top-level `/mot-and-car-servicing` path for SEO targeting ("car servicing", "MOT near me"):

| New URL | Source | Type |
|---------|--------|------|
| `/mot-and-car-servicing` | Homepage content | New static page |
| `/mot-and-car-servicing/winter-health-check` | Winter health check | New static page |
| `/mot-and-car-servicing/{slug}` | 5 booking pages | New CMS template |

## 301 Redirect Map

| Old URL | New URL |
|---------|---------|
| `service.carsa.co.uk/` | `carsa.co.uk/mot-and-car-servicing` |
| `service.carsa.co.uk/store-locator` | `carsa.co.uk/stores` |
| `service.carsa.co.uk/winter-health-check` | `carsa.co.uk/mot-and-car-servicing/winter-health-check` |
| `service.carsa.co.uk/mot-service-halesowen` | `carsa.co.uk/mot-and-car-servicing/halesowen` |
| `service.carsa.co.uk/mot-service-cannock` | `carsa.co.uk/mot-and-car-servicing/cannock` |
| `service.carsa.co.uk/mot-service-bolton` | `carsa.co.uk/mot-and-car-servicing/bolton` |
| `service.carsa.co.uk/mot-service-towcester` | `carsa.co.uk/mot-and-car-servicing/towcester` |
| `service.carsa.co.uk/mot-service-mountsorrel` | `carsa.co.uk/mot-and-car-servicing/mountsorrel` |

**Implementation — verify Option A before costing Option B.**

`service.carsa.co.uk` is its own Webflow **site** (`679361bb056aa22a71aaad31`)
with its own site settings, and therefore its own 301 redirect table. Platform
re-verified live on 2026-07-13 (`x-wf-region` header, `data-wf-site` attribute,
`website-files.com` assets, zero WordPress fingerprints) — so the site will still
be Webflow at redirect-flip time and this table is the mechanism.

- **Option A (preferred, unverified):** Add 8 rows to the *service site's*
  Webflow 301 redirect table, each targeting an absolute `https://carsa.co.uk/...`
  URL. Keep the service site published on its existing paid plan as a
  redirect-only shell. **No server, no DNS change, no Cloudflare.** Cost: ~15 min.
  - **Must verify first:** that Webflow's redirect table accepts an absolute
    external target (cross-domain). Webflow's help centre returned HTTP 403 to
    automated fetch on 2026-07-09, so this is an assumption, not a confirmed fact.
    Test by adding a single throwaway rule and `curl -I` it.
- **Option B (fallback, as originally specced):** Point DNS for
  `service.carsa.co.uk` at a minimal redirect server, or use Cloudflare Page
  Rules if the domain is on Cloudflare. Cost: ~1–2 hrs plus ongoing hosting.

If Option A holds, Task 15 shrinks from an infra task to a config task and the
estimate drops accordingly.

---

## Pages & Sections Breakdown

### Page 1: Service Hub (`/mot-and-car-servicing`) — NEW static page

| # | Section | Description | Pattern |
|---|---------|-------------|---------|
| 1 | Hero | H1 "MOT & Servicing", intro copy, "Book Now" CTA | Existing hero (car-care pages) |
| 2 | Service cards | 4 cards: MOT £39, MOT+Service combo £30, Servicing from £120, Air Con from £120. Each with feature bullets + Book Now CTA | Existing card grid (car-care overview) |
| 3 | Partnership callout | "In partnership with HiQ" with HiQ logo. Removable component — single utility class `.is-hiq-partner` or CMS switch to hide when HiQ branding is dropped | **New component** |
| 4 | Service locations | Filtered grid of 5 service-enabled stores. Each card: name, address, hours, "Book Now" link to `/mot-and-car-servicing/{slug}` | Existing store card pattern, filtered by CMS ref |
| 5 | Trust badges | 6 icon+text items: Goodyear certified, 9700+ reviews, tyres & repairs, MOT & servicing, only essential work, partnership with Carsa | Existing icon+text grid |
| 6 | Reviews | Trustpilot testimonials — either embed widget or static carousel of 7 reviews | TBD: Trustpilot widget or static cards |
| 7 | FAQ accordion | FAQ section — Carsa to write questions. CMS-ref pattern (faq-1 through faq-10) or static rich text | Existing FAQ pattern |

**Sections: 7 total (1 new component, 6 reuse existing patterns)**

### Page 2: Service Location Template (`/mot-and-car-servicing/{slug}`) — NEW CMS template

**New CMS Collection: "Service Locations"**

| Field | Type | Notes |
|-------|------|-------|
| `name` | Plain text | Display name (e.g. "Halesowen") |
| `slug` | Slug | URL slug |
| `meta-title` | Plain text | SEO title |
| `meta-description` | Plain text | SEO description |
| `acuity-calendar-id` | Plain text | Acuity calendarID for embed |
| `store` | Reference → Stores | Links to main store CMS item (pulls address, hours, phone, coords) |
| `services-offered` | Rich text or multi-ref | Services available at this location |
| `hiq-enabled` | Switch | Whether to show HiQ partnership branding (for easy removal) |
| `photo` | Image | Canonical location photo — resolves defect B9 (Towcester currently a placeholder; home and winter pages use different sets) |
| `service-manager` | Plain text | Nash Sahota (Halesowen), Dan Tift (Cannock), David Fildes (Bolton), Kevin Howkins (Towcester), TBC (Mountsorrel). Currently only rendered on the winter page — see B5 |
| `is-new` | Switch | Drives the "NEW" badge, currently winter-page-only — see B5 |

Added in v2: `photo`, `service-manager`, `is-new`. These exist in the source
markup but were absent from the original field schema, and are the root cause of
defects B5 and B9.

**5 CMS items:** Halesowen (11436415), Cannock (11436354), Bolton (11436404), Towcester (11718661), Mountsorrel (13865154)

| # | Section | Description | Pattern |
|---|---------|-------------|---------|
| 1 | Hero | Location name (from CMS), address (from Stores ref), H1 "Book Your MOT & Service in {Location}" | Existing hero |
| 2 | Acuity embed | Responsive iframe container. `src` built from CMS `acuity-calendar-id` field. Height: 800px desktop, auto/responsive mobile | **New section** |
| 3 | Services & pricing | Card/list of services available (MOT, servicing, air con, tyres) with prices | Existing card pattern |
| 4 | Partnership callout | Same component as hub page, conditional on `hiq-enabled` CMS switch | Reuse from hub |
| 5 | Location details | Hours, phone, address, embedded map (from Stores ref data) | Existing store detail pattern |

**Sections: 5 total (1 new, 4 reuse) × 5 CMS items**

### Page 3: Winter Health Check (`/mot-and-car-servicing/winter-health-check`) — NEW static page

| # | Section | Description | Pattern |
|---|---------|-------------|---------|
| 1 | Hero | H1 "Free Winter Car Health Check", intro copy | Existing hero |
| 2 | 8-point checklist | Icon + title + description per check: oil, tyre pressure, tyre condition, lights, wipers, exhaust, battery, brakes | Existing icon+text grid (similar to trust badges) |
| 3 | Booking CTAs | Grid of 5 location cards with "Book Now" links to `/mot-and-car-servicing/{slug}` | Existing CTA/button grid |
| 4 | Partnership callout | Reuse from hub | Reuse |

**Sections: 4 total (all reuse existing patterns)**

### Modification 1: Cross-sell section on existing store & sell-car pages

Add a "Servicing & MOT" section to existing pages where the Stores CMS item has a linked Service Location:

| # | Section | Description | Pattern |
|---|---------|-------------|---------|
| 1 | Service cross-sell | "MOT & Servicing Available Here" heading. Service summary (MOT £39, Servicing from £120). "Book Now" CTA → `/mot-and-car-servicing/{slug}`. Conditional: only shows when Stores CMS item has a `service-location` ref populated | **New reusable section component** |

**Applied to:** 5 store pages + relevant sell-car location pages (~5-10 pages total)

**CMS change:** Add `service-location` (Reference → Service Locations) field to Stores collection.

### Modification 2: Store locator filtering

On the `/mot-and-car-servicing` hub page locations section, filter to only show stores where `service-location` ref is populated. The existing `/stores` page continues to show all 11 locations.

---

## Additional Work Items

### Schema (JSON-LD)

| Page | Schema Type | Template |
|------|-------------|----------|
| `/mot-and-car-servicing` | `WebPage` + `Service` (MOT, Servicing, Air Con as `hasOfferCatalog`) | `projects/carsa/schema/mot-and-car-servicing.html` |
| `/mot-and-car-servicing/{slug}` | `AutoRepair` + `LocalBusiness` + `Service` (location-specific, inherits from Stores schema) | `projects/carsa/schema/mot-and-car-servicing-template.html` |
| `/mot-and-car-servicing/winter-health-check` | `WebPage` + `Service` (HealthCheck type) | `projects/carsa/schema/winter-health-check.html` |

### FAQ Setup

- Carsa to write FAQ content for the service hub page
- Structure: either CMS-ref pattern (reuse existing `faq-1` through `faq-10` refs) or static rich text accordion
- Schema: `FAQPage` JSON-LD injected on the hub page
- Will to set up the structure; Carsa/Tomek to populate the questions and answers

### SEO Checks

- Pre-migration: document which terms `service.carsa.co.uk` currently ranks for (optional — check GSC if verified, or use SEMRush)
- Post-migration: verify 301 redirects are working (all 8 URLs)
- Post-migration: verify new pages are indexed (submit sitemap, request indexing)
- Post-migration: run Rich Results Test on all 3 new schema templates
- Cross-check: internal links from store pages and sell-car pages point to new `/mot-and-car-servicing/` URLs
- Meta titles and descriptions set for all new pages

### Testing

- Playwright acceptance tests for all new pages (see Test Plan below)
- Acuity embed loads correctly on all 5 location pages
- Cross-sell section appears on correct store pages and not on others
- 301 redirects return correct status code and target
- Schema validates via Rich Results Test
- Mobile responsive check on all new pages (Acuity embed is the risk — assess quality post-launch)

### GTM / Analytics

- Review 2 existing GTM containers on service site (GTM-MQMGX5QM, GTM-MNZR977L)
- Ensure tracking carries over to main site's GTM
- Consider UTM passthrough to Acuity embed (currently not working per meeting notes)

### Google Search Console

Not in scope — client is aware of the GSC situation for `service.carsa.co.uk`.

---

## HiQ Branding Removal Strategy

Design for easy removal from day one:

1. **Partnership callout component:** standalone section with utility class `.is-hiq-partner`. To remove: hide the class in Webflow Designer or delete the section entirely.
2. **CMS switch:** `hiq-enabled` boolean on Service Locations collection. To remove per-location: toggle the switch.
3. **Copy:** All references to HiQ should be in the partnership callout, not woven into body copy. Trust badges to reference Carsa, not HiQ (e.g. "In Partnership With Carsa" becomes just "Carsa" copy).
4. **Trustpilot:** Currently links to `hiqonline.co.uk` reviews. May need to be swapped to Carsa's own Trustpilot page when HiQ branding is dropped.

---

## Barba Impact

N/A — no Barba transitions on Carsa site.

---

## Automation Map

Goal: automate as much of the build as the Webflow Data API allows, leaving only
genuinely-manual work to the Designer. **All of this is gated on Task 0.**

### Fully automatable (scripted via Webflow MCP)

| Work | Tool | Notes |
|------|------|-------|
| Create Service Locations collection + field schema | `data_cms_tool` | Programmatic; no Designer |
| Add `service-location` ref field to Stores | `data_cms_tool` | |
| Populate 5 Service Location items | `data_cms_tool` | Source data already in this spec (calendar IDs, slugs) |
| Create 2 static pages + 1 CMS template page | `data_pages_tool > create_page` | |
| Set SEO title / meta description / OG per page | `data_pages_tool > bulk_update_pages` | Covers Task 13 entirely |
| Write JSON-LD to all 3 page types | `data_pages_tool > bulk_update_pages_schema_markup` | Accepts objects or raw strings; **no HTML Embed needed for schema** — supersedes part of D4 |
| Read existing Carsa components before reuse | `element_snapshot_tool` | Against All Components + Extended Library pages |
| Instantiate existing components into new pages | `data_component_builder` | Populate slots |
| Build new sections (partnership callout, cross-sell) | `data_element_builder` or `data_whtml_builder` | `whtml_builder` takes HTML+CSS strings — fastest for card grids |
| Publish | `data_sites_tool > publish_site` | Staging-only per `site-config.json` (`stagingOnly: true`) |

**Note on schema:** `bulk_update_pages_schema_markup` writes JSON-LD as a
first-class page property. This means the schema half of the D4 embed carve-out
is unnecessary — only the Acuity iframe genuinely needs an HTML Embed. Narrow
the SKILL.md exception accordingly.

### Requires the Designer (manual)

| Work | Why |
|------|-----|
| Verify visual fidelity across 7 breakpoints | No programmatic render check |
| CMS template page → bind template to collection | Template binding is a Designer operation |
| 301 redirect table on the service site | Site Settings UI, not in the Data API |
| GTM container merge | Google Tag Manager UI |

### Not Webflow at all

| Work | Owner |
|------|-------|
| Resolve content defects B2, B4, B9 | Carsa (Tomek) |
| FAQ copy | Carsa (Tomek) |
| ~~Storepoint decision~~ | Resolved 2026-07-13 — drop, reuse `/stores` locator |
| Playwright tests | Already written — `tests/acceptance/carsa-service-migration.spec.js` (17 tests) |

### Realistic automation ceiling

Roughly **60–70% of the build** is scriptable: all CMS work, all page creation,
all metadata, all schema, and the repetitive section construction. The residual
manual work is template binding, cross-breakpoint visual QA, redirects, and GTM.

---

## Task Breakdown

| # | Task | Type | Agent | Est. LOC | Dependencies |
|---|------|------|-------|----------|--------------|
| **0** | **Re-authorise Webflow MCP to Carsa workspace `67caba0c5c72084908790f0b`** | **infra** | **manual (Will)** | — | **None — blocks 1–8, 14** |
| 0b | Resolve content defects with Carsa: B2 (review count), B4 (Bolton/Towcester hours), B9 (Towcester photo) | content | manual (Tomek) | — | None |
| 0c | ~~Confirm Storepoint decision~~ **RESOLVED 2026-07-13:** drop Storepoint, reuse the existing `/stores` locator component | scope | done | — | — |
| 1 | Create "Service Locations" CMS collection in Webflow | webflow | **scripted — `data_cms_tool`** | .25 | Task 0 |
| 2 | Add `service-location` ref field to Stores collection | webflow | **scripted — `data_cms_tool`** | — | Tasks 0, 1 |
| 3 | Populate 5 Service Location CMS items with Acuity calendar IDs | webflow | **scripted — `data_cms_tool`** | — | Tasks 0, 1 |
| 3b | Snapshot existing Carsa components (All Components + Extended Library) | webflow | **scripted — `element_snapshot_tool`** | — | Task 0 |
| 4 | Build service hub page (`/mot-and-car-servicing`) — 7 sections | webflow | **scripted — `data_pages_tool` + `data_element_builder`** | 2 | Tasks 1, 3b |
| 5 | Build service location template (`/mot-and-car-servicing/{slug}`) — 5 sections | webflow | scripted build + **manual template binding** | 2 | Tasks 1–3 |
| 6 | Build winter health check page — 4 sections | webflow | **scripted** | 1 | Tasks 0, 3b |
| 7 | Build partnership callout component (reusable across pages) | webflow | **scripted — `data_whtml_builder`** | .25 | Tasks 0, 3b |
| 8 | Build cross-sell section component for store/sell-car pages | webflow | **scripted — `data_whtml_builder`** | .5 | Tasks 1, 2 |
| 9 | Acuity embed — responsive wrapper, iframe `src` from CMS `acuity-calendar-id` | code | code-writer | - | Tasks 5, 20 |
| 10 | Generate JSON-LD schema — 3 templates | schema | schema agent | .75 | Tasks 4–6 |
| 11 | Write schema to pages + validate via Rich Results Test | qa | **scripted write** (`bulk_update_pages_schema_markup`) + qa agent | .25 | Task 10 |
| 12 | FAQ structure setup (accordion + FAQPage schema) | webflow + schema | scripted + manual | - | Task 4 |
| 13 | SEO metadata — titles, descriptions, OG tags for all new pages | seo | **scripted — `bulk_update_pages`** | — | Tasks 4–6 |
| 14 | Cross-sell section placement on 5 store pages + sell-car pages | webflow | **scripted** | .5 | Task 8 |
| 15 | 301 redirects — **verify Option A first** (Webflow cross-domain redirect table) | infra | manual, fallback code-writer | - | Tasks 4–6 |
| 16 | GTM review and migration (GTM-MQMGX5QM, GTM-MNZR977L → GTM-MM5N6CP8) | analytics | manual | — | Tasks 4–6 |
| 17 | Post-migration SEO checks (indexing, redirects, internal links) | seo | seo agent | .5 | Task 15 |
| 18 | Playwright acceptance tests | qa | **already written** — 17 tests exist | — | Tasks 4–6, 9 |
| 19 | Mobile Acuity embed QA | qa | manual | .5 | Task 5 |
| **20** | **Amend `carsa-webflow` SKILL.md — narrow embed carve-out to the Acuity iframe only** | docs | manual | — | None |
| **21** | **Fix source-site defects B1, B3, B6, B7 during build (do not migrate them)** | content | build-time | — | Tasks 4–6 |
| **22** | Sitemap + `robots.txt` — new pages enter carsa.co.uk's sitemap; source site's empty robots.txt is not migrated | seo | seo agent | — | Tasks 4–6 |

---

## Parallelisation Map

### Independent streams (can run simultaneously)

| Stream | Tasks | Agent | Est. tokens |
|--------|-------|-------|-------------|
| A: CMS + Webflow structure | 1, 2, 3 | Manual (Webflow Designer) | — |
| B: Partnership callout component | 7 | Manual | — |
| C: Schema templates | 10 (can start with page structure defined, before pages are live) | schema agent | ~8k |

### Sequential dependencies

```
Stream A (CMS setup) → Tasks 4, 5, 8 (page builds need CMS)
                      → Task 14 (cross-sell placement needs component)
Task 4 (hub page)    → Task 12 (FAQ structure)
                      → Task 13 (SEO metadata)
Tasks 4, 5, 6 (all pages) → Task 9 (Acuity embed JS)
                            → Task 15 (301 redirects)
                            → Task 16 (GTM)
                            → Task 18 (acceptance tests)
Task 15 (redirects)  → Task 17 (post-migration SEO)
Task 10 (schema)     → Task 11 (schema validation)
Task 5 (location template) → Task 19 (mobile Acuity QA)
```

### Recommendation (revised v2)

- **Task 0 gates everything Webflow.** Nothing in streams A, B, or the page
  builds can start until the MCP is re-authorised. Start it first, today.
- **Sequential build** after that — most tasks depend on CMS setup (Stream A).
- **No worktrees needed.** The work is Webflow API calls and content, not
  concurrent file edits.
- **Genuinely parallelisable while Task 0 is pending** (zero Webflow dependency):
  - Task 0b/0c — client questions to Tomek (send immediately; they have latency)
  - Task 10 — draft the 3 JSON-LD schema templates from the structure in this spec
  - Task 20 — amend `carsa-webflow` SKILL.md
  - Task 15 — verify the Webflow cross-domain redirect assumption (Option A)
  - Copy deck — write canonical, defect-free copy for all 3 page types
- Once unblocked: Task 6 (winter) and Task 7 (partnership callout) run in
  parallel with Task 4 (hub page).

---

## Estimate Line Items

For time estimation, group by work type:

| Line Item | Tasks | Notes |
|-----------|-------|-------|
| **CMS setup** | 1, 2, 3 | Create collection, add ref field, populate 5 items |
| **Hub page build** | 4, 7 | 7 sections, 1 new component (partnership callout) |
| **Location template build** | 5, 9 | 5 sections + Acuity embed JS |
| **Winter health check build** | 6 | 4 sections, all reuse patterns |
| **Cross-sell section** | 8, 14 | 1 new component + placement on ~10 pages |
| **FAQ structure** | 12 | Accordion setup, Carsa writes content |
| **Schema** | 10, 11 | 3 JSON-LD templates + validation |
| **SEO** | 13, 17 | Meta tags, post-migration checks, indexing |
| **301 redirects** | 15 | 8 redirect rules |
| **GTM** | 16 | Review 2 containers, migrate tracking |
| **Testing** | 18, 19 | Playwright tests + manual mobile Acuity QA |

---

## Test Plan

### Tier 1 — Auto: Playwright local

Tests in `tests/acceptance/carsa-service-migration.spec.js`:

1. **Hub page loads** — `/mot-and-car-servicing` returns 200, H1 present
2. **Service cards present** — 4 service offer cards visible on hub page
3. **Partnership callout visible** — `.is-hiq-partner` section present
4. **Location cards present** — 5 location cards with booking links
5. **Location template loads** — `/mot-and-car-servicing/halesowen` returns 200, H1 present
6. **Acuity embed loads** — iframe with `acuityscheduling.com` src present on location pages
7. **Winter health check loads** — `/mot-and-car-servicing/winter-health-check` returns 200
8. **Checklist items present** — 8 checklist items visible on winter health check
9. **Cross-sell section on store page** — `/stores/halesowen` has servicing CTA section
10. **Cross-sell section NOT on non-service store** — `/stores/durham` does NOT have servicing CTA
11. **No console errors — hub page** — zero JS errors on `/mot-and-car-servicing`
12. **No console errors — location page** — zero JS errors on `/mot-and-car-servicing/halesowen`
13. **No console errors — winter health check** — zero JS errors on `/mot-and-car-servicing/winter-health-check`
14. **Schema present — hub page** — JSON-LD script tag with `@type: Service` on `/mot-and-car-servicing`
15. **Schema present — location page** — JSON-LD script tag with `@type: AutoRepair` on `/mot-and-car-servicing/halesowen`
16. **Responsive — hub page mobile** — all sections visible at 375px width
17. **Responsive — Acuity embed mobile** — iframe visible and not overflowing at 375px

### Tier 2 — Auto: CDN regression

Registered in `tests/registry.json` as `carsa-service-migration`. Runs on `/deploy` after CDN hash update.

### Tier 3 — Manual

| Check | Reason |
|-------|--------|
| Acuity embed usability on mobile (iOS Safari) | Cannot automate real device iframe interaction — Playwright uses Chromium only |
| Acuity booking flow completion | Requires real Acuity account interaction + email verification |
| 301 redirect verification from `service.carsa.co.uk` | Requires DNS change + external server — cannot test locally |
| HiQ branding removal (toggle CMS switch, verify callout hides) | Requires Webflow CMS interaction |
| Visual review of partnership callout design | Subjective design quality |
| Trustpilot review content accuracy | Content verification, not automatable |
| GTM events firing correctly | Requires GTM preview mode + real browser |

---

## Verify Loop

### Pass/fail criteria

- [ ] `/mot-and-car-servicing` returns 200 with correct H1 and all 7 sections visible
- [ ] `/mot-and-car-servicing/{slug}` returns 200 for all 5 locations with Acuity iframe loading
- [ ] `/mot-and-car-servicing/winter-health-check` returns 200 with 8 checklist items
- [ ] Partnership callout appears on all 3 page types
- [ ] Cross-sell section appears on Halesowen, Cannock, Bolton, Towcester, Mountsorrel store pages
- [ ] Cross-sell section does NOT appear on Durham, Bradford, Gloucester, Portsmouth, Southampton, Wolverhampton store pages
- [ ] JSON-LD schema validates via Rich Results Test for all 3 templates
- [ ] No JS console errors on any new page
- [ ] All 8 301 redirects return correct status and target
- [ ] Meta titles and descriptions set for all new pages

### Reproduction steps

1. Navigate to `carsa.co.uk/mot-and-car-servicing` — verify hero, service cards, locations, trust badges, reviews, FAQ
2. Click a location card → lands on `/mot-and-car-servicing/{slug}` — verify Acuity iframe loads
3. Navigate to `/mot-and-car-servicing/winter-health-check` — verify checklist and booking CTAs
4. Navigate to `/stores/halesowen` — verify cross-sell section present with booking CTA
5. Navigate to `/stores/durham` — verify cross-sell section NOT present
6. Run Tier 1 Playwright tests — all pass
7. Test 301 redirects: `curl -I service.carsa.co.uk/` → 301 → `carsa.co.uk/mot-and-car-servicing`

### Tier mapping

- **Tier 1:** Tests 1-17 (Playwright, automated)
- **Tier 2:** Same tests via registry on deploy
- **Tier 3:** Mobile Acuity, booking flow, 301s, HiQ toggle, GTM (manual, reasons listed above)

### Regression scope

- Existing `/stores/{slug}` pages must continue to function (adding cross-sell section must not break layout)
- Existing `/car-care/` pages unaffected
- No Barba transitions to worry about
- Homepage search/dropdowns unaffected
- Existing JSON-LD schema on other page types unaffected

---

## Acceptance Tests

See `tests/acceptance/carsa-service-migration.spec.js` for machine-runnable tests.

| Test | Automated | Description |
|------|-----------|-------------|
| hub-page-loads | Yes (Tier 1) | Service hub page returns 200 with H1 |
| service-cards-present | Yes (Tier 1) | 4 service cards visible on hub |
| partnership-callout-visible | Yes (Tier 1) | HiQ partnership section present |
| location-cards-present | Yes (Tier 1) | 5 location cards with booking links |
| location-template-loads | Yes (Tier 1) | Location booking page returns 200 |
| acuity-embed-loads | Yes (Tier 1) | Acuity iframe present on location pages |
| winter-health-check-loads | Yes (Tier 1) | Winter health check returns 200 |
| checklist-items-present | Yes (Tier 1) | 8 checklist items visible |
| cross-sell-on-service-store | Yes (Tier 1) | Cross-sell section on service-enabled stores |
| cross-sell-not-on-other-store | Yes (Tier 1) | No cross-sell on non-service stores |
| no-errors-hub | Yes (Tier 1) | Zero JS errors on hub page |
| no-errors-location | Yes (Tier 1) | Zero JS errors on location page |
| no-errors-winter | Yes (Tier 1) | Zero JS errors on winter health check |
| schema-hub | Yes (Tier 1) | JSON-LD Service schema present |
| schema-location | Yes (Tier 1) | JSON-LD AutoRepair schema present |
| responsive-hub-mobile | Yes (Tier 1) | Hub sections visible at 375px |
| responsive-acuity-mobile | Yes (Tier 1) | Acuity embed fits at 375px |
| acuity-mobile-usability | No (Tier 3) | Real device iframe interaction |
| booking-flow-completion | No (Tier 3) | Requires real Acuity interaction |
| 301-redirects | No (Tier 3) | Requires DNS change |
| hiq-toggle | No (Tier 3) | Requires Webflow CMS |
| visual-review | No (Tier 3) | Subjective design quality |
| gtm-events | No (Tier 3) | Requires GTM preview mode |
