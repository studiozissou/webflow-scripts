# SEMrush audit remediation — build report

**Slug:** `semrush-audit-fixes-aug-2026`
**Executed:** 2026-08-20
**Spec:** `../specs/semrush-audit-fixes-aug-2026.md`
**Site:** `68a2d5617c9630d9c780ded5` (tamsenfadal.com)

All CMS writes went through the Webflow Data API. Changes were staged, verified on
`tamsenfadal.webflow.io`, then published to the live domains.

---

## What shipped

### Phase 3 — Title tags (issue 102)

| Change | Count |
| --- | --- |
| `seo-title` PlainText field added to Blogs and Podcast Episodes | 2 collections |
| Items populated with an `seo-title` | **371** (264 blog, 107 podcast) |
| — resolved mechanically (`unchanged` / `before-colon` / `drop-guest-clause`) | 249 |
| — hand-written | 122 |
| Templates rebound to `{{seo-title}} | Tamsen Fadal` | 2 |
| Education Hub template suffix shortened to ` | Tamsen Fadal` | 1 |
| Static page titles trimmed under 70 | 7 |

Verified: longest rendered title is **70 characters**, every title retains the
`| Tamsen Fadal` entity suffix, no duplicates, no mojibake.

**Deviation from the spec.** The spec called for `{{seo-title}}` with `{{Name}}` as a
fallback binding. Webflow's SEO-title binding has no fallback mechanism — an empty
`seo-title` renders as a bare `| Tamsen Fadal`. Every one of the 371 items was therefore
populated (short names copied verbatim), which makes the binding safe today. See the open
question below about future posts.

### Phase 3c — Encoding repairs

19 item names repaired: 11 double-encoded UTF-8 (`It‚Äôs` → `It's`, `‚Äú…‚Äù` → curly
quotes) and 8 with stray leading or trailing whitespace. The spec anticipated 11 + 1; the
extra 7 whitespace cases were found by sweeping both collections rather than trusting the
sample list. One Education Hub resource name also had a trailing space.

### Phase 5 — Meta descriptions (issue 15)

All **10** duplicate groups resolved; 11 descriptions written from each item's own
content, plus the thin 27-character "You asked, Tamsen answered." expanded.

**Correction to the spec.** Two pairs were mapped the wrong way round:

- Pair 9 — the "30 years in heels" text is verbatim the opening of
  `/blog/your-feet-are-trying-to-tell-you-something`, so that post keeps it and
  `/blog/the-6-shoes-you-need-in-your-closet` received the new description.
- Pair 3 — `it-cant-rain-forever` ↔ `the-hair-loss-doctor` are already distinct. The real
  tenth duplicate is a Dr. Gabrielle Lyon text shared by
  `/blog/this-is-a-lesson-i-wish-i-learned-earlier` and
  `/podcast/how-getting-stronger-as-you-age-…`.

**Deviation on the doubled-period bug.** The spec proposed stripping trailing periods from
`short-description` across 187 blog items. That would have mangled the 11 descriptions
ending in `!` and 3 ending in `?` — the template appends `. ` unconditionally, so `best!`
becomes `best!.`. Instead the hard-coded period was removed from the *template*
(`{{short-description}} Read more on Tamsen Fadal's blog.`) and a terminal period added to
only the **54** descriptions that lacked one. Same result, a third of the writes, and the
author's voice preserved.

### Phases 2 and 4 — Links (issues 33 and 12)

Rather than working from the audit's summary, every outbound URL in the five
link-carrying collections was extracted (2,668 unique) and the 937 non-obvious ones were
tested live with a browser user agent.

| Fix | Count |
| --- | --- |
| Retired Apple Podcasts `id1560877893` → `id1799976761`, dead `?i=` param dropped | 16 URLs / 12 posts |
| Smoothie redirect chain → the live `/blog/hot-girl-menopause-smoothie` post | 1 |
| Defunct Covey Club citations unlinked, sentences kept | 4 |
| Malformed `http://productivity-hacks-to-save-time-with-andrew-mellen` unlinked | 1 |
| `professional.heart.org` PREVENT calculator — encoded trailing space stripped | 1 |
| `getoffyouracid.com` — literal space inside the href stripped | 1 |

**Correction to the spec.** The smoothie page is *not* gone —
`/blog/hot-girl-menopause-smoothie` returns 200. The link was repointed rather than
unlinked, which is the better outcome. Separately, `ysl.nl` (listed as a dead provider
site) returns 200 and was left alone.

**Confirmed false positives — deliberately untouched.** `professional.heart.org` (403),
`nia.nih.gov`, `amazon.com.au`, `healthnews.com`, `nysenate.gov`, and **every state
legislature domain** refuse connections or return 403 to automated clients. A 403 or a
refused connection is not evidence a page is dead, so these were left as they are. Mark
them "Not an issue" in the SEMrush dashboard rather than editing good links.

### Phase 1 — llms.txt (issue 219)

Rewritten to llmstxt.org Markdown and saved to
`projects/tamsen-fadal/.claude/assets/llms.txt`. It passes all six assertions in the
acceptance spec locally.

**This one needs a human.** `/llms.txt` is served by Webflow but is not exposed through
the Data API (it is not a page, an asset, or a site field). It has to be pasted into
Webflow's site settings by hand. Until then SEMrush issue 219 stays open.

---

## Deferred — to be planned separately

Agreed on 2026-08-20 to note these and schedule the fixes later. Nothing here blocks the
five SEMrush issues.

### Known-dead links found but not yet fixed

These returned a genuine 404 from a responding server. None were in SEMrush's 82 rows —
they were surfaced by the independent link test — so issue 12 should clear without them.
Ready-to-apply edits are in the build's working set; each is a single field write.

| Target | Pages | Suggested action |
| --- | --- | --- |
| `menopause.org` deep links (incl. the 2015 hot-flashes PDF) | 8 | Repoint to `https://menopause.org/` |
| `menopausecentre.com.au` articles | 3 | Unlink, keep the sentence |
| `themenopausecharity.org` articles | 3 | Unlink, keep the sentence |
| `legislature.mi.gov/doc.aspx?…` | 4 | Repoint to `…/Bills/Bill?ObjectName=2025-HB-XXXX` |
| Dead provider sites (`ytvhealthcoaching.com` 404, `lotusmedics.com.au` 502, `cgcchicago.com`, `journeyofawoman.co.uk`, `theconfidenceclinic.co` — all DNS failures) | 5 | Clear the provider link field |
| Dead press links (`bellamag.co`, `moderngenxwoman.com`, a `tamsenfadal.com/wp-content/…mp4`) | 3 | Clear the press link field |
| `functionalsobriety.com/book` | 1 | Unlink |
| `www.tamsenfadal.com/menopause-symptom-tracker` + zero-width joiner | 1 | Strip the stray character |

### Other deferred items

- **Copy-paste sweep across the Blogs collection.** The retired GSM duplicate carried
  "Dr. Jason Fung" as its category-box name and a "Jason and Tamsen" hero image on an
  article about GSM — evidence it was created by duplicating an unrelated post. Other items
  may carry the same mismatched byline or image. This is an audit first: report before
  changing anything.

### Closed since

- **`/themfactor2` entity signal — fixed 2026-08-20.** It was the only page on the site
  without "Tamsen Fadal" in its title. Now
  *"The [M] Factor 2: Before The Pause Documentary | Tamsen Fadal"* (61 characters, 9 to
  spare). The film's full name is kept, since branded search is the point of
  `seo-branded-search-fix.md`; the trade-off is the "Perimenopause" keyword, which the H1,
  meta description, and body copy still carry. Keeping it in the title was possible only at
  exactly 70 characters, which is the fragility that flagged this page in the first place.

---

## Decisions taken (user, 2026-08-20, after the build)

1. **`seo-title` is now required** on both collections, with the limit stated in the help
   text: *"Required. The page title shown in search results. Maximum 55 characters —
   ' | Tamsen Fadal' (15 characters) is added automatically, for a 70-character total.
   Anything longer gets truncated by Google."* All 371 items already had a value, so the
   change applied cleanly. A new post can no longer publish with an empty title.

   > Watch for this: any automation that creates Blog or Podcast items through the API must
   > now send `seo-title` or the write will be rejected.

2. **Pair 8 — consolidated.** The two posts were not merely similar: their `post-content`
   was **byte-identical**, 8,252 characters each. The same article had been published twice
   under two slugs. An initial attempt to differentiate one intro was superseded by the
   correct fix — retire one and redirect:

   | Step | Detail |
   | --- | --- |
   | Kept | `/blog/everything-you-need-to-know-about-gsm-and-vaginal-estrogen` — the descriptive, keyword-bearing slug |
   | Retired | `/blog/it-was-never-your-fault` — archived, removed from the sitemap |
   | Redirect | 301 `/blog/it-was-never-your-fault` → the canonical post, added by hand in Site Settings (the Data API does not expose redirects) |

   Verified live: the old path returns a single-hop 301, the canonical post returns 200,
   the sitemap dropped from 413 to 412 URLs, and the blog index no longer links to the
   retired post.

   > Webflow gives 301 redirects precedence over an existing CMS item, so adding the
   > redirect before archiving meant the URL never 404'd.

3. **Retired Apple Podcasts episodes — accepted as-is.** Links resolve to the current show
   rather than the specific episode, which no longer exists anywhere.

## Still to verify

- SEMrush recrawl of project `30728045` — server-side, takes hours. Check the dashboard
  the day after publishing for issues 12, 15, 33, 102, 219.
- Editorial quality of the 122 hand-written titles. A handful of mechanical
  `before-colon` titles are terse (`The Sleep Doctor`, `Therapist Reveals`,
  `Progesterone 101`) and would benefit from a skim.
