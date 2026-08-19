---
name: triage
description: Multi-source task triage — scans Gmail, Slack, Calendar, and Trello, extracts tasks, detects blockers, creates subtasks, drafts replies, and writes everything to Notion as self-contained briefs (verbatim ask, source links, assets, steps, acceptance criteria) so a task can be worked or handed off without opening anything else. Also keeps existing Notion tasks current: proposes field updates when new information arrives and flags obsolete tasks for cancelling. Flags sub-15-minute tasks as Quick, files them under a Quick Tasks mother task at P0 with an hours estimate so they can be sorted by size and cleared in a batch. Loaded by the /triage command. NEVER sends emails or Slack messages, and NEVER writes to Notion, without explicit user approval.
---

<objective>
Scan all configured input sources (Gmail, Slack, Calendar, Trello), extract actionable tasks, detect blockers and dependencies, draft replies where needed, create tasks in the Notion "Tasks Tracker" database, and keep tasks already in there current as new information arrives. Notion is the source of truth. Every write — create, update, or trash — happens only after the user approves that specific change. Always ask when anything is unclear.
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

## Never act without approval

- NEVER send emails. Only create Gmail drafts via `create_draft`.
- NEVER send Slack messages without explicit user approval.
- NEVER create Notion tasks without showing the user first and getting approval.
- NEVER update an existing Notion task without showing the exact before and after values
  and getting approval for that change.
- NEVER trash a Notion task on a bulk "approve all". Trashing is confirmed one task at a
  time, or not at all.
- NEVER write to a field in the never-write list in <notion_schema>. That list applies on
  update exactly as it does on create.

## Notion is the source of truth

- Do not maintain a local task list. Notion is the only store. `state.json` is a dedup
  ledger and a Source ID to page map, never a copy of task state.
- Respect the user's manual edits. Triage owns a narrow set of fields; everything else in
  a task belongs to the user. See "Fields triage may update" in <task_updates>.
- Dedup by Source ID before creating.
- Prefer updating an existing task over creating a near-duplicate. Two tasks describing the
  same work is a worse outcome than one task with a stale field.
- Prefer proposing `Cancelled` over trashing. Cancelling is reversible and keeps the
  record of what was once real.

</hard_rules>

<prerequisites>

Required MCP tools (fully-qualified — these are the exact callable names on the connected servers):
- Gmail: `mcp__claude_ai_Gmail__search_threads`, `mcp__claude_ai_Gmail__get_thread`, `mcp__claude_ai_Gmail__create_draft`, `mcp__claude_ai_Gmail__list_labels`
- Slack: `mcp__plugin_slack_slack__slack_read_channel`, `mcp__plugin_slack_slack__slack_read_thread`, `mcp__plugin_slack_slack__slack_search_public_and_private`, `mcp__plugin_slack_slack__slack_send_message`
- Google Calendar: `list_events`, `get_event`
- Notion: `notion-search`, `notion-create-pages`, `notion-fetch`, `notion-update-page`, `notion-query-database-view`
- Trello (optional): `trello_get_tasks`, `trello_analyze_board`

Config files:
- `.claude/triage/config.json` — source configuration (channels, lookback windows)
- `.claude/triage/state.json` — last-processed timestamps per source, the Source ID dedup
  ledger, the `taskLinks` map from Source ID to Notion page URL, and `quickTasksParent`,
  the cached page URL of the Quick Tasks mother task (`null` until first resolved)

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
| Tags | multi_select | Flexible categorisation. `Quick` marks a sub-15-minute task, see <quick_tasks> |
| Hours Estimate | number | Hours, decimal. Quick tasks only — `0.25` for 15 min. Otherwise user-owned, see the exception note below |
| Parent task | relation | Self-relation for subtask hierarchy. Limit 1 |
| Sub-task | relation | Reverse of Parent task |
| Blocked by | relation | Self-relation. Use only when the blocker is another task in this DB |
| Blocked Reason | text | Free-text blocker that isn't a task — "waiting on Tomek to confirm calendar IDs" |
| Doer | select | Claude, User, User + Claude, External |

### Properties triage must never write

Tasks Tracker predates this skill and carries fields owned by the user or other workflows.
Never set: `Description`, `Assignee`, `Person`, `Estimates`, `Price`,
`Task type`, `Scheduled for`, `Webflow Link`, `Figma File`, `Google Drive File`, `Notes`,
`Attach file`, `AI keywords`, `Blocking`.

In particular `Description` is the user's own field. Triage writes its short summary to
`Source Context` and the full brief to the page body — never to `Description`.

`Hours Estimate` is a narrow exception, not a free field. Triage writes it only for quick
tasks, only when it is empty, and never overwrites a value the user has set. Everywhere
else it stays user-owned. See <quick_tasks>. The `Estimates` select is a different field
and remains off limits entirely — it is coarse (its smallest option is "S (< 1 hour)") and
cannot express fifteen minutes.

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
| P0 | Deadline today/tomorrow, someone is actively blocked by the user, **or the task is quick** |
| P1 | Deadline this week, or client waiting on a deliverable |
| P2 | No urgent deadline, but real work that needs doing |
| P3 | Nice-to-have, low urgency, or speculative |

When priority is ambiguous, **ask the user**.

P0 therefore carries two distinct meanings: "this is urgent" and "this is cheap, clear it
in the next gap". They are told apart by the `Quick` tag and by sitting under the Quick
Tasks mother task, not by the priority value. See <quick_tasks>.

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

<quick_tasks>

## Quick tasks

A quick task is one the user can finish in a single sitting without having to think about
it first. Catching them is worth doing because they are the tasks most likely to sit at P2
behind ten bigger things when clearing them would have cost two minutes.

### The test

All four must hold:

1. Under ~15 minutes of actual work
2. A single step — one action, not a sequence
3. No dependencies — nothing to wait on, nobody to chase
4. No decision or research needed — the answer is already known

If any one fails, it is not quick. A task that takes five minutes but needs a decision
first is not quick, because the decision is the real work and it has no fixed size.

Quick says nothing about whether the task matters. A quick task can still be urgent, and
an urgent task is usually not quick. Do not use the tag to mean "unimportant".

### What triage sets

| Field | Value |
|-------|-------|
| `Priority` | `P0` |
| `Hours Estimate` | `0.25` for a normal quick task, `0.1` for something near-instant |
| `Tags` | add `Quick`, keeping any tags already there |
| `Parent task` | the **Quick Tasks** mother task — see below |

`Hours Estimate` is what makes the batch sortable by size, so it is set on the individual
task, never only on the mother. Same for `Priority`: a P0-filtered view should show the
quick tasks themselves, not one container row the user has to click into.

### The Quick Tasks mother task

One task in Tasks Tracker named exactly `Quick Tasks` holds them all.

Resolving it, in order:

1. `quickTasksParent` in state.json — the cached page URL
2. `notion-search` scoped to the Tasks Tracker data source for a task named `Quick Tasks`
3. If neither finds it, propose creating it as part of the approval batch, then cache the
   URL in `quickTasksParent`

The mother task itself: `Status` Inbox, `Priority` P0, `Doer` User, no `Due date`, no
`Source`, no `Clients`. It is a container, not work. Never write a brief into its page
body, never propose it as obsolete however long it sits, and never let it inherit a client
relation from its children.

### When a task already has a natural parent

`Parent task` has a limit of 1, so a quick task that genuinely belongs to a project parent
cannot also sit under Quick Tasks. **The project parent wins** — pulling a subtask out of
the build it belongs to breaks the structure that build depends on, and saves nothing.

That task still gets `P0`, `Hours Estimate`, and the `Quick` tag. The tag is what keeps it
findable, which is precisely why the tag exists alongside the mother task rather than
being redundant with it.

### Limits

- Never reparent an **existing** task into Quick Tasks during an update pass. A task the
  user has already filed somewhere stays filed. Surface it as a proposal instead.
- If a single run produces more than about eight quick tasks, say so rather than filing
  them all. That many usually means the threshold is being applied too loosely, and a
  Quick Tasks list that needs its own triage has defeated the point.
- Write `Hours Estimate` only when it is empty. Never overwrite a number the user set.
- Briefs for quick tasks use the **quick** depth from <task_brief> — the verbatim ask plus
  the link. A fifteen-minute task does not need a full skeleton.

</quick_tasks>

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

### Channels that must be checked manually

Some Slack sources are not reachable via MCP — the app is not installed in that
workspace, or the ID is stale. `slack_read_channel` returns `channel_not_found` for
these. They are marked in config.json with `"manualCheck": true`.

**Do not try to read them, and do not treat the failure as an error.** Instead, always
end the triage report with a Manual Slack Check section listing every source flagged
`manualCheck`, so the user knows to open those conversations themselves:

```
## ⚠️ Check These Slack Channels Manually
Not reachable via MCP — open in Slack and scan for anything actionable:
- #skye-high-tamsen-fadal (Tamsen Fadal)
- DM with Yoni (Tamsen Fadal)
```

This section appears on **every** run, whether or not anything else was found. If the
user surfaces a task from one of these manually, create it with Source `Slack` and a
Source ID of `slack:manual:{short-slug}`, since there is no message_ts to key on.

Never advance `lastProcessed` for a `manualCheck` source — there is nothing to record.

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
2. If the ID is in `processedSourceIds` → do not create a new task; this source already
   produced one. Hand the item to <task_updates> instead: look up the existing page via
   `taskLinks` and decide whether the new activity changes anything. If nothing has
   changed, drop it silently and do not mention it in the output.
3. If not → run `notion-search` for the task's likely name, scoped to the Tasks Tracker
   data source. If a close match exists for the same client, do not create a second task.
   Propose it as an update instead, and note the match in the questions list:
   "This looks like existing task 'X' — update that, or is this separate work?"
4. Otherwise → include in the "New Tasks" table for approval
5. After the user approves and the task is created, append the Source ID to
   `processedSourceIds` and record `taskLinks[sourceId]` as the new page URL

Only append IDs for tasks that were **actually created**. If the user skips a task, leave
its ID out so a later run can surface it again.

### If the ledger is lost

Deleting `state.json` means the next run re-proposes every task in the lookback window.
Nothing is auto-created — the approval gate still stands — so the failure mode is a noisy
triage report, not duplicate tasks in Notion.

</dedup>

<task_updates>

## Keeping existing tasks current

A task goes stale the moment the world moves on from it. A blocker clears, a deadline
shifts, the client adds a requirement, or the work quietly gets done by someone else.
Triage is usually the first place that news arrives, so it is the right place to catch it.

The rule is narrow: triage proposes, the user approves, and only then does anything change.

### When to propose an update

Look for source activity that changes something about a task that already exists:

| Signal in the source | Proposed change |
|----------------------|-----------------|
| The thing a task was waiting on has arrived | `Waiting`/`Blocked` → `Inbox`, clear `Blocked Reason` |
| A new blocker appears | → `Waiting` or `Blocked`, set `Blocked Reason` or `Blocked by` |
| A date is stated or moved | Set or change `Due date` |
| Someone escalates, or a deadline lands inside 48h | Raise `Priority` |
| Scope is added to work already tracked | Append to `Source Context`, or propose a subtask |
| Ownership moves | Change `Doer` |
| A second source discusses the same task | Append to `Source Context` |

Finding the task to update, in order of preference:

1. `taskLinks[sourceId]` in state.json — exact, no guessing
2. `notion-search` scoped to the Tasks Tracker data source, matched on name plus client
3. If neither finds it confidently, ask rather than updating the wrong page

Always `notion-fetch` the page before proposing changes. Proposing a change to a field
without reading its current value produces a "before" column that is a guess, and the
user approves against that column.

### Fields triage may update

Only these: `Status`, `Priority`, `Due date`, `Source Context`, `Blocked Reason`,
`Blocked by`, `Doer`, `Clients`, `Tags`, `Parent task`, `Hours Estimate`.

`Hours Estimate` may only be filled in when empty, and only on a task being classified as
quick. `Parent task` may not be changed to Quick Tasks on an existing task — see the limits
in <quick_tasks>.

The never-write list in <notion_schema> applies on update exactly as on create.

`Task name` is also off limits. Renaming a task the user has been looking at for a week is
disorienting and breaks their own search habits. If a name is genuinely wrong, ask.

### Status transitions triage may propose

- `Waiting` or `Blocked` → `Inbox`, when the blocker demonstrably clears
- `Inbox` or `To Do` → `Waiting` or `Blocked`, when a blocker appears
- Anything → `Cancelled`, but only through the obsolete-task flow below

Never propose `Done`. Triage cannot verify that work is finished, and wrongly marking
something done is the one error the user is least likely to catch, because a done task
stops appearing in front of them. If a source strongly suggests completion, ask.

Never propose `Someday`, `Awaiting feedback`, or `In Testing`. Those are the user's own
workflow states, and triage only reads them.

### Source Context is append-only

Never overwrite `Source Context`. Read the current value and append a dated line:

```
2026-08-12: Yoni sent the approved bio, clearing the prerequisite noted on 5 Aug.
```

This field is the audit trail for why a task looks the way it does. Overwriting it
destroys the reason the task was created in the first place.

### Do not touch tasks the user has moved on

If a task's `Status` is anything other than the value triage last set, the user has been
in there. That is a signal they are actively managing it. Surface the new information as a
question instead of proposing a silent field change.

### Presenting updates

Every proposed update shows the exact before and after, so the user can approve without
opening Notion:

| # | Task | Field | Now | Proposed | Why |
|---|------|-------|-----|----------|-----|

If one source implies more than three changes to a single task, that is a signal the task
should be split. Ask rather than piling updates onto it.

## Obsolete tasks

### Detecting them

A task may be obsolete when:

- A source says the work shipped, was dropped, or was handed to someone else
- The client cancelled or descoped it
- A newer task covers the same ground and this one is a leftover
- Its trigger has expired — a "prepare for the call on the 5th" task after the 5th
- It has sat untouched past the staleness window and its source thread died

Age alone is never enough. A P3 that has sat for two months may simply be a P3.

### Handling them

1. Never trash on a bulk approval. Each one is confirmed individually, by name.
2. Default to proposing `Cancelled`, not deletion. It is reversible and keeps the record.
3. Only propose trashing for genuine clutter: duplicates triage itself created, or tasks
   built from a misread message. Say plainly that Notion trash is recoverable for 30 days.
4. Never propose trashing a task the user has edited since triage created it.
5. If in any doubt, ask. An obsolete task costs a moment of attention. A wrongly deleted
   one costs the work of reconstructing it.

Present them in their own table, never mixed in with routine updates:

| # | Task | Age | Why it looks obsolete | Proposed |
|---|------|-----|----------------------|----------|

</task_updates>

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
| # | Task | Priority | Hrs | Due | Client | Doer | Source | Parent task | Status | Brief |
|---|------|----------|-----|-----|--------|------|--------|-------------|--------|-------|

`Brief` is the depth written for that task — quick / standard / parent — so the user can
see at a glance which tasks got a full write-up.

`Hrs` is `Hours Estimate`, and is populated only for quick tasks. Leave it blank for
everything else rather than guessing a duration.

## Gaps in Briefs
Every **Open questions** entry across all the briefs, grouped by task. These are the parts
of a brief that could not be filled from the source or the repo.

This is the most valuable thing to surface at approval time: an answer given here lands in
the page body before it is written, which is the difference between a task that is genuinely
self-contained and one that is nearly so. Ask these before creating anything, and fold the
answers in.

Do not print the full briefs by default — the report stays scannable. Offer instead:
"Show the full brief for any task by number."

## Task Updates → Notion (approve before applying)
Existing tasks that new source activity has changed. Omit the section entirely if empty.
| # | Task | Field | Now | Proposed | Why |
|---|------|-------|-----|----------|-----|

## Possibly Obsolete (confirm individually)
Never bulk-approved. Omit the section entirely if empty.
| # | Task | Age | Why it looks obsolete | Proposed |
|---|------|-----|----------------------|----------|

## Quick Tasks (under 15 min, filed under the mother task)
Tasks that passed the quick test, sorted by `Hours Estimate` ascending. Omit the section
entirely if empty.
| # | Task | Hrs | Client | Doer | Filed under |
|---|------|-----|--------|------|-------------|

`Filed under` is `Quick Tasks`, or the natural parent when the task already had one.

Distinct from Quick Wins below: this section is about **size** — short tasks, whoever does
them. Quick Wins is about **who** — tasks Claude can execute now, at any size. A task can
appear in both.

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

## ⚠️ Check These Slack Channels Manually
Always present. Lists every source flagged `manualCheck` in config.json.
```

After presenting, use AskUserQuestion. Keep creates/updates separate from anything
destructive:
- "Approve all tasks, updates, and drafts" — covers creates and updates, never trashing
- "Let me review individually"
- "Skip tasks, just save the drafts"
- "Skip everything"

If the Possibly Obsolete table has rows, ask about it in its own question, listing each
task by name. A bulk approval never reaches it.

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
7. For every task created, record `taskLinks[sourceId] = "<notion page url>"` so later runs
   can find the page directly instead of guessing by name
8. Updating or cancelling a task changes nothing in state.json. The ledger records that a
   source produced a task, not what became of it — Notion holds that
9. If a task is trashed, remove its `taskLinks` entry but leave the Source ID in
   `processedSourceIds`, so the same message does not simply recreate it next run
10. If the Quick Tasks mother task was resolved or created this run, set
    `quickTasksParent` to its page URL. If a lookup finds it missing — the user trashed
    it — reset `quickTasksParent` to `null` rather than writing subtasks to a dead page
11. Write the updated state to `.claude/triage/state.json`

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
   - If the task passes the quick test: set `Priority` P0, `Hours Estimate`, the `Quick`
     tag, and `Parent task` to the Quick Tasks mother task unless it already has a natural
     parent. Resolve or create the mother task first. See <quick_tasks>
4. Log the created task name + Notion URL
5. Record `taskLinks[sourceId]` with the new page URL

## Updating tasks in Notion

For each approved update:

1. `notion-fetch` the page first and confirm the current value matches the "Now" column the
   user approved against. If it has changed since you presented it, stop and re-ask — the
   user edited it in the meantime
2. Apply only the approved fields via `notion-update-page`. Send nothing else; a property
   omitted from the call is left untouched
3. For `Source Context`, send the existing text plus the new dated line, never the new line
   alone
4. Log the task name, the fields changed, and the Notion URL

## Trashing tasks in Notion

Only after individual confirmation for that specific task:

1. `notion-fetch` the page and confirm it is still the task the user agreed to remove
2. Move it to trash via `notion-update-page`
3. Tell the user it is recoverable from Notion trash for 30 days
4. Remove the `taskLinks` entry, keep the `processedSourceIds` entry

If a task has subtasks, never trash the parent alone — orphaned subtasks are worse than
the clutter. List the children and ask what should happen to them.

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
- Existing tasks updated rather than duplicated when new information arrives
- Every proposed update showed a real "Now" value read from the page, not a guess
- No task trashed without its own individual confirmation
- No write to any field in the never-write list, and no `Task name` change
- `Source Context` appended to, never overwritten
- State.json updated with new timestamps, Source IDs, and `taskLinks` after completion
- Blocked/Waiting items surfaced in summary
- Subtasks linked to parent tasks via relation
- Every created task has a brief in its page body, at a depth that matches the work
- Every brief quotes the ask verbatim and links back to its source
- Every URL, path and deadline in a brief traces to the source or a file that was read —
  nothing invented, gaps declared under Open questions
- Briefs for Claude-doable tasks name the command that would run them
- The user could work each task, or hand it to someone else, without opening another tool
</success_criteria>
