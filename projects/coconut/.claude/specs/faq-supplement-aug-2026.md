# Spec — Supplementary FAQ content (August 2026)

**Client:** Coconut
**Slug:** `faq-supplement-aug-2026`
**Date:** 2026-08-31
**Trello:** [Content to review: New FAQ content](https://trello.com/c/fybs39W2/140-content-to-review-new-faq-content)
**I-COM ref:** GETCOCO-105
**Source of truth:** `Coconut - Supplementary FAQ content (August 2026) (REVISED).docx`
(local copy: `.claude/research/faq-aug-2026/revised.docx`, SHA256 `bd657a55…b9dc` — byte-identical to the Trello attachment)

---

## Context

Jehan Ranasinghe (I-COM) wrote supplementary FAQ content for seven key landing pages in line with the SEO recommendations. Anna Guilford reviewed it, Jehan revised it (his changes highlighted yellow in the REVISED doc), and Anna approved that version on 25 Aug.

On 27 Aug Anna confirmed, in answer to a direct question on the card, that these FAQs are to be added **in addition to** the questions already on each page — they do not replace anything.

**Goal:** publish 17 approved FAQ answers across 7 landing pages, matching each page's existing FAQ pattern, without disturbing existing content or layout.

## Decisions taken (2026-08-31)

| # | Decision | Choice |
|---|---|---|
| 1 | Static-page mechanism | Drive the Webflow **Designer MCP** with an open Designer session |
| 2 | FAQPage schema | **Out of scope** — logged as a follow-up, not added here |
| 3 | Brand mark | Plain **"Coconut"** exactly as Anna approved (not `!Coconut`) |
| 4 | Overlapping questions | **Add and merge**, then produce a merge report for Anna to check |

---

## Architecture — two mechanisms, confirmed

The seven pages split into two genuinely different jobs. This was verified against the live site and the Webflow Data API.

> **Correction (2026-08-31, found by the acceptance tests).** "`/features/*` is CMS-driven" holds for `tax-help-support` but **not** for `mtd-compliant-software`. The features template carries **two** FAQ sections and shows one per item:
>
> - `Section [25 Features Innerpage FAQ Section]` → a `DynamoList` bound to `common-questions`. Used by `tax-help-support` and the other feature pages.
> - `Section [25 HMRC FAQ Section, is-white]` → a **static** accordion, rendered only for the item with `new-layout: true`, which today is only `mtd-compliant-software`. Its FAQ was rebuilt this way in the August page rework.
>
> So on `mtd-compliant-software` the `common-questions` reference **renders nowhere** — not even its existing 8 entries. Verified: `/features/scan-receipts` contains no `_25-hmrc-faq-section` at all, so edits to that static section cannot leak onto the other feature pages. Its questions are `<h3 class="heading-style-h6">`, not `div._25-collapse-title`.

### A. CMS pages (1) — `/features/tax-help-support`

`/features/*` are **CMS item pages** from the **25 New Features** collection (`683ebf9571fba472b081c90d`), not static pages.

That collection has a MultiReference field:

- **`common-questions`** → FAQs collection (`65afe5d79038933a4ba8d15c`)
- Help text: *"Displayed in the order that you add them here."*

So the workflow is: **create FAQ items → append their IDs to the feature item's `common-questions` array.** Order is controlled by array position, so appending puts new questions at the bottom, which is exactly what "in addition to" requires. **Fully achievable over the Data API — no Designer session needed.**

FAQs collection fields used:

| Field | Slug | Type | Note |
|---|---|---|---|
| Question | `name` | PlainText | **max 256 chars** — all 17 are within this |
| Answer | `answer` | RichText | paragraphs as `<p>` |
| Slug | `slug` | PlainText | required, must be unique |

> The collection's many `featured-on-*` Switch fields are a **separate** mechanism used by the homepage/pricing-style pages. They are **not** how `/features/*` selects its FAQs, and must not be toggled for this task.

### B. Static pages (5)

Hand-built accordions in the Designer. Structure confirmed from the live DOM:

```
section._25-hmrc-faq-section.is-white
└ .max-width-1248 (w-container)
  └ .w-layout-grid._25-when-do-i-need-to-comply-faq-section-grid
    ├ img._25-hmrc-section-grid-image
    └ div
      ├ h2._25-heading-5           ← section heading
      └ div._25-collapse-item  × n ← duplicate this block per new FAQ
```

The block to duplicate:

```html
<div class="_25-collapse-item">
  <div class="_25-collapse-trigger">
    <a aria-label="Toggle answer" href="#" class="_25-collapse-item-plus-icon w-inline-block">
      <div class="_25-collapse-item-plus-icon-line"></div>
      <div class="_25-collapse-item-plus-icon-line rotate"></div>
    </a>
    <div class="_25-collapse-title">QUESTION TEXT</div>
  </div>
  <div class="_25-collapse-text-content w-richtext">
    <p>ANSWER PARAGRAPH</p>
  </div>
</div>
```

Only two elements carry content: `._25-collapse-title` (question) and `._25-collapse-text-content` (answer rich text). Everything else is chrome and must be copied verbatim so the open/close interaction keeps working.

`/features/mtd-compliant-software` uses grid class `_25-when-do-i-need-to-comply-faq-section-grid`; `/features/tax-help-support` uses `_25-features-innerpage-faq-section-grid`. Both are CMS-driven, so this is informational only.

---

## Scope

| # | Page | Mechanism | New | Merged | Existing | Section heading |
|---|---|---|---|---|---|---|
| 1 | `/features/tax-help-support` | CMS | 2 | 0 | 9 | Common questions |
| 2 | `/features/mtd-compliant-software` | **Static** | 2 | 1 | 10 | Frequently Asked Questions |
| 3 | `/free-making-tax-digital-software` | Static | 1 | 1 | 8 | *(no visible h2)* |
| 4 | `/mtd-software` | Static | 2 | 0 | 6 | Our most frequently asked questions |
| 5 | `/mtd-software/bridging-software` | Static | 3 | 0 | 11 | MTD bridging software FAQs |
| 6 | `/mtd-software/sole-traders` | Static | 3 | 0 | 9 | Frequently Asked Questions |
| 7 | `/mtd-software/landlords` | Static | 1 | 1 | 12 | Frequently Asked Questions |
| | **Total** | | **15** | **2** | | |

15 net-new entries + 2 merged into existing answers = all 17 approved FAQs accounted for.

**Webflow IDs**

| Page | ID |
|---|---|
| Site | `6069af2a39978132d0155fd7` |
| FAQs collection | `65afe5d79038933a4ba8d15c` |
| 25 New Features collection | `683ebf9571fba472b081c90d` |
| Feature item — `tax-help-support` | `6989e5c0148e0f7f2d2b0e44` |
| Feature item — `mtd-compliant-software` | `6960ebc2f28cea4d0560c493` |
| Static page — `free-making-tax-digital-software` | `68b6c61e0b8bfa3295464b61` |
| Static page — `mtd-software` | `686d341bc775236fb65fcfe7` |
| Static page — `bridging-software` | `6a44cca14924c8af0a0a5065` |
| Static page — `sole-traders` | `69c2784e0b860803a1919a88` |
| Static page — `landlords` | `69d652945a7b73c515efc5cd` |

> **Careful:** there are two live sole-trader pages — `/mtd-software/sole-traders` (`69c2784e…`, in scope) and `/sole-traders` (`69ba97a9…`, **not** in scope). The doc specifies `/mtd-software/sole-traders`. There are also draft `-v2` and `/archive/` variants that must not be touched.

---

## Content to publish

Copy is reproduced exactly as approved. Brand written as plain "Coconut" per decision 3.

### 1. `/features/tax-help-support` — CMS, append 2

**Q1. Is support included in my plan and during the free trial?**

> Yes. Coconut gives you access to expert MTD support from the point you get started, including during the 14-day free trial. The UK-based team can help with bookkeeping, Making Tax Digital and using the software. There's also AI support for common questions outside normal support hours.
>
> Expert MTD support is included whichever Coconut plan you're on, including the MTD Bridging plan.
>
> [Learn more here](/pricing) about what to expect from each pricing tier.

**Q2. Can Coconut support help me switch from spreadsheets or another provider?**

> Yes. If you already use spreadsheets, you don't necessarily need to start again: Coconut's bridging software is designed to let you keep your existing spreadsheet-based records and connect them to the MTD submission process.
>
> You can also switch to Coconut from another MTD provider. You'll need to make sure your records are up to date and ready to use in Coconut, and the support team can help with setup and using the software.

### 2. `/features/mtd-compliant-software` — CMS, append 3

**Q1. Can I manage multiple income streams, such as self-employment and property, in one account?**

> Yes. Coconut lets you manage multiple income streams in one account, including self-employment and UK property income.
>
> You can keep the income and expenses for each stream properly organised while still getting an overall view of your finances. That's particularly useful under MTD, as different income streams may need to be reported separately even though you manage them through the same Coconut account.

**Q2. Does Coconut show my tax bill in real time as I go?**

> Coconut gives you an up-to-date tax estimate as your income and expenses change, helping you see how your tax position is shaping up during the year rather than having to wait until January.
>
> It's worth remembering that this is a planning estimate, not your final tax bill. Coconut bases it on the actual profit you've recorded so far and doesn't try to predict what you'll earn during the rest of the tax year.

**Q3. How does Coconut keep my financial data secure?**

> Coconut uses bank-level encryption to protect your data and takes a "secure by design" approach to its systems.
>
> Financial data is encrypted both when it's stored and when it's being transferred, while Coconut also uses measures including restricted system access, intrusion detection and independent security testing. Bank connections use regulated, read-only Open Banking, so Coconut can view the transaction information you authorise without having access to move your money.

### 3. `/free-making-tax-digital-software` — static, 1 new + 1 merge

**MERGE — into existing "What's included free vs paid?"** (see Merge Plan)

**Q1 (new). What happens to my records if I don't continue paying?**

> If your subscription ends and you don't renew, Coconut's features will stop working, but you'll still be able to view your historical records, including invoices and other stored data.
>
> Your data remains safe and available, and you can still request an export if you need one. To use Coconut's tax features again — including for work relating to a previous tax year — you'll need to renew your subscription.

### 4. `/mtd-software` — static, append 2

**Q1. How does Coconut connect to my bank, and is Open Banking safe?**

> Coconut connects to your bank securely using Open Banking. You choose which accounts to connect and authorise the connection through your bank — you don't give Coconut your online banking password.
>
> The connection is read-only, which means Coconut can import your account information and transactions but can't move or access your money. Coconut is registered with the FCA as an Account Information Service Provider and uses FCA-authorised TrueLayer for its bank connections. Your information is also protected using bank-level encryption.

**Q2. Will Coconut tell me how much tax and National Insurance I owe during the year?**

> Coconut gives you an ongoing estimate of your Income Tax and National Insurance, based on the income and expenses you've recorded so far.
>
> That means you can get a clearer idea of what you may need to set aside as the year goes on, instead of waiting until your tax return is due. It's an estimate rather than your final HMRC bill, and it updates as your figures change.

### 5. `/mtd-software/bridging-software` — static, append 3

**Q1. Do I have to use Coconut's spreadsheet template, or can I use my own?**

> You can keep using your existing bookkeeping spreadsheet. You don't have to move all your records into a new accounting system.
>
> For your MTD submission, you'll need to use the relevant Coconut bridging template. You can add Coconut's template as the first sheet in your existing spreadsheet, then use formulas or cell links to pull the figures across from your bookkeeping data. This keeps the digital link required for MTD intact. You can download Coconut's bridging templates from the [Help Centre](https://help.getcoconut.com/en/).
>
> Don't copy, paste or retype figures into the template. HMRC requires an unbroken digital link, so the figures should flow into the Coconut template digitally.

**Q2. Does the bridging plan cover both quarterly updates and the year-end declaration?**

> The standard MTD Bridging plan covers your quarterly MTD updates. If you also want to complete your MTD Annual Submission, or Year-End Declaration, through Coconut, you can add this separately for £49.99 when you need it.
>
> If you'd prefer a plan where the annual submission is already included, Coconut's full MTD Filing plan includes both quarterly updates and the MTD Annual Submission.
>
> [See what's included in each pricing tier](/pricing).

**Q3. Is bridging software suitable for landlords?**

> Yes. Coconut's MTD bridging software supports UK property income as well as self-employment income, so it can be a good fit if you're a landlord who already keeps clear digital records in a spreadsheet.
>
> It's particularly suited to people who are comfortable managing their own records and mainly need a straightforward way to connect those records to HMRC for MTD submissions.
>
> [Read more about the benefits that Coconut delivers for landlords](/mtd-software/landlords).

### 6. `/mtd-software/sole-traders` — static, append 3

**Q1. Can Coconut import my income and expenses automatically?**

> Yes. Connect your bank account securely through Open Banking and Coconut can pull your transactions in automatically, so you don't need to type them in one by one.
>
> From there, Coconut helps you categorise business income and expenses and keep your records organised. You can also create rules for recurring transactions, so transactions from the same merchant can be categorised automatically in future.

**Q2. How does Coconut estimate my Income Tax and National Insurance as I go?**

> Coconut uses the income and expenses you've recorded to give you a running estimate of the Income Tax and National Insurance you may need to pay.
>
> The estimate is based on the actual profit recorded in Coconut so far in the tax year rather than trying to predict what you'll earn later. You can also personalise your tax profile with information such as PAYE income, property income, student loan repayments and changes to your Personal Allowance to make the estimate more useful.
>
> It's there to help you plan ahead rather than replace your final tax calculation.

**Q3. I run more than one business. Can Coconut handle multiple sole-trader businesses?**

> Yes. Coconut uses income streams to help you manage more than one self-employed business in the same account.
>
> You can create a separate income stream for each business and assign the relevant income and expenses to it, making it easier to see and report the figures for each business separately. Under MTD, separate businesses may also have their own reporting obligations, so keeping them properly organised matters.

### 7. `/mtd-software/landlords` — static, 1 new + 1 merge

**MERGE — into existing "Can I track multiple properties in Coconut?"** (see Merge Plan)

**Q1 (new). Which landlord/property expenses can I claim, and does Coconut categorise them?**

> Coconut helps you categorise common property costs such as repairs, insurance and letting agent fees, and can highlight expenses that you may be able to claim.
>
> Whether a particular cost is allowable will depend on the expense and your circumstances, so categorising something in Coconut doesn't automatically mean it qualifies for tax relief. The aim is to keep your property records organised so it's much easier to identify and report the right expenses.

---

## Merge plan (decision 4)

Two of the 17 approved questions substantially overlap a question already on the page. Per decision 4 these are merged into the existing entry rather than added as a second, near-identical accordion. **Both merges keep the existing question wording** — those headings are already live and indexed — and upgrade only the answer.

Every merge must be reported back to Anna, because merging edits copy she previously signed off. See `## Merge report` deliverable.

### Merge A — `/mtd-software/landlords`

- **Existing question (kept):** "Can I track multiple properties in Coconut?"
- **New question (folded in, not added):** "Can Coconut track income and expenses separately for each property?"
- **Why:** same user question. The existing answer is thin and generic; the new copy is materially better (names income streams, per-property assignment, portfolio totals).

**Existing answer (before):**

> Yes. Coconut can help you keep rental income and expenses organised if you have more than one property.
>
> This makes it easier to manage your property income in one place, instead of keeping separate spreadsheets or trying to piece everything together at the end of the tax year.

**Merged answer (after):**

> Yes. You can use Coconut's income streams to organise different properties and assign the relevant transactions to each one. This lets you keep rental income and property expenses organised by property while still managing everything through one Coconut account.
>
> For landlords with more than one property, Coconut can also provide automatic totals across your portfolio.
>
> This makes it easier to manage your property income in one place, instead of keeping separate spreadsheets or trying to piece everything together at the end of the tax year.

Net effect: new paragraphs 1–2 replace the vague original opener; the original closing paragraph is preserved.

### Merge B — `/free-making-tax-digital-software`

- **Existing question (kept):** "What's included free vs paid?"
- **New question (folded in, not added):** "On the free options, can I actually submit MTD updates or just do bookkeeping?"
- **Why:** the existing answer **already answers the new question** — it states the trial can't submit MTD updates or file Self Assessment and that the Zempler offer unlocks them. Adding the new FAQ verbatim would put near-duplicate content on the same page, which works against the SEO goal the content was written for. The new copy adds two genuine details: what the trial *does* include (tracking income/expenses, digital records) and that the Zempler offer is **two years**.

**Existing answer (before):**

> The free options give you a way to try Coconut, or access Coconut for longer through the Zempler offer if you're eligible.
>
> On the 14-day free trial, you won't be able to submit MTD updates or file a Self Assessment, but all of these features will be fully accessible through the Zempler offer.

**Merged answer (after):**

> The free options give you a way to try Coconut, or access Coconut for longer through the Zempler offer if you're eligible.
>
> With Coconut's 14-day free trial, you can explore the bookkeeping and MTD features, including tracking income and expenses and keeping digital records, but you can't submit MTD updates or file a Self Assessment during the trial.
>
> If you qualify for the two-year Zempler offer, the MTD and Self Assessment features are fully available, so you can submit your MTD updates through Coconut as well as use the bookkeeping tools for free.

Net effect: original opener kept; the second paragraph is expanded into two richer paragraphs.

---

## Links to set

The approved copy contains four link phrases with no target specified in the doc. Targets resolved from the live site:

| Page | Anchor text | Target |
|---|---|---|
| tax-help-support Q1 | "Learn more here" | `/pricing` |
| bridging Q1 | "Help Centre" | `https://help.getcoconut.com/en/` |
| bridging Q2 | "See what's included in each pricing tier" | `/pricing` |
| bridging Q3 | "Read more about the benefits that Coconut delivers for landlords" | `/mtd-software/landlords` |

Internal links relative, external Help Centre link `target="_blank" rel="noopener"` to match site convention.

---

## Task breakdown

| # | Task | Agent | Depends on | Notes |
|---|---|---|---|---|
| T1 | Create 5 FAQ CMS items (2 tax-help-support + 3 mtd-compliant-software) | content | — | Data API; unique slugs; answer as RichText |
| T2 | Append item IDs to `common-questions` on both feature items | code-writer | T1 | **Read-modify-write**: fetch current array, append, PUT full array |
| T3 | Publish the 5 new FAQ items + both feature items | code-writer | T2 | `publish_collection_items` |
| T4 | `/mtd-software` — add 2 accordion blocks | code-writer | Designer session | Designer MCP |
| T5 | `/mtd-software/bridging-software` — add 3 blocks + 3 links | code-writer | Designer session | |
| T6 | `/mtd-software/sole-traders` — add 3 blocks | code-writer | Designer session | |
| T7 | `/mtd-software/landlords` — add 1 block + apply Merge A | code-writer | Designer session | edits one existing answer |
| T8 | `/free-making-tax-digital-software` — add 1 block + apply Merge B | code-writer | Designer session | edits one existing answer |
| T9 | Publish site (all 4 domains) | code-writer | T3–T8 | **user-gated, see Risks** |
| T10 | Write merge report for Anna | content | T7, T8 | `.claude/reports/` |
| T11 | Post completion comment to Trello card | content | T9, T10 | user-gated |

### Parallelisation map

**Stream A (API — no Designer needed):** T1 → T2 → T3
**Stream B (Designer — needs an open, foregrounded session):** T4, T5, T6, T7, T8

Streams A and B are fully independent and can run simultaneously — different mechanisms, different pages, no shared state. Within Stream B the five pages are independent of each other, but they **must run sequentially** because the Designer MCP drives a single session that can only have one page open at a time. T9 gates on both streams.

- **Worktrees:** no — the deliverable is Webflow content, not repo code. Only the spec, report and test live in git.
- **Agent teams:** no. Stream B is inherently serial on one Designer session; Stream A is ~5 API calls. Spawning parallel agents would add coordination cost for no gain.
- **Recommendation:** single executor, run Stream A first (it's fast and unblocks nothing), then Stream B page by page.

---

## Barba impact

**N/A — no Barba transitions.** Coconut is a stock Webflow site with no Barba.js page-transition layer (`shared/` orchestrator is not loaded here; the only custom snippets are `thetimes-utm.js` and `times-cookie-overwrite.js`, neither of which touches routing). This change adds no DOM elements outside the existing FAQ section, no event listeners, no GSAP timelines and no ScrollTrigger instances — the accordion behaviour is native Webflow interactions, which re-bind on normal page load.

---

## Verify Loop

### Pass/fail criteria

1. **Presence** — each of the 15 net-new question strings appears exactly once in the rendered HTML of its target page.
2. **No duplicates** — no question string appears twice on any page (guards against a double-paste in the Designer, the most likely manual error).
3. **Counts match** — visible `._25-collapse-item` count per static page equals `existing + new`:
   - `/mtd-software` 6 → 8 · `/bridging-software` 11 → 14 · `/sole-traders` 9 → 12 · `/landlords` 12 → 13 · `/free-making-tax-digital-software` 8 → 9

   > Counts are taken from the Webflow Designer element tree, which is authoritative. An earlier estimate scraped from rendered HTML read 9 existing items on `/free-making-tax-digital-software`; that regex had picked up two question-shaped headings ("Want !Coconut for free for 2 years?", "Ready to make MTD simple?") that are not FAQ entries. The real count is 8.
4. **CMS order** — on both `/features/*` pages the new questions render **last**, confirming append-not-prepend.
5. **Merges applied** — both merged answers contain their new sentences, and the two folded-in question strings appear **nowhere** on their page.
6. **Accordion works** — clicking `._25-collapse-trigger` on a new item expands `._25-collapse-text-content`.
7. **Links resolve** — all 4 new links return 200, no redirect chain.
8. **No console errors** on all 7 pages.
9. **No regression** — every pre-existing question string still present (captured baseline: `.claude/research/faq-aug-2026/`).

### Reproduction steps

1. Publish the site.
2. Hard-load each of the 7 URLs on `www.getcoconut.com`.
3. Scroll to the FAQ section (`section._25-hmrc-faq-section`, or `._25-features-innerpage-faq-section` on tax-help-support).
4. Expand each newly added item.
5. Wait ~500 ms for the Webflow interaction to settle before asserting height/visibility.

### Tier mapping

**Tier 1 — Auto (Playwright, local):** `tests/acceptance/faq-supplement-aug-2026.spec.js` — covers criteria 1, 2, 3, 4, 5, 7, 8, 9.
**Tier 2 — CDN regression:** registered in `tests/registry.json` as `faq-supplement-aug-2026`; re-runs on future deploys to catch a later edit silently dropping an FAQ.
**Tier 3 — Manual:**
- Criterion 6 (accordion expand *feel*) — Playwright asserts the class/height change, but smooth-open easing is subjective.
- Safari/Firefox rendering of the expanded rich text — Playwright runs Chromium only.
- Mobile (375px) — check long questions don't overflow the collapse title, since three new questions are notably longer than the existing ones.
- Editorial read-through in context — that the new answers don't contradict the copy above them on the page.

### Regression scope

Must not break: existing FAQ items on all 7 pages (content and order); the Webflow accordion interaction; the `common-questions` ordering on the two feature items (a careless PUT could reorder or drop existing refs — always read-modify-write); other pages sharing the FAQs collection — `/features/*` items share FAQ records, so **create new items, never edit existing ones**, since an edit would propagate to every feature page referencing it.

---

## Acceptance Tests

File: `tests/acceptance/faq-supplement-aug-2026.spec.js`

| Test | Asserts |
|---|---|
| `each page exposes its FAQ section` | FAQ container present on all 7 URLs |
| `all 15 new questions are present` | each new question string found on its page |
| `no question appears twice on a page` | duplicate guard across all 7 |
| `static pages have the expected FAQ item count` | `._25-collapse-item` counts per criterion 3 |
| `CMS pages render new questions last` | new questions are the final entries on `/features/*` |
| `merged answers contain the new copy` | merged sentences present on landlords + free-MTD |
| `folded-in questions do not appear as separate items` | the 2 merged question strings absent |
| `pre-existing questions are all still present` | baseline regression |
| `new links resolve` | 4 links return 200 |
| `no console errors` | zero `pageerror` / `console.error` per page |

> `prefers-reduced-motion` test intentionally omitted: this change adds no animation. The accordion is pre-existing native Webflow interaction, untouched.

Tests run against `STAGING_URL` (default `https://www.getcoconut.com`). Coconut has no project-local `.env.test`; the monorepo root has Playwright and `tests/registry.json`, so the test lives at root and takes the base URL from env with a live-site default.

---

## Risks

| Risk | Mitigation |
|---|---|
| **Publishing pushes unrelated staged changes live.** The Coconut site had unpublished changes flagged before (Trello "Unpublished changes"). Publishing for this task would also publish anything else sitting in the Designer. | **T9 is user-gated.** Check for pending unrelated changes and confirm with Will before publishing. Never auto-publish. |
| Editing a shared FAQ CMS item would change other feature pages | Create new items only; never edit existing FAQ records |
| A naive PUT drops existing `common-questions` refs | Read-modify-write the full array; assert length grows by exactly 2 / 3 |
| Wrong sole-traders page edited | Page ID `69c2784e…` (`/mtd-software/sole-traders`) only; `/sole-traders`, `-v2` and `/archive/` variants are out of scope |
| Designer session drops mid-run | Re-open the Designer link, re-verify the last page's item count before continuing |
| Merges edit copy Anna already signed off | Merge report (T10) sent to Anna for confirmation |

## Out of scope (logged, not done)

- **FAQPage schema.** `/mtd-software/sole-traders`, `/mtd-software/landlords` and both `/features/*` pages show visible FAQs with **no FAQPage schema**. The AEO audit (`.claude/audits/aeo.md`) calls this the single highest-impact fix. Excluded by decision 2 — raise as a separate card.
- Removing the `!` from `!Coconut` sitewide — separate Trello card.
- The other "Content to review" cards on the board (CIS anchor text, MTD-vs-bank-account blog posts, online sellers).

## Build log

### 2026-08-31 — Stream A complete (not published)

**T1 — 5 FAQ CMS items created.** All staged (`lastPublished: null`), all `featured-on-*` switches left `false` so they cannot surface on other pages.

| Item ID | Question | Destination |
|---|---|---|
| `6a958233752834e3c5bd1f15` | Is support included in my plan and during the free trial? | tax-help-support |
| `6a958233752834e3c5bd1f17` | Can Coconut support help me switch from spreadsheets or another provider? | tax-help-support |
| `6a958233752834e3c5bd1f19` | Can I manage multiple income streams, such as self-employment and property, in one account? | mtd-compliant-software |
| `6a958233752834e3c5bd1f1b` | Does Coconut show my tax bill in real time as I go? | mtd-compliant-software |
| `6a958233752834e3c5bd1f1d` | How does Coconut keep my financial data secure? | mtd-compliant-software |

**T2 — references appended.** Read-modify-write confirmed safe: `update_collection_items` uses PATCH semantics, so unlisted fields are preserved (verified — SEO fields, icon, product shot, background colour, `feature-highlights`, `hmrc-recognised-for-mtd` and `new-layout` all intact).

- `tax-help-support` (`6989e5c0148e0f7f2d2b0e44`): `common-questions` 9 → 11
- `mtd-compliant-software` (`6960ebc2f28cea4d0560c493`): `common-questions` 8 → 11

All original IDs present in original order; new IDs appended last. Verified against a re-read taken immediately before the write.

**T3 — publish: NOT DONE, deliberately.** Gated on user confirmation per the Risks table and the `webflow-mcp` skill rule ("never auto-publish"). The 5 items and both reference updates are staged and invisible on the live site until a publish runs.

**T10 — merge report written:** `.claude/reports/faq-merge-report-2026-08-31.md`.

### 2026-08-31 — Stream B complete (not published)

**Method — important correction to the spec's original assumption.** `data_element_builder` is the wrong tool: it **silently ignores** `styles`, `text` and `attributes`. A first attempt produced an unclassed block with Webflow's default RichText placeholder (H1–H6, lorem ipsum, lists) and the default "This is some text inside of a div block." It was removed immediately (element `e0963e99-…a61c7`), leaving the page as found.

**Use `data_whtml_builder` instead.** It accepts the raw HTML block and applies the existing `_25-collapse-*` classes correctly. Verified by snapshot: type styles, plus icon and brand-teal links all render as on existing items. Omit Webflow's own `w-inline-block` / `w-richtext` classes — Webflow adds those itself.

The accordion carries **no** `data-w-id`, no IX2 data, and no inline JS; the shared stylesheet has no rule hiding `._25-collapse-text-content` either. Behaviour therefore comes from class/structure alone, which is why an identically-classed block works. Confirmed by the site owner.

| Page | Parent element ID | Items |
|---|---|---|
| `/mtd-software` | `cb17b50d-12f9-fea2-8853-7ac5db88c65f` | 6 → 8 |
| `/mtd-software/bridging-software` | `6c1acab8-5b90-70ef-70dc-493f4367bb33` | 11 → 14 |
| `/mtd-software/sole-traders` | `63729154-1db9-a6c3-e1d9-b87f251db3b9` | 9 → 12 |
| `/mtd-software/landlords` | `6a05835d-bb69-f8d1-b1c8-a4370b70bd99` | 12 → 13 |
| `/free-making-tax-digital-software` | `6a550843-f8fa-d198-f632-ac72f3d62e3b` | 8 → 9 |

**Merges applied.** Both done as `set_text` on the existing paragraph plus an inserted sibling paragraph, so the existing question and the original closing paragraph are untouched.

- Merge A — landlords, item `6a05835d-…bdd4`: para 1 rewritten, portfolio-totals paragraph inserted after it. Verified by snapshot: 3 paragraphs, original closing line intact.
- Merge B — free MTD, item `6a550843-…e7a`: para 2 rewritten, two-year Zempler paragraph inserted after it. Verified by snapshot.

### 2026-08-31 — published to STAGING only, tests green

`publish_site` with `publishToWebflowSubdomain: true` and **no** custom domains — response confirmed `customDomains: []`, so `getcoconut.com` / `.co.uk` are untouched.

**The acceptance tests caught a real error in the first pass.** Three `mtd-compliant-software` tests failed because the 3 FAQs had been appended to `common-questions`, which that page does not render (see the Correction above). Fixed by:

1. Reverting that item's `common-questions` to the original 8 IDs — the CMS record is now exactly as found.
2. Re-adding the content in the static section on the features template (parent `c635f012-c9f7-b83e-4ebb-824597d65638`), using the `<h3 class="heading-style-h6">` question pattern that section uses.

That page had two further overlaps, handled under the same add-and-merge rule:

- **Merge C** — existing "How does Coconut handle multiple income streams?" already covered the new question; added only the new MTD nuance (separate reporting per stream) as an extra paragraph. Paragraph `8d11ff18-…5c1c`.
- **Judgement call** — new "How does Coconut keep my financial data secure?" overlaps existing "Is Coconut HMRC-recognised, and is it secure?". Added as its own question, since the new answer is materially more detailed and a dedicated security question is better for AEO. Flagged in the merge report for Anna to confirm.

**5 orphaned FAQ CMS items.** `6a958233752834e3c5bd1f19`, `…1f1b`, `…1f1d` are now referenced by nothing (created before the mechanism was understood); `…1f15` and `…1f17` are correctly in use on `tax-help-support`. The three orphans are harmless but untidy — deletion left for the user to approve rather than done unilaterally.

**Test result: 51/51 pass** against `https://getcoconut.webflow.io`.

Three test bugs were fixed along the way, all test-side, not content:
- `innerText` omits hidden text, so collapsed answers were invisible to the merge assertions → use `textContent`.
- OptinMonster 404s and complains about the referrer on the `webflow.io` domain because it is registered to `getcoconut.com`. Staging-only noise, filtered.
- The Help Centre link returns 403 to *any* automated request — Cloudflare bot protection (`__cf_chl_rt_tk`, title "Just a moment..."), confirmed in real headless Chromium. The link is fine for users; 403 is now accepted for that host.

### 2026-08-31 — landlords question reworded, bridging schema prepared

**Landlords merge now keeps Anna's approved question.** The original rationale for keeping the old wording ("already live and picked up by Google") did not survive checking and is withdrawn:

- On five of the seven pages the questions are `div._25-collapse-title` — **not headings**, so there is no heading-level signal to preserve. Only `mtd-compliant-software` uses a real `<h3>`.
- `/mtd-software/landlords` and `/mtd-software/sole-traders` have **no FAQPage schema at all**.
- `/free-making-tax-digital-software` has 13 schema questions and **none** of them is "What's included free vs paid?" — its schema is a stale, unrelated set. Same on `/mtd-software`: 19 schema questions, 8 visible, no overlap.

So on landlords the visible question was reworded to the approved "Can Coconut track income and expenses separately for each property?" (string element `6a05835d-…bdda`; `set_text` must target the String child, not the `_25-collapse-title` div, which returns "This element doesn't support text"). The other two merges stand: free-MTD keeps the broader existing umbrella question, and mtd-compliant-software's is a real `<h3>` with near-identical intent.

**Bridging FAQPage schema — prepared but NOT applied. Blocked on permissions.** `/mtd-software/bridging-software` was the one page whose schema exactly mirrored its visible FAQs (11 and 11); it now shows 14 visible against 11 in schema. The schema lives in Webflow's native page `jsonLdSchema` field, readable via `query_pages_schema_markup` but **`bulk_update_pages_schema_markup` returns 403 `insufficient_permissions`** — the API token cannot write it.

Corrected JSON (11 → 14 questions, all 5 `@graph` nodes preserved, `dateModified` bumped) is generated at `.claude/schema/bridging-faqpage-2026-08-31.json`, built programmatically from the live schema so the base is exact. It needs pasting into Page settings → Custom code / Schema markup by hand, or a token with page-write scope.

**Test result: 51/51 pass**, no flakes.

### Remaining

- **T9 — publish to the live custom domains. NOT DONE, user-gated.** Staging carries the change; `getcoconut.com` does not.
- Paste `bridging-faqpage-2026-08-31.json` into the bridging page's schema field (blocked on token permissions).
- T11 — Trello comment (user-gated).
- Deleting the 3 orphaned FAQ CMS items (user-gated).

## Agents needed

`content` (copy fidelity, merge report), `code-writer` (Webflow MCP execution), `qa` (verify loop).

## Open questions

None blocking. Anna's sign-off on the two merges is a post-delivery check, not a gate.
