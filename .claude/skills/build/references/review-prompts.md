# Review prompts

Wave 1 is one `code-reviewer` that carries every lens in a single prompt. Pass no `model` on the Agent call, so it runs on Opus from its frontmatter. It scores every issue 0–100 confidence and surfaces only issues at 80 or above; the threshold keeps the list short enough to act on.

Every prompt below, wave 1 and wave 2, ends with this reply cap, because each reply lands in the main session and is re-read on every later turn:

> Reply in at most 15 lines. First line: PASS, WARN or FAIL. Then one line per issue at 80 or above: `file:line — issue — confidence — fix`. No preamble, no praise, no restating the code or the spec.

## Wave 1 — combined prompt

Medium and Large send all three lenses. Small sends the simplicity and correctness lenses only and drops the conventions paragraph.

> Review this change through each lens below in turn. Score each issue 0–100 confidence and report only issues you are at least 80% confident about. Tag each issue with its lens.
>
> **Simplicity:** unnecessary complexity, code duplication, premature abstraction, over-engineering.
>
> **Correctness:** logic errors, off-by-one mistakes, null/undefined access, race conditions, missing error handling at system boundaries, edge cases.
>
> **Conventions:** the project CLAUDE.md guidelines, existing codebase patterns, naming conventions and architectural decisions from ADRs; console.log without a DEBUG guard, default exports in shared/, missing init/destroy lifecycle methods.
>
> Return a structured list: file, line, lens, issue, confidence, suggested fix.

## Merge rules

- One reviewer: list each issue once. When two lenses flag the same line, keep one entry with the higher confidence and both lens tags.
- **PASS**: nothing at 80 or above.
- **WARN**: issues at 80 or above, none at 95 or above. Carry the warnings into the build summary.
- **FAIL**: any issue at 95 or above. Fix those and re-run the reviewer with the same lenses. Wave 1 allows three cycles, wave 2 allows two.
- Wave 2 and the three-reviewer option have several reviewers: collect every issue from all of them, then deduplicate as above.

## Three-reviewer option

Optional, for when one reviewer misses too much: three independent reviewers find different things, at about 1.5 times the cost of one Opus reviewer (Opus is 2x Sonnet per token). Spawn one `code-reviewer` per lens, all in one message, with `model: "sonnet"` on each Agent call. Each prompt ends with the reply cap. Merge with the rules above.

### Reviewer A — Simplicity and DRY

> Review for unnecessary complexity, code duplication, premature abstraction, and over-engineering. Score each issue 0–100 confidence. Only report issues you are at least 80% confident about. Return a structured list: file, line, issue, confidence, suggested fix.

### Reviewer B — Bugs and correctness

> Review for logic errors, off-by-one mistakes, null/undefined access, race conditions, missing error handling at system boundaries, and edge cases. Score each issue 0–100 confidence. Only report issues you are at least 80% confident about. Return a structured list: file, line, issue, confidence, suggested fix.

### Reviewer C — Conventions and patterns

> Review against the project CLAUDE.md guidelines, existing codebase patterns, naming conventions, and architectural decisions from ADRs. Check for console.log without a DEBUG guard, default exports in shared/, and missing init/destroy lifecycle methods. Score each issue 0–100 confidence. Only report issues you are at least 80% confident about. Return a structured list: file, line, issue, confidence, suggested fix.

## Wave 2 prompt shape

Specialist agents from the spec's `agents:` field receive:

> Review this change as the {agent} agent, {lens} lens. Spec: {path}. Diff: {files}. Return PASS / WARN / FAIL with each issue scored 0–100 confidence; surface only issues at 80 or above. Structured list: file, line, issue, confidence, suggested fix.
