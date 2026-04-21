# Studio Zissou — Visual Direction

**Status:** Draft v2 · 2026-04-20
**References:** Teenage Engineering OP-1 · Studio Ghibli · Ancient geoglyphs (Nazca) · Ligne claire

---

## Current State

Figma design (node 12395:37) has a strong foundation:
- Warm gray-lavender monotone palette — elegant but flat
- Quirky hand-drawn display typography — keep, this carries the charm
- Generous whitespace, clean layout
- Feels unfinished — missing accent color, illustration system, decorative details

---

## Color Scheme — Recommended Direction

**Blend: OP-1 structure + Nazca earth tones**
Use signal orange sparingly as a "power on" color. Keep bulk of page in bone/clay tones.

| Role | Hex | Usage |
|------|-----|-------|
| Shell | `#E8E4DF` | Page background (warm bone) |
| Panel | `#F5F2ED` | Card / section backgrounds |
| Signal Orange | `#FF6B35` | CTAs, active states, accents (sparingly) |
| Ochre | `#C67B30` | Secondary accent, illustration fills |
| Charcoal | `#2B2D2E` | Body text |
| Knob Gray | `#8D8A85` | Captions, muted text |
| Dust | `#B8AD9E` | Borders, dividers |

### Alternative palettes (reference only)

**A) OP-1 Console** — forward, tech-feel
- Shell `#E8E4DF` · Panel `#F5F2ED` · Orange `#FF6B35` · Teal `#2A9D8F` · Charcoal `#2B2D2E` · Knob Gray `#8D8A85`

**B) Ghibli Afternoon** — warm, atmospheric
- Sky Wash `#DDE5E8` · Cloud `#F7F4EF` · Forest `#4A7C59` · Kiki Red `#C4453C` · Soot `#3A3A3A` · Dust `#B8AD9E`

**C) Nazca Line** — earth, craft
- Sand `#E6DDD1` · Bleached `#F2EDE6` · Ochre `#C67B30` · Terracotta `#A0522D` · Basalt `#2F2F2F` · Clay `#B5A898`

---

## Illustration System

**Style rules:**
- Consistent 2px ligne claire outlines, no variable stroke
- Flat color fills, occasional single-tone halftone/stipple for texture (OP-1 screen style)
- Isolated spot illustrations, not full scenes — equipment manual diagram aesthetic
- Friendly machines, mechanical creatures, topographic patterns

**Per-section illustration concepts:**

| Section | Concept |
|---------|---------|
| Hero | Key fob / brass valet tag — or submarine periscope with Ghibli landscape through the lens |
| The Problem | Dusty/neglected machine with overgrown vines — abandoned equipment |
| What I Do | Three small machines: a drafting tool, a conveyor, a gauge |
| How It Works | Calendar-like cog wheel with monthly intervals |
| Craft | Hand adjusting a single dial on minimal console (OP-1 knob + Nazca-line hand) |
| Depth | Geological strata with embedded circuit traces — geoglyph meets PCB |
| Work | Cross-section diagram of a machine with labeled internals (Ghibli airship blueprint style) |
| Agencies | Two machines connecting via pipe/cable handshake |
| Presence | Small lighthouse as Nazca figure broadcasting concentric arcs |
| Contact | Speaking tube / ship intercom in ligne claire |

**Valet visual hooks:** Key fob, brass tag, ticket stub (for work items),
dashboard/console (fits OP-1 direction), ligne claire hand offering a key.

---

## Decorative System — Submarine / Ligne Claire

Feel: Exposed internals of a friendly submarine. Ponyo's ship meets OP-1 circuit aesthetic.

| Element | Use |
|---------|-----|
| Section dividers | Horizontal pipe runs with valve wheels, pressure gauges, or junction boxes at intervals |
| Corner decorations | Cable routing brackets — small L-shaped pipes with bolts at section corners |
| Background texture | Faint rivet grid pattern (submarine hull) at ~3% opacity |
| Navigation connectors | Vertical conduit/cable down left margin with junction nodes at each section anchor |
| Icon frames | Service icons sit inside portholes (circle with bolts) or gauge housings |
| CTA buttons | Styled as toggle switches or rocker buttons with 1px inset shadow |

**Implementation:** Inline SVGs using `currentColor` so they adapt to palette. Ligne claire (uniform stroke, no shadows) translates perfectly to vector.

---

## Design Tension

The message is technical/serious, the visuals are playful/crafted. That contrast is the brand:

- Copy talks about automation and systems → typography is hand-drawn
- Content is technical → illustrations are Ghibli submarines and OP-1 knobs
- Offering is serious → decorative pipes and portholes make it feel inviting

**Do not resolve this tension. Lean into it.**

---

## Next Steps

1. **Lock palette** — confirm OP-1 / Nazca blend or alternative
2. **Generate illustration concepts** with Nano Banana — submarine periscope, console dial, cross-section diagram, etc.
3. **Design decorative SVG library** — pipes, portholes, cable runs as reusable components
4. **Build `/style-guide`** — formalize palette into CSS custom properties / Webflow tokens
