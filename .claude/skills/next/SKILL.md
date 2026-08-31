---
name: next
description: Answers "what's next?" across all clients in this monorepo — reads spec status, git activity, worktrees and open PRs, then names one concrete next action. Use this skill whenever the user asks what to work on, what's outstanding, where things stand, what the status is, what's left to do, what needs merging, or asks to pick up / resume where they left off — including terse forms like "what's next?", "progress?", "is it done?", "where are we?", "status", or "what should I do now". Also use it at the start of a session when the user needs re-orienting after a break, and prefer it over reading queue.json, which is deprecated.
---

# /next — what should I work on?

## Why this exists

In this repo "what's next?" is genuinely hard to answer, and it gets asked
constantly — 21 times in a recent three-week window, usually right after a
`resume`. The obvious sources all lie in different ways:

- `queue.json` is **deprecated** (retired 2026-08-18). Do not read it.
- Spec `**Status:**` headers are written once at creation and almost never
  corrected. 57 specs currently claim "Ready to Build" with no recent activity
  behind them, some from March. Listing them straight is worse than useless.
- Git says what *changed*, never what was *intended*.
- Notion knows what's owed to and by other people, but goes stale the moment
  work ships without anyone updating it.

So the answer has to come from **corroboration**: a spec counts as live only when
something outside its own header agrees — a recent commit, a live branch, or a
recent edit to the spec itself. That single rule is what turns 184 specs into a
handful of real answers.

The same idea applies across sources. Git, specs and Notion each know something
the others can't, and each is wrong in its own way — so the useful signal is
often in the *disagreement* between them, not in any one of them.

## How to run it

```bash
python3 .claude/skills/next/scripts/gather.py
```

It prints JSON and takes a few seconds. It is strictly read-only — it never
merges, pushes, or writes. Run it from anywhere in the repo.

Set `NEXT_WINDOW_DAYS` to widen or narrow the corroboration window (default 21,
about one work cycle here). Widen it if the user has been away a while.

The script already does all the classification. Your job is judgement and
presentation, so don't re-derive its work by grepping specs yourself.

### What comes back

- `totals` — spec counts by state
- `clients{}` — per client: `active[]` (corroborated), `stale` (count of
  buildable-but-unsupported), `blocked[]`
- `worktrees[]` — `unmerged` commit count and `dirty` file count each
- `open_prs[]` — empty if `gh` is unavailable; that's fine, don't chase it
- `unparsed_specs[]` — headers that exist but aren't recognisable

## Then read Notion

The script deliberately doesn't touch Notion — it must stay fast and work
offline. Query it separately, and treat it as optional: if the MCP is down, say
so in one line and give the rest of the report rather than failing the whole run.

Tasks live in **Tasks Tracker**, data source
`collection://226e1848-bb51-80e6-b02b-000bf42f3fca`. Open work is any row whose
`Status` is one of `Inbox`, `To Do`, `In progress`, `Awaiting feedback`,
`In Testing`, `Blocked`, `Waiting`:

```sql
SELECT "Status", "Priority", "Task name", "Doer", "Blocked Reason",
       "date:Due date:start" AS due
FROM "collection://226e1848-bb51-80e6-b02b-000bf42f3fca"
WHERE "Status" IN ('In progress','Blocked','Awaiting feedback',
                   'In Testing','To Do','Waiting')
```

Notion earns its place because it is the only source that knows about **other
people**. `Doer: External` plus a `Blocked Reason` is a chase-up — someone owes
the user something, and nothing in git or the specs can surface that. These are
usually the highest-value rows in the whole report, because they decay silently:
nobody is reminded, and the work simply stalls.

### Cross-check Notion against git

This is the highest-value thing you do with Notion, so don't skip it. For each
open task, look for evidence in the recent commit text that the work already
shipped. Tasks routinely stay open long after the code lands — at the time of
writing, two P0 rows described work that had been committed and verified days
earlier.

Report those as "looks already done — git says X", with the commit. Don't close
them yourself: you're inferring from commit messages, which is good enough to
raise but not to act on, and the user may know of a remaining piece.

Flag overdue dates too. An overdue chase-up is worth more attention than a fresh
spec, because a stalled dependency blocks work that is otherwise ready.

## What to output

Aim for **one screen**. The user is asking because they want to start working,
not to read a report — length actively defeats the purpose here.

Use this order, because it runs from "only you can do this" to "background noise":

### 1. Needs you
Anything blocked on a human: Notion chase-ups owed by other people, tasks that
look already done, worktrees with unmerged commits, open PRs, specs marked
blocked. This is first because it's the only part the user can't delegate — and
it's where work actually goes missing.

Lead with the chase-ups and name the person. "Rishi — AutoTrader options, 12 days
overdue" is immediately actionable in a way that "1 blocked task" never is.

For each unmerged worktree give the branch, the commit count, and whether it's
dirty. Flag any worktree with `unmerged: 0` and `dirty: 0` as safe to remove via
`/tidy`.

Include the worktree the current session is sitting in, marked as such. It holds
real unmerged work like any other, and silently dropping it is how a session's
own output goes missing.

If you state a count, make it match the list you then print — "3 worktrees" above
four bullets, or "clean" above a dirty one, quietly destroys trust in every other
number in the report. Prefer counting the list you actually wrote.

### 2. In flight, by client
Max three per client, most-corroborated first. Give the spec title, its status,
and *why it counted as live* ("touched by a commit last week"). The reason
matters — it's what lets the user trust or dismiss the row at a glance.

Skip clients with nothing active rather than printing empty headings.

### 3. Backlog
One line per client: `carsa: 5 buildable specs, none touched recently`. Never
enumerate them. If the user wants that list they'll ask, and then you can filter
the JSON.

### 4. One recommended next action
Exactly one, naming a real spec, worktree or PR, with the command to start it.
Not a menu. If you genuinely can't choose, say what's missing rather than listing
three options — a menu just hands the decision back, which is the thing this
skill exists to avoid.

## Judgement calls

**Prefer finishing to starting.** An unmerged worktree or a half-built spec beats
a fresh one. Work in flight decays — it accumulates merge conflicts and the
context to finish it fades.

**Distinguish the two kinds of missing status.** `unlabelled` specs never had a
`**Status:**` header (currently 72, mostly older ad-hoc docs — low signal, don't
raise them unless asked). `unparsed` ones have a header you couldn't read
(currently 2) — worth a one-line mention, since a human wrote something there
meaning to convey state.

**Don't fix things mid-report.** If specs are stale or statuses are drifting, say
so in one line and offer. Silently rewriting spec headers while answering a
status question is a surprise, and the user may have reasons for the state.

**Say when you don't know.** If `gh` isn't authenticated, PRs are simply absent
from the picture — mention it rather than implying there are none. Same for
Notion: a report built without it is still useful, but the user needs to know the
chase-ups are missing, since that's the part they can't reconstruct from memory.

## Worth offering, once

If the backlog count is large (say 40+ stale buildable specs), mention once that
a triage pass would make future runs sharper. Don't repeat it every invocation —
it becomes noise, and the user has heard it.
