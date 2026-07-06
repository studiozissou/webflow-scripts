# TSC Historic Blog Migration

**Slug:** `tsc-historic-blog-migration`
**Client:** The Signalling Company
**Status:** Ready to Build
**Created:** 2026-07-06
**Priority:** P1 (launch is 2026-07-07)

## Summary

Migrate the 7 remaining WordPress blog posts (2019–2021) from the SQL dump backup
into the Webflow CMS News collection. Upload 3 featured images (optimised to AVIF),
set correct publication dates, and assign categories and author references using
the same MCP-based approach as the initial 7-post migration.

## Source Data

**SQL dump:** `/Users/willmorley/Downloads/Backup-thesignalingcompany_may_26/sc3glny3745_tsc.sql`
**Media:** `/Users/willmorley/Downloads/Backup-thesignalingcompany_may_26/thesignallingcompany.com/wp-content/uploads/`

## Posts to Migrate

| # | WP ID | Title | Published | Status | Featured Image | Author | Category |
|---|-------|-------|-----------|--------|----------------|--------|----------|
| 1 | 1934 | Nomination of Stanislas Pinte as CEO of TheSignallingCompany | 2019-10-02 | publish | 20190128-ertms-hd044.jpg (5.8 MB) | ID 1 → blank | News |
| 2 | 2045 | A better ETCS onboard, no more no less | 2019-10-22 | publish | img-2038.jpg (6.0 MB) | ID 1 → blank | News |
| 3 | 2163 | Geert Pauwels, CEO of Lineas, wins prestigious European Railway Award | 2020-02-19 | publish | lineas-award.jpg (191 KB) | ID 1 → blank | News |
| 4 | 2186 | The Signalling Company and Try and Cert introduce Silicon Valley best practice into European ETCS development | 2020-08-19 | publish | None | ID 1 → blank | News |
| 5 | 2201 | Shaping the train positioning algorithms of the future | 2020-10-06 | publish | None | ID 1 → blank | News |
| 6 | 2221 | The Signalling Company and CAF Signalling launch open cooperation on Class B Systems | 2020-12-05 | **draft** | None | ID 1 → blank | News |
| 7 | 2234 | Digital STM's will accelerate ERTMS roll-out | 2021-04-21 | publish | None | ID 6 → blank | Insights |

### Author Attribution

- WP Author ID 1 = agency account → `author-ref` left blank (matches existing pattern for articles 1, 3, 4)
- WP Author ID 6 = second author → `author-ref` left blank (no matching Team Member)
- All posts use the same "no explicit author" pattern as the existing migration

### Category Mapping

- Posts 1–6 → "News" (category-ref to existing News item in Categories collection)
- Post 7 → "Insights" (category-ref to existing Insights item — thought leadership content)

### Draft Handling

- Post 6 (CAF Signalling) → create in Webflow CMS with `_draft: true` so it's not visible on the site

## Image Strategy

### Originals to Optimise

| File | Location | Size | Action |
|------|----------|------|--------|
| 20190128-ertms-hd044.jpg | `uploads/2019/10/` | 5.8 MB | Optimise → AVIF, max compression |
| img-2038.jpg | `uploads/2019/10/` | 6.0 MB | Optimise → AVIF, max compression |
| lineas-award.jpg | `uploads/2020/02/` | 191 KB | Optimise → AVIF, max compression |

### Optimisation Pipeline

1. Use `sharp` or `cwebp`/`avifenc` CLI to convert originals to AVIF
2. Target: max compression, quality ~60–70, max dimension 1200px
3. Expected output: <100 KB per image
4. Upload optimised files via Webflow `data_assets_tool`

### Posts Without Images (4 posts)

Leave `thumbnail` field blank — same approach as existing articles 5–7 which are
also missing images (flagged to Romain for sourcing).

## Content Extraction & Cleanup

### Source Format

WordPress Gutenberg block editor HTML (`<!-- wp:paragraph -->`, `<!-- wp:heading -->`, etc.)

### Cleanup Steps

1. Strip all WordPress block comments (`<!-- wp:* -->`, `<!-- /wp:* -->`)
2. Strip Elementor JSON blocks if present
3. Remove inline styles
4. Fix heading hierarchy (ensure H2 → H3 → H4 nesting)
5. Remove dead links to old WordPress URLs (e.g. `glny3745.odns.fr`)
6. Preserve paragraph structure and bold/italic formatting
7. Output clean HTML suitable for Webflow rich text field

### Content Extraction Method

Use `grep`/`sed` on the SQL dump to extract `post_content` for each WP post ID,
then pipe through a cleanup function. Alternatively, use a Node.js script to
parse the SQL INSERT statements and extract + clean content.

## Webflow CMS Field Mapping

**Collection:** News (`6a32b71aa48adbce920293ba`)

| WP Field | Webflow Field | Type | Notes |
|----------|---------------|------|-------|
| post_title | name | PlainText | Built-in |
| post_name | slug | PlainText | Built-in, auto-generated |
| post_content (cleaned) | body-1 | RichText | WordPress blocks → clean HTML |
| post_date | published-date | Date | Must match original WP date |
| — | category-ref | Reference → Categories | News or Insights |
| — | author-ref | Reference → Team Members | Left blank (all agency-authored) |
| _thumbnail_id → attachment | thumbnail | Image | AVIF upload via data_assets_tool |
| — | _draft | Boolean | true for post 6 only |
| — | _archived | Boolean | false for all |

## Execution Plan

### Phase 1: Content Extraction (sequential)

**Task 1.1:** Extract 7 post bodies from SQL dump
- Parse SQL INSERT for `tsc_posts` table
- Extract rows by ID: 1934, 2045, 2163, 2186, 2201, 2221, 2234
- Clean WordPress block formatting → plain HTML
- Save to temp files for review

### Phase 2: Image Optimisation (parallel with Phase 1)

**Task 2.1:** Optimise 3 featured images to AVIF
- Input: originals from `wp-content/uploads/`
- Tool: `sharp` CLI or `/optimise-images` skill
- Output: AVIF files, max compression, ≤1200px wide
- Save optimised files to `projects/the-signalling-company/assets/blog/`

### Phase 3: Webflow Upload (sequential — references required)

**Task 3.1:** Upload 3 optimised images to Webflow
- Use `data_assets_tool` to upload each AVIF
- Capture returned asset URLs/IDs for thumbnail references

**Task 3.2:** Look up existing collection item IDs
- Get Categories collection → find "News" and "Insights" item IDs
- Get News collection ID confirmation

**Task 3.3:** Create 7 News CMS items
- Use `data_cms_tool` to create each item
- Set: name, slug, body-1, published-date, category-ref, thumbnail (where available)
- Post 6: set `_draft: true`
- Post 7: set category-ref to "Insights"
- All others: set category-ref to "News"

### Phase 4: Verification (sequential)

**Task 4.1:** Run acceptance tests against staging
- Verify ≥13 published articles render on /news
- Verify date range spans 2019–2026
- Verify article detail pages load with content
- Verify no console errors

## Parallelisation Map

```
Stream A: Content extraction (Phase 1)     ─── ~5 min, ~2k tokens
Stream B: Image optimisation (Phase 2)     ─── ~3 min, ~1k tokens
                                              ↓ both complete
Stream C: Webflow upload (Phase 3)         ─── ~10 min, ~5k tokens (sequential)
                                              ↓
Stream D: Verification (Phase 4)           ─── ~3 min, ~1k tokens
```

- **Streams A + B** can run in parallel (independent)
- **Stream C** depends on A + B completing
- **Stream D** depends on C completing
- **Recommendation:** parallel for A+B, sequential for C+D
- **Worktrees:** not needed (no code changes, MCP-only)
- **Agent teams:** not needed (single agent can handle all MCP calls)

## Barba Impact

N/A — no Barba transitions on TSC site. Template-based Webflow build with no
custom page transitions.

## Verify Loop

### Pass/Fail Criteria

1. `/news` page renders ≥13 published article cards (7 existing + 6 new published)
2. Article dates span 2019–2026 (not all clustered in 2021+)
3. At least 2 articles from 2019 visible on the listing page
4. At least 2 articles from 2020 visible on the listing page
5. Each new article detail page loads without 404
6. Posts with images show a thumbnail on the listing page
7. CAF Signalling post is NOT visible on the public listing (draft)
8. "Digital STMs" article has "Insights" category (not "News")
9. No console errors on /news page

### Reproduction Steps

1. Navigate to `https://tsc-v2.webflow.io/news`
2. Count article cards — expect ≥13
3. Check date labels — expect years from 2019 through 2026
4. Click each new article to verify detail page loads
5. Check browser console for JS errors

### Tier Mapping

- **Tier 1 (auto):** Tests 1–5, 9 covered by `tsc-historic-blog-migration.spec.js`
- **Tier 2 (CDN regression):** Registered in `tests/registry.json`
- **Tier 3 (manual):** Tests 6–8 require visual/CMS panel verification:
  - Thumbnail rendering depends on Webflow's image CDN pipeline (can't assert image src reliably)
  - Draft status only visible in CMS panel, not on public page
  - Category label rendering depends on template design (may not show category text)

### Regression Scope

- Existing 7 articles must still render correctly
- Products, Services, Projects pages unaffected (different collections)
- Homepage unaffected
- No code changes — CMS-only operation

## Acceptance Tests

### Tier 1 — Auto (Playwright)

| Test | Description |
|------|-------------|
| `H1 correct` | /news page H1 reads "News & Insights" |
| `renders at least 13 published news articles` | ≥13 article links on /news |
| `articles span 2019–2026 date range` | At least 1 date from 2019 and 1 from 2025+ |
| `2019 articles present` | "Nomination of Stanislas Pinte" visible |
| `2020 articles present` | "Geert Pauwels" or "European Railway Award" visible |
| `Digital STMs article accessible` | /news/digital-stms-will-accelerate-ertms-roll-out loads |
| `Try and Cert article accessible` | /news/the-signalling-company-and-try-and-cert-... loads |
| `no console errors on /news` | Zero JS errors on page load |
| `no console errors on article detail` | Zero JS errors on a new article page |

### Tier 2 — CDN Regression

Registered in `tests/registry.json` under slug `tsc-historic-blog-migration`.

### Tier 3 — Manual

- **Thumbnail rendering:** Verify images appear on listing cards for posts 1–3 (Webflow CDN pipeline)
- **Draft visibility:** Confirm CAF Signalling post is NOT on public /news page (CMS panel check)
- **Category assignment:** Verify "Digital STMs" shows "Insights" category in CMS panel
- **Published dates:** Verify dates in CMS panel match original WordPress dates exactly
- **Rich text formatting:** Spot-check 2–3 article detail pages for clean formatting (no WP block artifacts)
