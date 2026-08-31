# Spec — Remove the "!" from the Coconut brand name across the website

**Date:** 2026-08-31
**Client:** Coconut (getcoconut.com)
**Trello:** [Card 123 — From ! from anywhere on the website !Coconut is mentioned](https://trello.com/c/887uZsDt/123-from-from-anywhere-on-the-website-coconut-is-mentioned)
**Requested by:** Anna Guilford · **SEO sign-off:** Leah Cusick
**Trello estimate label:** 0.5 hours · **Actual estimate:** 6–8 hours (see §11)
**Webflow site ID:** `6069af2a39978132d0155fd7`
**Primary locale ID:** `6a140f4d8c93a2fda05a361d` (no secondary locales)

---

## 1. Purpose

The brand is written as `!Coconut` throughout the site. Anna asked for the `!` to be
removed everywhere so it reads `Coconut`.

Leah reviewed it from an SEO angle on 14 Jul and raised no objection: search engines
ignore punctuation, so `Coconut` and `!Coconut` are treated the same, and `Coconut`
reads cleaner in page titles and search results. Her one condition was that the change
is applied **consistently** across the site.

The site is already inconsistent today, which supports the change:
`/accountant-software` uses `… | Coconut` while `/`, `/pricing` and `/mtd-software`
use `… | !Coconut`.

---

## 2. Decisions taken

Confirmed with Will on 2026-08-31 before this spec was written.

| # | Decision | Rationale |
|---|---|---|
| D1 | **Text only.** The logo wordmark and every asset filename stay exactly as they are. | 2,124 of the 4,339 occurrences are inside `src`/`href` asset URLs such as `…_!Coconut_2025_logo_RGB_Full_Logo_Black%26White%201.webp`. They are invisible to users, and rewriting them means re-uploading artwork and repointing every reference, risking broken images and lost CDN cache. |
| D2 | **`/legal/terms` body is IN scope** (121 meaningful occurrences). | Treated as ordinary product copy. |
| D3 | **The FCA footer disclosure is OUT of scope.** | It is a regulated disclosure that also names two trading styles. Needs Anna's sign-off, tracked separately — see §9. |
| D4 | All four surfaces in scope: static page copy + nav/footer components, CMS items, SEO/OG/JSON-LD, and image alt text. | Matches Leah's consistency requirement. |
| D5 | **Claude does every edit, including Designer edits. Will publishes.** | Publishing pushes the *whole* site live including other people's unpublished work — see R1 in §10. |
| D6 | Keep `"alternateName": "!Coconut"` in the Organization schema. Recommendation, one-line flip if rejected. | `alternateName` is schema.org's designated field for an alias. Retaining the old form helps Google reconcile legacy citations of `!Coconut` to the same entity. `"name"` is already `"Coconut"` and stays that way. |

**No ADR required.** This is a content change with no structural or architectural impact.

---

## 3. Verified scope (measured, not estimated)

All figures come from a full crawl of the live sitemap (231 URLs, all HTTP 200) on
2026-08-31, plus a complete Webflow API audit of 157 pages and all 20 CMS collections.

### 3.1 Every occurrence on the live site

| Location | Occurrences | In scope? |
|---|---:|---|
| Asset URLs (`src`/`href`/`srcset`) | 1,658 | ❌ D1 |
| JSON-LD values that are URLs | 466 | ❌ D1 |
| Visible body / nav / footer copy | ~1,642 | ✅ |
| `alt=""` text | 284 | ✅ |
| JSON-LD real values | 280 | ✅ |
| `<title>` | 9 | ✅ |
| **Total in published HTML** | **4,339** | |
| **Total meaningful** | **2,215** | |

### 3.2 The meaningful 2,215, split by how much work each represents

| Bucket | Occurrences | Edits |
|---|---:|---:|
| **Shared — fix once, propagates to all 231 pages** | **1,131** | ~5 |
| ├ `!Coconut news` (nav + footer links) | 460 | 2 |
| ├ `"alternateName": "!Coconut"` (site custom code) | 232 | 1 |
| ├ `© <year> !Coconut. All rights reserved.` (footer) | 230 | 1 |
| └ `!Coconut: the accounting & tax app…` (footer signup H2) | 209 | 1 |
| **FCA legal line — excluded per D3** | 460 | 0 |
| **Page-specific remainder** | **624** | the real work |
| └ of which `/legal/terms` | 121 | |

The median page has **8** meaningful occurrences, and **6 of those 8 are shared**.
After the five shared edits, a typical page drops to 2 — both in the excluded FCA line.
Only **7 pages** have more than 20 meaningful occurrences.

**Edge case — `/search`.** It renders a stripped template with no navbar or footer, so it
carries only 4 occurrences and the shared component fixes will not touch it. Check it
separately during verification rather than assuming the shared edits covered it.

**Sitemap shape:** 231 URLs — `/knowledge-hub/` 172, root-level 20, `/features/` 9,
`/legal/` 8, `/categories/` 8, `/coconut-for/` 7, `/mtd-software/` 5, `/tools/` 4,
`/blog-categories/` 4, homepage 1. There is no `/about` and no `/blog/` path; articles
live under `/knowledge-hub/`.

### 3.3 Top pages by page-specific work

| Meaningful | Page |
|---:|---|
| 121 | `/legal/terms` |
| 38 | `/` |
| 34 | `/pricing` |
| 29 | `/mtd-software` |
| 22 | `/webinars-and-events` |
| 22 | `/accountant-software` |
| 21 | `/gosimpletax-mtd` |
| 19 | `/knowledge-hub/set-up-books-sole-trader` |
| 18 | `/features/tax-help-support` |
| 16 | `/features/know-your-numbers` |

### 3.4 CMS — 68 items, 134 occurrences, 8 of 20 collections

| Collection | Items total | Affected | Occurrences | Fields |
|---|---:|---:|---:|---|
| FAQs | 151 | 48 | 89 | `name`, `answer` (RichText) |
| Knowledge Hub Articles | 208 | 8 | 27 | `article-text`, `seo-title`, `seo-metadescription`, `post-summary` |
| 25 New Features | 9 | 5 | 7 | `description`, `seo-title`, `seo-metadescription` |
| Webinars and events | 5 | 3 | 5 | `event-details`, `name` |
| Tools | 5 | 1 | 2 | `page-text2` |
| Blog Banner Ads | 2 | 1 | 2 | `alt-tag-the-banner`, `name` |
| Feature Highlights | 51 | 1 | 1 | `description` |
| Categories | 15 | 1 | 1 | `seo-title` |

Clean collections (no change needed): Authors, Landing Pages, 2025 Archive Features,
Blog Categories, Tags, Reviews, Jobs, **Blog Posts (46 items, zero hits)**, Chapters,
Integrations, Speaker for Webinars, Partners.

**Verified safe:** zero CMS occurrences sit inside a URL, slug, `href` or filename.
A prose find-replace carries no link-breakage risk.

### 3.5 Page SEO fields — 7 pages

Exact current strings, for direct rewriting:

| Page ID | Path | Field | Current value |
|---|---|---|---|
| `68307bf37726cd11f285d580` | `/` | seo.title | `Self employed accounting software \| !Coconut` |
| | | seo.description | `Discover how !Coconut helps you with self employed accounting software, perfect for freelancers and sole traders looking to simplify finances.` |
| `683ef56fe874d977c1c221e1` | `/pricing` | seo.title | `Sole trader accounting app \| Pricing \| !Coconut` |
| | | seo.description | `See how much !Coconut costs and what's included. Choose the right plan for your business with tools to track income, expenses, tax and more.` |
| `65afe5d79038933a4ba8d379` | `/legal/terms` | seo.title | `User Terms \| !Coconut` |
| | | seo.description | `Take a look at the terms and conditions of using the !Coconut app. ` |
| `695d2d199f7ed1b38f85c1c9` | `/webinars-and-events` | seo.title | `Free Tax & Accounting Webinars for Self-Employed and Landlords \| !Coconut` |
| | | seo.description | `Join !Coconut's free online webinars and events…` |
| `6a428481fa1d38567475c643` | `/partners` | seo.description | `Join !Coconut's free online webinars and events…` |
| `6a26cc1efe7a17fb79e1b677` | `/home-copy` | seo.title + description | duplicate of `/` |
| `69b9213742fe289a2b625ab6` | `/mtd-for-sole-traders` | seo.description | **draft page** — include, see §4 |

Note `/partners` carries a copy-pasted webinars description. Flag to Anna; correcting
it is out of scope here.

**Open Graph needs no separate work.** On all of these pages the OG fields are set to
`titleCopied: true` / `descriptionCopied: true`, so they inherit the SEO string at publish
time. The raw `openGraph.title` / `openGraph.description` fields are themselves empty and
contain no `!Coconut`. Fixing `seo.title` / `seo.description` therefore fixes the rendered
OG tags too — **do not** write OG fields directly, or you will break the copy-from-SEO link.

### 3.6 JSON-LD

| Where | Contains | Editable via |
|---|---|---|
| `/` page schema (`jsonLdSchema` object) | `SoftwareApplication.name: "!Coconut"` | ✅ API — `bulk_update_pages_schema_markup` |
| `/pricing` page schema (`rawJsonLdSchema` string) | **13 hits**: WebPage name/description, `Product.name`, `brand.name`, 4 FAQPage Q&As, `about.name` | ✅ API |
| `/accountant-software` page schema (`684c3935ca3ce547daec1be8`) | 1 hit, but it is the logo asset URL only | ❌ D1 — no edit |
| **Site Settings → Custom Code → Head** | Organization block: `alternateName` (keep, D6) + 2 asset URLs (skip, D1) | ❌ **Manual** — not exposed by the Data API |
| Knowledge Hub / Categories / Tags templates | CMS bindings only, zero hardcoded hits | — no change |

---

## 4. What is explicitly out of scope

- The logo wordmark artwork and all `!`-containing asset filenames (D1). Four assets on the
  Webflow CDN carry `!` in their filename, and no others anywhere on the site:
  - `…694962c84409e6fb387dfa61_!Coconut_2025_logo_RGB_Full_Logo_Black%26White%201.webp` — nav logo
  - `…69493cf1cd472728f6fc499c_!Coconut_2025_logo_RGB_Full_Logo_White.png` — footer logo
  - `…694965edc5fef9e634fda00b_!Coconut_2025_logo_RGB_Blue%20Square%20Coconut.png` — apple-touch-icon
  - `…6949654e62c23bf834ab8e32_!Coconut_2025_logo_RGB_Blue%20Square%20Coconut.png` — near-duplicate
    of the above, uploaded twice under different asset IDs. Asset hygiene, not a brand issue;
    noted only so it is not mistaken for a missed occurrence.
- The FCA footer disclosure sentence (D3).
- `"legalName": "@Coconut Platform Ltd"` and the `@Coconut` styling generally — the card
  is about `!` only. Raised with Anna in the same note as the FCA line (§9).
- External profiles (Google Business Profile, App Store, Play Store, social bios). Leah
  recommended these; they are not web-dev work. Listed for Anna in §9.
- Archived and style-guide pages under `/archive-2025/*` and `/style-guide/*` — all
  `draft: true`, not published, zero live impact.
- Fixing the wrong `/partners` meta description (§3.5).
- Historical audit and research files in this repo (`.claude/research/*`,
  `.claude/audits/*`) — point-in-time evidence, must not be rewritten.

**Draft page `/mtd-for-sole-traders`:** included, because it is a real page held in
draft rather than an archive artefact, and leaving it stale would reintroduce `!Coconut`
whenever it is published.

---

## 5. Constraints discovered

1. **Static page copy on the primary locale cannot be written by the Webflow Data API.**
   `POST /pages/{id}/dom` is restricted to secondary locales; Webflow's docs state the
   primary locale is the source of truth and must be changed on the canvas. Confirmed
   against Webflow's own API assistant. Reads work fine.
2. **`data_element_tool` exposes `set_text` / `set_attributes` keyed by site + page.**
   Reads are confirmed working on the primary locale. Whether its *writes* land on the
   primary locale is **unverified** — this is what Task 0 proves before anything else.
3. **A text search misses component property overrides.** Querying the homepage for text
   `!Coconut` returns 6 String nodes, but two further mentions live in component props
   (`Testimonial Section.Title`, `Foooter Signup Section.Title`). Any worklist that only
   greps text will under-report. Components must be swept separately.
4. **`set_text` targets the editable element, not the String node.** Query results return
   `type: "String"` children; use `return_parent: "parent"` to get the writable
   heading/paragraph/link element.
5. **The site has no secondary locales**, so there is no localisation fan-out.
6. Site publishes to four domains: `getcoconut.com`, `www.getcoconut.com`,
   `getcoconut.co.uk`, `www.getcoconut.co.uk`. Last published 2026-08-27.

---

## 6. Known element IDs — shared components

Confirmed by API query. These five edits clear 1,131 of the 2,215 meaningful occurrences.

**Footer component** — `b8deaa9b-6ad1-3edf-6162-431c8e2a03e4`

| Element ID | Current | New |
|---|---|---|
| `569e420c-3066-56c3-b64d-8dc6bb9f578d` | `!Coconut news` | `Coconut news` |
| `b8deaa9b-6ad1-3edf-6162-431c8e2a045b` | ` !Coconut. All rights reserved.` | ` Coconut. All rights reserved.` |
| `f1f900fd-9494-2ad1-d93e-7e465ef04e14` | `@Coconut and !Coconut are trading names of @Coconut Platform Ltd…` | **DO NOT TOUCH — D3** |

**Top Nav Bar component** — `fab839a5-c73a-9b5f-e819-856e421d1ef7`

| Element ID | Current | New |
|---|---|---|
| `b9d200a3-145d-75e9-cf4a-3cc87f81f7e2` | `!Coconut news` | `Coconut news` |

**Foooter Signup Section component** — `94b67103-9f35-401d-13ea-4033fb44bec9`
(note the typo in the component name is Webflow's, not ours)

| Prop ID | Current | New |
|---|---|---|
| `2e025d6e-5adf-f170-16e8-3325ad6758c6` (Title) | `!Coconut: the accounting & tax app for self-employed people and landlords` | `Coconut: the accounting & tax app for self-employed people and landlords` |

**Homepage-only component props** (page `68307bf37726cd11f285d580`):

| Component | Prop | Current |
|---|---|---|
| CTA Bar `81317039-…71b7` | Heading | `Ready to make your business finances a breeze with !Coconut's…` |
| Testimonial Section `53f9251e-…0e8f` | Title | `What our !Coconut community says` |

---

## 7. The replacement rule

Replace the exact string `!Coconut` with `Coconut`, then normalise whitespace.

**Character encoding is confirmed safe.** Verified at byte level across the live HTML:
the `!` is literal ASCII `0x21` and the `@` in `@Coconut` is literal ASCII `0x40`. They are
not HTML entities (`&excl;` / `&commat;`) and not Unicode lookalikes. A plain string match
on `!Coconut` is therefore exact and complete — no normalisation or entity decoding needed.

**Edge cases the build must handle:**

- `© <span id="year">x</span> !Coconut.` → the leading space before `!Coconut` is real and
  must be preserved: ` Coconut. All rights reserved.`
- Sentence-initial `!Coconut is…` → `Coconut is…` (capital C already correct).
- Possessives `!Coconut's` → `Coconut's`. Note the live site uses a curly apostrophe `'`
  in most places — preserve the existing character, do not normalise it.
- Never touch a match inside `src=`, `href=`, `srcset=`, or any `https://` value.
- Never touch the FCA disclaimer element `f1f900fd-…` (D3).
- Do not alter `@Coconut` anywhere.

---

## 8. Build order

Ordered. Task 0 gates everything else.

| # | Task | Agent | Route | Est. |
|---|---|---|---|---|
| **0** | **Spike:** on draft page `/mtd-for-sole-traders` (`69b9213742fe289a2b625ab6`), attempt one `set_text` on a `!Coconut` element, re-read to confirm it stuck, then revert. **If writes do not land on the primary locale, STOP** and fall back to a hand-off worklist (see §8.1). | code-writer | API probe | 0.25h |
| 1 | Generate the complete element-level worklist: for all 231 published pages, query text `!Coconut` **and** sweep every component instance's props. Emit `page id · element id · current · proposed`. | Explore | API read | 0.5h |
| 2 | Apply the 5 shared component edits from §6. | code-writer | Designer | 0.5h |
| 3 | Site Settings → Custom Code → Head: leave `alternateName` per D6; no other `!` change needed. Confirm and record. | code-writer | Manual | 0.25h |
| 4 | Update SEO title + description on the 7 pages in §3.5. | code-writer | API `bulk_update_pages` | 0.25h |
| 5 | Update page JSON-LD on `/` and `/pricing`. | schema | API `bulk_update_pages_schema_markup` | 0.5h |
| 6 | Bulk-update 68 CMS items across 8 collections (§3.4). Two flagged FAQ items get a human read first. | code-writer | API `update_collection_items` | 1h |
| 7 | Apply remaining static page copy from the Task 1 worklist, excluding `/legal/terms`. | code-writer | Designer | 2h |
| 8 | `/legal/terms` — 121 occurrences. Do as its own task; verify formatting survives. | code-writer | Designer | 1h |
| 9 | Image alt text (284). Mostly the logo alt inside nav/footer components, so largely fix-once; sweep the per-page remainder. | code-writer | Designer | 0.75h |
| 10 | Verify: re-crawl, run acceptance tests, produce before/after report. | qa | Playwright + crawl | 0.75h |
| 11 | Write the FCA / `@Coconut` / external-profiles note for Anna (§9). | content | — | 0.25h |

**Publishing is Will's, not Claude's.** Every task above leaves changes staged and
unpublished.

### 8.1 Fallback if Task 0 fails

If `set_text` cannot write the primary locale, Tasks 2, 7, 8 and 9 convert from
"Claude edits" to "Claude produces an exact worklist, a human applies it in the Designer".
Tasks 4, 5 and 6 are unaffected — they are pure Data API and cover the CMS (134),
page SEO (7 pages) and page JSON-LD regardless. In that scenario roughly 40% of the
meaningful occurrences still get fixed automatically.

---

## 9. Feed back to Anna (D3 / out-of-scope items)

Written to `projects/coconut/.claude/comms/fca-footer-and-brand-styling-2026-08-31.md`.

1. **The FCA footer disclosure.** Currently: `@Coconut and !Coconut are trading names of
   @Coconut Platform Ltd, company number 09904418. !Coconut is registered with the
   Financial Conduct Authority (FCA) as an Account Information Service Provider under the
   Payment Services Regulations 2017 (reference 931194).`
   Left untouched pending sign-off. **Consequence: after this work ships, the footer will
   read `Coconut` everywhere except this one sentence, which will still say `!Coconut`.**
   This is a visible inconsistency and the main reason to get an answer quickly.
   The sentence also names `!Coconut` as a *trading name*, so removing it is a legal
   question, not a copy question.
2. **`@Coconut` styling.** Appears in the same footer line and as `legalName` in the
   Organization schema. Out of scope for this card, but it is the same class of issue and
   Anna may want it handled in one pass.
3. **Two FAQ items near regulated wording** — `697b52260f39470b2a4be284`
   (data access/sharing) and `6964de4220525fd63c741c28` (FCA-regulated Open Banking).
   Being changed, but flagged for a read rather than a blind replace.
4. **External profiles.** Leah recommended consistency beyond the site: Google Business
   Profile, App Store, Play Store, LinkedIn, Trustpilot. Not web-dev work — needs an owner.
5. **`/partners` has the wrong meta description** (a copy-paste of the webinars one).
   Unrelated to this card; worth a separate ticket.

---

## 10. Risks

| # | Risk | Mitigation |
|---|---|---|
| **R1** | **Publishing pushes the entire site live, including unpublished work by the tech SEO person or the agency.** `client.md` records that both occasionally touch the site. | Will publishes, and checks the Designer for other pending changes first. Claude never publishes. |
| R2 | Task 0 fails and writes do not land on the primary locale. | §8.1 fallback. Tasks 4/5/6 proceed regardless. |
| R3 | A find-replace catches an asset URL and breaks images. | §7 forbids matches inside `src`/`href`/`srcset`/`https://`. Task 10 re-crawls for HTTP 404s on image requests. |
| R4 | Rich-text edits on `/legal/terms` lose formatting. | Task 8 is isolated; capture before/after HTML and diff structure, not just text. |
| R5 | A text-only sweep silently misses component prop overrides. | Task 1 explicitly sweeps component instances — see constraint 3. |
| R6 | The FCA line stays inconsistent with the rest of the site indefinitely. | §9 item 1 is the highest-priority item to get answered. |
| R7 | Someone edits the site mid-build, causing lost work or a confusing diff. | Do the build in one sitting; re-run the Task 1 worklist immediately before Task 7. |

---

## 11. Estimate vs the Trello label

The card carries a **0.5 hours** label. Realistic estimate is **6–8 hours**.

The gap is not the number of occurrences — 1,131 of the 2,215 fall to five edits. It is:
`/legal/terms` alone (121 occurrences, ~1h), 68 CMS items across 8 collections (~1h),
the per-page static copy sweep (~2h), alt text (~0.75h), and verification (~0.75h).

Worth telling Anna the true size before starting, since 0.5h was set when the assumption
was a single find-and-replace.

---

## 12. Barba Impact

N/A — Coconut does not use Barba.js for page transitions. No `init`/`destroy` lifecycle,
no state to survive a transition, no namespace scoping. This is a content change with no
JavaScript involved at all.

---

## 13. Verify Loop

### Pass/fail criteria

1. **Zero visible `!Coconut` in published HTML**, excluding the two permitted classes:
   - inside `src`/`href`/`srcset` asset URLs (D1)
   - inside the FCA disclaimer element `f1f900fd-…` (D3)
   Measured by re-crawling all 231 sitemap URLs. Expected residual: **2,124 asset-URL
   occurrences + 460 FCA-line occurrences = 2,584**. Expected meaningful residual: **0**.
2. `<title>` on `/`, `/pricing`, `/legal/terms` and `/webinars-and-events` contains
   `Coconut` and does **not** contain `!Coconut`.
3. Nav and footer render `Coconut news` on every sampled page.
4. Footer renders `© <year> Coconut. All rights reserved.`
5. Footer FCA sentence is **byte-identical to its pre-change value** — this is a
   regression check that D3 was respected, not a change check.
6. All JSON-LD blocks still parse as valid JSON, and `SoftwareApplication.name` and
   `Product.name` read `Coconut`.
7. `"alternateName": "!Coconut"` is still present in the Organization block (D6). If this
   fails, D6 was silently reversed.
8. Zero HTTP 404s on image requests across sampled pages — proves no asset URL was rewritten.
9. No new console errors on `/`, `/pricing`, `/legal/terms`.
10. CMS: re-query all 20 collections; zero `!Coconut` in prose fields except the two
    flagged FAQ items if they were deliberately held.

### Reproduction steps

1. Publish to staging (`getcoconut.webflow.io`) or inspect the Designer preview.
2. Re-run the crawl: fetch every URL in `sitemap.xml`, `grep -o '!Coconut' | wc -l` per page.
3. Compare against the 2026-08-31 baseline in
   `projects/coconut/.claude/research/brand-exclamation-baseline-2026-08-31.tsv`.
4. Load `/`, `/pricing`, `/legal/terms` in a browser; check nav, footer, headings.
5. Run the Tier 1 acceptance tests.

### Tier mapping

**Tier 1 — Auto, Playwright local** (`tests/acceptance/coconut-remove-brand-exclamation-mark.spec.js`):
- `no !Coconut in page title`
- `nav renders "Coconut news"`
- `footer renders "Coconut news"`
- `footer copyright reads "Coconut. All rights reserved."`
- `FCA disclaimer is unchanged` (regression guard on D3)
- `no !Coconut in visible body text`
- `logo asset URLs still contain !Coconut` (regression guard on D1)
- `no broken images`
- `JSON-LD parses and brand names are clean`
- `Organization alternateName retained` (regression guard on D6)
- `no console errors`

**Tier 2 — CDN regression:** registered in `tests/registry.json` as
`coconut-remove-brand-exclamation-mark`, run on `/deploy`.

**Tier 3 — Manual:**
- Visual check that copy reads naturally where `!Coconut` began a sentence — punctuation
  removal can leave odd spacing that a string test will not catch.
- Confirm the footer inconsistency (D3) is acceptable to show live while awaiting Anna.
- Cross-browser: Playwright runs Chromium only; spot-check Safari.
- Confirm the logo still renders on every template (regression on D1).

### Regression scope — what must not break

- **The logo and every image must still load.** The single biggest risk in this change.
- The FCA disclaimer must be byte-identical (D3).
- `alternateName` must survive (D6).
- No CMS slug or URL may change — verified zero occurrences in slugs, so any slug diff is a bug.
- Rich-text formatting on `/legal/terms` and in Knowledge Hub articles must survive.
- The two custom snippets (`thetimes-utm.js`, `times-cookie-overwrite.js`) are untouched.

---

## 14. Acceptance Tests

File: `tests/acceptance/coconut-remove-brand-exclamation-mark.spec.js`
Target: `https://getcoconut.webflow.io` (staging), switch to `www.getcoconut.com` after go-live.

| Test | Asserts |
|---|---|
| `page title has no exclamation-prefixed brand` | `<title>` excludes `!Coconut`, includes `Coconut` |
| `nav shows "Coconut news"` | nav link text |
| `footer shows "Coconut news"` | footer link text |
| `footer copyright is clean` | `Coconut. All rights reserved.` |
| `footer signup heading is clean` | `Coconut: the accounting & tax app…` |
| `FCA disclaimer left untouched` | still contains `!Coconut are trading names` — **guards D3** |
| `no exclamation brand in visible body text` | `body.innerText` excludes `!Coconut` |
| `asset URLs still contain the original filename` | logo `src` still has `!Coconut_2025_logo` — **guards D1** |
| `all images load` | zero failed image requests |
| `JSON-LD is valid and brand names clean` | every `ld+json` parses; no `!Coconut` outside URL values |
| `Organization alternateName retained` | **guards D6** |
| `no console errors` | zero `pageerror` |

Tests run against `/`, `/pricing`, `/legal/terms` and one Knowledge Hub article.

---

## 15. Parallelisation Map

**Sequential gate:** Task 0 → everything. Task 1 → Tasks 7, 8, 9.

**Independent streams** (safe to run simultaneously once Task 0 passes):

| Stream | Tasks | Agent | Est. | Touches |
|---|---|---|---|---|
| A — Data API | 4, 5, 6 | code-writer + schema | 1.75h | CMS items, page settings, page schema |
| B — Designer shared | 2, 3 | code-writer | 0.75h | nav/footer components, site custom code |
| C — Designer per-page | 7, 9 | code-writer | 2.75h | static page copy, alt text |
| D — Legal page | 8 | code-writer | 1h | `/legal/terms` only |
| E — Client comms | 11 | content | 0.25h | repo only, no site access |

Stream A never touches the Designer; B/C/D never touch the Data API — no write conflicts.
**B must finish before C**, so the per-page sweep is not re-finding shared occurrences.
E is fully independent and can start immediately.

**Recommendation:** worktrees **no** — the only repo artefacts are this spec, the test
file and the comms note. Agent teams **yes** for streams A and C/D, which are the two
largest. Realistic wall-clock with parallelism: **~4 hours** against 6–8 hours of work.

---

## 16. Agents needed

- **code-writer** — Tasks 0, 2, 3, 4, 6, 7, 8, 9
- **schema** — Task 5 (JSON-LD)
- **Explore** — Task 1 (worklist generation)
- **qa** — Task 10 (verification)
- **content** — Task 11 (note for Anna)

---

## 17. Open questions

1. **Does Anna approve changing the FCA footer line?** Blocks nothing, but the site ships
   visibly inconsistent until answered. Highest priority.
2. **Should `@Coconut` be dealt with in the same pass?** Out of scope as written.
3. **Who owns the external profiles** Leah recommended updating?
4. **Is `/mtd-for-sole-traders` (draft) still wanted?** Included on the assumption it is.

---

## 18. Files

| File | Status |
|---|---|
| `projects/coconut/.claude/specs/remove-brand-exclamation-mark.md` | this spec |
| `tests/acceptance/coconut-remove-brand-exclamation-mark.spec.js` | new |
| `tests/registry.json` | updated |
| `projects/coconut/.claude/comms/fca-footer-and-brand-styling-2026-08-31.md` | new |
| `projects/coconut/.claude/research/brand-exclamation-baseline-2026-08-31.tsv` | new — per-URL baseline counts |
