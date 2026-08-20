# NEM Life — Client Workspace

Intake & proposal workspace for taking over the NEM Life Webflow build (30 % complete, handed off from previous developer).

## Contents

- **`briefing.md`** — verbatim-ish extract of the client's Notion briefing (captured 2026-04-16 via Chrome DevTools because the Notion public API was down and the page is a JS SPA)
- **`takeover-plan.md`** — 5-phase scoped plan with hours, pricing (€3,240), risks, opportunities, and engagement structure
- **`slack-message.md`** — short client-facing summary, formatted for Slack
- **`audit/screenshots/`** — full-page screenshots of every audited page (desktop + mobile) from `nem-life-1.webflow.io`

## Key facts

- **Client contact:** Alex Reus (husband of Christel, founder of NEM Life — Dutch psychology brand)
- **Brand principal:** Christel Reus
- **Staging:** [nem-life-1.webflow.io](https://nem-life-1.webflow.io)
- **Live (old):** nemlife.com — Webflow site `NEMLife.com TEMP`, needs 301 migration
- **Figma:** file `8jRJkSvjuMQzYkA1gXc646` + PNG exports in `designs/`
- **Budget indicated:** €2,000 – €5,000
- **Quote:** **€3,240 fixed** (27 hours at €120/hr) — confirmed by Alex 2026-04-20
- **Out of scope:** Doe de zelftest (Phase 2 — Alex has dedicated brief), quiz block in Blog Item, Therapy/Couples therapy service pages (Alex building himself)
- **Proposed delivery:** 2–3 weeks from deposit to launch
- **Rate:** €120/hr (per house `rate-card.md`)
- **Ongoing care options:** Insights €120/mo · Care €480/mo (recommended) · Grow €960/mo

## Handover sensitivity

Previous developer was unreliable and hard to contact. Client is looking for someone calm, structured, and communicative. Proposal emphasises:
- Daily Slack check-ins
- Loom walkthroughs at every decision point
- No custom code unless strictly necessary (per brief)
- Client-First class methodology (inherited convention)
- Fixed scope + explicit "won't do" list to prevent scope creep in both directions

## Webflow MCP context

- Site ID: `69bfba56f3622791a798b816` (NEMLife.com NEW, shortName `nem-life-1`)
- Sibling site: `687204088df2ae8cbea5eb5f` (NEMLife.com TEMP — live on nemlife.com)
- 14 pages (2 drafts: Blank Page for Texts, System Elements)
- 4 CMS collections: Insights, Insights categories, Testimonials, Testimonials Categories
- 43 components registered
- Locales: NL primary + EN secondary, both currently disabled (contradicts briefing — flag at kickoff)

## Next actions (once client signs)

1. Kickoff call — resolve remaining open questions (newsletter provider, Share & Care scope)
2. Get Figma + Webflow collaborator + Notion + Slack access
3. Request final copy & asset drive
4. Deposit 50 % → start Phase 1
5. Bootstrap project inside the monorepo via `/bootstrap` once under contract

---

## Quiz component — design notes (`src/nem-test-phase-b.tsx`)

Per the repo rule, the component file carries no inline comments. The reasoning that
used to live in them is here.

### Build and deploy

**Never paste `src/nem-test-phase-b.tsx` into Webflow.** Everything in Webflow runs
inside one custom code component, so the relative imports cannot resolve there. Run
`npm run build:nem` and paste `dist/nem-test-phase-b.webflow.tsx`, which has the sibling
modules inlined. Edit the source; never edit the generated file. CI gates `main` on
generated-file drift.

Publishing the Webflow *site* does not rebuild the *code component* — that is a separate
artifact at `code-components.website-files.com/<moduleId>/module/`, and each build gets a
NEW `moduleId`. To confirm a paste actually shipped, re-fetch the page, read
`clientModuleUrl` out of the FEDERATION JSON, and grep the exposed bundle for a marker
that survives minification (`disabled` is 3 in the guarded build; local names like
`isTransitioning` are renamed away).

### Scoring and conclusions

The scoring engine lives in `./nem-test-scoring.js` (mechanism mapping, thresholds, flat
detection, fixed-order tiebreak) so it can be unit-tested with `node --test`. Conclusion
keys and IDs live in `./nem-test-conclusion-ids.js`, which also generates Alex's text
sheet.

Conclusion text tables are built from `CONCLUSION_KEYS` rather than hand-listed, so a
table can never be missing an outcome the engine can produce. Christel's copy goes in the
`REAL_*` overlays; anything unwritten falls through to a visible placeholder, so a missing
text reads as "not written yet" in QA rather than as a blank screen in production.

Never paste her copy in by hand — copy-paste and rendered reads both flatten in-cell
paragraph breaks into spaces. Re-export the CSV and regenerate via
`tools/nem/build-conclusion-texts.js`.

The conclusion outcome is derived from answers + gender rather than stored, so it cannot
go stale if either changes. It is declared above `handleSubmit` because that callback
closes over it. It falls back to `"male"` for the engine when gender is not yet set — the
outcome is only ever read after the profile screen has validated gender, so the fallback
keeps the hook total and unconditional rather than labelling anyone.

### Report intro lines

Looked up on the conclusion key **alone**. There is no gendered table, and that is not an
oversight: it is the one asymmetry against the conclusion texts (spec § 5). Built from
`INTRO_LINE_KEYS`, the 25 report-bearing keys — flat outcomes are absent because they
route to the contact link and never produce a report.

### The transition guard

`selectAnswer` is guarded against re-entry by a ref, not state: two clicks dispatched in
the same tick both read the same render's `isTransitioning`, so state alone is not a lock.
Without the guard, a second click inside the ~500ms fade window overwrites the recorded
answer **and** schedules a second advance, so the quiz skips a question and leaves it
`null` — which flows into `calculateScores` and the completion beacon.

`disabled={isTransitioning}` on the pills and back button is what closes the remount seam:
the wrapper is `<div key={currentStep}>`, so the subtree is replaced when the step changes
and a click dispatched into the doomed node lands on a detached handler. `disabled` makes
Playwright's actionability check — and a real user's second click — wait for the new node.

The lock clears in the same batch as the step change, so the freshly mounted node is
already interactive and the guard costs no perceived latency. The selected pill keeps
`opacity: 1` and its background while disabled: it is the user's only confirmation that
the click registered. `goBack` takes the same guard, because a back click mid-transition
would decrement `currentStep` while a pending advance is still queued and the two fight.

Timers are cleared on unmount — the chain otherwise leaks two timers per question and
fires state updates into an unmounted tree if the user navigates away mid-fade.

### The hydration gate

`disabled={isTransitioning || !hydrated}` — the `!hydrated` half is a second, unrelated
guard, and it is why the pills carry `disabled` in the server-rendered HTML.

**Webflow server-renders this component.** The quiz markup, including the answer pills and
question one's text, is present in the static HTML before any JavaScript runs; React then
hydrates it. So the pills are visible and clickable for a window before their handlers
exist, and a click in that window is lost outright — it does not queue and it does not
replay.

Measured on staging 2026-08-20 over ten loads: **one click in ten was lost entirely**, and
still lost with a twenty-second budget. On that run the element had no React fiber or props
key attached; on the nine that worked it did, and they advanced in a consistent ~550 ms.
This is a real user-facing fault on the first interaction of the quiz, not a test artefact.

The fix works because the server render happens with `hydrated` false, so the static markup
ships `disabled`. The browser will not dispatch a click on a disabled button at all, and
Playwright's actionability check waits for it to enable. The `useEffect` that sets
`hydrated` runs strictly after React has attached, so the gate opens at exactly the right
moment.

**Do not reach for a timeout here.** An arbitrary delay would either open the gate too early
on a slow connection or leave the quiz needlessly inert on a fast one; the effect is the
event we actually care about.

⚠️ A false trail worth not repeating: `loadEventEnd` measured in a browser with extensions
read ~8.3 s, which made the hydration window look impossible to hit. In a clean context the
page loads in ~550 ms and hydration lands squarely in it. Measure in an environment that
resembles the one the bug appears in.

### The completion beacon

Fires the moment the twentieth question is answered, for every outcome. It sits there
rather than at opt-in because flat outcomes never reach the opt-in screen at all, and
anyone who finishes the questions then abandons the form is otherwise invisible — the gap
between completions and reports is the number worth watching.

It carries no personal data because none exists yet: name, email and gender are collected
on later screens. `conclusionId` is deliberately not sent — its F/M segment needs a gender
we do not have, so sending one would mean inventing it. `conclusionKey` plus the gender on
the identified row reconstructs the ID later. Fire-and-forget: the promise is not awaited
and errors are swallowed, so a slow webhook can never hold up the conclusion screen;
`keepalive` lets it survive immediate navigation.

Scoring is **not** computed when the last question is answered — v2 conclusion IDs are
gender-scoped and gender comes from the profile screen next.

### Webflow and locale constraints

Webflow code-component props are **not localizable** — a prop holds one value across every
locale (its Dutch default). So Designer props are honoured only on the primary NL locale;
every other locale uses the code translations. This applies to the reassurance line and
the CTA label too.

Reduced motion is detected with a CSS media query rather than JS, because a JS-only check
missed cases where the pills stayed in the desktop row.

Scores are published to `window` for page-level analytics from inside an effect, not
during render — assigning to `window` in render is a side effect and would fire on every
re-render.

### Flat outcomes

`flat-low` and `flat-high` route to a contact link instead of the opt-in: the report is
built around one clear mechanism, which is precisely what a flat profile lacks. A plain
anchor, deliberately — an embedded form is a future nice-to-have.

⚠️ Both contact URLs are assumed, not confirmed against the live site.

### Disclaimer

The disclaimer is not rendered inside the component — it lives once on the landing page
below the module, to avoid a visible duplicate. `t.disclaimer` is kept for potential
future use. There is no `[data-element="disclaimer"]` hook on the live page.

### Debug mode

`?nemdebug=1` renders the conclusion ID, key and scores above the conclusion text, so Alex
and Christel can confirm which variant fired without Designer access, and Playwright can
assert on it. It is removed from the DOM entirely when off, so it cannot leak to a real
user via CSS.
