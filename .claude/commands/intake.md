# /intake — New Client Site Audit

Run when taking on an existing Webflow site. Captures client context, audits the site,
and produces a prioritised report.

**Never writes to the Webflow project. Read-only throughout.**

---

## Phase 1 — Client context

If `.claude/client.md` already exists, read it and confirm context. Skip questions.

Otherwise ask all of the following in a single conversational block:

1. What's the client name and what does the company do?
2. What's the primary goal of this site? (leads / e-commerce / content / brand)
3. Who is the target audience?
4. What's the geographic market?
5. Any known competitors?
6. What's the engagement scope? (retainer / one-off / build + handoff)
7. Who's the main contact — are they technical?
8. Is there an in-house team or other agencies touching the site?
9. Is this a migration, redesign, or has it been on Webflow from the start?
10. Any issues already flagged, or anything explicitly out of scope?

Write to `.claude/client.md`. Confirm before proceeding.

---

## Phase 2 — Connect and discover

1. Connect via Webflow MCP
2. Retrieve and record in `.claude/intake.json`:
   - Project name and ID
   - Staging and live URLs
   - All pages (slug, title, published status)
   - All CMS collections and item counts
   - Ecommerce config if present
3. Confirm both URLs with user before proceeding

---

## Phase 3 — Scaffold folders

```
.claude/
├── audits/
│   ├── seo/
│   ├── accessibility/
│   ├── performance/
│   └── content/
├── reports/
├── briefs/
├── brand/
├── build/
├── client.md
└── intake.json
```

---

## Phase 4 — Automated checks

Record each as ✅ PASS, ⚠️ NEEDS ATTENTION, or ❌ MISSING/BROKEN.
Write to `intake.json` under `checks`.

### Step 1 — Webflow skills (sequential — MCP connection)
- `site-audit` skill → record output
- `link-checker` skill → record output
- `accessibility-audit` skill → record output

### Step 2 — Parallelisation gate

Reference the `parallelisation` skill. Present the gate with 4 independent streams:

| # | Stream | Agent type | Est. tokens | Est. wall time |
|---|--------|-----------|-------------|----------------|
| 1 | Technical + Analytics | Explore | ~18k | ~15s |
| 2 | SEO | seo (Explore) | ~18k | ~15s |
| 3 | Content + Code inventory | Explore | ~14k | ~12s |
| 4 | AEO / AI-search | Explore + `ai-search-aeo` skill | ~16k | ~15s |

Sequential: ~60s / ~66k tokens. Parallel: ~25s / ~72k tokens (~2.4x faster, +1.1x cost).
Medium risk (WebFetch can be flaky on some checks).

**Recommendation: Parallel** (independent check domains, read-only).

If user approves parallel, spawn 4 subagents simultaneously. If sequential, run in order.

### Stream A — Technical + Analytics
| Check | What to look for |
|---|---|
| `robots.txt` | Present, not blocking crawlers |
| `sitemap.xml` | Present, referenced in robots.txt |
| Custom 404 | Configured in Webflow settings |
| Favicon | Set in Webflow settings |
| SSL | Site served over HTTPS |
| Canonical domain | Consistent WWW/non-WWW |
| Analytics | GA4 or GTM in page embeds |
| Cookie consent | Any consent mechanism present |
| Consent Mode | Check `gtag('consent','default',…)` values — see below |

**Consent Mode:** a correct Consent Mode v2 install loads GTM and fires tags *before* consent,
in `denied` mode. Script load order tells you nothing. Load the page in a clean browser context
(no stored consent cookie) and read `window.google_tag_data.ics.entries` — all `default: false`
is a PASS. If you cannot run a browser, mark `NEEDS VERIFY`; do not guess. See the Consent Mode
check in `/site-audit` for the full method and the separate non-Google tracker check.

### Stream B — SEO
| Check | What to look for |
|---|---|
| Meta titles | Present and unique on all pages |
| Meta descriptions | Present on all pages |
| OG title + image | Set on key pages |
| Canonical tags | Present, no duplicates |
| H1 tags | Exactly one per page |
| Schema.org JSON-LD | Present on homepage |
| `llms.txt` | Present at root — recommend if absent |

### Stream C — Content + Code inventory
| Check | What to look for |
|---|---|
| Forms | Confirmation or redirect set |
| Images | 3+ images missing alt text flagged |
| Viewport | Mobile meta viewport present |

Also list all site-wide and per-page head/body embeds and third-party scripts.

### Stream D — AEO / AI-search
Load the `ai-search-aeo` skill and run the 20-check audit rubric against the homepage + 2–3 top traffic pages (if analytics available) or otherwise the 2–3 most linked pages.

| Check | What to look for |
|---|---|
| Schema (A1–A4) | JSON-LD present, FAQPage on Q&A content, HowTo on tutorials |
| Answer structure (B5–B10) | Answer-first lead, question H2s, paragraph and section length, list intros, active voice |
| Freshness (C11–C13) | Visible "last updated" timestamp, recent update, no time-sensitive hedge words |
| Authority (D14–D17) | Original data/stats, author/entity signals, external citations, cite-magnet archetype |
| Technical (E18–E20) | Descriptive alt text, 2+ internal links, AI bot rules in `robots.txt` |

Save findings to `.claude/audits/<client>/aeo.md` with a scorecard per page and a prioritised fix list (schema + freshness first).

### Step 3 — Merge results
Merge all stream outputs into `intake.json` under `checks`.

---

## Phase 5 — Outputs

Always write `intake.json` and update `client.md`.

Ask: "Generate a client-facing report?"

If yes, write `reports/intake-report-YYYY-MM-DD.md`:
```markdown
# Site Intake Report — [Client Name]
**Date:** | **Live URL:** | **Staging URL:**

## Summary
## ✅ Passing
## ⚠️ Needs attention
## ❌ Missing or broken
## Recommended next steps
## Custom code inventory
```

Ask: "Run Playwright smoke test against staging URL?"
If yes, trigger `/qa-check`.

---

## Phase 6 — Brand context (opt-in)

Ask: "Capture brand context for building? This lets `/client-build` design and
write copy in the client's voice. You can skip this and add it later."

If user skips, record `"brandContext": "skipped"` in `intake.json` and proceed to Phase 7.

If yes, ask all of the following in a single conversational block:

1. **Voice & tone** — How does this brand talk? Formal/casual? Technical/accessible?
   Any words they always/never use? Can you give me an example sentence in their voice?
2. **ICP** — Who is the ideal customer? Demographics, pain points, buying triggers,
   objections? Are there multiple segments?
3. **Design state** — What's the visual spirit? Minimal/maximal? Playful/serious?
   Any reference sites or brands they admire? Design principles they follow?

Write using templates from `.claude/templates/brand-context/`:
- `brand/voice.md` — tone ladder, vocabulary do/don't, example sentences, content principles
- `brand/icp.md` — persona cards per segment
- `brand/design-state.md` — visual principles, aesthetic descriptors, references, personality

Confirm with user before proceeding.

---

## Phase 7 — Design system extraction (opt-in)

Ask: "Extract the design system for building? This pulls variables, styles, and
components so `/client-build` can use the client's design system."

If user skips, record `"designSystem": "skipped"` in `intake.json` and stop.

If yes, ask which source(s) via AskUserQuestion:

1. **Existing Webflow site** (recommended if MCP connected) — extract from the site connected in Phase 2
2. **Figma file** — provide a Figma URL
3. **Reference screenshots** — provide URLs or file paths
4. **Manual entry** — describe the design system verbally

### Webflow extraction (when MCP connected)

1. Read all variables via `variable_tool` → write to `design/figma-tokens.json`
   with `"source": "webflow"` on each token. Use the token format from `/figma-audit`:
   ```json
   {
     "figma_name": null,
     "converted_name": "color-brand-primary",
     "type": "color",
     "value": "#1A4FDB",
     "cf_mapping": "brand-primary",
     "source": "webflow",
     "webflow_variable_id": "var-id-here"
   }
   ```
2. Read all styles via `style_tool` → write to `build/class-reference.md`
   documenting every class with its properties, organised by category
   (typography, buttons, spacing, layout, colours)
3. Read site structure → write to `build/site-config.json` using template from
   `.claude/templates/site-config.json`. Fill in siteId, URLs, pages, CMS collections.
   Identify Style Guide and All Components pages by name and record their IDs.
4. Snapshot home page and 2-3 key pages via `element_snapshot_tool` → write to
   `design/references/`
5. Read components via Webflow MCP (use `element_snapshot_tool` on the All
   Components page if it exists, or list components from the site structure)
   → note reusable components in `build/workflows.md`
6. Copy `.claude/templates/design-laws.md` → `build/design-laws.md`

### Figma extraction

Run `/figma-audit` inline (load the figma-audit command and execute it).
After it completes, also generate `build/site-config.json` from the connected
Webflow project if MCP is available.

### Screenshot extraction

1. Read each screenshot via Read tool (multimodal image support)
2. Extract: colour palette, typography (font family, sizes, weights),
   spacing patterns, border radius, shadow styles
3. Map extracted values to Client First variable names
4. Write partial `design/figma-tokens.json` (with `"source": "screenshot"`)
5. Save screenshots to `design/references/`
6. Warn: "Screenshot tokens are approximate — verify during `/webflow-connect`"
7. Note: font family identification from screenshots is approximate. Record as
   descriptive (e.g. "sans-serif geometric") rather than specific font names.
   Confirm exact fonts with the client.

### Manual entry

Ask the user to describe their design system. Write tokens to
`design/figma-tokens.json` with `"source": "manual"`.

---

Confirm all extracted data with user. Record `"designSystem": "extracted"` in `intake.json`.

---

## Verification tests

1. `client.md` exists with all 10 questions answered
2. `intake.json` exists with `urls`, `pages`, `collections`, `checks` keys
3. All audit folders exist
4. Webflow `site-audit`, `link-checker`, `accessibility-audit` skills invoked
5. Both URLs confirmed before audit ran
6. Report written if requested
7. If Phase 6 ran: `brand/` directory exists with voice.md, icp.md, design-state.md
8. If Phase 7 ran: `build/site-config.json` exists with siteId populated
9. `intake.json` records `brandContext` and `designSystem` status
