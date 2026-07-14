# GDPR / Privacy Notice — Reply to Lawyer Feedback
**To:** Romain (to forward to lawyer)
**Date:** 2026-07-02
**Status:** Draft

---

Hi Romain,

Thanks for passing on the lawyer's feedback. Here are a few points to flag back on the items raised:

**Cookie banner and GA4**
We'll be using Finsweet Cookie Consent (ConsentPro), which is built specifically for Webflow and blocks all non-essential scripts until the user gives explicit consent. GA4 will only fire after consent is granted through the banner.

**Marketing consent on downloads**
Understood — we'll add a separate, unticked checkbox for marketing opt-in on any download forms (brochures, case studies, etc.). Users will be able to download without subscribing to anything. Since form submissions are stored in Webflow, the checkbox value will be captured there, but it'll be up to your team to honour that preference when adding contacts to Mailchimp or any other mailing list.

**Webflow and data transfers**
One thing the lawyer should be aware of: the website is built on Webflow, which hosts all data (including form submissions) on AWS infrastructure in the United States. For the time being, contact form submissions are handled through Webflow's native forms, so personal data from form enquiries does leave the EEA.

However, Webflow is certified under the EU-US Data Privacy Framework (certification record: https://www.dataprivacyframework.gov/participant/6365) and offers Standard Contractual Clauses via their Data Processing Addendum (https://webflow.com/legal/dpa). So there is a legal basis for the transfer — but the privacy notice should acknowledge that some processing takes place outside the EEA rather than stating otherwise.

Could the lawyer confirm whether the DPF certification is sufficient from their perspective? If the preference is to route form submissions through an EU-based service instead, that's something we can look into but it would fall outside the current project scope, so there would be additional development costs involved.

**Accuracy of tools**
We'll keep you informed if any additional tools, tracking pixels, or integrations are added to the site on my side so the privacy notice and cookie banner can be updated accordingly.

Let me know if there are any questions!
