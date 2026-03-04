---
name: webflow-mcp
description: Use Webflow MCP tools to read site structure, verify selectors, audit pages,
  and manage CMS content. Activates when working with Webflow projects that have the MCP
  connected.
---

## When to use Webflow MCP

- Read the actual DOM structure of a Webflow page
- Verify a CSS selector or class name exists before writing JS that targets it
- Audit a page for accessibility, SEO, or structural issues
- Read CMS collection schemas and items
- Push CMS content updates (requires human approval)
- Check what custom code is already embedded on a page

## Rules

1. **Read before write.** Always read current state before proposing changes.
2. **Never auto-publish.** Always requires explicit human approval.
3. **Designer tools need the companion app.** If a Designer API call fails, tell the
   developer to open the MCP Bridge App before retrying.
4. **Data API tools work without the companion app.**
5. **Read CLAUDE.md first.** Contains site ID, staging URL, and known gotchas.
6. **Prefer official Webflow skills.** `site-audit`, `link-checker`, `bulk-cms-update`
   are maintained by Webflow — use them rather than reimplementing the same logic.

## Selector verification pattern

1. Use `element_snapshot_tool` with site name/ID and page name/ID
2. Confirm every target class/attribute exists
3. If missing, flag and stop — do not assume it will appear at runtime
4. Document verified selectors in CLAUDE.md under "## Known selectors"
