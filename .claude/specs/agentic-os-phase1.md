# Agentic OS — Phase 1: Learning Infrastructure

> Inspired by Simon Scrapes' Agentic OS blueprint. Phase 1 focuses exclusively
> on the learning system — the feedback loop that makes the system get smarter
> over time. No new creative skills, no cron, no brand context files yet.

---

## Goal

Add a learning infrastructure layer to the existing Claude Code setup so that:

1. Every session starts with consistent context (heartbeat)
2. Every session ends with captured learnings (meta-wrap-up)
3. Learnings are scoped per-skill, not global (learnings.md)
4. Long-term knowledge is promoted from daily memories (MEMORY.md)
5. Skills are registered in a catalog for future interconnection (catalog.json)

---

## Architecture

### File structure (global `~/.claude/`)

```
~/.claude/
├── CLAUDE.md                        ← updated with heartbeat instructions
├── context/
│   ├── SOUL.md                      ← who you are, how you behave
│   ├── USER.md                      ← who you're helping, preferences
│   ├── MEMORY.md                    ← long-term business knowledge
│   ├── learnings.md                 ← per-skill learnings journal
│   └── memory/
│       └── {YYYY-MM-DD}.md          ← daily session logs
├── brand_context/
│   ├── _self/                       ← YOUR business
│   │   ├── brand-voice.md
│   │   ├── icp.md
│   │   └── positioning.md
│   └── {client}/                    ← per-client (Phase 2+)
│       ├── brand-voice.md
│       ├── icp.md
│       └── positioning.md
├── skills/
│   ├── _catalog/catalog.json        ← skill registry
│   └── meta-wrap-up/SKILL.md        ← end-of-session feedback skill
└── cron/                            ← placeholder for Phase 2
```

### What stays in project `.claude/`

The existing webflow-scripts `.claude/` is unchanged. All 26 skills, 11 agents,
13 commands remain project-scoped. The project CLAUDE.md gets one addition:
a pointer to global context files.

---

## Phase 1 Deliverables

### 1. SOUL.md — Identity & Principles

Location: `~/.claude/context/SOUL.md`

Purpose: defines how the AI behaves across all sessions. Read at every session
start. Should be concise (≤50 lines).

Contents:
- Your name and role
- Working principles (e.g. "ship small, verify everything")
- Communication style (concise, educational, no fluff)
- Decision-making defaults (e.g. "prefer simple over clever")
- What you value in output quality

### 2. USER.md — About You

Location: `~/.claude/context/USER.md`

Purpose: who the AI is helping — your business, preferences, and working style.
Read at every session start. ≤40 lines.

Contents:
- Name, business, role
- Website, location
- Key preferences (tools, frameworks, workflow)
- Current business focus (Webflow dev + transitioning to AI consulting)
- Communication preferences

### 3. MEMORY.md — Long-Term Knowledge

Location: `~/.claude/context/MEMORY.md`

Purpose: business context, decisions, and facts that matter across weeks and
months. Updated by meta-wrap-up when session insights are worth persisting.
Read at every session start. ≤150 lines.

Contents:
- Key facts (clients, tech stack, important URLs)
- Decisions & preferences (confirmed across multiple sessions)
- Important dates and milestones

Note: this is the GLOBAL memory. The existing project-scoped MEMORY.md in
`~/.claude/projects/*/memory/MEMORY.md` continues to work for project-specific
knowledge. Global MEMORY.md holds cross-project business knowledge.

### 4. learnings.md — Per-Skill Learnings Journal

Location: `~/.claude/context/learnings.md`

Purpose: auto-maintained by skills. Each skill has its own section. Skills
append after deliverable feedback (via meta-wrap-up). Skills read only their
own section before running. Cross-skill insights go in `## general`.

Format:
```markdown
# Learnings Journal

> Auto-maintained by Agentic OS skills.
> Newest entries at the bottom of each section.
> Skills append here after deliverable feedback.
> Section headings match skill folder names exactly.
> Skills read only their own section before running.
> Cross-skill insights go in `general`.

## general

## meta-wrap-up

## gsap-scrolltrigger

## barba-js

...
```

Line budget: each skill section ≤20 entries. When a section exceeds 20,
the oldest entries should be consolidated or pruned by cron (Phase 2).
Until cron exists, meta-wrap-up warns when a section is >15 entries.

### 5. Daily memory files

Location: `~/.claude/context/memory/{YYYY-MM-DD}.md`

Purpose: raw session logs for the day. Multiple sessions append to the same
day's file.

Format:
```markdown
## Session 1

### Goal
{what the user wanted to accomplish}

### What happened
- {key actions, decisions, outcomes}
- {bugs found, patterns discovered}
- {skills used and their effectiveness}

### Learnings
- {anything worth remembering}

## Session 2
...
```

Created by meta-wrap-up at end of session. If the file already exists (second
session that day), append a new `## Session N` block.

### 6. meta-wrap-up skill

Location: `~/.claude/skills/meta-wrap-up/SKILL.md`

Triggers: user says "wrap up", "close session", "end session", "we're done",
"that's it for today", or invokes `/wrap-up`.

Steps:
1. **Review deliverables** — list what was accomplished this session
2. **Collect feedback** — ask user: "What worked well? Anything I should do
   differently?" (one question, keep it lightweight)
3. **Write daily memory** — append session block to
   `context/memory/{today}.md`
4. **Update learnings.md** — if feedback mentions a specific skill, append
   to that skill's section. If general, append to `## general`.
5. **Update MEMORY.md** — if any learning is durable (confirmed pattern,
   key decision, important fact), promote it to MEMORY.md
6. **Check learnings.md section sizes** — warn if any section >15 entries
   ("Section `gsap-scrolltrigger` has 18 entries — consider running
   consolidation when cron is available")
7. **Commit work** — stage and commit all changes with a descriptive message

Does NOT:
- Trigger for content writing, voice extraction, or positioning tasks
- Modify skills directly (that's for Phase 2 skill evolution)
- Run consolidation (that's for Phase 2 cron)

### 7. Heartbeat (CLAUDE.md update)

Add to the **global** `~/.claude/CLAUDE.md`:

```markdown
## Heartbeat

Before doing anything else in any session:

1. Read `context/SOUL.md` — who you are, how you behave
2. Read `context/USER.md` — who you're helping and their preferences
3. Read `context/MEMORY.md` — long-term business knowledge
4. Read `context/memory/{today}.md` + `context/memory/{yesterday}.md`
   — recent session context
5. Create or open today's memory file — if `context/memory/{YYYY-MM-DD}.md`
   doesn't exist, create it with a session start timestamp. If it already
   exists (second session today), append a new session header.
6. Scan `brand_context/` — what exists? Flag anything older than 90 days:
   "Your [file] is from [date]. Want to refresh, or keep going?"
7. Check `context/memory/` — if >7 daily memory files exist without a
   corresponding weekly summary, warn: "You have {N} daily memory files
   without consolidation. Want me to summarise them now, or keep going?"
8. Scan `.claude/skills/` — know what skills are installed and available
```

### 8. catalog.json — Skill Registry

Location: `~/.claude/skills/_catalog/catalog.json`

Purpose: register all skills (global + project) with metadata for future
routing and interconnection. Phase 1 is read-only — just a registry.
Phase 2 adds dependency resolution and auto-routing.

Format:
```json
{
  "version": "1.0.0",
  "core_skills": ["meta-wrap-up"],
  "skills": {
    "meta-wrap-up": {
      "category": "meta",
      "description": "End-of-session feedback, learnings, and commit",
      "requires_services": [],
      "reads": ["context/MEMORY.md", "context/learnings.md"],
      "writes": ["context/memory/*", "context/learnings.md", "context/MEMORY.md"]
    },
    "gsap-scrolltrigger": {
      "category": "dev",
      "location": "project",
      "description": "GSAP and ScrollTrigger animation patterns for Webflow",
      "requires_services": [],
      "reads": ["context/learnings.md#gsap-scrolltrigger"],
      "writes": []
    }
  }
}
```

Categories: `meta` (system), `dev` (development), `mkt` (marketing),
`tool` (utility), `ops` (operations), `str` (strategy), `viz` (visualization).

Phase 1: register existing 26 project skills + meta-wrap-up.
Phase 2+: add `chains_to`, `requires`, and routing logic.

### 9. brand_context/_self/ — Your Business Context

Location: `~/.claude/brand_context/_self/`

Phase 1 creates the directory and empty templates for:
- `brand-voice.md` — how you communicate (tone, vocabulary, do/don't)
- `icp.md` — ideal customer profile for your consulting business
- `positioning.md` — what you do, for whom, why you're different

These are templates only in Phase 1. Fill them in when ready. The heartbeat
scans `brand_context/` and flags unfilled templates after 90 days.

---

## Phases Overview

| Phase | Focus | Deliverables |
|-------|-------|-------------|
| **1** (this spec) | Learning infrastructure | SOUL.md, USER.md, MEMORY.md, learnings.md, daily memory, meta-wrap-up, heartbeat, catalog.json, brand_context templates |
| **2** | Cron + consolidation | ops-cron skill, daily→weekly memory consolidation, learnings.md pruning, skill audit, Claude Code update checks |
| **3** | Brand context + creative skills | Fill brand_context files, add mkt-copywriting, mkt-research, mkt-content-repurposing skills |
| **4** | Skill interconnection | catalog.json routing, skill chaining, auto-suggestion, meta-skill-creator for client work |

Each phase is ≤1 week of work. Phase 2 starts only after Phase 1 has been
used for at least 2 weeks and daily memories have accumulated enough data
to make consolidation valuable.

See outline specs for Phases 2–4: `agentic-os-phase2-outline.md`,
`agentic-os-phase3-outline.md`, `agentic-os-phase4-outline.md`.

---



---

## Token Budget

### Per-session context cost (heartbeat reads)

| File | Est. lines | Est. tokens |
|------|-----------|-------------|
| SOUL.md | 50 | ~500 |
| USER.md | 40 | ~400 |
| MEMORY.md | 150 | ~1,500 |
| today's memory | 30 | ~300 |
| yesterday's memory | 30 | ~300 |
| **Total** | **300** | **~3,000** |

This is ~3k tokens added to every session. Acceptable — it's less than
a single skill file.

### Per-skill learnings read

When a skill runs, it reads only its section from learnings.md (~20 entries,
~200 tokens). Not loaded unless the skill is invoked.

### meta-wrap-up cost

End-of-session: reads deliverables + asks 1 question + writes to 2-3 files.
Estimated ~5-8k tokens per wrap-up. Comparable to a single code review.

---

## Migration Plan

### What moves

- `~/.claude/CLAUDE.md` — add heartbeat section
- Nothing else moves. Project `.claude/` is untouched.

### What's new (global)

- `~/.claude/context/` — SOUL.md, USER.md, MEMORY.md, learnings.md, memory/
- `~/.claude/brand_context/_self/` — templates
- `~/.claude/skills/meta-wrap-up/SKILL.md`
- `~/.claude/skills/_catalog/catalog.json`
- `~/.claude/cron/` — empty placeholder

### What's NOT touched

- `webflow-scripts/.claude/` — all existing skills, agents, commands unchanged
- `webflow-scripts/CLAUDE.md` — unchanged
- Project-scoped `memory/MEMORY.md` — continues to work for project knowledge
- Existing hooks, settings — unchanged

---

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Context bloat from heartbeat | Low | Hard line budgets: SOUL ≤50, USER ≤40, MEMORY ≤150 |
| learnings.md grows unbounded | Medium | Per-section cap of 20 entries, meta-wrap-up warns at 15 |
| Daily memory files accumulate | Low | Phase 2 cron consolidates daily→weekly. Until then, manual cleanup |
| meta-wrap-up adds friction | Low | Keep it to 1 question. User can skip with "no feedback" |
| Heartbeat reads slow session start | Low | 5 small file reads, <3k tokens total |
| Global vs project MEMORY.md confusion | Medium | Clear naming: global = business knowledge, project = technical knowledge |

---

## Verify Loop

Build-time verification — all checks run after implementation.

### File existence checks

All of the following files must exist:

1. `~/.claude/context/SOUL.md`
2. `~/.claude/context/USER.md`
3. `~/.claude/context/MEMORY.md`
4. `~/.claude/context/learnings.md`
5. `~/.claude/context/memory/` (directory exists)
6. `~/.claude/brand_context/_self/brand-voice.md`
7. `~/.claude/brand_context/_self/icp.md`
8. `~/.claude/brand_context/_self/positioning.md`
9. `~/.claude/skills/meta-wrap-up/SKILL.md`
10. `~/.claude/skills/_catalog/catalog.json`
11. `~/.claude/cron/` (directory exists)

### Content validation

- `SOUL.md` ≤ 50 lines
- `USER.md` ≤ 40 lines
- `MEMORY.md` ≤ 150 lines
- `learnings.md` contains `## general` and `## meta-wrap-up` section headers
- `catalog.json` is valid JSON, has `version` and `skills` keys, `meta-wrap-up` is registered
- `meta-wrap-up/SKILL.md` has YAML frontmatter with `name: meta-wrap-up`

### Heartbeat wiring

- `~/.claude/CLAUDE.md` contains a `## Heartbeat` section
- Heartbeat section references `context/SOUL.md`, `context/USER.md`, `context/MEMORY.md`

### Smoke test

- Run the meta-wrap-up skill file through a basic syntax check (valid YAML frontmatter)
- Confirm catalog.json registers ≥ 20 skills (26 project + 1 global)

---

## Success Criteria

Phase 1 is successful when:

1. Every session starts with heartbeat context loaded
2. ≥80% of sessions end with meta-wrap-up capturing learnings
3. After 2 weeks, learnings.md has entries for ≥5 different skills
4. MEMORY.md contains ≥10 promoted long-term facts
5. Daily memory files exist for ≥10 working days
6. You can point to ≥3 instances where a learning from a previous session
   improved output in a later session
