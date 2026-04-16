# Structure & Technical Audit — CourtesyMasters

**Date:** 2026-04-15
**Scope:** Custom code, dependencies, performance, Lighthouse, asset pipeline
**Related:** `reports/intake-report-2026-04-15.md` (see also Custom Code Migration Plan and Asset Optimisation sections)

---

## Summary

CourtesyMasters' Webflow site has a fragile custom-code setup built by the previous developer (Egenix agency, Jan–Jul 2025). The most critical risk is that all custom JavaScript is hosted on their GitHub repo (`egenix-ops/cm`) — if they delete it, archive it, or push a breaking change, the production site breaks with no rollback path. Alongside this, there are duplicate conflicting smooth-scroll libraries, a GSAP/ScrollTrigger version mismatch, and a Lighthouse Performance score of 53–55 (throttled mobile).

Real-world performance (measured in Chrome DevTools) is actually fast — LCP 159–243 ms on most pages — but `/for-employers` has a 2.2 s LCP caused by a large unoptimised PNG hero. Combined with the asset pipeline findings (PNGs are 80% of site bandwidth — see main report Asset Optimisation section), the site is paying a heavy performance tax it doesn't need to.

---

## 1. Custom Code Inventory

### 1.1 Site-wide `<head>`

| Script | Source | Risk |
|--------|--------|------|
| GTM (GTM-52WXPM23) | Google | Low |
| Google Ads (AW-1058961670) | Google | Low — should be in GTM |
| Norton SafeWeb verification | Norton | None |
| Bing Webmaster verification | Microsoft | None |
| Yandex verification | Yandex | None |
| Tawk.to | Tawk | **Commented out, empty tags** — remove |
| Instantly/Leadsy pixel | r2.leadsy.ai | Low |
| GSAP 3.12.5 | jsDelivr CDN | Low |
| ScrollTrigger 3.11.4 | cdnflare CDN | **Medium — version mismatch with GSAP** |
| Egenix custom JS | `cdn.jsdelivr.net/gh/egenix-ops/cm@88d4b83d.../main.js` | **Critical — external dependency** |
| Lenis 1.1.18 CSS | unpkg | Low |
| Lenis 1.1.18 JS + init | unpkg | Low |
| Lenis inline styles | Inline | Low |

### 1.2 Site-wide `<body>`

| Script | Source | Risk |
|--------|--------|------|
| GTM noscript | Google | None — correctly placed |
| Lenis (duplicate) | Foreign Webflow project assets (`645e0e1ff7fdb6dc8c85f3a2`) | **High — offbrand duplicate from unknown project** |
| Noopener script | Inline | None — **redundant since 2023** |

---

## 2. Critical Technical Debt

### 2.1 Egenix JS dependency (Critical)

**Risk:** All custom JavaScript lives on the previous developer's GitHub repository. CourtesyMasters does not control this repo. If Egenix:
- Deletes the repo → site breaks immediately
- Pushes a breaking change → site breaks when the CDN cache expires
- Changes the jsDelivr URL pattern → site breaks
- Goes out of business → no one can fix issues

**Mitigation:** Full migration plan documented in the main report (§Custom Code Migration Plan). Summary:
1. Download and audit the current `main.js`
2. Create a `courtesymasters/cm-webflow` GitHub repo under client's own org
3. Version-pin everything (`@v1.0.0` tags)
4. Swap CDN references on staging, test, then publish
5. Inform Egenix as a courtesy

### 2.2 Duplicate Lenis instances (High)

Two smooth-scroll libraries are loaded:
1. Lenis 1.1.18 from unpkg (head) — the correct one
2. A **duplicate Lenis** loaded from a different Webflow project's assets CDN (`645e0e1ff7fdb6dc8c85f3a2`) — likely a copy-paste from a template the previous dev used

**Impact:** Two competing scroll hijackers running simultaneously — potential jank, event listener conflicts, unpredictable behaviour.

**Fix:** Remove the body-embed duplicate entirely. Handled as part of the custom code migration.

### 2.3 GSAP / ScrollTrigger version mismatch (Medium)

- GSAP 3.12.5 (jsDelivr)
- ScrollTrigger 3.11.4 (cdnflare)

**Impact:** GSAP and ScrollTrigger must ship as matched versions. A version drift can cause silent breakage — especially with newer GSAP features that ScrollTrigger doesn't know about yet (or vice versa).

**Fix:** Load both from the same CDN at the same version (3.12.5). Handled as part of the custom code migration.

### 2.4 Minor cleanup items

- **Google Ads tag** — loaded as a separate gtag snippet; should be consolidated into GTM
- **Tawk.to remnants** — commented-out script with empty ID tags; remove
- **Noopener script** — redundant since Webflow handles this natively (2023+); remove

---

## 3. Lighthouse & Performance

### 3.1 Accessibility

| Page | Score | Status |
|------|-------|--------|
| Homepage | 94 | PASS |
| For Employers | 93 | PASS |
| Jobs | 93 | PASS |

**Recurring accessibility issues (all pages):**

| Issue | Severity | Detail |
|-------|----------|--------|
| Colour contrast | Medium | `#909090` (.u-text-dark-50) 3.19:1 and `#7A7A7A` (.u-text-dark-60) 3.9:1 on white fail WCAG AA 4.5:1 minimum. Cookiebot dialog: orange `#ff6720` on cream at 2.65:1. |
| Accessible names on links | Medium | Navbar logo, search icon, confidentiality icon, footer logo, breadcrumb home link all lack `aria-label` or visible text |
| Heading order | Medium | h5/h6 used decoratively on `/for-employers` and `/jobs` breaking sequential hierarchy |

**Fix:**
- Darken body text to at least `#767676` (meets 4.5:1 on white)
- Update Cookiebot theme to higher-contrast palette
- Add `aria-label` to icon-only links
- Convert decorative h5/h6 to `<p>` or `<div>` with styling classes (keep sequential h1→h2→h3 only)

### 3.2 Performance

| Page | Lighthouse Score | Real LCP (DevTools) | CLS (DevTools) |
|------|------------------|---------------------|----------------|
| Homepage | 53 | 243 ms | 0.05 |
| For Employers | 55 | 2,228 ms | 0.04 |
| Jobs | 55 | 159 ms | 0.02 |

**Interpretation:**
- **Lighthouse** uses simulated mobile throttling — the 53–55 scores inflate absolute timings. Treat as directional only.
- **DevTools real-browser trace** shows the site is fast in practice, except for `/for-employers` (2.2 s LCP).
- **`/for-employers` LCP root cause:** oversized hero PNG (likely 1–3 MB, no WebP fallback, no preload).

**Fix pattern for `/for-employers` LCP:**
1. Convert hero to WebP/AVIF
2. Add `<link rel="preload" as="image" href="...">` to the page `<head>`
3. Serve via `<picture>` with responsive `srcset`
4. Compress to ~150 KB max

### 3.3 Recurring performance issues (all pages)

| Issue | Severity | Detail |
|-------|----------|--------|
| `font-display` missing | Low-Medium | Fonts lack `font-display: swap` → FCP penalty |
| Third-party main-thread blocking | Medium | Cookiebot, GTM, Leadsy all contribute blocking time |
| Large PNG assets | **High** | See main report §Asset Optimisation — PNGs are 80% of bandwidth |
| OTF font format | Medium | `ConcretteXL-Regular.otf` + `Carentro.otf` should be WOFF2 |

---

## 4. Asset Pipeline

Full analysis in main report §Asset Optimisation. Summary:

| Type | Files | Bandwidth | % of total |
|------|-------|-----------|------------|
| PNG | 272 | 8.89 GB | **80.2%** |
| JPEG | 34 | 0.71 GB | 6.4% |
| AVIF | 94 | 0.66 GB | 6.0% |

**Key insight:** Webflow's auto-WebP/AVIF conversion is working (94 AVIF + 56 WebP files exist), but PNG originals are still being requested heavily — likely via OG image requests, CSS backgrounds, direct CMS URLs, and older clients.

**Expected impact of remediation:** ~55–60% reduction in total bandwidth, Lighthouse Performance 53–55 → 75–85.

---

## 5. Priority Remediation

### P0 — De-risk (Week 1-2)

1. **Migrate Egenix JS** to client-owned GitHub repo — see main report §Custom Code Migration Plan
2. **Remove duplicate Lenis** (handled as part of migration)
3. **Align GSAP + ScrollTrigger** to 3.12.5 from same CDN (handled as part of migration)
4. **Remove dead code** — Tawk.to remnants, noopener script, consolidate Google Ads into GTM

### P1 — Performance foundation (Week 2-3)

5. **Optimise `/for-employers` hero** — WebP + preload + srcset
6. **Add `font-display: swap`**
7. **Convert OTF fonts → WOFF2**
8. **Bulk image optimisation** — see main report §Asset Optimisation Phase 1
9. **Darken body text colours** for WCAG AA compliance
10. **Add aria-labels** to icon-only links
11. **Fix heading hierarchy** — no decorative h5/h6

### P2 — Ongoing hardening (Month 2+)

12. **Document the new setup** in `client.md` (repo URL, CDN pattern, deploy steps)
13. **Establish a changelog** for the `cm-webflow` repo
14. **Set up staging smoke tests** — Playwright or manual checklist for each deploy
15. **Monitor Core Web Vitals** via Search Console once GSC access is confirmed

---

*See main report `reports/intake-report-2026-04-15.md` for the full Custom Code Migration Plan and Asset Optimisation section referenced here.*
