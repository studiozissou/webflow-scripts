# Claude Code Architecture — Webflow Scripts Monorepo

> Last updated: 2026-03-04
> Paste this into any Claude conversation to bring it up to speed on the workspace setup.

---

## Overview

Two `.claude/` directories power this workspace:

- **Root** (`/.claude/`) — monorepo-wide template: shared agents, skills, commands, settings
- **Project** (`projects/ready-hit-play-prod/.claude/`) — RHP-specific: specs, ADRs, queue, scripts, templates, extended commands

The project-level directory is a superset of root — bootstrapped by copying root, then expanded with RHP-specific tooling.

---

## Agents (11 total, all `claude-sonnet-4-6`)

| Agent | Purpose | Key tools |
|-------|---------|-----------|
| `code-writer` | New JS/CSS — animations, Barba transitions, GSAP, Lenis, Finsweet | Read, Write, Edit, Bash, Glob, Grep |
| `refactor` | Behaviour-preserving JS/CSS improvement | Read, Write, Edit, Bash, Glob, Grep |
| `qa` | Cross-browser, animation regression, a11y, CMS edge cases, Barba integrity | Read, Glob, Grep, Bash |
| `perf` | Script weight, frame budgets, memory leaks, CDN strategy | Read, Glob, Grep, Bash, WebFetch |
| `seo` | Meta tags, structured data, Core Web Vitals, Open Graph | Read, Glob, Grep, WebFetch, WebSearch |
| `architect` | Structural decisions, module org, ADR authoring | Read, Write, Glob, Grep, WebSearch |
| `pm` | Specs, task breakdown, queue.json, briefs, questioning | Read, Write, Edit, Glob |
| `content` | Copy review/generation, microcopy, aria-labels, alt text | Read, Glob, Grep |
| `art-director` | Motion design critique, typography, spacing, Figma→Webflow | Read, Glob, Grep, WebFetch |
| `ux-researcher` | Heuristic eval, user flows, competitor analysis, a11y (UX lens) | Read, Write, Glob, WebFetch, WebSearch |
| `schema` | JSON-LD generation (12 types), validation, Webflow placement | Read, Write, Glob, Grep, WebSearch |

---

## Commands (slash commands)

### Core workflow
| Command | What it does |
|---------|-------------|
| `/plan` | Plan-before-code: pm-questioning → spec to `specs/` → tasks to `queue.json` → agents list. Project version also generates Playwright acceptance tests. |
| `/build` | Read spec → code-writer → `/qa-check` → update queue. Project version adds: commit → purge CDN → acceptance tests → retry loop (up to 8x) → smoke + a11y suites. |
| `/debug` | Pre-flight diagnostics → isolate/hypothesise/instrument/test/fix/confirm loop → debug log. |
| `/status` | Root: full overview (git, specs, ADRs, logs). Project: compact queue table. |
| `/qa-check` | Checklist: no console errors, mobile, reduced-motion, Barba cleanup, CLS, keyboard access, Playwright. |
| `/architect` | Problem → architect agent → ADR to `adrs/` → update specs/tasks. |

### Scaffolding & generation
| Command | What it does |
|---------|-------------|
| `/bootstrap` | Scaffold new client project with orchestrator.js template. |
| `/new-section` | Scaffold animated section module + Webflow Designer steps. |
| `/gsap-build` | GSAP animation builder with `gsap.context()` + reduced-motion guard. |
| `/generate-schema` | JSON-LD structured data with `FILL_IN` placeholders. |

### Utility
| Command | What it does |
|---------|-------------|
| `/discover` | Map codebase: file list, module map, GSAP/Barba inventory, TODOs. |
| `/audit-page` | All 5 review agents (perf, seo, qa, ux-researcher, content) on one page. |
| `/refactor-js` | Propose → approve → Edit (not rewrite) → `/qa-check`. |
| `/local` | Python CORS server on port 8080. |
| `/sync-notion` | Push queue.json tasks to Notion dashboard. |
| `/start-plan`, `/start-build`, `/start-debug` | Pre-flight variants that read CLAUDE.md before acting. |

---

## Skills (14 reference docs)

| Skill | Coverage |
|-------|----------|
| `gsap-scrolltrigger` | CDN, 5 patterns (fade-up, pin+scrub, SplitText, parallax, counter), Barba cleanup, Lenis integration |
| `barba-js` | Webflow setup, async transitions, global hooks, namespace views, prefetch, gotchas |
| `debug` | 6-step diagnostic loop, stack-specific checks (GSAP, Barba, Webflow, Finsweet, jsDelivr) |
| `pm-questioning` | 5 essential questions, follow-up probes, red flags |
| `notion-dashboard` | DB ID, data source, property names, status mapping, client relation |
| `webflow-embeds` | Placement types, CDN loading, CMS embeds, data attributes, gotchas |
| `finsweet-attrs` | v2 API, filter/load/sort/nest attributes, GSAP+MutationObserver integration |
| `lottie` | Playback, scroll-driven, hover, dynamic colour, a11y, Barba cleanup |
| `three-js` | Minimal scene, GSAP uniforms, performance, Barba cleanup |
| `webgl-shaders` | ShaderMaterial, noise distortion, image transitions, RGB split |
| `howler-js` | AudioManager, spatial audio, autoplay policy, Barba cleanup |
| `rive` | State machines, scroll-driven, text runs, a11y |
| `pixi-js` | v8 async init, filters, GSAP PixiPlugin, particles |
| `p5-js` | Instance mode, particles, ScrollTrigger integration, WebGL |
| `playwright-webflow` | Timing reference table for Webflow staging (project-level only) |

---

## Settings & Hooks

**PostToolUse hook:** Prettier auto-formats any `.js/.ts/.css/.json` file after Write/Edit.
**Stop hook:** Appends `[timestamp] session-end` to `logs/sessions.log`.

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

## Project-Level Extras (RHP)

### Scripts
- `purge-cdn.sh` — Purges changed JS/CSS files from jsDelivr after push. Diffs `HEAD~1`, POSTs purge for each file, waits 30s for edge propagation.

### Templates
- `acceptance-test.spec.js` — Playwright template: element visibility, CSS class checks, CMS filtering, console error detection, reduced-motion, Barba transitions, responsive behaviour.

---

## Directory Structure

```
.claude/
├── agents/           # 11 agent configs (code-writer, qa, architect, pm, etc.)
├── commands/         # 13+ slash command .md files
├── skills/           # 14 reference doc .md files
├── adrs/             # Architecture Decision Records
├── specs/            # Feature specs from /plan
├── logs/             # sessions.log + debug logs
├── research/         # Audit outputs
├── briefs/           # Project briefs
├── schema/           # JSON-LD outputs
├── scripts/          # purge-cdn.sh (project-level)
├── templates/        # acceptance-test.spec.js (project-level)
├── settings.json     # Prettier hook + session logger
├── settings.local.json # Approved permissions (gitignored)
└── queue.json        # Task queue (source of truth)
```

---

## Key Patterns

- **Workflow:** `/plan` → spec + acceptance tests → `/build` → commit → purge CDN → run tests → `/qa-check` → human review
- **Notion sync:** queue.json is source of truth; Notion is read-only dashboard pushed via `/sync-notion`
- **Agent delegation:** Commands orchestrate agents (e.g., `/build` calls code-writer then qa; `/audit-page` calls all 5 review agents in parallel)
- **Hooks enforce consistency:** Prettier on every file edit, session logging on every stop
