# Email to Laurent (cc Romain) — DNS Switchover Request

**To:** laurent.stukkens.ext@thesignallingcompany.com
**Cc:** romain.hourtiguet@thesignallingcompany.com
**Subject:** DNS switchover for thesignallingcompany.com — Tue 14 July, 10:00 CEST
**Status:** Saved to Gmail drafts 2026-07-08

---

Hi Laurent,

Romain (cc'd) suggested I get in touch with you directly for the technical side of the new Signalling Company website launch.

We're planning to go live on **Tuesday 14 July at 10:00 CEST**, and the final step is pointing the domain's DNS at Webflow, which hosts the new site.

I sent the exact DNS records through to Romain on 6 July — the `_webflow` verification record plus the A and CNAME records for `thesignallingcompany.com` and `www`. Happy to forward them straight to you so you have them first-hand — just say the word.

Two asks:

1. Are you able to make the DNS change at **10:00 CEST on Tuesday 14 July**? If a different slot that morning works better for you, I'm flexible.
2. If possible, could you **lower the TTL** on the current records to 300 seconds the day before (Mon 13 July)? That lets the switch propagate quickly and keeps the changeover window short.

It would also help if you're free for around 30 minutes near 10:00 on the day, in case anything needs adjusting. Once the records are live I'll verify propagation and confirm the SSL certificate has issued before we call it done.

Happy to jump on a quick call or Teams if that's easier than email.

Kind regards,
Will

—
Will Morley
Studio Zissou
