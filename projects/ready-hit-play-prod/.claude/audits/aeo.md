# AEO Audit — Ready Hit Play

**Date:** 2026-05-04 (pre-launch)
**Domain:** rhpcircle.webflow.io (staging) / readyhitplay.com (production)
**Pages audited:** Homepage, About

---

## Homepage: https://rhpcircle.webflow.io/

### A. Schema & Structured Data

| # | Check | Verdict | Notes |
|---|-------|---------|-------|
| A1 | Top-level JSON-LD present | ✅ PASS | Organization (with founders, sameAs, knowsAbout) + WebSite schema in @graph |
| A2 | FAQPage schema on Q&A content | N/A | No FAQ content on homepage |
| A3 | HowTo schema on tutorials | N/A | No tutorial content |
| A4 | Rich Results Test clean | NEEDS VERIFY | Run against production URL post-launch |

### B. Answer-First Content Structure

| # | Check | Verdict | Notes |
|---|-------|---------|-------|
| B5 | First paragraph answers the query | ❌ FAIL | No body paragraph answers "What is Ready Hit Play?" — the page opens with animated word sequences ("Be ready / To create / A hit") and the only visible paragraph is "It starts with a conversation." No definition lead. |
| B6 | H2s phrased as questions | ❌ FAIL | Only H2s are "Contact" and an empty string. Zero question headings on a page that should answer "What does Ready Hit Play do?" |
| B7 | 3 or fewer paragraphs per heading | ✅ PASS | Minimal paragraph content — only 2 short paragraphs total |
| B8 | 3 or fewer sentences per paragraph | ✅ PASS | Both paragraphs are single sentences |
| B9 | Lists have explanatory intro | N/A | No lists on page |
| B10 | Active voice dominant | ⚠️ NEEDS ATTENTION | Too little copy to assess properly. Meta description is active voice ("We tell stories...") but body content is mostly fragments. |

### C. Freshness Signals

| # | Check | Verdict | Notes |
|---|-------|---------|-------|
| C11 | Visible "last updated" timestamp | ❌ FAIL | No date or timestamp visible anywhere |
| C12 | Updated within 90 days | NEEDS VERIFY | No visible date to confirm; content appears current |
| C13 | No time-sensitive hedge words | ✅ PASS | No instances of "new", "recently", "upcoming", "currently" |

### D. Authority / E-E-A-T

| # | Check | Verdict | Notes |
|---|-------|---------|-------|
| D14 | Original data/stats/research | ❌ FAIL | No original numbers, benchmarks, or research on homepage |
| D15 | Author/entity signals present | ⚠️ NEEDS ATTENTION | Organization schema includes founders (Ryan Crisman, Guy Seese) but no visible byline or bio on the page itself |
| D16 | External citations to primary sources | ❌ FAIL | Zero outbound links to external sources |
| D17 | Content fits cite-magnet archetype | ❌ FAIL | Generic brand homepage — not a stats piece, how-to, comparison, or definitive guide |

### E. Technical AEO

| # | Check | Verdict | Notes |
|---|-------|---------|-------|
| E18 | Descriptive alt text | ❌ FAIL | All 6 images checked have empty alt text |
| E19 | 2+ internal links to related pages | ⚠️ NEEDS ATTENTION | Links to /about and /privacy-policy. Minimal cluster — no links to services, work, or blog pages |
| E20 | robots.txt allows AI bots | ❌ FAIL | `Disallow: /` blocks ALL bots. This is the .webflow.io staging default. Production robots.txt must explicitly allow GPTBot, ClaudeBot, PerplexityBot, and Googlebot. |

### Homepage Scorecard

```
A. Schema:           1/2* ✅  (* 2 checks N/A, 1 NEEDS VERIFY)
B. Answer Structure: 2/5* ⚠️  (* 1 check N/A)
C. Freshness:        1/2* ❌  (* 1 NEEDS VERIFY)
D. Authority:        0/4  ❌
E. Technical:        0/3  ❌
─────────────────────────────────
Total:               4/16  (applicable checks)
Effective score:     5/20  Flesch: N/A (insufficient body copy to estimate)
```

---

## About Page: https://rhpcircle.webflow.io/about

### A. Schema & Structured Data

| # | Check | Verdict | Notes |
|---|-------|---------|-------|
| A1 | Top-level JSON-LD present | ✅ PASS | AboutPage schema with mainEntity (Organization) + BreadcrumbList + WebSite |
| A2 | FAQPage schema on Q&A content | N/A | No FAQ section |
| A3 | HowTo schema on tutorials | N/A | No tutorial content |
| A4 | Rich Results Test clean | NEEDS VERIFY | Run against production URL post-launch |

### B. Answer-First Content Structure

| # | Check | Verdict | Notes |
|---|-------|---------|-------|
| B5 | First paragraph answers the query | ❌ FAIL | Page opens with "Most creative work is made for reach. Ours is made for impact." — evocative but doesn't answer "What is Ready Hit Play?" or "Who is Ready Hit Play?" A definition lead is missing. |
| B6 | H2s phrased as questions | ❌ FAIL | H2s are: "Goosebumps don't lie", "What we know", "WHERE IT COMES FROM", "WHY READY HIT PLAY EXISTS", "Great stories made undeniable", "Services". Two question-adjacent headings exist but aren't phrased as actual questions AI engines can match. |
| B7 | 3 or fewer paragraphs per heading | ❌ FAIL | The "WHERE IT COMES FROM" section has 8+ paragraphs before the next heading |
| B8 | 3 or fewer sentences per paragraph | ⚠️ NEEDS ATTENTION | Most paragraphs are 1-2 sentences (good). However, one paragraph ("For 8.5 years in New York City...") is 4 sentences and 90+ words. |
| B9 | Lists have explanatory intro | N/A | No lists on page |
| B10 | Active voice dominant | ✅ PASS | Copy is overwhelmingly active voice: "He carried that discipline...", "Ryan founded...", "We build..." |

### C. Freshness Signals

| # | Check | Verdict | Notes |
|---|-------|---------|-------|
| C11 | Visible "last updated" timestamp | ❌ FAIL | No visible date anywhere |
| C12 | Updated within 90 days | NEEDS VERIFY | No date present to verify |
| C13 | No time-sensitive hedge words | ⚠️ NEEDS ATTENTION | "In 2020, Ryan founded Ready Hit Play" — technically time-stamped, not a hedge word. Overall clean, but the specific year anchors content that could age. |

### D. Authority / E-E-A-T

| # | Check | Verdict | Notes |
|---|-------|---------|-------|
| D14 | Original data/stats/research | ⚠️ NEEDS ATTENTION | Contains specific credentials: "250+ interviews", "8.5 years", "WNYU 89.1", "Library of Congress preservation" — these are original facts but not formatted for extraction (no callout/pull-quote treatment) |
| D15 | Author/entity signals present | ✅ PASS | Clear entity attribution: Ryan Crisman's story with specific career history, named productions (The Wait, D Rose), named brands (adidas, Microsoft, Tommy Hilfiger, Columbia) |
| D16 | External citations to primary sources | ❌ FAIL | Zero outbound links despite referencing Library of Congress, WNYU, Chloe Sevigny, etc. — every claim is uncited |
| D17 | Content fits cite-magnet archetype | ❌ FAIL | Narrative brand page — compelling story but not structured as a cite-magnet (no stats page, guide, comparison, or tutorial) |

### E. Technical AEO

| # | Check | Verdict | Notes |
|---|-------|---------|-------|
| E18 | Descriptive alt text | ⚠️ NEEDS ATTENTION | Historical photos have good alt text ("1998, Ryan with John Lee Hooker", "D-Rose The Return"). But 7/14 images have empty alt text including hero/portfolio images. |
| E19 | 2+ internal links to related pages | ⚠️ NEEDS ATTENTION | Links to homepage and /privacy-policy only. No links to individual work/case-study pages, no links to services pages |
| E20 | robots.txt allows AI bots | ❌ FAIL | Same sitewide issue — `Disallow: /` blocks all bots |

### About Page Scorecard

```
A. Schema:           1/2* ✅  (* 2 checks N/A, 1 NEEDS VERIFY)
B. Answer Structure: 1/5* ❌  (* 1 check N/A)
C. Freshness:        0/2* ❌  (* 1 NEEDS VERIFY)
D. Authority:        1/4  ❌
E. Technical:        0/3  ❌
─────────────────────────────────
Total:               3/16  (applicable checks)
Effective score:     4/20  Flesch: ~62 (estimated — long sentences in origin story drag score down)
```

**Flesch estimate (About page):** Sampled 5 paragraphs. Average ~18 words/sentence, ~1.5 syllables/word. Estimated Flesch: 206.835 - (1.015 x 18) - (84.6 x 1.5) = 206.835 - 18.27 - 126.9 = ~62. Below target of 80.

---

## Overall AEO Score

```
                    Homepage    About    Average
A. Schema:            1/2        1/2      1/2
B. Answer Structure:  2/5        1/5      1.5/5
C. Freshness:         1/2        0/2      0.5/2
D. Authority:         0/4        1/4      0.5/4
E. Technical:         0/3        0/3      0/3
─────────────────────────────────────────────────
Total (applicable):   4/16       3/16
Normalised /20:       5/20       4/20     4.5/20
```

### Maturity Level: L1 — Invisible

The site has solid schema foundations (Organization, AboutPage, BreadcrumbList) but is otherwise invisible to AI answer engines. No content is structured for extraction. No cite-magnet pages exist. No FAQ blocks. No question headings. Body copy is written for emotional impact rather than information retrieval.

---

## Prioritised Fix List

### Tier 1 — Schema & Technical (ship in 1 day)

| Priority | Fix | Impact | Effort |
|----------|-----|--------|--------|
| 1 | **Production robots.txt: allow AI bots** — Add explicit `Allow` for GPTBot, ClaudeBot, PerplexityBot, Google-Extended. Without this, no AI engine can index any content. | Critical | 5 min |
| 2 | **Add alt text to all images** — Homepage has 6 images with empty alt; About has 7. Use descriptive alt: "Ready Hit Play brand film production still — Remote company" etc. | High | 30 min |
| 3 | **Run Rich Results Test** on production schemas to confirm zero errors | Medium | 10 min |

### Tier 2 — Freshness (ship in 1 day)

| Priority | Fix | Impact | Effort |
|----------|-----|--------|--------|
| 4 | **Add "Last updated" component** — visible footer or sidebar timestamp on About page and any future content pages. Format: "Last updated: May 2026" | High | 15 min |
| 5 | **Establish refresh cadence** — quarterly review of About copy and homepage messaging in content ops doc | Medium | — |

### Tier 3 — Answer-First Leads (ship in 1 sprint)

| Priority | Fix | Impact | Effort |
|----------|-----|--------|--------|
| 6 | **Homepage: add a visible intro paragraph** — above or below the hero animation. Example: "Ready Hit Play is a creative studio in Amsterdam that produces brand films, strategic messaging, and digital experiences for ambitious brands." This single sentence makes the page extractable. | Critical | 15 min |
| 7 | **About page: add definition lead** — First visible paragraph should be: "Ready Hit Play is a creative branding agency founded in Amsterdam by Ryan Crisman. We produce brand films, strategic messaging, identity systems, and digital experiences for brands like Microsoft, Remote, and Overland AI." | High | 15 min |
| 8 | **About page: break up origin story** — Add subheadings every 3 paragraphs in the "WHERE IT COMES FROM" section. Suggestions: "The radio years", "Feature film and branded entertainment", "The founding principle" | Medium | 20 min |
| 9 | **Rephrase H2s as questions where possible** — "What we know" -> "What does Ready Hit Play do?"; "WHY READY HIT PLAY EXISTS" -> "Why does Ready Hit Play exist?"; "WHERE IT COMES FROM" -> "Where did Ready Hit Play come from?" | Medium | 10 min |

### Tier 4 — Authority (roadmap, 2-4 weeks)

| Priority | Fix | Impact | Effort |
|----------|-----|--------|--------|
| 10 | **Add FAQ block to About page** with FAQPage schema — 5-7 questions: "Who founded Ready Hit Play?", "Where is Ready Hit Play based?", "What brands has Ready Hit Play worked with?", "What services does Ready Hit Play offer?" | High | 1 hr |
| 11 | **Add external citations** — Link "Library of Congress" text to actual archive page; link client names to their official sites or the specific work | Medium | 30 min |
| 12 | **Create a cite-magnet page** — e.g. "The anatomy of a brand film" (how-to guide) or "Brand storytelling statistics" (stats page). This gives AI engines a reason to cite RHP as a source. | High | 1-2 weeks |
| 13 | **Internal linking architecture** — As work/case-study pages are added, link from About to specific projects, and from homepage to services breakdown | Medium | Ongoing |
| 14 | **Format credibility stats as callouts** — "250+ interviews", "8.5 years on WNYU", "Library of Congress preservation" — make these visually distinct and extractable (pull quotes or stat blocks with structured data) | Medium | 1 hr |

### Needs User Input

- **A4:** Rich Results Test needs to be run on production URL post-launch
- **C12:** Confirm content has been reviewed/updated within 90 days for launch
- **E20:** Confirm production domain robots.txt will differ from staging default — currently blocks all crawlers

---

## Summary

Ready Hit Play's content is beautifully written for emotional resonance but currently invisible to AI answer engines. The schema foundation is strong (Organization, AboutPage, BreadcrumbList with founders and sameAs) — this puts RHP ahead of most creative agencies on structured data. The critical gap is the answer layer: no page has a definition lead, question headings, or FAQ block that an AI engine can extract as a direct answer.

The single highest-impact fix is ensuring the production robots.txt allows AI crawlers. Without that, nothing else matters. Second priority: add one extractable definition paragraph to each page. These two changes — 20 minutes of work — move the site from L1 (Invisible) to the threshold of L2 (Emerging).
