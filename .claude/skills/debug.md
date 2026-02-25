# Debug Skill

## Trigger Conditions
Auto-activate when any of the following are detected:
- Words: `error`, `broken`, `not working`, `fails`, `undefined`, `null`, `TypeError`, `ReferenceError`, `Cannot read`, `is not a function`
- Pasted stack traces or console output
- Playwright test failures
- User reports unexpected visual behaviour

---

## Guiding Rules
- Never change two things simultaneously
- Never modify production logic to diagnose — instrument first, clean up after
- One hypothesis tested per iteration
- If confidence is below ~80%, stop and ask before applying a fix

---

## Diagnostic Loop

### Step 1 — Isolate
Confirm the error is real and repeatable.
- What is the exact error message?
- Which page, namespace, or component?
- Does it happen on staging, production, or both?
- Is localhost detection active? If so, is `npx serve .` running?
- Is the jsDelivr URL pinned to the correct commit hash?

### Step 2 — Hypothesise
State 1–3 ranked hypotheses before touching anything. Format:
```
H1 (most likely): [reason]
H2: [reason]
H3: [reason]
```

### Step 3 — Instrument
Add targeted logging to confirm or rule out H1. Do not change logic yet.
- Use `console.log('[debug][module]', value)` with a clear prefix
- For GSAP: log timeline state, ScrollTrigger instances, Lenis scroll position
- For Barba: log `barba.hooks` lifecycle events, namespace resolution
- For Finsweet: log attribute parsing and CMS load events

### Step 4 — Test
Run the instrumented code against the failing case.
- Does the log confirm H1?
- If yes → proceed to fix
- If no → rule out H1, move to H2, repeat from Step 3

### Step 5 — Fix
Apply the minimal change that resolves the confirmed hypothesis.
- If confidence ≥ 80%: apply and report
- If confidence < 80%: state the proposed fix and wait for approval

### Step 6 — Confirm
- Verify the original error no longer occurs
- Check for regressions in related functionality
- Remove all instrumentation (`console.log` debug lines)
- Update CLAUDE.md "Known Gotchas" if this is a recurring pattern

---

## Stack-Specific Checks

### GSAP / ScrollTrigger
- Is `.kill()` called on old instances before re-init?
- Is `ScrollTrigger.refresh()` needed after DOM changes?
- Are contexts (`gsap.context()`) scoped and cleaned up on Barba leave?
- Is Lenis RAF conflicting with GSAP ticker?

### Barba.js
- Does the failing page have `data-barba="wrapper"` and `data-barba="container"`?
- Does the namespace in `barba.init({ views })` match `data-barba-namespace`?
- Is the init script running after Barba has mounted (not on raw DOMContentLoaded)?
- Are `once`, `enter`, `leave` hooks firing in the expected order?

### Webflow Embeds
- Is the embed inside the correct Webflow region (before `</body>` vs in-page)?
- Is jQuery available if the script depends on it?
- Are embed scripts being re-executed after Barba transitions?

### Finsweet Attributes
- Is `fs-attributes` loaded before DOM is parsed?
- Are CMS Filter / Load / Nest attributes on the correct elements?
- Has `window.fsAttributes.push()` been used for post-load hooks?

### jsDelivr / Deployment
- Does the URL in Webflow match `git rev-parse HEAD`?
- Has the CDN cache been busted (new commit pushed)?
- Is the script 404-ing silently?

---

## Output Format
At the end of each debug session, produce a short block:
```
## Debug Summary
**Error:** [original error message]
**Root cause:** [confirmed hypothesis]
**Fix applied:** [what changed and why]
**Confirmed:** [how you verified it's resolved]
**Gotcha added to CLAUDE.md:** [yes / no — and the entry if yes]
```
