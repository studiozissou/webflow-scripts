# site-review contracts (schemaVersion 1)

The single reference the crawl, check and guard modules build against. Constants live in `config.js`; the URL key in `lib/url-key.js`. If code and this file disagree, this file wins until it is amended in the same commit as the code.

Vocabulary: a **fact record** is everything collected about one fetched page; a **link target** is one unique URL some page points at; a **row** is what a check returns; a **finding** is a row after the runner has attached taxonomy data and an ID.

## 1. Pipeline and ownership

| Stage | Module | Group | Input | Output |
|---|---|---|---|---|
| discover | `lib/discovery.js` | G1 | root URL, crawl config | `SiteFiles` (section 4) |
| crawl | `lib/crawl.js`, `lib/robots.js`, `lib/facts.js`, `lib/html.js`, `lib/fetch-page.js`, `lib/ndjson.js` | G1 | `SiteFiles`, crawl config | `facts[]`, `linkTargets` Map, `CrawlStats` |
| check | `checks/*.js`, `lib/finding.js`, `taxonomy.json` | G1 | facts, link targets, site files | rows, then findings |
| confirm | `lib/render-confirm.js` | G2 | findings, facts, check modules | findings with render states, `rendered` Map |
| reverify | `lib/reverify.js` | G2 | findings, `fetchPage` | findings with `transient` set |
| sanity | `lib/sanity.js` | G2 | facts, findings, site files, previous snapshot | `SanityResult` |
| score | `lib/health.js` | G2 | facts, findings | `Health` |
| snapshot and diff | `lib/snapshot.js` | G2 | everything above | `snapshot.json`, `Diff` |
| collapse | `lib/collapse.js` | G2 | findings, facts | `Collapsed` (report and health score) |
| orchestration, reports | `index.js`, `lib/runner.js`, `lib/report/*` | parent | all of it | `facts.ndjson`, `findings.json`, `report.md`, `snapshot.json` |

G2 modules never import `taxonomy.json` or any `checks/*` file; the runner passes `taxonomy` and `checks` as arguments. Every module is pure where it can be and takes its I/O (`fetchPage`, `renderPage`, `now`) as injectable arguments so tests run without a network.

## 2. Shared constants (`config.js`)

- `SEVERITIES`: `error | warning | notice`. `LEGACY_SEVERITIES` and `LEGACY_SEVERITY_MAP` (`critical → error`, `info → notice`) exist only until the eight old checks have moved.
- `STATES`: `pass | fail | unknown`.
- `UNKNOWN_REASONS`: `fetch_failed, timeout, blocked, non_html, truncated, not_run, cap_exceeded`.
- `SCORE_WEIGHTS`: error 1, warning 0.5, notice 0.
- `RENDERED_FIELDS`: `title, metaDescription, canonicals, robotsMeta, h1, hreflang, jsonLd`.
- `AUDIT_THRESHOLDS`, `DEFAULT_CRAWL_CONFIG`, `DEFAULT_USER_AGENT`, `SCHEMA_VERSION`.
- `loadConfig()` returns `{ googlePsiApiKey, thresholds (legacy), audit: { thresholds }, crawl: DEFAULT_CRAWL_CONFIG copy }`. The runner merges the client's `crawl.config.json` over `crawl`.

## 3. URL key (`lib/url-key.js`, done)

`urlKey(input, { base?, canonicalHost? }) → string | null`

1. Resolve against `base`; anything but `http:` or `https:` returns `null`.
2. Lowercase scheme and host; the host (with port) is mapped to `canonicalHost` when the two differ only by a leading `www.`.
3. Drop the fragment.
4. Drop `utm_*`, `gclid`, `fbclid`, `mc_cid`, `mc_eid`; sort what remains by name, then value.
5. Lowercase the path, collapse `//`, fold a trailing `/index`, `/index.htm` or `/index.html` to the parent, remove the trailing slash except on the root.

The scheme is kept, so `http://` and `https://` spellings stay distinct (that is how "links to HTTP pages" stays visible). Also exported: `hostOfKey(key)`, `isInternalUrl(url, { base?, canonicalHost?, includeHosts? })` (same site when the hosts match ignoring `www.`, or the host is in `includeHosts`).

## 4. Discovery (`lib/discovery.js`)

`discoverSite(rootUrl, { crawlConfig, fetchPage, log }) → SiteFiles`

```
SiteFiles {
  root: { url, urlKey },
  rows: [{ url, urlKey, lastmod: string|null, sitemap: string }],   // deduplicated by urlKey, first occurrence wins
  sitemaps: [{ url, status, fetchState, kind: 'urlset'|'index'|null, valid: boolean, error: string|null, urlCount }],
  robots: { url, status, fetchState, text: string|null, sitemapUrls: string[] },
  llms: { url, status, fetchState },
}
```

Sitemaps come from `robots.txt` `Sitemap:` lines, else `/sitemap.xml`. Index files recurse one level. `<image:loc>` and the like are ignored. `valid` is false when the body is not XML with a `<urlset>` or `<sitemapindex>` root. The root URL is always fetched by the crawl even when the sitemap omits it (`inSitemap: false`). `discoverPages(rootUrl, manualPages)` stays as a thin wrapper for `--pages` and quick mode.

## 5. Fetch (`lib/fetch-page.js`)

`fetchPage(url, opts?) → Promise<FetchResult>`; never throws. For legacy callers, a `Map` second argument is read as `{ cache: map }` and a third argument is merged into `opts`.

```
opts {
  cache?: Map            // per run only, keyed by the exact URL; never persisted
  method?: 'GET'|'HEAD'  // default GET
  readBody?: boolean     // default true for GET
  userAgent?: string     // default DEFAULT_USER_AGENT
  acceptLanguage?: string
  timeoutMs?: number     // default 15000
  retries?: number       // default 1
  retryDelayMs?: number  // default 500, doubled per attempt, replaced by Retry-After when present (capped at 30 s)
  maxBytes?: number      // default 5_000_000
  keepAlive?: boolean    // default true (global fetch); false uses node:http / node:https with agent: false and Connection: close
  minRetryDelayMs?: number   // floor for every retry wait; the crawl sets it from Crawl-delay for the site's own host
  maxRetryAfterMs?: number   // cap on a Retry-After wait, default 30000; the crawl uses 5000 for external hosts
  onThrottle?: (host) => void   // called on every 429
}

FetchResult {
  url, finalUrl,
  status,                        // final response status, 0 when none
  redirectChain: [{ url, status }],   // one entry per redirecting hop, in order; the final response is not in it
  redirectLoop: boolean,         // a hop revisited a URL, or more than 10 hops
  headers: { [lowercaseName]: value },
  body: string|null,             // null for HEAD, non-HTML, or no response
  bytes,                         // body length in bytes as received (after decompression)
  contentType, contentEncoding,  // lowercase header values or null
  fetchState: 'ok'|'non_html'|'truncated'|'fetch_failed'|'timeout'|'blocked',
  attempts,                      // 1 or 2
  errorCode: string|null,        // e.g. 'ENOTFOUND', 'ECONNRESET', 'ETIMEDOUT'
  fetchedAt,                     // ISO timestamp of the final attempt
  html, statusCode,              // legacy aliases of body ?? '' and status, removed when the runner has moved
}
```

Retry once, with backoff, on 429, 5xx, timeout and network error. A 5xx on both attempts is `fetchState: 'ok'` with the 5xx status (the status checks report it). A 429 on both attempts is `blocked`. A network error on both is `fetch_failed`; a timeout on both is `timeout`. `non_html` when the content type is present and is not `text/html` or `application/xhtml+xml`. `truncated` when the body exceeds `maxBytes` (the first `maxBytes` are kept). Redirects are followed manually up to 10 hops, recording every hop's status. Headers sent on every request: `User-Agent`, `Accept-Language` (when given), `Accept: text/html,application/xhtml+xml,*/*;q=0.8`.

## 6. Robots (`lib/robots.js`)

`parseRobots(text) → { groups: [{ agents[], rules: [{ allow: boolean, path }], crawlDelay: number|null }], sitemaps: string[], errors: [{ line, message }] }`
`robotsFor(parsed, userAgent) → { isAllowed(pathWithQuery) → boolean, crawlDelay: number|null }`

Longest-match wins, `Allow` beats `Disallow` on a tie, `*` and `$` supported. The group is picked by the most specific agent token that occurs in the user agent, else `*`. A disallowed sitemap URL is not fetched: its fact record has `fetchState: 'blocked'`.

## 7. Crawl (`lib/crawl.js`)

`crawlSite({ site, crawlConfig, fetchPage, log, onFact?, now? }) → Promise<{ facts, linkTargets, stats }>`

Every request the crawl makes (pages, link targets, external targets, robots and sitemaps in discovery) passes `userAgent: crawlConfig.userAgent ?? DEFAULT_USER_AGENT` and `acceptLanguage: crawlConfig.acceptLanguage` to `fetchPage`, and robots rules are matched against that same user agent.

1. Fetch every `site.rows` URL plus the root, at most `concurrency` per host (halved, minimum 1, on a host-level 429 via `onThrottle`), at least `crawlDelay` seconds apart per host when robots sets one. Excluded paths (`excludePaths`, prefix match on the URL path) are skipped entirely.
2. Each result goes through `extractFacts` and `onFact(record)` (the runner streams it to NDJSON). HTML is dropped after extraction.
3. If the first `slowAbortSample` fetches average over `slowAbortMs`, stop and return `stats.aborted = 'slow'`.
4. Link-target pass: every unique internal key in `links[].hrefKey`, `images[]`, `canonicals[].key` and `hreflang[].key` that is not a fact record is status-checked once (HEAD, GET on 405, 403 or 501, body not read). Targets that are fact records reuse the record's status and chain.
5. External pass, after the template histogram exists (an external host that answers 403, 429 or 999 three times in a row trips a breaker: its remaining targets are recorded `blocked` with `errorCode: 'HOST_BREAKER'` and never fetched): unique external link and image targets, up to `externalCap`; beyond it, a stable per-template sample (by `wfPage` of the first linking page) fills the cap and the rest are recorded with `fetchState: 'blocked'`, `capExceeded: true`.

```
LinkTarget {
  urlKey, url,                   // url = first absolute spelling seen
  internal: boolean, inSitemap: boolean, isFact: boolean,
  kinds: ('link'|'image'|'canonical'|'hreflang')[],
  method: 'HEAD'|'GET'|null,     // null when reused from a fact record or never fetched
  status, finalUrl, redirectChain, redirectLoop,
  fetchState, errorCode, capExceeded: boolean, checkedAt,
}

CrawlStats { fetched, failed, avgMs, aborted: null|'slow', hosts: { [host]: { requests, throttled, concurrency } },
             templates: { [wfPage|'none']: count }, externalChecked, externalCapped }
```

`linkTargets` is a `Map<urlKey, LinkTarget>`. `facts` is an in-memory array (links interned by key); NDJSON is output only.

## 8. Fact record (`lib/facts.js`, `lib/html.js`)

`extractFacts({ fetchResult, row, crawlConfig, schemaVersion }) → FactRecord`

```
FactRecord {
  schemaVersion, url, urlKey, finalUrl, status, redirectChain, redirectLoop,
  headers: { contentType, contentEncoding, xRobotsTag, contentLength,
             security: { strictTransportSecurity, contentSecurityPolicy, xContentTypeOptions, xFrameOptions, referrerPolicy, permissionsPolicy } },
  bytes, fetchedAt, fetchState, errorCode,
  htmlHash,          // first 16 hex of sha256(body); null without a body
  textHash,          // first 16 hex of sha256(visible body text, whitespace collapsed); null when the text is empty
  doctype,           // 'html' etc., lowercase; null when absent
  wfPage, wfSite,    // data-wf-page / data-wf-site on <html>; null when absent
  lang,              // <html lang>; null when absent
  title,             // first <title> inside <head>: null when there is none, '' when empty; decoded, whitespace collapsed
  titleCount,        // <title> elements inside <head>
  metaDescription,   // first <meta name=description> in <head>: null when absent, content decoded and collapsed
  metaDescriptionCount,
  metaRefresh,       // content of <meta http-equiv=refresh> or null
  robotsMeta,        // lowercase content of <meta name=robots>, merged with X-Robots-Tag; null when neither exists
  canonicals: [{ href, url, key }],   // href = attribute as written; url resolved against finalUrl
  hreflang: [{ lang, href, url, key }],
  h1: string[],      // text of each <h1> outside script, style, template, noscript and comments; '' for an empty H1
  headings: { h2, h3, h4, h5, h6 },   // counts
  wordCount,         // words in visible body text
  textToHtmlRatio,   // visible text bytes / body bytes, 0..1, 3 decimals
  links: [{ href, hrefKey, accessibleName, rel, internal, snippet }],
  resources: [{ url, kind: 'script'|'stylesheet'|'iframe'|'img'|'srcset'|'media'|'link' }],
  images: [{ src, srcKey, alt, width, height }],   // alt null when the attribute is absent, '' when empty
  jsonLd: { types: string[], hashes: string[], parseErrors: [{ message, snippet }] },
  scripts: { count, inlineBytes, externalCount },
  viewport,          // content or null
  charset,           // meta charset, else the content-type charset, else null
  inSitemap, lastmod, sitemap,
}
```

Rules that exist because the old extractors got them wrong (each is a golden fixture case):
- Head-scoped: `title`, `metaDescription`, `canonicals`, `hreflang`, `robotsMeta`, `viewport`, `charset` are read inside `<head>` only, so an inline SVG `<title>` in the body is never the page title.
- Attribute values are parsed by the quote they open with: `content="Janco's practice"` is read in full.
- Entities: named (at least the HTML 4 set plus `&apos;`) and all numeric forms decode, so `&#8211;` becomes `–`.
- `<h1>` inside `<script>`, `<style>`, `<template>`, `<noscript>` or comments does not count; an empty `<h1></h1>` does.
- A JSON-LD block that does not parse goes into `parseErrors` with the parser message; never swallowed.
- Status-derived link rules (`broken-*`, `redirect-chain`, `temporary-redirect`, `permanent-redirect`) apply to `<a>` links; images, canonicals and hreflang have their own entries.
- `links` holds `<a href>` only, resolved against `finalUrl`; `mailto:`, `tel:`, `javascript:`, `data:` and fragment-only hrefs are left out. `rel` is the lowercase attribute or `''`. `snippet` is the opening tag plus text, at most 200 characters.
- `accessibleName`: `aria-label`, else the text of the element ids in `aria-labelledby`, else visible text content, else the `alt` of images inside, else `title`; trimmed and collapsed; `''` when nothing yields text. A URL used as link text still counts as a name (SEMrush disagrees; the gap is documented).

A page whose `fetchState` is not `ok` has every parsed field set to `null` or empty; `non_html` pages keep status, chain and headers.

## 9. Check modules (`checks/*.js`)

```
export const meta = { name, taxonomyIds: string[], tier: 1|2, crossPage: boolean, audit: boolean };
export async function check({ facts, linkTargets, site, rendered, taxonomy, config, log }) → Row[]
```

- Checks read facts, never HTML, and never fetch, with two exceptions: `psi` (PageSpeed API) and `code-review`, which has `audit: false` and is skipped in audit mode.
- Checks are deterministic: render-confirm re-runs them on facts with rendered fields overlaid and compares the rows.
- Checks only consider records with `fetchState === 'ok'`, except the status checks, which also read `non_html` records. The runner emits the per-page `unknown` rows (section 11).
- Checks return `fail` and `unknown` rows only. A page with the needed facts and no row passed.
- `config` is `loadConfig()` merged with the client config: thresholds at `config.audit.thresholds`, site settings at `config.crawl`.

```
Row {
  taxonomyId, url, urlKey,
  target?: string, targetKey?: string,    // for link-unit entries: the link, image, canonical or hreflang target
  state: 'fail'|'unknown',
  reason?: UnknownReason,                 // required for unknown
  evidence: {
    value,         // the extracted value that failed: a string, number, array or null (null = absent)
    source: 'raw', // checks always say raw; render-confirm rewrites it
    status,        // HTTP status of the page or, for link-unit entries, of the target
    finalUrl,      // of the page, or of the target for link-unit entries
    selector,      // e.g. 'head > title', 'a[href]', 'link[rel=canonical]', 'header:content-encoding'
    snippet,       // at most 200 characters, '' only when nothing exists to quote (absent tag)
    fetchedAt,
    related?: string[],   // URL keys of the other pages in a cross-page group (duplicates)
  },
}
```

## 10. Finding (`lib/finding.js`)

`createFinding(row, entry) → Finding` where `entry` is the taxonomy entry.

```
Finding {
  id,                  // `${taxonomyId}-${sha256(taxonomyId|urlKey|targetKey ?? '').slice(0, 12)}`: no status, title or value in it
  taxonomyId, label, category, severity, scoreWeight, unit,
  state, reason?,
  url, urlKey, target?, targetKey?,
  evidence,            // as in the row; source becomes 'rendered' or 'both' after confirm
  renderChecked: false,
  transient: false,
  tags: string[],      // 'fixed-after-load', 'transient', 'site-level'
  excludedFromParity: boolean,
}
```

`validateFinding(finding) → { valid, errors }`. A `fail` is rejected unless `evidence` has every key `value, source, status, finalUrl, selector, snippet, fetchedAt` (value may be `null`; the key must exist), `source` is `raw | rendered | both`, and `snippet` is a string of at most 200 characters. An `unknown` is rejected without a `reason` from `UNKNOWN_REASONS`. The runner drops rejected rows and lists each one in the report as a tool bug.

## 11. Unknown rows emitted by the runner

- One per fact record whose `fetchState` is not `ok`: `taxonomyId: 'page-fetch'`, `reason` = the fetch state (`blocked` for robots-disallowed pages).
- One per taxonomy ID of a check that threw or was skipped: `url` = root, `reason: 'not_run'`.
- External link targets that are `blocked`, `timeout`, or have status 403, 429 or 999 produce `unknown` rows from `broken-links` itself, reason `blocked`, `timeout` or `cap_exceeded`.
- Unknown rows are never issues and never reach the score, the counts or the diff.

## 12. Taxonomy entry (`taxonomy.json`)

```
{ id, label, category: 'seo'|'accessibility'|'security'|'performance',
  severity, scoreWeight?,        // defaults from SCORE_WEIGHTS[severity]
  check: string|null,            // module name; null = not covered in v1 (parity shows "not covered")
  facts: string[],               // fact-record fields the entry needs (top-level names, e.g. 'title', 'links')
  semrushId: number|null, semrushLabel: string|null,
  unit: 'page'|'link',
  priority: 1|2,
  statusDerived: boolean,        // reverify refetches these
  siteLevel?: boolean }          // one finding per site, url = root
```

`renderRelevant` is derived, never stored: an entry is render-relevant when its `facts` intersect `RENDERED_FIELDS`. The `facts.ndjson` field set is the union of all entries' `facts` plus the identity fields (`schemaVersion` to `errorCode`).

### Priority 1 IDs (fixed; tests and `expected-findings.json` key on them)

| id | check | sev | unit | semrush | status-derived | rule |
|---|---|---|---|---|---|---|
| http-4xx | status | error | page | 2 | yes | a fact record or internal link target with final status 400 to 499 |
| http-5xx | status | error | page | 1 | yes | as above, 500 to 599 |
| broken-internal-link | broken-links | error | link | 8 | yes | `<a>` to an internal target with final status at least 400; a target that is `fetch_failed` or `timeout` gives an `unknown` row instead |
| broken-external-link | broken-links | warning | link | 12 | yes | `<a>` to an external target with final status at least 400 (not 403, 429, 999), or `errorCode: 'ENOTFOUND'` |
| broken-external-image | broken-links | warning | link | 14 | yes | `<img>` to an external target, same rule |
| redirect-chain | redirects | error | link | 33 | yes | an `<a>` to an internal target whose chain has at least `redirectChainMin` hops or loops (row on the linking page); also a sitemap fact record with such a chain (row on itself, no target) |
| temporary-redirect | redirects | warning | link | 109 | yes | an internal link whose target's first hop is 302, 303 or 307; plus one `siteLevel` row on the root when the root itself redirects temporarily |
| permanent-redirect | redirects | notice | link | 214 | yes | an internal link whose target's first hop is 301 or 308 |
| title-missing | titles | error | page | 3 | no | `title` null or '' |
| title-duplicate | titles | error | page | 6 | no | two or more 200 pages with the same non-empty `title`; one row per page, `related` lists the others |
| title-too-long | titles | warning | page | 102 | no | length above `titleMax` |
| title-too-short | titles | warning | page | 101 | no | length below `titleMin`, not empty |
| description-missing | descriptions | warning | page | 106 | no | `metaDescription` null or '' |
| description-duplicate | descriptions | error | page | 15 | no | as title-duplicate |
| h1-missing | headings | warning | page | 103 | no | `h1` empty array |
| h1-multiple | headings | warning | page | 104 | no | more than one H1 |
| h1-duplicates-title | headings | warning | page | 105 | no | the only or first H1 equals the title after normalisation |
| duplicate-content | content | error | page | 7 | no | two or more 200 pages share a `textHash` with `wordCount` at least 50 |
| jsonld-parse-error | structured-data | error | page | 45 | no | one row per parse error, value = parser message |
| sitemap-incorrect-page | sitemap-hygiene | error | page | 18 | yes | a sitemap fact record (`ok` or `non_html`) whose status is not 200 or whose chain is not empty |
| sitemap-noindex | sitemap-hygiene | error | page | null | no | a sitemap page whose `robotsMeta` contains `noindex` |
| sitemap-missing | sitemap-hygiene | error | page | 125 | no | `siteLevel`: no sitemap fetched with status 200 |
| sitemap-invalid | sitemap-hygiene | error | page | 17 | no | `siteLevel`: a sitemap fetched but `valid: false` |
| sitemap-orphan | internal-links | notice | page | 207 | no | a sitemap fact record with `fetchState: 'ok'` and status 200 that no other fact record links to (self-links do not count) |
| canonical-missing | canonical | warning | page | null | no | a 200 HTML page with no canonical |
| canonical-not-absolute | canonical | warning | page | null | no | canonical `href` not absolute |
| canonical-multiple | canonical | warning | page | 39 | no | more than one canonical with different keys |
| canonical-to-non-200 | canonical | error | link | 38 | yes | the canonical target's first status is not 200 (redirect or 4xx); value = that status |
| hreflang-no-return | hreflang | error | link | null | no | page B is listed in A's hreflang, B is a fact record, and B does not list A; row on B, target A |
| hreflang-non-200 | hreflang | error | link | null | yes | an hreflang target whose final status is not 200 or which redirects |
| links-to-http | internal-links | warning | link | 31 | no | an `https` page with an internal `<a>` whose href scheme is `http:` |
| nofollow-internal-link | internal-links | warning | link | 123 | no | internal `<a>` with `rel` containing `nofollow` |
| link-no-accessible-name | internal-links | notice | link | 216 | no | `accessibleName` is '' |
| image-missing-alt | image-alt | warning | link | 110 | no | an image with `alt` null (empty alt is decorative and passes) |
| low-text-to-html | content | warning, weight 0 | page | 112 | no | `textToHtmlRatio` below `textToHtmlMin` |
| low-word-count | content | warning, weight 0 | page | 117 | no | `wordCount` below `wordCountMin` |
| llms-txt-missing | llms-txt | notice | page | 137 | no | `siteLevel`: `site.llms.status` is not 200 |
| robots-txt-missing | indexability | warning | page | 203 | no | `siteLevel`: robots.txt status is not 200 |
| robots-txt-invalid | indexability | warning | page | 16 | no | `siteLevel`: `parseRobots(...).errors` not empty |
| mixed-content | mixed-content | warning | page | 30 | no | an `https` page with any `http:` resource; one row per page, value = count, snippet = first resource |
| viewport-missing | document | warning | page | 20 | no | `viewport` null |
| doctype-missing | document | warning | page | 116 | no | `doctype` null |
| charset-missing | document | warning | page | 115 | no | `charset` null |
| html-too-large | page-weight | warning | page | 21 | no | `bytes` above `htmlBytesMax` |
| too-many-links | page-weight | warning | page | 108 | no | `links.length` above `linksMax` |
| uncompressed-page | page-weight | warning | page | 129 | no | a 200 HTML page with `contentEncoding` null |
| page-fetch | (runner) | notice, weight 0 | page | null | no | unknown rows only (section 11) |

The `semrushId` and `semrushLabel` values were confirmed on 2026-11-10 against the SEMrush `meta_issues` list (98 issue types, saved in webflow-internal at `.claude/reference/semrush-issue-ids.json`); `semrushLabel` is the SEMrush title verbatim, and both are null where SEMrush has no issue with the same definition (`sitemap-noindex`, the canonical-missing and not-absolute rules, both hreflang rules, `amp-issues`). Existing modules keep their own priority 2 IDs (`security-headers`: `hsts-missing`, `csp-missing`, ...; `psi`: `psi-lcp`, `psi-cls`, `psi-inp`; `code-review`: `code-review`), all `notice` unless a reason is written. Not-covered entries (out-of-scope list in the spec) are present with `check: null`.

## 13. Render confirm (`lib/render-confirm.js`)

`confirmFindings({ findings, facts, linkTargets, site, checks, taxonomy, config, renderPage?, log, now? }) → Promise<{ findings, rendered, stats }>`

- `renderPage(url) → Promise<Rendered | { error }>`. The default launches Playwright lazily (one browser, one context per 50 pages, images, media and fonts blocked, `domcontentloaded` plus `renderSettleMs`, default 1500). If Playwright cannot launch, every finding keeps `renderChecked: false` and `stats.notRun = true`.
- `Rendered { title, metaDescription, canonicals, robotsMeta, h1, hreflang, jsonLd: { types }, renderedAt }` with the same semantics as the raw fields (head-scoped, `title` from `head > title`).
- Template key: `wfPage`, else `'none'`. Sample: the `renderSample` pages with the lowest `sha256(urlKey)` per template, plus `renderDrift` pages chosen by `sha256(urlKey + runMonth)` where `runMonth` is `YYYY-MM` of `now`. Flagged: per (template, render-relevant taxonomyId) with raw fails, up to `renderFlagged` of the failing pages, lowest hash first.
- Overlay: for rendered pages, a copy of the fact record with `RENDERED_FIELDS` replaced by the rendered values. Render-relevant check modules are re-run on the facts array with overlays applied; their rows are compared with the raw rows by `(taxonomyId, urlKey, targetKey)`.
- Normalisation before comparing values: full entity decode, whitespace collapse, JSON-LD types sorted, canonical and hreflang hrefs compared as URL keys.
- Escalation: when a rendered page in a template disagrees with its raw rows for a taxonomyId, every remaining page of that template is rendered (within `renderMax`) and `stats.escalated` records `{ template, taxonomyId }`.
- Cap: total renders never exceed `renderMax`; pages past it keep `renderChecked: false` and `stats.capExceeded = true`.

State matrix, applied per finding key on rendered pages for render-relevant IDs:

| raw | rendered | result |
|---|---|---|
| pass | pass | pass (no finding) |
| fail | pass | `state: 'fail'`, `severity: 'notice'`, `scoreWeight: 0`, tag `fixed-after-load`, `source: 'raw'`, `excludedFromParity: true` |
| pass | fail | new finding, `state: 'fail'`, `source: 'rendered'` |
| fail | fail | `state: 'fail'`, `source: 'both'` |
| fail | not rendered | unchanged, `renderChecked: false` |
| unknown | any | unchanged |

Every finding on a rendered page gets `renderChecked: true`. `rendered` is the `Map<urlKey, Rendered>`.

## 14. Reverify (`lib/reverify.js`)

`reverifyFindings({ findings, taxonomy, fetchPage, delayMs = 2000, sleep?, log }) → Promise<{ findings, stats }>`

After the delay, every unique URL behind a `fail` whose entry has `statusDerived: true` (the `target` for link-unit findings, else `url`) is refetched once through `fetchPage(url, { keepAlive: false, retries: 0, method: 'GET', readBody: false })`. A finding reproduces when the new result is in the same class as `evidence.status`: at least 400 (or `errorCode: 'ENOTFOUND'`) when it was at least 400; first hop status equal to the recorded first hop when it was a redirect; not 200 when the entry is `canonical-to-non-200` or `hreflang-non-200`. A finding that does not reproduce gets `transient: true` and tag `transient`; it leaves the score, counts and diff and is listed in the Transient section.

## 15. Sanity (`lib/sanity.js`)

`runSanity({ facts, findings, site, previousSnapshot }) → { abort: null | { code: 'bot_wall'|'no_pages', message }, banners: [{ code, message }], suspect: [{ taxonomyId, count, previous }], coverage: { sitemapUrls, fetched, ratio } }`

- `no_pages`: no fact record with `fetchState: 'ok'`.
- `bot_wall`: among records with status 200 and `fetchState: 'ok'`, at least 10 exist and 90% or more share one `htmlHash`. Message names the hash, the share and suggests checking the user agent. Non-200 pages never count.
- Coverage: `fetched` = sitemap rows with a fact record whose `fetchState` is `ok` or `non_html`; banner `low_coverage` when `ratio < 0.95`.
- Suspect: per taxonomyId count of final, non-transient fails over 20 and over five times the previous snapshot's count.

## 16. Health (`lib/health.js`)

`computeHealth({ facts, findings }) → { score: number|null, pages, errorPages, warningPages, sharedDamage, sharedIssues: [{ kind: 'sitewide'|'target'|'snippet', taxonomyId, fingerprint, pages, weight, penalty }], formula }`

`P` = fact records with `fetchState: 'ok'`. Final fails that are not transient and not fixed-after-load are split by `collapseFindings` into shared issues (a site-wide pattern, or a target or snippet group on two or more pages) and singles. A page's class is the highest `scoreWeight` among its single-page fails (link-unit findings count on the linking page; site-level findings on the root): 1.0 error page, 0.5 warning page, 0 healthy. Each shared issue adds `weight × (1 + log2 n)` to `S`, `n` being the fetched pages it reaches. `score = round(100 × (1 − (E + 0.5 × W + S) / P))`, clipped to 0..100; `null` when `P` is 0. Counts, the snapshot diff and parity always use the uncollapsed findings.

## 17. Snapshot and diff (`lib/snapshot.js`)

`buildSnapshot({ url, client, facts, findings, health, sanity, stats, crawlConfig, toolVersion, now }) → Snapshot`
`diffSnapshots(previous, current) → Diff`; `findPreviousSnapshot(dir, date) → Promise<string|null>` (latest `snapshot.json` in a sibling dated folder before `date`).

```
Snapshot { schemaVersion, toolVersion, date, url, client, configHash,
  coverage, health, templates: { [wfPage|'none']: count },
  counts: { [taxonomyId]: n },             // final fails, not transient, not excludedFromParity
  countsFixedAfterLoad: { [taxonomyId]: n },
  findings: [{ id, taxonomyId, urlKey, targetKey }] }   // the same set as counts, uncollapsed

Diff { fixed: [entry], stillOpen: [entry], new: [entry],
       byType: { [taxonomyId]: { fixed, stillOpen, new } } }   // entries keyed by finding id
```

## 18. Collapse (`lib/collapse.js`, report and health score)

`collapseFindings({ findings, facts, threshold = 0.9 }) → { groups, sitewide, singles }`

- `groups`: fails with the same `taxonomyId` and the same `targetKey` (link-unit), or the same `evidence.snippet` (non-empty), across two or more pages: `{ fingerprint, taxonomyId, kind: 'target'|'snippet', count, urlKeys, sample }`.
- `sitewide`: any taxonomyId failing on more than `threshold` of `fetchState: 'ok'` pages: `{ taxonomyId, pages, ratio }`. Those findings appear once in the report.
- `singles`: everything else. Counts, the diff and parity always use the uncollapsed list; the health score takes shared issues from `groups` and `sitewide` (section 16).

## 19. NDJSON (`lib/ndjson.js`)

`createNdjsonWriter(path) → { write(object), close() → Promise }`, `readNdjson(path) → Promise<object[]>`. One JSON object per line, UTF-8, `\n` separated.

## 20. Client config (`crawl.config.json`, webflow-internal)

Path: `<internal>/projects/<client>/.claude/crawl.config.json`, where `<internal>` is `$WEBFLOW_INTERNAL` or `~/webflow-internal`; `--config <path>` overrides it (the golden test uses this). Fields are those of `DEFAULT_CRAWL_CONFIG`. `canonicalHost` defaults to the host of `url` (or `--url`). Example:

```json
{
  "url": "https://www.rolfingamsterdam.nl",
  "canonicalHost": "www.rolfingamsterdam.nl",
  "locales": ["nl", "en"],
  "acceptLanguage": "nl-NL,nl;q=0.9,en;q=0.8",
  "includeHosts": [],
  "excludePaths": [],
  "renderSample": 20,
  "renderMax": 300,
  "renderDrift": 5,
  "externalCap": 2000,
  "semrushProjectId": null,
  "templatesLabel": {}
}
```

## 21. SEMrush counts (`semrush-counts-<date>.json`, webflow-internal)

```json
{ "date": "2026-11-01", "project": "rolfingamsterdam.nl", "snapshot": "SEMrush snapshot id or UI date",
  "counts": { "2": 1, "6": 8, "8": 30 } }
```

Keys are SEMrush issue IDs as strings; the parity table maps them through `semrushId`.

## 22. Output layout

With `--client`: `<internal>/projects/<client>/.claude/audits/crawl/<YYYY-MM-DD>/{facts.ndjson, findings.json, report.md, snapshot.json}`; the run fails when no internal checkout exists. Without `--client`: `tools/site-review/reports/<domain>-<date>/` (gitignored). `--out` overrides both.
