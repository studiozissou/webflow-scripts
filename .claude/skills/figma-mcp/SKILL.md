---
name: figma-mcp
description: Use Figma MCP tools to read design files, extract tokens, capture screenshots,
  and retrieve component metadata. Activates when working with Figma files during
  design-to-code workflows.
---

## When to use Figma MCP

- Read the structure and layout of a Figma file or frame
- Extract design tokens (colours, text styles, radii, shadows, variables)
- Capture screenshots of components, sections, or full pages for reference
- Retrieve component metadata and Code Connect mappings
- Verify design specs before writing CSS or animation code
- Support `/figma-audit` and `/component-plan` workflows

## Tools

| Tool | Purpose | When to use |
|---|---|---|
| `get_design_context` | Structured representation of a Figma selection — layout, styles, spacing, typography | Primary tool. Start here for any frame or component. |
| `get_metadata` | Simplified XML of layer IDs, names, types, positions, sizes | When `get_design_context` response is truncated or too large. Get the map, then re-fetch specific nodes. |
| `get_screenshot` | Screenshot of the current Figma selection | Always capture alongside `get_design_context` for visual reference. Save to `.claude/design/references/`. |
| `get_variable_defs` | Variables and styles used in the selection — colour, spacing, typography tokens | Use during `/figma-audit` Step 1 for token extraction. |
| `get_code_connect_map` | Mapping between Figma node IDs and codebase components | Use when checking if a Figma component already has a code counterpart. |
| `generate_figma_design` | Push a web page or live UI back into Figma as design layers | Use only when explicitly asked. Never auto-push. |
| `generate_diagram` | Generate a diagram in Figma from a prompt | Use only when explicitly asked. |

## Rules

1. **Read before extract.** Always run `get_design_context` or `get_metadata` before
   extracting tokens or making assumptions about layout.
2. **Never auto-push designs.** `generate_figma_design` requires explicit human approval
   every time.
3. **Screenshot everything.** When documenting a component, always capture a screenshot
   alongside the structured data. Visual reference prevents misinterpretation.
4. **Respect truncation.** If `get_design_context` is truncated, switch to `get_metadata`
   for the overview, then re-fetch individual nodes.
5. **Read CLAUDE.md and client.md first.** Contains Figma file URL, project context,
   and known design decisions.
6. **Token naming follows project conventions.** All extracted tokens must be converted
   to kebab-case per `/figma-audit` rules. Record both original Figma name and converted name.
7. **Do not resolve ambiguities.** During extraction, flag ambiguities in `figma-flags.md`
   but do not make design decisions — that happens in `/component-plan`.

## Recommended workflow

```
1. get_design_context  → understand the frame structure
2. get_screenshot      → capture visual reference
3. get_variable_defs   → extract design tokens
4. get_metadata        → (if needed) get node map for large files
5. get_code_connect_map → (if needed) check existing code mappings
```

## Integration with commands

| Command | How Figma MCP is used |
|---|---|
| `/figma-audit` | Primary consumer — extracts tokens, screenshots, interaction specs |
| `/component-plan` | References Figma data to identify components and resolve flags |
| `/style-guide` | Uses extracted tokens to extend Webflow style guide |
| `/webflow-connect` | Maps `figma-tokens.json` entries to Webflow variables |

## Authentication

Figma MCP uses OAuth. On first use, Claude Code will prompt you to authenticate
via your browser. The token persists at user scope — no need to re-auth per project.

If authentication fails or expires, run `/mcp` in Claude Code, select `figma`,
and re-authenticate.
