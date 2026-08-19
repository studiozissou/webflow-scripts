# Test Results — MTD Compliant Software (staging)

**URL:** https://getcoconut.webflow.io/features/mtd-compliant-software
**Date:** 2026-08-18 | **Mode:** Light + spec content diff | **Engine:** Chrome DevTools MCP
**Compared against:** `projects/coconut/.claude/specs/mtd-compliant-software-page-rework.md` (12 Aug 2026)

---

## Headline

**The rework has largely been built on staging already.** The new H1, all four new long-form
sections, the closing section, the new 10-item FAQ set and the hidden persona cards are all live.
This was not a pre-build baseline run.

However, the build is **incomplete against the spec** and contains **one critical factual error**
in the quarterly deadlines table.

---

## Scores

| Category | Score | Status | Note |
|---|---|---|---|
| Accessibility | 97 | PASS | one contrast failure, on a link this build added |
| Best Practices | 69 | FAIL | 4 audits, all third-party/staging except image aspect ratio |
| SEO | 69 | FAIL | **staging artifact** — sole failure is `is-crawlable` (webflow.io robots.txt) |
| Agentic Browsing | 100 | PASS | |
| CLS | 0.0005 | PASS | 2 shift entries, far below the 0.1 threshold |
| Mobile overflow @375px | none | PASS | scrollWidth 375 = clientWidth 375 |
| Console (first-party) | 0 errors | PASS | 3 errors total, all third-party staging-only |

Performance score not available — `lighthouse_audit` excludes performance in this MCP build; it
needs a trace (Full mode).

---

## Issues

### Critical

**1. Three of the four quarterly update periods are factually wrong.**
Source: content diff. Auto-fixable: No (Webflow Designer edit).

The deadlines table on the live page reads:

| Quarterly update | Period covered (live) | Period covered (spec/HMRC) | Deadline |
|---|---|---|---|
| 1st update | 6 April – 5 July | 6 April to 5 July | 7 August |
| 2nd update | **6 April** – 5 October | **6 July** to 5 October | 7 November |
| 3rd update | **6 April** – 5 January | **6 October** to 5 January | 7 February |
| 4th update | **6 April** – 5 April | **6 January** to 5 April | 7 May |

Every period after the first starts "6 April". This looks like a copy-paste error when the rows
were built. On a tax-compliance page this is misinformation about statutory HMRC reporting
periods — it should be fixed before this page goes to production.

The deadline column (7 August / 7 November / 7 February / 7 May) is correct.

### High

**2. Section 6.6 "What to look for in MTD software" is duplicated on the page.**
Source: content diff (heading outline + visibility check). Auto-fixable: No.

Its five sub-sections render **twice**, and "Accountant access if you need it" renders **three
times**. All copies are visible — confirmed via `offsetParent` and bounding-box checks, so these
are not hidden responsive variants. Visitors see the same five blocks repeated.

The order is also wrong. Spec order is HMRC recognition → how records get in → income sources →
rejected submissions → accountant access. Live, "Accountant access if you need it" leads the
section.

**3. Meta title and description were never updated (spec task 8).**
Source: content diff. Auto-fixable: Yes (Webflow page settings).

- Live title: `Making Tax Digital for Income Tax compliant software | Coconut | Coconut`
- Spec title: `MTD Compliant Software | Making Tax Digital | Coconut`
- Live description is still the old one.

The doubled ` | Coconut` suffix the spec flagged in 6.0 is still present.

**4. Neither table uses the specified `.quarterly-table` component.**
Source: content diff. Auto-fixable: No.

There are **zero** `<table>` elements on the page. Both data sets are built as div layouts:

- Deadlines: a 3-column div grid (Quarterly update / Period covered / Deadline) rather than the
  spec's 2-column table
- Thresholds: year cards ("April 2026" + prose) rather than the spec's 2-column table

The threshold values themselves (£50,000 / £30,000 / £20,000) are correct. Beyond the spec
deviation, non-semantic tabular data is weaker for screen readers and for the AI-extraction goal
set out in the spec's SEO notes.

**5. HMRC external link is missing `rel="noopener"`.**
Source: content diff. Auto-fixable: Yes (`element_tool`).

Both HMRC links have `target="_blank"` but `rel` is null. The spec explicitly requires
`target="_blank"` + `rel="noopener"`. Note there are **two** HMRC links where the spec's inventory
lists one.

### Medium

**6. Feature block headings are still `h2`, not `h3` (template change T5 not applied).**
All 8 render as H2. Source: content diff.

**7. FAQ titles are still `div`, not `h3` (template change T6 not applied).**
Exactly 10 `._25-collapse-item` and 10 `._25-collapse-title`, all `DIV`. The FAQ count and the
question copy match the spec exactly — only the tag is unchanged. Source: content diff.

**8. Hero eyebrow / trust strip is missing.**
Spec 6.1 specifies `HMRC-recognised · Built for sole traders, landlords & CIS · Bank-level
security · 14-day free trial · No card details`. Not present in any form. The four trust badges
are all present. Source: content diff.

**9. Section 6.3's bullet list is rendered as H3 headings.**
"Keep digital records of income and expenses", "Send quarterly updates to HMRC" and "Submit your
year-end tax return" are the spec's three bullet points, but they render as H3 headings. This
inflates the heading outline and undermines the clean H1→H2→H3 structure the spec's SEO section
was aiming for. Source: content diff.

**10. Colour contrast failure on an accountant link (Lighthouse a11y).**
`a[href="/features/work-with-your-accountant"]` inside `p.text-size-small` — `#0c7876` on
`#c2efed` at 14px gives **4.25:1**, below the 4.5:1 requirement. This is one of the links this
build added. Auto-fixable: Yes (`style_tool`, variable swap) — Medium risk.

### Low

**11. Copy deviations from the verbatim deck.**
The spec's rule is "do not edit the copy". Three deviations:

- FAQ H2 reads `Frequently Asked Questions`; deck says `Frequently asked questions`
- Closing CTA button reads `Start your 14-day free trial`; deck says `Start your 14-day free
  trial today`
- Closing subtext should be the single line `No card details required.` — instead the four trust
  badges repeat there

**12. Image aspect ratio (Lighthouse best-practices).**
`Right Arrow.webp` displayed at 29×58 (0.50) vs natural 70×126 (0.56), in 2 places.

**13. Third-party console noise (staging only).**
- OptinMonster embed 404 + "referrer site could not be found" — `getcoconut.webflow.io` is not a
  registered OptinMonster domain
- Intercom `messenger/web/ping` 403 — same root cause

Both are staging-domain registration artifacts and should not occur on production. They are what
drags Best Practices down via `errors-in-console`. No first-party JS errors.

---

## What passed cleanly

- Exactly one H1, exact new text: `MTD Compliant Software: how Coconut handles it`
- Old H1 `Making Tax Digital for Income Tax made simple` absent
- All four new long-form sections + the closing section present
- Persona cards (`MTD software for:`) correctly hidden on this page
- FAQ: exactly 10 items, all 10 questions match the deck verbatim
- Dropped FAQs confirmed gone (`How experienced is` absent)
- Link inventory: `/mtd-software` ×3 (hero, mid-page, closing), landlords ×2, accountant ×7
  (spec wanted ≥3), bridging ×1, CIS ×2 — **so open questions Q2 and Q3 were resolved and the
  links were built**
- Brand mark: ~45 plain "Coconut" vs 4 "!Coconut" — **Q1 was resolved in favour of the deck's
  plain "Coconut"**
- All four trust badges present
- CLS 0.0005, no mobile horizontal overflow, no first-party console errors

---

## Spec conformance summary

Against the spec's Section 13 pass/fail criteria:

| Assertion | Result |
|---|---|
| Single H1 with new text | PASS |
| Old H1 absent | PASS |
| All new H2 sections present | PASS (FAQ heading capitalisation differs) |
| Feature blocks render as h3 | **FAIL** — still h2 |
| 2 × `table.quarterly-table` (4 and 3 rows) | **FAIL** — 0 tables |
| FAQ has 10 items | PASS |
| FAQ questions render as h3 | **FAIL** — still div |
| `MTD software for:` absent | PASS |
| Old FAQ text absent | PASS |
| Hero link to `/mtd-software` after signup button | PASS |
| Link to `/mtd-software/landlords` | PASS |
| ≥3 links to `/features/work-with-your-accountant` | PASS (7) |
| HMRC link with `target="_blank"` | PASS — but `rel="noopener"` **missing** |
| Meta title exact | **FAIL** |
| Meta description exact | **FAIL** |
| No console pageerrors | PASS (third-party only) |
| Tables fit at 375px | N/A — no tables |

**Outstanding spec tasks: 4 (T5), 5/T8 (tables), 7 partial (T6), 8 (meta).**

The committed acceptance spec
`tests/acceptance/coconut-mtd-compliant-software-page-rework.spec.js` would already catch items
3, 4, 5, 6 and 7 if run against staging now. It would **not** catch the critical deadline error
(item 1) or the duplication (item 2) — worth adding assertions for both.

---

## Artifacts

- Desktop screenshot: `projects/coconut/.claude/research/test-page/mtd-compliant-software-desktop-2026-08-18.png`
- Mobile screenshot: `projects/coconut/.claude/research/test-page/mtd-compliant-software-mobile-2026-08-18.png`

Not run (Light mode): performance trace, memory snapshot, keyboard a11y sweep, full network
analysis, cross-browser.
