# Webflow Scripts — Creative Dev Workspace

Monorepo of web development projects. Vanilla JS, no build step, CDN-loaded deps.

## Stack
- No jQuery, no Webpack, no TypeScript unless project-specific
- Use the `client-first` skill for class naming; fall back to BEM if Client First doesn't apply


## Workflow
- IMPORTANT: Run `/plan` before any multi-file change
- IMPORTANT: After implementing ANY change, verify it works — run tests, check for errors, or use the most relevant automated check available. If no automated check exists, tell the user exactly what to test and how. Never mark work done without verification.
- Run `/tidy` to clear worktrees and branches already merged into main, and to pull
  the main checkout up to date. Background jobs create a worktree each and never
  remove it, so they accumulate. A weekly launchd agent
  (`scripts/tidy-worktrees.plist`) does the same automatically.

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

## Public vs internal — THIS REPO IS PUBLIC
- IMPORTANT: Only live scripts and what genuinely needs to be public are committed here.
  Client notes, specs, research, comms, proposals, estimates, audits and screenshots are internal.
- Internal files live in the private repo `studiozissou/webflow-internal`, cloned at
  `~/webflow-internal`. `projects/*/.claude` and `.claude/{specs,research,briefs,plans,screenshots,reference,triage}`
  are gitignored symlinks into it, created by `scripts/link-internal.sh`.
- Commit internal doc changes in `~/webflow-internal` (`git -C ~/webflow-internal ...`), never here.
- New client: run `scripts/link-internal.sh` after creating `projects/{client}/.claude/` — it moves
  the folder into the private repo and links it back.
- New worktrees get the links from a `post-checkout` hook (`scripts/link-internal.sh --install-hook`, once per clone).
  If a path is not a symlink, run the script before writing to it.

## Financial data
- IMPORTANT: Never commit accounting, tax, banking or payroll material, IBANs, BSN,
  balances, or private Drive links. Redact IBANs as `[IBAN supplied on the invoice]`.
- Financial admin goes in `~/Documents/Studio Zissou/`, never here.

## Code Style
- Named exports only (no default exports in `shared/`)
- No `console.log` in committed code — use `DEBUG && console.log(...)` pattern
- IMPORTANT: No inline comments in production code — one sentence at the top of
  the file, nothing else. The "why" goes in the project README.

## Project knowledge (on-demand)
Past-session knowledge, RHP gotchas, work-dial bug history, patterns, and
infrastructure notes live in `~/.claude/projects/-Users-willmorley-Library-Mobile-Documents-com-apple-CloudDocs-Projects-Webflow-Scripts-webflow-scripts/memory/MEMORY.md`.
**Do not preload.** Read it only when you need specific context (e.g. before
touching RHP's work-dial.js, when investigating a Barba issue, or when a
pattern question comes up). Auto-injection is disabled via `autoMemoryEnabled: false`.
