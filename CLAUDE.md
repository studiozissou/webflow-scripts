# Webflow Scripts — Creative Dev Workspace

Monorepo of web development projects. Vanilla JS, no build step, CDN-loaded deps.

## Stack
- No jQuery, no Webpack, no TypeScript unless project-specific
- Use the `client-first` skill for class naming; fall back to BEM if Client First doesn't apply


## Workflow
- IMPORTANT: Run `/plan` before any multi-file change
- IMPORTANT: After implementing ANY change, verify it works — run tests, check for errors, or use the most relevant automated check available. If no automated check exists, tell the user exactly what to test and how. Never mark work done without verification.

## Queue Tasks
- Follow the `queue-tasks` skill for all queue.json formatting and Notion sync

## Client File Organisation
- IMPORTANT: All client-related docs, specs, research, comms, and assets MUST live inside
  the client's project directory: `projects/{client}/.claude/`. Never store client files in
  the top-level `.claude/` directory.
- Specs go in `projects/{client}/.claude/specs/`
- Research/screenshots go in `projects/{client}/.claude/research/`
- Slack messages go in `projects/{client}/.claude/slack/`
- Audits go in `projects/{client}/.claude/audits/`
- Reports go in `projects/{client}/.claude/reports/`
- Proposals go in `projects/{client}/.claude/proposals/`

## Code Style
- Named exports only (no default exports in `shared/`)
- No `console.log` in committed code — use `DEBUG && console.log(...)` pattern

## Project knowledge (on-demand)
Past-session knowledge, RHP gotchas, work-dial bug history, patterns, and
infrastructure notes live in `~/.claude/projects/-Users-willmorley-Library-Mobile-Documents-com-apple-CloudDocs-Projects-Webflow-Scripts-webflow-scripts/memory/MEMORY.md`.
**Do not preload.** Read it only when you need specific context (e.g. before
touching RHP's work-dial.js, when investigating a Barba issue, or when a
pattern question comes up). Auto-injection is disabled via `autoMemoryEnabled: false`.
