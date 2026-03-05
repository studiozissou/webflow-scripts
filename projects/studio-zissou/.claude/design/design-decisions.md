# Design Decisions — Studio Zissou
**Created:** 2026-03-05

---

## nav-compass — interaction behaviour
**Flag:** nav-compass, nav-compass-animation
**Date:** 2026-03-05
**Decision:** Three-way rotary switch navigation. Links are page anchors: Surface = home, Dive = section below home, Contact = contact section. On hover, the switch rotates ~10deg toward the hovered link to "prime" the selection. On click, the switch rotates to point at the clicked link, then the page smooth-scrolls to the anchor. The metaphor is a physical rotary switch activating a mode. Must be built as a reusable pattern supporting 2, 3, or 4 links — links are evenly distributed around the dial, rotation angles calculated dynamically based on link count. Labels remain static — only the dial rotates. Accessibility: dial rotation is decorative (aria-hidden on the dial element), links are standard `<a>` anchors with meaningful text, respect prefers-reduced-motion (skip rotation, just scroll).

---

## hero-title — entrance animation
**Flag:** hero-title-animation
**Date:** 2026-03-05
**Decision:** "Studio Zissou" title animates in character-by-character using GSAP SplitText. Title may be rendered as SVG to fill available viewport width responsively — if SVG, animate individual `<tspan>` or path elements instead of SplitText on DOM text. Tagline "Designed for warmth. Engineered for depth." follows after title completes. Implementation must handle both text and SVG paths — flag as TBD until format is confirmed. Respect prefers-reduced-motion (show immediately, no stagger).

---

## work-clients — hover preview + CMS
**Flags:** work-clients-hover, work-clients-cms
**Date:** 2026-03-05
**Decision:** All five clients have preview images. On hover, the preview image fades in at the fixed position shown in the Figma comp (right of centre, ~696x508px, 14px radius). Simple fade — no cursor-follow or movement for now. Client list is CMS-bound — create a "Projects" (or "Clients") CMS collection with fields for: name, preview image, external link URL (optional), and display order. List renders from CMS items, not hardcoded.

---

## work-clients — external links
**Flag:** work-clients-link
**Date:** 2026-03-05
**Decision:** All clients have external URLs. The ↗ arrow shows on every client row. Link URL comes from the CMS collection field. Arrow is always present — not conditional.

---

## work-clients — bracket characters
**Flag:** work-clients-bracket-chars
**Date:** 2026-03-05
**Decision:** PP Rader web font supports the required OpenType features (ss05, ss07, ss10, ss12, case). Use `font-feature-settings: 'ordn' 1, 'ss05' 1, 'ss07' 1, 'ss10' 1, 'ss12' 1, 'case' 1` on client name text. No fallback needed.

---

## decorative-ovals — animation
**Flag:** decorative-ovals-purpose
**Date:** 2026-03-05
**Decision:** Decorative but animated. Each oval's inner SVG flips horizontally (scaleX). Animation cascades right-to-left starting from the rightmost oval, staggered. After the cascade completes, wait 4 seconds, then repeat indefinitely. The effect evokes mechanical "breathing" / gills — inspired by Studio Ghibli airships (Castle in the Sky, Howl's Moving Castle, Nausicaa). Build as a GSAP timeline with stagger and repeat/repeatDelay. Respect prefers-reduced-motion (show static, no flip).

---

## quality-cards — scroll reveal
**Flags:** quality-cards-interaction, quality-cards-scroll
**Date:** 2026-03-05
**Decision:** Cards reveal on scroll via ScrollTrigger. Corner pins and dashed connectors are decorative (not interactive) — they animate in as part of the reveal sequence (e.g. line draws, corners appear, then card content fades in). No hover/click interaction on cards. The 2000px section height accommodates the scroll-driven timeline. Respect prefers-reduced-motion (show all cards immediately, no scroll animation).

---

## contact-form — submission
**Flag:** contact-form-functionality
**Date:** 2026-03-05
**Decision:** Webflow native form. Submissions go to Webflow dashboard/email. No custom handler or third-party integration needed.

---

## contact-form — placeholder text
**Flag:** contact-form-placeholder
**Date:** 2026-03-05
**Decision:** Figma placeholder text is lorem — will be replaced with real copy. Fields are Name, Email, Message with italic labels. Actual content TBD by Will.

---

## section-width-2000px — annotation only
**Flag:** section-width-2000px
**Date:** 2026-03-05
**Decision:** The 2000px labels are Figma ruler annotations, not real dimensions. Ignore — sections are standard viewport width.

---

## responsive — no mobile frames
**Flag:** no-mobile-frames
**Date:** 2026-03-05
**Decision:** No mobile/tablet Figma frames provided. Infer sensible responsive behaviour during build — stack columns, scale typography, simplify animations where needed. Desktop-first, responsive decisions made at build time.

---

## colour — text consistency
**Flag:** color-inconsistency
**Date:** 2026-03-05
**Decision:** #000000 on intro text and CTA body was an oversight. All text uses #2A2A2A. Drop `color-text-body` token — only `color-text-primary: #2A2A2A` is needed.

---

## footer — structure
**Flag:** footer-not-extracted
**Date:** 2026-03-05
**Decision:** Footer is simple: "© SZ" left, "Privacy · Terms" right, large SZ logo/trumpet graphic centred. No additional content. Build as a flex row with three zones.

---

## get-in-touch CTA — behaviour
**Flag:** get-in-touch-cta
**Date:** 2026-03-05
**Decision:** "Get in touch →" is a scroll anchor to the contact form, but only functional on mobile (where the form stacks below the CTA text). On desktop the CTA text and form are side-by-side so scrolling isn't needed — the link can be visually present but inert, or hidden on desktop. Implement as an `<a>` anchor link with scroll behaviour, visible/active on mobile only.
