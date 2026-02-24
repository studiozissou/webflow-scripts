Refactor a JavaScript file — improve structure without changing behaviour.

## Usage
Provide the file path: `refactor-js projects/<client>/orchestrator.js`

## Steps
1. Read the full file.
2. Use the `refactor` agent to analyse and propose changes.
3. Present the issues found and proposed fixes before making any changes.
4. Wait for approval before editing the file.
5. Apply changes using Edit (prefer targeted edits over full rewrites).
6. Run `/qa-check` after the refactor to verify nothing broke.

## Common refactor targets in this codebase
- Large orchestrators doing too many things → extract page modules
- Repeated DOM queries → cache in `const` at module scope
- Callback chains → async/await
- Inline animation timelines → named timeline functions
- Missing `destroy()` / cleanup on Barba transitions
- `var` declarations → `const` / `let`
- Magic numbers → named constants
