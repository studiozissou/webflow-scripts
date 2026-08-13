# Spec — MTD Compliant Software service page rework

**Slug:** `mtd-compliant-software-page-rework`
**Client:** Coconut
**Page:** https://www.getcoconut.com/features/mtd-compliant-software
**Trello:** https://trello.com/c/yHHWFuLI/83-service-page-mtd-compliant-software (card `6a05d60157ebe300986ee9b4`, due 12 Aug 2026)
**I-COM ref:** GETCOCO-111
**Copy source of truth:** `AG_Coconut_-_Service_page_-_MTD_Compliant_Software_(July_2026)_(condensed).docx`
**Date:** 12 August 2026

---

## 1. Purpose

Replace the copy and extend the structure of the MTD Compliant Software service page to match the July 2026 condensed copy deck.

This is **not** a like-for-like copy swap. The deck adds four long-form editorial sections, two data tables, a mid-page CTA and a completely new FAQ set. The page currently runs on the **Features CMS template**, which cannot render any of that. The template therefore needs extending.

> **Copy rule for this build: do not edit the copy.** Every string in Section 6 is reproduced verbatim from the deck, including its apostrophes, hyphens and capitalisation. If something reads wrong, raise it as a query (Section 9) — do not fix it in the Designer.

---

## 2. Decisions taken

| # | Decision | Chosen approach |
|---|---|---|
| 1 | Where the new long-form content lives | **Extend the Features CMS template** with new optional fields + conditionally visible sections. Empty fields = hidden section, so the other 7 feature pages are unaffected. |
| 2 | Existing hard-coded "MTD software for:" persona cards | **Hide on this page only.** New "Who needs MTD compliant software, and when?" section supersedes them here; other 7 pages keep them. |
| 3 | Table pattern | **Reuse the existing `.quarterly-table` embed component** already live on `/mtd-software/landlords`. Full markup in Section 7. |
| 4 | Heading levels | **Follow the deck exactly.** Feature blocks H2 → H3; FAQ titles `div` → H3. Both are shared template elements — see blast radius in Section 5. |

---

## 3. Current page anatomy (verified)

Confirmed by diffing the live page against `/features/scan-receipts`. This matters because half the page is shared markup across all 8 feature pages.

| Section | Source | Changing it affects |
|---|---|---|
| Breadcrumb `Home / Features / [name]` | CMS item name | This item only |
| Hero: H1, intro, CTA button, 4 trust badges | CMS fields | This item only |
| 8 feature blocks (green tick + H2 + para) | **Nested CMS list** `_25-features-inner-page-section-feature-list` | This item only (copy) / all 8 pages (markup) |
| Trustpilot widget | Hard-coded | **All 8 feature pages** |
| "MTD software for:" + 3 persona cards | **Hard-coded — byte-identical across pages** | **All 8 feature pages** |
| Accountant strip | Hard-coded | **All 8 feature pages** |
| "Common questions" — 8 accordions | **CMS list.** Titles are `<div class="_25-collapse-title">`, answers are rich text | This item only (copy) / all 8 pages (markup) |
| "Better understand your finances…" CTA | Hard-coded | **All 8 feature pages** |
| "More fantastic features" | CMS list (Features collection `683ebf9571fba472b081c90d`) | Template |
| Testimonials | Hard-coded slider | **All 8 feature pages** |
| "Crack your finances" blog cards | CMS list | Template |
| Footer CTA + app badges | Hard-coded | **All 8 feature pages** |

**Gap analysis — what the template cannot currently render:**

- Long-form prose sections: H2 + nested H3 + bullet lists (4 new sections, 16 new H3s)
- Two data tables — there are currently **zero** `<table>` elements on any `/features/` page
- A secondary text CTA beneath the hero trial button
- A mid-page CTA after the "How Coconut meets each MTD compliance requirement" section
- FAQ questions as real headings
- More than 8 FAQ items (page has 8, deck has 10)

**Tooling constraint:** the connected Webflow MCP token only authorises the "Ready Hit Play" site. There is no programmatic access to the Coconut site, so every change below is a **manual Designer build**. That is why this document is written as a build sheet.

---

## 4. CMS schema changes — Features collection

Add the following fields. All optional, so the other 7 feature items stay valid and render unchanged.

| Field name | Type | Purpose |
|---|---|---|
| `Hero eyebrow` | Plain text | Trust strip line above/below H1 |
| `Hero intro` | Rich text | Replaces single-paragraph intro — deck has 4 paragraphs |
| `Hero secondary CTA label` | Plain text | "See how Coconut handles MTD for your situation" |
| `Hero secondary CTA link` | Link | `/mtd-software` |
| `Long-form body` | Rich text | Sections 6.3–6.6 — the four new editorial sections, incl. both table embeds |
| `Mid-page CTA label` | Plain text | Mid-page CTA text |
| `Mid-page CTA link` | Link | Mid-page CTA destination |
| `Hide persona cards` | Switch | ON for this item → hides the hard-coded "MTD software for:" section |
| `Closing section heading` | Plain text | "Get ready for Making Tax Digital with Coconut" |
| `Closing section body` | Rich text | 3 closing paragraphs |
| `Closing CTA label` / `Closing CTA link` | Plain text / Link | "Start your 14-day free trial today" → signup |
| `Closing CTA subtext` | Plain text | "No card details required." |
| `Closing secondary CTA label` / `link` | Plain text / Link | "See how Coconut handles MTD for your situation" → `/mtd-software` |

**FAQ collection:** the existing FAQ CMS list holds **8** items on this page (verified on both live and staging — `class="_25-collapse-item"` × 8). The deck supplies **10**. FAQs are a per-item nested/multi-reference field on the Features item — the live diff shows different questions on each feature page. Unlink all 8 existing items and add the 10 new ones.

---

## 5. Template changes — Features CMS template

| # | Change | Blast radius | Notes |
|---|---|---|---|
| T1 | Bind new hero eyebrow + rich-text intro + secondary text CTA | All 8 pages | Wrap each in conditional visibility (`field is set`) so other pages are untouched |
| T2 | Add long-form body section (rich text) after the feature blocks | All 8 pages | Conditional visibility — hidden when `Long-form body` empty |
| T3 | Add mid-page CTA block | All 8 pages | Conditional visibility |
| T4 | Wrap hard-coded "MTD software for:" section in conditional — hide when `Hide persona cards` is ON | All 8 pages | Only this item sets the switch ON |
| T5 | Change nested feature-list heading `h2` → `h3` | **All 8 pages** | Semantic improvement everywhere; sign off with client |
| T6 | Change FAQ `_25-collapse-title` from `div` → `h3` | **All 8 pages** | Keep the class so styling and the accordion IX2 interaction still bind. **Verify the accordion still toggles after the tag swap.** |
| T7 | Add closing section block (heading + rich text + CTA + subtext + secondary link) | All 8 pages | Conditional visibility |
| T8 | Add `.quarterly-table` CSS once to page/site custom code | All 8 pages | Currently only lives on `/mtd-software/landlords` — see Section 7 |

**Ordering on the page after the rework:**

1. Breadcrumb
2. Hero — H1, eyebrow, 4-para intro, trial CTA, secondary text CTA, 4 trust badges
3. 8 feature blocks (now H3)
4. Trustpilot
5. ~~"MTD software for:" persona cards~~ **(hidden on this page)**
6. Accountant strip
7. **NEW** — "What does it actually mean to be MTD compliant?" (+ quarterly deadlines table)
8. **NEW** — "Who needs MTD compliant software, and when?" (+ thresholds table)
9. **NEW** — "How Coconut meets each MTD compliance requirement" (+ mid-page CTA)
10. **NEW** — "What to look for in MTD software"
11. "Frequently asked questions" — 10 new items, H3 titles
12. **NEW** — "Get ready for Making Tax Digital with Coconut" closing section
13. "Better understand your finances…" CTA / More features / Testimonials / Blog / Footer (unchanged)

---

## 6. Exact copy — what goes where

Copy below is **verbatim from the deck**. Paste it as-is.

### 6.0 Page settings (Webflow → CMS item SEO settings)

| Field | Current (live) | **New** |
|---|---|---|
| Meta title | `Making Tax Digital for Income Tax compliant software \| Coconut  \| Coconut` | `MTD Compliant Software \| Making Tax Digital \| Coconut` |
| Meta description | `Discover our MTD compliant software designed to make tax reporting easy, accurate and fully HMRC-recognised. Streamline MTD today.` | `Learn what MTD compliant software means, who needs it, and how Coconut helps you keep digital records and submit updates. Start your free trial today.` |

> The current live title has a duplicated ` | Coconut` suffix — the template appends the site name and the item field also contains it. Make sure the new title renders exactly once.

### 6.1 Hero

**H1** — replaces `Making Tax Digital for Income Tax made simple`

```
MTD Compliant Software: how Coconut handles it
```

**Eyebrow / trust strip** (new element)

```
HMRC-recognised · Built for sole traders, landlords & CIS · Bank-level security · 14-day free trial · No card details
```

**Intro** — replaces the current single paragraph. Four paragraphs:

```
Making Tax Digital (MTD) is the biggest change to how self-employed people and landlords report tax since Self Assessment began.
```
```
If you're a sole trader, landlord or CIS subcontractor wondering whether your current setup is actually covered, you're in the right place.
```
```
Coconut is HMRC-recognised MTD compliant software built for exactly your situation. It helps you keep digital records, send quarterly updates to HMRC, and finalise your year-end tax return, all from one app.
```
```
No full accounting package to learn. No messy spreadsheet process. Just a simpler way to stay ready for Making Tax Digital.
```

**Primary CTA button** — label and link unchanged

```
Start your 14-day free trial
```
→ `https://web.getcoconut.com/signup`

**Secondary CTA — hyperlinked text, placed UNDER the trial button**

```
See how Coconut handles MTD for your situation
```
→ `https://www.getcoconut.com/mtd-software`

> Per Anna Guilford's two comments in the deck: *"This will probably be too long for a CTA button"* and *"Note for developer - could this be hyperlinked text under the 14-day trial button, as it's too long to be a CTA button"*. Build it as a text link, not a button.

**Trust badges** — 4 items. The 4th already exists on one hero variant only; ensure every variant carries all four.

```
No card details required
FCA authorised
Bank level security
HMRC recognised for MTD
```

### 6.2 Feature blocks — 8 items, nested CMS list

Same 8 blocks, same order. Heading level changes **H2 → H3**. Copy is revised on 6 of 8 — replace all 8.

| # | Heading (H3) | Body |
|---|---|---|
| 1 | `HMRC-recognised for MTD for Income Tax` | `Coconut is fully MTD recognised software for MTD for Income Tax. Submit quarterly updates, complete your Making Tax Digital tax return digitally and have peace of mind that all submissions meet HMRC requirements.` |
| 2 | `Digital recordkeeping for MTD` | `Keep all your business income, receipts and expense tracking digitally. Coconut ensures your records are organised and ready for quarterly submissions and your end of year MTD tax return.` |
| 3 | `Multiple income streams in one account` | `Whether you earn from freelancing, property, or multiple side businesses, Coconut brings all your income together in one place. This ensures your records stay complete and correctly organised for Making Tax Digital. You’ll always have a clear view of your total income, ready for accurate quarterly submissions to HMRC.` |
| 4 | `Quarterly updates made simple` | `Send your income and expense totals to HMRC at least once a quarter. Coconut ensures your records are complete and formatted correctly, so quarterly submissions can be completed in just a few clicks and remain error-free. You’ll receive real-time tax estimates every time you send an update.` |
| 5 | `Digital end of year MTD tax return` | `Finalise and submit your MTD tax return and pay any tax outstanding by the 31st January after the tax year end, but with Coconut’s up-to-date tax estimates, you’ll know what to expect, no last-minute shocks.` |
| 6 | `Access anywhere, on any device` | `Coconut is designed for sole traders and landlords who want full control over their finances. Use the mobile app for on the go tasks or access the web browser to manage your books and MTD for Income Tax anytime, anywhere.` |
| 7 | `Reports to stay in control` | `See your profit and loss, cashflow and transaction summaries all in one place to support day-to-day financial management. Coconut makes it easy to prepare for MTD submissions without the stress.` |
| 8 | `Secure and HMRC recognised` | `All your data is protected on a secure cloud platform with bank-level encryption. Coconut is HMRC-recognised software, giving you safe storage for all your documents and transactions in one place.` |

**Changes vs live, for reference:**
- #3 and #4 headings move from Title Case to sentence case
- #2 "income, expenses and receipts" becomes "income, receipts and expense tracking"
- #4 "so quarterly submissions are simple and error-free" becomes "so quarterly submissions can be completed in just a few clicks and remain error-free"; "real time" becomes "real-time"; fixes the live typo "every time your send"
- #5 drops the trailing orphan phrase "Real time tax estimates"
- #7 adds "to support day-to-day financial management"
- #8 adds "on a secure cloud platform"

### 6.3 NEW SECTION — What does it actually mean to be MTD compliant?

**H2**
```
What does it actually mean to be MTD compliant?
```

```
“MTD compliant” means software can do the specific things HMRC requires for Making Tax Digital for Income Tax.
```
```
Compatible software must let you:
```
Bullet list:
- `keep digital records of income and expenses`
- `send quarterly updates to HMRC`
- `submit your year-end tax return`

```
You can use full MTD software or bridging software, but it must be recognised for MTD for Income Tax and support the submissions you need.
```
> **Query:** "bridging software" is comment-flagged in the deck by Jehan Ranasinghe — *"These will link to the relevant pages when they are uploaded"*. A bridging page already exists at `/mtd-software/bridging-software`. Confirm whether to link it now. See Section 9.

**H3** `Digital record keeping`
```
MTD requires you to create and maintain digital records throughout the tax year, instead of entering paper records later.
```
```
Records can come from:
```
Bullet list:
- `bank feeds`
- `snapped receipts`
- `invoices`
- `income and expense transactions recorded in your software`

```
Where software products work together, digital links should move figures without manual retyping. Keep the records for at least five years after the relevant 31 January deadline.
```

**H3** `Quarterly updates to HMRC`
```
Under MTD for Income Tax, you send four quarterly updates each year. These are summaries of your self-employment income, property income and expenses - not four separate tax returns.
```

**TABLE 1 — quarterly update deadlines.** Build per Section 7.

| Update period | Deadline |
|---|---|
| 6 April to 5 July | 7 August |
| 6 July to 5 October | 7 November |
| 6 October to 5 January | 7 February |
| 6 January to 5 April | 7 May |

```
Each update is a snapshot, not a final Income Tax calculation. Coconut prepares it from the digital records already in your account and lets you submit it directly to HMRC.
```

**H3** `The year-end MTD tax return vs Self Assessment`
```
At the end of the tax year, you finalise your Income Tax position by the following 31 January. You add other income, check your figures, make final adjustments and file your tax return.
```
```
The deadline stays the same, but the work is spread through the year. Coconut keeps your quarterly records connected to the final tax return, reducing retyping.
```

### 6.4 NEW SECTION — Who needs MTD compliant software, and when?

**H2**
```
Who needs MTD compliant software, and when?
```
```
MTD for Income Tax is being introduced in stages, based on your qualifying income from self-employment and property before expenses.
```

**TABLE 2 — thresholds.** Build per Section 7.

| When MTD for Income Tax applies | Qualifying income |
|---|---|
| From 6 April 2026 | Over £50,000 |
| From 6 April 2027 | Over £30,000 |
| From 6 April 2028 | Over £20,000 |

```
Qualifying income means gross income, not profit. £52,000 before costs puts you in scope from April 2026.
```
```
MTD for Income Tax is separate from MTD for VAT. If you already use VAT software, check that it is also compatible software for Income Tax. Even if your start date is later, setting up digital records early can make the switch easier.
```

**H3** `Sole traders over the threshold`
```
If your qualifying self-employment income is over the relevant threshold, you will need compatible software to keep digital records, submit quarterly updates and complete your year-end tax return.
```
```
Coconut helps sole traders manage income, expenses, receipts, invoices and tax estimates without learning a full accounting system.
```

**H3** `Landlords, including multiple properties`
```
Property income counts towards the threshold and is combined with self-employment income.
```
```
UK rental properties are generally treated as one UK property business for MTD. Coconut still helps you organise records by property and track:
```
Bullet list:
- `rent and property expenses`
- `repairs, agent fees and mortgage interest records`
- `receipts, invoices and property documents`
- `totals across your portfolio`

```
Foreign property income may need separate records, so check how it fits your wider MTD position.
```
```
For more detail, see MTD for landlords.
```
→ hyperlink the words **"MTD for landlords"** to `https://www.getcoconut.com/mtd-software/landlords`

**H3** `CIS subcontractors with mixed income`
```
Making Tax Digital does not change how Construction Industry Scheme deductions work. It changes how you keep and submit the supporting records.
```
```
Your gross CIS income counts towards the MTD threshold before deductions. Coconut lets you keep CIS income, deductions, monthly statements, expenses, invoices and other income streams together in one account.
```
```
Those records feed into quarterly updates and the year-end tax return, even when CIS work sits alongside other income.
```
```
For the full detail, see our guide to MTD software for CIS subcontractors.
```
> **Query:** comment-flagged by Jehan Ranasinghe — *"These will link to the relevant pages when they are uploaded"*. A CIS page exists at `/mtd-software/cis-subcontractors`. Confirm before linking. See Section 9.

### 6.5 NEW SECTION — How Coconut meets each MTD compliance requirement

**H2**
```
How Coconut meets each MTD compliance requirement
```
```
Coconut is HMRC-recognised MTD software that keeps digital records, handles quarterly updates and supports the year-end tax return without a full accounting package.
```

**H3** `HMRC-recognised and directly connected`
```
Coconut appears on HMRC’s recognised software list and connects directly with the Making Tax Digital service. You can send updates securely in the required format without copying figures into an HMRC portal or using separate bridging software just to submit.
```

**H3** `Digital records from bank feeds, receipts and invoices`
```
Connect your bank through secure Open Banking and transactions flow into Coconut automatically. You can then:
```
Bullet list:
- `categorise income and expenses`
- `snap and attach receipts`
- `raise and send invoices`
- `import PayPal income`
- `manage self-employment and property income together`

```
This makes digital record keeping part of your normal routine, rather than a job to rebuild before each deadline.
```

**H3** `Quarterly updates from the app`
```
Review the figures already held in Coconut, then submit quarterly updates directly to HMRC from the app. There is no separate HMRC portal, spreadsheet-to-portal process or extra bridging software needed.
```
```
The same connected records also feed into your year-end tax return.
```

**H3** `Real-time tax estimates`
```
Coconut updates your estimated Income Tax and National Insurance as new income and expenses are recorded. This helps you plan ahead, put money aside and manage cash flow without doing manual tax calculations.
```

**H3** `Multiple income streams in one account`
```
Manage freelance work, property income, CIS records, invoices, expenses and deductions in one account. This is useful if you have several types of work, multiple properties or an accountant who needs access.
```
```
Keeping these records together reduces admin and keeps quarterly updates connected to the year-end tax return.
```
```
You can also work with your accountant in Coconut whenever you need extra support.
```
→ hyperlink the words **"work with your accountant in Coconut"** to `https://www.getcoconut.com/features/work-with-your-accountant`

**MID-PAGE CTA**
```
See how Coconut handles MTD for your situation
```
→ `https://www.getcoconut.com/mtd-software`

### 6.6 NEW SECTION — What to look for in MTD software

**H2**
```
What to look for in MTD software
```
```
Choose software that fits how you work, connects to HMRC and reduces admin. You need to select it before signing up for MTD so you can authorise the connection.
```
```
Here are the main things to check:
```

**H3** `HMRC recognition comes first`
```
The software must appear on HMRC’s compatible software list for MTD for Income Tax. MTD for VAT is separate, so VAT software is not automatically suitable for Income Tax.
```
**Link**
```
Check Coconut on the official HMRC software list
```
Destination: `https://www.tax.service.gov.uk/find-making-tax-digital-income-tax-software/product-details?productId=3150`
External link — set `target="_blank"` and `rel="noopener"`.

**H3** `How records get into the software`
```
Look for bank feeds, receipt capture, invoicing, transaction imports, simple categories and document storage to reduce manual entry.
```
```
Bridging software can connect an existing spreadsheet to HMRC. Purpose-built MTD software such as Coconut keeps the records, quarterly updates and year-end tax return together, which is usually simpler if you do not want to manage spreadsheets.
```

**H3** `Support for your income sources`
```
Check that the software covers the income you actually receive, including self-employment, UK property, multiple properties, CIS deductions and mixed income. Coconut is built for sole traders, landlords and CIS subcontractors, so these records can stay in one account.
```

**H3** `Support if a submission is rejected`
```
Good MTD software should show the HMRC error, explain it clearly and guide you through the fix. Coconut’s MTD filing plan includes dedicated MTD support if you cannot resolve the issue yourself.
```

**H3** `Accountant access if you need it`
```
If you use an accountant, choose software that lets them work from the same digital records, reducing missing documents and back-and-forth.
```
```
With Coconut, you can work with your accountant in Coconut.
```
Hyperlink the words **"work with your accountant in Coconut"** to `https://www.getcoconut.com/features/work-with-your-accountant`

### 6.7 FAQ — replace all 8 live items with these 10

**H2** — replaces `Common questions`
```
Frequently asked questions
```

Each question becomes an **H3** inside the accordion trigger (change T6).

| # | Question (H3) | Answer |
|---|---|---|
| 1 | `What makes software officially MTD compliant?` | `MTD compliant software must help you keep digital records, prepare quarterly updates and submit information directly to HMRC through the Making Tax Digital service. It should also appear on HMRC’s recognised software list for MTD for Income Tax. Coconut is HMRC-recognised software that lets you maintain digital records, submit quarterly updates and complete your year-end tax return.` |
| 2 | `Does Coconut cover landlords with multiple properties?` | `Yes. Coconut supports landlords with multiple properties and property income streams in one account. You can track rental income and expenses, keep records organised by property, store receipts and documents, and see totals across your portfolio. When MTD applies, Coconut helps you prepare property submissions from the digital records you’ve already kept.` |
| 3 | `How do quarterly MTD updates work in practice?` | `Each quarter, you send HMRC a summary of your income and expenses for that period. It’s not a full tax return. Coconut software lets you prepare your quarterly update from the digital records in your account and send it directly to HMRC through the app. You can also see an updated tax estimate as your records change.` |
| 4 | `What happens if my MTD submission is rejected by HMRC?` | `If HMRC rejects a submission, Coconut shows the error message and helps you understand what needs fixing. In many cases, you can correct the issue in the app and try again without contacting HMRC directly. If you’re unsure what to do, Coconut’s support team can help you work through the next step.` |
| 5 | `Do I still need an accountant if I use MTD software?` | `Not always. Coconut can handle day-to-day bookkeeping, digital record keeping, quarterly updates and your year-end tax return if your tax affairs are fairly straightforward. Some people still use an accountant for complex tax planning or extra reassurance. If you already work with one, you can invite your accountant into Coconut.` — hyperlink **"invite your accountant into Coconut"** to `https://www.getcoconut.com/features/work-with-your-accountant` |
| 6 | `How does Coconut handle CIS subcontractors under MTD?` | `Coconut helps CIS subcontractors track income, expenses, CIS deductions and monthly CIS statements in one place. This is useful if you have mixed income from CIS work, private jobs, self-employment or property. Your digital records then feed into your MTD quarterly updates and year-end tax return, helping you stay organised without juggling separate systems.` |
| 7 | `Does MTD mean I have to file four tax returns a year?` | `No. This is the most common myth. Quarterly updates are running summaries of your income and expenses, and HMRC states plainly they are not tax returns. You send four short updates through the year, then submit one year-end tax return to finalise your Income Tax position by 31 January. With tidy records, it's less work than one big January push.` |
| 8 | `When do I need MTD software?` | `It depends on your qualifying income, which is your gross self-employment and property income before expenses. MTD for Income Tax applies to sole traders and landlords from 6 April 2026 if that's over £50,000, from April 2027 if it's over £30,000, and from April 2028 if it's over £20,000. Even if you're in a later wave, setting up digital records early makes the switch far easier.` |
| 9 | `How does Coconut handle multiple income streams?` | `Coconut keeps multiple income streams and multiple properties in one account, so freelance work, property income, and CIS jobs sit together rather than in separate tools. HMRC allows more than one software product but only one per submission, so keeping everything in Coconut avoids that complication. Your quarterly updates and year-end tax return draw from the same connected records.` |
| 10 | `Is Coconut HMRC-recognised, and is it secure?` | `Yes. Coconut is HMRC-recognised software for Making Tax Digital for Income Tax, so it's passed HMRC's technical recognition process. It's also FCA authorised as an Account Information Service Provider and uses bank-level security to protect your data. You can connect your bank through Open Banking with confidence and send your updates and tax return straight to HMRC.` |

**Query:** all 8 current live FAQs are replaced. Two have no equivalent in the new set — *"How experienced is Coconut with tax and MTD compliance?"* (the 60-years credibility answer) and *"Does Coconut connect directly to my bank account for MTD reporting?"*. Confirm they are intentionally dropped. See Section 9.

**Current 8 FAQs being removed, for reference:**
1. `Does Coconut offer help if my MTD submission is rejected by HMRC?`
2. `How experienced is Coconut with tax and MTD compliance?`
3. `Does Coconut connect directly to my bank account for MTD reporting?`
4. `Is Coconut officially recognised by HMRC for Making Tax Digital for Income Tax`
5. `How does Coconut actually help me comply with MTD for Income Tax?`
6. `Can I file my quarterly MTD updates directly to HMRC through Coconut?`
7. `Does Coconut replace the need for an accountant under MTD?`
8. `Does Coconut automatically create the quarterly MTD summaries HMRC needs?`

### 6.8 NEW SECTION — Closing CTA

**H2**
```
Get ready for Making Tax Digital with Coconut
```
```
Making Tax Digital is coming, but it doesn’t need to mean more admin.
```
```
With Coconut, you can keep digital records as you go, send quarterly updates to HMRC, see your tax estimate in real time and finalise your year-end tax return without the usual January scramble.
```
```
It’s HMRC-recognised MTD compliant software built for sole traders, landlords and CIS subcontractors, with support for multiple income streams in one simple app.
```

**Primary CTA button**
```
Start your 14-day free trial today
```
Destination: `https://web.getcoconut.com/signup`

**Subtext**
```
No card details required.
```

**Secondary text link**
```
See how Coconut handles MTD for your situation
```
Destination: `https://www.getcoconut.com/mtd-software`

---

## 7. Table component

Reuse the existing `.quarterly-table` component already live on `/mtd-software/landlords`. It is an HTML embed with a scoped style block and a semantic table — 2 columns with a header row, which fits both new tables exactly. No new component design needed.

**Add the CSS once** (page custom code, or site-wide if it will be reused):

```css
.quarterly-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  border: 1px solid #ccc;
  border-radius: 12px;
  overflow: hidden;
  font-size: 15px;
  font-family: sans-serif;
}
.quarterly-table th {
  padding: 14px 20px;
  border-bottom: 1px solid #e5e5e5;
  text-align: left;
  font-weight: 600;
  background: #f2f2f2;
}
.quarterly-table th:first-child { border-right: 1px solid #e5e5e5; }
.quarterly-table td {
  padding: 14px 20px;
  border-bottom: 1px solid #e5e5e5;
}
.quarterly-table tr:last-child td { border-bottom: none; }
.quarterly-table td:first-child {
  font-weight: 500;
  width: 40%;
  border-right: 1px solid #e5e5e5;
}
.quarterly-table td:last-child { color: #666; }
.quarterly-table tr:nth-child(even) { background: #f9f9f9; }
```

**Recommended tweak:** `font-family: sans-serif` does not inherit the Coconut brand font. Change to `font-family: inherit` so both tables match page typography. This also improves the existing landlords page — flag as a small visual fix rather than doing it silently.

**TABLE 1 embed — quarterly update deadlines**

```html
<table class="quarterly-table">
  <thead>
    <tr>
      <th>Update period</th>
      <th>Deadline</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>6 April to 5 July</td><td>7 August</td></tr>
    <tr><td>6 July to 5 October</td><td>7 November</td></tr>
    <tr><td>6 October to 5 January</td><td>7 February</td></tr>
    <tr><td>6 January to 5 April</td><td>7 May</td></tr>
  </tbody>
</table>
```

**TABLE 2 embed — MTD thresholds**

```html
<table class="quarterly-table">
  <thead>
    <tr>
      <th>When MTD for Income Tax applies</th>
      <th>Qualifying income</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>From 6 April 2026</td><td>Over &pound;50,000</td></tr>
    <tr><td>From 6 April 2027</td><td>Over &pound;30,000</td></tr>
    <tr><td>From 6 April 2028</td><td>Over &pound;20,000</td></tr>
  </tbody>
</table>
```

**Field-layout caveat:** Webflow Rich Text fields will not accept raw table markup. If both tables sit inside a single `Long-form body` field this will not work. Simplest fix: split `Long-form body` into `Body part 1` … `Body part 4` and place the two table embeds between them in the template. Confirm the field layout at build time.

**Mobile:** both tables are 2-column and short, so they should hold at 375px. Verify — add `overflow-x: auto` on a wrapper if the threshold table's longer header wraps badly.

---

## 8. Links and CTAs — full inventory

| Where | Anchor text | Destination | New? |
|---|---|---|---|
| Hero primary button | `Start your 14-day free trial` | `https://web.getcoconut.com/signup` | existing |
| Hero secondary text link | `See how Coconut handles MTD for your situation` | `https://www.getcoconut.com/mtd-software` | **new** |
| 6.3 body | `bridging software` | *pending — Section 9* | **new** |
| 6.4 Landlords | `MTD for landlords` | `https://www.getcoconut.com/mtd-software/landlords` | **new** |
| 6.4 CIS | `MTD software for CIS subcontractors` | *pending — Section 9* | **new** |
| 6.5 Multiple income streams | `work with your accountant in Coconut` | `https://www.getcoconut.com/features/work-with-your-accountant` | **new** |
| 6.5 Mid-page CTA | `See how Coconut handles MTD for your situation` | `https://www.getcoconut.com/mtd-software` | **new** |
| 6.6 HMRC recognition | `Check Coconut on the official HMRC software list` | `https://www.tax.service.gov.uk/find-making-tax-digital-income-tax-software/product-details?productId=3150` | **new**, external, `_blank` + `noopener` |
| 6.6 Accountant access | `work with your accountant in Coconut` | `https://www.getcoconut.com/features/work-with-your-accountant` | **new** |
| FAQ 5 | `invite your accountant into Coconut` | `https://www.getcoconut.com/features/work-with-your-accountant` | **new** |
| 6.8 Closing button | `Start your 14-day free trial today` | `https://web.getcoconut.com/signup` | **new** |
| 6.8 Closing secondary | `See how Coconut handles MTD for your situation` | `https://www.getcoconut.com/mtd-software` | **new** |

The site preserves UTM params across navigation via `projects/coconut/snippets/thetimes-utm.js`. Confirm the new internal links do not break that attribution chain — there is prior history here (Trello card "Query string ref").

---

## 9. Open questions for the client

| # | Question | Why it matters | Suggested default |
|---|---|---|---|
| Q1 | **"Coconut" vs "!Coconut".** The deck writes plain `Coconut` throughout; the live site renders `!Coconut` as the brand mark in almost all body copy. | Applying the deck verbatim would drop the brand styling across the whole page and make it inconsistent with the other 7 feature pages. | Ask before pasting. This is the single biggest copy decision and it affects every block in Section 6. |
| Q2 | **Bridging software link** (6.3) — Jehan Ranasinghe: *"These will link to the relevant pages when they are uploaded"*. | `/mtd-software/bridging-software` already exists and is live. | Link it now unless told otherwise. |
| Q3 | **CIS guide link** (6.4) — same comment. | `/mtd-software/cis-subcontractors` already exists and is live. | Link it now unless told otherwise. |
| Q4 | **Dropped FAQs.** The 60-years experience answer and the Open Banking answer disappear. | Both are trust/credibility content; the 60-years claim appears nowhere else on the page. | Confirm intentional. |
| Q5 | **Heading-level change on shared template elements (T5, T6).** | Improves semantics on all 8 feature pages, but it is a change to 7 pages nobody explicitly asked about. | Proceed — semantically correct everywhere — but tell the client it is happening. |
| Q6 | **Hero intro length.** Four paragraphs vs the current one. | May force a hero redesign or push the CTA below the fold on mobile. | Design review at build time; consider moving paragraphs 3–4 below the CTA. |
| Q7 | **Persona cards hidden on this page.** | Confirmed decision, but worth a visual check that the page does not feel like it is missing a section between the feature blocks and the new long-form content. | Review in staging. |

---

## 10. SEO and schema notes

- **FAQPage schema.** The page has 10 new FAQs. Coconut already has a FAQ schema pattern at `projects/coconut/schema/pricing-faq.html`. Generate a matching `FAQPage` JSON-LD block for the 10 new questions and add it to the page. Existing FAQ schema for the old 9 questions must be removed or it will contradict the visible content.
- **BreadcrumbList.** Pattern exists at `projects/coconut/schema/accountant-software-breadcrumb.html`. The page already renders a `Home / Features / …` breadcrumb; confirm the JSON-LD matches the new H1.
- **Heading outline** after the rework: one H1, then H2 section heads, then H3 sub-heads — clean and extractable. This is a meaningful AEO improvement, as the 10 FAQ questions become real headings for the first time.
- **Internal linking** gains 4 new outbound internal links (landlords, accountant ×3, MTD hub ×3), strengthening the MTD cluster.
- **Title tag duplication** — fix the doubled ` | Coconut` suffix noted in 6.0.
- `projects/coconut/llms.txt` exists; consider adding the reworked page if it is not already listed.

---

## 11. Build order

| # | Task | Agent / owner | Depends on |
|---|---|---|---|
| 1 | Resolve Q1 (Coconut vs !Coconut) and Q2–Q4 with client | pm / Will | — |
| 2 | Add new fields to Features CMS collection (Section 4) | Webflow Designer (manual) | 1 |
| 3 | Template changes T1–T4, T7 — new conditional sections | Webflow Designer (manual) | 2 |
| 4 | Template changes T5, T6 — heading level swaps | Webflow Designer (manual) | 2 |
| 5 | Add `.quarterly-table` CSS + two table embeds (T8) | Webflow Designer (manual) | 3 |
| 6 | Populate hero, feature blocks, long-form body, closing section | Content (manual, verbatim) | 3, 5 |
| 7 | Rebuild FAQ list — remove 9, add 10 | Content (manual, verbatim) | 4 |
| 8 | Update meta title + description | seo | 2 |
| 9 | Generate FAQPage JSON-LD for the 10 new FAQs; remove old | schema | 7 |
| 10 | Verify accordion IX2 still fires after div→H3 swap | qa | 4, 7 |
| 11 | Regression-check the other 7 feature pages | qa | 3, 4 |
| 12 | Run acceptance tests against staging | qa | 6, 7 |

**Parallelisation map**

- **Stream A (sequential, gating):** tasks 1 → 2 → 3 → 5. All manual Designer work, single operator, cannot be parallelised.
- **Stream B (parallel with A after task 2):** task 8 (meta) — independent.
- **Stream C (parallel after task 7):** task 9 (schema generation) — can be drafted before the build lands.
- **Stream D (parallel after task 3/4):** tasks 10, 11 (QA) — independent of content population.
- **Recommendation: sequential, no worktrees, no agent teams.** The bottleneck is manual Webflow Designer work by one person. Only the schema and meta tasks are genuinely parallel, and they are small. Worktrees add nothing here because there is no repo code to change — the only repo artifacts are this spec, the schema file and the acceptance test.

---

## 12. Barba impact

**N/A — no Barba transitions.** Coconut is a standard Webflow site with no SPA router. The only JS on the page is Webflow IX2 (accordion), the cookie banner, GTM/GA4, and the site's UTM-preservation snippet. The one JS-adjacent risk is change T6 (FAQ `div` → `h3`), which must not break the IX2 accordion binding — covered by task 10 and by the acceptance tests.

---

## 13. Verify Loop

### Pass/fail criteria

**DOM assertions**
- Exactly one `h1`, text is `MTD Compliant Software: how Coconut handles it`
- Page contains all 5 new H2s: `What does it actually mean to be MTD compliant?`, `Who needs MTD compliant software, and when?`, `How Coconut meets each MTD compliance requirement`, `What to look for in MTD software`, `Frequently asked questions`, plus `Get ready for Making Tax Digital with Coconut`
- The 8 feature-block headings render as `h3`, not `h2`
- Exactly 2 `table.quarterly-table` elements; table 1 has 4 body rows, table 2 has 3
- FAQ accordion contains 10 items; every question renders as an `h3`
- Text `MTD software for:` is **absent** (persona cards hidden)
- Old H1 `Making Tax Digital for Income Tax made simple` is absent
- Old FAQ text `How experienced is` is absent
- Hero contains a link to `/mtd-software` positioned after the signup button
- Link to `/mtd-software/landlords` present
- At least 3 links to `/features/work-with-your-accountant` present
- HMRC external link present with `target="_blank"`
- Meta title is exactly `MTD Compliant Software | Making Tax Digital | Coconut`
- Meta description matches Section 6.0

**Console state**
- No `pageerror` events on load
- No console errors on load or after opening every FAQ item

**Interaction**
- Clicking each FAQ trigger expands its answer (guards against the T6 `div` → `h3` swap breaking IX2)

**Regression**
- `/features/scan-receipts` still renders its persona cards (`MTD software for:` present)
- `/features/scan-receipts` has no `Long-form body` output and no stray empty sections
- All 8 feature pages: single H1, no console errors

### Reproduction steps

1. Go to `https://getcoconut.webflow.io/features/mtd-compliant-software` (staging)
2. Wait for `readyState === 'complete'` + 1.5s for IX2
3. Assert the DOM criteria above
4. Click each of the 10 FAQ triggers, waiting 400ms between, assert each answer becomes visible
5. Resize to 375×812, assert both tables fit without horizontal page scroll
6. Repeat steps 1–3 for `/features/scan-receipts` as the regression control

### Tier mapping

**Tier 1 — Auto, Playwright local** (`tests/acceptance/coconut-mtd-compliant-software-page-rework.spec.js`)
- heading structure, section presence, table structure, FAQ count and heading level
- persona cards hidden, old copy removed
- link inventory, meta title/description
- no console errors, FAQ accordion interaction
- regression control page

**Tier 2 — Auto, CDN regression** — registered in `tests/registry.json` as `coconut-mtd-compliant-software-page-rework`; runs on `/deploy`.

**Tier 3 — Manual** (cannot be automated, with reasons)
- **Copy fidelity character-by-character** — automated tests check key strings, not every apostrophe. A human must diff the deck against the live page, especially the Q1 Coconut/!Coconut decision.
- **Hero layout with 4 paragraphs** — whether the CTA falls below the fold on real devices is a visual judgement.
- **Table typography** after the `font-family: inherit` change — subjective brand match.
- **Cross-browser** — Playwright runs Chromium only; check Safari and Firefox, particularly the table `border-radius` + `overflow: hidden` combination which renders inconsistently in Safari.
- **iOS Safari** — table rendering and accordion tap targets on a real device.
- **Webflow Editor check** — confirm the client can still edit the new Rich Text fields without breaking the table embeds.

### Regression scope — what must not break

- The other **7 feature pages** must render unchanged: persona cards present, no empty conditional sections, no layout shift from the H2→H3 change
- The FAQ accordion IX2 interaction on all feature pages after the `div` → `h3` swap
- Breadcrumb and "More fantastic features" CMS lists still bind correctly
- UTM preservation across the new internal links
- Existing FAQ schema must not contradict the new visible FAQ content

---

## 14. Acceptance Tests

File: `tests/acceptance/coconut-mtd-compliant-software-page-rework.spec.js`

| Test | Asserts |
|---|---|
| `hero H1 matches new copy` | single H1, exact new text |
| `old H1 is gone` | old hero copy absent |
| `hero eyebrow trust strip is present` | eyebrow string renders |
| `hero has secondary text link to /mtd-software` | link present, not a button |
| `hero shows all four trust badges` | 4 badge strings |
| `all five new section H2s are present` | each new H2 renders |
| `feature blocks render as h3` | 8 feature headings at h3 |
| `both quarterly tables render` | 2 `table.quarterly-table`, correct row counts |
| `threshold table contains correct values` | 2026/50,000, 2027/30,000, 2028/20,000 |
| `deadline table contains correct values` | 4 period/deadline pairs |
| `persona cards are hidden on this page` | `MTD software for:` absent |
| `FAQ has ten items` | 10 accordion items |
| `FAQ questions render as h3` | every question is an h3 |
| `old FAQ content is gone` | dropped questions absent |
| `each FAQ item expands on click` | all 10 toggle open |
| `closing section renders with CTA` | H2, button, subtext, secondary link |
| `link inventory is correct` | landlords, accountant ×3, mtd-software ×3, HMRC external |
| `HMRC link opens in new tab` | `target="_blank"`, `rel` contains `noopener` |
| `meta title and description match spec` | exact strings, single ` | Coconut` suffix |
| `no console errors on load` | zero pageerror |
| `tables fit at 375px` | no horizontal page overflow |
| `REGRESSION: scan-receipts still has persona cards` | control page unchanged |
| `REGRESSION: scan-receipts has no console errors` | control page clean |

Tests target staging (`https://getcoconut.webflow.io`) and are written to fail until the build lands.

---

## 15. Files

| Path | Purpose |
|---|---|
| `projects/coconut/.claude/specs/mtd-compliant-software-page-rework.md` | This spec |
| `tests/acceptance/coconut-mtd-compliant-software-page-rework.spec.js` | Tier 1 + Tier 2 tests |
| `tests/registry.json` | Regression registry entry |
| `projects/coconut/schema/` | Destination for the new FAQPage JSON-LD (task 9) |

**Source deck:** `AG_Coconut_-_Service_page_-_MTD_Compliant_Software_(July_2026)_(condensed).docx`
