# Webflow Scripts — Creative Dev Workspace

## Project Overview
Monorepo of custom JavaScript/CSS for Webflow production sites. Vanilla JS, no build step, CDN-loaded deps.

## Structure
- `projects/<client>/` — per-client scripts (orchestrator.js + page modules)
- `shared/` — cross-project utilities (barba-core.js, lenis.js, utils.js)
- `styles/` — shared CSS
- `.claude/` — agents, commands, skills, specs, ADRs, research, briefs, schema

## Active Clients
- `ready-hit-play` / `ready-hit-play-prod` — RHP creative agency (prod)
- `studio-zissou` — Zissou studio
- `carsa` — Carsa automotive

## Stack Conventions
- ES2022+ vanilla JS — no jQuery, no Webpack, no TypeScript unless project-specific
- GSAP (gsap, ScrollTrigger, SplitText) for all animation
- Barba.js for page transitions — always clean up GSAP contexts on `barba.hooks.leave`
- Lenis for smooth scroll — pause/resume on Barba transitions
- Finsweet Attributes (`fs-`) for CMS filtering, tabs, accordion
- CSS custom properties for all tokens; BEM-adjacent class naming
- Animate on `DOMContentLoaded`; always respect `prefers-reduced-motion`
- Scripts deployed via Webflow Custom Code or Webflow Embeds

## Entry Points
Every project has `orchestrator.js` as the single entry. Page-specific modules are imported or lazy-loaded from there.

## Workflow
- Run `/plan` before any multi-file change
- Run `/architect` for structural decisions → writes ADR to `.claude/adrs/`
- Run `/qa-check` before marking any feature done
- Run `/audit-page` when reviewing an existing page for performance or accessibility
- Agent outputs and session logs go to `.claude/logs/`

## Task statuses

Tasks in queue.json use these statuses:
Triage → Ready to Plan → Planning → Ready to Build → Building → Ready to Review → Done

Side tracks: Needs Debug → Debugging (rejoin at Ready to Review)
             Blocked (from any status, returns to previous status when unblocked)

Human gates: Triage→Ready to Plan (triage), Planning→Ready to Build (spec approval),
Ready to Review→Done (final sign-off).

## Code Style
- `const` over `let`; arrow functions; destructuring
- Named exports only (no default exports in shared/)
- Self-documenting names — avoid abbreviations
- Clean up event listeners, ScrollTrigger instances, and timelines on page transitions
- No `console.log` in committed code (use `DEBUG && console.log(...)` pattern)

## Webflow Clipboard Tool

Generate Webflow-native elements from text descriptions and paste them into the Designer.

### Setup
1. Add Chrome alias to `~/.zshrc`:
   ```bash
   alias chrome='/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-webflow-dev'
   ```
2. `npm install` at repo root (installs `@anthropic-ai/sdk` + `playwright`)
3. Set `ANTHROPIC_API_KEY` env var

### Usage
```bash
# Generate + inject to clipboard
npm run wf-gen -- --description "hero section with heading and CTA"

# Generate only (no clipboard inject)
npm run wf-gen -- --description "pricing grid" --dry-run

# Capture samples from Designer (reverse-engineering)
node scripts/webflow/capture-clipboard.js
```

### Architecture
- `scripts/webflow/wf-gen.js` — CLI entry point
- `scripts/webflow/generate-json.js` — Anthropic API → XscpData JSON
- `scripts/webflow/validate-wf-json.js` — Schema validator
- `scripts/webflow/inject-clipboard.js` — CDP clipboard writer
- `scripts/webflow/capture-clipboard.js` — Reverse-engineering capture tool
- `.claude/skills/webflow-clipboard/` — Format reference
- `.claude/skills/webflow-clipboard-prompt/` — System prompt for generation

### Gotchas
- Chrome must be running with `--remote-debugging-port=9222` for inject/capture
- Designer clipboard uses MIME type `application/json`, not `text/plain`
- All CSS in `styleLess` must be longhand (no `margin:`, `padding:`, `border-radius:`, etc.)
- Client First utility classes don't need `styles` entries — they exist in the project
- UUIDs must be regenerated for each paste (no reuse across operations)
- ~10,000 char limit for inline clipboard JSON

## Do Not
- Never use `document.write`
- Never inline `<script>` with untrusted content
- Never commit `.env` files or API keys
- Never use `!important` in CSS unless overriding Webflow's inline styles
