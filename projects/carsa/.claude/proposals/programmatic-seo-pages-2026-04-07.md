# Proposal: Programmatic SEO Pages for Used Cars

**Date:** 7 April 2026
**Prepared for:** Tomek Stacharski, Carsa
**Prepared by:** Will Morley
**Status:** Draft

---

## The Problem

Carsa's used car search lives on a single page — `/used-cars`. Every make and model is filtered client-side, which means:

- **Search engines can't index individual makes and models.** There's no `/used-cars/bmw/3-series` page for Google to find. When someone searches "used BMW 3 Series Carsa", there's nothing specific to rank.
- **Slow initial load.** The page loads every car, then filters in the browser. A dedicated page per model would load only what's needed.
- **No landing pages for ads or links.** If Carsa wants to run a Google Ads campaign for "used Audi A4", there's no dedicated URL to point it at — just `/used-cars` with a filter applied, which doesn't persist or index.

Competitors like AutoTrader and Cinch have dedicated pages for every make and model. This is table stakes for automotive SEO.

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

Each page uses the existing search widget (`carsa-search.js`) with one small change: the script reads the URL path to determine which make/model to filter by. No per-page configuration needed — the same script works everywhere.

All 522 pages share a **single Webflow component**, so updating the design or layout once updates every page automatically.

---

## How It Works

### Page structure

Every page is a lightweight shell:

1. **Unique SEO metadata** — title, meta description, and Open Graph tags tailored to the specific make/model (e.g. "Used BMW 3 Series for Sale | Carsa")
2. **Shared component body** — the search widget container, heading, breadcrumbs, and any surrounding layout. Built once as a Webflow component, reused on all 522 pages.
3. **The search script** — reads the URL, filters results to the relevant make/model, and renders the car grid. No changes to per-page code.

### Script behaviour (Carsa dev team)

The search widget needs one modification: on load, parse the URL path and apply filters accordingly.

```
URL: /used-cars/bmw/3-series
       ↓         ↓      ↓
   base path   make   model

/used-cars           → show all cars (existing behaviour)
/used-cars/bmw       → filter to make = BMW
/used-cars/bmw/x5    → filter to make = BMW, model = X5
```

**Requirements for the script update:**
- Parse `/used-cars/{make}/{model}` from `window.location.pathname`
- Map URL slugs to API values (e.g. `3-series` → `3 Series`). Ideally the API provides a slug mapping, or the script builds one from the available inventory.
- When a make/model filter is active from the URL: apply it as a locked/pre-selected filter, hide the make/model dropdowns (redundant), keep all other filters (price, year, mileage, fuel, etc.) interactive.
- Handle edge cases: unknown slugs show a "No cars found" message with a link back to `/used-cars`. Zero results for a valid make/model show "No cars currently available" with suggested alternatives.
- Render the page `<h1>` dynamically (e.g. "Used BMW 3 Series for Sale") so each page has a unique, keyword-rich heading without manual Webflow text entry.

I'll pair with your dev team on the implementation and handle any debugging or design tweaks needed on the React car card once the URL parsing lands.

---

## What This Delivers

### SEO

- **522 indexable pages** with unique titles, descriptions, and URLs — each targeting a specific make/model search query.
- **Clean URL hierarchy** (`/used-cars/bmw/3-series`) that search engines understand and users can share.
- **Internal linking opportunities** — make pages link to their models, model pages link back to the make.
- **Sitemap expansion** — 522 new entries for Google to crawl and index.

### Performance

- **Faster perceived load** — the widget fetches a filtered dataset per page instead of loading everything then filtering client-side.
- **Smaller API payload** — each page requests only the relevant cars from the API.

### Marketing

- **Dedicated landing pages** for Google Ads, social campaigns, and email links.
- **Shareable URLs** — customers can share a specific search with friends.
- **Analytics granularity** — track traffic and conversions per make/model, not just the aggregate `/used-cars` page.

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Slug mismatch** — URL slug doesn't match API value, page shows zero results | Medium | Medium | Script uses the API's own inventory to build the slug→name mapping. Detailed slug specification provided. |
| **Thin content** — pages for makes/models with zero current inventory | Medium | Low | Script shows "No cars currently available" with alternatives and links to similar makes/models. Pages stay published to preserve Google indexation — they're ready when stock returns. |
| **Publish time** — 522 extra pages will make Webflow publishes slower | Low | Low | Adds ~30–60s to publish time. No functional impact. |
| **Special characters** — makes/models like "Mercedes-Benz", "Cupra León", "DS 3" need careful slugification | Low | Medium | Slug rules defined upfront and tested before page creation. |
| **New makes/models** — when a new make or model enters inventory, a page needs to be created manually | Medium | Low | Handled by optional sync automation (see add-on below), or flagged during periodic review. |

---

## Scope of Work

### What's included

| # | Task | Detail |
|---|------|--------|
| 1 | **CMS data mapping** | Pull all 47 makes and 475 models from Carsa's CMS. Build the definitive slug mapping (URL slug ↔ display name) with rules for special characters. |
| 2 | **Webflow component** | Build a shared page body component containing the search widget container, dynamic heading area, breadcrumbs, and layout. Update once → updates all 522 pages. |
| 3 | **Page creation automation** | Create 47 make folders and 522 pages (47 make-level + 475 model-level) via Webflow's API, each with the shared component. |
| 4 | **SEO metadata** | Generate unique meta title, meta description, and Open Graph tags for every page using templates (e.g. "Used {Make} {Model} for Sale | Carsa"). |
| 5 | **QA & verification** | Verify all pages are live, slugs are correct, component renders properly, and metadata is unique. Spot-check across makes/models. |
| 6 | **React car card debugging + design tweaks** | Pair with Carsa's dev team on the URL-parsing implementation. Debug and polish the React car card component as it renders on the new programmatic pages (2 hours allocated). |

### What's not included

- **Core search widget script modification** — Carsa's dev team owns the URL-parsing implementation in the React bundle. I'll pair on the work and handle card-level debugging + design tweaks, but the core script logic is theirs.
- **Design changes** — the page uses the existing search-demo layout. Any design updates to the component are separate.
- **Ongoing page maintenance** — adding/removing pages when inventory changes (see optional add-on below).
- **Google Search Console setup** — submitting the new sitemap or monitoring indexation.
- **Content writing** — meta descriptions are template-generated. Custom copy per make/model is not included.

---

## Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| CMS mapping + slug rules | 1 day | Slug mapping document |
| Component build | 1 day | Shared Webflow component |
| Page creation + SEO metadata | 1–2 days | 522 pages live on staging |
| QA + verification | 1 day | All pages verified |
| React car card polish + dev team pairing | ~2h | Polished car card on new pages, dev team aligned |
| **Total** | **~1 week** | Ready for Carsa's script update |

**Note:** Pages can go live on staging immediately. They'll show the unfiltered search widget until Carsa's dev team deploys the script update. No downtime or disruption to the existing `/used-cars` page.

**Estimated start date:** Upon approval
**Estimated completion:** 1 week from start

---

## Investment

| Item | Cost |
|------|------|
| CMS data mapping + slug rules | £100 |
| Webflow component build | £100 |
| Page creation automation (47 folders + 522 pages, 4h) | £400 |
| SEO metadata (522 unique titles + descriptions + OG) | £100 |
| QA & verification | £200 |
| React car card debugging + design tweaks (2h) | £200 |
| **Total** | **£1,100** |

All prices in GBP. Valid for 30 days from proposal date.

---

### Optional Add-on: Sync Automation

A CLI script that keeps pages in sync with Carsa's inventory:

- Reads the API to detect new makes/models → creates pages automatically (folder + page + SEO metadata + shared component)
- Reports which existing pages currently have zero inventory (for awareness — pages are **not** removed, so Google keeps them indexed and they're ready when stock returns)
- Run on-demand whenever inventory changes (e.g. `node sync-pages.js`)

| Item | Cost |
|------|------|
| Sync automation script (create/archive/report) | £300 |

This eliminates the manual maintenance cost of 522 pages long-term.

---

### Future Phase: Algolia Integration

Once the programmatic pages are earning traffic and the SEO strategy is validated, the search layer can be upgraded to Algolia — a hosted search platform that would replace the current React widget's filtering logic with instant, server-rendered results at any scale.

**What Algolia delivers:**
- Instant ~50ms search across the full inventory
- Typo tolerance (e.g. "bmv 3 seres" → BMW 3 Series)
- Faceted filtering at any scale (make, model, price, year, fuel, mileage, etc.)
- Query analytics — visibility into what customers are actually searching for
- Configurable ranking and relevance tuning

| Item | Cost |
|------|------|
| Algolia integration build (indexing pipeline, React integration, ranking config, migration) | ~£3,200 |
| Ongoing Algolia platform fees | ~£90/month |

**Why not now?** The Webflow + React programmatic approach in this proposal is cheaper, faster to ship, and validates whether the SEO strategy earns traffic before committing to a recurring platform cost. Worth revisiting Algolia once the programmatic pages are pulling meaningful organic traffic.

---

## Payment

| Milestone | Amount | When |
|-----------|--------|------|
| Deposit | £550 (50%) | On approval |
| Completion | £550 (50%) | All pages live and verified |

Payment by bank transfer, due within 7 days of invoice.

---

## Requirements from Carsa

To keep the project on track, I'll need:

- [ ] **Webflow MCP access** — authorise the Carsa site in the Webflow MCP bridge so I can read CMS data and create pages programmatically.
- [ ] **Confirmation of make/model list** — verify the 47 makes and 475 models are current and correct before page creation begins.
- [ ] **Script update commitment** — Carsa's dev team implements the URL-parsing logic in the search widget following the specification I provide. Pages will show unfiltered results until this is done.
- [ ] **Search widget API** — confirm the search widget's API supports filtering by make/model slug, or provide the slug↔name mapping the API uses.

---

## Next Steps

1. Review this proposal
2. Confirm scope and timeline
3. Authorise the Carsa Webflow site in the MCP bridge
4. Pay deposit to begin

Questions? Reply to this document or reach out directly.
