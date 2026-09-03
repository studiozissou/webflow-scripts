# NEM Life — live n8n state

**Generated 2026-09-02T14:43:26.658Z** by `npm run check:nem-drift`.

**Do not hand-edit this file.** It is written from the live n8n API and is the one
place in this repo allowed to assert what the workflows currently do. Prose docs that
need a live fact should link here rather than restating it — restating is how the
2026-08-13 hand-edit stayed invisible for five days.

## NEM Test — /verify

- n8n id: `uKkMgMYoH5nOLoCR`
- active: yes
- nodes: 21
- last changed in n8n: 2026-09-02T14:43:02.996Z
- committed snapshot: matches live

| Invariant | State |
|---|---|
| Report Prompt is a Set node on typeVersion 3.5 | holds |
| Report Prompt stores systemPrompt as a fixed value, not an expression | holds |
| Generate Report sets max_tokens to 8000, not the truncating 1024 | holds |
| Generate Report reads the prompt from the Report Prompt node | holds |
| Valid? keeps Respond Confirmed on the fast path, ahead of the report chain | holds |
| Report Prompt demands JSON — without it every report fails validation | holds |
| Generate Report goes through Parse Report, not straight to Build HTML | holds |
| Build HTML fills the published Webflow template, fetched from TEMPLATE_URL | holds |
| Build HTML fills the intro-line slot escaped, and removes the block when empty | holds |
| Build HTML does not greet — the prompt places the first name inside opening | holds |
| Generate Report sends the intro line | holds |
| Generate Report sends the conclusion text | holds |
| Generate Report does not send the total score — the prompt says the model does not calculate | holds |
| Generate Report spells gender the prompt's way: Female / Male | holds |
| Unsupported locales are logged and alerted, never sent to Anthropic | holds |
| The alert's [DEV] subject tag agrees with who it is addressed to | holds |
| The Valid Report? failure branch cannot reach Build HTML or Send Report | holds |

## NEM Test — /submit

- n8n id: `LDI1eWR35lwX6WLp`
- active: yes
- nodes: 13
- last changed in n8n: 2026-09-02T14:36:26.763Z
- committed snapshot: matches live

| Invariant | State |
|---|---|
| Store Profile targets a real data table, not a REPLACE_ placeholder | holds |
| Honeypot gate is present | holds |
| Per-IP rate limit is present | holds |
| Rate limit ignores completion pings — they are logging, not submissions | holds |
| Verification mail goes out via MailerLite | holds |
| Normalize keeps the v2 outcome, conclusionKey and conclusionId | holds |
| Store Profile persists the v2 conclusion fields and the event type | holds |
| Normalize keeps introLine | holds |
| Store Profile persists introLine | holds |
| Normalize keeps conclusionText | holds |
| Store Profile persists conclusionText | holds |
| Completions are logged to their own table, not to nem_test_profiles | holds |
| The completion row carries no name, email or gender | holds |
| The completion path never triggers the verification email | holds |
