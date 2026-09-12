# Research: comms channels, automation, GDPR, day-one footprint (Haarlem)
**Date:** 2026-09-12 · **Agent:** general-purpose (sonnet) · **Status:** raw briefing; vendor-blog numbers flagged as directional

## 1. Channels

**Instagram** — strongest local food discovery channel in NL. Reels ~30% avg reach vs ~13% photo posts; location-tagging every Reel is the main discovery lever. Realistic cadence for a 2-person kitchen: 2–3 Reels/week + Stories. Free; Meta Business Suite scheduling. **Primary channel.**

**WhatsApp Business app (free)** — greeting/away messages, quick replies, catalogue, click-to-WhatsApp link, business directory. Broadcast lists capped at 256 contacts (recipient must have you saved). **Sufficient for this scale.**

**WhatsApp Business Platform/API (paid)** — since 1 Jul 2025 billed per message; NL marketing template ≈ €0.13/msg (one of the most expensive markets). Free-form replies in 24h service window free; from 1 Oct 2026 per-message billing extends to service replies — confirm before committing. **Skip.**
https://blueticks.co/blog/whatsapp-business-pricing-europe-2026 · https://sleekflow.io/blog/whatsapp-business-price

**WhatsApp Channels** — one-way broadcast, no opt-in handshake. Optional.

**Email** — Brevo free: 300/day, automation up to ~2,000 contacts. MailerLite free: low caps. Restaurant open rates ~32–44% vs ~19–25% all-industry (sources vary). **Monthly note once ~200 emails collected.**

**Facebook** — claim, cross-post Reels automatically, otherwise ignore. Shows for brand-name searches; older local demographic.

**TikTok** — optional; only if a family member wants to do it.

**GBP as a channel** — Google killed native GBP messaging (2024) and public Q&A (Nov/Dec 2025), replaced by "Ask Maps" AI answers sourced from GBP data/reviews/website. GBP can link a WhatsApp number for chat. Posts still work. **Completeness matters more than before.**
https://support.google.com/business/answer/14919056

**SMS** — ~€0.03–0.08/msg, explicit opt-in required (no soft opt-in). **No reason to add.**

## 2. Automation: guest ate → review/list invite

1. **Formitable built-in review automation** — auto email/SMS after booked visit, certified diners only, can push to Google/TripAdvisor. Lowest effort *if* on Formitable anyway. ~€69–129/mo (get a quote). Wasted if mostly walk-ins.
2. **QR on bill/table** → Google review short link (GBP "Ask for reviews") or WhatsApp join link. Zero cost, works for walk-ins. **Best fit.**
3. **POS-triggered** (Lightspeed/SumUp/Square) — integrations thin; Lightspeed has no native Zapier; needs someone comfortable with Make/n8n. Not for this owner profile.
4. **Brevo/MailerLite + manual list** — free automation, requires capturing emails.

No confirmed ready-made Make/n8n/Zapier + NL-POS review recipe exists — don't over-promise.

## 3. GDPR / NL rules

- **Post-visit review email**: **soft opt-in** (Telecommunicatiewet art. 11.7) — allowed to existing customers whose email was collected with a sale/reservation for similar services, PROVIDED (a) told at collection, (b) chance to object at collection, (c) unsubscribe in every message. Use soft opt-in, not bare legitimate interest.
- **1 Jul 2026**: soft opt-in abolished for **telemarketing (calls)** — still applies to email.
- **SMS**: explicit prior opt-in, always.
- **WhatsApp**: Meta requires opt-in for business-initiated messages; for the free app, being saved in contacts + having messaged first is generally treated as sufficient.
- **Booking-form wording** (disclosure notice, not a mandatory checkbox):
  > "We may email you a short review request after your visit and occasional updates about [Restaurant]. You can opt out any time via the link in each email."
  Plus optional, unticked: "Yes, I'd like occasional news and offers from [Restaurant] by email." and "Tick here for occasional updates via WhatsApp."
- One-click unsubscribe on every marketing email; keep a dated record of disclosure/consent.

https://ddma.nl/legal/wetgeving/e-mail/ · https://www.legalz.nl/blog/soft-op-in-voor-telemarketing-vervalt-1-juli-2026-is-uw-organisatie-voorbereid

## 4. Day-one digital footprint (Haarlem)

Free, self-submit:
- **Google Business Profile** — video verification often default now.
- **Apple Business Connect** (rebranded "Apple Business", Apr 2026).
- **Bing Places** — rebuilt Oct 2025 at bing.com/forbusiness; import from Google then re-check categories.
- **KvK Handelsregister** — mandatory; aggregators pull from it.
- **Eet.nu** — dominant NL restaurant guide, ~1.5M monthly visitors, free listing.
- **TheFork** — free to list; commission only on marketplace bookings.
- **Tripadvisor** — free claim; Haarlem has real tourist footfall.
- **Facebook + Instagram** business profiles.
- **OpenStreetMap** — feeds Foursquare, in-car nav, many apps.
- **Waze** — Waze Map Editor.
- **Foursquare** — business.foursquare.com.
- **Yelp** — claim, minutes, no downside.

Haarlem-specific:
- **VisitHaarlem.com (Haarlem Marketing)** — free self-submit; website@haarlemmarketing.nl.
- **Indebuurt Haarlem / Haarlem City Blog / Haarlems Dagblad / Uitagenda** — submission mechanics **unverified**; check each site's "tip ons"/contact page.
- **Local foodie Instagram**: @waarhaarlemeet (~7.2k), @haarlemfood (~3.2k) — accept tags/submissions; invite for soft opening. **Most actionable non-obvious lever.**
- Path to press: direct "nieuwe horeca" tips to Haarlems Dagblad + Indebuurt editorial; invite the two IG accounts.

## Caveats
- Vendor-blog numbers (email open rates, Formitable pricing) vary widely.
- WhatsApp API pricing changed again Oct 2026 — confirm with a BSP if ever needed.
- Local outlet submission mechanics unverified.
