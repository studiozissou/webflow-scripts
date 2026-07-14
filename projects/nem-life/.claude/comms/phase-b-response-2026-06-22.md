# Draft Reply to Alex — Phase B Clarifications

**To:** Alex Reus (NEM Life)
**From:** Will
**Date:** 2026-06-22
**Re:** Phase B — your four questions before I start

---

Hi Alex,

Thanks for your questions and I'm happy to proceed at €1,560 fixed for this scope.

Here are your four points:

**1. Hardcoded questions vs CMS**

I believe you mentioned on the call that the 20 questions would always be the same, so my hardcoded plan was intentional. However, if you'd like control over the question text we can add those as editable component props in the Webflow Designer so that you can tweak the wording any time. Just be aware that the mechanism mapping will need to stay fixed in the code (Q1-Q4 always = Zelfafwijzing, etc.) so the scoring model can't be broken accidentally.

We could even link the props to the CMS to allow you to create and test multiple new tests with different question texts while keeping the same fixed answer and conclusion structure (Q1-Q4 always = Zelfafwijzing, etc.).

If the idea was to create new tests with different questions and conclusions using the CMS, that would be more complex and would require some more thought.

**2. MailerSend vs MailerLite**

There's a technical reason for the distinction. MailerLite is a marketing email platform and can't send programmatic emails with PDF attachments. For the personalised report delivery, we need MailerSend, which is MailerLite's own transactional email product (same company, same ecosystem).

The split:
- **MailerLite** — verification email + newsletter subscription
- **MailerSend** — report delivery only (PDF attached)

Cost: MailerSend has a free tier of 500 emails/month. Since only the report delivery goes through it (one email per completed test), that's 500 reports/month before you'd need the $7/month Hobby plan. The verification email and newsletter stay on MailerLite at no extra cost.

**3. Conclusion text identifiers**

Confirmed — I'll use exactly that convention:
- Single mechanism: `valse-hoop`
- Dual mechanism: `valse-hoop_valse-macht` (dominant_secondary)
- All lowercase, hyphenated
- 15 texts total

I'll build the lookup using these keys. You can send the texts whenever they're ready, I can use placeholders in the meantime.

**4. Internationalisation**

Yes, this is built into the plan. All component props can be translated: 20 questions, answer labels, error messages, and UI strings in both NL and EN. Locale is auto-detected from the URL path (`/en/` prefix) or the page's `lang` attribute and passed through to the backend on the initial form submit, so the user also gets their emails and report in the correct language. All the marketing copy (headings, CTAs) is editable per locale in the Designer too.

I'll start on the landing page, backend webhooks, and MailerSend/MailerLite setup now — none of those are blocked. The component build can use placeholder conclusion texts until you send the final 15.