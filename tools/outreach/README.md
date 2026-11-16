# Outreach pipeline (Den Haag)

Each week this finds independent Den Haag businesses, checks their website and Google Business Profile (GBP), and writes one Notion row per business with a verdict, evidence and an approach email draft. **It never sends email.** Will reads every draft and sends it by hand.

## Why a Node pipeline

Every rule is a pure function over fixtures, so it is tested without network. Only one step uses an LLM: the email draft, one Anthropic call per qualifying row. A headless Claude job would cost more tokens per run and vary from run to run; n8n could not reuse `tools/site-review` and has no tests.

## Pipeline

```
kill switch -> seeds + state -> discover (optional) -> dedupe -> plan (scan / touch / skip)
  per row: fetch homepage -> scanSite -> resolve cid -> business info -> 3 map-pack searches
  all rows: reviews (one async batch) -> buildGbp -> triage -> personalise + draft (qualifying only)
  -> Notion upsert by domain -> state.json -> runs/<date>.json
```

| Module | Job |
|---|---|
| `platform.js` | Site builder, WordPress version, "made with" badge, builder subdomain |
| `scan.js` | Homepage facts, parked check, reused site-review checks, PSI lab metrics |
| `resolve.js` | Site to GBP `cid`: Maps search for "<site name> Den Haag", accept only the same domain |
| `gbp.js` | GBP score /12, NAP match, map-pack ranks |
| `reviews.js` | Newest 10 reviews per profile, one batch, polled, 10 minute limit |
| `triage.js` | Verdict and evidence-backed reasons |
| `discover.js` | Lookalikes: type x area Maps searches on a 4-week rotation |
| `personalise.js` | Facts for the email: Will's `love` note, site copy, review themes |
| `draft.js` | Email draft, output checker, one retry, cost |
| `notion-map.js` | Upsert by domain; rows past `New` are never overwritten |
| `state.js` | Domain dedupe, 30-day rescan plan, state file |
| `cli.js` | Wires the stages, shared budget, run log |

## Triage rules

- **skip**: a chain (brand at 3+ Maps results, or on `chains.json`), closed on Google, site down or parked with no matched GBP, or `Do not contact`.
- **new-site+management**: one hard reason (no HTTPS, no mobile viewport, end-of-life builder, lab LCP over 4 s or page over 6 MB with `GOOGLE_PSI_API_KEY`, site down or parked), or 2+ soft reasons (free-builder badge, copyright 2+ years old with no hours or menu, PDF-only menu with no booking link). One soft reason alone counts as one management reason.
- **management**: site is sound but has 2+ of: missing title or meta description, no LocalBusiness JSON-LD, broken homepage links, GBP below 8/12 (unknown points count as half), outside the top 3 for the area search and outside the top 10 for the main search, NAP mismatch, no website link on the GBP. Missing LocalBusiness JSON-LD is listed as an issue but does not count: owners rarely feel it.
- **neither**: anything else. Ties go to the bigger verdict.

Each reason carries a check id and evidence (URL, value), so an email cites only real findings. Issues are sorted by what the owner feels most (map-pack rank, phone layout, speed, padlock, PDF menu) before the top 2 go into the email.

## GBP score /12

One point each: claimed, primary category is one of the accepted Google categories for the row's `type` in `types.json` (unknown if the type is not mapped; secondary categories do not count), a secondary category, rating 4.3+, review count at or above the median of the top-3 competitors for the main search, a review in the last 90 days, owner replies to 50%+ of the last 10 reviews (unknown with fewer than 5 reviews), 20+ photos, hours set, description filled, website link matches the site, NAP matches the site. A point the API cannot answer (reviews timed out, no phone or postcode to compare) is `unknown`, not 0, and shows as `7/10 (2 unknown)`. An unresolved profile shows `unmatched` and needs a Chrome check.

Map-pack searches per row use the Dutch term from `types.json` (`vet` becomes `dierenarts`), because people in Den Haag search in Dutch: `<nl> den haag` (the main search, used for the competitor median), `<nl> <area>` (area from the site postcode via `areas.json`, or `centrum den haag`), and `<nl> in de buurt`. Searches run only when the profile resolved.

## Costs and budget

One budget meter covers DataForSEO and Anthropic (`--budget`, default $3). DataForSEO charges from each response's `cost`; per-call estimates in `dataforseo.js` gate the next call. Each draft is checked against a $0.10 estimate first (2 attempts at up to 4000 output tokens), and each attempt is charged its real token cost as it returns. DataForSEO calls time out after 60 s and retry twice on 429, 5xx, network errors and a transient 402/40200. Roughly per new row: resolve $0.002, business info $0.0054, 3 searches $0.006, reviews $0.0015, draft about $0.01. Rows scanned in the last 30 days only get their Notion `Run` updated, at no cost.

When the budget runs out or DataForSEO returns payment required, no new API calls start. Rows already gathered are still triaged and written to Notion (without a draft), the run log is written, and the CLI exits 1. A qualifying row with no new draft keeps its old subject, Draft status and body in Notion. Rows that did not finish (no draft, reviews not fetched, failed Notion write) stay out of `state.json`, so the next run picks them up again. One failing row is logged in `errors` and the run goes on.

## Kill switch

`~/webflow-internal/outreach/outreach.off` (the folder above `--data`) stops every run with exit 0. `scripts/outreach-weekly.sh` checks it too.

## How to run

```bash
npm run test:outreach
node tools/outreach/cli.js --help
node tools/outreach/cli.js run --data ~/webflow-internal/outreach/den-haag --dry-run --limit 3
node tools/outreach/cli.js run --data ~/webflow-internal/outreach/den-haag --prompt ~/webflow-internal/outreach/prompt.md --discover 20 --budget 3
node tools/outreach/cli.js scan https://example.test/ --data ~/webflow-internal/outreach/den-haag
```

- `--dry-run` makes real site fetches and DataForSEO calls, but no Notion writes, no Anthropic calls and no files. It prints a table (domain, verdict, top reasons, GBP score), then one JSON line per row with issues, evidence, GBP score and ranks.
- `--force-rescan` rescans rows inside 30 days; rows Will moved past `New` stay protected.
- `scan <url>` prints one prospect as JSON; `--data` is optional and gives the seed's `type`.
- Weekly: `scripts/outreach-weekly.plist` runs `scripts/outreach-weekly.sh` on Monday 07:00.

Credentials: DataForSEO from Keychain `mcp/dataforseo-login` and `mcp/dataforseo-password`; Anthropic from `ANTHROPIC_API_KEY` or `mcp/anthropic-api-key`; Notion from `NOTION_TOKEN` or `mcp/notion-triage`. The Notion database id is `notion.database` in `seeds.json` (`@notionhq/client` 2.x queries by database id, not data source id).

## Private data (never in this repo)

- `~/webflow-internal/outreach/den-haag/seeds.json`: seeds (`domain`, `url`, `type`, `love`) and `notion.database`.
- `~/webflow-internal/outreach/den-haag/state.json`: per-domain status, cid, verdict, last scan, discovery history.
- `~/webflow-internal/outreach/den-haag/areas.json`, `chains.json`: neighbourhoods by postcode, chain names.
- `~/webflow-internal/outreach/den-haag/runs/<date>.json`: cost, counts per verdict, drafts with cost and opener, errors.
- `~/webflow-internal/outreach/prompt.md`: the email system prompt and voice rules.

Tests use invented businesses only.
