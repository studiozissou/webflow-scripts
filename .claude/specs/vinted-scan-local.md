# Spec: vinted-scan-local — Local CLI Vinted Scan

**Slug:** `vinted-scan-local`
**Project:** `zissou-archive`
**Status:** Ready to Build
**Priority:** P1
**Complexity:** Low (2 new files, 1 updated, ~150 lines of prompt)
**Created:** 2026-04-28

## Summary

Replace the Anthropic API scan flow (`scan-items.js` → Claude API → humanizer → Notion SDK) with a pure Claude Code workflow. User dumps photos into `projects/zissou-archive/inbox/<item-slug>/` alongside a `notes.md`, runs `/vinted-scan`, and Claude Code does the vision analysis, self-reviews for AI writing patterns, then writes the listing to Notion via MCP. No API key, no Node script, no cost beyond the Max plan.

## Architecture

### Before (API flow)
```
scan-items.js → Anthropic API (claude-sonnet) → humanizer (claude-haiku) → Notion SDK
Requires: ANTHROPIC_API_KEY, NOTION_TOKEN, @anthropic-ai/sdk, @notionhq/client
```

### After (local CLI flow)
```
/vinted-scan → Claude Code reads photos + notes.md → vinted-listing skill
            → self-review for AI patterns → Notion MCP write-back
Requires: nothing (Claude Code Max plan + Notion MCP connection)
```

### What stays
- `drop-prices.js` + GitHub Actions cron — unchanged (no Claude API, just math)
- `lib/notion.js` — still used by `drop-prices.js` and `list-vinted.js` (Phase 2)
- `lib/price-drops.js` — unchanged
- `config.js` — still used by price drops
- `scripts/` helpers — unchanged

### What becomes legacy
- `scan-items.js` — replaced by `/vinted-scan` command
- `lib/scanner.js:buildScanMessage()` — no longer needed (Claude Code reads photos directly)
- `lib/scanner.js:parseScanResponse()` — no longer needed (Claude Code outputs JSON natively)
- `lib/humanizer.js` — replaced by self-review step in the command prompt
- `ANTHROPIC_API_KEY` env var — no longer needed for scanning

`mapToNotionProperties()` remains useful as a reference for the exact Notion property names and types, but is not called by this flow.

## Inbox Convention

```
projects/zissou-archive/inbox/
  aspesi-navy-blazer/
    IMG_1234.jpg
    IMG_1235.jpg
    IMG_1236.jpg
    notes.md          ← free-form: size, purchase price, known flaws, etc.
  tod-boots-black/
    photo1.jpg
    photo2.jpg
    notes.md
  processed/          ← completed items moved here
    boss-charcoal-blazer/
      ...
```

Rules:
- Subfolder name = item slug (kebab-case, descriptive)
- Photos: any image format Claude Code can read (jpg, png, heic, webp)
- `notes.md`: free-form text — size, purchase price, known condition issues, fabric details, anything the seller knows. Can be empty if photos tell the full story.
- After successful processing, the subfolder is moved to `inbox/processed/`

## `/vinted-scan` Slash Command Flow

### Step 1 — Discover inbox items
Glob `projects/zissou-archive/inbox/*/` for subfolders (exclude `processed/`). If empty, tell user "No items in inbox" and stop.

### Step 2 — For each item subfolder
1. Read `notes.md` (if it exists)
2. Read all image files in the folder (Claude Code's Read tool handles multimodal)
3. Read the vinted-listing skill at `.claude/skills/vinted-listing/SKILL.md`
4. Read the output schema at `.claude/skills/vinted-listing/references/schema.json`
5. Apply the skill: analyse photos with the persona, follow the photo analysis protocol, generate the full listing as structured JSON matching the schema
6. Self-review: re-read the generated `title` and `full_text` against the skill's tone calibration table and hard constraints. Fix any AI patterns (em dashes, "elevate", "versatile piece", etc.). Ensure `full_text` ≤ 2000 chars and `title` ≤ 100 chars.

### Step 3 — Write to Notion via MCP
For each processed item, use the Notion MCP tools:

1. **Search** for an existing page in the Inventory DB (`be751e1fc806485ba410bf137d362ad4`) matching the item name. If found, update it. If not, create a new page.

2. **Write properties** using `notion-update-page` or `notion-create-pages`:

| Notion Property | Type | Source |
|---|---|---|
| Item Name | title | `title` |
| Title | rich_text | `title` |
| Full Description | rich_text | `full_text` |
| Suggested Price | number | `price.amount` |
| Current Price | number | `price.amount` |
| Floor Price | number | `price.floor_price` |
| Price Justification | rich_text | `price.justification` |
| Price Audit | rich_text | `price.price_audit` (if present) |
| Original Retail | number | `price.original_retail` |
| Retail Estimated | checkbox | `price.original_retail_estimated` |
| Purchase Price | number | `price.purchase_price` (if present) |
| Condition Rating | number | `parsed_fields.condition_rating` |
| Condition | select | `vinted_condition` |
| Brand | select | `brand` (if present) |
| Size | select | `size` (if present) |
| Colour | multi_select | `[colour]` |
| Category | select | `category` |
| Keywords | multi_select | `keywords[]` |
| Photo Observations | rich_text | serialized `photo_observations[]` (truncate to 2000 chars) |
| Questions | rich_text | `questions_for_seller[]` joined with newlines |
| Scan Date | date | today (YYYY-MM-DD) |
| Status | select | "Ready to List" (or "Needs Info" if questions exist) |

### Step 4 — Move to processed
`mv` each successfully processed subfolder to `inbox/processed/`.

### Step 5 — Present summary
Same format as the current zissou-scan skill's Step 4: item-by-item breakdown with title, brand, price, condition, status, and any questions.

## Scope

### In scope
- `.claude/commands/vinted-scan.md` — the slash command
- `.claude/skills/zissou-scan/SKILL.md` — update to reference new flow
- `projects/zissou-archive/inbox/` — create folder with `.gitkeep`
- `projects/zissou-archive/inbox/processed/` — create folder with `.gitkeep`

### Out of scope
- Deleting `scan-items.js` or other legacy files (they still work, leave them)
- `list-vinted.js` (Phase 2 — separate spec)
- `drop-prices.js` changes
- Automated tests (no test infra for slash commands — verification is manual)

## Files Changed

| File | Change | Lines (est.) |
|---|---|---|
| `.claude/commands/vinted-scan.md` | **Create** — slash command prompt with full orchestration | ~120 |
| `.claude/skills/zissou-scan/SKILL.md` | **Update** — replace Node script instructions with `/vinted-scan` reference | ~30 |
| `projects/zissou-archive/inbox/.gitkeep` | **Create** — empty marker | 0 |
| `projects/zissou-archive/inbox/processed/.gitkeep` | **Create** — empty marker | 0 |

**Total:** ~150 lines of prompt, 0 lines of code

## Barba Impact

N/A — no Barba transitions. This is a CLI tool, not a Webflow project.

## Verify Loop

### Pass/fail criteria
1. `/vinted-scan` discovers all subfolders in `inbox/` (excluding `processed/`)
2. Photos are read and analysed — photo observations reference specific details visible in each image
3. Generated `title` ≤ 100 chars, `full_text` ≤ 2000 chars
4. No AI writing patterns in output (no em dashes, no "elevate", no "versatile piece", no "timeless")
5. Voice matches Permanent Style reference — opinionated, specific, knowledgeable
6. Notion page created/updated with all properties from the mapping table
7. Status set to "Ready to List" (or "Needs Info" if questions)
8. Processed folders moved to `inbox/processed/`
9. Summary presented with item-by-item breakdown

### Reproduction steps
1. Create `projects/zissou-archive/inbox/test-item/` with 2-3 photos and a `notes.md`
2. Run `/vinted-scan`
3. Verify Claude Code reads photos, generates listing, writes to Notion
4. Check Notion for the new/updated page with correct properties
5. Check `inbox/processed/test-item/` exists and `inbox/test-item/` is gone

### Tier mapping
- **Tier 1 — Auto:** N/A — no test infra for slash commands
- **Tier 2 — Auto:** N/A
- **Tier 3 — Manual:** All verification is manual:
  - Run `/vinted-scan` against a real inbox item
  - Check Notion for correct field population
  - Review listing quality (tone, accuracy, no hallucination)
  - Verify photo observations match actual photo content
  - Confirm `full_text` character count ≤ 2000

### Regression scope
- `drop-prices.js` must still run (no changes to its code path)
- Existing "Ready to List" and "Listed" items in Notion must not be affected
- The old `scan-items.js` flow should still work if someone runs it manually

## Test Plan

### Tier 1 — Auto: local tests
N/A — no automated test infrastructure for slash commands. The feature is a prompt file, not executable code.

### Tier 2 — Auto: CDN regression
N/A — not a deployed script.

### Tier 3 — Manual
- Run `/vinted-scan` with a test item (2-3 photos + notes.md)
- Verify Notion page created with all 20+ properties
- Verify listing voice matches Permanent Style reference
- Verify no AI writing patterns (check against tone calibration table)
- Verify `full_text` ≤ 2000 chars
- Verify `title` ≤ 100 chars
- Verify photo observations are grounded in actual photo content
- Verify processed folder moved correctly
- Run `drop-prices.js` to confirm no regression

## Tasks

1. **Create inbox folders** — `projects/zissou-archive/inbox/.gitkeep` and `inbox/processed/.gitkeep`
2. **Create `/vinted-scan` command via `/skill-creator`** — use the skill-creator skill to build `.claude/commands/vinted-scan.md` with full orchestration prompt, including eval criteria and test cases
3. **Update zissou-scan skill via `/skill-creator`** — use skill-creator to update `.claude/skills/zissou-scan/SKILL.md` to reference the new local flow instead of the Node script
4. **Verification — dry run** — Place a test item in `inbox/` (2-3 photos + notes.md) and run `/vinted-scan`. Verify:
   - All photos read and analysed (photo observations cite specific visible details)
   - `title` ≤ 100 chars, `full_text` ≤ 2000 chars (count explicitly)
   - No AI writing patterns (check against tone calibration table in SKILL.md)
   - Voice matches Permanent Style reference
   - JSON output matches schema.json shape
5. **Verification — Notion write-back** — Confirm MCP writes all 20+ properties correctly:
   - Check each field in Notion matches the generated JSON
   - Status = "Ready to List" (or "Needs Info" if questions)
   - Scan Date = today
   - Keywords populated as multi_select
   - Photo Observations truncated to ≤ 2000 chars
6. **Verification — housekeeping** — Confirm:
   - Processed folder moved to `inbox/processed/`
   - Original folder removed from `inbox/`
   - Summary printed with item-by-item breakdown
   - `drop-prices.js` still runs without error (regression check)
7. **Verification — batch** — Add 2+ items to inbox, run `/vinted-scan`, confirm all items processed and each gets its own Notion page

## Parallelisation Map

| Stream | Tasks | Agent | Est. tokens |
|---|---|---|---|
| A: Folders | 1 | code-writer | 0.5k |
| B: Command | 2 | skill-creator | 3k |
| C: Skill Update | 3 | skill-creator | 2k |

- A, B, and C are independent — can run in parallel
- Tasks 4–7 (verification) gate on all of A, B, C completing
- Tasks 4–7 are sequential (each builds on the previous)
- Recommendation: parallel A+B+C, then sequential verification 4→5→6→7

## Agents Needed

- **code-writer** — create inbox folders
- **skill-creator** — create `/vinted-scan` command and update `zissou-scan` skill (with eval, test cases, and iteration)
- **qa** — manual verification against live Notion (tasks 4–7)
