---
name: ai-search-aeo
description: Guides AEO (Answer Engine Optimization) and AI-search audits, copywriting, and page structure for Webflow sites so content gets selected, extracted, and cited by ChatGPT, Perplexity, Claude, Gemini, and Google SGE. Use this skill whenever you're auditing a page for AI visibility, writing answer-first copy, structuring FAQ or cluster content, scoring freshness signals, evaluating authority / E-E-A-T, running /copy-review or /intake passes, or any time the user mentions AEO, answer engine optimization, AI search, generative search, ChatGPT citations, Perplexity, or getting quoted by AI — even if they don't name the skill explicitly.
---

<objective>
Help the agent audit, write, and structure content so AI answer engines (ChatGPT, Perplexity, Claude, Gemini, SGE) will select, extract, and cite it. Three concrete deliverables:

1. A **20-check audit rubric** with a scorecard, usable on a single page in under ten minutes.
2. **Copywriting rules** that make content extractable as standalone passages.
3. **Page structure patterns** — content types that earn citations, how to cluster them, and when to add an FAQ block or flagship anchor asset.

Traditional SEO gets pages indexed. AEO gets passages quoted. This skill teaches the second thing.
</objective>

<quick_start>
Pick the branch that matches the task:

- **Auditing one page** → jump to `<audit_rubric>`. Score all 20 checks, render the scorecard, then recommend fixes in priority order (schema + freshness first — they're highest leverage).
- **Writing or reviewing copy** → jump to `<copywriting_rules>`. Check answer-first lead, question H2s, paragraph length, and extractable chunks. If a Design Context Block is provided, apply its brand voice *on top of* these structural rules.
- **Designing page structure or content strategy** → jump to `<page_structure_patterns>`. Choose a cite-magnet archetype and wire up anchor → cluster → internal links.
- **Site-wide strategic review** (e.g. during `/intake`) → run the rubric on 2–3 key pages, then offer the optional `<maturity_assessment>` as an overlay to identify which level the site is at and what level-up moves to recommend.

Not sure which branch? The user said "audit" or "score" → rubric. They said "rewrite" or "tone" → copywriting rules. They said "strategy" or "roadmap" → structure + maturity.
</quick_start>

<audit_rubric>
Run all 20 checks. For each, emit `✅ PASS`, `⚠️ NEEDS ATTENTION`, or `❌ FAIL` with a one-line fix. Never guess — if a check requires data you don't have (e.g. analytics, Rich Results Test output), mark it `NEEDS VERIFY` and flag it in the recommendations.

### A. Schema & Structured Data (4 checks)

1. **Top-level JSON-LD present** — Page has at least one valid schema.org block (Organization, Article, WebPage, Product, etc.). Empty `<script type="application/ld+json">` with no type counts as fail.
2. **FAQPage schema on Q&A content** — Any visible Q&A section has FAQPage markup. Missing schema on a visible FAQ block is a fail; no FAQ content at all is N/A.
3. **HowTo schema on tutorials** — Step-by-step content uses HowTo schema. Missing = fail. No tutorial content = N/A.
4. **Rich Results Test clean** — Schema passes Google's Rich Results Test with zero errors. This is a manual gate — mark `NEEDS VERIFY` if not run yet.

### B. Answer-First Content Structure (6 checks)

5. **First paragraph answers the query** — The opening sentence directly addresses what the page claims to answer. Rephrase the query in the answer ("X is a Y that…"). Vague brand intros or mood-setting copy = fail.
6. **H2s phrased as questions where natural** — "What is X", "How to Y", "Why does Z" on pages that genuinely answer those questions. Not every H2 needs to be a question; but pages with zero question headings on Q&A-style content fail.
7. **≤ 3 paragraphs per heading** — Any heading followed by 4+ paragraphs without a subheading is a fail (the passage becomes too long to extract cleanly).
8. **≤ 3 sentences per paragraph** — Spot-check 3–5 paragraphs. One or two long paragraphs = warn; majority long = fail.
9. **Lists have an explanatory intro sentence** — Every `<ul>`/`<ol>` is introduced by a sentence that sets context. Bare lists with no lead-in fail.
10. **Active voice dominant** — Spot-check 3–5 sentences. Pure passive voice ("is used by", "was chosen by") should be the exception, not the pattern.

### C. Freshness Signals (3 checks)

11. **Visible "last updated" timestamp** — A component on the page showing the most recent update date. Copyright year alone doesn't count.
12. **Updated within 90 days (or refresh cadence documented)** — For evergreen pages, last update should be within the past quarter, OR a content strategy doc names a refresh cadence for this page type.
13. **No time-sensitive hedge words** — Scan for "new", "recently", "upcoming", "this year", "currently". Every instance is a small rot risk; 3+ = fail.

### D. Authority / E-E-A-T (4 checks)

14. **Original data, stats, or research cited** — Page contains at least one original number, chart, or finding — or links to a flagship anchor asset that does.
15. **Author/entity signals present** — Byline with bio, company author schema, or clear entity attribution. Anonymous posts on an expertise topic fail.
16. **External citations to primary sources** — Outbound links to research papers, official docs, or authoritative sources — not only to other pages on the same site.
17. **Content fits a cite-magnet archetype** — The page is a stats piece, how-to guide, comparison, or definitive guide. Generic marketing copy is a fail for AEO purposes (even if fine for brand).

### E. Technical AEO (3 checks)

18. **Descriptive alt text** — Spot-check 3–5 images. Empty alt on informative images = fail. Decorative images with empty alt = pass.
19. **2+ internal links to related pages** — Builds the semantic cluster. Orphan pages fail.
20. **`robots.txt` allows AI bots (or disallow is deliberate)** — Check for `GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`. Default-allow is fine. A blanket disallow the user isn't aware of is a fail — flag for their decision.

### Scorecard format

Render like this (include the Flesch score line at the bottom):

```
A. Schema:           3/4  ⚠️
B. Answer Structure: 5/6  ⚠️
C. Freshness:        1/3  ❌
D. Authority:        2/4  ⚠️
E. Technical:        3/3  ✅
─────────────────────────────
Total:              14/20  Flesch: 72 (target 80+)
```

Flesch score is estimated — you don't need a library. Use the Flesch Reading Ease formula for 3–5 sampled paragraphs: `206.835 − 1.015 × (words / sentences) − 84.6 × (syllables / words)`. Round generously; the score is directional, not precise. Targets: **80+ for L2**, **90+ for L3+**.

### Fix ordering

When presenting recommendations, order by leverage:

1. **Schema fixes** — cheapest to ship, biggest visibility lift for AI engines
2. **Freshness component + copy updates** — visible signal, simple to add
3. **Answer-first lead rewrites** — transforms extraction quality
4. **Authority additions** — harder, longer cycle; flag as roadmap work

Skip `NEEDS VERIFY` items in the top fixes — list them separately as "needs user input".
</audit_rubric>

<copywriting_rules>
These rules define **structure**. Brand voice defines **feel**. If a Design Context Block is provided (from `design-context` skill), layer its tone adjectives, audience alignment, and do/don't words on top of what's below.

### Answer-first leads

The first sentence of the first paragraph rephrases the likely query in statement form. Two patterns work:

- **Definition:** "X is a [category] that [does Y for Z audience]."
- **Direct answer:** "To [do X], you need [main thing] and [supporting thing]."

Avoid brand intros, company history, or mood-setting copy in the lead. AI engines grab the first passage; if it doesn't answer, it won't be cited.

### Question-shaped H2s

Use "What is", "How to", "Why does", "When should" headings where the content genuinely answers that question. Pattern-match the user's search phrasing. Don't force every H2 to be a question — it gets gimmicky.

### Paragraph and section length

- **Max 2–3 sentences per paragraph.** If it needs to be longer, split.
- **Max 3 paragraphs per heading.** If you need more, add a subheading.

Why: AI engines extract **passages**. A passage is roughly one paragraph. Longer paragraphs get truncated mid-thought and aren't cited.

### Lists need intros

Every `<ul>`/`<ol>` starts with a sentence that explains what the list is. Bare lists with no lead-in are orphan content — the model can't contextualize them when extracting.

**Example:**

Bad:
```
- Active voice
- Short paragraphs
- Question headings
```

Good:
```
To write for AI extraction, follow three structural rules:
- Active voice
- Short paragraphs
- Question headings
```

### Active voice, plain language

Default to active voice. Passive only when the object is the real subject ("The bill was signed into law"). Target **Flesch 80+** — roughly the reading level of a well-written news article. Kill jargon unless the target audience literally expects it.

### Extractable chunks

Every paragraph should stand alone as a quotable passage if lifted out of context. Test: can you copy one paragraph, paste it into a group chat, and have it make sense with no setup? If not, rewrite — either add context inline or split the idea across paragraphs differently.

### Avoid time-sensitive hedges

Kill "new", "recently", "upcoming", "this year", "currently" unless the exact date is also present. These words rot — a page written in Q1 looks stale by Q3 and AI engines notice.

### Brand voice hook

If a Design Context Block is provided: apply its tone adjectives (e.g. "confident but approachable"), its do/don't words, and its audience level **on top of** the structural rules above. Structure is non-negotiable for extraction; voice is how the extraction *sounds* when it lands.
</copywriting_rules>

<page_structure_patterns>
### Content types that attract citations (cite-magnets)

Pick one archetype per page. Hybrid content (e.g. "a guide with stats") is fine — pick the dominant one.

- **Stats pages** — original surveys, public-data analysis, quantified benchmarks. Highest citation rate; hardest to produce.
- **How-to guides** — definitive tutorials on complex tasks. Good for product + service sites.
- **Comparisons** — side-by-side evaluations (X vs Y, or X vs Y vs Z) with honest pros/cons. AI engines love these for decision-stage queries.
- **Definitive guides** — comprehensive "everything about X" pieces. Anchor material for a cluster.

### Structural patterns

- **Anchor page** — a flagship piece (annual report, research study, definitive guide) that serves as the authority hub. One per topic domain.
- **Supporting answer cluster** — 5–15 pages answering related questions, all internal-linking to the anchor. This is how semantic clustering works.
- **FAQ block** — on product/service pages, a 5–10 question Q&A section with FAQPage schema. Even low-traffic FAQ blocks earn citations because they match query shape directly.
- **Segmented landing pages** — at L4+ (see `<maturity_assessment>`), one landing page per industry/persona/use-case with tailored examples and CTAs.
- **Internal linking architecture** — every update adds 1–2 internal links to related recent pages. This is the single highest-leverage habit for AI visibility.
- **Freshness component** — a visible "last updated: YYYY-MM-DD" block with a quarterly review cadence documented in the content ops doc.

### When to recommend which pattern

| Symptom | Pattern to recommend |
|---|---|
| Low AI citation rate, good traditional SEO | Add FAQ blocks + FAQPage schema on top 10 pages |
| Site has no flagship content | Build one anchor per topic domain before expanding |
| Orphan pages, low internal link density | Audit internal links; add 2+ per update |
| Content goes stale fast | Add freshness component + quarterly refresh cadence |
| All copy reads the same regardless of audience | Segment landing pages by persona/industry (L4+) |
</page_structure_patterns>

<maturity_assessment>
**Offer this only when:** the user asks for a strategic overlay, or the audit is scoring the whole site (not a single page). For single-page audits, skip it — the rubric is enough.

Map the site to one of these 5 levels based on observed patterns. Then recommend 2–3 level-up actions.

### L1 — Keyword foundation
- One-off product/landing pages, mostly branded search traffic
- Meta tags present but no schema beyond Organization
- No FAQ blocks, no content hub
- **Level up:** add FAQPage schema to any Q&A content, start tracking AI referrer traffic (chatgpt.com, perplexity.ai, claude.ai, gemini.google.com, copilot.microsoft.com)

### L2 — Question-answer shift
- Appears in featured snippets and PAA boxes
- Flesch 80+ on new content
- Some question-shaped headings
- **Level up:** target Flesch 90+, add HowTo/FAQPage schemas systematically, introduce a freshness component

### L3 — Semantic clustering
- Anchor assets + supporting clusters
- Flesch 90+ standard
- Refresh cadence every 3–6 months on priority pages
- **Level up:** build one flagship research asset per year, map the full internal link architecture, start pruning underperforming pages

### L4 — Intentional hierarchy
- Segmented landing pages by industry/persona/use-case
- Flagship anchors per topic
- Regular pruning + consolidation
- **Level up:** add interactive tools (calculators, configurators), begin personalization experiments, measure AI-citation share of voice vs competitors

### L5 — Programmatic personalisation
- 1:1 experiences by segment/persona/account
- Interactive tools, calculators, quizzes
- Lower traffic, higher conversion rate
- **Level up:** formalise an AI-search ops function, run quarterly AEO audits, build a citation monitoring dashboard

### How to assess which level

Ask: "What's the most advanced pattern visible on the site?" That's the level. Don't round up — a site with one flagship asset but otherwise L2 behaviours is L2 with a bright spot.
</maturity_assessment>

<integration>
### Hooks into other skills and agents

- **`design-context` skill** — when a Design Context Block is in scope, the copywriting rules in this skill layer *underneath* the brand voice. Structure first, voice on top.
- **`seo` agent** — handles traditional SEO (meta, titles, canonicals, CWV). Defer to that agent for non-AEO concerns; come back here for answer-first scoring.
- **`content` agent** — owns brand voice and copy review. References this skill for AEO writing rules.
- **`schema` agent** — owns JSON-LD generation. For AEO-critical pages, prioritise FAQPage, HowTo, QAPage, and Article schemas per this skill's rubric.
- **`/copy-review` command** — includes this skill in the content agent's context block so copy reviews get AEO scoring in addition to voice scoring.
- **`/intake` command** — Phase 4 includes an AEO audit stream that runs this rubric against the homepage + 2–3 top pages and saves findings under `.claude/audits/<client>/aeo.md`.

### What this skill does *not* do

- **It doesn't calculate Flesch scores precisely.** Estimate in your head; the target is directional. If the user needs an exact number, recommend a browser extension.
- **It doesn't monitor AI citations in real time.** Tools like Profound and Ahrefs do that. This skill scores content *before* it's published, not citation velocity after.
- **It doesn't rewrite copy automatically.** It gives the rules; the `content` agent applies them (optionally with brand voice from `design-context`).
</integration>

<success_criteria>
- Every audit produces a scorecard with 5 category totals + a Flesch line
- Every rubric check has either a PASS/WARN/FAIL verdict or is flagged `NEEDS VERIFY` (no vague hand-waving)
- Fix recommendations are ordered by leverage (schema + freshness first)
- Copywriting reviews apply structural rules + brand voice *together* when a Design Context Block is available
- Maturity assessment is offered only when the scope is strategic/site-wide, never on single-page audits
- The agent never invents analytics data — `NEEDS VERIFY` is the correct answer when data is missing
- Integration with `seo`, `content`, `schema`, `/copy-review`, and `/intake` is additive; nothing in those flows breaks when this skill isn't loaded
</success_criteria>
