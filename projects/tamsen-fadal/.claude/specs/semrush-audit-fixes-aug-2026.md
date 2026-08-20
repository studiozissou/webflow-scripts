# SEMrush audit remediation — tamsenfadal.com

**Slug:** `semrush-audit-fixes-aug-2026`
**Client:** Tamsen Fadal
**Status:** Ready to Build
**Created:** 2026-08-20
**Source:** SEMrush site audit, project `30728045`, snapshot `6a870409369f3514438ddca9` (finished 2026-08-18)
**Site ID:** `68a2d5617c9630d9c780ded5`

---

## Problem

A fresh SEMrush scan flags five issues. Verified against the live site on 2026-08-20;
the reported counts are accurate but three of the five are materially different from
what the headline number suggests.

| SEMrush issue | ID | Reported | Verified reality |
| --- | --- | --- | --- |
| Duplicate meta descriptions | 15 | 20 pages | 10 pairs; same set left unresolved in `meta-description-fixes.md` |
| Redirect chain or loop | 33 | 1 | One link, 4 hops, dead-ends on the homepage |
| Too much text in title tags | 102 | 253 pages | 264 by own crawl; **139 fixable mechanically, 125 need editorial** |
| Broken external links | 12 | 82 links | ~52 unique targets; **12 rows are false positives** |
| llms.txt formatting | 219 | 1 | File is YAML-style, spec requires Markdown |

## Goal

Clear all five issues in the next SEMrush crawl without weakening the branded-search
entity signals established in `seo-branded-search-fix.md`, and without publishing
low-quality machine-truncated titles.

---

## Research summary

### Method
- Live SEMrush `issue_details` pulls for issues 15, 33, 102, 12, 219.
- Independent crawl of all 413 sitemap URLs capturing `<title>` and `meta[name=description]`.
- Re-tested a 20-URL sample of the broken links with a browser user agent to separate
  real breakage from bot-blocking.

### Blocker from the previous pass is cleared
`meta-description-fixes.md` recorded that Webflow MCP's `list_collection_items` ignored
`offset`, `page` and `slug`, capping reads at the first 100 of 261 blog items and leaving
six posts unfixable. **MCP 2.0.1 supports `filter: { slug: { eq: … } }`** — verified by
resolving `it-was-never-your-fault` (item `69e9bdb9b80dd6b9673933b4`), which sits well
beyond the first 100. Every item is now addressable by slug. No manual Designer lookups.

### Collection IDs
- Blogs — `68bede1a5ef125759435c0e1`
- Podcast Episodes — `68a5993943f9f66c9d22b4b7`
- Advocacy / State Legislations — `6942c01a50421ebc419e7790`
- Providers — `68bedb8b4af254930ab6a152`
- Press Articles — `68bee11715c673b2dcf52e3d`

### Constraints carried in
- `CLAUDE.md` (root) — no build step, vanilla ES2022+, named exports, no inline comments
  in production code, client files under `projects/tamsen-fadal/.claude/`.
- `client.md` — Tamsen's team owns and approves copy. Precedent from 2026-08-10 is that
  descriptions written *from the page's own content* were applied and published directly.
  Nothing here invents facts; every draft is derived from the item's existing fields.
- `seo-branded-search-fix.md` — titles must keep carrying the "Tamsen Fadal" entity
  signal. **This constrains the title fix: the `| Tamsen Fadal` suffix stays.**

### Decisions taken (user, 2026-08-20)
1. **Titles** — trim the CMS title templates, add an optional `seo-title` field with
   fallback to Name, and shorten every page still over 70.
2. **Publish mode** — everything goes live directly, no staging gate.
3. **Broken links** — repoint where a good target exists, unlink but keep the sentence
   where the target is gone, leave bot-blocks and false positives alone.

> **Flagged against decision 2.** Publishing is fine for the mechanical work, but 125 of
> the long titles cannot be shortened by rule without producing cuts like
> *"Tired of Holding It Together? Founder of the We Do Not"*. Those are written by hand in
> Phase 3b rather than auto-truncated, then published without a review gate as instructed.
> The generator's `editorial` tier exists to route them, not to publish them.

---

## Phase 1 — llms.txt rewrite

**Issue 219. One file. Zero risk.**

`https://www.tamsenfadal.com/llms.txt` returns 200 but is written as YAML-ish
`key: value` blocks. The llmstxt.org spec requires Markdown: an `# H1`, an optional
`> blockquote` summary, prose, then `## sections` containing `- [title](url): note`
link lists. SEMrush `errorType 2` is a format error, not a fetch error.

Rewrite preserving all existing content — purpose, entry points, use guidelines,
medical disclaimer, attribution, canonical preference, crawl preferences, contact,
copyright — remapped onto the required structure. Update `updated:` (currently
2025-12-19) to the publish date.

Note: the file is served with `x-robots-tag: noindex`. Harmless for llms.txt and out
of scope, but recorded here so it is not mistaken for a regression later.

**Verify:** `curl -s https://www.tamsenfadal.com/llms.txt | head -5` shows `# Tamsen Fadal`
followed by a `>` blockquote line.

---

## Phase 2 — Redirect chain

**Issue 33. One link.**

| Field | Value |
| --- | --- |
| Source page | `/blog/fight-inflammation-lose-weight-with-dr-daryl-gioffre` |
| Link target | `https://tamsenfadal.com/hot-girl-menopause-smoothie/` |
| Hops | `→ /hot-girl-menopause-smoothie` (301) `→ www.…` (301) `→ www.…/` (301) `→ homepage` (200) |

The smoothie page no longer exists — the chain terminates on the homepage, so this is a
dead link wearing a redirect costume, not a fixable chain. Search the Blogs collection
for a current smoothie/anti-inflammatory post. If one exists, repoint. If not, unlink and
keep the sentence, per the Phase 4 rule.

**Verify:** SEMrush issue 33 count returns 0; no `hot-girl-menopause-smoothie` reference
remains in `post-content`.

---

## Phase 3 — Title tags

**Issue 102. The largest phase, and the only one with a real judgement component.**

### Why the template alone cannot fix this
The podcast suffix ` | The Tamsen Show Podcast | Tamsen Fadal` is 41 characters, leaving
29 for the episode name. But **even at zero suffix length, 72 item names exceed 70 characters
on their own.** Simulation across the live crawl:

| Suffix | Podcast still over 70 | Blog still over 70 |
| --- | --- | --- |
| current (41 / 22 ch) | 106 / 107 | 143 / 257 |
| ` \| Tamsen Fadal` (15 ch) | 80 / 107 | 104 / 257 |
| none (0 ch) | 36 / 107 | 36 / 257 |

So the fix is necessarily two-part: shorten the template *and* give long items a place to
carry a shorter title.

### 3a — Template + field (mechanical, 139 pages)

1. Add a `PlainText` field **`seo-title`** to Blogs and Podcast Episodes, help text:
   *"Optional. Overrides the page title when the post name is too long for search results.
   Aim for 55 characters or fewer — ' | Tamsen Fadal' is appended automatically."*
2. In the Designer, set both collection templates' SEO title to
   `{{seo-title}} | Tamsen Fadal` with `{{Name}}` as the fallback binding.
3. Trim the static and hub page titles (7 + 5 pages) via `bulk_update_pages`.

139 pages resolve at this step with no copy written: 74 whose names already fit under the
shorter suffix, 47 where the text before a colon stands alone, 18 where a trailing
`with <Guest>` clause drops cleanly.

Generator: `tools/entity-audit/seo-title-drafts.mjs` → `.claude/audits/seo-title-drafts-2026-08-20.tsv`
(columns: `url, group, tier, current_length, proposed_length, rule, current_title, proposed_title`).
Rows marked `tier=auto` are safe to write as-is.

### 3b — Editorial titles (125 pages)

Rows marked `tier=editorial` are regex truncations and **must not be published as generated**.
Write each by hand from the item's own `name`, `short-description` and `post-content`,
target ≤ 55 characters bare, preserve the hook, never invent a claim. Write into `seo-title`.

Worked example:

```
name       The #1 GLP-1 Doctor: What Works, What Doesn't & What's Next
           with Dr. Rocio Salas-Whalen                                (107 ch rendered)
generated  The #1 GLP-1 Doctor: What Works, What Doesn't               (before-colon → auto)
seo-title  The #1 GLP-1 Doctor: What Works, What Doesn't               (62 ch rendered)
```

### 3c — Mojibake cleanup (11 pages, found in passing)

Eleven blog titles carry double-encoded UTF-8 that renders in the live `<title>`:
`It‚Äôs` for `It's`, `‚Äú…‚Äù` for curly quotes. Not in the SEMrush list, visible in
search results, mechanical to fix. Affected posts include
`hidden-reason-behind-midlife-weight-gain`,
`3-ways-to-manage-menopause-brain-get-your-focus-back`,
`most-women-with-sleep-apnea-dont-snore-thats-why-doctors-miss-it-the-tamsen-show`.
Repair `name` in the CMS; re-run the generator afterwards so drafts use clean text.

Also fix the stray leading space on `" It was never your fault"`.

**Verify:** re-run the generator — `over70` reaches 0 and no row contains `‚Ä`.

---

## Phase 4 — Broken external links

**Issue 12. 82 rows, ~52 unique targets — pagination on `/advocacy`, `/press` and the
provider directory multiplies each target across `?…_page=N` variants.**

### Confirmed false positives — change nothing
Re-tested with a browser user agent:

| Target | SEMrush | Actual | Rows |
| --- | --- | --- | --- |
| `nia.nih.gov/health/menopause/sleep-problems…` | 405 | **200** | 6 |
| `amazon.com.au/How-Menopause-…` (6 variants) | 500 | **200** | 6 |
| `healthnews.com/…`, `nysenate.gov/…`, `professional.heart.org/…` | 404/500 | **403 bot-block** | ~5 |

That is ~17 of the 82 needing no action. SEMrush uses HEAD requests and a bot UA; these
hosts reject both.

### Real breakage — act

| Cluster | Count | Action |
| --- | --- | --- |
| Apple Podcasts `id1560877893` — the retired *Coming Up Next* show, delisted | 14 | Repoint to the current show `id1799976761`; drop the `?i=` episode param, which no longer resolves |
| `http://productivity-hacks-to-save-time-with-andrew-mellen` — a relative slug saved as an absolute URL | 1 | Malformed; unlink or repoint to the internal post |
| Michigan / Massachusetts / NY / Iowa legislature bill links | 7 | Advocacy collection; repoint to current bill URLs or unlink |
| Dead provider sites (`journeyofawoman.co.uk`, `theconfidenceclinic.co`, `cgcchicago.com`, `ytvhealthcoaching.com`, `lotusmedics.com.au`, `ysl.nl`) | 6 | Providers collection; clear the link field |
| Dead press links (`moderngenxwoman.com`, `preferredhealthmagazine.com`, `bellamag.co`, an Apple Podcasts guest spot) | 4 | Press collection; clear the link field |
| Misc content links (`pbs.org` M Factor, `worldchannel.org`, `zoe.com`, `coveyclub.com` ×3, `menopause.org` PDF, `ulta.com`, `naplesfamilylawfirm.com`, `functionalsobriety.com`, `healthnews.com` ×2, `theswell.com`) | ~15 | Repoint if an equivalent exists, else unlink and keep the sentence |
| `professional.heart.org/…/prevent-calculator ` — **has a trailing space inside the href** | 1 | Strip the space; the URL itself is a 403 bot-block, not dead |

**Verify:** every changed target returns < 400 with a browser UA; no `id1560877893`
reference remains anywhere in the CMS.

---

## Phase 5 — Duplicate meta descriptions

**Issue 15. 10 pairs. In each, one page holds the correct text and the other inherited it
by copy-paste — the search snippet currently promises the wrong guest or topic.**

| # | Keeps its description | **Needs a new one** |
| --- | --- | --- |
| 1 | `/podcast/from-sports-illustrated-to-sephora…` (Molly Sims) | `/podcast/choosing-a-child-free-life-5-things-i-wish-i-knew-earlier` |
| 2 | `/podcast/relationship-q-and-a-…` ("You asked, Tamsen answered.") | `/podcast/if-youre-going-through-a-friendship-breakup-…` |
| 3 | `/podcast/it-cant-rain-forever-kandi-burruss-…` | `/podcast/the-hair-loss-doctor-what-works-and-whats-a-waste` |
| 4 | `/podcast/therapist-reveals-why-adult-friendships-…` (Minaa B.) | `/podcast/hair-loss-dry-skin-and-sagging-skin-the-1-dermatologist-explains` |
| 5 | `/podcast/progesterone-101-…` | `/podcast/the-fertility-expert-egg-freezing-perimenopause-glp-1s-explained` |
| 6 | `/podcast/the-glp-1-doctor-…` | `/podcast/why-you-always-feel-behind-and-the-simple-tools-that-will-free-you` |
| 7 | `/podcast/what-i-wish-i-knew-at-35-…` | `/podcast/the-hidden-reason-you-keep-choosing-emotionally-unavailable-people` |
| 8 | — see content-duplication note below — | `/blog/everything-you-need-to-know-about-gsm-and-vaginal-estrogen` ↔ `/blog/it-was-never-your-fault` |
| 9 | `/blog/the-6-shoes-you-need-in-your-closet` | `/blog/your-feet-are-trying-to-tell-you-something` |
| 10 | `/blog/the-hair-conversation-women-are-still-too-afraid-to-have` | `/blog/the-space-between-who-you-were-and-who-youre-becoming` |

Write each from that item's own `name`, `guest`, `post-content` and `show-notes-text`.
Never invent. 140–160 characters rendered.

### Two template bugs to fix in the same pass
1. **Doubled period.** The blog template renders `{{Short Description}}. Read more on
   Tamsen Fadal's blog.` Descriptions that already end in punctuation produce
   `…hair loss.. Read more on…` and `…walking in. . Read more on…` — both live right now.
   Strip trailing `.` / ` .` from `short-description` on write, and audit the field
   collection-wide for the same defect.
2. **Description too thin.** Pair 2's surviving text is *"You asked, Tamsen answered."* —
   27 characters. Technically unique, useless as a snippet. Expand it.

### Content duplication — needs a decision, not a description
Pair 8 is not a copy-paste error. `/blog/it-was-never-your-fault` has `short-description`
*and* `post-content` about GSM and vaginal estrogen — the same subject as
`/blog/everything-you-need-to-know-about-gsm-and-vaginal-estrogen`. These look like two
posts covering one topic. Writing a second description hides the duplication rather than
resolving it. **Open question for the client:** consolidate, or canonicalise one to the
other? Until answered, give `it-was-never-your-fault` a description written from its own
angle so the SEMrush flag clears, and log the question.

**Verify:** all 413 crawled descriptions unique; no description contains `..` or ` . `.

---

## Task breakdown

| # | Task | Agent | Depends on |
| --- | --- | --- | --- |
| 1 | Rewrite llms.txt to llmstxt.org Markdown | `content` | — |
| 2 | Fix redirect-chain link | `seo` | — |
| 3 | Repair 11 mojibake names + leading space | `code-writer` | — |
| 4 | Add `seo-title` field to both collections | `code-writer` | — |
| 5 | Bind templates to `{{seo-title}}`, trim 12 static/hub titles | `code-writer` | 4 |
| 6 | Write 139 `tier=auto` seo-titles | `code-writer` | 3, 4 |
| 7 | Hand-write 125 `tier=editorial` seo-titles | `content` | 3, 4 |
| 8 | Repoint 14 Apple Podcasts links | `code-writer` | — |
| 9 | Clear/repoint dead provider, press, legislation links | `seo` | — |
| 10 | Repoint or unlink ~15 misc content links | `seo` | — |
| 11 | Write 10 meta descriptions + strip trailing periods | `content` | — |
| 12 | Fix blog description template doubled period | `code-writer` | — |
| 13 | Publish all changed CMS items + site | `code-writer` | all |
| 14 | Re-run generator + crawl; trigger SEMrush recrawl | `qa` | 13 |

## Parallelisation map

Five independent streams — no shared files, different collections and different SEMrush
issues. Worktrees are unnecessary: all writes go through the Webflow API, not the repo.

| Stream | Tasks | Agent | Est. time | Est. tokens |
| --- | --- | --- | --- | --- |
| A — llms.txt | 1 | `content` | 15 min | ~8k |
| B — Titles | 3 → 4 → 5 → 6 → 7 | `code-writer` + `content` | 2.5 h | ~180k |
| C — Links | 2, 8, 9, 10 | `seo` | 1 h | ~45k |
| D — Descriptions | 11, 12 | `content` | 45 min | ~35k |
| E — Publish + verify | 13, 14 | `code-writer`, `qa` | 20 min | ~15k |

- **Sequential gates:** task 4 gates 5/6/7; task 3 must land before 6/7 so drafts are
  generated from clean text; **E runs only after A–D complete**.
- **Recommendation:** run A–D in parallel, then E. Stream B is the critical path and the
  only one carrying editorial risk — start it first.
- **Agent teams:** yes for B (split the 125 editorial titles into blog and podcast halves).
- **Worktrees:** no.

## Barba impact

**N/A — no Barba transitions.** `projects/tamsen-fadal/` contains no JS modules; the only
Barba mentions are prose references inside other spec documents. All changes in this spec
are Webflow CMS data, page settings and one static file. No `init`/`destroy` lifecycle,
no state to survive a transition, no namespace scoping.

---

## Verify Loop

### Pass/fail criteria
| # | Condition | How |
| --- | --- | --- |
| V1 | No page title exceeds 70 characters | `node tools/entity-audit/seo-title-drafts.mjs` reports `over70=0` |
| V2 | No title contains mojibake | generator output has zero rows matching `‚Ä` |
| V3 | All meta descriptions unique across 413 sitemap pages | crawl script duplicate-group count is 0 |
| V4 | No description contains `..` or ` . ` | grep over crawl output returns nothing |
| V5 | llms.txt parses as Markdown, first line is `# Tamsen Fadal` | `curl -s …/llms.txt \| head -5` |
| V6 | No `id1560877893` reference anywhere in the CMS | Webflow MCP search across Blogs + Podcast |
| V7 | Every repointed external link returns < 400 with a browser UA | link-check script |
| V8 | `hot-girl-menopause-smoothie` no longer referenced | grep over crawl output |
| V9 | SEMrush issues 12, 15, 33, 102, 219 all report 0 | recrawl, then `issue_details` per ID |

### Reproduction steps
1. Publish the site.
2. Wait for CDN propagation (Webflow + Cloudflare, allow 5 min).
3. `node tools/entity-audit/seo-title-drafts.mjs` → V1, V2.
4. Re-run the 413-page crawl → V3, V4, V8.
5. `curl` llms.txt → V5.
6. Run `tests/acceptance/semrush-audit-fixes-aug-2026.spec.js` → V5, V7 spot checks.
7. Trigger a SEMrush recrawl of project `30728045`; read `info` once `status: FINISHED` → V9.

### Tier mapping
- **Tier 1 (auto, local):** `semrush-audit-fixes-aug-2026.spec.js` — title lengths, description
  uniqueness on sampled pages, llms.txt shape, no-console-errors on each touched page type.
- **Tier 2 (auto, CDN regression):** registered as `semrush-audit-fixes-aug-2026` in `tests/registry.json`.
- **Tier 3 (manual):**
  - *SEMrush recrawl (V9)* — cannot be automated here; the crawl is scheduled server-side
    and takes hours. Check the dashboard the day after publishing.
  - *Editorial title quality (125 pages)* — "does this title still sell the episode?" is a
    judgement no assertion covers. Skim the final TSV.
  - *Content-duplication decision on pair 8* — needs a client answer.

### Regression scope
Must not break:
- **Entity signals.** Every title keeps its `| Tamsen Fadal` suffix. A title losing it is a
  regression against `seo-branded-search-fix.md`, even if SEMrush goes green.
- **Existing JSON-LD.** Titles feed `Article.headline` and `PodcastEpisode.name` in the
  templates from `site-wide-schema-coverage.md`. Structured data is currently 3,301 valid
  items / 0 invalid — that must hold.
- **OG tags.** `short-description` feeds `og:description`. Descriptions rewritten in Phase 5
  change the social card too; confirm they still read well out of context.
- **Slugs.** No slug changes anywhere. Changing one breaks every inbound link.
- **`tf-newsletter.spec.js` and `tf-contact.spec.js`** must still pass.

---

## Acceptance Tests

`tests/acceptance/semrush-audit-fixes-aug-2026.spec.js`

1. `llms.txt starts with a Markdown H1 and blockquote`
2. `llms.txt contains at least one Markdown link list item`
3. `podcast template title is at most 70 characters`
4. `blog template title is at most 70 characters`
5. `static page titles are at most 70 characters` (advocacy, shop, press, directory, hub)
6. `every title retains the Tamsen Fadal entity suffix`
7. `no title contains double-encoded UTF-8`
8. `previously duplicated podcast descriptions are now distinct`
9. `previously duplicated blog descriptions are now distinct`
10. `no meta description contains a doubled period`
11. `retired Apple Podcasts show id is absent from blog posts`
12. `smoothie redirect chain target is no longer linked`
13. `no console errors on each touched page type`

---

## Risks and open questions

| # | Item | Severity |
| --- | --- | --- |
| R1 | 125 editorial titles published live without a review gate, per decision 2. Mitigated by hand-writing rather than truncating, but a bad title ships silently. | **High** |
| R2 | Pair 8 content duplication needs a client decision; the description fix clears the flag without resolving the cause. | Medium |
| R3 | Adding `seo-title` to two collections changes the CMS schema. Reversible, but coordinate so nobody is mid-edit in the Designer. | Medium |
| R4 | Some legislation bill URLs may have no current equivalent — those become unlinks, which slightly weakens the advocacy page's citations. | Low |
| R5 | SEMrush may still flag the ~17 false positives next crawl. Mark them "Not an issue" in the dashboard rather than editing good links. | Low |

**Open questions**
1. Pair 8 — consolidate the two GSM posts, or canonicalise one to the other?
2. Should the retired Apple Podcasts links point at the new show's home, or be unlinked
   entirely given the referenced episodes no longer exist anywhere?
3. `/blog/alloy-womens-health-…` was flagged as near-empty in the previous audit and is
   still thin. In scope for a separate content task?

---

## Build outcome — 2026-08-20

Built and published. Full report, including three corrections to this spec, in
[`../audits/semrush-remediation-2026-08-20.md`](../audits/semrush-remediation-2026-08-20.md).

Corrections worth carrying forward:

1. **Webflow SEO-title bindings have no fallback.** `{{Name}}` as a fallback for
   `{{seo-title}}` is not a real feature. All 371 items were populated instead.
2. **Pair 9 was mapped backwards.** The "30 years in heels" text belongs to
   `your-feet-are-trying-to-tell-you-something`; `the-6-shoes-you-need-in-your-closet`
   is the copy. Pair 3 was already distinct — the real tenth duplicate is a Dr. Gabrielle
   Lyon text shared by `this-is-a-lesson-i-wish-i-learned-earlier` and
   `how-getting-stronger-as-you-age-…`.
3. **The smoothie page is not gone.** `/blog/hot-girl-menopause-smoothie` returns 200, so
   the redirect chain was repointed rather than unlinked.

Outstanding: `llms.txt` must be pasted into Webflow site settings by hand — it is not
writable through the Data API, so issue 219 stays open until then.
