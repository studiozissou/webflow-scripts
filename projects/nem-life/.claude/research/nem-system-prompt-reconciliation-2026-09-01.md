# NEM system prompt vs n8n — reconciliation, 2026-09-01

Diff of Alex's system prompt (page state 2026-08-31, see nem-system-prompt-2026-08-31.md)
against what `/verify` actually sends to Claude (`Generate Report` node) and what it does
with the answer (`Parse Report`, `Build HTML`). Snapshot: `.claude/backend/nem-verify.workflow.json`.

## Matches

- Output: five keys `opening, reaction, origin, cost, closing` — `Parse Report` and `Build HTML` expect exactly these.
- Prompt forbids anything outside the JSON; parser tolerates a code fence anyway.
- Word budget (~750 words) fits comfortably inside `max_tokens: 8000`.

## Mismatches — n8n side (fixable in the workflow)

| Prompt assumes | n8n sends | Fix |
|---|---|---|
| Intro line in the user message (§1.1, 1.2, 1.4) | Not sent. `introLine` IS stored in `nem_test_profiles`. | Add `'\nIntro line: ' + introLine` to `Generate Report` jsonBody. |
| Conclusion text already shown (§1.1, 1.4) | Not sent, and not stored — only `conclusionKey`/`conclusionId`. Texts live in `src/nem-conclusion-texts.js`, not in n8n. | Add `conclusionText` to the submit payload + `Store Profile` column, then send it. |
| Dutch only ("plain Dutch prose"; forbidden words are Dutch) | For `locale=en`: "Write the full report in English." | Gate `en` until Alex writes an English layer, or drop the locale line. |
| Gender `Female` / `Male` | `vrouw` / `man` (nl), `female` / `male` (en) | Map in the jsonBody, or ask Alex to accept the slugs. |
| Age `18-30 year` … `60+ year` | `18-30` … `60+` | Fine as-is; Claude will map. |
| Relationship: Single ± children / With a partner ± children / Other | `alleenstaand`, `in-een-relatie`, `gescheiden`, `anders` — no children axis, has "divorced" | **Taxonomy conflict** — the prompt and the live form disagree. Alex decides which. |
| Mechanism names in English/Dutch | camelCase slugs `falseHope`, `selfRejection`, `emotionalNumbing`, `falsePower`, `fear` | Fine; Claude will map. Could send the Dutch label for safety. |
| Nothing about totals | `Total score: N` | Harmless; remove to keep the prompt's "you do not calculate" clean. |

## Mismatches — product logic (Alex to decide)

- **Flat outcomes.** Prompt §1.4: "Where no primary mechanism is supplied … build the report around that picture." The component tells flat users "A personal report does not fit here — it is built around one clear response." One of these is wrong.
- **Name used twice.** Prompt: first name exactly once, at the start of `opening`. `Build HTML` also prints `Beste {firstName},` above the body, so the PDF shows it twice.
- Title page date and fixed disclaimer are assumed by §1.2 but not yet in `Build HTML` (that is §6 of nem-report-json-and-error-visibility.md, unbuilt).

## Defects in the prompt text itself (send back to Alex)

Items 2–5 are corrected in the local capture (see its header); item 1 is marked as a
missing variant there. Alex's Notion page still needs the same edits.

1. Emotional numbing › Behaviour › Male 50+ is truncated/garbled: "Je doet je ding en die routinas alcohol op vaste tijden." Not ready despite "Ready for live testing".
2. §2.3 body starts with a stray first-person author note: "Ik praat liever over een vaste reeks…"
3. §2.3 Valse hoop > Zelfafwijzing: "hooghouden van alle bahet afwerken" — garbled.
4. Emotional numbing › cost › Male: "lijden tot" → "leiden tot".
5. §2.1 function note points at "the third paragraph of the primary response (1.2: acknowledge …)" — stale reference to an older 1.2; the field is now `origin`.
6. Header, change log, related-documents list, italic function notes and the six "Frequentie" lines must be stripped for the runtime page (Alex's own rule).

## Status

Nothing changed in n8n. `Report Prompt` still holds the 881-char TEST MODE placeholder.
Runtime prompt page (`399c706b…`) not yet final per Will, and not readable via the Notion
MCP until Alex's share is accepted.
