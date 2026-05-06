# Anchor + Cluster Blog Architecture — Carsa

**Status:** Draft spec
**Priority:** P4 (aspirational)
**Depends on:** Blog content exists (103 posts), anchor pages exist

---

## Goal

Organise Carsa's 103 blog posts into topic clusters that feed link equity to
anchor pages (/car-finance, /used-cars, /part-exchange, /car-care, /stores).
Improve topical authority for head terms without changing URL structure.

---

## Constraints

- Webflow CMS: all blog posts share `/blog/{slug}` — no sub-folder routing
- Anchor/cluster relationship expressed via CMS reference field + internal links, not URLs
- Blog posts must not lose existing SEO value (no slug changes, no 301s)

---

## Proposed Clusters

| Cluster | Anchor page | Example post topics |
|---------|------------|-------------------|
| Car Finance | /car-finance | PCP vs HP, credit scores, balloon payments, eligibility |
| Buying Used | /used-cars | Best family cars, mileage guides, what to check, depreciation |
| Selling / PX | /part-exchange | Valuation tips, when to sell, trade-in vs private sale |
| Car Care | /car-care | MOT prep, servicing intervals, tyre care, warranty guides |
| EV / Future | /car-finance or new anchor | EV running costs, charging, hybrid vs electric |
| General / Lifestyle | (no anchor — orphan cluster) | Road trip guides, seasonal driving |

Clusters will be confirmed after reading all 103 posts.

---

## Phases

### Phase 1 — Audit + classify (Claude via MCP)

1. Read all blog posts via Webflow CMS MCP (title, slug, body, existing categories)
2. Classify each post into a cluster
3. Flag posts that don't fit any cluster (orphans)
4. Audit existing internal links — which posts already link to their anchor
5. Output: `research/blog-cluster-map.md` with full classification table

### Phase 2 — CMS field setup (Designer, manual)

1. Add a CMS reference field: "Anchor Page" (single ref to a static page or
   a new "Topics" collection with name + slug + anchor URL)
2. Populate the reference field for all 103 posts based on Phase 1 map
3. Add a filtered CMS list to each anchor page: "Related articles" showing
   posts referencing that anchor

### Phase 3 — Content rewrites (Claude, human review)

For each blog post:
1. Add/rewrite the **intro paragraph** to include a natural link back to the
   anchor page with keyword-rich anchor text
2. Add/rewrite the **conclusion** with a CTA linking to the anchor page
3. Ensure at least 1 internal link to a sibling cluster post (cross-linking)
4. Review for stale content, hedge words, missing "last updated" dates

Batch approach:
- Claude generates rewritten intros/conclusions for all posts in a cluster
- Human reviews one cluster at a time (10-15 posts per batch)
- Approved copy pasted into CMS via Webflow Designer or CMS API

### Phase 4 — Anchor page enrichment (Designer + content)

1. Add "Related reading" CMS list section to each anchor page
2. Add a brief topic overview paragraph if the anchor page lacks one
3. Ensure anchor pages link to 3-5 top cluster posts in the body copy

### Phase 5 — Verification

1. Crawl internal links to confirm two-way linking (anchor ↔ cluster)
2. Check Google Search Console for indexing of updated pages
3. Monitor ranking changes for anchor page head terms over 4-8 weeks

---

## What Claude can automate

| Task | Automation |
|------|-----------|
| Read + classify all 103 posts | AUTO (MCP) |
| Audit internal links | AUTO (MCP + WebFetch) |
| Generate cluster map | AUTO |
| Rewrite intros/conclusions | SEMI (generate, human approves) |
| Cross-link suggestions | AUTO |
| CMS field creation | MANUAL (Designer) |
| CMS field population | SEMI (could use CMS API if available) |
| Anchor page CMS lists | MANUAL (Designer) |

---

## Estimated effort

- Phase 1: 1 session (Claude)
- Phase 2: 1-2 hours (manual Designer work)
- Phase 3: 2-3 sessions (Claude generates, human reviews per cluster)
- Phase 4: 1-2 hours (Designer)
- Phase 5: Ongoing monitoring

---

## Success criteria

- Every blog post belongs to exactly one cluster
- Every blog post links to its anchor page with relevant anchor text
- Every anchor page displays related blog posts
- No orphan posts (or orphans flagged and either reclassified or deprioritised)
- Head term rankings for anchor pages improve within 8 weeks
