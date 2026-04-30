# Spec: NEM Life — Mobile QA Automated Fixes

**Slug:** `nem-mobile-qa-automated-fixes`
**Client:** NEM Life
**Priority:** P0–P2 mixed
**Status:** Ready to Build
**Created:** 2026-04-30
**Source:** `projects/nem-life/.claude/reports/mobile-qa-2026-04-30.md`

---

## Overview

Execute 5 automated fixes from the mobile QA report using Webflow MCP tools.
A5 (CTA button inconsistency) is moved to manual — buttons use component
props that can't be safely edited via MCP without risking global breakage.

**Site ID:** `69bfba56f3622791a798b816`

---

## Fixes

### Fix 1: Page titles (P0)

**Tool:** `data_pages_tool` → `update_page_settings`

Update SEO titles for 6 pages. Static pages get literal Dutch titles.
CMS template pages get descriptive fallback titles (dynamic CMS bindings
can't be set via Data API — those need Designer).

| Page | Page ID | New SEO Title |
|---|---|---|
| Home | `69bfba56f3622791a798b814` | `NEM Life \| Doorbreek het patroon dat je steeds weer terugtrekt` |
| Blog Insights | `69d759788cc49dfcb458eb87` | `Inzichten \| Artikelen over patronen, relaties en emoties - NEM Life` |
| Ervaringen | `69d7ce37730dc092d7790a8d` | `Ervaringen \| Echte verhalen van NEM Life deelnemers` |
| Blog Item template | `69d78963446a916ce78bfca3` | `Inzicht - NEM Life` |
| Thema category template | `69d7896a784024881c06fd32` | `Thema - NEM Life Inzichten` |
| Testimonial item template | `69d7d36ecf475c28e32fc108` | `Ervaring - NEM Life` |

**Note:** CMS template dynamic titles (`{title} - NEM Life`) require
Designer field bindings. The Data API titles serve as fallbacks.

**Verify:** Navigate to each page, check `<title>` tag in DOM.

---

### Fix 2: Ervaringen section heading (P1)

**Tool:** `de_page_tool` → switch to ervaringen page, then
`element_tool` → `query_elements` to find H2, then `set_text`

1. Switch to page `69d7ce37730dc092d7790a8d`
2. Query for Heading elements containing "Ervaringen met NEM Life"
3. Update H2 text to: `Herken jij jezelf hierin?`
4. Query for the subtitle paragraph below the H2
5. Update subtitle to: `Echte verhalen van mensen die vastliepen - en weer in beweging kwamen. Lees wat zij herkennen.`

**Design reference:** `designs/Testimonials (mobile).png`

**Verify:** Navigate to `/ervaringen`, confirm H2 reads "Herken jij jezelf hierin?"

---

### Fix 3: Christel cards stacked on mobile (P1)

**Tool:** `de_page_tool` → switch to Christel page, then
`element_tool` → `query_elements` to find card grid wrappers, then
`style_tool` → `update_style` at `small` breakpoint

1. Switch to page `69d66fe958b47c4036b0eab9`
2. Query elements to find the grid wrappers under "NEM Methode" and
   "NEM Life" sections (likely DivBlock elements with grid styles)
3. Identify the style/class name on those grid wrappers
4. Update the style at `small` breakpoint:
   - `grid-template-columns: 1fr` (was `1fr 1fr`)

**Design reference:** `designs/Link in Bio (mobile).png` — cards stacked
full-width on mobile.

**Verify:** View `/link-in-bio/christel` at 390px, confirm cards stack
vertically in a single column.

---

### Fix 4: NEM Methode card section spacing (P2)

**Tool:** `de_page_tool` → switch to NEM Methode page, then
`element_tool` → `query_elements` to find card section wrappers, then
`style_tool` → `update_style` at `small` breakpoint

1. Switch to page `69d3d3e689822adf018b4877`
2. Query for the section wrappers around the 123 cards and the
   "Waarom anders" comparison cards
3. Identify the style/class name on those wrappers
4. Update at `small` breakpoint:
   - `margin-bottom: 3rem` (48px — matches `--_gaps---content-full`)
   OR
   - `padding-bottom: 3rem`

**Design target:** 48-64px gap between card sections (currently ~16-24px).

**Verify:** View `/nem-methode` at 390px, confirm visible breathing room
between card groups.

---

### Fix 5: Footer placeholder links (P2)

**Tool:** `element_tool` → `query_elements` to find footer links, then
`set_link` to update known destinations

Only update links where the page exists on staging. Leave the rest as `#`.

| Link label | New href | Link type |
|---|---|---|
| NEM Methode | `/nem-methode` | url |
| Christel | `/link-in-bio/christel` | url |
| Voorwaarden | `/voorwaarden` | url |

**Do not:** hide any links, change any link labels, or update links to
pages that don't exist yet.

**Note:** This partially overlaps with queue task `nem-navigation-footer-wiring`
which will handle all nav/footer links comprehensively. This fix addresses
only the 3 confirmed destinations.

**Verify:** Click each updated footer link, confirm it navigates correctly.

---

## Moved to Manual

### A5: CTA button inconsistency (P2)
Buttons use Webflow component instances with props (filled vs outlined
variant). MCP `style_tool` can edit the source style, but that affects
ALL instances globally. Changing individual instance props requires
Designer. Moved to manual fixes in the QA report.

---

## Execution Order

1. **Fix 1** (page titles) — independent, no DOM dependencies
2. **Fix 2** (ervaringen heading) — independent
3. **Fix 3** (Christel grid) — needs page switch + style discovery
4. **Fix 4** (NEM Methode spacing) — needs page switch + style discovery
5. **Fix 5** (footer links) — independent, any page

Fixes 1, 2, and 5 can potentially run in parallel (different tools/pages).
Fixes 3 and 4 are sequential (each requires page switch + element discovery).

---

## Parallelisation Map

| Stream | Tasks | Agent | Est. Turns | Parallel? |
|--------|-------|-------|-----------|-----------|
| A | Fix 1 (page titles) | MCP data API | 2-3 | Yes — independent |
| B | Fix 2 (heading text) | MCP Designer | 3-4 | Yes — independent page |
| C | Fix 3 + Fix 4 (styles) | MCP Designer | 6-8 | Sequential — same Designer session |
| D | Fix 5 (footer links) | MCP Designer | 3-4 | After C (needs element IDs) |

**Recommendation:** Run A (data API) first as a quick win, then B+C+D
sequentially in the Designer session since Designer tools require page
context switching.

---

## Verify Loop

### Pass/fail criteria
- [ ] All 6 page titles updated (check `<title>` tag on each page)
- [ ] Ervaringen H2 reads "Herken jij jezelf hierin?"
- [ ] Christel card grids show single column at 390px viewport
- [ ] NEM Methode card sections have ~48px gap between groups at 390px
- [ ] Footer links for NEM Methode, Christel, Voorwaarden navigate correctly
- [ ] No other elements on any page were accidentally modified

### Reproduction steps
1. Open `https://nem-life-1.webflow.io/` — check `<title>`
2. Open `/blog-insights` — check `<title>`
3. Open `/ervaringen` — check `<title>` AND H2 heading text
4. Open `/inzichten/de-belangrijkheid-van-zelfreflectie` — check `<title>`
5. Open `/themas/patronen-emoties` — check `<title>`
6. Open `/testimonials/new` — check `<title>`
7. Open `/link-in-bio/christel` at 390px — check card layout is single column
8. Open `/nem-methode` at 390px — check card section spacing
9. Click footer link "NEM Methode" — should go to `/nem-methode`
10. Click footer link "Christel" — should go to `/link-in-bio/christel`
11. Click footer link "Voorwaarden" — should go to `/voorwaarden`

### Tier mapping
- Tier 1 (Playwright): Title checks, heading text, footer link navigation
- Tier 2: N/A (no registry yet for this project)
- Tier 3 (Manual): Visual check of card stacking and spacing at 390px
  (layout shifts are hard to assert pixel-perfect in Playwright)

### Regression scope
- No Barba transitions on this site
- Footer is a global element — link changes affect all pages (intended)
- Style changes at `small` breakpoint must not affect `main` or larger
- Heading text change is page-specific, no cross-page impact

---

## Barba Impact
N/A — no Barba transitions on NEM Life.

---

## Test Plan

### Tier 1 — Auto (Playwright)
`tests/acceptance/nem-mobile-qa-automated-fixes.spec.js` — covers:
- Page title assertions for all 6 pages (static + CMS template fallbacks)
- Ervaringen H2 heading and subtitle text
- Christel card single-column layout at 390px
- NEM Methode card section spacing >= 40px at 390px
- Footer link hrefs and navigation (no 404s)
- Console error smoke checks on key pages

### Tier 2 — Auto (CDN regression)
N/A — no test registry for this project.

### Tier 3 — Manual
- [ ] Check all 6 page titles in browser tab
- [ ] Ervaringen H2 heading text matches design
- [ ] Christel cards stack at 390px (single column)
- [ ] NEM Methode card spacing visually matches ~48px gaps
- [ ] Footer links navigate to correct pages
- [ ] No unintended changes on any other elements
