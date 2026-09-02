# Broken external links — build report

**Slug:** `tamsen-broken-external-links-sep-2026`
**Executed:** 2026-09-02
**Spec:** `../specs/tamsen-broken-external-links-sep-2026.md`
**Site:** `68a2d5617c9630d9c780ded5` (tamsenfadal.com)
**SEMrush:** project `30728045`, snapshot `6a94c624a127e09e76f6c73d` (31 Aug 2026), issue 12, 60 rows

All CMS writes went through Webflow MCP `data_cms_tool`. Each field was snapshotted before the
write, patched by exact-string replacement, written back alone, re-read and diffed. Items were
published individually rather than by a full site publish, so nothing else staged went live.

---

## What shipped

**21 field writes across 5 collections, 21 items published, 0 errors.**

| Collection | Field | Items | Change |
| --- | --- | --- | --- |
| Advocacy | `legislation` (RichText) | 3 | 6 bill hrefs repointed |
| Press Articles | `link` (Link) | 5 | 3 repointed to Wayback, 2 cleared |
| Providers | `website-link` (Link) | 5 | 1 repointed, 4 cleared |
| Podcast Episodes | `guest-links` (RichText) | 1 | 1 href repointed |
| Blogs | `post-content` (RichText) | 7 | 6 hrefs repointed, 2 anchors unlinked |

### Advocacy

| Item | Dead href | New href |
| --- | --- | --- |
| Michigan | `legislature.mi.gov/doc.aspx?2025-HB-4790` | `legislature.mi.gov/Bills/Bill?ObjectName=2025-HB-4790` |
| Michigan | `…2025-HB-4791` | `…ObjectName=2025-HB-4791` |
| Michigan | `…2025-HB-4814` | `…ObjectName=2025-HB-4814` |
| Michigan | `…2025-HB-4815` | `…ObjectName=2025-HB-4815` |
| New York | `nysenate.gov/legislation/bills/2023/S3908` | `…/bills/2025/S3908` |
| Massachusetts | `malegislature.gov/Bills/194/HD4250` | `…/Bills/194/H2499` |

Anchor text was left untouched in every case, per the "no copy changes" constraint. The visible
text still reads as the old URL on the advocacy page; that matches how the field was already
written and is Tamsen's team's copy to change.

### Press Articles

Gate 1 queried `archive.org/wayback/available` for all five dead URLs. Three had snapshots.

| Item | Outcome |
| --- | --- |
| New Horizons \| Preferred Health | Wayback snapshot `20260516054358` |
| The Sherri Show | Wayback snapshot `20251215223946` |
| Real Talk with BELLA | Wayback snapshot `20230325114700` |
| Modern Gen X Woman | no snapshot, `link` cleared |
| Impossible Podcast / Unlock Your Bold | no snapshot, `link` cleared |

### Providers

`ysl.nl` deep path repointed to `https://www.ysl.nl/`. Four `website-link` fields cleared:
Gitana Paskauskiene, Crystal Burke, Sameena Rahman, Sheryl Carroll. Each keeps its Email button.

### Blogs and podcast

Six repoints as specced (PBS to `themfactorfilm.com`, WorldChannel schedule to root, the
Menopause Society PDF to the live hot-flashes page, Naples law firm to `rebeccazung.com`,
the Ulta tracking URL to `better-notyounger.com`, the retired Zoe article to its live
equivalent, and `functionalsobriety.com/book` to `brookescheller.com/book`).

Two `healthnews.com` anchors unlinked, sentence text kept intact including `<strong>` children.

---

## Gates re-checked at build time

| Gate | Result | Action |
| --- | --- | --- |
| `healthnews.com` homepage | 403 to curl, **404 in a real Chrome session** | still dead, unlinks proceeded |
| Wayback for 5 press URLs | 3 snapshots, 2 none | 3 repointed, 2 cleared |
| `malegislature.gov/Bills/194/H2499` | unreachable from this network (connection refused, both WebFetch and Chrome) | H2499 kept on LegiScan's evidence, per spec risk R3 |

---

## Verification

37 of 37 live-page assertions pass against `https://www.tamsenfadal.com` after publishing.

| # | Criterion | Result |
| --- | --- | --- |
| V1 | No `legislature.mi.gov/doc.aspx`, `HD4250` or `bills/2023/S3908` on `/advocacy` or its 3 paginated variants | PASS |
| V2 | All 6 new bill hrefs present on advocacy | PASS |
| V3 | No dead press domain across `/press` and 12 paginated variants; 3 Wayback links live | PASS |
| V4 | No dead provider domain across 14 directory pages; `ysl.nl` root present | PASS |
| V5 | 6 repointed pages carry the new href and not the dead one | PASS |
| V6 | Both unlinked sentences keep their text, no `healthnews.com` href | PASS |
| V7 | Every new href < 400 with a browser UA, or 403 from a known bot-blocking host | PASS (see below) |
| V8 | 4 untouched false positives still linked | PASS |
| V9 | No new console errors on `/advocacy`, `/press`, directory, a touched blog post | PASS |
| V10 | SEMrush issue 12 clear | **pending recrawl, Tier 3** |
| — | `hellobonafide.com` link survives in the brittle-nails post | PASS |

### V7 detail

Eleven of the new hrefs return 200 to a Chrome user agent: the three Wayback snapshots,
`ysl.nl`, `brookescheller.com/book`, `themfactorfilm.com`, `worldchannel.org`,
`menopause.org/patient-education/menopause-topics/hot-flashes`, `rebeccazung.com/meet-rebecca`,
`better-notyounger.com`, `zoe.com/learn/foods-that-ease-hot-flashes`.

Five return 403 or nothing, all expected and all bot-blocks rather than dead pages:

- Four Michigan bill URLs — Check Point CloudGuard WAF blocks every automated client, including
  a real headed Chrome session. Not verifiable without a human click. Spec risk R2 stands.
- `nysenate.gov/legislation/bills/2025/S3908` — 403 to curl, **loads correctly in Chrome** with
  the title "NY State Senate Bill 2025-S3908". Confirmed good.
- `malegislature.gov/Bills/194/H2499` — host unreachable from this network in every client.

### Console health

`/advocacy`, `/press` and `/blog/where-to-watch` are clean. Directory pages log one
`TypeError: Cannot read properties of undefined (reading 'length')`. This is **pre-existing and
unrelated**: directory page 3, which contains none of the five touched providers, logs the same
error. Worth a separate ticket.

### Lighthouse

`/blog/where-to-watch`, desktop navigation: accessibility 96, SEO 92, agentic browsing 100,
best practices 73. Best practices is below the 90 warn threshold and is a pre-existing
site-wide score, not a regression from this data-only change.

### Provider card cosmetics (spec risk R5 — resolved)

The Website button carries Webflow conditional visibility. With `website-link` empty it renders
as `<a href="#" class="directory_link-wrapper w-inline-block w-condition-invisible">` and is
hidden. Directory page 3 already had 10 such hidden buttons before this build. No inert button
is exposed to readers.

---

## SEMrush "Not an issue" list

21 of the 60 rows need no CMS change and should be marked "Not an issue" so the next audit does
not re-litigate them. Answers spec open question 3: yes, this list is worth keeping.

| Target | SEMrush verdict | Reality | Rows |
| --- | --- | --- | --- |
| `amazon.com.au/How-Menopause-…` on `/book-how-to-menopause` | 500 | 200 in a browser | 6 |
| `nia.nih.gov/health/menopause/sleep-problems-…` on 6 blog posts | 405 | 200 in a browser | 6 |
| `nysenate.gov/legislation/bills/2023/S3908` | 404 | now repointed to the 2025 session page, which is live but 403s to bots | 4 |
| `legis.iowa.gov/legislation/BillBook?ga=91&ba=SF85` | 500 | refuses automated clients, SF85 is a live 91st GA bill | 4 |
| `nuffieldhealth.com/article/sleep-tips-when-youre-in-menopause` | 502 | transient, 200 | 1 |

Add to that list after the next crawl: the four `legislature.mi.gov/Bills/Bill?ObjectName=…`
replacements, which will be reported as 403 for the same WAF reason.

Expect issue 12 to settle at roughly 15 rows, all marked "Not an issue", rather than 0. That is
spec risk R4 behaving as predicted.

---

## Repo changes

- `tests/acceptance/tamsen-broken-external-links-sep-2026.spec.js` — the provider directory
  assertion now ignores `mailto:` hrefs. Two cleared providers keep an email address on the same
  domain as their dead website (`Info@journeyofawoman.co.uk`, `sheryl@ytvhealthcoaching.com`),
  which the original substring match flagged as a dead website link. Those email buttons are
  correct and deliberately kept.
- This report.

No production JS or CSS changed. Every other change is Webflow CMS data.

---

## Still to do (Tier 3, manual)

1. **Mark the 21 rows "Not an issue"** in the SEMrush UI. The MCP site-audit toolkit is
   read-only, so this cannot be scripted.
2. **Trigger a recrawl** of project `30728045`, then read `issue_details` for issue 12 to close
   V10. Check the day after publishing.
3. **Click the four Michigan bill links in a browser.** Every automated client is WAF-blocked,
   so a human click is the only proof the replacements resolve.
4. **Re-check `malegislature.gov/Bills/194/H2499`** from a network that can reach the host.
5. **Run the acceptance spec during `/deploy`** — `npm run test:sz -- tamsen-broken-external-links-sep-2026`.
   Not run here per the project rule on Playwright.

## Open questions still open

1. Should the four providers whose domains no longer resolve be archived from the directory
   rather than kept with no website? Directory curation is Tamsen's team's call.
2. The advocacy anchor text still displays the old URLs as visible text. Repointing the href
   without touching copy was the spec's constraint. Worth asking whether the team wants the
   visible text updated to match.
