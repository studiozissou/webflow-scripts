# Component Inventory — Studio Zissou
**Generated:** 2026-03-06
**Status:** Approved
**Approved:** 2026-03-06

---

## nav-compass
- **Description:** Three-way rotary switch navigation with rotating compass dial. Links are page anchors (Surface, Dive, Contact). Dial rotates on hover/click, then smooth-scrolls to target. Reusable pattern for 2/3/4 links.
- **Appears on pages:** home (all pages if site expands)
- **Sections:** hero
- **Variants:** Link count (2/3/4) — currently 3
- **CMS-bound:** no
- **Finsweet attributes:** none
- **Internal layout:** absolute — three text labels positioned around a central compass image
- **Spacing reference:** ~68px between labels (Figma reference)
- **Absolute placements:** Compass dial centred, labels positioned radially — flagged for manual review
- **Interaction notes:** Hover primes dial (~10deg rotation toward link). Click rotates dial to point at link, then smooth-scrolls to anchor. Dial is aria-hidden, links are standard `<a>` anchors. prefers-reduced-motion: skip rotation, just scroll.
- **Responsive behaviour:** Infer — likely scale down, simplify label positioning
- **Figma reference:** Group (1:24)
- **Build order:** 1
- **Dependencies:** none
- **Complexity:** complex
- **Design decisions:** Rotary switch pattern, reusable for 2-4 links. Dial-only animation, accessible.

---

## hero-background
- **Description:** Two overlapping organic SVG blob/arch shapes behind the hero text. Decorative background layer.
- **Appears on pages:** home
- **Sections:** hero
- **Variants:** none
- **CMS-bound:** no
- **Finsweet attributes:** none
- **Internal layout:** absolute — two stacked SVG vectors, full-width
- **Spacing reference:** n/a — full bleed decorative
- **Absolute placements:** Both SVGs absolutely positioned behind hero text — flagged for manual review
- **Interaction notes:** None — purely decorative
- **Responsive behaviour:** Infer — scale with viewport, maintain aspect ratio or crop
- **Figma reference:** Frames 1:19, 1:20
- **Build order:** 2
- **Dependencies:** none
- **Complexity:** simple
- **Design decisions:** None

---

## quality-cards
- **Description:** Three scroll-triggered reveal cards: Interfaces, Code, Decisions. Each card has corner pin decorative elements and a dashed line connecting label to description.
- **Appears on pages:** home
- **Sections:** quality
- **Variants:** 3 cards (Interfaces / Code / Decisions) — same structure, different content
- **CMS-bound:** no
- **Finsweet attributes:** none
- **Internal layout:** each card is a rounded rectangle (~814x202px) with corner pins at 4 corners, dashed connector, label left, description right
- **Spacing reference:** Cards stacked vertically within scroll section
- **Absolute placements:** Corner pin elements at 4 corners of each card — flagged for manual review
- **Interaction notes:** ScrollTrigger-driven reveal — line draws, corners appear, content fades in. Section height accommodates scroll timeline. Decorative elements only (no hover/click). prefers-reduced-motion: show all immediately.
- **Responsive behaviour:** Infer — stack cards, simplify or reduce scroll distance on mobile
- **Figma reference:** Section (1:219)
- **Build order:** 3
- **Dependencies:** none
- **Complexity:** complex
- **Design decisions:** Scroll-triggered reveal, decorative corner pins and dashed connectors, 2000px annotation ignored (Figma-only).

---

## contact-form
- **Description:** Postcard/telegram-styled contact form. Webflow native form. Header with Italian labels (Destinazione, Provienza, Data), SZ monogram, Name/Email/Message fields with dashed underlines. Vintage postcard aesthetic.
- **Appears on pages:** home
- **Sections:** contact
- **Variants:** none
- **CMS-bound:** no
- **Finsweet attributes:** none
- **Internal layout:** mixed — grid for header cells, flex for form fields, absolute for monogram and rotated side text
- **Spacing reference:** Card 817x607px, 1px border, 5px radius, 90% opacity bg (Figma reference)
- **Absolute placements:** SZ monogram, rotated vertical text along left side — flagged for manual review
- **Interaction notes:** Webflow native form submission. Placeholder text is lorem — real copy TBD.
- **Responsive behaviour:** Infer — scale form card, stack fields vertically if needed
- **Figma reference:** Section (1:327)
- **Build order:** 4
- **Dependencies:** none
- **Complexity:** complex
- **Design decisions:** Webflow native form, placeholder copy TBD, vintage postcard aesthetic.

---

## footer
- **Description:** Simple footer — "© SZ" left, SZ logo/trumpet graphic centre, "Privacy · Terms" right.
- **Appears on pages:** home (all pages if site expands)
- **Sections:** footer
- **Variants:** none
- **CMS-bound:** no
- **Finsweet attributes:** none
- **Internal layout:** flex row — three zones (left/centre/right)
- **Spacing reference:** n/a — simple flex with justify-content: space-between
- **Absolute placements:** none
- **Interaction notes:** None
- **Responsive behaviour:** Infer — stack or simplify on mobile
- **Figma reference:** Page (1:17) — not extracted as separate frame
- **Build order:** 5
- **Dependencies:** none
- **Complexity:** simple
- **Design decisions:** Confirmed structure: © SZ, logo, Privacy · Terms. Simple flex row.

---

## Section-Level Elements (not Webflow components)

The following are built directly within their sections, not as reusable Webflow components:

| Element | Section | Notes |
|---------|---------|-------|
| hero-title | hero | Display title + tagline, SplitText animation, may be SVG |
| intro-text | hero | Right-aligned body text, 2 paragraphs |
| work-clients | work | CMS-bound client list with hover previews, bracket chars, ↗ links |
| decorative-ovals | gills | 5 SVG ovals, breathing gills animation (GSAP timeline) |
| contact-cta | contact | "Let's Talk It Through" heading + CTA paragraph + scroll anchor |

---

## Sections (build list)

Sections are the top-level build units. Components are built first (they're reusable symbols), then sections are built top to bottom — each section assembles its components and section-level elements.

| # | Section | Components inside | Section-level elements inside | CMS? | Complexity | Dependencies |
|---|---------|-------------------|-------------------------------|------|------------|--------------|
| 6 | hero | nav-compass, hero-background | hero-title, intro-text | no | complex | nav-compass, hero-background |
| 7 | work | — | work-clients | yes | complex | none |
| 8 | gills | — | decorative-ovals | no | complex | none |
| 9 | quality | quality-cards | — | no | complex | quality-cards |
| 10 | contact | contact-form | contact-cta | no | complex | contact-form |
| 11 | footer | footer (component) | — | no | simple | footer (component) |

---

## Full Build Order

```
#   Item                Type              Parent     CMS?  Complexity  Dependencies
1   nav-compass         component         —          no    complex     none
2   hero-background     component         —          no    simple      none
3   quality-cards       component         —          no    complex     none
4   contact-form        component         —          no    complex     none
5   footer              component         —          no    simple      none
6   hero                section           —          no    complex     nav-compass, hero-background
7   work                section           —          yes   complex     none
8   gills               section           —          no    complex     none
9   quality             section           —          no    complex     quality-cards
10  contact             section           —          no    complex     contact-form
11  footer              section           —          no    simple      footer (component)
```
