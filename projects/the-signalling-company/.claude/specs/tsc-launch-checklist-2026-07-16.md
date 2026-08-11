# TSC — Launch Day Checklist (16 July 2026)

Go-live: **Thursday 16 July**.
Site: `The Signalling Company` (`tsc-v2`) · Domains: `www.thesignallingcompany.com`, `thesignallingcompany.com` (not yet published to custom domains).
DNS contact: **Laurent Stukkens** (verification TXT records live & confirmed).
Content punch list → `tsc-ceo-review-golive-2026-07-15.md`.

_Automated checks (Webflow MCP + staging crawl) run 16 Jul — results folded into the boxes below._

---

## AUTOMATED POST-LAUNCH RE-CHECK (16 Jul, live production crawl)

Full crawl of all 52 sitemap URLs + Lighthouse + CWV + live DOM checks against `www.thesignallingcompany.com`.

**🔴 Blocker**
- **Contact form submit button `disabled` on production.** "Send message" stays disabled on load; Turnstile `api.js` loads and `window.turnstile` exists, but **no widget renders → no token → button never enables**. Same behaviour as staging. Visitors cannot submit. → **Republish both custom domains, then retest main + pop-up forms** (bot-protection changes apply only after republish). Not yet submit-tested live (avoided firing a real notification).

**🟠 SEO gaps found (were assumed done)**
- **Canonical tags missing on all 36 CMS collection pages** — every `/news/*`, `/projects/*`, `/products/*`, `/services/*`, `/railos-apps/*`. Only the 16 static pages have one. `/news` list canonical is malformed (`www.thesignallingcompany.com/news`, missing `https://`). → Add self-referencing canonical in each collection template's SEO settings. **(Supersedes the "canonicals corrected" tick below.)**
- **`og:image` missing on all 9 `/railos-apps/*` pages** — social cards render imageless. → Add default OG image to the railos-apps collection template.

**🟡 Minor**
- Duplicate `id="Consent"` on both contact-form consent checkboxes (main + pop-up) — invalid HTML; give the pop-up one a unique id.
- SERP-truncation risks: titles >62 chars (`/services` 72, `/products` 66); `/careers` meta description 168 chars.

**✅ Verified healthy**
- All 52 pages 200 OK · SSL valid (Let's Encrypt, issued 16 Jul, expires 14 Oct) · apex→www + http→https 301 · KO pages (Akiem/App Store/PZB/KVB) 404 · robots.txt + sitemap (52 URLs) + llms.txt all correct on production
- Titles + meta descriptions all 52 **unique** · GA4 `G-HJDFRF0WQM` + GTM `GT-KV6RH5RB` on all 52 · `lang="en-GB"` sitewide
- JSON-LD rich + template-appropriate (Org/WebSite/Breadcrumb sitewide, FAQPage, Person, NewsArticle, Product, Service, SoftwareApplication)
- **Lighthouse mobile** — homepage & /products both **A11y 100 · Best Practices 100 · SEO 100** (0 failures)
- **CWV homepage** — LCP 321 ms · CLS 0.00 · TTFB 24 ms
- No JS console errors (only benign Webflow CSS-preload warnings)
- Mobile horizontal-overflow on `/services` + `/privacy-policy` (prior offenders) — **fixed**
- No missing image `alt` attributes

---

## PRE-LAUNCH — before publishing

### Blockers
- [x] AM call with Romain (Service children, video links)
- [x] App Store crosslinks hidden (nav / RailOS CTA)
- [x] ATO block on ETCS decided
- [x] Punch-list page edits applied (Škoda logo, banner, carousels, RailOS carousel, titles, "250", scroll bug)
- [x] Sensor Box / Computer Box content from JLA (or accept post-launch)
- [ ] Raise invoice
- [x] Corporate video on About (`youtu.be/9G0OXItQ1bA`) — verified
- [x] Add corporate video to Landing (same clip, `9G0OXItQ1bA`)
- [x] Lineas timelapse video from Romain — add on arrival

### Content & CMS
- [x] KO items unpublished — verified 404 on staging
- [x] No broken internal links to KO pages — verified
- [x] Lineas placeholder video field cleared
- [x] No lorem/placeholder text — verified across 19 pages
- [x] Project full-width images set (Lineas; 27ev is a render — swap if a real photo arrives)
- [x] Leadership two-section binding built (Designer)

### SEO / metadata
- [x] Unique SEO title + meta description on every published page — verified
- [x] JSON-LD schema comprehensive — verified (Org, Breadcrumb, FAQ, Person ×8, Product/Service/News/CreativeWork)
- [~] OG image + title/description set — **live crawl: `og:image` MISSING on all 9 `/railos-apps/*` pages** (rest OK); add default OG to that template
- [x] Sitemap reachable — verified (200, 52 URLs live, production domain, KO excluded)
- [~] Canonicals → production domain — **live crawl contradicts: 36 CMS collection pages have NO canonical; `/news` canonical malformed** (see post-launch re-check + Semrush #125)
- [x] Custom-domain robots.txt not disallow-all (staging correctly serves `Disallow: /`)
- [x] `llms.txt` present
- [x] 404 / 401 pages working

### Functional
- [x] Nav + footer links resolve — no dead links to KO pages
- [x] Favicon + apple-touch icon set — verified
- [x] GA4 + GTM present in `<head>` (`G-HJDFRF0WQM` / `GT-KV6RH5RB`)
- [ ] Confirm GA4/GTM are the production properties
- [ ] Forms submit + notifications fire (live test) — **⚠️ STILL DISABLED on production (16 Jul live check)**; republish + retest (see note below)
- [ ] Cookie consent loads; GA4 fires only after consent (live browser) — banner present live; GA4-gating not yet verified

> **⚠️ Known blocker — contact form submit button disabled on staging.** Cloudflare Turnstile spam protection is ON (Site Settings → Forms). Webflow disables the "Send message" button on load and only re-enables it once Turnstile issues a token. Turnstile's managed key is domain-scoped to the published production domain, so on `tsc-v2.webflow.io` the challenge fails (`turnstile.render()` → error `600010`) and the button stays disabled — **this is expected on staging, not a code bug** (`init.js` verified clean). Should resolve automatically once published to `thesignallingcompany.com`. If the button is still disabled on the live domain, **republish** (bot-blocking changes only take effect after republish) before treating it as broken. Residual: both consent checkboxes still share `id="Consent"` — give the pop-up form's one a unique id.

### Quality
- [~] Mobile pass (iOS Safari + Android Chrome) — automated overflow check clean on `/services` + `/privacy-policy`; full device pass still needed
- [ ] Cross-browser (Chrome, Safari, Firefox, Edge)
- [x] Lighthouse / perf on homepage + a heavy page — homepage & /products **100 a11y/BP/SEO**; LCP 321 ms · CLS 0.00
- [ ] Reduced-motion + keyboard/focus check

---

## GO-LIVE — publish + DNS
- [ ] Content freeze — no more edits until live
- [ ] Publish to both custom domains (`www.` + apex)
- [ ] Webflow shows both domains published
- [ ] DNS switch with Laurent (confirm live A/CNAME values in Webflow hosting settings)
- [ ] Set default domain + confirm the other 301-redirects to it
- [ ] SSL provisions after DNS resolves

---

## POST-LAUNCH — immediately after
- [x] `www.thesignallingcompany.com` resolves to the new site — 200, DNS live (16 Jul)
- [x] SSL valid — Let's Encrypt, issued 16 Jul, expires 14 Oct; no JS console errors (mixed-content not explicitly scanned)
- [x] apex → www redirect works — 301 ✓ (http→https also 301)
- [x] All main pages load — **all 52 sitemap pages return 200**
- [ ] Forms submit on production; notification received — **⚠️ "Send message" STILL DISABLED on load (16 Jul live); Turnstile widget not rendering → REPUBLISH + retest both forms**
- [~] Cookie banner appears; analytics fires post-consent — banner present; GA4-gating not yet verified in a live browser
- [~] Social share preview correct (LinkedIn post inspector) — not run; note `og:image` missing on `/railos-apps/*`
- [x] KO pages return 404 (Akiem, App Store, PZB, KVB) — all 404 ✓

## POST-LAUNCH — day 1
- [ ] Submit sitemap in Google Search Console; request homepage indexing
- [ ] Verify GSC domain property
- [ ] Confirm legacy URLs 301 to new equivalents (agency CSV)
- [ ] Monitor GA4 + forms for 24–48h
- [x] Rich Results Test on live URLs (`/test-schema`) — ran 16 Jul, 1 URL per template. **All valid**: `/products/etcs` + `/railos-apps/etcs-app` + `/railos` → **Product snippet VALID** + Organization/Breadcrumbs valid; `/news` + `/` → 3 valid items, **0 errors**. The only "error" is **Merchant listings: invalid** on Product pages — Google testing the markup for Google Shopping (needs real price/shipping/returns). **Expected & left as-is** for non-ecommerce B2B; the eligible Product-snippet result is valid. Screenshot: `research/test-page/rich-results-homepage-2026-07-16.png`.
- [ ] Swap in real assets as they arrive (corporate video, Lineas timelapse, 27ev photo, Board photos)
- [ ] Close out remaining RHO copy edits
- [ ] Send Romain a "you're live" note

---

## SEM RUSH SITE AUDIT — crawl 16 Jul (production domain)

_Source: Semrush project 30451602, snapshot `6a58e33d…`, 68 pages crawled. Site Quality **82/100**, AI Search **93/100**. 41 errors · 114 warnings · 62 notices. Deltas all 0 (first audit)._

### Fix before / at launch (real bugs)
- [x] **Doubled-domain News URL** — ✅ FIXED & published 16 Jul. News page canonical was `www.thesignallingcompany.com/news` (no protocol) → resolved to `…/www.thesignallingcompany.com/news` (404). Corrected to `https://www.thesignallingcompany.com/news`; verified live on staging + production. Clears the 4xx error, 4 broken canonicals, the broken internal links, and the bad sitemap entry (~9 items) on next crawl.
- [ ] **`/template/style-guide` link on the News article template → 404** — a leftover link in the News/Insights CMS template points to the unpublished style-guide template. Appears on ~11 news articles as a broken internal link. Remove or repoint it in the Designer (template-level, so one edit clears all).
- [ ] **Link to unpublished CAF Signalling article → 404** — the "TSC to Build Mobile App for Belgian TBL1+" post links to `/news/…caf-signalling-launch-open-cooperation-on-class-b-systems`, which is unpublished (KO). Remove or repoint the related-article link.
- [ ] **Redirect chain on /about (4 hops)** — the RailTech award link on About goes `…-award/` → `…-award` → `www.` → final `/news/etcs-wins-railtech-innovation-award` (301×3). Point the link straight at the final URL.

### Post-launch (schema + polish)
- [x] **Structured-data errors on 15 items (#45)** — ✅ FIXED & published 16 Jul. No fabricated ratings/reviews. Reclassified the 10 `SoftwareApplication` items → `Product` and added a "Contact for pricing" `Offer` to all 15. Products + RailOS Apps templates edited in Designer; `/railos` node updated via Webflow MCP. **All 15 verified live** as `@type: Product` + `offers`, no leftover app props. Ref: `schema/tsc-product-app-schema-fix.md`, `schema/tsc-schema-all.md`. Clears #45 (15→0) on next crawl.
- [ ] Broken **external** links ×2 (id 12) and 1 internal link to an HTTP page (id 31) — quick check + fix.
- [ ] Duplicate H1/title on 1 page (id 105) and multiple H1s on 1 page (id 104) — tidy headings.
- [ ] Non-descriptive anchor text ×6 (id 217); 13 pages with only one internal link (id 213); 3 pages >3 clicks deep (id 212) — internal-linking polish.

### Noise — no action (platform defaults / expected)
- 34× external 403s (id 218) — LinkedIn/social endpoints blocking the crawler; expected.
- Unminified JS/CSS ×55 (id 135) — ✅ our `init.js` now loads via jsDelivr auto-minify (`init.min.js`, 40 KB→13 KB); published 16 Jul. Remaining flags are Webflow platform files (`webflow.js`, site CSS, jQuery) — platform defaults, not actionable.
- Low text/HTML ratio ×55 (id 112) — Webflow platform default, not actionable.
- 7 permanent redirects (id 214) — the redirect map working as intended.

---

_Owner: Will._
