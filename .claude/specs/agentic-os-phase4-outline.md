# Agentic OS — Phase 4 Outline: Skill Interconnection + Meta-Skills

> Outline spec — to be expanded into a full spec when Phase 4 begins.
> Depends on: Phase 3 creative skills in regular use + catalog.json populated.

---

## Trigger to Start

Phase 4 begins when ALL of:
- ≥10 skills registered in catalog.json (mix of dev, mkt, meta, tool)
- learnings.md#general shows cross-skill patterns ("after research I always
  run copywriting", "design review should chain to code review")
- You're actively doing AI consulting work and need the meta-skill-creator

---

## Goal

Make skills aware of each other. The system suggests skill chains, auto-routes
conversational requests to the right skill, and can build new skills for
client projects. This is where the "agentic" in Agentic OS earns its name.

---

## Deliverables

### 1. Skill chaining in catalog.json

Add `chains_to` and `triggered_by` fields to catalog entries:

```json
{
  "str-research": {
    "chains_to": ["mkt-copywriting", "mkt-content-repurposing"],
    "triggered_by": ["new client onboarding", "content planning"]
  },
  "mkt-copywriting": {
    "chains_to": ["mkt-content-repurposing"],
    "triggered_by": ["proposal writing", "website update"]
  }
}
```

After a skill completes, the system reads `chains_to` and suggests:
"Research complete. Based on your catalog, you usually run copywriting
next. Want to proceed?"

### 2. Conversational auto-routing

Update global CLAUDE.md with routing logic:

```markdown
## Skill Routing

When the user describes a task conversationally (not via slash command):
1. Read catalog.json
2. Match the task description against skill descriptions and `triggered_by`
3. If confidence ≥80%: suggest the skill ("This sounds like a job for
   mkt-copywriting. Want me to invoke it?")
4. If confidence <80%: ask the user which skill applies, or proceed manually
5. Never auto-invoke — always suggest and confirm
```

This is the "hybrid" interaction model: slash commands for defined workflows,
conversational routing for open-ended work.

### 3. meta-skill-creator

Location: `~/.claude/skills/meta-skill-creator/SKILL.md`

The skill that builds skills. Used for:
- **Your own system**: when learnings show you need a new skill, this one
  scaffolds it with the right structure, registers it in catalog.json,
  adds a section to learnings.md, and creates the brand_context reads
- **Client work**: build custom Claude Code skills/plugins for consulting
  clients. This is the productised version of your AI consulting offering.

Steps:
1. **Discover intent** — what should the skill do? Who's it for?
2. **Check existing** — scan catalog.json for overlap. Suggest extending
   an existing skill vs creating a new one.
3. **Scaffold** — create `skills/{category}-{name}/SKILL.md` with YAML
   frontmatter, the right `reads`/`writes` declarations, and a learnings
   section stub.
4. **Register** — add to catalog.json with category, description,
   chains_to, triggered_by.
5. **Test** — run the skill on a sample task, collect feedback via
   meta-wrap-up pattern, write initial learnings.

For client skills, the output is a deliverable: a `.claude/skills/` directory
they can drop into their project.

### 4. Skill versioning

Add `version` field to catalog.json entries. When meta-wrap-up feedback
flags a skill issue, the version is noted. When the skill is updated,
version increments. This creates a change log:

```json
{
  "mkt-copywriting": {
    "version": "1.2.0",
    "changelog": [
      { "version": "1.2.0", "date": "2026-06-01", "change": "Added LinkedIn tone variant" },
      { "version": "1.1.0", "date": "2026-05-15", "change": "Fixed overly formal proposal copy" },
      { "version": "1.0.0", "date": "2026-05-01", "change": "Initial release" }
    ]
  }
}
```

ops-cron audit checks for skills that haven't been updated in >90 days
despite having learnings entries (suggests the feedback isn't being applied).

### 5. Cross-skill learnings promotion

Update meta-wrap-up to detect when a learning applies to multiple skills:

- If feedback mentions 2+ skills → write to `## general` in learnings.md
- If a pattern in `## general` has been referenced by 3+ skills → promote
  to MEMORY.md as a durable principle
- If a `## general` pattern directly contradicts a skill-specific learning →
  flag for review

### 6. Skill health dashboard

A `/status skills` command (or add to existing `/status`) that shows:

```
Skill Health Report
───────────────────
mkt-copywriting    v1.2.0  │ 12 uses │ 5 learnings │ last: 2d ago  │ ✅ healthy
str-research       v1.0.0  │  3 uses │ 2 learnings │ last: 14d ago │ ⚠️ low usage
gsap-scrolltrigger v1.0.0  │ 28 uses │ 8 learnings │ last: 1d ago  │ ✅ healthy
meta-wrap-up       v1.1.0  │ 40 uses │ 3 learnings │ last: today   │ ✅ healthy
ops-cron           v1.0.0  │  6 uses │ 0 learnings │ last: 7d ago  │ ⚠️ no learnings
```

Reads from catalog.json (version, usage count) and learnings.md (entry count).

---

## Estimated Scope

- Skill chaining logic: ~1 day
- Auto-routing in CLAUDE.md: ~2 hours
- meta-skill-creator: ~1 day (complex — it's a skill that builds skills)
- Skill versioning: ~2 hours
- Cross-skill learnings: ~2 hours (meta-wrap-up update)
- Health dashboard: ~2 hours
- **Total**: ~1 week

---

## Risks

| Risk | Mitigation |
|------|------------|
| Auto-routing is wrong/annoying | Never auto-invoke, always suggest. User can disable routing in CLAUDE.md |
| Skill chaining creates rigid workflows | `chains_to` is a suggestion, not a pipeline. User always chooses |
| meta-skill-creator produces low-quality skills | Built-in test step. First use is always your own system, not client work |
| catalog.json becomes complex to maintain | ops-cron audit catches inconsistencies. Health dashboard surfaces issues |
| Over-engineering the interconnection layer | Only add chaining for skills you actually use in sequence. YAGNI. |

---

## Success Criteria

- Skill chaining suggestions are accepted ≥50% of the time
- Auto-routing correctly identifies the right skill ≥70% of the time
- meta-skill-creator has built ≥2 skills (1 for you, 1 for a client)
- Skill versioning shows ≥3 skills with version >1.0.0 (they've evolved)
- Health dashboard runs without errors and surfaces actionable insights
- You've delivered a custom skill to a consulting client as a paid deliverable
