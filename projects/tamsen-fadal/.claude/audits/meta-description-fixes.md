# Meta description fixes — tamsenfadal.com

**Source:** SEMrush site audit issue 15, "Duplicate meta descriptions" — 38 pages
**Diagnosed:** 2026-08-10

---

## Two root causes, not one

SEMrush reports this as one issue. It is actually two, with different fixes.

### Cause A — blank `short-description` (7 blog posts)

The blog template renders `{{Short Description}}. Read more on Tamsen Fadal's blog.`
An empty field leaves `. Read more on Tamsen Fadal's blog.` — identical on every
affected post.

⚠️ **The field must not end in a full stop**, or the template produces a doubled
period. Two live pages already show this (`...hair loss.. Read more on...`).

### Cause B — wrong episode's description (~25 podcast + 3 blog)

The `short-description` field contains **another item's text**. Confirmed against the
CMS, so this is bad data, not a rendering bug. In every case checked, the `guest`
field is correct and the description belongs to a different episode — a copy-paste
that was never replaced.

| Episode | Guest (correct) | Description described |
| --- | --- | --- |
| The Sleep Doctor: 4 Hormones | Dr. Andrea Matsumura | Phil Cowley (pharmacist ep) |
| The Testosterone Doctor | Dr. Kelly Casperson | Dr. Mary Claire Haver (perimenopause ep) |
| The Fasting Doctor | Dr. Mindy Pelz | Sue Moss (divorce attorney ep) |
| The Hair Loss Doctor | — | Kandi Burruss (reinvention ep) |

This matters more than the duplicate flag suggests: the search snippet promises one
guest and the page delivers another. It also feeds the OG tags and, once the CMS
schema templates are pasted, the `PodcastEpisode` description.

---

## Applied and published 2026-08-10

| Item | Type | New description |
| --- | --- | --- |
| the-sleep-doctor-the-4-hormones… | podcast, was wrong | Dr. Andrea Matsumura, board-certified sleep physician and creator of the D.R.E.A.M. Sleep Method, explains why sleep falls apart in perimenopause — and why waking at 3am is a cortisol event, not an anxiety problem. |
| the-testosterone-doctor… | podcast, was wrong | Urologist Dr. Kelly Casperson answers your questions on low libido, painful sex and the truth about testosterone — an honest, no-shame conversation about what changes in midlife. |
| the-fasting-doctor… | podcast, was wrong | Dr. Mindy Pelz, functional medicine expert and author of Fast Like a Girl, breaks down what happens to the female brain in menopause — and five science-backed tools for brain fog and lost motivation. |
| we-need-to-stop-using-this-word | blog, was blank | When I left my 30-year career as a news anchor, I was not reinventing myself — and here is why that word still does not sit right with me |

All four verified live.

---

## Drafted, blocked on item IDs — 6 blog posts

Webflow MCP's `list_collection_items` **ignores `offset`, `page` and `slug`** and only
ever returns the first 100 of 261 blog items. These six sit beyond that, so their item
IDs cannot be resolved through the API.

**To unblock:** open each post in the Webflow Designer; the item ID is the last path
segment of the URL. Or paste the description straight into the Short Description field.

| Slug | Draft (no trailing full stop) |
| --- | --- |
| `why-am-i-so-tired` | Why sleep falls apart in menopause — the hormonal shifts, the habits and the mental load behind it, and what actually helps |
| `menopause-sex-life-with-amy-buckalter` | Amy Buckalter founded Pulse after her own menopause journey exposed how little innovation existed for women's sexual wellness |
| `how-to-start-living-with-integrity-let-go-of-fear-with-martha-beck` | Martha Beck, Harvard-trained sociologist and Oprah's life coach, asked me what I yearn for — and it was harder to say out loud than I expected |
| `colette-courtion-on-prioritizing-sexual-health-in-menopause` | Colette Courtion built Joylux to tackle the intimate health symptoms of menopause that most women are never offered help for |
| `jonathan-fields-shares-his-good-life-project` | Jonathan Fields, founder of The Good Life Project, on finding purposeful work in your next chapter and the Sparketypes that reveal it |
| `alloy-womens-health-anne-fulenwider-have-the-answers-to-your-menopause-questions` | Anne Fulenwider left magazine editing to co-found Alloy Women's Health — a conversation about betting on yourself at a crossroads |

---

## Remaining — ~22 podcast episodes with wrong descriptions

Same treatment: read each episode's own `name`, `guest`, `body-copy` and
`show-notes-text`, write from that, never invent. Most sit within the first 100 podcast
items so their IDs are resolvable.

Affected pairs from the SEMrush report:

- therapist-reveals-why-adult-friendships / hair-loss-dry-skin-and-sagging-skin
- the-hair-loss-doctor / it-cant-rain-forever-kandi-burruss
- the-1-pharmacist / (sleep doctor — now fixed)
- perimenopause-explained-dr-mary-claire-haver / (testosterone doctor — now fixed)
- a-divorce-attorneys-guide / how-to-start-dating-again-in-2026 / (fasting doctor — now fixed)
- why-you-always-feel-behind / the-glp-1-doctor
- what-i-wish-i-knew-at-35 / the-hidden-reason-you-keep-choosing…
- she-was-told-no-over-and-over / 1-dietitian-do-this
- relationship-q-and-a / if-youre-going-through-a-friendship-breakup
- naomi-watts-what-i-wish-i-knew / bobbi-brown-how-to-start-over
- from-sports-illustrated-to-sephora / choosing-a-child-free-life
- the-fertility-expert / progesterone-101

In each pair, one page holds the correct description and the other inherited it. The
one that is correct keeps its text; only the mismatched one needs rewriting.

---

## Two other findings

**The Alloy post is nearly empty.** Its entire body is *"I love talking to women who
live their lives boldly. Women who, when they come to a crossroads in their life, go
with their gut..."* — then it stops. No Alloy content, no Anne Fulenwider interview.
Thin content is its own ranking problem; worth checking whether the post is unfinished.

**Placeholder text is on blog posts, not just Events.** `"This is some text inside of a
div block."` appears in the share module of every blog post sampled. That widens the
scope of the technical cleanup item.
