# Carsa Webflow Skill v2 — Analysis & Upgrade Spec

## Overview
Upgrade the `carsa-webflow` skill from a passive reference document into a full build workflow with planning, component reuse, reporting, optional testing, and MCP failure resilience. Also create a `/carsa-build` command to orchestrate the workflow.

---

## Part 1: Skill Assessment (Current State)

### Skill-Creator Best Practices Audit

| Criterion | Status | Notes |
|-----------|--------|-------|
| YAML frontmatter (name, description) | PASS | Description is thorough and "pushy" — good triggering language |
| XML structure tags | FAIL | No `<objective>`, `<quick_start>`, `<reference_guides>`, `<success_criteria>` tags. Uses flat markdown with `---` separators. Skill-creator recommends XML body tags for structured skills |
| Progressive disclosure | WARN | Everything is in SKILL.md (~334 lines, under 500 limit). No bundled references/ for heavy content like the full class reference or SEO templates |
| Success criteria | FAIL | No explicit success criteria section. Anti-patterns partially cover this, but there's no positive "what good looks like" checklist |
| Examples | PASS | Worked example for CTA section is excellent — shows both component-reuse path and element-builder path |
| Why over MUST | WARN | Good in places (code embed rule explains CWV/drift reasoning), but anti-patterns section is list-of-rules without reasoning for each |
| Triggering description | PASS | Very thorough — covers "Webflow", "the website", "carsa.co.uk", specific page names, and the "any write tool" catch-all |
| Audience calibration | FAIL | Written for a developer-level agent operator. A non-developer client using Claude Code needs simpler language, clearer decision trees, and more guardrails |

### Client First Comparison (vs Project Skill)

| Convention | Project Skill | Carsa Skill | Risk Level |
|-----------|---------------|-------------|------------|
| **padding-global placement** | On section element: `section.padding-global > container > padding-section` | On child DivBlock: `section_id > DivBlock[padding-global, padding-section] > DivBlock[container]` | **CRITICAL** — these are incompatible DOM hierarchies. The Carsa skill documents the actual Carsa site structure correctly. The project skill is generic Client First. **No change needed** — Carsa skill is correct for this site |
| **Spacing method** | Spacer divs only (`spacer-*`), margin forbidden | Margin utility classes (`margin-top/bottom` + size tokens) | **HIGH** — fundamentally different approaches. Carsa uses margins, not spacer divs. Skill is correct for Carsa but should explicitly note this divergence |
| **Two-tier variable system** | Full primitives (`brand-*`, `neutral-*`) → semantics (`background-color-*`, `text-color-*`) | Just "use variables, not hardcoded values" | **HIGH** — if the client creates new variables, there's no naming guidance. Risk of one-off variables polluting the system |
| **Layout utilities** | Full set: `hide-*`, `overflow-*`, `z-index-*`, `aspect-ratio-*`, `pointer-events-*`, `icon-*`, `align-center`, `layer` | Not documented | **MEDIUM** — agent won't reach for these when they're the correct solution |
| **Background colour classes** | `background-color-primary/secondary/tertiary/alternate` | Not in class reference | **MEDIUM** — agent may hardcode section backgrounds instead of using utility classes |
| **Size variables with breakpoint modes** | Documented (automatic/manual modes, `clamp()` support) | Not mentioned | **LOW** — unlikely for client-driven builds, but could cause issues with responsive work |
| **Typography gaps** | `text-style-*` (italic, uppercase, etc.), full `text-weight-*` range | Missing `text-style-*` entirely, missing `light` and `xbold` weights, missing `medium` text-size | **LOW** — partial coverage, minor risk |

### Key Risks

1. **No planning phase** — Client goes straight to building. No questions asked, no component check, no design review. High risk of building something that already exists or doesn't match the site's visual language.

2. **No build log** — No record of what was built, when, by whom, or what was changed. Weekly reviews are impossible without this.

3. **MCP reliability** — Webflow MCP hangs frequently. The skill has no fallback strategy — if MCP dies mid-build, work is lost or half-applied.

4. **No quality gate** — After building, there's no verification step. Placeholder text, broken mobile layouts, missing analytics attributes could ship unnoticed.

5. **No component template page check** — The "All Components Template" page (Static Page Templates section) isn't referenced. Components may be duplicated.

6. **No undo strategy** — Webflow changes are destructive. If the client builds the wrong thing, there's no documented rollback path.

---

## Part 2: Upgrade Plan

### 2.1 Restructure Skill with XML Tags

Wrap the skill body in proper XML structure tags:
- `<objective>` — what this skill enables
- `<quick_start>` — 5-rule summary for the client
- `<reference_guides>` — Client First classes, SEO, analytics, forms
- `<success_criteria>` — positive checklist of "what good looks like"
- Move heavy reference content (full class tables, SEO templates, Finsweet attrs) to `references/` files

### 2.2 Add Planning Phase (Pre-Build)

Before any build, the skill/command must:

1. **Ask clarifying questions** — What are you building? Which page? What content? Show me a reference/screenshot if you have one.
2. **Check existing components** — Run `de_component_tool > get_all_components` to search for matching components. Also check the All Components Template page (see 2.3).
3. **Check the Style Guide** — Snapshot the style guide page to understand the current visual language.
4. **Present a plan** — "I'll insert component X with these overrides" or "No existing component matches — I'll build from scratch using these classes." Wait for user approval.
5. **Flag risks** — If building from scratch, warn: "This creates new elements. Shall I also make it a reusable component?"

### 2.3 All Components Template Page Check

Research confirms: **Webflow MCP CAN access Static Page Template pages.** The Designer API's `getAllPagesAndFolders()` returns all page types including `staticTemplate`. `switch_page` accepts any page ID — no URL needed.

**Implementation:**
1. On first use, call `de_page_tool > get_all_pages` and filter for pages with kind `staticTemplate`
2. Find the "All Components Template" page by name match
3. Cache its page ID in the skill's reporting log (so we don't re-discover every time)
4. Before building, `switch_page` to the template page, `element_snapshot_tool` to see all available component patterns
5. Cross-reference with `de_component_tool > get_all_components` results

**Risk:** If the page ID changes (unlikely but possible after site restructure), the cached ID will fail. The skill should fall back to name-based discovery.

### 2.4 Reporting System (Build Log)

Create a build log at `.claude/logs/carsa-build-log.json`:

```json
{
  "version": 1,
  "lastUpdated": "2026-04-01",
  "entries": [
    {
      "id": "build-001",
      "date": "2026-04-01",
      "builder": "client-name or agent",
      "page": "/cars",
      "pageId": "abc123",
      "action": "insert_component",
      "componentName": "C - CTA",
      "componentId": "xyz789",
      "overrides": { "Heading": "Find Your Next Car" },
      "elementTypes": ["Section", "DivBlock", "Heading", "Button"],
      "newElements": 0,
      "newStyles": 0,
      "newComponents": 0,
      "verified": true,
      "sharedToSlack": true,
      "slackMethod": "mcp",
      "notes": "Added CTA below search results grid"
    }
  ]
}
```

**Sharing: Client → Dev Team Pipeline**

This skill lives on the client's Claude instance, not ours. Reporting uses a push mechanism:

**Primary: Slack MCP auto-post (if connected)**
1. After every build, the command asks: "Want me to post this build summary to #carsa-dev?"
2. If Slack MCP is connected and user approves → post directly via `mcp__slack__send_message`
3. Message format: structured block with date, page, what was built, new styles/components, verified status

**Fallback: Copy-paste block (always available)**
If Slack MCP is not connected or user declines auto-post:
1. Output a pre-formatted Slack message block to the conversation
2. "Copy this and paste it in #carsa-dev so the team can review:"
3. Message includes the same structured info as the auto-post

**Detection:** On first run, check for Slack MCP availability. Cache the result so we don't check every time. If available, default to auto-post prompt. If not, default to copy-paste.

**Weekly review workflow:**
- Run `/carsa-build --review` to generate a markdown summary:
  - Total builds this week
  - New components created (flagged for design review)
  - New styles created (flagged for Client First compliance)
  - Pages modified
  - Unverified builds (verification was skipped)
  - Unshared builds (not posted to Slack)
- If Slack MCP connected: offer to post the weekly digest directly
- If not: output copy-paste block for the weekly summary

### 2.5 MCP Fallback Pipeline

When Webflow MCP hangs or fails:

```
Attempt 1: Direct MCP build (normal path)
    ↓ fails/hangs (30s timeout)
Attempt 2: Retry once with fresh connection check (list_pages as health ping)
    ↓ fails/hangs
Fallback: HTML output mode
    1. Generate clean HTML + CSS matching Client First conventions
    2. Output to .claude/output/carsa/<slug>.html
    3. Instruct user: "MCP is unavailable. I've generated the HTML.
       Options: (a) paste into Webflow embed temporarily,
       (b) use html-to-webflow converter, (c) wait and retry later"
    4. If using converter: run cleanup pass afterward to deduplicate
       classes and verify Client First compliance
```

**HTML output rules:**
- Use only documented Client First class names
- Include `data-analytics-event` attributes
- Add comments marking the component boundaries
- Generate a companion `.css` file ONLY for any new custom classes (not utility classes)
- Flag which utility classes are referenced so the cleanup pass can verify they exist in Webflow

### 2.6 Testing Phase (Post-Build)

After building, always present a manual test checklist. The checklist is **dynamic but simple** — a fixed core plus context-aware extras based on what was built.

**Core checklist (always shown):**

```
## Verify Your Build

Open the page in your browser and check at each breakpoint:

### Desktop (resize browser to full width)
- [ ] New section/component visible and positioned correctly
- [ ] Text readable, no overflow or cut-off
- [ ] Links/buttons go to the right place

### Tablet (resize to ~768px wide, or use Chrome DevTools device toolbar)
- [ ] Layout adapts — no horizontal scrollbar
- [ ] Text still readable

### Mobile (resize to ~390px wide)
- [ ] Content fits, no horizontal scroll
- [ ] Touch targets big enough to tap
- [ ] Nothing hidden that should be visible (or vice versa)

### Content
- [ ] No placeholder or dummy text left
- [ ] Images have alt text (hover image in Webflow to check)
- [ ] Spelling and grammar correct
```

**Context-aware extras (appended automatically based on what was built):**

| If built... | Add these checks |
|-------------|-----------------|
| Form | `- [ ] Form submits successfully (test with dummy data)` / `- [ ] Error states show correctly` / `- [ ] Labels present (even if visually hidden)` |
| CTA/button | `- [ ] data-analytics-event attribute present (check in Webflow element settings > Custom attributes)` / `- [ ] Hover state looks correct` |
| Image/video | `- [ ] Image loads (not broken placeholder)` / `- [ ] Alt text describes the image (not "image" or blank)` |
| CMS-bound content | `- [ ] Dynamic content pulls through correctly` / `- [ ] Empty state handled (what if there are 0 items?)` |
| Component instance | `- [ ] Component is still connected (blue icon in Webflow, not green detached)` / `- [ ] Only overrides were used, no internal edits` |
| Navigation/links | `- [ ] All links tested on live preview` / `- [ ] External links open in new tab` |
| Section with background | `- [ ] Text contrast sufficient on background` / `- [ ] Background colour uses a Webflow variable, not hardcoded` |

**Safari check (always appended as optional):**
```
### Safari (optional but recommended)
- [ ] Open the page in Safari — any layout differences?
- [ ] If iOS: check on actual phone if possible
```

**How the dynamic logic works in the skill:** The build log entry records what type of build was performed (`insert_component`, `build_element`, `add_form`, etc.) and what element types were created. The checklist generator reads the log entry's `action` and `elementTypes` fields and appends matching extras. Simple switch/case — no complex inference.

### 2.7 `/carsa-build` Command

Create as `.claude/commands/carsa-build.md`:

**Workflow:**
```
1. PLAN — Ask questions, check components, present approach
2. CONFIRM — Show plan, get user approval
3. BUILD — Execute via MCP (with fallback pipeline)
4. LOG — Record to build log
5. VERIFY — Optional testing phase
6. REPORT — Summary of what was built
```

**Command should:**
- Invoke the `carsa-webflow` skill automatically
- Invoke `client-first` skill for class validation
- Accept args: page name/URL, description of what to build
- Support `--review` flag to generate weekly review report
- Support `--dry-run` flag to plan without building

---

## Part 3: Task Breakdown

### Tasks

| # | Task | Agent | Est. LOC | Priority |
|---|------|-------|----------|----------|
| 1 | Restructure SKILL.md with XML tags, add success criteria, move references | code-writer | ~400 | P1 |
| 2 | Add planning phase to skill (questions, component check, plan presentation) | code-writer | ~80 | P1 |
| 3 | Add All Components Template page discovery logic to skill | code-writer | ~40 | P1 |
| 4 | Add variable naming guidance (two-tier system adapted for Carsa) | code-writer | ~30 | P2 |
| 5 | Add missing layout utility classes to reference | code-writer | ~20 | P2 |
| 6 | Create build log schema and reporting section in skill | code-writer | ~60 | P1 |
| 7 | Add MCP fallback pipeline to skill | code-writer | ~50 | P1 |
| 8 | Add post-build verification phase to skill | code-writer | ~40 | P2 |
| 9 | Create `/carsa-build` command | code-writer | ~120 | P1 |
| 10 | Add `/carsa-build` to cheatsheet | code-writer | ~5 | P1 |
| 11 | Run skill through skill-creator eval loop (2-3 test prompts) | skill-creator | — | P2 |

### Parallelisation Map

**Stream A (Skill restructure):** Tasks 1 → 2 → 3 → 4 → 5 (sequential — each builds on previous)
**Stream B (Infrastructure):** Tasks 6 → 7 → 8 (sequential — log before fallback before verify)
**Stream C (Command):** Task 9 → 10 (depends on Stream A completing task 2)
**Stream D (Eval):** Task 11 (depends on all others)

Streams A and B can run in parallel. Stream C starts after A:task2. Stream D is last.

**Recommendation:** Sequential execution preferred — this is a skill/command authoring task, not code implementation. Worktrees not needed. Agent teams overkill.

---

## Part 4: Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| MCP hangs mid-build, leaving half-applied changes | HIGH | Fallback pipeline (2.5). Also: build in small atomic steps, verify after each. Webflow has undo (Cmd+Z) in the Designer. |
| Client builds duplicate of existing component | HIGH | Planning phase (2.2) + template page check (2.3) make this unlikely |
| Client creates non-compliant styles/variables | MEDIUM | Planning phase asks approval before creating new styles. Variable naming guide (2.4) provides rules. |
| Build log grows stale if client forgets to use command | MEDIUM | Make the command the ONLY documented way to build. Skill description should say "always use /carsa-build" |
| HTML fallback output doesn't match Webflow rendering exactly | MEDIUM | HTML uses only documented utility classes. Cleanup pass catches mismatches. Client reviews before publishing. |
| Static template page ID changes | LOW | Name-based fallback discovery. Log warns if cached ID fails. |
| Client overwhelmed by too many steps | MEDIUM | Make planning phase conversational, not bureaucratic. Default to component reuse (fast path). Only ask essential questions. |

---

## Barba Impact
N/A — Carsa does not use Barba transitions.

## Acceptance Tests
No test infrastructure exists for Carsa. All verification is manual/Tier 3 via Chrome DevTools MCP or visual inspection. See 2.6 for the verification checklist.

## Verify Loop

### Pass/fail criteria
- Skill loads when any Carsa/Webflow trigger phrase is used
- `/carsa-build` command executes the full plan → confirm → build → log → verify flow
- Build log entries are written to `.claude/logs/carsa-build-log.json` after each build
- Planning phase checks `de_component_tool > get_all_components` before building
- MCP fallback produces valid HTML when MCP is unavailable
- Weekly review (`--review`) generates readable markdown summary

### Reproduction steps
1. Invoke skill with "add a CTA section to the Carsa homepage"
2. Verify planning phase asks questions and checks components
3. Verify build log entry is created
4. Disconnect MCP, retry — verify HTML fallback is produced
5. Run `/carsa-build --review` — verify markdown summary

### Tier mapping
- Tier 1: None (no Playwright for Carsa)
- Tier 2: None (no CDN regression for Carsa)
- Tier 3: All manual — verify via Claude Code conversation + Chrome DevTools screenshots

### Regression scope
- Existing Carsa pages must not be modified by skill changes
- `queue.json` format must remain compliant with queue-tasks skill
- Cheatsheet must stay in sync
