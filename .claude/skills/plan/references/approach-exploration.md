# Approach exploration

Three competing approaches explored in parallel, each by its own read-only `Explore` agent (`model: "sonnet"`). Each approach should be a genuinely different path (for example "GSAP timeline" vs "CSS-only" vs "Rive state machine"), not variations of one idea.

## Agent prompt template

```
You are exploring ONE architectural approach for a feature. Read-only — do not modify files.

## Feature
{feature description}

## Research Context
{research summary from step 1}

## User Requirements
{answers or assumptions from step 2}

## Your Approach
{approach name and description}

## Your Task
1. Search the codebase for patterns that support or conflict with this approach
2. Identify all files that would need changes
3. Find reusable code (functions, patterns, modules) that could be adapted
4. Assess complexity: Low (1–2 files, <100 LOC) / Medium (3–5 files, 100–300 LOC) / High (6+ files or 300+ LOC)
5. List risks and gotchas specific to this approach
6. Rate your confidence (0–100) that this approach is the best path

## Return Format
- **Approach:** {name}
- **Confidence:** {0–100}
- **Complexity:** {Low/Medium/High}
- **Files affected:** {list with line ranges}
- **Reusable code:** {file:function or "none"}
- **Risks:** {list}
- **Rationale:** {2–3 sentences}
```

## Comparison table

| Approach | Confidence | Complexity | Key Risk | Reusable Code |
|----------|-----------|------------|----------|---------------|
| A: ...   | 85        | Medium     | ...      | file.js:fn()  |
| B: ...   | 70        | Low        | ...      | utils.js:fn() |
| C: ...   | 60        | High       | ...      | none          |

Present the table with a recommendation and reasoning. Interactive: `AskUserQuestion` with the three approaches (recommended first) and a fourth option "Hybrid — combine elements from multiple approaches". Auto mode: take the highest confidence; on a tie prefer lower complexity.
