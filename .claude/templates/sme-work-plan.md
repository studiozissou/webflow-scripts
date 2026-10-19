---
slug: work-plan-{{yyyy_mm}}
client: {{client_slug}}
date: {{date}}
status: {{draft_or_approved}}
source_report: projects/{{client_slug}}/.claude/reports/sme-audit-{{yyyy_mm}}.md
gbp_pack: projects/{{client_slug}}/.claude/reports/gbp-copy-{{yyyy_mm}}.md
---

# {{business_name}}: work plan, {{month_year}}

> **Output file:** `projects/{client}/.claude/specs/work-plan-YYYY-MM.md`
>
> Every finding in the report and every owner-check item becomes a task here. No report finding without a task, no task without a reason in the report.

## How to use this plan

**Recommended order**

1. Invisible bugs first: technical fixes the visitor never sees change (no approval needed).
2. Visible content fixes, once the owner has approved the wording.
3. Google: Business Profile, Search Console, listings and the review flow.
4. Upgrades: new pages, rewrites, performance and accessibility work.

**Hours per group**

| Group | Tasks | Estimated (h) | Actual (h) |
|---|---|---|---|
| Bugs and broken things | {{count}} | {{hours}} | {{actual}} |
| Quick SEO fixes | {{count}} | {{hours}} | {{actual}} |
| Google and listings | {{count}} | {{hours}} | {{actual}} |
| Upgrades | {{count}} | {{hours}} | {{actual}} |
| Waiting on the owner | {{count}} | {{hours}} | {{actual}} |
| Later (not in total until triggered) | {{count}} | {{hours}} | {{actual}} |
| **Total** (excludes Later) | {{count}} | {{hours}} | {{actual}} |

**Rules**

- Every task's Why links back to a report section, for example `Report § Fix these first`.
- The report's "Fix these first" and "What we need from you" use these IDs. Change the plan first, then the report.
- Owner is Will, client or both.
- Needs approval is `yes` when the task changes visible content or copy, `no` for invisible technical fixes.
- Spec is `/plan` for any task over 1 h or touching more than one page, otherwise `inline`.
- Fill in Actual (h) as each task ships. The retro compares estimated versus actual hours.

## Publish batches

Tasks that ship together in one Webflow publish, so the live site gets as few publishes as possible.

| Batch | Task IDs | Needs approval first | Publish when |
|---|---|---|---|
| 1 | {{ids}} | no | {{when}} |
| 2 | {{ids}} | yes: {{what_needs_approval}} | {{when}} |
| 3 | {{ids}} | {{yes_or_no}} | {{when}} |

Google and listing tasks do not need a site publish unless noted.

## Bugs and broken things

Errors visible to visitors, wrong or placeholder content, broken links, consent and analytics faults.

| ID | Task | Why | Effort (h) | Owner | Needs approval | Depends on | Spec | Actual (h) |
|---|---|---|---|---|---|---|---|---|
| B1 | {{task}} | {{why}} (Report § {{section}}) | {{hours}} | {{owner}} | {{yes_no}} | {{ids_or_inputs}} | {{plan_or_inline}} | |
| B2 | {{task}} | {{why}} (Report § {{section}}) | {{hours}} | {{owner}} | {{yes_no}} | {{ids_or_inputs}} | {{plan_or_inline}} | |


## Quick SEO fixes

Titles, descriptions, headings, alt text, canonicals, og:image, sitemap, robots, llms.txt, JSON-LD.

| ID | Task | Why | Effort (h) | Owner | Needs approval | Depends on | Spec | Actual (h) |
|---|---|---|---|---|---|---|---|---|
| S1 | {{task}} | {{why}} (Report § {{section}}) | {{hours}} | {{owner}} | {{yes_no}} | {{ids_or_inputs}} | {{plan_or_inline}} | |
| S2 | {{task}} | {{why}} (Report § {{section}}) | {{hours}} | {{owner}} | {{yes_no}} | {{ids_or_inputs}} | {{plan_or_inline}} | |


## Google and listings

Business Profile setup and optimisation, Search Console and Bing, directories and name/address/phone consistency, the review flow.

| ID | Task | Why | Effort (h) | Owner | Needs approval | Depends on | Spec | Actual (h) |
|---|---|---|---|---|---|---|---|---|
| G1 | {{task}} | {{why}} (Report § {{section}}) | {{hours}} | {{owner}} | {{yes_no}} | {{ids_or_inputs}} | {{plan_or_inline}} | |
| G2 | {{task}} | {{why}} (Report § {{section}}) | {{hours}} | {{owner}} | {{yes_no}} | {{ids_or_inputs}} | {{plan_or_inline}} | |


## Upgrades

New pages, content rewrites, performance and image work, accessibility, booking or conversion improvements.

| ID | Task | Why | Effort (h) | Owner | Needs approval | Depends on | Spec | Actual (h) |
|---|---|---|---|---|---|---|---|---|
| U1 | {{task}} | {{why}} (Report § {{section}}) | {{hours}} | {{owner}} | {{yes_no}} | {{ids_or_inputs}} | {{plan_or_inline}} | |
| U2 | {{task}} | {{why}} (Report § {{section}}) | {{hours}} | {{owner}} | {{yes_no}} | {{ids_or_inputs}} | {{plan_or_inline}} | |


## Later

Ideas not worth doing yet, with the trigger that would change that.

| ID | Task | Why | Effort (h) | Owner | Needs approval | Depends on | Spec | Trigger | Actual (h) |
|---|---|---|---|---|---|---|---|---|---|
| L1 | {{task}} | {{why}} (Report § Looking ahead) | {{hours}} | {{owner}} | {{yes_no}} | {{ids_or_inputs}} | {{plan_or_inline}} | {{what_makes_it_worth_doing}} | |


## Waiting on the owner

Inputs or access needed before a task can start. These feed the report's "What we need from you".

| ID | Input or access needed | Why | Unblocks | Owner | Effort (h) |
|---|---|---|---|---|---|
| W1 | {{input_or_access_needed}} | {{why}} (Report § {{section}}) | {{ids}} | client | {{hours}} |
| W2 | {{input_or_access_needed}} | {{why}} (Report § {{section}}) | {{ids}} | {{owner}} | {{hours}} |


## Already tracked

Tasks with their own spec. This plan points at them and does not re-plan them.

| Task | Spec | Status |
|---|---|---|
| {{task}} | `projects/{{client_slug}}/.claude/specs/{{spec_file}}.md` | {{status}} |
