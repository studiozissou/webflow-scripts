# Adobe Fonts Setup — Slack Message to TSC

**Date:** 2026-06-24
**Channel:** TSC project channel
**Purpose:** Instructions for connecting their Adobe account to Webflow for the Aptos font family

---

Hey! To get the Aptos font onto the Webflow site, I need to connect your Adobe Fonts account. There's a quick native integration — just need two things from your end:

*1. Create an Adobe Fonts Web Project*

• Go to fonts.adobe.com and sign in with your Creative Cloud account
• Search for *Aptos* — you'll see the full family (Aptos, Aptos Serif, Aptos Slab, Aptos Mono)
• Click into *Aptos* and hit *"Add to Web Project"*
• When prompted, create a new web project (you can name it something like "TSC Webflow")
• Select the weights/styles you need — at minimum Regular and Bold, plus any italics you use
• Repeat for any other Aptos variants you want (Serif, Slab, etc.)

*2. Generate an API Token*

• Click your profile icon (top-right) > *Account Settings*
• In the left sidebar, find *API Tokens*
• If no token exists, click *"Make me a new API token"*
• Copy the token and send it over to me

Once I have the token I'll plug it into the Webflow site settings, the web project you created will sync automatically, and I'll apply Aptos across the site.

One thing to note — Adobe's network can take up to 10 mins to sync after you create the web project, so don't worry if it's not instant on your end.
