# Claude Code Project Setup Guide

> Companion to `claude-code-architecture.md`. This document covers setup procedures,
> onboarding workflows, and reference tables for project folders.

---

## 3. Figma MCP Integration

One-time setup. Installed at user scope — applies to all client projects.

```bash
claude mcp add --transport http figma https://mcp.figma.com/mcp --scope user
```

Then authenticate:
1. Start a new Claude Code session
2. Run `/mcp` → select `figma` → select **Authenticate**
3. Authorise in browser → confirm "Authentication successful" in Claude Code
4. Verify with `/mcp` — figma should show as connected

Read operations (get_design_context, get_metadata, get_screenshot, get_variable_defs,
get_code_connect_map) — auto-allowed.
Write operations (generate_figma_design, generate_diagram) — always prompt for approval.
Permission rules in root `.claude/settings.json`.

No companion app required — the remote MCP server connects directly to Figma's API.

---

## 4. Webflow MCP Integration

One-time setup. Installed at user scope — applies to all client projects.

```bash
claude mcp add webflow --transport http https://mcp.webflow.com/mcp --scope user
claude mcp list          # triggers OAuth — authorise your sites
claude plugin add webflow-skills
```

Read operations (list, get, snapshot, styles) — auto-allowed.
Write operations (create, update, delete, publish) — always prompt for approval.
Permission rules in root `.claude/settings.json`.

Designer API tools require the Webflow MCP Bridge App open in Webflow Designer.
Data API tools (sites, pages, CMS, custom code) work without it.

---

## 11. Client Onboarding Workflows

### Existing site
```bash
cd projects/client-name && claude
/intake
```

### New build from Figma
```bash
cd projects/client-name && claude
/dev-setup          # check where you are
/client-brief       # client context
/figma-audit        # Figma extraction
/component-plan     # component sign-off
/arch-review        # architecture review
/webflow-connect    # connect + variables
/dev-queue          # queue + CLAUDE.md
/style-guide        # optional
```

Run each in a separate session. Check `/dev-setup` status at the start of any session
to see where you are.

### Existing site + new build
Run `/intake` first. `/client-brief` detects existing `client.md` and skips questions.

---

## 12. /plan vs /architect

**`/plan`** — runs the `pm` agent. Asks discovery questions, writes a spec.
Focused on *what* to build and *why*. Output: `specs/slug.md`.

**`/architect`** — runs the `architect` agent. Takes an approved spec, makes structural
decisions, writes an ADR. Focused on *how* to build it. Output: `adrs/slug.md`.

### Per-component build flow

```
Simple:   /plan [slug] → /build [slug]
Complex:  /plan [slug] → /architect [slug] → /build [slug]
```

**Use complex flow when the component involves:**
- State management
- GSAP context and ScrollTrigger
- Barba.js lifecycle hooks
- Finsweet attributes
- Shared state across modules
- Non-trivial CMS relationships

When in doubt, use the simple flow — `/architect` can always be run later if the
build session uncovers unexpected complexity.

---

## 13. Project Folder Contents Reference

| File | Created by | Purpose |
|---|---|---|
| `CLAUDE.md` | `/bootstrap` or `/dev-queue` | Project memory — read at every session start |
| `.claude/client.md` | `/intake` or `/client-brief` | Client brief and contacts |
| `.claude/intake.json` | `/intake` | Machine-readable audit findings |
| `.claude/queue.json` | `/dev-queue` | Task queue — source of truth |
| `.claude/design/figma-tokens.json` | `/figma-audit`, updated by `/webflow-connect` | Tokens with Webflow variable IDs |
| `.claude/design/component-inventory.md` | `/component-plan` | Signed-off component list with build order and complexity |
| `.claude/design/arch-review.md` | `/arch-review` | Architecture risk report — signed off before build |
| `.claude/design/interaction-specs.md` | `/figma-audit` | Figma prototype notes and auto-layout reference values |
| `.claude/design/figma-flags.md` | `/figma-audit` | Ambiguity flags — all resolved by end of `/component-plan` |
| `.claude/design/design-decisions.md` | `/component-plan`, `/webflow-connect`, ongoing | Every design decision recorded |
| `.claude/design/references/` | `/figma-audit` | Component screenshots from Figma |
| `.claude/audits/` | `/intake`, `/audit-page` | Audit outputs from Webflow skills and agents |
| `.claude/reports/` | `/intake` | Client-facing reports |
| `.claude/specs/` | `/plan` | One spec per queue item |
| `.claude/adrs/` | `/architect`, `/arch-review` | Architectural decision records |
| `.claude/templates/` | Root template | Blank templates |
| `.claude/logs/` | Hooks (gitignored) | Session logs |
