---
name: design-context
description: >
  Shared context-gathering skill for design review workflows. Collects design
  input, inspiration, art direction, goals, and brand voice via structured
  questions, then outputs a Design Context Block for downstream agents.
triggers:
  - design review context
  - design critique setup
  - brand voice collection
  - art direction intake
tags:
  - design
  - ux
  - workflow
---

<objective>
Gather rich design context from the user and project files, then produce a
structured **Design Context Block** that downstream agents (art-director,
ux-researcher, content) can consume. This skill is the first step in every
design review workflow.
</objective>

<context_gathering>

## Step 1 — Auto-read project context

Before asking the user anything, silently check for and read these files if they exist:

| File | What it provides |
|------|------------------|
| `client.md` or `clients/*/client.md` | Client brand, audience, positioning |
| `figma-tokens.json` or `tokens.json` | Design tokens (colours, spacing, type) |
| `.claude/specs/*.md` | Feature specs with design requirements |
| `.claude/research/*style-guide*.md` | Existing style guide research |
| `CLAUDE.md` | Project conventions |

Store any found context as **Existing Context** — do not ask the user for information already available in these files.

## Step 2 — Ask the user (AskUserQuestion)

Use `AskUserQuestion` to collect missing context. Ask up to 4 questions per call.

### Round 1 — Design input and goals

**Question 1: "What design are we reviewing?"**
- Screenshot path (local file, the agent will read it)
- Live URL (will be fetched)
- Figma URL (if Figma MCP connected)
- MCP snapshot (if Webflow MCP connected)

**Question 2: "What should this design achieve?"**
- Convert visitors to [action]
- Establish [quality] (credibility, luxury, trust)
- Showcase portfolio/work
- Inform/educate the audience

### Round 2 — Art direction and voice

**Question 3: "Describe the visual direction"**
Options (user picks or writes their own):
- Bold editorial, high contrast
- Minimal, clean, lots of whitespace
- Playful, colourful, energetic
- Dark, immersive, cinematic

**Question 4: "Any inspiration references?"**
Options:
- Paste URLs (Awwwards, Dribbble, competitor sites)
- Style keywords (e.g. "swiss modernism", "brutalist", "editorial")
- Skip — no specific references

### Round 3 — Brand voice (only if `/copy-review` or `/design-review` with copy)

**Question 5: "Describe the brand voice"**
Options:
- Confident but approachable
- Technical and precise
- Warm and conversational
- Bold and provocative

**Question 6: "Who is the target audience?"**
Options:
- Developers / technical
- Creative professionals / designers
- General consumers
- Enterprise / B2B decision-makers

If `client.md` already contains brand voice or audience info, skip these questions and use the existing data.

## Step 3 — Fetch inspiration (if URLs provided)

For each inspiration URL provided:
1. Spawn an **Explore agent** (read-only) to fetch and summarise:
   - Layout pattern (grid, asymmetric, single-column, etc.)
   - Typography approach (serif/sans, scale, weights)
   - Colour usage (palette, contrast, accent strategy)
   - Whitespace and density
   - Motion/interaction patterns (if visible)
   - Overall art direction keywords
2. Collect summaries into an **Inspiration Summary** section

Run fetches in parallel if multiple URLs are provided.

</context_gathering>

<output_format>

## Design Context Block

Output the gathered context as a structured markdown block. This exact format is injected into every downstream agent's prompt.

```markdown
## Design Context Block

### Design Input
- **Type:** [screenshot | URL | Figma | MCP snapshot]
- **Source:** [path or URL]

### Project Goals
- [Goal 1]
- [Goal 2]

### Art Direction
- **Visual tone:** [description]
- **Colour intent:** [from tokens or user input]
- **Typography feel:** [serif/sans, weight, scale]
- **Motion style:** [restrained | expressive | cinematic | minimal]

### Brand Voice
- **Tone:** [adjectives]
- **Audience:** [description]
- **Do:** [words/phrases to use]
- **Don't:** [words/phrases to avoid]

### Inspiration Summary
#### [Site/Reference 1]
- Layout: ...
- Type: ...
- Colour: ...
- Motion: ...
- Keywords: ...

#### [Site/Reference 2]
...

### Existing Context
- **Client:** [from client.md]
- **Tokens:** [colour palette summary from figma-tokens.json]
- **Conventions:** [relevant CLAUDE.md notes]
```

If any section has no data, include it with "Not provided" rather than omitting it — this tells the downstream agent that the context was gathered but the user chose not to specify.

</output_format>

<usage_notes>
- This skill is invoked by `/design-review`, `/design-iterate`, and `/copy-review`
- It should NOT be invoked directly — always through a command
- The Design Context Block is passed to agents via their prompt, not written to a file
- If the user has run this skill recently in the same session, offer to reuse the previous context instead of re-asking
</usage_notes>
