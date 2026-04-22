# Spec: Weekly News Digest Service

**Slug:** `news-digest`
**Project:** `webflow-scripts`
**Status:** Ready to Build
**Priority:** P2
**Complexity:** Medium (5 files, ~300 LOC)
**Created:** 2026-04-22

## Summary

A CLI tool that fetches RSS/Atom feeds and HTML changelogs from configurable sources (product changelogs, tech blogs, Reddit), filters entries from the past 7 days, sends them to Claude for relevance scoring and synthesis against our creative dev stack, and outputs a concise weekly markdown digest.

The digest answers three questions per item: **what** it is, **why** it matters (why people are talking about it), and **how** it could change our workflow (new skills, automation opportunities, tool upgrades).

## Approach

**RSS-first pipeline** — every source is either an RSS/Atom feed URL or an HTML page with a CSS selector for scraping. Reddit uses native `.rss` endpoints. Sources without RSS use a simple HTML scraper with configurable selectors. Claude API handles relevance scoring and summary generation in batches.

Follows the `tools/site-review/` pattern exactly: modular CLI, `config.js` for env loading, `lib/` for business logic, markdown report output.

### Why not search API or Claude-native agentic?
- Search APIs add paid dependencies and noisy results requiring heavier AI filtering
- Claude tool-use agentic approach is non-deterministic, has unpredictable cost, and the API lacks built-in web search
- RSS is deterministic, free, low-token, and the codebase already has regex XML parsing patterns in `discovery.js`

## Scope

### In scope
- Configurable source list (`sources.json`) — add/remove feeds without code changes
- RSS/Atom feed parsing (with `fast-xml-parser` dependency)
- HTML scraper fallback for sources without RSS (CSS selector in config)
- 7-day lookback window
- Deduplication by URL
- Claude API relevance scoring + 3-part summary (what / why / workflow impact)
- Markdown digest output to `tools/news-digest/output/`
- Seen-URLs state file to prevent cross-week duplicates
- GitHub Actions weekly cron schedule
- Local cron setup documentation (macOS launchd)
- npm script entry in root `package.json`

### Out of scope
- Email/Slack/Notion delivery (future enhancement)
- Real-time monitoring (this is weekly batch)
- X/Twitter native API (use RSS bridge service URLs in config instead)
- Web UI or dashboard
- Sentiment analysis beyond relevance scoring

## Files Changed

| File | Change | Lines (est.) |
|---|---|---|
| `tools/news-digest/index.js` | **Create** — CLI entry point, arg parsing, orchestration | 80 |
| `tools/news-digest/config.js` | **Create** — dotenv, env var loading, defaults | 30 |
| `tools/news-digest/sources.json` | **Create** — configurable feed list | 0 (data) |
| `tools/news-digest/lib/fetch-feeds.js` | **Create** — fetch each feed URL with timeout, return raw text | 40 |
| `tools/news-digest/lib/parse-feed.js` | **Create** — XML parse (fast-xml-parser), date filter, dedup | 60 |
| `tools/news-digest/lib/html-scraper.js` | **Create** — HTML scraper for non-RSS sources using CSS selectors | 40 |
| `tools/news-digest/lib/scorer.js` | **Create** — batch entries to Claude API, return scored summaries | 70 |
| `tools/news-digest/lib/digest-writer.js` | **Create** — render markdown digest grouped by relevance tier | 40 |
| `tools/news-digest/output/.gitkeep` | **Create** — output directory (gitignored) | 0 |
| `tools/news-digest/state.json` | **Create** — seen URLs to prevent cross-week dupes (gitignored) | 0 (data) |
| `.github/workflows/news-digest.yml` | **Create** — weekly cron, secrets, commit output | 30 |
| `package.json` | **Edit** — add `fast-xml-parser` dep, `news-digest` script | 3 |
| `.gitignore` | **Edit** — add `tools/news-digest/output/`, `tools/news-digest/state.json` | 2 |
| `tests/news-digest/*.test.js` | **Create** — unit tests (5 files) | 200 |

**Total:** ~595 LOC (including tests)

## Implementation Detail

### `sources.json` schema

```json
{
  "sources": [
    {
      "name": "Anthropic Blog",
      "category": "ai",
      "type": "rss",
      "url": "https://www.anthropic.com/rss.xml"
    },
    {
      "name": "Webflow Changelog",
      "category": "stack",
      "type": "html",
      "url": "https://webflow.com/changelog",
      "selector": "article.changelog-entry",
      "titleSelector": "h2",
      "linkSelector": "a",
      "dateSelector": "time"
    },
    {
      "name": "r/webdev",
      "category": "community",
      "type": "rss",
      "url": "https://www.reddit.com/r/webdev/top/.rss?t=week"
    }
  ],
  "relevanceContext": {
    "stack": ["Webflow", "GSAP", "ScrollTrigger", "Barba.js", "Figma", "Claude API", "Anthropic", "Playwright", "Finsweet", "Lenis", "Three.js", "Rive", "Lottie", "p5.js", "PixiJS"],
    "interests": ["creative development", "web animation", "design tools", "AI automation", "no-code platforms", "CSS new features", "WebGL", "shaders"]
  }
}
```

### `index.js` — CLI orchestration

```
1. Load config (dotenv, sources.json)
2. For each source:
   a. If type=rss → fetchFeed(url) → parseFeed(xml)
   b. If type=html → fetchFeed(url) → scrapeHtml(html, selectors)
3. Filter entries to last 7 days
4. Deduplicate by URL
5. Load state.json → filter out previously seen URLs
6. Batch entries (chunks of 20) → scorer.score(batch, relevanceContext)
7. Sort by relevance score descending
8. Filter to score >= threshold (default 0.5, configurable via --threshold)
9. Write markdown digest to output/YYYY-MM-DD.md
10. Update state.json with new URLs
11. Log summary: "Digest: X items from Y sources, Z relevant"
```

### `scorer.js` — Claude API integration

```js
// Pattern from tools/site-review/checks/code-review.js
const client = new Anthropic();

const response = await client.messages.create({
  model: 'claude-sonnet-4-5-20241022',
  max_tokens: 4096,
  temperature: 0,
  system: `You are a relevance scorer for a creative web development agency...`,
  messages: [{
    role: 'user',
    content: `Score these items for relevance to our stack: ${JSON.stringify(relevanceContext)}

Items:
${entries.map(e => `- [${e.title}](${e.link}) (${e.source}) — ${e.summary}`).join('\n')}

For each relevant item (score >= 0.5), return JSON:
[{ "url": "...", "score": 0.0-1.0, "what": "...", "why": "...", "workflow": "..." }]`
  }]
});
```

### Digest output format

```markdown
# Weekly Digest — 2026-04-22

## High Relevance

### Claude 4.5 Haiku Released
**Source:** Anthropic Blog | **Score:** 0.95
**What:** New fast model with improved coding and tool use.
**Why:** 3x faster than Sonnet at lower cost, strong at structured output.
**Workflow:** Could replace Sonnet for scoring in this digest tool. Update site-review code-review.js model param.

---

## Notable

### GSAP 3.13 — New Physics Plugin
**Source:** GSAP Blog | **Score:** 0.7
**What:** Physics-based easing without manual spring math.
**Why:** Simplifies bounce/spring animations that previously needed custom easing.
**Workflow:** New skill opportunity — add physics plugin patterns to gsap-scrolltrigger skill.

---

## Watching

### Webflow Launches AI Component Builder
**Source:** r/webflow | **Score:** 0.55
**What:** AI-powered component generation in Webflow Designer.
**Why:** Early beta, mixed reception on Reddit.
**Workflow:** Monitor — could reduce manual Webflow builds but unlikely to handle our custom animation work.
```

### GitHub Actions workflow

```yaml
name: Weekly News Digest
on:
  schedule:
    - cron: '0 8 * * 1'  # Every Monday at 8am UTC
  workflow_dispatch: {}    # Manual trigger
jobs:
  digest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: node tools/news-digest/index.js
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      - name: Commit digest
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add tools/news-digest/output/ tools/news-digest/state.json
          git diff --cached --quiet || git commit -m "chore: weekly news digest $(date +%Y-%m-%d)"
          git push
```

## Barba Impact

N/A — this is a CLI tool, not a browser-side module. No Barba transitions involved.

## Parallelisation Map

| Stream | Task | Agent | Est. Tokens | Parallel? |
|---|---|---|---|---|
| A | Scaffold `tools/news-digest/` directory + `config.js` + `sources.json` | code-writer | 2k | Yes (with B) |
| B | Write `lib/fetch-feeds.js` + `lib/parse-feed.js` + `lib/html-scraper.js` | code-writer | 4k | Yes (with A) |
| C | Write `lib/scorer.js` (Claude API integration) | code-writer | 3k | After A (needs config) |
| D | Write `lib/digest-writer.js` + `index.js` orchestration | code-writer | 3k | After B, C |
| E | Write unit tests (5 files) | code-writer | 5k | After B, C |
| F | GitHub Actions workflow + local cron docs | code-writer | 1k | Yes (independent) |
| G | Integration test — run full pipeline with mock server | qa | 2k | After D, E |

**Recommendation:** Streams A+B+F can run in parallel. C follows A. D follows B+C. E follows B+C. G is the final gate. Worktrees not needed (all new files, no merge conflicts). No agent team needed — single code-writer can handle sequential after initial parallel burst.

## Verify Loop

### Pass/fail criteria
1. `node tools/news-digest/index.js --help` prints usage without error
2. `node tools/news-digest/index.js` with a mock HTTP server serving test feeds produces a markdown file in `output/`
3. The markdown file contains entries grouped by relevance tier (High / Notable / Watching)
4. Each entry has `What`, `Why`, and `Workflow` fields
5. Running twice does not duplicate entries (state.json dedup works)
6. `node --test 'tests/news-digest/**/*.test.js'` — all tests pass
7. Adding/removing a source in `sources.json` changes output without code changes

### Reproduction steps
1. `cd` to repo root
2. `npm install` (installs `fast-xml-parser`)
3. `node tools/news-digest/index.js --verbose` (uses real feeds or `--mock` flag for testing)
4. Check `tools/news-digest/output/YYYY-MM-DD.md` for correct format
5. Run again — verify no duplicate entries

### Tier mapping
- **Tier 1 (auto):** Unit tests for parse-feed, html-scraper, scorer (mock Claude), digest-writer, dedup
- **Tier 2 (CDN):** N/A — CLI tool, not deployed to CDN
- **Tier 3 (manual):** Verify real RSS feeds parse correctly (network-dependent), verify Claude summaries are coherent (subjective quality)

### Regression scope
- Must not break existing `tools/site-review/` (completely separate directory)
- Must not break root `package.json` scripts (only adds new entries)
- `fast-xml-parser` dependency must not conflict with existing deps

## Test Plan

### Tier 1 — Auto: Node built-in test runner
- `tests/news-digest/parse-feed.test.js` — RSS and Atom parsing, date filtering, dedup
- `tests/news-digest/html-scraper.test.js` — CSS selector extraction from mock HTML
- `tests/news-digest/scorer.test.js` — Claude API mock, JSON parse, fallback handling
- `tests/news-digest/digest-writer.test.js` — markdown output format validation
- `tests/news-digest/fetch-feeds.test.js` — timeout handling, error recovery

### Tier 2 — Auto: Regression
- N/A — CLI tool, not browser-deployed

### Tier 3 — Manual
- Real RSS feed parsing (network-dependent, can't reliably mock in CI)
- Claude summary quality review (subjective)
- GitHub Actions cron trigger verification (requires push to GitHub)
- macOS launchd plist installation

## Acceptance Tests

1. `parse-feed: parses RSS 2.0 items correctly` — given valid RSS XML, returns array of entries with title, link, date, summary
2. `parse-feed: parses Atom feed correctly` — given valid Atom XML, returns entries in same format
3. `parse-feed: filters entries older than 7 days` — given entries spanning 14 days, returns only last 7
4. `parse-feed: deduplicates by URL` — given duplicate URLs, returns unique entries
5. `html-scraper: extracts items using CSS selectors` — given HTML and selector config, returns entries
6. `html-scraper: handles missing elements gracefully` — given HTML with missing selectors, returns empty array
7. `scorer: returns scored entries from Claude API` — given mock client returning JSON, returns parsed scores
8. `scorer: handles malformed Claude response` — given non-JSON response, returns empty array
9. `scorer: batches large entry sets` — given 50 entries with batch size 20, makes 3 API calls
10. `digest-writer: renders markdown with tier grouping` — given scored entries, produces grouped markdown
11. `digest-writer: includes what/why/workflow for each entry` — markdown contains all 3 fields per item
12. `fetch-feeds: times out on slow responses` — given server with 10s delay and 2s timeout, rejects
13. `fetch-feeds: returns empty on network error` — given unreachable URL, returns empty without throwing
14. `index: full pipeline produces output file` — given mock server, runs end-to-end and writes .md file
15. `index: state file prevents duplicates on re-run` — run twice, second output has no repeat URLs
