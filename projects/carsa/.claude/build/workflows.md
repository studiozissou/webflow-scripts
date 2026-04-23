# Build Workflows -- Carsa

## How to Insert a Component

1. **Find it:** `de_component_tool > get_all_components`. Find by name.
2. **Check properties:** `data_components_tool > get_component_properties` with the component ID.
3. **Insert:** `de_component_tool > insert_component_instance` with `parent_element_id`, `component_id`, `creation_position`.
4. **Customise text:** `data_components_tool > update_component_content` with `propertyOverrides`. **Never edit internal nodes directly** -- this detaches the instance.
5. **Verify:** `element_snapshot_tool`. Check for leftover placeholder text.

## How to Build Elements from Scratch

Only after confirming no suitable component exists.

Max 3 nesting levels per `element_builder` call. For deeper structures, call multiple times using the returned ID.

**Supported types:** Container, Section, DivBlock, Heading, TextBlock, Paragraph, Button, TextLink, LinkBlock, Image, DOM

### Workflow

1. Plan the structure following core structure: Section > padding DivBlock > container DivBlock > content
2. Create new styles first if needed (`style_tool > create_style`). Prefer existing classes.
3. Build elements. `set_style` **replaces** all classes -- include every class you want.
4. Set attributes: `data-analytics-event` on CTAs, `alt_text` on images, `fs-list-*` on filters.
5. Verify with `element_snapshot_tool` at multiple breakpoints.

### Matching the Existing Design

The site has a consistent visual language. Before building anything new, study what exists.

**Step 1 -- Visual reference.** Switch to the Style Guide page (ID `68348ea61096b37caacd2f9a`, path: `/style-guide`). Use `element_snapshot_tool` to see typography, colour palette, button styles, spacing rhythm.

**Step 2 -- Find a similar component.** If building a new CTA section, look at existing CTA components first. Use `element_snapshot_tool` for visual reference, then `data_components_tool > get_component_content` for node structure.

**Step 3 -- Mirror the patterns.** Match the structure, class choices, and nesting depth from similar components. If existing CTAs use `heading-style-h2` + `text-size-regular` + `button is-yellow` with `container-medium`, do the same.

**Step 4 -- Check variables.** Use `variable_tool > get_variables` for colour and spacing variables. Apply via `variable_as_value`.

### Worked Example

```
Goal: Add a CTA section.

Step 1 -- Look up components:
  de_component_tool > get_all_components
  --> "C - CTA" exists. Get its properties.
  --> Properties: Heading, Copy, Buttons/Button 1 Text, Buttons/Button 2 Text
  --> USE THE COMPONENT. STOP.
```

If no component existed, element_builder approach:

First call -- Section > padding wrapper > container > heading (3 levels):
```json
{
  "parent_element_id": {"component": "", "element": "<main-wrapper-id>"},
  "creation_position": "append",
  "element_schema": {
    "type": "Section",
    "set_style": {"style_names": ["section_cta"]},
    "children": [{
      "type": "DivBlock",
      "set_style": {"style_names": ["padding-global", "padding-section-medium"]},
      "children": [{
        "type": "DivBlock",
        "set_style": {"style_names": ["container-medium", "text-align-center"]},
        "children": [{
          "type": "Heading",
          "set_heading_level": {"heading_level": 2},
          "set_text": {"text": "Ready to Find Your New Car?"}
        }]
      }]
    }]
  }
}
```

Second call -- add button inside the container:
```json
{
  "parent_element_id": {"component": "", "element": "<container-id>"},
  "creation_position": "append",
  "element_schema": {
    "type": "Button",
    "set_style": {"style_names": ["button"]},
    "set_text": {"text": "Search cars"},
    "set_link": {"link_type": "url", "link": "/cars"},
    "set_attributes": {"attributes": [
      {"name": "data-analytics-event", "value": "cta_search-cars"}
    ]}
  }
}
```

`section_cta` = custom class (underscore). `padding-global`, `container-medium`, `button` = utility classes (no underscore).
