Hi Romain,

Thanks for the structured brief — I like the fit check approach, saves everyone's time. Answers below.

1) CRM / API integration evidence

- carsa.co.uk — Used car retailer, 4,600+ vehicles. I built and maintain the Webflow site. Forms push leads to their backend via webhook middleware, including finance eligibility checks against an external API. Not Odoo, but the pattern transfers directly: Webflow form fires a webhook, middleware normalises the data, authenticates, and pushes a clean lead object to the CRM.
- jayshetty.me — [Your bullets here]
- [Third if you have one]

2) Webflow to Odoo integration approach

Webflow form submissions fire a webhook to a middleware layer (Make.com, n8n, or similar — happy to discuss which fits your stack best). The middleware authenticates to Odoo's JSON-RPC API with credentials stored in its encrypted vault, never client side.

Form fields get mapped to Odoo lead/opportunity fields (company, contact, email, phone, source page, UTMs) and normalised before the push. Failed pushes retry with backoff and land in a dead letter queue with alerts so nothing disappears quietly.

Logging covers every submission: timestamp, payload, Odoo response code, lead ID. HTTPS throughout, webhook endpoints locked down, no PII stored in Webflow beyond the form post itself, GDPR consent flag passed to Odoo.

That gives you working lead capture from day one. The architecture supports lead scoring, multi-step forms, or Odoo marketing automation later without rework.

3) Availability

- Earliest start: [your date]
- 25 pages across 6 templates — I'd say 8–10 weeks from kick-off, assuming copy and assets arrive on time (see point 6)

4) Budget range

Website build (25 pages, 6 templates, responsive, SEO baseline): £10–15k
Odoo integration MVP (middleware, mapping, error handling, logging): £3–5k

That assumes design is provided, copy comes from TSC (or copywriting is scoped separately), and your Odoo instance is already running with staging API access available.

5) Delivery model

Solo practitioner — I do the design, development, and integration. I use AI tooling for SEO, accessibility, and structured data audits, so you get that coverage without it being a separate line item or person.

Client First (Finsweet) conventions on every Webflow build. Clean class structure, easy for anyone to maintain after handoff.

6) What we'd need from TSC

- Sitemap, page by page with hierarchy
- Copy per page (final or close to it), or let me know if copywriting should be in our scope
- Brand guidelines: logo SVG, colours, fonts, tone of voice
- Photography and video for heroes, team shots, product
- 2–3 reference sites you like the feel of — helps calibrate design direction fast
- Odoo staging access: credentials, endpoint docs, a test CRM environment I can push to
- Any other integrations beyond Odoo (analytics, chat, marketing automation)
- Who provides what content, ideally mapped per page
- Your review and sign-off process — who's involved, how many rounds

Happy to jump on a call to talk through the Odoo side in more detail.

Will
