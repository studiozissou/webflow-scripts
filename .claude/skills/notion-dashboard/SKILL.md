---
name: notion-dashboard
description: Guides the agent through syncing task status to the Notion "Claude Code" dashboard — database IDs, property names, status values, and push rules. Activates when pushing task status to Notion.
---

<objective>
Push task status updates from queue.json to the Notion "Claude Code" dashboard with correct property names, status values, and client relations. Notion is read-only for decisions — queue.json is the source of truth.
</objective>

<quick_start>
Database name: "Claude Code"
Database ID: 48af993a5b0548cd941a329009f3afb2
Data source ID: 04a79e29-7cc1-4270-b6ce-9bc9aaf99853

Important rules:
- Notion is a READ-ONLY DASHBOARD. queue.json is the source of truth.
- Push status TO Notion. Never read FROM Notion to make workflow decisions.
- If Notion is unreachable, log a warning and continue. Never block a command because Notion is down.
- Always search by Slug AND Client to find existing rows.
- Never create a row without setting both Slug and Client.
- Never delete rows from Notion.
</quick_start>

<reference_guides>
Status values (exact spelling):
Triage, Ready to Plan, Planning, Ready to Build, Building, Needs Debug, Debugging, Blocked, Ready to Review, Done

Priority values (exact spelling):
P0, P1, P2, P3
Use the same P-level from queue.json directly. Do not map to High/Medium/Low.

Property names (exact spelling and capitalisation):
Task Name, Slug, Status, Client, Priority, Type, Blocker, Last Updated, Time Spent

Client relation:
Client is a two-way relation to the Clients database (data source: collection://229e1848-bb51-8018-888c-000b6dbead72). The synced property on the Clients side is called "Claude Code". When setting Client, search the Clients database by client name and link the matching row. If no match, ask the user which client this belongs to.

Notion page creation:
When creating a new row, use the data source ID (04a79e29-7cc1-4270-b6ce-9bc9aaf99853) as the parent, not the database ID. Use the expanded date property format:
- "date:Last Updated:start": "2026-03-04"
- "date:Last Updated:is_datetime": 1
</reference_guides>

<workflow>
When pushing to Notion:
1. Search for a row where Slug AND Client both match
2. If found: update Status and Last Updated (and Blocker if applicable)
3. If not found: create a new row with all available fields
4. Always set Last Updated to the current timestamp
5. If status is Blocked, fill the Blocker field. If status changes away from Blocked, clear the Blocker field.
</workflow>

<success_criteria>
- Row found by Slug + Client match (not just Slug alone)
- Status value uses exact spelling from the status list
- Priority uses P0-P3 format (not High/Medium/Low)
- Last Updated set to current timestamp on every push
- Blocker field cleared when status moves away from Blocked
- No rows deleted from Notion
- Workflow continues even if Notion is unreachable
</success_criteria>
