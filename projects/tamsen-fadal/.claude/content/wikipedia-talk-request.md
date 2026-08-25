# Wikipedia Talk-page edit request — Tamsen Fadal

**Target:** `https://en.wikipedia.org/wiki/Talk:Tamsen_Fadal`
**Who files this:** a human with a declared conflict of interest. Do not edit the article
directly — Wikipedia's COI guideline asks paid or connected editors to request changes on
the Talk page and let independent editors decide.
**Template to use:** `{{edit COI|answered=no}}`
**Last verified against the live article:** 2026-08-25

---

## Rewritten 2026-08-25 — read this before using

The previous draft had five requests. **Three were already satisfied** by independent editors
and have been removed, per the "delete any request already satisfied" rule below. Recording
what changed so nobody re-adds them:

| Old item | Status 2026-08-25 |
| --- | --- |
| 1. Documentaries not covered | **Satisfied** — both films are now in the lead |
| 2. Podcast not mentioned | **Satisfied** — Career section covers it, cited to Forbes |
| 3. #PostYourPatch missing | **Partly** — now in the lead but carries no citation |
| 4. NYWICI Matrix Award | **Still outstanding** — 0 mentions in the article |
| 5. Lead frames her as a news anchor | **Stale** — lead already reads "American journalist, writer, and menopause advocate" |

The old item 5 was the weakest request in the draft and is now simply wrong. It has been
replaced by two specific, verifiable defects — the short description and the infobox — that
the article's own lead sentence contradicts. That internal-inconsistency argument is far more
likely to be actioned than a general plea to rebalance framing.

---

## Before posting

1. Re-read the current article and delete any request below that has since been satisfied.
   The article is actively edited — this draft went stale in under three weeks.
2. Every request must cite an **independent, published** source. Her own website does not
   count as independent for biographical claims — it is usable only for uncontroversial
   self-description, and even then weakly.
3. Post once. Do not re-post or ping if it sits unanswered; the queue is slow by design.

---

## Draft to paste

```wikitext
{{edit COI|answered=no}}

'''Declaration:''' I have a conflict of interest. I do professional web and SEO work for
Tamsen Fadal's official website and am not editing the article directly. Posting here as
the COI guideline asks. Please apply only what independent editors judge to be due weight.

'''1. Please remove the external link to my client's site from the article body.'''
The Career section links the podcast title as a bare external link:

: <nowiki>''[https://www.tamsenfadal.com/the-tamsen-show-podcast The Tamsen Show]''</nowiki>

Per [[WP:EL]] external links do not belong in the article body, and I would rather this
were not there at all given my COI. Suggest simply removing the link and leaving the
italicised title as plain text.

'''2. Short description contradicts the lead.'''
The short description reads "American television personality (born 1970)", but the lead
sentence reads "an American journalist, writer, and menopause advocate", which is cited.
Suggest aligning the short description with the sourced lead, for example:

: <nowiki>{{short description|American journalist and menopause advocate (born 1970)}}</nowiki>

No new claim is involved — this only makes the description consistent with the article.

'''3. Infobox occupation omits the advocacy.'''
The infobox lists <nowiki>|occupation = Journalist, author</nowiki>, while the same infobox
already carries <nowiki>|known_for = Menopause advocacy</nowiki> and the lead describes her
as a menopause advocate. Suggest adding it for internal consistency, wording to editors'
discretion.

'''4. Bare URL in the lead.'''
The lead contains an unformatted bare URL after the second documentary title
(<nowiki>https://themfactorfilm.com/</nowiki>). The second film title is also unitalicised
and there is a stray full stop before the preceding reference. Ordinary cleanup — flagging
rather than fixing because of my COI.

'''5. #PostYourPatch is uncited.'''
The lead states she founded the #PostYourPatch movement. The claim is accurate but carries
no citation, so it is exposed to removal by anyone doing citation maintenance.

''Sources:'' <!-- ADD: independent news coverage of the campaign or the FDA listening
session. Do not cite tamsenfadal.com for this. -->

'''6. 2026 NYWICI Matrix Award.'''
She was honoured at the 2026 NYWICI Matrix Awards. The article has an Awards section that
would be the natural home. Not currently mentioned.

''Sources:'' <!-- ADD: NYWICI announcement or independent press coverage. -->

Thank you for considering these.
```

---

## Notes for whoever files it

- **Lead with item 1.** Asking editors to *remove* a link to the client's own site is the
  single most credible thing a COI editor can do, and it is a genuine [[WP:EL]] fix rather
  than a gesture. It costs nothing and it sets the tone for everything below it.
- **Do not argue item 1 on the grounds that the link is broken.** It is not:
  `/the-tamsen-show-podcast` 301-redirects to `/podcast` and returns 200 (checked
  2026-08-25). An early version of this draft claimed it was dead. The [[WP:EL]] argument
  stands on its own and does not need the embellishment — a COI editor caught overstating a
  fact loses the credibility that item 1 exists to buy.
- **Items 1–4 need no sourcing.** They are internal-consistency and formatting fixes,
  verifiable from the article itself. They should move quickly and independently of items
  5 and 6, which is the main reason this draft is now ordered the way it is.
- **The `<!-- ADD -->` placeholders are deliberate.** Do not post with them unfilled and do
  not substitute tamsenfadal.com. A COI request with self-published sourcing is the fastest
  route to a decline and makes the next request harder. If the sourcing for items 5 and 6
  cannot be found, delete those two items and post the first four — a short, clean request
  beats a padded one.
- Expect partial acceptance at best. That is a normal, successful outcome.
- **Item 2 is the highest-value item here** for the entity work. The short description is the
  weakest wording anywhere in the entity graph and feeds downstream consumers as a one-line
  identity. See `.claude/specs/knowledge-panel-checklist.md`.
- Wikidata (Q7681850) is the separate, lower-friction track and is where the entity signal
  that feeds Google's Knowledge Panel actually lives. See
  `.claude/audits/wikidata-changeset-2026-08-20.md`. Wikipedia is the slower half, but the
  Knowledge Panel's About text, Born and Spouse fields come from here and nowhere else.
