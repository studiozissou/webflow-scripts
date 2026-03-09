# /dev-setup — Setup Phase Status Tracker

Run at any time during the setup phase to see where you are and what comes next.
Not an executable workflow — checks the current state of setup files and reports status.

---

## Status check

Read the following files and report status for each step:

| Step | Command | Check | Status |
|---|---|---|---|
| 1 | `/client-brief` | `.claude/client.md` exists and all fields populated | ✅ / ❌ |
| 2 | `/figma-audit` | `.claude/design/figma-tokens.json`, `section-map.md`, `interaction-specs.md`, `figma-flags.md` exist | ✅ / ⚠️ / ❌ |
| 3 | `/component-plan` | `.claude/design/component-inventory.md` exists with `Status: Approved` | ✅ / ⚠️ / ❌ |
| 4 | `/arch-review` | `.claude/design/arch-review.md` exists with `Status: Signed off` | ✅ / ⚠️ / ❌ |
| 5 | `/webflow-connect` | `.claude/client.md` has Webflow project ID and URLs; `figma-tokens.json` has `webflow_variable_id` entries | ✅ / ❌ |
| 6 | `/style-guide` | Variables created, base CF classes updated, style guide page exists or skipped | ✅ / ⚠️ / ❌ |
| 7 | `/dev-queue` | `queue.json` and `CLAUDE.md` both exist | ✅ / ❌ |

Use these status indicators:
- ✅ Complete
- ⚠️ In progress or partially complete — show what's missing
- ❌ Not started
- ⏸ Blocked — show what it's waiting on

---

## Output format

```
Setup phase status — [Client Name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅  1. /client-brief      client.md complete
✅  2. /figma-audit       12 tokens, 8 sections mapped, 4 flags raised
⚠️  3. /component-plan   inventory exists — not yet approved
⏸  4. /arch-review       waiting on /component-plan approval
⏸  5. /webflow-connect   waiting on /arch-review
⏸  6. /style-guide       waiting on /webflow-connect
⏸  7. /dev-queue         waiting on /style-guide

Next step: run /component-plan to review sections, confirm components, and resolve 4 flags.
```

Always end with a "Next step" line pointing to the exact command to run.

---

## Sequence reference

```
/client-brief → /figma-audit → /component-plan → /arch-review
                                                       ↓
     /dev-queue ← /style-guide (base + visual) ← /webflow-connect
                       ↓
         Build loop: /plan → /build → publish to staging → /qa-check
```

Dependencies:
- `/figma-audit` requires `client.md`
- `/component-plan` requires `figma-tokens.json`, `section-map.md`, `figma-flags.md`
- `/arch-review` requires approved component inventory
- `/webflow-connect` requires arch-review signed off
- `/style-guide` requires Webflow connected — creates variables, applies to base CF classes
- `/dev-queue` requires style-guide complete (variables and base classes set up)

---

## Verification tests

1. Running `/dev-setup` on a fresh project shows all steps as ❌
2. Running `/dev-setup` mid-flow shows correct mix of ✅ / ⚠️ / ⏸
3. "Next step" always points to the first incomplete non-blocked step
4. No files are created or modified when running this command
