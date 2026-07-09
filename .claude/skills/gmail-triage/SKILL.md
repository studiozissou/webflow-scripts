---
name: gmail-triage
description: Reusable workflow for triaging the user's Gmail inbox, classifying emails by priority, and drafting context-aware replies. This skill should be used when the user says "triage inbox", "triage email", "check email", "email triage", "draft replies", "inbox review", or "process inbox". NEVER sends emails — only creates Gmail drafts.
---

<objective>
Scan the user's Gmail inbox, classify every thread into REPLY NEEDED / FLAG / ACTION / NOISE, priority-rank the actionable threads, load project context from the monorepo, and draft replies for user approval. Never send emails — only create drafts, and only after explicit user approval.
</objective>

<prerequisites>
Gmail MCP tools must be connected:
- `search_threads` — scan inbox
- `get_thread` — read full thread content
- `create_draft` — create reply drafts (never send)
- `list_labels` — check available labels
- `label_thread` — apply labels when requested
Project context available at `projects/{client}/.claude/` for client-specific replies.
</prerequisites>

<workflow>

## Step 1 — Scan inbox

Run two searches in parallel:

```
search_threads(query: "in:inbox newer_than:7d", pageSize: 50)
search_threads(query: "is:starred -in:sent", pageSize: 50)
```

The first pulls recent inbox threads (default 7 days — adjust if the user specifies a different range). The second pulls all starred threads regardless of age — these are threads the user has pinned for follow-up.

Merge the two result sets, deduplicating by thread ID. Any starred thread where the last message is NOT from the user counts as **unanswered** and should be auto-promoted to REPLY NEEDED in Step 2 (regardless of age).

## Step 2 — Classify each thread

Assign every thread to exactly one category:

### REPLY NEEDED
Someone asked a direct question, requested information, or is waiting on a deliverable from the user. Includes:
- Client questions (project scope, technical, process)
- Colleague requests
- Action items forwarded to the user
- Invitations or proposals needing a response

### FLAG / ACTION
No email reply needed, but requires the user to do something outside email:
- Accept GitHub/platform invitations
- Domain renewals to check
- Payments to verify
- Trello/Notion comments to review

### NOISE
No action needed:
- Newsletters, marketing, promotions
- Automated receipts and confirmations
- Transactional notifications (shipping, delivery, order status)
- Automated platform notifications (LinkedIn views, Webflow comments from self)
- Security codes and verification emails
- Sales outreach / cold emails

## Step 3 — Priority-rank REPLY NEEDED threads

Within REPLY NEEDED, rank by:
1. **Starred/pinned unanswered threads** — the user explicitly flagged these for follow-up, treat as highest priority
2. **Client emails about active projects with deadlines** — especially if the user is blocking them
3. **Client emails with direct questions** — they asked something specific
4. **Collaborator/partner requests** — people the user works with regularly
5. **Everything else that needs a reply**

## Step 4 — Load project context for replies

For each REPLY NEEDED thread:
1. Identify the client/project from sender domain or thread content
2. Check if `projects/{client}/.claude/` exists in the monorepo
3. If it does, read relevant files:
   - `projects/{client}/.claude/specs/` for active project specs
   - `projects/{client}/.claude/comms/` for past communication context
   - `projects/{client}/.claude/notes.md` or `overview.md` for client background
4. Get the full thread content via `get_thread(threadId, messageFormat: "FULL_CONTENT")` for full conversation history

## Step 5 — Present triage to user

Output a structured triage report:

```
## Inbox Triage — {date}

### REPLY NEEDED (ranked by priority)
| # | Thread | From | Project | What they need | Age |
|---|--------|------|---------|----------------|-----|

### FLAG / ACTION
| Item | Action needed |
|------|--------------|

### NOISE ({count} threads)
Brief summary of categories (e.g. "12 newsletters, 5 receipts, 3 LinkedIn")
```

## Step 6 — Draft replies

For each REPLY NEEDED thread, draft a reply following these rules:

### Tone and voice
- Match the user's existing email voice: professional but warm, concise, no filler
- Use "Kind regards, Will" as the sign-off (do not include the full signature — Gmail handles that)
- Start with "Hi {name}," — never "Dear" or "Hey"
- Keep replies short and direct. The user writes tight emails.
- If the user has replied to this person before in the thread, match that tone exactly

### Content rules
- Answer the question directly if there is enough context
- Reference specific project details from the monorepo context files
- If there is not enough information to answer confidently, flag the question to the user with `[QUESTION FOR YOU: ...]` inline and provide what is possible
- For technical questions (DNS, Webflow setup, etc.), include accurate technical details
- For timeline/scope questions, reference specs but flag for user confirmation
- Never fabricate project details, dates, or commitments

### Draft creation rules
- Present each draft in the triage report for user review FIRST
- Format as a quoted block so the user can read and approve/edit
- Include the thread subject and recipient for context
- After user approves, create the draft via `create_draft()` with `replyToMessageId` set to the last message ID in the thread
- NEVER call `create_draft` without explicit user approval

### Safety — absolute rules
- NEVER send emails. Only create drafts.
- NEVER auto-approve drafts. Always show the user first.
- NEVER reply to automated/transactional emails
- NEVER reply to sales outreach or cold emails
- If in doubt about whether to reply, ask the user

## Step 7 — Ask clarifying questions

After presenting all drafts, list any questions that came up:
- Threads where context was insufficient to draft a good reply
- Decisions the user needs to make (renew domain? accept invite?)
- Ambiguous emails where classification was uncertain

</workflow>

<edge_cases>

## Multi-account emails
The user has will@teamzissou.io, wdmorley@gmail.com, willandmeggie@gmail.com, wdmorley@hey.com. Treat all as the same person. Replies always go from the account that received the email.

## Forwarded threads
When a client forwards an internal thread (like Romain forwarding Laurent's email), the reply goes to the client, not the internal person.

## Dutch/non-English emails
If the email is in Dutch or another language, note it in the triage. Personal/household emails in Dutch are usually noise. Client emails in non-English may need the user's input.

## Webflow comments
Emails from comments-no-reply@webflow.com are Webflow Designer comments. If they are from the user's own mentions, they are noise. If they contain client responses to the user's comments, flag as REPLY NEEDED.

## Duplicate emails
Same email sent to multiple of the user's addresses — deduplicate and only show once.

</edge_cases>

<labels>
If the user asks to label/flag threads:
- Use `label_thread()` with system labels like STARRED or IMPORTANT
- Or use custom labels if they exist (check with `list_labels()` first)
</labels>
