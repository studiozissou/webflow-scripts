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

## Code Style
- `const` over `let`; arrow functions; destructuring
- Named exports only (no default exports in shared/)
- Self-documenting names — avoid abbreviations
- Clean up event listeners, ScrollTrigger instances, and timelines on page transitions
- No `console.log` in committed code (use `DEBUG && console.log(...)` pattern)

## Do Not
- Never use `document.write`
- Never inline `<script>` with untrusted content
- Never commit `.env` files or API keys
- Never use `!important` in CSS unless overriding Webflow's inline styles
