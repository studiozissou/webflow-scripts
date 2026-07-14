# Mobile Test Report — tsc-v2.webflow.io

**Date:** 2026-07-08 | **Mode:** Mobile-focused | **Viewport:** 375×812 (iPhone, DPR 3)
**Scope:** 21 pages — all main/nav pages + 1 representative per CMS template
**Goal:** Find clear mobile layout bugs before sending for review

## Verdict

**2 pages have clear, must-fix mobile layout bugs. 19 pages are clean** (no horizontal overflow, no console errors on spot-checks).

| # | Page | Status | Overflow |
|---|------|--------|----------|
| 1 | `/projects` | 🔴 **BROKEN** | 492px |
| 2 | `/contact` | 🔴 **BROKEN** | 281px |
| — | `/` (home) | ✅ Pass | 0 |
| — | `/about` | ✅ Pass | 0 |
| — | `/services` | ✅ Pass | 0 |
| — | `/products` | ✅ Pass | 0 |
| — | `/leadership` | ✅ Pass | 0 |
| — | `/news` | ✅ Pass | 0 |
| — | `/careers` | ✅ Pass | 0 |
| — | `/faq` | ✅ Pass | 0 |
| — | `/railos` | ✅ Pass | 0 |
| — | `/railos/apps` | ✅ Pass | 0 |
| — | `/railos/devices` | ✅ Pass | 0 |
| — | `/railos/app-store` | ✅ Pass | 0 |
| — | `/railos/open` | ✅ Pass | 0 |
| — | `/railos-devices/computer-box` (device tmpl) | ✅ Pass | 0 |
| — | `/railos-apps/etcs-app` (app tmpl) | ✅ Pass | 0 |
| — | `/products/etcs` (product tmpl) | ✅ Pass | 0 |
| — | `/services/training` (service tmpl) | ✅ Pass | 0 |
| — | `/news/worlds-first-software-defined-etcs-certified` (news tmpl) | ✅ Pass | 0 |
| — | `/projects/skoda-regiojet` (project tmpl) | ✅ Pass | 0 |

> Template pages pass, so the sibling CMS detail pages (17 devices, 11 apps, 5 products, 5 services, 13 news, 3 projects) share the same clean layout and are very likely fine.

---

## 🔴 Bug 1 — `/projects`: filter tabs + tab pane don't collapse on mobile

**Symptom:** Document renders 868px wide in a 375px viewport → 492px horizontal scroll. Content is clipped at the right edge and a large empty dark gutter sits to the right. The "100% Software-defined" stat and project card text are cut off.

**Root cause:** The Webflow **Tabs component** in the projects section:
- The tab-link menu (`.cta_main.is-secondary.is-tab.w-tab-link` × 4 — "Fleet Operators / Fleet Leasing Companies / Infrastructure Managers / Locomotive & Train Manufacturers") lays out as a **single non-wrapping horizontal row** (~868px wide).
- The tab pane grid `.grid_features.is-1` keeps its **wide multi-column layout** at mobile instead of stacking.

Everything else at 868px (nav, footer, blur panels) is a `width:100%` symptom, not the cause.

**Fix direction:**
- Set the tab menu (`.tab_menu` / the `w-tab-menu` wrapper) to `flex-wrap: wrap` (or make it a horizontally-scrollable strip with `overflow-x:auto`) at the mobile breakpoint.
- Collapse `.grid_features.is-1` to a single column (`grid-template-columns: 1fr`) at ≤479px.

---

## 🔴 Bug 2 — `/contact`: contact hero 2-column layout doesn't stack on mobile

**Symptom:** Document renders 656px wide in a 375px viewport → 281px horizontal scroll. Top "Operations HQ / Media Contact" cards look OK, but the underlying `.contact-a` section and form column overflow; the "100% Software-defined" stat is clipped.

**Root cause:** The `.contact-a` section is a **2-column layout** (`.left_contact-a` + `.right_contact-a`). Each column stays ~637px wide because the grid/flex **does not collapse to a single column** at the mobile breakpoint. `.left_contact-a` (637px, containing the form) is the leaf offender that sets the 656px document width.

**Fix direction:**
- At the mobile breakpoint, set the `.contact-a` parent grid to a single column (`grid-template-columns: 1fr`) / stack the flex columns (`flex-direction: column`).
- Ensure `.left_contact-a` / `.right_contact-a` are `width: 100%` (not a fixed px width) at ≤479px.

---

## Method & caveats

- **Sweep:** same-origin iframe rendered at 375px across all 21 pages to detect horizontal overflow and identify offending elements (fast, no per-page navigation).
- **Confirmation:** the 2 flagged pages re-tested under real Chrome mobile emulation (375×812, DPR 3, touch) with full-page screenshots and leaf-element pinpointing.
- **Console:** homepage checked — no errors.
- **Not covered (out of scope for this pass):** Lighthouse/perf/CLS, tap-target sizing, colour contrast, and non-overflow visual bugs (text overlap, image scaling) on the 19 clean pages beyond the homepage spot-check. Horizontal overflow is the dominant "broken layout" signal and was the stated priority.

## Screenshots
- `projects-mobile-375.jpeg` — broken tabs/overflow
- `contact-mobile-375.jpeg` — broken 2-column contact
- `home-mobile-375.jpeg` — clean reference
