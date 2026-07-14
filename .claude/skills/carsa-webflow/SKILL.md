---
name: carsa-webflow
description: >
  Carsa-specific overrides for `/client-build --client carsa`. Loaded on top of
  the generic context package (tokens, classes, site config, workflows, brand
  voice). Contains rules and references that are unique to the Carsa site and
  cannot be expressed in the generic files.
---

# Carsa Webflow — Override Skill

> Client-specific overrides for `/client-build --client carsa`.
> Generic context (tokens, classes, site config, brand voice) lives in
> `projects/carsa/.claude/` — this skill adds Carsa-only rules on top.
> See `.claude/specs/generic-client-build-workflow.md` for the full architecture.

## Context package (do not duplicate here)

- Site config: `projects/carsa/.claude/build/site-config.json`
- Design tokens: `projects/carsa/.claude/design/figma-tokens.json`
- Class reference: `projects/carsa/.claude/build/class-reference.md`
- Build workflows: `projects/carsa/.claude/build/workflows.md`
- Brand voice: `projects/carsa/.claude/brand/voice.md`
- ICP: `projects/carsa/.claude/brand/icp.md`
- Design state: `projects/carsa/.claude/brand/design-state.md`
- Design laws: `projects/carsa/.claude/build/design-laws.md`

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

<!-- ═══════════════════════════════════════════════════════ -->

## Sitewide Components (never duplicate these)

| Component | ID |
|---|---|
| C - Navigation | `df8548a1-8eb2-55a6-6943-6b2e4c5aed83` |
| Cookie Consent Banners | `fef43efa-87bf-8e1d-b168-6cf4fe4d324f` |
| Global Styles | `ab488b17-f25a-fbf8-5f54-4a3955eb57e5` |

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

## External Repo Delivery

Production-ready scripts are delivered via PR to the shared repo:
`focalstrategy/carsa-website-support` (cloned at `~/carsa-website-support/`).

See `projects/carsa/.claude/client.md` §10 for the full workflow. Key rules:
- Develop and test here in `webflow-scripts` first
- Feature branch in the external repo, PR to `main`
- All deliverables go in the `webflow/` folder at the repo root
- Organise by type inside `webflow/` (e.g. `webflow/schema/`, `webflow/scripts/`)
- Do NOT put files in their `apps/` or `core/` folders — those are for their React/SST code
- Never push `.claude/` docs, specs, or research to the external repo
- Their stack is TypeScript/React — our vanilla JS scripts won't match their
  lint/format rules. That's expected and fine; our code lives in a separate folder
- Dev contact on their side: Grant

<!-- ═══════════════════════════════════════════════════════ -->

## Slack Reporting

After every build, share the summary with the dev team.

**If Slack MCP is connected** (check with a test call on first use, cache the result):
- Ask: "Want me to post this build summary to #carsa-dev?"
- If approved, post via Slack MCP with structured summary (date, page, what was built, verified status)

**If Slack MCP is not connected or user declines:**
- Output a pre-formatted Slack message block:
  "Copy this and paste it in #carsa-dev so the team can review:"
- Include: date, page, what was built, new styles/components, verified status
