# /sync-notion

Push all tasks from queue.json to the Notion dashboard. This is mainly
used for the initial migration and occasional manual syncs.

## Status mapping (old → new)

| Old status (queue.json) | New status |
|---|---|
| todo | Triage |
| PENDING_REVIEW | Triage |
| PENDING_ARCH_REVIEW | Ready to Plan |
| READY_FOR_BUILD | Ready to Build |
| in_progress | Building |
| IN_PROGRESS | Building |
| BLOCKED | Blocked |
| READY_FOR_QA | Ready to Review |
| PENDING_HUMAN_REVIEW | Ready to Review |
| done | Done |
| DONE | Done |
| closed | Done |

If the status already matches a new-format value (e.g. "Triage", "Building"),
use it as-is — no mapping needed.

## Steps

1. Read .claude/queue.json. If it doesn't exist, report "No queue.json
   found — nothing to sync." and stop.

2. Read .claude/skills/notion-dashboard.md for the database ID and
   property names.

3. For each item in queue.json:
   a. Map the old status name to the new status name (see mapping table above).
   b. Search Notion for a row where Slug matches the item's id/slug AND
      Client matches the current project's client (read from CLAUDE.md).
   c. If found:
      - Update Status to the mapped value
      - Set Last Updated to now
      - Report: "Updated: [slug] — [old status] → [new status]"
   d. If not found:
      - Create a new row:
        - Task Name: item title or slug (humanised)
        - Slug: item id/slug
        - Status: mapped status
        - Client: search Clients DB by name, link the matching row. Ask user if no match found.
        - Priority: from queue.json if available, default "Medium"
        - Type: from queue.json if available, default "Feature"
        - Last Updated: now
      - Report: "Created: [slug] — [status]"
   e. If the Notion API call fails for this item, report the error
      and continue to the next item.

4. Report summary:
   - Created: N
   - Updated: N
   - Failed: N (with error details)

5. Do NOT rename or delete queue.json. It remains the source of truth.
