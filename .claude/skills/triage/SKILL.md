---
name: triage
description: Multi-source task triage — scans Gmail, Slack, Calendar, and Trello, extracts tasks, detects blockers, creates subtasks, drafts replies, and writes everything to Notion as self-contained briefs (verbatim ask, source links, assets, steps, acceptance criteria) so a task can be worked or handed off without opening anything else. Loaded by the /triage command. NEVER sends emails or Slack messages without explicit user approval.
---

<objective>
Scan all configured input sources (Gmail, Slack, Calendar, Trello), extract actionable tasks, detect blockers and dependencies, draft replies where needed, and create tasks in the Notion "Tasks Tracker" database. Notion is the source of truth — never overwrite existing tasks. Always ask the user when anything is unclear.
</objective>

<hard_rules>

## Ask questions — ALWAYS

This is the most important rule in this skill. When in doubt, ask. Never assume.

- Unclear whether something is a task → ask
- Can't identify the client → ask
- Priority ambiguous → ask
- Due date implied but not explicit ("next week", "soon", "ASAP") → ask to confirm the date
- Not sure if a reply is needed → ask
- Task might be a subtask of something existing in Notion → ask
- Blocked status uncertain → ask
- Message could be interpreted multiple ways → ask
- Not sure if this is new work or part of existing scope → ask

Group questions by source at the end of the triage output, not scattered throughout.

## Never auto-send

- NEVER send emails. Only create Gmail drafts via `create_draft`.
- NEVER send Slack messages without explicit user approval.
- NEVER create Notion tasks without showing the user first and getting approval.
- NEVER update existing Notion tasks — only create new ones. This protects tasks that
  existed before this run. Tasks created earlier in the same run are fair game: if the user
  answers an open question after a page is written, update that page's brief.
- NEVER delete anything from Notion.

## Notion is the source of truth

- Do not maintain a local task list. Notion is the only store.
- Respect manual edits in Notion — if a task exists, do not touch it.
- Dedup by Source ID before creating — check Notion first.

</hard_rules>

<prerequisites>

Required MCP tools (fully-qualified — these are the exact callable names on the connected servers):
- Gmail: `mcp__claude_ai_Gmail__search_threads`, `mcp__claude_ai_Gmail__get_thread`, `mcp__claude_ai_Gmail__create_draft`, `mcp__claude_ai_Gmail__list_labels`
- Slack: `mcp__plugin_slack_slack__slack_read_channel`, `mcp__plugin_slack_slack__slack_read_thread`, `mcp__plugin_slack_slack__slack_search_public_and_private`, `mcp__plugin_slack_slack__slack_send_message`
- Google Calendar: `list_events`, `get_event`
- Notion: `notion-search`, `notion-create-pages`, `notion-query-database-view`
- Trello (optional): `trello_get_tasks`, `trello_analyze_board`

Config files:
- `.claude/triage/config.json` — source configuration (channels, lookback windows)
- `.claude/triage/state.json` — last-processed timestamps per source

Skills to load:
- `gmail-triage` — email classification, priority ranking, reply drafting, tone rules

</prerequisites>

<notion_schema>

## Tasks Tracker Database

Data source: `collection://226e1848-bb51-80e6-b02b-000bf42f3fca`

Property names below are the **exact** spelling and capitalisation in Notion. Several use
sentence case (`Task name`, `Due date`, `Parent task`) — do not Title Case them or the write
will fail.

| Property | Type | Values / Notes |
|----------|------|----------------|
| Task name | title | Plain English, e.g. "Reply to Alex about Phase B pricing" |
| Status | status | Inbox, To Do, In progress, Waiting, Blocked, Done, Cancelled (plus Someday, Awaiting feedback, In Testing — user-managed, never set by triage). Note the lowercase `p` in "In progress" |
| Priority | select | P0, P1, P2, P3 |
| Due date | date | Optional. Only set when explicitly stated or confirmed by user |
| Source | select | Gmail, Slack, Calendar, Trello, Meeting, Manual |
| Source Link | url | Permalink to original message/event |
| Source Context | text | 2-3 sentences: why this was flagged + key excerpt. The at-a-glance line in list views — the full brief goes in the page body, see <task_brief> |
| Source ID | text | Dedup key: Gmail thread ID, Slack channel:ts, Calendar event ID |
| Clients | relation | Two-way relation to Clients DB (collection://229e1848-bb51-8018-888c-000b6dbead72) |
| Tags | multi_select | Flexible categorisation |
| Parent task | relation | Self-relation for subtask hierarchy. Limit 1 |
| Sub-task | relation | Reverse of Parent task |
| Blocked by | relation | Self-relation. Use only when the blocker is another task in this DB |
| Blocked Reason | text | Free-text blocker that isn't a task — "waiting on Tomek to confirm calendar IDs" |
| Doer | select | Claude, User, User + Claude, External |

### Properties triage must never write

Tasks Tracker predates this skill and carries fields owned by the user or other workflows.
Never set: `Description`, `Assignee`, `Person`, `Estimates`, `Hours Estimate`, `Price`,
`Task type`, `Scheduled for`, `Webflow Link`, `Figma File`, `Google Drive File`, `Notes`,
`Attach file`, `AI keywords`, `Blocking`.

In particular `Description` is the user's own field. Triage writes its short summary to
`Source Context` and the full brief to the page body — never to `Description`.

### Doer classification

Every task gets a Doer value. This determines what happens after triage.

| Doer | Meaning | Examples |
|------|---------|----------|
| **Claude** | Claude can complete this autonomously via existing commands/skills | Draft a reply, generate schema, run an audit, write code, create a spec, update Notion |
| **User** | Only the user can do this — requires human judgement, presence, or access Claude doesn't have | Make a phone call, attend a meeting, approve a design, make a business decision, log into a third-party dashboard |
| **User + Claude** | User drives but Claude assists significantly via MCP or code | Build a page in Webflow (user + /client-build), review a design (user + /design-review), populate CMS items |
| **External** | Depends on someone else entirely — nothing to do until they respond | Waiting on client reply, third-party DNS setup, pending invoice payment |

### Mapping Doer to commands

When Doer is "Claude", identify the specific command or skill that can execute the task:

| Task pattern | Command/Skill |
|--------------|--------------|
| Draft a reply (Gmail) | `mcp__claude_ai_Gmail__create_draft` via gmail-triage |
| Draft a reply (Slack) | `mcp__plugin_slack_slack__slack_send_message` via Slack MCP |
| Generate JSON-LD schema | `/generate-schema` |
| Run a site audit | `/site-audit` |
| Run an SEO check | `/site-audit` or seo agent |
| Write or update code | `/build` |
| Write a spec or plan | `/plan` |
| Create a proposal or estimate | `/proposal` or `/estimate` |
| Review copy or content | `/copy-review` |
| Run QA checks | `/qa-check` |
| Scan Vinted inventory | `/zissou-scan` |

If no matching command exists, set Doer to "User + Claude" and note what Claude can help with.

### Status definitions

| Status | Meaning | Set by |
|--------|---------|--------|
| Inbox | Just triaged, not yet reviewed by user | /triage auto |
| To Do | User confirmed it's real, not started | User in Notion |
| In progress | Active work | User in Notion |
| Waiting | Blocked on someone else (e.g. no reply) | /triage auto or user |
| Blocked | Blocked on another task | /triage auto or user |
| Done | Complete | User in Notion |
| Cancelled | Dropped | User in Notion |

Tasks Tracker also carries `Someday`, `Awaiting feedback`, and `In Testing`. These are the
user's own workflow states. Triage reads them but never writes them.

### When to set Waiting vs Blocked

- **Waiting**: depends on an external person responding — "waiting on Tomek to confirm calendar IDs".
  Record the reason in `Blocked Reason` (text). Leave `Blocked by` empty — a person is not a task.
- **Blocked**: depends on another task completing — "blocked by CMS collection setup".
  Link the blocking task via the `Blocked by` relation. Add `Blocked Reason` only if the
  relation alone doesn't explain it.

</notion_schema>

<task_extraction>

## Deciding what is a task

A message becomes a task when it implies work the user needs to do. Look for:

- Direct requests: "Can you...", "Please...", "We need..."
- Questions requiring research or a decision before replying
- Commitments: "I'll send that over", "Let me check"
- Deadlines: "by Friday", "before the call", "this week"
- Follow-ups: "Just checking in on...", "Any update on..."
- Implied work: "The service pages need updating" (even if not directly asked)

A message is NOT a task when:
- It's purely informational with no action needed
- It's a thank-you or acknowledgement
- It's noise (newsletters, receipts, notifications)
- The action has already been completed

## Task naming

- Plain English, start with a verb: "Reply to...", "Build...", "Review...", "Send..."
- Include the subject: "Reply to Alex about Phase B pricing" not just "Reply to email"
- Keep under 80 characters

## Priority assignment

| Priority | Criteria |
|----------|----------|
| P0 | Deadline today/tomorrow, or someone is actively blocked by the user |
| P1 | Deadline this week, or client waiting on a deliverable |
| P2 | No urgent deadline, but real work that needs doing |
| P3 | Nice-to-have, low urgency, or speculative |

When priority is ambiguous, **ask the user**.

## Subtask creation

Create subtasks when a task has 3+ distinct deliverables, phases, or pages. Examples:

**Create subtasks:**
- "Build Carsa service migration" → Hub page, Location template, Winter health check, Schema, Redirects
- "NEM Life Phase B" → Quiz page, Results logic, CMS setup, Testing
- "TSC website content update" → Homepage, About, Products, Services

**Keep flat (no subtasks):**
- "Reply to Tomek about service page ETA"
- "Review Carsa VDP performance results"
- "Update DNS records for coconut.com"

When creating subtasks:
1. Create the parent task first
2. Create each subtask with `Parent task` relation pointing to the parent
3. Parent task status stays "Inbox" — subtasks drive progress
4. If some subtasks are blocked, mark those individually, not the parent

## Blocked detection

Look for blocking signals in messages:

- **Explicit**: "waiting on", "can't proceed until", "need X before", "blocked by", "depends on"
- **Implicit**: user asked a question in a thread, no response received (flag as Waiting)
- **Cross-task**: new task clearly depends on an existing Notion task

When a task is blocked/waiting:
1. Set Status to "Waiting" or "Blocked"
2. Record the blocker — `Blocked by` relation if it's another task, otherwise `Blocked Reason` text
3. Include in the Blocked/Waiting summary at the end of triage output

</task_extraction>

<task_brief>

## Every task carries its own brief

The point of a triaged task is that it can be picked up cold. Open it three weeks later, or
hand it to a freelancer, and work starts immediately. If the page only says "Reply to Tomek
about the service pages", the reader still has to re-read Slack, work out which pages, find
the spec, and remember which URL is staging. That reconstruction cost is the whole reason
the task felt heavy in the first place — a brief is what removes it.

So write a brief into the page body of every task. The test to hold in mind:

> Could someone who has never seen the original thread pick this up and finish it,
> without asking a question or opening another tool?

Where it goes: the `content` field of `notion-create-pages`, in Notion-flavored Markdown.
Read `notion://docs/enhanced-markdown-spec` via `notion-fetch` once per run before the first
write — the dialect has its own rules for tables, callouts and toggles, and guessing
produces pages that render badly.

Do not put the brief in the `Description` property. That property belongs to the user (see
"Properties triage must never write"), and it is flat text that cannot carry headings or
links. `Source Context` also stays as it is: two or three sentences that make sense at a
glance in a Notion list view. The page body is the only place the full brief goes.

## Gather context before writing briefs — once per client, not once per task

A brief is only as good as what you know when you write it. Before writing briefs for a
client, read that client's context once and reuse it across every task for them in this run:

| Read | For |
|------|-----|
| `projects/{client}/.claude/intake.json` | staging + live URLs, page slugs and IDs |
| `projects/{client}/.claude/client.md` | contacts, who owns what, engagement scope |
| `projects/{client}/.claude/specs/` | an existing spec that already covers this work |
| `projects/{client}/.claude/brand-voice.md` | anything copy-related |
| `projects/{client}/.claude/research/` | screenshots and audits already captured |

If a client has no project directory, say so in the brief rather than guessing at URLs.

## Never invent context

A brief containing a plausible-but-wrong staging URL or an invented acceptance criterion is
worse than a thin one, because it will be trusted and acted on. Every line must trace to one
of three things:

- the source message, event, or meeting note — quote it
- a file actually read in this repo — cite the path
- `config.json` or the client's `intake.json`

Anything else is an open question. Put it under **Open questions** in the brief and raise the
same point in the run's "Questions for You" — the two lists should agree. When the user
answers during the approval step, fold the answer into the brief before creating the page.

## How deep to go

Depth follows the work, not a template. Three rough tiers:

**Quick** — a reply, a one-line change, a single decision. The verbatim ask plus the link is
the entire brief; four or five lines. Headings would be noise.

**Standard** — one real deliverable. Use the skeleton below, dropping any section with
nothing true to put in it.

**Parent with subtasks** — the parent brief carries the goal, the shape of the work, and a
map of the subtasks. Each subtask gets its own brief scoped to its slice, restating the
client and target page in one line so it stands alone. A subtask that forces the reader to
open the parent just to learn which site they are on has failed the test.

## Skeleton

    ## The ask
    > Verbatim quote of the sentence that created this task.

    — Who said it, where, when. [link to source]

    ## Context
    What a stranger needs in order to make sense of the ask.

    ## Done when
    - [ ] Checkable outcomes, not activities.

    ## Steps
    1. Ordered, one action each.

    ## Where things live
    - Source thread — [link]
    - Live page — [url]
    - Staging — [url]
    - Spec — `path`
    - Assets — [link or path]

    ## Open questions
    - Anything unresolved, and who can answer it.

A plain bulleted list is used for "Where things live" on purpose. Notion-flavored Markdown
does not support pipe tables — they need `<table>` XML — and a link list reads just as well
while being far harder to get wrong. `references/task-brief.md` covers the rest of the
dialect's traps.

The verbatim quote does more work than any summary — it is the single thing that reliably
removes the trip back to Slack, because it preserves wording and tone that a paraphrase
loses. Quote the operative lines, not the whole thread: a brief nobody reads is no better
than no brief at all.

## Assets travel by link, not by copy

- Slack files and images have permalinks in the message payload — use them.
- Gmail attachments cannot be linked directly. Name the file, note its type, and link the
  thread, so the reader knows what they are looking for and where it lives.
- Figma, Drive, Loom and Jam URLs pasted into a message go into the brief exactly as
  written. Never reconstruct one from memory — a wrong Figma link costs more than a missing
  one.
- Screenshots and audits already captured in the repo go in as their path.

Do not re-upload files into Notion by default. It duplicates assets and they drift out of
sync with the source. Offer it only when an asset is small, critical, and likely to expire.

## Make the handoff back to Claude work

When Doer is "Claude" or "User + Claude", end the brief with the command that would execute
the task, arguments included:

    Run with: `/generate-schema --client carsa --page /mot-and-car-servicing`

This is what lets a task be handed straight back to Claude later without re-deriving
anything, and it makes the Quick Wins section of the report cheap to act on.

Full template, worked examples at all three depths, and the Notion-Markdown gotchas that
break page rendering: `references/task-brief.md`. Read it before writing the first brief of
a run — the examples are what separate a brief that reads as useful from one that reads as
filler.

</task_brief>

<source_scanning>

## Gmail

Handled by the `gmail-triage` skill. Load it and run Steps 1-4 from that skill:
1. Scan inbox (unread + starred, parallel queries from config)
2. Classify: REPLY NEEDED / FLAG / ACTION / NOISE
3. Priority-rank REPLY NEEDED threads
4. Load project context from `projects/{client}/.claude/`

After gmail-triage classification:
- REPLY NEEDED threads → extract task + draft reply
- FLAG / ACTION threads → extract task (no reply needed)
- NOISE → skip

## Slack

For each channel and DM in config:

1. Load the channel via `mcp__plugin_slack_slack__slack_read_channel(channel_id, oldest: lastProcessedTimestamp, limit: 100)`
2. For DMs, use the DM ID directly — same tool, same params
3. Classify each message/thread using the same REPLY NEEDED / FLAG / ACTION / NOISE buckets
4. For threads with replies, use `mcp__plugin_slack_slack__slack_read_thread` to get full context
5. Extract tasks from actionable messages

### Slack permalink construction

From a message's `channel_id` and `message_ts`:
```
https://app.slack.com/archives/{channel_id}/p{ts_without_dot}
```
Example: channel `C0973LJ2BTJ`, ts `1720278000.123456` →
`https://app.slack.com/archives/C0973LJ2BTJ/p1720278000123456`

### Slack client mapping

Use the client field from config.json to auto-assign the `Clients` relation:
- Messages in `C0973LJ2BTJ` → Client: Carsa
- Messages in `D049YCR485C` → Client: Tamsen Fadal
- etc.

## Calendar

1. `list_events` for the next N days (from config lookaheadDays)
2. Extract tasks from events that imply preparation or follow-up:
   - Meetings with agendas → "Prepare for meeting with X"
   - Deadlines in event titles → task with due date
   - Events with action items in description → individual tasks
3. Skip recurring events that are routine (standups, etc.) unless they have specific agenda items

## Trello

When enabled in config:
1. Read boards configured in config
2. Extract cards assigned to the user or due soon
3. Map to tasks with Trello card URL as Source Link

## Manual input (`/triage add`)

For ad-hoc task creation from conversation, call notes, or free text.

1. Accept any input format — bullet points, free text, pasted call notes, voice-to-text transcripts
2. Extract tasks using the same rules as automated sources (naming, priority, subtasks, blocked detection, Doer)
3. Auto-detect client from:
   - Current working directory (if inside `projects/{client}/`)
   - Names mentioned in the text ("Tomek" → Carsa, "Yoni" → Tamsen Fadal, "Alex" → NEM Life)
   - If ambiguous → ask
4. Set Source to "Manual", Source Context to a summary of the user's input
5. No Source Link unless the user provides one
6. No state.json update — nothing to track
7. Still does: Notion dedup, subtask creation, blocked detection, Doer classification, Quick Wins

### Client name mapping (for auto-detection)

| Name/keyword | Client |
|--------------|--------|
| Tomek, Rishi, Carsa, carsa.co.uk | Carsa |
| Yoni, Tamsen, Skye High, tamsen fadal | Tamsen Fadal |
| Alex, NEM, nem-life | NEM Life |
| Romain, TSC, Signalling Company | The Signalling Company |
| Laura, Coconut, getcoconut | Coconut |
| Mariann, ulobby, ULobby | ULobby |

When a name appears in the input but isn't in this table → ask: "Who is {name}? Which client?"

## Notion meeting notes (`/triage meeting`)

Process call recordings and meeting notes stored in Notion.

1. Query Notion for meeting notes via `notion-query-meeting-notes`
   - Filter by date range (default: last 7 days, or `--since` flag)
   - Filter by client tag if `--client` flag provided
2. For each meeting note, read full content via `notion-fetch`
3. Extract from meeting content:
   - **Action items**: explicit "to do", "action", "will do", "need to" items
   - **Decisions**: "agreed to", "decided", "confirmed" — store as Source Context, not tasks unless they imply work
   - **Deadlines**: "by Friday", "next week", "before launch"
   - **Blockers**: "waiting on", "can't proceed", "need X first"
   - **Follow-ups**: "check back on", "revisit", "circle back"
4. Ownership detection — distinguish between:
   - Tasks for the user: "I'll send the proposal", "Will to set up CMS"
   - Tasks for the client/others: "Tomek will send FAQ content" → create as a dependency (Doer: External, Status: Waiting), not a task for the user to do
   - Shared tasks: "We'll review the designs together" → Doer: User + Claude or User
5. Dedup via Source ID: `notion-meeting:{page-id}` — skip already-processed meetings
6. For non-task content (decisions, context, background):
   - Offer to save to `projects/{client}/.claude/notes.md` or relevant spec file
   - Or add as a comment on an existing related Notion task

</source_scanning>

<reply_drafting>

## Gmail replies

Follow the gmail-triage skill's Step 6 rules exactly:
- Match the user's voice: professional but warm, concise, no filler
- "Hi {name}," opening, "Kind regards, Will" sign-off
- Reference project context from monorepo
- Flag gaps with `[QUESTION FOR YOU: ...]`
- Present for approval before calling `create_draft`

## Slack replies

Draft Slack replies following similar principles:
- Match the user's Slack voice (shorter, more casual than email)
- No formal sign-off needed
- Reference specific details from the thread
- Present as a quoted block for approval
- If approved, send via Slack MCP `mcp__plugin_slack_slack__slack_send_message` (with explicit user confirmation)
- If Slack MCP send is unavailable, present as a copy-paste block

</reply_drafting>

<dedup>

## Preventing duplicate tasks

### Constraint: no exact-match querying

`notion-query-data-sources` and `notion-query-database-view` both require a Notion Business
plan with Notion AI. This workspace is not on that plan — both return HTTP 400. So there is
**no way to query Notion for `Source ID = X`**. `notion-search` works, but it is a semantic
search and will not reliably match an opaque ID like a Gmail thread ID.

Dedup therefore runs against a **local ledger** of already-processed Source IDs, with
Notion search as a fallback safety net.

### The ledger

`.claude/triage/state.json` holds `processedSourceIds` — an append-only array of every
Source ID that has been turned into a task. This is a dedup ledger, not a task list; it
stores IDs only, never task state. Notion remains the source of truth for tasks.

### Procedure

Before creating any task:

1. Build the Source ID:
   - Gmail: thread ID
   - Slack: `channel_id:message_ts`
   - Calendar: event ID
   - Trello: card ID
   - Meeting notes: `notion-meeting:{page-id}`
2. If the ID is in `processedSourceIds` → skip (do not update, do not mention in output)
3. If not → run `notion-search` for the task's likely name, scoped to the Tasks Tracker
   data source. If a close match exists for the same client, add to the questions list:
   "This looks similar to existing task 'X' — same thing or separate?"
4. Otherwise → include in the "New Tasks" table for approval
5. After the user approves and the task is created, append the Source ID to
   `processedSourceIds`

Only append IDs for tasks that were **actually created**. If the user skips a task, leave
its ID out so a later run can surface it again.

### If the ledger is lost

Deleting `state.json` means the next run re-proposes every task in the lookback window.
Nothing is auto-created — the approval gate still stands — so the failure mode is a noisy
triage report, not duplicate tasks in Notion.

</dedup>

<output_format>

## Triage output structure

Present the full triage as a single structured report:

```
── TRIAGE — {date} ──

## Replies Needed
| # | Source | From | Thread/Channel | What they need | Draft ready? |
|---|--------|------|----------------|----------------|-------------|

## Draft Replies
Present each draft in a quoted block with:
- Source (Gmail/Slack), recipient, thread subject
- The draft text
- Any [QUESTION FOR YOU: ...] flags inline

## New Tasks → Notion (approve before creating)
| # | Task | Priority | Due | Client | Doer | Source | Parent task | Status | Brief |
|---|------|----------|-----|--------|------|--------|-------------|--------|-------|

`Brief` is the depth written for that task — quick / standard / parent — so the user can
see at a glance which tasks got a full write-up.

## Gaps in Briefs
Every **Open questions** entry across all the briefs, grouped by task. These are the parts
of a brief that could not be filled from the source or the repo.

This is the most valuable thing to surface at approval time: an answer given here lands in
the page body before it is written, which is the difference between a task that is genuinely
self-contained and one that is nearly so. Ask these before creating anything, and fold the
answers in.

Do not print the full briefs by default — the report stays scannable. Offer instead:
"Show the full brief for any task by number."

## Quick Wins (Claude can do now)
List tasks where Doer is "Claude" with the command that would execute them.
Offer to run them immediately after task creation:
- "Task name" → `/command` or action description
After presenting, ask: "Run all quick wins? / Pick individually? / Skip?"

## Blocked / Waiting Summary
Surfaces stale blockers and unanswered threads:
- Task name — status — how long — what's needed

## Flag / Action Items
Non-reply actions the user needs to take outside this tool.

## Questions for You
Numbered list, grouped by source. Everything that was unclear during scanning.

## Noise Summary
Brief counts by category per source. No detail needed.
```

After presenting, use AskUserQuestion:
- "Approve all tasks and drafts"
- "Let me review individually"
- "Skip tasks, just send the drafts"
- "Skip everything"

</output_format>

<state_management>

## Updating state.json after each run

After the triage is complete and tasks are created:

1. Update `lastRun` to current ISO timestamp
2. For Gmail: set `lastProcessed` to the timestamp of the newest processed thread
3. For each Slack channel/DM: set the channel's `lastProcessed` to the newest `message_ts`
4. For Calendar: set `lastProcessed` to current ISO timestamp
5. For Trello: set `lastProcessed` to current ISO timestamp
6. Append the Source ID of every task that was actually created to `processedSourceIds`
7. Write the updated state to `.claude/triage/state.json`

On next run, use these timestamps to only fetch new items since last triage.

If state.json has null timestamps (first run), use the lookback windows from config.json.

</state_management>

<notion_creation>

## Creating tasks in Notion

For each approved task:

1. Search Clients DB for the client name, get the page ID for the `Clients` relation
2. If the task has a parent:
   a. Search Tasks Tracker for the parent by name + client
   b. If found, use its page ID for the `Parent task` relation
   c. If not found, create the parent first, then link
3. Create the task page with all properties **and its brief**:
   - Use the Tasks Tracker data source ID from config as the parent
   - Pass the brief as `content` — this is the deliverable, not an extra. See <task_brief>
   - Set `Source ID` for future dedup
   - Set `Source Link` for easy reference
   - Set `Source Context` with the reasoning — never `Description`
   - Set `Clients` relation
   - Set `Parent task` relation (if subtask)
   - Set `Blocked by` relation and/or `Blocked Reason` (if blocked/waiting)
   - Set `Status` to Inbox (unless Waiting/Blocked detected)
   - Set `Due date` only if explicitly confirmed
   - Set `Priority`
   - Set `Doer`
4. Log the created task name + Notion URL

Batch the creates. `notion-create-pages` takes up to 100 pages in one call, and each page
carries its own `content`, so a run's worth of tasks is normally one call — with the
exception of subtasks, which need the parent's page ID before they can be linked.

A task written without a brief is not finished. If context-gathering failed for a client —
no project directory, an unreachable source — still write the brief from what the message
itself contains, and list the missing pieces under **Open questions**. A brief that is
honest about its gaps is useful; a task page that is empty is not.

## First-run setup

If `notion.databaseId` is null in config.json:
1. Tell the user they need to point config.json at a tasks database
2. Provide the exact schema from <notion_schema> above
3. After setup, they should update config.json with the database ID and data source ID
4. Alternatively, if Notion MCP `create-database` works, offer to create it automatically

</notion_creation>

<success_criteria>
- All configured sources scanned without errors (skip unavailable sources with a warning)
- Every actionable message classified and either: extracted as task, flagged for reply, or asked about
- No duplicate tasks created (Source ID dedup)
- All questions about unclear items presented to user
- Draft replies shown for approval before any draft is created
- Tasks only created in Notion after user approval
- State.json updated with new timestamps after completion
- Blocked/Waiting items surfaced in summary
- Subtasks linked to parent tasks via relation
- Every created task has a brief in its page body, at a depth that matches the work
- Every brief quotes the ask verbatim and links back to its source
- Every URL, path and deadline in a brief traces to the source or a file that was read —
  nothing invented, gaps declared under Open questions
- Briefs for Claude-doable tasks name the command that would run them
- The user could work each task, or hand it to someone else, without opening another tool
</success_criteria>
