# Broken external links, September 2026 — tamsenfadal.com

**Slug:** `tamsen-broken-external-links-sep-2026`
**Planned:** 2026-09-02
**Status:** Ready for `/build`
**SEMrush:** project `30728045`, snapshot `6a94c624a127e09e76f6c73d` (31 Aug 2026), issue 12, 60 rows
**Site:** `68a2d5617c9630d9c780ded5`
**Previous pass:** `semrush-audit-fixes-aug-2026.md` (spec) and `../audits/semrush-remediation-2026-08-20.md` (build report)

## Problem

The 31 August SEMrush crawl reports **60 broken external links** (issue 12). The August pass
cleared 36 rows (Apple Podcasts show migration, redirect chain, malformed hrefs) and
deliberately left two groups alone: links that only fail for bots, and a "known-dead, not
yet fixed" list that was surfaced by the independent link test. Almost all of the 60 rows
are that second list plus two new rows discovered on 31 August.

The 60 rows collapse to **29 unique targets**. Pagination inflates the count: the seven
advocacy bill links appear on `/advocacy` and three `?430d54ad_page=N` variants (28 rows),
and the six `amazon.com.au` variants sit on one page.

## Goal

Clear issue 12 in the next SEMrush crawl by fixing every link that is genuinely dead, without
editing links that are fine for humans and only fail for SEMrush's bot. Keep every sentence
readable where a link has to go.

---

## Research summary

Sources: SEMrush `issue_details` for issue 12 (all 60 rows), a live test of all 29 targets
with a Chrome user agent, a Webflow MCP sweep locating every URL in the CMS, and a
replacement-URL search verified by WebFetch or a real browser.

### Triage of the 29 targets

| Verdict | Targets | Rows |
| --- | --- | --- |
| Genuinely dead (404 or DNS failure from a responding host) | 20 | 42 |
| Bot-block or transient, fine in a browser — **change nothing** | 9 | 18 |

**False positives (leave alone, mark "Not an issue" in SEMrush):**

| Target | SEMrush | Browser | Rows |
| --- | --- | --- | --- |
| `amazon.com.au/How-Menopause-…` ×6 on `/book-how-to-menopause` | 500 | 200 | 6 |
| `nia.nih.gov/health/menopause/sleep-problems-…` on 6 blog posts | 405 | 200 | 6 |
| `nysenate.gov/legislation/bills/2023/S3908` | 404 | 403 to bots; the 2023 session page is gone, see repoint below | 4 |
| `legis.iowa.gov/legislation/BillBook?ga=91&ba=SF85` | 500 | Refuses automated clients; SF85 is a live 91st GA bill, URL is correct | 4 |
| `nuffieldhealth.com/article/sleep-tips-when-youre-in-menopause` | 502 | 200 (transient, new on 31 Aug) | 1 |

That is 21 rows needing no CMS change. New York and Iowa are counted here for the
*crawler* verdict; New York still gets a repoint because its target really did move.

### Where each dead link lives (Webflow MCP, all items published, none draft or archived)

Field-type facts that shape the build:
- **Advocacy** (15 items): one link-carrying field, `legislation` (RichText).
- **Press Articles** (78 items): one link field, `link` (Link). The card wraps image and
  title in `<a class="link-wrapper" href="{{link}}">`.
- **Providers** (166 items): one link field, `website-link` (Link). Rendered as a
  "Website" button `<a class="directory_link-wrapper">` beside an "Email" button.
- **Podcast Episodes**: the target is in `guest-links` (RichText), not in any of the six
  Link fields.
- **Blogs** (~264 items): every target is in `post-content` (RichText).

### Fix table

Legend: **R** repoint, **U** unlink (drop the `<a>`, keep the text), **C** clear the link field.

#### Advocacy — collection `6942c01a50421ebc419e7790`, field `legislation` (RichText)

| Item (id) | Dead href | Fix | New href | Verified |
| --- | --- | --- | --- | --- |
| Michigan (`6942c7e8743afa0ea43ee7b6`) | `http://legislature.mi.gov/doc.aspx?2025-HB-4790` | R | `https://www.legislature.mi.gov/Bills/Bill?ObjectName=2025-HB-4790` | Google index; host WAF-blocks every automated client |
| Michigan | `…doc.aspx?2025-HB-4791` | R | `…Bills/Bill?ObjectName=2025-HB-4791` | as above |
| Michigan | `…doc.aspx?2025-HB-4814` | R | `…Bills/Bill?ObjectName=2025-HB-4814` | as above |
| Michigan | `…doc.aspx?2025-HB-4815` | R | `…Bills/Bill?ObjectName=2025-HB-4815` | as above |
| New York (`6942c7e8a223fef89abd1007`) | `https://www.nysenate.gov/legislation/bills/2023/S3908` | R | `https://www.nysenate.gov/legislation/bills/2025/S3908` | WebFetch 200; 2025-26 session, "New York Menstrual and Menopause Act" |
| Massachusetts (`6942c7e81ad0c51db839fd5e`) | `https://malegislature.gov/Bills/194/HD4250` | R | `https://malegislature.gov/Bills/194/H2499` | LegiScan: HD4250 was docketed as H.2499. Host unreachable from here; SEMrush reached it and got a real 404 on HD4250 |
| Iowa (`6942c7e7ae14b652f57c7616`) | `https://www.legis.iowa.gov/legislation/BillBook?ga=91&ba=SF85` | — | leave | correct URL, bot-blocked |

#### Press Articles — collection `68bee11715c673b2dcf52e3d`, field `link` (Link)

| Item (id) | Dead href | Fix |
| --- | --- | --- |
| Modern Gen X Woman (`68bee1f314f54020cda90628`) | `https://moderngenxwoman.com/podcast/today` | Wayback snapshot if one exists, else C |
| New Horizons \| Preferred Health (`68bee1f4455624c3c6fe0e57`) | `https://www.preferredhealthmagazine.com/tamsenfadal` | as above |
| The Sherri Show (`68bee1f8d1b21ccf52530176`) | `https://www.sherrishowtv.com/episodes/thursday-february-20/` (DNS dead) | as above |
| Real Talk with BELLA (`68bee1f5d1f5505bb7b2f874`) | `https://bellamag.co/new-episode-of-real-talk-with-bella-tamsen-fadal/` | as above |
| Impossible Podcast / Unlock Your Bold (`68bee1f977ff530dd99ede99`) | `https://podcasts.apple.com/us/podcast/…/id1591991012?i=1000551844698` (show delisted) | as above |

Wayback availability could not be checked in planning (archive.org returned 429). The build
queries `https://archive.org/wayback/available?url=<dead url>` once per item; a `200`
snapshot becomes the new `link`, otherwise the field is cleared. An archived article is a
better press citation than a dead click, and archive.org links are not flagged by SEMrush.

#### Providers — collection `68bedb8b4af254930ab6a152`, field `website-link` (Link)

| Item (id) | Dead href | Fix | New href |
| --- | --- | --- | --- |
| Dr. I.P. Schmitz - van Splunder (`68bedc20bd9d910b00f8c41c`) | `https://www.ysl.nl/afdelingen-en-specialismen/gynaecologie-1/` | R | `https://www.ysl.nl/` (200) |
| Gitana Paskauskiene (`68bedc22b373699aa0bee662`) | `http://www.journeyofawoman.co.uk` (DNS) | C | — |
| Crystal Burke (`68bedc1e7c74a8ecd7a5dd86`) | `http://www.theconfidenceclinic.co/` (DNS) | C | — |
| Sameena Rahman (`68bedc28bdcfd03bc4a94d25`) | `http://www.cgcchicago.com` (DNS) | C | — |
| Sheryl Carroll (`68bedc2830246829401cb626`) | `https://www.ytvhealthcoaching.com/` (404) | C | — |

Each of these providers keeps an Email button, so the card stays useful with the Website
button emptied.

#### Podcast Episodes — collection `68a5993943f9f66c9d22b4b7`

| Item (id) | Field | Dead href | Fix | New href |
| --- | --- | --- | --- | --- |
| The #1 Alcohol Expert (`68a59a57d683f0ef8e56fa30`) | `guest-links` | `https://www.functionalsobriety.com/book` | R | `https://www.brookescheller.com/book` (200) |

#### Blogs — collection `68bede1a5ef125759435c0e1`, field `post-content` (RichText)

| Item slug (id) | Dead href | Fix | New href |
| --- | --- | --- | --- |
| `where-to-watch` (`68bee003929cd3847214bff2`) | `https://www.pbs.org/show/the-m-factor-shredding-the-silence-on-menopause/` | R | `https://themfactorfilm.com/` (200; the film's own site, which links out to PBS) |
| `where-to-watch` | `https://worldchannel.org/schedule/` (500) | R | `https://worldchannel.org/` (200) |
| `menopause-myths-holding-you-back` (`68bedffae232e506cd806151`) | `http://www.menopause.org/docs/default-source/2015/mn-hot-flashes.pdf` | R | `https://menopause.org/patient-education/menopause-topics/hot-flashes` (200) |
| `how-to-spot-a-narcissist-tamsen-fadal-rebecca-zung` (`68bedff6a39485a495a1377a`) | `https://www.naplesfamilylawfirm.com/attorneys/rebecca-zung/` | R | `https://rebeccazung.com/meet-rebecca` (200) |
| `how-to-deal-with-menopausal-thinning-hair` (`68bedff1c1438f50e2ae5317`) | `https://www.ulta.com/brand/better-not-younger?CATARGETID=…` | R | `https://better-notyounger.com/` (200) |
| `how-to-deal-with-hot-flashes` (`68bedfed8cf175a8eb291b13`) | `https://zoe.com/learn/7-nutrition-tips-to-manage-hot-flashes` | R | `https://zoe.com/learn/foods-that-ease-hot-flashes` (200, same topic) |
| `how-to-deal-with-menopausal-tingling-extremities` (`68bedff148b718c012034c8c`) | `https://healthnews.com/womens-health/menopause/ways-to-treat-tingling-sensation-in-hands-and-feet-during-menopause/` | U | — |
| `how-to-deal-with-menopausal-brittle-nails` (`68bedfee169038633e7529aa`) | `https://healthnews.com/womens-health/menopause/uncommon-menopause-symptom-fragile-brittle-nails/` | U | — |
| `how-to-deal-with-menopausal-depression` (`68bedfee42baf98f68a8aef5`) | `https://www.nuffieldhealth.com/article/sleep-tips-when-youre-in-menopause` | — | leave (200) |

`healthnews.com` has been failing in every crawl since 4 August and today its homepage
returns nginx 404, so it is treated as dead. The build re-checks the homepage first; if it
returns 200 the two anchors stay and the rows are marked "Not an issue" instead.

### Reusable code and patterns
- **Rich-text patching** was done in August for the Apple Podcasts links in `post-content`:
  read the field, exact-string replace the `<a …>` tag, write back only that field, re-read
  and diff. No helper was kept, so the build writes a small one.
- `tools/entity-audit/` has the Data API config pattern (`config.js`) if a token route is
  preferred over MCP, but MCP `data_cms_tool` was sufficient in August.
- Existing Playwright test for this site: `tests/acceptance/semrush-audit-fixes-aug-2026.spec.js`
  (plain `ORIGIN` constant, `readMeta` helper, no-console-errors pattern). Followed here.

### Constraints carried in
- `client.md`: Tamsen's team owns copy. Nothing here changes copy; unlinks keep every word.
- August decisions still stand: repoint where a good target exists, unlink and keep the
  sentence otherwise, never edit a good link to please the crawler, publish directly.
- Root `CLAUDE.md`: no inline comments in production code, named exports, client files under
  `projects/tamsen-fadal/.claude/`.
- No slug changes anywhere.

### Selectors confirmed (live DOM, not Designer)
- Press card link: `a.link-wrapper[href]` inside `.filter-list_item`.
- Provider website button: `a.directory_link-wrapper` whose text is "Website".
- Advocacy bill links: anchors inside the `legislation` rich-text block on `/advocacy`.

Webflow Designer MCP was not used; every change is CMS data, so no Designer selectors are
needed.

---

## Decisions taken in planning

The user was not available during this background run. These follow the August precedent
and are stated so they can be overturned before `/build`:

1. **Bot-blocked links stay as they are** (Amazon AU, NIA, Iowa, Nuffield, and the Michigan
   replacements, which will also 403 to SEMrush). Mark them "Not an issue" in the dashboard.
2. **Press: Wayback snapshot where available, otherwise clear the link.** Alternative is to
   clear all five, which leaves five cards with a dead click.
3. **Providers: clear the website link, keep the listing.** Alternative is to archive the
   four providers whose domains no longer resolve. That is a directory-curation call for
   Tamsen's team, not an SEO fix, so it is left as an open question.
4. **healthnews.com anchors are unlinked** unless the site is back at build time.
5. **Publish straight to production**, as in August.

## Approach

Three paths were weighed against the August precedent rather than explored by separate
agents, because the previous build already proved one of them on this exact site.

| Approach | Confidence | Complexity | Key risk | Reusable |
| --- | --- | --- | --- | --- |
| **A: Webflow MCP `data_cms_tool` writes, item by item** (chosen) | 90 | Low, 23 field writes across 5 collections | Rich-text round-trip normalisation; mitigated by exact-replace and diff | August rich-text patch pattern |
| B: Node script against the Data API with a site token | 75 | Medium, new script plus token handling | Token not present in the environment; more code for a one-off | `tools/entity-audit/config.js` |
| C: SEMrush-only triage, mark everything "Not an issue" | 20 | Low | Leaves 20 real dead links in front of readers | none |

A is chosen. It is what the August build used, needs no new secrets, and the write count is
small enough that a script would cost more than it saves.

---

## Tasks

| # | Task | Agent | Depends on |
| --- | --- | --- | --- |
| 1 | Re-check gates: `healthnews.com` homepage, Wayback availability for the five press URLs, and `malegislature.gov/Bills/194/H2499` via WebFetch | `seo` | — |
| 2 | Advocacy: patch four Michigan hrefs, one New York href, one Massachusetts href in `legislation` | `code-writer` | 1 |
| 3 | Press: set `link` to the Wayback snapshot or clear it, five items | `code-writer` | 1 |
| 4 | Providers: repoint `ysl.nl`, clear four `website-link` fields | `code-writer` | — |
| 5 | Blog and podcast rich text: six repoints, two unlinks (or zero if gate 1 says healthnews is back) | `code-writer` | 1 |
| 6 | Publish the site; re-read every touched item and diff against the pre-change copy | `code-writer` | 2, 3, 4, 5 |
| 7 | Run `tests/acceptance/tamsen-broken-external-links-sep-2026.spec.js`; curl every new href with a browser UA | `qa` | 6 |
| 8 | Mark the 21 false-positive rows "Not an issue" in SEMrush; trigger a recrawl; write the build report to `../audits/` | `seo` | 7 |

### Rich-text edit rules (tasks 2 and 5)
- Read the field, snapshot it to `$CLAUDE_JOB_DIR/tmp/<item-id>-<field>.before.html`.
- Repoint: replace only the `href="…"` value inside the matching `<a>` tag; keep `id=""`,
  `target`, and children untouched.
- Unlink: replace `<a id="" href="DEAD">INNER</a>` with `INNER`. INNER may contain
  `<strong>`; keep it.
- Write back that one field. Re-read. Assert the only diff is the anchor. Abort the item
  if anything else changed (Webflow occasionally re-serialises rich text).

## Parallelisation map

| Stream | Tasks | Agent | Est. time | Est. tokens |
| --- | --- | --- | --- | --- |
| A — Gates | 1 | `seo` | 10 min | ~6k |
| B — Advocacy | 2 | `code-writer` | 15 min | ~12k |
| C — Press | 3 | `code-writer` | 15 min | ~10k |
| D — Providers | 4 | `code-writer` | 10 min | ~8k |
| E — Rich text (blog + podcast) | 5 | `code-writer` | 25 min | ~20k |
| F — Publish and verify | 6, 7, 8 | `code-writer`, `qa`, `seo` | 25 min | ~15k |

- **Sequential gates:** A before B, C and E (A settles healthnews, Wayback and H2499).
  D can start immediately. F only after B to E.
- **Recommendation:** run A and D first, then B, C, E in parallel, then F. Different
  collections, no shared files.
- **Worktrees:** no. All writes go to the Webflow CMS, not the repo. The only repo output is
  the build report.
- **Agent teams:** not needed at this size.

## ADR check

No architectural decision. Data-only change, no new module, no shared utility.

## Barba impact

**N/A — no Barba transitions.** `projects/tamsen-fadal/` has no JS modules. Every change is
CMS field data.

---

## Verify Loop

### Pass/fail criteria

| # | Condition | How |
| --- | --- | --- |
| V1 | No `legislature.mi.gov/doc.aspx` href on `/advocacy` or any `?430d54ad_page=N` variant | acceptance test |
| V2 | `/advocacy` contains the four `Bills/Bill?ObjectName=2025-HB-*` hrefs, `bills/2025/S3908`, and `Bills/194/H2499` | acceptance test |
| V3 | No press page (`/press` and `?e90b90e6_page=1…12`) links to `moderngenxwoman.com`, `preferredhealthmagazine.com`, `sherrishowtv.com`, `bellamag.co`, or `id1591991012` | acceptance test |
| V4 | No provider directory page (`?62cd2995_page=1…14`) links to `journeyofawoman.co.uk`, `theconfidenceclinic.co`, `cgcchicago.com`, `ytvhealthcoaching.com`, or the `ysl.nl/afdelingen…` deep path | acceptance test |
| V5 | Each of the six repointed blog posts and the podcast page carries the new href and not the dead one | acceptance test |
| V6 | The two unlinked sentences still contain their anchor text ("Tingling extremities", "Brittle nails during menopause") but no `healthnews.com` href | acceptance test |
| V7 | Every new href returns < 400 with a browser UA, or 403 from a known bot-blocking legislature host | curl loop in task 7 |
| V8 | Untouched false positives are still present: `nia.nih.gov` href on `/blog/how-to-deal-with-menopausal-sleep-problems`, `amazon.com.au` on `/book-how-to-menopause`, `legis.iowa.gov` on `/advocacy` | acceptance test |
| V9 | No console errors on `/advocacy`, `/press`, the directory, and one touched blog post | acceptance test |
| V10 | SEMrush issue 12 reports 0, or only rows marked "Not an issue" | recrawl, `issue_details` |

### Reproduction steps
1. Publish the site in Webflow.
2. Wait 5 minutes for CDN propagation.
3. `npm run test:sz -- tamsen-broken-external-links-sep-2026` → V1 to V6, V8, V9.
4. Curl each new href from the fix table with a Chrome UA → V7.
5. Trigger a SEMrush recrawl of project `30728045`; when `info` reports `FINISHED`, read
   `issue_details` for issue 12 → V10.

### Tier mapping
- **Tier 1 (auto, local):** `tests/acceptance/tamsen-broken-external-links-sep-2026.spec.js`
  covers V1 to V6, V8 and V9 against the live site.
- **Tier 2 (auto, CDN regression):** registered as `tamsen-broken-external-links-sep-2026`
  in `tests/registry.json`.
- **Tier 3 (manual):**
  - *SEMrush recrawl (V10)*: server-side, takes hours. Check the day after publishing.
  - *"Not an issue" marking*: done in the SEMrush UI, 21 rows.
  - *Michigan bill pages open in a browser*: every automated client is WAF-blocked, so a
    human click is the only proof.
  - *Provider cards with an emptied Website button*: confirm the button either hides (if
    conditional visibility is set in the Designer) or is acceptably inert. Screen-check
    directory pages 2, 4, 7 and 13.

### Regression scope
Must not break:
- **Every other href in the touched rich-text fields.** The diff-after-write rule exists for
  this. `how-to-deal-with-menopausal-brittle-nails` also carries a `hellobonafide.com` link
  that must survive.
- **Copy.** No sentence changes; unlinks keep the exact text including `<strong>`.
- **Titles, descriptions and JSON-LD** from the August pass. `seo-title` and
  `short-description` are not touched; the August test file must still pass.
- **Slugs.** None change.
- **Press and provider cards.** A cleared link must not remove the card or its image.

---

## Acceptance Tests

`tests/acceptance/tamsen-broken-external-links-sep-2026.spec.js`

1. `advocacy pages carry no legislature.mi.gov doc.aspx links` (V1)
2. `advocacy page links to the current Michigan, New York and Massachusetts bill pages` (V2)
3. `press pages carry no dead press domains` (V3)
4. `provider directory pages carry no dead provider domains` (V4)
5. `Dr. Schmitz - van Splunder links to the ysl.nl root` (V4)
6. `repointed blog and podcast pages carry the new href and not the dead one` (V5, one test per page)
7. `unlinked healthnews sentences keep their text` (V6)
8. `untouched false positives are still linked` (V8)
9. `no console errors on touched page types` (V9)

No animation is involved, so there is no reduced-motion test.

## Risks

| # | Risk | Severity |
| --- | --- | --- |
| R1 | Webflow re-serialises a rich-text field on write, changing more than the anchor. Mitigated by the before/after diff and per-item abort. | Medium |
| R2 | Michigan replacement URLs cannot be verified by any automated client. Google indexes them with the right bill titles; a human click is the final check. | Low |
| R3 | `malegislature.gov` is unreachable from this network. If WebFetch also fails at build time, keep the H2499 repoint on LegiScan's evidence and note it in the report. | Low |
| R4 | SEMrush will still flag the Michigan, Iowa, Amazon and NIA rows as 4xx/5xx. Expect issue 12 to settle at roughly 15 rows all marked "Not an issue", not at 0. | Low |
| R5 | Clearing a provider link may leave an inert Website button if the template has no conditional visibility. Cosmetic, Tier 3 check. | Low |

## Open questions

1. Press links: Wayback snapshot or plain clear? Planning defaults to Wayback.
2. Should the four providers whose domains no longer resolve be archived from the directory
   rather than kept with no website? Directory curation is Tamsen's team's call.
3. Is a `tamsenfadal.com` "Not an issue" list worth keeping in the client folder so the next
   audit does not re-litigate the same 21 rows? Suggested: yes, appended to the build report.
