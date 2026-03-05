# /scope-check — In/Out of Scope Verdict

Check whether a requested feature is in scope, partially in scope, or out of scope.

**Read-only query tool. Writes nothing.**

---

## Pre-flight

1. Find the latest proposal in `projects/<client>/.claude/proposals/` — abort if missing
2. Check proposal `Status:` field — abort if not `Approved` (tell user to approve the proposal first)
3. Read the full proposal

---

## Input

Ask: "What feature or request do you want to check?"

Accept a plain-language description (e.g. "Add a car comparison tool", "Change the font on all pages", "Add a blog").

---

## Process

Search the approved proposal in this order:

1. **Pages table** — does a page cover this?
2. **Components table** — does a component cover this?
3. **Additional scope** — is it listed as an included add-on?
4. **CMS setup** — is it covered by an existing collection or template?
5. **Explicitly out of scope** — is it explicitly excluded?

---

## Verdict

Return one of three verdicts:

### In scope

> **Verdict: In scope**
> Covered by: [line item from proposal — e.g. "Page 3: Services (Average complexity)" or "Component 2: Filtered gallery"]
> No additional cost.

### Partially in scope

> **Verdict: Partially in scope**
> **Covered:** [what's included — reference specific line items]
> **Not covered:** [what would need to be added]
> **Estimated additional cost:** [look up in rate-card.md, convert to proposal currency using estimate's exchange rate]

### Out of scope

> **Verdict: Out of scope**
> **Reason:** [why — not in any table, or explicitly excluded]
> **Complexity assessment:** Complex / Average / Simple
> **Estimated cost:** [look up in rate-card.md, convert to proposal currency using estimate's exchange rate]
> **Closest existing scope item:** [if any — what's the nearest thing already included]

---

## Next steps

After delivering the verdict, ask:

- **In scope:** "Anything else to check?"
- **Partially in scope:** "Would you like me to draft a change order for the additional work?"
- **Out of scope:** "Would you like me to draft a change order for this feature?"

Do not write any files. Change order drafting is a separate step if requested.

---

## Verification

1. Proposal had `Status: Approved` before checking
2. All five proposal sections were searched
3. Verdict is one of: In scope / Partially in scope / Out of scope
4. Pricing references use rate card + estimate's exchange rate
5. No files written
