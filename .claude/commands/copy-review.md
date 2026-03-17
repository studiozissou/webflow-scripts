Run a deep content and copy audit with brand voice context.

## Usage
Provide: screenshot path, live URL, or Webflow page reference.

Optional: brand voice description, target audience, competitor URLs, do/don't word lists.

## Step 1 — Gather design context (copy-focused)

Invoke the `design-context` skill with emphasis on copy-related inputs:

**Priority questions** (always ask, even if some project context exists):
- Tone adjectives (3-5 words describing the voice)
- Target audience (who reads this copy?)
- Content goals: inform, convert, entertain, reassure — pick the primary goal
- Do/don't word lists (words to use and avoid)

**Secondary questions** (ask if not already in project files):
- Competitor copy URLs for voice comparison
- Art direction brief (visual tone should match verbal tone)

Skip design-specific questions (spacing, motion, etc.) — this is a copy-focused review.

## Step 2 — Extract text

Extract all reviewable copy from the design input:

**From screenshot** (Read tool for images):
- Read the image and transcribe all visible text
- Note the visual hierarchy (what's biggest/boldest, what's secondary)
- Capture button labels, form labels, error states if visible

**From URL** (WebFetch):
- Fetch the page and extract all text content
- Preserve heading hierarchy (h1, h2, h3, etc.)
- Capture meta description and page title
- Note aria-labels and alt text

**From MCP snapshot** (if Webflow MCP connected):
- Use element_snapshot_tool for DOM text extraction
- Capture CMS-bound text fields separately

Organise extracted text by section/component for structured review.

## Step 3 — Parallelisation gate

Reference the `parallelisation` skill. Present the gate with 2 streams:

| # | Stream | Agent type | Est. tokens | Est. wall time |
|---|--------|-----------|-------------|----------------|
| 1 | Copy quality | content | ~20k | ~15s |
| 2 | Content UX | ux-researcher | ~15k | ~10s |

Sequential: ~25s / ~35k tokens. Parallel: ~15s / ~39k tokens (~1.7x faster, +1.1x cost).
Both streams are read-only — low risk.

**Recommendation: Parallel** (read-only, different review lenses, no overlap).

## Step 4 — Fan out 2 subagents

Each subagent receives:
- The extracted text (organised by section)
- The full **Design Context Block** from Step 1
- Competitor copy (if URLs were fetched)

### Stream 1 — Copy quality (content agent)

Review all copy against the brand voice framework:
- **Tone match**: does every piece of copy match the stated tone adjectives?
- **Audience calibration**: vocabulary, complexity, and assumed knowledge — right for the audience?
- **Do/don't compliance**: scan for forbidden words; suggest replacements from the "do" list
- **CTA effectiveness**: are CTAs action-oriented and goal-aligned?
- **Heading hierarchy**: does it make sense read aloud? Does it tell a story?
- **Microcopy**: form labels, error messages, empty states, tooltips
- **Accessibility**: aria-labels, alt text quality, button labels
- **Meta**: title tag, meta description (150-160 chars, keyword-inclusive)
- **Competitor voice comparison**: if competitor copy available, compare positioning, messaging gaps, differentiation

### Stream 2 — Content UX (ux-researcher agent)

Review copy from an information architecture and UX perspective:
- **Information hierarchy**: is the most important content most prominent?
- **Scanning patterns**: does the page support F-pattern or Z-pattern scanning?
- **Content placement**: is content where users expect to find it?
- **Flow through copy**: does the narrative lead toward the primary goal?
- **Cognitive load**: too much text? Too dense? Right amount of chunking?
- **Mobile readability**: will this copy work on small screens?

## Step 5 — Merge and generate rewrites

Collect results from both agents and produce:

### Issue list (ranked by impact)
For each issue:
1. **Current copy** (quoted, with location)
2. **Issue** (what's wrong, referencing brand voice/goals)
3. **Suggested rewrites** (2-3 options ranked by preference)
4. **Rationale** for the top pick (tied to brand voice, audience, and goals)

### Competitor comparison (if competitor URLs provided)
- Voice positioning map: where does this site sit vs. competitors?
- Messaging gaps: what competitors address that this site doesn't
- Differentiation wins: where this site's voice stands out

### Copy scorecard
Rate the overall copy on:
- **Voice consistency**: 1-5 (how consistently does it match stated tone?)
- **Goal alignment**: 1-5 (how well does copy drive toward stated goals?)
- **Clarity**: 1-5 (how easy is it to understand?)
- **Accessibility**: 1-5 (labels, alt text, semantic structure)
- **Overall**: average of above

## Output

Save to `.claude/research/copy-review-<slug>-<YYYY-MM-DD>.md`.

Report structure:
```markdown
# Copy Review: <slug>
**Date:** <YYYY-MM-DD>
**Source:** <screenshot/URL/MCP>
**Brand voice:** <tone adjectives>
**Audience:** <target audience>
**Primary goal:** <content goal>

## Copy Scorecard
| Dimension | Score | Notes |
|-----------|-------|-------|
| Voice consistency | X/5 | ... |
| Goal alignment | X/5 | ... |
| Clarity | X/5 | ... |
| Accessibility | X/5 | ... |
| **Overall** | **X/5** | |

## Issues & Rewrites

### 1. <location/component>
**Current:** "<quoted copy>"
**Issue:** ...
**Option A (recommended):** "<rewrite>"
**Option B:** "<rewrite>"
**Option C:** "<rewrite>"
**Rationale:** ...

### 2. ...

## Content UX Findings

### Information hierarchy
...

### Flow analysis
...

## Competitor Voice Comparison
### vs. <competitor>
- Their positioning: ...
- Our positioning: ...
- Gap: ...
- Differentiation: ...

## Do/Don't Compliance
### Words found from "don't" list:
- "<word>" in <location> → suggested replacement: "<word>"

### "Do" words used well:
- "<word>" in <location> — good usage
```
