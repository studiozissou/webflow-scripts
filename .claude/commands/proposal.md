# /proposal — Generate Client-Facing Proposal

Generate a client-facing proposal from an approved estimate.

**Pipeline position:** After `/estimate` (requires `Status: Approved`).

---

## Pre-flight

1. Read `projects/<client>/.claude/client.md` — abort if missing
2. Find the latest estimate in `projects/<client>/.claude/estimates/` — abort if missing
3. Check estimate `Status:` field — abort if not `Approved` (tell user to approve the estimate first)
4. Read `.claude/reference/rate-card.md` — for payment terms
5. Read `.claude/reference/about-me.md` — for profile content
6. Read `.claude/templates/proposal.md` — base template
7. Optionally read: `intake.json`, `intake-report`, `component-inventory.md`, `arch-review.md`, `figma-audit` output — for richer context

---

## Step 1 — Gather inputs

Ask the user for the following (skip any already answered in client.md or estimate):

1. **Project framing:** One sentence describing the project from the client's perspective
2. **Timeline:** Expected duration and start date
3. **Client requirements:** What do you need from the client to stay on track?
4. **Portfolio links:** Which portfolio projects are most relevant? (check about-me.md for options)
5. **Testimonials:** Which testimonials to include? (check about-me.md for options)
6. **Emphasis:** Anything specific to highlight or de-emphasise?
7. **Out-of-scope items:** What should be explicitly listed as out of scope?

---

## Step 2 — Generate proposal

Fill the proposal template using:

- **About this project:** Problem/solution/value framing from client context + user's framing sentence
- **Scope of work:** Pull directly from approved estimate — pages table, components table, CMS setup, additional items
- **Explicitly out of scope:** From user input + anything not included in estimate
- **Timeline:** From user input
- **Investment:** Client-currency totals only (no EUR base — that stays in the estimate). Pull from estimate summary
- **Payment schedule:** From rate card payment terms, applied to estimate total
- **Requirements from you:** From user input
- **About me:** Tailored from about-me.md — pick skills and framing relevant to this project
- **Portfolio:** Relevant projects from about-me.md
- **Testimonials:** Selected testimonials from about-me.md

---

## Step 3 — Review and approval

Present the full proposal to the user. Ask:

"Review the proposal above. What would you like to change?"

Iterate on changes until the user approves.

---

## Step 4 — Write proposal file

Write to `projects/<client>/.claude/proposals/proposal-YYYY-MM-DD.md`.

Create the `proposals/` directory if it doesn't exist.

Set `Status: Draft` in the output file.

---

## Verification

1. Estimate had `Status: Approved` before generating
2. All scope items from estimate appear in proposal tables
3. Investment section uses client currency only (no EUR)
4. Payment milestones sum to 100%
5. "Explicitly out of scope" section is populated
6. "Requirements from you" section is populated
7. About me / portfolio / testimonials are tailored, not generic
8. Proposal file written with `Status: Draft`
9. User reviewed and approved content before writing
