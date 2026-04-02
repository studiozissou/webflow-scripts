# Carsa — Client First Class Reference

## Typography

**Heading styles** (combo classes on HTML heading tags):
`heading-style-h1` through `heading-style-h6`

**Text utilities:**
| Prefix | Values |
|--------|--------|
| `text-size-` | `tiny`, `small`, `regular`, `medium`, `large` |
| `text-weight-` | `light`, `normal`, `medium`, `semibold`, `bold`, `xbold` |
| `text-style-` | `italic`, `uppercase`, `strikethrough`, `underline`, `nowrap`, `tagline`, `link` |
| `text-align-` | `left`, `center`, `right` |
| `text-color-` | `primary`, `secondary`, `tertiary`, `alternate`, `white` |

## Buttons

| Class combo | Usage |
|-------------|-------|
| `button` | Base button style |
| `button` + `is-secondary` | Secondary variant |
| `button` + `is-alternate` | Alternate variant |
| `button` + `is-yellow` | Yellow CTA variant |
| `button` + `is-small` | Smaller sizing |
| `button` + `is-search-instant` | Instant search button |

## Spacing

| Class | Purpose |
|-------|---------|
| `padding-global` | Site-wide horizontal padding |
| `padding-section-small` | Small vertical section padding |
| `padding-section-medium` | Medium vertical section padding |
| `padding-section-large` | Large vertical section padding |
| `container-small` | Narrow max-width container |
| `container-medium` | Mid-width container |
| `container-large` | Wide max-width container |
| `margin-top` / `margin-right` / `margin-bottom` / `margin-left` | Directional margin |
| `margin-tiny` / `margin-small` / `margin-medium` / `margin-large` / `margin-xlarge` / `margin-xxlarge` | Margin sizing |
| `max-width-small` / `medium` / `large` / `xlarge` | Max-width constraints |

## Accessibility

| Class | Purpose |
|-------|---------|
| `visually-hidden` | Screen reader only — required on form labels with placeholders |

## Live Modifiers

`is-home-hero`, `is-promo-header`, `is-alternate`, `is-small`, `is-facet`, `is-label-help-alternate`

---

## SEO Title Templates (CMS)

Use `{{wf}}` dynamic fields. Never hardcode.

- **VDP:** `Used {{year}} {{colour}} {{make-model-name}} {{trim}} {{doors}}dr | {{fuel-type}} | Carsa`
- **Make:** `Used {{name}} Cars for Sale | Available on Finance | Carsa`
- **Model:** `Used {{make:name}} {{name}} for sale or on finance | Carsa`
- **Fuel type:** `Used {{fuel-type-lowercase}} cars for sale or on finance | Carsa`
- **Location/Promotions:** Dynamic from CMS fields (`seo-title` / `name`)

OG tags mirror SEO meta: `titleCopied: true`, `descriptionCopied: true`.

---

## Finsweet List & Filter (fs-list)

**Field attributes:** `fs-list-field="[field-name]"`, `fs-list-operator="equal"` (exact), `fs-list-operator="greater-equal"` (min), `fs-list-operator="less-equal"` (max)

**UI attributes:** `fs-list-element="clear"`, `tag-value`, `tag-operator`, `tag-operator-less-equal`, `tag-operator-greater-equal`, `facet-count`

**Home page vs search page:** The home hero search is a separate instance with field prefix `e11aebe3_`. Do not mix IDs between pages.

---

## Analytics, CallTracks, Forms

**Analytics:** All interactive elements need `data-analytics-event`. Pattern: `[section]_[action]` in snake_case. Examples: `hero_search-cars-instant`, `open-enquiry-form`, `submit-enquiry-form`, `eligibility-component-cta`.

**CallTracks:** The VDP has `<div class="calltracks_main-number hide">0330 040 1032</div>`. Do not touch — JS replaces it at runtime.

**Forms:** Labels always in DOM (use `visually-hidden` if needed). Helper text: `is-label-help-alternate`. Submit buttons need `data-analytics-event`. Include success + error states. Radio inputs: `radio2_label`.
