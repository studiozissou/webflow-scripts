# /site-audit — Full Client Site Audit

Run when taking on an existing Webflow site for a full engagement. Captures client context,
audits the site across 5 dimensions, produces a prioritised report with blank effort columns,
optionally layers in SEMRush intelligence and competitor benchmarking, and bridges to pricing.

**Never writes to the Webflow project. Read-only throughout.**

**Replaces:** Nothing. `/intake` stays as the lightweight quick audit. `/site-audit` is the
full-engagement version — same Phase 1-2 logic, deeper Phase 3+.

---

## Re-entry check

Before starting, check the project's existing state:

1. If `reports/intake-report-*.md` exists AND effort columns are filled in → skip to Phase 7.
2. If `reports/intake-report-*.md` exists but effort columns still show `TBD` → remind user
   to fill in estimates, then stop. User can re-invoke when ready.
3. If no report exists → proceed from Phase 1.

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

Custom code embeds are not exposed by Webflow MCP. Fallback chain:
1. **Chrome DevTools MCP** (if connected): `evaluate_script` to extract all `<script>` and
   `<link>` tags with CDN sources, version pins, and inline code blocks.
2. **Manual input:** Ask user to paste custom code from Webflow Settings → Custom Code
   (head + body) + any per-page custom code on key pages.

Record the code inventory for Stream C.

### Parallelisation gate

Reference the `parallelisation` skill. Present the gate with 5 independent streams:

| # | Stream | Agent type | Tools | Est. tokens |
|---|--------|-----------|-------|-------------|
| A | Technical + Analytics | Explore | WebFetch, Webflow MCP (or Chrome DevTools fallback) | ~18k |
| B | SEO + Schema | seo | Playwright or Chrome DevTools (required for `<head>` checks), WebFetch (body content only), SEMRush site-audit (if connected) | ~20k |
| C | Content + Code inventory | Explore | Webflow MCP (or Chrome DevTools fallback), Read | ~16k |
| D | AEO | general-purpose (loads `ai-search-aeo` skill) | WebFetch | ~16k |
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

**CRITICAL: WebFetch strips `<head>` content during HTML-to-markdown conversion.** This causes
false negatives for meta descriptions, canonical tags, OG tags, and can misreport heading levels.

For ALL checks involving `<head>` metadata or heading tag counts, you MUST use Playwright
`browser_evaluate` or Chrome DevTools `evaluate_script` with direct DOM queries:

```js
() => ({
  title: document.title,
  titleLength: document.title.length,
  h1s: Array.from(document.querySelectorAll('h1')).map(el => el.textContent.trim()),
  metaDescription: document.querySelector('meta[name="description"]')?.content,
  canonical: document.querySelector('link[rel="canonical"]')?.href,
  ogTitle: document.querySelector('meta[property="og:title"]')?.content,
  ogDesc: document.querySelector('meta[property="og:description"]')?.content,
  ogImage: document.querySelector('meta[property="og:image"]')?.content,
})
```

WebFetch is acceptable ONLY for reading body content (e.g. checking text quality, link hrefs).

| Check | What to look for |
|---|---|
| Meta titles | Present and unique on all pages |
| Meta descriptions | Present on all pages |
| OG title + image | Set on key pages |
| Canonical tags | Present, no duplicates |
| H1 tags | Exactly one per page (watch for third-party widgets injecting extra H1s) |
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

Write to `.claude/brand-voice.md` and `.claude/ideal-customer-profiles.md`.

### Merge results

After all streams complete, confirm all 5 output files exist:
- `audits/structure.md`
- `audits/seo.md`
- `audits/content.md`
- `audits/aeo.md`
- `.claude/brand-voice.md` + `.claude/ideal-customer-profiles.md`

If a stream failed (e.g. WebFetch timeout), note the failure in the merge summary and proceed
with available data. The missing stream can be re-run separately.

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

Read and follow the template at `.claude/templates/site-audit-report.md`. The template defines
the full section order, justification tags, priority-band table format, assignment rules,
and conditional sections (Lighthouse, SEMRush, Asset Optimisation, Migration Plan).

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

Also append an `## Automation Summary` section to the report (before Sub-audits) with
counts per category — see template for format.

---

## Phase 6c — Narrative (auto-generated)

Immediately after Phase 6b, spawn a **content agent** that reads the completed internal
report and generates `proposals/narrative-YYYY-MM-DD.md`.

Read and follow the template at `.claude/templates/site-audit-narrative.md`. The narrative
synthesizes findings into the three-beat story (where the site is, what's holding it back,
what the work unlocks), key phrases, and pillar mapping.

Source files: `reports/intake-report-YYYY-MM-DD.md`, `audits/*.md`, `brand-voice.md`,
`ideal-customer-profiles.md`, and `client-requests/change-list-mapped-*.md` if it exists.

Present the narrative to the user for review before proceeding.

---

## Phase 7 — Pricing + client-facing report (gated)

After report + narrative are written, tell the user:

> "Internal report and narrative generated. The effort columns are blank — fill in your
> estimates, then come back and say 'price it'."

When re-invoked (user says "price it", "calculate pricing", or similar):

### Step 1 — Pricing

1. Re-read the report, detect filled-in effort values in the P-band tables
2. If any tasks still have `TBD`, list them and ask user to fill in before proceeding
3. Ask: "What's your hourly rate?" (or read from `.claude/reference/rate-card.md` if it exists)
4. Calculate per-band totals and overall total
5. Append a `## Pricing Summary` to the internal report with the per-band table

### Step 2 — Client-facing report

Generate `comms/site-report-YYYY-MM-DD.md` — the plain-language document the client sees.

Read and follow the template at `.claude/templates/site-audit-client-report.md`. Key rules:
- No technical jargon — translate everything to business language
- Concrete numbers over abstractions
- Opportunity framing, not blame
- Pricing is per-phase, not per-task
- Option A (fixed project) vs Option B (retainer) always presented
- Load the `humanizer` skill and apply it to the final draft

Source files: `reports/intake-report-YYYY-MM-DD.md`, `proposals/narrative-YYYY-MM-DD.md`,
`client.md`, `.claude/reference/about-me.md` (if available), `.claude/reference/rate-card.md`.

Present to user for review. Iterate until approved.

### Step 3 — Multi-format comms (optional)

Ask: "Generate comms in other formats?" — if yes, produce:
- `comms/plan-and-options-slack-YYYY-MM-DD.md` — Slack mrkdwn format
- `comms/plan-and-options-email-YYYY-MM-DD.md` — Email format
- `comms/plan-and-options-notion-YYYY-MM-DD.md` — Notion format
- `comms/plan-and-options-plaintext-YYYY-MM-DD.txt` — Plain text

Each derived from the client-facing report, not the internal report.
Load the `slack-message` skill for the Slack format.

### Step 4 — Proposal bridge (optional)

Ask: "Generate a full proposal with scope tables?" — if yes, bridge to `/proposal`

---

## Verification

1. `/site-audit` triggers correctly from the command list
2. `client.md` exists with all 10 questions answered
3. `intake.json` exists with `urls`, `pages`, `collections`, `checks` keys
4. All scaffold directories exist
5. Phase 2 fallback chain works: Webflow MCP → Chrome DevTools → WebFetch + manual
6. 5 audit output files produced: `audits/structure.md`, `audits/seo.md`, `audits/content.md`, `audits/aeo.md`, `.claude/brand-voice.md` + `.claude/ideal-customer-profiles.md`
7. Phase 5 layers are skippable and re-runnable later
8. Internal report matches template structure (Summary through Sub-audits)
9. Priority-band tables have blank effort columns with `TBD` placeholders
10. Justification tags used: SEO, AEO, Perf, De-risk, Trust, A11y, Conv, Ops
11. Phase 6b automation triage adds `Automation` column (AUTO/SEMI/MANUAL) to every P-band table
12. Automation Summary section present in report
13. Phase 6c narrative follows three-beat structure with key phrases and pillar mapping
14. Phase 7 correctly reads user-filled estimates and calculates pricing
15. Client-facing report uses plain language, no jargon, per-phase pricing, Option A/B
16. `humanizer` skill loaded and applied to client-facing report
17. Multi-format comms derived from client-facing report (not internal report)
18. Asset CSV parsing produces bandwidth tables when provided and PNGs >50%
19. Custom code migration plan included when third-party hosted code detected
20. Existing `/intake` command is unchanged
