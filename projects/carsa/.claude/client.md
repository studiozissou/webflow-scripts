# Carsa — Client Context

## 1. Company
Carsa — used car sales company with multiple stores across the UK.

## 2. Primary site goal
Lead generation (drive enquiries, test drives, finance applications).

## 3. Target audience
UK consumers looking to buy used cars.

## 4. Geographic market
UK — multiple physical locations nationwide.

## 5. Known competitors
Autotrader, Cinch, and other used car sales platforms.

## 6. Engagement scope
Ad-hoc — as-needed basis, no fixed retainer.

## 7. Main contact
Tomek Stacharski (PM). Not the technical contact directly — routes through him.

## 8. Other teams
In-house tech team handles backend/API work. Grant is the dev contact on their
side. Various content editors touch the site. Will (us) is the primary person
working in the Webflow Designer.

## 9. Platform history
Built on Webflow from the start. No migration.

## 10. External repo — focalstrategy/carsa-website-support

The in-house team's shared repo for Carsa website support code (React apps, AWS
infrastructure, SST stacks). We have contributor access.

- **GitHub:** https://github.com/focalstrategy/carsa-website-support
- **Local clone:** `~/carsa-website-support/`
- **Stack:** TypeScript, React, SST (AWS serverless), Vitest + Jest
- **Default branch:** `main`

### Delivery workflow (Hybrid model)

We develop and test scripts in **this repo** (`webflow-scripts/projects/carsa/`),
then PR deliverables to the external repo when ready for production.

1. **Develop here** — write, test, and iterate in `webflow-scripts` as usual.
2. **When ready to deliver** — create a feature branch in `~/carsa-website-support/`,
   copy the production-ready script(s) into the `webflow/` folder, and open a
   PR against `main`.
3. **Target folder** — all our deliverables go in `webflow/` at the repo root.
   Organise by type (e.g. `webflow/schema/`, `webflow/scripts/`). Do not scatter
   files across their existing `apps/` or `core/` folders.
4. **PR format** — include what the script does, which Webflow pages use it,
   and any Webflow embed/custom code references.
5. **Do not** push our `.claude/` docs, specs, research, or audits to their repo.
   Those stay private in this repo.

### What lives where

| Content | Location |
|---------|----------|
| Dev scripts, iterations, experiments | `webflow-scripts/projects/carsa/` |
| Specs, research, audits, comms | `webflow-scripts/projects/carsa/.claude/` |
| Schema templates | `webflow-scripts/projects/carsa/schema/` |
| Production-ready deliverables | PR to `focalstrategy/carsa-website-support` → `webflow/` folder |

## 11. Known issues / out of scope
None flagged yet.
