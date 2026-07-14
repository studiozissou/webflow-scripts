# MTD Pages Redesign — Sole Traders, Landlords, CIS

**Slug:** `mtd-pages-redesign`
**Client:** Coconut
**Status:** Ready to Build
**Created:** 2026-07-13
**Target live:** Thursday 2026-07-16 (Will away from 2026-07-18)

---

## Summary

Redesign three MTD landing pages that Anna Guilford has flagged as visually flat.
Use the newly-shipped `/bridging-software` page as the baseline for what "good" looks
like, build new section layouts from Relume skeletons, and skin them with Coconut
brand tokens. Add an "interest layer" of more distinctive section types to fix the
core complaint that "sections blend together". Desktop and mobile.

Pages:
- Sole Traders — `/mtd-software/sole-traders-v2` (**pilot** — establishes the language)
- Landlords — `/mtd-software/making-tax-digital-software-for-landlords-v2`
- CIS — `/mtd-software/cis-subcontractors` (unpublished draft)

## Feedback sources (all read)

- Trello `HWViJ6J8` (Sole Traders), `yJ1JFhnA` (Landlords), `bFsfdcmd` (CIS)
- Annotated PDFs on the Landlords + CIS cards (desktop + mobile), cached in the
  session scratchpad under `trello/`
- **Notion meeting notes, 2026-07-08 (Anna Guilford / Will Morley) — governing brief.**
  Verdict: pages are "visually flat, sections blend together"; checklists don't stand
  out; content stacked in a single central column; too many tables. Root cause: rushed.
  Steer: *quality over speed*.

## Scope

### In scope
- Redesign of the body sections of all three pages, desktop + mobile
- A shared section library, built once on the pilot and applied to the other two
- Trust-signal strip added to the shared hero component (the "standard hero template")
- CIS content-bug fixes (they live in the copy, and those sections are being rebuilt)
- Background-rhythm system across all three pages

### Out of scope — already components, do not redesign
- **Nav · Hero · Pricing · Footer** (per client direction). Two annotations resolve
  here for near-zero effort:
  - *"Add more trust signals — HMRC MTD badge, Trustpilot"* (both pages) → one edit to
    the shared hero component.
  - CIS *"add pricing table thats across the website — missing the palm tree"* → swap
    in the site-wide pricing component.
- New copywriting (gated on the Icon content-team call, w/c 3 Aug — see Blockers)
- Animation / GSAP / scroll effects — Webflow IX2 only if anything
- SEO schema (separate task)

## Design system (established — reuse as-is)

Source: `projects/coconut/.claude/design-system.md`. Webflow Variables exposed as CSS
custom properties (not Client First utility classes).

| Token | CSS var | Value |
|---|---|---|
| Coral | `--_25-base---coco-coral` | `#f77d53` |
| Gold | `--_25-base---coco-gold` | `#f7c11c` |
| Aqua Mist | `--_25-base---aqua-mist` | `#c2efed` |
| Coco Cream | `--_25-base---coco-cream` | `#ddd9d4` |
| Coconut Palm | `--_25-base---coconut-palm` | `#2a2228` |
| Off-White | `--_25-base---off-white` | whitesmoke |
| Radius | `--_25-base---round-corner` | `1.5625rem` (25px) |

Type: Work Sans (headings) · Arco Perpetuo Pro (body) · em-based scale
`--_25-text---12px` … `--_25-text---100px`. Brand-sheet colours
(`/Users/willmorley/Downloads/Coconut_Brand_Sheet.pdf`) map cleanly onto these; the
only gap is light beige `#f3f0eb` — use Off-White, don't add a token.

### Background rhythm (fixes CIS "no structure" note)

CIS annotation: *"We need to be consistent with the different coloured backgrounds —
theres currently no structure and or knowing of which section is which."*

Rule, all three pages:
- Sections cycle **Off-White → Aqua Mist → White**. Never two adjacent the same.
- One **Coconut Palm dark band** per page mid-scroll as a rhythm-breaker.
- **Coral** reserved for CTA buttons and tick icons — never a section background.
- **Gold** reserved for the one highlighted thing per section (most-popular card, the
  "our column" in a comparison).
- Full-bleed backgrounds, content in the standard container. Answers *"Can we make
  this section wider? across the whole page"* (Landlords) and *"can we make each
  section wider to fill the white space?"* (CIS).

## Section library

Relume slugs are structural skeletons only; all styling is replaced with the tokens
above. Fetch via `mcp__relume__get_components`. Bridging is the baseline; the interest
layer is what actually fixes "flat".

### Baseline (bridging parity)

| # | Section | Relume base | Coconut treatment |
|---|---|---|---|
| 1 | Compliance timeline (Apr 2026/27/28, £50k/£30k/£20k) | `section_timeline12` | Card-and-spine, not a plain row. 3-across desktop, vertical spine mobile. |
| 2 | Three-card explainer | `section_layout527` | Distinct bg per card (Gold / Coral / Coco Cream). |
| 3 | Benefit card grid (6–7) | `section_layout627` | **Equal-height cards** — fixes *"the graphic needs to be the same size as the above"* (both pages) and the mobile overflow. |
| 4 | Split — title left, table/image right | `section_layout637` | For *"Assign title/text to the left and the table to the right"* (Landlords). |
| 5 | Split — title above text | `section_layout637` + `section-headers` | For *"Title should go above the text… image on the opposite side"* (Landlords, CIS). |
| 6 | Video band | `section_header41` | Full-bleed Aqua Mist, headline + CTA left, embed right. |
| 7 | Comparison → CTA block | `section_cta1` | **Landlords: delete the 4-col table**, replace with CTA to `/hmrc-free-mtd-software-comparison`. Kills the worst mobile table. |
| 8 | Tick list | `section_layout73` | Large coral ticks, generous spacing. Fixes *"checklist items don't stand out"* — Anna's biggest note. |
| 9 | FAQ | `section_faq6` | 2-col card accordion; collapses to one column. |
| 10 | Final CTA | `section_cta1` | Heading + bullets + CTA + Trustpilot + app-store badges. |

### Interest layer (fixes "flat")

Picked for a playful, illustration-heavy brand. All reflow to a single column.

| # | Section | Relume base | Why it earns its place |
|---|---|---|---|
| 11 | Bento grid | `section_layout378` | Mixed card sizes — one benefit section per page instead of a uniform grid. |
| 12 | Dark contrast band | `section_layout82` | Full-bleed Coconut Palm. One per page mid-scroll; strongest rhythm-breaker, leaves a dark field for a mascot. |
| 13 | Overlapping / offset cards | `section_layout480` | Layered images with offset depth — built for a peeking coconut mascot. |
| 14 | Stat callout | `section_stats57` | Oversized stat cards — "£50k threshold", "125,000 Self Assessments filed". Gives thresholds a home besides a table. |
| 15 | Alternating zigzag rows | `section_layout679` | Image left/right alternating — antidote to the single central column. |
| 16 | Trust strip | `section_logo3` | Auto-scrolling marquee: HMRC / Trustpilot / FCA. |
| 17 | Testimonial | `section_testimonial32` | Avatar + star rating. Answers the "add testimonials" note in the Sole Traders SEO review. |
| 18 | Tabbed feature reveal | `section_layout505` | Compresses long prose behind tabs — fixes the Sole Traders wall of text without new copy. |

**Tables → cards.** Convert the Landlords "essentials" 4-row table and "Keep your
property income organised" 6-row table into card grids (#3) or stat callouts (#14).
Keep only the quarterly-deadline table, in layout #4 — the annotation asks for that
one explicitly.

**Rule of thumb:** no more than three consecutive sections share a layout family. If
two card grids would sit adjacent, one becomes a bento (#11), a zigzag (#15) or a dark
band (#12).

## Per-page work

### Sole Traders (pilot)
~14 consecutive prose H2 sections, almost no cards. No annotated PDF; feedback is the
Notion call. Fullest treatment — establishes the language.

Proposed rhythm (Off-White → Aqua → White cycling, dark band mid-scroll):
hero (component) → trust strip (#16) → tabbed "what MTD actually is" (#18, absorbs four
prose sections) → timeline (#1) → **dark band** (#12) "what you have to do" → bento
benefits (#11) → stat callout (#14, the thresholds) → zigzag "why sole traders choose
Coconut" (#15) → testimonial (#17) → pricing (component) → FAQ (#9) → final CTA (#10).

Collapses ~14 prose sections into ~8 designed ones without rewriting copy.
Content bug: un-rendered markdown link `[MTD bridging software](/bridging-software)`
renders as literal text — link it in Webflow.

### Landlords
1. Essentials → full-bleed cards/stats (#3 / #14), drop the table
2. "Who Needs MTD Software?" → timeline (#1)
3. "How it works" → fix ragged text alignment
4. "Quarterly updates made simpler" → title-left / table-right (#4)
5. Video → band (#6)
6. "Best MTD software for landlords" → title-above + image opposite (#5)
7. **Comparison table → CTA** (#7)
8. Content bug: H1 reads "MTD Software for the Self-Employed" (should be Landlords);
   hero opens "tay compliant…" (truncated "Stay")

### CIS
1. Hero: trust signals; *"maybe add the orange banner back?"*; *"change this image"*
2. Pricing → site-wide component
3. Threshold → timeline (#1) + *"add the text above the dates"*
4. "What's MTD all about?" → three-card (#2)
5. Background rhythm applied — the "no structure" note
6. Sections full-bleed
7. *"Add illustrators on each square"* — **blocked** (see Blockers)
8. "Best MTD software for CIS" → title-above + graphic left (#5)

**CIS content bugs (fix during rebuild):**
- Breadcrumb says "MTD Software for Landlords"
- Entire stray landlords section embedded — *"Making Tax Digital for landlords: the
  essentials"* + its table. Delete.
- Corrupted sentence: *"…£52,000 in rental incomThe important bit is…"*
- "gross **rental** income" should be self-employment/CIS income
- Pricing cards say "Best for sole traders and **landlords**"

## Mobile

Desktop-first, then mobile (Anna's sequencing). Most mobile annotations are *broken*,
not ugly, and are fixed for free by the library:

| Issue | Fixed by |
|---|---|
| Tables don't reflow; "Missing title" empty header cells (Landlords p3, p4, p14) | Tables → cards (#3) |
| Benefit grid "Doesn't fit on screen" (Landlords p5–8) | `section_layout627` (#3) |
| Graphic cards different sizes (both pages) | Equal-height cards (#3) |
| Right-hand text column "impossible to read" (CIS p17–18) | Title-above (#5) |
| Text beside dates/table should sit above (CIS p12, p13) | #1 / #4 |
| Two-up cards unreadable — *"show 1 at a time on mobile"* (CIS p15) | Single-column stack |
| CTA above tick list — *"Move to below the tick list"* (CIS p3) | Reorder in #8 |

## Build sequence

1. Prototype **Sole Traders in Claude Design** — responsive HTML at 1280 / 768 / 375.
   Relume skeletons + Coconut tokens. Share the `open_url` with Anna.
2. Sign-off on the pilot, then build all three directly in Webflow Designer from the
   agreed library.
3. Hero component: add the trust-signal strip once.
4. Fix the CIS content bugs.
5. Publish. Add CIS to `llms.txt` and the sitemap — currently absent from both.

## Blockers

- **Webflow MCP authorised for the wrong workspace.** `list_sites` returns only "The
  Signalling Company"; getcoconut.com isn't visible. Re-authorise against the
  getcoconut.com workspace before any MCP read/write. Webflow build is manual until then.
- **Icon library.** CIS asks for illustrations per square; Anna sends the library
  *after* the Icon call (w/c 3 Aug) — after the deadline. Use existing on-site
  illustrations or drop that annotation and flag it.
- **Copy structure.** Copy "lacks subheadings to enable card/section layouts." Real fix
  is the Icon call (w/c 3 Aug). For now, re-present existing copy; some card splits need
  invented subheadings.

## Risk

All three pages, desktop + mobile, in the working days to 16 July is the same scope
shape that produced the rushed quality Anna is objecting to. Mitigation: the shared
section library, built once on Sole Traders and applied twice. If it slips, ship Sole
Traders properly and carry Landlords + CIS past the holiday — that's what "quality over
speed" implies.

## Verification

**Tier 1 — automated, during build**
- `mcp__design__render_preview` on the prototype at 1280 / 768 / 375; screenshot each.
- Post-Webflow: `chrome-devtools` → `resize_page` to each width, `take_screenshot`,
  `list_console_messages` (expect zero errors), `lighthouse_audit` (accessibility).
- Per page: no horizontal scroll at 375px; every section background follows the rhythm
  rule; no empty table header cells; benefit cards equal height.

**Tier 2 — regression** (`tests/acceptance/mtd-pages-redesign.spec.js`, register in
`tests/registry.json`)
- All three URLs return 200
- H1 text correct per page (catches the Landlords "Self-Employed" bug)
- No literal `[text](url)` markdown in the DOM (catches the Sole Traders link bug)
- CIS DOM contains no "landlords: the essentials" string (catches the stray section)

**Tier 3 — manual**
- Visual rhythm / "does it feel less flat" — subjective, Anna's call
- The named layout fixes match what the annotations asked for
- Safari / Firefox spot-check (Playwright runs Chromium only)

## Files

- `projects/coconut/.claude/design-system.md` — tokens (read-only)
- `projects/coconut/.claude/content/{mtd-sole-traders,mtd-landlords,cis-subcontractors}.md` — copy
- `/Users/willmorley/Downloads/Coconut_Brand_Sheet.pdf` — brand sheet
- Feedback PDFs — session scratchpad `trello/`
