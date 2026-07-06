# /triage — Multi-Source Task Triage

Scan Gmail, Slack, Calendar, and Trello. Extract tasks, detect blockers, draft replies, and create tasks in Notion.

## Model split
- **Opus** for task extraction, classification, reply drafting, and question generation
- **Sonnet** for source scanning agents (parallel)

## Process

### Step 0 — Load skills and config

1. Load the `triage` skill (task extraction, Notion schema, dedup, blocked detection)
2. Load the `gmail-triage` skill (email classification, reply drafting, tone rules)
3. Read `.claude/triage/config.json` for source configuration
4. Read `.claude/triage/state.json` for last-processed timestamps

### Step 1 — Check MCP availability

Before scanning, verify which MCP tools are available:

```
Required:
- Gmail MCP (search_threads, get_thread, create_draft)
- Slack MCP (read_channel, read_thread)
- Notion MCP (notion-search, notion-create-pages)

Optional:
- Google Calendar MCP (list_events)
- Trello MCP (trello_get_tasks) — check config.trello.enabled
```

If a required MCP is unavailable, warn the user and skip that source. If Notion MCP is unavailable, run the triage but present tasks as a local summary without Notion creation.

### Step 2 — Check Notion database

If `config.notion.databaseId` is null:
1. Tell the user: "The Master Tasks Notion database hasn't been set up yet."
2. Offer to create it via Notion MCP `create-database` with the schema from the triage skill
3. Or instruct the user to create it manually and update config.json
4. Do not proceed with Notion creation until the DB exists — but still run the triage and present results

### Step 3 — Scan all sources in parallel

Spawn parallel agents to scan each source:

**Agent 1 — Gmail** (uses gmail-triage skill Steps 1-4):
- Run the two parallel Gmail searches from config
- Classify every thread: REPLY NEEDED / FLAG / ACTION / NOISE
- Priority-rank REPLY NEEDED threads
- Load project context from `projects/{client}/.claude/` for reply drafting
- Return classified threads with full content for actionable ones

**Agent 2 — Slack**:
- For each channel in config: `read_channel(id, oldest: state.slack.channels[id].lastProcessed || lookbackTimestamp, limit: 100)`
- For each DM in config: `read_channel(id, oldest: state.slack.dms[id].lastProcessed || lookbackTimestamp, limit: 100)`
- Classify messages using the same REPLY NEEDED / FLAG / ACTION / NOISE buckets
- Use config's client mapping to auto-assign clients
- For threads with replies, fetch full thread via `read_thread`
- Return classified messages with permalinks

**Agent 3 — Calendar** (if available):
- `list_events` for the next `config.calendar.lookaheadDays` days
- Filter to events that imply preparation or follow-up
- Skip routine recurring events unless they have specific agendas
- Return actionable events with dates

**Agent 4 — Trello** (if enabled and available):
- Read configured boards
- Extract cards assigned to user or due within 7 days
- Return cards with URLs and due dates

### Step 4 — Extract tasks and draft replies

Using the results from all agents:

1. **Extract tasks** from every actionable item (following triage skill extraction rules)
2. **Detect blockers** — scan for blocking language, unanswered threads, cross-task dependencies
3. **Create subtasks** where a task has 3+ distinct deliverables
4. **Draft replies** for REPLY NEEDED items:
   - Gmail: follow gmail-triage skill Step 6 rules
   - Slack: shorter, more casual, no formal sign-off
5. **Flag questions** — anything unclear goes in the questions list

### Step 5 — Dedup against Notion

For each extracted task:
1. Search Notion Master Tasks DB for matching Source ID
2. If found → skip (already triaged)
3. If not found → check for semantic duplicates (similar name + same client)
4. If semantic match → add to questions list: "Is this the same as existing task 'X'?"

### Step 6 — Present triage report

Output the full triage report following the format in the triage skill:

```
── TRIAGE — {date} ──

## Replies Needed
## Draft Replies
## New Tasks → Notion (with Doer column)
## Quick Wins (Claude can do now)
## Blocked / Waiting Summary
## Flag / Action Items
## Questions for You
## Noise Summary
```

### Step 7 — Ask for approval

Use AskUserQuestion with options:
- **"Approve all tasks and drafts" (Recommended)** — create all tasks in Notion + create all email/Slack drafts
- **"Let me review individually"** — go through each task and draft one by one
- **"Approve tasks only"** — create Notion tasks, skip reply drafts
- **"Approve drafts only"** — create reply drafts, skip Notion tasks
- **"Skip everything"** — just save the triage report, don't create anything

### Step 8 — Execute approved actions

Based on user's choice:

**Notion task creation:**
1. Search Clients DB for each client name → get relation page IDs
2. Create parent tasks first, then subtasks (so Parent Task relation can be set)
3. Set all properties per the triage skill schema (including Doer)
4. Log each created task with Notion URL

**Gmail draft creation:**
1. For each approved draft, call `create_draft` with `replyToMessageId`
2. NEVER send — drafts only
3. Confirm: "Draft created for thread: {subject}"

**Slack reply sending:**
1. Show each Slack reply one more time for final confirmation
2. If approved, send via `send_message`
3. If not approved or MCP unavailable, present as copy-paste block

### Step 8b — Quick Wins

After executing approved actions, if any tasks have Doer = "Claude":

1. Present the Quick Wins list:
   ```
   ── Quick Wins ──
   N tasks are doable by Claude right now:
   1. "Draft reply to Alex" → create Gmail draft (already drafted above)
   2. "Generate service page schema" → /generate-schema carsa
   3. "Run SEO check on new pages" → /site-audit carsa
   ```
2. Ask: "Run all quick wins? / Pick individually? / Skip?"
3. For each approved quick win, execute the relevant command or action
4. Reply drafts that were already created in Step 8 are marked as done
5. For commands like `/generate-schema` or `/site-audit`, execute them in sequence (not parallel — user should see each result)

### Step 9 — Update state

1. Write updated timestamps to `.claude/triage/state.json`
2. Print summary:
   ```
   ── Triage Complete ──
   Sources scanned: Gmail (X threads), Slack (Y messages), Calendar (Z events)
   Tasks created: N (P parent + S subtasks)
   Drafts created: D
   Blocked/Waiting: B items
   Questions remaining: Q
   ```

## Arguments

The `/triage` command accepts optional arguments:

- `/triage` — full triage of all sources
- `/triage gmail` — Gmail only (uses gmail-triage skill directly)
- `/triage slack` — Slack only
- `/triage calendar` — Calendar only
- `/triage trello` — Trello only
- `/triage --no-drafts` — extract tasks but skip reply drafting
- `/triage --dry-run` — scan and classify but don't create anything in Notion or Gmail

## Error handling

- If a source MCP is unavailable → warn and skip that source, continue with others
- If Notion MCP is unavailable → present tasks as local summary, offer to retry later
- If Notion DB doesn't exist yet → guide user through setup, still present triage results
- If a Slack channel returns an error → warn and skip, continue with other channels
- If state.json is missing or corrupt → treat as first run, use config lookback windows
