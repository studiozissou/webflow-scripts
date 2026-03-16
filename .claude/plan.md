# Plan: UX, Copywriting & Art Direction Process Commands

## What we're building

Three new commands + one shared skill + three agent updates that bring design critique workflows on par with `/plan` and `/build` — with rich context inputs (inspiration, goals, art direction, brand voice) feeding every agent.

---

## 1. Shared skill: `design-context`

**File:** `.claude/skills/design-context/SKILL.md`

**Purpose:** Standardised context-gathering step reused by all three commands. Collects:

| Input | Description | Required? |
|-------|-------------|-----------|
| Design input | Screenshot path, Figma URL, live URL, or MCP snapshot | Yes |
| Design inspiration | Reference URLs, mood boards, competitor sites, style keywords | No (but prompted) |
| Art direction | Visual tone (bold/minimal/editorial/brutalist), colour intent, type feel, motion style | No (but prompted) |
| Project goals | What this design needs to achieve — conversion, brand awareness, portfolio showcase, etc. | No (but prompted) |
| Brand voice | Tone adjectives (confident, playful, authoritative), audience, do/don't word lists | No (for copy-review) |
| Existing context | Auto-reads `.claude/client.md`, `.claude/design/figma-tokens.json`, `.claude/specs/*.md` if they exist | Automatic |

Uses `AskUserQuestion` with structured options + free text for each input category.
Outputs a **Design Context Block** (markdown) that gets injected into every agent prompt.

---

## 2. Command: `/design-review`

**File:** `.claude/commands/design-review.md`

**Purpose:** Upload a design (screenshot/URL/Figma), provide context, get parallel UX + art direction + copy critique.

### Process:
1. **Gather context** — invoke `design-context` skill to collect all inputs
2. **Parallelisation gate** — 3 streams (ux-researcher, art-director, content), all read-only
3. **Fan out 3 agents in parallel**, each receives:
   - The design input (image/URL)
   - The full Design Context Block (inspiration, art direction, goals, brand voice)
   - Their domain-specific review checklist
4. **Merge results** — unified report with prioritised findings
5. **Output** — saved to `.claude/research/design-review-<slug>-<YYYY-MM-DD>.md`

### Agent review lenses (fed by context):

- **UX researcher**: evaluates against goals (does the layout serve the stated purpose?), checks flow, hierarchy, mobile, cognitive load — benchmarks against provided inspiration sites
- **Art director**: critiques visual execution against stated art direction (is it bold enough? does the type feel match?), compares to inspiration references, checks motion intent
- **Content agent**: reviews copy against brand voice inputs, checks CTAs serve stated goals, evaluates heading hierarchy and microcopy

---

## 3. Command: `/design-iterate`

**File:** `.claude/commands/design-iterate.md`

**Purpose:** Iterative design feedback loop — review → suggest changes → apply → re-review.

### Process:
1. **Gather context** — same `design-context` skill
2. **Initial review** — parallel UX + art direction critique (same as `/design-review` steps 2-4)
3. **Prioritise and propose** — rank issues, propose concrete changes (CSS/JS/layout), show before/after
4. **User selects** — which changes to apply (AskUserQuestion with multi-select)
5. **Apply changes** — spawn `code-writer` agent to implement selected fixes
6. **Re-review loop** — re-run the parallel critique on the updated version
   - If new issues found → propose next round of changes
   - If clean → exit with final report
   - Max 5 iteration cycles (ask user to continue after 5)
7. **Output** — iteration log saved to `.claude/research/design-iterate-<slug>-<YYYY-MM-DD>.md`

This is the `/build` verify loop pattern applied to design critique.

---

## 4. Command: `/copy-review`

**File:** `.claude/commands/copy-review.md`

**Purpose:** Standalone deep content audit with brand voice context.

### Process:
1. **Gather context** — `design-context` skill, with emphasis on brand voice inputs:
   - Tone adjectives (3-5 words describing voice)
   - Target audience
   - Competitor copy references (URLs)
   - Do/don't word lists
   - Content goals (inform, convert, entertain, reassure)
2. **Content extraction** — pull all visible text from the design (screenshot OCR, MCP DOM, or URL fetch)
3. **Parallel content critique** — 2 streams:
   - **Stream 1 — Content agent**: copy quality, CTAs, heading hierarchy, microcopy, aria-labels
   - **Stream 2 — UX researcher**: information architecture, content placement, user flow through copy
4. **Rewrite suggestions** — for each flagged piece of copy, provide 2-3 alternatives ranked by preference, with rationale tied to stated brand voice and goals
5. **Output** — saved to `.claude/research/copy-review-<slug>-<YYYY-MM-DD>.md`

---

## 5. Agent updates

### `art-director.md` — add:
- **Design context section**: instructions to evaluate against provided inspiration, art direction brief, and goals
- **Image input**: note that the agent may receive screenshots/images to critique directly
- **Comparison mode**: when inspiration URLs are provided, fetch and compare visual patterns

### `ux-researcher.md` — add:
- **Goal-driven evaluation**: assess layouts against stated project goals
- **Inspiration benchmarking**: when reference sites provided, compare UX patterns
- **Image input**: can receive screenshots for heuristic evaluation

### `content.md` — add:
- **Brand voice framework**: evaluate copy against provided tone adjectives and audience
- **Goal alignment**: check if copy serves stated content goals
- **Competitor voice analysis**: when competitor URLs provided, compare voice and positioning

---

## 6. Files to create/modify

| Action | File |
|--------|------|
| Create | `.claude/skills/design-context/SKILL.md` |
| Create | `.claude/commands/design-review.md` |
| Create | `.claude/commands/design-iterate.md` |
| Create | `.claude/commands/copy-review.md` |
| Modify | `.claude/agents/art-director.md` |
| Modify | `.claude/agents/ux-researcher.md` |
| Modify | `.claude/agents/content.md` |

---

## 7. How it connects to existing workflow

```
/figma-audit → /component-plan → /style-guide → /plan → /build
                                       ↓
                              /design-review  ← run after build, or standalone on any design
                              /design-iterate ← iterative refinement loop
                              /copy-review    ← standalone or as part of /design-review
```

All three commands can run:
- **Standalone** — on any screenshot, URL, or Figma frame
- **Post-build** — after `/build` completes, review the result
- **Pre-build** — critique a Figma design before implementation begins
