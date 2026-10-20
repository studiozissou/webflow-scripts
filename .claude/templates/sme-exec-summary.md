# {{business_name}}: audit summary, {{month_year}}

> **When to use:** the one-page summary from `/sme-audit` for a non-technical owner. It goes with the full report and is the page they read first.
> **Output file:** `projects/{client}/.claude/reports/exec-summary-YYYY-MM.md`
>
> - No hours, effort or prices. Say what will be done, never how long it takes.
> - Fit on one screen: about 300 words plus the chart. Plain words only; if a term needs explaining, leave it out.
> - Build the categories from the work plan, grouped by what the owner gets, not by tool or task type. Three to five categories, two to four fixes each.
> - Every fix named here has a task in the work plan; anything not in the plan stays out.

## Where you stand

{{where_you_stand}}: two or three sentences. What already works, and the one gap that matters most.

## What could change

![Monthly site visits from Google, do nothing vs every fix](traffic-trajectory-{{yyyy_mm}}.png)

{{chart_line}}: one sentence reading the chart, and one saying these are estimates, not promises.

## What we will do

### {{category_name}}

{{category_description}}: one sentence on what this means for the business.

- {{main_fix}}
- {{main_fix}}

### {{category_name}}

{{category_description}}

- {{main_fix}}
- {{main_fix}}

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
