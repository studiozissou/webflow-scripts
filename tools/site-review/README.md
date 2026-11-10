# site-review

A crawler for Webflow client sites that reports only what it can prove. Every finding is backed by machine-collected evidence and ends in one of three states: `pass`, `fail` or `unknown`. It is the source of truth for technical site-audit findings (ADR-002 in webflow-internal) and replaces the SEMrush Site Audit crawl once the parallel run on Carsa, Coconut and TSC passes.

Interfaces, field lists and the priority 1 taxonomy table live in [`lib/contracts.md`](lib/contracts.md). This README explains the why.

## Usage

```bash
# Monthly client audit: reads <internal>/projects/<client>/.claude/crawl.config.json,
# writes <internal>/projects/<client>/.claude/audits/crawl/<YYYY-MM-DD>/
npm run site-review -- --url https://www.rolfingamsterdam.nl --client rolfing-amsterdam

# With SEMrush counts for the parity table during the parallel run
npm run site-review -- --client carsa --semrush-counts ~/webflow-internal/projects/carsa/.claude/audits/crawl/semrush-counts-2026-11.json

# Quick run (no client): no rendering, no re-verify, output in tools/site-review/reports/ (gitignored)
npm run site-review -- --url https://example.com --skip code-review
```

`<internal>` is `$WEBFLOW_INTERNAL`, else `~/webflow-internal`; a `--client` run fails when neither exists, so client data never lands in this public repo. `--mode` defaults to `audit` with `--client` and `quick` without. Run `node tools/site-review/index.js --help` for every flag.

Run snapshots from a normal network. Behind an HTTPS-only proxy (a cloud sandbox), Node's fetch needs `NODE_USE_ENV_PROXY=1`, and plain `http://` targets and the no-keep-alive re-verify fetch still fail, which records false broken links; such a run is fine for smoke tests but not for a snapshot.

Outputs: `facts.ndjson` (one fact record per fetched page), `findings.json` (every uncollapsed finding with evidence, plus coverage, health, sanity, diff and parity), `report.md`, and `snapshot.json` (counts and finding IDs for next month's diff). Exit code 0 is a completed run, 2 an aborted one (bot wall, no pages, too slow), 1 an error.

## The evidence rule

Agents interpret, they never observe. An agent may rank, group, explain and propose fixes for rows in `facts.ndjson` and `findings.json`. It may not state a page fact that is not there. A missing fact is "not collected", and the fix is a new extractor with a fixture, not a WebFetch. Model fetches strip `<head>` and miscount headings, which is where the old false positives came from.

## Pipeline

1. **discover**: sitemap rows (with index support), robots.txt, llms.txt.
2. **crawl**: every sitemap URL plus the root is fetched with a browser-like user agent carrying a `site-review` suffix, the client's `Accept-Language`, manual redirects with every hop's status, one retry with backoff on 429, 5xx and timeouts (honouring `Retry-After`), concurrency 4 per host, halved on a host-level 429, and `Crawl-delay`. No cache survives a run. Each page becomes a fact record and the HTML is dropped. Every unique internal link, image, canonical and hreflang target not in the sitemap is status-checked once; external targets once per run, capped at `externalCap` with per-template sampling beyond it.
3. **check**: check modules read facts only and return fail and unknown rows. A check that throws or is skipped reports `unknown` `not_run`, never zero issues. `code-review` asks a model to observe, so it does not run in audit mode.
4. **confirm**: Playwright renders a deterministic sample per Webflow template (`data-wf-page`), plus flagged pages per (template, check). See below.
5. **reverify**: every status-derived fail (4xx, 5xx, broken link, redirect, canonical or hreflang target) is refetched after the crawl without keep-alive. Fails that do not reproduce become **transient** and are not counted.
6. **sanity**: abort and banner rules (below).
7. **score**, 8. **snapshot and diff**, 9. **report**.

## Guards against false positives

| Guard | Rule | Why |
|---|---|---|
| Three states | `unknown` (`fetch_failed`, `timeout`, `blocked`, `non_html`, `truncated`, `not_run`, `cap_exceeded`) is never an issue and never in the score | The old runner turned an unreachable page into an empty string, which became "missing title" |
| Evidence | every fail carries URL, final URL, status, value, source, selector or attribute, a snippet of at most 200 characters and the fetch time; the validator rejects a fail without it and the report lists it as a tool bug | a finding that cannot be checked is not a finding |
| Head-scoped parsing | title, description, canonical, hreflang and robots meta are read inside `<head>`; attributes by their own quote; all entities decoded; H1s outside script, template, noscript and comments | `entity-audit/lib/extract.js` truncated `Janco's`, took SVG titles, dropped empty H1s and left `&#8211;` undecoded |
| URL key | one normalisation rule folds case, trailing slash, fragment, tracking parameters, index files and www or apex | Carsa's "homepage, both URL forms" and Coconut's four home variants |
| External politeness | 403, 429 and LinkedIn's 999 are `unknown blocked`; DNS `ENOTFOUND` is a fail | `wa.me` 429s produced 5,506 "broken external link" rows on Carsa |
| Render confirm | state matrix below | Webflow and client scripts change head tags after load |
| Re-verify | status fails refetched once; non-reproducing ones are transient | one-off 503s and rate limits |
| Bot wall | 90% or more of at least ten 200-status pages sharing one `htmlHash` aborts the run | an interstitial would otherwise look like site-wide duplicate content; identical 404 pages (Carsa's sold vehicles) never count |
| Coverage | under 95% of sitemap URLs fetched puts a banner on the report | partial crawls must not read as clean |
| Suspect counts | over 20 and more than fivefold the previous snapshot is flagged `suspect` | Coconut's counts jumped when subdomains were pulled in; hosts are now explicit in config |
| Collapse | findings sharing a target or snippet are shown once with a page count; a check firing on over 90% of pages is a site-wide pattern | Carsa's `click here` complaints paragraph on thousands of pages. Collapsing changes the report and lets a shared issue count once in the health score; it never changes the counts, diff or parity |

### Render confirm and the state matrix

Raw HTML is parsed for every page, because it is cheap and it is what crawlers index first. Rendering is reserved for where JavaScript could change the answer. Every static Webflow page is its own template and every CMS collection is one, so Carsa has tens of templates. Twenty pages per template are rendered, picked by a stable hash of the URL key so the same pages recur month to month, plus up to five drift pages seeded by the run month. Flagged pages are rendered per (template, check), up to 20, so one template-wide finding on 5,000 vehicle pages costs 20 renders. When a rendered page disagrees with its raw result, the rest of that template is rendered for that check, within `renderMax`. Pages past the cap keep their raw finding with `renderChecked: false`.

| Raw | Rendered | Result |
|---|---|---|
| pass | pass | pass |
| fail | pass | still a fail, downgraded to a notice tagged `fixed-after-load`, weight 0, outside parity totals, listed separately |
| pass | fail | fail, source `rendered` |
| fail | fail | fail, source `both` |
| fail | not rendered | fail stands, `renderChecked: false` |

A raw fail that a script fixes stays visible because crawlers that do not run JavaScript still see it.

## Health score

Weights come from the taxonomy: error 1.0, warning 0.5, notice 0, with low text-to-HTML, low word count and unminified assets set to 0. Transient, unknown and fixed-after-load findings carry no weight. Link findings belong to the page that holds the link; site-level findings (llms.txt, robots.txt, sitemap) belong to the root.

Every fail is either a **single-page** finding or part of a **shared issue**. A shared issue is one problem seen on two or more pages: the same target (one broken menu link), the same snippet (one duplicated paragraph), or a check that fires on more than 90% of pages (missing descriptions everywhere). These are the same groups the report collapses.

```
score = round(100 × (1 − (E + 0.5 × W + S) / P)), clipped to 0..100
P = pages fetched and parsed
E = pages whose highest single-page weight is 1.0
W = pages whose highest single-page weight is 0.5
S = Σ over shared issues of weight × (1 + log2 n), n = pages the issue reaches
```

A shared issue counts once, because it has one cause and one fix. It still weighs more than a single-page problem: on 2 pages it costs 2 pages, on 30 pages about 5.9, and each doubling of reach adds one more. So a template-wide error on Carsa's 5,600 vehicle pages costs about 13.5 pages, and the score points at it without sinking to zero. The counts, the diff and the parity table are never collapsed; only the score and the report use the grouping.

### Worked example: Rolfing Amsterdam, SEMrush crawl of 19 Oct 2026

Illustrative, from the SEMrush audit rather than a site-review run; the first real run replaces it. SEMrush reported 43 pages crawled and Site Health 84%, but its 43 include redirect sources and the 404 target. About 30 are content pages (it lists missing meta descriptions on "30 of 30"), and those are what our `P` counts. The two problems that reach every content page are the menu link to the science page without `/en` (a broken internal link, error) and the missing meta descriptions (warning).

- P = 30.
- E = W = 0: no single-page problems in this simplified example.
- S = 1.0 × (1 + log2 30) + 0.5 × (1 + log2 30) = 5.91 + 2.95 = 8.86.
- score = round(100 × (1 − 8.86 / 30)) = **70**.

Fixing the menu link leaves S = 2.95 and the score at 90; writing the descriptions takes it to 100 if nothing else remains. SEMrush's 84% scores the share of checks passed, so the two figures are not interchangeable: reports show both during the parallel run, with this footnote. Whether clients see ours from January is the Tier 3 decision with Tomek in the spec.

## Taxonomy

`taxonomy.json` lists every SEMrush Site Audit error and warning type whose evidence is available from HTML and HTTP, priority 1 first (the types acted on in past audits), with the SEMrush issue ID where one exists. Types not covered in v1 are present with `check: null` so the parity table names them. The definitions that differ from SEMrush on purpose are documented in `lib/contracts.md` section 12, for example: accessible names count `aria-label`, `aria-labelledby`, image `alt` and `title` as well as text, so against SEMrush 216 (no anchor text, which also flags a bare URL as text) the gap can run either way; hreflang return links and non-200 targets have no SEMrush equivalent in v1 (SEMrush's hreflang count on Rolfing was a language mismatch, which is not covered); and duplicate content means identical visible body text, while SEMrush also matches near-duplicates, so our count is a floor and a clean result does not prove there are none.

## Parallel run and parity

With `--semrush-counts`, the report has a parity section: per taxonomy entry, our count, the SEMrush count, the counting unit (pages or links) and a reason for each gap outside max(10%, ±2). SEMrush is not a tie-breaker: a disagreement is a diff to investigate. The exit criteria for cancelling SEMrush are in the spec (two consecutive monthly cycles of coverage, parity, precision and recall on Carsa, Coconut and TSC).

## Tests

```bash
npm run test:sr
```

`tests/site-review/golden.test.js` starts the golden fixture site (`tests/site-review/fixtures/golden/`), runs the whole CLI with `--render-sample 1 --render-drift 0` and compares `findings.json` with `expected-findings.json`, which was written by hand from the fixture design before the pipeline existed. The fixture covers retries, `Retry-After`, a transient 404, a redirect chain, a bot wall for non-browser user agents, URL-key variants, every extractor bug listed above, the state matrix, escalation, collapse and the snapshot diff. Unit tests cover each module. Render tests skip with a message when Playwright cannot launch.
