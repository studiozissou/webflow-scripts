---
name: webflow-clipboard
description: "@webflow/XscpData clipboard format reference — JSON schema, node types,
  CSS longhand rules, breakpoint variants, and validation rules. Use when generating
  or validating Webflow clipboard JSON for paste into the Designer."
---

## Format Overview

Webflow's internal clipboard format is `@webflow/XscpData` — JSON written to the system clipboard under MIME type `application/json`. When pasted in the Designer, Webflow reads this JSON and creates elements with classes, styles, and interactions.

---

## Top-Level Schema

```json
{
  "type": "@webflow/XscpData",
  "payload": {
    "nodes": [],
    "styles": [],
    "assets": [],
    "ix1": [],
    "ix2": { "interactions": [], "events": [], "actionLists": [] }
  },
  "meta": {
    "unlinkedSymbolCount": 0,
    "droppedLinks": 0,
    "dynBindRemovedCount": 0,
    "dynListBindRemovedCount": 0,
    "paginationRemovedCount": 0,
    "universalBindingsRemovedCount": 0,
    "codeComponentsRemovedCount": 0
  }
}
```

- `type` — Always `"@webflow/XscpData"`
- `payload.nodes` — Element tree
- `payload.styles` — Class definitions
- `payload.assets` — Webflow CDN assets (usually `[]` for generated components)
- `payload.ix1` — Always `[]` (legacy Interactions 1.0)
- `payload.ix2` — Interactions 2.0 (empty for static components)
- `meta` — All counters set to `0` for generated payloads

---

## Node Schema

```json
{
  "_id": "a7cb7db0-e6ac-857c-f1fb-eed5c01819f6",
  "type": "Block",
  "tag": "div",
  "classes": ["168229c1-c77d-8cc0-d4e3-560b140e63a4"],
  "children": [],
  "data": {
    "text": false,
    "tag": "div",
    "devlink": { "runtimeProps": {}, "slot": "" },
    "displayName": "",
    "attr": { "id": "" },
    "xattr": [],
    "search": { "exclude": false },
    "visibility": {
      "conditions": [],
      "keepInHtml": { "tag": "False", "val": {} }
    }
  }
}
```

| Field | Type | Notes |
|-------|------|-------|
| `_id` | UUID (hex, hyphenated) | Unique within payload. Not strictly v4 — Webflow uses random hex. |
| `type` | string | Webflow element type (see table below) |
| `tag` | string | Lowercase HTML tag: `div`, `section`, `h1`, `p`, `img`, `a`, etc. |
| `classes` | string[] | Style `_id` references |
| `children` | string[] | Child node `_id` references, in order |
| `data.text` | boolean | `true` for text-content nodes (Heading, Paragraph have text children) |
| `data.tag` | string | Echoes the `tag` field |
| `data.devlink` | object | Always `{ "runtimeProps": {}, "slot": "" }` |
| `data.displayName` | string | Custom label in Navigator panel, or `""` |
| `data.attr` | object | HTML attributes: `{ "id": "" }` (also `src`, `alt`, `loading` on Image) |
| `data.xattr` | array | Custom attributes: `[{ "name": "data-foo", "value": "bar" }]` |
| `data.search` | object | Always `{ "exclude": false }` |
| `data.visibility` | object | `{ "conditions": [], "keepInHtml": { "tag": "False", "val": {} } }` |
| `data.grid` | object | On Section nodes: `{ "type": "section" }` |
| `data.img` | object | On Image nodes: `{ "id": "asset-id" }` |
| `data.link` | object | On Link/Button: `{ "mode": "external", "url": "...", "target": "_blank" }` |

### Text Content Nodes

For Heading, Paragraph, TextBlock nodes, add inline text via a child node:

```json
{
  "_id": "text-node-uuid",
  "text": true,
  "v": "Your heading text here"
}
```

The parent node's `children` array references this text node's `_id`.

---

## Node Type Reference

### Layout & Structure
`Block` (Div Block), `Section`, `DivBlock`, `Grid`, `HFlex`, `VFlex`, `QuickStack`, `Row`, `BlockContainer`

### Typography
`Heading`, `Paragraph`, `TextBlock`, `RichText`, `Blockquote`, `List`, `ListItem`

### Navigation & Interactive
`Link`, `LinkBlock`, `TextLink`, `Button`, `NavbarWrapper`, `DropdownWrapper`, `TabsWrapper`, `SliderWrapper`, `LightboxWrapper`

### Media
`Image`, `Video`, `YouTubeVideo`, `BackgroundVideoWrapper`, `HtmlEmbed`, `MapWidget`

### Forms
`FormForm`, `FormTextInput`, `FormTextarea`, `FormSelect`, `FormCheckboxInput`, `FormRadioInput`, `FormButton`, `FormBlockLabel`

---

## Style Schema

```json
{
  "_id": "168229c1-c77d-8cc0-d4e3-560b140e63a4",
  "fake": false,
  "type": "class",
  "name": "styled-div",
  "namespace": "",
  "comb": "",
  "styleLess": "padding-top: 24px; padding-right: 24px; padding-bottom: 24px; padding-left: 24px; background-color: hsla(0, 100.00%, 50.00%, 1.00);",
  "variants": {},
  "children": [],
  "createdBy": "58d5355f0eb8f1ed05a61b76",
  "origin": null,
  "selector": null
}
```

| Field | Type | Notes |
|-------|------|-------|
| `_id` | UUID (hex, hyphenated) | Referenced by node `classes` arrays |
| `fake` | boolean | `false` for real classes |
| `type` | string | Always `"class"` |
| `name` | string | Class name as shown in Webflow |
| `namespace` | string | Usually `""` |
| `comb` | string | `""` for base classes, `"&"` for combo classes |
| `styleLess` | string | CSS longhand declarations (see below) |
| `variants` | object | Breakpoint/pseudo-state overrides |
| `children` | array | Combo class `_id` references, or `[]` |
| `createdBy` | string | User ID who created the class (optional for generated payloads) |
| `origin` | null | Always `null` |
| `selector` | null or string | Custom CSS selector for child targeting |

### Combo Classes

The `comb` field is `"&"` for combo classes (not the base class name). The base class lists the combo class in its `children` array, and both appear in the node's `classes` array.

Example: base class `style-1` + combo class `style-2`:
- `style-1`: `"comb": "", "children": ["style-2-uuid"]`
- `style-2`: `"comb": "&", "children": []`
- Node `classes`: `["style-1-uuid", "style-2-uuid"]`

---

## CSS `styleLess` Rules

The `styleLess` string contains CSS declarations in **longhand only**. Each declaration ends with `;`. Trailing semicolon required.

### Shorthand Blocklist (never use these)

```
margin, padding, border, border-top, border-right, border-bottom, border-left,
border-radius, background, font, list-style, transition, animation,
outline, overflow, gap, grid-template, grid-area, flex, flex-flow, place-items,
place-content, place-self, columns, column-rule, text-decoration, inset
```

### Use Longhand Equivalents

| Shorthand | Longhand |
|-----------|----------|
| `margin: 0` | `margin-top: 0; margin-right: 0; margin-bottom: 0; margin-left: 0;` |
| `padding: 1rem 2rem` | `padding-top: 1rem; padding-right: 2rem; padding-bottom: 1rem; padding-left: 2rem;` |
| `border: 1px solid #000` | `border-top-style: solid; border-top-width: 1px; border-top-color: #000;` (repeat for each side) |
| `border-radius: 8px` | `border-top-left-radius: 8px; border-top-right-radius: 8px; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;` |
| `background: #fff` | `background-color: #fff;` |
| `overflow: hidden` | `overflow-x: hidden; overflow-y: hidden;` |
| `gap: 1rem` | `column-gap: 1rem; row-gap: 1rem;` |

### Color Format

Webflow uses `hsla(h, s%, l%, a)` for managed colors. Hex (`#hex`) is acceptable for manually specified colors.

---

## Breakpoint Variant Keys

| Key | Breakpoint | Width |
|-----|-----------|-------|
| `xxl` | Extra-extra-large | 2560px+ |
| `xl` | Extra-large | 1920px |
| `large` | Large desktop | 1440px |
| `main` | Base desktop | 1280px (default) |
| `medium` | Tablet | ≤991px |
| `small` | Mobile landscape | ≤767px |
| `tiny` | Mobile portrait | ≤479px |

Base styles go in `styleLess`. Only overrides go in `variants`:

```json
"variants": {
  "medium": { "styleLess": "padding-top: 3rem; padding-bottom: 3rem;" },
  "small": { "styleLess": "flex-direction: column;" },
  "tiny": { "styleLess": "padding-top: 1.5rem; padding-bottom: 1.5rem;" }
}
```

### Pseudo-State Keys

`hover`, `active`, `focus`, `focus-visible`, `visited`, `placeholder`, `before`, `after`, `first-child`, `last-child`

---

## Client First Integration

When generating elements for a Client First project:

1. **All classes need `styles` entries** — including Client First utility classes. Webflow includes the full class definition (with `styleLess`) when copying, even for project-wide utility classes like `container-large` or `heading-style-h1`.

2. **Utility class CSS values** (from real captures):
   - `container-large`: `"width: 100%; max-width: 80rem; margin-right: auto; margin-left: auto;"`
   - `heading-style-h1`: `"font-size: 3.5rem; line-height: 1.2; font-weight: 700;"` with `variants: { medium: { styleLess: "font-size: 3.25rem;" }, small: { styleLess: "font-size: 2.5rem;" } }`
   - `text-size-regular`: `"font-size: 1rem;"`

3. **Custom component classes** should use Client First naming: lowercase-hyphenated, descriptive (e.g. `pricing-card`, `hero-visual`).

Reference `.claude/skills/client-first/SKILL.md` for the full class inventory.

---

## Validator Rules

1. `type` must be `"@webflow/XscpData"`
2. `payload.nodes` must be a non-empty array
3. Every `_id` in any `children` array must exist as a node
4. Every UUID in a node's `classes` must exist in `styles`
5. No shorthand CSS properties in any `styleLess` string
6. All `_id` values must be unique across the payload
7. Every node must have a valid `type` from the known type list
8. `payload.styles`, `payload.assets`, `payload.ix1` must be arrays
9. `payload.ix2` must be an object with `interactions`, `events`, `actionLists` arrays

---

## Clipboard Write

Write to clipboard with MIME type `application/json`:

```javascript
const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
await navigator.clipboard.write([new ClipboardItem({ 'application/json': blob })]);
```

### Fallback Console One-Liner

```javascript
copy(JSON.parse('PASTE_JSON_HERE'))
```

Run in the Webflow Designer's browser console, then Cmd+V.

---

## Known Limitations

1. **~10,000 char limit** for inline clipboard JSON
2. **Class name collisions** — pasted classes with existing names get suffixed (e.g. `button 2`)
3. **Variables not transferred** — CSS custom property bindings are stripped
4. **Components unlinked** — Symbols/Components are exploded into plain elements
5. **Custom fonts may fallback** — font-family references preserved but need font installed in site
6. **Interactions fragile cross-site** — IX2 targeting specific IDs may break
7. **UUIDs must be fresh** — regenerate all `_id` values for each paste operation
