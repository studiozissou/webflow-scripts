Run a comprehensive design review with parallel UX, art direction, and copy critique.

## Usage
Provide: screenshot path, live URL, Figma URL, or Webflow page reference.

Optional: inspiration URLs, art direction brief, project goals, brand voice.

## Step 1 — Gather design context

Invoke the `design-context` skill to collect:
- Design input (screenshot, URL, Figma, MCP snapshot)
- Project goals
- Art direction brief
- Inspiration references
- Brand voice (tone, audience, do/don't words)
- Auto-read project files (client.md, figma-tokens.json, specs)

If the user provided context inline with the command invocation, skip questions that are already answered.

## Step 2 — Fetch inspiration (if URLs provided)

For each inspiration URL provided in Step 1:
1. Spawn an **Explore agent** (read-only) to fetch and summarise visual patterns:
   - Layout pattern, typography, colour usage, whitespace, motion/interactions
2. Collect all summaries into the **Inspiration Summary** section of the Design Context Block

Run fetches in parallel if multiple URLs. Skip if no inspiration URLs were provided.

## Step 3 — Parallelisation gate

Reference the `parallelisation` skill. Present the gate with 3 independent streams:

| # | Stream | Agent type | Est. tokens | Est. wall time |
|---|--------|-----------|-------------|----------------|
| 1 | UX review | ux-researcher | ~25k | ~20s |
| 2 | Art direction | art-director | ~25k | ~20s |
| 3 | Copy review | content | ~15k | ~10s |

Sequential: ~50s / ~65k tokens. Parallel: ~25s / ~72k tokens (~2x faster, +1.1x cost).
All streams are read-only — low risk.

**Recommendation: Parallel** (all read-only, no file contention, significant time savings).

## Step 4 — Fan out 3 subagents

If user approves parallel execution, spawn 3 subagents simultaneously using the Agent tool.
Each subagent receives:
- The design input (screenshot path or URL)
- The full **Design Context Block** from Step 1
- Inspiration summaries from Step 2 (if any)
- Their specific review lens below

If user chooses sequential, run each review one at a time in the order listed.

### Stream 1 — UX review (ux-researcher agent)
- Goal-driven evaluation: does the layout serve stated project goals?
- Heuristic evaluation (Nielsen's 10)
- User flow analysis for key scenarios
- Inspiration benchmarking: how does hierarchy compare to reference sites?
- Mobile and accessibility considerations
- Cognitive load and content density assessment

### Stream 2 — Art direction review (art-director agent)
- Does visual execution match the stated art direction?
- Inspiration comparison: where does the design align/diverge from references?
- Typography, spacing, colour, and motion critique
- "Push it" creative dev suggestion (WebGL, shaders, 3D, particle effects — with library, performance budget, and Awwwards reference)
- Nano Banana concept prompt if visual changes are suggested
- Figma alignment notes (if design file was referenced)

### Stream 3 — Copy review (content agent)
- Brand voice evaluation against stated tone and audience
- CTA effectiveness and goal alignment
- Heading hierarchy and microcopy
- Accessibility labels (aria-label, alt text)
- Competitor voice comparison (if competitor URLs in inspiration)

## Step 5 — Merge results

Collect all subagent outputs and merge into a unified report:

1. **Executive summary** — 3-5 sentence overview of design health
2. **Goals assessment** — for each stated goal, a verdict: Supported / Partially supported / Undermined
3. **Critical issues** (must fix) — across all three domains, ranked by impact on goals
4. **Recommendations** (should fix) — grouped by domain (UX / Visual / Copy)
5. **"Push it" opportunities** — creative dev enhancements from the art director
6. **Nano Banana concepts** — if the art director suggested visual changes, include the prompt(s) under a dedicated section

## Step 6 — Nano Banana concept generation (optional)

If the art director's review includes Nano Banana concept prompts AND `GOOGLE_AI_API_KEY` is available:
1. Ask the user: "The art director suggested visual alternatives. Generate concept images with Nano Banana?"
2. If yes, reference the `nano-banana` skill and generate concept images
3. Save to `.claude/research/concepts/<slug>-concept-<n>.png`
4. Include the image paths in the final report

If `GOOGLE_AI_API_KEY` is not set, include the prompts in the report with a note: "Set GOOGLE_AI_API_KEY to generate these concepts with Nano Banana."

## Output

Save the unified report to `.claude/research/design-review-<slug>-<YYYY-MM-DD>.md`.

Report structure:
```markdown
# Design Review: <slug>
**Date:** <YYYY-MM-DD>
**Design input:** <source>
**Goals:** <stated goals>
**Art direction:** <stated direction>

## Executive Summary
...

## Goals Assessment
### Goal: <goal>
- Status: Supported / Partially supported / Undermined
- Evidence: ...

## Critical Issues
### 1. <issue title> [UX/Visual/Copy]
- Severity: Critical
- Finding: ...
- Recommendation: ...

## Recommendations
### UX
...
### Visual
...
### Copy
...

## Creative Dev Opportunities
### <technique name>
- Library: ...
- Performance: ...
- Reference: ...
- Difficulty: ...

## Nano Banana Concepts
### Concept 1: <description>
- Prompt: ...
- Image: <path or "generate with GOOGLE_AI_API_KEY">

## Inspiration Comparison
### vs. <site>
...
```
