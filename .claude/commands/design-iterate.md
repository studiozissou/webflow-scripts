Iteratively review, fix, and re-review a design until it meets the art direction and UX goals.

## Usage
Provide: screenshot path, live URL, Figma URL, or Webflow page reference.

This command applies the `/build` verify loop pattern to design — review → propose → apply → re-review.

## Step 1 — Gather design context

Invoke the `design-context` skill to collect the full Design Context Block.
Same process as `/design-review` Step 1.

## Step 2 — Initial review

Run the same parallel critique as `/design-review` (Steps 2–5):
1. Fetch inspiration (if URLs provided)
2. Parallelisation gate with 3 streams (ux-researcher, art-director, content)
3. Fan out and collect results
4. Merge into unified findings

## Step 3 — Prioritise and propose

From the merged review, create a ranked list of proposed changes in three categories:

### Code changes (implemented by code-writer)
CSS/JS/layout fixes that address specific findings. For each:
- File and location
- Before/after description
- Which finding it addresses

### Visual concepts (Nano Banana)
If the art director suggested visual changes and `GOOGLE_AI_API_KEY` is available:
- Reference the `nano-banana` skill
- Generate 1-3 concept images showing proposed visual directions
- Save to `.claude/research/concepts/<slug>-iter<n>-concept-<m>.png`
- Display the concepts to the user

If `GOOGLE_AI_API_KEY` is not set, include the art director's Nano Banana prompts as text descriptions instead.

### Copy rewrites
Alternative text options from the content agent. For each:
- Original copy (quoted)
- 2-3 rewrite options ranked by preference
- Rationale tied to brand voice and goals

## Step 4 — User selects

Use `AskUserQuestion` with `multiSelect: true` to let the user choose which changes to apply:

Present the top findings (max 8 items across all categories) as selectable options.
Group by category with clear labels:
- "[Code] Fix hero section spacing"
- "[Visual] Apply darker colour palette concept"
- "[Copy] Rewrite main CTA to be goal-focused"

## Step 5 — Apply changes

For selected **code changes**:
- Spawn a `code-writer` agent with `model: "opus"` to implement the fixes
- Each agent receives the specific change description, the target file, and relevant context
- Use worktree isolation if multiple code changes target different files

For selected **visual concepts**:
- If Nano Banana assets were generated and selected, copy them to `projects/<client>/assets/generated/`
- Note the placement in the implementation log

For selected **copy rewrites**:
- Apply the selected rewrite option to the relevant file using Edit tool

## Step 6 — Re-review loop

After applying changes, re-run the parallel critique (same 3 agents, same Design Context Block):

1. Spawn 3 subagents with updated design input (new screenshot or re-fetched URL)
2. Collect and merge results
3. Compare against previous iteration — note what improved and what's new

### Loop decision:

**New issues found?**
→ Return to Step 3 with new findings. Generate fresh Nano Banana concepts if visual issues remain.

**All clean (no Critical or High issues)?**
→ Exit loop. Generate final report.

**Max iterations reached (5)?**
→ Ask user via `AskUserQuestion`:
  - "Continue iterating" — reset counter, continue
  - "Stop here — good enough" — exit with current state
  - "Stop — I'll handle the rest manually" — exit with full diagnostics

## Step 7 — Final report

Save the iteration log to `.claude/research/design-iterate-<slug>-<YYYY-MM-DD>.md`.

Report structure:
```markdown
# Design Iteration: <slug>
**Date:** <YYYY-MM-DD>
**Iterations:** <count>
**Design input:** <source>
**Goals:** <stated goals>

## Iteration Log

### Iteration 1
**Findings:** <count> issues (X critical, Y high, Z medium)
**Changes applied:**
- [Code] ...
- [Visual] ...
- [Copy] ...

### Iteration 2
**Findings:** <count> issues
**Improvements:** <what got better>
**Changes applied:**
- ...

### Final State
**Remaining issues:** <count and severity>
**Goals assessment:**
- Goal 1: Supported / Partially supported
- Goal 2: ...

## Generated Assets
- `.claude/research/concepts/<slug>-iter1-concept-1.png` — <description>
- ...

## Creative Dev Opportunities Applied
- <technique> — implemented in <file>

## Creative Dev Opportunities Remaining
- <technique> — suggested but not yet implemented
```

## Rules
- Never apply changes without user selection in Step 4
- Always re-review after applying changes — never skip the verification
- Track iteration count and enforce the 5-iteration soft limit
- Keep the Design Context Block consistent across all iterations (don't re-gather)
- If code-writer agents encounter errors, report them rather than silently skipping
