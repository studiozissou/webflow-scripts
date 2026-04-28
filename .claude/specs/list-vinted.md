# Spec: list-vinted — Automated Vinted Listing from Notion

**Slug:** `list-vinted`
**Project:** `zissou-archive`
**Status:** Planning
**Priority:** P1
**Complexity:** Medium (3 new files, ~300 LOC)
**Created:** 2026-04-27

## Summary

A CLI script that reads "Ready to List" items from the Zissou Archive Notion database, opens vinted.nl via Playwright, fills all form fields, uploads photos, and saves each as a Vinted draft. After all items are processed, the user reviews drafts on Vinted and publishes manually. Notion status is updated to "Listed" with drop schedule activated.

## Architecture

### Approach: Playwright with persistent browser context

Uses `chromium.launchPersistentContext()` to reuse an existing logged-in Chrome session. The user logs into vinted.nl once in a normal browser; the script reuses those cookies. No login automation needed.

### Data flow

```
Notion (Ready to List)
  → queryByStatus('Ready to List')
  → For each item:
    → Read all properties (title, full_text, category, brand, size, condition, colour, price)
    → Download photos from Notion S3 URLs to tmp/
    → Playwright: navigate vinted.nl/items/new
    → Fill: title, description, category, brand, size, condition, colours, material, price
    → Upload photos via file input
    → Click "Save draft"
    → Update Notion: Status=Listed, Listed Date=today, Drop Schedule=Active
  → Report summary
```

### Always vinted.nl

All URLs use `https://www.vinted.nl`. Never `.co.uk`, `.fr`, or other TLDs.

## Files

### New files

| File | LOC est. | Purpose |
|---|---|---|
| `projects/zissou-archive/list-vinted.js` | ~120 | Main script — query Notion, download photos, orchestrate Playwright, update Notion |
| `projects/zissou-archive/lib/vinted.js` | ~150 | Playwright form-filling helpers — category nav, brand search, condition select, photo upload |
| `projects/zissou-archive/lib/vinted-categories.js` | ~40 | Hardcoded category map: Notion path → Vinted picker path |

### Modified files

| File | Change |
|---|---|
| `projects/zissou-archive/package.json` | Add `playwright` dependency |
| `projects/zissou-archive/config.js` | Add `VINTED_PROFILE_DIR` constant for persistent browser context path |

### Reusable code (no changes needed)

- `lib/notion.js:queryByStatus` — fetch "Ready to List" items
- `lib/notion.js:extractFiles` — get photo URLs as `[{url, name}]`
- `lib/notion.js:updateProperties` — write Status, Listed Date, Drop Schedule
- `config.js` — env loading, DB IDs

## Vinted form field mapping

| # | Vinted field | Source | Notion property | Fill method |
|---|---|---|---|---|
| 1 | Photos | S3 URLs → local tmp files | Photos (files) | `page.setInputFiles()` on upload input |
| 2 | Title | `title` | Item Name (title) | `page.fill()` on title input |
| 3 | Description | `full_text` | Full Description (rich_text) | `page.fill()` on description textarea |
| 4 | Category | `category` | Category (select) | Click through hierarchical picker using category map |
| 5 | Brand | `brand` | Brand (select) | Type in search dropdown, click match |
| 6 | Size | `size` | Size (select) | Click suggested size or type manually |
| 7 | Condition | `vinted_condition` | Condition (select) | Click to open dialog, select matching radio |
| 8 | Colours | `colour` | Colour (multi_select) | Click to open, select matching colour(s) |
| 9 | Material | from `parsed_fields.fabric` | — | Type material keyword, optional |
| 10 | Price | `price.amount` | Suggested Price (number) | `page.fill()` on price input |
| 11 | Parcel size | auto (Large default) | — | Leave as recommended or click Large |

## Category map

Hardcoded lookup from Notion category strings to Vinted's hierarchical picker clicks:

```js
const CATEGORY_MAP = {
  'Men > Jackets > Blazers': ['Men', 'Clothing', 'Suits & blazers', 'Suit jackets & blazers'],
  'Men > Jackets > Coats': ['Men', 'Clothing', 'Jackets & coats', 'Coats'],
  'Men > Knitwear > Cardigans': ['Men', 'Clothing', 'Jumpers & cardigans', 'Cardigans'],
  'Men > Shoes > Trainers': ['Men', 'Shoes', 'Trainers'],
  'Men > Shoes > Boots': ['Men', 'Shoes', 'Boots'],
  'Men > Trousers': ['Men', 'Clothing', 'Trousers', 'Trousers'],
  'Men > Shirts': ['Men', 'Clothing', 'Shirts', 'Casual shirts'],
};
// Extend as new categories are encountered
```

## Vinted condition mapping

Direct 1:1 — the `vinted_condition` field already stores the exact Vinted string:
- "New with tags" → "New with tags"
- "New without tags" → "New without tags"
- "Very good" → "Very good"
- "Good" → "Good"
- "Satisfactory" → "Satisfactory"

## Photo handling

1. Query item, extract photo URLs via `notion.extractFiles(page)`
2. Download all photos to `tmp/listing-{pageId}/` using `fetch` + `fs.writeFile`
3. After download completes, use `page.setInputFiles()` to upload all photos at once
4. Clean up tmp folder after successful draft save

Photos are Notion S3 signed URLs — they expire after ~1 hour. The script fetches pages fresh and downloads photos immediately, so expiry is not a concern for normal batch sizes (< 20 items).

## Post-listing Notion update

After "Save draft" succeeds for each item:

```js
await notion.updateProperties(pageId, {
  'Status': { select: { name: 'Listed' } },
  'Listed Date': { date: { start: today } },
  'Drop Schedule': { select: { name: 'Active' } },
});
```

This activates the Friday price drop automation for the item.

## Error handling

- If Playwright can't find a selector: log error, skip item, continue to next
- If photo download fails: log error, skip item
- If category not in map: log warning with the unmapped category, skip category field (user fills manually during review)
- If brand not found in Vinted search: log warning, leave blank
- Each item wrapped in try/catch — one failure doesn't stop the batch

## CLI interface

```bash
# List all Ready to List items
node projects/zissou-archive/list-vinted.js

# Dry run — show what would be listed without opening browser
node projects/zissou-archive/list-vinted.js --dry-run

# List specific item by Notion page ID
node projects/zissou-archive/list-vinted.js --id 34ee1848-bb51-8086-8782-c827a1e68a7b
```

Debug output with `DEBUG=1`.

## Selector strategy

Vinted's form uses semantic elements that are reasonably stable:

- Title/Description: `textbox` role with placeholder text
- Category/Brand/Size/Condition/Colours/Material: `textbox` role with specific placeholder or label
- Photo upload: file input inside the upload area
- Save draft: `button` with text "Save draft"
- Parcel size: `radio` inputs

Use `page.getByRole()` and `page.getByText()` where possible — these are more resilient than CSS class selectors. Fall back to `page.locator()` with data attributes only when needed.

## Known risks

1. **Selector brittleness** — Vinted can redeploy UI anytime. Mitigated by using semantic selectors and wrapping each field fill in a try/catch with clear error messages.
2. **Photo upload input** — May be drag-drop only with no `<input type="file">`. Needs verification against live form. If no file input exists, fall back to Playwright's drag-and-drop API or `page.dispatchEvent`.
3. **Rate limiting** — Posting many drafts quickly may trigger Vinted's anti-bot. Add a 2-3 second delay between items.
4. **Session expiry** — If cookies expire mid-batch, subsequent items fail. The script checks for a login redirect after each navigation and logs a clear error.

## Barba impact

N/A — no Barba transitions. This is a CLI script, not a Webflow page module.

## Verify loop

### Pass/fail criteria

1. Script runs without errors on a single "Ready to List" item
2. Vinted draft is created with correct title, description, price
3. Category, brand, size, condition are filled correctly
4. Photos are uploaded (visible in draft)
5. Notion status updates to "Listed" with today's date
6. Drop Schedule set to "Active"
7. `--dry-run` flag shows items without opening browser
8. Missing category in map logs a warning and skips gracefully

### Reproduction steps

1. Ensure at least one item with Status="Ready to List" and photos in Notion
2. Run `DEBUG=1 node projects/zissou-archive/list-vinted.js`
3. Observe Playwright browser opening and filling form
4. Check Vinted drafts page for the saved listing
5. Check Notion for status update

### Test plan

#### Tier 1 — Unit tests (node:test)
- Category map lookup — valid and missing categories
- Photo download function — mock fetch, verify file written
- Notion property extraction — verify all fields read correctly
- `--dry-run` flag parsing

#### Tier 2 — Integration (manual, live Notion + Vinted)
- Run against a real "Ready to List" item
- Verify draft appears on vinted.nl with correct data
- Verify Notion status updated

#### Tier 3 — Manual
- Visual check: photos in correct order on Vinted draft
- Category correct in Vinted's picker (not just filled but saved)
- Brand matched correctly in Vinted's database
- Description formatting preserved (bullets, line breaks)
- Price shows correctly in EUR

No automated acceptance tests — this project uses `node:test` for unit tests, and the feature requires a live Vinted session which can't be automated in CI.

## Task breakdown

1. **Install Playwright** — add to package.json, `npx playwright install chromium`
2. **Build category map** — `lib/vinted-categories.js` with known Notion→Vinted mappings
3. **Build Vinted form helpers** — `lib/vinted.js` with functions: `fillTitle`, `fillDescription`, `selectCategory`, `searchBrand`, `selectSize`, `selectCondition`, `selectColours`, `fillPrice`, `uploadPhotos`, `saveDraft`
4. **Build main script** — `list-vinted.js` with Notion query, photo download, Playwright orchestration, Notion update
5. **Add config** — `VINTED_PROFILE_DIR` to config.js
6. **Unit tests** — category map tests, dry-run test
7. **Live test** — run against one real item, verify end-to-end

## Parallelisation map

All tasks are sequential — each depends on the previous:
```
1 (install) → 2 (categories) → 3 (vinted helpers) → 4 (main script) → 5 (config) → 6 (tests) → 7 (live test)
```

Single stream, no parallelisation. Estimated ~2 hours total implementation.
