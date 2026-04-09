# Proposal: Make & Model SEO Pages for Used Cars

**Date:** 9 April 2026
**Prepared for:** Tomek Stacharski, Carsa
**Prepared by:** Will Morley
**Status:** Draft (revised approach)

> **Revision note:** This replaces the earlier programmatic pages draft (7 April). After reviewing the constraints, we've pivoted to a leaner Webflow CMS Collections approach that uses native Webflow features and integrates Shane's existing React filtering component via DevLink.

---

## The Problem

Carsa's used car search lives on a single page — `/used-cars`. Every make and model is filtered client-side, which means:

- **Search engines can't index individual makes and models.** There's no dedicated page for Google to find. When someone searches "used BMW 3 Series Carsa", there's nothing specific to rank.
- **Slow initial load.** The page loads the entire inventory, then filters in the browser. A scoped page per make or model would only load what's needed.
- **No landing pages for ads or campaigns.** If Carsa wants to run Google Ads for "used Audi A4", there's no dedicated URL to point it at — just `/used-cars` with a filter applied, which doesn't persist or index.

Competitors like AutoTrader and Cinch have dedicated pages for every make and model. This is table stakes for automotive SEO.

---

## The Solution

Use Webflow's CMS Collections to generate native search pages for every make and model, scope each page's results to the relevant inventory, and integrate Shane's existing React filtering component via Webflow DevLink. The interactive layer stays in sync with the Webflow design system without duplicate implementations.

The approach has three parts:

1. **Make + Model CMS pages.** Duplicate the existing VSRP (Vehicle Search Results Page) into two Webflow Collection templates — one for Makes, one for Models. Every make and model in the CMS gets its own search page automatically. Scope each page's results so initial loads only pull the relevant inventory.

2. **Crosslinks + internal linking.** Add a crosslinks section to each template so Make pages link to their Models, Model pages link back to their Make and to related models, and the whole catalogue becomes a tightly-interlinked graph for crawlers.

3. **Shane's React filtering layer via DevLink.** Integrate Shane's existing React filtering component on the VSRP via Webflow DevLink. The page renders the first 48 cars immediately (fast initial paint, SEO-indexable HTML), then swaps in the filtered list instantly when the React layer hydrates.

### URL structure

```
/used-cars                       ← existing search (unchanged)
/used-cars/make/bmw              ← all BMW (scoped)
/used-cars/make/audi             ← all Audi (scoped)
/used-cars/model/bmw-3-series    ← BMW 3 Series only
/used-cars/model/audi-a4         ← Audi A4 only
```

Webflow CMS Collection pages require the collection slug in the URL path — so Make pages live at `/used-cars/make/{slug}` and Model pages at `/used-cars/model/{slug}`, not the cleaner `/used-cars/{slug}` we discussed previously. This is a platform constraint rather than a design choice. In practice it's fine for SEO (AutoTrader and Cinch use similar structures) and we'll set canonical rules + redirects to consolidate authority. See Risks below.

---

## How It Works

### The CMS layer

The Makes and Models Collections already exist in Webflow as the filter options on the current `/used-cars` page. I'll:

1. Move the Makes and Models Collections under the `/used-cars/` folder so their Collection page URLs become part of the used cars hierarchy.
2. Build two Collection page templates — one for Makes, one for Models — each duplicated from the current VSRP layout.
3. Configure each template to scope the search results to its own CMS item (e.g. the BMW Make page shows only BMW cars; the BMW 3 Series Model page shows only that model).
4. Add a crosslinks block that pulls related Makes/Models from the CMS and links to them for internal link equity.
5. Set up 301 redirects from any old or moved URLs so Google and bookmarks don't break.

Every make and model that exists in the CMS gets a page automatically — no manual page creation, no publish-time penalty from hundreds of static pages, no sync script to maintain. Adding a new make or model in the CMS publishes a new indexable page within the next Webflow publish.

### The React filtering layer (via DevLink)

Shane's React filtering component already exists in the Carsa codebase. **Webflow DevLink** lets us mount that component inside Webflow pages while keeping it in sync with the Webflow design system — no hand-written duplicates, no design drift between Carsa's React and Webflow.

**Loading strategy:**

- **Initial paint (server-rendered):** Webflow renders the first 48 cars from the CMS Collection directly in HTML. Fast, SEO-indexable, no JS required to see content.
- **Interactive layer (hydration):** Shane's React filtering component mounts and takes over, swapping in the filtered list instantly when the user interacts with filters or the URL specifies a make/model.

This hybrid gives us:

- Fast first paint (static HTML with 48 cars)
- Strong SEO (real server-rendered content per make/model)
- Full interactivity once the React layer hydrates
- Design consistency via DevLink
- No duplicate car card implementations to maintain

### SEO audit + polish

Once the structure is in place, I'll run a full SEO audit on the new pages — meta titles, descriptions, canonicals, internal linking, structured data, indexability — and implement the recommendations. UI tweaks and debugging across the new pages roll into this phase.

---

## What This Delivers

### SEO

- **Every make and model becomes an indexable landing page** — dynamically generated from the CMS, no manual work per page, auto-updates as inventory changes.
- **Scoped server-rendered content** — Google sees real car listings on each page at first paint, not an empty shell waiting for JS.
- **Internal link equity** — crosslinks section on every page boosts crawl depth and distributes authority across the catalogue.
- **Sitemap expansion** — every Make and Model Collection item becomes a sitemap entry automatically.

### Performance

- **Massively reduced initial load times**, especially on model pages — each page fetches only the relevant subset of inventory instead of the entire catalogue.
- **Progressive enhancement** — users see 48 cars immediately, the React filtering layer hydrates in the background.

### Marketing

- **Dedicated landing pages per make and model** for Google Ads, email campaigns, and partner links.
- **Shareable URLs** that persist and rank.
- **Per-make/model analytics** — track traffic, conversion, and intent by segment, not just aggregate `/used-cars` traffic.

### Engineering

- **DevLink keeps the React car card synced** between the Webflow design system and Carsa's React codebase — single source of truth, no more design drift.
- **Zero page-creation debt** — new makes or models in the CMS get pages automatically. No sync scripts, no manual page creation, no maintenance burden.

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **URL path constraint** — Webflow forces Collection pages to `/used-cars/make/{slug}` and `/used-cars/model/{slug}` rather than the cleaner `/used-cars/{slug}`. | High (platform constraint) | Low-Medium | Run a full SEO audit on the new structure. Set canonical rules to consolidate authority. 301 redirect any legacy URLs. In practice Google ranks Collection-style URLs fine when the content is strong — AutoTrader and Cinch use similar structures. |
| **DevLink integration is unproven on this project** — Shane's React filtering component hasn't been mounted via DevLink before, and DevLink setup in the Carsa React codebase needs to be confirmed. | Medium | Medium | The ~4h estimate for the DevLink integration block is provisional pending a short research spike. I'll scope firmly before starting the block. Fallback: if DevLink proves too fiddly, mount Shane's component via a standard embed + Webflow symbol. |
| **First-paint vs filter-layer mismatch** — the initial 48-car server render and the React-hydrated filtered list could briefly show different content during hydration. | Low | Low | Swap is atomic once React mounts. If any flicker appears, add a short crossfade on swap. Negligible user impact. |
| **Collection URL move affects existing references** — moving Makes/Models Collections under `/used-cars/` may break any existing URLs, internal links, or campaigns pointing at the old Collection paths. | Low | Medium | Audit all existing references before the move. Set up 301 redirects from the old Collection URLs to the new ones. |
| **Redirect UX on make selection** — redirecting users from VSRP to a Make page when they pick a make filter may feel jarring vs. filtering in place. | Low | Low | Test the UX before committing. Default to filtering in place; treat the redirect as an optional enhancement. |

---

## Scope of Work

### What's included

| # | Task | Detail |
|---|------|--------|
| 1 | **Make + Model CMS page templates** | Duplicate the existing VSRP into two Webflow Collection page templates (Make and Model). Scope each template's search results to the relevant CMS item. |
| 2 | **URL structure + redirects** | Move the Makes and Models Collections under `/used-cars/make/` and `/used-cars/model/`. Set up 301 redirects from any old or legacy URLs. |
| 3 | **Crosslinks section** | Add a CMS-driven crosslinks block to the Make and Model templates for internal link equity (Make → Models, Model → Make + related Models). |
| 4 | **Shane's React filter integration via DevLink** | Integrate Shane's existing React filtering component on the VSRP via Webflow DevLink. Render the first 48 cars server-side, swap in the filtered list on hydration. Set up DevLink sync for the car card component. |
| 5 | **SEO audit + recommendations** | Full SEO audit on the new pages (meta titles, descriptions, canonicals, structured data, internal linking, indexability) and implement the findings. |
| 6 | **UI tweaks + debugging** | Polish the new pages, fix issues surfaced during QA, and roll fixes out to all Make/Model pages as needed. |

### What's not included

- **Shane's React filtering component itself** — owned by Carsa's dev team. This proposal integrates it, not builds it.
- **New VSRP design work** — uses the existing VSRP layout. Significant design changes to the VSRP itself are separate scope.
- **Custom copy per make/model** — meta titles, descriptions, and headings are templated. Hand-written unique copy per page is not included.
- **Google Search Console setup** — submitting the new sitemap or monitoring indexation. Happy to advise.
- **Content marketing pages** (buyer guides, comparison posts, editorial) — separate scope if wanted.

---

## Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| MVP Make + Model CMS pages | ~4h | Make and Model Collection templates live on staging, scoped search results, crosslinks, redirects in place |
| DevLink research spike | ~1h (folded into the next block) | Confirmed integration approach for Shane's React filter via DevLink |
| Shane's filter integration + car card DevLink sync | ~3h | React filter mounted on VSRP, 48-car server render + filtered-list swap working, car card synced |
| SEO audit + UI polish | folded into the above | New pages audited, recommendations applied, UI polished |
| **Total** | **~8h (~1–1.5 working days)** | MVP live, ready for QA and rollout |

**Note:** The MVP CMS pages can go live on staging within the first 4h — before the DevLink integration lands. They'll be indexable and functional immediately; the DevLink layer enhances interactivity but isn't a blocker for publishing.

**Estimated start:** Upon approval
**Estimated completion:** Within ~1 week of start

---

## Investment

| Item | Hours | Cost |
|------|-------|------|
| MVP Make + Model CMS pages (templates, URL structure, redirects, crosslinks, SEO audit, UI polish) | 4h | £400 |
| Shane's React filtering component integration via DevLink (includes research spike + car card sync) | ~4h (TBC) | ~£400 |
| **Total** | **~8h** | **~£800** |

All prices in GBP. Rate: £100/hr. Valid for 30 days from proposal date.

**Note on the DevLink block:** The 4h estimate for integrating Shane's React filtering component is provisional pending a short research spike into DevLink setup on the Carsa React codebase. If it proves more involved than expected, I'll flag and revise the estimate before committing the block.

---

### Future Phase: Algolia Integration

Once the MVP pages are earning traffic and the SEO strategy is validated, the search layer can be upgraded to Algolia — a hosted search platform that would replace Shane's current React filtering logic with instant, server-rendered results at any scale.

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

**Why not now?** The Webflow CMS + DevLink approach in this proposal is cheaper, faster to ship, and validates whether the SEO strategy earns traffic before committing to a recurring platform cost. Worth revisiting Algolia once the new pages are pulling meaningful organic traffic.

---

## Payment

| Milestone | Amount | When |
|-----------|--------|------|
| Deposit | £400 (50%) | On approval |
| Completion | £400 (50%) | MVP pages live, DevLink integration working, verified on staging |

Payment by bank transfer, due within 7 days of invoice.

---

## Requirements from Carsa

To keep the project on track, I'll need:

- [ ] **Webflow MCP access** — authorise the Carsa site in the Webflow MCP bridge so I can read CMS structure and build Collection templates programmatically.
- [ ] **CMS access + confirmation** — confirm the Makes and Models Collections are current and correctly structured before the move under `/used-cars/`.
- [ ] **Short sync with Shane** — a 30-minute call to confirm what his React filtering component can do and validate the DevLink integration approach. My working assumption is the component handles server-side + client-side filtering in one, which would make the integration straightforward.
- [ ] **DevLink setup confirmation** — Shane to confirm whether DevLink is already set up in the Carsa React codebase, or whether that's part of the research spike.
- [ ] **Staging environment access** — to verify the new pages and DevLink integration before going live.

---

## Next Steps

1. Review this proposal
2. Confirm scope and timeline
3. Authorise the Carsa Webflow site in the MCP bridge
4. Schedule the 30-minute sync with Shane
5. Pay deposit to begin

Questions? Reply to this document or reach out directly.
