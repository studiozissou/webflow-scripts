# Newsletter signup → beehiiv welcome survey redirect

**Client:** jayshetty.me (via Skye High Interactive)
**Site:** Webflow site `64c10a2010e1a379d08bf030` (jayshetty.webflow.io / www.jayshetty.me)
**Slug:** `jayshetty-newsletter-signup-redirect`
**Date:** 2026-09-01
**Status:** Approach chosen (script) — snippet written, awaiting deploy
**Related:** `projects/jayshetty/.claude/research/beehiiv-welcome-survey-not-triggering.md` (2026-08-27)

---

## 1. Goal

When a visitor successfully submits a newsletter signup form on jayshetty.me, send
them to the beehiiv welcome survey with their email address attached:

```
https://news.jayshetty.me/forms/c63ba936-3683-48e2-add5-f8890e18bd5e?email=<submitted email>
```

Site-wide, across the three global signup forms.

## 2. Background — why this is the fix, and why it is not a Zapier job

The August 2026 research note found that beehiiv's welcome survey never reaches
subscribers created through the API (i.e. everyone who signs up on jayshetty.me),
because Zapier's *Create a Subscriber* action does not enrol them in the survey
automation. The fix proposed there was a Zapier change.

This spec takes the other road: rather than waiting for the automation to deliver
the survey by email, hand the visitor the survey immediately, in the browser,
while intent is highest. The two are complementary — this one does not require
beehiiv or Zapier access.

**Zapier cannot do this.** Zapier is triggered server-side by Webflow's form
submission webhook, which fires after the visitor's browser has already received
its response. Zapier has no handle on the visitor's session and cannot navigate
them anywhere. The redirect has to happen client-side, on jayshetty.me.

## 3. Research findings (verified live, 2026-09-01)

Verified by direct DOM inspection of the production site. The Webflow MCP was
**not** usable for this — the session's Webflow token is scoped to the Coconut
workspace only and returns `404 resource_not_found` for site `64c10a2010e1a379d08bf030`.
Everything below therefore comes from the rendered DOM, not the Designer.

### 3.1 There are four newsletter forms, not one

All four carry the class `.footer2_form`. Three are global (present on every page);
the fourth is `/tour` only.

| `data-wf-element-id` | Form name | Classes | `utm_medium` | Location |
|---|---|---|---|---|
| `a3a0a744-f40d-7d2f-cfa5-a84b30ab0b3a` | `wf-form-Footer-Subscribe-Form` | `footer2_form is-dw` | `footer` | Footer CTA — every page |
| `8f6d348a-6e5d-b370-55d1-13144ac79335` | `wf-form-Footer-Subscribe-Form` | `footer2_form is-popup is-global` | `popup` | Modal popup — global |
| `a6cfadf6-e3d0-c133-8f05-93cf0c750fd1` | `wf-form-Footer-Subscribe-Form` | `footer2_form is-popup is-global` | `banner` | Top banner — global |
| `db207ae1-7143-d165-7e06-64005cee9b3d` | `wf-form-Tour-Subscribe-Form` | `footer2_form is-tour` | *(none)* | `/tour` only — **out of scope** |

These `utm_medium` values map exactly onto three of the four beehiiv sources named
in the August note (`popup`, `banner`, `footer`). The fourth, `referral`, has no
corresponding Webflow form and is presumed to be beehiiv's own referral programme.

Note: `wf-form-Footer-Subscribe-Form` is the form **name** on three separate form
elements, and the two popup/banner forms additionally share the DOM `id`
`wf-form-popup-Subscribe-Form`. Neither the name nor the id is unique — **selecting
by name or id is not safe.** Target by class.

### 3.2 Four other forms must not be caught

| Form | Class | Where |
|---|---|---|
| Site search (desktop + mobile) | `search-form` | Every page |
| Blog / podcast filters | `filter-form is-blog-filters` | `/blog`, `/podcast` |
| Suggest a Topic | `contact11_form` | `/podcast` |
| Book Jay | `contact-modal2_form` | `/speaking` |

A blanket "redirect on any successful form submit" would break Suggest-a-Topic and
Book-Jay — real enquiry forms whose submitters would be thrown off to a newsletter
survey. **The selector must be scoped.**

### 3.3 Selector

`.footer2_form:not(.is-tour)` — verified on the live homepage: matches exactly the
3 in-scope forms, 0 false positives, and excludes the tour form on `/tour`.

Because it keys on the shared `.footer2_form` class rather than element IDs, any
new signup form built from the same class is covered automatically.

### 3.4 The email param is a UX win, not a requirement

> **Corrected 2026-09-01.** An earlier version of this section claimed the survey
> could not be submitted without `?email=`, and used that to rule out Webflow's
> native redirect. **That was wrong.** The original check enumerated only
> `input[type=hidden]`, so a *visible* email input was invisible to it, and
> beehiiv's `no_subscription_error_message` config string was misread as evidence
> of a gate. Re-tested in a clean browser context with no cookies — see below.

The destination is beehiiv's welcome survey, titled **"One Final Step! | The Daily Wisdom"**
— an 8-question survey (region, age, gender, occupation, challenges, preferences,
two free-text). It posts to `https://news.jayshetty.me/post_subscribe_form`.

Tested in an isolated browser context with no cookies:

| Request | `email` field renders as |
|---|---|
| `/forms/c63ba936-…?email=test@example.com` | `<input type="hidden" name="email" value="test@example.com">` — prefilled, not shown |
| `/forms/c63ba936-…` (no param) | `<input type="email" name="email" required placeholder="Email">` — **visible and required**, first field on the form |
| `/forms/c63ba936-…?e=test@example.com` | Visible field, as above — the param name is exactly `email` |

So the survey is submittable either way. Without the param the visitor simply types
their address; with it, the field is hidden and prefilled.

**Cookie caveat, learned the hard way:** beehiiv remembers an address across visits.
After loading the page once with `?email=test@example.com`, a subsequent *no-param*
load still rendered the field hidden and prefilled with that address. Any manual
check of this behaviour must use a private window or an isolated context, or it will
report the prefilled state for a visitor who would actually see an empty field.

**Architectural consequence:** Webflow's native per-form "Redirect to URL" setting
is genuinely viable — it takes a static URL, and the survey copes with that. The
script's advantage is narrower than first stated:

| | Native Webflow redirect | Footer script |
|---|---|---|
| Effort | Set Redirect URL on 3 forms in the Designer | ~30 lines of site footer code |
| Visitor experience | Retypes the address just submitted, as the first field of a 9-question form | Email prefilled and hidden; one less step |
| New signup forms | Each needs the setting adding by hand | Covered automatically by the class selector |
| Reversibility | Clear the field | Delete the block |

**Decided 2026-09-01 (Will): the script.** Two reasons, the second the stronger:

1. Re-asking for an address the visitor entered seconds earlier, at the top of a
   long survey, is a predictable drop-off point.
2. **Data integrity.** If the visitor retypes the address they can typo it or use a
   different one, and the survey response is then attached to an address that does
   not match the subscriber record created by Webflow → Zapier → beehiiv. Passing
   the captured value guarantees the response lands against the right subscriber.

The native redirect remains a valid fallback if the script ever has to be pulled.

### 3.5 Success detection

Webflow's form handler AJAX-posts, then reveals the sibling `.w-form-done` inside
the `.w-form` wrapper (verified: `display:none` by class at rest, no inline style;
Webflow sets inline `display:block` on success). On failure it reveals `.w-form-fail`
instead.

Watching `.w-form-done` — rather than the submit event — is what makes the redirect
correct: a Cloudflare Turnstile failure, a network error, or a validation rejection
all leave `.w-form-done` hidden, so no redirect fires.

Confirmed on the wrappers of all three in-scope forms:

| Form | Wrapper class | Email field |
|---|---|---|
| footer | `footer2_form-block is-footer w-form` | `input[name="Email"]` |
| popup | `footer2_form-block is-blog w-form` | `input[name="Email"]` |
| banner | `footer2_form-block is-blog is-dw w-form` | `input[name="Email"]` |

### 3.6 Site environment

| | |
|---|---|
| Barba | **Not present** — no `window.barba`, no `[data-barba]` |
| GSAP / Lenis | Not present |
| jQuery | Present (loaded by Webflow; existing footer scripts use it) |
| Turnstile | Present on the popup and banner forms — **not** on the footer form |
| Other | Finsweet cookie-consent + scrolldisable + autovideo, js-cookie, Hotjar, Meta Pixel, UserWay |

Deployment surface: **Webflow Project Settings → Custom Code → Footer**, where the
site's existing inline scripts already live. Note the client-specific gotcha recorded
in `projects/jayshetty/podcast-player/README.md`: Webflow's freeform custom-code API
has been returning HTTP 406 on writes for this site, and the Designer's code editor
has previously reformatted pasted blocks and truncated a long URL mid-path. Keep the
snippet short, and paste it by hand.

## 4. Decisions taken

| Question | Decision |
|---|---|
| Which forms | The **three global** forms (footer, popup, banner). `/tour` excluded. |
| Timing | Show Webflow's existing success state briefly, then redirect. |
| Email in URL | Yes — accepted; required for the survey to function. |

## 5. Scope

**In scope**
- One site-wide footer snippet redirecting the 3 global signup forms to the survey with `?email=`.
- A short delay so the visitor sees the existing "Thank you!" confirmation first.

**Out of scope**
- The `/tour` form (`wf-form-Tour-Subscribe-Form`).
- Search, filter, Suggest-a-Topic and Book-Jay forms.
- Any Zapier or beehiiv-side change (including the `send_welcome_email` /
  `automation_ids` fix from the August note — still worth doing separately).
- Fixing the typo in the existing success message: **"Thank you! YOu're on the list!"**
  (capital O). Flagged here because it is now on the page for ~1.2s in front of
  every subscriber; a one-word Designer fix, not part of this build.

## 6. Proposed implementation

Paste into **Project Settings → Custom Code → Footer**, before `</body>`.

```html
<script>
(function () {
  var SURVEY = 'https://news.jayshetty.me/forms/c63ba936-3683-48e2-add5-f8890e18bd5e';
  var SELECTOR = '.footer2_form:not(.is-tour)';
  var DELAY = 1200;

  var emails = new WeakMap();
  var going = false;

  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form || !form.matches || !form.matches(SELECTOR)) return;
    var field = form.querySelector('input[name="Email"], input[type="email"]');
    if (field && field.value) emails.set(form, field.value.trim());
  }, true);

  function go(form) {
    if (going) return;
    going = true;
    var email = emails.get(form);
    var url = email ? SURVEY + '?email=' + encodeURIComponent(email) : SURVEY;
    window.setTimeout(function () { window.location.href = url; }, DELAY);
  }

  function watch(form) {
    var wrapper = form.closest('.w-form');
    var done = wrapper && wrapper.querySelector('.w-form-done');
    if (!done) return;
    if (window.getComputedStyle(done).display !== 'none') go(form);
    new MutationObserver(function () {
      if (window.getComputedStyle(done).display !== 'none') go(form);
    }).observe(done, { attributes: true, attributeFilter: ['style', 'class'] });
  }

  function boot() {
    var forms = document.querySelectorAll(SELECTOR);
    for (var i = 0; i < forms.length; i++) watch(forms[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}());
</script>
```

### Why it is built this way

- **`.footer2_form:not(.is-tour)`** — name and id are both non-unique on this site
  (§3.1); the class is the only safe handle, and it excludes the four forms in §3.2.
- **Watches `.w-form-done`, not `submit`** — only a genuine Webflow success reveals
  it, so Turnstile failures and network errors correctly do not redirect (§3.5).
- **Email captured on `submit`, in the capture phase** — Webflow clears/hides the
  form on success, so the value must be read before that. Keyed in a `WeakMap` by
  form element, because the two popup/banner forms share a DOM id.
- **`going` guard** — the observer can fire more than once per success; the redirect
  must only be scheduled once.
- **Vanilla, no jQuery** — per repo `CLAUDE.md`, despite jQuery being available.
- **No inline comments** — per repo `CLAUDE.md`; the "why" lives in this spec.

### Known considerations

- **1.2s and screen readers.** A screen reader may not finish announcing the success
  message before the page changes. 1200ms is a compromise; raise it if the client
  prefers. Not an automated check — see Tier 3.
- **Email visible in the URL.** It lands in the visitor's address bar, in browser
  history, and in beehiiv's own server logs and page analytics. Accepted per §4; it
  is the visitor's own address and never a third party's.
- **Fallback when no email was captured.** The visitor still reaches the survey, just
  without the prefill — beehiiv then shows its own visible, required email field and
  the visitor types the address themselves (§3.4). A degraded but working path, which
  is why the fallback redirects rather than aborting. Should be rare in any case: the
  email field is required on all three Webflow forms.

## 7. Barba impact

**N/A — no Barba transitions on this site.** Verified live: `window.barba` undefined
and no `[data-barba]` container (§3.6). The snippet binds once on `DOMContentLoaded`
against forms present in the initial server-rendered HTML (confirmed for all three
across `/`, `/about-jay`, `/press`, `/speaking`, `/connect`, `/blog`, `/podcast`,
`/tour`, `/terms` and a podcast CMS page), so no re-init hook is needed.

## 8. Tasks

| # | Task | Agent | Depends on |
|---|---|---|---|
| 0 | ~~Decide: script or native redirect~~ — **done, script chosen** (§3.4) | — (Will) | — |
| 2 | Write the footer snippet to `projects/jayshetty/newsletter-redirect/footer-code.html` as the git mirror of what is pasted into Webflow | code-writer | 0 |
| 3 | Deploy: paste into Project Settings → Custom Code → Footer; publish to **jayshetty.webflow.io only** | — (manual, Will) | 2 |
| 4 | Verify on the Webflow subdomain — all three forms, real email, Tier 1 + Tier 3 | qa | 3 |
| 5 | Publish to the custom domain once signed off | — (manual, Will) | 4 |
| 6 | Write `projects/jayshetty/newsletter-redirect/README.md` recording the deploy surface and the 406 gotcha | code-writer | 2 |

Task 0 gates everything. Tasks 2–6 describe the **script** route. If the native
Webflow redirect is chosen instead, all of them collapse into a single Designer
change — set the Redirect URL to the survey on each of the three forms in §3.1,
publish, and close this spec.

### Parallelisation map

Barely parallel — it is one ~30-line snippet.

- **Sequential chain:** 0 → 2 → 3 → 4 → 5. Each genuinely gates the next.
- **Can run alongside:** Task 6 (README) in parallel with Task 3/4.
- **Recommendation:** sequential, single agent, **no worktree fan-out, no agent team.**
  Spawning parallel executors would cost more than the build.

## 9. ADR needed?

**No.** One scoped snippet in site footer code, no new dependency, no shared-module
change, trivially reversible by deleting the block. It does not meet the bar for an ADR.

## 10. Verify loop

### Pass criteria

1. On `/` (and any page), `document.querySelectorAll('.footer2_form:not(.is-tour)')` returns **exactly 3** elements.
2. On `/tour`, the same selector returns **3** and does **not** include `db207ae1-7143-d165-7e06-64005cee9b3d`.
3. The selector matches **none** of `.search-form`, `.filter-form`, `.contact11_form`, `.contact-modal2_form`.
4. Submitting the footer form with a valid email shows "Thank you!", then within ~2s navigates to
   `https://news.jayshetty.me/forms/c63ba936-3683-48e2-add5-f8890e18bd5e?email=<the address, URL-encoded>`.
5. Same for the popup form and the banner form.
6. On arrival, the survey page contains `input[type=hidden][name=email]` with the submitted address.
7. Submitting Suggest-a-Topic (`/podcast`) or Book-Jay (`/speaking`) does **not** redirect.
8. A failed submission (Turnstile refused / offline) shows `.w-form-fail` and does **not** redirect.
9. No new console errors on any page.

### Reproduction steps

1. Go to `https://jayshetty.webflow.io/`.
2. Scroll to the footer form. Enter a real, deliverable address you control.
3. Submit. Observe the success message, then the redirect.
4. On the survey, confirm the email is prefilled and the survey **submits successfully**.
5. Repeat for the popup (wait for / trigger it) and the banner.
6. Repeat on `/podcast` with Suggest-a-Topic — confirm it does *not* redirect.
7. Reload with DevTools offline throttling and submit — confirm failure state, no redirect.

### Tier mapping

**Tier 1 — automated (Playwright, `tests/acceptance/jayshetty-newsletter-signup-redirect.spec.js`)**
11 tests. Runs without ever creating a real subscriber: the Webflow form POST is
aborted at the network layer, the survey response is stubbed, and the success state
is revealed by hand to drive the MutationObserver. See §11 for the full index.

**Tier 2 — CDN regression.** Registered in `tests/registry.json` under slug
`jayshetty-newsletter-signup-redirect`, url `https://jayshetty.webflow.io/`.

**Tier 3 — manual (cannot be automated, and why)**
- **A real end-to-end signup**, because the only honest test creates a live beehiiv
  subscriber and a real Webflow submission. Must be done once with a real address.
- **The survey actually submits** with the prefilled email — it posts to beehiiv's
  servers, outside any test harness here, and the only honest check writes a real
  response into the client's live publication.
- **Turnstile behaviour** on the popup and banner — a real challenge cannot be driven
  headlessly.
- **The popup's own trigger timing** — cookie/schedule-driven by existing footer script.
- **Screen-reader announcement vs the 1.2s delay** — subjective, needs VoiceOver.
- **Safari and Firefox** — Playwright here runs Chromium only.
- **Whether 1.2s feels right** — a judgement call for the client.

### Regression scope — must not break

- Suggest-a-Topic (`/podcast`) and Book-Jay (`/speaking`) submit and show their own success states.
- Site search and blog/podcast filters unaffected.
- `/tour` form keeps its existing behaviour.
- Popup show/hide scheduling (existing cookie-based footer script) unchanged.
- Webflow → Zapier → beehiiv sync still fires — the redirect happens *after* Webflow's
  POST succeeds, so the submission is stored and the webhook fires as before. The
  `utm_source` / `utm_medium` hidden fields still travel with it, so beehiiv source
  attribution (`popup` / `banner` / `footer`) is preserved.
- Finsweet cookie consent, Hotjar, Meta Pixel and UserWay unaffected.

## 11. Acceptance tests

`tests/acceptance/jayshetty-newsletter-signup-redirect.spec.js`

11 tests, verified to parse and register with `--list` (not run — see below).

| # | Test | Asserts |
|---|---|---|
| 1 | `no console errors on load` | Clean console on `/` |
| 2 | `matches exactly the three global signup forms` | Selector returns exactly the 3 known element IDs |
| 3 | `excludes search, filter and contact forms` | 0 overlap with the four out-of-scope classes |
| 4 | `excludes the tour form on /tour` | Tour form present on the page but not in the match set; still 3 matches |
| 5 | `does not redirect while no form has been submitted` | Still on jayshetty host after 2.5s at rest |
| 6 | `footer form redirects to the survey with the email appended` | `.w-form-done` → survey URL carrying the encoded email |
| 7 | `popup form redirects to the survey with the email appended` | As above, popup form |
| 8 | `banner form redirects to the survey with the email appended` | As above, banner form |
| 9 | `does not redirect on the failure state` | Revealing `.w-form-fail` navigates nowhere |
| 10 | `survey prefills the email from the query param` | Live beehiiv page renders hidden `input[name=email]` with the value |
| 11 | `survey shows a visible required email field without the param` | Guards §3.4's correction — if this fails, the param has become mandatory |

Tests 2–5, 10 and 11 should pass **today**, against the un-modified site — they assert the
selector's scoping and beehiiv's prefill behaviour, both of which already hold. Tests
1 and 6–9 **fail until the snippet is deployed** (Task 3), which is the intended TDD
red state.

Tests 10 and 11 are the only ones touching a live external service, and both only read.

Per repo `CLAUDE.md`, Playwright must not be run without asking first — these have
been written and parse-checked, but deliberately not executed.
