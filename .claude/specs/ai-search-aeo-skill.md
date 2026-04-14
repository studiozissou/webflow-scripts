# ai-search-aeo skill

**Slug:** `ai-search-aeo-skill`
**Project:** `webflow-scripts` (monorepo-wide infrastructure)
**Type:** feature (new skill + light agent/command integration)
**Priority:** P1
**Status:** Planning
**Created:** 2026-04-10

## Summary

Create a new monorepo skill `ai-search-aeo` that combines the actionable guidance from two Webflow blog posts ("Winning AEO with Content" and "AI Search SEO") into a single reference the `seo`, `content`, and `schema` agents — plus the `/copy-review` and `/intake` commands — can pull from when auditing pages, writing copy, or structuring content for Answer Engine Optimization (AEO) and AI search visibility (ChatGPT, Perplexity, Claude, Gemini, SGE).

The skill will have three clear sections:

1. **Audit Rubric + Scorecard** — 20 concrete checks across 5 categories, with ✅/⚠️/❌ markers and a per-category score.
2. **Optional Maturity Assessment** — the blog's 5-level content maturity model, offered as a strategic overlay when the user asks for it or when scoring the whole site (not per page).
3. **Copywriting Rules & Page Structure Patterns** — answer-first leads, question-shaped H2s, Flesch 80+, extractable chunks, flagship anchor assets, semantic clusters, FAQ blocks, citation-magnet content types.

## Research summary

### Blog insights (combined)

**From "AI Search SEO":**
- Content freshness matters — update quarterly, keep pages <90 days, visible "last updated" dates, avoid time-sensitive words.
- Citations build authority — original stats, how-tos, comparisons attract backlinks; monitor brand mentions on Reddit/LinkedIn + AI citations via Profound/Ahrefs.
- Format rules — 2–3 sentence paragraphs, max 3 paragraphs per heading, "What is"/"How to" headings, rephrase the question in the answer, lists with intros, active voice, no jargon.
- Technical — descriptive alt text, internal links during updates, allow AI bots.
- Measurement — track referrals from chatgpt.com, perplexity.ai, claude.ai, gemini.google.com, copilot.microsoft.com, etc.

**From "Winning AEO with Content":**
- 5-level maturity model: L1 keyword foundation → L2 Q&A shift → L3 semantic clustering → L4 intentional hierarchy → L5 programmatic personalisation.
- Flesch targets: 80+ at L2, 90+ at L3.
- Refresh cadence: every 3–6 months for high-priority pages at L3+.
- Flagship anchor assets (annual reports, research studies) establish authority.
- Personalisation by segment, persona, industry at L4–L5.
- Key insight: only 25% of marketers understand AEO despite 93% of CMOs calling it critical — knowledge gap.

**Common ground (what the skill must teach):**
- Answer-first content (lead paragraph answers the query)
- Question-shaped headings
- Short, extractable chunks
- Freshness signals
- Original authority content
- Schema + technical plumbing

### Codebase findings

- **`seo` agent** (`.claude/agents/seo.md`) — covers traditional SEO (meta, headings, schema types, CWV, Webflow-specific concerns). No AEO/AI-search scope. Will reference the new skill.
- **`content` agent** (`.claude/agents/content.md`) — covers brand voice, tone, copy review via Design Context Block. No AEO writing patterns. Will reference the new skill.
- **`schema` agent** (`.claude/agents/schema.md`) — generates JSON-LD (Organization, WebPage, Article, FAQPage, etc.). Will reference the new skill for FAQPage/HowTo/QAPage priorities.
- **`/copy-review`** (`.claude/commands/copy-review.md`) — parallel content + ux-researcher pass. Will mention skill in context block.
- **`/intake`** (`.claude/commands/intake.md`) — 4-phase new-site audit. Phase 4 runs parallel checks; will add AEO stream.
- **No existing AEO or AI-search references** anywhere in the repo — clean slate.
- **Skill format** is lightweight YAML frontmatter (`name`, `description`) + XML body tags (`<objective>`, `<quick_start>`, `<workflow>`, `<success_criteria>`). Example: `.claude/skills/webflow-mcp/SKILL.md`.

## Approach — locked via clarifying Qs

| Decision | Choice |
|---|---|
| Scope | **One combined skill** (`ai-search-aeo`) with audit + copywriting + structure sections |
| Integration | **Light** — reference from `seo`, `content`, `schema` agents + `/copy-review` + `/intake`. No new command. |
| Audit output | **Rubric + scorecard** primary, **optional maturity assessment** secondary |
| Brand voice | **Generic AEO rules** + hook into `design-context` skill |

Skipped the 3-approach parallel exploration — scope is fully locked and this is a content/documentation task, not an architectural one. Exploring alternatives would be forced.

## Design

### Skill file layout

`.claude/skills/ai-search-aeo/SKILL.md`

```yaml
---
name: ai-search-aeo
description: >
  Guides AEO (Answer Engine Optimization) and AI-search audits, copywriting,
  and page structure for Webflow sites. Combines insights on how AI engines
  (ChatGPT, Perplexity, Claude, Gemini, SGE) select, extract, and cite content.
  Activates when auditing pages for AI visibility, writing answer-first copy,
  structuring FAQ/cluster content, or running /copy-review and /intake passes.
---

<objective>...</objective>
<quick_start>...</quick_start>
<audit_rubric>...</audit_rubric>
<copywriting_rules>...</copywriting_rules>
<page_structure_patterns>...</page_structure_patterns>
<maturity_assessment>...</maturity_assessment>
<integration>...</integration>
<success_criteria>...</success_criteria>
```

### Audit Rubric — 20 checks across 5 categories

Each check outputs `✅ PASS` / `⚠️ NEEDS ATTENTION` / `❌ FAIL` with a one-line fix.

**A. Schema & Structured Data (4 checks)**
1. Page has at least one top-level JSON-LD schema (Organization, Article, WebPage, etc.)
2. FAQPage schema present on any Q&A content
3. HowTo schema on tutorial content
4. Schema passes Google Rich Results Test (manual gate)

**B. Answer-First Content Structure (6 checks)**
5. First paragraph directly answers the likely query (rephrases the question)
6. H2s are phrased as questions where appropriate ("What is", "How to", "Why")
7. Each heading is followed by ≤ 3 paragraphs
8. Paragraphs are ≤ 3 sentences
9. Lists are introduced by an explanatory sentence
10. Copy uses active voice (spot-check, not 100% enforced)

**C. Freshness Signals (3 checks)**
11. Visible "last updated" timestamp present
12. Page updated within past 90 days (or planned refresh cadence documented)
13. Copy avoids time-sensitive words ("new", "upcoming", "recently", "this year")

**D. Authority / E-E-A-T (4 checks)**
14. Original data, stats, or research cited (or linked flagship asset exists)
15. Author bio or entity signals present
16. External citations/links to primary sources
17. Content fits a cite-magnet archetype: stats, how-to, comparison, definitive guide

**E. Technical AEO (3 checks)**
18. Alt text is descriptive (not decorative) — spot-check images
19. Internal links to 2+ related pages
20. `robots.txt` allows AI bots (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) OR disallow is a deliberate choice

**Scorecard format:**
```
A. Schema:           3/4  ⚠️
B. Answer Structure: 5/6  ⚠️
C. Freshness:        1/3  ❌
D. Authority:        2/4  ⚠️
E. Technical:        3/3  ✅
─────────────────────────────
Total:              14/20  Flesch: 72 (target 80+)
```

Plus a Flesch score target: 80+ for L2, 90+ for L3+.

### Copywriting Rules (generic, hooked to design-context for brand voice)

- **Answer-first leads:** rephrase the likely query in the first sentence of the first paragraph. Pattern: "To [do X], you must…" / "X is a [definition] that…"
- **Question-shaped H2s:** use "What is", "How to", "Why does", "When should" where the content genuinely answers a question.
- **Paragraph length:** 2–3 sentences max. If longer, split or add a subheading.
- **Max 3 paragraphs per heading** — add a subheading if you need more.
- **Lists need intros:** every `<ul>`/`<ol>` starts with an explanatory sentence. List items include related keywords naturally.
- **Active voice:** default. Passive only when the object is the real subject.
- **Plain language:** Flesch 80+ target. Kill jargon unless the audience expects it.
- **Extractable chunks:** each paragraph should stand alone as a quotable passage if lifted out of context.
- **Avoid time-sensitive words:** "new", "upcoming", "recently", "this year" — these rot.
- **Brand voice hook:** if a Design Context Block is provided (from `design-context` skill), apply its tone adjectives, audience alignment, and do/don't words ON TOP of these AEO rules. AEO rules define structure; brand voice defines feel.

### Page Structure Patterns

**Content types that attract citations (cite-magnets):**
- **Stats pages** — original surveys, public-data analysis, quantified benchmarks
- **How-to guides** — definitive tutorials on complex tasks
- **Comparisons** — side-by-side evaluations with pros/cons
- **Definitive guides** — comprehensive "everything about X" flagship pieces

**Structural patterns:**
- **Anchor page** — flagship content (annual report, research study, definitive guide) that serves as the authority hub.
- **Supporting answer cluster** — 5–15 supporting pages answering related questions that all link to the anchor.
- **FAQ block** — on product/service pages, a 5–10 question Q&A section with FAQPage schema.
- **Segmented landing pages** — at L4+, one landing page per industry/persona/use case with tailored examples and CTAs.
- **Internal linking architecture** — every update adds 1–2 internal links to related recent pages.
- **Freshness signals** — visible "last updated: YYYY-MM-DD" component + quarterly review cadence.

### Optional Maturity Assessment (5 levels)

Offered when the user asks for a strategic overlay or scoring the whole site (not a single page). Maps the site to one of:

- **L1 — Keyword-focused foundation** — one-off product/landing pages, mostly branded search traffic
- **L2 — Question-answer shift** — appears in featured snippets and PAA; Flesch 80+
- **L3 — Semantic clustering** — anchor assets + supporting clusters; Flesch 90+; refresh every 3–6 months
- **L4 — Intentional hierarchy** — segmented landing pages, flagship anchors, pruning underperformers
- **L5 — Programmatic personalisation** — 1:1 experiences by segment/persona/account; interactive tools/calculators; lower traffic, higher conversion

For each level, list 2–3 "next-level actions" derived from the blog.

### Integration points

**1. `seo` agent (`.claude/agents/seo.md`)**
- Add bullet under Scope: `- AEO / AI search visibility: use the ai-search-aeo skill for answer-first structure, fresh-ness signals, citation patterns, and AI-bot robots rules`
- No other behaviour change.

**2. `content` agent (`.claude/agents/content.md`)**
- Add section `## AEO writing rules` that references the `ai-search-aeo` skill for answer-first patterns, question H2s, Flesch targets, and extractable chunks.
- Existing Design Context Block flow unchanged; the skill sits on top.

**3. `schema` agent (`.claude/agents/schema.md`)**
- Add a note: for AEO-critical pages, prioritise FAQPage, HowTo, QAPage, and Article schemas — reference the `ai-search-aeo` skill for which pages to tag.

**4. `/copy-review` command (`.claude/commands/copy-review.md`)**
- Add the `ai-search-aeo` skill to the parallel context block handed to the content agent, so copy reviews now include AEO scoring.

**5. `/intake` command (`.claude/commands/intake.md`)**
- Phase 4 currently runs parallel checks (Technical + Analytics, SEO, Content). Add an **AEO stream** that runs the audit rubric against the homepage + 2–3 top traffic pages and saves findings under `.claude/audits/<client>/aeo.md`.

**6. Design-context hook** — the skill's copywriting section tells agents "if a Design Context Block is provided, apply its tone/voice rules on top of these AEO structural rules". No change needed to the `design-context` skill itself.

## Barba Impact

N/A — this is a skill content task with no runtime JavaScript, no DOM, no Barba namespace.

## Implementation steps

1. **Create skill file** at `.claude/skills/ai-search-aeo/SKILL.md` with the full content laid out in the Design section above.
2. **Update `seo` agent** to reference the skill (1 bullet under Scope).
3. **Update `content` agent** to add an `## AEO writing rules` section referencing the skill.
4. **Update `schema` agent** to add a note about prioritising FAQPage/HowTo/QAPage for AEO pages.
5. **Update `/copy-review`** to load the skill in the content agent's context block.
6. **Update `/intake`** Phase 4 to include an AEO stream in the parallel audit.
7. **Verify skill YAML parses** — quick syntax check by reading the file back.
8. **Dry-run the rubric** — manually run through the rubric against one RHP page (home or about) to confirm all 20 checks are actionable and the scorecard format works. Record the output as a sample in a comment or appendix in the skill file (optional — or just validate in conversation).

## Files to create

- `.claude/skills/ai-search-aeo/SKILL.md` (new)

## Files to modify

- `.claude/agents/seo.md`
- `.claude/agents/content.md`
- `.claude/agents/schema.md`
- `.claude/commands/copy-review.md`
- `.claude/commands/intake.md`
- `.claude/queue.json` (add the task entry)

## Agents needed

- **content-writer / docs-writer** — not defined in this repo as an agent. Use the main Claude (Opus) thread to write the skill and edit agents/commands directly. No subagent needed.
- **convention-auditor** (optional, end of build) — run `/audit-claude-files` against the new + modified files to confirm convention compliance.

## Parallelisation map

Reference: `parallelisation` skill.

**Sequential backbone:**
- Task 1 (create skill file) must complete first — all other tasks reference it.

**Parallel stream (after Task 1):**
- Tasks 2–6 can all run in parallel. They each edit a different file and have no inter-dependencies.
- Est. time: ~5 minutes each if done in parallel; ~20 minutes sequentially.
- Est. tokens: light (each edit is a single section addition, <500 tokens per file).

**Final verification (sequential):**
- Task 7 (YAML parse check) — instant.
- Task 8 (dry-run rubric) — requires reading a sample page; 5–10 minutes.

**Recommendation:** Parallel for Tasks 2–6. No worktrees needed (same branch, single writer). No agent teams needed (edits are small enough for the main thread).

## Architectural decisions (ADR candidates)

No ADR needed. This is a new documentation skill that follows existing conventions (YAML frontmatter + XML body, `.claude/skills/` layout, light agent integration). No new patterns introduced.

## Acceptance Tests

**N/A — skill content task, no Playwright infrastructure applies.**

This task creates and edits `.claude/*` Markdown documentation. There is no runtime JavaScript, no DOM, no staging page to test. The RHP Playwright infra is project-scoped to `projects/ready-hit-play-prod/` and cannot validate monorepo skill content.

**Verification is manual** — see the Verify Loop below.

## Verify Loop

### Pass/fail criteria

- [ ] `.claude/skills/ai-search-aeo/SKILL.md` exists
- [ ] YAML frontmatter parses cleanly (no tab indentation, no unescaped colons)
- [ ] Body uses XML tags matching existing skills: `<objective>`, `<quick_start>`, `<audit_rubric>`, `<copywriting_rules>`, `<page_structure_patterns>`, `<maturity_assessment>`, `<integration>`, `<success_criteria>`
- [ ] `description` field contains at least one trigger phrase per blog theme: "AEO", "Answer Engine", "AI search", "ChatGPT", "Perplexity"
- [ ] `seo` agent contains a reference to `ai-search-aeo` under its Scope list
- [ ] `content` agent contains a new `## AEO writing rules` section referencing the skill
- [ ] `schema` agent contains a note about FAQPage/HowTo/QAPage priority referencing the skill
- [ ] `/copy-review` command loads the skill in the content agent context
- [ ] `/intake` command adds an AEO stream to Phase 4
- [ ] Dry-run the audit rubric on 1 real page (e.g. the RHP about page or Carsa homepage) and confirm all 20 checks produce an actionable verdict — not vague guesses
- [ ] Rubric scorecard renders with readable category totals and a Flesch score line

### Reproduction steps

1. Read the skill file back after writing it — verify YAML parses visually and XML tags are balanced.
2. Read each modified agent/command file — verify the new section is present and references the skill by name.
3. Open the Carsa homepage (https://carsa.co.uk) or RHP home (https://www.readyhitplay.com) in a browser.
4. Manually walk the 20-check rubric against the page. For each check, the skill should give you enough signal to mark ✅/⚠️/❌ without guessing.
5. Compute the scorecard. If any category feels ambiguous, rewrite that section of the rubric.

### Tier mapping

- **Tier 1 — Auto (Playwright local):** N/A
- **Tier 2 — Auto (CDN regression):** N/A
- **Tier 3 — Manual:**
  - **YAML + XML structural check** (can't automate without adding a markdown/YAML linter to the monorepo — overkill for one file; just read it back)
  - **Dry-run rubric on a real page** (subjective — automation can't judge whether a rubric check is "actionable")
  - **Agent/command reference check** (could grep for `ai-search-aeo` across `.claude/agents/` and `.claude/commands/` — do this as the quick sanity check)

### Regression scope

What must NOT break:
- Existing `seo`, `content`, `schema` agents still work for their original scope — the skill is additive, not replacing anything.
- `/copy-review` still runs without the skill if triggered in a context where the skill isn't loaded (skill reference is a "load if available" pattern, not a hard dependency).
- `/intake` Phase 4 still produces the existing 3 audit streams; the AEO stream is a 4th addition, not a replacement.
- `.claude/queue.json` keeps its shape — just one new entry appended.

**Self-check:** Does this verify loop answer "how does `/build` know this feature is working?" Yes — grep for skill name in modified files, read the skill file back, dry-run the rubric on a real page.

## Open questions

None — scope is locked via the 4 clarifying questions.

## Out of scope

- New `/aeo-audit` command (considered, rejected — light integration first, command later if needed)
- New `aeo-auditor` subagent (not needed — `seo` + `content` + `schema` agents cover the work)
- Automated Flesch score calculation (would require adding a library; skill can just tell the agent to estimate)
- Real-time AI citation monitoring (Profound/Ahrefs-style) — out of scope for a skill; needs a separate tool
- Updating actual client copy — this task delivers the skill; using it to rewrite copy is a follow-up task per client
