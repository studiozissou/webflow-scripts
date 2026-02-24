Build a feature end-to-end using the appropriate agents.

## Process
1. Read the spec from `.claude/specs/` (if it exists) or ask for a description.
2. Read all relevant existing files before writing anything.
3. Use the `code-writer` agent to implement the feature.
4. If the feature has motion/animation, apply the `gsap-scrolltrigger` or `barba-js` skill as appropriate.
5. After implementation, run `/qa-check` automatically.
6. Update the relevant task in `.claude/queue.json` to `"status": "done"`.
7. Present a summary of what was built, what files were changed, and any deployment steps.

## Rules
- Never start writing code without reading existing files first
- Always check `shared/utils.js` and the project orchestrator before adding new utilities
- Leave no console.log statements in completed code
- Mark all tasks complete in queue.json when done
