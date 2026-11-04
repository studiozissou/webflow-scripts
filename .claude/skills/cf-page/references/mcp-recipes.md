# MCP recipes for `/cf-page`

Read the section for the step you are on. Shapes come from the cached Webflow MCP guide (2.2.0, `~/webflow-internal/.claude/reference/webflow-mcp-guide.txt`) and past runs. Parameter names vary between tools (`siteId` vs `site_id`, `id` vs `element_id`), so treat every shape below as the known starting point, not a contract.

## Rules that apply to every call

- Pick the slot per the `webflow-mcp` skill before the first call: `data_sites_tool > get_site` on `webflow`, then `webflow-2` on "site cannot be found". Coconut answers on `webflow-2`. Say the slot once in the reply.
- Never call `webflow_guide_tool`. Pass `session_id: "start"` on the first real call to a slot, then reuse the `ses_` ID it returns. Grep the cached guide when a detail is unclear.
- Probe, don't guess. When a shape is unclear, send a deliberately wrong call (for example an unknown `action`). Validation runs before execution, so it mutates nothing, and the Zod union error lists every valid action and key.
- Pace `get_all_elements` at about 2 minutes between calls. It returns 150 to 190 KB and 429s readily on `GET /v2/assets`. The output lands in a file; parse it locally with `page-metrics.js` and keep only the error line in context.
- Designer-backed tools (`data_whtml_builder`, `data_style_tool`, element writes) need the MCP Bridge App open with the Designer tab foregrounded. On a Designer error, ask Will to open it, then retry once.
- Never trust a write's return value. Re-read after every write.

## Step 1: Read (plan-only and build)

1. Site and pending changes:
   ```
   data_sites_tool { action: "get_site", siteId: "<site>", session_id: "start" }
   ```
   Keep `lastUpdated`, `lastPublished`, `customDomains` and the staging subdomain. `lastUpdated` later than `lastPublished` means unpublished Designer edits exist; note them for step 6.
2. Resolve the page:
   ```
   data_pages_tool { action: "list_pages", site_id: "<site>" }
   ```
   Match on `slug` and on the parent folder so `/mtd-software` is not confused with `mtd-software-2`, an `/archive/...` draft, or `/mtd-software/*` children. Refuse when `collectionId` is set (CMS template), when `draft` is true, or when the page is a secondary-locale variant. Save the page ID as `ORIGINAL_PAGE_ID`.
3. Element tree, once:
   ```
   data_element_tool { action: "get_all_elements", siteId: "<site>", pageId: "<ORIGINAL_PAGE_ID>", depth: -1 }
   ```
   Save the response file to `projects/<client>/.claude/cf-page/<slug>/tree-before.json`, then run `node .claude/skills/cf-page/scripts/page-metrics.js <that file>`.
4. Published CSS, once: fetch the staging page HTML (`curl -s https://<staging>/<slug>`), take the `<link rel="stylesheet">` that points at `*.webflow.shared.*.css`, and save it as `published.css` next to the tree. `css-sizes.js` also accepts the URL directly.

Plan-only stops after the map. No other tool below runs in plan-only mode.

## Step 4: Gate

```
node .claude/skills/cf-page/scripts/css-sizes.js published.css --gate --tree tree-before.json
```

Exit 1 prints `FOUNDATION MISSING: …`. Stop and point at task C2. `--tree` counts `page-wrapper` and `main-wrapper` from the element tree, because Webflow leaves unstyled classes out of the published CSS.

## Step 5: Build

### 5a. Duplicate the page

```
data_pages_tool { action: "create_page", site_id: "<site>", title: "<title> (CF)", slug: "<slug>-cf", duplicateOf: "<ORIGINAL_PAGE_ID>" }
```

Keep the returned ID as `DUPLICATE_PAGE_ID`. Do not set `draft: true`: a draft page does not reach staging. Then keep it out of the sitemap:

```
data_sitemap_tool { action: "update_page_sitemap_status", page_id: "<DUPLICATE_PAGE_ID>", includeInSitemap: false }
```

Re-read with `list_pages` and confirm the new page exists, its slug is `<slug>-cf`, and `DUPLICATE_PAGE_ID !== ORIGINAL_PAGE_ID`. Read its tree once (`get_all_elements`, paced) and save it as `tree-duplicate.json`; the legacy section IDs on the duplicate differ from the original's.

### Before every write batch

- [ ] Verify page ID differs from original before every write batch: the `pageId` in the call is `DUPLICATE_PAGE_ID`, and `DUPLICATE_PAGE_ID !== ORIGINAL_PAGE_ID`.
- [ ] The Designer tab shows the duplicate page.
- [ ] The section HTML passed `validate-section.js --structure v3 --no-scheme` against `published.css` plus the drafted classes.

### 5b. Create missing custom classes

Only for names not already in `published.css` (check with `parseCssClasses` or `css-sizes.js <css> <name>`; "not in the CSS" means create it).

```
data_style_tool { action: "create_style", siteId: "<site>", name: "hero_grid", properties: [ { property_name: "display", property_value: "grid" }, … ] }
data_style_tool { action: "update_style", siteId: "<site>", style_name: "hero_grid", breakpoint: "medium", properties: [ … ] }
```

Longhand properties only (`padding-top`, not `padding`). Values in rem or `var(--…)`. For a combo, pass `parent_style_name`. Re-read with `data_style_tool > get_styles` filtered to the new names and confirm none came back as `<name>-1`.

### 5c. Insert the rebuilt section

```
data_whtml_builder {
  siteId: "<site>",
  pageId: "<DUPLICATE_PAGE_ID>",
  actions: [ { html: "<section class=\"section_hero\">…</section>", parent_element_id: "<legacy section id on the duplicate>", creation_position: "after" } ]
}
```

One root element per action. No `css` field: sending CSS for an existing class creates `<name>-1`. If `creation_position: "after"` is rejected, probe for the valid values, or insert with `append` into `main-wrapper` and move with `data_element_tool > move_element { id, anchor_element_id: <legacy id>, creation_position: "after" }`.

### 5d. Re-read and check

Wait for the pacing window, then `get_all_elements` on `DUPLICATE_PAGE_ID`, save as `tree-after-<n>.json`, and check:

- [ ] The new section exists right after the legacy one, with tag `section` and `section_<name>` as its first class.
- [ ] Every element carries the classes you sent, by name. No class name ends in `-1` unless it already existed before the run.
- [ ] Links: every link has its link settings. The builder drops `target="_blank"` and link settings; re-apply with `data_element_tool > set_link` (page links as Page type, not URL) and `set_attributes` for `target`, then re-read.
- [ ] Text: copy sits in the String child. Fix with `set_text` on the String child, not its parent.
- [ ] Images: re-set assets with `set_image_asset` when the builder left a placeholder.
- [ ] Component instances that the section must keep (for example `26 Price Table`) are moved, not rebuilt: `move_element` from the legacy section into the new one.

On any failed check: re-apply the fix, re-read, check again. A second failure on the same section stops the run. Report what is in place and which check failed.

### 5e. Remove the legacy section

```
data_element_tool { action: "remove_element", siteId: "<site>", pageId: "<DUPLICATE_PAGE_ID>", id: "<legacy section id on the duplicate>" }
```

The 2.2.0 guide names this action `remove_element`; older notes call it `delete_element`. Probe if neither is accepted. It cannot be undone, so run the page-ID check first. Re-read and confirm the legacy section is gone and the new one is still there.

## Step 6: Publish staging and verify

1. `get_site` again. Report `lastUpdated` vs `lastPublished` and any pending changes beyond the duplicate page. Publishing ships everything pending, including other sessions' edits. Ask before publishing.
2. Publish to the Webflow subdomain only:
   ```
   data_sites_tool { action: "publish_site", siteId: "<site>", publishToWebflowSubdomain: true, customDomains: [] }
   ```
   Never pass custom domain IDs.
3. Confirm noindex on the duplicate before anything else:
   ```
   curl -s https://<staging>/<slug>-cf | grep -i -o '<meta[^>]*robots[^>]*>'
   ```
   It must contain `noindex`. If it doesn't, stop and ask Will to turn on Site settings > SEO > "Disable Webflow subdomain indexing".
4. Screenshots with Chrome DevTools MCP: `resize_page` to 375 and 1440 wide, `navigate_page`, `take_screenshot` with `fullPage: true`, for the original on the live domain and the duplicate on staging. Save to `projects/<client>/.claude/cf-page/<slug>/{original,duplicate}-{375,1440}.png`.
5. Lighthouse with Chrome DevTools MCP `lighthouse_audit` (performance and accessibility) on both URLs at 375 and 1440.
6. Metrics after: `page-metrics.js tree-final.json --json`.
