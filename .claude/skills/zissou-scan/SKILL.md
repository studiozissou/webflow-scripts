---
name: zissou-scan
description: >
  Run the Zissou Archive inventory scanner and present a summary of results.
  Use this skill whenever the user says "scan inventory", "scan drafts",
  "run the scanner", "zissou scan", "check for draft items", or any variation
  of wanting to process Draft items in the Zissou Notion database. Also
  triggers on /zissou-scan.
triggers:
  - zissou scan
  - scan inventory
  - scan drafts
  - run the scanner
  - check for drafts
  - process draft items
tags:
  - zissou
  - automation
  - notion
  - vinted
---

## What this does

Runs `projects/zissou-archive/scan-items.js` which:
1. Queries Notion for items with Status = "Draft"
2. Sends their photos to Claude Vision with the vinted-listing skill
3. Humanizes the output to remove AI writing patterns
4. Writes structured listing data back to Notion
5. Sets status to "Ready to List" (or "Needs Info" if questions remain)

## How to run

### Step 1 — Execute the scan

Run from the monorepo root:

```bash
DEBUG=1 node projects/zissou-archive/scan-items.js
```

Timeout: 120 seconds (each item takes 10-20s for the Claude Vision call + humanizer pass).

If it fails with "API token is invalid" or "NOTION_TOKEN", the `.env` file at
`projects/zissou-archive/.env` is missing or has bad keys. Tell the user.

### Step 2 — Parse the output

The script logs lines like:
- `[scan-items] Found N Draft items` — total items queued
- `[scan-items] Skipping "Name" — no photos` — skipped (no photos)
- `[scanner] parsed scan: title="..." needsInfo=false` — Claude response parsed
- `[scan-items] Running humanizer pass for "Name"...` — humanizer running
- `[scan-items] Scanned "Name" -> Ready to List` — success
- `[scan-items] Scanned "Name" -> Needs Info` — has questions
- `[scan-items] Error processing "Name": ...` — failure
- `[scan-items] Done: X scanned, Y skipped, Z errors` — summary line

### Step 3 — Query Notion for details

After the scan completes successfully, query Notion to read back the
processed items and build a rich summary. Run this from the project directory:

```bash
cd projects/zissou-archive && node -e "
import './config.js';
import { Client } from '@notionhq/client';
const n = new Client({ auth: process.env.NOTION_TOKEN });

// Get recently scanned items (Ready to List or Needs Info, scanned today)
const today = new Date().toISOString().slice(0, 10);
const r = await n.databases.query({
  database_id: 'be751e1fc806485ba410bf137d362ad4',
  filter: {
    and: [
      { property: 'Scan Date', date: { equals: today } },
      { or: [
        { property: 'Status', select: { equals: 'Ready to List' } },
        { property: 'Status', select: { equals: 'Needs Info' } },
      ]}
    ]
  }
});

for (const p of r.results) {
  const name = p.properties['Item Name']?.title?.[0]?.text?.content ?? 'Untitled';
  const title = p.properties['Title']?.rich_text?.[0]?.text?.content ?? '';
  const price = p.properties['Suggested Price']?.number ?? '?';
  const floor = p.properties['Floor Price']?.number ?? '?';
  const condition = p.properties['Condition']?.select?.name ?? '?';
  const rating = p.properties['Condition Rating']?.number ?? '?';
  const brand = p.properties['Brand']?.select?.name ?? '?';
  const status = p.properties['Status']?.select?.name ?? '?';
  const audit = p.properties['Price Audit']?.rich_text?.[0]?.text?.content ?? '';
  const purchase = p.properties['Purchase Price']?.number;
  const questions = p.properties['Questions']?.rich_text?.[0]?.text?.content ?? '';

  console.log(JSON.stringify({
    name, title, price, floor, condition, rating, brand, status,
    audit: audit.slice(0, 500), purchase, questions
  }));
}
"
```

### Step 4 — Present the summary

Format the results as a clean summary for the user:

```
## Zissou Scan Results

**X items scanned** | Y skipped | Z errors

### Item Name
- **Title:** Generated listing title
- **Brand:** Brand name
- **Price:** EUR XX (floor: EUR XX)
- **Purchase price:** EUR XX (or "not specified")
- **Condition:** Rating/10 — Vinted condition
- **Status:** Draft -> Ready to List (or Needs Info)
- **Price audit:** Brief excerpt of the pricing justification
- **Questions:** (only if Needs Info — show the questions)

---
(repeat for each item)
```

If no items were found, say: "No Draft items in the Zissou Inventory. Add
items with photos and set Status to Draft, then run the scan again."

If items were skipped (no photos), note which ones and remind the user to
add photos before re-scanning.

### Step 5 — Offer next actions

After the summary, offer:
- "Want me to run price drops?" (if there are Listed items)
- "Set any item back to Draft for a re-scan?" (if user wants to tweak notes and retry)
- "Open the Notion database?" (link not available from CLI, just remind them)
