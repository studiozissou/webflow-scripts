Refactor code after a feature or project build — improve structure, then verify with review and tests.

## Usage
- Single file: `/refactor projects/<client>/orchestrator.js`
- Feature scope: `/refactor projects/<client>/` — review all modules for cross-file improvements
- Slug scope: `/refactor [slug]` — refactor files touched by a specific queue item

## Process

### 0. Plan (plan mode)
Enter plan mode. Read all target files and analyse them against the refactor targets below.

- List every proposed change with file, location, and what will change
- For each change, write a plain English summary explaining *why* this improves the code (no jargon — a non-developer should be able to follow it)
- Group changes by type (extraction, cleanup, pattern unification, etc.)
- Flag any changes that are borderline behaviour changes
- Exit plan mode and wait for user approval before touching any code

### 1. Refactor (Opus)
Apply the approved changes using the `refactor` agent with `model: "opus"`.

- Apply changes using Edit (prefer targeted edits over full rewrites)
- Skip any changes the user rejected in the plan review
- Work one file at a time

### 2. Review (Sonnet)
Use the `code-reviewer` agent with `model: "sonnet"` on every file that was changed.

- Run a structured PASS / WARN / FAIL review
- If any FAIL verdicts: fix, then re-review until clean
- WARN verdicts: flag to user, proceed if acknowledged

### 3. Test
Run the project's test suite to verify nothing broke.

- Run `npm test` from the project directory
- If tests fail: fix the regression, return to step 2
- If no test suite exists: run `/qa-check` on the changed files instead

Repeat steps 2-3 until review passes and tests are green.

## Common refactor targets
- Duplication across modules → extract to shared utility
- Pattern drift (same thing done differently in two places) → unify
- Dead code from iteration → remove
- Large orchestrators doing too many things → extract page modules
- Repeated DOM queries → cache in `const` at module scope
- Callback chains → async/await
- Inline animation timelines → named timeline functions
- Missing `destroy()` / cleanup on Barba transitions
- Magic numbers → named constants

## Rules
- Do not change behaviour — refactoring only
- Do not add features, comments, or type annotations to unchanged code
- Preserve the IIFE + `window.RHP` module pattern
- Every edit must pass the review + test loop before moving to the next file
