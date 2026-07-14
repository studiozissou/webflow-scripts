# MTD Software Page Redesign

**Slug:** `mtd-software-redesign`
**Client:** Coconut
**I-COM Ref:** GETCOCO-54
**Status:** Planning
**Created:** 2026-05-21

---

## Summary

Full redesign of `/mtd-software` landing page. New copy replaces all existing content. No animation — Webflow IX2 only. Design goes through 3 Figma fidelity stages (wireframe > mid-fi > high-fi) with feedback loops before Webflow build.

## Scope

### In scope
- Figma design (wireframe > mid-fi > high-fi) in provided Figma file
- Full page replacement with new copy from `content/mtd-software.md`
- Reuse existing image assets from CDN where appropriate
- Build on duplicate Webflow page for dev
- Comparison table as placeholder (client adds in dev)
- New CMS FAQ switch field for MTD Software page
- Responsive design (desktop, tablet, mobile)

### Out of scope
- Animation / GSAP / scroll effects
- Sub-pages (`/sole-traders`, `/landlords`) — already live, untouched
- Comparison table content
- Custom JS beyond existing form handler / Zapier / attribution
- SEO schema (separate task)

## Target URL
- **Dev:** duplicate of `/mtd-software` (new slug TBD)
- **Production:** `/mtd-software` (swap when approved)

## Figma File
`https://www.figma.com/design/jNdnKjIXjndY1hvOb2dABj/Untitled?node-id=0-1`

---

## Page Structure (section map)

Based on `content/mtd-software.md`, the page has 14 sections top to bottom:

| # | Section | Type | Content summary |
|---|---------|------|-----------------|
| 1 | **Nav** | Placeholder | Grey bar — existing component, not redesigned |
| 2 | **Breadcrumbs** | Placeholder | Grey bar — existing component |
| 3 | **Hero** | New | H1 + trust badges + body copy + 2 CTAs |
| 4 | **Social proof** | Placeholder | Grey bar — Trustpilot widget, not redesigned |
| 5 | **Why Coconut for MTD** | New | H2 + intro + 6 benefit sub-sections (H3 each) |
| 6 | **CTA banner** | New | "Get started with Coconut" |
| 7 | **Pricing** | Placeholder | Grey block — existing pricing component, not redesigned |
| 8 | **Zempler offer** | New | Free for 2 years promo block |
| 9 | **Persona sections** | New | H2 + 4 sub-sections: sole traders, landlords, CIS, freelancers (each H3 + bullets + CTA) |
| 10 | **Comparison table** | Placeholder | "How Coconut compares" — client adds in dev |
| 11 | **How it works** | New | 4 numbered steps |
| 12 | **HMRC recognised** | New | Trust / compliance section |
| 13 | **FAQ** | Placeholder | Accordion — client adds in dev |
| 14 | **Final CTA** | New | "Ready to make MTD simple?" + 2 CTAs |
| 15 | **Footer** | Placeholder | Grey bar — existing component, not redesigned |

---

## Design System Reference

**File:** `projects/coconut/.claude/design-system.md`

### Key tokens
- **Primary dark:** Coconut Palm `#2a2228`
- **Accent/CTA:** Coco Coral `#f77d53`
- **Highlight:** Coco Gold `#f7c11c`
- **Light bg:** Aqua Mist `#c2efed`
- **Muted bg:** Coco Cream `#ddd9d4`
- **Deep teal:** Primary Darkest `#066866`
- **Border radius:** `1.5625rem` (~25px)
- **Fonts:** Work Sans (H1–H6), ArcoPerpetuoPro (body)
- **Base font:** 14px = 1em, type scale in em units

### Recyclable assets
All hero graphics, icons (orange tick, feature icons), badges (MTD Ready, FCA, App Store/Play), stock photos, and decorative elements from the current page. Full CDN URL inventory in research notes.

---

## Workflow

### Phase 1: Wireframe
- Layout blocks with content hierarchy
- Section spacing and flow
- No colour, no images — grey boxes + real copy
- **Deliverable:** Figma frame "Wireframe — Desktop"
- **Gate:** User feedback before proceeding

### Phase 2: Mid-fi
- Apply design tokens (colours, type scale, spacing)
- Place recycled images and icons
- Rough component structure
- **Deliverable:** Figma frame "Mid-fi — Desktop"
- **Gate:** User feedback before proceeding

### Phase 3: High-fi
- Pixel-perfect with real copy, images, responsive breakpoints
- Tablet + mobile frames
- **Deliverable:** Figma frames "High-fi — Desktop / Tablet / Mobile"
- **Gate:** User approval before Webflow build

### Phase 4: Webflow Build (future — separate spec)
- Duplicate existing `/mtd-software` page
- Build from high-fi design
- Wire CMS FAQ collection (new switch field)
- Reconnect form handler / Zapier / attribution
- QA and publish

---

## CMS Changes Required

### FAQs collection (`65afe5d79038933a4ba8d15c`)
- **Add field:** Boolean switch `featured-on-mtd-software-page`
- **Tag items:** Enable relevant MTD FAQ items (18+ already exist)

---

## Barba Impact

N/A — Coconut does not use Barba.js.

---

## Agents Needed

| Phase | Agents |
|-------|--------|
| Wireframe | `figma-use`, `figma-generate-design` |
| Mid-fi | `figma-use`, `art-director` |
| High-fi | `figma-use`, `art-director`, `ux-researcher` |
| Build | `code-writer`, `webflow-mcp` |
| QA | `qa`, `seo`, `content` |

---

## Verify Loop

### Pass/fail criteria
- All 14 content sections from `content/mtd-software.md` present in Figma
- Design tokens match `design-system.md` (colours, type scale, radius)
- Comparison table section present as placeholder
- Responsive frames for desktop (1440px), tablet (991px), mobile (478px)
- Real copy used throughout (no lorem ipsum)
- Recycled images placed where appropriate

### Reproduction steps
1. Open Figma file
2. Check each frame against section map above
3. Verify token usage against design system
4. Review copy against `content/mtd-software.md`

### Tier mapping
- **Tier 1:** N/A (design phase, no code)
- **Tier 2:** N/A
- **Tier 3 (manual):** Visual review of Figma frames against spec — design is inherently manual review

### Regression scope
- Existing `/mtd-software` page untouched until Phase 4
- Sub-pages `/sole-traders` and `/landlords` untouched

---

## Test Plan

Tests apply to Phase 4 (Webflow build) only. Spec will be written when Phase 4 begins.

---

## Placeholder Sections (not designed — reuse existing components in Webflow)

- **Nav** — existing navbar component
- **Breadcrumbs** — existing breadcrumb component
- **Trustpilot** — existing widget embed
- **Pricing** — existing pricing component (2-plan table from copy used as-is)
- **Comparison table** — client adds manually in dev
- **Footer** — existing footer component

## Open Questions

All resolved:
1. ~~Heading font~~ — Work Sans for H1–H6, ArcoPerpetuoPro for body
2. ~~FAQ~~ — Placeholder, client adds in dev
