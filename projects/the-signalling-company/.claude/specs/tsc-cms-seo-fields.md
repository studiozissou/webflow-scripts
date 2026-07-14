# TSC — Dedicated SEO Fields Across CMS Collections

> Slug: `tsc-cms-seo-fields`
> Client: The Signalling Company
> Date: 2026-07-08
> Status: Built + verified on staging (2026-07-08)
> Author: Will (via Claude)

---

## Build Notes (2026-07-08)

**Site:** `6a32b717a48adbce92029295` (tsc-v2). Published to Webflow subdomain
`https://tsc-v2.webflow.io` (custom domain not yet live). All 37 acceptance
tests green.

**Deviations from plan discovered during build:**
1. **Description field slug is `meta-description`, not `seo-description`.** Products
   & Services already had `seo-title` + `meta-description` from a prior session, so
   the 3 empty collections were given the matching `meta-description` slug for
   consistency. Acceptance test asserts rendered tags, not slugs — unaffected.
2. **Products & Services already had SEO copy in a different convention** (`— The
   Signalling Company` suffix, no CTA). Per client decision (2026-07-08) these 10
   items were **rewritten** to the spec convention (`| TSC`, answer-first, soft CTA).
3. **OG Image field added** to all 5 collections (client request 2026-07-08),
   superseding the plan to reuse Thumbnail. Each item's `og-image` defaulted to its
   `thumbnail` (17 items had one; Products/Services items have no image set).

**Open questions resolved:**
- **Q1 (Phase 2 binding):** ✅ **MCP CAN bind template-page SEO.** The Data API
  accepts `{{wf {"path":"seo-title","type":"PlainText"\} }}` tokens in `seo.title`
  / `seo.description`. All 5 templates bound via `bulk_update_pages`. No manual
  Designer step for title/description. **Exception:** `openGraph.imageUrl` is
  URL-validated and rejects binding tokens — OG *image* binding remains Designer-only.
- **Q2 (wSTM):** archived + draft, no live page. Copy set anyway for when activated.
- **Q3 (news count):** 14 items (13 live + 1 draft: CAF Signalling). All populated.

**Residual manual Designer step (low priority):** bind OG image → `{{ og-image }}`
on the 5 collection templates. Only materially affects RailOS Devices (7 items have
og-image); News/Projects already bind OG image to `{{ thumbnail }}` (== og-image value).

**Also noted (out of scope):** a `RailOS / Apps` collection + `/railos-apps` template
exist (not in this spec's 5). If those item pages are indexable, they need the same
SEO field treatment — flag for a follow-up.

---

## Overview

Add dedicated **SEO Title** and **SEO Description** fields to every CMS collection
whose items render on their **own template page** (their own indexable URL), bind
each collection's template-page SEO settings to those fields, and pre-populate the
fields for all existing items with optimised, on-brand copy.

Right now these template pages inherit no controlled meta description — Webflow
leaves it blank and Google auto-generates a scraped snippet. Titles default to the
item `Name`, which is a headline, not an optimised title tag. This spec fixes both
and makes good metadata the default for every future item.

### In scope — 5 collections (own template page)

| Collection | Template URL pattern | Existing items |
|---|---|---|
| Products | `/products/{slug}` | 5 (etcs, kvb, pzb, tbl1, telecom-box) |
| Services | `/services/{slug}` | 5 |
| RailOS Devices | `/railos-devices/{slug}` | 17 |
| News | `/news/{slug}` | ~13 |
| Case Studies (Clients) | `/projects/{slug}` | 3 (akiem-br189, lineas-hld77, skoda-regiojet) |

**Total items to populate: ~43.**

### Out of scope — excluded per client instruction (2026-07-08)

FAQ, FAQ Categories, News Categories, Leadership (Team Members), Partners. These
render **embedded** inside a parent static page and have **no own URL**, so per-item
SEO fields would never be used. Their meta is owned by the parent page.

> Static pages (Home, RailOS overview, Products/Services/Projects overviews, About,
> Careers, Contact) are **also out of scope here** — their SEO is set directly in
> Webflow page settings, not via CMS fields. Tracked separately; the RailOS example
> already sent to the client belongs to that batch.

---

## Approach

**Chosen: dedicated fields, bound in page settings, pre-populated by us.**

Two new Plain-text fields per collection, the collection template page's Title Tag
and Meta Description bound to them, and every existing item filled with copy we
write following the convention below.

### Approaches considered

| Approach | What | Verdict |
|---|---|---|
| **A — Template-only** | No new fields. Bind title to `{{ Name }} \| The Signalling Company`, description to an existing field like `{{ Short Description }}`. | Zero control; descriptions wrong length or missing; titles are just headlines. Rejected. |
| **B — Dedicated fields, client fills** | Add fields, leave blank for client to write. | Fields ship empty → auto-generated snippets persist until the client finds time. Rejected as default. |
| **C — Dedicated fields, we pre-populate (CHOSEN)** | Add fields, we write copy for all ~43 items, client edits later if desired. | Full control, correct on day one, client keeps ongoing ownership. |

**Known limitation (documented, not a blocker):** Webflow has no conditional/fallback
binding, so if a *future* item is published with the SEO fields left blank, its meta
description will be blank. Mitigated by (a) field help text, (b) making "fill SEO
fields" part of the item-creation checklist, and (c) the QA gate in the Verify Loop.

---

## Field configuration (identical across all 5 collections)

Added via Webflow MCP `data_cms_tool` (create field).

| Field | Type | Slug | Required | Help text |
|---|---|---|---|---|
| SEO Title | Plain text | `seo-title` | No* | "≤ 60 characters incl. any brand suffix. Google truncates ~60. Front-load the key term." |
| SEO Description | Plain text | `seo-description` | No* | "150–155 characters. Summarise the page in plain English. No invented claims — use copy from the page." |

\* Left **not required** so imports/drafts don't break, but treated as
**required-on-publish** by the QA gate. Webflow can't enforce length, so the help
text carries the guidance.

---

## Page-settings binding (per collection template page)

Set on each collection's **template page → Settings → SEO** (and Open Graph):

| Setting | Bind to |
|---|---|
| Title Tag | `{{ SEO Title }}` |
| Meta Description | `{{ SEO Description }}` |
| OG Title | `{{ SEO Title }}` (falls back to `{{ Name }}` if OG must be non-empty) |
| OG Description | `{{ SEO Description }}` |
| OG Image | existing `{{ Thumbnail }}` / `{{ Featured Image }}` field |

> **RISK — verify MCP capability.** Binding a *collection template page's* SEO fields
> to CMS field variables may be a Designer-level setting the Webflow **Data** API /
> MCP `data_pages_tool` cannot set (the Data API reliably sets SEO on *static* pages).
> **Build step 2 must first confirm** whether `data_pages_tool` can write a dynamic
> field binding on a collection page. If it cannot, this becomes a **manual Designer
> step** (5 pages, ~10 min) — document it in the build notes and hand a checklist to
> whoever has Designer access. This does not change fields or copy, only who clicks.

---

## Authoring convention (the reusable ruleset)

This is the standard the copy for all ~43 items follows — and the reference for
every future item.

1. **Title** ≤ 60 chars. Front-load the term a buyer/searcher types. Append
   `| The Signalling Company` where budget allows; use `| TSC` when tight; **drop the
   suffix on long editorial (News) titles** rather than truncate the headline.
2. **Description** 150–155 chars. Answer-first. Name the credibility signals that do
   the persuading in this market — standards (ETCS, TBL1+, PZB, KVB), certifiers
   (TÜV Rheinland), marquee names (Škoda, Lineas). Specificity beats adjectives.
3. **CTA rule** (agreed 2026-07-08): a **soft** CTA on commercial collections
   (Products, Services, Case Studies, RailOS Devices) — a plain descriptor of the
   next step ("See the product.", "Read the case study."), only if there's room.
   **No CTA on News** — lead with the hook and facts.
4. **No invented claims.** Every line traces to on-page copy. Non-negotiable for a
   safety-critical brand.
5. **Diacritics preserved** — Škoda, TÜV, CO₂ — in both fields.

### Worked examples (2 per collection — the build populates the rest to match)

**Products** — `/products/{slug}`
- `etcs` — **Title:** ETCS Onboard: Software-Defined Train Protection | TSC ·
  **Desc:** TSC's ETCS onboard system delivers pan-European train protection,
  software-defined on RailOS — lighter, faster to install and retrofit-ready. See the product.
- `pzb` — **Title:** PZB Class B ATP for Germany, Austria & Beyond | TSC ·
  **Desc:** Run PZB national train protection software-defined on RailOS, alongside
  ETCS on one platform — for fleets in Germany, Austria and Romania. See the product.

**Services** — `/services/{slug}`
- `etcs-retrofit-viability-assessment` — **Title:** ETCS Retrofit Viability Assessment | TSC ·
  **Desc:** Find out if your fleet is ETCS-retrofit ready. TSC assesses feasibility,
  cost and installation risk before you commit — proven on Akiem's pan-European fleet.
- `first-in-class-homologation` — **Title:** First-in-Class ETCS Homologation Services | TSC ·
  **Desc:** TSC guides your ETCS system through national safety authority homologation
  — the first-in-class approval that unlocks series rollout. See the service.

**RailOS Devices** — `/railos-devices/{slug}`
- `ievc` — **Title:** iEVC: Safe Computer for RailOS ATP Applications | TSC ·
  **Desc:** The iEVC is TSC's SIL4 safe computer running ETCS, ATO and TCMS on RailOS —
  consolidating several onboard units into one device. See the datasheet.
- `gsm-r-frmcs-radio` — **Title:** GSM-R & FRMCS Radio for ETCS Onboard | TSC ·
  **Desc:** TSC's GSM-R and FRMCS radio delivers ERTMS voice and data connectivity for
  ETCS onboard systems, ready for the FRMCS migration. See the datasheet.

**Case Studies** — `/projects/{slug}`
- `lineas-hld77` — **Title:** Lineas HLD77 ETCS Retrofit Case Study | TSC ·
  **Desc:** How TSC retrofitted ETCS and Belgian Class B across 109 Lineas HLD77 freight
  locomotives in Belgium, the Netherlands and Germany. Read the case study.
- `skoda-regiojet` — **Title:** Škoda 27Ev New-Build ETCS Integration | TSC ·
  **Desc:** How TSC integrated ETCS and Class B into 34 new Škoda 27Ev trains for
  RegioJet — cutting 19,000 tonnes of CO₂ a year. Read the case study.

**News** — `/news/{slug}` (no CTA, suffix dropped where the headline is long)
- `worlds-first-software-defined-etcs-certified` — **Title:** World's First
  Software-Defined ETCS Safety System Certified · **Desc:** TÜV Rheinland has certified
  TSC's on-board ETCS as the world's first software-defined train protection system —
  now adopted by Škoda Group.
- `etcs-wins-railtech-innovation-award` — **Title:** TSC's ETCS Wins the RailTech
  Innovation Award 2026 · **Desc:** The Signalling Company's software-defined ETCS has
  won the RailTech Innovation Award 2026, recognising its impact on cost and safety in rail.

---

## Execution plan

### Phase 1 — Add fields (Webflow MCP `data_cms_tool`)
Create `seo-title` + `seo-description` on each of the 5 collections. 10 field creates.
Collections are independent → parallelisable.

### Phase 2 — Bind template-page SEO (verify tool first — see RISK above)
For each of the 5 collection template pages, bind Title Tag / Meta Description / OG
to the new fields. Via `data_pages_tool` if supported, else manual Designer checklist.

### Phase 3 — Write + populate copy (per item, `data_cms_tool` update item)
Write SEO title + description for all ~43 items following the convention, then set
`seo-title` / `seo-description` on each item. Independent per collection → parallel by
collection. Copywriting by the **seo** agent; item writes by **code-writer**.

### Phase 4 — Publish
Bulk publish all 5 collections.

### Phase 5 — Verify
Run acceptance tests against staging (Phase-5 detail in Verify Loop).

---

## Parallelisation Map

| Stream | Task | Agent | Depends on | Est. MCP calls |
|---|---|---|---|---|
| A | Add 2 fields to Products | code-writer | — | 2 |
| B | Add 2 fields to Services | code-writer | — | 2 |
| C | Add 2 fields to RailOS Devices | code-writer | — | 2 |
| D | Add 2 fields to News | code-writer | — | 2 |
| E | Add 2 fields to Case Studies | code-writer | — | 2 |
| F | Bind SEO on all 5 template pages | code-writer | A–E | 5 (or manual) |
| G | Write copy for all ~43 items | seo | — (can start immediately) | 0 (drafting) |
| H | Populate Products items (5) | code-writer | A, G | ~5 |
| I | Populate Services items (5) | code-writer | B, G | ~5 |
| J | Populate Devices items (17) | code-writer | C, G | ~17 |
| K | Populate News items (~13) | code-writer | D, G | ~13 |
| L | Populate Case Study items (3) | code-writer | E, G | ~3 |
| M | Publish + verify | qa | F, H–L | ~6 |

**Parallel:** A+B+C+D+E together; G in parallel with all field creation; H–L parallel
by collection once their field + copy are ready. **Sequential:** F after A–E; M last.
**Worktrees:** No — all work is Webflow-side via MCP, no local file conflicts.
**Recommendation:** parallel by collection, single agent team, no worktrees.

---

## Barba Impact

N/A — no Barba transitions on this project. Pure Webflow CMS/SEO config, no JS.

---

## Test Plan (3 tiers)

### Tier 1 — Auto: Playwright local (`tests/acceptance/tsc-cms-seo-fields.spec.js`)
Meta tags are directly assertable on the rendered staging page:
- Worked-example item pages have the **exact** expected `<title>` and
  `meta[name="description"]`.
- Every sampled item page has a **non-empty** title (≤ 65 chars) and a non-empty
  meta description (50–160 chars).
- `og:title` and `og:description` present and non-empty on item pages.
- No console errors.

### Tier 2 — Auto: CDN regression (`/deploy`)
Register `tsc-cms-seo-fields` in `tests/registry.json` for cumulative coverage. Runs
against the live staging URL after publish.

### Tier 3 — Manual
- **SERP preview** — eyeball title/description in a SERP simulator for truncation feel.
  *Why manual:* subjective "does this earn the click" judgement.
- **Diacritics in the wild** — confirm Škoda/TÜV/CO₂ render correctly in Google's cache
  and social share cards. *Why manual:* depends on Google/social re-crawl timing.
- **Google Rich Results / social debugger** — optional spot-check of OG cards.
  *Why manual:* external tools, re-crawl latency.

---

## Verify Loop

### Pass/fail criteria
- [ ] All 5 collections have `seo-title` + `seo-description` fields (`get_collection_details`).
- [ ] All 5 template pages bind Title Tag + Meta Description to those fields (Designer or `data_pages_tool` read-back).
- [ ] All ~43 existing items have both fields non-empty.
- [ ] Rendered `<title>` on each sampled item page equals its `seo-title`.
- [ ] Rendered `meta[name="description"]` equals its `seo-description`.
- [ ] Worked-example pages match the exact strings in this spec.
- [ ] No item title > 65 chars; no description > 160 chars.
- [ ] No console errors on item pages.

### Reproduction steps
1. `get_collection_details` for each of the 5 collections → confirm fields exist.
2. Publish staging.
3. `npm run test:sz:acceptance -- tsc-cms-seo-fields` (STAGING_URL=https://tsc-v2.webflow.io).
4. Spot-check `/products/etcs`, `/projects/lineas-hld77`, `/news/worlds-first-software-defined-etcs-certified` in a SERP preview tool.

### Regression scope
- Existing item template layouts must still render (SEO fields are metadata only — no visible layout change expected).
- Do not disturb existing OG image bindings if already set.
- Static-page SEO (out of scope) must remain untouched.

---

## Acceptance Tests

`tests/acceptance/tsc-cms-seo-fields.spec.js`:

- **Products / ETCS — exact title & description** — worked-example strings match.
- **Case Studies / Lineas HLD77 — exact title & description** — worked-example strings match.
- **News / world's-first — exact title & description** — worked-example strings match.
- **Sampled item pages have valid title length** — non-empty, ≤ 65 chars.
- **Sampled item pages have valid meta description** — non-empty, 50–160 chars.
- **Open Graph tags present** — og:title + og:description non-empty on item pages.
- **No console errors on item pages.**

---

## Open questions / blockers

1. **MCP binding capability (Phase 2)** — build must confirm whether `data_pages_tool`
   can set a dynamic CMS-field binding on a collection template page; if not, Phase 2 is
   a manual Designer step. (Build-time discovery, not a client decision.)
2. **Products item count** — CMS-population spec listed 6 products (incl. `wSTM`); staging
   currently shows 5 template pages. Confirm whether `wSTM` has a live page before populating.
3. **News item count** — ~13 live articles vs 7 in the migration spec (historic posts
   present). Populate all live items, not just the 7 migrated.
