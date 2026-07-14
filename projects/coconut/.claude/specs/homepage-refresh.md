# Coconut Homepage Refresh

**Slug:** `coconut-homepage-refresh`
**Client:** Coconut
**Status:** Ready to Build
**Created:** 2026-06-01
**Spec source:** `/Users/willmorley/Downloads/Coconut_Landing_Page_Copy.docx`

---

## Summary

Refresh the Coconut homepage (`getcoconut.com`) to match the new copy document. Mix of content swaps, 3 new section builds, and removal of 4 existing sections. Built on a duplicate page, reviewed with Anna, then swapped live.

---

## Current vs New Section Map

| # | Current Homepage | Action | New Homepage |
|---|-----------------|--------|-------------|
| 1 | Nav | Keep | Nav |
| 2 | Hero — "Tax is changing..." | **Rewrite** | Hero — "Bookkeeping and tax sorted." |
| 3 | Trust badges (MTD/FCA) | **Delete** | _(absorbed into new value props section)_ |
| 4 | Feature highlights (4 cards) | **Rewrite layout** | "Everything you need" (5 cards) |
| 5 | Product demo carousel | **Delete** | _(not in new copy)_ |
| 6 | Getting started (3 steps) | **Rewrite** | "How Coconut works" (5 steps) |
| 7 | Pricing table (4 columns) | **Keep** | Pricing — "[Keep as is]" |
| 8 | Bank integration logos | **Delete** | _(not in new copy)_ |
| 9 | FAQ accordion (12 Qs) | **Rewrite** | FAQ (4 Qs) |
| 10 | Feature deep-dive (6-8 cards) | **Delete** | _(not in new copy)_ |
| 11 | CTA section | **Keep** | "[Keep as is] end CTA block" |
| 12 | Testimonials carousel | **Keep** | "[Keep as is] testimonial block" |
| 13 | Blog/Knowledge Hub (4 cards) | **Keep** | "[Keep as is] news and offer" |
| 14 | Final CTA | **Rewrite** | "A simpler way to stay on top of your finances" |
| 15 | Footer | Keep | Footer |

### New sections to build (inserted between Hero and Feature cards):

| New # | Section | Type | Inserted after |
|-------|---------|------|----------------|
| N1 | "Simple. Secure. HMRC-recognised." | Value props — intro paragraph + 7 bullet points | Hero |
| N2 | "Is Coconut right for you?" | Persona fit — 5 audience segments + CTA | N1 |
| N3 | "Making Tax Digital, handled." | MTD explainer — paragraph + 2-column comparison table (9 rows) | "How Coconut works" |

---

## Final Page Order (top to bottom)

1. Nav (keep)
2. **Hero** (rewrite) — "Bookkeeping and tax sorted. No accountant needed."
3. **N1 — Value props** (NEW) — "Simple. Secure. HMRC-recognised."
4. **N2 — Persona fit** (NEW) — "Is Coconut right for you?"
5. **Feature cards** (rewrite) — "Everything you need for self-employed bookkeeping" (5 cards)
6. **How it works** (rewrite) — "How Coconut works" (5 steps)
7. **Transition line** — "Simple bookkeeping for sole traders, in one place."
8. **N3 — MTD comparison** (NEW) — "Making Tax Digital, handled." + table
9. Pricing (keep)
10. FAQ (rewrite — 4 Qs)
11. **Final CTA** (rewrite) — "A simpler way to stay on top of your finances"
12. End CTA block (keep)
13. Testimonials (keep)
14. Blog/Knowledge Hub (keep)
15. Footer (keep)

---

## Build Method

**Duplicate page.** Create a copy of the homepage in Webflow Designer, build all changes on the copy, review with Anna, then swap the slug/path when approved.

---

## Section Specs

### 2. Hero (rewrite)

**Current:** H1 "Tax is changing. Stay ahead with !Coconut." + 6 bullet points + "Start your 14-day free trial" CTA + trust indicators + product screenshot carousel.

**New copy:**
- H1: "Bookkeeping and tax sorted. No accountant needed."
- Subtext: "Simple MTD and bookkeeping software for the self-employed."
- Paragraph: "Coconut helps sole traders, landlords and freelancers track income, manage expenses and stay ready for Making Tax Digital - all in one place."
- CTA: "Get started for free"

**Build notes:**
- Swap H1, subtext, paragraph, CTA label
- Remove the 6 bullet points from the hero (they move to the new value props section below)
- Keep the product screenshot carousel or replace with a single hero image (check with Anna)
- Keep trust indicators or remove (they're partially covered in N1)

### N1. Value Props (NEW)

**Heading:** "Simple. Secure. HMRC-recognised."

**Intro paragraph:** "We know being self-employed means juggling invoices, expenses and tax! (Not to mention, everything else) so that's why we've built a solution that helps you to stay on top of it all."

**7 bullet points:**
1. Easy self-employed bookkeeping: Designed for people, not accountants.
2. Trusted by thousands: Join the UK's thriving self-employed community.
3. HMRC-recognised: Fully compliant software for MTD and Self Assessment.
4. Bank-grade security: Your data stays private and encrypted.
5. Total flexibility: Use our simple mobile app or manage details on desktop.
6. Transparent pricing: No hidden fees and no long-term contracts.
7. Sign up in minutes: Connect your bank and start today.

**Build notes:**
- New section. Full-width background (suggest Aqua Mist `#c2efed` or Coco Cream `#ddd9d4` for contrast)
- Bullet items: bold lead phrase + colon + description. Could use icon-left layout or checkmark bullets
- No CTA in this section

### N2. Persona Fit (NEW)

**Heading:** "Is Coconut right for you?"

**Intro:** "Coconut is designed specifically for the self-employed with no jargon or complex features you'll never use."

**5 persona bullets:**
1. **Sole traders** can keep personal and business finances separate without the headache.
2. **Landlords** can manage property income and expenses with ease.
3. **Freelancers and creatives** can keep an eye on income, expenses and tax estimates in real-time.
4. **CIS subcontractors** can effortlessly track full invoice amounts and the tax held back by contractors.
5. **MTD users** can stay compliant and submit digital records to HMRC in just a few clicks.

**CTA:** "View pricing"

**Build notes:**
- New section. Could use card grid (one per persona) or vertical list with bold persona name
- CTA links to pricing section (anchor or /pricing page)

### 5. Feature Cards (rewrite)

**Current:** "Focus on what you do best, we'll do the rest!" — 4 cards in a 2x2 grid.

**New heading:** "Everything you need for self-employed bookkeeping"

**New subtext:** "Whether you fall under the Making Tax Digital threshold or not, Coconut is the perfect bookkeeping software for a healthy business. Take a look at some of our best-loved features:"

**5 feature cards:**
1. Bank feeds — Connect your UK bank to see transactions update in real-time.
2. Smart categorisation — We'll help you categorise business expenses so your records stay organised.
3. Professional invoicing — Create, send and track invoices. Plus, get notified the second you get paid.
4. Receipt capture — Take a photo of your receipt and link it to the transaction.
5. MTD compliance — Stay on the right side of HMRC with software built for Making Tax Digital. Send quarterly updates and file your final declaration directly from the app.

**CTA:** "Explore more features"

**Build notes:**
- Keep the card grid layout, add a 5th card
- Grid options: 3+2 layout, or 5 in a row on desktop (3+2 on tablet)
- Swap heading, subtext, and all card copy
- Need new icons for each card (or reuse existing feature icons from the site)

### 6. How It Works (rewrite)

**Current:** "How to get started" — 3 horizontal steps with arrows.

**New heading:** "How Coconut works"

**5 steps:**
1. Connect your bank account
2. Your transactions are imported automatically
3. We help you organise income and expenses
4. See your tax estimate as you go
5. Submit MTD updates to HMRC when you're ready

**Build notes:**
- Expand from 3 to 5 steps
- May need to switch from horizontal to vertical layout on mobile (5 steps won't fit horizontally)
- Keep the numbered/arrow visual style
- No CTA in this section

### 7. Transition Line

**Text:** "Simple bookkeeping for sole traders, in one place."

**Build notes:**
- Small section divider — centered text, possibly larger type
- Could be an H2 or styled paragraph. No CTA.

### N3. MTD Comparison (NEW)

**Heading:** "Making Tax Digital, handled."

**Intro:** "Making Tax Digital for Income Tax is here and we've got you covered. If your income is above the threshold, the way you report to HMRC has changed but Coconut is fully MTD-compliant so you can stay on the right side of the law without stress. Think digital record-keeping, quick ways to send your quarterly updates to HMRC and easy final Self Assessments with just a few taps."

**Comparison table (2 columns × 9 rows):**

| Feature | Standard bookkeeping | MTD-ready |
|---------|---------------------|-----------|
| Automated bank feeds | ✅ | ✅ |
| Expense tracking & receipts | ✅ | ✅ |
| Professional invoicing | ✅ | ✅ |
| Real-time tax estimates | ✅ | ✅ |
| Digital record keeping | ✅ | ✅ |
| Multiple income streams | ✅ | ✅ |
| Expert support | ✅ | ✅ |
| HMRC quarterly submissions | ❌ | ✅ |
| MTD compliance | ❌ | ✅ |

**CTA:** "See how Coconut helps"

**Build notes:**
- Reuse the existing comparison table component/style from the site (striped rows, custom bullet icons, round corners per design system)
- 2 columns only (not 4 like pricing). Column headers: "Standard bookkeeping" and "MTD-ready"
- Check = existing green checkmark icon. Cross = red cross or grey dash
- Responsive: stack columns on mobile or horizontal scroll

### 10. FAQ (rewrite)

**Current:** "Common questions" — 12 Q&A accordion items.

**New:** 4 Q&A pairs:

1. **Do I need to use Coconut for MTD?** — If your income is above the current HMRC threshold, you're required to use MTD-compatible software like Coconut. But even if you don't yet have to comply, you'll likely find Coconut handy thanks to its smart bookkeeping features.
2. **Can I use Coconut if I have a limited company?** — Sorry, Coconut is currently only optimised for self-employed people, sole traders and landlords.
3. **How does the HMRC connection work?** — We use a secure API to communicate directly with HMRC. In short, you authorise the connection, and we send the necessary data securely when you're ready to file.
4. **Can I use Coconut for bookkeeping only?** — Yes. Many users use Coconut just to track income and expenses even before they need MTD.

**Build notes:**
- Keep the existing accordion component
- Delete 8 of the 12 items, update copy on remaining 4
- Update any FAQPage schema to match (currently no schema on homepage FAQ — this is a good time to add it)

### 14. Final CTA (rewrite)

**Current:** "Coconut: the accounting & tax app for self-employed people and landlords"

**New heading:** "A simpler way to stay on top of your finances"

**New subtext:** "Join thousands of self-employed people in the UK using Coconut for bookkeeping and Making Tax Digital for Income Tax. Get started for free today."

**Build notes:**
- Simple copy swap. Keep existing layout, buttons, trust indicators.

---

## Sections to Delete

Delete entirely from the duplicate page (per user decision):

1. **Trust badges section** (#3) — MTD Ready/FCA badge images
2. **Product demo carousel** (#5) — Slick carousel with app screenshots
3. **Bank integration logos** (#8) — 13+ bank logo images
4. **Feature deep-dive cards** (#10) — 6-8 feature cards with images

---

## Dependencies & Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| 5-card grid doesn't fit existing 2×2 layout | Medium | May need 3+2 or 5-column grid. Test on tablet/mobile. |
| 5-step "How it works" overflows horizontal layout | Medium | Switch to vertical on mobile, keep horizontal on desktop |
| Comparison table on mobile | Low | Existing table pattern handles responsive. Verify 2-col version works. |
| FAQ schema doesn't exist on homepage | Low | Add FAQPage JSON-LD when updating FAQ content. Already flagged in AEO audit. |
| Deleting carousel breaks Slick JS | Low | Slick only runs if carousel DOM exists. No JS cleanup needed. |
| Hero image/screenshot changes | Medium | Copy doc doesn't specify imagery. Flag for Anna. |

---

## Barba Impact

N/A — Coconut does not use Barba.js for page transitions.

---

## Verify Loop

### Pass/fail criteria

1. Duplicate page loads without console errors
2. All 15 sections render in the correct order (per Final Page Order above)
3. Hero shows new H1 "Bookkeeping and tax sorted. No accountant needed." with CTA "Get started for free"
4. N1 value props section visible with 7 bullet items
5. N2 persona section visible with 5 persona items and "View pricing" CTA
6. Feature cards section has 5 cards (not 4)
7. "How Coconut works" section has 5 numbered steps
8. N3 MTD comparison table renders with 2 columns × 9 rows, check/cross icons visible
9. FAQ has exactly 4 accordion items, all expand/collapse correctly
10. Final CTA shows new heading
11. Deleted sections (carousel, bank logos, feature deep-dive, trust badges) are not present in DOM
12. Pricing, testimonials, blog, end CTA blocks unchanged
13. Page is responsive at 768px and 375px — no horizontal overflow, no overlapping text

### Reproduction steps

1. Navigate to duplicate page URL (e.g. `getcoconut.webflow.io/home-v2`)
2. Scroll top to bottom, verify section order matches spec
3. Click each FAQ item to test accordion
4. Resize to tablet (768px) and mobile (375px)
5. Check browser console for errors

### Tier mapping

- **Tier 1 (auto):** Section order, heading text, element counts, console errors, responsive viewport — all Playwright-verifiable
- **Tier 2 (CDN regression):** Registered in `tests/registry.json` for post-deploy checks
- **Tier 3 (manual):** Visual spacing/alignment review, animation timing on FAQ accordion, mobile Safari scroll behaviour, image quality check

### Regression scope

- Pricing table must remain interactive (expand/collapse "See all features")
- Testimonials carousel must still scroll
- Blog cards must still link correctly
- Footer links unchanged
- Cookie consent banner still functional

---

## Test Plan

### Tier 1 — Auto: Playwright local

Tests in `tests/acceptance/coconut-homepage-refresh.spec.js`:
- Section order verification (H1/H2 sequence)
- Hero H1 text matches new copy
- Value props section has 7 list items
- Persona section has 5 items + pricing CTA
- Feature cards count = 5
- How it works steps count = 5
- MTD comparison table: 2 column headers + 9 feature rows
- FAQ accordion: 4 items, click to expand
- Final CTA heading matches new copy
- Deleted sections not in DOM
- No console errors
- Responsive: no horizontal overflow at 375px

### Tier 2 — Auto: CDN regression

Registered in `tests/registry.json`. Runs on `/deploy`.

### Tier 3 — Manual

- Visual spacing between new sections (N1, N2, N3) — subjective design review
- Card grid alignment on tablet (768px) — 5 cards in 3+2 layout
- FAQ accordion animation smoothness
- Mobile Safari: scroll behaviour, sticky nav interaction
- Image quality: any new icons or illustrations for feature cards
- Cross-browser: Safari, Firefox rendering of comparison table check/cross icons

---

## Parallelisation Map

### Independent streams (can run simultaneously)

| Stream | Tasks | Agent | Est. tokens |
|--------|-------|-------|-------------|
| A | Duplicate page + delete 4 sections + reorder | Webflow Designer (manual) | — |
| B | Build N1 (value props) + N2 (persona) | Webflow Designer (manual) | — |
| C | Build N3 (MTD comparison table) | Webflow Designer (manual) | — |
| D | Write acceptance tests | code-writer | ~2k |
| E | Add FAQPage schema to homepage | schema agent | ~1.5k |

### Sequential dependencies

- Stream A must complete before B and C (sections need a page to live on)
- Stream D can start immediately (tests written against spec, not live page)
- Stream E can start immediately (schema is an embed, independent of layout)
- Rewrite tasks (hero, feature cards, how-it-works, FAQ, final CTA) depend on Stream A

### Recommendation

- **Parallel:** Streams D + E can run immediately alongside Webflow work
- **Sequential:** A → B + C (parallel) → rewrite tasks → review with Anna
- **Worktrees:** Not applicable (Webflow Designer work, not code)
- **Agent teams:** Not applicable (primarily manual Webflow work)

---

## Tasks

See `queue.json` for machine-readable task entries.

1. **Duplicate homepage** — Create copy in Webflow Designer, name it "Home v2"
2. **Delete removed sections** — Remove trust badges, product carousel, bank logos, feature deep-dive from duplicate
3. **Rewrite hero** — Swap H1, subtext, paragraph, CTA to new copy
4. **Build N1: Value props section** — New section with H2 + intro + 7 bullet points
5. **Build N2: Persona fit section** — New section with H2 + intro + 5 persona items + CTA
6. **Rewrite feature cards** — Add 5th card, swap all headings and descriptions
7. **Rewrite How it works** — Expand to 5 steps, swap copy
8. **Add transition line** — New small section between How it works and MTD comparison
9. **Build N3: MTD comparison table** — New section with H2 + intro + 2-column table + CTA
10. **Rewrite FAQ** — Reduce to 4 items, swap copy
11. **Rewrite final CTA** — Swap heading and subtext
12. **Add FAQPage schema** — JSON-LD for the 4 new FAQ items (homepage embed)
13. **Responsive QA** — Check all sections at 768px and 375px breakpoints
14. **Write acceptance tests** — Playwright tests per test plan
15. **Client review** — Send duplicate page URL to Anna for approval
16. **Go live** — Swap slug/path, delete old homepage, publish
