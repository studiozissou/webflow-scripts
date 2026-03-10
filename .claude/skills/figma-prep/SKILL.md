---
name: figma-prep
description: Guides the agent through Figma file preparation best practices for Figma-to-Webflow builds — auto layout, naming, components, and responsive frames. Activates before running /figma-audit.
---

<objective>
Ensure a Figma file is structured for clean extraction into Webflow — auto layout on every frame, kebab-case naming, shallow component nesting, and responsive breakpoint frames.
</objective>

<quick_start>
Pre-audit checklist — verify before running `/figma-audit`:
1. No unnamed layers (`Frame N`, `Group N`)
2. Auto layout on every section and component frame
3. Text styles defined (even if not as Figma variables)
4. Colour styles defined (even if not as Figma variables)
5. Component variants include all interactive states
6. Pages match intended Webflow page structure
7. Section frames ordered top-to-bottom within each page
</quick_start>

<reference_guides>
Auto Layout:
- Every frame should use auto layout (flex in Webflow)
- Use the Figma-to-Webflow plugin's "suggest auto layout" feature to clean up frames that use absolute positioning
- Absolute placements should be intentional (overlays, decorative elements) — flag any that look structural

Layer Naming:
- All layers named in kebab-case matching intended CSS class names
- Section frames: `hero`, `about-section`, `testimonials`, `cta-banner`
- Component frames: `card-project`, `nav-desktop`, `footer`
- State variants: `button-default`, `button-hover`, `button-active`, `button-disabled`
- No default Figma names (`Frame 47`, `Group 12`) — rename everything

Figma Variables:
- Optional but helpful — Claude extracts tokens from visual properties regardless of whether the designer used Figma variables
- When variables are present, they provide cleaner naming and explicit token relationships
- Variable collections map well to Webflow variable groups
- Without variables, Claude infers tokens from repeated visual values across frames

Component Structure:
- Shallow nesting — 3 levels max (component > slot > element)
- Deep nesting creates complex Webflow structures that are hard to maintain
- Prefer composition (multiple simple components) over deep component trees
- Any element saved as a Figma component = Webflow component

Page Organisation:
- Pages named to match Webflow page slugs: `home`, `about`, `work`, `contact`
- Section frames named clearly within each page
- Sections ordered top-to-bottom matching the intended page scroll order

States and Variants:
- Hover, focus, active, and disabled states as separate frames or component variants
- Name states explicitly: `button-hover`, `nav-link-active`
- If states are missing, `/figma-audit` will flag them for resolution in `/component-plan`
- Animation sequences shown as numbered frames: `hero-step-1`, `hero-step-2`, `hero-step-3`

Responsive Frames:
- Desktop frame is the primary source of truth
- Tablet and mobile frames should exist for any section with layout changes
- Frame widths: 1440px (desktop), 991px (tablet), 767px (mobile landscape), 478px (mobile portrait)
- Missing mobile frames are flagged — not blockers, but require design decisions during `/component-plan`
</reference_guides>

<success_criteria>
- No unnamed layers remain in the file
- Every section and component frame uses auto layout
- All layers use kebab-case matching intended CSS class names
- Component nesting is 3 levels max
- Pages named to match Webflow page slugs
- Interactive states defined as variants or separate frames
- Desktop + at least one mobile breakpoint frame exists per section
</success_criteria>
