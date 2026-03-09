# Spec: sz-work-clients

**Status:** Planning
**Client:** Studio Zissou
**Priority:** P1
**Complexity:** Complex
**Build Order:** — (section-level element)
**Figma Node:** 1:38
**Author:** Claude (Opus)
**Created:** 2026-03-06

---

## Summary

CMS-driven client list for the "Work" section. Each row displays a client name with bracket characters (OpenType stylistic sets), an external link arrow (↗), and a hover-triggered preview image that fades in at a fixed position. The list is bound to a Webflow CMS "Projects" collection.

Delivered as a standalone ES module (`work-clients.js`) with `init(container)` / `destroy()` exports, ready to be wired into a future `orchestrator.js`.

---

## Clients

| # | Name | External URL | Display Order |
|---|------|-------------|---------------|
| 1 | Carsa | Yes | 1 |
| 2 | Skye High | Yes | 2 |
| 3 | Temper | Yes | 3 |
| 4 | Ready Hit Play | Yes | 4 |
| 5 | Compare Ethics | Yes | 5 |

All clients have preview images and external URLs. The ↗ arrow is present on every row (not conditional).

---

## Visual Anatomy

```
                                                    ┌──────────────────┐
                                                    │                  │
〔 Carsa ↗ 〕                                        │  preview image   │
                                                    │  (696 × 508)    │
〔 Skye High ↗ 〕                                    │  14px radius     │
                                                    │                  │
〔 Temper ↗ 〕                                       └──────────────────┘

〔 Ready Hit Play ↗ 〕

〔 Compare Ethics ↗ 〕
```

- **Client name:** PP Rader Thin 5.625rem (90px), uppercase, `#2A2A2A`
- **Font features:** `font-feature-settings: 'ordn' 1, 'ss05' 1, 'ss07' 1, 'ss10' 1, 'ss12' 1, 'case' 1` (renders bracket characters 〔 〕)
- **Row gap:** ~80px between rows
- **Left margin:** ~6.25% from viewport edge
- **Arrow:** ↗ character or SVG icon, same style as client name
- **Preview image:** 696×508px, `border-radius: 14px`, positioned right of centre
- **Preview positioning:** Deferred — use a simple fixed position for now (absolute within section, right-aligned). Will refine later.

---

## CMS Collection Schema

**Collection name:** Projects (or Clients)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | Plain Text | Yes | Client display name |
| `preview-image` | Image | Yes | Hover preview (696×508 recommended) |
| `external-url` | Link | No | External project/client URL |
| `display-order` | Number | Yes | Sort order for list rendering |

**Setup via Webflow MCP** — create collection and populate 5 items during build.

---

## Interaction

### Hover preview

- **Trigger:** Mouse enters a client row
- **Action:** Preview image for that client fades in (`opacity: 0 → 1`, ~300ms ease)
- **Exit:** Mouse leaves the row — preview fades out (`opacity: 1 → 0`, ~200ms ease)
- **Overlap:** If mouse moves directly from one row to another, crossfade (fade out old, fade in new)
- **No scroll animation:** Client list is visible on page load. Only the preview fade requires JS.

### Implementation approach

```js
// On mouseenter: fade in this row's preview image
gsap.to(previewEl, { opacity: 1, duration: 0.3, ease: 'power2.out' });

// On mouseleave: fade out
gsap.to(previewEl, { opacity: 0, duration: 0.2, ease: 'power2.in' });
```

---

## Responsive

- **Desktop (≥992px):** Full layout — stacked rows with hover preview
- **Tablet (768–991px):** Same layout, smaller font size (clamp or vw unit), preview may be smaller
- **Mobile (<768px):** Stack rows, hide preview image entirely (no hover on touch), reduce font size

Mobile rationale: hover interactions don't work on touch devices. Show the list without previews.

---

## Accessibility

- `prefers-reduced-motion: reduce` — Skip fade animation. Show/hide preview immediately (`display` or instant `opacity` toggle).
- Client names are rendered as `<a>` links with `href` from CMS — screen readers get link context naturally
- External links: add `target="_blank" rel="noopener noreferrer"` and visually hidden text "(opens in new tab)" or `aria-label`
- Preview images: `alt` attribute from CMS (client name + "project preview")
- Arrow (↗) is decorative — use `aria-hidden="true"` on the arrow element

---

## File Structure

```
projects/studio-zissou/
  work-clients.js          ← Module (init/destroy)
styles/
  studio-zissou.css        ← Append work-clients styles
```

### Module API

```js
// work-clients.js
const workClients = (() => {
  let ctx = null;
  const listeners = [];

  function init(container) {
    const rows = container.querySelectorAll('[data-work-row]');
    const previewWrap = container.querySelector('[data-work-preview]');
    if (!rows.length || !previewWrap) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    ctx = gsap.context(() => {
      rows.forEach((row) => {
        const previewSrc = row.dataset.previewSrc;
        const previewImg = previewWrap.querySelector('img');

        const onEnter = () => {
          previewImg.src = previewSrc;
          previewImg.alt = `${row.dataset.clientName} project preview`;
          if (reducedMotion) {
            gsap.set(previewWrap, { opacity: 1 });
          } else {
            gsap.to(previewWrap, { opacity: 1, duration: 0.3, ease: 'power2.out' });
          }
        };

        const onLeave = () => {
          if (reducedMotion) {
            gsap.set(previewWrap, { opacity: 0 });
          } else {
            gsap.to(previewWrap, { opacity: 0, duration: 0.2, ease: 'power2.in' });
          }
        };

        row.addEventListener('mouseenter', onEnter);
        row.addEventListener('mouseleave', onLeave);
        listeners.push({ el: row, type: 'mouseenter', fn: onEnter });
        listeners.push({ el: row, type: 'mouseleave', fn: onLeave });
      });
    }, container);
  }

  function destroy() {
    listeners.forEach(({ el, type, fn }) => el.removeEventListener(type, fn));
    listeners.length = 0;
    if (ctx) ctx.revert();
    ctx = null;
  }

  return { init, destroy };
})();
```

---

## Webflow Structure (expected DOM)

```html
<section class="sz-work-section" data-work>
  <div class="sz-work-list">
    <!-- CMS Collection List — each item is a row -->
    <a class="sz-work-row"
       data-work-row
       data-preview-src="/path/to/carsa-preview.jpg"
       data-client-name="Carsa"
       href="https://carsa.com"
       target="_blank"
       rel="noopener noreferrer">
      <span class="sz-work-name">〔 Carsa</span>
      <span class="sz-work-arrow" aria-hidden="true">↗</span>
      <span class="sz-work-name">〕</span>
    </a>
    <!-- Repeat for each CMS item -->
  </div>

  <div class="sz-work-preview" data-work-preview>
    <img src="" alt="" class="sz-work-preview-img" />
  </div>
</section>
```

**Selector contract:** JS targets `[data-work]`, `[data-work-row]`, `[data-work-preview]`. Data attributes `data-preview-src` and `data-client-name` are read from CMS-bound custom attributes. Class names are for CSS styling only.

**CMS binding notes:**
- `data-preview-src` bound to CMS preview image URL field
- `data-client-name` bound to CMS name field
- `href` bound to CMS external URL field
- Bracket characters (〔 〕) are part of the static template text, not CMS content
- Sort by `display-order` ascending

---

## CSS Tokens Used

| Token | Value | Usage |
|-------|-------|-------|
| `--sz-brand-dark` | `#2A2A2A` | Text colour |
| `--sz-bg-light` | `#EBEDE6` | Section background |
| `--sz-border-dark` | `#737373` | Row separator (if needed) |
| `--sz-radius-image` | `0.875rem` (14px) | Preview image border-radius |

---

## Barba Impact

**N/A for now** — Studio Zissou does not yet have Barba transitions enabled. The module follows the `init()`/`destroy()` pattern pre-emptively so it's Barba-ready when orchestrator.js is built.

1. **Init/Destroy lifecycle:** Yes — GSAP context created in `init()`, event listeners tracked and removed in `destroy()`
2. **State survival:** No — no state to persist (hover is transient)
3. **Transition interference:** No — all elements within `[data-work]` section
4. **Re-entry correctness:** Yes — `destroy()` removes all listeners and reverts GSAP context, `init()` rebuilds cleanly
5. **Namespace scoping:** Home page only (single-page site)

---

## Dependencies

- **GSAP core** (CDN) — tweens for fade animation
- **Webflow CMS** — Projects collection for client data
- No ScrollTrigger, no SplitText

---

## Tasks

| # | Task | Agent | Notes |
|---|------|-------|-------|
| 1 | Create CMS "Projects" collection via Webflow MCP (schema + 5 items) | code-writer (MCP) | Fields: name, preview-image, external-url, display-order |
| 2 | Build Webflow DOM structure (section + CMS list + preview container) | code-writer (wf-gen or MCP) | Bind CMS fields to data attributes |
| 3 | Write CSS for work-clients (layout, typography, font-features, responsive, preview positioning) | code-writer | Append to studio-zissou.css |
| 4 | Write `work-clients.js` module (hover fade, init/destroy, reduced-motion) | code-writer | IIFE pattern with GSAP context |
| 5 | QA: verify hover preview, CMS binding, font features, responsive, a11y, no console errors | qa | Run acceptance tests |

---

## Open Questions

1. **Preview positioning** — Exact X/Y coordinates deferred. Currently specified as "right of centre, absolute within section." Will refine after first visual pass.

---

## Acceptance Tests

| # | Test name | What it checks |
|---|-----------|---------------|
| 1 | `client rows render from CMS` | At least 5 `.sz-work-row` elements present |
| 2 | `client names display with bracket characters` | Font-feature-settings applied, bracket chars visible |
| 3 | `external links have correct attributes` | Each row has `target="_blank"`, `rel="noopener noreferrer"`, valid href |
| 4 | `hover shows preview image` | On mouseenter, preview wrapper reaches opacity 1 |
| 5 | `hover exit hides preview image` | On mouseleave, preview wrapper returns to opacity 0 |
| 6 | `preview image hidden on mobile` | At 375px viewport, preview wrapper is not visible |
| 7 | `prefers-reduced-motion skips animation` | With reduced motion, preview shows/hides instantly |
| 8 | `no console errors on page load` | Zero console errors after page load |

Test file: `tests/acceptance/sz-work-clients.spec.js`
