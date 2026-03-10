Run a comprehensive audit of a specific Webflow page.

## Usage
Provide: page URL and/or the Barba namespace for the page.

## Step 1 — Webflow native audit (if MCP connected)

Run before parallel agent calls (sequential — MCP connection):
1. `site-audit` → save to `audits/site-audit-YYYY-MM-DD.md`
2. `link-checker` → save to `audits/link-check-YYYY-MM-DD.md`
3. `accessibility-audit` → save to `audits/a11y-YYYY-MM-DD.md`

Do not duplicate checks already covered by Webflow skills output.

## Step 2 — Parallelisation gate

Reference the `parallelisation` skill. Present the gate with 5 independent streams:

| # | Stream | Agent type | Est. tokens | Est. wall time |
|---|--------|-----------|-------------|----------------|
| 1 | Performance | perf (Explore) | ~20k | ~15s |
| 2 | SEO | seo (Explore) | ~25k | ~20s |
| 3 | Accessibility | qa (Explore) | ~20k | ~15s |
| 4 | UX review | ux-researcher (Explore) | ~25k | ~20s |
| 5 | Content review | content (Explore) | ~15k | ~10s |

Sequential: ~80s / ~105k tokens. Parallel: ~25s / ~115k tokens (~3.2x faster, +1.1x cost).
All streams are read-only — low risk.

**Recommendation: Parallel** (all read-only, no file contention, significant time savings).

## Step 3 — Fan out 5 subagents

If user approves parallel execution, spawn 5 subagents simultaneously using the Task tool.
Each subagent receives:
- The page URL
- The MCP audit output from Step 1 (so they don't re-run those checks)
- Their specific checklist below

If user chooses sequential, run each checklist one at a time in the order listed.

### Stream 1 — Performance audit (perf agent)
- Script load order and weight
- Animation frame budget
- Images: lazy loading, formats, sizes

### Stream 2 — SEO audit (seo agent)
- Title, meta description, heading hierarchy
- Open Graph tags
- JSON-LD schema presence
- Canonical tag

### Stream 3 — Accessibility audit (qa agent)
- Keyboard navigation
- Focus management
- ARIA labels
- Colour contrast

### Stream 4 — UX review (ux-researcher agent)
- User flow clarity
- CTAs
- Mobile usability

### Stream 5 — Content review (content agent)
- Heading copy
- CTA copy
- Alt text

## Step 4 — Merge results

Collect all subagent outputs and merge into a unified audit report.

## Output
A unified audit report saved to `.claude/research/audit-<page-slug>-<YYYY-MM-DD>.md` with:
- Overall score by category
- Critical issues (must fix)
- Recommendations (should fix)
- Nice-to-haves
