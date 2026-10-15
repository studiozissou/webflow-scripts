# Claude Code Architecture — Webflow Scripts Monorepo

> Last updated: 2026-10-15
> Paste this into any Claude conversation to bring it up to speed on the workspace setup.

---

## Overview

Two `.claude/` directories power this workspace:

- **Root** (`/.claude/`) — monorepo-wide template: shared agents, skills, commands, settings
- **Project** (`projects/ready-hit-play-prod/.claude/`) — RHP-specific: specs, ADRs, queue, scripts, templates, extended commands

The project-level directory is a superset of root — bootstrapped by copying root, then expanded with RHP-specific tooling.

---

## Agents (8 total)

Consolidated 2026-10-14: `art-director`, `ux-researcher` and `content` merged into `design-critic` (lens argument); `perf` folded into `qa`; `pm` folded into the `/plan` skill; `convention-auditor` replaced by `/skill-doctor`. Agents are spawned by skills, not by hand: `/build` runs `code-writer`, `refactor` and three `code-reviewer`s on every build, and the spec's `agents:` frontmatter (written by `/plan`) routes the specialists as a second review wave. Models use aliases (`sonnet`, `opus`); `code-reviewer`, `qa`, `seo` and `design-critic` keep project-scoped memory.

| Agent | Purpose | Key tools |
|-------|---------|-----------|
| `code-writer` | New JS/CSS — animations, Barba transitions, GSAP, Lenis, Finsweet. Preloads gsap-scrolltrigger, barba-js and client-first skills. | Read, Write, Edit, Bash, Glob, Grep |
| `code-reviewer` | Review code for pattern violations, Webflow gotchas, a11y, Barba lifecycle, selector validity, spacing compliance. Read-only — PASS/WARN/FAIL verdict. | Read, Glob, Grep, Bash, Webflow MCP snapshot/style |
| `refactor` | Behaviour-preserving JS/CSS improvement | Read, Write, Edit, Bash, Glob, Grep |
| `qa` | Cross-browser, animation regression, a11y, CMS edge cases, Barba integrity, performance budgets, Lighthouse | Read, Glob, Grep, Bash, WebFetch, Chrome DevTools lighthouse + trace |
| `seo` | Meta tags, structured data, Core Web Vitals, Open Graph, keyword research, position tracking, site audits. Preloads ai-search-aeo. | Read, Glob, Grep, WebFetch, WebSearch, SEMRush MCP |
| `architect` | Structural decisions, module org, ADR authoring | Read, Write, Glob, Grep, WebSearch |
| `design-critic` | UX heuristics and flows, motion/typography/spacing critique, creative dev suggestions, brand voice and copy, AEO structure. Lens: ux, visual, copy or all. Preloads ai-search-aeo. | Read, Write, Glob, Grep, WebFetch, WebSearch, Figma MCP |
| `schema` | JSON-LD generation (12 types), validation, Webflow placement | Read, Write, Glob, Grep, WebSearch |

---

## Commands (slash commands)

### Core workflow
| Command | What it does |
|---------|-------------|
| `/plan` | Skill at `skills/plan/`. Size gate (Small skips approach exploration) → parallel research agents → pm-questioning → approach exploration (Medium/Large) → spec with `agents:` routing, verify loop and three-tier test plan → acceptance tests + registry. `--auto` (or a background job) takes recommended options and records them under Assumptions instead of asking. |
| `/build` | Skill at `skills/build/`. Spec + verify-loop gate → test inventory → selector/spacing checks → fresh-context `code-writer` executor(s) (when the spec's Execution note names two or more file groups, each executor runs in its own git worktree and is integrated by patch into the parent tree before `refactor`) → `refactor` → wave 1: three parallel `code-reviewer`s → wave 2: the spec's `agents:` specialists → `/qa-check` → browser-MCP verify loop (project-aware dev override from the project CLAUDE.md) → manual checklist. Review runs in the parent context because subagents cannot spawn agents. |
| `/debug` | Pre-flight diagnostics → isolate/hypothesise/instrument/test/fix/confirm loop → debug log. |
| `/status` | Root: full overview (git, specs, ADRs, logs). Project: compact queue table. |
| `/qa-check` | Checklist: no console errors, mobile, reduced-motion, Barba cleanup, CLS, keyboard access, Playwright. |
| `/architect` | Problem → architect agent → ADR to `adrs/` → update specs/tasks. |

### Setup workflow
| Command | What it does |
|---------|-------------|
| `client-onboarding` skill | "new client" / "onboard" / "kick off": brief, private folder, template copy, owner inputs, Gate 0 status |
| `/client-brief` | Client context questions → writes `client.md` from template |
| `/figma-audit` | Figma extraction → tokens, reference images, interaction specs, flags |
| `/component-plan` | Component identification, flag resolution, sign-off → inventory |
| `/arch-review` | Architect reviews full inventory for systemic risks → risk report |
| `/webflow-connect` | Connect Webflow, rename vars to kebab-case, create new vars from tokens |
| `/dev-queue` | Generate `queue.json` and `CLAUDE.md` from approved inventory |
| `/style-guide` | Extend existing Webflow template style guide page with project tokens |
| `/intake` | Existing site audit — read-only, captures context + runs automated checks |

### Commercial workflow
| Command | What it does |
|---------|-------------|
| `/estimate` | Pricing estimate from intake or setup data |
| `/proposal` | Client-facing proposal from approved estimate |
| `/scope-check` | In/out of scope verdict with pricing (read-only) |

### Scaffolding & generation
| Command | What it does |
|---------|-------------|
| `client-onboarding --animated` | Adds the GSAP/Barba/Lenis orchestrator and Playwright test templates to a new client project. |
| `/new-section` | Scaffold animated section module + Webflow Designer steps. |
| `/gsap-build` | GSAP animation builder with `gsap.context()` + reduced-motion guard. |
| `/generate-schema` | JSON-LD structured data with `FILL_IN` placeholders. |

### Utility
| Command | What it does |
|---------|-------------|
| `/discover` | Map codebase: file list, module map, GSAP/Barba inventory, TODOs. |
| `/audit-page` | Webflow native audit (if MCP) + all 5 review agents on one page. |
| `/audit-claude-files` | Convention auditor for .claude/ agents, commands, skills — PASS/WARN/FAIL per file. |
| `/refactor-js` | Propose → approve → Edit (not rewrite) → `/qa-check`. |
| `/local` | Python CORS server on port 8080. |
| `/sync-notion` | Push queue.json tasks to Notion dashboard. |
| `/start-plan`, `/start-build`, `/start-debug` | Pre-flight variants that read CLAUDE.md before acting. |

---

## Skills (16 reference docs)

| Skill | Coverage |
|-------|----------|
| `gsap-scrolltrigger` | CDN, 5 patterns (fade-up, pin+scrub, SplitText, parallax, counter), Barba cleanup, Lenis integration |
| `barba-js` | Webflow setup, async transitions, global hooks, namespace views, prefetch, gotchas |
| `debug` | 6-step diagnostic loop, stack-specific checks (GSAP, Barba, Webflow, Finsweet, jsDelivr) |
| `pm-questioning` | 5 essential questions, follow-up probes, red flags |
| `notion-dashboard` | DB ID, data source, property names, status mapping, client relation |
| `webflow-embeds` | Placement types, CDN loading, CMS embeds, data attributes, gotchas |
| `webflow-mcp` | Webflow MCP tools: selector verification, page audits, CMS management, Designer companion app |
| `finsweet-attrs` | v2 API, filter/load/sort/nest attributes, GSAP+MutationObserver integration |
| `lottie` | Playback, scroll-driven, hover, dynamic colour, a11y, Barba cleanup |
| `three-js` | Minimal scene, GSAP uniforms, performance, Barba cleanup |
| `webgl-shaders` | ShaderMaterial, noise distortion, image transitions, RGB split |
| `howler-js` | AudioManager, spatial audio, autoplay policy, Barba cleanup |
| `rive` | State machines, scroll-driven, text runs, a11y |
| `pixi-js` | v8 async init, filters, GSAP PixiPlugin, particles |
| `p5-js` | Instance mode, particles, ScrollTrigger integration, WebGL |
| `parallelisation` | Gate prompt, estimation reference, decision framework for multi-agent fan-out |
| `playwright-webflow` | Timing reference table for Webflow staging (project-level only) |

---

## Settings & Hooks

**PostToolUse hook:** Prettier auto-formats any `.js/.ts/.css/.json` file after Write/Edit.
**Stop hook:** Appends `[timestamp] session-end` to `logs/sessions.log`.
**MCP permissions:** Webflow read operations (list, get, snapshot, styles) auto-allowed. Write operations (create, update, delete, publish, element_builder, asset) always prompt.

---

## Work Tracking

### Queue (`queue.json`)
- Source of truth for all tasks
- Statuses: `Triage → Ready to Plan → Planning → Ready to Build → Building → Ready to Review → Done`
- Side tracks: `Needs Debug → Debugging`, `Blocked`
- Human gates: Triage→Ready to Plan, Planning→Ready to Build, Ready to Review→Done
- Syncs to Notion via `/sync-notion`

### Specs (`specs/`)
Markdown specs generated by `/plan`. Each has: acceptance criteria, tasks, dependencies.
RHP has 7 specs (dial upgrade, bg video pool, video sync, dial blur, about logo fix, video continuity, barba video survival).

### ADRs (`adrs/`)
Architecture Decision Records generated by `/architect`. Format: Context → Options → Decision → Consequences.
RHP has 2 accepted ADRs (dial state machine ownership, bg video sync strategy).

---

## Setup Workflow

New projects follow the setup phase sequence before any code is written:

```
/client-brief → /figma-audit → /component-plan → /arch-review → /webflow-connect → /dev-queue → /style-guide (optional)
```

Start with the `client-onboarding` skill; it ends with Gate 0 status and the next step. Each step has pre-flight checks that enforce ordering.

For existing sites, use `/intake` instead — captures context, audits the site read-only, and produces a prioritised report.

See `claude-code-project-setup.md` for full workflow documentation (§4, §11–13).

---

## Project-Level Extras (RHP)

### Scripts
- `purge-cdn.sh` — Purges changed JS/CSS files from jsDelivr after push. Diffs `HEAD~1`, POSTs purge for each file, waits 30s for edge propagation.

### Templates
- `acceptance-test.spec.js` — Playwright template: element visibility, CSS class checks, CMS filtering, console error detection, reduced-motion, Barba transitions, responsive behaviour.

---

## Directory Structure

```
.claude/
├── agents/           # 8 agent configs (code-writer, code-reviewer, refactor, qa, seo, architect, design-critic, schema)
├── commands/         # 25 slash command .md files
├── skills/           # 20 skills in subdirectories (skill-name/SKILL.md)
├── reference/        # rate-card.md, about-me.md (singleton config files)
├── templates/        # client.md, acceptance-test.spec.js
├── adrs/             # Architecture Decision Records
├── specs/            # Feature specs from /plan
├── logs/             # sessions.log + debug logs
├── research/         # Audit outputs
├── briefs/           # Project briefs
├── schema/           # JSON-LD outputs
├── scripts/          # purge-cdn.sh (project-level)
├── settings.json     # Prettier hook + session logger + MCP permissions
├── settings.local.json # Approved permissions (gitignored)
├── claude-code-architecture.md   # This file
├── claude-code-project-setup.md  # Setup guide (§4, §11–13)
└── queue.json        # Task queue (source of truth)
```

---

## taches-cc-resources Plugin (Global)

The [glittercowboy/taches-cc-resources](https://github.com/glittercowboy/taches-cc-resources) plugin is installed globally (`~/.claude/`). It provides creator tools, auditors, thinking frameworks, and meta-prompting workflows.

**Safe to use on this project:**
- `/create-hook`, `/create-subagent`, `/create-slash-command`, `/create-agent-skill`, `/create-meta-prompt` — guided creation tools
- `/audit-slash-command` — useful for checking command structure

**Also safe on this project:**
- `/audit-skill`, `/audit-subagent` — our skills now use YAML frontmatter + pure XML body format, matching the official best practices
- `/heal-skill` — can be used to fix any drift

Our project uses **YAML frontmatter + pure XML body tags** for skills (aligned with Anthropic skill-creator best practices). Use `/audit-claude-files` for project-convention compliance checks.

---

## Parallelisation Patterns

### Execution modes

| Mode | Wall time | Token cost | Use when |
|------|-----------|------------|----------|
| Sequential | sum(streams) | sum(tokens) | <3 streams, data dependencies, <30s total |
| Parallel subagents | max(streams) + 5s/agent | sum × 1.1 | 3+ independent read-only streams, >45s sequential |
| Agent Teams | max(streams) × 0.8 | sum × 2.5 | Streams need mid-task coordination |

### Agent type costs (calibrated)

| Agent type | Typical tokens | Typical wall time | Notes |
|---|---|---|---|
| Explore (read-only) | ~15k | ~10-15s | Cheapest. No writes. |
| Review (perf/seo/qa/ux/content) | ~20-30k | ~15-25s | WebFetch adds latency |
| Task (code-writer) | ~40-60k | ~30-60s | May need worktree |
| Agent Team member | ~2.5x equiv. subagent | ~0.8x wall time | Bidirectional comms |

### Commands with parallel execution

All upgraded commands reference the `parallelisation` skill and present a gate before spawning.

| Command | Streams | Speed gain | Token overhead | Risk |
|---------|---------|------------|----------------|------|
| `/audit-page` | 5 (perf, seo, qa, ux, content) | **3.2x** (80s→25s) | +1.1x | Low |
| `/plan` | Adds parallelisation map to spec (downstream value) | — | +1.0x | Low |
| `/discover all` | 1 per client directory | **3x** (45s→20s) | +1.1x | Low |
| `/qa-check` | 2 (code+a11y, animation+Barba) | **1.7x** (30s→18s) | +1.1x | Low |
| `/intake` Phase 4 | 3 (technical, SEO, content) | **1.8x** (45s→25s) | +1.1x | Medium |
| `/figma-audit` Step 2 | 3-wide batches of sections | **2.4x** (180s→75s) | +1.15x | High |

### Gate protocol

Every parallelised command follows the same pattern:
1. Complete any sequential prerequisites (MCP connections, file reads)
2. Reference `parallelisation` skill
3. Present gate table showing streams, estimates, and comparison
4. User chooses: parallel / sequential / agent team
5. Execute chosen mode
6. Merge results

### Correctly sequential commands

| Command | Reason |
|---------|--------|
| `/build` | commit → purge → test → fix — strict dependency chain |
| `/refactor` | refactor → review → test — each step depends on previous |
| `/debug` | Hypothesis testing is inherently iterative |
| `/architect` | Single-agent decision process |
| `client-onboarding`, `/new-section`, `/gsap-build` | Single-agent scaffolding |
| `/status`, `/cheatsheet`, `/local` | Trivial / instant |

### Agent Teams

Disabled (flag removed from `.claude/settings.json` on 2026-10-14: no command used teams, and with the flag on, named subagents launch as teammates at roughly 2.5x token cost). Re-enable with `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` if a command needs mid-task coordination between agents.

---

## Key Patterns

- **Setup workflow:** `client-onboarding` (runs `/client-brief`) → `/figma-audit` → `/component-plan` → `/arch-review` → `/webflow-connect` → `/dev-queue` → `/style-guide`
- **Build workflow:** `/plan` (research agents → pm-questioning → spec + acceptance tests) → `/build` (fresh executor context → commit → purge CDN → run tests) → human review
- **Complex build:** `/plan` → `/architect` → `/build` (for state, GSAP, Barba, Finsweet, shared state)
- **GSD patterns:** Research subagents in `/plan` produce informed specs; fresh executor contexts in `/build` prevent context rot across multi-component builds
- **Notion sync:** queue.json is source of truth; Notion is read-only dashboard pushed via `/sync-notion`
- **Agent delegation:** Commands orchestrate agents (e.g., `/build` calls code-writer then qa; `/audit-page` calls all 5 review agents in parallel)
- **Hooks enforce consistency:** Prettier on every file edit, session logging on every stop
- **MCP safety:** Read ops auto-allowed, write ops always prompt for approval
