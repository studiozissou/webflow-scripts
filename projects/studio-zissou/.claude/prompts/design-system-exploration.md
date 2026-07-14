# Studio Zissou — Design System Exploration Prompt

**Usage:** Paste this into Claude AI with the Figma MCP connected and your Studio Zissou Figma file open.

---

## Context

You're helping develop the design system for Studio Zissou — a one-person Webflow design & development agency. The Figma file contains the current homepage design plus a collection of inspiration images I want to riff on.

### Brand positioning
- "Website valet" — personal, premium, ongoing custody of client sites
- Tagline: "Designed for warmth. Engineered for depth."
- The brand tension is intentional: technically sharp but visually playful/crafted. Do not resolve this tension — lean into it.

### Visual references already established
- Teenage Engineering OP-1 (hardware aesthetic, signal orange, knob gray, screen UI)
- Studio Ghibli (warm atmosphere, friendly machines, airship blueprints, mechanical creatures)
- Nazca geoglyphs (earth tones, single-line craft, ancient mark-making)
- Ligne claire (uniform 2px stroke, flat fills, no variable weight or shadows)

### Current design tokens (from Figma)
- Palette: lavender accent #DECEE9, gold accent #FAE89E, dark #2A2A2A, light bg #EBEDE6, darker bg #E1E3DC, border #737373
- Typography: PP Rader (Bold, Thin, Regular, Italic) — quirky hand-drawn display face, single font family throughout
- Border radii: 14px (cards), 5px (form), 2.5px (small elements)
- OpenType features active: onum, pnum, frac on card labels; ordn, ss05, ss07, ss10, ss12, case on work titles

### Proposed (not yet locked) colour direction
The visual-direction doc proposes shifting toward warmer earth tones:
- Shell #E8E4DF, Panel #F5F2ED, Signal Orange #FF6B35, Ochre #C67B30, Charcoal #2B2D2E, Knob Gray #8D8A85, Dust #B8AD9E
- Alternative palettes explored: "OP-1 Console" (adds teal), "Ghibli Afternoon" (forest green + kiki red), "Nazca Line" (ochre + terracotta)

### Illustration/decorative system planned
- 2px ligne claire outlines, flat fills, occasional halftone/stipple texture
- Submarine aesthetic: pipe runs as section dividers, porthole icon frames, cable routing brackets, rivet grid backgrounds
- Spot illustrations per section (periscope, console dials, geological strata with circuit traces, lighthouse as Nazca figure)

---

## Your task

I want to experiment with and develop the complete design system. For each area below, look at the inspiration images in the Figma file and react to what's actually there — not to generic design principles.

---

### 1. Colour system
- Look at every inspiration image in the Figma. Extract the specific colours that recur or feel essential — not "warm tones" in general, but actual hex values you're pulling from the images.
- Propose a locked palette of 8–10 colours with roles (background, surface, text, accent-primary, accent-secondary, accent-tertiary, border, muted). Show how they relate to specific inspiration images.
- For each colour, note which reference it comes from (e.g. "pulled from the OP-1 orange encoder cap in image X" or "matches the terracotta in the Nazca photograph").
- Show me at least 2 distinct palette directions that are genuinely different from each other — not safe variations of the same thing.
- For every text/background combination in each palette, state the WCAG contrast ratio and whether it passes AA / AAA.

---

### 2. Typography
- PP Rader is confirmed as the display/heading typeface. I need a body/UI companion.
- Propose 3 specific font pairings. For each, explain the tension it creates with PP Rader (not just "it complements it" — what specific contrast does it introduce?).
- Consider: do I need a monospace for technical/code-adjacent moments? If so, which one and why?
- Show a full type scale with specific sizes — not a generic modular scale, but sizes that work with PP Rader's specific proportions and x-height. Include: display, h1–h4, body-large, body, body-small, caption, micro.
- Define line-height and letter-spacing for each step in the scale.
- Define emphasis conventions: how bold, italic, and underline are used (or not used) in context.

---

### 3. Icons, glyphs & decorative elements
- Based on the submarine/ligne claire/OP-1 direction, propose a specific icon style with rules: stroke weight, corner radius, fill rules, size grid, optical alignment rules.
- Design 5–6 specific icon concepts that would appear on the site (not generic — tied to the actual sections: navigation, services, quality, contact, etc.).
- Propose 2–3 decorative micro-elements (dividers, bullets, corner treatments) that carry the submarine/mechanical aesthetic.
- How should the porthole/gauge/pipe motifs scale from large decorative to small UI element?
- Define custom list bullet style — what glyph or shape replaces the default dot?
- Define blockquote treatment — how does it look within this system?

---

### 4. Line weights & spatial rhythm
- Define a stroke/line system: what weights for borders, dividers, illustration outlines, UI elements? How do these relate to the 2px ligne claire baseline?
- Propose a spacing system that feels mechanical/engineered (not generic 8px grid — something that reflects the OP-1 panel layout or submarine instrument spacing). Show the full scale with named tokens.
- How should cards, sections, and containers use borders vs. fills vs. whitespace?
- Define vertical section padding rhythm — how much space between sections, and does it vary by section type?

---

### 5. Layout & grid
- Propose the column grid: how many columns, gutter width, margin width. Should it be symmetric or asymmetric?
- Define max-width / container sizes for content, wide, and full-bleed contexts.
- How do gutters and margins change per breakpoint?
- Does the grid reference anything mechanical (e.g. OP-1's panel divisions, instrument rack spacing)?

---

### 6. Elevation & depth
- Define the shadow system — or make a deliberate case for no shadows (ligne claire argues for flatness). If no shadows, what creates visual hierarchy instead?
- Z-index layering strategy: nav, modals, tooltips, decorative elements.
- Overlay and scrim treatments: what colour, what opacity, when used?

---

### 7. Motion & animation
- Define 3–4 named easing curves with specific cubic-bezier values. What personality does each one have? (e.g. "mechanical snap" vs. "submarine drift")
- Duration scale: micro (hover states), small (toggles, reveals), medium (section transitions), large (page transitions). Specific ms values for each.
- Enter/exit patterns: what's the default? Fade? Slide? SVG line-draw for ligne claire elements?
- Scroll-triggered animation philosophy: when to animate on scroll, when to leave static. What earns animation?
- `prefers-reduced-motion` rules: what remains, what gets cut?
- If Barba.js page transitions are used, what's the transition concept? (Mechanical shutter? Pipe fill? Submarine dive?)

---

### 8. Component states
- Define all interactive states: default, hover, active, focus, disabled. How does each feel within the mechanical/submarine metaphor?
- Buttons: does a button "depress" like a rocker switch? Does it have a toggle feel? Specify the visual change for each state.
- Focus ring style: how does the accessibility focus indicator fit the aesthetic? (Dashed ligne claire outline? Porthole glow?)
- Form fields: define empty, filled, focus, error, success states. What's the error colour? What's the success indicator?
- Links: define inline link style, standalone link style, and nav link style separately.

---

### 9. Texture & pattern
- Background textures: formalise the rivet grid idea — what size, what opacity, what colour? Does it appear everywhere or only on certain surfaces?
- Noise/grain overlay: yes or no? If yes, what intensity, what blend mode, what colour?
- Halftone/stipple: when is it used, at what density, in what contexts?
- Paper/material quality: is the overall feel matte? Slightly warm? Aged? Pristine? Define it so every future design decision can reference it.

---

### 10. Photography & image treatment
- When photos are used (client work, case studies), what treatment do they get? Duotone? Desaturated? Full colour with a warm overlay?
- Image corner treatments: match the border-radius system or different?
- Standard aspect ratios: hero, card thumbnail, inline image. Specify each.
- Overlay/filter treatments for images on dark vs. light backgrounds.

---

### 11. Responsive behaviour
- How does the aesthetic translate to mobile? Do pipes simplify? Do illustrations hide or shrink?
- Which decorative elements drop at which breakpoints? Be specific — don't just say "simplify on mobile."
- Typography scale shifts: what changes at tablet and mobile?
- Touch target minimum sizes (48px minimum, but how does this interact with the mechanical button metaphor?).
- Does the grid collapse from multi-column to single? At what breakpoint?

---

### 12. Dark mode / alternate themes
- Is there a dark mode? If yes, how does the palette invert — does it become "submarine interior at depth"?
- If no dark mode, state it as an explicit design decision with reasoning, not just an omission.
- Are there any alternate colour themes for specific sections (e.g. dark section for "Engineered for Depth")?

---

### 13. Content formatting
- Table styling: borders, header treatment, alternating rows or not.
- Code/preformatted text: background colour, font, padding. Does it reference the OP-1 screen?
- Emphasis hierarchy: how do bold, italic, highlight, and strikethrough look?
- Horizontal rule / section break: what does it look like in this system?

---

### 14. Brand marks
- Logo usage: clear space rules, minimum size, colour variations (on light, on dark, single-colour).
- SZ monogram: when to use monogram vs. full wordmark. Size thresholds.
- Favicon and app icon treatment: how does the brand compress to 32px and 16px?

---

### 15. Accessibility tokens
- Contrast ratios for every text/background combination (weave this into the colour system proposals).
- Focus indicator specification: colour, width, offset, style.
- Minimum interactive target size and how it's enforced in the component system.
- How the colour system works for colour-blind users — are accent colours distinguishable without hue?

---

### 16. Sound & micro-feedback *(take a stance)*
- The OP-1 reference is a physical instrument with tactile and audible feedback. Does this translate to the web?
- Click sounds, toggle sounds, hover feedback — yes or no? If yes, what character? If no, why not?
- Haptic feedback on mobile — relevant or not?
- This is a real design decision, not a novelty. Argue for or against.

---

### 17. Design style definition
- Write a 1-paragraph design style statement I can use as a creative brief. Be specific and opinionated — reference the actual visual references, not abstract adjectives.
- List 5 things this design system IS and 5 things it IS NOT. Be brutal — the "is not" list is more important than the "is" list.
- Define the "charm spectrum" — where on the scale from playful to serious should each type of element sit? Map every element type: illustrations, headings, body copy, buttons, form fields, navigation, footer, decorative elements, animations.

---

## How to work

1. **Start by examining every inspiration image in the Figma file.** Screenshot each one. Describe what you see — colours, textures, line quality, mood, specific details. This is the foundation. Do not skip this step or summarise from memory.
2. **React honestly.** If an inspiration image conflicts with the current direction, say so. If something in the existing tokens doesn't work, say so. I want your actual design opinion, not diplomatic hedging.
3. **Be specific, not safe.** Every proposal should include actual values (hex codes, px/rem sizes, font names, stroke weights, cubic-bezier curves, ms durations). "A warm neutral" is not a proposal — "#E8E2D9 pulled from the sandstone in image 3" is a proposal.
4. **Show tensions and trade-offs.** Where two references pull in different directions (e.g. OP-1's clean precision vs. Ghibli's organic warmth), name the tension and propose how to resolve it — or argue for leaving it unresolved.
5. **Present experiments as experiments.** Label things as "lock this" vs. "explore further" vs. "discard". I want your recommendation but also your reasoning.
6. **Don't try to cover everything in one pass.** If the conversation gets long, prioritise: colour → typography → motion → states → everything else. Tell me when to stop and lock decisions before moving on.
