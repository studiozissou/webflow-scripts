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

### SEMRush site-audit CSV (if available)

Check the project `.claude/` directory for a SEMRush export CSV (e.g. `semrush-export-*.csv`).
If present, or if the user provides one:

1. **Parse it immediately** — before launching parallel streams.
2. Extract all flagged issues: multiple H1s, missing meta descriptions, structured data errors,
   non-descriptive anchor text, orphaned pages, duplicate content, etc.
3. **SEMRush data has priority over agent scanning when there is a conflict.** SEMRush crawls
   the rendered DOM like a real browser. WebFetch strips `<head>` content and often miscounts
   headings, producing false positives. If SEMRush says a page has 0 multiple H1s but your
   scan says 6, trust SEMRush (and verify with Chrome DevTools if needed).
4. Feed the parsed SEMRush findings into the relevant streams so they cross-reference rather
   than duplicate. Specifically:
   - Stream B receives SEMRush heading, meta, and schema findings as ground truth
   - Stream C receives SEMRush content-quality flags
5. When merging into the report, always note the data source for disputed items. If SEMRush
   and agent scanning disagree, flag the conflict and default to SEMRush unless DevTools
   verification overrides both.

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
| Consent Mode | See **Consent Mode check** below — never infer from script load order |
| Non-Google trackers | See **Consent Mode check** below — cookies set before consent |
| Lighthouse Performance | Run Lighthouse on all auditable pages (see page selection rules below) |
| Lighthouse Accessibility | Same pages — record scores and recurring issues |

**Consent Mode check (required method):**

A correctly-configured Consent Mode v2 site loads GTM and gtag.js immediately and fires tags
before the user chooses. Those tags run in `denied` mode and send cookieless pings. **A compliant
site and a non-compliant site look identical in the network panel.** Never conclude "analytics
fires before consent" from script load order, `<head>` embed code, or a WebFetch of the HTML.
That inference produced a false positive on Coconut (May 2026) that reached the client.

Two things must be true before flagging anything:

1. **Use a clean browser context.** A stored consent cookie from a previous visit makes the
   defaults come back `granted` and inverts the result. With Chrome DevTools MCP, pass
   `isolatedContext: "consent-check"` to `new_page`. Verify the banner is visible and do not
   click it.
2. **Query the consent state directly:**

```js
() => ({
  consentCalls: (window.dataLayer || [])
    .filter(e => e && e[0] === 'consent')
    .map(e => JSON.stringify(Array.from(e))),
  icsDefaults: window.google_tag_data?.ics?.entries
    ? Object.fromEntries(Object.entries(window.google_tag_data.ics.entries).map(([k, v]) => [k, v.default]))
    : 'none',
  cookieNames: document.cookie.split(';').map(c => c.trim().split('=')[0]).filter(Boolean),
})
```

Grade it as follows:

| Observation | Verdict |
|---|---|
| `gtag('consent','default',…)` present, values `denied` | PASS — Consent Mode v2 correct. Do not raise a task. |
| `gtag('consent','default',…)` present, values `granted` | FAIL — defaults must be denied. |
| No `consent` call and no `google_tag_data.ics` | FAIL — Consent Mode not implemented. |

Alternatively, read the `gcs=` parameter on the GA4 `/collect` request: `G100` = denied,
`G111` = granted.

**Then check the non-Google trackers separately.** Consent Mode governs Google tags only. Meta,
TikTok, Hotjar, Intercom, LinkedIn, and Zoho are unaffected by it and commonly set cookies on
load regardless. In the clean context, list cookies set before any banner interaction and match
them to vendors (`_fbp` → Meta, `_ttp` → TikTok, `_hj*` → Hotjar, `intercom-*` → Intercom).
Cookies from these vendors pre-consent are a genuine PECR finding — and it is a *different*
finding from Consent Mode, with a different fix. Report them separately; never merge the two.

**Lighthouse page selection rules:**

Lighthouse requires Chrome DevTools MCP. If not available, skip and note in the report.

1. **Build the page list from `intake.json`** (populated in Phase 2).
2. **Static pages:** Audit every unique static page (homepage, about, contact, services, etc.).
3. **CMS template pages:** For each CMS collection that has a template page, audit a sample
   of **5 representative items** (pick a mix: first, last, longest content, shortest content,
   and one mid-list). Record which items were sampled.
4. **Large sites (>20 unique pages after CMS sampling):** Instead of auditing all pages, audit
   only the pages linked from the **main navigation** (top-level nav + one level of dropdowns).
   Note which pages were skipped and why.
5. **Run each page through both Performance and Accessibility categories.** Record per-page
   scores in a summary table, then list recurring issues across all pages with frequency counts.
6. **Aggregate:** Calculate min, max, and median scores for Performance and Accessibility
   across all audited pages. Flag any page scoring below 50 in either category.

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

**SEMRush priority rule:** If a SEMRush site-audit CSV was parsed in Phase 2, use it as the
primary source of truth for heading counts, meta descriptions, structured data errors, and
other technical SEO checks. Only flag issues that SEMRush confirms OR that Chrome DevTools
verifies via `evaluate_script`. Do NOT report WebFetch-only findings for these checks — they
produce frequent false positives (e.g. inflated H1 counts, missing meta descriptions that
actually exist). When SEMRush and your own scanning conflict, note both values and default to
SEMRush.

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
| Schema gaps | Flag missing: Article, Person, JobPosting, BreadcrumbList, Organization. For `FAQPage`, see the eligibility rule below |
| Sitemap completeness | All published pages included |
| `llms.txt` | Present at root — recommend if absent |
| Hreflang | Present if multi-locale, check for conflicts |
| Broken external links | Flag pages with broken outbound links |

**FAQPage eligibility rule.** Since August 2023, Google shows FAQ rich results only for
authoritative government and health sites. For every other site — SaaS, ecommerce, agency,
professional services — adding `FAQPage` markup will **not** produce expandable Q&As in search
results, and a task justified that way is a false promise. This reached a client in the Coconut
audit (May 2026).

`FAQPage` markup is still worth recommending on a commercial site, but only on its real merits:
AI-citation extraction and page-type signal. So flag a missing `FAQPage` when the site is a
government or health domain, **or** when the justification is limited to those two grounds. Never
write "so Google can display them as expandable Q&As in search results" for a commercial site. If
the whole value of the task rests on rich results, drop the task.

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

### Claim gate (applies to Phase 6, 6c, and 7)

The audit streams verify **findings** — what is or isn't on the page. Synthesis adds
**justifications** — why a finding matters and what fixing it buys. Justifications are generated
prose, they are the part the client reads and budgets against, and until now nothing checked them.
Both false positives in the Coconut audit (May 2026) entered here, not in the audit streams.

Every justification splits into two kinds of claim:

- **Site claims** — "the homepage has 13 Q&A pairs with no FAQPage schema." Sourced from an audit
  file. Carry them through unchanged; do not restate them more strongly than the source did.
- **Platform claims** — any assertion about what Google, ChatGPT, Perplexity, or a browser *does*
  in response to a change. "Google will show expandable Q&As." "Star ratings appear in results."
  "AI assistants weight outbound links." These are third-party behaviours, they change without
  notice, and model training data goes stale on them.

**Every platform claim must carry a source and a date, or it does not ship.** In the internal
report, append `[source, YYYY]` to the justification. If you cannot source it, choose one:

1. Rewrite the justification to rest only on a site claim ("marks up existing Q&As for AI
   extraction"), or
2. Mark the row `NEEDS VERIFY` and list it under "needs user input", or
3. Drop the task.

Never let a task's entire rationale rest on an unsourced platform claim. When in doubt, `WebSearch`
the claim before writing it — a platform behaviour you "know" from training data is exactly the
kind of fact most likely to have changed.

Known-stale claims to check for explicitly before shipping any report:

| Claim | Status |
|---|---|
| FAQ schema → expandable Q&As in Google results | **False** for non-gov/health since Aug 2023 |
| HowTo schema → rich results | **False** — removed from Google results in 2023 |
| Consent Mode absent because tags fire pre-consent | **False** — that is correct denied-mode behaviour |
| `llms.txt` required for AI citation | **False** — no engine requires it (see `ai-search-aeo` mythbusting) |

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

## Phase 7 — Client-facing report (gated)

After internal report + narrative are written, present the report-type gate:

> "Internal report and narrative generated. Which client report do you want?"
>
> **A) Monthly retainer report** — compact, toggle-detail format, Notion-ready.
> For clients on a recurring retainer. Uses `site-audit-monthly-report.md` template.
>
> **B) One-off intake report** — longer, includes pricing options (A/B/C).
> For first engagements or one-off audits. Uses `site-audit-client-report.md` template.
> Effort columns must be filled in first — say "price it" when ready.
>
> **C) Both**

---

### Path A — Monthly retainer report

1. Read and follow the template at `.claude/templates/site-audit-monthly-report.md`.
2. Read the previous month's report (`comms/site-report-YYYY-MM.md`) for month-over-month
   deltas. If no previous report exists, use "—" for last-month columns.
3. Generate `comms/site-report-YYYY-MM.md` (month-stamped, not date-stamped).
4. Load the `humanizer` skill and apply it to the final draft. It may only change *how* a claim
   reads, never *what* it asserts. Hedged wording from the Claim Gate ("may help", "not
   guaranteed") is load-bearing — do not polish it into confidence.
5. If SEMRush keyword data is available, include the **Blog topic suggestions** section
   with keyword opportunities and suggested articles.
6. Present to user for review. Iterate until approved.
7. After approval, proceed to **Step: Notion push** (below).

Source files: `reports/intake-report-YYYY-MM-DD.md`, `audits/*.md`, `client.md`,
previous `comms/site-report-*.md`, SEMRush keyword data (if available).

---

### Path B — One-off intake report

Effort columns must be filled in before this path runs. If re-invoked with "price it":

**Pricing:**

1. Re-read the report, detect filled-in effort values in the P-band tables
2. If any tasks still have `TBD`, list them and ask user to fill in before proceeding
3. Ask: "What's your hourly rate?" (or read from `.claude/reference/rate-card.md` if it exists)
4. Calculate per-band totals and overall total
5. Append a `## Pricing Summary` to the internal report with the per-band table

**Client report:**

1. Generate `comms/site-report-YYYY-MM-DD.md` (date-stamped for one-off reports).
2. Read and follow Template 1 (Intake Report) in `.claude/templates/site-audit-client-report.md`.
3. Key rules:
   - No technical jargon — translate everything to business language
   - Concrete numbers over abstractions
   - Opportunity framing, not blame
   - Pricing is per-phase, not per-task
   - Option A (fixed project) vs Option B (retainer) vs Option C (pick and choose)
4. Load the `humanizer` skill and apply it to the final draft. It may only change *how* a claim
   reads, never *what* it asserts. Hedged wording from the Claim Gate ("may help", "not
   guaranteed") is load-bearing — do not polish it into confidence.
5. Present to user for review. Iterate until approved.

Source files: `reports/intake-report-YYYY-MM-DD.md`, `proposals/narrative-YYYY-MM-DD.md`,
`client.md`, `.claude/reference/about-me.md` (if available), `.claude/reference/rate-card.md`.

**Multi-format comms (optional):**

Ask: "Generate comms in other formats?" — if yes, produce:
- `comms/plan-and-options-slack-YYYY-MM-DD.md` — Slack mrkdwn format
- `comms/plan-and-options-email-YYYY-MM-DD.md` — Email format
- `comms/plan-and-options-plaintext-YYYY-MM-DD.txt` — Plain text

Each derived from the client-facing report, not the internal report.
Load the `slack-message` skill for the Slack format.

**Proposal bridge (optional):**

Ask: "Generate a full proposal with scope tables?" — if yes, bridge to `/proposal`

---

### Step: Notion push (optional, any path)

After the client report is approved, ask:

> "Push to Notion Notes database?"

If yes:

1. Use `mcp__claude_ai_Notion__notion-search` to find the client's Notes database
   (search for the client name or the previous month's report page).
2. Use `mcp__claude_ai_Notion__notion-create-pages` to create a new page in the
   Notes database with:
   - **Title:** `[Client Name] Site Report – [Month YYYY]`
   - **Date property:** First day of the report month
   - **Content:** The approved client report, converted to Notion enhanced markdown.
3. Toggle headings (`{toggle="true"}`) become Notion toggle headings.
4. Tables use Notion's simple table format.
5. Colour-code the Change column in metrics tables:
   - Green (`color="green"`) for improvements
   - Red (`color="red"`) for regressions
   - Orange (`color="orange"`) for minor concerns
6. After creation, return the Notion page URL to the user.
7. Use `mcp__claude_ai_Notion__notion-update-page` to set the Summary property
   to a 2-3 sentence synopsis of the report (for database views).

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
14. Phase 7 presents report-type gate with three options: A (monthly), B (one-off), C (both)
15. Path A produces `comms/site-report-YYYY-MM.md` matching `site-audit-monthly-report.md` template
16. Path A includes Blog topic suggestions section when SEMRush keyword data is available
17. Path B correctly reads user-filled estimates and calculates pricing
18. Path B produces `comms/site-report-YYYY-MM-DD.md` matching `site-audit-client-report.md` Template 1
19. Both paths load `humanizer` skill and apply it to the final draft
20. Notion push creates a page in the client's Notes database with correct title, date, and summary
21. Notion push converts toggle headings and colour-coded table cells correctly
22. Multi-format comms derived from client-facing report (not internal report)
23. Asset CSV parsing produces bandwidth tables when provided and PNGs >50%
24. Custom code migration plan included when third-party hosted code detected
25. Lighthouse audits cover all static pages, sample 5 per CMS collection, and fall back to nav-linked pages when >20 unique pages
26. Consent Mode verdict comes from `google_tag_data.ics` / `gtag('consent','default',…)` read in a clean browser context — never inferred from script load order. `NEEDS VERIFY` when no browser is available
27. Non-Google trackers (Meta, TikTok, Hotjar, Intercom, LinkedIn, Zoho) are checked for pre-consent cookies and reported as a finding separate from Consent Mode
28. No `FAQPage` task is justified on rich-results grounds for a non-gov/health site — but FAQPage recommended on AI-extraction / page-type-signal grounds is correct and should not be stripped
29. Every platform claim in a justification carries `[source, YYYY]`, is rewritten to rest on a site claim, is marked `NEEDS VERIFY`, or the task is dropped
30. The client-facing report asserts nothing the internal report did not establish; humanizer has not strengthened any hedged claim
