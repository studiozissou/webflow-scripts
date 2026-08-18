# Official bio rollout — tamsenfadal.com

**Slug:** `official-bio-rollout`
**Client:** Tamsen Fadal
**Status:** Ready to Build
**Created:** 2026-08-12
**Parent work:** unblocks Phases 1–3 of `.claude/specs/seo-branded-search-fix.md`
**Source of truth:** `.claude/content/official-bio.md`

---

## Problem

The approved official bio has landed. It was the single dependency blocking three
separate workstreams that have been sitting parked:

| Blocked work | Recorded in |
| --- | --- |
| `Person.description` in the site-wide entity graph | `site-wide-schema-coverage.md` — *"Person `description` is out of scope. It is gated on the approved bio… swap it in site head when the bio lands and it updates everywhere at once."* |
| On-page entity copy edits (Phase 1 implementation) | `seo-branded-search-fix.md` |
| Third-party profile alignment checklist | `seo-branded-search-fix.md` — out-of-scope workstream, needs our checklist |

The live site head carries the TODO in a comment:

```
Person.description is pending Tamsen's approved bio; update here to change it everywhere.
```

Separately, the bio contains facts the current entity graph does not assert at all —
two documentaries, `#PostYourPatch`, Tamsen Fadal Media, the 2026 NYWICI Matrix Award,
the FDA listening session. These are exactly the specific, verifiable claims the
GreenBanana audit said the redesign had lost.

## Goal

Every surface that states who Tamsen Fadal is — on-site copy, page metadata, JSON-LD,
and Wikidata — says the same approved thing, traceable to one file.

---

## Research summary

### The architecture already exists

This is not a greenfield build. Prior work (branch
`worktree-tamsen-seo-entity-automation`, unmerged) established:

- A **site-wide entity graph** in Webflow **site head custom code**, defining three
  `@id` nodes that every page references:
  ```
  https://www.tamsenfadal.com/#website     WebSite
  https://www.tamsenfadal.com/#publisher   Organization (Take Flight Productions LLC)
  https://www.tamsenfadal.com/#person      Person (Tamsen Fadal)
  ```
- Page-level JSON-LD written through Webflow's dedicated **`jsonLdSchema` field**
  (`bulk_update_pages_schema_markup`) — not head code, so there is no
  read-append-write risk on static pages.
- CMS templates (`/blog/*`, `/podcast/*`) carry `+{{field}}` bindings that the API
  **cannot** write. Those are delivered as files for manual paste.
- Wikidata item **Q7681850** already updated (P856 official website; X/Twitter removed
  11 Aug 2026 as an inactive channel).

**Confirmed live via MCP.** The repo copy of the graph
(`projects/tamsen-fadal/schema/sitewide-graph.html`) is byte-identical to what is live,
so there is no content drift — but it exists **only on the unmerged branch**. On `main`,
`projects/tamsen-fadal/schema/` is empty.

### Constraints carried forward

1. **`set_site_freeform_code` REPLACES the entire box.** Site head also holds
   `google-site-verification`, GTM (`GTM-WFRDD6ZD`), Finsweet Attributes and a large
   `<style>` block. Every write MUST be **read → append → write**. This is the single
   biggest risk in the build and is asserted in the verify loop.
2. **Static pages: use the `jsonLdSchema` field**, not page head code.
3. **CMS templates: files for manual paste.** No API path for `+{{field}}` bindings.
4. **Adding code ≠ publishing.** Add via MCP → publish → wait ~60s → test.
5. Webflow serves fully rendered HTML, so static JSON-LD is visible to SEMrush (JS
   rendering disabled on their crawl) and to AI-search crawlers.

### Current metadata state (pulled live, 61 pages)

Bio-bearing metadata that contradicts the approved language:

| Page | Page ID | Issue |
| --- | --- | --- |
| Home | `68a2d5617c9630d9c780deb7` | "13x Emmy-winning journalist" |
| About | `68cc5c697256cb044b05440d` | "13x Emmy-winning journalist" |
| Speaking | `68bea8e7acb2b6e83210fe47` | "13x Emmy-winning journalist" |
| Podcast | `68c2ff8bba319e1652add93e` | Title has a **trailing space**; description is ~900 chars (≈5× the useful limit) and does not lead with her name |
| M Film v2 | `6a314a864c78c9f05e987105` | Carries the **Advocacy page's** meta description verbatim — copy-paste error |

### About page — confirmed live 2026-08-12

Checked directly rather than trusting the intake notes:

- **H1 count is 1, not multiple.** `intake.json` records "About page has multiple H1s —
  needs fixing". That has since been fixed; the check is stale. No action needed.
- **The H1 still carries no entity name** — `NYT bestselling author. Global keynote
  speaker. Podcast host.` This is the exact H1 GreenBanana flagged. Goes in the
  recommendations doc (Task 12), not shipped this pass.
- **`13x` also appears in visible body copy**, not only in metadata:
  H2 — *"Hi! I'm Tamsen... As a 13x Emmy-award winning journalist, only one thing took
  me off air..."*
- Duplicate H2: *"From TV news anchor to global menopause advocate"* appears twice.

> ⚠️ **Known temporary inconsistency — wider than it first looked.** Task 4 strips `13x`
> from *metadata*, but the copy decision keeps *body copy* unchanged this pass. `13x`
> turns out to live in three places: About's metadata (fixed this pass), About's visible
> H2, and **the site-wide footer sentence that renders on all ~400 pages** (both left
> alone).
>
> So after this pass the site says "Emmy Award-winning" in its metadata and schema while
> every page's footer still says "13x Emmy-winning". That is a deliberate consequence of
> the copy decision, not an oversight — but it makes the recommendations doc time-critical
> rather than nice-to-have. Lead with it when the doc goes over.

### Pages with NO page-level schema

Every page inherits the site-wide graph, so the earlier "0 bare pages" result is
technically true but overstates coverage — these pages emit `Organization`/`Person`/
`WebSite` and nothing page-specific:

`speaking` · `press` · `blog` · `advocacy` · `themfactor` · `themfactor2` ·
`contact` · `events` · `menopause-education-hub`

### On-page bio surfaces — located 2026-08-12

Only three places on the site state who she is in a factual register. Two are worth
acting on.

**1. The site footer — highest leverage on the site.** `div.footer_bottom-content`,
global, so it renders on all ~400 pages:

> "Tamsen Fadal is a NYT bestselling author, podcaster  13x Emmy-winning journalist, and
> keynote speaker helping women unlock their full potential."

- Contains `13x`
- Has a **double space and a missing comma** after "podcaster" — a visible copy defect
  currently on every page of the site
- Omits filmmaker, both documentaries, and The Tamsen Show by name

This is the "footer entity language" the GreenBanana audit asked about, and the single
highest-reach entity sentence available. Top item in the recommendations doc.

**2. The Press page has no bio at all.** Its meta description promises *"Media features,
approved photos, **bios**, and press inquiry contact for journalists and producers."*
The page has `Approved Photos` and `Media Inquiry` sections and **no bio section** — the
word "bio" appears nowhere in the rendered body.

This is the strongest recommendation in the pass: the Press page is where journalists and
producers go for exactly this, the meta description already promises it, and the copy is
**already approved**, so there is no approval friction. The bio file's title line / short
bio / full bio map onto that page with no new wording required.

**3. About page** — `div.text-wrapper`, first-person voice: *"Hi! I'm Tamsen... As a 13x
Emmy-award winning journalist..."* Covered above.

### llms.txt is carrying pre-bio language

`https://www.tamsenfadal.com/llms.txt` is an AEO surface aimed directly at AI-search
crawlers, and its `description` predates the bio:

> "Author, journalist, and menopause education & advocacy platform with resources,
> articles, podcasts, and guides focused on perimenopause/menopause and midlife health."

It describes a *platform*, not a person — no Emmy, no filmmaker, no NYT bestseller, no
named podcast. Its `social:` block also lists only Instagram, TikTok, Facebook and
YouTube, omitting **LinkedIn and Threads**, both of which are in Wikidata.

Given this file exists specifically to shape how AI assistants describe her, it should
carry the approved language. Added as Task 17.

### Wikidata Q7681850 — verified live 2026-08-12

Fetched via `Special:EntityData/Q7681850.json` and QIDs resolved against the API.

**Already set (no action):**

| Property | Value |
| --- | --- |
| P856 official website | `https://www.tamsenfadal.com/` ✅ |
| P2003 Instagram | `tamsenfadal` |
| P2013 Facebook | `tamsenfadal` |
| P6634 LinkedIn | `tamsenfadal` |
| P7085 TikTok | `tamsenfadal` |
| P11245 Threads | `TamsenFadalTV` |
| P6005 Muck Rack | `tamsenfadal` |
| P345 IMDb | `nm2876731` |
| P214 VIAF · P213 ISNI · P244 Library of Congress | present |
| P106 occupation | journalist, news presenter, author, activist |
| P166 award received | Emmy Award |
| P800 notable work | How to Menopause |

**Gaps the new bio exposes (Task 10):**

| Gap | Detail |
| --- | --- |
| **P2397 YouTube channel ID — ABSENT** | She has `youtube.com/@TamsenFadalTV`. Needs the `UC…` channel ID, not the handle. |
| **P106 occupation** | Missing `filmmaker` and `podcaster`. The bio leads with filmmaker. |
| **P800 notable work** | Only the book. Missing The (M) Factor, Before the Pause, The Tamsen Show. ⚠️ Each needs its own Wikidata item to be referenced — item creation is a separate, higher-bar task subject to notability. Do **not** create them speculatively. |
| **P166 award received** | Missing the 2026 NYWICI Matrix Award. Check whether a QID exists before adding. |

### sameAs — all live URLs verified 2026-08-12

Every URL in the live `sameAs` array resolves. LinkedIn `999`, Facebook `400` and Muck
Rack `403` are anti-scraper responses to a non-browser request, **not** dead links —
confirmed by comparing against the Wikidata identifiers, which match handle-for-handle.

**Two additions available, both corroborated by Wikidata:**

| Add to `sameAs` | Source |
| --- | --- |
| `https://www.threads.net/@TamsenFadalTV` | Wikidata P11245; named in the bio's follow list; **currently missing from the site graph** |
| `https://muckrack.com/tamsenfadal` | Wikidata P6005; journalist-authority signal |

### ⚠️ `/subscribe` redirects to the homepage — verified 2026-08-12

The bio tells readers to sign up at `https://www.tamsenfadal.com/subscribe`. That URL
**301-redirects to `/`**, not to the newsletter page:

```
HTTP/2 301
location: /
```

The newsletter page is `/newsletter` and returns 200. So the signup link in her official
bio — the one her team will paste into press kits, show notes and third-party profiles —
drops people on the homepage.

**Fix:** repoint the Webflow redirect `/subscribe` → `/newsletter`. One line, no design
work, and it should ship with this pass rather than waiting for the copy doc. Added as
Task 15.

### Decisions taken (2026-08-12)

| Decision | Choice | Consequence |
| --- | --- | --- |
| Emmy count | **Follow the bio exactly** | Strip "13x" from Home, About, Speaking. Noted trade-off: a specific count is a stronger entity signal, but approved language wins. |
| Wikipedia | **Wikidata direct; Wikipedia via Talk-page edit request** | No direct article edits — COI policy. |
| On-page copy | **Recommendations doc only** | No visible body copy changes this pass. Metadata + schema ship. |

---

## Scope

**In (ships this pass):**
- `Person.description` + Person node enrichment in the site-wide graph
- Page metadata (SEO title, meta description, OG) on bio-bearing pages
- Page-level JSON-LD for the nine pages that lack it
- New `Movie` nodes for the two documentaries
- Wikidata Q7681850 property additions
- Restore `schema/` into the mainline branch

**In (ships as documents, not live changes):**
- Page-by-page on-page copy recommendations
- Wikipedia Talk-page edit request, sourced and COI-declared
- Third-party profile alignment checklist

**Out:**
- Any visible body-copy edit (client decision — recommendations only)
- 404, 401, checkout, PayPal checkout, order confirmation, style guide — no search value
- Knowledge Panel claim (needs Tamsen's Google account access — Phase 5, separate)
- The ~22 remaining podcast episodes with wrong descriptions (tracked in
  `audits/meta-description-fixes.md`, independent of the bio)

---

## Tasks

| # | Task | Delivery | Agent | Depends on |
| --- | --- | --- | --- | --- |
| 1 | Rebase onto `worktree-tamsen-seo-entity-automation`; restore `schema/` | git | — | — |
| 2 | Update `Person.description` → `bio-200`; enrich Person node | MCP (read→append→write) | schema | 1 |
| 3 | Add `Movie` nodes for The (M) Factor and Before the Pause | MCP | schema | 2 |
| 4 | Strip "13x" from Home / About / Speaking metadata | MCP bulk | seo | — |
| 5 | Fix Podcast title trailing space + rewrite over-long description | MCP bulk | seo | — |
| 6 | Fix M Film v2 wrong meta description | MCP bulk | seo | — |
| 7 | Page-level JSON-LD for the 9 bare pages | MCP bulk | schema | 2 |
| 8 | Update About `ProfilePage.description` to approved language | MCP | schema | 2 |
| 9 | Update Book + PodcastSeries descriptions to approved language | MCP | schema | 2 |
| 10 | Wikidata Q7681850 — add missing properties | manual / QuickStatements | seo | — |
| 11 | Wikipedia Talk-page edit request (COI-declared, sourced) | **file** | content | — |
| 12 | On-page copy recommendations doc — ranked, most-leverage first: **(a)** the site-wide footer sentence (all ~400 pages, has `13x` plus a double-space/missing-comma defect), **(b)** publishing the approved bio on the Press page, which its own meta description already promises, **(c)** the About H1 (no entity name), **(d)** `13x` in About body copy, **(e)** the duplicated About H2 | **file** | content | — |
| 13 | Third-party profile alignment checklist | **file** | content | — |
| 14 | Publish + validate | MCP + chrome | qa | 2–9 |
| 15 | Repoint redirect `/subscribe` → `/newsletter` (currently 301s to `/`) | Webflow settings | seo | — |
| 16 | Add Threads + Muck Rack to `Person.sameAs` | MCP (same write as Task 2) | schema | 1 |
| 17 | Rewrite `llms.txt` `description` to `bio-200`; add LinkedIn + Threads to its `social:` block | file + Webflow | seo | — |

### Person node — what changes

`description` → `bio-200` from `.claude/content/official-bio.md`:

```
Tamsen Fadal is an Emmy Award-winning journalist, filmmaker, and instant New York Times
bestselling author of How To Menopause, leading the national conversation around midlife
and menopause.
```

Additions drawn from the approved bio (every one traceable to a claim in it):

| Property | Value | Bio source |
| --- | --- | --- |
| `award` | add `NYWICI Matrix Award (2026)` | "In 2026, she was honored at the NYWICI Matrix Awards" |
| `knowsAbout` | add `Midlife`, `Reinvention`, `Women's Health Equity`, `Workplace Wellness` | topics paragraph |
| `jobTitle` | add `Filmmaker`, `Digital Content Creator` | title line |
| `founder` / `subjectOf` | Tamsen Fadal Media; `#PostYourPatch` campaign | "founder of Tamsen Fadal Media", "founder of #PostYourPatch" |
| `performerIn` → `Movie` | The (M) Factor; Before the Pause | "filmmaker behind two documentaries" |

Retained untouched: `alumniOf`, `nationality`, `image`, existing `award` entries
(including Ellis Island Medal of Honor 2016 — factual, verified, simply not mentioned
in the new bio), and the full `sameAs` array.

> **Not asserted:** "13x". Per the decision above, the Emmy count follows the bio, which
> says "Emmy Award-winning" / "multiple". `award` keeps the generic
> `Emmy Award for Journalism` entry rather than adding a count.

### Organisation — open question, does not block

The bio credits **Tamsen Fadal Media (TFM)**. The graph's `#publisher` is
**Take Flight Productions LLC**. Both may be true (operating brand vs legal entity).

**Build proceeds without resolving this.** `#publisher` stays as Take Flight Productions
LLC — it is the live, indexed value and changing a publisher `@id` target on speculation
is worse than leaving it. TFM is added as a **separate** `Organization` node that Tamsen
`founder`s, which is what the bio actually claims. If the client confirms TFM is the
website's publisher, swapping the `#publisher` node is a one-line follow-up.

### Parallelisation map

**Stream A (sequential, gates schema work):** Task 1 → 2 → 3. The Person node must be
updated before any page-level block quoting it is re-validated.

**Stream B (parallel, independent of A):** Tasks 4–6 — metadata-only writes via
`bulk_update_pages`. Touch the `seo`/`openGraph` fields, never `jsonLdSchema`, so there
is no contention with Stream A. Est. 15 min.

**Stream C (after 2):** Tasks 7–9 — page-level `jsonLdSchema` writes, batched. Est. 20 min.

**Stream D (fully independent, can start immediately):** Tasks 11–13 — file generation,
no API calls, no shared state. Est. 30 min.

**Stream E (independent):** Task 10 — Wikidata, external system entirely.

**Recommendation:** A sequential, then B ∥ C ∥ D ∥ E. **No worktrees** — Streams B/C
mutate Webflow (external state, not files) and Stream D writes to distinct new files.
**No agent teams** — I/O-bound MCP calls, not reasoning-heavy.

### ADR needed?

No. The delivery-mechanism decision was already recorded in
`site-wide-schema-coverage.md`; this spec follows it rather than setting new precedent.

---

## Barba impact

**N/A — no Barba transitions.** tamsen-fadal is a standard multi-page Webflow site with
no SPA routing. All changes are static markup in `<head>` and Webflow page settings —
no JS lifecycle, listeners or timelines to init or destroy.

---

## Verify loop

### Pass / fail criteria

A page passes when **all** hold:

1. `document.querySelectorAll('script[type="application/ld+json"]').length >= 1`
2. Every block `JSON.parse`s without throwing
3. The site-wide graph resolves: `#website`, `#publisher`, `#person` each defined
   exactly once across the page's combined blocks
4. `Person.description` **exactly equals** the `bio-200` string in
   `.claude/content/official-bio.md` — no paraphrase, no truncation
5. No page emits more than one node with the same `@id`
6. **Pre-existing site head content still present**: `google-site-verification`,
   `GTM-WFRDD6ZD`, the Finsweet Attributes script tag, and the `<style>` block
   (catches the read-append-write failure — highest-risk regression)
7. No page title or meta description anywhere on the site contains the string `13x`
8. Podcast SEO title has no leading/trailing whitespace
9. M Film v2 meta description differs from the Advocacy meta description
10. Google Rich Results Test reports **0 errors** on each changed template
11. No new console errors

### Reproduction steps

```
1. node tools/entity-audit/schema-coverage.js
   → every content template shows blocks >= 1
2. node tools/entity-audit/validate-schema.js projects/tamsen-fadal/schema/*.html
   → 0 errors, 0 warnings, all @id references resolve
3. npx playwright test tests/acceptance/official-bio-rollout.spec.js
4. Rich Results Test (code mode) per changed template
```

Wait conditions: Webflow publish propagates in ~30–60s. Allow **60s after publish**
before re-testing, or the crawl returns pre-publish HTML.

### Tier mapping

**Tier 1 — Playwright local** (`tests/acceptance/official-bio-rollout.spec.js`):
- `Person.description matches the approved bio exactly`
- `site-wide graph present and resolvable on every sampled page`
- `all JSON-LD blocks parse`
- `no duplicate @id across blocks`
- `pre-existing site head code preserved`
- `no page metadata contains "13x"`
- `podcast title has no trailing whitespace`
- `M Film v2 and Advocacy have different meta descriptions`
- `no console errors`

**Tier 2 — CDN regression:** registered in `tests/registry.json` as
`official-bio-rollout`; runs on `/deploy`.

**Tier 3 — Manual:**
- **Rich Results Test** — rate-limited external service behind reCAPTCHA, not reliably
  scriptable.
- **CMS template paste** — `+{{field}}` bindings go through the Designer UI; no API path.
- **Wikidata edits** — external system, requires an authenticated account.
- **Wikipedia Talk-page request** — must be filed by a human with a declared COI; the
  outcome depends on independent editors and is not observable in a test run.
- **Knowledge Panel / SERP effect** — propagation takes days to weeks.

### Regression scope

Must NOT break:
- **Site head code on every page** — `google-site-verification`, GTM, Finsweet, the
  `<style>` block. Mitigated by read-append-write, asserted in Tier 1.
- The existing entity graph — Person node is *edited in place*, never removed and
  re-added, so there is no window with a missing `#person`.
- Existing page-level schema on Home, About, Book, Podcast — these already resolve
  correctly and must continue to.
- Site footer code — form tracking, theme footer links, accessibility widget. Untouched,
  but any site-level write must preserve them.
- Existing `tf-newsletter` and `tf-contact` acceptance tests must still pass.

---

## Acceptance tests

Test infra: Playwright present in `devDependencies`; no `.env.test` — existing Tamsen
specs hard-code the production URL, so this spec follows that convention.

| Test | Asserts |
| --- | --- |
| `Person.description matches approved bio` | Site head Person node `description` === `bio-200`, byte-exact |
| `entity graph resolves on every sampled page` | `#website`, `#publisher`, `#person` each defined exactly once |
| `all JSON-LD parses` | Every `ld+json` block `JSON.parse`s |
| `no duplicate @id` | No `@id` appears twice across a page's blocks |
| `site head code preserved` | `google-site-verification`, `GTM-WFRDD6ZD`, Finsweet tag, `<style>` all present |
| `no 13x in metadata` | No `<title>` or `meta[name=description]` contains `13x` |
| `podcast title trimmed` | Podcast `<title>` has no leading/trailing whitespace |
| `M Film v2 description is distinct` | Differs from Advocacy's meta description |
| `documentary Movie nodes present` | `/themfactor` and `/themfactor2` emit `Movie` with `creator` → `#person` |
| `no console errors` | Zero console errors on every page touched |

---

## Open items for the client

Carried from `.claude/content/official-bio.md` §5 — none block the build:

1. Copy-edit sign-off (`documtaries` → `documentaries`; `well brands` → `wellness brands`)
2. TFM vs Take Flight Productions LLC as website publisher
3. Emmy count — "multiple" vs the "13x" currently live *(build follows the bio; flag it)*
4. Canonical social URLs for the `sameAs` array
5. Canonical book / podcast link targets
6. ~~`/subscribe` vs `/newsletter`~~ — **resolved by investigation.** `/subscribe` 301s to
   the homepage. Fixing the redirect (Task 15) rather than changing the bio, so the URL
   already printed in the bio keeps working. No client decision needed.
