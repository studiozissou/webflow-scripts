# On-page copy recommendations — tamsenfadal.com

**Prepared:** 2026-08-20
**Source of truth for all wording:** `.claude/content/official-bio.md` (client-approved 12 Aug 2026)
**Status:** recommendations only. Per the 12 Aug decision, this pass shipped **metadata and
schema**; no visible body copy was changed. Everything below needs a human to action in the
Webflow Designer.

Ranked by leverage — reach × severity. Do them in this order.

---

## 1. The site-wide footer sentence — highest reach on the site

**Where:** `div.footer_bottom-content`, global — renders on **all ~400 pages**.

**Currently reads:**

> Tamsen Fadal is a NYT bestselling author, podcaster  13x Emmy-winning journalist, and
> keynote speaker helping women unlock their full potential.

Three problems, one of them a visible defect:

1. **A double space and a missing comma** after "podcaster" — a copy error currently
   rendering on every page of the site.
2. **"13x Emmy-winning"** now contradicts the approved bio, the page metadata and the
   JSON-LD, all of which say "Emmy Award-winning". After this pass the site's own footer
   disagrees with its own schema on every page.
3. Omits filmmaker, both documentaries, and *The Tamsen Show* by name — the specific,
   verifiable entity claims the audit said the redesign had lost.

**Suggested replacement** (trimmed from the approved short bio, no new claims):

> Tamsen Fadal is an Emmy Award-winning journalist, filmmaker, and instant New York Times
> bestselling author of *How To Menopause*. She hosts the award-winning podcast
> *The Tamsen Show*.

> ⚠️ **This is the single most time-critical item in this document.** The metadata/schema
> now say one thing and the footer says another, sitewide. That inconsistency is the exact
> signal the entity work is trying to remove.

---

## 2. Publish the approved bio on the Press page — biggest win, zero approval friction

**Where:** `/press`

The page's own meta description promises:

> "Media features, approved photos, **bios**, and press inquiry contact for journalists and
> producers."

The page has an *Approved Photos* section and a *Media Inquiry* section and **no bio
section at all** — the word "bio" appears nowhere in the rendered body.

This is the strongest recommendation here:

- It is where journalists and producers actually go for this.
- The page already promises it, so the meta description is currently inaccurate.
- **The copy is already approved**, so there is nothing to sign off — sections 2 of the bio
  file drop straight in.

**Suggested structure:** a "Bio" section with three copy blocks, each individually
copy-pastable by press:

| Block | Source |
| --- | --- |
| Title / role line | `official-bio.md` §2 → *Title / role line* |
| Short bio (~95 words) | `official-bio.md` §2 → *Short bio* |
| Full bio | `official-bio.md` §2 → *Full bio* |

Add a download link to the same text if the team keeps a press kit.

---

## 3. The About page H1 carries no entity name

**Where:** `/about-tamsen`

**Currently:**

> NYT bestselling author. Global keynote speaker. Podcast host.

Accurate but anonymous — this is the H1 on the page most likely to rank for a search of her
name, and it never says her name. This is the H1 the GreenBanana audit flagged.

**Suggested:**

> Tamsen Fadal — Emmy Award-winning journalist, filmmaker, and New York Times bestselling
> author

Keep the existing three-part line as an H2 or standfirst if the team likes the rhythm.

---

## 4. "13x Emmy-award winning" in About body copy

**Where:** `/about-tamsen`, `div.text-wrapper`, first-person section.

> "Hi! I'm Tamsen... As a 13x Emmy-award winning journalist, only one thing took me off
> air..."

Same conflict as item 1. Change to "Emmy Award-winning" to match the approved bio.

> **Flagged trade-off, client's call:** a specific number is a *stronger* entity signal than
> a generic claim — "13x" is distinctive and corroborates against press coverage. The 12 Aug
> decision was to follow the approved bio exactly, so we removed it from metadata and schema.
> If the client would rather keep the count, the right fix is the reverse: put "13x" back
> everywhere *including* the bio, so all surfaces agree. **Either answer is fine. The
> current split — schema says one thing, body copy says another — is the only bad outcome.**

---

## 5. Duplicate H2 on the About page

**Where:** `/about-tamsen`

> "From TV news anchor to global menopause advocate"

appears **twice** on the page. Delete or differentiate the second instance. Minor, but it is
a heading-structure defect and costs nothing to fix while in there.

---

## Also worth raising with the client — content quality, not SEO copy

These came out of the audit and are the client's to decide on.

1. **The Alloy / Anne Fulenwider blog post is effectively empty.** Its entire body is two
   sentences — *"I love talking to women who live their lives boldly..."* — then it stops.
   No Alloy content, no interview. Thin content is its own ranking problem; it looks
   unfinished rather than short.

2. **Placeholder text is live on real pages.** `"This is some text inside of a div block."`
   appears in the share module of every blog post sampled, and on Events. This is wider
   than the original "Events only" scope in the technical-cleanup item.

3. **7 of 17 Education Hub resources have no publication date.** The `publication-date`
   field is blank, so those pages emit an empty `datePublished` in their schema. Verified
   with Google's Rich Results Test: this does **not** invalidate them — they still pass as
   valid Articles. But dates are a freshness signal, and AI-search engines weight recency
   heavily. Backfilling the seven is a five-minute CMS job.

4. ~~**`datePublished` on the blog is bound to the wrong field.**~~ **Decision 2026-08-20:
   leave it.** Recorded here so it is not re-raised.

   The blog template binds `datePublished` to Webflow's system `published-on` — the *last
   publish* date, not the original — so any CMS edit moves a post's stated publication date.
   Six posts edited in this pass now read 2026-08-20.

   **The original dates appear to be unrecoverable.** In a 12-post sample, **7 shared the
   identical timestamp `2025-11-05T10:36:23.321Z`**, to the millisecond — a bulk migration
   publish. So `published-on` never held true publication dates for imported posts, and the
   collection's own `publication-date` field is null on those same posts. Neither field has
   the answer.

   Options considered and rejected:
   - *Rebind to `publication-date`* — would trade a wrong date for no date on ~250 posts.
   - *Recover from the Wayback Machine or the old site* — real effort for a weak signal.

   `datePublished` is a hint, not a ranking factor, and Google validates the pages without
   it. If this is ever revisited, the sane version is: rebind to `publication-date`, fill it
   on new posts only, and accept that the archive has no dates. Do not retro-fix 250 posts.
