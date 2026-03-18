# Hypothesis-Driven `/plan` and `/debug`

**Date:** 2026-03-18
**Status:** Approved

## Summary

Upgrade `/plan` and `/debug` to explore multiple approaches/hypotheses in parallel before committing to a single path. Uses parallel Explore subagents (not Agent Teams) for cost efficiency (~1.1x overhead vs 2.5x).

## `/plan` — Three-Approach Exploration

### Change

Insert **Step 2.5 — Approach Exploration** between clarifying questions (Step 2) and spec writing (Steps 3–7).

### Flow

1. Lead agent reviews research findings + user answers
2. Formulates 3 distinct architectural approaches to the feature
3. Spawns 3 parallel **Explore subagents** (read-only, ~15k tokens each)
   - Each receives: feature description, research summary, user answers, and ONE specific approach to explore
   - Each investigates: feasibility, code paths affected, reusable code, estimated complexity, risks/gotchas
   - Each returns: structured assessment with confidence score (0–100)
4. Lead agent synthesizes into comparison table:

```
| Approach | Confidence | Complexity | Key Risk | Reusable Code |
|----------|-----------|------------|----------|---------------|
| A: ...   | 85        | Medium     | ...      | file.js:fn()  |
| B: ...   | 70        | Low        | ...      | utils.js:fn() |
| C: ...   | 60        | High       | ...      | none          |
```

5. Presents recommendation + table to user via `AskUserQuestion`
6. Proceeds to write spec with chosen approach (existing Steps 3–7)

### Subagent prompt template

Each Explore agent receives:

```
You are exploring ONE architectural approach for a feature.

## Feature
{feature description}

## Research Context
{research summary from Step 1 agents}

## User Requirements
{answers from Step 2 clarifying questions}

## Your Approach
{specific approach to explore — e.g. "GSAP Flip-based transition with container reparenting"}

## Your Task (read-only — do not modify files)
1. Search the codebase for patterns that support or conflict with this approach
2. Identify all files that would need changes
3. Find reusable code (functions, patterns, modules) that could be adapted
4. Assess complexity: Low (1-2 files, <100 LOC) / Medium (3-5 files, 100-300 LOC) / High (6+ files or 300+ LOC)
5. List risks and gotchas specific to this approach
6. Rate your confidence (0–100) that this approach is the best path

## Return Format
- **Approach:** {name}
- **Confidence:** {0-100}
- **Complexity:** {Low/Medium/High}
- **Files affected:** {list with line ranges}
- **Reusable code:** {file:function or "none"}
- **Risks:** {list}
- **Rationale:** {2-3 sentences on why this score}
```

### Token budget

- 3 Explore agents × ~15k tokens = ~45k additional tokens
- Overhead multiplier: 1.1x (context duplication)
- Total additional cost: ~50k tokens per `/plan` invocation

## `/debug` — Parallel Hypothesis Investigation

### Change

Add a **gate after Isolate** (Step 1.5) and replace Step 2 with parallel investigation in deep mode.

### Gate (Step 1.5)

After isolation evidence is gathered, ask the user:

> "Quick fix or deep investigation?"
> - **Quick** — standard sequential H1–H3 (current behaviour, no extra agents)
> - **Deep** — spawn 3 parallel hypothesis agents

### Deep Mode (replaces Step 2)

1. Lead agent formulates 3 hypotheses based on isolation evidence
2. Spawns 3 parallel **Explore subagents** (read-only, ~15k tokens each)
   - Each receives: bug description, isolation evidence, error messages, and ONE hypothesis
   - Each investigates: reads relevant code paths, checks `git log` for related changes, looks for similar patterns in CLAUDE.md known issues
   - Each returns: confidence (0–100), evidence for/against, code locations, suggested fix direction
3. Lead agent ranks by confidence:

```
| Hypothesis | Confidence | Evidence | Code Location | Suggested Fix |
|-----------|-----------|----------|---------------|---------------|
| H1: ...   | 90        | ...      | file.js:42    | ...           |
| H2: ...   | 45        | ...      | module.js:88  | ...           |
| H3: ...   | 20        | ...      | init.js:15    | ...           |
```

4. Proceeds to Instrument (Step 3) starting with highest-confidence hypothesis

### Subagent prompt template

Each Explore agent receives:

```
You are investigating ONE hypothesis for a bug.

## Bug Description
{bug description from user}

## Isolation Evidence
{error messages, stack traces, reproduction steps, Jam data if available}

## Your Hypothesis
{specific hypothesis — e.g. "ScrollTrigger instances not killed on Barba leave, causing stale callbacks"}

## Your Task (read-only — do not modify files)
1. Read the code paths relevant to this hypothesis
2. Check git history: `git log --oneline -20 -- {relevant files}` for recent changes
3. Look for similar known issues in CLAUDE.md or .claude/logs/
4. Find evidence FOR this hypothesis (code that could cause the bug)
5. Find evidence AGAINST this hypothesis (guards or patterns that should prevent it)
6. Rate your confidence (0–100)

## Return Format
- **Hypothesis:** {name}
- **Confidence:** {0-100}
- **Evidence FOR:** {list with file:line references}
- **Evidence AGAINST:** {list}
- **Code locations:** {file:line for each relevant location}
- **Suggested fix direction:** {1-2 sentences}
- **Test design:** {Playwright/Unit/MCP/None} — assert {condition}
```

### Token budget

- Quick mode: 0 additional tokens
- Deep mode: 3 Explore agents × ~15k = ~45k additional tokens (1.1x overhead = ~50k)

## Decisions

- **Parallel subagents over Agent Teams** — approaches/hypotheses are independent explorations that don't need mid-task communication. 1.1x overhead vs 2.5x.
- **No changes to /build** — the build pipeline is a linear sequence with hard data dependencies. Already parallelizes code review (3 reviewers). Agent Teams would add overhead with no benefit.
- **/plan always uses approach exploration** — the value of exploring multiple approaches before committing is high enough to justify the ~50k token cost on every plan.
- **/debug gates deep mode** — many bugs are quick fixes. The user decides whether to invest in parallel investigation.
