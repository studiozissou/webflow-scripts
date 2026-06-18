# Draft Response to Alex — NEM TEST Phase B (Updated)

**To:** Alex Reus (NEM Life)
**From:** Will
**Date:** 2026-06-18
**Re:** Phase B briefing review + answers to your questions

---

Hi Alex,

I've gone through the full Phase B briefing in detail and done some technical research. Here are my answers to your questions and a scope overview.

## Your questions

### 1. Is the two-trigger architecture feasible?

Yes, this is a clean setup. No Anthropic API spend until the user verifies their email — smart cost control.

Update: **Screen 3 (Conclusion) no longer needs an API call.** The conclusion text will be generated client-side from the scoring system — instant, no loading state.

### 2. Where to store the score profile?

n8n's built-in key-value store or a Google Sheet. The data only needs to live until the report is generated (48 hours max). Webflow CMS is not suitable — it's public-facing and rate-limited.

### 3. Token management and expiry?

Straightforward. UUID token, 48-hour expiry, single-use. If Anna corrects her email on Screen 5, a new token replaces the old one.

### 4. What do I handle vs. you?

I'll handle: the React component (via Webflow AI prompt), both n8n webhooks (submit + verify), MailerSend for transactional emails, MailerLite for NEM Matters, PDF generation, and token management.

**You handle:** Anthropic API prompt engineering for the full report.

**One thing to flag:** MailerLite doesn't support PDF email attachments. I recommend using **MailerSend** (MailerLite's transactional email product) for the verification email and report delivery. MailerLite stays for the NEM Matters newsletter only.

## Things I need from you

1. **Scoring system** — I've left a few questions in the Notion comments about how the "dominant mechanism", "2-point secondary scoring", and "15 result texts" work. Once you can clarify those, I'll finalise the scoring logic.

2. **Anthropic report prompt** — You're owning the prompt for the full PDF report. I'll need it before the verify webhook can be completed.

## What's confirmed

- n8n access — sorted
- MailerSend — sorted
- Component width — I'll set this in Webflow
- Verification redirect — static Webflow page at `/zelftest/bevestigd`
- NL + EN — both languages launch together, hybrid i18n approach (props for marketing copy, translations object for structural strings)

## Email validation

Format validation on blur — confirmed. When Anna tabs away from the email field, if the format is wrong (no @, invalid domain pattern), the red border + Dutch error message appears immediately. Real email existence checking would need a third-party service, but as you said, the double opt-in handles that.

## Questions approach

The 20 questions are hardcoded in the React component with the same 5 answer choices (nooit/zelden/soms/regelmatig/heel vaak → scored 1-5). The mechanism mapping is built into the scoring logic. Phase A CMS collections stay for reference but aren't consumed.

## Estimate

**16.5 hours (my scope).** This covers:
- Landing page + verification page in Webflow, NL + EN (0.5h)
- Webflow AI prompt for React component — all 5 screens, pill buttons, form validation, responsive, i18n, analytics (1.5h)
- Scoring logic (1h TBC — depends on your scoring system clarification)
- 2 n8n webhooks + token management (4h)
- PDF generation (2h)
- MailerSend + MailerLite integration (3.5h)
- QA + end-to-end testing (4h)

Your scope (Anthropic prompt engineering) is separate.

The scoring system is marked TBD — once you clarify, the scoring logic may adjust by ±2 hours.

Happy to jump on a call if anything needs discussion.

Will
