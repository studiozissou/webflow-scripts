Hi Alex,

Thanks for the briefing — it's really well put together. Clear structure, and the Psychology Today reference gives good context for the UX intent.

Short answer: yes, this is very feasible in Webflow.

**How I'd approach it:**

The quiz itself would be built as a code component (React, generated with Webflow's AI assistant and refined by hand). It handles the question flow, 1–5 scoring, smooth scroll between questions, the disabled submit button — all self-contained.

For scalability across 10+ tests, the questions and outcome categories would live in the CMS. The component reads them from a hidden collection list on the page via data attributes, so creating a new test is just adding CMS content and duplicating the page template — no code changes needed.

The result page would show the outcome text and score. The visual diagram is doable too if you want it — just flagging it as a nice-to-have per your brief.

**On the OTP / extended report flow:**

The component can POST to n8n webhook endpoints to send and validate the one-time password, and n8n handles the rest (code generation, MailerLite subscriber add, PDF delivery). No secrets need to live in the frontend. Happy to coordinate with your freelance dev on the webhook contract when we get there.

**One thing to confirm:** the site will need a CMS or Business plan to support code components. If it's not on one already, that's worth factoring in.

Happy to jump on a call if you want to talk through any of this, or I can move to a proper scope and estimate whenever you're ready.

Best,
Will
