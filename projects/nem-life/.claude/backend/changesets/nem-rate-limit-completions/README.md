# Changeset — nem-rate-limit-completions

> ## ✅ APPLIED — do not apply again
>
> Applied 2026-09-02 via `n8n_update_partial_workflow` (`Rate limit` only; the workflow
> stayed active). `./verify.sh` exits 0: both workflows IN SYNC, every invariant green
> including the new one. 334 tests pass. Hits recorded before the fix still age out on
> their own hour.

**Spec:** none — a defect found on the first real end-to-end run, 2026-09-02
**Prepared:** 2026-09-02
**Applies to:** `/submit` (`LDI1eWR35lwX6WLp`), node `Rate limit` only
**Status:** APPLIED to live 2026-09-02 (verify.sh exit 0)

## What

`Rate limit` (3 hits per IP per rolling hour, held in workflow static data) sits before
the `Completion?` branch, so every call to `/submit` was counted — including the quiz's
completion ping, which the component sends when the last question is answered, before the
form is even shown. One honest run of the test therefore cost two of the three slots, and
a second run within the hour — say, after mistyping an email address — was refused with
"Probeer het later opnieuw".

Seen live 2026-09-02 from one IP: completion 13:42:01, submission 13:42:48, completion
14:04:45, then seven submissions in a row rejected (executions 290–297).

The fix is one guard at the top of the node: a `completion` event returns straight
through with `rateLimited: false`, touching neither the store nor the window. Completion
pings are logging, not submissions — they store nothing a user could abuse, and the
`Log Completion` table is the only thing downstream of them.

## Order to apply in

Before starting: `npm run check:nem-drift` — expect both workflows IN SYNC.

1. **`/submit` → `Rate limit`** — replace the node's code with `rate-limit.jsCode.js`.
2. **Verify** — `./verify.sh` from this directory: exits 0 when live matches the
   committed snapshot and the new invariant holds.
3. **Prove it** — finish the quiz once (a completion ping), then open the `/submit`
   execution for it: `Rate limit` output carries `rateLimited: false` and the workflow's
   static data shows no new timestamp for the IP.

Note: the guard does not clear a window already spent. Hits recorded before the fix age
out on their own hour.

## Files

| File | Role |
|---|---|
| `rate-limit.jsCode.js` | Full replacement for `/submit` → `Rate limit`, generated from the snapshot — never edit by hand |
| `verify.sh` | Asserts live matches the snapshot; exits 1 on drift |
| `../../../../../../tests/nem/nem-rate-limit.test.js` | Runs the node's real code: 3 submissions pass, the 4th is limited, completion pings neither count nor block |
