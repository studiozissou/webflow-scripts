# Slack message — NEM Life takeover estimate

Formatted for Slack mrkdwn. Paste directly into Slack (not GitHub markdown).

**Paste buffer:** `.claude/slack/nem-life-takeover-estimate-2026-04-16.txt`
**Copy to clipboard:** `pbcopy < "projects/nem-life/.claude/slack/nem-life-takeover-estimate-2026-04-16.txt"`

---

```
Hi Alex, here's the updated estimate after going through the audit and diffing the designs against the live site:

*Context*
Desktop is substantially built and close to the Figma designs. Our Mission = Over ons (nav submenu just points there). Footer has a "Services" link which points to Therapy / Couples therapy — adding those as an optional addon below.

*Problem*
Blog Insights Item page isn't built (sidebar + modular body + checklist is real work), home mobile is effectively a rebuild from the design, every nav/footer link still points to `#`, and there's no SEO/schema/a11y/performance baseline yet.

*Solution*
5 core phases covering every remaining launch item:
•  Blog Insights Item page (6h) + Experiences Item page (1h)
•  Mobile responsive across all pages (8h)
•  Debug + plumbing: wire nav, enable NL locale, home interactions, Experiences filter + load-more (4h)
•  Performance, SEO, AEO, accessibility + launch with 301s and Loom handover (8h)
Optional addon:
•  Therapy + Couples therapy service landing pages (4h) — fills the footer "Services" slot, SEO/AEO-targeted

*Benefits*
•  Launch-ready NL site — every brief item ticked
•  AI-search-friendly DOM + Article/Organization/FAQ/Person schema, sitemap, hreflang
•  Clean plumbing: every link works, NL locale live, EN parked for Phase B
•  Daily Slack check-ins and Loom walkthroughs throughout

*Risks*
•  Home mobile is effectively a rebuild from the design — priced for that, not just alignment
•  Zelftest scope unclear (see question below) — need your answer before we start

*Timing & pricing*
•  Core: *€3,240 fixed* (27 hours at €120/hr)
•  With Therapy + Couples therapy addon: *€3,720* (31 hours) — still inside your €5k ceiling
•  *2-3 weeks* from deposit to launch
•  Payment: 50% deposit / 25% at desktop sign-off / 25% on launch

Two quick questions to close before I send a formal proposal:
1. *Doe de zelftest* — is that an external form/link, or a tool you want me to build? (Keeping it out of scope until we know — if bespoke we'd write a change order before starting)
2. *Any other pages I've missed for the launch version?* I've scoped Home, NEM Methode content template, Our Mission, Link-in-bio, Blank (T&C / Privacy / Cookie), Blog Insights main/category/item, Experiences main/item — plus Therapy + Couples therapy as the optional addon. Anything else you expect live on day one?

Post-launch Care package (€480/mo, 4h + monthly SEO/AEO report) details are in the full plan. Happy to jump on a 30-min call whenever suits.
```
