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

## 2. Blocked on a lookup — P2397 YouTube channel ID

P2397 requires the `UC…` channel ID, **not** the `@TamsenFadalTV` handle. An automated
fetch of the channel page was attempted today and YouTube served no `externalId` to a
non-browser request.

**To unblock (30 seconds, needs a browser):** open
`https://www.youtube.com/@TamsenFadalTV`, View Source, search `externalId`. Then:

```
Q7681850|P2397|"UC…"|S854|"https://www.youtube.com/@TamsenFadalTV"|S813|+2026-08-20T00:00:00Z/11
```

---

## 3. Not actionable yet — do not force these

| Gap | Why it is parked |
| --- | --- |
| **P166 — NYWICI Matrix Award** | Searched Wikidata: **no item exists** for the Matrix Awards. A property value must be an item, so this cannot be added until one is created. Creating an award item is its own notability case — not worth bundling into this pass. |
| **P800 — the two documentaries and the podcast** | Each needs its own Wikidata item before it can be referenced. Item creation is subject to notability review, and speculative creation is how entries get deleted. Leave until there is independent sourcing to cite. |

---

## Verification after running

Re-run `projects/tamsen-fadal/.claude/../wikidata-lookup.py` equivalent, or simply:

```
https://www.wikidata.org/wiki/Special:EntityData/Q7681850.json
```

Confirm P106 shows six values and that both new claims carry a reference block.
