# Official bio rollout — build outcome

**Slug:** `official-bio-rollout`
**Built and shipped:** 2026-08-20
**Spec:** `official-bio-rollout.md`
**Verification:** structural verify loop 18/18 pages clean; Google Rich Results Test run on
6 live URLs.

---

## Shipped to production

| # | Task | Result |
| --- | --- | --- |
| 2 | `Person.description` → `bio-200`, Person node enriched | ✅ live, byte-exact on all 18 pages |
| 3 | `Movie` nodes for both documentaries | ⚠️ live, **one fix pending publish** — see below |
| 4 | Strip `13x` from Home / About / Speaking metadata | ✅ live |
| 5 | Podcast title trailing space + over-long description | ✅ live (~900 chars → 190) |
| 6 | M Film v2 wrong meta description | ✅ live |
| 7 | Page-level JSON-LD for bare pages | ✅ 11 pages deployed |
| 8 | About `ProfilePage.description` → approved language | ✅ live |
| 9 | Book + PodcastSeries descriptions | ✅ live |
| 16 | Threads + Muck Rack added to `Person.sameAs` | ✅ live |
| — | Provider directory title/description now name her | ✅ live (bonus, from the 10 Aug list) |
| — | 6 blank blog `short-description` fields | ✅ filled — **the API gotcha is fixed**, see below |
| — | 5 podcast episodes describing the wrong guest | ✅ rewritten from each episode's own body copy |
| 10 | Wikidata | 📄 changeset written, needs an authenticated human |
| 11 | Wikipedia Talk request | 📄 drafted, needs a human with declared COI |
| 12 | On-page copy recommendations | 📄 written |

**Not shipped:** Task 15 (`/subscribe` → `/newsletter` redirect — no redirects API,
Designer-only) and Task 17 (`llms.txt` — served as `text/plain` via Cloudflare, not a
Webflow page; needs locating).

---

## Three corrections to earlier documentation

### 1. CMS templates are NOT API-writable — the original spec was right

The 10 Aug progress log claims schema lives in a writable `jsonLdSchema` field and implies
CMS templates could be bulk-written. **They cannot.** Any write whose payload contains
`{{wf …}}` binding tokens returns **HTTP 406**, confirmed across four endpoints:

- `bulk_update_pages_schema_markup`
- `bulk_update_pages`
- `update_page_settings`
- a minimal single-token probe with the backslash escape removed

Reads return them fine in `rawJsonLdSchema`, which is what made this look writable. The
three CMS templates live since 10 Aug were pasted by hand. **CMS template schema is
manual-paste only.** Treat this as settled.

### 2. The `list_collection_items` pagination gotcha is FIXED

The log warns that `offset`, `page` and `slug` are ignored and only the first 100 items are
reachable. On MCP **2.0.1** both work:

- `offset: 250` returned items 251–255 of 264 correctly
- `filter: { slug: { eq: … } }` resolved a single item directly

This is what unblocked the 6 blog descriptions that had been parked as "blocked on item IDs".
**Delete that gotcha from the log.**

### 3. Two Wikidata items on the outstanding list are already done

Verified against `wbgetentities` on 2026-08-20: the description already reads *"American
journalist, author, and menopause advocate"*, and P856 already carries a reference. See
`.claude/audits/wikidata-changeset-2026-08-20.md`.

---

## Defect found by Google, fix pending one publish

Rich Results Test on `/themfactor` returned **1 invalid item**:

```
Movie — Missing field "image"   (critical)
        Missing field "dateCreated" (optional)
        Missing field "director"    (optional)
```

`image` is required for Movie rich results and my original node omitted it. Both Movie nodes
have been corrected in Webflow to carry the film's own OG image:

```
https://cdn.prod.website-files.com/68a2d5617c9630d9c780ded5/68f6a2eae4320feb723a981e_M%20Factor.webp
```

**This fix is written but not yet published.** It needs one more Webflow publish, then a
re-test of `/themfactor` and `/themfactor2`.

`dateCreated` and `director` were deliberately left off — neither is verified anywhere in the
approved bio or client notes, and both are optional. Do not invent them.

---

## Rich Results Test — live URLs, 2026-08-20

| URL | Result |
| --- | --- |
| `/themfactor` | ❌ 1 invalid (Movie missing image) → fixed, awaiting publish |
| `/about-tamsen` | ✅ 2 valid — Breadcrumbs, Profile page |
| `/podcast` | ✅ 1 valid — Breadcrumbs |
| `/blog/why-am-i-so-tired` | ✅ 2 valid — Articles, Breadcrumbs |
| `/podcast/naomi-watts-…` | ✅ 1 valid — Breadcrumbs |
| `/menopause-education-hub/the-belly-fat-reset-guide` | ✅ 2 valid — Articles, Breadcrumbs |

`Person`, `Organization`, `WebSite` and `WebPage` produce no rich results by design, so a low
item count is expected. **Zero errors is the pass signal, not the count.**

CMS binding tokens were checked for the silent-failure mode — every token on the sampled blog,
podcast and hub items resolved to a real value, with one exception (below).

---

## Two data issues found while testing — neither is a validity failure

1. **7 of 17 Education Hub items have a blank `publication-date`**, so they emit an empty
   `datePublished`. Confirmed via Rich Results Test that this still passes as a valid
   Article. It is a freshness-signal gap, not an error. Backfill is a short CMS job.

2. **The blog template binds `datePublished` to Webflow's system `published-on`** — the *last
   publish* date, not the original. Any CMS edit therefore moves a post's stated publication
   date. The 6 posts edited in this pass now read `2026-08-20`. Pre-existing template design,
   not introduced here, but this pass triggered it for those 6. Durable fix is to bind to the
   collection's own `publication-date` field, which needs backfilling first.

Both are recorded in `.claude/content/on-page-copy-recommendations.md`.

---

## Events template — scope change, agreed 2026-08-20

The Events block from `schema/cms-templates.html` §3 was **deliberately not deployed**.

- The template page is unpublished; `/events/` has **0 URLs** in the sitemap.
- All **9** event items are in the past — the most recent ended 2026-03-25.
- The collection has no detail-page content: its `link` field points to **external** sites
  (cancerschmancer.org, onecommune.com, advertisingweek.com…).
- Consequently the prepared block's `"url": "…/events/{{slug}}"` would have pointed
  `Event.url` at URLs that do not exist.

`/events` keeps its `CollectionPage` + `BreadcrumbList`, which is correct for a listing page.

**When real upcoming events are loaded**, the right pattern is an HTML Embed placed *inside
the Collection List Item* on `/events`, with `url` bound to the `link` field rather than a
synthesized detail URL. Draft markup is in the copy recommendations doc. The `§3` block in
`cms-templates.html` should be considered retired for this site.
