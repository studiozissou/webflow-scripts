# SME audit report: template

> **When to use:** the client-facing report from `/sme-audit`. English, Notion-flavoured
> markdown, written for an owner who is not technical.
>
> **Output file:** `projects/{client}/.claude/reports/sme-audit-YYYY-MM.md`
>
> **Notion page title:** `{{business_name}}: Website & online presence audit, {{month_year}}`

> **Rules for filling this in**
> - Replace every `{{placeholder}}`. Delete rows and toggles you do not need; never pad.
> - TODO markers for missing owner input are allowed only in "What we need from you". Anywhere else, find the fact or cut the line.
> - Every number and every claim about what Google or an AI tool does needs a row in Sources.
> - "Fix these first" and "What we need from you" are copied from the work plan
>   (`projects/{client}/.claude/specs/work-plan-YYYY-MM.md`) and keep its task IDs, so the two never disagree.
> - Notion formatting: `{toggle="true"}` on toggle headings, `<table fit-page-width>` for wide tables,
>   `color="green_bg"` / `color="yellow_bg"` / `color="red_bg"` on traffic-light and change cells.
> - Run the `humanizer` skill on the final draft. It may change how a claim reads, never what it asserts.

---

**Business:** {{business_name}} | **Site:** {{domain}} | **Audit date:** {{audit_date}} | **Pages checked:** {{pages_checked}}

---

## Summary

{{where_you_stand}}: two or three sentences on what works today and where the site and Google listing fall short.

{{three_biggest_wins}}: the three changes that will make the most difference, in plain words, each with its task ID.

{{what_happens_next}}: what we do first, what we need from you, and when you will see the next update.

---

## Scorecard

Green means in good shape, yellow means worth fixing soon, red means it is holding you back.

<table fit-page-width header-row="true">
<tr><td>Area</td><td>Status</td><td>In one line</td></tr>
<tr><td>Website basics</td><td color="{{website_basics_color}}">{{website_basics_light}}</td><td>{{website_basics_line}}</td></tr>
<tr><td>Google search</td><td color="{{google_search_color}}">{{google_search_light}}</td><td>{{google_search_line}}</td></tr>
<tr><td>Business Profile</td><td color="{{business_profile_color}}">{{business_profile_light}}</td><td>{{business_profile_line}}</td></tr>
<tr><td>AI search (/20)</td><td color="{{ai_search_color}}">{{aeo_score}}/20</td><td>{{ai_search_line}}</td></tr>
<tr><td>Reviews and trust</td><td color="{{reviews_color}}">{{reviews_light}}</td><td>{{reviews_line}}</td></tr>
</table>

### Baseline numbers

The starting point. A later monthly report adds a column per month and diffs against these values, so keep the metric names stable.

<table fit-page-width header-row="true">
<tr><td>Metric</td><td>Value</td><td>Date</td><td>Source</td></tr>
<tr><td>Site health score</td><td>{{site_health}}</td><td>{{date}}</td><td>{{source}}</td></tr>
<tr><td>Pages crawled</td><td>{{pages_crawled}}</td><td>{{date}}</td><td>{{source}}</td></tr>
<tr><td>Broken pages</td><td>{{broken_pages}}</td><td>{{date}}</td><td>{{source}}</td></tr>
<tr><td>Pages with a meta description</td><td>{{meta_description_coverage}}</td><td>{{date}}</td><td>{{source}}</td></tr>
<tr><td>Structured data (JSON-LD) present</td><td>{{json_ld_present}}</td><td>{{date}}</td><td>{{source}}</td></tr>
<tr><td>Lighthouse SEO (mobile)</td><td>{{lighthouse_seo}}</td><td>{{date}}</td><td>{{source}}</td></tr>
<tr><td>Lighthouse accessibility (mobile)</td><td>{{lighthouse_a11y}}</td><td>{{date}}</td><td>{{source}}</td></tr>
<tr><td>Lighthouse best practices (mobile)</td><td>{{lighthouse_bp}}</td><td>{{date}}</td><td>{{source}}</td></tr>
<tr><td>Home page weight</td><td>{{home_page_weight}}</td><td>{{date}}</td><td>{{source}}</td></tr>
<tr><td>Organic keywords ranking</td><td>{{organic_keywords}}</td><td>{{date}}</td><td>{{source}}</td></tr>
<tr><td>Estimated organic visits per month</td><td>{{organic_traffic}}</td><td>{{date}}</td><td>{{source}}</td></tr>
<tr><td>AI search score</td><td>{{aeo_score}}/20</td><td>{{date}}</td><td>{{source}}</td></tr>
<tr><td>AI prompt tests where you are named</td><td>{{prompts_named}} of {{prompts_run}}</td><td>{{date}}</td><td>{{source}}</td></tr>
<tr><td>Business Profile state</td><td>{{gbp_state}}</td><td>{{date}}</td><td>{{source}}</td></tr>
<tr><td>Google review count and average</td><td>{{review_count}} / {{review_average}}</td><td>{{date}}</td><td>{{source}}</td></tr>
</table>

---

## Fix these first

> Drawn from the work plan. Each issue keeps its task ID from `work-plan-YYYY-MM.md`; change the plan first, then copy here.
> Up to 8 issues, ranked by impact and ease. Fewer is fine.

### 1. {{issue_title}} ({{hours}} h) · {{task_id}} {toggle="true"}

*Issue:* {{one_sentence_what_is_wrong}}
*Explanation:* {{one_sentence_why_it_matters}}
*Fix:* {{one_sentence_what_we_do}}
*Benefit:* {{one_sentence_what_changes}}

	---

	**Detail**

	**Root cause:** {{root_cause}}

	**Pages affected:** {{pages_affected}}

	**What to change:** {{steps}}

	**How to verify:** {{how_to_verify}}


(Repeat the block above for issues 2 to 8.)

**Total for this list: about {{total_hours}} h**

---

## Being found on Google

{{search_summary}}: one or two sentences on what people search for and where you show up today.

<table fit-page-width header-row="true">
<tr><td>Term</td><td>NL volume</td><td>EN volume</td><td>Difficulty</td><td>Current position</td><td>Target page</td></tr>
<tr><td>{{term}}</td><td>{{nl_volume}}</td><td>{{en_volume}}</td><td>{{difficulty}}</td><td>{{current_position}}</td><td>{{target_page}}</td></tr>
<tr><td>{{term}}</td><td>{{nl_volume}}</td><td>{{en_volume}}</td><td>{{difficulty}}</td><td>{{current_position}}</td><td>{{target_page}}</td></tr>
</table>

Volumes are monthly searches from {{keyword_source}}, {{keyword_date}}. "Not ranking" means outside the top 100.

---

## New pages worth adding

{{pages_intro}}: one sentence on why focused pages help people find you.

<table fit-page-width header-row="true">
<tr><td>Page</td><td>Who it is for</td><td>Main NL term (volume)</td><td>Main EN term (volume)</td><td>Where it lives</td><td>Task</td></tr>
<tr><td>{{page_title}}</td><td>{{audience}}</td><td>{{nl_term}} ({{nl_volume}})</td><td>{{en_term}} ({{en_volume}})</td><td>{{cms_collection_or_path}}</td><td>{{task_id}}</td></tr>
</table>

**Nearby towns:** {{nearby_towns}}: which towns to name, and where (page copy, Business Profile service area, or a page of their own).

**Claims stay within what the site already says.** {{claims_note}}

---

## Google Business Profile

{{gbp_summary}}: one or two sentences on the state of your listing.

Status key: **VERIFIED** (seen directly), **OWNER-CHECK** (needs your login or a manual look), **NOT FOUND**.

<table fit-page-width header-row="true">
<tr><td>Check</td><td>Status</td><td>What we found</td><td>Task</td></tr>
<tr><td>Named profile exists and is verified</td><td>{{status}}</td><td>{{finding}}</td><td>{{task_id}}</td></tr>
<tr><td>Primary and secondary categories</td><td>{{status}}</td><td>{{finding}}</td><td>{{task_id}}</td></tr>
<tr><td>Name, address and phone match the site exactly</td><td>{{status}}</td><td>{{finding}}</td><td>{{task_id}}</td></tr>
<tr><td>Hours, description and services filled in</td><td>{{status}}</td><td>{{finding}}</td><td>{{task_id}}</td></tr>
<tr><td>Photo count and age of newest photo</td><td>{{status}}</td><td>{{finding}}</td><td>{{task_id}}</td></tr>
<tr><td>Posts in the last 30 days</td><td>{{status}}</td><td>{{finding}}</td><td>{{task_id}}</td></tr>
<tr><td>Reviews: count, average, most recent, replies</td><td>{{status}}</td><td>{{finding}}</td><td>{{task_id}}</td></tr>
<tr><td>Questions and answers</td><td>{{status}}</td><td>{{finding}}</td><td>{{task_id}}</td></tr>
<tr><td>Website or booking link tagged with UTM codes</td><td>{{status}}</td><td>{{finding}}</td><td>{{task_id}}</td></tr>
</table>

Ready-to-paste text for every field is in the Google Business Profile copy pack: {{gbp_copy_pack_link}}.

---

## AI search

{{ai_summary}}: one or two sentences on whether AI tools can find and describe you.

**Score: {{aeo_score}}/20** (PASS = 1, NEEDS ATTENTION = 0.5, NEEDS VERIFY = 0, FAIL = 0; rubric from `ai-search-aeo`).

### The 20 checks {toggle="true"}

<table fit-page-width header-row="true">
<tr><td>#</td><td>Check</td><td>Result</td><td>Evidence</td></tr>
<tr><td>1</td><td>Original, specific content</td><td>{{result}}</td><td>{{evidence}}</td></tr>
<tr><td>2</td><td>First paragraph answers the question</td><td>{{result}}</td><td>{{evidence}}</td></tr>
<tr><td>3</td><td>Clean heading structure</td><td>{{result}}</td><td>{{evidence}}</td></tr>
<tr><td>4</td><td>Question-style headings where natural</td><td>{{result}}</td><td>{{evidence}}</td></tr>
<tr><td>5</td><td>Three paragraphs or fewer per heading</td><td>{{result}}</td><td>{{evidence}}</td></tr>
<tr><td>6</td><td>Three sentences or fewer per paragraph</td><td>{{result}}</td><td>{{evidence}}</td></tr>
<tr><td>7</td><td>Lists have an intro sentence</td><td>{{result}}</td><td>{{evidence}}</td></tr>
<tr><td>8</td><td>Mostly active voice</td><td>{{result}}</td><td>{{evidence}}</td></tr>
<tr><td>9</td><td>Visible "last updated" date</td><td>{{result}}</td><td>{{evidence}}</td></tr>
<tr><td>10</td><td>Updated in the last 90 days</td><td>{{result}}</td><td>{{evidence}}</td></tr>
<tr><td>11</td><td>No time-sensitive wording</td><td>{{result}}</td><td>{{evidence}}</td></tr>
<tr><td>12</td><td>Original numbers or facts</td><td>{{result}}</td><td>{{evidence}}</td></tr>
<tr><td>13</td><td>Clear author or business identity</td><td>{{result}}</td><td>{{evidence}}</td></tr>
<tr><td>14</td><td>Links to trusted outside sources</td><td>{{result}}</td><td>{{evidence}}</td></tr>
<tr><td>15</td><td>Page type that gets cited (guide, comparison, FAQ)</td><td>{{result}}</td><td>{{evidence}}</td></tr>
<tr><td>16</td><td>Descriptive image alt text</td><td>{{result}}</td><td>{{evidence}}</td></tr>
<tr><td>17</td><td>Two or more links to related pages</td><td>{{result}}</td><td>{{evidence}}</td></tr>
<tr><td>18</td><td>robots.txt lets AI crawlers in</td><td>{{result}}</td><td>{{evidence}}</td></tr>
<tr><td>19</td><td>Valid structured data (JSON-LD)</td><td>{{result}}</td><td>{{evidence}}</td></tr>
<tr><td>20</td><td>Rich Results Test clean</td><td>{{result}}</td><td>{{evidence}}</td></tr>
</table>

### Prompt test

The same prompts are saved and re-run in later reports. Run on {{prompt_test_date}}.

<table fit-page-width header-row="true">
<tr><td>Prompt</td><td>Engine</td><td>Named?</td><td>Cited?</td><td>Competitors seen</td></tr>
<tr><td>{{prompt}}</td><td>ChatGPT</td><td>{{yes_no}}</td><td>{{yes_no}}</td><td>{{competitors}}</td></tr>
<tr><td>{{prompt}}</td><td>Perplexity</td><td>{{yes_no}}</td><td>{{yes_no}}</td><td>{{competitors}}</td></tr>
<tr><td>{{prompt}}</td><td>Gemini</td><td>{{yes_no}}</td><td>{{yes_no}}</td><td>{{competitors}}</td></tr>
<tr><td>{{prompt}}</td><td>Google AI Overview</td><td>{{yes_no}}</td><td>{{yes_no}}</td><td>{{competitors}}</td></tr>
</table>

**Named in {{prompts_named}} of {{prompts_run}} runs.** {{prompt_test_takeaway}}

---

## Reviews and trust

{{reviews_summary}}: where reviews live today (Google, sector directories, the site), how many, how recent, and whether they get replies.

- **On the site:** {{reviews_on_site}}
- **Elsewhere:** {{reviews_elsewhere}}
- **Directory listings and name/address/phone match:** {{directory_consistency}}
- **Next step:** {{reviews_next_step}} ({{task_id}})

---

## Looking ahead

{{looking_ahead}}: growth or expansion notes, such as a second location, a new service or a domain change. Say plainly whether each one is urgent.

- **{{topic}}:** {{note}} *Not urgent / Worth planning now.* ({{task_id}})

---

## What we need from you

> Drawn from the work plan's "Waiting on the owner" group, with the same IDs. `TODO-` markers are allowed here only.

| # | What we need | Why | Unblocks |
|---|---|---|---|
| {{w_id}} | TODO-{{input_or_access_needed}} | {{why}} | {{task_ids}} |
| {{w_id}} | TODO-{{input_or_access_needed}} | {{why}} | {{task_ids}} |

---

## Sources

The claim gate: one row per number or claim in this report. A claim without a source and date is rewritten or removed.

<table fit-page-width header-row="true">
<tr><td>Claim</td><td>Section</td><td>Source</td><td>Date</td></tr>
<tr><td>{{claim}}</td><td>{{section}}</td><td>{{source_tool_or_url}}</td><td>{{date}}</td></tr>
<tr><td>{{claim}}</td><td>{{section}}</td><td>{{source_tool_or_url}}</td><td>{{date}}</td></tr>
</table>

Humanizer pass: {{humanizer_date}}.

---

*{{author_first_name}}*
