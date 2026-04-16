# Change List — Mapped to Remediation Pillars

**Date:** 2026-04-16
**Source:** `change-list-2026-04-11.md` (verbatim client PDF)
**Narrative:** `proposals/narrative-2026-04-16.md`
**Purpose:** Map every client request onto the 3-pillar programme (De-risk / Unlock / Grow) so the plan tells the client's story back to them.

---

## Summary

Of the 21 actionable items (17 and 23 are blank), **all 21 fit cleanly into the three pillars** — nothing in the list is out of scope, and nothing in the existing remediation plan is unrelated to a client request. The client's list and our technical audit are largely **two angles on the same programme**.

**Distribution:**
- **Pillar 1 — De-risk & Stabilise:** 7 items (11, 21, 22, plus hygiene under 8, 9, 14)
- **Pillar 2 — Unlock visibility & clarity:** 9 items (1a–j, 2, 3, 4, 5, 6, 7, 8, 9)
- **Pillar 3 — Grow & automate:** 9 items (10, 12, 13, 15, 16, 18, 19, 20) — some overlap with Pillar 2 for SEO
- **Parallel engagement (same client, separate statement of work):** 1 item (13 — esiglobal.com, sister company acquired 2025, same programme shape wanted)

Items frequently map to **multiple** pillars — noted below.

---

## Item-by-item mapping

| # | Client request | Pillar | Maps to existing audit finding | Priority signal |
|---|----------------|--------|-------------------------------|-----------------|
| **1a** | Center column under mega header (see decorrespondent.nl) | Pillar 2 | Main content layout standard — new pattern across templates | Cosmetic / editorial |
| **1b** | Line distance minimum 1.5 | Pillar 2 | Typography / readability — sitewide CSS | Accessibility-adjacent |
| **1c** | Text not black (max 80%) | Pillar 2 / 1 | **Conflicts with WCAG AA finding** — current `#909090` already too light. Need collaboration to land on a value that passes contrast. | ⚠️ Clarify |
| **1d** | No line breaks, no word breaks | Pillar 2 | CSS `word-break: keep-all; hyphens: none;` + RTE cleanup | Editorial |
| **1e** | Left-align | Pillar 2 | Text alignment standard | Editorial |
| **1f** | Define bullet points etc | Pillar 2 | Typography hierarchy + list styling | Design system |
| **1g** | **Simpler contact form structure + behaviour** | Pillar 1 + 2 | 12 contact sub-pages exist; form a11y not audited; client wants simplification | High — already on P1 |
| **1h** | Copy/paste issues from Word → Webflow | Pillar 2 | RTE paste cleanup / CMS editor guidance | CMS doc item (links to 9a) |
| **1i** | Text editor issues WYSIWYG | Pillar 2 | Webflow Rich Text Editor limitations → guidance or custom rich-text configuration | CMS doc item (links to 9a) |
| **1j** | Don't break text/words; left-align not justify | Pillar 2 | Same as 1d + 1e, Dutch language-specific concern | Editorial |
| **2** | Hierarchy in CSS texts; basics → specials * how to | Pillar 2 | **Overlaps H1 fix (3 insights posts) + heading hierarchy**. Plus documentation component (links to 9). | High — already on P0 |
| **3** | Re-organize + optimize component backgrounds | Pillar 2 | Design system consistency pass | Editorial / design |
| **4** | Re-organize + optimize paddings — "consistent!!!, pixelperfect" | Pillar 2 | Sitewide spacing audit + design token system | ⚠️ **High urgency signal** (triple exclamation) |
| **5** | SEO + GEO optimalisatie — "all EO ;-))" | Pillar 2 + 3 | **Direct match to our entire SEO + AEO programme** (27 titles, 19 JobPosting, 30 FAQPage, Article/Person/Organization schema, AEO L1→L3). GEO = Generative Engine Optimisation (≈ AEO). | ⭐ **Core unlock** |
| **6** | URL structure — consistency, insights sub-categories (news/blogs), Yoast-style | Pillar 2 | **Partial match**: we've flagged `/jobs?tab=` hreflang conflict + `succesfully` typo + `/industries-in-hospitaility` slug typo. Client also wants `/insights/news`, `/insights/blogs`, etc. Needs redirect map + Yoast-style permalink plan. | ⭐ **High** — trust-critical per client |
| **7** | **"New-unique-stable and Kick ass footer!!!!!!"** | Pillar 2 | Independent work item; brief + design + build needed | ⚠️ **Highest urgency signal** (6 exclamation marks). Client will measure success here visually. |
| **8** | Architecture / eco-system drawing / guide so developers understand in minutes | Pillar 1 | **Direct match to our "handover document" deliverable** in Option 1. Expand to full system diagram. | High — foundation |
| **9a** | CMS manual + optimizing | Pillar 1 + 2 | Aligns with CMS hygiene audit + field-binding recommendations | High — foundation |
| **9b** | Blog instruction | Pillar 1 | Per-collection CMS guide | Foundation |
| **9c** | News instruction | Pillar 1 | Per-collection CMS guide (pending insights split) | Foundation |
| **9d** | Job instruction | Pillar 1 | Includes JobPosting schema fields + Yoast-style SEO per job | High (Google for Jobs dependency) |
| **9e** | Page instruction | Pillar 1 | Generic page template guide | Foundation |
| **9f** | Case study instruction | Pillar 1 | Per-collection CMS guide | Foundation |
| **10** | "Total structure should be our growth engine, part of digital transformation" | **Pillar 3** (strategic) | **This is the client's vision statement.** Directly aligns with our narrative: unlock latent authority, compound growth. | ⭐ **Reframe — this is the philosophy** |
| **11** | Zapier instability (reCAPTCHA + MS365 email) | Pillar 1 | **Direct match**: already flagged as operational risk | High — recommend replace with Power Automate |
| **12** | Klaviyo API? | Pillar 3 | Investigation — not currently on site; is client considering moving from Zapier → Klaviyo? | ⚠️ Clarify intent |
| **13** | Mailchimp API for esiglobal.com (sister company) | **Parallel engagement** | Sister company acquired 2025; Menno-Paul confirmed 2026-04-16 that the **same programme** should be applied to ESI. Mailchimp sits inside that wider scope, not as a standalone item. | ⭐ Scope as separate SOW |
| **14** | Cookiekot keep or? | Pillar 1 | Already flagged. Cookiebot dialog also fails WCAG contrast. Decision: keep + fix / replace / remove. | Decision point |
| **15** | Candidate funnel + optional automation → Powerpath/Dynamics/MS365 | Pillar 3 | CRM integration investigation. UX funnel analysis feeds this. | ⭐ **High strategic value** |
| **16** | Employer funnel + optional automation → Powerpath/Dynamics/MS365 | Pillar 3 | Same as 15, employer side | ⭐ **High strategic value** |
| **17** | *(blank)* | — | — | — |
| **18** | AI agents for periodic SEO/GEO/EO checks | Pillar 3 | AI-agent workstream — HITL required per client | Retainer-tier |
| **19** | AI agents for content creation / publish / structure / periodic checks | Pillar 3 | AI-agent workstream — HITL required | Retainer-tier |
| **20** | Text check agent (brand voice / grammar / tone) | Pillar 3 | AI-agent workstream — HITL + brand voice ingestion | Retainer-tier |
| **21** | "Loose double structure (workspace and website, 2 plans)" | Pillar 1 | **Webflow billing consolidation** — workspace plan + site plan duplication. Cost/structure audit. | ⚠️ Clarify |
| **22** | Remove partnercode permanently | Pillar 1 | Likely Egenix / previous-developer affiliate code in Webflow billing. Tied to code migration workstream. | Foundation — ties to Egenix offboarding |
| **23** | *(blank)* | — | — | — |

---

## Items where the audit adds things the client hasn't asked for

These are our value-adds — the client didn't ask, but the audit found them and they fit the programme:

| Audit finding | Not on client list | Pillar | Why include |
|---------------|-------------------|--------|-------------|
| Egenix JS on third-party GitHub (critical dependency) | Not mentioned | **Pillar 1** | Business-critical risk. Ties to item 22 (partnercode removal) in practice — both are Egenix offboarding. |
| Duplicate Lenis / GSAP version mismatch | Not mentioned | **Pillar 1** | Technical stability. Silent failure risk. |
| 19/22 jobs missing JobPosting schema | Subsumed under item 5 | **Pillar 2** | Concrete deliverable within "SEO+GEO optimalisatie". Google for Jobs eligibility. |
| 30 FAQs missing FAQPage schema | Subsumed under item 5 | **Pillar 2** | Same — rich results + AEO citations. |
| 3 insights posts with duplicate H1 | Subsumed under item 2 | **Pillar 2** | Hierarchy item. Concrete fix. |
| 27 page titles >60 chars | Subsumed under item 5 | **Pillar 2** | SERP CTR uplift. |
| 28 pages with broken external links | Subsumed under item 5 ("trustworthy is KEY") | **Pillar 2** | Trust signal — fits client's "trustworthy is KEY" framing. |
| Alt text quality spot-check | Not mentioned | **Pillar 2** | Accessibility + image SEO. |
| Image optimisation (80% bandwidth on PNGs) | Not mentioned | **Pillar 1 + 2** | Performance → LCP → SEO ranking factor. |
| WCAG AA colour contrast | **Conflicts with 1c** | **Pillar 2** | Resolve collaboratively — client wants "not black, max 80%" but current body text fails contrast. Land on a passing value together. |
| 7 dev/test pages indexable | Not mentioned | **Pillar 1** | Hygiene. 15-minute fix. |
| Competitor gap analysis (`mjpeople.nl` landing page pattern) | Subsumed under item 10 | **Pillar 3** | Directly feeds the "growth engine" vision. |
| International SEO review (5 non-NL locales) | Not mentioned | **Pillar 3** | 6-language site, only NL ranks. Aligns with "growth engine" framing. |
| Analytics hardening (GTM consolidation, Search Console access) | Not mentioned | **Pillar 1** | Measurement foundation for items 10, 15, 16, 18. |

---

## Resequenced priority (client-weighted)

The existing proposal's P0 is technically correct (de-risk code) but doesn't **lead with what the client cares about**. Recommended resequence to match client narrative while preserving execution logic:

### Priority 1 — Items with explicit urgency signals from the client

| # | Item | Why |
|---|------|-----|
| **7** | Kick-ass footer (6 exclamation marks) | Client's biggest visual dissatisfaction |
| **4** | Pixel-perfect padding consistency (triple exclamation) | Second-strongest signal |
| **5** | SEO + GEO + all EO | Core unlock, directly links to 10 (growth engine) |
| **6** | URL structure + `/insights/` sub-categorisation + Yoast-style | "Trustworthy is KEY for us" — value statement |
| **10** | Growth engine / digital transformation framing | The philosophy |

### Priority 2 — Foundation items the client asked for

| # | Item | Why |
|---|------|-----|
| **8** | Architecture / eco-system drawing | Handover enables retainer + internal confidence |
| **9** | CMS manuals (all 6 sub-items) | Ships concurrent with CMS hygiene |
| **2** | CSS hierarchy "how to" | Docs tie into 8 and 9 |
| **1a–j** | Main content basics (sitewide typography / layout / form / RTE) | Editorial foundation |
| **3** | Component background consistency | Design system pass |
| **11** | Zapier stability → Power Automate | High-value stability win |
| **14** | Cookiekot decision | Quick decision point |
| **21** | Webflow workspace + site plan consolidation | Billing clean-up |
| **22** | Remove partnercode | Ties to Egenix offboarding (our P0) |

### Priority 3 — Strategic / growth / AI (Retainer)

| # | Item | Why |
|---|------|-----|
| **15** | Candidate funnel + CRM automation | Highest ROI on retainer |
| **16** | Employer funnel + CRM automation | Same |
| **12** | Klaviyo investigation | Depends on 11 outcome |
| **18** | AI agent for SEO/GEO checks | HITL required |
| **19** | AI agent for content | HITL required |
| **20** | Text check agent (brand voice) | HITL + brand voice feed |

### Priority 4 — Our technical additions (foreground the risk)

| Item | Why they must still be in P1 even if client didn't ask |
|------|-------------------------------------------------------|
| Egenix JS migration | **Silent break risk** — if Egenix deletes repo, site breaks. Frame as insurance on everything else. |
| Duplicate Lenis / GSAP version fix | Prevents scroll & animation regressions that will look like design bugs. |
| 3 insights H1 fix, 27 title fix, 19 JobPosting, 30 FAQPage | Concrete deliverables inside item 5. |
| Dev/test page unpublish | 15-min hygiene. |

---

## Items requiring clarification from client

Three places where we genuinely need input before scoping:

1. **Item 1c conflict** — Client wants "text not black (max 80%)", but current `#909090` already fails WCAG AA. We need to land on a specific value (e.g. `#3A3A3A` or `#404040`) that passes contrast while feeling "not black". Would prefer to demo 2–3 options on staging and get sign-off.
2. **Item 11 direction** — Zapier can be (A) hardened, (B) replaced with Power Automate (recommended), or (C) replaced with custom serverless. Need client decision.
3. **Item 12 (Klaviyo)** — Is the client considering moving from Zapier → Klaviyo, or adding Klaviyo alongside? Intent unclear.
4. **Item 14 (Cookiekot)** — Keep + fix / replace with Cookiebot / remove banner (requires cookie reduction). Need decision.
5. **Item 21 (Webflow double structure)** — Need access to Webflow billing to audit. Likely workspace Plan + Site Plan both billed. Confirm.

Everything else is clear enough to scope without further input.

---

*Cross-referenced with `proposals/narrative-2026-04-16.md`, `proposals/proposal-options-2026-04-16.md`, and `reports/intake-report-2026-04-15.md`.*
