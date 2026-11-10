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
4. Read `.claude/skills/webflow-launch/references/launch-audit-checklist.md`; steps below use its rows.
5. Run steps 1–7 in order. Record every result as it comes in; the report is written even if the run stops early.

## Step 1 — Webflow pre-flight
1. `get_site` (find the site ID via `list_sites` if it isn't in the client's private folder). Auth fails → ask Will to reconnect the Webflow MCP. If he can't now, mark step 1 **Not run** and carry on; the verdict can't be PASS without it.
2. Compare `lastUpdated` with `lastPublished`. If newer, list what's pending (pages and CMS items updated since the last publish) under **Pending changes**. Don't publish.
3. Check the URL's host is in the `get_site` response's `customDomains` or is the site's staging domain. If not, stop: wrong site.
4. Read every row with an `MCP` method, following the checklist's **MCP reads** section for gotchas. Rows marked for a person's review go in the report as a list to review. Any read that fails or isn't available goes under **Not run**.

## Step 2 — launch-guard (blocking)
```bash
node tools/webflow/launch-guard.js <url> --client <client> [--locale <code>]
```
- Exit 0 → continue. Warnings (`missing-share-image`, `title-length`, `description-length`, `lazy-above-fold`, `icons`, `empty-link`, `duplicate-ids`, `h1-count`, `canonical`, `blocking-script`, `link-name`, `minify`, `font-format`, `frame-headers`, `robots-ai`, `sitemap`, `llms`, `site-audit`) go in the report as WARN. `empty-link` and `blocking-script` need a person's decision on each finding. `default-domain` warns when both hosts end on the apex without `apexDefault`. `robots` and `staging-index` warn when their file can't be read.
- Exit 1 → blocking errors (`placeholder`, `locale-link-leak`, `whatsapp-link`, `bare-social-link`, `run-together-list`, `untranslated-title`, `email-domain`, `label-for`, `allow-local`, `jsonld-staging-url`, `ungated-analytics`, `html-lang`, `https-redirect`, `default-domain`, `robots`, `staging-index`, `redirects`). The verdict is BLOCKED. Still run steps 3–7 (all read-only) so one run lists everything to fix.
- Exit 2 → fetch failure. Report it and stop.
- Rows the guard couldn't reach on this run (see the checklist's **Guard limits**) go under **Not run**.

## Step 3 — Consent (chrome-devtools, clean context)
Use a fresh isolated context so the user's own cookies and extensions don't count (`new_page` with `isolatedContext: "launch-check"`; fall back to an incognito window if the option isn't available).
1. `emulate` viewport 375 × 812, then `navigate_page` to the home page of each locale. Wait 3000 ms with `evaluate_script` (`() => new Promise(r => setTimeout(r, 3000))`; `wait_for` only waits for text). Make no choice.
2. `evaluate_script`: `() => document.cookie.split('; ').filter(c => /^_(ga|gcl)/.test(c))` → must be `[]`.
3. `list_network_requests` → look for request URLs containing `g/collect` or `/collect?v=2`. None is a pass. Cookieless Consent Mode pings are allowed only when the `/site-audit` **Consent Mode check** shows defaults `denied`, every such request carries `gcs=G100`, and check 2 found no `_ga*`/`_gcl*` cookie. Anything else → FAIL. `ungated-analytics` doesn't see GTM, so this step is the check for that route.
4. Banner visible and on top: find the consent banner's root and its accept/decline buttons; for the centre of each button, `document.elementFromPoint(x, y)` must be inside the banner. Many CMPs render in an open shadow root on an unclassed body-level element: pierce `shadowRoot` to find the buttons, and compare `elementFromPoint` against the shadow host. Anything else (booking launcher, chat bubble, sticky nav) → FAIL, name the element.
5. Click accept, reload, confirm a `g/collect` request now fires, with `gcs` no longer `G100` if the site uses Consent Mode (proves the gate opens, not just blocks).
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

Also run the checklist's `Browser` rows on these pages and report failures as WARN.

## Step 5 — Schema (`/test-schema`)
1. On each key page, `evaluate_script`: `() => document.querySelectorAll('script[type="application/ld+json"]').length`.
2. For each page with JSON-LD, run the `test-schema` skill's Rich Results Test. Report only: don't edit schema files or ask for a redeploy. The test needs a Google login, which an isolated context lacks: run it in a normal page, or if that fails, `JSON.parse` each block and record the Rich Results Test as **Not run**.
3. Errors → blocking. Warnings → WARN. A `webflow.io` URL in JSON-LD on the custom domain is already a step 2 error.
4. FAQPage is optional, so a missing one isn't a finding. Where it's present, `JSON.parse` its JSON-LD only. Never test FAQ in the Rich Results Test, and skip the test on a page whose only JSON-LD is FAQPage.

## Step 6 — Manual checklist and go-live steps
Print this for Will to tick on real phones and tablets (iPhone and iPad on Safari, Android phone and tablet on Chrome):
- [ ] Every CTA on every locale goes where it says
- [ ] Booking flow opens, completes a test booking, no auto-open
- [ ] `tel:` dials, `wa.me` opens the right chat, `mailto:` addresses the right inbox
- [ ] Each form submits and the email arrives
- [ ] Consent banner usable with every floating widget open; decline leaves no `_ga` cookie
- [ ] Privacy policy claims match what you just saw

Then read the checklist and print one tick per row whose Method includes `Manual`, with its item number and text. Show phase `L` rows only on a live URL. Tick a row only if this run proved it.

Then the go-live steps from the `webflow-launch` skill's staging → live checklist (`<gates>`), with the items this run already proved ticked.

## Step 7 — SEMrush evidence (live URL only)
Gate 5 only. On `*.webflow.io` skip this step and note it under **Not run**: staging is noindexed and may not be crawlable.

Follow the checklist's **SEMrush evidence** section for its flow and items, within the unit budget in `.claude/agents/seo.md`. Record evidence by item number. It never clears a step 1 or step 2 finding. No project, no data or no units → **Not run**, then carry on. Report any `no_api_units`, and don't create a project without asking.

## Report
Write `projects/<client>/.claude/reports/launch-check-<YYYY-MM-DD>.md` (append `-2`, `-3` if it exists):

Write the verdict, the manual checklist and the go-live steps (the summary and the owner tasks) 80% of the way to ASD-STE100 (Simplified Technical English): sentences of about 15 words, active voice, one instruction per sentence, one word for one thing.

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
## SEMrush
## MCP rows to review
## Not run
Anything that couldn't be checked: item or step number, and why. Never count these as a pass.
## Manual checklist
## Go-live steps
```

Reply with the verdict, blocking count, warning count and the report path. Nothing else.
