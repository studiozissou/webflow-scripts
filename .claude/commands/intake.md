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

Reference the `parallelisation` skill. Present the gate with 3 independent streams:

| # | Stream | Agent type | Est. tokens | Est. wall time |
|---|--------|-----------|-------------|----------------|
| 1 | Technical + Analytics | Explore | ~18k | ~15s |
| 2 | SEO | seo (Explore) | ~18k | ~15s |
| 3 | Content + Code inventory | Explore | ~14k | ~12s |

Sequential: ~45s / ~50k tokens. Parallel: ~25s / ~55k tokens (~1.8x faster, +1.1x cost).
Medium risk (WebFetch can be flaky on some checks).

**Recommendation: Parallel** (independent check domains, read-only).

If user approves parallel, spawn 3 subagents simultaneously. If sequential, run in order.

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
| Alignment | Analytics not firing before consent |

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

## Verification tests

1. `client.md` exists with all 10 questions answered
2. `intake.json` exists with `urls`, `pages`, `collections`, `checks` keys
3. All audit folders exist
4. Webflow `site-audit`, `link-checker`, `accessibility-audit` skills invoked
5. Both URLs confirmed before audit ran
6. Report written if requested
