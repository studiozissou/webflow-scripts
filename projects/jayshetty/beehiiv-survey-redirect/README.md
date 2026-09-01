# beehiiv survey redirect

Sends people who subscribe on jayshetty.me to the beehiiv **"One Final Step!"** survey
once their Webflow form submission succeeds.

## Why this exists

beehiiv's "Subscribe" survey is a **redirect inside beehiiv's own signup flow**, not an
email. Their docs are explicit on two points:

- subscribers are "redirected to the survey immediately after signing up"
- signup flows work only with subscribe forms built in beehiiv's Website Builder —
  "embedded subscribe forms placed on external sites do not support signup flows"

Subscribers created through the API — everything tagged `api: jayshetty.me: popup`,
`: referral`, `: footer`, `: banner` — never pass through that hosted flow, so beehiiv
has no page on which to show them the survey. Setting `send_welcome_email: true` in the
Zap fixes the *welcome email*, but the survey is a separate mechanism and cannot be
embedded in an email (beehiiv recommends Polls for that instead).

This script reproduces beehiiv's redirect on our side.

## How it works

1. Listens for `submit` on the document in the capture phase.
2. Ignores any form that does not match `formSelector` (default `[data-beehiiv-survey]`),
   so "Suggest a Topic" and "Filter Blog" are untouched.
3. Watches the form's `.w-form` wrapper with a `MutationObserver` and waits for Webflow
   to reveal `.w-form-done`.
4. On success, navigates to the survey URL. On `.w-form-fail` or after
   `successTimeoutMs`, it does nothing and disconnects.

Visibility is tested with `Element.checkVisibility()` rather than `offsetParent !== null`.
`offsetParent` is always `null` for a `position: fixed` element, so the older idiom
reports a visible success message inside a fixed popup as hidden — which is exactly the
popup case this feature exists for. Verified: see below.

Waiting for `.w-form-done` rather than acting on submit matters — it means a failed
submission never sends anyone to the survey, and the Zapier → beehiiv chain has already
been triggered by the time we navigate.

No jQuery, no dependencies.

## Install

1. Add the attribute `data-beehiiv-survey` to each subscribe form in the Webflow
   Designer — popup, banner, footer and referral. Select the **Form** element (not the
   wrapper), then Settings → Custom attributes. Leave the value empty.
2. Paste `PASTE-INTO-FOOTER.html` into Site Settings → Custom Code → Before `</body>`.
3. Replace `PASTE_SURVEY_URL_HERE` with the survey's public URL, copied from beehiiv →
   Surveys → "One Final Step!" → share/copy link.
4. Publish.

## Config

Set on `window.beehiivSurveyRedirect` before the script loads.

| Key | Default | Notes |
| --- | --- | --- |
| `surveyUrl` | `""` | Required. The script no-ops until this is set. |
| `formSelector` | `"[data-beehiiv-survey]"` | Which forms opt in. |
| `emailParam` | `"email"` | Query param the email is appended as. Set to `""` to send no email. |
| `openInNewTab` | `false` | `true` opens a new tab, falling back to same-tab if blocked. |
| `successTimeoutMs` | `20000` | Give up waiting for the success state. |

Set `DEBUG = true` at the top of the script to trace submits and navigation in console.

## Verified

Run against a mock of Webflow's form lifecycle in Chrome (real DOM, real
`MutationObserver`), no contact with the live site. All five cases pass:

| Case | Expected | Result |
| --- | --- | --- |
| Opted-in form, success shown | navigates to survey | pass |
| Form without `data-beehiiv-survey` | ignored | pass |
| Opted-in form, `.w-form-fail` shown | does not navigate | pass |
| Success block is `position: fixed` | navigates to survey | pass |
| Success block inside a `display:none` wrapper | does not navigate | pass |

The fourth case fails with an `offsetParent` visibility check and passes with
`checkVisibility()`, confirmed directly.

Not covered by this: whether beehiiv attributes the response to the subscriber. See below.

## Open question — response attribution

**Verify before relying on this.** beehiiv's native flow knows which subscriber is
answering because the redirect happens inside their session. A cold link may record the
response without tying it to the subscriber, which would make the data much less useful
to TDW even though the survey is now reaching people.

`emailParam` appends the submitted address to the URL as a best effort, but beehiiv's
public survey URLs are not documented as accepting a prefill or identity parameter. Send
one test response through the site and check in beehiiv whether it is attributed to the
subscriber. If it is not, ask beehiiv support which parameter their own signup flow uses.

Note this also puts an email address in a URL, so keep it off (`emailParam: ""`) unless
attribution actually depends on it.

## Not done here

The `send_welcome_email: true` change lives in Zapier, on the beehiiv **Create a
Subscriber** action, and is unrelated to this script. Both are wanted: the flag restores
the welcome email, this script restores the survey.
