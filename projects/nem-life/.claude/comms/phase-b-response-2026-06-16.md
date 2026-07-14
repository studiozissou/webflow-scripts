# Draft Response to Alex — NEM TEST Phase B

**To:** Alex Reus (NEM Life)
**From:** Will
**Date:** 2026-06-16
**Re:** Phase B briefing review + questions

---

Hi Alex,

Thanks for the detailed briefing. The restructuring into Phase A/B is clear and the direction makes sense. I have gone through the full document and done some technical research. Here are my answers to your questions, plus a few things I want to flag.

## Your questions

### 1. Is the two-trigger architecture feasible?

Yes, fully feasible. It is actually the smart approach because it means zero Anthropic API spend on unverified users. No report gets generated until someone proves their email is real.

How it works from my side:

- **Trigger 1 (form submit on Screen 4):** The React component sends a POST request to an n8n webhook containing the 5 mechanism scores, first name, email, relationship status, and a unique token. This is a standard fetch call from the React code component, nothing unusual.
- **Trigger 2 (verification click):** This is purely server-side. n8n receives the token, retrieves the stored data, calls Claude, generates the PDF, and sends it. My code is not involved at this stage.

One addition to your flow: **Screen 3 (Conclusion) also needs an API call.** When Anna finishes question 20, the React component sends her scores to a separate n8n webhook, which calls Claude and returns the 2 personalised paragraphs. This adds a loading moment of roughly 15-25 seconds, so I will build a branded loading screen with a calming message rather than a simple spinner. This makes the wait feel intentional.

### 2. Where to store the score profile between triggers?

I would recommend **n8n's built-in key-value store or a Google Sheet** as a lightweight database. Reasons:

- Webflow CMS is not suitable here (public-facing, rate-limited, not designed for temporary transactional data)
- The data only needs to live until the report is generated (24-48 hours max)
- A Google Sheet has the added benefit of being auditable and visible to your team
- If volume grows beyond a few hundred tests per month, a proper database (Supabase free tier or n8n's Postgres if self-hosted) would be more robust

Your n8n specialist will know the best option for your specific n8n setup.

### 3. Token management and expiry?

No major concerns. My recommendations:

- **Token format:** UUID v4 (generated client-side). Collision risk is essentially zero.
- **Expiry window:** 24-48 hours. If the token has expired when Anna clicks the verification link, show a friendly page saying the link has expired with a CTA to retake the test.
- **Resubmission (Screen 5 "wrong email" flow):** When Anna corrects her email, a new token is generated and the old one is invalidated. The n8n specialist implements this as a "mark previous token as consumed" flag.
- **Security:** Tokens are single-use — once a report is generated, the token cannot be reused.

### 4. What do I handle vs. specialists?

**I handle:**
- Landing page build in Webflow (navbar-minimal, hero, footer-minimal)
- Full React component update (all 5 screens, scoring logic, form validation, transitions, loading states)
- Webhook POST integration from React to n8n (2 endpoints: conclusion + form submit)
- Analytics event naming in the code (placeholders for Phase C)
- Anthropic prompt drafting and local testing

**n8n specialist handles:**
- 3 webhooks (conclusion, form submit, email verification)
- Anthropic API integration within n8n
- PDF generation (HTML-to-PDF)
- Token storage, validation, and expiry
- MailerLite/MailerSend integration for sending emails

**MailerLite specialist handles:**
- Verification email template (with token link)
- Report delivery email template
- NEM Matters subscription flow (separate from report)

**Shared work (I coordinate with the n8n specialist):**
- Webhook payload contracts (I will document the exact JSON format for each endpoint)
- Anthropic prompt engineering (I can draft and test locally, then the n8n specialist deploys)

## Things I want to flag

### MailerLite does not support PDF attachments

This is important: MailerLite's API cannot send emails with PDF file attachments. There are two clean alternatives:

1. **MailerSend** (MailerLite's own transactional email product) — this does support attachments. I would recommend using MailerSend for the verification email and report delivery, and keeping MailerLite for the NEM Matters newsletter only. This is a cleaner separation anyway.
2. **Hosted download link** — upload the PDF to cloud storage (S3 or similar), and include a download button in the MailerLite email. Simpler but slightly worse UX for Anna.

Your MailerLite specialist should confirm which approach works best for your setup.

### Email validation on blur

Yes, this is straightforward. I can validate email format the moment Anna tabs or clicks away from the email field. If the format is wrong, the red border + error message appear immediately. This is front-end format validation only (checks for `@` and a valid domain pattern). Verifying that the email address actually exists would require a third-party service, but format validation covers the vast majority of typo cases.

### Minimal footer as reusable component

I will build the minimal footer as a Webflow component (`footer-minimal`) that can be reused on any future landing page, not just NEM TEST.

### Questions approach

As discussed, the 20 questions will be hardcoded in the React component with the same 5 answer choices for each (nooit/zelden/soms/regelmatig/heel vaak → scored 1-5). The mechanism mapping (which questions map to which of the 5 mechanisms) is built into the scoring logic. The Phase A CMS collections can stay for reference but won't be consumed by the Phase B component.

## Estimate

My scope comes to approximately **31.5 hours**. This covers the landing page, all 5 screens of the React component, scoring logic, form validation, webhook integration, prompt drafting, QA, and coordination with the n8n and MailerLite specialists.

For the n8n specialist's work, I estimate roughly **13-19 hours** depending on their experience level. This covers the 3 webhooks, Anthropic integration, PDF generation, token management, and MailerSend/MailerLite setup.

Happy to discuss any of this or adjust scope. The architecture is solid and I am confident we can build this cleanly.

Will
