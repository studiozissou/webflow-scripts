# /client-build — Build a component or section on any client's Webflow site

Generic build command. Reads the client's context package at runtime —
design tokens, brand voice, class reference, site config — and builds
in their style via Webflow MCP.

**Arguments:** `--design` | `--review` | `--dry-run` | `--client <slug>`

---

## Flags

- `--design` — enable generative design phase (Phase 4)
- `--review` — skip to weekly review report
- `--dry-run` — plan + confirm only, no Webflow writes
- `--client <slug>` — specify client (default: inferred from cwd)

---

## Model split

- **Opus** for planning (Phase 3), design generation (Phase 4), and MCP fallback HTML
- **Haiku** for build log operations and Slack formatting

---

## Phase 1: CONTEXT (auto)

1. Resolve client:
   - If `--client <slug>` provided, use `projects/<slug>/`
   - Otherwise infer from cwd — find the nearest `projects/<name>/` ancestor
   - If neither works, ask the user
   - If the resolved directory `projects/<slug>/.claude/` doesn't exist, inform the user and stop

2. Read context package from `projects/<client>/.claude/`:
   - `client.md` — REQUIRED
   - `design/figma-tokens.json` — REQUIRED
   - `build/site-config.json` — REQUIRED
   - `build/class-reference.md` — REQUIRED (for style conventions)
   - `brand/voice.md` — optional (needed for `--design` mode)
   - `brand/icp.md` — optional (enhances Phase 2 audience questions)
   - `brand/design-state.md` — optional (needed for `--design` mode)
   - `build/design-laws.md` — optional (defaults to shared template)
   - `build/workflows.md` — optional (build path guidance)

3. Check for client skill override at `projects/<client>/.claude/skills/<client>-webflow/SKILL.md`
   - If found, load it — its rules take priority over generic defaults
   - Log: "Loaded client override: <client>-webflow"

4. If any REQUIRED file is missing:
   - List missing files
   - Suggest: "Run `/intake` with Phases 6-7 to generate these files"
   - Stop

5. Load the `client-first` skill for CF conventions
6. Load the `webflow-mcp` skill for MCP patterns

---

## Phase 2: ASK (3 Socratic questions)

Ask in a single `AskUserQuestion` block or conversational prompt:

1. **Where** — Which page and where on the page?
   - New section at a specific position
   - Replace an existing section
   - Edit content within an existing section

2. **Why** — What's the goal of this section?
   - Convert (CTA, signup, pricing)
   - Inform (features, specs, how-it-works)
   - Engage (testimonial, social proof, case study)
   - Trust (logos, certifications, team, about)

3. **Who** — Which audience segment is this for?
   - If `brand/icp.md` exists, reference the defined personas
   - If not, ask who the target audience is

---

## Phase 3: PLAN

1. Connect to Webflow MCP
2. Read target page structure via `element_snapshot_tool`
3. If `site-config.json` has `specialPages.allComponents`, read that page to find
   reusable components
4. If `site-config.json` has `specialPages.styleGuide`, read it to confirm
   available styles
5. Reference `build/workflows.md` for build path patterns (component insertion
   vs building from scratch)
6. Present build plan to user:
   - Section structure (element hierarchy)
   - Variables to be used (from `figma-tokens.json`)
   - Classes to be applied (from `class-reference.md`)
   - Component reuse (if inserting existing components)
   - Any constraints from client override skill
7. Wait for explicit approval before proceeding

If `--dry-run`: stop here after presenting the plan.

---

## Phase 4: DESIGN (only with `--design` flag)

Skip this phase entirely if `--design` was not passed.

Required context: `brand/voice.md`, `brand/design-state.md`, `build/design-laws.md`
If any are missing, warn and ask if user wants to continue without the design phase.

1. Load `frontend-design` skill
2. Feed it:
   - Design tokens from `figma-tokens.json`
   - Visual spirit from `brand/design-state.md`
   - Design laws from `build/design-laws.md`
   - Section goal and audience from Phase 2
3. Generate 3 candidates with distinct approaches:
   - **A: Safe** — follows existing site patterns exactly, reuses layout structures already on the page
   - **B: Balanced** — follows existing patterns but introduces one new visual element (e.g. a new card layout, asymmetric grid, or accent treatment)
   - **C: Bold** — reimagines the section structure while staying within the design system tokens and laws
4. For each candidate, load the `content` agent:
   - Draft section copy using `brand/voice.md` tone and vocabulary
   - Run through `humanizer` skill to remove AI writing patterns
5. Optionally generate concept images via `nano-banana` skill
6. Present all 3 candidates to user
7. Ask: "Pick a candidate, or paste your own copy"
8. Update the build plan from Phase 3 with the chosen design

---

## Phase 5: BUILD

Reference the `webflow-mcp` skill. Read before write — always.

1. Build section in Webflow via MCP using the approved plan
2. Follow Client First conventions:
   - Section > padding wrapper > container > content hierarchy
   - Use variables from `figma-tokens.json` — never hardcode hex values
   - Apply classes from `class-reference.md`
   - Max 3 nesting levels per `element_builder` call
3. Apply client override rules if loaded (e.g. no-embeds, anti-patterns)
4. **MCP fallback pipeline:**
   - First attempt fails → retry once
   - Second attempt fails → generate HTML output with Client First classes
     and manual placement instructions for the user

---

## Phase 6: VERIFY

### Fixed core checks (always run)

| Check | Method | Pass criteria |
|-------|--------|---------------|
| Desktop | Webflow MCP `element_snapshot_tool` | Section renders, correct hierarchy |
| Tablet | Resize check if Chrome DevTools connected | No overflow, readable |
| Mobile | Resize check if Chrome DevTools connected | No overflow, touch targets >= 44px |
| Content | Visual inspection | No placeholder text, no lorem ipsum |

### Context-aware extras (run if applicable)

Add checks based on what was built:
- **Form:** action URL set, validation present, success state configured
- **CTA:** link target set, button has hover state
- **Image:** alt text present, reasonable file size
- **CMS:** dynamic fields bound correctly
- **Component:** matches source component, overrides applied cleanly

### Chrome DevTools checks (if connected)

Reference the `chrome-devtools` skill for MCP guard pattern.

1. `navigate_page` to staging URL
2. `list_console_messages` with `types: ["error"]` — no JS errors
3. `take_screenshot` at desktop (1280x800) and mobile (375x812)
4. Check contrast ratios via `evaluate_script`
5. Check touch target sizes via `evaluate_script`
6. `lighthouse_audit` with `categories: ["accessibility", "best-practices"]`
   — WARN below 90, FAIL below 70

---

## Phase 7: LOG

Write build entry to `projects/<client>/.claude/logs/build-log.json`:

```json
{
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "page": "page-slug",
  "section": "section-description",
  "type": "new | edit | replace",
  "goal": "convert | inform | engage | trust",
  "audience": "segment-name",
  "elements_created": 0,
  "variables_used": [],
  "classes_applied": [],
  "verification": "passed | failed | partial",
  "notes": ""
}
```

If the log file doesn't exist, create it with `{ "builds": [] }`.
Append the new entry to the `builds` array.

---

## Phase 8: REPORT

1. Summarise what was built:
   - Page and section
   - Elements created
   - Variables and classes used
   - Verification result

2. If Slack MCP connected: format and post using the `slack-message` skill
3. If not: present a copy-paste Slack block

4. If `site-config.json` has `specialPages.changelog`:
   - Note the changelog page for manual update (or CMS write if configured)

---

## Weekly review (with `--review` flag)

Skip all phases except client resolution (Phase 1 steps 1-3). Then read `logs/build-log.json` and generate:

- Total builds since last review
- Pages modified
- New elements created
- Variables and classes used (frequency)
- Verification pass rate
- Any failed or partial verifications to revisit

Present as formatted summary. Optionally post to Slack.

ARGUMENTS: $ARGUMENTS
