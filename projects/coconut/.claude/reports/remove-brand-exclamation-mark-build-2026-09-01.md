# Build report — Remove the "!" from the Coconut brand name

**Date:** 2026-09-01
**Spec:** `projects/coconut/.claude/specs/remove-brand-exclamation-mark.md`
**Site:** Coconut — `6069af2a39978132d0155fd7`
**Status:** Changes are **staged and unpublished**. Will publishes (D5 / R1).

---

## 1. Headline

Every in-scope occurrence Claude can reach through the Webflow API has been changed.
One task is **blocked on API permissions** (page JSON-LD, Task 5) and needs either a
token with wider scope or ~10 minutes of manual work in Webflow page settings.

**Nothing has been published.** The live site still shows `!Coconut` everywhere until
Will publishes.

---

## 2. What was changed

| Task | Area | Result |
|---|---|---|
| 0 | Spike — prove primary-locale writes land | ✅ Passed; §8.1 fallback not needed |
| 1 | Element-level worklist | ✅ Done inline (queried each page directly) |
| 2 | Shared components | ✅ 4 edits — see below |
| 3 | Site custom code / `alternateName` | ✅ No change needed (D6 keeps it) |
| 4 | Page SEO title + description | ✅ 7 pages |
| 5 | Page JSON-LD (`/`, `/pricing`) | ❌ **BLOCKED** — see §4 |
| 6 | CMS items | ✅ 68 items across 8 collections |
| 7 | Static page copy | ✅ Full sweep of all live pages + templates |
| 8 | `/legal/terms` | ✅ 74 text nodes / 121 occurrences |
| 9 | Image alt text | ✅ Nav logo alt + 3 asset alt texts |
| 10 | Verification | ✅ API-level; live crawl deferred to post-publish |
| 11 | Note for Anna | ✅ Already written during `/plan` |

### Shared component edits (highest leverage)

| Component | Element / prop | New value |
|---|---|---|
| Top Nav Bar | `!Coconut news` link | `Coconut news` |
| Footer | `!Coconut news` link | `Coconut news` |
| Footer | copyright String node | ` Coconut. All rights reserved.` |
| Foooter Signup Section | `Title` prop **default** | `Coconut: the accounting & tax app…` |
| Testimonial Section | `Title` prop **default** | `What our Coconut community says` |

The Testimonial Section default was **not** in the spec's §6 list — it was found by
sweeping every component definition. All 383 component prop defaults are now clean.

### CMS (Task 6) — 68 items, matching the spec exactly

FAQs 48 · Knowledge Hub Articles 8 · 25 New Features 5 · Webinars 3 ·
Tools 1 · Blog Banner Ads 1 · Feature Highlights 1 · Categories 1.

No slug, URL or `href` was touched. Curly apostrophes (`’`), non-breaking hyphens
(`‑`), zero-width joiners (`‍`) and existing typos were all preserved byte-for-byte.

---

## 3. Things found during the build that the spec did not predict

1. **The footer copyright would have been destroyed by the spec's own element ID.**
   §6 lists `b8deaa9b-…045b` for the copyright line. That is a **String node**, and its
   writable parent has three children — `© `, `<span id="year">`, and the brand text.
   A `set_text` on that parent replaces all three and **deletes the year span on every
   page**. Fixed by writing the String node directly, which leaves the span intact.

2. **String nodes accept `set_text`; their `div` parents do not.** The spec's constraint 4
   says to use `return_parent` to get a writable element — but for these link and
   copyright blocks the parent is a `div` and returns *"This element doesn't support text"*.
   Writing the String node directly works.

3. **Element IDs regenerate after every write.** A read-back using the pre-write ID
   returns zero matches even though the write succeeded. Any worklist built up-front
   goes stale as soon as you start applying it.

4. **A text query *does* surface component instance prop overrides.** The spec's R5 /
   constraint 3 warns that a text sweep under-reports component props. In practice the
   homepage CTA Bar heading override was caught and fixed by the plain text query.
   What a text query misses is component **defaults**, which is a global fix, not a
   per-page one — so the risk was real but the mitigation was different from the one planned.

5. **§6 and §13 contradict each other on the expected residual.** §6 says the five shared
   edits "clear 1,131 of the 2,215", but one of those five is `alternateName`, which D6
   explicitly **keeps**. So the shared edits clear ~899, and §13 criterion 1's "expected
   meaningful residual: 0" is wrong — it should be ~232, all of them `alternateName`,
   which criterion 7 separately requires to still be present.

6. **The site was published today (2026-09-01 08:33), not 2026-08-27 as §5.6 records.**
   Someone published between the spec being written and this build. Worth checking what
   went out before publishing again (R1).

7. **`/about` exists.** §3.2 states "There is no `/about`". Page
   `65afe5d79038933a4ba8d1b8` `/about` exists in Webflow (it is not in the sitemap).
   It was swept and is clean.

8. **The nav logo alt text was the bulk of Task 9.** `altText: "!Coconut Logo"` on the
   Top Nav Bar logo renders on all 231 pages — roughly 231 of the 284 alt occurrences,
   fixed in one edit. Alt text is a Webflow *setting*, not an attribute: `set_attributes`
   fails with an internal error, `data_element_settings_tool` with key `altText` works.

---

## 4. Blocked — Task 5, page JSON-LD

The API token cannot write JSON-LD:

- `bulk_update_pages_schema_markup` → `403 insufficient_permissions`
- `bulk_update_pages` → `403 insufficient_permissions`
- `update_page_settings` with `jsonLdSchema` → **returns 200 but silently does nothing**
  (`lastUpdated` does not move; the value is unchanged on read-back)

That last one is the dangerous case — it looks like success. Anything relying on that
call would report a false pass.

**Still to do (about 10 minutes by hand in Webflow → Page settings):**

| Page | Field | Change |
|---|---|---|
| `/` | `SoftwareApplication.name` | `!Coconut` → `Coconut` (1 hit) |
| `/pricing` | raw JSON-LD | 12 non-URL hits: WebPage `name` + `description`, `Product.name`, `brand.name`, `about.name`, and 4 FAQ Q&As |

**Do not touch** the `Product.image` value on `/pricing` — it is the logo asset URL and
is out of scope under D1.

`/accountant-software` needs no change (its only hit is an asset URL).

---

## 5. Verification

The spec's §13 reproduction steps assume a live re-crawl. **That cannot run yet** — the
changes are staged and unpublished, so a crawl today returns the pre-change site. All
verification below is against the Webflow API (the Designer state that will be published).

| # | Criterion | Result |
|---|---|---|
| 1 | Zero meaningful `!Coconut` in page copy | ✅ all 66 live pages + 12 templates + the in-scope draft queried; all return 0 |
| 2 | `<title>` clean on the 4 named pages | ✅ re-read after writing: `/`, `/pricing`, `/legal/terms`, `/webinars-and-events` all clean |
| 3 | Nav + footer render `Coconut news` | ✅ nav component residual = 0 |
| 4 | Footer copyright | ✅ `© ` + `<span id="year">x</span>` + ` Coconut. All rights reserved.` — span and leading space intact |
| 5 | FCA sentence byte-identical | ✅ footer residual = **exactly 1**, and it is the FCA line, character-for-character identical to the pre-change value |
| 6 | JSON-LD brand names clean | ❌ **blocked** — see §4 |
| 7 | `alternateName` retained (D6) | ✅ lives in Site Settings → Custom Code, which was never opened or written |
| 8 | Zero image 404s | ⏳ post-publish — no asset URL, filename or `hostedUrl` was modified |
| 9 | No console errors | ⏳ post-publish |
| 10 | CMS clean | ✅ **all 20 collections, ~1,000 items, re-scanned independently → 0 hits** |

### Verification evidence

- **CMS:** every collection re-fetched *after* the edits and scanned locally. FAQs 156/156,
  Knowledge Hub 208/208, Chapters 135/135, Blog Posts 46/46, Feature Highlights 51/51,
  Integrations 25/25, Categories 15/15, Authors 14/14, Landing Pages 11/11, and the rest —
  zero `!Coconut` anywhere.
- **Components:** all 383 component prop defaults scanned → 0 hits.
- **Assets:** all 643 site assets scanned for alt text → 3 found, 3 fixed, re-confirmed.
- **Pages:** each page queried individually; the only non-zero result remaining anywhere on
  the site is the single FCA String node, which is excluded by D3.

**Not independently verified:** OG tags, image loading and console health all require a
published site, and the two JSON-LD blocks in §4 are unchanged.

**Tier 1 / Tier 2 tests** (`tests/acceptance/coconut-remove-brand-exclamation-mark.spec.js`)
target the live site and will only be meaningful **after** publish.

---

## 5a. POST-PUBLISH LIVE CRAWL — 2026-09-01, after Will published

All 231 sitemap URLs re-crawled. **2,666 occurrences of `!Coconut` remain**, of which
**97 are meaningful** across 28 pages. Breakdown:

| Class | Count | Verdict |
|---|---:|---|
| Asset URLs | 2,092 | ✅ expected (D1) |
| `alternateName` | 232 | ✅ expected (D6) |
| FCA disclosure line | 245 | ✅ expected (D3) |
| **MEANINGFUL** | **97** | ❌ see below |

### Root cause: the site has TWO nav/footer component sets

This is the big miss, and the spec did not mention it. §6 lists one `Top Nav Bar` and one
`Footer`. In fact there are two parallel sets:

| Set | Components | Instances | Status |
|---|---|---:|---|
| 2025 redesign (group "25") | `Top Nav Bar` + `Footer` | 50 each | fixed in the original build |
| Older set | `Navbar / Light / 1` + `Footer Main` | 46 each | **missed** |

**Why the original sweep missed it:** a page-level text query does **not** descend into a
component's own definition — it only returns page-level text and component *instance
overrides*. The original build scope-queried `Top Nav Bar` and `Footer` by ID (because the
spec named them) and swept all 383 component *prop defaults*, but never swept component
*internal text*. Everything inside `Navbar / Light / 1` and `Footer Main` was invisible to
every check that was run, including the pre-publish verification.

I initially misread the 15 affected pages as "not republished". They were published fine —
they simply render `Footer Main`, which still had the old text. The FCA wording Will
changed made this diagnosable: those 15 pages served the *old* FCA sentence because the
edit was applied to `Footer` only, not `Footer Main`.

### The 97, fully accounted for

| Source | Count | Fixed? |
|---|---:|---|
| Page JSON-LD (blocked, §4) | 43 | ❌ still blocked |
| `Navbar / Light / 1` + `Footer Main` (15 pages × 3, plus 4 `/tools/*` × 1) | 49 | ✅ fixed 2026-09-01 |
| `!Coconut` inside a component **variant** (Zempler bank line) | 5 | ✅ fixed 2026-09-01 |

### Fixed after the crawl

- `Navbar / Light / 1` → `Coconut news`
- `Footer Main` → `Coconut news`, ` Coconut. All rights reserved.`
- Zempler section component `2a411466…` → "…free Zempler bank account within Coconut."

These are **staged and need another publish**.

### ⚠️ The site is serving two different FCA statements

`Footer` now carries Will's updated wording:
> `@Coconut, Coconut and !Coconut are trading names of @Coconut Platform Ltd… Coconut is registered with the FCA…`

`Footer Main` still carries the original:
> `@Coconut and !Coconut are trading names of @Coconut Platform Ltd… !Coconut is registered with the FCA…`

Roughly 15 live pages show the old one. Two divergent regulated disclosures on the same
site is a compliance problem in its own right. Left unchanged pending an explicit decision —
this is not a copy edit.

### More JSON-LD pages than §3.6 found

§3.6 lists only `/` and `/pricing`. The crawl shows brand-carrying JSON-LD on **five** pages:

| Page | Meaningful JSON-LD hits |
|---|---:|
| `/mtd-software` | 21 |
| `/pricing` | 13 |
| `/webinars-and-events` | 7 |
| `/` | 1 |
| `/hmrc-free-mtd-software-comparison` | 1 |

---

## 6. What Will needs to do

1. Check the Designer for other people's unpublished work before publishing (R1) — the
   site was already published once today by someone else.
2. Do the two JSON-LD edits in §4 by hand (or issue a token with schema-write scope).
3. Publish.
4. Then run the acceptance tests and re-crawl against
   `projects/coconut/.claude/research/brand-exclamation-baseline-2026-08-31.tsv`.
   Expected residual: asset URLs (D1) + the FCA line (D3) + `alternateName` × 231 (D6).
5. Chase Anna on the FCA footer line — until it is answered the footer reads `Coconut`
   everywhere except that one sentence.
