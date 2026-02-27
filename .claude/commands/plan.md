Plan a feature before writing any code.

## Process
1. Use the `pm-questioning` skill to ask clarifying questions. Do not skip this step.
2. Once answers are gathered, write a spec to `.claude/specs/<feature-slug>.md` using the pm agent spec format.
3. Break the feature into ordered tasks and append them to `.claude/queue.json`.
4. Identify which agents are needed for each task (code-writer, qa, seo, perf, etc.).
5. Flag any architectural decisions that need an ADR before work begins.
6. Present the plan summary to the user for approval before proceeding.

**Always write the spec file to `.claude/specs/<feature-slug>.md` before the session ends — do not wait to be asked.**

## Output
- Spec file at `.claude/specs/<feature-slug>.md`
- Updated `.claude/queue.json` with new tasks
- List of agents needed
- Any blockers or open questions
