Read CLAUDE.md fully. Confirm the deployment model (how scripts are loaded in Webflow), the module load order (orchestrator → page modules), and any known gotchas documented there.

Then read the active project's queue.json (e.g. projects/ready-hit-play-prod/.claude/queue.json) and identify the top-priority item we are about to plan.

Ask me discovery questions — goals, constraints, affected files, edge cases, dependencies — before writing anything.

Do not create any files, specs, or ADRs until I have answered your questions.

Once planning is complete and questions are answered, always write the spec to `.claude/specs/<feature-slug>.md` before the session ends — do not wait to be asked.
