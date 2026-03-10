---
name: webflow-clipboard
description: Guides the agent through the @webflow/XscpData clipboard format — JSON schema, node types, CSS longhand rules, breakpoint variants, and validation rules. Activates when generating or validating Webflow clipboard JSON for paste into the Designer.
---

<objective>
Generate valid `@webflow/XscpData` clipboard JSON for pasting into the Webflow Designer — with correct node hierarchy, style definitions, CSS longhand, breakpoint variants, and UUID management.
</objective>

<quick_start>
Top-level schema:
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

Clipboard write (MIME type `application/json`):
```javascript
const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
await navigator.clipboard.write([new ClipboardItem({ 'application/json': blob })]);
```

Fallback console one-liner:
```javascript
copy(JSON.parse('PASTE_JSON_HERE'))
```
Run in the Webflow Designer's browser console, then Cmd+V.
</quick_start>

<common_patterns>
Node schema:
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

Node fields:
| Field | Type | Notes |
|-------|------|-------|
| `_id` | UUID (hex, hyphenated) | Unique within payload |
| `type` | string | Webflow element type |
| `tag` | string | Lowercase HTML tag |
| `classes` | string[] | Style `_id` references |
| `children` | string[] | Child node `_id` references, in order |
| `data.text` | boolean | `true` for text-content nodes |
| `data.tag` | string | Echoes the `tag` field |
| `data.attr` | object | HTML attributes: `{ "id": "" }` |
| `data.xattr` | array | Custom attributes: `[{ "name": "data-foo", "value": "bar" }]` |
| `data.grid` | object | On Section nodes: `{ "type": "section" }` |
| `data.link` | object | On Link/Button: `{ "mode": "external", "url": "...", "target": "_blank" }` |

Text content nodes (child of Heading/Paragraph):
```json
{
  "_id": "text-node-uuid",
  "text": true,
  "v": "Your heading text here"
}
```

Node type reference:
- Layout: `Block`, `Section`, `DivBlock`, `Grid`, `HFlex`, `VFlex`, `QuickStack`, `Row`, `BlockContainer`
- Typography: `Heading`, `Paragraph`, `TextBlock`, `RichText`, `Blockquote`, `List`, `ListItem`
- Navigation: `Link`, `LinkBlock`, `TextLink`, `Button`, `NavbarWrapper`, `DropdownWrapper`, `TabsWrapper`, `SliderWrapper`, `LightboxWrapper`
- Media: `Image`, `Video`, `YouTubeVideo`, `BackgroundVideoWrapper`, `HtmlEmbed`, `MapWidget`
- Forms: `FormForm`, `FormTextInput`, `FormTextarea`, `FormSelect`, `FormCheckboxInput`, `FormRadioInput`, `FormButton`, `FormBlockLabel`

Style schema:
```json
{
  "_id": "168229c1-c77d-8cc0-d4e3-560b140e63a4",
  "fake": false,
  "type": "class",
  "name": "styled-div",
  "namespace": "",
  "comb": "",
  "styleLess": "padding-top: 24px; padding-right: 24px; padding-bottom: 24px; padding-left: 24px;",
  "variants": {},
  "children": [],
  "createdBy": "58d5355f0eb8f1ed05a61b76",
  "origin": null,
  "selector": null
}
```

Combo classes — `comb` is `"&"` for combo classes. Base class lists combo in `children` array, both appear in node's `classes` array.

Breakpoint variant keys:
| Key | Breakpoint | Width |
|-----|-----------|-------|
| `xxl` | Extra-extra-large | 2560px+ |
| `xl` | Extra-large | 1920px |
| `large` | Large desktop | 1440px |
| `main` | Base desktop | 1280px (default) |
| `medium` | Tablet | <=991px |
| `small` | Mobile landscape | <=767px |
| `tiny` | Mobile portrait | <=479px |

Base styles go in `styleLess`. Only overrides go in `variants`:
```json
"variants": {
  "medium": { "styleLess": "padding-top: 3rem; padding-bottom: 3rem;" },
  "small": { "styleLess": "flex-direction: column;" }
}
```

Pseudo-state keys: `hover`, `active`, `focus`, `focus-visible`, `visited`, `placeholder`, `before`, `after`, `first-child`, `last-child`

Client First integration:
- All classes need `styles` entries — including utility classes
- Known CSS: `container-large`: `"width: 100%; max-width: 80rem; margin-right: auto; margin-left: auto;"`
- Custom component classes use Client First naming: lowercase-hyphenated, descriptive
</common_patterns>

<anti_patterns>
CSS `styleLess` must use LONGHAND ONLY. Never use these shorthands:
```
margin, padding, border, border-top, border-right, border-bottom, border-left,
border-radius, background, font, list-style, transition, animation,
outline, overflow, gap, grid-template, grid-area, flex, flex-flow, place-items,
place-content, place-self, columns, column-rule, text-decoration, inset
```

Longhand equivalents:
| Shorthand | Longhand |
|-----------|----------|
| `margin: 0` | `margin-top: 0; margin-right: 0; margin-bottom: 0; margin-left: 0;` |
| `padding: 1rem 2rem` | `padding-top: 1rem; padding-right: 2rem; padding-bottom: 1rem; padding-left: 2rem;` |
| `border: 1px solid #000` | `border-top-style: solid; border-top-width: 1px; border-top-color: #000;` (repeat for each side) |
| `border-radius: 8px` | `border-top-left-radius: 8px; border-top-right-radius: 8px; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;` |
| `overflow: hidden` | `overflow-x: hidden; overflow-y: hidden;` |
| `gap: 1rem` | `column-gap: 1rem; row-gap: 1rem;` |

Color format: Webflow uses `hsla(h, s%, l%, a)` for managed colors. Hex is acceptable for manually specified colors.
</anti_patterns>

<validation>
Validator rules:
1. `type` must be `"@webflow/XscpData"`
2. `payload.nodes` must be a non-empty array
3. Every `_id` in any `children` array must exist as a node
4. Every UUID in a node's `classes` must exist in `styles`
5. No shorthand CSS properties in any `styleLess` string
6. All `_id` values must be unique across the payload
7. Every node must have a valid `type` from the known type list
8. `payload.styles`, `payload.assets`, `payload.ix1` must be arrays
9. `payload.ix2` must be an object with `interactions`, `events`, `actionLists` arrays
</validation>

<success_criteria>
- JSON validates against all 9 validator rules
- All `styleLess` values use longhand CSS only
- Every class referenced in nodes has a matching style entry
- UUIDs are unique and freshly generated (not reused from previous pastes)
- Paste into Webflow Designer creates the expected element structure
- ~10,000 char limit respected for inline clipboard JSON
</success_criteria>
