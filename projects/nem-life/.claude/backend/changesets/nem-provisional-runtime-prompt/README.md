# Changeset — nem-provisional-runtime-prompt

**Spec:** `../../specs/nem-report-json-and-error-visibility.md` (§7, "installing the prompt")
**Prepared:** 2026-09-02
**Applies to:** `/verify` (`uKkMgMYoH5nOLoCR`), node `Report Prompt` only
**Status:** PREPARED

## What

`Report Prompt` stops holding the 881-character TEST MODE placeholder and holds Alex's
system prompt instead, so a real `/verify` produces a real report and the whole chain can
be tested end to end: quiz → `/submit` → verification email → `/verify` → Claude → PDF.

The prompt is **provisional**. It is built from Alex's working document as captured on
2026-08-31 (`../../research/nem-system-prompt-2026-08-31.md`, with Will's seven wording
corrections already applied), not from the runtime page Alex has yet to mark final. Alex's
own rule for the runtime page is applied mechanically by `tools/nem/build-runtime-prompt.js`:

| Stripped | Why |
|---|---|
| Everything before `# Introduction` — capture header, corrections list, related documents, change log | Editorial, never meant for the API |
| The six `Frequentie (redactioneel, niet voor het rapport)` lines | Alex: the ranking is never mentioned, implied or reflected in the report |
| The italic `*Function of this block: …*` notes | Editorial annotations of the document's structure |

Kept: both layers, every writing rule, every clinical text, the italic block labels
(`*Thought (NL: Gedachte)*` and so on — they are structure the prompt refers to), and the
JSON contract `Parse Report` depends on. No clinical copy was written or changed.

Known, accepted for a provisional install (all in the reconciliation doc):
the relationship-status taxonomy still disagrees with the live form; flat outcomes are
told "no report" by the component but the prompt would write one; Emotional numbing ›
Behaviour › Male 50+ is a missing-variant marker. None blocks an end-to-end run.

## Order to apply in

Before starting: `npm run check:nem-drift` — expect both workflows IN SYNC.

1. **`/verify` → `Report Prompt`** — set the `systemPrompt` assignment's value to the
   contents of `system-prompt.txt`. Fixed value, not an expression.
2. **Re-baseline** — `npm run check:nem-drift -- --write`, so the snapshot and
   `LIVE-STATE.md` carry the installed prompt. Commit both.
3. **One live report** — complete the quiz on the staging page with a real inbox, click
   the verification link, open the PDF. A real Dutch report in five sections, first name
   once at the start of the opening, no mechanism names, no "geautomatiseerde test".

## Replacing it with the final prompt

When Alex marks the runtime page final: export it, diff against `system-prompt.txt`,
regenerate (or hand it to the builder if it is the same document), repeat the steps above.

## Rollback

The TEST MODE placeholder is the `Report Prompt` value in the snapshot at commit
`c547054` — paste it back and re-baseline.

## Files

| File | Role |
|---|---|
| `system-prompt.txt` | The value for `Report Prompt` → `systemPrompt`, generated — never edit by hand |
| `../../../../../../tools/nem/build-runtime-prompt.js` | Builds `system-prompt.txt` from the capture |
| `../../../../../../tests/nem/nem-runtime-prompt.test.js` | Asserts what is stripped, what is kept, and that the file matches the builder |
