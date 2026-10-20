# {{business_name}}: audit summary, {{month_year}}

> **When to use:** the one-page summary from `/sme-audit` for a non-technical owner. It goes with the full report and is the page they read first.
> **Output file:** `projects/{client}/.claude/reports/exec-summary-YYYY-MM.md`
>
> - No hours, effort or prices. Say what will be done, never how long it takes.
> - Keep the open text short: about 700 words plus the chart, with the fix lists folded away. Plain words only; if a term needs explaining, leave it out.
> - Build the categories from the work plan, grouped by what the owner gets, not by tool or task type. Three to five categories.
> - Each category says, in a sentence each, what is wrong, what it costs the business (lost visitors, enquiries or trust), and how we fix it. Write these in general terms ("We found several content errors that could confuse visitors"); specifics such as page names, counts and examples go in the fix list.
> - Each category ends with a collapsed list of every work-plan task in it, one plain sentence per task, so the owner can see all the work. In Notion it becomes a toggle.
> - Every fix named here has a task in the work plan; anything not in the plan stays out.

## Where you stand

{{where_you_stand}}: two or three sentences. What already works, and the one gap that matters most.

## What could change

![Monthly site visits from Google, do nothing vs every fix](traffic-trajectory-{{yyyy_mm}}.png)

{{chart_line}}: one sentence reading the chart, and one saying these are estimates, not promises.

## What we will do

### {{category_name}}

**The problem:** {{problem}}: what is wrong today, in general terms, in one or two sentences.

**Why it hurts you:** {{cost}}: what it costs the business, such as visitors who never arrive, enquiries lost or trust dented.

**How we fix it:** {{approach}}: the fix in one or two sentences.

<details>
<summary>All fixes in this area</summary>

- {{fix_sentence}}
- {{fix_sentence}}

</details>

### {{category_name}}

**The problem:** {{problem}}: what is wrong today, in general terms, in one or two sentences.

**Why it hurts you:** {{cost}}: what it costs the business, such as visitors who never arrive, enquiries lost or trust dented.

**How we fix it:** {{approach}}: the fix in one or two sentences.

<details>
<summary>All fixes in this area</summary>

- {{fix_sentence}}
- {{fix_sentence}}

</details>

(Repeat for three to five categories.)

## What we need from you to get started

- {{owner_input}}
- {{owner_input}}

## Next steps

1. {{approve_step}}: what you are asked to say yes to.
2. {{first_changes}}: what happens first, and that nothing visible changes without your approval.
3. {{follow_up}}: when we talk next.

The full report has the detail behind every point: {{full_report_link}}.

*{{author_first_name}}*
