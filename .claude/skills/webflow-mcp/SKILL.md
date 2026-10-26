---
name: webflow-mcp
description: Guides the agent through using Webflow MCP tools to read site structure, verify selectors, audit pages, and manage CMS content, and picks which of the two Webflow MCP slots (`webflow` or `webflow-2`) sees a client's site. Activates when working with Webflow projects that have the MCP connected, before the first Webflow MCP call for a client, or on a "site cannot be found" error.
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

<slot_routing>
Webflow's OAuth lets one connection see sites in one workspace only, so there are two
general slots: `webflow` (project `.mcp.json`) and `webflow-2` (user scope, works in
worktrees and background jobs). `webflow-2` uses `https://mcp.webflow.com/mcp?slot=2`:
Claude Code hides a server whose URL matches another, and Webflow ignores the query. "Webflow MCP" in any skill or command means whichever
slot sees the site.

1. **Pick the slot before the first Webflow call for a client.** Call
   `data_sites_tool > get_site` with the site ID from the client's `client.md` on
   `webflow`. On "site cannot be found", try `webflow-2`. Use whichever answers for the
   rest of the session. Note the slot once in your reply so later turns don't re-probe.
2. **Neither answers:** say which client and which workspace (`Workspace ID` in
   `client.md`) is missing, and ask Will to re-authorise one slot in `/mcp`. Never
   re-authorise mid-task without saying which client loses access: re-authorising a slot
   drops the workspace it saw before (the 26 Oct Rolfing run lost its site this way).
3. **Never call `webflow_guide_tool`.** It returns ~100k characters (~25k tokens) and
   each slot asks for it once. Pass `session_id: "start"` on the first real call to a
   slot and keep the issued `ses_` ID for that slot. When a usage detail is unclear,
   grep the cached guide instead of reading it whole:
   `grep -n -i -A20 '<topic>' ~/webflow-internal/.claude/reference/webflow-mcp-guide.txt`
4. **Refresh the cache when the version changes.** The cache covers Webflow MCP 2.2.0.
   If a server response reports a different "Webflow MCP version", tell Will the cache
   is stale; refreshing it means one deliberate `webflow_guide_tool` call, saved over the
   cached file with the `session_id` header lines removed so it starts with
   "Webflow MCP version".
5. **New client:** onboarding uses `webflow` by default. Record the site's
   `Workspace ID` in `client.md` (from `data_sites_tool > list_sites`, summary mode).
</slot_routing>

<workflow>
Rules:
1. Read before write. Always read current state before proposing changes.
2. Never auto-publish. Always requires explicit human approval. Publishing ships **everything** pending, including other sessions' Designer edits: compare `lastUpdated` with `lastPublished` (`get_site`) first and say what else will go out.
3. Designer tools need the companion app. If a Designer API call fails, tell the developer to open the MCP Bridge App before retrying.
4. Data API tools work without the companion app.
5. Read CLAUDE.md first. Contains site ID, staging URL, and known gotchas.
6. Pre-flight before planning: `get_site` must succeed and, for Designer work, the Designer tab must be foregrounded. Spell domains and emails from `get_site` → `customDomains`, never from notes.
7. Prefer official Webflow skills. `site-audit`, `link-checker`, `bulk-cms-update` are maintained by Webflow — use them rather than reimplementing the same logic.

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
Learned the hard way on client builds, Aug–Oct 2026 (MCP v2.0.1). Several of these fail
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

**`data_whtml_builder` loses things — check after every insert**
- `target="_blank"` and link settings are dropped. Re-apply them after the insert, then re-read.
- A nested `<section>` comes in without its classes. Create the class (and any combo class) first, then insert.
- Passing CSS for a class that already exists creates a duplicate `<name>-1` class. Send classes by name only; style existing classes separately.
- `var()` inside a gradient is frozen to its current value. Set gradients that use variables in the Designer.
- An empty boolean `open` attribute is dropped. Write `open="open"`.

**Links**
- Use native link settings (Link → Page, anchors Page → Section). Never a custom `href` attribute or a URL-typed `/path`: only Page links are localized, so URL links on a secondary locale point back at the primary.

**Binding limits**
- A `<span>` can't bind to a CMS field. Bind a text element (paragraph, heading, text block) instead.
- Option fields can't drive conditional visibility. Use a Switch field for show/hide.

**Localization**
- `get_page_content` on a secondary locale lists only the nodes that have overrides. Write locale content against the **primary** node IDs.
- Get every link right before translating. Translation stores a per-locale link override, and MCP can't reset it; that's a Designer job (switch locale → select link → reset).
- Links inside translated rich text never inherit the primary link. Give them the locale path directly (`/en/page`).
- Re-fetch the live secondary-locale pages after every publish, not just the primary.

**Budget a Designer slot** — MCP can't do these: reset locale link overrides, translate CMS option names (Site settings › Localization), set favicon/webclip.

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
one site, `/features/*` renders a `DynamoList` bound to a multi-reference for
most items, but a *static* section for the one item with `new-layout: true` —
so its multi-reference rendered nowhere. Confirm where a page actually reads
its content from before writing to it, and diff a sibling item to check a
template edit cannot leak.
</v2_gotchas>
