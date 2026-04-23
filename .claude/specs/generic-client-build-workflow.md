# Generic Client Build Workflow

> Extracts the Carsa-specific build system into a reusable workflow any client
> can use. Each client gets a **context package** — design tokens, brand voice,
> ICP, class reference, site config — so Claude can design and build in their
> style via Webflow MCP, Figma MCP, or reference screenshots.

---

## Overview

Today the build workflow is Carsa-specific: hardcoded site ID, class reference,
component IDs in `carsa-webflow/SKILL.md`. The `/intake` command audits
existing sites but stops at reporting — it doesn't extract the design system
or capture brand context needed for building.

This spec:
1. Defines a **standardized context package** per client
2. Extends `/intake` with **Phase 6 (brand context)** and **Phase 7 (design
   system extraction)** as opt-in steps
3. Creates a **generic `/client-build`** command that reads context at runtime
4. Adds an **optional generative design phase** (from carsa-rishi-self-serve)
5. Preserves the **per-client skill override** escape hatch

---

## Goals

- Any client can be onboarded via `/intake` and immediately buildable
- `/client-build` reads context at runtime — no per-client command files needed
- Design input from any source: Figma, screenshots, existing Webflow site, or manual tokens
- Optional design phase: generative candidates, content agent, humanizer
- Per-client skill overrides for clients with complex needs (e.g. Carsa's no-embeds rule)
- Designed for Will now; extractable to a client-facing self-serve repo later
- Carsa becomes the first client migrated to the generic system

## Non-Goals

- Auto-publish to live domains (staging only, always)
- Full designpowers pipeline (discovery → brief → taste → personas)
- Teaching clients Claude Code internals
- Rewriting existing `/intake` phases — they stay as-is, new phases are additive

---

## Architecture

### Context Package — File Structure

Every client's context lives in `projects/<client>/.claude/`. Existing files
from `/intake` Phases 1-5 are preserved. New files are marked **NEW**.

```
projects/<client>/.claude/
├── client.md                    # From /intake Phase 1 (exists)
├── intake.json                  # From /intake Phase 2 (exists)
├── design/
│   ├── figma-tokens.json        # From /figma-audit or /intake Phase 7 (exists or NEW)
│   ├── section-map.md           # From /figma-audit (exists)
│   ├── references/              # Screenshots from /figma-audit or /intake Phase 7
│   ├── component-inventory.md   # From /component-plan (exists)
│   ├── arch-review.md           # From /arch-review (exists)
│   ├── interaction-specs.md     # From /figma-audit (exists)
│   └── figma-flags.md           # From /figma-audit (exists)
├── brand/                       # NEW — from /intake Phase 6
│   ├── voice.md                 # Tone of voice, writing style, do/don't
│   ├── icp.md                   # Ideal customer profile, audience segments
│   └── design-state.md          # Visual spirit, design principles, aesthetic
├── build/                       # NEW — from /intake Phase 7
│   ├── site-config.json         # Site ID, URLs, page IDs, breakpoints
│   ├── class-reference.md       # Project-specific class conventions
│   ├── design-laws.md           # Hard WCAG/accessibility rules (shared template)
│   └── workflows.md             # Build path patterns for this client
├── logs/
│   └── build-log.json           # Build history (from /client-build)
├── audits/                      # From /intake Phase 4 (exists)
├── reports/                     # From /intake Phase 5 (exists)
└── CLAUDE.md                    # Project-level instructions (from /dev-queue, exists)
```

### Design Input Sources (Phase 7 modes)

Phase 7 adapts based on what's available:

| Source | How it works | Produces |
|--------|-------------|----------|
| Existing Webflow site (via MCP) | Reads variables, styles, components from the connected site | `figma-tokens.json`, `class-reference.md`, `site-config.json`, `workflows.md` |
| Figma file (via MCP) | Runs the existing `/figma-audit` flow | `figma-tokens.json`, `section-map.md`, `references/`, `interaction-specs.md` |
| Reference screenshots | User provides URLs or files; Claude extracts tokens from images | `references/`, partial `figma-tokens.json` (colours, type) |
| Manual entry | User describes tokens; Claude writes them | `figma-tokens.json` (hand-entered values) |

Multiple sources can be combined. Existing Webflow site + Figma is the most
common: Webflow for current variables and classes, Figma for new designs.

### Per-Client Skill Overrides

If `projects/<client>/.claude/skills/<client>-webflow/SKILL.md` exists, the
`/client-build` command loads it and defers to its rules. This is how Carsa's
no-embeds rule, specific component IDs, and anti-patterns list survive.

Override resolution order:
1. Client skill (`projects/<client>/.claude/skills/`) — highest priority
2. Context package files (`projects/<client>/.claude/`) — standard
3. Generic defaults (from `/client-build` command) — fallback

### Self-Serve Extraction Path

For clients who will build autonomously (future phase):
1. Copy the context package + generic `/client-build` to a standalone repo
2. Add the generative design phase files (design-laws, frontend-design config)
3. Add client-specific CLAUDE.md with safety rails
4. Client runs `/client-build` from their own Claude Code installation

---

## `/intake` Extensions

### Phase 6 — Brand Context (opt-in)

After Phase 5 (report), ask:

> "Capture brand context for building? This lets `/client-build` design and
> write copy in the client's voice. You can skip this and add it later."

If yes, ask all of the following in a single conversational block:

1. **Voice & tone** — How does this brand talk? Formal/casual? Technical/accessible?
   Any words they always/never use? Can you give me an example sentence in their voice?
2. **ICP** — Who is the ideal customer? Demographics, pain points, buying triggers,
   objections? Are there multiple segments?
3. **Design state** — What's the visual spirit? Minimal/maximal? Playful/serious?
   Any reference sites or brands they admire? Design principles they follow?

**Outputs:**
- `brand/voice.md` — tone ladder (formal↔casual), vocabulary do/don't list,
  example sentences, content principles
- `brand/icp.md` — persona cards with demographics, goals, pain points,
  objections, messaging angles per segment
- `brand/design-state.md` — visual principles, aesthetic descriptors,
  reference URLs with annotations, colour/typography personality

Use templates from `.claude/templates/brand-context/` (voice.md, icp.md, design-state.md).

If user skips, note in `intake.json`: `"brandContext": "skipped"`.

### Phase 7 — Design System Extraction (opt-in)

After Phase 6 (or Phase 5 if 6 was skipped), ask:

> "Extract the design system for building? This pulls variables, styles, and
> components so `/client-build` can use the client's design system. You can
> skip this and run `/figma-audit` separately later."

If yes, ask which source(s):

1. **Existing Webflow site** (default if MCP is connected) — extract from the
   site already connected in Phase 2
2. **Figma file** — provide a Figma URL; runs `/figma-audit` inline
3. **Reference screenshots** — provide URLs or file paths
4. **Manual entry** — describe the design system verbally

#### Webflow extraction (primary path when MCP connected)

1. Read all variables via `variable_tool` → write to `design/figma-tokens.json`
   with `source: "webflow"` on each token
2. Read all styles via `style_tool` → write to `build/class-reference.md`
3. Read site structure (pages, CMS, components) → write to `build/site-config.json`
4. Snapshot key pages via `element_snapshot_tool` → write to `design/references/`
5. Read components via `data_components_tool` → note reusable components in
   `build/workflows.md`
6. Copy shared `design-laws.md` template → `build/design-laws.md`

#### Figma extraction

Run `/figma-audit` inline — it already writes to `design/`.
After `/figma-audit` completes, also generate `build/site-config.json` from
the connected Webflow project (if MCP available).

#### Screenshot extraction

1. Read each screenshot via Read tool (multimodal)
2. Extract: colour palette, typography (font family, sizes, weights),
   spacing patterns, border radius, shadow styles
3. Map extracted values to CF variable names
4. Write partial `figma-tokens.json` (flagged as `source: "screenshot"`)
5. Write screenshots to `design/references/`
6. Warn: "Screenshot tokens are approximate — verify during `/webflow-connect`"

If user skips Phase 7, note in `intake.json`: `"designSystem": "skipped"`.

---

## New Commands

### `/client-build` (NEW — generic version of `/carsa-build`)

The main build command. Reads context package at runtime, builds in Webflow MCP.

**Flags:**
- `--design` — enable generative design phase
- `--review` — skip to weekly review report
- `--dry-run` — plan + confirm only, no build
- `--client <slug>` — specify client (default: inferred from cwd)

**Phase 1: CONTEXT** (auto, no user input)
1. Resolve client from `--client` flag or cwd (`projects/<client>/`)
2. Read context package: `client.md`, `design/figma-tokens.json`,
   `brand/voice.md`, `brand/icp.md`, `brand/design-state.md`,
   `build/site-config.json`, `build/class-reference.md`
3. Check for client skill override at `skills/<client>-webflow/SKILL.md`
4. If override exists, load its rules (they take priority over generic defaults)
5. If any required context file is missing, list what's missing and suggest
   running `/intake` with Phases 6-7

**Phase 2: ASK** (3 Socratic questions)
1. **Where** — Which page and where on the page? (new section / replace / edit)
2. **Why** — What's the goal? (convert, inform, engage, trust)
3. **Who** — Which audience segment? (reference ICP personas from `brand/icp.md`)

**Phase 3: PLAN**
1. Read site structure via Webflow MCP (`element_snapshot_tool`)
2. Check All Components / Style Guide pages (if `site-config.json` has their IDs)
3. Present build plan: what elements will be created, which variables used,
   which classes applied
4. Wait for explicit approval

**Phase 4: DESIGN** (optional, only with `--design` flag)
1. Load `frontend-design` skill
2. Feed it: design tokens, design state, design laws, section goal (from Phase 2)
3. Generate 3 candidates on a creativity spread:
   - A: Safe (creativity 2-3) — follows existing patterns closely
   - B: Balanced (creativity 5) — extends patterns with moderate risk
   - C: Bold (creativity 8-10) — pushes boundaries
4. Load `content` agent → draft copy for each candidate using `brand/voice.md`
5. Load `humanizer` skill → de-AI the copy
6. Optionally generate concept images via `nano-banana`
7. Present candidates, ask user to pick one (or provide their own copy)

**Phase 5: BUILD**
1. Build in Webflow via MCP using the approved plan
2. Follow Client First conventions from `build/class-reference.md`
3. Use variables from `figma-tokens.json` (never hardcode hex values)
4. MCP fallback: retry once → HTML output with CF classes + manual instructions
5. Apply client skill override rules (e.g. Carsa's no-embeds)

**Phase 6: VERIFY**
1. Run verification checklist (desktop, tablet, mobile, content checks)
2. If Chrome DevTools MCP connected: contrast, touch targets, Lighthouse
3. Log result to `logs/build-log.json`

**Phase 7: REPORT**
1. Summary of what was built
2. Slack message (if Slack MCP connected) or copy-paste block
3. Link to changelog (if CMS changelog configured in `site-config.json`)

### `/client-refresh-tokens` (NEW)

Pulls current tokens from a connected Webflow site into `figma-tokens.json`.
Safe to re-run. Uses `--client` flag or cwd.

---

## Context File Schemas

### `build/site-config.json`

```json
{
  "siteId": "68348ea61096b37caacd2f95",
  "stagingUrl": "https://client-v2.webflow.io",
  "liveUrl": "https://www.client.com",
  "breakpoints": ["xxl", "xl", "large", "main", "medium", "small", "tiny"],
  "pages": {
    "home": { "id": "abc123", "slug": "/" },
    "about": { "id": "def456", "slug": "/about" }
  },
  "specialPages": {
    "styleGuide": "page-id-or-null",
    "allComponents": "page-id-or-null",
    "changelog": "page-id-or-null"
  },
  "cms": {
    "collections": ["blog-posts", "team-members"]
  },
  "constraints": {
    "noCodeEmbeds": false,
    "stagingOnly": true
  }
}
```

### `brand/voice.md`

```markdown
# Brand Voice — [Client Name]

## Tone Ladder
Formal ←——●——→ Casual
Technical ←——●——→ Accessible
Serious ←——●——→ Playful

## Vocabulary
### Always use
- [word/phrase] — [why]

### Never use
- [word/phrase] — [why]

## Example Sentences
> [example in brand voice]

## Content Principles
1. [principle]
2. [principle]
```

### `brand/icp.md`

```markdown
# Ideal Customer Profile — [Client Name]

## Segment: [Name]
- **Demographics:** [age, role, industry]
- **Goals:** [what they want]
- **Pain points:** [what frustrates them]
- **Buying triggers:** [what makes them act]
- **Objections:** [what holds them back]
- **Messaging angle:** [how to speak to them]
```

### `brand/design-state.md`

```markdown
# Design State — [Client Name]

## Visual Spirit
[2-3 sentence description of the aesthetic]

## Design Principles
1. [principle]
2. [principle]

## References
- [URL] — [what to take from it]

## Personality
- Colour: [warm/cool/neutral, vibrant/muted]
- Typography: [geometric/humanist/serif, tight/loose spacing]
- Layout: [dense/spacious, grid/organic]
- Motion: [subtle/expressive, fast/slow]
```

---

## Carsa Migration Plan

Carsa becomes the first client on the generic system:

1. Extract `carsa-webflow` skill's design tokens → `projects/carsa/.claude/design/figma-tokens.json`
2. Extract class-reference.md → `projects/carsa/.claude/build/class-reference.md`
3. Extract workflows.md → `projects/carsa/.claude/build/workflows.md`
4. Create `brand/voice.md` from existing Carsa brand knowledge
5. Create `brand/icp.md` from existing Carsa audience knowledge
6. Create `brand/design-state.md` from existing Carsa visual patterns
7. Create `build/site-config.json` from hardcoded values in `carsa-webflow/SKILL.md`
8. Create `build/design-laws.md` (shared template from `.claude/templates/`)
9. Keep `carsa-webflow/SKILL.md` as the **override skill** — strip out anything
   now in context files, keep only Carsa-specific rules (no-embeds, anti-patterns,
   component IDs)
10. Test `/client-build` against Carsa to verify parity with `/carsa-build`

---

## Updated Pipeline

```
/intake
  Phase 1: Client context     → client.md
  Phase 2: Connect + discover → intake.json
  Phase 3: Scaffold folders
  Phase 4: Automated checks   → audits/
  Phase 5: Report              → reports/
  Phase 6: Brand context       → brand/          (opt-in, NEW)
  Phase 7: Design system       → design/ + build/ (opt-in, NEW)

Then optionally:
  /figma-audit → /component-plan → /arch-review → /webflow-connect → /style-guide
  (for new builds from Figma — the full dev-setup pipeline still works)

Build loop:
  /client-build [--design] [--client <slug>]
```

`/intake` becomes the single onboarding entry point. The existing `/dev-setup`
pipeline still works for Figma-to-Webflow builds but is no longer the only path.

---

## Task Breakdown

### Stream 1 — Templates (Foundation)

| # | Task | Agent | Est. |
|---|------|-------|------|
| 1 | Create brand context templates (voice.md, icp.md, design-state.md) | code-writer | 20min |
| 2 | Create site-config.json schema template | code-writer | 10min |
| 3 | Create shared design-laws.md template | content + code-writer | 30min |

### Stream 2 — /intake Extensions

| # | Task | Agent | Blocked by |
|---|------|-------|------------|
| 4 | Add Phase 6 (brand context) to /intake | code-writer | #1 |
| 5 | Add Phase 7 (design system extraction) to /intake | code-writer | #2 |
| 6 | Update /intake scaffold (Phase 3) to include brand/ and build/ dirs | code-writer | — |

### Stream 3 — /client-build Command

| # | Task | Agent | Blocked by |
|---|------|-------|------------|
| 7 | Write /client-build command (Phases 1-3, 5-7) | code-writer | #1, #2 |
| 8 | Add optional design phase (Phase 4) to /client-build | code-writer | #7 |
| 9 | Write /client-refresh-tokens command | code-writer | — |

### Stream 4 — Existing Command Updates

| # | Task | Agent | Blocked by |
|---|------|-------|------------|
| 10 | Update /webflow-connect to also write build/site-config.json | code-writer | #2 |
| 11 | Update /style-guide to also write build/class-reference.md | code-writer | — |
| 12 | Update /dev-setup status check to reference /intake Phases 6-7 | code-writer | #4, #5 |

### Stream 5 — Carsa Migration

| # | Task | Agent | Blocked by |
|---|------|-------|------------|
| 13 | Extract Carsa context into generic format | code-writer | #1, #2, #3 |
| 14 | Slim down carsa-webflow/SKILL.md to override-only | code-writer | #13 |
| 15 | Test /client-build against Carsa for parity | qa | #7, #14 |

## Parallelisation Map

```
Stream 1 (templates)  ──────┐
Stream 2 (/intake ext) ─────┤──→ Stream 3 (/client-build) ──→ Stream 5 (Carsa)
Stream 4 (cmd updates)  ────┘
```

- **Streams 1, 4, and tasks #6, #9** can run in parallel (independent)
- **Stream 2** (#4, #5) blocked by Stream 1 (needs templates)
- **Stream 3** (#7) blocked by Stream 1 (needs templates)
- **Stream 5** blocked by Streams 1 + 3
- **Recommendation:** 2-3 parallel agents, no worktrees (all .claude/ files)

---

## Barba Impact

N/A — workflow/command architecture, not runtime code.

---

## Verify Loop

### Pass/fail criteria

1. `/intake` Phase 6 produces all 3 files in `brand/` with non-empty content
2. `/intake` Phase 7 (Webflow mode) reads variables and writes `site-config.json` + `class-reference.md`
3. `/intake` Phase 7 (screenshot mode) extracts colour tokens from provided images
4. `/client-build` loads context package, presents 3 Socratic questions, generates plan
5. `/client-build --design` triggers generative design phase with 3 candidates
6. `/client-build` with Carsa context produces equivalent output to `/carsa-build`
7. Per-client skill override is loaded when present
8. Missing context files produce a helpful error listing which `/intake` phases to run

### Tier mapping

- **Tier 1:** File existence checks, context loading, error messages (automatable if test infra added)
- **Tier 2:** N/A (no staging URL for workflow commands)
- **Tier 3 (manual):**
  - Brand voice quality — subjective
  - Design candidate quality — subjective
  - Webflow MCP build output — visual inspection in Designer
  - Carsa parity — side-by-side comparison

### Regression scope

- Existing `/carsa-build` continues working until migration verified
- Existing `/intake` Phases 1-5 unchanged
- `carsa-webflow/SKILL.md` remains loadable as an override
