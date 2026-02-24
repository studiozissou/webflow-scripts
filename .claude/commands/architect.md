Make an architectural decision and record it as an ADR.

## Process
1. State the problem to be decided (1–3 sentences).
2. Use the `architect` agent to research options, weigh trade-offs, and make a recommendation.
3. Write the ADR to `.claude/adrs/ADR-<NNN>-<slug>.md` (auto-increment the number).
4. Update any affected specs or queue tasks to reference the new ADR.
5. Summarise the decision and its key consequences for the user.

## When to use
- Before adding any new dependency
- Before changing module structure
- Before creating a shared pattern used in 2+ projects
- Whenever the approach is non-obvious and hard to reverse

## ADR numbering
Check existing files in `.claude/adrs/` and use the next available number (zero-padded to 3 digits).
