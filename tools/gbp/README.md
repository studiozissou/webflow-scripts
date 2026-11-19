# Google Business Profile tool (`gbp`)

A local MCP server and plain Node client for reading and editing Google Business Profiles. Every write is previewed and confirmed by a person.

This code is in a public repo. Client IDs, tokens and logs never go in it: IDs arrive at runtime, secrets live in the Keychain, and the log lives in the home folder. `tests/gbp/repo-scan.test.js` enforces this.

## Files

| File            | Job                                                                              |
| --------------- | -------------------------------------------------------------------------------- |
| `client.js`     | One named function per API call; `fetch` and the token getter are injected       |
| `auth.js`       | Swaps the refresh token for a cached access token; `redact` for every error path |
| `changes.js`    | Previews, the apply gate, read-back and the change log                           |
| `mcp-server.js` | Thin stdio server over the modules above                                         |
| `auth-setup.js` | One-time browser sign-in that saves the refresh token                            |

## Why it is built this way

**Secrets in the Keychain.** The client ID, client secret and refresh token sit in the macOS Keychain under service `mcp`. A wrapper script reads them and passes them to the server as environment variables, so no secret lives in a `.env` file, a settings file or this repo. `auth-setup.js` writes the token through `security -i` on stdin, so it never shows in process arguments or output.

**Preview, then apply.** A preview tool reads the current state, builds a before/after diff and returns a `previewId` and a `confirmText` such as `Example Bakery: websiteUri`. `gbp_apply` needs both values, so the permission prompt shows what is changing and on which location, not just an ID. Location previews also pass Google's `validateOnly` check first; if that fails, no apply is offered. Previews live in memory and last 30 minutes, so a server restart cancels them.

**One write tool.** `gbp_apply` is the only tool that changes Google and must stay off every allowlist, so a person always sees the prompt. `changes.js` is the only module that imports the write functions in `client.js`. Anything else that wants to write, such as a future care runner, must add its own gate.

**Writes are never retried.** A profile allows 10 edits per minute and a timed-out write may still have landed, so a retry could apply twice. A preview is marked used before the write is sent and stays used if the send fails. Reads may retry once on a 429 or 5xx.

**Status from read-back, never "success".**

| Status       | Meaning                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------- |
| `live`       | Reads back as requested, and matches the live Google version                                            |
| `pending`    | Reads back as requested, but `hasPendingEdits` is set or the live version differs                       |
| `mismatch`   | What reads back differs from the request                                                                |
| `unverified` | The write was sent but the read-back failed                                                             |
| `refused`    | A check failed and nothing was sent                                                                     |
| `error`      | The send failed; `outcome` is `not_sent`, `rejected` or `unknown`, and `unknown` needs checking by hand |

Review replies compare the reply text. Posts map the returned state: `LIVE` to `live`, `PROCESSING` to `pending`, anything else to `mismatch`.

**Stale check.** Apply re-reads the edited fields only, and refuses if they differ from the preview. The comparison ignores key order and treats values Google omits (such as `minutes: 0`) as equal to their defaults. Array order counts.

**Payload rules.** Post previews refuse phone numbers and links in the text: Google's automated moderation removed a post with a phone number within a minute and turned off posting for the whole profile. Use the post button for calls and links. Phone edits merge with the current values, because primary and additional must be sent together. Category edits merge the same way. Special hours edits include the current regular hours in the body and the mask, because Google won't take special hours without them.

**Change log.** Every apply attempt, including refusals, adds one JSON line to `~/.config/gbp/changes.jsonl` (folder 700, file 600). Fields: `time`, `location`, `fields`, `before`, `after`, `status`, `previewId`, `sent`, plus `reason`, `outcome`, `error` or `readBack` when they apply. It holds no reviewer names or review text, only reply text. Reply text can still name the reviewer if the reply does.

## Tools

| Tool                        | Type    | Does                                                                                          |
| --------------------------- | ------- | --------------------------------------------------------------------------------------------- |
| `gbp_list_accounts`         | read    | Accounts this sign-in can manage                                                              |
| `gbp_list_locations`        | read    | Locations across accounts, with title, website and IDs                                        |
| `gbp_get_location`          | read    | Hours, special hours, description, categories, website, phone, merchant vs live, pending flag |
| `gbp_list_reviews`          | read    | Reviews with rating, text, reply and reply state                                              |
| `gbp_list_posts`            | read    | Recent posts                                                                                  |
| `gbp_get_performance`       | read    | Daily calls, website clicks, directions and impressions for a date range                      |
| `gbp_preview_location_edit` | preview | Regular hours, special hours, description, website, phone, categories                         |
| `gbp_preview_review_reply`  | preview | New or changed reply                                                                          |
| `gbp_preview_post`          | preview | Standard update, with optional button and image URL                                           |
| `gbp_apply`                 | write   | Takes `previewId` and `confirmText`                                                           |

## Setup

**1. Google Cloud and Workspace (by hand).**

- Enable the Google My Business API and the Business Profile Performance API; confirm the Account Management and Business Information APIs are on.
- Confirm the quota shows 300 queries per minute.
- Confirm the OAuth consent screen is Internal. Tokens from a Testing screen expire after 7 days.
- Confirm Business Profile, plus Search and/or Maps for review replies, are on for the Workspace domain.
- Save the OAuth client ID and secret to the Keychain under service `mcp` as `gbp-client-id` and `gbp-client-secret`.

**2. Sign in once.** Run `node tools/gbp/auth-setup.js` from a real terminal. It reads the client ID and secret from the Keychain, opens a browser, listens on `127.0.0.1` on a random port, checks `state`, and saves `gbp-refresh-token`. It asks for the `business.manage` scope only and prints no secret. Check the result without printing it:

```sh
/usr/bin/security find-generic-password -s mcp -a gbp-refresh-token >/dev/null && echo present
```

**3. Wrapper and registration.** Create `~/bin/mcp-gbp` (mode 700), a zsh wrapper that exports `GBP_CLIENT_ID`, `GBP_CLIENT_SECRET` and `GBP_REFRESH_TOKEN` from the Keychain and then runs `exec node <main checkout>/tools/gbp/mcp-server.js`. Register it as `gbp` at user scope so worktree sessions see it, then restart the session. The server exits with a stderr message naming any missing variable.

Do not add `gbp_apply`, `mcp__gbp` or `mcp__gbp__*` to any allowlist.

## Unconfirmed items

These came from reading Google's docs and have only been tested against mocks. Check them with live reads and `validateOnly` before the first real write, then fix and add tests for any difference.

- Mask paths `websiteUri`, `phoneNumbers`, `profile.description`, `categories` (`regularHours` and `specialHours` confirmed live, 12 Nov 2026). The care runner does not use these
- ~~Whether `business.manage` covers reviews and posts~~ Confirmed live, 17 Nov 2026: `listReviews` and `listPosts` read both pilots
- The quota for v4 reviews and posts. The API does not report it; read it in the Cloud console
- `DailyMetric` names beyond `WEBSITE_CLICKS` and `CALL_CLICKS`. Not checked: on 17 Nov 2026 the Performance API returned 403 `PERMISSION_DENIED` because it is not enabled in the Cloud project. Enable it, then read one month live
- Which edits Google holds for review. Hours edits are held for about an hour; during that time `metadata.hasPendingEdits` stayed false and `getGoogleUpdated` returned `pendingMask`, so the status check reads both
- Whether Google rewrites values on save, such as phone formats, trailing slashes or the order of hours periods; any of these would show as `mismatch`. Known rewrite: Google adds an `endDate` equal to `startDate` to each special-hours period, which the comparison now ignores. Regular hours read back Sunday first, then Monday to Saturday

Checked live on 17 Nov 2026, with no write:

- Special-hours periods with a `startDate` only, `closed: true` or `openTime`/`closeTime`, pass `validateOnly`.
- `validateOnly` also passes a period that closes before it opens (21:00 to 17:00). The care config checks open < close itself.
- A location with no special hours has no `specialHours` key at all.
- A review with stars only has no `comment` key. A review Google translated reads `(Translated by Google) <English>`, a blank line, `(Original)`, then the original text.

Review reply and post applies stay mock-tested until their first real use. Do not post test content on a client listing; watch the first real one.

## Care runner

A weekly job drafts review replies, one post, hours fixes and a monthly insights block per client, and applies only the items Will picks by hand. Each client has a private `projects/<slug>/.claude/care/gbp.json`, never committed.

| File                     | Job                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------ |
| `care/config.js`         | Loads and checks `gbp.json`; maps hours to and from Google's shapes                  |
| `care/collect.js`        | Reads reviews, posts, hours and performance; builds the hours proposal; no writes    |
| `care/draft.js`          | Builds the drafting input, runs `claude -p` with no tools, checks the drafts         |
| `care/claim-lint.js`     | Health claims, per-client banned terms, wording that confirms a reviewer is a client |
| `care/guard.js`          | Read-only `fetch` wrapper                                                            |
| `care/pack.js`           | Writes and updates the pack, `gbp-<date>.json` (source of truth) and `.md`           |
| `care/run.js`            | Entry for `npm run gbp:care`; drafts only                                            |
| `care/approve.js`        | Apply logic; the only care module that imports `createChanges`                       |
| `care/approve-cli.js`    | Entry for `npm run gbp:approve`; never scheduled                                     |
| `care/fixture.js`        | Fixture mode: config, an in-memory Google and canned drafts from a folder            |
| `text-rules.js`          | Shared phone, link, email and handle checks                                          |
| `scripts/gbp-env.sh`     | Exports the three Keychain items, then runs the command                              |
| `scripts/gbp-care.sh`    | Scheduled wrapper: kill switch, lock, `run.js --all`                                 |
| `scripts/gbp-care.plist` | launchd job, Monday 07:30, not installed by default                                  |

**Weekly flow.**

1. `run.js --all` (or `npm run gbp:care -- --client <slug> [--dry-run]`) reads each profile and writes `projects/<slug>/.claude/care/gbp-<YYYY-MM-DD>.{md,json}`. The date is the run date.
2. One counts-only message goes to the digest Slack channel, for example `GBP care 2026-11-23: <slug> 2 replies, 1 post, 0 hours, 1 owner check`. It holds no review text and needs no model.
3. Will reads the md pack, then applies chosen items: `npm run gbp:approve -- <slug> 1 3` (or `all`).

**Why the scheduled job cannot apply.**

- Two entry points. `run.js` drafts; `approve-cli.js` applies. The plist and `gbp-care.sh` call `run.js` only.
- `tests/gbp/care-run.test.js` walks `run.js`'s static imports and fails if they reach `approve.js` or `changes.js`. It also fails on any dynamic `import(` in `care/`, on any care file other than `approve-cli.js` that imports or calls approve, and on any use of `child_process` in `run.js` other than the default `claude` spawn.
- `run.js` always wraps `fetch`, for data and for the token, in the read-only guard. The guard lets through GETs, the token POST to `oauth2.googleapis.com/token`, and requests whose parsed `validateOnly` parameter is `true`. Anything else throws before it is sent. `--dry-run` skips only the `claude -p` call and the Slack message.
- `claude -p` runs with `--tools "" --strict-mcp-config --setting-sources "" --disable-slash-commands`, from a fresh temp folder, with review text in stdin only. The probe on 17 Nov 2026 showed `tools: []` and `mcp_servers: []` in the init event, so user-scope MCP servers such as `gbp` do not load.

**Item states.**

| State                                                | Meaning                                                                           |
| ---------------------------------------------------- | --------------------------------------------------------------------------------- |
| `drafted`                                            | Passed every check; approvable                                                    |
| `not approvable`                                     | A check failed (see problems), Google rejects the hours, or a dry run             |
| `applying`                                           | Written just before the send                                                      |
| `live`, `pending`, `mismatch`, `unverified`, `error` | The read-back status from `changes.js`                                            |
| `refused`                                            | Approve refused it and sent nothing                                               |
| `unknown — check by hand`                            | Found in `applying` on a later approve; the send may have happened. Never re-sent |

Approve refuses when another approve holds `~/.cache/gbp-care/<slug>.approve.lock`, the config has no `consent`, the item type is outside `consent.scope`, a kill switch is on, the pack is older than 7 days, the item is not `drafted`, the text fails the claim, privacy or contact re-check, or the live state differs from the pack's `before` snapshot. A post is also refused when Google shows a post newer than the pack. Previews live only in memory, so approve re-reads, previews and applies in one process, at least 7 s apart per location.

**Kill switches.** `.claude/care/gbp.off` (all clients) or `projects/<slug>/.claude/care/gbp.off` (one client). `run` then writes a paused pack with no drafts and no `claude -p` call; `approve` refuses. `.claude/care/` is gitignored.

**Fixture mode.** With `GBP_CARE_FIXTURE=<dir>`, both entry points read config from `<dir>/<slug>.json`, Google from `<dir>/google-<slug>.json` or `<dir>/google.json` (in memory; writes stay in memory), and drafts from `<dir>/drafts-run.json`. Packs go under `.claude/care/fixture-packs/`, the change log goes to a temp file, and `gbp-env.sh` skips the Keychain.

```sh
GBP_CARE_FIXTURE=tests/gbp/fixtures/care npm run gbp:care -- --client fixture --dry-run
GBP_CARE_FIXTURE=tests/gbp/fixtures/care npm run gbp:approve -- fixture 1
```

**Posting safety.** Post text carries no phone number, email, social handle or link; the button carries the call or link. One post per week, only when the last post is at least 7 days old. When the latest post is `REJECTED`, or the config has `"posting": "off"`, the runner drafts no post and the pack notes "posting off: appeal by hand". Google feature restrictions can be appealed once only, by hand, and deleting the post does not lift them. The runner never appeals and never retries a rejected post.

## Tests

`npm run test:gbp` uses an injected `fetch`, an injected clock and temp folders. It makes no network calls beyond a local loopback check.
