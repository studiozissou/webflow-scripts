Run the pre-launch gate on a Webflow site (staging or live), every locale, desktop + mobile.

Load the `webflow-launch` skill first. Read-only: no Webflow writes, no publish, no fixes.

## Usage
`/launch-check <url> [--locale <code>]`
- `<url>` — site root, staging (`*.webflow.io`) or custom domain
- `--locale <code>` — limit steps 2–5 to one locale (e.g. the primary, for gate 2)

## Step 0 — Resolve the client
1. Take the URL's host, strip `www.`, and match it against `domain` in `projects/*/launch.config.json`.
2. No match (usually a staging URL): ask which client. Never guess.
3. Load that config. Today's date (`YYYY-MM-DD`) names the report.
4. Run steps 1–6 in order. Record every result as it comes in; the report is written even if the run stops early.

## Step 1 — Webflow pre-flight
1. `get_site` (find the site ID via `list_sites` if it isn't in the client's private folder). Auth fails → ask Will to reconnect the Webflow MCP. If he can't now, mark step 1 **Not run** and carry on; the verdict can't be PASS without it.
2. Compare `lastUpdated` with `lastPublished`. If newer, list what's pending (pages and CMS items updated since the last publish) under **Pending changes**. Don't publish.
3. Check the URL's host is in the `get_site` response's `customDomains` or is the site's staging domain. If not, stop: wrong site.

## Step 2 — launch-guard (blocking)
```bash
node tools/webflow/launch-guard.js <url> --client <client> [--locale <code>]
```
- Exit 0 → continue. Warnings (`missing-share-image`, `title-length`, `description-length`, `lazy-above-fold`) go in the report as WARN.
- Exit 1 → blocking errors (e.g. `placeholder`, `locale-link-leak`, `email-domain`, `label-for`, `allow-local`, `jsonld-staging-url`, `ungated-analytics`). The verdict is BLOCKED. Still run steps 3–6 (all read-only) so one run lists everything to fix.
- Exit 2 → fetch failure. Report it and stop.

## Step 3 — Consent (chrome-devtools, clean context)
Use a fresh isolated context so the user's own cookies and extensions don't count (`new_page` with `isolatedContext: "launch-check"`; fall back to an incognito window if the option isn't available).
1. `emulate` viewport 375 × 812, then `navigate_page` to the home page of each locale. Wait 3000 ms with `evaluate_script` (`() => new Promise(r => setTimeout(r, 3000))`; `wait_for` only waits for text). Make no choice.
2. `evaluate_script`: `() => document.cookie.split('; ').filter(c => /^_(ga|gcl)/.test(c))` → must be `[]`.
3. `list_network_requests` → no request URL containing `g/collect` or `/collect?v=2`.
4. Banner visible and on top: find the consent banner's root and its accept/decline buttons; for the centre of each button, `document.elementFromPoint(x, y)` must be inside the banner. Many CMPs render in an open shadow root on an unclassed body-level element: pierce `shadowRoot` to find the buttons, and compare `elementFromPoint` against the shadow host. Anything else (booking launcher, chat bubble, sticky nav) → FAIL, name the element.
5. Click accept, reload, confirm a `g/collect` request now fires (proves the gate opens, not just blocks).
6. `take_screenshot` of the banner at 375 px for the report.

Any FAIL in 2–4 is blocking. Close the isolated page when done.

## Step 4 — Pages (`/test-page` light)
Key pages: home, every top-level nav page and each form/booking page, per locale (or only `--locale`). Use `fallbackPaths` from the config if the nav can't be read.

For each page × {desktop 1280, mobile 375}, run the `/test-page` Light checks (skip its mode gate and fix phase: diagnose only).

| Check | Blocking | Warn |
|---|---|---|
| Console | Uncaught exception | Other errors after noise filter |
| CLS | > 0.25 | 0.1–0.25 |
| Mobile overflow | Horizontal scroll at 375 | — |
| Lighthouse (all 4) | Never | Any score < 90 (mobile performance listed first) |

Lighthouse scores warn only; they never stop the launch. `lighthouse_audit` covers a11y, best practices and SEO; take performance from `performance_start_trace` / `performance_stop_trace` (LCP, CLS) on mobile home.

## Step 5 — Schema (`/test-schema`)
1. On each key page, `evaluate_script`: `() => document.querySelectorAll('script[type="application/ld+json"]').length`.
2. For each page with JSON-LD, run the `test-schema` skill's Rich Results Test. Report only: don't edit schema files or ask for a redeploy. The test needs a Google login, which an isolated context lacks: run it in a normal page, or if that fails, `JSON.parse` each block and record the Rich Results Test as **Not run**.
3. Errors → blocking. Warnings → WARN. A `webflow.io` URL in JSON-LD on the custom domain is already a step 2 error.

## Step 6 — Manual checklist and go-live steps
Print this for Will to tick on real phones (iOS Safari + Android Chrome):
- [ ] Every CTA on every locale goes where it says
- [ ] Booking flow opens, completes a test booking, no auto-open
- [ ] `tel:` dials, `wa.me` opens the right chat, `mailto:` addresses the right inbox
- [ ] Each form submits and the email arrives
- [ ] Consent banner usable with every floating widget open; decline leaves no `_ga` cookie
- [ ] Privacy policy claims match what you just saw

Then the go-live steps from the `webflow-launch` skill's staging → live checklist (`<gates>`), with the items this run already proved ticked.

## Report
Write `projects/<client>/.claude/reports/launch-check-<YYYY-MM-DD>.md` (append `-2`, `-3` if it exists):

```markdown
# Launch check — <client> — <YYYY-MM-DD>
URL: <url> | Locales: <list> | Verdict: BLOCKED / PASS WITH WARNINGS / PASS

## Pending changes (get_site)
## Blocking
| Step | Check | Page | Detail |
## Warnings
| Step | Check | Page | Detail |
## Lighthouse
| Page | Locale | Device | Perf | A11y | BP | SEO |
## Consent
## Schema
## Not run
## Manual checklist
## Go-live steps
```

Reply with the verdict, blocking count, warning count and the report path. Nothing else.
