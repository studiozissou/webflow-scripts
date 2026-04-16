# Client clarifications — change list

**Date:** 2026-04-16
**To:** Menno-Paul Dekker (CourtesyMasters) — cc Fons Bitter (Founder)
**From:** Will
**Purpose:** Five focused clarifications on the 2026-04-11 change list so we can scope the programme accurately. PDF received and mapped — see `client-requests/change-list-mapped-2026-04-16.md`.

---

## Short version (Slack / WhatsApp)

> Hi Menno-Paul — have the 2026-04-11 list and have mapped every item into the plan. Five questions before I finalise scope:
>
> 1. **Item 1c ("text not black, max 80%")** — love the instinct, but 80% grey is currently failing accessibility contrast on white. Want to demo 2-3 values on staging (around 75-85% grey) and get your sign-off on the one that feels right. OK?
> 2. **Item 11 (Zapier)** — three paths: (A) harden the existing Zapier chain, (B) **replace with Microsoft Power Automate** (recommended — native to your MS365 tenant, much more reliable), (C) custom serverless. Which direction?
> 3. **Item 12 (Klaviyo)** — are you thinking of moving from Zapier → Klaviyo, or adding Klaviyo alongside for email marketing? What's the trigger?
> 4. **Item 14 (Cookiekot)** — keep and fix (contrast/compliance), replace with Cookiebot, or reduce cookies so we can drop the banner entirely?
> 5. **Item 21 (double Webflow structure)** — can you grant Billing access so I can see which workspace + site plans you're on and confirm the consolidation path?
>
> Everything else is clear. Will come back with a resequenced plan and updated proposal this week.

---

## Long version (email)

Subject: **CourtesyMasters — five clarifications on 2026-04-11 change list**

Hi Menno-Paul,

Thank you for the 2026-04-11 list. I've gone through all 23 items (17 and 23 are blank — so 21 actionable items) and mapped each one onto the remediation plan. The headline: **every item fits cleanly, and most of our technical findings are subsumed under your item 5 ("SEO + GEO optimalisatie - all EO") and item 10 ("growth engine / digital transformation").**

I'll come back this week with a resequenced plan that leads with your urgency signals — items **7** (footer), **4** (pixel-perfect padding), **5** (SEO/GEO), **6** (URL structure), and **10** (growth engine framing). The technical de-risk items (Egenix migration, Lenis, GSAP) stay in scope as the insurance policy underneath.

Before I finalise, five clarifications. The rest I'll default to my recommendation and flag in the proposal.

---

### 1. Item 1c — "text not black (max 80%)"

Your instinct is right — pure black feels harsh, and softening body text is a premium-brand signal. But the current body colours on the site (`#909090` and `#7A7A7A` on white, roughly 75-80% grey) already fail the WCAG AA 4.5:1 contrast minimum. So literally "max 80%" lands us below accessibility compliance.

**My proposal:** Push body text to ~`#3A3A3A` or `#404040` (≈ 75-80% black depending on measurement) — passes contrast, still feels "not black", retains the premium quiet feel. I'd like to drop 2-3 options on staging and let you pick the one that feels right. OK?

---

### 2. Item 11 — Zapier instability

You're right that the current setup feels unstable. Three options:

| Option | Effort | Reliability | Recommendation |
|--------|--------|-------------|----------------|
| A — Harden Zapier | Low | Moderate | Add retry logic + failure alerts. Still Zapier. |
| B — Replace with **Microsoft Power Automate** | Medium | **High** | Native to your MS365 tenant. No third-party hop for email routing. Keeps reCAPTCHA bridge where needed. | ⭐ |
| C — Custom serverless (Cloudflare Workers / Azure Functions) | High | Highest | Overkill for current volume. Worth revisiting at 10x scale. |

My strong recommendation is **(B)** unless you have a reason to stay on Zapier. Power Automate is included in your MS365 tenant and routes to Outlook/Exchange without the third-party failure mode. Which direction?

---

### 3. Item 12 — Klaviyo API?

Quick question: are you considering **moving email from Zapier → Klaviyo** (so Klaviyo becomes the email platform), or **adding Klaviyo alongside** for outbound marketing (e.g. candidate nurture sequences)? They're different workstreams.

For context: Klaviyo is overkill for transactional form routing (Power Automate covers that). It shines for segmented email marketing — candidate pipelines, employer newsletters, UHNWI drip campaigns. If that's the intent, happy to scope it. Otherwise we can park it.

---

### 4. Item 14 — Cookiekot keep or?

Three routes:

- **Keep Cookiekot + fix contrast.** The dialog currently fails WCAG AA. Compliance risk low, but not zero.
- **Replace with Cookiebot.** Industry-standard, enterprise-grade, better compliance audit trail. Migration ≈ half a day.
- **Reduce cookies, drop the banner.** Possible if we cut non-essential tracking. Depends on GTM / Google Ads requirements (you'd lose some measurement).

I default to **Cookiebot** for enterprise/recruitment brands because the audit trail matters if GDPR is ever questioned. Your call.

---

### 5. Item 21 — "Loose double structure (workspace and website, 2 plans)"

I read this as: you're paying for both a Webflow **workspace plan** and a **site plan**, and the billing feels doubled-up or unclear. To scope the consolidation I need **Billing access** to your Webflow workspace — could you add me (or your main contact) as a Billing admin?

Once I can see the plan structure I'll propose the cleanest consolidation — usually this ends with moving to a Freelancer workspace + single Site Plan, or keeping the workspace and dropping a redundant site plan.

---

### What's clear already

For completeness, the items I'm scoping without further input, with my working interpretation:

- **Items 1a, 1b, 1d, 1e, 1f, 1j** — sitewide typography + layout standards (center column under mega header, 1.5 line-height minimum, left-align, no word-break, bullet styling). I'll treat these as a single "editorial foundation" workstream.
- **Items 1g, 1h, 1i** — form simplification + RTE / copy-paste-from-Word fix. Consolidated into forms + CMS editing pass.
- **Items 2, 3, 4** — CSS hierarchy, component backgrounds, padding consistency. A design-system / token pass. I've logged your **"pixelperfect!!!"** urgency on 4.
- **Item 5** — subsumes all our SEO findings (19 JobPosting, 30 FAQPage, 27 truncated titles, 3 duplicate H1s, 28 broken external links, Article / Person / Organization / BreadcrumbList schema). This is the unlock.
- **Item 6** — URL structure rewrite with 301 redirect map. Includes splitting `/insights/` into `/insights/news/`, `/insights/blog/`, `/insights/video/` (or similar), fixing the `/industries-in-hospitaility` slug typo, and the `/jobs?tab=succesfully-closed-jobs` typo + hreflang conflict. Yoast-style permalink structure as the baseline.
- **Item 7** — "**Kick ass footer!!!!!!**" — I've logged this as your highest-urgency visual item. I'll propose a brief + 2 design directions + build. If you already have Figma concepts, share them and we start from there.
- **Item 8** — architecture / eco-system diagram. I'll draft this as part of the handover document — a one-pager + walkthrough video any developer can understand in 5 minutes.
- **Item 9a-f** — CMS manuals per template. Notion workspace + short Loom videos. You'll be able to brief any junior editor in 10 minutes.
- **Item 10** — "growth engine / digital transformation" — I'm using this as the **philosophy for the whole programme** (see attached narrative). Everything should ladder up to this.
- **Items 15, 16** — candidate + employer funnel map-out + optional Powerpath/Dynamics automation. High-value retainer work. I'll scope an investigation phase first (your current funnel state, Powerpath API surface), then an automation phase.
- **Items 18, 19, 20** — AI agent workstream (SEO monitoring, content assistance, text-check / brand-voice agent). All HITL per your instruction. Retainer-tier work.
- **Item 22** — remove partnercode permanently. Tied to the Egenix offboarding / code migration workstream.
- **Item 13** — esiglobal.com (ESI Global, sister company) — **reclassified 2026-04-16.** Menno-Paul confirmed ESI should get the same programme treatment as CM; will scope as a separate SOW with its own intake. Mailchimp sits inside that wider engagement.

---

Happy to jump on a 30-minute call if easier than email. Otherwise will send the resequenced proposal once I have your five answers.

Will
