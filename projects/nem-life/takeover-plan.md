# NEM Life — Takeover Plan & Estimate

**Client contact:** Alex Reus (husband — primary point of contact)
**Brand principal:** Christel Reus (NEM Life — psychology brand, Dutch market)
**Staging site:** [nem-life-1.webflow.io](https://nem-life-1.webflow.io)
**Current live site:** nemlife.com (Webflow project `NEMLife.com TEMP` — to be migrated)
**Source briefing:** `briefing.md` (captured 2026-04-16 from Alex's Notion)
**Designs:** Figma file `8jRJkSvjuMQzYkA1gXc646` + PNG exports in `designs/` (reviewed 2026-04-16)
**Rate:** €120/hr (standard, per house rate card)
**Budget indicated:** €2,000 – €5,000
**Proposal date:** 2026-04-16
**Prepared by:** Will Morley

---

## TL;DR

Previous developer delivered substantial **desktop** work: Home, NEM Methode, Our Mission, Blog Insights main, Experiences, Link-in-bio, and Blank page are all built and close enough to the Figma designs to keep. The real remaining work splits into 5 clean phases.

**Quote: €3,240 fixed (27 hours at €120/hr).** Inside your €5k ceiling with €1,760 headroom.
**Timeline: 2–3 weeks from deposit to launch.**

**Scope confirmed with Alex (2026-04-20):**
- **Our Mission = Over ons** — no separate page; nav "Over" submenu points to Our Mission
- **Therapy + Couples therapy (Services page)** — Alex will build himself using existing components. Removed from scope.
- **Doe de zelftest** — out of scope for this phase. Alex has a dedicated brief for a separate Phase 2 engagement.
- **Quiz block in Blog Item body** — out of scope for this phase. Blog Item will include the modular Rich Text blocks (H2/H3, paragraph, image, quote, mid-page CTA) but not the interactive quiz component.

**Post-launch care package: €480/mo** (4h + monthly SEO/AEO report) — handles small iterations and ongoing AEO visibility after launch.

---

## What the design diff confirms

Diffed the Figma exports in `designs/` against the live audit screenshots in `audit/screenshots/`:

- **Home desktop** — structurally matches design. Needs interaction polish (3-image hover, 123 fade-in, FAQ single-open) and content wiring. Not a rebuild.
- **Home mobile** — design shows a rich, fully composed mobile layout. Live is a stripped skeleton. **Effective rebuild from the design.**
- **Blog Insights main desktop** — built. Needs CMS wiring (Essentieel / Selected / Popular / category-based logic) and real content. Not a rebuild.
- **Blog Insights Item page** — not built. Design is substantial (sticky side panel + 5 sub-components, modular body, "De essentie" checklist, 3-card CTA). Real build work.
- **Experiences** — built. Needs journey-type filter logic, dynamic CTA copy, load-more wiring.
- **Experiences Item page** — no design (brief says pure text single column). Simple template.
- **Our Mission, Link-in-bio, Blank** — built and close to design. Need mobile pass only.
- **Plumbing** — every nav/footer link points to `#`. Locales configured but disabled. Notification bar built but per-page show/hide needs verification.

---

## Scope & pricing

**Rate: €120/hr.** All phases below are hourly line items — totals are fixed on sign-off.

Standard add-ons (SEO setup, analytics, accessibility pass, cookie consent, handoff documentation) are **included at no extra charge** per house rate card.

Discovery, kickoff call, and Loom walkthroughs are absorbed into Phase 4 — not billed separately.

| # | Phase | What's in it | Hours | EUR |
|---|---|---|---:|---:|
| 1 | **Blog Insights Item page** | New template from scratch. Sticky side panel (Share & Care, Kerninzichten, Essentie quote, Zelftest CTA card, Gerelateerde inzichten). Modular body (H2/paragraph/image/quote/mid-page CTA via Rich Text). "De essentie" checklist. Full "Zet de volgende stap" 3-card CTA. Desktop + mobile. | 6.0 | €720 |
| 2 | **Experiences Item page** | Single-column text-only template per brief. H1 + intro + paragraph body. No images, no quote styling. | 1.0 | €120 |
| 3 | **Mobile responsive — all pages** | Home (biggest — effective rebuild from design), NEM Methode content template, Blog Insights main/Category/Item, Experiences main/Item, Our Mission, Link-in-bio, Blank. Fix nav+notification stacking, typography scale, image sets. | 8.0 | €960 |
| 4 | **Debug, plumbing & interactions** | Wire all nav + footer links. Enable NL locale, hide EN. Home 3-image hover sequence. 123 card fade-in on scroll. FAQ single-open. Sticky category bar (Blog Insights). Journey-type filter + dynamic CTA + load-more (Experiences). Tag-based "Veel gelezen" blocks. Shrink-on-scroll nav. Notification bar per-page show/hide. Console-clean pass. | 4.0 | €480 |
| 5 | **Performance, SEO, AEO, accessibility + launch** | Preload hero, WebP conversion pass, responsive image sets. Meta + OG + Article/Organization/FAQPage/Person schema. robots.txt, sitemap, hreflang. GEO/AEO DOM audit (essential text in DOM at load). axe-core pass on every template. Keyboard nav + reduced-motion. Lighthouse baseline + targeted fixes. 301 map from TEMP site, DNS cutover plan, final publish, smoke test, Loom handover. | 8.0 | €960 |
| | **Total** | | **27.0** | **€3,240** |

---

## Out of scope (flagged, scoped separately if needed)

- **Doe de zelftest** — Alex has a dedicated brief for this. Separate Phase 2 engagement once this launch is complete.
- **Quiz block in Blog Item body** — the interactive question/answer component visible in the design. Excluded per Alex's confirmation.
- **Therapy + Couples therapy service pages** — Alex will build using existing components.
- Copywriting in Dutch (I'll place supplied copy)
- Photography / illustration (stock sourcing available as upsell)
- Logo / brand identity work (done, per brief)
- Webflow Ecommerce
- EN locale activation (structure ready at launch, activation is Phase B — ~€720–€1,200)
- Post-launch content entry beyond first 5 articles + 7 testimonials to prove templates
- Hosting management (not offered)

---

## Payment terms

Per house rate card:

| Stage | Amount | When |
|---|---|---|
| Deposit | 50 % (€1,620) | On sign-off, before work starts |
| Milestone — desktop sign-off | 25 % (€810) | After Phases 1–2 complete |
| Final | 25 % (€810) | On launch |

- Bank transfer, 7-day payment terms
- Estimate valid 30 days
- 2 design revision rounds + 1 development revision round included per page
- Additional revisions billed at €120/hr
- Change orders (work outside approved scope) require written sign-off with updated pricing before work begins

---

## Post-launch: ongoing care packages

Keeping the site healthy, iterated, and visible in AI search over time. All three tiers match the house rate card.

### Insights — €120 / month
Report-only. No dev hours.
- Monthly automated report: Lighthouse, Core Web Vitals, GA4 summary, Search Console highlights
- Schema validation + broken-link check
- Email response within 48h (no priority queue)
- *Good for:* small business that just wants visibility, does its own content

### Care — €480 / month (recommended)
4 hours of dev/content time + everything in Insights.
- Small iterations (new sections, CMS updates, copy changes)
- Monthly automated report (as above)
- **Quarterly AEO audit** — how ChatGPT, Perplexity, Gemini, Google AI Overviews rank your content; specific fixes applied
- Priority response < 24h weekdays
- 6-month minimum, then month-to-month
- Unused hours do not roll over

### Grow — €960 / month
8 hours + everything in Care + content strategy.
- Monthly content strategy check-in (30 min call)
- Monthly AEO audit instead of quarterly
- Content cluster planning support
- A/B test recommendations on CTAs
- Priority response < 12h weekdays

**Why AEO matters for NEM Life** — a psychology brand with Christel as the named expert is a textbook case for AI search. ChatGPT and Perplexity quote sources that have (a) structured schema, (b) clear answer-first copy, and (c) named expertise. Quarterly audit + targeted fixes compound over 6–12 months into materially more inbound.

---

## Resolved questions (2026-04-20)

1. **Doe de zelftest** — out of scope. Alex has a dedicated brief; separate Phase 2 engagement.
2. **Quiz block in Blog Item** — out of scope per Alex.
3. **Therapy + Couples therapy service pages** — Alex will build himself using existing components.

## Still open before kickoff

1. **Newsletter provider** — Mailchimp? ActiveCampaign? Klaviyo? Mailerlite? (Affects form wiring time inside Phase 4)
2. **Share & Care** (Insights Item) — simple social share icons, or custom bookmark/save with persistence?

---

## Risks

1. **Home mobile is effectively a rebuild** — the design is richer than a pure "alignment" pass implies. Phase 3 is tight; priced for the real shape.
2. **Insights Item side panel is 5 mini-components in one sidebar** — built to spec this is ~4.5hr of the 6hr Phase 1 budget. Tight but doable.
3. **Figma MCP was hanging during audit** — designs were reviewed via PNG exports. If pixel-exact values or variable tokens are needed, I'll re-try Figma or request a fresh share link.
4. **Previous dev's Client-First compliance** — spot-checked and looks reasonable; full audit happens inside Phase 4. If a big cleanup is needed, flag early.
5. **Real Dutch content** — CMS is 100% Lorem. If copy slips, templates build against Lorem and need a content-pass revision (small risk, folded into revisions).
6. **Two Webflow sites** — TEMP site still lives on nemlife.com. 301 map + DNS in Phase 5; deeper content migration (if any) out of scope unless flagged.
7. **2–3 week timeline is tight** — feasible if Alex is responsive on Slack and content is supplied on time. If blockers stack, we slip to 3.5 weeks before rushing.

---

## Engagement structure (2–3 weeks)

- **Kickoff call (30 min)** — resolve remaining open questions; confirm scope + start date
- **Deposit 50 %** — on sign-off (€1,620)
- **Week 1:** Phase 1 (Blog Insights Item page build) + Phase 2 (Experiences Item page)
- **Milestone invoice 25 %** — at desktop sign-off end of Week 1 / early Week 2 (€810)
- **Week 2:** Phase 3 mobile responsive + Phase 4 debug/plumbing
- **Week 2–3:** Phase 5 performance/SEO/AEO/a11y + launch
- **Final payment 25 %** — on launch + Loom handover (€810)

Daily Slack check-ins, Loom for any decision needing client input. No surprises.

---

## Opportunities (not in quote — future upsell)

- **Phase 2: Doe de zelftest** — Alex has a dedicated brief. Scope separately once launch is complete.
- **Phase B: EN locale activation** — once NL is stable, unlock EN (~6–10 hrs, translation excluded)
- **Content population + stock photography** — place real copy per brief, source imagery (~€600–€1,200)
- **Alex link-in-bio** — trivial clone of Christel's page if wanted (~1–2 hrs)
- **Blog automation** — Notion → Webflow pipeline via Make.com (~6–8 hrs; strong fit for a content-led psychology brand)
- **Quiz block in Blog Item** — interactive question/answer component for articles. Scope with Phase 2 or separately.
- **Subtle animation polish** — restrained GSAP pass for premium feel (~3–5 hrs)
- **Care package** (monthly retainer) — see options above

---

## Decision points for Alex

1. ~~**Scope:** lock at €3,240 as-quoted?~~ **Confirmed 2026-04-20** — €3,240 / 27hr, no Services addon.
2. **Care package:** Insights (€120/mo), Care (€480/mo, recommended), Grow (€960/mo), or none?
3. **Start date:** Monday after deposit clears — confirm target go-live window
4. **Kickoff call:** 30 min to resolve remaining open questions — when works?

---

*End of plan. See `slack-message.md` for the short-form version for Alex.*
