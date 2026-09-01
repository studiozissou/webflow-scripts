# Newsletter signup → beehiiv welcome survey redirect

Source of truth for the snippet deployed to **jayshetty.me** site-wide footer code.
Spec: `projects/jayshetty/.claude/specs/jayshetty-newsletter-signup-redirect.md`.

| File | Deploys to |
| --- | --- |
| `footer-code.html` | Project Settings → Custom Code → **Footer** (before `</body>`) |

Site `64c10a2010e1a379d08bf030`. Site-wide, not per-page — the three forms it targets
are in global components and appear on every page.

## What it does

When someone successfully submits a newsletter signup form, it waits 1.2s (so the
existing "Thank you!" message is seen) then sends them to the beehiiv welcome survey
with their address appended as `?email=`, which beehiiv uses to prefill and hide the
survey's own email field.

## Why it is built this way

**Why a script and not Webflow's native redirect field.** The native per-form
"Redirect to URL" setting works and was seriously considered — the survey is
submittable without the param, rendering its own visible required email field. The
script was chosen for data integrity: if the visitor retypes their address they can
typo it or use a different one, and the survey response then attaches to an address
that does not match the subscriber record created by Webflow → Zapier → beehiiv.
Passing the captured value guarantees the response lands against the right
subscriber. It also saves a step at the top of a 9-question form.

**Why `.footer2_form:not(.is-tour)`.** There are four signup forms on the site, not
one. Three are global (footer / popup / banner, matching the `popup` / `banner` /
`footer` beehiiv sources); the fourth is on `/tour` and is deliberately excluded.
The form *name* `wf-form-Footer-Subscribe-Form` is shared across three separate
elements, and the popup and banner additionally share the DOM id
`wf-form-popup-Subscribe-Form` — so neither name nor id is a safe selector. The
class is. It also picks up any future signup form built from the same class.

**Why it must stay scoped.** The site has four other forms that must not redirect:
site search, blog/podcast filters, Suggest-a-Topic (`/podcast`) and Book-Jay
(`/speaking`). A blanket "redirect on any successful submit" would throw enquiry
submitters onto a newsletter survey.

**Why it watches `.w-form-done` rather than the submit event.** Only a genuine
Webflow success reveals that panel. A Cloudflare Turnstile failure (present on the
popup and banner forms), a network error or a validation rejection all reveal
`.w-form-fail` instead, so no redirect fires.

**Why the email is captured on `submit` and stored in a `WeakMap`.** Webflow clears
and hides the form on success, so the value has to be read before that. The map is
keyed by form element because the popup and banner share a DOM id.

**Why the `going` guard.** The observer can fire more than once per success; the
redirect must only be scheduled once.

**Why the Zapier sync is unaffected.** The redirect happens after Webflow's POST has
succeeded, so the submission is stored and the webhook fires as before. The
`utm_source` / `utm_medium` hidden fields travel with it, preserving beehiiv source
attribution.

## Deploying

Paste `footer-code.html` into Project Settings → Custom Code → Footer, then publish.

Two client-specific gotchas, carried over from `projects/jayshetty/podcast-player/README.md`:

- Webflow's freeform custom-code API has been returning **HTTP 406** on every write
  for this site while reads and publishes work, so the footer field has to be edited
  by hand.
- The Designer's code editor has previously reformatted a pasted block and truncated
  a long URL mid-path. After pasting, re-open the field and confirm the survey URL is
  intact and ends in `...f8890e18bd5e`.

Publish to **jayshetty.webflow.io only** until signed off; the custom domain is a
separate, manual publish.

## Testing

`tests/acceptance/jayshetty-newsletter-signup-redirect.spec.js` (11 tests, registered
in `tests/registry.json`). They never create a real subscriber — the Webflow POST is
aborted and the survey response stubbed.

```
npx playwright test --config=tests/acceptance/playwright.config.js jayshetty-newsletter-signup-redirect
```

Per repo `CLAUDE.md`, ask before running Playwright.

Manual checks that cannot be automated are listed in the spec's Tier 3, the important
one being a single real end-to-end signup confirming the survey submits with the
prefilled address.

**Careful when re-testing the survey by hand:** beehiiv remembers an address across
visits, so a no-param load after a `?email=` load still shows the field prefilled.
Use a private window or you will not see what a fresh visitor sees.
