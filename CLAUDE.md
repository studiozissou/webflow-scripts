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

## Financial and personal data — THIS REPO IS PUBLIC
`studiozissou/webflow-scripts` is a public GitHub repo. Anything committed is world-readable
and stays in the history even after deletion.

- IMPORTANT: NEVER commit accounting, tax, banking or payroll material. This includes
  Belastingdienst correspondence, aanslagen, bezwaren, suppleties, BTW/VPB/IB returns,
  jaarrekeningen, bank statements, Moneybird exports, payslips, and invoices carrying
  bank details.
- IMPORTANT: NEVER commit personal identifiers — IBANs, BSN, mortgage or loan numbers,
  account balances, salary figures, home address, or share links to private Drive/Dropbox
  folders.
- IMPORTANT: Redact IBANs from proposals and invoices before committing. Write
  `[IBAN supplied on the invoice]` and keep the real number out of the repo.
- Financial and personal admin lives in `~/Documents/Studio Zissou/`, never in this repo.
  If asked to write such a file, save it there instead and say where it went.
- The `.gitignore` accounting block is a backstop for obvious filenames only. It will not
  catch a sensitive figure pasted into a spec, a proposal, or a research note — check the
  content, not just the path.

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
