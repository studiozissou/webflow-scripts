# Monthly Site Report — Retainer Clients

> **When to use:** Recurring monthly report for clients on a retainer. Pushed to Notion
> as the client-facing deliverable. Compact, scannable, toggle-detail format.
>
> **Not this template?**
> - First engagement / one-off audit → use `site-audit-client-report.md` (intake template)
> - Internal reference → use `site-audit-report.md`

---

## Output file

`projects/{client}/.claude/comms/site-report-YYYY-MM.md`

One file per month. Not date-stamped — month-stamped (e.g. `site-report-2026-07.md`).

---

## Notion push format

When pushing to Notion, toggle headings use `{toggle="true"}` markers. These become
collapsible toggles in Notion. The Notion page title is:
`[Client Name] Site Report – [Month YYYY]`

---

## Data — ALWAYS pull fresh from SEMRush (do not reuse last month's numbers)

Every time this report is written or rewritten, pull live data via the SEMRush MCP —
never hand-carry or estimate figures. Standing instruction (Will, Jul 2026).

1. **Site-audit metrics (both columns from SEMRush):**
   - `projects_research → list_projects` to get the project ID.
   - `siteaudit_research → snapshots` for the snapshot IDs; use the newest as the
     current month and the prior month's snapshot as the baseline. Both report columns
     come from real snapshots — that way this month's fixes show in the numbers instead
     of being flagged "reflects next crawl."
   - `snapshot` for each snapshot ID (site health = `quality.value`, pages = `pages_crawled`,
     issue counts by ID). `meta_issues` maps issue IDs → names. Use `issue_details` to
     confirm the composition of a big issue (e.g. structured-data errors) before writing
     it up.

2. **Blog topic suggestions (always populate — never leave as "pending"):**
   - `organic_research → domain_organic` for the client domain (striking-distance
     keywords, positions 4–20) to see what's already covered / near-win.
   - `keyword_research → phrase_questions` on the client's core commercial topics for
     high-volume question gaps. Exclude topics the client already ranks for; group the
     rest into clusters with UK monthly volume and a short "why it fits" note; end with a
     recommended first three.

3. **Performance / Lighthouse — run it live every time for our own diagnostics, but keep
   it OUT of the client report unless there's a material problem worth an action.**
   The client report stays lean: no Lighthouse scores table, no "Other notes" / meta
   commentary. Only surface performance if it becomes a top-issue (e.g. a slow template
   or a bad field LCP) — then add it as one numbered issue, not a section.
   - Test a **representative set — one page per major template**, not just the homepage.
     Don't guess the set: read the client's `intake.json → keyPages` and pick one of each
     template type. For Carsa: `/` (home), `/used-cars` (listing), a live in-stock VDP
     under `/vehicles/used/…` (pick a currently-available car — VDP slugs sell, so don't
     hardcode), `/car-finance` (service), `/stores` (store), `/blog` (blog),
     `/part-exchange` (tool).
   - For each: `performance_start_trace` (mobile, reload) for Core Web Vitals (lab LCP/CLS
     + CrUX field LCP/INP/CLS) and `lighthouse_audit` (device=mobile) for Accessibility /
     Best Practices / SEO. Use the results to inform the issue list; don't paste the scores.
   - If a run genuinely can't happen, don't fabricate or write "didn't run" — say so.

Use the `uk` database for UK clients (`mobile-uk` if mobile-specific).

---

## Template

```markdown
**Month:** [Month YYYY] | **Site:** [domain] | **Pages crawled:** [N]

---

## Summary

(2-3 paragraphs. Plain language. Lead with what improved or what's going well. Name
the biggest concern concisely. End with what needs attention first.

This is the paragraph the client reads. Make it count. No jargon. No filler.)

---

## Key metrics

**SEO health**

| Metric | [Prev month] | [This month] | Change |
|--------|-------------|--------------|--------|
| Pages crawled | | | |
| Structured data errors | | | |
| Broken internal links | | | |
| Duplicate titles | | | |
| Multiple H1 tags | | | |
| 4xx errors | | | |
| Lighthouse perf (mobile avg) | | | |
| Lighthouse a11y (mobile avg) | | | |

(Include only metrics that moved OR that the client specifically tracks. Don't pad
with stable numbers unless they provide context — e.g. "still 0 server errors" is
worth noting if it was previously broken.)

(Colour-code the Change column when pushing to Notion:
- Green for improvements
- Red for regressions
- Orange for minor concerns)

**AI search readiness (AEO)**

| Category | [Prev month] | [This month] | Change | To improve |
|----------|-------------|--------------|--------|------------|
| Structured data | /4 | /4 | | |
| Answer structure | /6 | /6 | | |
| Freshness | /3 | /3 | | |
| Authority | /4 | /4 | | |
| Technical | /3 | /3 | | |
| **Overall** | **/20** | **/20** | | |

(The "To improve" column is unique to this template. One sentence per category
explaining the single most impactful thing the client could do to gain the next point.
Leave blank if the score is already maxed.)

---

## What changed and why

Four categories. Only include categories that have entries.

**Fixed:**
- (What was resolved this month. Be specific: "Chatbot H1 resolved on 40 pages
  (42 → 2 remaining)." not "H1 issue improved.")

**Regressed:**
- (What got worse. Always explain WHY — inventory growth, template change,
  third-party issue. Include the number and the cause.)

**Added:**
- (New pages, new features, new schema deployed.)

**Removed:**
- (Pages removed, features deprecated. If nothing: omit this category entirely.)

---

## Top 10 issues to fix

Ranked by impact and ease of fix. Each issue has a short description visible at the
top level, with a toggle containing the full detail.

### [N]. [Short title] — [time estimate] {toggle="true"}

(At the top level, outside the toggle:)

*Issue:* [One sentence — what's wrong.]
*Explanation:* [One sentence — why it matters to the client.]
*Fix:* [One sentence — what we do about it.]
*Benefit:* [One sentence — what changes after the fix.]

(Inside the toggle — the "Detail" block:)

	---

	**Detail**

	**Root cause:** [2-3 sentences explaining the technical reason. Use plain language
	but be precise enough that another developer could act on it.]

	**Pages affected:** [Specific URLs, URL patterns, or counts. E.g. "All /used-cars/make/*
	pages (1,235 total)" or list specific pages if fewer than 10.]

	**What to change:** [Step-by-step instructions. Reference specific files, templates,
	CMS fields, or Webflow settings. Be concrete: "Open the Stores collection in Webflow.
	Fill in the SEO Title field (format: 'Carsa {Store Name} | Used Cars in {City}')"]

	**How to verify:** [How to confirm the fix worked. E.g. "Run Google Rich Results Test
	on /used-cars/make/audi. Should show 0 errors." or "View page source and search for
	<h1>. Should find exactly one."]

	(Optional: **Flagged since:** [Month YYYY] — if this is a recurring issue.)
	(Optional: **Longer-term fix:** — if there's a better solution that takes more work.)

(End of toggle content.)

**Rules for the top 10:**
- Rank 1 = highest impact, most feasible. Rank 10 = still worth doing, lower leverage.
- Time estimates in the heading: (5 min), (15 min), (30 min), (1 hour), (2 hours).
- If an issue from last month was fixed, it drops off. New issues slot in.
- If an issue moved up or down, note it in the heading: "(was #3)"
- Cap at 10. If fewer than 10 real issues, list fewer. Never pad.
- Issues that need client input: note it in the Fix line.

**Total estimated time: ~[N] hrs [N] min**

(Sum of all time estimates. This gives the client a quick sense of the work involved.)

---

## 5 strategic opportunities

Forward-looking suggestions that go beyond fixing errors. These are growth moves the
client decides whether to pursue.

### [N]. [Title] — [time estimate or "TBC" or "already scoped"] {toggle="true"}

(At the top level: 2-3 sentences explaining what this is and why it matters now.)

(Inside the toggle:)

	---

	**Detail**

	[3-5 paragraphs with specific implementation detail, pages affected, expected impact,
	dependencies on other work, and current status.]

	(Optional: **AEO impact:** [Which AEO category improves and by how much.])
	(Optional: **SEO impact:** [Expected ranking/traffic effect.])
	(Optional: **Depends on:** [Other fixes or client input needed first.])
	(Optional: **Status:** [Already scoped / needs discovery / TBC])

**Rules:**
- These are suggestions, not committed tasks. Advisory tone.
- Each should explain why NOW — what data or trend supports the timing.
- Don't repeat items already in the top 10.
- Can reference AEO categories, competitor gaps, or keyword opportunities.
- Time estimates are rougher here — ranges are fine ("2-4 hours").

**Total estimated time: ~[N] hrs** (excludes items scoped separately)

---

## Blog topic suggestions

(ALWAYS populate this section — pull fresh SEMRush keyword data every time per the "Data"
section above; never leave it as "pending." These are blog article topics that exploit
keyword opportunities — gaps where the site could rank but doesn't have content yet.)

### Keyword opportunities

| Topic | Target keyword | Monthly volume | Current position | Difficulty | Content type |
|-------|---------------|----------------|------------------|------------|--------------|
| | | | | | |

(Content type: guide, listicle, comparison, FAQ, data piece, how-to, news/opinion.)

### Suggested articles

**[N]. [Article title]**
*Target keyword:* [primary keyword + 2-3 related terms]
*Why now:* [What the data shows — search volume, competitor gap, seasonal trend,
or topic cluster opportunity.]
*Angle:* [What makes this article different from what's already ranking. Original data,
local expertise, unique perspective.]
*Internal links:* [Which existing pages this article should link to and from.]

(Rules:
- 5-10 article suggestions, ranked by opportunity size.
- Each should connect to an existing page or topic cluster on the site.
- Prioritise topics where the site already has some authority or data.
- Include a mix of content types — not all listicles, not all guides.
- Note seasonal timing if relevant: "Publish before [month] for peak search volume."
- Reference specific SEMRush data: volume, difficulty score, competitor coverage.)

---

## Other notes

(Optional. Context flags, things that aren't issues but need noting. Examples:
- "404s for sold vehicles are intentional — not errors to fix."
- "Storage pages may be meant to be hidden. Worth confirming."
- "Next Lighthouse baseline will be run in [month]."
- Upcoming Google changes, seasonal reminders, client questions from last meeting.)

(Omit this section entirely if there's nothing to add.)

---

*[Your first name]*
```

---

## Writing rules (same as all client reports)

- **No technical jargon.** The client doesn't need to know what JSON-LD is. They need
  to know that Google can't show rich results on 1,235 pages.
- **Concrete numbers.** "1,235 pages" not "many pages". "400 clicks/day" not "growing traffic".
- **Opportunity framing.** "One template change fixes 1,235 pages" not "1,235 pages are broken".
- **Give credit.** Lead with what's working before naming problems.
- **Vary the language.** Don't start every Benefit line the same way. Don't use the same
  sentence pattern across all 10 issues.
- **Load the `humanizer` skill** before writing and apply it to the final draft.
- **Meeting context overrides scan data.** If the client said 404s for sold cars are
  intentional, note it as context, don't flag it as an error.
- **Toggle detail is for developers and curious clients.** The top-level
  Issue/Explanation/Fix/Benefit must stand alone without opening the toggle. The detail
  block is for anyone who wants to understand the root cause or do the fix themselves.

---

## Source files

Read these before writing:
- `audits/semrush-YYYY-MM-DD.md` (primary data source — issue counts, comparisons)
- `audits/structure.md` (Lighthouse scores, technical checks)
- `audits/seo.md` (SEO findings)
- `audits/content.md` (content and code inventory)
- `audits/aeo.md` (AEO scores)
- Previous month's report: `comms/site-report-YYYY-MM.md` (for month-over-month deltas)
- `client.md` (client context, meeting notes, known intentional issues)
- SEMRush organic/keyword data (if available — for blog topic suggestions)

---

## Month-over-month continuity rules

- **Issue numbering resets each month.** Unlike the internal report (which uses stable
  task numbers), the monthly report ranks issues fresh each time. The top 10 reflects
  THIS month's priority order, not last month's numbering.
- **Reference last month when relevant.** "Was 0 in May, now 1,235" gives context.
  "Down from 42 to 2" shows progress.
- **Drop fixed issues.** If something was fixed, it leaves the top 10. Mention it in
  "What changed and why" → Fixed.
- **Note movement.** If an issue was #7 last month and is now #3, say "(was #7)".
- **Strategic opportunities can persist.** Unlike the top 10, strategic opportunities
  may stay on the list across months if they haven't been acted on. Update the detail
  with any new data.
