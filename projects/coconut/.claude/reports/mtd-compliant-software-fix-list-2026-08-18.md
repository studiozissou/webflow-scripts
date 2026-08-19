# Fix list — MTD Compliant Software page

**From:** `/test-page` run 18 Aug 2026 against `https://getcoconut.webflow.io/features/mtd-compliant-software`
**Full report:** `projects/coconut/.claude/research/test-page/mtd-compliant-software-report-2026-08-18.md`
**Spec:** `projects/coconut/.claude/specs/mtd-compliant-software-page-rework.md`

All fixes are manual Webflow Designer / CMS edits — there is no programmatic access to the
Coconut site from this repo.

---

## P0 — must fix before production

### 1. Correct the quarterly update period start dates

**Where:** the deadlines table in "What does it actually mean to be MTD compliant?" → "Quarterly
updates to HMRC". Four `<p>` elements in the "Period covered" column.

| Row | Currently reads | Change to |
|---|---|---|
| 1st update | 6 April – 5 July | *(correct, leave)* |
| 2nd update | 6 April – 5 October | **6 July – 5 October** |
| 3rd update | 6 April – 5 January | **6 October – 5 January** |
| 4th update | 6 April – 5 April | **6 January – 5 April** |

Three of four rows start "6 April" — a copy-paste error. These are statutory HMRC reporting
periods on a compliance page, so this is the one item that genuinely must not ship.

The deadline column (7 August / 7 November / 7 February / 7 May) is already correct.

*Note:* the deck writes these as "6 April to 5 July"; the build uses an en dash. Keep the dash for
internal consistency unless the client wants deck-verbatim — the dates are the real issue.

**Verify:** all four rows show four different start dates.

### 2. Remove the duplicated "What to look for in MTD software" blocks

**Where:** section 6.6.

The five sub-sections render **twice**, and "Accountant access if you need it" renders **three**
times. All copies are visible — this is not a hidden responsive variant.

- Delete the duplicate blocks so each sub-section appears once
- Fix the order to match the deck: HMRC recognition comes first → How records get into the
  software → Support for your income sources → Support if a submission is rejected → Accountant
  access if you need it

Currently "Accountant access" leads the section.

**Verify:** exactly 5 H3s in that section, in deck order.

### 3. Update the meta title and description

**Where:** Webflow → CMS item → SEO settings (spec task 8, never done).

Title — currently `Making Tax Digital for Income Tax compliant software | Coconut | Coconut`:

```
MTD Compliant Software | Making Tax Digital | Coconut
```

Description — currently the old one:

```
Learn what MTD compliant software means, who needs it, and how Coconut helps you keep digital records and submit updates. Start your free trial today.
```

Watch the doubled ` | Coconut` — the template appends the site name and the item field also
contains it. Confirm the rendered title has the suffix exactly once.

**Verify:** view source, check `<title>` renders once with one suffix.

### 4. Add `rel="noopener"` to the HMRC links, and remove the duplicate

**Where:** "HMRC recognition comes first" — `Check Coconut on the official HMRC software list`.

Both links have `target="_blank"` but no `rel`. Add `rel="noopener"`. There are **two** of these
links where the spec's inventory lists one — the second is likely part of the section 6.6
duplication and should disappear with fix 2. Re-check after fixing 2.

---

## P1 — spec conformance

### 5. T5 — feature block headings `h2` → `h3`

All 8 still render as H2. Template-level change on the nested feature list; affects all 8 feature
pages. Client was to be told this is happening (spec Q5).

### 6. T6 — FAQ titles `div` → `h3`

All 10 `._25-collapse-title` are still `DIV`. Keep the class so styling and the IX2 accordion
still bind.

**Verify after the swap:** every FAQ item still expands on click. This is the one JS-adjacent risk
in the whole build.

### 7. Add the missing hero eyebrow / trust strip

Not present in any form. Spec 6.1:

```
HMRC-recognised · Built for sole traders, landlords & CIS · Bank-level security · 14-day free trial · No card details
```

The four trust badges are already present and correct — this is the separate eyebrow line.

### 8. Section 6.3 — convert the three H3s back to a bullet list

"Keep digital records of income and expenses", "Send quarterly updates to HMRC" and "Submit your
year-end tax return" are bullet points in the deck but render as H3 headings. This inflates the
heading outline and works against the clean H1→H2→H3 structure the spec's SEO section wanted.

### 9. Fix the contrast failure on the accountant link

`a[href="/features/work-with-your-accountant"]` inside `p.text-size-small` — `#0c7876` on
`#c2efed` at 14px = **4.25:1**, needs 4.5:1. Darken the link colour (or the variable) a step. This
is the only a11y failure; fixing it should take Lighthouse a11y from 97 to 100.

---

## P2 — copy fidelity and polish

### 10. Copy deviations from the verbatim deck

The spec's rule is "do not edit the copy":

- FAQ heading reads `Frequently Asked Questions` → should be `Frequently asked questions`
- Closing CTA button reads `Start your 14-day free trial` → should be `Start your 14-day free
  trial today`
- Closing subtext should be the single line `No card details required.` — the four trust badges
  repeat there instead

### 11. Image aspect ratio

`Right Arrow.webp` displayed at 29×58 (0.50) vs natural 70×126 (0.56), in 2 places. Set display
dimensions to match the natural ratio.

### 12. Decide the table markup question

There are **zero** `<table>` elements on the page. Both data sets are div layouts:

- Deadlines: 3-column grid (Quarterly update / Period covered / Deadline)
- Thresholds: year cards ("April 2026" + prose)

The spec called for the 2-column `.quarterly-table` embed (T8). The built version is arguably
better UX — the deadlines grid adds a useful "1st update" label column.

**Recommendation:** keep the visual design, but rebuild the markup as a real `<table>`. Tabular
data in divs is weaker for screen readers and works against the AI-extraction goal in the spec's
SEO notes — which is much of the point of this page. Then update the spec and the acceptance test
to assert 3 columns rather than 2.

If the client prefers, the alternative is to accept the divs as-is and drop the table assertions.
Either way this needs a decision, not silence.

---

## P3 — test and doc follow-ups

### 13. Strengthen the acceptance spec

`tests/acceptance/coconut-mtd-compliant-software-page-rework.spec.js` would already catch fixes
3, 4, 5, 6 and the table assertion if pointed at staging today. It would **not** have caught:

- the wrong deadline dates → add assertions on all four period/deadline **pairs**, not just the
  deadline values
- the duplicated section → assert each H3 appears exactly once

### 14. Update the spec and Notion page

Once fix 12 is decided, update Section 7 of the spec and the Notion mirror
(https://app.notion.com/p/3c0e1848bb5181849cd2c4692509067b) so they match what was actually built.

---

## No action needed

- **OptinMonster 404 + Intercom 403 console errors** — `getcoconut.webflow.io` is not a registered
  domain for either service. Staging-only; these are what drag Lighthouse Best Practices to 69 via
  `errors-in-console`. Should not occur on production.
- **SEO score 69** — the sole failure is `is-crawlable`, from the staging `robots.txt`. Expected;
  does not apply to production.
- **CLS 0.0005, no mobile overflow at 375px, no first-party console errors** — all clean.
