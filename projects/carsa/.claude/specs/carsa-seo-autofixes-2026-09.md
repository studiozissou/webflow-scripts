# Carsa September SEO auto-fixes

**Status:** Planned, awaiting approval
**Created:** 2026-09-03
**Source:** `comms/site-report-2026-09.md` issues #1 and #6, `audits/semrush-2026-08-31.md`
**Related:** `carsa-code-migration.md` (VDP inline code — this spec deliberately does not touch it)

---

## Summary

Four fixes from the September report that can be executed end to end without a decision from
Will or Carsa. Every one is settled by evidence already gathered; none changes how a template
renders for a customer; each is independently revertible.

In scope:

1. Delete the two stale duplicate vehicle CMS items.
2. Redirect the duplicate adaptive-cruise-control blog post to the version that ranks.
3. Add Product schema to `/car-care/extended-mechanical-warranty`.
4. Unpublish the Shrewsbury store page so it leaves the sitemap.

Together these clear the whole of the duplicate-title (6), duplicate-content (4) and stray
sitemap-entry counts, and close strategic #4's first step. Estimated 75 minutes of work plus
one publish.

Explicitly **out of scope**, with reasons, in "Excluded" below: the sold-car JSON-LD, the
"Learn more" links, dates, author, factual openers, and the leasing links.

---

## Current state

**The canonical fix is already done.** Issue #1 in the report was fixed and republished on
2 September at 14:47 UTC, before this spec was written. Verified on the live site: both
`/sell-car/value-car` and `/sell-car/part-exchange` now name themselves, and the old URLs still
301. Nothing to build; it appears here only as a regression check in the test plan.

**Webflow MCP is not currently authorised for Carsa.** A research pass on 2 September found the
connected token exposes one site only (Tamsen Fadal). Every task below is a Webflow API
operation, so this is a hard prerequisite. Will has said he needs to reconnect it.

**Schema goes through the pages API, never an embed.** Per `carsa-webflow` SKILL.md lines 56-58,
JSON-LD is a first-class page property written with `data_pages_tool > bulk_update_pages_schema_markup`.
The no-embeds rule has one carve-out (the Acuity iframe) and it explicitly excludes schema.

**The repo's `vdp.js` is not live.** Production reverted to 27 inline blocks after the June
externalisation. Nothing in this spec edits VDP code, which is why the sold-car schema is out of
scope here rather than bundled in.

---

## Decisions

| # | Decision | Why |
|---|----------|-----|
| D1 | Delete `j16bnt-fa27e` and `f14yeg-03cc0`, keep the unsuffixed slugs | Both pairs are the same physical car (same VRM in the title). The unsuffixed items carry a sitemap `lastmod` of 2 Sep, the suffixed ones 15 Jul, so the unsuffixed item is the one the stock sync is still touching. The hex suffix is Webflow's collision suffix on re-import. |
| D2 | Both cars are sold, so delete rather than redirect | Both show "Sorry! This car has been sold." and sit in the retention window. Sold-car 404s were agreed correct in June. A 301 to a sold twin adds nothing. |
| D3 | Keep `/blog/what-is-adaptive-cruise-control-guide`, 301 the bare slug to it | The `-guide` version outranks the bare version on every shared keyword: "adaptive cruise control" 27 vs 64, "what is adaptive cruise control" 15 vs 49, "acc cruise control" 14 vs 49, "adaptive cruise control meaning" 21 vs 65. It also holds terms the bare one does not. Redirecting the weaker URL to the stronger one preserves what is already working. |
| D4 | Warranty schema is `Product` + `BreadcrumbList`, no `Offer` | Follows `schema/car-care-carsaprotect.html`, the existing pattern for a static car-care page. An `Offer` needs a price we would have to assert; the page says "from £699" but that is a starting price, not an offer, so we leave price out rather than publish a number that might drift. |
| D5 | Unpublish the Shrewsbury store page rather than delete it | It already 301s to `/stores`. Unpublishing removes it from the sitemap while keeping the item recoverable if Shrewsbury reopens. Deleting is irreversible and nobody has said the branch is gone for good. |
| D6 | No PR to the client repo for this work | Nothing here is a script. `client.md` §10 routes production-ready *scripts* to `focalstrategy/carsa-website-support`; CMS items, redirects and page schema are live Webflow operations. The schema JSON is still saved to `projects/carsa/schema/` as the repo record. |

---

## Tasks

| # | Task | Tool | Agent | Est. |
|---|------|------|-------|------|
| 1 | Confirm Webflow MCP reaches the Carsa site; abort if not | `data_sites_tool` | claude | 2 min |
| 2 | Capture rollback state: fetch and save both duplicate vehicle items, the blog item, the warranty page head, the Shrewsbury page | `data_cms_tool`, `data_pages_tool` | claude | 10 min |
| 3 | Delete vehicle items `j16bnt-fa27e` and `f14yeg-03cc0` | `data_cms_tool` | claude | 5 min |
| 4 | Add 301 `/blog/what-is-adaptive-cruise-control` → `/blog/what-is-adaptive-cruise-control-guide` | redirects API | claude | 5 min |
| 5 | Write `schema/car-care-extended-mechanical-warranty.html` in the repo | Write | schema | 15 min |
| 6 | Publish that schema to the page | `bulk_update_pages_schema_markup` | claude | 5 min |
| 7 | Unpublish `/stores/shrewsbury` | `data_pages_tool` | claude | 3 min |
| 8 | Publish the site once, all four changes together | Webflow publish | claude | 2 min |
| 9 | Run the acceptance test against live | Playwright | qa | 10 min |
| 10 | Rich Results Test on the warranty page | `test-schema` skill | claude | 5 min |
| 11 | Post the build summary to #carsa-dev, or hand Will the block | Slack | claude | 5 min |

**Total: ~67 minutes**, one publish.

### The schema to publish (task 5)

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Product",
      "@id": "https://www.carsa.co.uk/car-care/extended-mechanical-warranty#product",
      "name": "Carsa Extended Warranty",
      "description": "Extended mechanical warranty for used cars bought from Carsa, available for 12 to 48 months, with unlimited claims each up to the car's purchase price. Covers engine, gearbox and electrics.",
      "url": "https://www.carsa.co.uk/car-care/extended-mechanical-warranty",
      "category": "Vehicle Service Contract",
      "brand": { "@type": "Brand", "name": "Carsa" },
      "provider": { "@id": "https://www.carsa.co.uk/#organization" }
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://www.carsa.co.uk/car-care/extended-mechanical-warranty#breadcrumb",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.carsa.co.uk/" },
        { "@type": "ListItem", "position": 2, "name": "Car Care", "item": "https://www.carsa.co.uk/car-care" },
        { "@type": "ListItem", "position": 3, "name": "Extended Warranty" }
      ]
    }
  ]
}
```

Description and duration are taken from the live page's own title and meta ("12–48 Months from
£699", "Unlimited claims, each up to your car's purchase price. Engine, gearbox, electrics
covered"), so nothing is asserted that the page does not already say. The existing canonical in
that page's head code stays untouched.

---

## Parallelisation map

| # | Stream | Tasks | Agent | Est. wall | Est. tokens |
|---|--------|-------|-------|-----------|-------------|
| A | CMS cleanup | 3 | claude | 5 min | ~6k |
| B | Redirect | 4 | claude | 5 min | ~4k |
| C | Warranty schema | 5, 6 | schema | 20 min | ~12k |
| D | Shrewsbury | 7 | claude | 3 min | ~3k |

Sequential gates: task 1 gates everything. Task 2 gates 3, 5, 6 and 7 (rollback capture before
any write). Task 8, the single publish, gates 9 and 10.

| Mode | Wall time | Tokens | Note |
|------|-----------|--------|------|
| Sequential | ~67 min | ~25k | |
| Parallel subagents | ~45 min | ~28k | Four small write streams against one Webflow site |
| Agent team | ~45 min | ~63k | No mid-task coordination needed |

**Recommendation: sequential.** The streams are minutes long, they all write to the same
Webflow site, and a single publish covers all four. Parallelism saves about twenty minutes and
introduces a real risk of two agents publishing concurrently. No worktree needed beyond the one
this session is already in; only one repo file is written.

---

## Test plan

### Tier 1 — automated, Playwright (`tests/acceptance/carsa-seo-autofixes-2026-09.spec.js`)

1. `/vehicles/used/j16bnt-fa27e` returns 404, and `/vehicles/used/j16bnt` still returns 200.
2. `/vehicles/used/f14yeg-03cc0` returns 404, and `/vehicles/used/f14yeg` still returns 200.
3. `/blog/what-is-adaptive-cruise-control` 301s to `…-guide`, and the guide returns 200.
4. The warranty page carries a JSON-LD block that parses and contains a `Product` with the
   expected `@id`, plus a `BreadcrumbList`.
5. The warranty page's canonical still reads its own URL (guards the schema write against
   clobbering existing head code).
6. `/stores/shrewsbury` 301s to `/stores`.
7. Regression: `/sell-car/value-car` and `/sell-car/part-exchange` self-canonicalise, and
   `/value-car` and `/part-exchange` still 301 to them.
8. No console errors on the warranty page or the surviving blog post.

### Tier 2 — CDN regression

Registered in `tests/registry.json` as `carsa-seo-autofixes-2026-09` so it joins the cumulative
suite and re-runs on future deploys.

### Tier 3 — manual

- Confirm in the Webflow Designer that the two deleted vehicle items are gone from the
  Vehicles collection and nothing else was removed with them. Cannot be automated: the API
  reports success per item, but only a human comparing the collection count before and after
  will catch a mis-targeted delete.
- Eyeball the warranty page in the Designer to confirm the schema field is populated and no
  other page settings changed.

---

## Verify loop

**Pass criteria**

- Both suffixed vehicle URLs return 404; both unsuffixed return 200 with the sold banner.
- `curl -sI https://www.carsa.co.uk/blog/what-is-adaptive-cruise-control` shows `301` with a
  `location` of the `-guide` URL.
- The warranty page's raw HTML (not the rendered DOM) contains a parseable `Product` JSON-LD
  block. Raw source matters here: the whole sold-car schema bug is a raw-versus-rendered
  mismatch, so verification must use `curl`, not DevTools alone.
- Google Rich Results Test on the warranty page reports the Product item with no critical error.
- `/stores/shrewsbury` returns 301, and after the next publish the URL is absent from
  `sitemap.xml`.

**Reproduction steps**

1. `curl -sI` each of the six URLs above.
2. `curl -s https://www.carsa.co.uk/car-care/extended-mechanical-warranty | grep -o '<script type="application/ld+json">.*</script>'` and pipe through `python3 -m json.tool`.
3. Re-fetch `sitemap.xml` and grep for `shrewsbury` and the two suffixed vehicle slugs.

**Regression scope**

- The sell-page canonicals fixed on 2 September must stay fixed.
- The warranty page's existing canonical and Finsweet script must survive the schema write.
- No other Vehicles item may be deleted; collection count should fall by exactly two.
- The surviving blog post must keep its own canonical and not gain a self-redirect loop.

**Rollback**

Task 2 captures every item before it is touched. Vehicle items can be recreated from the
captured JSON; the redirect and the schema can be removed; the Shrewsbury page can be
republished. All four are independently revertible without touching the others.

---

## Excluded, and why

| Item | Why not here |
|------|--------------|
| Sold-car JSON-LD (`"image": ""` on 444 pages) | Needs a decision nobody has given. The 10 August audit flagged that stripping image and price from sold cars may be deliberate, to keep sold stock out of shopping feeds. It also needs a template edit on live VDP inline code, which is the code-migration project's territory. Worth its own plan once Carsa confirms intent. |
| "Learn more" × 125 | The wording lives in a shared Designer component. Editing component text through the API risks the sitewide components the skill says never to touch. Faster and safer by hand. |
| Dead leasing.carsa.co.uk links | Not dead. The subdomain returned 200 with 142 KB of real content on 2 September; SEMRush's 31 August 404 looks transient. Report corrected. |
| Cookie-policy Microsoft link | Real, but it is one link on a legal page and the replacement target is a judgement call. |
| Dates, author, factual openers | All need either Will's copy decisions or Designer edits. |
| llms.txt refresh | The file is hosted, not CMS. Needs confirmation of where it is served from before automating a write. |

---

## Barba impact

N/A. Carsa does not use Barba transitions.

---

## Open questions

None blocking. Two worth asking Carsa when convenient, both already in the client report:
whether stripping sold-car images is deliberate, and what the 24 August model-page edit was.

---

## Agents

- **claude** — Webflow API operations (tasks 1-4, 6-8, 11)
- **schema** — writes the warranty JSON-LD (task 5)
- **qa** — runs the acceptance suite (task 9)

---

## Acceptance tests

`tests/acceptance/carsa-seo-autofixes-2026-09.spec.js`

1. duplicate vehicle j16bnt-fa27e is gone and j16bnt survives
2. duplicate vehicle f14yeg-03cc0 is gone and f14yeg survives
3. adaptive cruise control bare slug redirects to the guide
4. warranty page emits parseable Product and BreadcrumbList JSON-LD in raw HTML
5. warranty page canonical and existing head code survive the schema write
6. shrewsbury store page redirects to the stores hub
7. regression: sell pages self-canonicalise and old URLs still redirect
8. no console errors on the touched pages
