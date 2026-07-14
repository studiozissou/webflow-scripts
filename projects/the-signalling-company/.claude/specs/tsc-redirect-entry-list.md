# TSC 301 Redirect — Webflow Entry List

**Date:** 2026-07-07
**Where:** Webflow → Site Settings → Publishing → 301 Redirects
**Full context:** `tsc-redirect-strategy-2026-07-07.md` · source of truth: `tsc-redirect-map.csv`

Old paths are slash-less (Webflow strips trailing slashes before matching).
17 rules total (16 if skipping the optional `/feed`). Publish the site to apply.

| # | Old Path | Redirect To |
|---|----------|-------------|
| 1 | `/category/(.*)` | `/news` |
| 2 | `/privacy` | `/privacy-policy` |
| 3 | `/feed` | `/news` |
| 4 | `/a-better-etcs-onboard-no-more-no-less` | `/news/a-better-etcs-onboard-no-more-no-less` |
| 5 | `/digital-stms-will-accelerate-ertms-roll-out` | `/news/digital-stms-will-accelerate-ertms-roll-out` |
| 6 | `/geert-pauwels-ceo-of-lineas-wins-prestigious-european-railway-award` | `/news/geert-pauwels-ceo-of-lineas-wins-prestigious-european-railway-award` |
| 7 | `/nomination-of-stanislas-pinte-as-ceo-of-thesignallingcompany` | `/news/nomination-of-stanislas-pinte-as-ceo-of-thesignallingcompany` |
| 8 | `/shaping-the-train-positioning-algorithms-of-the-future` | `/news/shaping-the-train-positioning-algorithms-of-the-future` |
| 9 | `/the-signalling-company-and-try-and-cert-introduce-silicon-valley-best-practice-into-european-etcs-development` | `/news/the-signalling-company-and-try-and-cert-introduce-silicon-valley-best-practice-into-european-etcs-development` |
| 10 | `/positive-assessment-from-tuv-rheinland-for-ievc-product-design` | `/news/tuv-rheinland-positive-assessment-ievc` |
| 11 | `/skoda-group-acquires-a-majority-stake-in-the-signalling-company` | `/news/skoda-group-acquires-majority-stake` |
| 12 | `/thesignallingcompany-to-build-new-mobile-app-to-function-as-the-belgian-class-bsystem-tbl1-on-its-etcs-solution` | `/news/tsc-mobile-app-belgian-tbl1-plus` |
| 13 | `/first-locomotive-authorised-with-the-signalling-companys-software-defined-safety-system` | `/news/first-locomotive-authorised-tsc-platform` |
| 14 | `/introducing-the-worlds-1st-software-defined-etcs-certified-safety-system` | `/news/worlds-first-software-defined-etcs-certified` |
| 15 | `/stans-etcs-diary-11-days-australia` | `/news/stans-diary-11-days-in-australia` |
| 16 | `/the-signalling-companys-etcs-wins-railtech-innovation-award` | `/news/etcs-wins-railtech-innovation-award` |
| 17 | `/award-winning-etcs-soon-deployed-on-new-hybrid-regiojet-trains` | `/projects/skoda-regiojet` |

## Notes

- **Row 1** — one wildcard covers all three old category archives
  (`/category/news`, `/category/mise-en-avant`, `/category/uncategorized`).
- **Row 2** — WordPress currently 301s `/privacy → /privacy-policy`; that dies
  with WordPress, so recreate it here.
- **Row 3** — optional; catches legacy RSS pollers.
- **Row 17** — ⚠️ GAP. This post was not migrated (old site 14 posts, new 13).
  `/projects/skoda-regiojet` is an interim topical target; migrate the post and
  repoint to `/news/{slug}` when done.
- **No rule needed** — `/` (unchanged), `/news/` and `/privacy-policy/`
  (Webflow strips the trailing slash onto pages that already exist).
- **Posts must be individual rules** — old posts sit at root with no shared
  prefix, so they cannot be safely wildcarded (a `/(.*)` catch-all would swallow
  `/about`, `/contact`, etc.). Only `/category/*` wildcards cleanly.

## After entering: verify

Run the sweep in `tsc-redirect-strategy-2026-07-07.md` §7 against the production
domain once published — every old path should return `301` to its new target.
