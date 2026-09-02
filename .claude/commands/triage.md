# /triage — Multi-Source Task Triage

Scan Gmail, Slack, Calendar, Trello, and the comments on existing Notion tasks. Extract tasks, detect blockers, draft replies, create tasks in Notion, act on the comments the user has left, and keep existing Notion tasks current as new information arrives.

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
- Gmail MCP (mcp__claude_ai_Gmail__search_threads, mcp__claude_ai_Gmail__get_thread, mcp__claude_ai_Gmail__create_draft)
- Slack MCP (mcp__plugin_slack_slack__slack_read_channel, mcp__plugin_slack_slack__slack_read_thread)
- Notion MCP (notion-search, notion-create-pages, notion-fetch, notion-update-page,
  notion-get-comments, notion-create-comment, notion-get-users)

Optional:
- Google Calendar MCP (list_events)
- Trello MCP (trello_get_tasks) — check config.trello.enabled
```

If a required MCP is unavailable, warn the user and skip that source. If Notion MCP is unavailable, run the triage but present tasks as a local summary without Notion creation.

### Step 2 — Check Notion database

Config points at the **Tasks Tracker** database
(`226e1848-bb51-80ab-8c0e-e431e66548d4`, data source
`collection://226e1848-bb51-80e6-b02b-000bf42f3fca`).

If `config.notion.databaseId` is null:
1. Tell the user the tasks database hasn't been configured yet
2. Offer to create it via Notion MCP `create-database` with the schema from the triage skill
3. Or instruct the user to point config.json at an existing DB
4. Do not proceed with Notion creation until the DB exists — but still run the triage and present results

### Step 3 — Scan all sources in parallel

Spawn parallel agents to scan each source:

**Agent 1 — Gmail** (uses gmail-triage skill Steps 1-4):
- Run the two parallel Gmail searches from config — the whole inbox, read and unread, plus starred
- Classify every thread: REPLY NEEDED / FLAG / ACTION / NOISE
- Priority-rank REPLY NEEDED threads
- Load project context from `projects/{client}/.claude/` for reply drafting
- Return classified threads with full content for actionable ones

**Agent 2 — Slack**:
- For each channel in config: `mcp__plugin_slack_slack__slack_read_channel(id, oldest: state.slack.channels[id].lastProcessed || lookbackTimestamp, limit: 100)`
- For each DM in config: `mcp__plugin_slack_slack__slack_read_channel(id, oldest: state.slack.dms[id].lastProcessed || lookbackTimestamp, limit: 100)`
- Classify messages using the same REPLY NEEDED / FLAG / ACTION / NOISE buckets
- Use config's client mapping to auto-assign clients
- For threads with replies, fetch full thread via `mcp__plugin_slack_slack__slack_read_thread`
- Return classified messages with permalinks
- Do **not** attempt to read anything in `config.slack.manualCheck` — those live in a
  different Slack workspace that this connection cannot see, and their IDs will return
  `channel_not_found`. Return them as a reminder list instead.

**Agent 3 — Calendar** (if available):
- `list_events` for the next `config.calendar.lookaheadDays` days
- Filter to events that imply preparation or follow-up
- Skip routine recurring events unless they have specific agendas
- Return actionable events with dates

**Agent 4 — Trello** (if enabled and available):
- Read configured boards
- Extract cards assigned to user or due within 7 days
- Return cards with URLs and due dates

**Agent 5 — Notion comments** (skip if `config.notion.comments.enabled` is false):
- Resolve the user's Notion user ID via `notion-get-users` if `state.userNotionId` is null,
  and return it so it can be cached
- If `state.commentWatch` is empty or was never bootstrapped, seed it first: `notion-search`
  the Tasks Tracker for tasks not `Done` or `Cancelled`, so comments on tasks predating
  `taskLinks` are not invisible. Say in the report that this run seeded the list
- Take the pages in `state.commentWatch`, oldest `lastCommentCheck` first, capped at
  `config.notion.comments.maxPagesPerRun`
- For each: `notion-get-comments(page_id, include_all_blocks: true)` — block-level
  discussions are where the user comments on a specific line of the brief, and they are
  invisible without the flag
- Skip any comment whose ID is already in `state.processedComments`
- Keep only comments authored by `state.userNotionId`. Return anyone else's as context, and
  never return triage's own replies as input
- Classify each using the shape table in the triage skill's `<notion_comments>` section:
  Instruction / Field change / Answer / Status signal / Question / Note
- Note the page's current `Status` so `Done` and `Cancelled` tasks can be dropped from the
  watch list
- Return each comment verbatim with its page ID, discussion ID, comment ID, and reading

This is a read-only pass. Nothing is written or replied to until Step 8.

### Step 4 — Extract tasks and draft replies

Using the results from all agents:

1. **Extract tasks** from every actionable item (following triage skill extraction rules)
1b. **Route Notion comments** from Agent 5 by their reading — instructions become Quick Wins
   when Doer is Claude, or task updates and subtasks otherwise; field changes and status
   signals become rows in the update table; answers get folded into the brief and unblock
   what they were holding up; questions get answered in Step 8; notes append to
   `Source Context`. A comment carrying two asks produces two actions
2. **Detect blockers** — scan for blocking language, unanswered threads, cross-task dependencies
3. **Create subtasks** where a task has 3+ distinct deliverables
4. **Draft replies** for REPLY NEEDED items:
   - Gmail: follow gmail-triage skill Step 6 rules
   - Slack: shorter, more casual, no formal sign-off
5. **Flag questions** — anything unclear goes in the questions list

### Step 4b — Inbox cleanup

Clear bulk newsletters out of the inbox, following the triage skill's `<inbox_cleanup>`
section in full. Run this after Step 4 so anything that produced a task, draft, or flag is
already known and automatically protected.

1. Read `config.gmail.cleanup`. Skip the pass if `enabled` is false, or if `--no-delete`
   or `--dry-run` was passed (in those cases still report what would have gone)
2. Search `{cleanup.query} newer_than:{cleanup.lookbackDays}d`, oldest first, capped at
   `maxPerRun`
3. Drop anything that is not broadcast mail — a real person's message is never a candidate
4. `get_thread` on every remaining candidate and read the body. A subject line never
   decides this
5. Keep anything holding a discount code, a receipt, a reminder, or anything actionable;
   anything from mymind; anything in `neverDelete` or `learnedKeep`; anything starred,
   important, labelled, or replied to; anything client-related; anything this run touched
6. `trash_thread` what is left — trash only, recoverable for 30 days. Never permanently
   delete, never mark as spam
7. Report every trashed and kept thread in the Inbox Cleanup section

If in doubt about any single thread, keep it. The full reasoning and the complete keep
tests live in the skill; do not shortcut them from this summary.

### Step 5 — Dedup against Notion

Notion's query tools require a Business plan and are unavailable here, so dedup runs
against the local `processedSourceIds` ledger in state.json. See the triage skill's
`<dedup>` section.

For each extracted task:
1. Check the Source ID against `state.processedSourceIds`
2. If found → do not create. Route it to the update pass instead: resolve the page via
   `state.taskLinks[sourceId]`, `notion-fetch` it, and decide whether the new activity
   changes any field. If nothing changed, drop it silently
3. If not found → check for semantic duplicates via `notion-search` (similar name + same client)
4. If semantic match → propose an update rather than a second task, and add to the questions
   list: "This looks like existing task 'X' — update that, or is this separate work?"

### Step 5b — Update pass

Independently of new tasks, review tasks that current source activity touches — including
every task the user commented on:

0. Comment-driven changes from Step 4 land here, in the same before/after table. The user
   saying "make this P0" in a comment is a proposed `Priority` change like any other, and it
   is the one case where `Done` may be proposed — see the Done exception in the skill
1. Blockers that cleared → propose `Waiting`/`Blocked` → `Inbox` and clearing `Blocked Reason`
2. New blockers, moved deadlines, added scope, changed ownership → propose the matching field change
3. Obsolete candidates → collect separately for individual confirmation

Always `notion-fetch` before proposing, so the "Now" column is a real value and not a guess.
See the triage skill's `<task_updates>` section for the full rules on which fields may change,
which status transitions are allowed, and why `Source Context` is append-only.

### Step 6 — Present triage report

Output the full triage report following the format in the triage skill:

```
── TRIAGE — {date} ──

## Replies Needed
## Draft Replies
## Your Notion Comments (verbatim + what each produced; omit if empty)
## New Tasks → Notion (with Doer column)
## Task Updates → Notion (before/after per field; omit if empty)
## Possibly Obsolete (confirm individually; omit if empty)
## Quick Tasks (under 15 min, sorted by hours; omit if empty)
## Quick Wins (Claude can do now)
## Blocked / Waiting Summary
## Flag / Action Items
## Questions for You
## Noise Summary
## Inbox Cleanup (trashed + kept, with reasons; omit if nothing eligible)
## Check Manually
```

Always end with a **Check Manually** section listing every entry in
`config.slack.manualCheck`, so these don't get silently missed:

```
## Check Manually
Not covered by automated triage — Claude Code can only hold one Slack
connection, currently Team Zissou:
- Skye High → #tamsen-web-dev (Tamsen Fadal)
- Skye High → DM with Yoni (Tamsen Fadal)
```

If anything actionable turns up there, paste it in and it will be triaged with
the rest.

### Step 7 — Ask for approval

Use AskUserQuestion with options:
- **"Approve all tasks, updates, and drafts" (Recommended)** — create tasks, apply field
  updates, run the comment-driven actions, post the replies that report them, and create
  email/Slack drafts. Never covers trashing
- **"Let me review individually"** — go through each task, update, and draft one by one
- **"Approve tasks only"** — create Notion tasks, skip reply drafts
- **"Approve drafts only"** — create reply drafts, skip Notion writes
- **"Skip everything"** — just save the triage report, don't create anything

If the Possibly Obsolete table has rows, ask about it as a **separate question**, listing
each task by name. No bulk approval ever reaches a trash operation.

### Step 8 — Execute approved actions

Based on user's choice:

**Notion task creation:**
1. Search Clients DB for each client name → get relation page IDs
2. Create parent tasks first, then subtasks (so the `Parent task` relation can be set)
3. Set all properties per the triage skill schema (including Doer)
4. Log each created task with Notion URL

**Notion task updates:**
1. `notion-fetch` each page and confirm the current value still matches the "Now" column the
   user approved against. If it has drifted, stop and re-ask
2. Apply only the approved fields via `notion-update-page` — omitted properties stay untouched
3. `Source Context` gets the existing text plus a new dated line, never a replacement
4. Never write `Task name` or any field in the never-write list
5. Log each task with the fields changed and its Notion URL

**Notion task trashing (only after individual confirmation):**
1. Re-fetch and confirm it is the task the user named
2. If it has subtasks, stop and ask what happens to the children first
3. Move to trash via `notion-update-page`, and tell the user it is recoverable for 30 days
4. Remove its `taskLinks` entry, keep its `processedSourceIds` entry

**Notion comment actions and replies:**
1. Run the approved comment-driven actions. Automatable ones execute here or in Step 8b as
   Quick Wins; field changes go through the update path above
2. For each thread where something actually happened, reply via
   `notion-create-comment(page_id, discussion_id, markdown)` saying what was done in a line
   or two — the concrete change, not "noted"
3. Answer any question comments with the real answer, doing whatever reading it takes first
4. Never reply on a thread whose action was skipped, deferred, or left as a question, and
   never reply to something only proposed
5. Leave every discussion unresolved — resolving is the user's signal, not triage's
6. Append every comment ID handled, including ones deliberately ignored, to
   `processedComments`

**Gmail draft creation:**
1. For each approved draft, call `mcp__claude_ai_Gmail__create_draft` with `replyToMessageId`
2. NEVER send — drafts only
3. Confirm: "Draft created for thread: {subject}"

**Slack reply sending:**
1. Show each Slack reply one more time for final confirmation
2. If approved, send via `mcp__plugin_slack_slack__slack_send_message`
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

1. Append the Source ID of every task that was actually created to `processedSourceIds`
2. Record `taskLinks[sourceId] = "<notion page url>"` for every task created
3. Drop `taskLinks` entries for any task trashed, keeping their `processedSourceIds` entries
4. Updates and cancellations change nothing else in state.json — Notion holds task state
5. Add every created task's page ID to `commentWatch`; stamp `lastCommentCheck` on every page
   read this run; drop entries for pages found `Done`, `Cancelled`, or missing
6. Append every handled comment ID to `processedComments`, and cache `userNotionId` if it
   was resolved this run
7. Write updated timestamps to `.claude/triage/state.json`
6. Print summary:
   ```
   ── Triage Complete ──
   Sources scanned: Gmail (X threads), Slack (Y messages), Calendar (Z events)
   Tasks created: N (P parent + S subtasks)
   Comments read: X (acted on: Y, replied: Z)
   Tasks updated: U (F fields)
   Tasks cancelled/trashed: C
   Drafts created: D
   Blocked/Waiting: B items
   Questions remaining: Q
   Newsletters trashed: N of M scanned (recoverable 30 days — top of Gmail's Trash)
   ```

## Arguments

The `/triage` command accepts optional arguments:

- `/triage` — full triage of all sources
- `/triage gmail` — Gmail only (uses gmail-triage skill directly)
- `/triage slack` — Slack only
- `/triage calendar` — Calendar only
- `/triage trello` — Trello only
- `/triage comments` — Notion task comments only (see Comments Mode below)
- `/triage add` — manually add tasks from conversation, bullet points, or free-text notes (see Manual Input Mode below)
- `/triage meeting` — process recent Notion call recordings/meeting notes (see Meeting Notes Mode below)
- `/triage --no-drafts` — extract tasks but skip reply drafting
- `/triage --dry-run` — scan and classify but don't create or change anything in Notion or Gmail
- `/triage --no-updates` — propose new tasks only; skip the update and obsolete passes
- `/triage --no-comments` — skip the Notion comment pass entirely
- `/triage --no-delete` — run everything else normally, but report the newsletter cleanup
  instead of trashing anything. Use this on the first run, or after changing the keep
  rules, to check the judgement before it acts
- `/triage cleanup` — the newsletter cleanup pass only, no task extraction or drafting

## Manual Input Mode (`/triage add`)

For ad-hoc task creation — after a client call, during project work, or any time you have tasks to capture.

### Usage

```
/triage add
```

Then provide tasks in any format:
- Bullet points: "- Build homepage\n- Update CMS\n- Send invoice"
- Free text: "After the call with Tomek we agreed to migrate the service pages, set up the Acuity embeds, and he'll send the FAQ content by Friday"
- Pasted call notes, meeting minutes, or voice-to-text transcripts

### Flow

1. Read the user's input (free text, bullets, pasted notes)
2. Extract tasks using the same triage skill rules (task naming, priority, subtasks, quick-task classification, blocked detection, Doer classification)
3. Auto-detect the client from context (project directory, names mentioned, or ask)
4. Set Source to "Manual" and Source Context to a summary of the input
5. Present the same approval table as the full triage:
   ```
   | # | Task | Priority | Hrs | Due | Client | Doer | Parent task | Status |
   ```
6. Ask clarifying questions about anything ambiguous (priorities, dates, scope)
7. On approval, create in Notion
8. Offer Quick Wins for any Claude-doable tasks

### Key difference from full triage

- No source scanning — works entirely from what the user provides
- No reply drafting — these aren't messages to respond to
- No state.json update — nothing to track "last processed"
- Still does Notion dedup, subtask creation, blocked detection, and Doer classification

## Meeting Notes Mode (`/triage meeting`)

Process Notion call recordings, meeting notes, and AI-generated meeting summaries to extract tasks.

### Usage

```
/triage meeting                    — process all unprocessed meeting notes
/triage meeting --client carsa     — only meetings tagged with a specific client
/triage meeting --since 2026-07-01 — only meetings since a specific date
```

### Flow

1. Query Notion for recent meeting notes via `notion-query-meeting-notes`
2. For each meeting note:
   a. Read the full content via `notion-fetch`
   b. Extract: action items, decisions, deadlines, blockers, follow-ups
   c. Identify the client from meeting title, participants, or content
   d. Check Source ID (`notion-meeting:{page-id}`) against existing tasks to skip already-processed meetings
3. Present extracted tasks in the standard approval table
4. Ask clarifying questions — especially about:
   - Vague action items ("we should look into X" — is this a task?)
   - Ownership ("Tomek will send FAQ content" — is this a task for you or just a dependency?)
   - Priority of items not explicitly marked as urgent
5. On approval, create tasks in Notion with:
   - Source: "Manual" (meeting notes are a manual input, not an automated scan)
   - Source Link: Notion URL of the meeting note
   - Source Context: key excerpt from the meeting note explaining the task
   - Source ID: `notion-meeting:{page-id}` for dedup
6. For decisions and non-task items, offer to add them as comments on existing related tasks or as notes in the project's `.claude/` directory

## Comments Mode (`/triage comments`)

Just the Notion comment pass — no source scanning, no drafting, no newsletter sweep. Run
Step 3's Agent 5, route the results through Step 4, and present only the comment section plus
whatever tables it feeds.

This is the cheap, run-it-any-time mode, and the one that saves the most admin. Leave comments
on tasks as you work through the day, run `/triage comments`, approve, and they are done —
without waiting for tomorrow morning's full run.

```
/triage comments                  — every watched task with unread comments
/triage comments --client carsa   — only tasks related to one client
/triage comments --dry-run        — read and classify, change nothing
```

Because no other pass has run, there is less surrounding context to disambiguate a terse
comment. Lean harder on asking: reading the wrong thing into "do the other one too" and acting
on it is worse than one question.

## Cleanup Mode (`/triage cleanup`)

Just the newsletter sweep — no task extraction, no drafting, no Notion. Run Step 4b on its
own and output only the Inbox Cleanup section.

Because nothing else has run, the "touched by this triage run" protection has nothing to
draw on, so lean harder on the other keep tests. `/triage cleanup --no-delete` reports
without trashing.

## Scheduled runs

The launchd agent in `scripts/triage-morning.plist` runs `/triage` on weekday mornings
with nobody watching. Two things change when the run is unattended:

- **Nothing that needs approval happens.** No Notion writes, no Slack sends, no email
  sends, and no comment replies. The run produces the report and the Gmail drafts, and
  everything requiring a decision waits in it for the user
- **Comments are still read**, and what each one would produce is written into the report,
  so the morning's first job is one approval rather than a re-read of everything commented
  on yesterday. Nothing is acted on or replied to until the user approves
- **The newsletter cleanup still runs**, because it is safe by construction rather than by
  approval — trash only, recoverable for 30 days, with the keep tests doing the work

The report is written to `.claude/triage/reports/{date}.md` so the user reads it when they
sit down. Set up or change the schedule with `scripts/triage-morning.plist`.

## Error handling

- If a source MCP is unavailable → warn and skip that source, continue with others
- If Notion MCP is unavailable → present tasks as local summary, offer to retry later
- If Notion DB doesn't exist yet → guide user through setup, still present triage results
- If a Slack channel returns an error → warn and skip, continue with other channels
- If a watched page 404s or is in the trash → drop it from `commentWatch` and carry on
- If the user's Notion user ID cannot be resolved → skip the comment pass and say why,
  rather than acting on comments whose author is unverified
- If state.json is missing or corrupt → treat as first run, use config lookback windows
