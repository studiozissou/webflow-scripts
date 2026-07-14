# Client Report Templates

> **Before writing any report:** Read the "Writing rules" section at the end of
> this file. Every section must follow those rules — no jargon, concrete numbers,
> opportunity framing, and load the `humanizer` skill before finalising.

This file contains two report types:
1. **Intake report** — first engagement, includes pricing options
2. **Monthly report** — recurring, two-tier format (executive summary + full report)

---
---

# TEMPLATE 1: Intake Report (First Engagement)

# [Client Name] — Website Audit & Action Plan

**Prepared for:** [Contact name]
**Date:** DD Month YYYY
**By:** [Your name — from `.claude/reference/about-me.md` or ask]

---

## The big picture

(2-3 paragraphs. Plain language, no jargon. Lead with what's working, then name the ceiling
concisely. End with the one-line verdict from the narrative.)

Source: `proposals/narrative-YYYY-MM-DD.md` § One-line + § Three-beat story.

---

## Where the site stands today

### [Positive framing — e.g. "You're already on page one"]

(If SEMRush data available: keyword ranking table showing the positions that matter.
Otherwise: the key "Passing" stats in plain language.)

### What's already working

(Bullet list — translate the internal report's "Passing" table into plain language.
No technical jargon. "SEO head on 95 of 100 pages" not "meta title + description + OG tags".)

---

## What's holding the site back

(Translate the narrative's "What's holding it back" section into client-facing language.
Each issue gets 2-3 sentences: what the problem is, why it matters, and the concrete
number. Frame as opportunity, not blame.)

Source: `proposals/narrative-YYYY-MM-DD.md` § What's holding it back.

**Claim gate applies here.** Every "why it matters" sentence must trace to a justification already
sourced in the internal report. See *Writing rules* at the foot of this file.

---

## The plan

(Opening paragraph: "Three stages: fix the foundations, build the structure, then grow.
I'd work through it in priority order, starting with whatever gets the most done for
the least effort." Adapt to the specific engagement.)

### Phase 0: [Summary phrase] (Week 1)

Each task gets a short title and three lines: Issue, Fix, Impact. Use numbered bold
headings. Keep each line to one sentence. Write in plain language throughout.

Format per task:

```
**1. [Short title]** ([time estimate])
*Issue:* [What's wrong, in plain English. One sentence.]
*Fix:* [What we do about it. One sentence.]
*Impact:* [What changes for the client. One sentence. Vary the phrasing — don't
repeat "Better X" or "Improves Y" across every item. Be specific and concrete.]
```

The time estimate goes in parentheses after the title: (15 min), (30 min), (1 hr),
(2 hrs). This lets the reader gauge task size at a glance and feeds into Option C
pricing.

Example:

```
**1. Missing page identity tags** (30 min)
*Issue:* Google can't tell which language version of each page is the main one, so
it splits your ranking power across all four.
*Fix:* Re-enable a single setting in Webflow.
*Impact:* All 273 pages immediately stop competing against their own translations.
```

Rules for Impact lines:
- Vary sentence structure across items. Don't start every impact with the same pattern.
- Use concrete, client-facing language ("Google shows your description instead of
  making one up") not abstract jargon ("Better SERP snippets").
- It's fine to be brief on minor items ("Minor, but it's a 15-minute fix").

Source: P0 tasks from internal report.

**Cost: €[total] ([hours] hours)**

### Phase 1: [Summary phrase] (Week 1-2)

(Same Issue/Fix/Impact format. Source: P1 tasks.)

**Cost: €[total] ([hours] hours)**

### Phase 2: [Summary phrase] (Week 2-3)

(Same Issue/Fix/Impact format. Source: P2 tasks.)

**Cost: €[total range] ([hours range] hours)**

### Phase 3: [Summary phrase] (Week 3-4)

(Same Issue/Fix/Impact format. Source: P3 tasks. For tasks that need client input,
note it in the Fix line: "I build the structure, you write the questions.")

**Cost: €[total range] ([hours range] hours)**

### Phase 4 — Ongoing (retainer) — Growth

(Bullet list of growth-territory items. Source: P4 tasks.
End with monthly pricing range.)

**Pricing: €[range] per month ([hours range] hours)**

---

## Three ways to work together

### Option A: Fixed project

Work through Phases 0-3 over [N] weeks, paid per phase in advance.

| Phase | Cost |
|-------|------|
| Phase 0: [summary] | €[total] |
| Phase 1: [summary] | €[total] |
| Phase 2: [summary] | €[range] |
| Phase 3: [summary] | €[range] |
| **Total** | **€[range]** |

Growth work (Phase 4) moves to a monthly retainer after that.

### Option B: Monthly retainer

[Hours] hours per month at a fixed fee. We work through the list in priority order,
so you always know what's coming next and what it costs.

**Monthly: €[total]/month** (minimum [N] months, then month-to-month with 30 days' notice)

At this pace the Phase 0-3 work takes roughly [N] months. You spread the cost, and it
transitions naturally into ongoing growth work.

### Option C: Pick and choose

Individual tasks with time and cost estimates. The client picks what they want.

Structure:

1. **"If I had to pick five"** — a ranked top-5 table with columns: #, Task, Time,
   Cost, Why it matters. These are the highest-impact tasks regardless of phase.
   Rank by actual impact, not phase order. Include the total.

2. **"The full menu"** — remaining tasks grouped by category (not phase number),
   each as a table with columns: #, Task, Time, Cost. Categories like "Fixes and
   compliance", "Search structure", "Enrichment and accessibility", "AI readiness".

Rules:
- Task numbers must match the numbering used in the phase sections above
- Time estimates come from the internal report effort columns
- All prices are fixed (state this explicitly)
- End with: "Pick the tasks you want, I'll total them up, and we start. You can
  always add more later."
- No minimum order

---

(Sign-off — casual, personal. Offer a call or meeting. First name only.)

---
---

# TEMPLATE 2: Monthly Report (Two-Tier Format)

Monthly reports use two tiers delivered together. The **executive summary** is
the main document — short, scannable, decision-ready. The **full report** is the
reference appendix with every detail.

Both tiers go in `projects/{client}/.claude/comms/site-report-YYYY-MM.md` as a
single file with the executive summary first, full report second, separated by a
clear divider.

When pushing to Notion, the executive summary goes into the client-facing page.
The full report stays in the local file as the reference copy (or gets its own
Notion page if the client wants it).

---

## Tier 1: Executive Summary

# [Client Name] — Monthly Site Report

**Month:** [Month YYYY] | **Site:** [domain] | **Pages crawled:** [N]

---

### Summary

(2-3 sentences. What happened this month in plain language. Lead with what improved,
then name the biggest concern. End with the one action that matters most right now.)

---

### Key metrics

Two tables side by side or stacked: one for SEO health, one for AI search readiness.

**SEO health**

| Metric | Last month | This month | Change |
|--------|-----------|------------|--------|
| Pages crawled | | | |
| Structured data errors | | | |
| Broken links (internal) | | | |
| Duplicate titles | | | |
| 4xx errors | | | |
| Lighthouse perf (mobile avg) | | | |
| Lighthouse a11y (mobile avg) | | | |

(Include only the metrics that moved or matter. Don't pad with stable numbers
unless the client specifically tracks them.)

**AI search readiness (AEO)**

| Category | Last month | This month | Change |
|----------|-----------|------------|--------|
| Structured data | /4 | /4 | |
| Answer structure | /6 | /6 | |
| Freshness | /3 | /3 | |
| Authority | /4 | /4 | |
| Technical | /3 | /3 | |
| **Overall** | **/20** | **/20** | |

---

### What changed and why

Four categories. Only include categories that have entries. Each item is 1-2 sentences.

**Added:** (New pages, new schema, new features deployed this month.)

**Fixed:** (Issues from the task list that were resolved.)

**Regressed:** (Metrics that got worse. Always explain why — was it inventory growth,
a template change, a third-party issue?)

**Removed:** (Pages removed, features deprecated, items taken off the task list and why.)

---

### Top 10 issues to fix

Ranked by impact × ease. Not grouped by priority tier — the ranking IS the priority.
Use the Issue/Explanation/Fix/Benefit format.

```
**1. [Short title]**
*Issue:* [One sentence.]
*Explanation:* [Why it matters. One sentence.]
*Fix:* [What we do. One sentence.]
*Benefit:* [What changes. One sentence.]
```

Rules:
- Rank 1 is the highest-impact, most feasible fix. Rank 10 is still worth doing
  but lower leverage.
- If an issue from last month was fixed, it drops off the list. New issues slot in.
- If an issue moved up or down, note it: "(was #3 last month)" after the title.
- Include time estimates in parentheses after the title if the client pays per task.
- Cap at 10. If there are fewer than 10 real issues, list fewer. Don't pad.

---

### 5 strategic opportunities

Forward-looking suggestions that go beyond fixing errors. These are growth moves.

Numbered list, 2-3 sentences each. Examples:
- "Add blog author profiles with real names and bios — Google and AI tools weight
  author credibility heavily, and the blog is already driving 400 clicks/day."
- "Build a /sell-car hub page to create a topic cluster around 'sell my car' searches."

Rules:
- These are suggestions, not tasks. The client decides whether to pursue them.
- Each one should explain why NOW (what changed or what data supports it).
- Can reference AEO score categories that would improve.
- Can reference competitor gaps or market opportunities.
- Don't repeat items already in the top 10 — these are additional.

---

### Other notes

(Optional. Anything that doesn't fit above: upcoming Google algorithm changes,
industry trends, client questions from last month's meeting, reminders about
seasonal content, etc. Keep it brief. Omit this section if there's nothing to add.)

---

(Sign-off — one line, casual. First name only.)

---

## Tier 2: Full Report

The full report follows the executive summary in the same file, after a clear divider:

```
---
---

# Full report — [Month YYYY]
```

### Structure

The full report contains everything. It's the reference copy for anyone who wants
the detail behind the summary numbers.

**Sections (in order):**

1. **In summary** — Same as executive summary but can be slightly longer (3-4 paragraphs).

2. **Monthly health dashboard** — Full comparison table with ALL metrics, not just
   the ones that moved. Include Lighthouse scores by page with month-over-month deltas.

3. **What changed this month** — Expanded version of "What changed and why" with
   specific page URLs, error counts, and technical detail.

4. **Top issues** — ALL issues, not just the top 10. Grouped by priority tier
   (Critical / High / Medium / Lower). Each uses the Issue/Explanation/Fix/Benefit
   format. Numbered continuously across tiers.

5. **What's still clean** — Bullet list of passing checks (zero server errors,
   valid SSL, clean sitemap, etc.). Brief.

6. **Automated monthly checks** — Table of automated checks with status column.
   Flag anything that changed from last month.

7. **Priority task list** — Full numbered task list carried forward from previous
   months. Updated with new items, completed items marked done, status changes noted.
   Uses Issue/Explanation/Fix/Benefit format throughout.

8. **Local SEO** *(if applicable)* — Listing scan results, directory accuracy,
   GBP status. Note if this is a paid add-on.

9. **AI search readiness score** — Full AEO breakdown with per-category explanation.
   Reference the `ai-search-aeo` skill for the 20-point rubric.

10. **How we audit this site** — Tools and methods. Unchanged month to month unless
    methodology changes.

11. **Next steps** — Numbered list. What happens next, what the client needs to do,
    when the next report lands.

### Format per issue (applies to sections 4 and 7)

```
**[N]. [Short title]** — [Status: NEW / Open / Updated / Fixed / Needs client input]
*Issue:* [One sentence.]
*Explanation:* [Why it matters. 1-2 sentences. Include page count or specific URLs.]
*Fix:* [What we do. One sentence.]
*Benefit:* [What changes. One sentence. Vary phrasing across items.]
```

### Carrying forward the task list

- Tasks fixed this month get marked **Fixed** with a note of what was done.
- Tasks with new data get marked **Updated** with the new numbers.
- New issues from this month's scan get marked **NEW** and slotted into the
  appropriate priority tier.
- Task numbers are stable across months. New tasks get the next available number.
  Don't renumber existing tasks — clients reference them by number.
- If a task is removed (e.g. no longer relevant), note why and mark **Removed**.

---
---

# Writing rules (apply to both templates)

- **No technical jargon.** "Search engines can't read the good stuff" not "missing JSON-LD
  structured data markup". The client doesn't need to know what schema is — they need to
  know that 19 of 22 jobs are invisible to Google for Jobs.
- **Concrete numbers over abstractions.** "27 page titles get cut off" not "many page titles
  are too long". "80% of bandwidth goes to oversized images" not "images need optimising".
- **Opportunity framing, not blame.** "The difference between you and competitors isn't brand
  strength — it's that their sites package content for search engines" not "your SEO is bad".
- **Give credit for what works.** Lead with what's already passing before naming problems.
- **Issue/Explanation/Fix/Benefit format.** Four italic-labelled lines per task. Use "Issue:"
  not "Wrong:" or "Problem:". Vary the Benefit line phrasing across items — don't repeat
  the same sentence pattern.
- **Intake reports include pricing.** Three options: Option A (fixed project), Option B
  (retainer), Option C (pick and choose with per-task pricing). Monthly reports don't
  include pricing unless the client pays per task.
- **Claim gate — no unsourced platform claims.** These reports are a translation of the internal
  report, not a new analysis. Every sentence must trace to a justification already sourced
  upstream (see the Claim Gate in `/site-audit` Phase 6). Plain English may make a claim
  *simpler*; it may never make it *stronger*, or add a benefit the internal report didn't
  establish. This bites hardest on the **Benefit line**, which asserts what Google or an AI
  assistant will *do* — third-party behaviours that change without notice and that a model will
  cheerfully state from stale memory. Two that reached a Coconut client in May 2026: "FAQ schema
  makes Google show expandable Q&As" (false since Aug 2023 outside gov/health) and "analytics
  fires before consent" (that is what correct Consent Mode v2 looks like). If a Benefit line
  reads thin, it was thin upstream — go fix it there rather than papering over it with a
  confident sentence. Clients spend money against this column.
- **Load the `humanizer` skill** before writing and apply it to the final draft. The client
  report must read as natural human writing, not AI output. It may change how a claim reads,
  never what it asserts — hedged wording from the claim gate is load-bearing.
- **Meeting notes override scan data.** If a meeting established that an issue is intentional
  (e.g. 404s for sold vehicles, storage pages deliberately hidden), note it in the report
  rather than flagging it as an error. The report should reflect the client's reality, not
  just the crawler's output.
