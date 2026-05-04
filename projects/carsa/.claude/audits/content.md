# Carsa.co.uk Content Quality & Custom Code Audit
**Date:** 2026-05-04

## Summary

| Category | Status | Key Finding |
|----------|--------|---|
| Forms | PASS | Success messages confirmed on contact, finance, valuation forms |
| Image Alt Text | CRITICAL | 50+ images missing alt text across all pages |
| Viewport Meta | PASS | Mobile viewport present (Webflow default) |
| CMS Hygiene | FAIL | 3 template pages published for taxonomy-only collections |
| Dev/Test Pages | MIXED | 2 password-protected, 2 returning 404 |
| Text-to-HTML Ratio | GOOD | Strong body copy on key pages |
| Custom Code | CRITICAL | 6+ scripts on external GitHub — migration needed |

---

## 1. Forms & Submissions

**Status: PASS**

- Contact form: "Thank you! Your submission has been received!" confirmed
- Finance eligibility form: Success/error messages present
- Valuation form: Success message confirmed
- All forms include error handling: "Oops! Something went wrong while submitting the form."
- Forms use Webflow's native form handling

---

## 2. Images Missing Alt Text

**Status: CRITICAL — 50+ images**

Comparison to March audit (30+): Issue has expanded or was under-counted.

| Page | Examples |
|------|----------|
| Homepage | Car gallery images, logos, feature icons |
| /used-cars | All car listing images |
| /car-finance | Illustrations, partner logos, hero images |
| /stores | All 11 store photos, blog thumbnails |
| /blog | All article thumbnail images |
| /about/carsa | Store photos, benefit illustrations |
| /contact | Logo and blog preview (2 instances) |
| /faq | Logo (appears twice) |

**WCAG Impact:** Level A failure (SC 1.1.1 — Non-text Content)

---

## 3. Viewport Meta

**Status: PASS** — Webflow default present.

---

## 4. CMS Hygiene

**Status: FAIL**

| Collection | Template Page | Items | Status | Action |
|------------|--------------|-------|--------|--------|
| Testimonials | /testimonials | 7 | 404 | Depublish — taxonomy-only |
| Facilities | /facilities | 6 | 404 | Depublish — taxonomy-only |
| Car Badges | /car-badges | 0 | 404 | Depublish — empty collection |

These pages are in sitemap but return 404, causing crawl waste.

---

## 5. Dev/Test Pages Published

| Page | URL | Status | Risk |
|------|-----|--------|------|
| Impel Test | /development/impel-test | 401 Protected | Medium |
| Search Demo | /development/search-demo | 404 | Low (removed) |
| Our Team | /development/our-team | 404 | Low (removed) |
| Eligibility Hero MCP Test | /development/eligibility-hero-mcp-test | 401 Protected | Medium |

The 401 pages are password-protected but may still be indexed. Add `noindex` or depublish.

---

## 6. Text-to-HTML Ratio

**Status: GOOD**

- Homepage: Strong value prop ("£700 below Auto Trader market valuations, on average")
- /used-cars: Minimal text, filter-heavy (by design for VSRP)
- /car-finance: Dense content, 8+ Q&A pairs, thorough disclaimers
- /stores: Clear store info with hours and amenities
- /blog: Well-organized categories and pagination
- /faq: Excellent — 23 categorized Q&A pairs
- /about/carsa: Strong narrative, mission and values

---

## 7. Custom Code Inventory

### Custom Scripts (hosted on studiozissou GitHub via jsDelivr)

| Script | Purpose | Risk |
|--------|---------|------|
| homepage.js | Make/Model dropdowns, search state, price tabs, Part Exchange form, valuation form, card height equalization | CRITICAL |
| make-model-redirect.js | Make/Model dropdown routing on VSRP and CMS pages | CRITICAL |
| make-model.js | Alternative Make/Model template filtering | MEDIUM |
| check-finance.js | Finance eligibility link builder | MEDIUM |
| global.js | Empty file (no functionality) | LOW |

### Third-Party & Library Scripts

| Script | Source | Version | Risk |
|--------|--------|---------|------|
| Google Analytics 4 | gtag.js | GA-6WQDNZH59K | LOW |
| Google Tag Manager | GTM | GTM-MM5N6CP8 | LOW |
| VWO | dev.visualwebsiteoptimizer.com | Account 1130895 | MEDIUM |
| n8n Chat Widget | carsa.app.n8n.cloud/webhook/... | Custom | MEDIUM |
| @n8n/chat | CDN (jsdelivr) | Latest (unpinned) | MEDIUM |
| GSAP + Plugins | CDN | Inline registration | LOW |
| JetBoost | cdn.jetboost.io | Latest (unpinned) | LOW |
| jQuery | Webflow-bundled | Webflow default | LOW |

---

## Code Migration Plan

**Trigger:** 6+ custom scripts hosted on external GitHub (studiozissou/webflow-scripts).

### Recommended Repo Structure

```
carsa-business/carsa-webflow-scripts/
├── src/
│   ├── homepage.js
│   ├── make-model.js
│   ├── make-model-redirect.js
│   ├── check-finance.js
│   └── animations.js
├── dist/                    # Minified output
├── package.json
└── README.md
```

### jsDelivr CDN Pattern

```html
<!-- Pinned version (production) -->
<script src="https://cdn.jsdelivr.net/gh/carsa-business/carsa-webflow-scripts@1.0.0/dist/homepage.min.js"></script>

<!-- Never use @latest in production -->
```

### Version Pinning Rules

- Always pin to explicit semver: `@1.0.0`, `@1.1.0`
- Tag releases in GitHub — jsDelivr auto-serves
- Never use `@latest` or unpinned URLs in production

### Purge Workflow

1. Edit source in `/src/`
2. Test on Webflow staging
3. Tag release: `git tag v1.2.0 && git push --tags`
4. Purge if urgent: `https://purge.jsdelivr.net/gh/carsa-business/carsa-webflow-scripts@1.2.0/dist/homepage.min.js`
5. Update Webflow embed to new version URL
