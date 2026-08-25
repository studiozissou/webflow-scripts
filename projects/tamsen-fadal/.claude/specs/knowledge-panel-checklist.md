# Knowledge Panel — action checklist

**Entity:** Tamsen Fadal · Wikidata `Q7681850` · Wikipedia `Tamsen_Fadal`
**Access:** Knowledge Panel claimed, verified-representative edit mode confirmed 2026-08-25
**Panel state captured:** 2026-08-25
**Related:** `audits/wikidata-changeset-2026-08-20.md` · `content/wikipedia-talk-request.md`

---

## What claimed access actually gets you

Narrower than it sounds. Almost every fact in the panel is fed from Wikipedia and Wikidata,
and Google will not let a verified representative overwrite those from the panel. Suggestions
are advisory — Google accepts or rejects, and there is no appeal.

Four items are worth the effort. Everything else on the panel is listed further down under
**Do not spend time here**, so it does not get picked up again in a later pass.

---

## 1. Featured image — do this first

**Status:** not started
**Why first:** the only element genuinely in the client's gift. It is approved rather than
argued, so it is the one submission with a predictable outcome.

- Current panel image is an older headshot and is off-brand against the current site.
- Request the current approved headshot from Yoni. Needs to be one Tamsen owns outright —
  Google will use it as the primary likeness across Search.
- Submit via the panel's image edit affordance while signed in as the verified rep.

---

## 2. Tagline — highest-value text fix

**Status:** not started
**Current:** `American journalist and writer`

This is the first line anyone reads. It is outdated, and worth noting that **it matches none
of its supposed sources**:

| Source | Value |
| --- | --- |
| Knowledge Panel | American journalist and writer |
| Wikidata description | American journalist, author, and menopause advocate |
| Wikipedia short description | American television personality (born 1970) |
| Wikipedia lead sentence | American journalist, writer, and menopause advocate |

So the tagline is Google-generated rather than inherited, which is exactly the case a verified
rep suggestion is for.

**Suggest:** `American journalist, author and menopause advocate`
**Cite:** `https://www.tamsenfadal.com/about-tamsen`

Matches Wikidata and the Wikipedia lead, so it is corroborated on two independent axes. Do not
propose the longer bio framing here — the field is short and Google truncates aggressively.

---

## 3. Profiles — LinkedIn is missing

**Status:** not started
**Panel currently shows:** YouTube · Instagram · Facebook · TikTok

**Add:**

| Platform | URL | Corroboration |
| --- | --- | --- |
| LinkedIn | https://www.linkedin.com/in/tamsenfadal/ | site `sameAs` + Wikidata P6634 |
| Apple Podcasts | https://podcasts.apple.com/us/podcast/the-tamsen-show/id1799976761 | site `sameAs` |
| Spotify | https://open.spotify.com/show/7KuIU0g3CsUY0eAlzQaA5T | site `sameAs` |

LinkedIn is the strongest of the three — present in both the site's `sameAs` block and
Wikidata — so it should be a straightforward accept.

**Do not add:** X/Twitter or Threads. X is inactive and was deliberately removed from the site
and from Wikidata on 11 Aug 2026. The client has confirmed there is no Threads account. See
the warning in `content/official-bio.md` §5.4 — a Threads URL was previously added on a
misread Wikidata property and shipped to ~400 pages before being caught.

---

## 4. Height — flag for removal

**Status:** not started
**Current:** `1.61 m`

Trivia that cheapens a panel built around professional authority. Removal is not guaranteed —
this class of fact is often retained — but flagging costs nothing. Lowest priority of the four.

---

## Do not spend time here

Listed so a later pass does not rediscover them as opportunities. None are editable from the
panel:

| Element | Source | Note |
| --- | --- | --- |
| About paragraph | Wikipedia lead | Changes only when the article changes |
| Born, Spouse | Wikipedia infobox / Wikidata | Factually correct as shown |
| People also ask | Google corpus | Not an editable surface |
| People also search for | Google co-occurrence | See below |
| Books carousel | Google Books / corpus | See below |

---

## The bigger finding — the entity is still anchored to the wrong era

The panel shows Google still associating her with the dating and relationship-expert period,
not the menopause one:

- The **Spouse** module is given prominent placement in the header.
- **People also search for** is entirely ex-husbands and a co-author: Matt Titus,
  Ira Bernstein, Paul Wontorek, Shannon Elizabeth.
- Top **People also ask** is *"Who is Tamsen Fadal's ex-husband?"*
- Three of the five **Books** carousel entries are the dating titles: *The New Single*,
  *Why Hasn't He Called?*, *Why Hasn't He Proposed?*

**None of this shifts via the Knowledge Panel.** It is driven by the corpus and by Wikipedia.
The real lever is the Wikipedia gap in the next section, which is why two of those items are
prioritised above three of the four KP suggestions above.

---

## Wikipedia — higher leverage than the panel

Verified against the live article 2026-08-25. Both defects contradict the article's own lead
sentence, which is the argument most likely to get actioned:

| Field | Current | Problem |
| --- | --- | --- |
| Short description | `American television personality (born 1970)` | Lead says "journalist, writer, and menopause advocate" |
| Infobox `occupation` | `Journalist, author` | Omits the advocacy the infobox's own `known_for` field already asserts |

The short description matters disproportionately — it is what several downstream consumers
read as the one-line identity, and it is the weakest wording anywhere in the entity graph.

**Route:** COI Talk-page request, not a direct edit. Folded into
`content/wikipedia-talk-request.md` as items 1 and 2 — that draft was rewritten on 2026-08-25
because three of its five original requests had already been satisfied by other editors.

---

## On-site — one content gap

*"Is Tamsen Fadal a doctor?"* appears in People Also Ask with no authoritative answer
anywhere on the site. The answer being absent is actively unhelpful — it is a credibility
question, and leaving it to third parties is the wrong outcome.

**Action:** FAQ block on `/about-tamsen` answering it directly, with `FAQPage` schema.
`/about-tamsen` already carries `ProfilePage` + `Person`, so this extends existing coverage
rather than adding a new pattern. See `audits/schema-coverage.md`.

---

## Order of execution

1. Featured image (KP) — fastest, most certain
2. Wikipedia short description + infobox (Talk page) — slowest queue, start it early
3. Tagline (KP)
4. LinkedIn + podcast profiles (KP)
5. `Is she a doctor?` FAQ (site)
6. Height (KP) — optional

Items 1, 3, 4 and 6 are one sitting in the panel UI. Item 2 is posted once and then left
alone; do not re-post or ping.

---

**Note on copy ownership:** the tagline wording above is a diagnostic suggestion, not approved
copy. Final wording sits with the client's team.
