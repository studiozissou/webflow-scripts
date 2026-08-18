# TSC — Structured-Data Fix (15 Semrush errors → 0)

_Created 16 Jul 2026. Clears Semrush issue #45 (structured data with markup errors)._

> **Update 16 Jul 2026 (later):** Added a static `image` (TSC app icon) to both
> `Product` templates to clear the Rich Results "missing image" error. Applied via
> the Webflow MCP `bulk_update_pages_schema_markup` — passing the schema as a JSON
> **object** (not a raw string), so the `{{wf …\} }}` CMS binding tokens serialize
> validly. **Needs a site publish to go live.**

## Why
Semrush required, for each item:
- **Product** → at least one of `offers` / `aggregateRating` / `review`.
- **SoftwareApplication** → `offers` **AND** (`aggregateRating` *or* `review`).

TSC has no public prices, ratings, or reviews. Faking `aggregateRating`/`review`
violates Google's guidelines (manual-action risk), so we do **not** add them.

## Decision
1. Add a "Contact for pricing" `Offer` to all 15 items → clears every `Product`.
2. **Reclassify the 10 `SoftwareApplication` items to `Product`** so they stop
   demanding a rating/review. Software is a legitimate `Product`. The RailOS
   platform link is preserved via `additionalProperty` (Platform = RailOS).

Net: 15 → 0 errors, no fabricated data. `price: "0"` reads as "contact us" and
matches the pattern already live on `/railos`.

## Where to paste
Both are set in the **collection template's Page Settings → Custom Code →
Inside `<head> tag`** (they render in `<head>` with per-item CMS bindings).
Keep your existing **Name** and **Meta Description** field bindings — only the
lines below change.

---

### 1 · Products template  (clears `/products/*` — 5 items)
`@type` already `Product`; **just add the `offers` block** (note the new comma
after `category`).

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "«Name field binding»",
  "description": "«Meta Description field binding»",
  "brand": {
    "@type": "Organization",
    "name": "The Signalling Company",
    "@id": "https://www.thesignallingcompany.com/#organization"
  },
  "manufacturer": {
    "@id": "https://www.thesignallingcompany.com/#organization"
  },
  "image": "https://cdn.prod.website-files.com/6a32b717a48adbce92029295/6a4e5ef8e185d5db92037705_tsc%20app%20icon%20big.png",
  "category": "Railway signalling product",
  "offers": {
    "@type": "Offer",
    "availability": "https://schema.org/InStock",
    "priceCurrency": "EUR",
    "price": "0",
    "description": "Contact for pricing"
  }
}
</script>
```

---

### 2 · RailOS Apps template  (clears `/railos-apps/*` — 9 items)
Change `@type` to `Product`; drop `applicationCategory` / `operatingSystem` /
`provider`; add `category`, `brand`, `manufacturer`, `additionalProperty`
(preserves the RailOS platform signal), and `offers`.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "«Name field binding»",
  "description": "«Meta Description field binding»",
  "brand": {
    "@type": "Organization",
    "name": "The Signalling Company",
    "@id": "https://www.thesignallingcompany.com/#organization"
  },
  "manufacturer": {
    "@id": "https://www.thesignallingcompany.com/#organization"
  },
  "image": "https://cdn.prod.website-files.com/6a32b717a48adbce92029295/6a4e5ef8e185d5db92037705_tsc%20app%20icon%20big.png",
  "category": "RailOS application",
  "additionalProperty": {
    "@type": "PropertyValue",
    "name": "Platform",
    "value": "RailOS"
  },
  "offers": {
    "@type": "Offer",
    "availability": "https://schema.org/InStock",
    "priceCurrency": "EUR",
    "price": "0",
    "description": "Contact for pricing"
  }
}
</script>
```

---

### 3 · `/railos` static page  (clears the platform page — 1 item)
This one is hand-authored (not CMS). Updated version is already in
`tsc-schema-all.md` (`/railos` graph, `#software` node): `SoftwareApplication`
→ `Product` with the same offer + `additionalProperty`. Copy that node into the
`/railos` page's `<head>` custom code.

---

## Verify after publishing
```bash
# should show "Product" (not SoftwareApplication) + an offers block
curl -s https://www.thesignallingcompany.com/products/etcs        | grep -o '"@type": "[A-Za-z]*"'
curl -s https://www.thesignallingcompany.com/railos-apps/etcs-app | grep -o '"@type": "[A-Za-z]*"'
```
Then re-run the Semrush audit (or Google Rich Results Test on one product +
one app URL) — issue #45 should drop from 15 to 0.
