# Dejonghe & Morley — Client Context

## Company
- **Name:** Dejonghe & Morley
- **What they do:** Strategic advisory for law firms and investors — connecting law firms and private capital. Advise on positioning, deal structuring, investor support, alignment, partner matching, and post-deal integration.
- **Founders:**
  - **David Morley** — Former Global Senior Partner (Chairman), Allen & Overy (2008–2016); former Managing Director & Head of Europe, CDPQ.
  - **Wim Dejonghe** — Former Global Senior Partner, Allen & Overy; architect of the A&O Shearman merger.
- **Tagline:** "Connecting law firms and private capital"

## Site
- **URL:** https://www.dejonghemorley.com/
- **Platform:** Webflow (Webflow-hosted; no custom code repo in this monorepo prior to 2026-07-13)
- **Primary goal:** Lead generation / credibility for a boutique advisory
- **Target audience:** Law firm leaders and private capital investors
- **Contact:** hello@dejonghemorley.com

## Stack notes
- Standard Webflow build: jQuery 3.5.1, Webflow IX2, Finsweet Attributes (scrolldisable, cookie-consent).
- Webflow runtime/IX2 delivered via an obfuscated-path async script — susceptible to iOS content/tracking blockers (see bio-modal fix).

## Engagement
- **Scope:** Ad-hoc support (not built by us).
- **Main contact:** Will (via client).
- **Known issues:**
  - Bio "Read full bio" modals depended solely on Webflow IX2 → broke on iOS when the IX2 runtime was blocked. Fixed 2026-07-13 with a self-contained vanilla-JS safety net. See `specs/bio-modal-ios-fix.md`.
