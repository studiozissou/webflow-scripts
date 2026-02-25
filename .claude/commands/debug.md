# /debug Command

## Usage
```
/debug "brief description of the problem"
```

---

## Pre-Flight (read-only)

1. **Read CLAUDE.md** — note deployment model, known gotchas, module load order
2. **Check queue.json** — is there an existing item related to this problem? If yes, reference it throughout
3. **Check recent git diff** — `git diff HEAD~3` — any changes that correlate with the problem appearing?
4. **Confirm environment** — ask if not obvious:
   - Staging or production?
   - Localhost detection active? Is `npx serve .` running?
   - jsDelivr URL — does it match current `git rev-parse HEAD`?

---

## Diagnostic Loop

Activate the **debug skill** and run its full loop:

1. **Isolate** — confirm error is real, repeatable, and scoped
2. **Hypothesise** — state H1–H3 ranked before touching anything
3. **Instrument** — targeted logging only, no logic changes
4. **Test** — one hypothesis at a time
5. **Fix** — apply only after hypothesis is confirmed; if confidence < 80% pause and ask
6. **Confirm** — verify fix, check for regressions, remove all instrumentation

---

## Post-Fix

1. **Write debug log** to `.claude/logs/debug-[slug]-[YYYY-MM-DD].md` using this format:
```
## Debug Summary
**Problem:** [input description]
**Error:** [exact error message or behaviour]
**Root cause:** [confirmed hypothesis]
**Fix applied:** [what changed and why]
**Confirmed:** [how verified]
**Related queue item:** [slug or none]
**Gotcha added to CLAUDE.md:** [yes / no — include entry if yes]
```

2. **Update CLAUDE.md** — if root cause reveals a recurring pattern, add it to Known Gotchas

3. **Promote if needed** — if the confirmed fix requires a proper build (non-trivial change, touches multiple files, needs QA):
   - Ask: *"This looks non-trivial — shall I add it to the queue as READY_FOR_BUILD?"*
   - If yes: create queue item with slug, summary, and link to debug log

---

## Rules
- Read-only until a hypothesis is confirmed — no speculative edits
- Never change two things simultaneously
- Never commit a fix that still has debug instrumentation in it
- If the problem can't be reproduced, say so and stop — don't guess
