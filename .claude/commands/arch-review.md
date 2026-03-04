# /arch-review — Pre-build Architecture Review

The architect agent reviews the full component inventory for systemic risks before any
code is written. Read-only — no files changed except the review report and any ADRs.

This is a one-time review of the entire system, not a per-component review.
Per-component architectural decisions happen in `/architect [slug]` during the build phase.

---

## Pre-flight

1. Read `.claude/client.md`
2. Read `.claude/design/component-inventory.md` — must have `Status: Approved`
3. Read `.claude/design/figma-tokens.json`
4. Read `.claude/design/interaction-specs.md`
5. Read `.claude/design/design-decisions.md`
6. Read `CLAUDE.md` if it exists
7. If component inventory is not approved, stop and direct to `/component-plan`

---

## Review areas

The architect agent reviews the full inventory against these areas:

### Component structure
- Any component too large — should be split?
- Any component too granular — unnecessary complexity?
- Missing components implied by page designs but not in inventory?
- Dependency ordering mistakes — component listed before something it depends on?

### Webflow and Client First
- Anything likely to conflict with Client First utility classes?
- Components that need Finsweet but aren't flagged?
- CMS-bound components where collection structure needs thinking through upfront —
  field types, relationships, item limits?
- Anything that will need a CMS collection that isn't yet planned?

### JS architecture
- Components sharing state that need a shared state object planned upfront?
- Animation components that need a GSAP context but aren't flagged as complex?
- Components that will need `ScrollTrigger.refresh()` after Barba transitions?
- Any init/destroy patterns that will need careful sequencing?
- Anything that looks like it will cause a memory leak if not cleaned up correctly?

### Barba lifecycle
- Components with interactions that could conflict with Barba page transitions?
- State that must persist across transitions — is it in the right place?
- Components that initialise on page load without a corresponding destroy?

### Spacing and layout
- Absolute placements flagged in inventory — any that are load-bearing for the design
  and need a client conversation before building?
- Any component where "nearest approximation" may not be close enough?

### Build sequencing
- Is the proposed build order correct given dependencies?
- Any components that should be built together rather than separately?
- Any components that will block multiple page builds if delayed?

---

## Output

Write `.claude/design/arch-review.md`:

```markdown
# Architecture Review — [Client Name]
**Date:** YYYY-MM-DD
**Status:** Draft

---

## Summary
[2–3 sentence overview of overall inventory health]

## ✅ No issues
[Components or areas that look solid]

## ⚠️ Risks — address before building
[Each risk with: component affected, description, recommendation]

## ❌ Blockers — must resolve before proceeding
[Anything that would cause significant rework if not addressed now]

## Recommended ADRs
[List any architectural decisions worth recording before build starts]

## Build order recommendation
[Adjusted order if any changes recommended — with reasoning]
```

After writing the report, ask:
"Arch review complete. [N] risks, [N] blockers found. Do you want to:
1. Proceed and address risks during build
2. Go back to /component-plan to resolve blockers first
3. Write the recommended ADRs now before proceeding"

Wait for answer. If ADRs requested, write them to `.claude/adrs/` before closing.

Once the user is happy, update `arch-review.md`:

```markdown
**Status:** Signed off
**Signed off:** YYYY-MM-DD
```

Do not close until signed off.

---

## Verification tests

1. `arch-review.md` exists with all review areas covered
2. Every risk has: component affected, description, recommendation
3. Build order recommendation provided even if unchanged
4. Any requested ADRs written to `.claude/adrs/` before closing
5. `arch-review.md` has `Status: Signed off` with date
6. Command did not run if component inventory was not in `Approved` status
7. No code files were created or modified
