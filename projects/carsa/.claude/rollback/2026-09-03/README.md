# Rollback record — Carsa September SEO auto-fixes

**Executed:** 2026-09-03
**Spec:** `projects/carsa/.claude/specs/carsa-seo-autofixes-2026-09.md`
**Site:** Carsa — `68348ea61096b37caacd2f95`

## Captured state (before any write)

| File | Contents |
|------|----------|
| `cms-items-before.json` | Full JSON for both duplicate vehicle pairs, both adaptive-cruise blog items, the Shrewsbury location item |
| `pages-list-before.json` | All 88 site pages with IDs, slugs, draft state |
| `warranty-page-before.html` | Live HTML of the warranty page before the schema write |
| `sitemap-before.xml` | Live sitemap, 5474 URLs |
| `baseline-urls.txt` | HTTP status of all ten in-scope URLs before any change |

## IDs

| Thing | ID |
|-------|-----|
| Vehicles collection | `6846ae0d20cd88f8417a8e3f` |
| Locations collection | `68429a3b6fa9a12bf88fb7d1` |
| Blogs collection | `683879dedde8cf636e1b496b` |
| Vehicle `j16bnt-fa27e` (removed) | `69491cfa30d9576ea2b9325f` |
| Vehicle `f14yeg-03cc0` (removed) | `69494cb890f768413a01bbc4` |
| Vehicle `j16bnt` (kept) | `69491cf9eaf2b966b18f8969` |
| Vehicle `f14yeg` (kept) | `69494cb7a3290adbcdc08c8b` |
| Blog bare slug | `69b7a43359b74cf7c7335946` |
| Blog `-guide` slug (kept) | `69bcdfd3122c3e1dd92c0c0b` |
| Shrewsbury location | `684ff3738704eac18e7c3f6f` |
| Warranty page | `69a4779b7910d45403ba91bd` |

## What was changed, and how to undo each

### 1. Duplicate vehicle items — unpublished, not deleted

Both were taken off the live site with `unpublish_collection_items` and reverted to draft.
Live effect was immediate: both slugs now return 404, both survivors still return 200.

The spec's D1/D2 called for a permanent delete. That was gated by the permission classifier
and is still pending Will's approval. Unpublishing produces the same observable outcome
(404 plus removal from the sitemap) and is reversible.

**Undo:** `publish_collection_items` on collection `6846ae0d20cd88f8417a8e3f` with both IDs.

### 2. Warranty page schema — written, staged, not yet live

`bulk_update_pages_schema_markup` on page `69a4779b7910d45403ba91bd`. The page had no
JSON-LD at all before (`jsonLdSchema: null`), so the write is purely additive. The repo
copy is `projects/carsa/schema/car-care-extended-mechanical-warranty.html`.

Two deviations from the schema printed in the spec:

- Breadcrumb position 2 points at `https://www.carsa.co.uk/car-care/overview`, not
  `/car-care`. `/car-care` returns a 301 to `/car-care/overview`, so the spec's version
  would have put a redirecting URL in the breadcrumb. `/car-care/overview` is also what
  the cited pattern file `car-care-carsaprotect.html` uses.
- Everything else is verbatim, `provider` included. `provider` is not a recognised
  property of `Product` in schema.org, so a strict validator may show it as an
  unrecognised property. Google ignores unknown properties, so it is not a critical
  error, but it can be dropped if the Rich Results Test complains.

**Undo:** `bulk_update_pages_schema_markup` on the same page with `jsonLdSchema: null`.

### 3. Shrewsbury — excluded from sitemap, not unpublished

`update_item_sitemap_status` set `includeInSitemap` from `true` to `false`. Staged;
needs a publish to reach the live sitemap.

The spec's D5 called for unpublishing the item. Webflow refused with a **409 conflict**:
the Shrewsbury location is still referenced by a live vehicle, `MJ72RKK`
(item `6919a4bd361922df8cb3fd63` in Vehicles). Unpublishing would have broken that
reference. The sitemap flag delivers D5's stated goal — out of the sitemap, item
recoverable — without touching the reference. `/stores/shrewsbury` already 301s to
`/stores` and continues to.

**Undo:** `update_item_sitemap_status` with `includeInSitemap: true`.

**Worth raising with Carsa:** a car is still assigned to a branch the spec describes as
closed.

### 4. Blog redirect — not done

`/blog/what-is-adaptive-cruise-control` → `/blog/what-is-adaptive-cruise-control-guide`
was not created. The Webflow MCP exposes no redirects action, and no Webflow API token is
available in this checkout, so the Redirects REST endpoint could not be reached either.

Needs either a token or a manual entry under Site Settings → Publishing → 301 redirects.

**Undo:** delete the redirect rule.

## Not yet published

The schema write and the sitemap flag are staged and need a site publish. The vehicle
unpublishes are already live. The publish was deliberately held: the spec calls for one
publish covering all four changes, and two of the four still need Will.
