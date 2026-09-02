# PatientNow API — lead integration research

**Date:** 2026-09-02
**Why:** Guy Seese asked on 1 Sep: "What PatientNow access, documentation and support do you need from MRC to make the lead integration work by November 1?" Will replied that he would check the API docs and that a Zapier or n8n layer would handle the mapping from website to PatientNow.
**Source thread:** https://mail.google.com/mail/u/0/#inbox/1a059fd801421169

## Findings

### Three APIs, two auth models
PatientNow publishes developer docs at https://developer.envisiongo.com/ (guides at https://developer.envisiongo.com/guides.html) and a portal at https://developer-portal.patientnow.net/.

| Product | Covers | Base URL | Auth |
|---|---|---|---|
| PatientNow Essentials (PNE) | customers, scheduling, clinical, commerce, staff, event webhooks | `https://api.envisiongo.com/api/v1/` | HTTP Basic (API username + password) plus gateway `apikey` query parameter on every request |
| VISH | subset: appointments, companies, employees, services, orders, formulas | same as PNE | same as PNE |
| PatientNow Pro (PNP) | patients, appointments, scheduling availability, waitlists, billing, reference data, scoped to a practice ID | `https://backend-production.patientnow.net/backend/patientnowpro/` | API token in the Authorization header plus `practiceId` |

Which product MRC is on decides everything below. Nothing in the thread says.

### Conventions
- REST over HTTPS, JSON bodies, standard verbs: GET reads, POST creates, PUT updates, DELETE removes.
- The guides do not spell out a create-patient or create-lead endpoint or its required fields. The "POST creates" convention suggests one exists on the customers or patients resource, but it must be confirmed against the product-specific reference or with PatientNow support before promising it in the estimate.
- Location scoping exists on PNE: most resources accept a `CompanyId` filter to scope reads and writes to a specific location. That is the likely mechanism for routing leads to a location.
- Lead source is reference data. Nothing found on routing to a team, as opposed to a location.
- Rate limit: 1,000 requests a day on the standard gateway plan. Higher tiers via the PatientNow rep. Plenty for lead volume, tight if polling.
- No sandbox or test environment mentioned.

### Existing integrations, as a sanity check
- PatientNow's own HighLevel integration for Pro works on API keys plus webhooks, which supports the middleware approach. https://www.patientnow.com/lp/highlevel-integration/
- Keragon lists PatientNow triggers (patient created, patient updated, appointment created and updated, clinical note created) but no documented create-patient action. https://www.keragon.com/integrations/patientnow
- Zapier community threads on PatientNow use custom webhook requests against the API rather than a native app. https://community.zapier.com/how-do-i-3/patientnow-integration-to-ghl-51768
- Conclusion: a custom HTTP request from n8n or Zapier to the REST API is the likely route, as Will said.

### Not read
The PatientNow Pro API help article failed to load twice on 2 Sep (help centre CSS error). Retry in a browser: https://patientnow.my.site.com/helpcenter/s/article/PatientNow-Pro-APIs

## What MRC must provide
1. Which PatientNow product they use: Pro or Essentials.
2. API credentials from their PatientNow rep. Pro: API token and practice ID. Essentials: API username, password and gateway apikey. Ask the rep to confirm the daily request quota is enough.
3. Their location list with the matching PatientNow location or company IDs, and the routing rule: which form or location goes to which team.
4. The lead fields to capture and any fields PatientNow requires on a new patient, including the lead source values they want recorded.
5. A named PatientNow support contact for the build, and whether a test practice or sandbox exists.
6. Who owns and pays for the automation platform account (n8n or Zapier).

## Next steps
1. Ask Guy which product MRC is on.
2. Read the matching reference on developer.envisiongo.com for the create endpoint and required fields.
3. Confirm with PatientNow support that leads can be created via the API and scoped by location on that product.
4. Send the list above to Guy, folded into the estimate email if timing allows.
