# site-report

Builds the goal-led monthly report for a retainer client: statuses, progress bars, the next-month
task pick, up to 3 charts, and the checks that gate the Notion push. The `/site-audit` command
(Phase 7, Path A) runs it. The report format is `.claude/templates/goal-report.md`; the plan format
is `.claude/templates/goal-plan.md`.

The code has no inline comments, by repo rule. This file holds the "why".

## Files

| File | Job |
|---|---|
| `schema.js` | Validates `goals.json` and fills profile defaults. |
| `report-data.js` | Statuses, bars, phase rows, next-month pick, toggle title escape, report markup, chart specs. CLI writes `report-data.json` and `charts-spec.json`. |
| `collect.js` | Pulls the month's figures and writes `metrics-YYYY-MM.json`. |
| `charts.py` | Renders the charts from a spec with matplotlib. |
| `wordcount.js` | The word gate. Exit 1 on any breach. |
| `review-log.js` | The review-log gate. Exit 1 on any breach. |
| `cli.js` | Shared exit-code helper. |

Setup for charts: `python3 -m venv ~/.venvs/site-report && ~/.venvs/site-report/bin/pip install -r tools/site-report/requirements.txt`.
The chart test skips with a message when that venv is missing. Tests: `npm run test:site-report`.

## Profiles

The engine is the same for every client. `goals.json` sets `profile`, and the profile only changes
defaults. A default fills only what the file leaves out, and an explicit value always wins.

| | `small` (default) | `multi-location` |
|---|---|---|
| Who | One location or a service area, owner-run | Several branches, its own lead system, national searches |
| Headline goal | Enquiries from Google: form submissions, calls, booking clicks | Leads from search, from the client's lead system |
| Goals | 5 to 8, warning above 8 | Up to 15, warning above 15 |
| Phases | 0 Measure, 1 Google profile and reviews, 2 Service pages, 3 Local authority (start dates come from `planStart`) | None by default. The plan sets them. |
| Charts | Headline goal against last year (line), Google profile actions (line), core searches against page one (dot plot) | None by default. Set `chart` on each goal. |

Why one engine: most retainer clients are small. A second code path for the large client would
double the tests for a case that is only more data. A third profile would need an ADR.

Default charts are matched by rule, not by name: the headline goal gets the line against last year,
a goal whose `source` mentions the Google profile gets a plain line, and a goal whose `source`
mentions position tracking gets the dot plot. If any goal sets `chart`, no default applies.

## Data files

All client data lives in the client's private folder, `projects/{client}/.claude/reports/`. This
repo is public, so `tools/site-report/`, the templates and the fixtures hold no client name (a
repo-scan test enforces it). Fixtures are made up.

- `goals.json`: `profile`, `agreed`, `realisticGoal`, `planStart`, `phases` (`id`, `name`, `start`),
  `goals` (`id`, `name`, `owner`, `phase`, `source`, `metric`, `baseline`, `target`, `due`,
  `direction`, `headline`, `chart`) and `tasks` (`id`, `phase`, `goals`, `blocks`, `impact`, `done`,
  `name`, `detail`). Every goal belongs to exactly one phase. Baselines may be null. Targets may be
  text. Values may be objects. The schema accepts those shapes.
- `metrics-YYYY-MM.json`: `{ month, figures }`. Each figure is `{ value, source, pulledAt }`, or
  `null` when no source gave it. Charts read history from these files only.
- `sample-YYYY-MM.json`: made-up figures for a sample run, with a `history` map of older months and
  optional `taskCounts`. Only sample mode reads it.
- `review-YYYY-MM.md`: the review log.

`metric` on a goal names the figure it reads. It can be a list, and the figures are summed. Without
it, the goal reads `goal-<id>`. A figure with `sample: false` in a sample file is real and carries no †.
Optional `chart*` fields on a goal (`chartTitle`, `chartUnit`, `chartBand`, `chartTarget`, `chartSource`) shape its
chart. `chartSource` is the client-facing source line ("website forms and Google profile"); without it
the footer shows the metric's own source, which names internal tools such as an MCP server.
Set `clientName` at the top of `goals.json`: task toggles read "Needs from <clientName>", and
without it they fall back to "the client".

## Statuses

Expected now = baseline + (target - baseline) × (months elapsed ÷ months to `due`). Months elapsed
count from the start of the goal's phase. A goal with no baseline uses its first recorded figure.

- `● On track` (green) or `● Behind` (orange), by whether the figure meets the line. A goal that
  must fall (`direction: down`) is on track at or below the line.
- `○ Starts <month>` (gray): the goal's phase has not started. It wins over every other status.
- `○ Starting point set` (gray): the first figure is recorded and there is nothing to compare with.
- `○ No data` (gray): the figure is `null`.
- Targets that say "higher than last year" compare with the same month last year. With no figure from
  last year, the status falls back to last month and records `basis: "month"`, so the report can say so.
  Exception: a text target that names a quarter ("higher each quarter, then higher than the same month
  last year from …") uses the previous-quarter rule below until a last-year figure exists.
- A text target that is not "higher than last year" compares with the figure from three months
  earlier (the previous quarter), in the goal's direction. With no figure from that month, the status
  is `○ Starting point set`. Why: a goal with no last-year data still needs a fair line.
- An object value, such as `{ total, average }`, takes its status from the one key the goal names in
  `statusKey` (for example `"statusKey": "total"`). The baseline, target and history use the same
  key. Why: one number must decide the status, and the file says which, so the engine never picks.
- `○ Not scored yet` (gray): an object value with no `statusKey`. It stops the engine from guessing.

Why the phase rule wins: the template says a goal in a phase that has not started shows
`○ Starts <month>`. A mockup showed "Starting point set" for such goals. The template is the
written rule, so the engine follows it.

## Next-month pick

Plan tasks that unblock the most still-open tasks come first, then the rest by impact, ties to the
earlier phase. At most 5. They are shown in phase order. Only phases that start by next month are
eligible. Why: a task for a phase that has not started cannot be worked, and a blocker only counts
tasks that are still open.

A task's `detail` (`work`, `needs`, `doneWhen`, `unknown`) fills its accordion. A missing part shows
`[to write]`, and the word gate rejects that text. Why: a report must not ship a made-up step.
"Depends on" is computed from the other tasks' `blocks` lists. There are no time estimates.

## Sources and collect

The source audit for the small profile, and what the code does about each:

| Source | Works today? | How |
|---|---|---|
| Google profile performance and reviews | Yes | `tools/gbp/client.js` (`getPerformance`, `resolveLocation`, `listReviews`), summed over `gbp.locations` in `goals.json`. Needs `GBP_CLIENT_ID`, `GBP_CLIENT_SECRET`, `GBP_REFRESH_TOKEN`. |
| Webflow form submissions | MCP only | Node cannot call the Webflow MCP. `/site-audit` pulls the counts and stages them. |
| Semrush position tracking, backlinks | MCP only | Same: staged by `/site-audit`. |
| Search Console | No access and no API scope yet | The call is written behind an injectable fetch. It runs once `SEARCH_CONSOLE_TOKEN` and `searchConsole.siteUrl` exist. Until then its figures are `null`. |

Search Console uses the same Google sign-in as the profile API. `tools/gbp/auth-setup.js` asks for
both `business.manage` and `webmasters.readonly`, so the one refresh token in `GBP_REFRESH_TOKEN`
covers both. `collect.js` gets the Search Console token from `createTokenProvider` in
`tools/gbp/auth.js` (`searchConsoleToken`), or from `SEARCH_CONSOLE_TOKEN` when that is set. The
call runs once the client's `goals.json` sets `searchConsole.siteUrl` and the Google account has
read access to that site. A token stored before the scope change needs a new `auth-setup` consent.

A source that is not connected gives `null` and a run-log line, never a guess. Why: a wrong number
in a client report costs more than a gap.

### Manual figures

Some figures have no API, such as reservation counts exported by the client. Put them in
`projects/{client}/.claude/reports/inputs-YYYY-MM.json`:

```json
{ "figures": { "manual.reservations": { "value": 42, "source": "Reservation system export", "pulledAt": "2026-12-02T10:00:00Z" } } }
```

`collect.js` copies each figure with `{ value, source, pulledAt }` into `metrics-YYYY-MM.json`. A
missing or unreadable file gives `null` and a run-log line, and a figure with no `source` becomes
`null`. An API or MCP figure for the same key wins over a manual one. Name the key in the goal's
`metric`. Why: a typed number with no source cannot be checked later.

### MCP staging file

`collect.js --mcp <file>` merges figures that `/site-audit` already pulled through MCP:

```json
{
  "pulledAt": "2026-12-01T08:00:00Z",
  "figures": {
    "forms.submissions": { "value": 26, "source": "Webflow form submissions (Webflow MCP)" },
    "semrush.pageOne": { "value": 2, "source": "Semrush position tracking (Semrush MCP)", "items": [{ "label": "search", "value": 4 }] }
  },
  "formSubmissions": [{ "submittedOn": "2026-11-02T10:00:00Z", "isSpam": false }]
}
```

A staged figure with no `source` becomes `null` and is logged. `formSubmissions` is counted for the
month, spam excluded, when `forms.submissions` is not given.

Run: `node tools/site-report/collect.js --client <name> --month YYYY-MM [--projects <dir>] [--mcp <file>]`.
Run-log lines go to stderr. Exit 2 is a usage or goals-file error.

## Sample mode

A sample run shows the report format with made-up figures. Every made-up figure carries a †, and the
report opens with a gray callout. Why it is isolated: a sample figure in a `metrics-*.json` file
would become history, and later charts and statuses would read it as real.

- Sample figures live only in `sample-YYYY-MM.json` or `tests/site-report/fixtures/`.
- `collect.js --sample` exits 1 and writes nothing. `writeMetrics` throws for a `metrics-*.json`
  path in sample mode.
- "No data" never carries a †.

## Charts

`charts.py <spec.json> <out-dir>` prints `{ "written": [...], "skipped": [...] }`. Types: `line-yoy`
(this year against the same months last year), `line` (with a target band toward `due`) and `dots`
(any list of items against a band, such as page one). A line chart with fewer than 2 months of data
is skipped, and so is a dot plot with no items. Labels, series and targets come from `goals.json` and
the metrics files, so no chart names a client. The subtitle uses the same figure text as the table,
so the chart and the text agree.

Palette: series `#2a78d6`, last year `#b8b7b0`, target band `#eaf2fc`, muted `#8a8984`. One axis per
chart. Font: Helvetica Neue on macOS, DejaVu Sans elsewhere. matplotlib is pinned to 3.9.4 so the
PNGs do not change between runs.

## Word gate

`wordcount.js <report.md>` exits 1 on any breach.

- Visible words, 800 or fewer. Toggle titles count. Toggle bodies, images and link addresses do not.
- A sentence unit is a sentence inside a bullet, paragraph or table cell, split on `.`, `?` and `!`,
  with 3 or more words. Visible sentences have 20 words or fewer, and the average is 15 or fewer.
  Toggle body sentences have 25 words or fewer.
- `{toggle="true"}` markup is a breach. Notion needs `<toggle heading="h3">`.
- An empty toggle title, or a `[to write]` placeholder, is a breach.

A numbered toggle title is written `1\. Title`. Without the backslash, Notion turns it into a list
item and the toggle title is empty.

## Upload flow

Charts go to Notion in 2 steps. Call `notion-create-file-upload`, then POST the PNG to the returned
upload URL as multipart field `file`, with the returned `authorization` header:
`curl -sS -X POST <upload_url> -H "authorization: <value>" -F "file=@<png>"`. The URL starts with
`https://api.notion.com/v1/mcp/file_uploads/`, which is the form the scheduled run's allowlist permits. Keep the POST response (`markdown_source`): there is no GET for
it. Place each chart with `<image source="file-upload://…">`. Image blocks cannot be edited with
`update_content`. To change a chart, replace the page content.

## Review cycle

Every report ends with a review that cannot be skipped. After the word gate passes, one Opus
reviewer reads the whole report, charts included. Every recommendation is applied, or rejected with a
one-line reason, and logged in `review-YYYY-MM.md`:

```
## Cycle 1

- [applied] Goal 4 sits in the wrong phase — moved it to phase 1.
- [rejected] Use "enquiries" in the summary — the client says "leads", so we keep it.

## Cycle 2

No findings.
```

The reviewer then runs again, up to 3 cycles. `review-log.js` fails on a finding with no status, a
rejection with no reason, an open finding in any cycle, a cycle with neither findings nor
`No findings.`, and more than 3 cycles. `--require-copy` also needs a `## Copy review` block, logged
the same way. Why a gate and not a habit: the log is the proof that no recommendation was dropped.
The report goes to Notion as a private draft only after the gate passes.

## Monthly runner

`scripts/site-report-monthly.sh` drafts each goal client's report on day 3 at 07:00
(`scripts/site-report-monthly.plist`, not installed by default). Google profile figures lag about 2
days, so day 3 gives complete figures for the month before. It is a schedule around this engine and
adds no report logic.

- Clients: every `projects/*/.claude/reports/goals.json`. A `site-report.off` file next to it skips
  that client, and so does `report-YYYY-MM.done` for the report month, which is the previous month
  (`SITE_REPORT_MONTH` overrides it). Why files and not a list: this repo is public and names no client.
- Each client runs `claude -p "/site-audit <client> --report-only --unattended" --allowedTools ...`, one at a time,
  under `perl -e 'alarm'` (`SITE_REPORT_MAX_SECONDS`, default 1800). The tool list comes from
  `allowed-tools.txt`; no list means no run, because nobody can answer a permission prompt.
- `--unattended` writes `report-YYYY-MM.done` after a successful push. The script counts a run that
  exits 0 without that file as a failure and creates no task. After a success it runs
  `node tools/notion/cli.js create-task --title "Review <client> report"`. The script sends nothing
  to a client.
- A failure or timeout for one client is logged and the run goes on. The exit code is 1 when any
  client failed.
- `triage_env` unsets `ANTHROPIC_API_KEY` on purpose, so `claude -p` bills on the OAuth login.
- Private files live in `~/webflow-internal/site-report/` (`SITE_REPORT_DIR`): `site-report.off`
  (global off switch), `monthly.lock` (one run at a time, stale pids are taken over),
  `logs/YYYY-MM.log` (named for the report month) and `allowed-tools.txt` (`SITE_REPORT_ALLOWLIST`).
  `SITE_REPORT_PROJECTS` and `SITE_REPORT_NOTION_CLI` move the projects folder and the task tool.
- `SITE_REPORT_DRY_RUN=1` prints `would run: a, b` and `skipped: c (off)` and touches nothing.
