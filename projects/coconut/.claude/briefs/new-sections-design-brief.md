# Coconut Homepage — New Sections Design Brief

**Client:** Coconut
**Date:** 2026-06-08
**Prepared for:** Claude Design handoff
**Spec:** `projects/coconut/.claude/specs/homepage-refresh.md`

---

## Brand Constraints

- **Radius:** 1.5625rem (~25px) on all cards/containers
- **Backgrounds:** Aqua Mist `#c2efed`, Coco Cream `#ddd9d4`, Off-White `whitesmoke`, White
- **Accent:** Coco Coral `#f77d53` (CTAs), Coco Gold `#f7c11c` (highlights)
- **Text:** Coconut Palm `#2a2228` primary, Neutral 70 `#736a70` secondary
- **Deep teal:** Primary Darkest `#066866` for headings/icons on light backgrounds
- **Tone:** Friendly, reassuring, simple. No startup language, no "powerful/robust". Plain English.
- **Typography:**
  - **Headings:** Work Sans (300, 400, 500, 600, 700) — Google Fonts
  - **Body:** Arco Perpetuo Pro — custom font
  - **Mono / accent:** Inconsolata (400, 700) — Google Fonts
  - **Fallback:** Arial, sans-serif
  - H2 headings: Work Sans 600 or 700, `--_25-text---35px` (2.1875em) or `--_25-text---40px` (2.5em)
  - Body text: Arco Perpetuo Pro, `--_25-text---14px` (1em)
  - Bold lead phrases: Arco Perpetuo Pro bold
  - CTA buttons: Arco Perpetuo Pro
- **Copy style:** Short sentences, imperative CTAs, bold lead phrases on bullet items

---

## Section N1 — "Simple. Secure. HMRC-recognised."

**Content:** H2 heading + intro paragraph + 7 bullet points (bold lead + description). No CTA.

### Copy

**H2:** Simple. Secure. HMRC-recognised.

**Intro:** We know being self-employed means juggling invoices, expenses and tax! (Not to mention, everything else) so that's why we've built a solution that helps you to stay on top of it all.

**Bullet points:**
1. **Easy self-employed bookkeeping:** Designed for people, not accountants.
2. **Trusted by thousands:** Join the UK's thriving self-employed community.
3. **HMRC-recognised:** Fully compliant software for MTD and Self Assessment.
4. **Bank-grade security:** Your data stays private and encrypted.
5. **Total flexibility:** Use our simple mobile app or manage details on desktop.
6. **Transparent pricing:** No hidden fees and no long-term contracts.
7. **Sign up in minutes:** Connect your bank and start today.

### Option A — Icon Grid

- Full-width Aqua Mist `#c2efed` background
- H2 centred top, intro paragraph centred below (max-width ~680px)
- 7 items in a responsive grid: 3 columns on desktop, 2 on tablet, 1 on mobile
- Each item is a small card (white background, 25px radius, subtle shadow) with:
  - Circular icon top-left (Primary Darkest `#066866` fill, 48px)
  - Bold lead phrase as card title
  - Description as body text below
- Cards have equal height with flexbox stretch
- Feels like a feature overview — scannable, modular

### Option B — Checkmark List

- Full-width Coco Cream `#ddd9d4` background
- Two-column layout: left column = H2 + intro paragraph, right column = 7 bullet items
- Each bullet uses a Coco Coral `#f77d53` checkmark icon (or Primary Darkest teal tick)
- Bold lead phrase inline, description follows after an em-dash or colon
- On mobile, stacks to single column: heading/intro on top, list below
- Feels editorial — dense but readable, like a product fact sheet

### Option C — Alternating Rows

- Full-width Off-White `whitesmoke` background
- H2 + intro paragraph centred at top
- 7 items as horizontal rows, alternating left-aligned icon and right-aligned icon (zigzag)
- Each row: large icon (64px, teal) on one side, bold lead + description on the other
- Rows separated by a thin `Neutral 40` divider line
- On mobile, all items stack left-aligned with icon above text
- Feels structured and spacious — each benefit gets room to breathe

---

## Section N2 — "Is Coconut right for you?"

**Content:** H2 heading + intro sentence + 5 persona items (bold persona name + description) + "View pricing" CTA.

### Copy

**H2:** Is Coconut right for you?

**Intro:** Coconut is designed specifically for the self-employed with no jargon or complex features you'll never use.

**Persona items:**
1. **Sole traders** can keep personal and business finances separate without the headache.
2. **Landlords** can manage property income and expenses with ease.
3. **Freelancers and creatives** can keep an eye on income, expenses and tax estimates in real-time.
4. **CIS subcontractors** can effortlessly track full invoice amounts and the tax held back by contractors.
5. **MTD users** can stay compliant and submit digital records to HMRC in just a few clicks.

**CTA:** View pricing

### Option A — Persona Cards

- White background, contained width (~1200px)
- H2 + intro centred top
- 5 cards in a row on desktop (equal width), 3+2 on tablet, stacked on mobile
- Each card: Aqua Mist top stripe or left border accent, bold persona name as title, description below
- 25px radius, no shadow (flat), Neutral 10 `#f7f6f6` background
- "View pricing" CTA button centred below the card row (Coco Coral fill, white text)
- Feels like audience segmentation — users self-identify quickly

### Option B — Vertical Accordion-Style List

- Full-width Coconut Palm `#2a2228` dark background (contrast section)
- H2 in white, intro in Neutral 40 `#ddd9d5`
- 5 items as a vertical list with bold persona name in white and description in Neutral 50
- Each item separated by a thin teal (`Primary 60 #66d7d1`) divider
- Optional: persona names use Coco Gold `#f7c11c` for emphasis
- "View pricing" CTA: Coco Coral button, centred below
- Feels bold and different — breaks the page rhythm, draws the eye

### Option C — Two-Column Split

- Full-width Coco Cream `#ddd9d4` background
- Left column (40%): H2 heading + intro paragraph + "View pricing" CTA stacked vertically
- Right column (60%): 5 persona items as a styled list
  - Each item: bold persona name (Primary Darkest `#066866`) + description
  - Small teal bullet or arrow icon before each name
- On mobile, left column stacks above right column
- Feels clean and asymmetric — good visual hierarchy between the question and the answers

---

## Section N3 — "Making Tax Digital, handled."

**Content:** H2 heading + intro paragraph + 2-column comparison table (9 feature rows, checkmark/cross icons) + "See how Coconut helps" CTA.

### Copy

**H2:** Making Tax Digital, handled.

**Intro:** Making Tax Digital for Income Tax is here and we've got you covered. If your income is above the threshold, the way you report to HMRC has changed but Coconut is fully MTD-compliant so you can stay on the right side of the law without stress. Think digital record-keeping, quick ways to send your quarterly updates to HMRC and easy final Self Assessments with just a few taps.

**Comparison table:**

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

**CTA:** See how Coconut helps

### Option A — Clean Comparison Table

- Full-width white background
- H2 + intro paragraph centred at top (max-width ~720px)
- Table: 3 columns (Feature label | Standard bookkeeping | MTD-ready)
- Column headers: bold, Coconut Palm text on Aqua Mist `#c2efed` background
- Alternating row stripes: white and Neutral 10 `#f7f6f6`
- Checkmarks: Primary Darkest `#066866` teal, Crosses: Neutral 60 `#d4d0cc` grey (not red — keeps it non-alarming)
- 25px radius on the table container, subtle border
- CTA button centred below table (Coco Coral)
- On mobile: table scrolls horizontally or columns stack
- Feels familiar — straightforward SaaS comparison pattern

### Option B — Card Comparison

- Full-width Aqua Mist `#c2efed` background
- H2 + intro paragraph centred at top
- Two side-by-side cards instead of a table:
  - Left card: "Standard bookkeeping" — white background, lists 7 features with teal checkmarks, last 2 features with grey crosses
  - Right card: "MTD-ready" — Coconut Palm `#2a2228` dark background, white text, all 9 features with Coco Gold `#f7c11c` checkmarks. Subtle "Recommended" badge in Coco Coral at top
- Cards have 25px radius, slight elevation on the MTD card
- CTA below both cards, centred
- On mobile: cards stack vertically, MTD card on top
- Feels like a pricing comparison — emphasises the upgrade path

### Option C — Feature List with Inline Tags

- Full-width Off-White `whitesmoke` background
- H2 + intro paragraph left-aligned (with right-side illustration or decorative element)
- 9 features listed vertically, each as a row:
  - Feature name on the left
  - Two small pill badges on the right: "Standard" and "MTD-ready"
  - Pill is filled (teal) if included, outlined (grey) if not
- Clean, minimal — no heavy table borders
- CTA left-aligned below the list
- 25px radius on the overall container
- On mobile: pills sit below the feature name
- Feels modern and light — avoids the "spreadsheet" look of a traditional table

---

## Responsive Notes

All sections must work at three breakpoints:
- **Desktop:** 1280px+ (full layouts as described)
- **Tablet:** 768px (grids collapse to 2-col or stack, tables may scroll)
- **Mobile:** 375px (single column, no horizontal overflow)

## Deliverable

3 design options per section (9 total). Each option as a Figma frame at desktop width. Tablet and mobile variants for the chosen option after review.
