# NEM Life — live n8n state

**Generated 2026-08-18T14:24:53.332Z** by `npm run check:nem-drift`.

**Do not hand-edit this file.** It is written from the live n8n API and is the one
place in this repo allowed to assert what the workflows currently do. Prose docs that
need a live fact should link here rather than restating it — restating is how the
2026-08-13 hand-edit stayed invisible for five days.

## NEM Test — /verify

- n8n id: `uKkMgMYoH5nOLoCR`
- active: yes
- nodes: 19
- last changed in n8n: 2026-08-18T13:51:24.122Z
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
| The alert's [DEV] subject tag agrees with who it is addressed to | holds |
| The Valid Report? failure branch cannot reach Build HTML or Send Report | holds |

## NEM Test — /submit

- n8n id: `LDI1eWR35lwX6WLp`
- active: yes
- nodes: 10
- last changed in n8n: 2026-08-18T14:24:08.700Z
- committed snapshot: matches live

| Invariant | State |
|---|---|
| Store Profile targets a real data table, not a REPLACE_ placeholder | holds |
| Honeypot gate is present | holds |
| Per-IP rate limit is present | holds |
| Verification mail goes out via MailerLite | holds |
| Normalize keeps the v2 outcome, conclusionKey and conclusionId | holds |
| Store Profile persists the v2 conclusion fields and the event type | holds |
