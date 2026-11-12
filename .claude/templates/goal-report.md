# Goal-led monthly report

> **When to use:** the monthly report for a retainer client that has a goal plan (`goal-plan.md`).
> It answers one question: how close are we to the goal, what happens next, and what do we need
> from you? A client with no goal plan yet uses `site-audit-monthly-report.md`.
>
> **Inputs:** the client's goal plan, this month's site audit, last month's report, and the
> figures for each goal. A figure with no source shows "No data". Never invent one in a real report.

---

## Hard rules

- **Length:** 800 visible words or fewer with every accordion collapsed (about 2 A4 pages with 3
  charts). Accordion titles count; accordion bodies, images and links do not.
- **Wording:** about 80% of the way to ASD-STE100 (Simplified Technical English). Visible sentences
  20 words or fewer, average 15 or fewer. Accordion bodies 25 or fewer. Active voice. One word for
  one thing ("phase", "task", "page one", "fault", "Google profile"). Define each term once, the
  first time it appears. British English.
- **Markup:** Notion-flavoured markup. Accordions are `<toggle heading="h3">`. A toggle title that
  starts with a number is escaped, `1\. Title`, or Notion turns it into a list item with an empty
  title.
- **Voice:** "we" for the team, "me" for the author, signed with the author's first name. No
  chasing or blaming lines ("we asked for this in July"). No time estimates anywhere.
- **Comparisons:** compare each month with the same month last year. Month-on-month only where the
  source has nothing older, and say so.
- **Goals:** marked "(proposed)" until the client agrees them. Goals the client owns carry the
  client's name, so a missed client goal is not read as an SEO failure.
- **Claims:** keep the claim gate from `/site-audit`. Hedged wording stays hedged.

## Section order

### 1. Header

```markdown
<table header-row="false">
<tr>
<td><b>Month:</b> [Month YYYY] \| <b>Site:</b> [domain] \| <b>Pages crawled:</b> [N]</td>
</tr>
</table>

<callout icon="🎯" color="blue_bg">
<b>The goal:</b> [the plan's realistic goal, in one or two sentences. Define the key term,
such as "page one means positions 1 to 10". Say what is not realistic, and why.]
</callout>
```

### 2. `## Summary`

At most 5 bullets: the headline goal with its figure; the position against the goal; site health
in one line; what starts next month; the first ask.

Optional: one accordion for the client's question of the month. Its title gives the short answer,
for example "Your question: why did X fall? We do not know yet."

### 3. `## Progress to [the goal]`

One table. A highlighted headline-goal row, then one row per phase:

| Phase | Status | Plan tasks done | Goals on track |
|---|---|---|---|
| ★ [headline goal] | ● On track | — | [figure, change on last year] |
| 0. [phase name] | ● On track | `████░░░░░░` 3 of 7 | 3 of 3 |
| 1. [phase name] | ○ Starts [month] | `░░░░░░░░░░` 0 of 12 | 0 of 5 |

- Progress bars are 10 characters, `█` done and `░` to do, rounded to the nearest tenth.
- Statuses: `● On track` (green), `● Behind` (orange), `○ Starts [month]` (gray, phase not started),
  `○ Starting point set` (gray, first figure recorded), `○ No data` (gray, no source yet).
- A goal in a phase that has not started shows `○ Starts [month]`, like its phase.

Then one accordion, "The [N] goals, by phase (proposed)": a table with a gray header row per
phase, then # · Goal · 12-month target · this month · status.

### 4. Charts

Up to 3 charts, one goal each, as PNG images under the progress table. Typical set: the headline
traffic goal against the same month last year (line), local positions by town (dot plot with a
page-one band), and a goal against its target band (line).

- matplotlib, one axis, the dataviz reference palette, light background.
- Title names the measure. Subtitle names the goal and this month's figure. Footer names the
  source, written for the client, never a note to ourselves.
- Skip a line chart with fewer than 2 months of data. Skip a town chart with no town figures.
- Upload each with the Notion file upload, then place it with `<image source="file-upload://…">`.
  A placed image cannot be edited in place: to change a chart, replace the page content.
- Chart figures must match the text exactly.

### 5. `## What we did this month`

One accordion per phase that had work done. Its title gives the phase and "N of M plan tasks
done". The body lists only completed work. Phases with nothing done are left out.

### 6. `## Next month: 5 tasks`

Plan tasks only, never site-audit fixes. Choose them in this order:

1. Tasks that unblock the most other tasks (the plan's `blocks` lists). A data-access task counts
   when goals or tasks wait on it.
2. If fewer than 5 unblock others, fill the rest by impact (high, medium, low). Ties go to the
   earlier phase.
3. Show the chosen 5 in phase order, with no phase tag in the titles.

Each task is an accordion, `1\. [verb] [object]`, with enough detail to estimate:

```markdown
<toggle heading="h3">
1\. [Task title]

<b>Work</b>

1. [Step]
2. [Step]

<b>Needs from [client]:</b> [inputs, or "nothing"]

<b>Depends on:</b> [task, or "nothing". Name what waits on this task.]

<b>Done when:</b> [an observable check]

<b>Unknown:</b> [what could change the size, and the fallback]
</toggle>
```

### 7. `## Site health`

One Site health accordion holds every technical fix, unless a fix is a plan task tied to a goal.
Title: "Site health: [score], up from [last]. [N] fixes live, [N] small fixes next."

Body, in this order: Fixed this month · Not live yet · Got worse (with the cause) · Added ·
Next fixes (numbered, with any decision the client must make) · All metrics (last month, this
month, change; green, orange, red).

### 8. `## What we need from [client]`

At most 6 numbered asks. Name the person when one person owns the ask. Point to decisions inside
Site health instead of repeating them.

### 9. `## Reference`

Accordions: AI search readiness (score table with "next point"), blog topics (3, with volume and
difficulty; link a goal only when the topic moves it), and in a sample report, "Sample data to
collect" (each made-up figure with its real source).

---

## Sample mode

A sample report marks every made-up figure with † and opens with a gray callout that says so.
Sample figures never go into the client's monthly figures files.

## Checks before sending

- Word count with accordions collapsed, and sentence lengths.
- Re-read the page from Notion: every chart image present, no accordion title empty.
- A copy review (design-critic, copy lens) for wording, numbers that disagree, and one word per
  thing.
