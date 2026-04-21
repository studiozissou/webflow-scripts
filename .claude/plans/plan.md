# Plan: Local SEO Automation Tooling

**Slug:** `local-seo-automation`
**Date:** 2026-04-20
**Approach:** A — Node.js CLI Tools in `tools/local-seo/`

## Summary

Build internal CLI tooling for a new "managed local SEO" revenue stream (€29–119/month subscription tiers). Two pipelines:

1. **Monthly Reporting Engine** — SEMRush rank data + site health → Claude → branded HTML client report
2. **Lead Generation Pipeline** — discover underperforming local businesses → score opportunity → find contact email → draft personalised outreach

Architecture mirrors existing `tools/site-review/`: Node.js ESM, no build step, native `fetch`, `@anthropic-ai/sdk` for content generation, `dotenv` for config.

## Business Model

| Tier | Price | Deliverables |
|------|-------|-------------|
| Starter | €29/mo | Monthly report + GBP audit + 3 keyword recs |
| Growth | €69/mo | Weekly GBP posts + review responses + monthly report + rank tracking |
| Pro | €119/mo | All Growth + competitor monitoring + quarterly strategy call |

Estimated tool cost per client: €7–20/mo → margin €9–99/mo per client.

## Task Breakdown (5 tasks, 2 parallel streams)

```
Stream A: [1. config + semrush.js] ──┬──> [2. report-gen + template] ──> [3. report CLI]
                                      └──> [4. prospect scorer + email finder] ──> [5. outreach CLI]
```

| # | ID | Task | Priority | Depends On |
|---|-----|------|----------|-----------|
| 1 | `lseo-foundation-config-semrush-client` | Config module + SEMRush HTTP API client | P1 | — |
| 2 | `lseo-report-generator` | Claude report narrative + HTML template | P1 | 1 |
| 3 | `lseo-report-cli` | Report CLI orchestrator (--client, --all) | P1 | 2 |
| 4 | `lseo-prospect-scorer` | Prospect discovery, scoring, email finder | P1 | 1 |
| 5 | `lseo-outreach-drafts` | Personalised email drafting via Claude | P2 | 4 |

**Parallel opportunity:** Tasks 2 and 4 can run simultaneously after task 1 completes (separate code streams, no shared state).

## Files to Create (14)

```
tools/local-seo/
├── index-report.js          # Report CLI entry point
├── index-prospect.js        # Lead gen CLI entry point
├── index-outreach.js        # Outreach CLI entry point
├── config.js                # Env loading, API keys, defaults
├── lib/
│   ├── semrush.js           # SEMRush HTTP API wrapper
│   ├── report-gen.js        # Claude report narrative generation
│   ├── prospect-scorer.js   # Opportunity scoring algorithm
│   ├── email-finder.js      # Website scrape + JSON-LD + Places API
│   └── templates/
│       ├── monthly-report.html   # Branded report template
│       ├── outreach-cold.md      # Cold email template
│       └── outreach-followup.md  # Follow-up template
├── clients/                 # Per-client config (runtime)
├── output/                  # Generated reports/drafts (runtime)
└── prospects/               # Lead database (runtime)
```

## Files to Modify (1)

- `package.json` — add `lseo-report`, `lseo-prospect`, `lseo-outreach` npm scripts

## CLI Interface

```bash
# Generate monthly report for one client
node tools/local-seo/index-report.js --client joes-plumbing

# Generate reports for all clients
node tools/local-seo/index-report.js --all

# Find and score prospects
node tools/local-seo/index-prospect.js --location "Dublin" --niche "plumber" --limit 20

# Draft outreach email
node tools/local-seo/index-outreach.js --prospect joes-plumbing --template cold
```

## API Keys Required

| Service | Env Var | Phase | Cost |
|---------|---------|-------|------|
| SEMRush | `SEMRUSH_API_KEY` | 1 | Included in Pro+ |
| Anthropic | `ANTHROPIC_API_KEY` | 1 | Already configured |
| *(removed — scrape from website/GBP instead)* | | | |
| Google Places | `GOOGLE_PLACES_API_KEY` | 2 | $17/1000 req |

## Reusable Code from site-review

- `config.js` → dotenv + env key pattern (copy + adapt)
- `lib/logger.js` → createLogger (portable as-is)
- `checks/code-review.js:reviewCode` → Claude API call pattern
- `lib/report/json-report.js` → report output structure
- `index.js:parseArgs` → CLI arg parsing pattern

## Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| SEMRush API key tier requirement | High | Verify Pro+ plan access before building |
| GBP API requires Google OAuth approval | Medium | Defer to Phase 4; MVP works without it |
| Cold email GDPR compliance (Ireland/EU) | Medium | Bake unsubscribe + company reg into templates |
| Some sites won't expose email | Low | Flag for manual lookup; phone from Places API as fallback |
| Prospect scoring accuracy | Low | Start conservative, tune with real data |

## Open Questions (non-blocking, answer anytime)

1. Do you have a SEMRush API key on a Pro+ plan?
2. Real test client or dummy data for the first run?
3. Bake GDPR unsubscribe mechanism into email templates from day one?
4. Report delivery preference — local HTML now, email later?

## Test Plan

- **Tier 1 (auto):** Node.js unit tests for config, scoring algorithm, template rendering. Integration tests with mocked SEMRush responses.
- **Tier 2:** N/A (not CDN-deployed)
- **Tier 3 (manual):** Report readability, email tone, prospect relevance

## Verify Loop

### Pass/fail
- `index-report.js --client <slug>` → exits 0, produces HTML report with executive summary + keyword table + recommendations
- `index-prospect.js --location X --niche Y` → exits 0, produces JSON with scored prospects (name, domain, score, email)
- `index-outreach.js --prospect <slug>` → exits 0, produces email draft referencing specific prospect weaknesses
- No `console.log` in committed code

### Reproduction
1. Create test client: `tools/local-seo/clients/test-client.json`
2. Run: `node tools/local-seo/index-report.js --client test-client`
3. Verify: `tools/local-seo/output/test-client/reports/2026-04.html` exists and renders

## Barba Impact
N/A — standalone CLI tooling, not a Webflow page feature.
