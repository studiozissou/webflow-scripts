# Agentic OS — Phase 2 Outline: Cron + Consolidation

> Outline spec — to be expanded into a full spec when Phase 2 begins.
> Depends on: Phase 1 complete + 2 weeks of accumulated daily memories.

---

## Trigger to Start

Phase 2 begins when ALL of:
- Phase 1 meta-wrap-up has been used for ≥2 weeks
- ≥10 daily memory files exist in `context/memory/`
- ≥1 learnings.md section has >10 entries (consolidation is needed)
- Phase 1 success criteria met (see Phase 1 spec)

---

## Goal

Add system hygiene automation so the learning infrastructure stays clean,
compact, and useful without manual intervention.

---

## Deliverables

### 1. ops-cron skill

Location: `~/.claude/skills/ops-cron/SKILL.md`

A manually-triggered skill (not actual cron) invoked via `/cron` or
conversationally ("run maintenance", "consolidate memories").

Sub-commands:
- `/cron daily` — consolidate today's memory file: merge redundant entries,
  sharpen vague notes, promote durable insights to MEMORY.md
- `/cron weekly` — consolidate the past 7 daily files into a single
  `context/memory/{YYYY}-W{WW}.md` weekly summary. Archive (don't delete)
  the daily files. Prune learnings.md sections that exceed 20 entries.
- `/cron audit` — scan all skills against catalog.json:
  - Flag skills not in catalog (unregistered)
  - Flag catalog entries with no matching skill file (orphaned)
  - Check skill file sizes (warn if >200 lines)
  - Check learnings.md section sizes (warn if >20 entries)
  - Check brand_context/ for files older than 90 days
- `/cron updates` — check Anthropic's Claude Code changelog for new releases.
  Compare installed version against latest. Flag breaking changes or new
  features relevant to the skill system.

### 2. Weekly memory format

Location: `~/.claude/context/memory/{YYYY}-W{WW}.md`

Consolidated from 5-7 daily files. Format:
```markdown
# Week {WW} — {Mon date} to {Sun date}

## Key accomplishments
- {3-5 bullet points}

## Patterns observed
- {recurring themes across the week}

## Decisions made
- {important choices and their rationale}

## Open threads
- {unfinished work, things to revisit}
```

Line budget: ≤60 lines per weekly file.

### 3. Consolidation rules

Location: `~/.claude/cron/consolidation-rules.md`

Instructions for the cron skill on how to consolidate:
- **Daily→Weekly**: group by theme, not by session. Merge duplicate insights.
  Discard one-off debugging notes that don't generalise.
- **learnings.md pruning**: keep the 15 most recent/relevant entries per
  section. Merge entries that say the same thing differently. Promote
  universally true patterns to `## general`.
- **MEMORY.md promotion**: if a fact appears in ≥3 daily/weekly memories,
  promote it to MEMORY.md. If MEMORY.md exceeds 150 lines, consolidate
  the oldest entries.

### 4. Heartbeat update

Update the heartbeat to read the most recent weekly summary instead of
yesterday's memory (if a weekly exists for the previous week). This keeps
context fresh without loading raw daily files from past weeks.

```
Read order:
1. SOUL.md
2. USER.md
3. MEMORY.md
4. This week's weekly summary (if exists) OR last 2 daily files
5. Today's daily memory
```

---

## Estimated Scope

- ops-cron skill: ~150 lines
- Consolidation rules: ~50 lines
- Weekly memory template: ~20 lines
- Heartbeat update: ~10 lines
- catalog.json update: add ops-cron entry
- **Total**: ~1-2 days of work

---

## Token Cost

- `/cron daily`: reads 1 daily file + MEMORY.md, writes 1-2 files. ~5k tokens.
- `/cron weekly`: reads 5-7 daily files + learnings.md, writes 2-3 files. ~15k tokens.
- `/cron audit`: reads catalog.json + scans skill dirs. ~5k tokens.
- `/cron updates`: 1 web fetch + comparison. ~3k tokens.
- **Weekly total** (1 daily + 1 weekly + 1 audit): ~25k tokens/week.

Use Haiku for daily consolidation, Sonnet for weekly and audit.

---

## Risks

| Risk | Mitigation |
|------|------------|
| Over-consolidation loses useful detail | Keep daily files as archive, don't delete |
| Cron never gets run (user forgets) | Heartbeat nag: "Last consolidation was {N} days ago" after 10 days |
| Weekly summaries become generic | Consolidation rules enforce specificity — no "worked on various things" |

---

## Success Criteria

- Weekly consolidation runs ≥3 times in first month
- learnings.md sections stay under 20 entries
- MEMORY.md stays under 150 lines
- No daily memory files older than 4 weeks without a corresponding weekly
