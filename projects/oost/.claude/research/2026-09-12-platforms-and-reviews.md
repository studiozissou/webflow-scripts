# Research: booking platforms, review automation, incentive policy, review channels
**Date:** 2026-09-12 · **Agent:** general-purpose (sonnet) · **Status:** raw briefing, uncertainty flagged inline

## 1. Booking/reservation platforms (top 5 for a tiny independent)

**Formitable** (Dutch, Amsterdam-based; acquired by Zenchef Jan 2023, brand kept in NL; Resengo folded into the same group Sep 2023)
- ~€69–119/mo depending on tier (aggregator figures, not confirmed on Formitable's own NL pricing page); no per-cover commission; promos sometimes 50% off first 6 months.
- Collects guest email/phone at booking. Dutch-native UI.
- Built-in **automated post-visit "review verzoek" email** (confirmed on Formitable help center): sent next morning after a dining reservation, same evening for takeaway; lets you add a direct Google review link.
- Embeds via widget/button on website. No perpetual free tier.
- https://help.formitable.com/nl/articles/2720987-review-verzoek-email-aanzetten-of-aanpassen · https://formitable.com/en/formitablezenchefpressrelease

**Zenchef** (parent brand)
- ~€69–119/mo, no cover fees, no contract lock-in (per Zenchef marketing pages).
- CRM + automated email/SMS "guest engagement" campaigns; no single named review feature as clean as Formitable's.
- https://www.zenchef.com/plans · https://www.zenchef.com/solution/reviews-restaurant

**TheFork / TheFork Manager** (ex-Iens; owned by TripAdvisor)
- Per-cover commission for diners who book via the TheFork marketplace: roughly €2–5/cover scaling with ticket (third-party figures, indicative).
- TheFork Manager back-office has a separate monthly fee — NL figure not confirmed.
- Auto-emails every diner within ~24h asking for a review. Also a discovery marketplace — extra footfall for a new place.

**Eet.nu** (Dutch-native, pay-per-reservation, no subscription)
- Free to set up. €0.25 per reservation via your own site widget; €1.75/guest for reservations sourced via Eet.nu's own listing. No monthly fee.
- No confirmed automated review-request email — booking-only.
- https://reserveringen.eet.nu/

**BookDinners** (KHN-affiliated) — €35/mo Basic, €45/mo Extended. No commission.

Less fit: Superb (~€79/mo), Guestplan (pricing opaque), OpenTable (US-priced, thin NL penetration), Untill/Lightspeed (POS with add-on, overkill), Tably/Resengo (absorbed or unconfirmed).

Rough NL market share (third-party blog, unverified): Formitable ~30%, Zenchef ~25%, Guestplan ~16%, TheFork ~14%.

## 2. Automated review-request features

| Platform | Feature | Auto after visit? |
|---|---|---|
| Formitable | "Review verzoek email" with optional Google link | Yes, confirmed, next-day |
| TheFork Manager | built-in review request | Yes, within 24h |
| Zenchef | CRM campaign automation (generic) | Manual setup, not out of the box |
| Eet.nu | none found | No |
| BookDinners | unconfirmed | Unconfirmed |

Standalone: Trustoo (free tier, ~$9.99+), Kiyoh (~€25–35/mo), Feedback Company (~€39/mo) — automation flows not independently verified. Birdeye/NiceJob/Podium/Reviews.io — US/UK-priced, poor fit. Brevo free tier (300 emails/day) with "X days after date" automation is the cheapest DIY route. QR code + g.page/r/ short link from GBP "Ask for reviews" panel — free, zero software.

## 3. Google's incentivised-review policy — wording

Maps User Generated Content Policy, fake engagement:
> "Reviews or ratings that have been paid for, directly or in kind" … "Offer incentives – such as payment, discounts, free goods and/or services – in exchange for posting any review" are prohibited.
> "Content that has been posted due to an incentive offered by a business – such as payment, discounts, free goods and/or services" violates policy.

Covers indirect incentives (prize draws). Allowed:
> Merchants may "Solicit or encourage the posting of content that does represent a genuine experience, without offering incentives to do so or attempting to influence the rating or the contents of the review."

https://support.google.com/contributionpolicy/answer/7400114?hl=en

**NL/EU angle**: Omnibus Directive (2019/2161) transposed via BW 6:193c–193g (from background knowledge, not re-verified). ACM guidance (fetched):
- Nepreviews banned. Paid/incentivised reviews must be disclosed. "Betaalt u alleen voor een positief verhaal dan is dit reclame, geen review."
- Fines up to €900,000 per violation.
- https://www.acm.nl/nl/verkoop-aan-consumenten/reclame-en-verleiden/online-beinvloeden/reviews-en-beoordelingen-gebruiken

Takeaway: never "leave a review, get 10% off." Asking everyone is fine. Rewarding private feedback (not a public review) sits outside the ban.

## 4. Review channels ranked for a small NL restaurant, 2026

1. Google Business Profile / Maps — non-negotiable, free, first.
2. TheFork — aggregator + discovery marketplace; worth per-cover cost for a new place.
3. Facebook — older/local NL demographic; keep hours/photos current, no active solicitation.
4. Bing Places — free, import from Google; underlies Copilot and some AI-assistant local data.
5. Apple Business Connect — free, 15 min; Siri/Maps/CarPlay. No real review layer.
6. Eet.nu — claim because it's also the cheap booking tool; minor as a review destination.

Not worth active effort: TripAdvisor (claim once; tourist-zone bias), Yelp (irrelevant in NL), Iens (rebranded to TheFork 2019), Happy Cow (only if vegan-forward).

## Uncertainty flags
- Exact current Formitable/Zenchef NL pricing.
- Whether Trustoo/Kiyoh/Feedback Company have a named post-visit automation.
- BW 6:193c–193g as the complete Omnibus transposition.
- Guestplan and Tably pricing.
