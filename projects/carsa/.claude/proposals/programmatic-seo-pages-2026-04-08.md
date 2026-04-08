# Proposal: Programmatic SEO Pages for Used Cars

**Date:** 8 April 2026
**Prepared for:** Tomek Stacharski, Carsa
**Prepared by:** Will Morley
**Status:** Draft

---

## The Problem

Carsa's used car search lives on a single page — `/used-cars`. Every make and model is filtered client-side on that one URL, which means:

- **Search engines can't index individual makes and models.** There's no `/used-cars/bmw/3-series` page for Google to find. When someone searches "used BMW 3 Series Carsa", there's nothing specific to rank.
- **No landing pages for ads or marketing.** If Carsa wants to run a Google Ads campaign for "used Audi A4", there's no dedicated URL to point it at — just `/used-cars` with a filter applied, which doesn't persist, can't be shared cleanly, and doesn't rank organically.
- **No SEO value from inventory depth.** Carsa has 5,000+ cars across 47 makes and 475 models. Competitors like AutoTrader and Cinch have dedicated pages for every make and model combination. This is table stakes for automotive SEO.

---

## The Solution

Create **522 static pages** in Webflow — one for each make (47) and one for each model (475) — in a clean URL structure:

```
/used-cars/bmw              ← All BMW cars
/used-cars/bmw/3-series     ← BMW 3 Series only
/used-cars/bmw/x5           ← BMW X5 only
/used-cars/audi             ← All Audi cars
/used-cars/audi/a4          ← Audi A4 only
...
```

Each page uses Shane's React search widget (or Algolia — see Options below) with one small change: the widget reads the URL path and applies the make/model as a pre-selected filter. No per-page configuration — the same widget works on every URL.

All 522 pages share a **single Webflow component**, so updating the design or layout once updates every page automatically.

---

## How It Works

### Page structure

Every page is a lightweight shell:

1. **Unique SEO metadata** — title, meta description, and Open Graph tags tailored to the specific make/model (e.g. "Used BMW 3 Series for Sale | Carsa")
2. **Shared component body** — the search widget container, heading, breadcrumbs, and layout. Built once as a Webflow component, reused across all 522 pages.
3. **The search widget** — reads the URL, filters results to the relevant make/model, and renders the car grid.

### URL parsing

The search widget parses the current URL on load and applies filters automatically:

```
URL: /used-cars/bmw/3-series
       ↓         ↓      ↓
   base path   make   model

/used-cars           → show all cars (existing behaviour)
/used-cars/bmw       → filter to make = BMW
/used-cars/bmw/x5    → filter to make = BMW, model = X5
```

**Widget requirements:**
- Parse `/used-cars/{make}/{model}` from `window.location.pathname`
- Map URL slugs to data values (e.g. `3-series` → `3 Series`)
- Apply the make/model as a **locked** filter (pre-selected, not removable)
- Hide the make/model dropdowns on filtered pages (they're redundant)
- Keep all other filters interactive (price, year, mileage, fuel, transmission, etc.)
- **Redirect on filter change from `/used-cars`** — when a user is on the top-level `/used-cars` page and selects a make or model from the dropdown, the widget redirects to the corresponding static page:
    - Select "BMW" from make dropdown → redirect to `/used-cars/bmw`
    - Select "3 Series" (after BMW) → redirect to `/used-cars/bmw/3-series`
    - This funnels all organic traffic into indexable URLs, improves shareability, and gives analytics clean per-make/model tracking.
- Handle edge cases: unknown slugs show "No cars found" with a link back to `/used-cars`. Zero current inventory shows "No cars currently available" with suggested alternatives (so pages stay indexed by Google).

**Note on the `<h1>`:** The page heading (e.g. "Used BMW 3 Series for Sale") is **hardcoded into each Webflow page** rather than rendered by the widget. This is better for SEO — Google sees the heading in the raw HTML immediately, without waiting for JavaScript to execute. We handle this as part of page creation (see Scope of Work), not Shane's component.

A detailed specification document will be provided covering slug rules, edge cases, redirect behaviour, and expected states.

---

## Client-Side Filtering: Option A vs Option B

Because filtering (price, year, mileage, etc.) runs in the browser after the initial load, there are two ways to architect it:

### Option A — Load the full filtered set

On first load, fetch **all cars** matching the URL (e.g. all 90 VW Golfs, all 244 Audis). User filters locally — instant, no network round-trips.

- **Pros:** instant filtering feels snappy, matches Finsweet's current behaviour
- **Cons:** larger initial payload, slower first paint

### Option B — Fetch on filter change

On first load, fetch only the **first page of results** (e.g. first 24 cars). When the user applies a filter, fetch the matching set from the API.

- **Pros:** smaller initial payload, faster first paint
- **Cons:** 100–300ms delay when applying filters (network round-trip)

### Recommendation

**Use Option A across the board.** Carsa's largest make/model combinations fit comfortably in memory:

| Page | Inventory size |
|------|----------------|
| Most common model (`/used-cars/vw/golf`) | ~90 cars |
| Most common make (`/used-cars/audi`) | ~244 cars |
| Typical model page | 5–50 cars |
| Typical make page | 10–100 cars |

Even the worst case (244 Audis) is ~60KB of car data — lighter than a single high-res image. Loading the full filtered set makes client-side filtering instant, matching the responsiveness users expect from the current Finsweet setup.

The only page where Option B makes sense is the top-level `/used-cars` (all 5,000+ cars), which is outside the scope of this proposal.

---

## What This Delivers

### SEO
- **522 indexable pages** with unique titles, descriptions, and URLs — each targeting a specific make/model search query
- **Clean URL hierarchy** (`/used-cars/bmw/3-series`) that search engines understand and users can share
- **Internal linking** — make pages link to their models, model pages link back to the make, creating a connected SEO graph
- **Sitemap expansion** — 522 new entries for Google to crawl and index

### Performance
- **Faster perceived load** — the widget fetches only the cars for that make/model instead of loading everything
- **Instant client-side filtering** — with Option A, users filter without network delays
- **Smaller API payload** — each page requests a small slice of inventory, not the whole database

### Marketing
- **Dedicated landing pages** for Google Ads, social campaigns, and email links
- **Shareable URLs** — customers can share a specific search with friends
- **Analytics granularity** — track traffic and conversions per make/model, not just aggregate `/used-cars`

---

## Two Options for the Search Widget

The 522 static pages are the same in both options — what differs is the search widget that powers them.

### Option 1 — Use Shane's existing React component

Extend Shane's existing server-side React component to read the URL and apply make/model as a locked filter. Carsa's dev team handles this.

**Pros:**
- Already in progress — Shane's component is being built regardless
- Cheapest path forward
- Fully under Carsa's control — no third-party dependencies
- Uses Carsa's existing API — no data sync complexity

**Cons:**
- Limited search features — only what the team builds
- No typo tolerance, fuzzy matching, or natural language search
- Harder to add AI-powered features later (would need a separate rebuild)

### Option 2 — Build on Algolia

Replace (or augment) the search layer with Algolia — a hosted search platform used by Autotrader, Stripe, Medium, and most modern marketplaces. Algolia indexes Carsa's inventory, serves search results via a fast CDN, and provides a React InstantSearch library that handles rendering, faceting, and URL state.

**Pros:**
- **Typo tolerance** — "BMM" matches "BMW", "Merc" matches "Mercedes-Benz"
- **Instant-as-you-type search** — results update with every keystroke (~20ms)
- **Relevance tuning** — promote cars by age, price, location, or custom rules
- **Faceted filtering** — multi-select filters with instant counts ("145 cars match these filters")
- **Natural language search** — "cheap red BMW with low mileage" becomes a real query, not a keyword mismatch
- **AI-assisted search (future)** — Algolia's NeuralSearch plugin allows vector-based semantic search, e.g. "family car for long motorway trips" → matches estates, SUVs, diesels. Unlocks Carsa's ability to add AI-powered features without another migration.
- **Server-side rendering built-in** — Algolia provides SSR helpers for React, so first-page results are rendered on the server for SEO (exactly like Shane's component does).
- **Industry standard** — well-documented, stable, widely supported

**Cons:**
- **Higher upfront cost** — building a full Algolia-powered search widget is more work than extending Shane's component
- **Ongoing cost** — Algolia charges per 1,000 searches. Carsa's team has estimated **~£90/month** based on expected traffic. Billed directly by Algolia.
- **Data sync complexity** — need a pipeline to keep Algolia's index in sync with Carsa's inventory (typically a webhook or scheduled sync)
- **Replaces Shane's work** — Option 2 largely supersedes the server-side React component Shane is building. Worth confirming this is acceptable before committing.

### Which option?

| Criterion | Option 1 (Shane) | Option 2 (Algolia) |
|-----------|------------------|---------------------|
| Upfront cost | Lower | Higher |
| Ongoing cost | None | ~£90/month |
| Search quality | Basic | Excellent |
| Typo tolerance | No | Yes |
| Natural language / AI search | No | Yes (future) |
| Time to launch | Fastest | +1–2 weeks |
| Control | Full | Hosted (vendor-managed) |
| Future-proofing | Rebuild needed for AI | AI-ready out of the box |

**Our recommendation:** **Option 1 for now**, with a view to migrating to **Option 2** once the static pages are live and the SEO impact is measurable. This gives Carsa the fastest path to indexable pages and keeps Shane's existing work relevant. Algolia can be layered in later without redoing the static page structure.

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Slug mismatch** — URL slug doesn't match data value, page shows zero results | Medium | Medium | Widget uses Carsa's own inventory to build the slug→name mapping. Detailed slug specification provided upfront. |
| **Thin content** — pages for makes/models with zero current inventory | Medium | Low | Widget shows "No cars currently available" with alternatives. Pages stay published to preserve Google indexation — they're ready when stock returns. |
| **Publish time** — 522 extra pages make Webflow publishes slower | Low | Low | Adds ~30–60s to publish time. No functional impact. |
| **Special characters** — makes/models like "Mercedes-Benz", "Cupra León", "DS 3" need careful slugification | Low | Medium | Slug rules defined upfront and tested before page creation. |
| **New makes/models** — when a new make or model enters inventory, a page needs to be created | Medium | Low | Handled by optional sync automation (see add-on below). |
| **Algolia sync drift** (Option 2 only) | Low | Medium | Webhook-triggered sync ensures Algolia index matches inventory within seconds. Daily full-sync as a safety net. |
| **Vendor lock-in** (Option 2 only) | Low | Medium | Algolia is industry standard with stable APIs. Migrating away is always possible but non-trivial. |

---

## Scope of Work

### What's included (both options)

| # | Task | Detail |
|---|------|--------|
| 1 | **CMS data mapping** | Pull all 47 makes and 475 models from Carsa's CMS. Build the definitive slug mapping (URL slug ↔ display name) with rules for special characters. |
| 2 | **Webflow component** | Build a shared page body component containing the search widget container, dynamic heading area, breadcrumbs, and layout. Update once → updates all 522 pages. |
| 3 | **Car card refinement** | Polish the card design Shane copied from the existing search-demo. Spacing, typography, badge alignment, hover states, responsive behaviour. |
| 4 | **Page creation automation** | Create 47 make folders and 522 pages (47 make-level + 475 model-level) via Webflow's MCP, each using the shared component. |
| 5 | **Hardcoded `<h1>` per page** | Each page gets a unique, keyword-rich heading written into the page HTML (e.g. "Used BMW 3 Series for Sale"). Hardcoded rather than JS-rendered for maximum SEO reliability. |
| 6 | **SEO metadata** | Generate unique meta title, meta description, and Open Graph tags for every page using templates (e.g. "Used {Make} {Model} for Sale \| Carsa"). |
| 7 | **Automated testing plan** | Set up Playwright test suite that covers representative pages across categories (see Testing Plan section below) — avoids the need to manually verify all 522 pages. |
| 8 | **QA & verification** | Run the automated test suite, spot-check representative pages across make/model categories, verify slugs, metadata, and component rendering. |

### Additional for Option 1 (Shane's component)

| # | Task | Detail |
|---|------|--------|
| 9 | **Widget specification for Shane** | Detailed technical spec covering URL parsing, slug mapping, locked filter behaviour, redirect-on-filter-change, zero-results handling, and Option A data-loading strategy. |

### Additional for Option 2 (Algolia)

| # | Task | Detail |
|---|------|--------|
| 9 | **Algolia account setup + index schema** | Create Algolia account, configure index with relevant searchable attributes (make, model, price, year, mileage, etc.) |
| 10 | **CMS → Algolia sync pipeline** | Build the pipeline that keeps the Algolia index in sync with Carsa's inventory (webhook-triggered or scheduled) |
| 11 | **React InstantSearch widget** | Build the search widget using Algolia's React InstantSearch library, with custom UI matching the refined car card design |
| 12 | **URL state + SSR integration** | Sync URL path ↔ Algolia filters, including redirect-on-filter-change behaviour. Set up SSR so first-page results render on the server for SEO. |
| 13 | **Relevance tuning** | Configure Algolia ranking rules, synonyms, and custom sorts |
| 14 | **QA + edge cases** | Test search behaviour, typo tolerance, filter combinations, zero-results states |

### What's not included (both options)

- **Full redesign of the car card or page layout** — refinement of the existing Shane-copied card is included. A ground-up redesign is out of scope.
- **Google Search Console setup** — submitting the new sitemap or monitoring indexation
- **Custom content per page** — `<h1>` and meta descriptions are template-generated per make/model. Hand-written marketing copy per page is out of scope.
- **Algolia monthly subscription costs** (Option 2) — billed directly to Carsa

---

## Testing Plan

With 522 pages, testing every single page manually is impractical. Instead, pages are grouped into categories and a representative sample from each group is tested automatically using Playwright. If the sample passes, the category is considered verified.

### Page categories

| Category | Count | What's tested | Example pages |
|----------|-------|---------------|---------------|
| **High-inventory model pages** | 3–5 | Largest model pages — verify Option A loads full set, filters work, first paint is fast | `/used-cars/vw/golf` (90 cars), `/used-cars/ford/focus`, `/used-cars/bmw/3-series` |
| **High-inventory make pages** | 3–5 | Largest make pages — verify correct filter, count matches, pagination | `/used-cars/audi` (244 cars), `/used-cars/bmw`, `/used-cars/vw` |
| **Typical model pages** | 3–5 | Average model inventory (5–30 cars) — verify normal case | `/used-cars/honda/jazz`, `/used-cars/kia/picanto`, etc. |
| **Typical make pages** | 3–5 | Average make inventory | `/used-cars/honda`, `/used-cars/kia`, etc. |
| **Special character slugs** | 3–5 | URL encoding edge cases | `/used-cars/mercedes-benz`, `/used-cars/ds/ds-3`, `/used-cars/cupra/leon` |
| **Zero-inventory pages** | 2–3 | "No cars available" state renders correctly, page stays indexable | Any make/model with 0 current cars |
| **Unknown slug (404 handling)** | 1 | Verify unknown slug shows appropriate message with link back | `/used-cars/nonexistent/model` |
| **Top-level redirect behaviour** | 1 | Verify selecting a make on `/used-cars` redirects to `/used-cars/{make}` | Start on `/used-cars`, select BMW, verify URL becomes `/used-cars/bmw` |

**Total representative pages tested:** ~20–25 (out of 522)

### What each test verifies

- **Page loads** without console errors
- **Correct `<h1>`** is present in the HTML (critical for SEO)
- **Correct meta title + description** in the page head
- **Search widget renders** and shows cars for the filtered make/model
- **Client-side filters work** (select a price range, verify results update)
- **Reduced-motion compliance** (if animations are present)
- **Accessibility basics** (axe-core automated scan for critical violations)

### When tests run

- **On demand** during QA before launch
- **After any widget or component change** to catch regressions
- **Can be added to CI** (optional — runs automatically on every code push)

Running the full suite takes ~5 minutes. Adding a new page category to the suite takes ~15 minutes.

---

## Timeline

> **Note on page creation time:** The 522-page creation step is listed as **TBC** (to be confirmed) because we first need to verify the full capabilities of Webflow's MCP API — specifically whether it supports hardcoding the `<h1>` text into each generated page and attaching the shared component automatically. I'll confirm the exact time once I've run a small proof-of-concept on a handful of pages. The estimate below is a working figure that may move by ±1 day.

### Option 1 — Shane's component

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| CMS mapping + slug rules | 1 day | Slug mapping document |
| Component build + car card refinement | 1–2 days | Shared Webflow component with polished car card |
| Page creation + hardcoded h1 + SEO metadata *(TBC pending MCP verification)* | 1–2 days | 522 pages live on staging |
| Widget specification for Shane | 1 day | Technical spec |
| Automated test suite + QA | 1 day | Test suite passing on representative pages |
| **Total (our work)** | **~1–1.5 weeks** | Pages ready |
| Shane's widget update | TBD | Filtered search working |

### Option 2 — Algolia

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| CMS mapping + slug rules | 1 day | Slug mapping document |
| Component build + car card refinement | 1–2 days | Shared Webflow component with polished car card |
| Algolia setup + index config | 1 day | Configured Algolia index |
| CMS → Algolia sync pipeline | 1–2 days | Live inventory sync |
| React InstantSearch widget build | 3–4 days | Widget rendering with search |
| URL state + SSR integration | 1–2 days | Server-side rendered results + redirect handling |
| Page creation + hardcoded h1 + SEO metadata *(TBC pending MCP verification)* | 1–2 days | 522 pages live on staging |
| Automated test suite + QA + relevance tuning | 1–2 days | Verified and tuned |
| **Total** | **~2.5–3 weeks** | Fully functional |

**Estimated start date:** Upon approval

---

## Investment

> **Note:** The "Page creation automation" line is marked **TBC** pending verification of how much of the page creation (folder + page + hardcoded h1 + component attachment + SEO metadata) Webflow's MCP API can handle in one pass. A short proof-of-concept on ~5 pages will confirm the final figure. Current estimate is a working number that may move by ±£100.

### Option 1 — Shane's component

| Item | Cost |
|------|------|
| CMS data mapping + slug rules | £100 |
| Webflow component build | £100 |
| Car card refinement (polish the Shane-copied card) | £200 |
| Page creation automation *(TBC)* — 47 folders + 522 pages + hardcoded h1 + metadata | £300 |
| Widget specification for Shane | £100 |
| Automated test suite (Playwright, representative pages) | £200 |
| QA & verification | £100 |
| **Total** | **~£1,100** |

### Option 2 — Algolia (rough estimate)

| Item | Cost |
|------|------|
| CMS data mapping + slug rules | £100 |
| Webflow component build | £100 |
| Car card refinement (polish the Shane-copied card) | £200 |
| Page creation automation *(TBC)* — 47 folders + 522 pages + hardcoded h1 + metadata | £300 |
| Algolia account + index schema | £200 |
| CMS → Algolia sync pipeline | £400 |
| React InstantSearch widget (with custom UI matching refined card) | £1,200 |
| URL state + SSR integration (+ redirect-on-filter) | £400 |
| Relevance tuning | £200 |
| Automated test suite (Playwright, representative pages) | £200 |
| QA & verification | £200 |
| **Total** | **~£3,500** |

Range: **£3,200–£3,900** pending MCP page creation verification and scoping of design fidelity. A precise quote can be provided after a short scoping call.

**Ongoing Algolia subscription:** ~£90/month, billed directly to Carsa by Algolia.

All prices in GBP. Valid for 30 days from proposal date.

---

### Optional Add-on: Sync Automation

A CLI script that keeps Webflow pages in sync with Carsa's inventory:

- Reads the API to detect new makes/models → creates pages automatically (folder + page + SEO metadata + shared component)
- Reports which existing pages currently have zero inventory (for awareness — pages are **not** removed, so Google keeps them indexed and they're ready when stock returns)
- Run on-demand whenever inventory changes (e.g. `node sync-pages.js`)

| Item | Cost |
|------|------|
| Sync automation script | £300 |

This eliminates the manual maintenance cost of 522 pages long-term. Compatible with both Option 1 and Option 2.

---

## Payment

### Option 1

| Milestone | Amount | When |
|-----------|--------|------|
| Deposit | £550 (50%) | On approval |
| Completion | £550 (50%) | All pages live, tests passing, verified |

### Option 2

| Milestone | Amount | When |
|-----------|--------|------|
| Deposit | £1,750 (50%) | On approval |
| Mid-build milestone | £875 (25%) | Algolia widget rendering on staging |
| Completion | £875 (25%) | All pages live, tests passing, tuned |

Payment by bank transfer, due within 7 days of invoice.

---

## Requirements from Carsa

To keep the project on track, I'll need:

- [ ] **Webflow MCP access** — authorise the Carsa site in the Webflow MCP bridge so I can read CMS data and create pages programmatically
- [ ] **Confirmation of make/model list** — verify the 47 makes and 475 models are current and correct before page creation begins
- [ ] **Inventory API access** — read access to the API that serves car data, so the widget (and sync script, if chosen) can query it
- [ ] **Decision on Option 1 vs Option 2** — which search architecture to pursue
- [ ] **For Option 1:** Shane's commitment to update his component with URL parsing, locked filters, and redirect-on-filter-change behaviour (note: the `<h1>` is **not** part of Shane's scope — we handle that by hardcoding it into each Webflow page)
- [ ] **For Option 2:** Confirmation that Algolia's ~£90/month cost is acceptable and an account can be created

---

## Questions for Tomek

Before we finalise the approach, a few things worth confirming:

### Architecture questions

1. **Option 1 vs Option 2 — which direction?** Do you want to:
    - (a) Go with Shane's component for speed and cost, and revisit Algolia later
    - (b) Jump straight to Algolia to avoid a second migration
    - (c) Run Option 1 first, then move to Algolia in 3–6 months once SEO impact is measurable

2. **Can Shane's component use Option A or Option B?** Option A loads the full filtered set of cars on first load (instant client-side filtering, no network round-trips). Option B loads only the first page and fetches more when filters change. Which approach is the current plan?

3. **On a pre-filtered page like `/used-cars/vw/golf` (~90 cars) or `/used-cars/audi` (~244 cars), can his component load the entire filtered set for instant client-side filtering?** Both are well within memory limits and would give the best user experience on the static pages. This could even be a hybrid: Option A on `/used-cars/{make}/{model}` pages, Option B on the top-level `/used-cars`.

4. **Redirect-on-filter-change behaviour** — when a user on `/used-cars` selects a make or model from the dropdown, should the page redirect to the corresponding static URL (e.g. `/used-cars/bmw`)? This funnels traffic into indexable URLs and gives clean per-make analytics, but it's a behavioural change to confirm.

### Data questions

5. **Slug mapping source** — what's the authoritative source for make/model display names? Is there an API endpoint that returns them, or should the mapping be built from the inventory itself?

6. **Inventory API** — is there a documented API we can query for filtered car lists, or does it all go through Shane's component today?

### Scope questions

7. **Finsweet** — is Finsweet being fully removed from the new VSRP, or does any of it stay? (Important because some current code on `/used-cars` depends on Finsweet hooks.)

8. **Design consistency** — should the refined car card match the existing `/used-cars` page styling, or is there a new design direction for the Shane rebuild we should match instead?

---

## Next Steps

1. Review this proposal
2. Answer the questions above (or jump on a call to discuss)
3. Confirm which option to pursue
4. Authorise the Carsa Webflow site in the MCP bridge
5. Pay deposit to begin

Questions? Reply to this document or reach out directly.
