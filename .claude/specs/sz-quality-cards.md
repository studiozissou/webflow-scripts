# Spec: sz-quality-cards

**Status:** Planning
**Client:** Studio Zissou
**Priority:** P1
**Complexity:** Complex
**Build Order:** 3 (component)
**Figma Node:** 1:219
**Author:** Claude (Opus)
**Created:** 2026-03-06

---

## Summary

Three scroll-triggered reveal cards for the "Respect for Quality" section. Each card highlights a quality pillar (Interfaces, Code, Decisions) with decorative corner pins and a dashed SVG connector line. Animation is purely scroll-driven via GSAP ScrollTrigger — no hover or click interaction.

Delivered as a standalone ES module (`quality-cards.js`) with `init(container)` / `destroy()` exports, ready to be wired into a future `orchestrator.js`.

---

## Cards

| # | Label | Description |
|---|-------|-------------|
| 1 | Interfaces | that are carefully tuned |
| 2 | Code | that is readable, maintainable, and intentional |
| 3 | Decisions | informed by data but shaped by emotional context |

Each card: ~814x202px, rounded rectangle, `#EBEDE6` background, `1px solid #737373` border.

---

## Visual Anatomy (per card)

```
┌─────────────────────────────────────────────────────────────┐
│ ●                                                         ● │
│   INTERFACES ─ ─ ─ ─ ─ ─ ─ that are carefully tuned        │
│ ●                                                         ● │
└─────────────────────────────────────────────────────────────┘
```

- **Corner pins:** 4 small circles (8px diameter, `#2A2A2A` fill), one at each corner inset ~12px
- **Dashed connector:** SVG `<line>` or `<path>` with `stroke-dasharray`, connecting label to description
- **Label:** PP Rader Regular 1.75rem (28px), uppercase, `#2A2A2A`, `font-feature-settings: 'onum' 1, 'pnum' 1, 'frac' 1`
- **Description:** PP Rader Regular 1.25rem (20px), `#2A2A2A`

---

## Animation Sequence

Scroll-driven via ScrollTrigger (`pin: true`, `scrub: true`). Section is pinned for the duration of the scroll timeline.

### Per-card reveal (staggered across 3 cards):

1. **Dashed line draws** — SVG `stroke-dashoffset` animates from full length to 0 (left-to-right draw)
2. **Corner pins appear** — Sequential clockwise: top-left → top-right → bottom-right → bottom-left. Each scales from 0 → 1 with a slight fade.
3. **Content fades in** — Label and description `opacity: 0 → 1`, `y: 12 → 0`

### Timeline structure:

```
ScrollTrigger progress: 0 ──────────────────────────── 1

Card 1:  [line-draw][corners][content]
Card 2:       [line-draw][corners][content]
Card 3:            [line-draw][corners][content]
```

Each card occupies ~30% of the timeline with ~5% overlap between cards for smooth flow.

### ScrollTrigger config:

```js
ScrollTrigger.create({
  trigger: sectionEl,
  pin: true,
  start: 'top top',
  end: '+=2000',    // 2000px scroll distance on desktop
  scrub: 0.5,       // slight smoothing
});
```

---

## Responsive

- **Desktop (>=992px):** Full layout, 2000px scroll distance, all animations
- **Tablet (768-991px):** Same layout, narrower cards (fluid width)
- **Mobile (<768px):** Cards stack vertically, reduced card width, all cards visible immediately (no scroll pin). Corner pins and dashed lines remain as static decorations.

Mobile rationale: pinned scroll sections feel heavy on small screens. Show the final state directly.

---

## Accessibility

- `prefers-reduced-motion: reduce` — Skip all animation, show cards in final state immediately (opacity 1, corners visible, lines drawn). No ScrollTrigger pin.
- Corner pins and dashed lines are decorative — no `aria-label` needed
- Card content is semantic text — screen readers get it naturally
- Section heading "Respect for Quality" provides context

---

## File Structure

```
projects/studio-zissou/
  quality-cards.js          ← Module (init/destroy)
styles/
  studio-zissou.css         ← Append card styles (or separate file)
```

### Module API

```js
// quality-cards.js
const qualityCards = (() => {
  let ctx = null;

  function init(container) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    ctx = gsap.context(() => {
      // Build ScrollTrigger timeline
    }, container);
  }

  function destroy() {
    if (ctx) ctx.revert();
    ctx = null;
  }

  return { init, destroy };
})();
```

---

## Webflow Structure (expected DOM)

```html
<section class="sz-quality-section" data-quality>
  <!-- Heading + body text built in Webflow -->
  <h2 class="sz-quality-heading">Respect for Quality</h2>
  <p class="sz-quality-body">...</p>

  <div class="sz-quality-cards-wrap">
    <!-- Card 1 -->
    <div class="sz-quality-card" data-quality-card>
      <svg class="sz-quality-line" data-quality-line>
        <line x1="0" y1="50%" x2="100%" y2="50%"
              stroke="#737373" stroke-width="1"
              stroke-dasharray="8 6" />
      </svg>
      <div class="sz-quality-pin sz-quality-pin--tl" data-quality-pin></div>
      <div class="sz-quality-pin sz-quality-pin--tr" data-quality-pin></div>
      <div class="sz-quality-pin sz-quality-pin--br" data-quality-pin></div>
      <div class="sz-quality-pin sz-quality-pin--bl" data-quality-pin></div>
      <span class="sz-quality-label" data-quality-content>Interfaces</span>
      <span class="sz-quality-desc" data-quality-content>that are carefully tuned</span>
    </div>
    <!-- Card 2, Card 3: same structure -->
  </div>
</section>
```

**Selector contract:** JS targets `[data-quality]`, `[data-quality-card]`, `[data-quality-line]`, `[data-quality-pin]`, `[data-quality-content]`. Class names are for CSS styling only.

---

## CSS Tokens Used

| Token | Value | Usage |
|-------|-------|-------|
| `--sz-brand-dark` | `#2A2A2A` | Text, pin fill |
| `--sz-bg-light` | `#EBEDE6` | Card background |
| `--sz-border-dark` | `#737373` | Card border, dashed line stroke |
| `--sz-text-label-card` | PP Rader Regular 1.75rem uppercase | Card labels |
| `--sz-text-body-medium` | PP Rader Regular 1.25rem | Card descriptions |

---

## Barba Impact

**N/A for now** — Studio Zissou does not yet have Barba transitions enabled. The module follows the `init()`/`destroy()` pattern pre-emptively so it's Barba-ready when orchestrator.js is built.

1. **Init/Destroy lifecycle:** Yes — GSAP context created in `init()`, reverted in `destroy()`
2. **State survival:** No — purely decorative, no state to persist
3. **Transition interference:** No — all animations are within `[data-quality]` section
4. **Re-entry correctness:** Yes — `destroy()` reverts context, `init()` rebuilds cleanly
5. **Namespace scoping:** Home page only (single-page site)

---

## Dependencies

- **GSAP core** (CDN) — timeline, tweens
- **GSAP ScrollTrigger** (CDN) — pin + scrub
- No other dependencies

---

## Tasks

| # | Task | Agent | Estimate |
|---|------|-------|----------|
| 1 | Write `quality-cards.js` module (ScrollTrigger timeline, pin animations, staggered card reveals) | code-writer | Medium |
| 2 | Write CSS for quality cards (layout, typography, pin styling, responsive) | code-writer | Small |
| 3 | Build Webflow DOM structure (section + 3 cards with SVG lines and pins) | code-writer (wf-gen or manual) | Small |
| 4 | QA: verify scroll animation, reduced-motion, responsive stacking, no console errors | qa | Small |

---

## Open Questions

None — all design decisions resolved.

---

## Acceptance Tests

| # | Test name | What it checks |
|---|-----------|---------------|
| 1 | `quality cards are visible after scrolling` | All 3 cards reach opacity 1 after scrolling through the pinned section |
| 2 | `corner pins animate sequentially` | Pin elements have opacity 1 after scroll; 4 pins per card visible |
| 3 | `dashed lines are drawn` | SVG line stroke-dashoffset reaches 0 after scroll |
| 4 | `cards stack on mobile` | At 375px viewport, cards display as vertical stack |
| 5 | `no scroll pin on mobile` | Section is not pinned at mobile breakpoint |
| 6 | `prefers-reduced-motion shows all immediately` | With reduced motion, all cards visible at opacity 1 without scrolling |
| 7 | `no console errors on page load` | Zero console errors after page load + scroll |

Test file: `tests/acceptance/sz-quality-cards.spec.js`
