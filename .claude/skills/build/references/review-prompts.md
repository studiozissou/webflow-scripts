# Review prompts

Three `code-reviewer` agents (`model: "sonnet"`) spawned in one message so they run concurrently. Each scores every issue 0–100 confidence and surfaces only issues at 80 or above; the threshold keeps the merged list short enough to act on.

## Reviewer A — Simplicity and DRY

> Review for unnecessary complexity, code duplication, premature abstraction, and over-engineering. Score each issue 0–100 confidence. Only report issues you are at least 80% confident about. Return a structured list: file, line, issue, confidence, suggested fix.

## Reviewer B — Bugs and correctness

> Review for logic errors, off-by-one mistakes, null/undefined access, race conditions, missing error handling at system boundaries, and edge cases. Score each issue 0–100 confidence. Only report issues you are at least 80% confident about. Return a structured list: file, line, issue, confidence, suggested fix.

## Reviewer C — Conventions and patterns

> Review against the project CLAUDE.md guidelines, existing codebase patterns, naming conventions, and architectural decisions from ADRs. Check for console.log without a DEBUG guard, default exports in shared/, and missing init/destroy lifecycle methods. Score each issue 0–100 confidence. Only report issues you are at least 80% confident about. Return a structured list: file, line, issue, confidence, suggested fix.

## Merge rules

- Collect every issue from all reviewers.
- Deduplicate: two reviewers on the same line keep the higher confidence.
- **PASS**: nothing at 80 or above.
- **WARN**: issues at 80 or above, none at 95 or above. Carry the warnings into the build summary.
- **FAIL**: any issue at 95 or above. Fix those, re-run all reviewers in the wave. Wave 1 allows three cycles, wave 2 allows two.

## Wave 2 prompt shape

Specialist agents from the spec's `agents:` field receive:

> Review this change as the {agent} agent, {lens} lens. Spec: {path}. Diff: {files}. Return PASS / WARN / FAIL with each issue scored 0–100 confidence; surface only issues at 80 or above. Structured list: file, line, issue, confidence, suggested fix.
