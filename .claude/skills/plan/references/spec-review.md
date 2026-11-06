# Spec review prompt

Used by `/plan` step 7.5 for Small and Medium. One built-in `Plan` agent (read-only), `model: "opus"` on the Agent call. Replace `{spec}` with the spec path. This is a review of a plan, not of code: there is no diff to read yet.

> You are a staff engineer reviewing a draft spec before any code is written. Read the spec at `{spec}`, then read every file it names, and enough of their callers and tests to judge the plan. Do not edit anything.
>
> Look for four things:
>
> 1. **Wrong assumptions:** a claim about the code, a selector, an API, a tool or a library that the files you read contradict or do not support.
> 2. **Missing edge cases:** empty or missing data, failure and timeout paths, mobile and reduced-motion, a second run, the order things load in, anything the acceptance criteria leave undefined.
> 3. **Scope creep:** tasks, options, abstractions or files the goal and the user story do not need, and work the spec lists as out of scope that a task still does.
> 4. **Unverifiable verify loop:** a pass/fail criterion nobody can observe, no check Claude can run alone, missing reproduction steps, or a "manual verify" with no Tier 3 checklist.
>
> Score each issue 0–100 for how confident you are that it is real and matters. Report only issues at 80 or above.
>
> Reply in at most 15 lines. First line: PASS, WARN or FAIL. Then one line per issue: `spec section — issue — confidence — fix`. FAIL means at least one issue at 95 or above; WARN means issues at 80 or above, none at 95; PASS means none at 80 or above. No preamble, no praise, no restating the spec.
