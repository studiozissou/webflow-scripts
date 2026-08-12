# NEM Test report delivery: brand the covering email and the PDF report

**Slug:** `nem-verify-report-email-and-pdf-branding`
**Status:** Ready to Build
**Priority:** P2
**Type:** feature
**Created:** 2026-08-11
**Project:** nem-life
**Workflow:** `NEM Test — /verify` (n8n id `uKkMgMYoH5nOLoCR`, **active**)
**Repo file:** `projects/nem-life/.claude/backend/nem-verify.workflow.json`

## Summary

The report chain works end to end but looks like a debug fixture. The covering email is
one line of plain text with no HTML part at all, and the PDF is an unbranded serif
document with no logo, no colour, and no footer. This task dresses both to the NEM Life
brand and closes three defects found while specifying it — one of which will visibly
break the report the moment Alex's real prompt lands.

Touches two nodes: `Build HTML` and `Send Report`.

## Current state

### `Build HTML` (Code node)

Converts the Anthropic response into a print template:

```js
const reportHtml = raw.split('\n\n')
  .map(p => '<p>' + p.replace(/\n/g, '<br>') + '</p>')
  .join('');
```

Wrapped in a minimal document: Georgia body at 16px/1.6, `#292828`, `max-width:640px`,
`padding:48px 40px`, a single Montserrat `h1` heading, and a `Beste {firstName},` /
`Dear {firstName},` greeting. That is the entire design.

### `Send Report` (MailerSend `POST /v1/email`)

```js
{ from: { email: 'hallo@nemmatters.com', name: 'NEM Life' },
  to:   [ { email, name: firstName } ],
  subject: locale === 'en' ? 'Your NEM Test report' : 'Jouw NEM Test rapport',
  text:    locale === 'en'
             ? 'Your personal report is attached as a PDF.'
             : 'Je persoonlijke rapport zit als PDF in de bijlage.',
  attachments: [ { content: pdfBase64, filename: 'NEM-rapport.pdf',
                   disposition: 'attachment' } ] }
```

No `html`, no `reply_to`, no `settings`, no `tags`.

## Defects to fix alongside the branding

### Defect 1 — markdown from Anthropic renders as literal characters

`Build HTML` does paragraph splitting and nothing else. It has no markdown handling, so
any `## Heading`, `**bold**`, `- bullet`, or `1.` list in the model's output reaches the
PDF as raw characters: a line reading `## Jouw primaire mechanisme` prints with the
hashes visible.

This is invisible today only because the stub prompt returns flat prose. Alex's real
prompt is long-form structured therapy writing and will almost certainly ask for
headings and lists — the failure arrives with the prompt, not before. It is the same
detonation pattern as `nem-report-prompt-escaping-and-token-limit`: latent, and triggered
by content rather than by a deploy.

**Fix:** render a constrained markdown subset in `Build HTML` — headings `##`/`###`,
`**bold**`, `*italic*`, unordered `-`/`*` lists, ordered lists, and paragraphs. Not a
general markdown engine; a small deterministic converter with the output escaped for
HTML first, so report text can never inject markup into the template. Anything
unrecognised falls through as a paragraph, exactly as today.

Coordinate with the prompt: whatever subset the converter supports should be stated in
Alex's system prompt as the allowed formatting vocabulary. Worth raising with him when
the real prompt lands.

### Defect 2 — the PDF filename is not localised

`filename: 'NEM-rapport.pdf'` is hardcoded. An English-locale user receives a Dutch
filename. Already logged as a known gap in `backend/README.md` § Localisation.

**Fix:** `locale === 'en' ? 'NEM-Test-report.pdf' : 'NEM-Test-rapport.pdf'`.

### Defect 3 — email analytics are impossible by construction

MailerSend Analytics reads 0.00% opened across every send. Not low engagement — open
tracking injects a pixel into the HTML part and click tracking rewrites its links, and
there is no HTML part. Adding one is a precondition for any delivery reporting.

**Fix:** ships with the branded email below (`html` + `settings`). Note open rates are
soft data regardless — Apple Mail Privacy Protection pre-fetches images and inflates
them. Clicks are the more trustworthy signal, which is an argument for the email body
carrying a real link (see "Open question" below).

## Design

### PDF template (`Build HTML`)

Brand direction, from `.claude/brand/design-state.md`: calm, grounded, generous
whitespace, warm-neutral with a muted olive/gold accent on cream, restraint over drama.
The document should read as a considered piece of writing, not a dashboard.

- **Cover block** — NEM Life logo, the report title, the reader's first name, and the
  generation date. Enough vertical space to feel deliberate.
- **Body** — keep the current measure (~640px) and 1.6 line height; both are already
  right for long-form reading. Headings in Montserrat, body in Georgia. Georgia is a
  deliberate divergence from the site's Lato — PDFShift renders through headless Chrome
  with no webfont loading configured, so only locally-installed families are safe.
  **Confirm before relying on anything else.**
- **Accent** — a single muted olive/gold rule or heading colour. One accent, used
  sparingly.
- **Footer** — `nemmatters.com`, and a one-line disclaimer that the report is a
  self-test reflection and not a clinical diagnosis. Check the exact wording with Alex;
  the component already carries a disclaimer whose phrasing should be reused rather than
  reinvented.
- **Page breaks** — `@page { margin: … }` plus `h2 { break-after: avoid }` so headings
  cannot strand at a page foot.

⚠️ **Colour tokens are not in the repo.** `global.css` yields only a stray `#4d65ff`,
which is not the brand olive/gold. Pull the real values from the Webflow site variables
(`--_token---*`) or Figma file `8jRJkSvjuMQzYkA1gXc646` before writing the CSS. Do not
eyeball them from the design PNGs.

### Covering email (`Send Report`)

Its own document — do **not** reuse `$json.html` from `Build HTML`. That string is the
full report and is destined for the PDF; sending it as the email body would deliver the
entire report twice, once unstyled.

Email HTML is a separate dialect: tables not flex/grid, inline styles not `<style>`,
~600px fixed, no web fonts (the Montserrat/Georgia stack will not load — specify
`Arial, Helvetica, sans-serif` with Georgia only as a serif fallback).

Short and warm: NEM Life logo, `Beste {firstName},` / `Dear {firstName},`, two or three
sentences saying the report is attached and what to do with it, a sign-off, and a footer
with `nemmatters.com` and an unsubscribe reference. Keep the existing one-liner as the
plain-text `text` part — MailerSend sends both and the client picks.

Add to the payload:

```js
html: emailHtml,
settings: { track_opens: true, track_clicks: true },
reply_to: { email: '<ask Alex>', name: 'NEM Life' },
tags: [ 'report' ],
```

- `tags` do not enable tracking — they are a reporting filter (max 5, 191 chars each).
  Low value while every MailerSend send is a report email, but free to add now and
  useful the moment a second type exists.
- `html` and `template_id` are **mutually exclusive**. Raw content or a template, never both.

## Open question

**Should the email link back to the site?** Click tracking is the trustworthy half of
the analytics, and there is nothing to click while the report is a bare attachment. A
single "read more about your mechanism" link to the relevant page would make click data
real and give the email somewhere to go. Ask Alex whether he wants that, and where it
should point. Not a blocker — the task ships without it.

## Sequencing — read before touching the workflow

`nem-report-prompt-escaping-and-token-limit` (**P0**) edits `Generate Report` in this same
workflow and is prepared but unapplied: see
`../backend/changesets/nem-report-prompt-escaping/`.

**Land the P0 first.** Then, before starting this task, **re-pull live**. n8n holds no
version history for this workflow, so whichever task edits from a stale copy silently
destroys the other's work with no way back.

The repo's `nem-verify.workflow.json` is **already known to be stale** against live
(`max_tokens`, the system prompt, `Add To Newsletter`, `Consent?` — drift table in
`../backend/changesets/nem-report-prompt-escaping/README.md`). Do not treat it as the
source of truth. Express changes as node-level diffs via
`n8n_update_partial_workflow`, not as a whole-workflow import.

⚠️ **The n8n API key is currently failing authentication** (`AUTHENTICATION_ERROR`, found
2026-08-11). It must be refreshed before any of this can run.

## Verify Loop

### Pass/fail criteria

1. `Build HTML` renders `## Heading`, `**bold**`, and `-` lists as `<h2>`, `<strong>`,
   and `<ul><li>` — no literal markdown characters survive into the PDF
2. HTML special characters in the report text are escaped, not interpreted — a report
   containing `<script>` or `&` renders as visible text and injects nothing
3. Unrecognised syntax degrades to a paragraph rather than being dropped
4. The PDF carries the logo, the accent colour, and the footer disclaimer
5. No heading is orphaned at the foot of a page
6. The PDF opens cleanly in Preview, Acrobat, and a browser viewer
7. `Render PDF` still returns `application/pdf` and stays under PDFShift's 1 MB per-document
   limit — an embedded logo pushes toward it, so check the byte size
8. The email renders branded HTML with a working plain-text alternative
9. `filename` is `NEM-Test-report.pdf` for `locale: 'en'`, `NEM-Test-rapport.pdf` for `nl`
10. Subject, greeting, body, and footer are locale-correct in both languages
11. MailerSend Analytics records a non-zero open for a test send that is actually opened
12. `Respond Confirmed` still fires within ~1s — the fast path is untouched

### Reproduction steps

1. Refresh `N8N_API_KEY`; snapshot live and commit before editing
2. `POST /webhook/nem-submit` with a fixture profile (`backend/README.md` § Test it), or
   run `../backend/changesets/nem-report-prompt-escaping/verify.sh`
3. `GET /webhook/nem-verify?token=<token>`
4. Inspect the execution via `n8n_executions`; open the PDF from the attachment
5. Repeat with `locale: 'en'`

### Tier mapping

- **Tier 1 — Auto (unit):** the markdown converter is pure string→string and should be
  extracted and tested the way `nem-test-scoring.js` was — a module in `src/`, unit
  tested, with the Code node kept thin. Cover headings, bold, italic, both list types,
  HTML escaping, mixed content, and empty input. Model the test file on
  `tests/nem/nem-verify-report-body.test.js`, which already reads node source out of the
  workflow JSON and evaluates it.
- **Tier 1 — Auto (Playwright):** not applicable; no browser surface.
- **Tier 2 — CDN regression:** not applicable; no CDN asset changes.
- **Tier 3 — Manual:**
  - Visual quality of the PDF — typography, spacing, whether it feels like NEM Life.
    Subjective; only a human can judge it.
  - Email rendering across clients (Gmail web, Gmail iOS, Apple Mail, Outlook). Outlook's
    Word rendering engine is the one that breaks layouts, and nothing automated covers it.
  - Confirming the accent colour against Figma rather than against memory.

### Regression scope

- `Generate Report` is not modified by this task — but see Sequencing
- `Respond Confirmed` / `Mark Consumed` stay on the direct `Valid?` true-branch fan-out
- `Consent?` → `Add To Newsletter` (group `157087585777223620`) untouched
- `/submit` (`LDI1eWR35lwX6WLp`) untouched
- `Encode PDF` still base64-encodes the binary under `$json.pdfBase64`
- The known EN-newsletter-group issue is **out of scope** here — tracked in
  `backend/README.md` § Known issue

## Blockers

**MailerSend is still on a trial account** — `nem-mailersend-trial-account-blocks-report-delivery`
(P0, Blocked). `Send Report` 422s for any recipient MailerSend has not already delivered
to, so verification must use an already-seen address. Since this task changes the email
body itself, it cannot be fully signed off until the account is upgraded and a genuinely
new recipient receives the branded email.

## Barba Impact

N/A — no Barba transitions. This is an n8n workflow edit, not a Webflow page module.

## Agents needed

- `code-writer` — markdown converter module + node edits
- `art-director` — PDF and email visual design against the brand
- `qa` — cross-client email rendering, PDF verification, locale coverage
