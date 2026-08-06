# Wikidata change set — Tamsen Fadal

**Entity:** [Q7681850](https://www.wikidata.org/wiki/Q7681850)
**Audited:** 2026-08-06 (live entity data via `Special:EntityData`)
**Current state:** 27 claims, 3 sitelinks, English Wikipedia article present

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

This is the single most valuable addition. It is the property Google leans on to
associate the Knowledge Panel with the official site, and it is currently **absent**
from the entity entirely. Add with qualifier `language of work or name (P407)` =
`English (Q1860)`.

---

## 2. Missing social and platform identifiers

All confirmed absent from the entity as of the audit. Values below are the handles
already used in the site's own outbound links and the live homepage `sameAs` array.

| Property | Identifier | Value to add |
| --- | --- | --- |
| **P2003** | Instagram username | `tamsenfadal` |
| **P2397** | YouTube channel ID | from `youtube.com/@TamsenFadalTV` — resolve to the `UC…` ID before submitting |
| **P2013** | Facebook ID | `tamsenfadal` |
| **P6634** | LinkedIn personal profile ID | `tamsenfadal` |
| **P7085** | TikTok username | `tamsenfadal` |
| **P11245** | Spotify podcast show ID | `7KuIU0g3CsUY0eAlzQaA5T` |
| **P2850** | Apple podcast show ID | `1799976761` |
| **P2963** | Goodreads author ID | look up before submitting — not yet verified |
| **P648** | Open Library ID | look up before submitting — not yet verified |

**Already present, leave alone:** P2002 X/Twitter (`TamsenFadal`), P345 IMDb
(`nm2876731`), P214 VIAF, P213 ISNI, P244 Library of Congress.

⚠️ **P2397 caution:** the YouTube channel-ID property expects the `UC…` form, not
the `@handle`. Resolve it first or the statement will be malformed.

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

1. **P856 official website** — biggest single win, do it first
2. Social identifiers (P2003, P2013, P6634, P7085) — quick, low risk
3. Podcast identifiers (P11245, P2850)
4. Description update
5. P800 notable work — slowest, may need new items created
6. P2397 YouTube — needs the `UC…` lookup
7. Goodreads / Open Library — verify the IDs exist first

## Verification after submitting

Wikidata edits propagate to Knowledge Panels slowly and unpredictably — expect
days to weeks, not hours. Re-check the panel for "Tamsen Fadal" roughly weekly and
record what changed in the monthly report.
