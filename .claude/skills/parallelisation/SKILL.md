---
name: parallelisation
description: >
  Parallelisation gate, estimation, and decision framework for multi-agent
  command execution. Referenced by commands that can fan out work streams.
triggers:
  - parallel execution decision
  - multi-agent fan-out
  - concurrent subagent spawning
tags:
  - workflow
  - performance
  - agents
---

<gate_prompt>
Before spawning parallel agents, present the user with a parallelisation gate:

1. List independent streams with descriptions:
   | # | Stream | Agent type | Est. tokens | Est. wall time |
   |---|--------|-----------|-------------|----------------|
   (fill per command)

2. Show comparison table:
   | Mode | Wall time | Token cost | Notes |
   |------|-----------|------------|-------|
   | Sequential | sum(stream times) | sum(stream tokens) | Baseline |
   | Parallel (subagents) | max(stream times) + 5s/agent | sum × 1.1 | Context duplication overhead |
   | Agent Team | max(stream times) × 0.8 | sum × 2.5 | Bidirectional comms overhead |

3. State recommendation with reason.

4. Ask user:
   - **Parallel** (recommended if applicable)
   - **Sequential** (safer, lower token cost)
   - **Agent Team** (if streams need mid-task coordination)
</gate_prompt>

<estimation_reference>
Calibrated from existing workspace patterns:

| Agent type | Typical tokens | Typical wall time | Notes |
|---|---|---|---|
| Explore (read-only) | ~15k | ~10-15s | Cheapest. No writes. |
| Review (perf/seo/qa/ux/content) | ~20-30k | ~15-25s | WebFetch adds latency |
| Task (code-writer) | ~40-60k | ~30-60s | May need worktree |
| Agent Team member | ~2.5x equiv. subagent | ~0.8x wall time | Bidirectional comms |

Formulas:
- **Parallel wall time** = max(stream times) + ~5s spawn overhead per agent
- **Parallel tokens** = sum(stream tokens) × 1.1 (context duplication)
- **Agent team tokens** = sum(stream tokens) × 2.5 (bidirectional communication overhead)
- **Sequential wall time** = sum(stream times)
- **Sequential tokens** = sum(stream tokens) (no overhead)
</estimation_reference>

<decision_framework>
Choose execution mode based on these criteria:

**Parallel subagents** when:
- 3+ independent streams exist
- Streams are read-only or write to separate files
- Sequential wall time would exceed 45 seconds
- No mid-task data sharing needed between streams

**Agent Teams** when:
- Streams need to share findings mid-task (not just merge at end)
- Exploratory research where one stream's discovery changes another's direction
- Complex multi-step coordination required

**Sequential** when:
- Fewer than 3 streams
- Data dependencies exist between streams
- Total sequential time is under 30 seconds
- Token budget is constrained

**Worktrees** when:
- 2+ parallel agents write to different files in the same project
- Risk of file contention between agents
- Each agent needs a clean working copy

**Default recommendation:** Parallel subagents for read-only audit/review commands.
Sequential for build/refactor commands with data dependencies.
</decision_framework>
