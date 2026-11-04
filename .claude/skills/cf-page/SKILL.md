---
name: cf-page
description: Rebuild one Webflow page in Client First V3 structure on a duplicate, section by section, with Relume-derived layouts, cutting the element count by 30% or more while keeping the look, then hand back a one-screen checklist for the manual slug swap. Plan-only mode prints the section map (per section legacy classes, element count, depth, components, proposed layout and Client First classes, keep/rebuild/drop) with no Designer writes. Use this whenever the user runs /cf-page, asks to "rebuild this page in Client First", "migrate a page to Client First V3", wants a "section map" or a Client First plan for a page, or asks how many elements a page could lose ("cut element count on <page>"), even if they only name the client and the page.
argument-hint: <client> <page-slug> [--plan-only] [--target-elements n]
---

Rebuild a single Webflow page as Client First V3 on a duplicate, never on the original, and hand back the steps only a human can do. The run reads once, plans once, asks once, then builds section by section with a check after every write.

## Arguments and targets

- `<client>`: the folder under `projects/`. Its `.claude/client.md` (private repo, linked in) holds the site ID and staging domain.
- `<page-slug>`: the page's slug as it appears in `list_pages`, without a leading slash.
- `--plan-only`: stop after the section map. Read-only; see "Plan-only guarantees".
- `--target-elements <n>`: the element target for the report. Default is 70% of the original element count (30% fewer), rounded down.

Targets belong to the report, not to the build: the skill does not cut content to hit a number. When the projected count misses the target, say so at the approval step and let the user decide.

## Outputs and privacy

This repo is public. Element trees, CSS dumps, screenshots, copy and reports are client material and go only under `projects/<client>/.claude/cf-page/<slug>/` (the private `webflow-internal` repo, linked in by `scripts/link-internal.sh`). Scratch work goes in `.claude/skills/cf-page-workspace/`, which is gitignored. Never write a tree, screenshot or page copy anywhere else in this repo.

Files per run, all in `projects/<client>/.claude/cf-page/<slug>/`: `tree-before.json`, `published.css`, `plan.md`, `tree-duplicate.json`, `tree-after-<n>.json`, `tree-final.json`, the four screenshots, `report.md`.

## Pilot: Coconut /mtd-software

Use as the worked example and as the eval baseline.

```
site ID        6069af2a39978132d0155fd7
slot           webflow-2
staging        getcoconut.webflow.io
page           /mtd-software, page ID 686d341bc775236fb65fcfe7
not this page  mtd-software-2, the /archive/mtd-software-04-06-2026 draft, /mtd-software/* children
baseline       832 elements, max depth 17, 141 distinct classes, 31 Client First (22.0%)
sections       13 children of main-wrapper: Breadcrumbs Section (component, keep),
               12 sections; 25 Features Section hide (73 elements) drops as hidden
components     Top Nav Bar, Footer (outside main-wrapper), Breadcrumbs Section,
               26 Price Table (inside 25 Plans Section 2): all kept
default target 582 elements or fewer
```

## Scripts and references

| File | When |
|---|---|
| `scripts/page-metrics.js <tree.json> [--json]` | Step 1 and step 6. Prints the section map and totals from a saved `get_all_elements` response. |
| `scripts/css-sizes.js <css-or-url> [--scale <file>\|css] [class …]` | Step 2, to map each legacy class to the nearest `heading-style-*` / `text-size-*` and `text-weight-*`. |
| `scripts/css-sizes.js <css> --gate --tree <tree.json>` | Step 4, the foundation gate. |
| `references/section-mapping.md` | Step 2. Tailwind to Client First V3 table, section types, text sizing, class naming, two validated samples. |
| `references/mcp-recipes.md` | Steps 1, 5 and 6. Call shapes, re-read checks, pacing, the probe trick. |
| `references/report-format.md` | Step 7. The fixed hand-off template. |
| `tools/webflow/validate-section.js --structure v3 --no-scheme` | Step 5, on every section before insertion. |

Run scripts from the repo root. They print to stdout and never call the network except `css-sizes.js` when given a URL.

## 1. Read

Everything later depends on one clean read, and `get_all_elements` is expensive, so read each thing once and work from the saved files.

1. Read `projects/<client>/.claude/client.md` for the site ID and staging domain, and `projects/<client>/launch.config.json` if it exists (its `schemes` decide the validator flags in step 5).
2. Pick the Webflow slot per the `webflow-mcp` skill: `data_sites_tool > get_site` on `webflow`, then `webflow-2` on "site cannot be found". Pass `session_id: "start"` on the first call and keep the `ses_` ID. Never call `webflow_guide_tool`. Note `lastUpdated`, `lastPublished` and the staging subdomain.
3. `data_pages_tool > list_pages`. Resolve the slug to exactly one page. Refuse CMS template pages (`collectionId` set), draft pages and secondary locales, and say why. Check near-duplicates by name before going on.
4. `data_element_tool > get_all_elements` on the page, whole tree. Save it as `tree-before.json` and run `page-metrics.js` on it. Its numbers are the baseline; quote them as printed.
5. Fetch the published staging CSS once (the `*.webflow.shared.*.css` link in the staging page head) and save it as `published.css`. The published CSS, not the Designer, is the source of truth for what classes exist and what they do.
6. If `projects/<client>/.claude/audits/classes-*.csv` exists, read its `name` and `proposed_cf_replacement` columns as hints. The CSS wins where they disagree.

## 2. Map

Work through each `main-wrapper` child in page order. The goal per section is a drafted V3 HTML block plus the custom classes it needs.

1. Classify the section (hero, feature grid, slider, tabs, steps, pricing, comparison, FAQ, CTA, testimonial) with the cheatsheet in `references/section-mapping.md`. Read its String nodes to see what it says.
2. Set the action. Component instances are `keep`. Sections that `page-metrics.js` marks hidden are `drop`. A section whose copy repeats another section's is `drop`; name the section it duplicates. Everything else is `rebuild`. Nested component instances (for example a price table) stay as they are inside the rebuilt section.
3. For `rebuild` sections, search the Relume MCP in that category, pick one layout that matches the legacy content's shape, and translate its Tailwind skeleton to V3 with the table in `section-mapping.md`. Relume returns React/TSX with Tailwind, never Webflow JSON, so the translation is always by hand.
4. Size every text element from its current computed size: run `css-sizes.js published.css <legacy classes>`, then use `headingUtility` for `<h1>` to `<h6>` (the tag keeps its level) and `utility` for everything else. Add `text-weight-*` only where it differs from the size class. This keeps the visual hierarchy instead of trusting tags the legacy build may have misused.
5. Name new custom classes `<section>_<element>` with `is-*` modifiers, and draft their styles in rem and variables. Reuse a class name already in `published.css` by name only.
6. List sections whose legacy markup carried IX2 interactions, where the tree exposes them, under "Lost on rebuild". Interactions are out of scope; listing them is all this skill does.

## 3. Approve once

Print the plan and save it as `plan.md`:

- The `page-metrics.js` table (one row per `main-wrapper` child), extended with: content summary, proposed Relume category or existing component, proposed Client First classes for the section and its key elements.
- The components outside `main-wrapper` (nav, footer), marked keep.
- Totals: baseline elements, depth, distinct classes and CF ratio from the script, then the projected element count. Project it from the drafted HTML: elements plus one per non-empty text run (Webflow stores each run as a String node), plus the counts of `keep` sections, plus everything outside `main-wrapper`. Show the target and whether the projection meets it.
- Clamped text sizes, dropped sections and expected losses.

Then ask once with `AskUserQuestion`: **Build** / **Edit the map** / **Stop**. Edit means change rows and print again. `--plan-only` ends here, after printing, without asking.

### Plan-only guarantees

Plan-only reads and prints; it changes nothing in Webflow. It still does the whole of steps 1 and 2, including the published CSS fetch, `css-sizes.js` and the Relume search: the proposed classes in the map are only worth reading when they come from the current sizes and a chosen layout, and a plan built from section names alone is a guess. A saved `tree-before.json` from the same day may stand in for `get_all_elements` when `lastUpdated` has not moved since it was saved; say so in the plan. These tools must never appear in a plan-only transcript: `data_whtml_builder`, `data_pages_tool > create_page`, `data_sites_tool > publish_site`, `data_style_tool` (any action), `data_element_tool > remove_element` / `delete_element`, and any other element, page-settings or sitemap write. Allowed: `get_site`, `list_pages`, `get_all_elements`, Relume search and fetch, local scripts, and curl of the staging page and CSS. Writing `plan.md` to the private client folder is fine.

## 4. Foundation gate

Run `css-sizes.js published.css --gate --tree tree-before.json`. It passes only when the published CSS has `heading-style-h1` to `h6`, `text-size-large|medium|regular|small|tiny`, at least one `text-weight-*`, `container-large|medium|small`, `page-wrapper`, `main-wrapper` (from the CSS or the tree, since Webflow drops unstyled classes from the published CSS) and the V3 section-padding variables (`--_layout---section-padding--*`).

On failure, print the missing list and stop: the site needs task C2 (the Client First V3 foundation) first. Building without it would mean sending CSS for utilities, which creates `-1` duplicates and splits the system in two.

After a pass, re-run step 2's size mapping with `--scale css` if the site's utility sizes differ from the V3 starter, and update the plan.

## 5. Build

The original page is never written to. Every write goes to a duplicate, and every batch re-checks that.

1. Duplicate: `data_pages_tool > create_page` with `slug: "<slug>-cf"` and `duplicateOf: <original page ID>`. Not a draft (drafts don't publish to staging). Exclude it from the sitemap (`data_sitemap_tool > update_page_sitemap_status`, `includeInSitemap: false`). Re-read with `list_pages`, then read the duplicate's tree once and save it; its legacy element IDs differ from the original's. Set the duplicate's title or SEO fields with `data_pages_tool > update_page_settings` only if the duplicate did not carry them, and re-read: it returns success even when it writes nothing (schema never sticks), so schema goes on the manual list.
2. Before every write batch, verify the target page ID is the duplicate's and differs from the original's. If it doesn't, stop.
3. Per section, in page order:
   1. Validate the drafted HTML: `node tools/webflow/validate-section.js --structure v3 --no-scheme check.css section.html`, where `check.css` is `published.css` plus the drafted new classes. Drop `--no-scheme` when the client config has `schemes`. Every section must be one `<section class="section_<name>">` whose first child is `container-*`; `padding-global` is not used.
   2. Create missing custom classes with `data_style_tool > create_style` / `update_style`, longhand properties, rem or `var()` values, no px. Never send CSS for a name already in `published.css`.
   3. Insert with `data_whtml_builder` after the legacy section, class names only and no `css` field.
   4. Re-read the tree (paced) and run the checks in `references/mcp-recipes.md` 5d: classes present, no new `-1` class for a name that existed, link settings and `target` carried, text in String children, kept components moved in.
   5. On a failed check, re-apply and re-read. Two failures on one section stop the run: report what is in place, which section, which check.
   6. Remove the legacy section (`data_element_tool > remove_element`) and re-read.
   7. `keep` sections stay where they are. `drop` sections are removed with the same page-ID check.
4. Save the last read as `tree-final.json`.

## 6. Publish staging and verify

1. `get_site` again and report `lastUpdated` vs `lastPublished` and every other pending change that will ship with this publish. Publishing ships everything pending, including other sessions' Designer edits. Ask before publishing.
2. `data_sites_tool > publish_site` with `publishToWebflowSubdomain: true` and no custom domains. Never publish custom domains from this skill.
3. Confirm `https://<staging>/<slug>-cf` returns `<meta name="robots" content="noindex">` (attribute order varies). If it doesn't, stop before screenshots.
4. Screenshots with Chrome DevTools MCP, full page, at 375 and 1440: the original on the live domain, the duplicate on staging. Save them to `projects/<client>/.claude/cf-page/<slug>/`.
5. `page-metrics.js tree-final.json` for elements, max depth, distinct classes and CF ratio.
6. Lighthouse performance and accessibility on both, at both widths.
7. Compare the screenshots section by section and list every difference as intended or not. No pixel diffing; the model's comparison is the check.

Pass when elements are at or below the target, max depth is not higher, CF ratio is at least 90%, no Lighthouse score is lower, and the comparison lists only intended differences.

## 7. Hand-off report

Fill in `references/report-format.md` and save it as `report.md` next to the screenshots. The manual steps go in this order: review on staging; rename slugs (old → `<slug>-old`, new → `<slug>`); move SEO, Open Graph and schema if not carried; publish custom domains; delete `<slug>-old` after one publish cycle; run Style Manager > Clean up. The MCP cannot rename slugs safely, delete pages or publish custom domains for this skill, which is why these stay manual.

## Known losses and gotchas

From the `webflow-mcp` skill and past runs. Several fail silently.

- `get_all_elements` is 150 to 190 KB and 429s on about every other call. Pace about 2 minutes apart and parse the saved file locally.
- `data_whtml_builder` drops `target="_blank"` and link settings. Re-apply with `set_link` (Page links, not URL links, so they localise) and re-read.
- A nested `<section>` loses its classes unless the class exists first. Create classes before the insert.
- Sending CSS for a class that already exists creates `<name>-1`. Send names only; style existing classes separately.
- `var()` inside a gradient is frozen to its current value. Leave variable gradients for the Designer and list them under losses.
- An empty boolean `open` attribute is dropped. Write `open="open"`.
- `set_text` must target the String child, not its parent.
- `data_element_builder` silently drops styles, text and attributes. Use `data_whtml_builder`.
- Style names can carry trailing non-breaking spaces and are distinct styles from their trimmed twins (Coconut has `25 Collapse Trigger` and `25 Collapse Trigger` + NBSP). `page-metrics.js` lists them under `untrimmedClasses`. Copy them verbatim.
- The HTML builder does not create native Slider or Tabs widgets. Rebuild those as static content or keep them; never fake them with IX2.
- IX2 interactions do not come across. They are listed, not rebuilt.
- Parameter shapes vary by tool (`siteId` vs `site_id`, `id` vs `element_id`). The safe probe is a deliberately wrong call: validation runs before execution, so it mutates nothing, and the Zod union error lists every valid action and key.
- `validate-section.js --structure v3` allows padding on `section_<name>` and margin on `margin-*` and `align-center`; any other class carrying margin or padding is a rule 7 error and blocks the insert. Spacing goes on the section, the spacing utilities or `gap-*`, never on content classes.
- Designer tools need the MCP Bridge App open with the Designer tab foregrounded.
