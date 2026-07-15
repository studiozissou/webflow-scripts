# TSC — Metadata Re-Audit (WS-C)

> Slug: `tsc-launch-metadata-schema` · Date: 2026-07-15 · Scope: staging `tsc-v2.webflow.io`
> Method: live page-settings metadata (Webflow MCP `list_pages`) checked against page content
> and brand facts (`overview.md`). PASS = accurate + on-brand + within length; FIX = needs change;
> ADVISORY = acceptable but improvable (no change made, client-approved from prior build).

## Verdict summary

| Bucket | Count | Result |
|---|---|---|
| Static primary pages | 19 | 17 PASS · 2 ADVISORY (title length) |
| Published junk/duplicate pages | 2 | **FIX — needs Will's decision** |
| CMS templated items (Products/Services/Devices/News/Projects) | 43 | PASS (bindings intact, unchanged) |
| CMS RailOS Apps items | 11 | PASS (written this build, WS-A) |
| CMS Leadership items | 8 | PASS (seo-title/meta-description present) |

No PASS page was modified (no churn). Only FIX items are listed for action.

---

## C1 — Static pages

All live static pages carry an on-brand SEO title + description that matches page content.
Full pass. Two titles exceed ~60 chars and may truncate in SERPs — flagged ADVISORY only,
as both were signed off in the `tsc-cms-seo-fields` build and changing them now is churn:

| Page | Title | Len | Verdict |
|---|---|---|---|
| `/services` | Rail Signalling Services: Retrofit, Homologation & Maintenance \| TSC | 66 | ADVISORY (truncation risk) |
| `/products` | Railway Signalling Products: ETCS, Class B ATP & Telecom \| TSC | 61 | ADVISORY (borderline) |
| Home, `/railos`, `/about`, `/leadership`, `/careers`, `/news`, `/faq`, `/contact`, `/railos/devices`, `/railos/apps`, `/railos/open`, `/railos/app-store`, `/projects`, legal (privacy/cookie/disclaimer), `/404` | — | ≤ 60 | PASS |

Organization/brand facts in metadata are all **settled** (founded 2019, Škoda Group since 2023,
Brussels HQ, +32 2 882 59 00). No disputed claims (headcount, ">250 years", founder wording)
appear in any metadata string. ✔

## C1 — Published junk / duplicate pages (**FIX — Will's decision**)

Two Cargo-template leftovers are **published** (`draft: false`) and live/indexable on staging.
Both duplicate a real page and dilute crawl budget / risk duplicate-content signals:

| Page | id | slug | State | Recommendation |
|---|---|---|---|---|
| **Home B** | `6a55f18e003837bb9ead0371` | `/home-b` | published | Unpublish (duplicate of `/`) |
| **Projects B** | `6a554082256929bfb29b2e98` | `/projects-b` | published | Unpublish (duplicate of `/projects`) |

> Not actioned by the agent — spec C1 requires Will to decide keep/unpublish. All other
> template leftovers (Projects C/v1, About A/B/C, Contact A/B/C, Newsroom A/B/C, Case Study/-ies,
> Overview, Changelog, Licenses, Style Guides, Components, RailOS/Home Copy) are already
> `draft: true` and correctly excluded from publishing — no action needed.

## C2 — CMS items

- **Products, Services, RailOS Devices, News, Projects** (43 items): `seo-title` / `meta-description`
  bindings intact on their templates; descriptions trace to item bodies. PASS — untouched.
- **RailOS Apps** (11 items): written this build (WS-A). Verified live: distinct, on-brand titles
  ≤ 60 chars and 150–155-char descriptions; diacritics intact. PASS.
- **Leadership** (8 items): each has a per-person `seo-title` + `meta-description`. PASS.

## C4 — Fixes applied

None auto-applied. The only FIX items (Home B, Projects B) are gated on Will's keep/unpublish
decision (see C1). No PASS/ADVISORY page was modified.
