# Carsa Call Agenda — 25 June 2026

## 1. VDP Script Externalisation — Ready to Publish

Moved all 19 inline scripts (~45KB) from the VDP page body into a single CDN-hosted file (`vdp.js`).

**Performance:** No measurable change on cold load (LCP ~909ms before, ~925ms after — within variance). Repeat visits benefit from browser cache (~15-30ms saving per page on broadband, ~50-100ms on mobile). Not a speed play — this is a reliability and maintainability upgrade.

**Key benefits:**
- Version control, diffs, blame — previously invisible in Webflow editor
- Instant rollback via commit hash
- 19 automated acceptance tests now run against staging/live
- Any developer can read and modify without Webflow Designer access

**Action:** Approve publish to live. Will monitor finance calculator outputs post-publish.

**Phase 3 (low priority):** Hardcoded `requestUuid` in finance API, unthrottled MutationObserver, duplicated UTM logic, duplicate `formatCurrency` functions.

## 2. Was Price Bug (search results) — RESOLVED

Was Price on search results was showing Vehicle Status instead of the actual Was price. Fixed on 24 June.

- Confirm Tomek is happy with the fix.

## 3. WhatsApp Chat Replacement

Rishi requested replacing the current website chat widget with WhatsApp. Direction confirmed: link out to WhatsApp (not embedded). Goal is to maximise WhatsApp inbound messages for read rates and spam recovery. AI chat "v2" to be introduced separately later.

- **Decision needed:** Confirm implementation approach and timeline.

## 4. VDP Price Discount vs AutoTrader

Tomek shared SLT slide — wants the AT price discount shown more prominently on the VDP. Offered to build this based on the AT badge field.

- **Decision needed:** Get higher-res screenshot from Tomek and confirm design / data source.

## 5. Sell Car Restructure — Outstanding Items

`/sell-car` page is drafted but not live. Blocked on:
- Unique content (or launch as-is?)
- Which sell locations are live?

Store location pages need cross-links — same blocker on which stores offer selling.

- **Decision needed:** Tomek to confirm live sell locations so this can ship.

## 6. Monthly Site Report

New version of the June 2026 report sent via Notion. Tomek to give feedback on format — aiming for the right balance of brevity vs detail.

- **Decision needed:** Best day of month to run the scan (proposed: 1st of following month).

## 7. SEO Meeting Follow-up

Tomek asked about next steps from the SEO meeting — no reply captured yet.

- **Decision needed:** Align on SEO action items.

## 8. New Wolverhampton Store

Tomek shared photos of the new Wolves location.

- Any web updates needed for the new store listing?
