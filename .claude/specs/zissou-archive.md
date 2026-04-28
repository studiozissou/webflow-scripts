# Spec: Zissou Archive — Clothing Flip Automation

**Slug:** `zissou-archive`
**Project:** `zissou-archive`
**Status:** Ready to Build
**Priority:** P1
**Complexity:** Medium (6 files, ~400 LOC)
**Created:** 2026-04-26

## Summary

A CLI automation system for tracking second-hand menswear purchases and flipping them on Vinted. You upload photos and brief notes to a Notion database; a scanner script sends them to Claude Vision API (using the `vinted-listing` skill) to generate full titles, descriptions, pricing, and keywords; results are written back to Notion. A separate cron-scheduled script handles automated Friday price drops with a hybrid fixed + smart strategy.

## Architecture

**Notion-only** — Notion is sole data store at current volume (~10 items/day). SQLite hybrid reserved as future scaling option if volume exceeds Notion API comfort zone.

### Notion Databases

| DB | ID | Purpose |
|---|---|---|
| Zissou Inventory | `be751e1fc806485ba410bf137d362ad4` | All items — photos, notes, descriptions, pricing, status |
| Price Drop Log | `c94323f733a24a5498ece05fa0a58cc2` | Per-drop records linked to inventory items |

### Data Flow

```
[You: phone]                    [Automation]                     [Vinted]
     │                               │                              │
     ├─ Upload photos + notes ──────>│                              │
     │   (Status: Draft)             │                              │
     │                               ├─ scan-items.js               │
     │                               │  1. Query Draft items        │
     │                               │  2. Download photos          │
     │                               │  3. Claude Vision + skill    │
     │                               │  4. Write back to Notion     │
     │                               │  5. Status → Ready to List   │
     │                               │     (or Needs Info)          │
     │                               │                              │
     │<── Answer questions (if any)  │                              │
     │    Status → Draft (re-scan)   │                              │
     │                               │                              │
     │                               ├─ list-vinted.js (Phase 2)   │
     │                               │  Playwright → post listing ─>│
     │                               │  Status → Listed             │
     │                               │                              │
     │                               ├─ drop-prices.js (Fri 8am)   │
     │                               │  Apply price drops           │
     │                               │  Log to Price Drop Log DB   │
     │                               │  Update Vinted (Phase 2)  ──>│
     │                               │                              │
```

## Scope

### Phase 1 (this spec)
- `scan-items.js` — Claude Vision scanner
- `drop-prices.js` — Friday price drop automation
- `config.js` — shared config (Notion IDs, API keys, drop schedule)
- Manual CLI execution + local launchd cron
- GitHub Actions cron for price drops

### Phase 2 (future)
- `list-vinted.js` — Playwright browser automation to post listings
- `update-vinted-price.js` — Playwright price updates on Vinted
- Smart drop modifiers (view count tracking from Vinted)
- SQLite local state for high-volume scaling

### Out of scope
- Web UI or dashboard (Notion IS the dashboard)
- Multi-platform (eBay, Depop) — Vinted only for now
- Image optimisation/editing before upload
- Inventory forecasting or analytics beyond Notion formulas

## Files Changed

| File | Change | Lines (est.) |
|---|---|---|
| `projects/zissou-archive/scan-items.js` | **Create** — CLI scanner: query Notion → download photos → Claude Vision → write back | 120 |
| `projects/zissou-archive/drop-prices.js` | **Create** — Price drop logic: query active listings → calculate drops → update Notion + log | 100 |
| `projects/zissou-archive/config.js` | **Create** — Notion DB IDs, drop schedule, env var loading | 40 |
| `projects/zissou-archive/lib/notion.js` | **Create** — Notion API helpers: query by status, download files, update properties, create drop log | 80 |
| `projects/zissou-archive/lib/scanner.js` | **Create** — Claude Vision call: build message with photos + notes + skill prompt, parse response | 60 |
| `projects/zissou-archive/.env` | **Create** — ANTHROPIC_API_KEY, NOTION_TOKEN (gitignored) | 3 |
| `projects/zissou-archive/package.json` | **Create** — deps: @anthropic-ai/sdk, @notionhq/client, dotenv | 15 |
| `.github/workflows/zissou-drop-prices.yml` | **Create** — Friday 8am UTC cron for price drops | 30 |
| `.gitignore` | **Edit** — add `projects/zissou-archive/.env` | 1 |
| `package.json` | **Edit** — add workspace script aliases | 2 |

**Total:** ~450 LOC

## Implementation Detail

### `config.js`

```js
import 'dotenv/config';

export const NOTION_INVENTORY_DB = 'be751e1fc806485ba410bf137d362ad4';
export const NOTION_DROP_LOG_DB = 'c94323f733a24a5498ece05fa0a58cc2';

export const DROP_SCHEDULE = {
  // week: { base: %, aggressive: % (used when smart modifier triggers) }
  1: { base: 0, aggressive: 0 },
  2: { base: 10, aggressive: 15 },
  3: { base: 15, aggressive: 25 },
  4: { base: 25, aggressive: 35 },
  5: { base: 30, aggressive: 30 }, // capped — hits floor check instead
};

export const DROP_DAY = 5; // Friday
export const DROP_HOUR = 8; // 8am UTC
```

### `scan-items.js` flow

1. Query Notion for pages where Status = "Draft" OR (Status = "Needs Info" AND Questions field has been edited since last scan)
2. For each page:
   a. Download all photos from the Files & media property (Notion gives temporary S3 URLs)
   b. Read Notes field + any answered Questions
   c. Build Claude API message:
      - System prompt: vinted-listing skill SKILL.md content
      - User message: photos as image content blocks + notes as text
      - Request structured JSON output (schema from references/schema.json)
   d. Parse Claude response
   e. Write fields back to Notion:
      - Item Name (title), Full Description, Title, Brand, Category, Size, Colour, Condition, Condition Rating, Suggested Price, Current Price (= Suggested Price initially), Floor Price, Price Justification, Original Retail, Retail Estimated, Keywords, Photo Observations, Scan Date
   f. If `questions_for_seller` is non-empty → Status = "Needs Info", write questions
   g. If complete → Status = "Ready to List"
3. Log summary: X items scanned, Y ready, Z need info

### `drop-prices.js` flow

1. Query Notion for pages where Status = "Listed" or "Price Dropping" and Drop Schedule = "Active"
2. For each page:
   a. Calculate `weeks_listed` from Listed Date
   b. Look up drop tier from DROP_SCHEDULE
   c. Calculate new price: `Suggested Price * (1 - drop_percentage / 100)`
   d. If new price ≤ Floor Price → set to Floor Price, Status = "At Floor", Drop Schedule = "Paused"
   e. Otherwise → update Current Price, Status = "Price Dropping"
   f. Create entry in Price Drop Log DB:
      - Title: "{Item Name} — Week {N} Drop"
      - Relation to inventory item
      - Previous Price, New Price, Drop Type ("Scheduled"), Reason
3. Log summary: X items dropped, Y at floor, Z skipped

### Claude Vision API call pattern

Follows the existing `code-review.js` pattern:

```js
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const response = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 4096,
  system: skillPrompt, // vinted-listing SKILL.md content
  messages: [{
    role: 'user',
    content: [
      // Photos as image blocks
      ...photos.map(photo => ({
        type: 'image',
        source: { type: 'url', url: photo.url }
      })),
      // Notes + any answered questions as text
      { type: 'text', text: `Notes: ${notes}\n\nReturn JSON matching the schema.` }
    ]
  }]
});
```

### Notion property mapping

| Schema JSON field | Notion property | Type |
|---|---|---|
| `title` | Title | Text |
| `full_text` | Full Description | Rich text |
| `price.amount` | Suggested Price | Number |
| `price.amount` | Current Price | Number (initial = suggested) |
| `price.floor_price` | Floor Price | Number |
| `price.justification` | Price Justification | Text |
| `price.original_retail` | Original Retail | Number |
| `price.original_retail_estimated` | Retail Estimated | Checkbox |
| `parsed_fields.condition_rating` | Condition Rating | Number |
| `vinted_condition` | Condition | Select |
| `brand` | Brand | Select |
| `category` | Category | Select |
| `size` | Size | Select |
| `colour` | Colour | Select |
| `keywords` | Keywords | Multi-select |
| `photo_observations` | Photo Observations | Rich text |
| `questions_for_seller` | Questions | Rich text |

### GitHub Actions workflow

```yaml
name: Zissou Price Drops
on:
  schedule:
    - cron: '0 8 * * 5'  # Friday 8am UTC
  workflow_dispatch: # manual trigger
jobs:
  drop:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci --prefix projects/zissou-archive
      - run: node projects/zissou-archive/drop-prices.js
        env:
          NOTION_TOKEN: ${{ secrets.ZISSOU_NOTION_TOKEN }}
```

## Barba Impact

N/A — no Barba transitions. This is a CLI tool, not a Webflow project.

## Verify Loop

### Pass/fail criteria
- `scan-items.js` processes a Draft item and writes all fields back to Notion
- Full Description field is ≤ 2000 characters
- Status transitions correctly: Draft → Ready to List (or Needs Info)
- `drop-prices.js` calculates correct price for each week tier
- Price never drops below Floor Price
- Price Drop Log entry created with correct relation and values
- Items at floor get Status = "At Floor" and drops pause

### Reproduction steps
1. Create a test item in Notion with photos and notes, Status = Draft
2. Run `node scan-items.js`
3. Verify all fields populated in Notion
4. Set Status = Listed, Listed Date = 2 weeks ago, Drop Schedule = Active
5. Run `node drop-prices.js`
6. Verify Current Price dropped by Week 3 percentage
7. Verify Price Drop Log entry created

### Tier mapping
- **Tier 1 — Auto:** Unit tests for price calculation logic, Notion property mapping
- **Tier 2 — Auto:** Integration test against a test Notion DB (requires NOTION_TOKEN)
- **Tier 3 — Manual:** Visual check that Notion fields look correct, Claude output quality review

### Regression scope
- Existing `tools/site-review/checks/code-review.js` Anthropic SDK usage must not break
- Root `package.json` must not gain unwanted dependencies

## Test Plan

### Tier 1 — Auto: local tests
- Unit tests for price drop calculation (all week tiers, floor price capping)
- Unit tests for Notion property mapping (JSON schema → Notion update payload)
- Mock Claude API response → verify all fields extracted correctly
- Character count validation on full_text output

### Tier 2 — Auto: integration
- Scan a real test item in Notion (requires env vars)
- Run price drop on a test item, verify Price Drop Log created

### Tier 3 — Manual
- Review Claude-generated listing quality (subjective — tone, accuracy, no hallucination)
- Verify photo observations match what's actually in the photos
- Cross-browser: N/A (CLI tool)

## Tasks

1. **Scaffold project** — Create `projects/zissou-archive/`, package.json, config.js, .env template
2. **Build Notion helpers** — `lib/notion.js`: query by status, download files, update properties, create drop log entry
3. **Build Claude scanner** — `lib/scanner.js`: construct Vision API message with skill prompt, parse structured JSON response
4. **Build scan-items CLI** — `scan-items.js`: orchestrate query → download → scan → write-back loop
5. **Build drop-prices CLI** — `drop-prices.js`: query active listings → calculate drops → update → log
6. **Add GitHub Actions workflow** — `.github/workflows/zissou-drop-prices.yml`
7. **Write tests** — Unit tests for price calculation, property mapping, mock Claude response parsing
8. **Manual QA** — Run against real Notion DB with test items

## Parallelisation Map

| Stream | Tasks | Agent | Est. tokens |
|---|---|---|---|
| A: Notion + Config | 1, 2 | code-writer | 3k |
| B: Claude Scanner | 3, 4 | code-writer | 4k |
| C: Price Drops | 5, 6 | code-writer | 3k |

- **A → B dependency:** scanner needs Notion helpers
- **A → C dependency:** drop-prices needs Notion helpers
- **B and C are independent** once A completes
- Recommendation: sequential A, then parallel B+C

## Agents Needed

- **code-writer** — all implementation
- **qa** — test writing and verification
