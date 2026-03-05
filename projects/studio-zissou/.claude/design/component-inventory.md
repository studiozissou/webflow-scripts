# Component Inventory — Studio Zissou
**Generated:** 2026-03-05
**Status:** Approved
**Approved:** 2026-03-05

---

## nav-compass
- **Description:** Rotary switch navigation — 3 anchor links (Surface/Dive/Contact) with a central compass dial that rotates on hover (~10deg prime) and click (point + scroll). Reusable pattern for 2/3/4 links.
- **Appears on pages:** all
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

## hero-title
- **Description:** "Studio Zissou" display title + "Designed for warmth. Engineered for depth." tagline. Character-by-character entrance animation.
- **Appears on pages:** home
- **Variants:** May be text or SVG (TBD — SVG enables fluid viewport-width scaling)
- **CMS-bound:** no
- **Finsweet attributes:** none
- **Internal layout:** absolute positioning within hero section
- **Spacing reference:** n/a — positioned over hero-background
- **Absolute placements:** Title positioned over background SVGs — flagged for manual review
- **Interaction notes:** GSAP SplitText character-by-character entrance (or SVG path animation if SVG). Tagline follows after title completes. prefers-reduced-motion: show immediately.
- **Responsive behaviour:** Infer — if SVG, fills viewport width naturally. If text, scale font-size with clamp().
- **Figma reference:** Page root (1:17)
- **Build order:** 3
- **Dependencies:** hero-background
- **Complexity:** complex
- **Design decisions:** Text vs SVG format TBD. SplitText or SVG path animation.

---

## intro-text
- **Description:** Two-paragraph intro block. "Studio Zissou is a specialist digital partner..." Right-aligned body text.
- **Appears on pages:** home
- **Variants:** none
- **CMS-bound:** no
- **Finsweet attributes:** none
- **Internal layout:** single text block, right-aligned
- **Spacing reference:** n/a — single element
- **Absolute placements:** none
- **Interaction notes:** None
- **Responsive behaviour:** Infer — full width on mobile, maintain right-alignment on desktop
- **Figma reference:** Frame 1:31
- **Build order:** 4
- **Dependencies:** none
- **Complexity:** simple
- **Design decisions:** Text colour #2A2A2A (not #000000 as in Figma — oversight corrected)

---

## work-clients
- **Description:** Client name list with 〔bracket〕 characters, ↗ external link arrows, and hover preview images. CMS-driven.
- **Appears on pages:** home
- **Variants:** none (all rows identical, content from CMS)
- **CMS-bound:** yes — Projects/Clients collection (name, preview image, external URL, display order)
- **Finsweet attributes:** CMS Load (if pagination needed), otherwise none
- **Internal layout:** stacked rows, absolute preview image
- **Spacing reference:** ~80px between client rows, left margin ~6.25% (Figma reference)
- **Absolute placements:** Preview image card positioned right of centre (~696x508px, 14px radius) — flagged for manual review
- **Interaction notes:** Hover on row fades in preview image at fixed position. All rows have ↗ arrow and external link. Font feature settings: 'ordn' 1, 'ss05' 1, 'ss07' 1, 'ss10' 1, 'ss12' 1, 'case' 1.
- **Responsive behaviour:** Infer — stack vertically on mobile, preview may show inline or on tap
- **Figma reference:** Section (1:38)
- **Build order:** 5
- **Dependencies:** none
- **Complexity:** complex
- **Design decisions:** CMS-bound, all clients have external URLs, bracket font features confirmed supported, hover preview fades in at fixed position.

---

## decorative-ovals
- **Description:** Five oval/pill SVG elements in a horizontal row. Animated "breathing gills" — inner SVG flips horizontally, cascading right-to-left, 4s pause, repeat.
- **Appears on pages:** home
- **Variants:** none
- **CMS-bound:** no
- **Finsweet attributes:** none
- **Internal layout:** absolute — 5 rotated oval groups in horizontal row
- **Spacing reference:** ~89px between ovals, each ~236x144px (Figma reference)
- **Absolute placements:** All 5 ovals absolutely positioned — flagged for manual review
- **Interaction notes:** GSAP timeline: scaleX flip per oval, staggered right-to-left, repeatDelay 4s, repeat -1. Ghibli airship gills aesthetic. prefers-reduced-motion: show static.
- **Responsive behaviour:** Infer — reduce count or scale on mobile
- **Figma reference:** Section (1:125)
- **Build order:** 6
- **Dependencies:** none
- **Complexity:** complex
- **Design decisions:** Breathing gills animation, Ghibli-inspired. GSAP timeline with stagger + repeat.

---

## quality-cards
- **Description:** "Respect for Quality" section with 3 cards: Interfaces, Code, Decisions. Corner pin elements and dashed connectors. Scroll-triggered reveal.
- **Appears on pages:** home
- **Variants:** 3 cards (Interfaces / Code / Decisions) — same structure, different content
- **CMS-bound:** no
- **Finsweet attributes:** none
- **Internal layout:** absolute positioning within tall scroll section
- **Spacing reference:** Cards ~814x202px each, stacked vertically (Figma reference)
- **Absolute placements:** Cards, corner pins, and dashed connectors all absolutely positioned — flagged for manual review
- **Interaction notes:** ScrollTrigger-driven reveal — line draws, corners appear, content fades in. Tall section accommodates scroll timeline. Decorative elements only (no hover/click). prefers-reduced-motion: show all immediately.
- **Responsive behaviour:** Infer — stack cards, simplify or reduce scroll distance on mobile
- **Figma reference:** Section (1:219)
- **Build order:** 7
- **Dependencies:** none
- **Complexity:** complex
- **Design decisions:** Scroll-triggered reveal, decorative corner pins and dashed connectors, 2000px annotation ignored (Figma-only).

---

## contact-cta
- **Description:** "Let's Talk It Through" heading + body paragraph + "Get in touch →" anchor link. Left column of the contact section.
- **Appears on pages:** home
- **Variants:** none
- **CMS-bound:** no
- **Finsweet attributes:** none
- **Internal layout:** flex column — heading, paragraph, link
- **Spacing reference:** Left column starts at 81px from left edge, heading 389px wide (Figma reference)
- **Absolute placements:** none
- **Interaction notes:** "Get in touch →" is a scroll anchor to the form — functional on mobile only (form stacks below). On desktop the form is adjacent so link is inert or hidden.
- **Responsive behaviour:** Infer — full width on mobile, stacks above form
- **Figma reference:** Section (1:327)
- **Build order:** 8
- **Dependencies:** contact-form
- **Complexity:** simple
- **Design decisions:** CTA link active on mobile only.

---

## contact-form
- **Description:** Postcard/telegram-styled contact form. Webflow native form. Header with Italian labels (Destinazione, Provienza, Data), SZ monogram, Name/Email/Message fields with dashed underlines.
- **Appears on pages:** home
- **Variants:** none
- **CMS-bound:** no
- **Finsweet attributes:** none
- **Internal layout:** mixed — grid for header cells, flex for form fields, absolute for monogram and rotated side text
- **Spacing reference:** Card 817x607px, 1px border, 5px radius, 90% opacity bg (Figma reference)
- **Absolute placements:** SZ monogram, rotated vertical text along left side — flagged for manual review
- **Interaction notes:** Webflow native form submission. Placeholder text is lorem — real copy TBD.
- **Responsive behaviour:** Infer — scale form card, stack fields vertically if needed
- **Figma reference:** Section (1:327)
- **Build order:** 9
- **Dependencies:** none
- **Complexity:** complex
- **Design decisions:** Webflow native form, placeholder copy TBD, vintage postcard aesthetic.

---

## footer
- **Description:** Simple footer — "© SZ" left, SZ logo/trumpet graphic centre, "Privacy · Terms" right.
- **Appears on pages:** all
- **Variants:** none
- **CMS-bound:** no
- **Finsweet attributes:** none
- **Internal layout:** flex row — three zones (left/centre/right)
- **Spacing reference:** n/a — simple flex with justify-content: space-between
- **Absolute placements:** none
- **Interaction notes:** None
- **Responsive behaviour:** Infer — stack or simplify on mobile
- **Figma reference:** Page (1:17) — not extracted as separate frame
- **Build order:** 10
- **Dependencies:** none
- **Complexity:** simple
- **Design decisions:** Confirmed structure: © SZ, logo, Privacy · Terms. Simple flex row.
