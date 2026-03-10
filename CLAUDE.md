# Webflow Scripts — Creative Dev Workspace

Monorepo of web development projects. Vanilla JS, no build step, CDN-loaded deps.

## Stack2
- No jQuery, no Webpack, no TypeScript unless project-specific
- Use the `client-first` skill for class naming; fall back to BEM if Client First doesn't apply

## Workflow
- IMPORTANT: Run `/plan` before any multi-file change
- IMPORTANT: After implementing ANY change, verify it works — run tests, check for errors, or use the most relevant automated check available. If no automated check exists, tell the user exactly what to test and how. Never mark work done without verification.
- IMPORTANT: Every `/plan` spec MUST include a `## Verification` section with a runnable auto-verify command (e.g. `npx playwright test tests/acceptance/<slug>.spec.js`). Plans without an automated verification step must not be approved.

## Code Style
- Named exports only (no default exports in `shared/`)2
- No `console.log` in committed code — use `DEBUG && console.log(...)` pattern
