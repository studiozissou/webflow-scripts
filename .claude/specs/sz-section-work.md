# Spec: sz-section-work

**Status:** Ready to Build
**Client:** Studio Zissou
**Priority:** P1
**Complexity:** Complex
**Build Order:** 7
**Figma Node:** 1:38
**Author:** Claude (Opus)
**Created:** 2026-03-06

---

## Summary

Static layout and CSS for the "Work" section — the second section on the Studio Zissou single-page site. Contains a CMS-driven client list with OpenType bracket typography, external link arrows, and a hidden preview image container (styled but not interactive — JS hover deferred to `sz-work-clients`).

This spec covers the **section shell, CSS, and CMS collection setup**. The hover interaction JS is covered separately in `sz-work-clients.md`.

---

## Scope

**In scope:**
- CMS "Projects" collection definition (field schema + 5 seed items)
- Section CSS layout (`.sz-work-*` classes, desktop-only)
- PP Rader OpenType bracket styling (`ss05, ss07, ss10, ss12, case`)
- ↗ arrow + external link styling per row
- Preview image container (positioned, styled, `opacity: 0`)

**Out of scope:**
- JS hover interaction → `sz-work-clients`
- ScrollTrigger entrance animations
- Barba transition lifecycle
- Mobile/tablet responsive
- Orchestrator.js scaffolding

---

## CMS Collection: "Projects"

Create manually in Webflow Designer.

| Field | Webflow Type | Slug | Required | Notes |
|-------|-------------|------|----------|-------|
| Name | Plain Text | `name` | Yes | Client display name (e.g. "Carsa") |
| Preview Image | Image | `preview-image` | Yes | 696×508px recommended, used for hover preview |
| External URL | Link | `external-url` | No | Client site URL |
| Display Order | Number | `display-order` | Yes | Manual sort (ascending) |

### Seed data

| # | Name | External URL | Order |
|---|------|-------------|-------|
| 1 | Carsa | (client URL) | 1 |
| 2 | Skye High | (client URL) | 2 |
| 3 | Temper | (client URL) | 3 |
| 4 | Ready Hit Play | (client URL) | 4 |
| 5 | Compare Ethics | (client URL) | 5 |

Preview images to be uploaded per client.

---

## Webflow DOM Structure

```html
<section class="sz-work-section" data-work>
  <div class="sz-work-list w-dyn-list">
    <!-- CMS Collection List -->
    <div class="w-dyn-items" role="list">
      <div class="w-dyn-item" role="listitem">
        <a class="sz-work-item"
           data-work-row
           data-preview-src="{Preview Image URL}"
           data-client-name="{Name}"
           href="{External URL}"
           target="_blank"
           rel="noopener noreferrer">
          <span class="sz-work-name">〔 {Name} ↗ 〕</span>
        </a>
      </div>
      <!-- Repeat per CMS item, sorted by Display Order -->
    </div>
  </div>

  <div class="sz-work-preview" data-work-preview>
    <img src="" alt="" class="sz-work-preview-img" loading="lazy" />
  </div>
</section>
```

### Selector contract
- JS targets: `[data-work]`, `[data-work-row]`, `[data-work-preview]`
- Data attributes: `data-preview-src`, `data-client-name` (CMS-bound)
- Bracket characters 〔 〕 are static template text, not CMS content
- CMS list sorted by `display-order` ascending

---

## CSS Architecture

Classes prefixed `sz-work-` following existing `sz-hero-` pattern in `styles/studio-zissou.css`.

### Token mapping

| CSS Custom Property | Value | Usage |
|---|---|---|
| `--sz-brand-dark` | `#2A2A2A` | Text colour |
| `--sz-bg-light` | `#EBEDE6` | Section background |
| `--sz-border-dark` | `#737373` | Row separator (if used) |
| `--sz-radius-card-image` | `0.875rem` | Preview image border-radius |

### Typography

- **Client names:** PP Rader Thin, 5.625rem (90px), uppercase, line-height 1.2
- **Font features:** `font-feature-settings: 'ordn' 1, 'ss05' 1, 'ss07' 1, 'ss10' 1, 'ss12' 1, 'case' 1`
- **Colour:** `#2A2A2A`

---

## Accessibility

- Client names rendered as `<a>` links — screen readers get link context
- External links: `target="_blank" rel="noopener noreferrer"`
- Arrow (↗) is inline text within the name span — decorative but accessible
- Preview images: `alt` populated by JS from `data-client-name`
- Preview container: `aria-hidden="true"` (decorative, controlled by JS)

---

## Barba Impact

N/A — no Barba transitions configured for Studio Zissou.

---

## Files Modified

| File | Action |
|------|--------|
| `styles/studio-zissou.css` | Append `.sz-work-*` styles |
| `.claude/queue.json` | Status → Ready to Build |

---

## Verification

1. CSS renders correct typography and spacing when applied in Webflow
2. OpenType bracket characters 〔 〕 render with PP Rader stylistic sets
3. `.sz-work-preview` is invisible (opacity: 0) — no flash on load
4. CMS collection matches field schema above
5. External links have correct `target` and `rel` attributes

---

## Acceptance Tests

No test infrastructure — skipped. See `sz-work-clients.md` for test definitions to run once infrastructure exists.
