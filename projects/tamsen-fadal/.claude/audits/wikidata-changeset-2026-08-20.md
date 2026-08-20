# Wikidata changeset — Q7681850 (Tamsen Fadal)

**Verified live against the Wikidata API:** 2026-08-20
**Supersedes:** `wikidata-changeset-2026-08-06.md`
**Who runs this:** Will, signed in. QuickStatements cannot be driven through the Webflow MCP
or any automation available here — it needs an authenticated Wikidata account.

---

## Two items from the old list are already done

The 10 Aug progress log lists both as outstanding. Both were checked against
`wbgetentities` today and are already correct — **do not redo them**.

| Item | Old note | Actual state 2026-08-20 |
| --- | --- | --- |
| Description | "still says American journalist, news anchor, and television personality" | Already reads **"American journalist, author, and menopause advocate"** |
| P856 references | "currently 0 references, which is what patrollers revert" | Already carries **1 reference** |

## Current state of the claims that matter

| Property | Present | Labels |
| --- | --- | --- |
| P106 occupation | Q1930187, Q270389, Q482980, Q15253558 | journalist · news presenter · author · activist |
| P166 award received | Q123737 | Emmy Award |
| P800 notable work | Q140996452 | How to Menopause |
| P2397 YouTube channel ID | *(none)* | — |
| P856 official website | tamsenfadal.com | 1 reference ✅ |

---

## 1. ✅ DONE 2026-08-20 — P106 occupation

The approved bio leads with filmmaker, and she hosts a weekly podcast. Neither is asserted.
Both target QIDs were resolved and confirmed today.

Paste into [QuickStatements](https://quickstatements.toolforge.org/) (V1 syntax):

```
Q7681850|P106|Q1414443|S854|"https://www.tamsenfadal.com/about-tamsen"|S813|+2026-08-20T00:00:00Z/11
Q7681850|P106|Q15077007|S854|"https://www.tamsenfadal.com/podcast"|S813|+2026-08-20T00:00:00Z/11
```

- `Q1414443` = filmmaker (creator of a cinematic work)
- `Q15077007` = podcaster (person who creates podcasts)
- Each carries `reference URL` + `retrieved`, so it will not read as an unsourced drive-by edit.

**Applied and verified 2026-08-20.** Added manually through the Wikidata UI rather than
QuickStatements (see note below). Confirmed against `Special:EntityData`:

```
filmmaker   refs=1   P854=https://www.tamsenfadal.com/about-tamsen   P813=+2026-08-20
podcaster   refs=1   P854=https://www.tamsenfadal.com/podcast        P813=+2026-08-20
```

P106 now carries six values. For context, the four pre-existing ones are less well sourced —
only `journalist` has a reference (via Muck Rack, P6005, retrieved 2022); `news presenter`,
`author` and `activist` carry none. Not urgent, but if these ever get challenged, those three
are the weak ones, not ours.

> **QuickStatements was not usable.** Batch mode requires an **autoconfirmed** account:
> 50 edits *and* 4+ days since first edit. Wikidata's edit threshold is deliberately higher
> than most wikis. The Studio Zissou account was on 49 edits — one short — so the claims were
> added by hand. Crossing 50 in the process means batch mode is available from now on.

---

## 1b. ✅ DONE — references added to the three unsourced occupation claims

Run as a QuickStatements batch once the account crossed 50 edits. `news presenter`, `author`
and `activist` had carried no references since creation.

```
Q7681850|P106|Q270389|S854|"https://www.tamsenfadal.com/about-tamsen"|S813|+2026-08-20T00:00:00Z/11
Q7681850|P106|Q482980|S854|"https://www.tamsenfadal.com/book-how-to-menopause"|S813|+2026-08-20T00:00:00Z/11
Q7681850|P106|Q15253558|S854|"https://www.tamsenfadal.com/advocacy"|S813|+2026-08-20T00:00:00Z/11
```

**Verified: P106 holds 6 claims, no duplicates, all six referenced.** Confirms QuickStatements
attaches a reference to an existing property+value pair rather than duplicating the statement —
useful to know for future batches.

## 2. ✅ DONE — P2397 YouTube channel ID

P2397 requires the `UC…` channel ID, not the `@TamsenFadalTV` handle.

**Resolved: `UCcrYxvtT9tp60RBsK9HvpqQ`**

The channel page yields ten `UC…` strings — nine are recommended-channel sidebar entries.
The correct one was identified by frequency (177 occurrences vs a handful each) and then
**confirmed independently** against the channel's RSS feed:

```
https://www.youtube.com/feeds/videos.xml?channel_id=UCcrYxvtT9tp60RBsK9HvpqQ
  <title>Tamsen Fadal</title>   channel created 2011-07-03
```

Never take the frequency heuristic on its own — always confirm via the feed.

Applied with `reference URL` + `retrieved`, verified present.

---

## 2b. ✅ DONE — P648 Open Library author ID

`OL3356737A`, applied with reference URL + retrieved, verified present.

Identified via the Open Library search API and **confirmed by pulling the author's works**
before use — the record lists *The New Single*, *Why Hasn't He Called?*, *Don't Date Dumb*
and a Russian translation, matching her pre-menopause bibliography. It does not yet include
*How to Menopause*, which is why an ISBN lookup on `9780306833540` returns 404 there.

Worth having: it ties her to library catalogue data, the same class of signal as the VIAF,
ISNI, Library of Congress and WorldCat IDs already on the item.

## 3. Not actionable yet — do not force these

| Gap | Why it is parked |
| --- | --- |
| **P166 — NYWICI Matrix Award** | Searched Wikidata: **no item exists** for the Matrix Awards. A property value must be an item, so this cannot be added until one is created. Creating an award item is its own notability case — not worth bundling into this pass. |
| **P800 — the two documentaries and the podcast** | Each needs its own Wikidata item before it can be referenced. Item creation is subject to notability review, and speculative creation is how entries get deleted. Leave until there is independent sourcing to cite. |

---

## Where the item stands, and why to stop here

**Q7681850 now carries 35 properties.** A gap analysis on 20 Aug against the common Person
property set found the item already well populated: date and place of birth, sex or gender,
citizenship, image, educated at, given/family name, residence, relative, Commons category,
and the VIAF / ISNI / Library of Congress / WorldCat / IMDb / Freebase authority chain — plus
the six referenced occupations, YouTube channel ID and Open Library ID added in this pass.

What remains is deliberately left alone:

| Left undone | Why |
| --- | --- |
| **13 claims carry no references** (image, gender, citizenship, educated at, the Emmy, several identifiers) | Sourcing "sex or gender" or an authority-file ID to a client marketing site is padding with a mild spam signal. Identifier claims should cite the authority, not us. Low value. |
| **P800 for the documentaries and the podcast** | Confirmed by search on 20 Aug: **no Wikidata items exist** for *The (M) Factor*, *Before the Pause* or *The Tamsen Show*. Each would need creating first, which is a notability case requiring independent coverage — not data entry. Do not create speculatively; that is how items get deleted. |
| **P166 NYWICI Matrix Award** | No Wikidata item exists for the Matrix Awards either. Same reasoning. |

**The remaining leverage on this project is not in Wikidata.** It is the site footer wording
decision and publishing the approved bio on the Press page — both need the client.

## Verification after running

Re-run `projects/tamsen-fadal/.claude/../wikidata-lookup.py` equivalent, or simply:

```
https://www.wikidata.org/wiki/Special:EntityData/Q7681850.json
```

Confirm P106 shows six values and that both new claims carry a reference block.
