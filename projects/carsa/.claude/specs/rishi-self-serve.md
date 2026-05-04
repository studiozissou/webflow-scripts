# Carsa Rishi Self-Serve — Generative Build System

> Enables Rishi (Carsa CEO) to build high-quality Webflow sections via `/carsa-build`
> with minimal Will intervention. Uses Claude's `frontend-design` skill for generative
> section design, chains through the `content` agent + `humanizer` skill for brand-voiced
> copy, and commits visual concepts via `nano-banana` before any Webflow MCP writes.
> Delivered as a standalone `carsa-self-serve` GitHub repo on Rishi's Mac.
> Supersedes `carsa-webflow-skill-v2.md`.

---

## Overview

The existing `carsa-webflow` skill and `/carsa-build` command are ~40% of the v2 target. This spec closes the remaining gaps through nine surgical upgrades:

1. **Narrowed trigger** — stops skill collision with superpowers auto-invocation
2. **Split design context** — hand-authored `design-state.md` (voice, spirit) + auto-generated `design-tokens.json` (variables, colours, typography)
3. **`/carsa-refresh-tokens` helper** — pulls tokens from Carsa Webflow via MCP into `design-tokens.json`, safe to re-run
4. **Design laws reference** — ~20 hard rules extracted from designpowers (contrast, type, touch, states)
5. **3-question Socratic gate** — Where / Why / Who (replaces 5-substep planning)
6. **Generative design pipeline** — `frontend-design` → `content` agent → `humanizer` → `nano-banana` → assemble. No Relume, no component catalog, no pre-built templates.
7. **Draft copy review** — Phase 3 asks "got copy already or shall I make some?" — gives Rishi an early off-ramp when he's already written the words
8. **Chrome DevTools verify step** — TDD-lite post-build verification against live staging
9. **Webflow CMS changelog + delivery repo** — password-protected `/changelog` on carsa-v2.webflow.io, plus a dedicated `carsa-self-serve` GitHub repo installed on Rishi's Mac

No Relume. No component catalog. No worktrees. No full test suite. No debugging skill.

---

## Research Summary

**Libraries & skills evaluated:**
- **designpowers** (Owl-Listener) — 10 agents, 29 skills, inclusive design process. Extractable: `ui-composition` (WCAG 4.5:1, 16px min, 45-75ch), `responsive-patterns` (320px min, 44x44 touch, `clamp()`), `interaction-design` (all component states), `verification-before-shipping`. Full pipeline too heavy for Rishi.
- **superpowers** (obra, already installed) — 14 skills. Extractable: `brainstorming` (Socratic Q&A + hard gate), `verification-before-completion` (run → read → claim). Rest are developer tools not client-facing.
- **frontend-design** (official Anthropic plugin) — generative design reasoning skill. Takes visual brief + tokens + laws, returns a section design with rationale. Primary engine for Phase 2.
- **humanizer** (blader/humanizer, MIT, v2.5.1) — 29 AI-writing patterns across 5 categories (verbosity, hedging, em-dashes, forbidden phrases, structure). Multi-pass with voice calibration. Pinned to commit hash at install time.
- **Existing `content` agent** (`.claude/agents/content.md`) — UX writer/copywriter using Sonnet. Reuses Carsa brand voice. Already wired into the monorepo.

**Current state:**
- `.claude/skills/carsa-webflow/SKILL.md` (396 lines) — XML structure, 6-step pipeline, MCP fallback, build log, verification checklist
- `.claude/commands/carsa-build.md` (142 lines) — orchestrates plan → confirm → build → log → verify → report
- Carsa staging URL: `https://carsa-v2.webflow.io` (from `projects/carsa/.claude/intake.json`)
- Carsa live URL: `https://www.carsa.co.uk`
- Carsa project ID: `68348ea61096b37caacd2f95`

**Approach selection:**
Four approaches were explored. After iterative pivots, **Approach D — Generative with humanized copy** is the chosen path:
- Rejected component-reuse catalog (Relume, webflow-clipboard, cloned sections): adds scraping step, stale fast, class-rename friction
- Rejected pre-stocked component pantry: requires Will to catalog every Carsa section and maintain it indefinitely
- Accepted generative via `frontend-design`: Claude reasons from tokens + laws + voice every build, no cache to stale. `content` agent + `humanizer` keep copy brand-aligned. `nano-banana` preview commits Rishi to a visual before any MCP writes happen.

---

## Goals & Non-Goals

### Goals
- Rishi can build content sections (hero, CTA, text+image, testimonial, feature grid, etc.) via `/carsa-build` with 3 questions, one visual preview, and one approval gate before any build happens
- System enforces Client First, Carsa brand voice, design laws, and analytics tagging automatically
- Copy is either Rishi-provided or auto-drafted by the `content` agent and de-AI-ed by the `humanizer` skill before review
- Every build is audited in a password-protected Webflow CMS changelog AND a local JSON log (belt and braces)
- Post-build verification runs via Chrome DevTools MCP against the live Carsa staging URL (`carsa-v2.webflow.io`) — no dependency on Rishi keeping a tab open
- Delivery is a dedicated `carsa-self-serve` GitHub repo installed on Rishi's Mac, not scattered across the Will monorepo
- Will needs zero per-build intervention for simple sections
- Design drift is prevented by split design-state (hand) + design-tokens (auto-refreshed) + design laws + `frontend-design` skill reasoning

### Non-Goals
- Full designpowers pipeline (discovery → brief → taste → personas → retrospective)
- Worktrees, TDD cycles for Rishi, debugging skill
- Teaching Rishi custom JS or Client First internals
- Heavy Playwright test suite Rishi runs himself
- Relume or component-catalog reuse — system is fully generative via `frontend-design`
- Non-content changes (nav, footer, global styles, CMS schema edits) — stays with Will
- Auto-publish to live `carsa.co.uk` — staging only

---

## Architecture

### Two repos

**Repo A — Will monorepo (this repo, source of truth):** spec, skill, command, tests, tooling, `/carsa-refresh-tokens` helper live here. Will develops, tests, and dogfoods here. Never handed to Rishi directly.

**Repo B — `carsa-self-serve` (new, Rishi-facing):** dedicated GitHub repo installed on Rishi's Mac. Contains the skill + command + design-state + design-tokens + content agent + humanizer packaged as standalone Claude Code configuration. Will pushes updates; Rishi pulls.

### File layout after this spec

**Repo A (monorepo):**
```
.claude/
├── skills/carsa-webflow/
│   ├── SKILL.md                     # Modified: narrowed trigger, simplified Plan step
│   └── references/
│       ├── class-reference.md        # Unchanged
│       ├── workflows.md              # Unchanged
│       └── design-laws.md            # NEW: ~20 hard rules extracted from designpowers
├── skills/humanizer/                 # NEW: installed from blader/humanizer, pinned commit
│   └── SKILL.md + references
├── agents/
│   └── content.md                    # Unchanged — existing UX writer, reused in Phase 2
├── commands/
│   ├── carsa-build.md                # Modified: 3-question gate, generative pipeline, verify, CMS log
│   └── carsa-refresh-tokens.md       # NEW: refresh design-tokens.json from Webflow MCP
├── specs/
│   └── carsa-rishi-self-serve.md    # THIS SPEC
└── logs/
    └── carsa-build-log.json          # Existing local audit trail (belt & braces)

projects/carsa/
├── .claude/
│   ├── client.md                     # Unchanged
│   ├── intake.json                   # Modified: add changelogCollectionId field
│   ├── design-state.md               # NEW: hand-authored brand voice, spirit anchors
│   └── design-tokens.json            # NEW: auto-generated from Webflow MCP
└── (existing)

tests/
├── acceptance/
│   └── carsa-rishi-self-serve.spec.js # Created this session
└── registry.json                     # Modified this session
```

**Repo B (`carsa-self-serve` delivery repo, Rishi's Mac):**
```
carsa-self-serve/
├── .claude/
│   ├── skills/
│   │   ├── carsa-webflow/            # Copied from monorepo
│   │   └── humanizer/                # Copied from monorepo
│   ├── agents/
│   │   └── content.md                # Copied from monorepo
│   ├── commands/
│   │   ├── carsa-build.md
│   │   └── carsa-refresh-tokens.md
│   ├── design-state.md               # Hand-authored brand context
│   ├── design-tokens.json            # Auto-generated
│   ├── intake.json                   # Carsa project config
│   └── logs/
│       └── carsa-build-log.json
├── CLAUDE.md                         # Rishi-facing setup + usage doc
└── README.md                         # Install + update instructions
```

### Component responsibilities

**`carsa-webflow` skill (narrowed)**
- Role: reference guide (Client First classes, workflows, MCP patterns, anti-patterns) + translation layer that turns `frontend-design` output into Webflow MCP tool calls in Phase 4
- Trigger: narrowed to "carsa" + "/carsa-build" + Carsa site ID only — prevents collision with superpowers
- Planning phase removed (moved entirely to command)
- Still invoked automatically when Webflow MCP write tools target the Carsa site ID, as a safety net

**`frontend-design` skill (Anthropic official)**
- Role: generative design reasoning. Reads `design-state.md` + `design-tokens.json` + `design-laws.md`. Given a brief + constraints, returns a section shape (layout, semantic HTML, Client First class tree, component hierarchy, rationale).
- Invoked in Phase 2 of `/carsa-build` (DESIGN step)
- **Returns exactly 3 candidates on a creativity spread 1-10: A safe (2-3), B balanced (5), C bold (8-10).** The spread is enforced in the prompt, not left to model taste. Always-safe A reduces the risk of an all-off-brand run
- Does NOT write to Webflow — returns a design spec only

**`content` agent (existing, `.claude/agents/content.md`)**
- Role: UX writer / copywriter. Reads `design-state.md` voice block. Generates headings, body, CTAs for a designed section.
- Invoked in Phase 2 right after `frontend-design`, using the section layout as input
- Output is first-draft copy — NOT final, feeds into `humanizer`

**`humanizer` skill (blader/humanizer, pinned)**
- Role: multi-pass AI-pattern removal. Takes the `content` agent's draft and strips AI tells (hedges, em-dashes, verbosity, forbidden phrases). Calibrates against `design-state.md` voice Do/Don'ts.
- Installed in `.claude/skills/humanizer/`, pinned to a specific commit hash at install time so upstream changes can't break Rishi
- Output is polished copy ready for visual preview

**`nano-banana` skill (Google Gemini image gen, existing)**
- Role: generate a visual concept image per section candidate. Rishi sees the concept BEFORE any Webflow MCP writes — catches visual mismatches early.
- Invoked at the end of Phase 2, one concept per candidate (exactly 3 per build — one per creativity tier)
- ~£0.10/image via Gemini 2.5 Flash Image

**`design-state.md` (hand-authored, Will-maintained)**
- Role: persistent brand snapshot read on every build
- Content: brand voice Do/Don'ts, design spirit anchors (3-5 live Carsa URLs that exemplify "good Carsa"), photography rules, what Carsa never does, `lastReviewed` date
- NOT a component inventory — components are fetched dynamically via Webflow MCP
- Will writes once, refreshes ad-hoc after rebrand. ~40-60 lines.

**`design-tokens.json` (auto-generated, refreshed via helper command)**
- Role: machine-readable Carsa design tokens — variable names, hex values, typography scales, spacing scale, breakpoints
- Generated by `/carsa-refresh-tokens` which calls `variable_tool` and reads Webflow variable collections
- Safe to re-run whenever Will updates Carsa variables in Webflow Designer
- Read every build by `frontend-design` as the primitive source of truth

**`design-laws.md` reference**
- Role: ~20 non-negotiable rules read during build planning and verify
- Content: contrast ≥ 4.5:1, body ≥ 16px, touch ≥ 44x44, line length 45-75ch, button states, focus rings, semantic HTML, alt text, reduced-motion, analytics tagging
- Carved out of SKILL.md so SKILL.md stays under 500 lines

**`/carsa-build` command (rewritten flow)**
- Phase 1: ASK (3 questions — Where / Why / Who)
- Phase 2: DESIGN (generative: `frontend-design` → `content` → `humanizer` → `nano-banana` → assemble candidates)
- Phase 3: CONFIRM (Rishi picks one + answers "got copy already or shall I make some?")
- Phase 4: BUILD (Webflow MCP)
- Phase 5: PUBLISH (`carsa-v2.webflow.io` staging only, hardcoded)
- Phase 6: VERIFY (Chrome DevTools MCP)
- Phase 7: LOG (dual write — local JSON + CMS)
- Phase 8: REPORT (Slack block + CMS entry confirmation)

**`/carsa-refresh-tokens` command (new Will-only helper)**
- Will runs ad-hoc when Carsa variables change in Webflow Designer
- Calls `variable_tool > list_variable_collections` + `get_variables` to dump raw values, resolves semantic→primitive chains, writes pretty-printed JSON to `projects/carsa/.claude/design-tokens.json`
- Idempotent. Rishi never touches this.

**Webflow CMS Changelog (Will sets up once)**
- Collection: "Build Log"
- Fields: Name (title), Date, Page Modified, Section Name, Description (rich text), Screenshot (image), Builder (option: Rishi/Will/Tomek), Verified (switch), Notes (rich text)
- Template page: `/changelog` — password-protected via Webflow site password settings
- Will does this once before the command is used. Setup doc in §10.

---

## Detailed Design

### 1. Narrow `carsa-webflow` skill trigger

Current trigger (lines 3-15 of SKILL.md):
```yaml
description: >
  Guardrails, workflow, and reference... Trigger this skill whenever someone
  asks to edit, update, add to, or change anything on the Carsa website
  through Webflow... Also trigger when someone mentions "Webflow", "the website",
  "carsa.co.uk", "landing page", "VDP", "search page", "home page", or any
  request that will result in Webflow MCP tool calls...
```

New trigger (narrower):
```yaml
description: >
  Reference guide for building on the Carsa Webflow site. Trigger when the user
  mentions "carsa", "carsa.co.uk", "/carsa-build", or invokes any Webflow MCP
  tool that writes to the Carsa site (site ID 68348ea61096b37caacd2f95).
  Do NOT trigger for non-Carsa Webflow work or generic "the website" mentions.
  The command /carsa-build is the primary entry point — this skill is the
  reference and safety net.
```

Removes the broad "Webflow", "the website", "landing page" triggers that caused collision risk. Adds a hard Carsa site ID check as the unambiguous signal.

### 2. Create `design-laws.md` reference

Location: `.claude/skills/carsa-webflow/references/design-laws.md`

Content (~70 lines):

```markdown
# Carsa Design Laws

> Non-negotiable rules applied during build planning AND post-build verification.
> Extracted from designpowers (ui-composition, responsive-patterns, interaction-design).

## Colour & Contrast
1. Body text ≥ 4.5:1 contrast against background (WCAG AA)
2. Large text (≥24px / ≥18px bold) ≥ 3:1 contrast
3. Interactive elements ≥ 3:1 contrast against adjacent colours
4. Never hardcode hex — use Carsa semantic variables (`text-color-*`, `background-color-*`)

## Typography
5. Body text ≥ 16px (1rem) — never smaller
6. Line length 45-75 characters on desktop (use `max-width-medium` or tighter on text blocks)
7. Line height ≥ 1.5 for body text
8. No more than 2 typefaces per page (use `font-primary` and `font-secondary`)

## Touch & Interaction
9. Touch targets ≥ 44×44 CSS pixels on all interactive elements
10. Buttons have visible states: default, hover, focus (visible ring), active, disabled
11. Focus ring must be visible — never `outline: none` without a replacement
12. Motion respects `prefers-reduced-motion` — if building animations, include reduced-motion fallback

## Responsive
13. Minimum supported viewport: 320px wide
14. No horizontal scroll at any breakpoint (medium, small, tiny)
15. Content-first breakpoints — use `clamp()` for fluid type where possible

## Semantics & Accessibility
16. Headings follow hierarchy (h1 → h2 → h3 — no skipping)
17. Interactive elements use native HTML (`<button>`, `<a>`, `<input>`) — no div-buttons
18. Images have meaningful alt text (never `__wf_reserved_inherit`, never empty unless decorative)

## Analytics (Soft Check)
19. Every interactive element SHOULD have `data-analytics-event` attribute
    Format: `[page]-[section]-[action]` e.g. `home-hero-cta-click`
    Soft check: verification warns but does not fail if missing — build can proceed

## Content
20. No placeholder or lorem ipsum copy ships
21. No duplicate promos or CTAs on the same page
```

### 3. Split Carsa design context — `design-state.md` (hand) + `design-tokens.json` (auto)

#### 3a. `projects/carsa/.claude/design-state.md` (Will-authored, ~50 lines)

Content:

```markdown
# Carsa Design State

> Persistent brand context read on every /carsa-build. Updated ad-hoc by Will
> after rebrand or major site changes. NOT a component inventory — components
> are fetched dynamically via Webflow MCP.

## Brand Voice

### Do
- Clear, direct, no jargon (Rishi-approved)
- Confident but not pushy
- UK English spellings throughout
- Numbers and facts over adjectives ("5,000+ cars" > "huge range")
- Short sentences. Active voice.

### Don't
- "Amazing", "incredible", "unbeatable"
- Exclamation marks outside of CTAs
- American spellings ("optimize", "color")
- Caps lock shouting
- Vague claims ("best", "leading", "trusted" without proof)

## Design Spirit Anchors

These live pages/sections exemplify "good Carsa" — refer to them for tone and layout:

1. **Homepage hero** — https://www.carsa.co.uk (the search + value prop block)
2. **Car Finance page** — https://www.carsa.co.uk/car-finance (the calculator + reassurance stack)
3. **About Carsa** — https://www.carsa.co.uk/about/carsa (brand story section)
4. **Store finder** — https://www.carsa.co.uk/stores (map + list hybrid)
5. **Car Care overview** — https://www.carsa.co.uk/car-care/overview (card grid pattern)

## Photography & Imagery

- Real cars, real Carsa locations — never generic stock
- Outdoor daylight preferred
- People: UK customers and staff, naturalistic
- No illustration except icons (use existing icon set)

## What Carsa Never Does

- Busy hero sections with competing CTAs
- More than one primary CTA per section
- Centered body text
- Animated attention-grabbers (shake, pulse, blink)
- Pop-ups or modals outside of cookie consent
- Carousels/sliders for primary content
```

#### 3b. `projects/carsa/.claude/design-tokens.json` (auto-generated)

Refreshed by `/carsa-refresh-tokens` (see §4a). Schema:

```json
{
  "lastRefreshed": "2026-04-08",
  "source": "Webflow variable_tool (Carsa site 68348ea61096b37caacd2f95)",
  "semantic": {
    "background-color-primary": { "value": "#FFFFFF", "primitive": "neutral-100" },
    "background-color-secondary": { "value": "#F5F5F5", "primitive": "neutral-200" },
    "text-color-primary": { "value": "#0D0D0D", "primitive": "neutral-900" },
    "text-color-alternate": { "value": "#FFFFFF", "primitive": "neutral-100" },
    "brand-red": { "value": "#...", "primitive": "brand-red-500" },
    "brand-blue-dark": { "value": "#...", "primitive": "brand-blue-900" }
  },
  "typography": {
    "font-primary": "...",
    "font-secondary": "...",
    "scale": { "h1": "clamp(...)", "h2": "...", "body": "1rem" }
  },
  "spacing": { "padding-global": "...", "section-padding": "..." },
  "breakpoints": { "medium": "991px", "small": "767px", "tiny": "479px" },
  "lighthouseBaseline": { "accessibility": 92, "capturedAt": "2026-04-08" }
}
```

Read every build by `frontend-design` as the primitive source of truth for tokens and Lighthouse baseline comparison.

### 4. Rewrite `/carsa-build` command flow

The command becomes the single orchestrator. New phase sequence:

**Phase 1 — ASK**
Three conversational questions in one message:
1. **Where** — "Which page and roughly where on it? (e.g. `/car-finance`, below the calculator)"
2. **Why** — "What should the visitor feel, think, or do when they reach this section?"
3. **Who** — "Who's this aimed at? (first-time buyers, finance shoppers, existing customers, etc.)"

Rationale: "What" is Claude's job in Phase 2. Asking Rishi to spec the what turns him into a designer. Where/Why/Who frame the brief without prescribing shape.

**Phase 2 — DESIGN (generative pipeline)**

Sequence:

**2a. Gather context.** Read `design-state.md`, `design-tokens.json`, `.claude/skills/carsa-webflow/references/design-laws.md`. Call Webflow MCP (`element_snapshot_tool`) to snapshot the target page around the insertion anchor.

**2b. `frontend-design` skill invocation.** Pass brief (Phase 1 answers) + Carsa tokens + laws + page anchor snapshot. Skill returns **exactly 3 candidate section designs positioned on a creativity scale 1-10**, giving Rishi a deliberate spread of directions rather than 3 random variations:

- **Candidate A — Safe (creativity 2-3):** Conventional, proven pattern that echoes an existing Carsa section. Minimal visual risk. This is the "this will definitely work" option — always on-brand by construction, reducing the risk of an all-off-brand run.
- **Candidate B — Balanced (creativity 5):** Familiar shape with one distinctive element (unusual layout, typographic treatment, asymmetric grid, or interaction hint). Recognisably Carsa but clearly fresh.
- **Candidate C — Bold (creativity 8-10):** Expressive, experimental. Unusual composition, layered typography, bold colour use, or motion cues. Still bounded by design-laws.md (contrast, touch targets, line length) so it can't break accessibility — just stretches the visual language.

Each candidate returns:
- Creativity score (2-3 / 5 / 8-10) and 1-sentence direction
- Layout rationale (why this shape *at this creativity level* for this brief)
- Client First class tree
- Copy slots (heading, body, CTAs) as placeholders

The creativity scale is enforced in the `frontend-design` prompt, not left to the model's taste. Safe must genuinely be safe; bold must genuinely be bold. If the brief is a legal/compliance section, `frontend-design` still returns 3 but narrows the spread (e.g. 2 / 4 / 6) and notes the narrowing in its rationale.

**2c. `content` agent invocation.** For each candidate, pass layout + copy slots + `design-state.md` voice block. Agent returns draft copy per slot in Carsa brand voice.

**2d. `humanizer` skill pass.** For each draft, run `humanizer` with calibration against the Do/Don't lists. Output: polished copy per candidate with AI tells stripped (hedges, em-dashes, forbidden phrases, verbosity).

**2e. `nano-banana` concept images.** For each candidate, generate a concept image prompt from (layout + polished copy + Carsa brand context) and call the skill. Returns 1 image per candidate, ~£0.10/image.

**2f. Assemble candidate previews.** Build Rishi-facing preview per candidate, labelled by creativity tier so he picks direction before detail:
- **Header:** `A — Safe (2/10)` / `B — Balanced (5/10)` / `C — Bold (9/10)`
- 1-sentence direction
- Anchor reference (which live Carsa page this shape echoes, if any — A almost always has one, C rarely does)
- Nano-banana concept image
- Draft copy bullets (heading + subhead + primary CTA)

Present all 3 candidates in one message, in A→B→C order (safe to bold). This ordering matters: it anchors Rishi in familiar territory first, then stretches outward, which psychologically makes B and C feel like considered steps rather than risky gambles.

**Phase 3 — CONFIRM**

Step 1 — Rishi picks a candidate (or says "none of these — let me describe it" which loops back to 2a with extra input).

Step 2 — System asks: **"Got copy already or shall I make some? If you're happy with the draft I just showed, say 'use that'. Otherwise paste yours."**
- "Use that" / "keep the draft" → humanizer-polished copy used as-is
- "Here's mine: ..." → Rishi's copy used verbatim, skipping the draft
- "Edit the draft: ..." → Rishi inline edits, system uses edited version

Step 3 — System restates the final plan (layout + copy source) and asks "Shall I build?"

**Phase 4 — BUILD**
Existing Webflow MCP pipeline. MCP fallback to HTML mode if hangs (already in SKILL.md).

**Phase 5 — PUBLISH**
Call `data_sites_tool > publish_site` to push changes to `carsa-v2.webflow.io` (staging domain only, NOT live carsa.co.uk). Wait for publish confirmation.

**Phase 6 — VERIFY (Chrome DevTools MCP)**
Navigate to `https://carsa-v2.webflow.io{page-slug}` via `navigate_page`. Then:
1. `take_screenshot` — full page + viewport for desktop (1280) and mobile (390) via `resize_page`
2. `lighthouse_audit` with `categories: ["accessibility"]` — fail if score REGRESSES below `design-tokens.json > lighthouseBaseline.accessibility`. Prevents old Carsa a11y debt from blocking Rishi.
3. `evaluate_script` — check `data-analytics-event` presence on all `<button>`, `<a>`, `<input>` elements inside the new section. Soft check: warn if any missing, do NOT fail
4. `evaluate_script` — for each text node inside the new section, compute contrast ratio using `getComputedStyle` + WCAG formula. Fail if any body text < 4.5:1 or large text < 3:1
5. `evaluate_script` — for interactive elements, check `getBoundingClientRect()` dimensions ≥ 44×44px. Fail if any fall short.
6. `list_console_messages` — fail if any errors (not warnings)

If any hard check fails: surface the issue, offer to fix or flag for Will.

**Phase 7 — LOG (dual write)**
- **Local JSON** at `.claude/logs/carsa-build-log.json` (existing format)
- **Webflow CMS** via `data_cms_tool > create_collection_item` — writes to the "Build Log" collection on carsa-v2.webflow.io. Collection ID read from `projects/carsa/.claude/intake.json` under new `changelogCollectionId` field.

Webflow CMS entry fields:
```
Name: "{date} — {section name} on {page}"
Date: today
Page Modified: page slug (e.g. "/car-finance")
Section Name: Rishi's description from Phase 1
Description: rich text summary of what was built
Screenshot: desktop screenshot from verify step
Builder: "Rishi" (default)
Verified: true/false based on verify step result
Notes: any warnings (missing analytics attrs, etc.)
```

**Phase 8 — REPORT**
Single-message summary for Rishi:
- ✅ / ⚠️ / ❌ verify status
- Link to the published section on carsa-v2.webflow.io
- Link to the /changelog entry
- Copy-paste Slack block (already in SKILL.md)
- If any warnings: clear "these are soft issues you can fix later" framing

### 4a. `/carsa-refresh-tokens` helper command

New command at `.claude/commands/carsa-refresh-tokens.md`. Will-only, not Rishi-facing. Runs ad-hoc after Carsa variables change in Webflow Designer.

Flow:
1. Call `variable_tool > list_variable_collections` for Carsa site ID `68348ea61096b37caacd2f95`
2. For each collection, call `get_variables` — collect name, value, primitive reference
3. Resolve semantic → primitive chains (two-level deep)
4. Optionally re-run `lighthouse_audit` on homepage to capture fresh `lighthouseBaseline.accessibility` score
5. Read existing `projects/carsa/.claude/design-tokens.json` if present, diff against new payload
6. Write pretty-printed JSON with fresh `lastRefreshed` timestamp
7. Print human-readable diff summary ("brand-red changed #E30613 → #D90612, font-primary unchanged, baseline 92 → 93")

Safe to re-run. Idempotent. Rishi never touches this — it's Will's maintenance hook.

### 5. Webflow CMS Changelog — Will's one-time setup

Spec §10 below contains the step-by-step setup doc for Will.

---

## Time & Pricing Estimate

### Will's build time (internal)

| Work item | Hours | Notes |
|-----------|-------|-------|
| 1. Narrow skill trigger + write design-laws.md reference | 1.0 | Copy/adapt from designpowers spec |
| 2. Trim SKILL.md (remove Plan step, cross-refs to command) | 0.5 | Carving only |
| 3. Install + pin `humanizer` skill to commit hash, smoke-test | 0.5 | blader/humanizer v2.5.1 at spec time |
| 4. Rewrite `/carsa-build` Phases 1-3 (ask, generative pipeline, confirm+copy) | 3.0 | Bulk of the work — chains frontend-design + content + humanizer + nano-banana |
| 5. Rewrite `/carsa-build` Phases 4-5 (build, publish staging only) | 0.5 | Existing logic + hardcoded staging guard |
| 6. Implement Phase 6 Chrome DevTools verify scripts (contrast/touch/analytics/lighthouse baseline) | 1.5 | New JS logic inside `evaluate_script` calls |
| 7. Implement Phase 7 dual-write log (JSON + CMS) | 1.0 | Depends on CMS collection existing |
| 8. Implement Phase 8 report + Slack block | 0.5 | |
| 9. Build `/carsa-refresh-tokens` helper command | 1.0 | Variable_tool + diff summary |
| 10. Write design-state.md template + populate with Carsa content | 1.5 | Voice, spirit anchors, Do/Don'ts |
| 11. Run `/carsa-refresh-tokens` once to populate design-tokens.json | 0.25 | |
| 12. Write Playwright acceptance tests | 1.0 | **DONE in this session** |
| 13. Package `carsa-self-serve` delivery repo (files + CLAUDE.md + README) | 1.5 | Dedicated GitHub repo |
| 14. Install delivery repo on Rishi's Mac, smoke-test | 0.5 | Screen-share session |
| 15. Record Loom walkthrough (~10 min) | 0.5 | |
| 16. Update cheatsheet + queue.json | 0.25 | |
| **Build subtotal** | **14.5h** | |

### Will's one-time manual setup (outside the skill/command code)

| Work item | Hours | Notes |
|-----------|-------|-------|
| A. Create "Build Log" CMS collection on Carsa site | 0.5 | 9 fields per §10 |
| B. Create `/changelog` password-protected template page | 1.0 | Webflow template + CMS binding |
| C. Create password-protected `/sandbox` page for dogfood | 0.25 | Single empty section for 5-section test |
| **Setup subtotal** | **1.75h** | |

### Dogfood (pre-handoff, per §12)

| Work item | Hours | Notes |
|-----------|-------|-------|
| D. Run full `/carsa-build` flow 5 times on `/sandbox` | 2.0 | Hero / text+image / card grid / testimonial / CTA band |
| E. Handoff call with Rishi | 0.5 | 30 min |
| **Dogfood subtotal** | **2.5h** | |

### Total

**~18.75 hours** build + setup + dogfood combined. Flat-fee rounded to **16.25h at £100/hr = £1,600** (dogfood + handoff partly amortised into build).

### At Carsa ad-hoc standard rate

Standard rate per `.claude/reference/rate-card.md` is €120/hr ≈ **£100/hr** (GBP).

| Line item | Hours | GBP |
|-----------|-------|-----|
| Build | 14.5 | £1,450 |
| One-time setup | 1.75 | £175 |
| **Flat fee total** | **16.25** | **£1,600** |

Dogfood + handoff (~2.5h) folded into the flat fee as a quality guarantee — Will won't ship until the 5-section checklist passes.

### Recommended billing framing for Rishi

This is productised internal tooling, not a traditional deliverable. Three options:

1. **Flat fee** — "Carsa Self-Serve Build System: £1,600 one-time. Rishi then builds sections himself. Will reviews weekly via /changelog. Per-section support billed separately if needed."
2. **Bundled** — fold into a Carsa retainer (4h monthly retainer = £400/mo — build cost recovered in ~4 months)
3. **Amortised** — don't bill directly; recover via future Carsa work at premium rate because Rishi is now building himself

Recommendation: **Option 1**. Clear, scoped, defensible. Aligns with Carsa's ad-hoc engagement model per `projects/carsa/.claude/client.md`.

### Ongoing cost for Rishi per build session

Estimated Claude Code tokens: ~50-80k input, ~20-35k output (higher than v1 because of the generative pipeline + humanizer). At Opus pricing: ~£1.50-£2.80. Plus 3 nano-banana concept images (one per creativity tier) at ~£0.10 each = £0.30. **Total ~£2.00-£3.10 per build.** Still negligible. Rishi covers this via his own Anthropic billing (see Open Questions).

---

## Parallelisation Map

| Stream | Tasks | Agent | Est. time | Dependencies |
|--------|-------|-------|-----------|--------------|
| **A: Skill trim + laws** | 1, 2 | code-writer | 1.5h | None |
| **B: Humanizer install** | 3 | code-writer | 0.5h | None |
| **C: Refresh-tokens helper** | 9 | code-writer | 1.0h | None |
| **D: Command Phases 1-3** | 4 | code-writer | 3.0h | A + B |
| **E: Command Phases 4-8** | 5-8 | code-writer | 3.5h | D |
| **F: Design context population** | 10, 11 | code-writer | 1.75h | C |
| **G: Tests** | 12 | code-writer | DONE | — |
| **H: Delivery repo + install + Loom** | 13-15 | code-writer | 2.5h | E + F |
| **I: Housekeeping** | 16 | code-writer | 0.25h | H |
| **J: Dogfood (5 sections) + handoff call** | — | qa | 2.5h | H + Will CMS setup |

**Recommendation:** Streams A, B, C can run in parallel (no shared files). D depends on A+B. F depends on C. E depends on D. H depends on E+F. J is the final gate before handoff. **Worktrees: no** (single developer, sequential authoring). **Agent teams: no** (tasks are authoring, not complex coordination).

---

## Barba Impact

**N/A — Carsa does not use Barba transitions.** No init/destroy lifecycle concerns.

---

## Acceptance Tests

### Test infrastructure check
- `.env.test` exists at project root (currently `STAGING_URL=https://studiozissou.webflow.io`)
- `package.json` has Playwright in devDependencies ✓
- `tests/acceptance/` and `tests/registry.json` exist ✓

**Action required:** add `STAGING_URL_CARSA=https://carsa-v2.webflow.io` to `.env.test` (new variable — does not replace existing STAGING_URL).

### Tier 1 — Auto: Playwright local
File: `tests/acceptance/carsa-rishi-self-serve.spec.js`

Tests the _verification scripts_ the command will run against a rendered page. The scripts live in the command as JS strings — the test file imports those strings and runs them against a known-good Carsa page to ensure they return correct verdicts.

Tests:
1. **contrast-script-detects-pass** — runs contrast-checker JS against homepage hero, expects PASS
2. **contrast-script-detects-fail** — injects low-contrast element via `page.evaluate`, runs contrast checker, expects FAIL
3. **touch-target-script-detects-pass** — runs touch-target checker against homepage nav, expects all ≥ 44x44 PASS
4. **touch-target-script-detects-fail** — injects small button via `page.evaluate`, runs checker, expects FAIL
5. **analytics-script-warns-on-missing** — injects button without data-analytics-event, runs checker, expects soft warning (not fail)
6. **analytics-script-passes-when-present** — checks homepage CTA, expects PASS
7. **lighthouse-a11y-baseline** — runs lighthouse accessibility audit against homepage, asserts score ≥ 90 (baseline for Carsa)
8. **no-console-errors-homepage** — navigates to carsa-v2.webflow.io, asserts no console errors

### Tier 2 — Auto: CDN regression
Test registered in `tests/registry.json` as `carsa-rishi-self-serve`. Runs during `/deploy`.

### Tier 3 — Manual
- **Skill trigger collision test:** open fresh Claude Code session, say "I want to add a section to studio-zissou homepage" — verify `carsa-webflow` skill does NOT activate (was previously activating on "website" mentions)
- **Design-state.md freshness:** Will reviews `design-state.md` content quarterly
- **CMS changelog visual check:** Will opens `/changelog` page after first Rishi build, confirms entry displays correctly
- **Rishi end-to-end:** Rishi builds a real simple section (e.g. a text+image block on `/about/carsa`), system completes all 8 phases, Will reviews the changelog entry — cannot automate because it requires Rishi's actual workflow

---

## Verify Loop

### Pass/fail criteria

**System is working when:**
- `/carsa-build` can be invoked and completes Phases 1-8 without manual intervention
- Phase 1 asks exactly 3 questions (Where / Why / Who)
- Phase 2 returns exactly 3 candidates on a creativity spread (A: 2-3 safe / B: 5 balanced / C: 8-10 bold), each with `frontend-design` layout + `content` agent draft + `humanizer` polished copy + `nano-banana` concept image. Candidates presented in A→B→C order and clearly labelled with creativity score.
- Phase 3 asks the copy question ("got copy already or shall I make some?") and routes all three branches correctly
- Phase 6 verify step runs all 6 Chrome DevTools MCP checks and returns a structured verdict
- Phase 6 hard-fails on: contrast < 4.5:1 body text, touch target < 44x44, console errors, lighthouse a11y REGRESSION vs `design-tokens.json > lighthouseBaseline`
- Phase 6 soft-warns on: missing `data-analytics-event` attributes
- Phase 7 writes to BOTH `.claude/logs/carsa-build-log.json` AND Webflow CMS "Build Log" collection
- `carsa-webflow` skill does NOT auto-trigger on the word "website" in non-Carsa conversations (narrowed trigger verified)
- `humanizer` skill is pinned to a specific commit hash, reproducible install
- `design-tokens.json` is refreshable via `/carsa-refresh-tokens` and matches Carsa Webflow variable values
- SKILL.md file size stays under 500 lines after changes
- `carsa-self-serve` delivery repo installs cleanly on a Mac and passes the 5-section dogfood (§12)

### Reproduction steps

1. Fresh Claude Code session with this project
2. Run `/carsa-build` conversationally: "add a trust signal section to the /car-finance page"
3. Verify: system asks exactly 2 questions (goal + audience)
4. Provide answers
5. Verify: system proposes exactly 3 section shapes on the creativity spread (A safe / B balanced / C bold), each clearly labelled with a creativity score, presented in A→B→C order
6. Pick one, confirm build
7. Verify: Webflow MCP build proceeds, publish to carsa-v2.webflow.io succeeds
8. Verify: Chrome DevTools MCP navigates to the published URL and runs all 6 checks
9. Verify: build log entry appears in `.claude/logs/carsa-build-log.json`
10. Verify: CMS entry appears on `/changelog` page (password-protected)
11. Verify: final report shows pass/warn/fail status and copy-paste Slack block

### Tier mapping
- **Tier 1 (auto):** `tests/acceptance/carsa-rishi-self-serve.spec.js` — verification script correctness
- **Tier 2 (auto):** Registered in `tests/registry.json` — runs during `/deploy`
- **Tier 3 (manual):** Skill trigger collision test, design-state freshness, CMS visual check, Rishi end-to-end — require real workflow

### Regression scope
- Existing Carsa pages must not be modified by skill/command changes (zero edits during dogfood phase)
- `queue.json` format must remain compliant with `queue-tasks` skill
- Cheatsheet must stay in sync
- `tests/registry.json` schema must not break existing entries
- `.env.test` must keep existing `STAGING_URL` (for Studio Zissou) — only ADD `STAGING_URL_CARSA`
- Superpowers skills must still auto-trigger correctly (narrowing Carsa trigger should improve this)

---

## Webflow CMS Changelog — One-Time Setup (Will)

### Step 1 — Create CMS collection
1. Open carsa-v2.webflow.io in Webflow Designer
2. Go to CMS panel → New Collection
3. Name: `Build Log` (singular: `Build Log Entry`)
4. Add fields:
   - `Name` — Plain Text (title field, auto-filled)
   - `Date` — Date/Time, required
   - `Page Modified` — Plain Text, required
   - `Section Name` — Plain Text, required
   - `Description` — Rich Text
   - `Screenshot` — Image
   - `Builder` — Option: Rishi / Tomek / Will
   - `Verified` — Switch, default off
   - `Notes` — Rich Text
5. Save collection. Copy the collection ID from the URL or Webflow API.

### Step 2 — Add collection ID to intake.json
Edit `projects/carsa/.claude/intake.json`:
```json
{
  "project": { ... },
  "changelogCollectionId": "<the-id-from-step-1>",
  ...
}
```

### Step 3 — Create template page
1. In Pages panel → New Page → Template page → bind to `Build Log` collection
2. Set slug: `/changelog/[slug]`
3. Design: simple card list showing Date, Page Modified, Section Name, Description, Screenshot, Builder, Verified badge
4. Apply Carsa Client First classes

### Step 4 — Create index page
1. New Page → Static → `/changelog`
2. Add Collection List bound to Build Log, sorted by Date descending
3. Apply password protection via Page settings → Password

### Step 5 — Publish to staging
1. Publish site to `carsa-v2.webflow.io` only (not live)
2. Verify `/changelog` loads after password entry
3. Manually create 1 test entry via CMS panel to confirm template renders

### Step 6 — Notify Will
System is ready for `/carsa-build` to write entries. Remove test entry.

**Estimated time:** 1.5 hours.

---

## 11. Delivery Packaging — `carsa-self-serve` Repo

### 11.1 Repo creation
- New GitHub repo: `willmorley/carsa-self-serve` (private)
- Layout per Repo B in §Architecture
- `CLAUDE.md` at root describes Rishi's workflow in plain English: open repo → run `/carsa-build` → follow the conversation
- `README.md` has install, update, and troubleshooting steps

### 11.2 Install on Rishi's Mac
- Will installs via screen-share or in-person handoff
- Clone to `~/carsa-self-serve/`
- Open in Claude Code, verify skills + commands load
- Smoke test: run `/carsa-build` with a throwaway brief, cancel before build
- Confirm `humanizer` skill pinned commit matches expected hash
- Confirm Rishi's Anthropic billing is active (he covers runtime cost)

### 11.3 Loom walkthrough
- ~10 min video: "How to build a section on Carsa with Claude Code"
- Shows: opening the repo, running `/carsa-build`, answering the 3 questions, picking a candidate, choosing copy source, watching verify step, viewing `/changelog`
- Hosted on Loom, link embedded in `CLAUDE.md`

### 11.4 Handoff call
- 30-min call with Rishi (Tomek optional)
- Walk through the 5 dogfood sections Will already built on `/sandbox` (§12)
- Answer questions live
- Set expectations: sections on `/sandbox` only for first week, then green-light live pages
- Agree the weekly `/changelog` review cadence

---

## 12. Pre-delivery Dogfood Checklist

Before handing `carsa-self-serve` to Rishi, Will completes the full workflow **5 times** on a password-protected `/sandbox` page on `carsa-v2.webflow.io`. This is the final quality gate — no handoff until all criteria pass.

### 12.1 Sandbox page setup
- New Webflow page at `/sandbox`, password-protected via Page settings
- Contains a single wide empty section Rishi can fill with test builds
- Left live for 7 days after handoff as safety net, then deleted

### 12.2 The 5 dogfood sections

| # | Section type | Brief (Where / Why / Who) |
|---|--------------|---------------------------|
| 1 | Hero-style intro | `/sandbox` top — establish credibility for finance-curious visitors |
| 2 | Two-column text + image | Below #1 — explain car care subscription to existing customers |
| 3 | 3-card feature grid | Below #2 — highlight 3 reasons to buy from Carsa for first-time buyers |
| 4 | Testimonial quote block | Below #3 — social proof from a real Carsa customer for hesitant shoppers |
| 5 | CTA band | Below #4 — drive phone calls for warm finance leads |

For each: run `/carsa-build` end-to-end, verify Phase 6 passes, confirm CMS log entry, note any friction.

### 12.3 Pass criteria for handoff
- [ ] All 5 sections built without Will manually editing code
- [ ] All 5 pass Phase 6 hard checks (contrast, touch, console, lighthouse non-regression)
- [ ] All 5 have `/changelog` CMS entries with screenshots
- [ ] `nano-banana` concept images matched the final built sections closely enough to trust
- [ ] `humanizer` output was acceptable brand voice (Will would have sent it to Rishi as-is)
- [ ] Total build time for all 5 < 90 minutes (including reading questions and picking candidates)

If any criterion fails, fix before handoff.

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Design quality variance — generative sections sometimes look off-brand | LOW-MEDIUM | Creativity spread guarantees Candidate A is always a safe, conventional pattern echoing an existing Carsa section — Rishi always has an on-brand fallback. `frontend-design` grounded in `design-state.md` + `design-tokens.json` + `design-laws.md`. `nano-banana` preview commits Rishi visually before any MCP writes. 5-section test build (§12) is the final gate before handoff. If bold C options drift in production, narrow the spread to 2/4/6 in v2. |
| Humanizer brand voice drift | MEDIUM | `design-state.md` Do/Don'ts are explicit calibration input. Phase 3 always offers "got copy already?" escape — if the humanizer draft misses, Rishi pastes his own in 10 seconds. Zero-friction recovery. |
| Third-party `humanizer` skill changes or breaks upstream | MEDIUM | Pinned to commit hash at install time. Delivery repo has its own copy, not live-linked. Upstream changes cannot break Rishi. Will re-pins manually on a quarterly review. |
| Design spirit is hard for AI to capture | MEDIUM (was HIGH) | Downgraded: split `design-state.md` (voice + live URL anchors) + `design-tokens.json` (primitives + baseline) + `design-laws.md` (rules) + `frontend-design` skill gives Claude concrete scaffolding. `nano-banana` preview is the visual commitment gate. |
| `frontend-design` skill output doesn't map cleanly to Webflow MCP | MEDIUM | Phase 4 translation layer: `carsa-webflow` skill converts `frontend-design` output → MCP tool calls using the Client First class tree. Tested end-to-end during §12 dogfood. |
| Chrome DevTools MCP verification flaky on first run | MEDIUM | Fallback: if `lighthouse_audit` or `evaluate_script` fails, surface error as "verification couldn't run — flagging for Will review". Don't block the build log write. |
| Webflow publish latency causes verify step to run before page is live | MEDIUM | 10s wait + retry loop after `publish_site`. If still not live after 30s, flag and proceed with local screenshot only. |
| Rishi publishes to live accidentally | HIGH | Phase 5 ONLY publishes to `carsa-v2.webflow.io` staging domain, NEVER to `carsa.co.uk`. Hardcoded in command. Live publish requires a separate manual step Will controls. |
| `design-state.md` goes stale after Carsa rebrand | MEDIUM | `lastReviewed` date at top. Command warns if > 90 days. Will refreshes ad-hoc. |
| `design-tokens.json` drifts from Webflow Designer variables | MEDIUM | `/carsa-refresh-tokens` is idempotent and runnable any time. Will runs after any variable change. Command warns if `lastRefreshed` > 30 days. |
| CMS changelog collection ID not set in `intake.json` | MEDIUM | Phase 7 checks `changelogCollectionId` before attempting write. If missing: logs to JSON only, warns "CMS changelog disabled". Graceful degradation. |
| Lighthouse a11y baseline < 90 on existing Carsa pages (old issues) | MEDIUM | Baseline stored in `design-tokens.json > lighthouseBaseline`. Phase 6 passes as long as the new section doesn't REDUCE the score. Prevents old a11y debt from blocking Rishi. |
| Rishi asks for something outside "content section" scope (e.g. nav edit, form schema) | MEDIUM | Phase 2 scope check: if the ask involves nav/footer/global/CMS schema, command halts with "This one needs Will — noted in the build log as a handoff". |
| Rishi skips the copy draft preview and ends up with AI-voice copy on live | LOW | Draft is shown in Phase 2f preview AND Phase 3 asks explicitly. `humanizer` already stripped AI tells in 2d. |
| Skill trigger still fires on non-Carsa work despite narrowing | LOW | Tier 1 acceptance test asserts the narrowed trigger string. Tier 3 manual fresh-session test is the backup. If collision persists, narrow further to require explicit `/carsa-build` invocation only. |
| Opus token cost per build gets expensive | LOW | Sonnet for verification + logging + `humanizer` + `content`; Opus only for `frontend-design` reasoning. Keeps cost ~£2-£3.10/build. |

---

## Open Questions (pre-build)

1. **Carsa rebuild domain confirmed?** Spec assumes `carsa-v2.webflow.io` is the ONLY publish target. Rishi must never push to `carsa.co.uk` via this system. Confirm before build.
2. **Rishi's Claude Code + Mac setup?** Does Rishi already have Claude Code installed on his Mac? If not, add install time to §11.2 handoff.
3. **Rishi's Anthropic API billing?** Rishi needs his own Claude Max plan or API billing for ongoing use (~£2-£3.10 per build). Confirm the arrangement before delivery — Will does not cover Rishi's runtime cost.
4. **Rishi's Webflow Designer access?** Command only uses MCP (backend), so Designer seat is not required — but for `/changelog` viewing he needs the page password. Confirm.
5. **Tomek role?** `projects/carsa/.claude/client.md` lists Tomek as day-to-day contact. Does Tomek need to be in the loop on Rishi's builds, or is `/changelog` sufficient for async review?
6. **`design-state.md` content authority?** Will drafts it, but who approves the brand voice Do/Don'ts? Rishi? Tomek? Or is Will the authority?
7. **Humanizer commit pin — which version?** Latest stable v2.5.1 at spec time. Will verifies and pins during install step (task 3).
8. **`/sandbox` teardown timing.** Delete after handoff call, or leave for first week of Rishi usage as safety net? Recommendation: leave 7 days post-handoff, then delete.

These should be resolved before the build phase starts, not before the spec is saved.

---

## Task Breakdown (for queue.json)

| # | Task | Agent | Hours | Dependencies |
|---|------|-------|-------|--------------|
| 1 | Narrow `carsa-webflow` skill trigger description | code-writer | 0.25 | None |
| 2 | Create `.claude/skills/carsa-webflow/references/design-laws.md` | code-writer | 0.75 | None |
| 3 | Trim SKILL.md Plan step (move logic to command) | code-writer | 0.5 | Task 1 |
| 4 | Install `humanizer` skill, pin to commit hash, smoke-test | code-writer | 0.5 | None |
| 5 | Create `projects/carsa/.claude/design-state.md` template + populate | code-writer | 1.5 | None |
| 6 | Build `/carsa-refresh-tokens` helper command | code-writer | 1.0 | None |
| 7 | Run `/carsa-refresh-tokens` to populate `design-tokens.json` (+ baseline) | code-writer | 0.25 | Task 6 |
| 8 | Rewrite `/carsa-build` Phase 1 (3 questions — Where/Why/Who) | code-writer | 0.5 | Tasks 1-5 |
| 9 | Rewrite `/carsa-build` Phase 2 (frontend-design → content → humanizer → nano-banana → assemble) | code-writer | 2.0 | Task 8 |
| 10 | Rewrite `/carsa-build` Phase 3 (confirm + copy question) | code-writer | 0.5 | Task 9 |
| 11 | Rewrite `/carsa-build` Phases 4-5 (build, publish staging only) | code-writer | 0.5 | Task 10 |
| 12 | Implement Phase 6 Chrome DevTools verify scripts | code-writer | 1.5 | Task 11 |
| 13 | Implement Phase 7 dual-write log (JSON + CMS) | code-writer | 1.0 | Task 12 + CMS collection |
| 14 | Implement Phase 8 report + Slack block | code-writer | 0.5 | Task 13 |
| 15 | Write Playwright acceptance tests | code-writer | 1.0 | **DONE in this session** |
| 16 | Register test in `tests/registry.json` | code-writer | 0.1 | **DONE in this session** |
| 17 | Add `STAGING_URL_CARSA` to `.env.test` | code-writer | 0.1 | **DONE in this session** |
| 18 | Package `carsa-self-serve` delivery repo + CLAUDE.md + README + install script | code-writer | 1.5 | Tasks 1-14 |
| 19 | Install delivery repo on Rishi's Mac + smoke test | code-writer | 0.5 | Task 18 + Will's CMS setup |
| 20 | Record Loom walkthrough (~10 min) | content | 0.5 | Task 19 |
| 21 | Update cheatsheet + `queue.json` | code-writer | 0.25 | Task 14 |
| 22 | Dogfood: 5 sections on `/sandbox` per §12 checklist | qa | 2.0 | Task 19 |
| 23 | Handoff call with Rishi (30 min) | — | 0.5 | Task 22 |

**Build subtotal:** ~14.5h code-writer tasks. **Dogfood + handoff:** ~2.5h. **Setup:** 1.75h. **Flat fee total: £1,600.**

---

## Success Criteria

Phase 1 (tool built) is successful when:
- [ ] `carsa-webflow` SKILL.md stays under 500 lines
- [ ] `design-laws.md` reference file exists and is referenced by the command
- [ ] `design-state.md` hand-authored and `design-tokens.json` auto-generated; both present
- [ ] `/carsa-refresh-tokens` command works and is idempotent
- [ ] `humanizer` skill installed and pinned to commit hash
- [ ] `/carsa-build` asks exactly 3 questions in Phase 1 (Where/Why/Who)
- [ ] Phase 2 generative pipeline returns exactly 3 candidates on the creativity spread (A safe 2-3 / B balanced 5 / C bold 8-10), each with `frontend-design` layout + `humanizer`-polished copy + `nano-banana` concept image
- [ ] Phase 3 asks the copy question ("got copy already or shall I make some?") and routes correctly
- [ ] Phase 6 runs all 6 Chrome DevTools verify checks against `carsa-v2.webflow.io`
- [ ] Phase 7 writes to both local JSON and Webflow CMS
- [ ] Acceptance tests pass (`tests/acceptance/carsa-rishi-self-serve.spec.js`)
- [ ] `carsa-webflow` skill does NOT collide with superpowers on non-Carsa mentions
- [ ] `carsa-self-serve` delivery repo installs cleanly on a Mac
- [ ] Will completed the 5-section dogfood on `/sandbox` with zero manual fixes (§12)
- [ ] Will has completed the one-time CMS setup (§10)

Phase 2 (Rishi uses it) is successful when:
- [ ] Rishi has built ≥3 sections via `/carsa-build` with zero Will intervention on the build itself
- [ ] No hardcoded hex values ship in Rishi's builds
- [ ] No contrast failures ship
- [ ] Every Rishi-built section has a `/changelog` entry
- [ ] Rishi reports the questioning phase feels "natural, not bureaucratic"
- [ ] `humanizer` brand voice calibration feels right to Rishi (no complaints about "AI tone")
- [ ] Will's weekly review of `/changelog` surfaces zero critical design drift issues in month 1

---

## Follow-ups (out of scope for v1)

- **v2 — Humanizer calibration tuning.** If first month reveals `humanizer` pattern misses on Carsa-specific idioms, add a Carsa-specific pattern pack.
- **v2 — Figma export of concepts.** v1 uses `nano-banana` only. v2 could add Figma MCP export as an optional preview for Will's review before Rishi sees it — higher token cost, evaluate after month 1.
- **v2 — Google Stitch MCP for higher-fidelity previews.** v1 uses flat `nano-banana` concept images, which are sufficient for a 3-option pick. If Rishi ever says "I couldn't tell the options apart until it was built", swap the Phase 2e preview layer for the Stitch MCP server (launched March 2026). Stitch outputs actual UI mockups with auto-layout, exports to HTML/CSS/Figma, and is free via Google Labs. Risk: Stitch is still Labs-stage so pin to a fallback on `nano-banana` behind a config flag.
- **v2 — Component creation workflow.** v1 is fully generative via `frontend-design`. v2 could let the skill request new Webflow components with a Will approval gate.
- **v2 — Multi-page edits.** v1 targets one section on one page per invocation.
- **v2 — Auto-publish to live.** v1 staging only. v2 could add a separate approval gate for promoting to `carsa.co.uk`.
- **v2 — Rishi analytics dashboard.** v1 ensures `data-analytics-event` presence. v2 could show Rishi which of his builds perform well.
- **v3 — Generalise to other clients.** If the pattern works, extract a generic `/client-build` template (per-client `design-state` + `design-tokens`).
- **v3 — Fallback component catalog.** If generative quality proves too variable, add a curated section template library as a shortcut for common asks.
