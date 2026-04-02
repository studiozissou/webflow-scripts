---
name: carsa-webflow
description: >
  Guardrails, workflow, and reference for building on the Carsa website via
  Webflow MCP. Covers Client First conventions, component reuse, the build
  pipeline (plan → confirm → build → log → verify → report), MCP fallback,
  and Slack reporting. Trigger this skill whenever someone asks to edit,
  update, add to, or change anything on the Carsa website through Webflow —
  including page content, components, CMS templates, styles, forms, search
  filters, or SEO settings. Also trigger when someone mentions "Webflow",
  "the website", "carsa.co.uk", "landing page", "VDP", "search page",
  "home page", or any request that will result in Webflow MCP tool calls
  that modify site content or structure. If you're about to call any Webflow
  MCP tool that writes or updates (not just reads), consult this skill first —
  even if the change seems small.
---

<objective>
Enable safe, consistent building on the Carsa Webflow site. Every change
follows Client First conventions, reuses existing components where possible,
logs what was built for weekly review, and presents a verification checklist
so the builder can confirm quality before sharing with the dev team.
</objective>

<quick_start>
Five rules before you touch anything:

1. **Read the page first** — `element_tool > get_all_elements` to understand what's already there.
2. **Check for existing components** — `de_component_tool > get_all_components` before building from scratch.
3. **Follow core structure** — Section > padding DivBlock > container DivBlock > content. No shortcuts.
4. **Use variables, not hardcoded values** — colours, spacing, and typography all use Webflow variables.
5. **Log and verify** — every build gets a log entry and a verification checklist.

Site ID: `68348ea61096b37caacd2f95`
</quick_start>

<!-- ═══════════════════════════════════════════════════════ -->

## ABSOLUTE RULE: No Code Embeds

**NEVER** create HTML Embed elements, Custom Code blocks, or inline `<script>` tags.
NEVER use `data_scripts_tool > add_inline_site_script`. NEVER use `element_builder`
with type `DOM` for structural layout.

Why: embeds inline their own styles (duplicating the stylesheet, hurting Core Web
Vitals), drift from the design system, are invisible in the Designer, and break
the component model. If something feels like it needs custom code, tell the user
it needs developer involvement.

If you encounter an existing embed while editing, flag it:
"This section uses a code embed rather than native components. It should be rebuilt
as a proper Webflow component. Want me to note this for the team?"

Only permitted `DOM` usage: semantic inline elements like `<span>` or `<code>` inside text nodes.

<!-- ═══════════════════════════════════════════════════════ -->

## Build Pipeline

Every build follows this sequence. Do not skip steps.

### Step 1 — PLAN

Ask the user what they want to build and on which page. Then:

1. **Inspect the target page** — `element_tool > get_all_elements` (with `include_style_properties: false`).
2. **Search for existing components** — `de_component_tool > get_all_components`. If a match exists, use it (skip to Step 2 with "insert component" approach).
3. **Check the All Components Template page** — call `de_page_tool > get_all_pages`, find the page with kind `staticTemplate` whose name matches "All Components" or similar. Switch to it with `de_page_tool > switch_page` and snapshot with `element_snapshot_tool` to see all available patterns. If the page ID is already cached in the build log, use the cached ID.
4. **Check the Style Guide** — switch to page ID `68348ea61096b37caacd2f9a` (path: `/style-guide`) and snapshot for visual reference.
5. **Present the plan** — describe what you'll build, which components or classes you'll use, and where it'll go. Ask:
   - "Does this match what you had in mind?"
   - "Should this be a reusable component, or a one-off?"

Wait for user approval before proceeding.

### Step 2 — CONFIRM

Describe the specific changes:
- Which elements will be created or modified
- Which classes will be applied
- Which component will be inserted (if reusing)
- Any new styles that need creating

Small, targeted edits. Don't restructure sections or swap components unless specifically asked.

### Step 3 — BUILD

Execute via Webflow MCP. Follow the MCP Fallback Pipeline below if MCP fails.

For **component insertion**: see "How to Insert a Component" in `references/workflows.md`.
For **building from scratch**: see "How to Build Elements" in `references/workflows.md`.

### Step 4 — LOG

After building, write an entry to the build log. See "Build Log" section below.

### Step 5 — VERIFY

Present the dynamic test checklist to the user. See "Verification Checklist" section below.

### Step 6 — REPORT

Share the build summary with the dev team:

**If Slack MCP is connected** (check with a test call on first use, cache the result):
- Ask: "Want me to post this build summary to #carsa-dev?"
- If approved, post via Slack MCP with structured summary (date, page, what was built, verified status)

**If Slack MCP is not connected or user declines:**
- Output a pre-formatted Slack message block:
  "Copy this and paste it in #carsa-dev so the team can review:"
- Include: date, page, what was built, new styles/components, verified status

<!-- ═══════════════════════════════════════════════════════ -->

## MCP Fallback Pipeline

Webflow MCP can hang. When it does:

```
Attempt 1: Direct MCP build (normal path)
    ↓ fails or hangs (30s timeout)
Attempt 2: Retry once — ping with de_page_tool > get_all_pages as health check
    ↓ fails or hangs
Fallback: HTML output mode
```

**HTML output mode:**
1. Generate clean HTML + CSS using only documented Client First class names
2. Include `data-analytics-event` attributes on interactive elements
3. Add HTML comments marking component boundaries
4. Generate a companion `.css` file ONLY for new custom classes (not utility classes)
5. Tell the user:
   "MCP is unavailable. I've generated the HTML. You can:
   (a) Copy this into Webflow using an HTML-to-Webflow converter
   (b) Wait and retry later when MCP is back
   After importing, we'll need to clean up any duplicate classes."
6. If using a converter: run a cleanup pass afterward to deduplicate classes and verify Client First compliance

<!-- ═══════════════════════════════════════════════════════ -->

## Build Log

Every build gets logged to a JSON file that the dev team reviews weekly.

**Location:** The build log lives wherever the client's Claude stores files — typically `.claude/logs/carsa-build-log.json` or the current working directory.

**Entry format:**
```json
{
  "id": "build-001",
  "date": "2026-04-01",
  "page": "/cars",
  "pageId": "abc123",
  "action": "insert_component | build_element | update_content | add_form",
  "componentName": "C - CTA",
  "componentId": "xyz789",
  "overrides": { "Heading": "Find Your Next Car" },
  "elementTypes": ["Section", "DivBlock", "Heading", "Button"],
  "newElements": 0,
  "newStyles": 0,
  "newComponents": 0,
  "verified": true,
  "sharedToSlack": true,
  "slackMethod": "mcp | copy-paste | skipped",
  "notes": "Added CTA below search results grid"
}
```

Auto-increment the `id` from the last entry. Set `date` to today.

**Weekly review** (`/carsa-build --review`):
- Total builds this week
- New components created (flagged for design review)
- New styles created (flagged for Client First compliance)
- Pages modified
- Unverified builds (verification was skipped)
- Unshared builds (not posted to Slack)

<!-- ═══════════════════════════════════════════════════════ -->

## Verification Checklist

After every build, present a manual test checklist. The checklist has a **fixed core** plus **context-aware extras** based on what was built.

### Core (always shown)

```
## Verify Your Build

Open the page in your browser and check at each breakpoint:

### Desktop (resize browser to full width)
- [ ] New section/component visible and positioned correctly
- [ ] Text readable, no overflow or cut-off
- [ ] Links/buttons go to the right place

### Tablet (resize to ~768px wide, or use Chrome DevTools device toolbar)
- [ ] Layout adapts — no horizontal scrollbar
- [ ] Text still readable

### Mobile (resize to ~390px wide)
- [ ] Content fits, no horizontal scroll
- [ ] Touch targets big enough to tap
- [ ] Nothing hidden that should be visible (or vice versa)

### Content
- [ ] No placeholder or dummy text left
- [ ] Images have alt text (hover image in Webflow to check)
- [ ] Spelling and grammar correct

### Safari (optional but recommended)
- [ ] Open the page in Safari — any layout differences?
- [ ] If iOS: check on actual phone if possible
```

### Context-aware extras

Append these based on the build log entry's `action` and `elementTypes`:

| If built... | Add these checks |
|-------------|-----------------|
| Form | `- [ ] Form submits successfully (test with dummy data)` / `- [ ] Error states show correctly` / `- [ ] Labels present (even if visually hidden)` |
| CTA / button | `- [ ] data-analytics-event attribute present (check in Webflow element settings > Custom attributes)` / `- [ ] Hover state looks correct` |
| Image / video | `- [ ] Image loads (not broken placeholder)` / `- [ ] Alt text describes the image (not "image" or blank)` |
| CMS-bound content | `- [ ] Dynamic content pulls through correctly` / `- [ ] Empty state handled (what if there are 0 items?)` |
| Component instance | `- [ ] Component still connected (blue icon in Webflow, not green detached)` / `- [ ] Only overrides used, no internal edits` |
| Navigation / links | `- [ ] All links tested on live preview` / `- [ ] External links open in new tab` |
| Section with background | `- [ ] Text contrast sufficient on background` / `- [ ] Background colour uses a Webflow variable, not hardcoded` |

<!-- ═══════════════════════════════════════════════════════ -->

<reference_guides>

## Client First Fundamentals

For the full class reference, SEO templates, Finsweet attributes, and analytics patterns,
read `references/class-reference.md` and `references/workflows.md`.

### Core Structure (Required Page Layering)

Every section must follow this hierarchy:

```
page-wrapper
  main-wrapper
    section_[identifier]
      DivBlock [padding-global] [padding-section-[size]]
        DivBlock [container-[size]]
          ... content ...
```

- `page-wrapper` — outermost wrapper for all page content
- `main-wrapper` — wraps main content between nav and footer (accessibility)
- `section_[identifier]` — custom class naming the section (e.g. `section_hero`). Underscore = custom class.
- `padding-global` + `padding-section-[size]` — utility classes on a DivBlock inside the section. Sizes: `small`, `medium`, `large`.
- `container-[size]` — max-width container. Sizes: `small`, `medium`, `large`.

Do not skip layers. Do not place content directly in a Section without padding and container wrappers.

### Custom Classes vs Utility Classes

The underscore `_` is the dividing line:
- **Custom classes use underscores** — for specific components/pages: `header_content`, `form_label`, `section_hero`
- **Utility classes have NO underscores** — for reusable properties: `text-color-primary`, `padding-global`, `heading-style-h2`

### Combo Classes and `is-` Prefix

Variants stack on a base class using `is-`:
- `button` + `is-secondary`, `button` + `is-yellow`
- `section_header` + `is-home`
- `padding-section-large` + `is-no-top`

In `set_style`, pass both: `{"style_names": ["button", "is-yellow"]}`.

Keep class stacks shallow: 1 base + optionally 1 `is-` combo. If you need 4+ classes, create a custom class instead.

### Rem Units

All sizing in rem. 16px = 1rem. When creating styles with `style_tool`, use rem, not px.

### Webflow Variables (Two-Tier System)

The site uses CSS variables via variable collections. The system has two tiers:

**Primitives** — raw values:
- `brand-*` (e.g. `brand-red`, `brand-blue-dark`) — actual hex colours
- `neutral-*` (e.g. `neutral-100` through `neutral-900`) — grey scale

**Semantic** — reference primitives:
- `background-color-*` (`primary`, `secondary`, `tertiary`, `alternate`) — section backgrounds
- `text-color-*` (`primary`, `secondary`, `tertiary`, `alternate`) — text colours
- `font-*` (`primary`, `secondary`) — font families

Before creating any style:
1. Check existing variables: `variable_tool > get_variable_collections` then `variable_tool > get_variables`
2. Use `variable_as_value` (not hardcoded hex/rem) for any colour or spacing that has a variable
3. Never hardcode brand colours — always use the variable reference
4. If creating a NEW variable: use the two-tier naming. Primitives for raw values, semantics for usage.

### Typography

Prefer **no class** on text elements when HTML tag defaults (H1-H6, body) suffice. Only add utility classes to override defaults.

### Responsive Breakpoints

| Breakpoint | ID | Applies to |
|---|---|---|
| Extra Extra Large | `xxl` | >= 1920px |
| Extra Large | `xl` | >= 1440px |
| Large | `large` | >= 1280px |
| **Main (desktop)** | `main` | **All devices (default)** |
| Tablet | `medium` | <= 991px |
| Mobile Landscape | `small` | <= 767px |
| Mobile Portrait | `tiny` | <= 478px |

Desktop-first: main styles cascade everywhere. After building, always check `medium`, `small`, and `tiny` using `element_snapshot_tool`.

### Layout Utilities

These utility classes are available and should be used instead of custom styles:

| Prefix | Values |
|--------|--------|
| `hide-` | `mobile-portrait`, `mobile-landscape`, `tablet`, `desktop` |
| `max-width-` | `full`, `large`, `medium`, `small`, `xsmall`, `xxsmall` |
| `overflow-` | `hidden`, `auto`, `visible` |
| `z-index-` | `1`, `2`, `3` |
| `background-color-` | `primary`, `secondary`, `tertiary`, `alternate` |
| `align-center` | Centers block element |
| `pointer-events-` | `none`, `auto` |
| `aspect-ratio-` | `1/1`, `16/9`, `4/3`, `3/2` |

</reference_guides>

<success_criteria>
Every build should meet ALL of these:

- [ ] Core structure followed: Section > padding wrapper > container > content
- [ ] Existing component reused if one matches (checked via get_all_components AND template page)
- [ ] No code embeds created
- [ ] All colours and spacing use Webflow variables (no hardcoded hex)
- [ ] Class naming follows Client First (underscore = custom, no underscore = utility)
- [ ] Class stacks are shallow (max 1 base + 1 is- combo)
- [ ] All sizing in rem
- [ ] Interactive elements have `data-analytics-event` attribute
- [ ] Images have meaningful alt text (not `__wf_reserved_inherit`)
- [ ] Mobile checked at `medium`, `small`, and `tiny` breakpoints
- [ ] Build log entry written
- [ ] Verification checklist presented and completed
- [ ] Build summary shared with dev team (Slack or copy-paste)
</success_criteria>

## Anti-Patterns

1. **Code embeds instead of components.** See absolute rule above. Flag to user if found.
2. **Placeholder text left live.** Check every component for default placeholder text.
3. **Classes outside Client First.** No Tailwind, no random classes, no inline styles.
4. **Inconsistent heading hierarchy.** Same level for semantically equivalent elements.
5. **Missing alt text.** `__wf_reserved_inherit` = not set. Fix it.
6. **Duplicated content.** Use components, not copy-paste.
7. **Duplicate promo messaging.** One placement per promotional message — don't repeat the same promo across multiple sections.
8. **Redundant styles.** Check `style_tool > get_styles` before creating.
9. **Editing component internals.** Use `propertyOverrides`, never `set_text` on internal nodes.
10. **Skipping core structure.** Every section needs padding wrapper + container.
11. **Deep stacking.** Max 1-2 classes per element.
12. **Hardcoded colours.** Use Webflow variables, not hex values.
13. **Ignoring mobile.** Check `medium`, `small`, `tiny` breakpoints after building.
14. **Building without planning.** Always run the planning step first.
15. **Skipping the build log.** Every build must be logged for weekly review.

## Component & Page References

Do NOT rely on hardcoded IDs. Look them up dynamically:

- **List all components:** `de_component_tool > get_all_components`
- **Check properties:** `data_components_tool > get_component_properties`
- **Components Page:** `de_page_tool > switch_page` with page ID `688a0ccdc27ff993d907ec83` (path: `/archive/components-page`)
- **Extended library:** Page ID `6847dada6d8dfaa1a672a814`
- **Style Guide:** Page ID `68348ea61096b37caacd2f9a` (path: `/style-guide`)
- **All Components Template:** Discovered dynamically via `de_page_tool > get_all_pages` filtering for `staticTemplate` kind

### Sitewide Components (never duplicate these)

| Component | ID |
|---|---|
| C - Navigation | `df8548a1-8eb2-55a6-6943-6b2e4c5aed83` |
| Cookie Consent Banners | `fef43efa-87bf-8e1d-b168-6cf4fe4d324f` |
| Global Styles | `ab488b17-f25a-fbf8-5f54-4a3955eb57e5` |

## Further Reference

For detailed class lists, SEO templates, Finsweet attributes, analytics patterns, and worked examples:
- Read `references/class-reference.md` — full typography, button, spacing, and accessibility class tables
- Read `references/workflows.md` — step-by-step component insertion and element building workflows with examples
