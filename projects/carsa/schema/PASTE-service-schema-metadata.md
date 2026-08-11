# Service Pages — SEO Metadata & Schema (paste + status)

**Site:** Carsa `68348ea61096b37caacd2f95` · staging `carsa-v2.webflow.io`
**Applied:** 2026-07-15 via Webflow MCP. Changes are saved to the Designer but **not published** — publish to **staging** and confirm noindex before any production publish (per BUILD-STATE guardrail).

---

## ✅ Done automatically via API (nothing to paste)

| Page | SEO title/desc | JSON-LD schema |
|---|---|---|
| **Hub** `/mot-and-car-servicing` (`6a569126abdef374eb6fa840`) | Already correct — left as-is | ✅ Written: WebPage + BreadcrumbList + Service (OfferCatalog: MOT £39, MOT+Service £30, Servicing £120, Air-con £120) |
| **Store Locator** `/mot-and-car-servicing/store-locator` (`6a56a9e5d66f337fc864e465`) | ✅ Replaced generic "nationwide store finder" copy with servicing-specific copy | ✅ Written: CollectionPage + BreadcrumbList + ItemList of the 5 AutoRepair centres |
| **5 Service Location CMS items** | ✅ `seo-title` + `seo-metadescription` populated on all 5 (Halesowen, Cannock, Bolton, Towcester, Mountsorrel) | — (schema below) |

The Service Locations **template** already has its page SEO title/description bound to the CMS
`{{wf seo-title}}` / `{{wf seo-metadescription}}` fields — so once the 5 items publish, each location
page gets its own correct title + description automatically. No action needed there.

---

## ⚠️ Manual paste required — template schema (dynamic CMS fields)

The API **cannot** write the location-template schema: it uses `{{wf …}}` CMS field bindings, which
aren't valid JSON, so the schema endpoint rejects them (400 "must be valid JSON"). This one is
Designer-only.

**Source file:** `projects/carsa/schema/mot-and-car-servicing-template.html`

### How to paste it
1. Open the **Service Locations Template** page (`detail_servicing-locations`, `6a568b69696eee98efe09cb1`) in the Designer.
2. Page **Settings** → **Custom code** → **Inside `<head>` tag** (or an HTML Embed in the `<head>` region).
3. Paste the full `<script type="application/ld+json">…</script>` block from the file above.
4. **Re-insert each `{{wf …}}` binding using Webflow's "+ Add Field" picker** — pasted binding text
   often stays literal rather than becoming a live field chip. Match each slot to the file:
   - `slug` (the item's own slug) → used in every `@id`/`url`
   - `linked-store:name`, `:phone`, `:email`, `:main-image`, `:address`, `:city`, `:postcode`,
     `:latitude`, `:longitude`, `:opening-times`
   - `seo-metadescription` (the item's own field)
5. Save → publish to **staging** → validate a live location URL in Google Rich Results Test.

### Fix already applied to the file
`openingHours` now binds to **`linked-store:opening-times`** (PlainText), not `opening-hours`
(RichText). RichText would have injected HTML markup into the schema and broken validation. If
`opening-times` isn't in `Mo-Fr 08:00-18:00` format on the Stores items, either reformat it or drop
the `openingHours` line — everything else is valid.

---

## Verified field mapping (all resolve on the live Stores collection)
`name` · `phone` · `email` · `main-image` · `address` (short) · `city` · `postcode` · `latitude` ·
`longitude` · `opening-times`. Schema `@id` references (`#organization`, `#website`) resolve against
the site-wide schema in the global head code.

## Before production publish
- Confirm **noindex** on hub, store-locator, and template (BUILD-STATE guardrail — new pages stay noindex until sign-off).
- Publish the 5 CMS items so the bound template SEO + per-location meta go live.
- Winter Health Check page is **not built yet** — its schema template is ready at `schema/winter-health-check.html` for when it exists.
