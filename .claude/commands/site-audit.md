# /site-audit — Full Client Site Audit

Run when taking on an existing Webflow site for a full engagement. Captures client context,
audits the site across 5 dimensions, produces a prioritised report with blank effort columns,
optionally layers in SEMRush intelligence and competitor benchmarking, and bridges to pricing.

**Never writes to the Webflow project. Read-only throughout.**

**Replaces:** Nothing. `/intake` stays as the lightweight quick audit. `/site-audit` is the
full-engagement version — same Phase 1-2 logic, deeper Phase 3+.

---

## Phase 1 — Pre-flight + client context

If `client.md` already exists, read it and confirm context. Skip questions.

Otherwise ask all of the following in a single conversational block:

1. What's the client name and what does the company do?
2. What's the primary goal of this site? (leads / e-commerce / content / brand)
3. Who is the target audience?
4. What's the geographic market?
5. Any known competitors?
6. What's the engagement scope? (retainer / one-off / build + handoff)
7. Who's the main contact — are they technical?
8. Is there an in-house team or other agencies touching the site?
9. Is this a migration, redesign, or has it been on Webflow from the start?
10. Any issues already flagged, or anything explicitly out of scope?

Write to `client.md`. Confirm before proceeding.

---

## Phase 2 — Connect + discover

### Primary: Webflow MCP

1. Connect via Webflow MCP
2. Retrieve and record in `intake.json`:
   - Project name and ID
   - Staging and live URLs
   - All pages (slug, title, published status)
   - All CMS collections and item counts
   - Ecommerce config if present
   - Designer comments (resolved/unresolved count + summary)
   - Locale configuration
   - Any typos noted during collection/page scan (record in `typoNote` field)
   - Whether taxonomy-only collections have unnecessary template pages (`needsTemplatePage` field)
3. Confirm both URLs with user before proceeding

### Fallback: Chrome DevTools MCP

If Webflow MCP is not connected:

1. Load the `chrome-devtools` skill
2. Navigate to the live site URL
3. Use `take_snapshot` for DOM structure
4. Use `evaluate_script` to extract:
   - Page list from sitemap.xml or nav links
   - All `<meta>` tags
   - All `<script>` and `<link>` tags (for code inventory)
5. Record what's available in `intake.json`
6. Note: CMS collections, designer comments, and ecommerce config will be incomplete

### Fallback: WebFetch + manual input

If neither MCP is available:

1. Use WebFetch on the live URL to get basic page structure
2. Ask the user to provide: page list, CMS collection names, staging URL
3. Record in `intake.json` with a `source: "manual"` flag

### Asset CSV (optional)

Ask: "Do you have the asset bandwidth CSV from Webflow Settings → Hosting → Usage? (optional — enables the Asset Optimisation section)."

If provided:
- Parse to populate bandwidth-by-filetype table
- Identify top offenders by bandwidth
- Flag if PNGs are >50% of bandwidth

---

## Phase 3 — Scaffold directories

Create the full `.claude/` tree:

```
.claude/
├── audits/
├── reports/
├── proposals/
├── comms/
├── client-requests/   (only if client change-list will be provided)
├── briefs/
├── schema/
└── specs/
```

Do not create directories that already exist.

---

## Phase 4 — Core audit (parallel, always runs)

### Custom code discovery (before parallelisation)

Custom code embeds are not exposed by Webflow MCP. Use this fallback chain:

1. **Chrome DevTools MCP** (if connected): navigate to live site, `evaluate_script` to extract
   all `<script>` and `<link>` tags, identify CDN sources, version pins, and inline code blocks.
2. **Manual input:** Ask: "Can you copy the custom code from Webflow Settings → Custom Code
   (head + body) and paste it here? Also check any per-page custom code on key pages."
   Parse the pasted code to build the inventory.

Record the code inventory for Stream C.

### Parallelisation gate

Reference the `parallelisation` skill. Present the gate with 5 independent streams:

| # | Stream | Agent type | Tools | Est. tokens |
|---|--------|-----------|-------|-------------|
| A | Technical + Analytics | Explore | WebFetch, Webflow MCP (or Chrome DevTools fallback) | ~18k |
| B | SEO + Schema | seo | WebFetch, SEMRush site-audit (if connected) | ~20k |
| C | Content + Code inventory | Explore | Webflow MCP (or Chrome DevTools fallback), Read | ~16k |
| D | AEO | Explore + `ai-search-aeo` skill | WebFetch | ~16k |
| E | Brand voice + ICP inference | content | WebFetch | ~12k |

Sequential: ~80s / ~82k tokens. Parallel: ~30s / ~90k tokens (~2.7x faster, +1.1x cost).
Medium risk (WebFetch can be flaky on some checks).

**Recommendation: Parallel** (independent check domains, read-only, separate output files).

If user approves parallel, spawn 5 subagents simultaneously. If sequential, run in order A→E.

### Stream A — Technical + Analytics

| Check | What to look for |
|---|---|
| `robots.txt` | Present, not blocking crawlers |
| `sitemap.xml` | Present, referenced in robots.txt |
| Custom 404 | Configured in Webflow settings |
| Favicon | Set in Webflow settings |
| SSL | Site served over HTTPS |
| Canonical domain | Consistent WWW/non-WWW |
| Analytics | GA4 or GTM in page embeds |
| Cookie consent | Any consent mechanism present |
| Alignment | Analytics not firing before consent |
| Lighthouse Performance | If Chrome DevTools MCP available, run Lighthouse audit on homepage + 2 key pages |
| Lighthouse Accessibility | Same — record scores and recurring issues |

Write to `audits/structure.md`.

### Stream B — SEO + Schema

| Check | What to look for |
|---|---|
| Meta titles | Present and unique on all pages |
| Meta descriptions | Present on all pages |
| OG title + image | Set on key pages |
| Canonical tags | Present, no duplicates |
| H1 tags | Exactly one per page |
| Heading hierarchy | No jumps (H2→H4) |
| Schema.org JSON-LD | Present on homepage, type check (Organization vs Product default) |
| JSON-LD coverage | Count pages with/without across site |
| Schema gaps | Flag missing: FAQPage, Article, Person, JobPosting, BreadcrumbList, Organization |
| Sitemap completeness | All published pages included |
| `llms.txt` | Present at root — recommend if absent |
| Hreflang | Present if multi-locale, check for conflicts |
| Broken external links | Flag pages with broken outbound links |

Write to `audits/seo.md`.

### Stream C — Content + Code inventory

| Check | What to look for |
|---|---|
| Forms | Confirmation or redirect set |
| Images | 3+ images missing alt text flagged |
| Viewport | Mobile meta viewport present |
| CMS hygiene | Collection name typos, unnecessary template pages on taxonomy collections |
| Dev/test pages | Any published dev, test, or style-guide pages |
| Low text-to-HTML ratio | Flag if widespread (expected for design-heavy sites) |
| Custom code inventory | Full list of site-wide and per-page head/body embeds and third-party scripts |

For each script in the code inventory, record: name, source CDN/URL, version (if pinned),
risk level (Low/Medium/High/Critical), and notes.

**Third-party code flag:** If the inventory shows 3+ external scripts or any code hosted on
a third-party GitHub (not the client's own), auto-flag a **"Code migration to client-owned
GitHub"** task in P1 with justification tag `De-risk`. Include the full migration plan template:
- Repo structure (`client-org/client-webflow/src/`, `dist/`, `vendor/`)
- jsDelivr CDN pattern (`cdn.jsdelivr.net/gh/org/repo@vX.Y.Z/src/main.js`)
- Version-pinning rules (never `@latest` in production)
- Purge workflow (`https://purge.jsdelivr.net/gh/...`)

Write to `audits/content.md`.

### Stream D — AEO / AI-search

Load the `ai-search-aeo` skill and run the 20-check audit rubric against the homepage + 2-3
top traffic pages (if analytics available) or the 2-3 most linked pages.

| Check | What to look for |
|---|---|
| Schema (A1-A4) | JSON-LD present, FAQPage on Q&A content, HowTo on tutorials |
| Answer structure (B5-B10) | Answer-first lead, question H2s, paragraph and section length, list intros, active voice |
| Freshness (C11-C13) | Visible "last updated" timestamp, recent update, no time-sensitive hedge words |
| Authority (D14-D17) | Original data/stats, author/entity signals, external citations, cite-magnet archetype |
| Technical (E18-E20) | Descriptive alt text, 2+ internal links, AI bot rules in `robots.txt` |

Write to `audits/aeo.md` with a scorecard per page, overall AEO score (/20), maturity level
(L1 Invisible / L2 Emerging / L3 Competitive / L4 Dominant), and a prioritised fix list.

### Stream E — Brand voice + ICP inference

Read 3-5 key pages via WebFetch (homepage, about, services, and 1-2 others relevant to the
business). From the copy, infer:

**Brand voice** (`brand-voice.md`):
- 3-5 tone adjectives (e.g. "confident", "warm", "precise")
- Do words / Don't words
- Vocabulary level (casual / professional / technical / academic)
- Sentence style tendencies
- Sample phrases that capture the voice

**Ideal Customer Profiles** (`ideal-customer-profiles.md`):
- 2-3 audience segments
- For each: name, role/demographic, goals, pain points, language they use, what they need from the site

If `brand-voice.md` or `ideal-customer-profiles.md` already exist, read and confirm rather
than overwriting. Only regenerate if user requests it.

Write to `brand-voice.md` and `ideal-customer-profiles.md`.

### Merge results

After all streams complete, confirm all 5 output files exist:
- `audits/structure.md`
- `audits/seo.md`
- `audits/content.md`
- `audits/aeo.md`
- `brand-voice.md` + `ideal-customer-profiles.md`

---

## Phase 5 — Optional enrichment layers

After core audit, present three optional layers:

**Layer A: SEMRush organic intelligence**
- Domain overview (all markets)
- Top ranking keywords (primary market)
- Top pages by traffic
- 12-month trend
- Writes to `audits/seo.md` (appended) or separate `audits/semrush-YYYY-MM-DD.md`

**Layer B: Competitor benchmark** (requires Layer A)
- Top 4-5 organic competitors from SEMRush
- Keyword overlap
- Traffic comparison
- Positioning analysis
- Writes to `audits/competitor-benchmark-YYYY-MM-DD.md`

**Layer C: Client change-list mapping**
- User provides the change-list (paste, file path, or URL)
- Save verbatim to `client-requests/change-list-YYYY-MM-DD.md`
- Map each item onto audit findings with justification tags
- Write to `client-requests/change-list-mapped-YYYY-MM-DD.md`

Gate question:

> Which optional layers would you like to add? (These can also be run later.)
> - A only (SEMRush organic intelligence)
> - A+B (SEMRush + competitor benchmark)
> - C only (client change-list mapping)
> - A+B+C (all three)
> - Skip all

If skipped, the report will include "Section not yet run" placeholders for these sections.

---

## Phase 6 — Synthesis + report

Merge all outputs into `reports/intake-report-YYYY-MM-DD.md`.

### Report structure

```markdown
# Site Intake Report — [Client Name]

**Date:** YYYY-MM-DD | **Live URL:** | **Staging URL:**

## Summary
(2-3 paragraph executive summary: what the site is, who it serves, what's working,
what the material issues are, and a one-line verdict.)

## Passing
(Table: Check | Status | Notes — everything that's working well.)

## Needs Attention

### SEO — Meta & Open Graph
### SEO — Structure & Schema
### Technical — Custom Code
### Content & Accessibility
### CMS Hygiene

(Each subsection: Issue | Severity | Detail table.)

## Missing or Broken
(Table: Check | Detail — things that are absent or non-functional.)

## Lighthouse Audits
(If Chrome DevTools MCP was available. Subsections: Accessibility, Performance.
Include scores table + recurring issues table.)
(If not available: "Lighthouse audits require Chrome DevTools MCP. Run `/test-page`
separately to generate these.")

## SEMRush Organic Intelligence
(If Layer A ran. Include: Domain overview table, top keywords table, top pages table,
12-month trend table, analysis paragraphs.)
(If not run: "Section not yet run. Re-invoke `/site-audit` with Layer A to populate.")

## Competitor Benchmark
(If Layer B ran. Include: competitor comparison table, keyword overlap, positioning analysis.)
(If not run: "Section not yet run. Requires Layer A+B.")

## AEO Score
(Category | Score | Detail table. Overall score /20 with maturity level.)

## Recommended Next Steps
```

### Recommended Next Steps structure

Explain the justification tag system:

- **SEO** — search ranking, crawlability, SERP CTR
- **AEO** — AI answer engine citations (ChatGPT, Perplexity, SGE)
- **Perf** — page speed, Core Web Vitals, LCP
- **De-risk** — business continuity, dependency removal, compliance
- **Trust** — credibility signals
- **A11y** — accessibility, WCAG
- **Conv** — conversion (forms, funnels)
- **Ops** — operational efficiency, CMS hygiene, handover quality

If Layer C ran (client change-list), reference the mapped change list and link to
`client-requests/change-list-mapped-YYYY-MM-DD.md`.

### Priority-band tables

```markdown
### P0 — Week 1 — [summary phrase]

[1-2 sentence description of the band's character.]

| # | Task | Effort | Justification | Client item |
|---|------|--------|---------------|-------------|
| 1 | **[Task description]** | TBD | **[Tag]** — [why] | [Item # or —] |

**P0 total: TBD hours.**

---

### P1 — Week 1-2 — [summary phrase]
### P2 — Week 2-3 — [summary phrase]
### P3 — Week 3-4 — [summary phrase]
### P4 — Ongoing (retainer) — [summary phrase]
```

**Priority-band assignment rules:**
- **P0:** <1h per task, high impact, no design decisions needed
- **P1:** Critical risk or highest-ROI items (schema, de-risk)
- **P2:** Client-visible design changes + rich results
- **P3:** Editorial foundation + operational stability
- **P4:** Growth, content, retainer-territory

**Effort column is BLANK.** Every task row uses `TBD` as the effort placeholder.
The user fills these in manually. Never guess hours.

If client change-list was mapped (Layer C), include a `Client item` column referencing
the original item number. If no change-list, use `—` in that column.

### Remaining report sections

```markdown
## Custom Code Inventory
(Full table: Script | Source | Risk — from Stream C.)

## Custom Code Migration Plan
(Only if third-party hosted code was detected. Full migration plan with repo structure,
CDN pattern, version-pinning rules, purge workflow, and risk mitigations.)

## Asset Optimisation
(Only if asset CSV was provided AND PNGs are >50% of bandwidth. Include:
bandwidth-by-filetype table, top offenders table, why it's happening, remediation phases,
expected impact table.)

## Sub-audits
(Links to all audit files: audits/structure.md, audits/seo.md, audits/content.md,
audits/aeo.md, competitor benchmark if run, brand-voice.md, ideal-customer-profiles.md,
client change-list files if created.)
```

End with: `*Report generated by automated site audit. Manual verification recommended for items marked "NEEDS VERIFY".*`

---

## Phase 6b — Automation triage

After the report is written, spawn a **code-reviewer agent** that reads the completed report
and classifies every task in the P0-P4 tables into one of three categories:

| Tag | Meaning | Example |
|-----|---------|---------|
| `AUTO` | Can be fully automated by Claude Code right now | Fix CMS typos, add aria-labels, shorten page titles, add schema JSON-LD, fix broken links, unpublish dev pages |
| `SEMI` | Automatable with user confirmation or design input | URL rewrite (needs 301 map approval), body text colour (needs user to pick from options), footer redesign (needs Figma direction) |
| `MANUAL` | Requires manual human work | Fill in effort estimates, Webflow Support ticket, client calls, billing walkthrough, discovery sessions |

The agent appends an `Automation` column to each P-band table in the report:

```
| # | Task | Effort | Justification | Client item | Automation |
|---|------|--------|---------------|-------------|------------|
| 1 | Unpublish 7 dev pages | TBD | SEO | — | AUTO |
```

Also append an automation summary at the bottom of the report (before Sub-audits):

```markdown
## Automation Summary

- **AUTO:** N tasks — can be executed immediately with `/build`
- **SEMI:** N tasks — need user input before automation
- **MANUAL:** N tasks — require human action
```

---

## Phase 7 — Pricing + proposal bridge (optional, gated)

After report is written, tell the user:

> "Report generated with blank effort columns. Fill in your estimates, then come back
> and say 'price it' — I'll calculate totals and generate client comms."

When re-invoked (user says "price it", "calculate pricing", or similar):

1. Re-read the report, detect filled-in effort values in the P-band tables
2. If any tasks still have `TBD`, list them and ask user to fill in before proceeding
3. Ask: "What's your hourly rate?" (or read from `.claude/reference/rate-card.md` if it exists)
4. Calculate per-band totals and overall total
5. Generate pricing summary table:

```markdown
## Pricing Summary

| Band | Hours | Cost |
|------|-------|------|
| P0 | ___ | ___ |
| P1 | ___ | ___ |
| P2 | ___ | ___ |
| P3 | ___ | ___ |
| P4 | ___ | ___ |
| **Total** | **___** | **___** |

**Rate:** [rate]/hour
```

6. Ask: "Generate client comms?" — if yes, produce all 4 formats:
   - `comms/plan-and-options-slack-YYYY-MM-DD.md` — Slack mrkdwn format (single-asterisk bold, bullet points, blockquotes)
   - `comms/plan-and-options-email-YYYY-MM-DD.md` — Email format (professional, paragraph-based)
   - `comms/plan-and-options-notion-YYYY-MM-DD.md` — Notion format (toggles, callouts, database-ready tables)
   - `comms/plan-and-options-plaintext-YYYY-MM-DD.txt` — Plain text (no formatting, copy-pasteable anywhere)

   Each format includes: per-band summary with cost, key highlights, outstanding clarifications,
   and a call-to-action. Source: the report + pricing summary. Tone: match `brand-voice.md` of
   the consultant (from `.claude/reference/about-me.md` if available), not the client's brand voice.

7. Ask: "Generate a full proposal?" — if yes, bridge to `/proposal`

---

## Verification

1. `/site-audit` triggers correctly from the command list
2. `client.md` exists with all 10 questions answered
3. `intake.json` exists with `urls`, `pages`, `collections`, `checks` keys
4. All scaffold directories exist
5. Phase 2 fallback chain works: Webflow MCP → Chrome DevTools → WebFetch + manual
6. 5 audit output files produced: `audits/structure.md`, `audits/seo.md`, `audits/content.md`, `audits/aeo.md`, `brand-voice.md` + `ideal-customer-profiles.md`
7. Phase 5 layers are skippable and re-runnable later
8. Report matches the section structure above (Summary through Sub-audits)
9. Priority-band tables have blank effort columns with `TBD` placeholders
10. Justification tags used: SEO, AEO, Perf, De-risk, Trust, A11y, Conv, Ops
11. Phase 6b automation triage adds `Automation` column (AUTO/SEMI/MANUAL) to every P-band table
12. Automation Summary section present in report
13. Phase 7 correctly reads user-filled estimates and calculates pricing
14. Multi-format comms match the 4-format set (Slack/Email/Notion/Plain text)
15. Asset CSV parsing produces bandwidth tables when provided and PNGs >50%
16. Custom code migration plan included when third-party hosted code detected
17. Existing `/intake` command is unchanged
