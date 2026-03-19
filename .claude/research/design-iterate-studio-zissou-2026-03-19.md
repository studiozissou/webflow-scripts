# Design Iteration: Studio Zissou Homepage
**Date:** 2026-03-19
**Iterations:** 1
**Design input:** Figma — `UPnvCqCPnbvewjtbV235fm` node `12367:6442` (homepage) + moodboard node `12388:1644`
**Goals:** Elevate flat/minimal design with color, pattern, illustration, texture, and interactive depth — drawing on moodboard references (Moebius, Ghibli, Teenage Engineering, submarine engineering, 80s retrofuturism)

---

## Design Context Block

- **Type:** Figma
- **Source:** `https://www.figma.com/design/UPnvCqCPnbvewjtbV235fm/Studio-Zissou-Web-Design-2026`
- **Brand Voice:** Calm, confident, considered. "Designed for warmth. Engineered for depth." Not salesy.
- **Audience:** Agency decision-makers evaluating development partners (UK, NL, Europe, US)
- **Three Pillars:** Precision, Performance, Partnership
- **Art Direction:** Submarine engineering precision, Studio Ghibli warmth, Moebius linework, 80s retrofuturism, Teenage Engineering OP-1 industrial design

---

## Iteration 1 — Review Findings

### Agents: UX Researcher, Art Director, Content Reviewer (parallel)

**Core diagnosis (all three agents converge):** The moodboard is a promise the page hasn't made good on yet. The design has strong bones — good IA, strong typography instincts, and a compelling submarine/depth metaphor — but the visual execution is holding back. The "flat" feeling comes from three compounding factors:

1. **No colour deployment** — accent tokens exist but aren't used between hero and footer
2. **No texture** — pure digital cream reads as unfinished, not intentional
3. **No illustration** — the Moebius/Ghibli/TE references are all still on the moodboard

### Findings Summary

| Priority | Finding | Source |
|----------|---------|--------|
| Critical | No color — design reads monochrome across middle sections | Art Director |
| Critical | "Quality is a way of saying..." — circular copy, buries the best line | Content |
| Critical | "Good things come from continuity" — flattest line on the page, unsupported | Content |
| Critical | Submarine metaphor not visualized anywhere | Art Director |
| Critical | Hero undersized type, no illustration anchor | Art Director |
| High | No texture — feels digitally flat | Art Director |
| High | Illustration system missing entirely | Art Director |
| High | Hero grammatical inconsistency ("Engineering" vs "Engineered") | Content |
| High | "The details that matter" — generic agency phrase | Content |
| High | No social proof or outcome data anywhere on page | UX / Content |
| High | Metaphor system present but not threaded — reads as accidental | Content |
| High | No mid-page social proof — conversion path has one gate | UX |
| High | Work section carries no outcome or context signals | UX |
| High | Section headings typographically indistinguishable | UX |
| High | Footer CTA has no visual anchor | Art Director |
| Medium | Marquee keywords are generic — replace with brand-voice phrases | Content |
| Medium | CTA lacks supporting microcopy — add process signal | Content |
| Medium | Gills section is visual breath but not narrative beat | UX |
| Medium | Client pills need hover and contrast | Art Director |
| Medium | Typography color moment missing | Art Director |
| Medium | Section dividers not systematic | Art Director |
| Medium | No scroll orientation after hero exits viewport | UX |
| Medium | Contact CTA desktop ambiguity | UX |
| Medium | Typography monoculture reduces cognitive texture | UX |
| Low | "Engineered for Depth" copy is the strongest — leave it | Content |

---

## Selected Enhancements (User-Approved)

### 1. Color System Deployment

Token palette from moodboard analysis:

| Token | Value | Role |
|-------|-------|------|
| `--color-base` | `#F5F0E8` | Page background — warm cream |
| `--color-ink` | `#1C1F2E` | Body text — navy depth, not pure black |
| `--color-accent-primary` | `#C45832` | Terracotta — emotional accent. One word in hero, CTA button, hover states |
| `--color-accent-secondary` | `#E87B3A` | TE orange — one moment per page (footer CTA or single decorative element) |
| `--color-accent-tertiary` | `#5C7A5A` | Sage green — topo lines, illustration fills, depth section |
| `--color-accent-neutral` | `#8C7B6E` | Warm gray — secondary text, dashed rules |

**Rules:** One accent per section. Color scarcity is what makes it land. Terracotta on the hero display word + footer CTA button. Sage green in the depth section background. No color on body text.

### 2. Paper Texture + Grain Overlay

Subtle SVG noise/grain at 4–6% opacity over `--color-base`. Moves from "digital cream" to "printed cream". Near-zero performance cost.

```css
.page-wrapper::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url('/noise-texture.png');
  opacity: 0.04;
  pointer-events: none;
  z-index: 9999;
  mix-blend-mode: multiply;
}
```

Or inline SVG `feTurbulence` filter for zero additional requests.

### 3. Topographic Contour Pattern

SVG contour lines at 5–8% opacity in `--color-ink` on the "Engineered for Depth" section. Scroll-animated via GSAP `stroke-dashoffset` scrub — lines draw themselves as the user descends.

**Implementation:** Each SVG `<path>` gets `stroke-dasharray` equal to `getTotalLength()`, then `stroke-dashoffset` animates from full to 0 on ScrollTrigger scrub. GPU-composited, 60fps, no layout thrash.

Contour data could be sourced from real topography of the studio's location.

### 4. Section Illustrations (Nano Banana Prompts)

All illustrations share a consistent style: fine pen linework, limited flat color fills (from the token palette), no gradients, slightly imperfect hand-drawn quality. Technical illustration meets field journal sketch.

#### Hero — Submarine Porthole
> Vintage technical illustration of a submarine porthole circular viewport, Moebius bande dessinee linework style, fine ink lines on aged cream paper #F5F0E8, through the porthole a glimpse of underwater scene with coral and light shafts, limited palette of terracotta #C45832 and sage green #5C7A5A as flat fills within pen strokes, no gradients, precise cross-hatching for shadow areas, Air France vintage poster aesthetic meets field journal sketch, white border around circular porthole, portrait composition centered, no text no typography, technical elegance with hand-crafted warmth

#### "Calm Attention" — Navigational Compass
> Small precise technical illustration of a navigational compass with visible mechanical detail, Teenage Engineering industrial design meets Moebius linework, fine ink cross-hatching, warm cream background #F5F0E8, navy ink #1C1F2E line work, small terracotta accent #C45832 on the North indicator needle, isometric-adjacent view showing instrument depth and precision, Studio Ghibli warmth in the rendering, field journal sketch quality, isolated object centered with generous white space, no text no typography, square composition

#### "Engineered for Depth" — Submarine Cross-Section
> Detailed cutaway cross-section illustration of a vintage submarine interior, Moebius Heavy Metal magazine style linework, fine pen illustration, technical diagram aesthetic with hand-drawn warmth, cream paper background #F5F0E8, limited palette navy #1C1F2E ink lines, sage green #5C7A5A interior panels, terracotta #C45832 accent instruments and pipes, small figure at workstation in profile, compartments showing pressure gauges periscope mechanism ballast tanks, Tintin-era ligne claire clarity with Moebius density of detail, horizontal wide composition for section background, no text no typography

#### "A Steady Presence" — Maritime Barometer
> Vintage scientific illustration of a maritime barometer or tide gauge instrument, detailed technical pen linework in the style of Victorian scientific illustration meets Atelier Orca, fine cross-hatching and stippling, cream paper texture #F5F0E8, navy ink #1C1F2E, one terracotta accent element, abstract gauge markings on dial face, isolated object on generous cream field, Wes Anderson symmetry in composition, no text no typography, tall portrait crop

#### Footer — Vessel on Calm Water
> Minimal ink illustration of a small wooden vessel on calm flat water, view from low angle at water level, simplified geometric horizon line, Ghibli warmth meets Hokusai graphic simplicity, very limited marks, cream background #F5F0E8, navy #1C1F2E simple hull and reflection, sage green #5C7A5A for waterline, the boat is small and unhurried in a large field of space, conveys calm confidence and forward motion, no drama no storm, wide landscape crop letterbox, no text no typography

### 5. Copy Rewrites

**"Respect for Quality"** — replace current body copy with:
> "Inviting on the surface. Reliable and resilient below. That's what quality actually means — not as a checklist, but as a way of working."

**"A Steady Presence"** — replace current body copy with:
> "Continuity is a design decision. We build for the long term because the best sites are maintained, refined, and deepened over time — not launched and forgotten."

### 6. Custom Postcard Form Success State

Card-flip animation revealing the reverse of the postcard: "Message sent. We'll be in touch." with the SZ monogram stamped. Extends the postcard metaphor through the conversion endpoint.

### 7. Technical Metadata in Footer

Submarine-style status panel in small monospace type:
> `Systems: nominal · Depth: 40m · Crew: 1 · Built with Webflow + vanilla JS`

---

## WebGL/WebGPU Water Effects — Creative Dev Enhancements

### Recommended Implementation Stack (Priority Order)

| # | Effect | Approach | WebGL? | Hours | Impact |
|---|--------|----------|--------|-------|--------|
| 1 | **Bubble particles** | CSS + GSAP + Lenis velocity | No | 2–3h | Ambient motion, immediately distinctive |
| 2 | **Depth colour shift** | CSS custom prop + ScrollTrigger | No | 1–2h | Strongest narrative payoff per hour |
| 3 | **Calm water section divider** | SVG feTurbulence filter | No | 1–2h | Elegant section punctuation |
| 4 | **Caustic light background** | Three.js ShaderMaterial (FBM) | Yes | 4–6h | Highest "wow-per-watt" WebGL effect |
| 5 | **Atmospheric fog overlay** | CSS backdrop-filter | No | 1–2h | Completes the depth atmosphere |
| 6 | **Submarine porthole** | Three.js full scene | Yes | 12–16h | Hero feature — separate sprint |

**Key architecture notes:**
- Priorities 1–3 require zero WebGL — ship with no Lighthouse regression
- All effects follow IIFE module pattern with `init()`/`destroy()`, `gsap.context()` for cleanup
- `prefers-reduced-motion` guard on all effects
- Mobile: halve resolution, reduce particle count, disable WebGL distortion below 768px
- Three.js from jsDelivr CDN pinned to commit hash

### Effect Details

#### 1. Bubble Particles (CSS + Lenis Velocity)
Tiny teal semi-transparent circles (2–4px) rising slowly. Scroll velocity from Lenis accelerates them with physical spring easing. The physics is what differentiates from cliché — fast scroll = bubbles rush, stop = decelerate.

#### 2. Depth Colour Shift (ScrollTrigger)
ScrollTrigger drives `--depth-progress` from 0→1. Background interpolates: `#F5F0E8` (surface cream) → `#1a3a4a` (mid-water) → `#050d12` (abyssal). Combined with topo contour lines, creates a genuine descent experience.

#### 3. Calm Water Section Divider (SVG Filter)
SVG `feTurbulence` with animated `baseFrequency`. 120px horizontal band between sections. Ghibli-flat calm water, not dramatic waves.

#### 4. Caustic Light Background (Three.js)
Two overlapping Perlin/simplex noise fields in a GLSL fragment shader on a fullscreen quad. 0.04–0.08 opacity. At low intensity reads as "engineered surface texture." 0.5–1ms per frame. Mobile: render at 0.5x devicePixelRatio.

```glsl
float caustic(vec2 uv, float time) {
  vec2 p = uv * 3.0;
  float f = 0.0;
  f += 0.5 * abs(sin(fbm(p + time * 0.3) * 6.28));
  f += 0.25 * abs(sin(fbm(p * 2.0 - time * 0.2) * 6.28));
  return f;
}
```

#### 5. Atmospheric Fog Overlay (CSS)
Fixed gradient overlay: `transparent` at top → `rgba(10, 40, 60, 0.12)` at bottom. ScrollTrigger drives `--fog-depth`. Optional `backdrop-filter: blur(0.5px)` (cap at 1px, test on Safari).

#### 6. Submarine Porthole (Three.js — Future Sprint)
Circular canvas (480–640px): water surface mesh with vertex displacement, 200–400 point particles, caustic light layer, vignette post-processing. 1.5–3ms per frame. `IntersectionObserver` to pause when off-screen.

### Reference Links

**Caustics:**
- [Evan Wallace WebGL Water](https://madebyevan.com/webgl-water/)
- [Maxime Heckel — Caustics with Shaders](https://blog.maximeheckel.com/posts/caustics-in-webgl/)
- [Martin Renou — Real-time Caustics](https://medium.com/@martinRenou/real-time-rendering-of-water-caustics-59cda1d74aa)
- [GitHub: martinRenou/threejs-caustics](https://github.com/martinRenou/threejs-caustics)

**Water Surface:**
- [Three.js Ocean Shader](https://threejs.org/examples/webgl_shaders_ocean.html)
- [Codrops — Stylized Water Effects](https://tympanus.net/codrops/2025/03/04/creating-stylized-water-effects-with-react-three-fiber/)
- [GitHub: thaslle/stylized-water](https://github.com/thaslle/stylized-water)
- [Water simulation (Vercel)](https://water-simulation.vercel.app/)

**Particles:**
- [Codrops — Dreamy Particle Effect with GPGPU](https://tympanus.net/codrops/2024/12/19/crafting-a-dreamy-particle-effect-with-three-js-and-gpgpu/)
- [Awwwards WebGL Shaders collection](https://www.awwwards.com/awwwards/collections/webgl-shaders-code/)

**Depth / Underwater Scenes:**
- [OceanX 2025 — Awwwards SOTD](https://www.awwwards.com/sites/oceanx-2025)
- [The Sea We Breathe — Awwwards](https://www.awwwards.com/inspiration/the-sea-we-breathe-dive-into-3-immersive-underwater-journeys)

**Shader Techniques:**
- [Codrops — Animate WebGL Shaders with GSAP](https://tympanus.net/codrops/2025/10/08/how-to-animate-webgl-shaders-with-gsap-ripples-reveals-and-dynamic-blur-effects/)
- [Codrops — Dissecting a Wavy Shader](https://tympanus.net/codrops/2025/10/25/dissecting-a-wavy-shader-sine-refraction-and-serendipity/)
- [WebGPU Fluid Simulations — Codrops](https://tympanus.net/codrops/2025/02/26/webgpu-fluid-simulations-high-performance-real-time-rendering/)

---

## Art Director's "Depth Arc" Concept

Structure the page scroll as a literal descent:
- **Hero:** Surface level — light, airy, maximum cream space
- **Scroll down:** Background warms slightly (3–4% tint shift from `#F5F0E8` → `#EDE6D8`), topo contour lines appear and increase density, illustrations become more interior/instrument-focused
- **Deep sections:** Type becomes marginally more compact, color accents shift toward cooler tones
- **Footer:** Sense of having traveled somewhere

**Porthole as recurring motif:** Circular shape appears as image crop, illustration frame, potential transition animation. Max three uses, always different scale.

**Gauge as UI element:** Small abstract instrument faces (40px diameter, sage green + navy) beside value section headings. Not data vis — decorative precision instruments.

---

## Additional Content Review Notes

### Copy Not Selected But Worth Noting

**Hero fix:** "Engineering for depth" → "Engineered for depth" (parallelism fix — surgical, high-trust-impact)

**CTA alternatives considered:**
1. "Start a Conversation" — neutral, easy first step
2. "Let's Find Out If We're a Good Fit" — honest, attracts quality leads
3. Current "Let's Talk It Through" — warmest but implies long call

**Missing copy opportunities:**
- Client descriptors: one-line per pill ("Carsa — platform build, performance score 97")
- Pull-quote in quality section: "The code was the cleanest we'd ever inherited. — Temper"
- Process signal beneath CTA: "Usually a 30-minute call, no preparation needed"
- Marquee: replace generic terms with brand phrases ("built in from the start / quiet attention / made to last")

### Metaphor Threading Guidance

Use these terms consistently:
- "hull" / "below the surface" → reliability/engineering
- "surface" → UX and visual design
- Verb "built" preferred over "made" (aligns with engineering register)

---

## Creative Dev Opportunities Applied
_(None yet — iteration 1 is review only)_

## Creative Dev Opportunities Remaining
- Scroll-driven topographic contour line emergence (GSAP ScrollTrigger + SVG `stroke-dashoffset`)
- Bubble particle system with Lenis velocity response
- Depth colour shift (CSS custom property + ScrollTrigger)
- Calm water SVG section divider
- Caustic light Three.js background
- Atmospheric fog overlay
- Submarine porthole hero feature (future sprint)

---

## Next Steps
1. Generate Nano Banana concept images for illustrations (requires `GOOGLE_AI_API_KEY`)
2. Apply color system and texture in Figma design
3. Build topographic contour SVG + scroll animation prototype
4. Plan build sequence for creative dev effects (priorities 1–5 = ~10–15 hours)
