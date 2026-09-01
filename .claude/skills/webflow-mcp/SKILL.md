---
name: webflow-mcp
description: Guides the agent through using Webflow MCP tools to read site structure, verify selectors, audit pages, and manage CMS content. Activates when working with Webflow projects that have the MCP connected.
---

<objective>
Use Webflow MCP tools to read the actual DOM structure, verify CSS selectors, audit pages, and manage CMS content — always reading before writing and requiring human approval for changes.
</objective>

<quick_start>
When to use Webflow MCP:
- Read the actual DOM structure of a Webflow page
- Verify a CSS selector or class name exists before writing JS that targets it
- Audit a page for accessibility, SEO, or structural issues
- Read CMS collection schemas and items
- Push CMS content updates (requires human approval)
- Check what custom code is already embedded on a page
</quick_start>

<workflow>
Rules:
1. Read before write. Always read current state before proposing changes.
2. Never auto-publish. Always requires explicit human approval.
3. Designer tools need the companion app. If a Designer API call fails, tell the developer to open the MCP Bridge App before retrying.
4. Data API tools work without the companion app.
5. Read CLAUDE.md first. Contains site ID, staging URL, and known gotchas.
6. Prefer official Webflow skills. `site-audit`, `link-checker`, `bulk-cms-update` are maintained by Webflow — use them rather than reimplementing the same logic.

Selector verification pattern:
1. Use `element_snapshot_tool` with site name/ID and page name/ID
2. Confirm every target class/attribute exists
3. If missing, flag and stop — do not assume it will appear at runtime
4. Document verified selectors in CLAUDE.md under "Known selectors"
</workflow>

<success_criteria>
- Every selector verified via `element_snapshot_tool` before use in JS
- Missing selectors flagged immediately (not assumed)
- CMS changes require explicit human approval before publishing
- Verified selectors documented in project CLAUDE.md
- Designer API failures prompt user to open MCP Bridge App
</success_criteria>

<v2_gotchas>
Learned the hard way on Coconut, Aug 2026 (MCP v2.0.1). Several of these fail
*silently* — the call returns success and does nothing.

**Writes that lie**
- `data_element_builder` accepts `styles`, `text` and `attributes` and **silently
  drops all three**. You get an unclassed element carrying Webflow's stock
  placeholder ("This is some text inside of a div block.", and for RichText a
  full H1–H6 + lorem + list block). Use **`data_whtml_builder`** instead: it
  takes raw HTML and applies existing classes correctly. Omit Webflow's own
  `w-inline-block` / `w-richtext` — Webflow adds those itself.
- `update_page_settings` accepts `jsonLdSchema` (typed as a **string**, not an
  object), returns a normal success-shaped page object, and **writes nothing**.
  `lastUpdated` does not move. `bulk_update_pages_schema_markup` at least fails
  honestly with `403 insufficient_permissions`.
- **Always re-read after a write.** `query_pages_schema_markup` /
  `list_collection_items` are the only proof. Never trust the return value.

**Writes that behave**
- `update_collection_items` is a genuine PATCH: unlisted fields survive. Verified
  by sending only one multi-reference field and seeing SEO, images, colours and
  switches come back intact. Still read-modify-write, and assert array length.
- `set_text` must target the **String child**, not the parent div. Targeting
  `div._25-collapse-title` returns "This element doesn't support text"; its
  String child works.

**Schemas are inconsistent — expect to probe**
Param names vary per tool: `siteId` vs `site_id`, `collection_id` vs `siteId`,
`id` vs `element_id`, `pages: [{id}]` not `page_ids`. `create_collection_items`
wants `request.fieldData` as an **array**. Fastest way in is to send a
deliberately wrong shape and read the Zod union error, which enumerates every
valid action and key. Validation runs before execution, so a malformed call
mutates nothing — it's a safe probe.

**Operational**
- `get_all_elements` is huge (150–190KB) and 429s readily on `GET /v2/assets`.
  Roughly every other call rate-limits; pace ~2 min between them. The big output
  lands in a file, so parsing it locally is cheap — only the error line hits
  context.
- Designer tools need the companion app open **and the tab foregrounded**.
- Style names in the Designer are human-readable and can contain **trailing
  non-breaking spaces** (`"25 Collapse Trigger "`). Copy them verbatim.

**Don't infer page architecture from URL patterns**
A CMS template can carry two alternative sections and switch on a field. On
Coconut, `/features/*` renders a `DynamoList` bound to a multi-reference for
most items, but a *static* section for the one item with `new-layout: true` —
so its multi-reference rendered nowhere. Confirm where a page actually reads
its content from before writing to it, and diff a sibling item to check a
template edit cannot leak.
</v2_gotchas>
