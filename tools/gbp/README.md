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

**Payload rules.** Phone edits merge with the current values, because primary and additional must be sent together. Category edits merge the same way. Special hours edits include the current regular hours in the body and the mask, because Google won't take special hours without them.

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

- Mask paths `regularHours`, `specialHours`, `websiteUri`, `phoneNumbers`, `profile.description`, `categories`
- Whether `business.manage` covers reviews and posts
- The quota for v4 reviews and posts
- `DailyMetric` names beyond `WEBSITE_CLICKS` and `CALL_CLICKS`
- Which edits Google holds for review, and whether `metadata.hasPendingEdits` is the right path (`PENDING_EDITS_PATH` in `client.js`)
- Whether Google rewrites values on save, such as phone formats, trailing slashes or the order of hours periods; any of these would show as `mismatch`

Review reply and post applies stay mock-tested until their first real use. Do not post test content on a client listing; watch the first real one.

## Tests

`npm run test:gbp` uses an injected `fetch`, an injected clock and temp folders. It makes no network calls beyond a local loopback check.
