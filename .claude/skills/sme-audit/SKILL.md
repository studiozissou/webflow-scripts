---
name: sme-audit
description: Fixed-scope website and online-presence audit for a small independent business (site, Google search, Business Profile, AI search) that ends in a plain-English report, a GBP copy pack and an estimated work plan, and learns from every past audit. Use when the user runs /sme-audit or asks to audit a small business's site and Google presence.
checklist-version: 5
---

<objective>
Run the same audit on any small business, reuse existing tools instead of redefining them, turn every finding into a planned task, and feed what each audit teaches into the next one.
</objective>

## Rules

- Read-only. No Webflow writes, no publish, no fixes on the live site.
- Reuse the tools named below; never restate their checklists here.
- Every number gets a source and a date. Every platform claim passes the Claim gate (Phase 7).
- Health or outcome claims never go beyond what the client's site already says.
- Client detail, the offer and prices stay private (see Outputs).

## Phase 0 — Learn from past audits

1. Before any research, read:
   - `.claude/reference/sme-audit/learnings.md`
   - `.claude/reference/sme-audit/findings-library.md`
   - `.claude/reference/sme-audit/benchmarks.csv`
2. State which past lessons and repeat findings apply to this business and its sector, and which checks to weight or skip.

## Phase 1 — Context

1. Open `projects/<client>/.claude/` and read call notes, `research/`, `audits/` and any existing specs.
2. Reuse research that is still fresh. Do not re-crawl it; note its date in Sources.
3. List the audiences, services, locations and any expansion plans from the call.

## Phase 2 — Website

1. Webflow MCP connected: read-only. Pages, SEO fields, CMS collections and JSON-LD. Never write, never publish.
2. No Webflow MCP: read the live DOM via curl or WebFetch.
3. Run `npm run <client>:launch-guard -- <url>` (or `npm run launch-guard -- <url>`). Save output to `audits/launch-guard-<date>.txt`.
4. Run `npm run site-review -- --url <url> --skip code-review`. Skip PSI when `GOOGLE_PSI_API_KEY` is absent.
5. Run Chrome DevTools MCP `lighthouse_audit`, mobile, on home plus one inner page.
6. SEMRush Site Audit: reuse an existing project crawl if there is one; start a new crawl only if none exists or it is stale. Write `audits/semrush-<date>.md` as fixed / still open / noise. Pull `issue_details` only for the issue types that are in the report.
7. For SEO and schema coverage, follow `/site-audit` Stream B rather than a new list.

## Phase 3 — Google search

1. SEMRush MCP, `nl` database (or the client's local database): `domain_overview`, `organic_research`, `keyword_research`.
   Every SEMRush call follows the unit budget in `.claude/agents/seo.md`: set `display_limit` (default 30, max 50), sort domain keyword lists by traffic and cap them at 50 rows, batch up to 20 keywords per `phrase_these` call, keep history to 12 rows or fewer, and don't re-query data saved in `research/` or `audits/` in the last 30 days. The full `nl` + EN run, including steps 6 and 7, should stay under about 450 rows.
2. Research every keyword in the local language and in EN, always limited to the client's country: Semrush `nl` database, DataForSEO `location_code` 2528 with `language_code` `nl` and then `en`. Add a city-level run when the business serves one city (e.g. Amsterdam): look up its code with `keywords_data/google_ads/locations`. Local-language volume usually dominates. Labs keyword difficulty supports only `nl` for the Netherlands, and Ads volume may not split by language within a country, so treat EN figures as an upper bound. Check the Semrush unit balance first and fall back to DataForSEO for volumes.
3. WebSearch is US-only; don't use it for local rankings or volumes.
4. Expect thin data for small sites; record it as a baseline, not a failure.
5. Pull 12 months of traffic history: `resource_rank_history`, `display_limit` 12, sorted `date_desc`, columns date, organic_keywords, organic_traffic, positions_1_3, positions_4_10 (about 120 units). Save the table in `research/keywords-<date>.md`; it feeds the Phase 8 projection.
6. Competitor gap: load the `competitor-gap` skill and run modules 1 and 2 only. Pick up to 3 local search competitors, starting from the Phase 1 known competitors. Keyword gap max 30 rows for each competitor, in the local database. Write `research/competitor-gap-<date>.md`. Phase 5 records competitors named against this list, and the gap keywords feed Phase 6.
7. Backlink snapshot: load the `backlink-audit` skill and run steps 1 and 6 only: `backlinks_overview` for the client, then the competitor referring-domain gap (max 20 rows for each of up to 3 competitors). Frame what it finds as local link and citation opportunities: directories, associations, local press. No toxicity review and no disavow. Write `audits/backlinks-<date>.md`.

## Phase 4 — Google Business Profile

Check every row of the Google Business Profile table in `.claude/templates/sme-audit-report.md`. Mark each VERIFIED, OWNER-CHECK or NOT FOUND.

The Maps consent wall blocks automated checks. Anything behind it is OWNER-CHECK unless Will looks manually.

## Phase 5 — AI search

1. Score the `ai-search-aeo` 20-check rubric: PASS=1, NEEDS ATTENTION=0.5, FAIL=0, NEEDS VERIFY=0. Total /20. This is the only AEO scale. Run it as `/site-audit` Stream D does, with evidence per check.
2. AI prompt test:
   - Pick 6–8 fixed prompts in the local language and EN. Start from the sector patterns in `.claude/reference/sme-audit/ai-prompts.md`.
   - Run each in ChatGPT, Perplexity, Gemini and Google AI Overview.
   - Per run record: business named (y/n), business cited (y/n), competitors named. Mark which named competitors are on the Phase 3 competitor-gap list.
   - Browser MCP connected: drive the runs. Otherwise Will runs them and pastes results into `research/ai-prompt-test-<date>.md`.
   - Save the prompt set in that file so later audits repeat it exactly.

## Phase 6 — Landing-page plan

1. Propose audience and symptom pages plus nearby-town targeting, from the Phase 1 audiences, the Phase 3 keywords and the competitor-gap keywords. A content brief (`content-brief` skill) for any proposed page is on request after the audit, not part of it.
2. Each page: target search terms (local language and EN) with volumes, the page's job, and where it links from.
3. Propose them as CMS items when a fitting collection exists; name the collection and fields.

## Phase 7 — Write the report

1. Fill `.claude/templates/sme-audit-report.md`, all 11 sections, into `reports/sme-audit-<YYYY-MM>.md`.
2. Fill `.claude/templates/sme-gbp-copy-pack.md` into `reports/gbp-copy-<YYYY-MM>.md`. Unknown fields are OWNER-CHECK.
3. Use `/generate-schema` to draft the JSON-LD fix pack. Proposed, not applied.
4. Claim gate: apply `/site-audit`'s Phase 6 claim gate, including its known-stale list, before anything ships.
5. Leave "Fix these first", "What we need from you" and "Where your visits are heading" until Phase 8 has task IDs.

## Phase 8 — Plan the work

1. Fill `.claude/templates/sme-work-plan.md` into `projects/<client>/.claude/specs/work-plan-<YYYY-MM>.md`, following its rules. Tasks over 1 h or touching more than one page are `/plan`-ready.
2. Every report finding and every OWNER-CHECK item gets a task, and every task links back to its report section. No orphans either way. Every link opportunity from the Phase 3 backlink snapshot becomes a task (owner or us) linked to "Being found on Google".
3. Tasks already tracked in their own spec are listed and pointed at, not re-planned.
4. Draw the report's "Fix these first" and "What we need from you" from the plan's IDs. Cross-check that the two agree.
5. Project monthly visits from Google at 1, 3, 6 and 12 months as low–high ranges, do nothing vs every fix:
   - Do nothing: start from the history's range and average, then thin it by the trend in top-10 positions. Never draw a decline the history does not show.
   - Every fix: for each keyword a planned task targets, pick a reachable position per month and apply typical click rates (about 28% at 1, 15% at 2, 10% at 3, 7% at 4, 5% at 5, 2–3% at 6–10, 1% at 11–20). Halve the gain on informational searches that show AI Overviews, and distrust difficulty scores when health or authority sites hold the top results.
   - Write the inputs to `research/trajectory-<YYYY-MM>.json` (`history`, `doNothing`, `everyFix`) and run `node tools/sme-audit/trajectory-chart.js research/trajectory-<YYYY-MM>.json reports/traffic-trajectory-<YYYY-MM>.svg --png`. Look at the PNG before it ships.
   - Fill "Where your visits are heading" in the report, and add Sources rows for the history (Semrush, date) and the projection (estimate, method).
6. Fill `.claude/templates/sme-exec-summary.md` into `reports/exec-summary-<YYYY-MM>.md`: the chart, three to five plain-language categories of work drawn from the plan (each with the problem, what it costs the business, how we fix it, and a collapsed list of every task in it, one sentence each), the owner inputs needed to start, and next steps. No hours or estimates.
7. Run the mandatory `humanizer` skill pass on the finished report, exec summary, GBP pack and work plan. Record it in the report's Sources.

## Phase 9 — Publish

1. Follow the `/site-audit` Notion push steps: find the client's Notes database with `notion-search`, then create the page with `notion-create-pages`. Publish the exec summary as its own Notes page, linking to the full report page; it is the page the client reads first. Each category's fix list becomes a toggle.
2. Upload `reports/traffic-trajectory-<YYYY-MM>.png` with `notion-create-file-upload` and place it as an image in "Where your visits are heading".
3. Relate the page to the client, set Note Type = Research, fill the Summary property with `notion-update-page`.
4. ASK before sharing the page with the client.
5. ASK before creating work-plan tasks in the Notion Tasks Tracker. Each task relates to the client.

## Phase 10 — Retro and learn

1. Append a dated retro to `.claude/reference/sme-audit/learnings.md`:
   - hours per phase
   - findings by category
   - checks that found nothing or were noise
   - things found outside the checklist
   - tool failures
   - what to change next time
2. Update `.claude/reference/sme-audit/findings-library.md`: add new findings, increment `seen` on repeats. Each entry: id, detection method, plain-English fix, effort, last seen.
3. Append one row to `.claude/reference/sme-audit/benchmarks.csv`: date, sector, AEO /20, Lighthouse SEO / a11y / best-practices, meta-description coverage, JSON-LD present, GBP state, review count.
4. Learn from estimated versus actual hours: as work-plan tasks ship, log Actual (h) next to Effort (h). Feed the drift back into each finding's `effort` in the library.
5. After the client follow-up call, record what the client acted on, ignored or found confusing. Demote or rewrite recommendations clients never act on.
6. Apply the Promotion rule.

## Promoted checks

Findings seen in two or more audits. Check each in the phase named and give each a task.

- Phase 2, links: internal links typed as URLs (no locale prefix) or going through redirects; broken outside links and images. Count the distinct links behind a redirect total before reporting.
- Phase 2, SEO basics: missing, duplicate or short titles and meta descriptions; missing, doubled or skipped headings; titles and H1s that name neither the service nor the city; no share image.
- Phase 2, structured data: wrong addresses in it, and local business markup missing location details, hours and links to listings.
- Phase 2, performance and access: heavy images and pages; links with no readable text; empty or thin alt text.
- Phase 3 and 4: Search Console and Bing not set up; directory listings with inconsistent name, address or phone; nearby towns named in copy and markup, with a page only where demand justifies one. Skip GBP Q&A: Google is phasing it out.
- Phase 5: opening sentence that says who, what and where; a visible last-updated date; a named person with credentials; sources linked with readable text; short paragraphs and question headings; FAQ with real answers, as headings, with markup in the page HTML.
- Phase 6: the main service page is often too thin for the search it should win; compare it with what ranks.

## Promotion rule

A lesson or finding seen in two or more audits is promoted into this public SKILL.md as a generic rule. Bump `checklist-version` and add a Changelog line. Client-specific detail stays private. A lesson from one audit stays private until it repeats.

## Outputs

| File | Location |
|---|---|
| Research, AI prompt test | `projects/<client>/.claude/research/` |
| launch-guard, SEMRush, backlinks, Lighthouse, AEO | `projects/<client>/.claude/audits/` |
| Report, GBP copy pack | `projects/<client>/.claude/reports/` |
| Work plan | `projects/<client>/.claude/specs/` |
| Learnings, findings library, benchmarks, prompt patterns | `.claude/reference/sme-audit/` (private) |
| Offer and pricing | `.claude/reference/sme-audit/offer.md` (private) |

Never put prices in public files.

## Changelog

- v1, 2026-10-19: First version. AEO scale decision: this skill's 20-check rubric (from `ai-search-aeo`, PASS=1, NEEDS ATTENTION=0.5, FAIL=0, NEEDS VERIFY=0) is canonical for new audits.
- v2, 2026-10-19: promoted 24 repeat findings from the first three audits (link and redirect faults, titles and descriptions, headings, share image, structured data, image weight, link names and alt text, Search Console, listing consistency, nearby towns, AEO opening lines and freshness, author and sources, FAQ, thin service pages).
- v3, 2026-10-20: traffic trajectory. Phase 3 pulls 12 months of traffic history; Phase 8 projects do nothing vs every fix at 1, 3, 6 and 12 months and draws it with `tools/sme-audit/trajectory-chart.js`; the report gains "Where your visits are heading" under Looking ahead. Phase 8 also writes a one-page exec summary (`sme-exec-summary.md`) with no hours, published as its own Notion page.
- v4, 2026-10-21: Phase 3 adds a competitor gap and backlink snapshot via the Semrush `competitor-gap` and `backlink-audit` skills; budget about 450 rows.
- v5, 2026-10-22: Phase 3 keyword research runs in the local language and EN, limited to the client's country, plus a city run for single-city businesses; DataForSEO is the volume fallback when Semrush units run out.
