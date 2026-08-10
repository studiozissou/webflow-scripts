# Wikidata change set — Tamsen Fadal

**Entity:** [Q7681850](https://www.wikidata.org/wiki/Q7681850)
**Audited:** 2026-08-06 (live entity data via `Special:EntityData`)
**Current state:** 28 claims, 3 sitelinks, English Wikipedia article present  
**Last updated:** 2026-08-10 — P856 official website added; property labels re-verified

Google pulls Knowledge Panel facts from Wikidata, so this directly supports the
branded-search work. This is structured data, not editorial copy — it does **not**
need the bio sign-off.

> ⚠️ Submitting these needs a Wikidata account. Every statement below should carry
> a reference (`stated in` / `reference URL`) pointing at tamsenfadal.com or the
> platform itself, or it risks being reverted by patrollers.

---

## 1. Highest priority — official website is missing

| Property | Value |
| --- | --- |
| **P856** `official website` | `https://www.tamsenfadal.com/` |

**STATUS: added 2026-08-10.** Verified live — the entity went from 27 to 28 claims.
This was the single most valuable addition: it is the property Google leans on to tie
the Knowledge Panel to the official site.

WARNING — it currently has **0 references**. Unreferenced statements are the ones
patrollers revert. Add one to make it stick:
`reference URL (P854)` = `https://www.tamsenfadal.com/` and
`retrieved (P813)` = today's date.

Optional but tidy: qualifier `language of work or name (P407)` = `English (Q1860)`.

---

## 2. Missing social and platform identifiers

> **Corrected 2026-08-10.** Property labels were verified against the Wikidata API,
> which caught two errors in the first draft of this change set:
> - **P11245 is "YouTube handle", not "Spotify show ID"** — good news, see below
> - **P2850 is "Apple Music artist ID", not "Apple podcast ID"** — not applicable

### Ready to paste — handles confirmed from the site's own outbound links

| Property | Label | Value |
| --- | --- | --- |
| **P2003** | Instagram username | `tamsenfadal` |
| **P2013** | Facebook username | `tamsenfadal` |
| **P6634** | LinkedIn personal profile ID | `tamsenfadal` |
| **P7085** | TikTok username | `tamsenfadal` (no @) |
| **P11245** | YouTube handle | `TamsenFadalTV` (no @) |

**P11245 sidesteps the blocked lookup.** The original plan needed P2397's `UC...`
channel ID, which YouTube's consent wall blocks from scripted retrieval. P11245 takes
the handle directly, so YouTube can be linked now without it.

### Needs a lookup first — do not guess

| Property | Label | Why blocked |
| --- | --- | --- |
| **P2397** | YouTube channel ID | Wants the `UC...` form, not the handle. To get it: open the channel, View Source, search `externalId`. Add alongside P11245 — complementary, not alternatives. |
| **P2963** | Goodreads author ID | Not verified. Find her Goodreads author page; the ID is the number in the URL. |
| **P648** | Open Library ID | Not verified. Author IDs start `OL...A`. |

### Not applicable — dropped from the change set

| Property | Why |
| --- | --- |
| P2850 Apple Music artist ID | For musical artists/authors in Apple Music, not podcasts. Skip unless she has an Apple Music artist presence. |
| Spotify / Apple **podcast** IDs | These describe *The Tamsen Show*, not Tamsen. They belong on a podcast item. The Tamsen Show has no Wikidata item yet — creating one and linking it via P800 is the correct route, and a larger job. |

**Already present, leave alone:** P2002 X/Twitter (`TamsenFadal`), P345 IMDb
(`nm2876731`), P214 VIAF, P213 ISNI, P244 Library of Congress.

---

## 3. Missing notable work

`P800 notable work` is absent. Add these, each as a separate statement:

| Work | Notes |
| --- | --- |
| *How to Menopause* | The book. Create the work item first if it does not exist. |
| *The M Factor: Shredding the Silence on Menopause* | Documentary (PBS). |
| *The Tamsen Show* | Podcast. Create item if needed. |

These are the works most associated with her entity and the ones the Knowledge
Panel should surface.

---

## 4. Description is out of date

**Current:** "American journalist, news anchor, and television personality"

That predates the book, the podcast and the menopause advocacy work — the three
things she is now best known for and the things branded search needs to reflect.

**Suggested:** "American journalist, author, and menopause advocate"

Wikidata descriptions are deliberately short (no marketing language, no honorifics).
Keep it factual and under about 12 words.

---

## 5. Already correct — no action

| Property | Value |
| --- | --- |
| P31 instance of | human |
| P21 sex or gender | female |
| P27 citizenship | United States |
| P106 occupation | journalist, television presenter |
| P569 date of birth | 1970-12-04 |
| P19 place of birth | (Q523240) |
| P69 educated at | University of South Florida |
| P166 award received | (Q123737) |
| P18 image | Tamsen-157.jpeg |

---

## Suggested order of work

1. ~~**P856 official website**~~ — **DONE 2026-08-10**
2. **Add a reference to P856** — it has 0 references and is revert-bait. Do this next.
3. Social identifiers: P2003, P2013, P6634, P7085, P11245 — five paste-ready values,
   quick and low risk, no lookups needed
4. Description update — one field, immediate
5. P800 notable work — slowest; may need new items created for the book, film and podcast
6. P2397 YouTube channel ID — needs the `UC...` lookup via View Source
7. Goodreads / Open Library — verify the IDs exist first

## Verification after submitting

Wikidata edits propagate to Knowledge Panels slowly and unpredictably — expect
days to weeks, not hours. Re-check the panel for "Tamsen Fadal" roughly weekly and
record what changed in the monthly report.
