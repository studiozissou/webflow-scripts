# /estimate — Generate Pricing Estimate

Generate a pricing estimate from intake data (existing site) or setup data (new Figma build).

**Pipeline position:** After `/intake` (Mode A) or after `/arch-review` (Mode B).

---

## Pre-flight

1. Read `projects/<client>/.claude/client.md` — abort if missing
2. Read `.claude/reference/rate-card.md` — abort if missing or all placeholders unfilled
3. Determine mode:
   - **Mode A (post-intake):** `intake.json` exists with pages + optional `intake-report`
   - **Mode B (post-setup):** `component-inventory.md` exists (approved) + `arch-review.md` exists (signed off)
4. If neither mode qualifies, explain what's needed and stop

---

## Step 1 — Currency selection

Ask:

1. What currency should the estimate be quoted in? (e.g. EUR, GBP, USD, AUD)
2. If not EUR: what exchange rate should I use? (or provide your own)

Record: target currency, exchange rate (1 EUR = X), buffer % from rate card, rounding rule from rate card.

---

## Step 2 — Page inventory and complexity

### Mode A (post-intake)
- Pull pages from `intake.json`
- For each page, propose a complexity rating: Complex / Average / Simple
- Present the table and ask user to confirm or adjust ratings

### Mode B (post-setup)
- Pull pages from component inventory / arch review
- For each page, propose complexity based on component count and interaction density
- Present and confirm

---

## Step 3 — Component inventory (Mode B only)

- List each component from `component-inventory.md`
- Assign complexity: Complex / Average / Simple
- Present and confirm
- Components priced separately from page development

---

## Step 4 — Additional scope items

Ask which of these are in scope (yes/no for each):

- SEO setup
- Analytics setup (GA4/GTM)
- Accessibility audit + remediation
- Cookie consent
- Third-party integrations (list each)
- Whitelabel / client handoff
- CMS collections (list each with item counts)

---

## Step 5 — Calculate and present

1. Look up each line item in `rate-card.md` (EUR base price)
2. Calculate subtotals per category: Design, Development, Components, CMS & Content, Add-ons
3. Sum to grand total in EUR
4. Convert to target currency: `EUR amount * exchange rate`
5. Apply buffer %: `converted * (1 + buffer/100)`
6. Round per rounding rule
7. Present full breakdown for approval

### Presentation format

```
## Estimate Summary

| Category | EUR (base) | [Currency] |
|----------|-----------|------------|
| Design | ___ | ___ |
| Development | ___ | ___ |
| Components | ___ | ___ |
| CMS & content | ___ | ___ |
| Add-ons | ___ | ___ |
| **Total** | **___** | **___** |

Exchange rate: 1 EUR = [rate] [currency]
Buffer: [N]%
Rounding: nearest [rule]
```

Ask: "Does this estimate look correct? Any adjustments?"

Iterate until approved.

---

## Step 6 — Write estimate file

Write to `projects/<client>/.claude/estimates/estimate-YYYY-MM-DD.md`:

```markdown
# Estimate — [Client Name]

**Date:** YYYY-MM-DD
**Status:** Draft
**Mode:** A (post-intake) / B (post-setup)

## Currency

| Setting | Value |
|---------|-------|
| Base currency | EUR |
| Client currency | [currency] |
| Exchange rate | 1 EUR = [rate] |
| Buffer | [N]% |
| Rounding | nearest [rule] |

## Page pricing

| # | Page | Complexity | Design (EUR) | Dev (EUR) | Design ([currency]) | Dev ([currency]) |
|---|------|------------|-------------|----------|--------------------|--------------------|
| 1 | ___ | ___ | ___ | ___ | ___ | ___ |

## Component pricing

| # | Component | Complexity | EUR | [currency] |
|---|-----------|------------|-----|------------|
| 1 | ___ | ___ | ___ | ___ |

## CMS & content

| # | Item | EUR | [currency] |
|---|------|-----|------------|
| 1 | ___ | ___ | ___ |

## Additional items

| # | Item | EUR | [currency] |
|---|------|-----|------------|
| 1 | ___ | ___ | ___ |

## Summary

| Category | EUR | [currency] |
|----------|-----|------------|
| Design | ___ | ___ |
| Development | ___ | ___ |
| Components | ___ | ___ |
| CMS & content | ___ | ___ |
| Add-ons | ___ | ___ |
| **Total** | **___** | **___** |
```

Create the `estimates/` directory if it doesn't exist.

---

## Verification

1. `rate-card.md` was read and prices applied correctly
2. Every page has a complexity rating confirmed by user
3. Currency conversion includes exchange rate + buffer + rounding
4. EUR base prices retained alongside client currency in output
5. Estimate file written with `Status: Draft`
6. User explicitly approved the final numbers before writing
