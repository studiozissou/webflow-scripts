# Spec — TSC Projects Page Redesign

- **Slug:** `projects-page-redesign`
- **Client:** The Signalling Company (TSC)
- **Page:** `/projects` (`tsc-v2.webflow.io/projects`)
- **Author:** Will (via /plan)
- **Date:** 2026-07-13
- **Status:** Ready to Build
- **Deliverable:** Claude Design HTML/CSS prototype → Will rebuilds in Webflow Designer
- **Source of direction:** TSC Website Sync meeting, 2026-07-13 (Notion note `39ce1848bb518078a8a9fa367ee2e9a8`)

---

## 1. Problem

The Projects page is the **only major structural blocker to launch**. The current page:

- Buries the projects under a repetitive block: four audience sections (Fleet Operators, Fleet
  Leasing Companies, Infrastructure Managers, Locomotive & Train Manufacturers) each repeating
  near-identical *Why TSC / How we do it / What you get* prose. ~800 words of duplicated copy.
- Uses a filtering-style layout that fights the primary goal — showcasing projects — when there
  are only 2–3 projects to show.
- Doesn't make the projects (the trust signal) prominent: no logos, no hero photos, no metadata,
  no surfaced customer quotes.

## 2. Objectives (priority order, from the brief)

1. **Prove there are 3 real contracts.** Some prospects still doubt TSC has customers. This is
   the #1 signal the page must carry.
2. **Build trust through brand recognition.** Lineas, Škoda, and Akiem are well-known rail
   brands — their logos must be prominent.
3. **Show breadth of coverage** — freight & passenger, retrofit & new-build, multiple
   geographies, and multiple client profiles (operators, leasing, infra managers, manufacturers).

## 3. Scope

### In scope
- Redesign of the `/projects` list page only.
- Full-width **editorial alternating project rows** (hybrid direction: A layout + B metadata strip).
- Metadata tag strip per project using brand-book icons (vehicle type + project type).
- Surfaced customer quote per project (pulled from child page content).
- Condensed **single** 3-block value-prop section (Why / How / What) in a secondary position.
- A **stat headline** that carries the "3 contracts" proof at launch (see §7 Launch state).
- CMS schema definition for the new metadata fields (data population is a **separate task** —
  Ramon owns it; see §6).

### Out of scope
- Dynamic filtering (revisit when project count grows — meeting decision).
- Project **child-page** (`/projects/{slug}`) redesign. *Exception:* the brief asks for the same
  vehicle/project-type icons to also appear (non-clickable) on child pages — logged as a
  follow-up task, not built here.
- CMS data entry / metadata population (separate task, owner Ramon).
- Any change to nav, footer, or global styles.

## 4. Page structure (top → bottom)

```
1. HERO
   Eyebrow "Customers" · H1 "Our Projects"
   Stat headline: "Three programmes. Live across Europe."  ← carries #1 objective
   Sub: one line on breadth (freight & passenger · retrofit & new-build · pan-European)

2. PROJECT SHOWCASE  (the core — CMS Collection List, one item per row)
   Full-width alternating editorial rows. Card anatomy in §5.
   Launch: Lineas + Škoda render; Akiem auto-appears when its CMS item is published.

3. VALUE PROP  (secondary position, condensed)
   Section title (e.g. "Why fleets choose TSC")
   One row of THREE blocks, shown once — not repeated per audience:
     · Why TSC?        — lower lifetime cost of digital rail applications
     · How we do it    — care-inspired innovation, one future-proof platform
     · What you get     — evergreen software + plug-and-play devices
   Audiences named as a single supporting line/list, NOT four repeated sections:
     "For fleet operators, leasing companies, infrastructure managers, and train manufacturers."

4. CTA  (existing pattern, retained)
   "Ready to talk about your fleet?" + Get in touch
```

## 5. Project card anatomy (per row)

Full-width row, photo and content alternate side each row (row 1 photo-left, row 2 photo-right, …).

- **Hero photo** — landscape, ~4:3 / 16:10, project-specific.
- **Partner logo** — prominent, on/near the content column (objective #2). Mono/knock-out
  treatment for visual consistency; falls back to full-colour if a mono asset isn't available.
- **Title** — the project name (e.g. "The HLD77 Retrofit Project for Lineas").
- **Metadata tag strip** (objective #3) — inline chips, each an icon + label:
  - Vehicle-type icon + label (Freight / xMU / …)
  - Project-type icon + label (Retrofit / New-build)
  - Customer profiles (text chips)
  - Products (RailOS · iEVC) — text chips
- **Surfaced customer quote** — short pull-quote + attribution (see §8 content).
- **CTA** — "Read case study →" linking to the child page.

**Card states:**
- *Published* (has a live child page) → whole card links to `/projects/{slug}`, CTA visible.
- *Coming soon* (item exists but child page held back, e.g. Akiem pre-20th) → card renders with
  logo + metadata, CTA replaced with a muted "Full case study coming soon" label, not clickable.
  Implemented via a CMS boolean (see §6) so no code change is needed to flip it.

## 6. CMS schema (Projects collection)

Fields required to drive the redesign. **Data population is a separate task (owner: Ramon)** —
values below are from `~/Downloads/TSC Video Selects — Page Assignments(Metadata & Images).csv`.

| Field | Type | Notes |
|---|---|---|
| `Hero Photo` | Image | Landscape showcase image (may already exist) |
| `Partner Logo` | Image | Mono/knock-out preferred |
| `Vehicle Type` | Option (multi via reference or plain-text) | freight, OTM, shunting, passenger, xMU, heritage |
| `Project Type` | Option | Retrofit, New-build |
| `Customer Profiles` | Multi-reference / plain-text list | Fleet Operators, Fleet Leasing Companies, Infrastructure Managers, Locomotive & Train Manufacturers |
| `Products` | Multi-reference / plain-text | RailOS, iEVC |
| `Pull Quote` | Plain text | Short surfaced quote |
| `Quote Attribution` | Plain text | Name, role, company |
| `Coming Soon` | Switch (boolean) | true → render card in muted non-clickable state |
| `Location` | Plain text | Already on child pages (Belgium / Czech Republic / Pan-European) |

**Confirmed metadata values (from CSV):**

| Project | Vehicle | Products | Customer profiles | Type |
|---|---|---|---|---|
| Lineas | Freight | RailOS · iEVC | Fleet Operators, Fleet Leasing | Retrofit |
| Škoda / RegioJet | xMU | RailOS · iEVC | Infrastructure Managers, Loco/Train Mfrs | New-build |
| Akiem | Freight | RailOS · iEVC | All four profiles | Retrofit |

## 7. Launch state (Akiem handling)

- At launch only **Lineas + Škoda** child pages are published; **Akiem** is held to ~20th (fuller
  version in Sept).
- The card grid is **CMS-driven** — Akiem appears automatically the moment its item publishes.
  No redesign or redeploy required.
- Objective #1 ("3 contracts") is carried at launch by the **stat headline** ("Three programmes.
  Live across Europe.") plus, optionally, showing the Akiem card in the **Coming soon** state
  (§5). Final call on whether to show the 3rd card muted vs. hold it entirely is a content toggle
  (`Coming Soon` switch), reversible without a build.

## 8. Content (real, for the prototype)

- **Lineas** — Belgium · 109 freight locos · Retrofit.
  Quote: *"It's a completely different experience. Downtime for the fleet is a fraction of what it
  was with previous retrofit projects… TSC are risk killers for retrofit projects."*
  — Bruno Vanlede, Head of Rail Fleet Management, Lineas
- **Škoda / RegioJet** — Czech Republic · 34 new-built 27Ev xMU trains · New-build.
  Attribution: Tomáš Ignačák, Vice-Chairman, Škoda Group. (Quote body to confirm with Ramon.)
- **Akiem** — Pan-European (10 countries) · BR189 fleet · Retrofit viability assessment.
  Stat hooks: 10 countries, 87 t locomotive. (No customer quote yet — use a stat callout.)

## 9. Icon mapping (brand book p.26)

Source: `~/Downloads/04. Icons/` — SVGs, Light-blue (`LBlue`) and Dark-blue (`DBlue`) variants.

- **Vehicles/** (6 each): map to Vehicle Type — `vehicle icon01…06` → freight, OTM, shunting,
  passenger, xMU, heritage. *Exact number↔type pairing to confirm visually when building.*
- **Project Type/** (2 each): `project icon01/02` → Retrofit, New-build.
- Use `DBlue` on light backgrounds, `LBlue` on dark. Icons to be uploaded to Webflow assets on
  rebuild; embedded inline in the Claude Design prototype.

## 10. Claude Design build approach

- Build a single self-contained HTML/CSS prototype page in Claude Design (`use claude design`).
- Base direction: **editorial alternating rows** with the **metadata tag strip** on each card.
- Use TSC design tokens (pull from the live site / staging) — colours, type scale, spacing —
  so the prototype reads as TSC, not generic.
- Inline the brand SVG icons (from `04. Icons/`) directly.
- Render 2 live cards (Lineas, Škoda) + Akiem in **Coming soon** state, so Will can see both card
  states and decide the 3rd-card toggle.
- Responsive: alternating rows collapse to stacked (photo top, content below) on mobile.
- Deliver a `render_preview` URL for sign-off. Iterate on layout after first render (hybrid path).

## 11. Barba impact

**N/A — no Barba on TSC.** Site is plain vanilla JS loaded via `init.js` through jsDelivr; no SPA
transitions. No init/destroy lifecycle concerns. The redesign is Designer layout + CMS binding;
any JS (e.g. icon/quote helpers) would be a small addition to `init.js`, but the current design
needs **no custom JS** — it's native Webflow Collection List + CSS.

## 12. Verify loop

**How does the build know this is working?**

### Pass/fail criteria
- Prototype renders 2 full project cards (Lineas, Škoda) + 1 Coming-soon card (Akiem).
- Each card shows: hero photo, partner logo, title, metadata tag strip (vehicle icon + type,
  project-type icon + type, profiles, products), and a quote (where one exists).
- Hero shows H1 "Our Projects" + the 3-contracts stat headline.
- Value-prop section shows exactly **three** blocks (Why/How/What) once — not four repeated
  audience sections.
- Alternating layout on desktop; stacked on mobile (≤768px); no horizontal scroll.
- Icons render crisply (SVG), correct light/dark variant per background.

### Tier mapping
- **Tier 1 (auto, local):** N/A for the Claude Design prototype (no Playwright target). Once
  **rebuilt in Webflow**, `tests/acceptance/projects-page-redesign.spec.js` runs against staging:
  card count, tag-strip presence, single value-prop section, no console errors, reduced-motion,
  responsive, axe-core. *Test file authored now, runs at the Webflow-rebuild `/build` step.*
- **Tier 2 (CDN regression):** registry entry `projects-page-redesign` (added now) runs on
  `/deploy` after the Webflow page is live.
- **Tier 3 (manual):**
  - Visual sign-off of the prototype by Will → Romain/CEO (subjective design quality).
  - Logo knock-out treatment looks right against TSC palette (subjective).
  - Icon↔vehicle-type pairing is semantically correct (needs a human eye on the brand book).
  - Cross-browser (Safari/Firefox) of the rebuilt page.

### Regression scope (rebuilt page)
- Nav dropdown "Projects" list still links to all child pages.
- Footer + CTA unchanged.
- Child pages `/projects/{slug}` unaffected.
- No new console errors from `init.js` (UTM, video, spline helpers still run).

## 13. Task breakdown & parallelisation

| # | Task | Agent | Depends on | Parallel? |
|---|---|---|---|---|
| 1 | Build Claude Design prototype (editorial rows + tag strip, 3 card states) | art-director / claude_design | — | Stream A |
| 2 | Author acceptance test `projects-page-redesign.spec.js` (for the rebuilt page) | qa | spec | Stream B (parallel with 1) |
| 3 | Register test in `tests/registry.json` | — | 2 | after 2 |
| 4 | Will reviews prototype → iterate | — | 1 | sequential after 1 |
| 5 | Will rebuilds page in Webflow Designer (manual) | Will | 4 | sequential |
| 6 | Add CMS fields + populate metadata | Ramon (client) | — | parallel, client-side |
| 7 | Run acceptance tests against staging | qa | 5, 6 | after 5+6 |

**Recommendation:** Streams A (prototype) and B (test authoring) run in parallel. No worktrees
needed — prototype lives in Claude Design, test is a single new file. Critical path:
prototype → sign-off → Webflow rebuild → tests. Given the Wednesday launch and Will away
Thursday PM, prioritise Stream A today.

## 14. Open questions

- **Škoda quote body** — attribution known (Tomáš Ignačák), quote text to confirm with Ramon.
- **3rd card at launch** — show Akiem muted "Coming soon", or hold entirely until the 20th?
  (Reversible `Coming Soon` toggle; default: show muted to reinforce "3 contracts".)
- **Logo assets** — do mono/knock-out partner logos exist, or only full-colour? Affects card
  treatment.
- **Icon↔type pairing** — confirm which numbered SVG maps to which vehicle type against the
  actual brand book p.26.

## 15. Acceptance tests

Authored at `tests/acceptance/projects-page-redesign.spec.js` (runs against the **rebuilt Webflow
page**, not the prototype):

- `renders three project cards` (or two + one coming-soon)
- `each card has a metadata tag strip`
- `value-prop section has exactly three blocks`
- `no console errors on /projects`
- `respects prefers-reduced-motion`
- `alternating rows stack on mobile (no horizontal scroll)`
- `axe-core: no critical a11y violations`
