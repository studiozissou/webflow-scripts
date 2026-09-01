# Newsletter signup → beehiiv welcome survey redirect

Source of truth for the snippet deployed to **jayshetty.me** site-wide footer code.
Spec: `projects/jayshetty/.claude/specs/jayshetty-newsletter-signup-redirect.md`.

| File               | Deploys as                                                                            |
| ------------------ | ------------------------------------------------------------------------------------- |
| `footer-code.html` | Registered **inline script** `jayshettynewsletterredirect`, applied site-wide, footer |

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
The form _name_ `wf-form-Footer-Subscribe-Form` is shared across three separate
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

Deployed via the Webflow **scripts API**, not the freeform footer field. This avoids
both of the client-specific gotchas recorded in
`projects/jayshetty/podcast-player/README.md` — the HTTP 406 on freeform custom-code
writes, and the Designer's code editor reformatting a pasted block and truncating a
long URL mid-path. It is also additive: it does not touch the site's existing inline
footer scripts (Hotjar, Meta Pixel, the popup scheduler, and so on).

The JS body of `footer-code.html` (without the HTML comment and `<script>` tags) is
registered as an inline script and applied site-wide:

```
register_inline_script  -> id "jayshettynewsletterredirect", version 1.0.0
set_site_scripts        -> applied site-wide, location "footer"
```

`set_site_scripts` was used rather than `add_site_script` because the site had no
site-level custom code block at all, and `add_site_script` 404s in that case. Nothing
was displaced — `get_site_scripts` returned the same 404 beforehand, confirming there
were no existing site-level scripts. **On any future change, use `add_site_script`,**
now that the block exists; `set_site_scripts` replaces the whole list.

To ship a change: edit `footer-code.html`, then register a new version and re-apply it.

Publish to **jayshetty.webflow.io** first; the custom domain is a separate publish.
Live since 2026-09-01.

### Deploy log

| Date       | Version | Published to         | Notes                                                                                       |
| ---------- | ------- | -------------------- | ------------------------------------------------------------------------------------------- |
| 2026-09-01 | 1.0.0   | jayshetty.webflow.io | First deploy. Verified — see below. Custom domain NOT published.                            |
| 2026-09-01 | 1.1.0   | jayshetty.webflow.io | Appended the email unencoded while chasing a dropped survey response. Ruled out as a cause. |
| 2026-09-01 | 1.0.0   | jayshetty.webflow.io | Reverted to encoding.                                                                       |
| 2026-09-01 | 1.0.0   | **www.jayshetty.me** | Published live by Will. Verified in production. **Current.**                                |

### Encoding was not the bug

A real signup produced a survey response beehiiv did not record, and the encoded
`?email=` parameter was the first suspect. It is not the cause. The same address was
pushed through both versions on staging, minutes apart:

| Version | URL parameter                    | Value beehiiv rendered into the field |
| ------- | -------------------------------- | ------------------------------------- |
| 1.0.0   | `will%2Bsurvey3%40teamzissou.io` | `will+survey3@teamzissou.io`          |
| 1.1.0   | `will+survey3@teamzissou.io`     | `will+survey3@teamzissou.io`          |

beehiiv parses both to the same address, so the form always received the right one.
Encoding is kept because an unencoded `&` in an address would truncate the parameter.

## Testing

`tests/acceptance/jayshetty-newsletter-signup-redirect.spec.js` (11 tests, registered
in `tests/registry.json`). They never create a real subscriber — the Webflow POST is
aborted and the survey response stubbed.

```
npx playwright test --config=tests/acceptance/playwright.config.js jayshetty-newsletter-signup-redirect
```

Per repo `CLAUDE.md`, ask before running Playwright.

### Verified on staging, 2026-09-01

Tested against `jayshetty.webflow.io` with the real submission blocked at the event
and XHR/fetch layers, so no Webflow submission, Zapier run or beehiiv subscriber was
created:

- All three forms (footer, popup, banner) redirect to the survey with the email
  appended; beehiiv renders it as a hidden, prefilled field on arrival.
- Plus-addressed emails survive the round trip — `will+staging@teamzissou.io` encodes
  to `%2B` and decodes correctly at beehiiv rather than arriving with a space.
- Revealing `.w-form-fail` does not redirect, tested on a page where nothing had
  succeeded so the once-only guard was untouched.
- Revealing the search form's success panel does not redirect.
- Suggest-a-Topic on `/podcast` does not redirect, and does not match the selector.
- No new console errors: staging shows the same pre-existing SVG attribute warnings
  as production, and fewer 404s.

### Verified in production, 2026-09-01

After Will published to the custom domain, re-checked on `www.jayshetty.me` with the
submission blocked at both the event and XHR/fetch layers (`postsAttempted: []`), so
no Webflow submission, Zapier run or beehiiv subscriber was created:

- Script present and serving **v1.0.0**.
- Selector matches exactly the three global forms; catches none of search, filter,
  Suggest-a-Topic or Book-Jay.
- Footer form success redirects to the survey; beehiiv rendered the hidden field as
  `will+liveverify@teamzissou.io`, so the plus-addressed round trip holds in production.
- No console errors on the page.

### End-to-end signup, 2026-09-01

Will ran a real signup on staging: redirected correctly, subscribed, survey opened
prefilled. **The survey response did not record.** A separate run, opening the survey
URL directly in incognito with an address that was already a subscriber, recorded
fine.

**Cause (probable, not proven): a race.** The survey posts to `/post_subscribe_form`
and, per beehiiv's own `no_subscription_error_message`, validates the address against
an existing subscriber **at submit time**. Signups reach beehiiv asynchronously via
Webflow → Zapier, and this redirect fires 1.2s after Webflow accepts the form — so a
brand-new subscriber may not exist in beehiiv yet when the survey is submitted. That
fits both runs: already-subscribed recorded, brand-new did not.

**Decision: not fixing (Will, 2026-09-01).** The subscription itself is never at risk.
The redirect happens after Webflow has accepted the form, so the Zapier sync fires
regardless and nobody fails to subscribe. The only exposure is a survey response
silently not recording, and in practice Zapier lands well inside the minute or two it
takes to answer nine questions. The one dropped response was most likely an unusually
fast submit.

Two things that make this worth a glance later rather than never:

- The Zapier step is **Create a Subscriber**, not an update (confirmed from the Zap
  config, 2026-09-01 — see below). A response lost to the race is lost permanently;
  nothing backfills it.
- The failure is silent. There is no error surfaced to us, only an absent response.

**Watch signal:** survey responses trailing signup volume. If that shows up, the fix
is to route signups through beehiiv's own subscribe flow (its homepage form posts to
`/create`, and this survey _is_ beehiiv's post-subscribe form) so the subscriber
exists synchronously and Zapier leaves the critical path.

### The Zapier step, confirmed 2026-09-01

Step 3 of the Zap, read from its config. This is the asynchronous hop between a
Webflow submit and the subscriber existing in beehiiv:

| Field                | Value                                           |
| -------------------- | ----------------------------------------------- |
| Action               | beehiiv **Create a Subscriber**                 |
| Publication          | The Daily Wisdom                                |
| Email                | mapped from Webflow `Data Email`                |
| Tier                 | free                                            |
| Reactivate existing? | `true`                                          |
| Send Welcome Email   | `true`                                          |
| UTM Source           | `jayshetty.me` (static)                         |
| UTM Medium           | mapped from Webflow `Data Utm Medium`           |
| Referring Site       | `https://www.jayshetty.me` (static)             |
| First Name           | mapped from Webflow `Data Name` (usually empty) |

Two things follow:

- **It creates, it does not update.** With `Reactivate existing? = true` a repeat
  signup reactivates rather than erroring, but it does not overwrite custom fields on
  an existing subscriber — so survey answers already stored against someone cannot be
  clobbered by a later signup.
- **`Send Welcome Email` is already `true`**, which is the fix recommended in
  `../.claude/research/beehiiv-welcome-survey-not-triggering.md` (2026-08-27). That
  half of the August investigation has been applied.

**Still unknown:** whether the Zap sets `automation_ids` or has a following _Add
Subscriber to an Automation_ step — the config panel was not read past `First Name`.
That determines whether the welcome survey also arrives **by email** as a backstop. If
it does, a response dropped in the browser matters less still, because the subscriber
gets a second route to the same survey.

**Careful when re-testing the survey by hand:** beehiiv remembers an address across
visits, so a no-param load after a `?email=` load still shows the field prefilled.
Use a private window or you will not see what a fresh visitor sees.
