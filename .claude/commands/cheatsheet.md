Print the command cheatsheet below exactly as written. Do not run any tools or do any work — just output the table.

---

## Command Cheatsheet

### New Build — Setup Phase

Run each in its own session, reviewing output before the next.

| # | Command | What it does |
|---|---------|-------------|
| 0 | `/dev-setup` | See where you are (all X on a fresh project) |
| 1 | `/client-brief` | Load client context and write client.md |
| 2 | `/figma-audit` | Extract and analyse a Figma design for implementation |
| 3 | `/component-plan` | Identify components and get sign-off (blocking) |
| 4 | `/arch-review` | Pre-build architecture review (blocking) |
| 5 | `/webflow-connect` | Webflow connection and variable setup |
| 6 | `/dev-queue` | Generate queue.json and CLAUDE.md for the project |
| 7 | `/style-guide` | Extend or review the template style guide (optional) |

Check `/dev-setup` at the start of any session to see current status.

### Commercial

| # | Command | What it does |
|---|---------|-------------|
| 1 | `/estimate` | Generate a pricing estimate from intake or setup data |
| 2 | `/proposal` | Generate a client-facing proposal from approved estimate |
| — | `/scope-check` | Check if a feature is in/out of scope (query tool) |

### New Build — Build Phase

Once `/dev-queue` is done, the project is ready.

| Flow | Commands |
|------|----------|
| Simple | `/plan [slug]` (research agents → questions → spec) then `/build [slug]` (fresh executor → verify) |
| Complex | `/plan [slug]` then `/architect [slug]` then `/build [slug]` |

Complex = state, GSAP, Barba hooks, Finsweet, or shared state. When in doubt, start simple.

### Inheriting a Site + Rebuilding from Figma

| # | Command | What it does |
|---|---------|-------------|
| 1 | `/intake` | Audit the existing site, capture client.md |
| 2 | `/figma-audit` | Then pick up the new build sequence from here |
| 3+ | `/component-plan` | Continue setup phase steps 3-7 above |

`/client-brief` is skipped — `/intake` already wrote client.md.

### Building

| Command | What it does |
|---------|-------------|
| `/gsap-build` | Build a GSAP animation — timeline, ScrollTrigger, SplitText, or choreography |
| `/new-section` | Scaffold a new animated section for a Webflow page |
| `/refactor` | Plan-first refactor with code review + test loop (Opus refactors, Sonnet reviews) |
| `/generate-schema` | Generate JSON-LD structured data for a Webflow page or site |
| `/bootstrap` | Bootstrap a new Webflow project in this monorepo |

### Auditing

| Command | What it does |
|---------|-------------|
| `/audit-page` | Run a comprehensive audit of a specific Webflow page |
| `/discover` | Explore and map the codebase for a client or the whole monorepo |
| `/qa-check` | Run a QA checklist on a feature or file |
| `/status` | Show current task status from queue.json |
| `/webflow-mcp` | Use Webflow MCP tools to read site structure and manage CMS |

### Dev Utilities

| Command | What it does |
|---------|-------------|
| `/local` | Start a local Python HTTP server with CORS on port 8080 |
| `/debug` | Debug a specific issue |
| `/deploy` | Commit all changes and push to remote |
| `/start-build` | Read CLAUDE.md and prepare for a build session |
| `/start-plan` | Read CLAUDE.md and prepare for a planning session |
| `/start-debug` | Read CLAUDE.md and prepare for a debug session |
| `/sync-notion` | Sync tasks with Notion |
| `/audit-claude-files` | Audit .claude/ agents, commands, skills for convention compliance |
| `/cheatsheet` | Show this cheatsheet |

### Task Status Lifecycle

```
Triage → Ready to Plan → Planning → Ready to Build → Building → Ready to Review → Done
```

| Status | Meaning |
|--------|---------|
| Triage | New task, not yet scoped |
| Ready to Plan | Triaged and approved — needs a spec |
| Planning | Spec being written (`/plan`) |
| Ready to Build | Spec approved — can start coding |
| Building | Code in progress (`/build`) |
| Ready to Review | Built — awaiting human sign-off |
| Done | Signed off and shipped |

Side tracks:

| Status | When |
|--------|------|
| Needs Debug | Something broke — needs investigation |
| Debugging | Actively debugging (`/debug`), rejoins at Ready to Review |
| Blocked | Waiting on external dependency, returns to previous status when unblocked |

Human gates: Triage to Ready to Plan (triage), Planning to Ready to Build (spec approval), Ready to Review to Done (final sign-off).
