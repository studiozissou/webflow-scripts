# Task Brief Reference

Full template, worked examples, and the Notion-Markdown traps that break page rendering.
Read this before writing the first brief of a triage run. `SKILL.md` carries the principle
and the skeleton; this file carries the detail that makes a brief land.

## Contents

- [The standard against which a brief is judged](#the-standard)
- [Notion-flavored Markdown traps](#notion-markdown-traps)
- [Example 1 — Quick](#example-1-quick)
- [Example 2 — Standard](#example-2-standard)
- [Example 3 — Parent and subtask](#example-3-parent-and-subtask)
- [Sourcing every line](#sourcing-every-line)
- [Assets and attachments](#assets-and-attachments)

---

## The standard

One question decides whether a brief is finished:

> Could someone who has never seen the original thread pick this up and finish it,
> without asking a question or opening another tool?

Everything below serves that. When a rule here conflicts with that question, the question
wins — these are patterns that usually work, not a form to complete.

Two failure modes to watch for, in order of how often they happen:

**Filler.** Sections present because the template has them, filled with restated task titles
and generic steps ("review the requirements", "implement the change", "test"). This is worse
than a short brief because it takes longer to read and teaches the reader to skim past
briefs entirely. If a section has nothing true in it, delete the section.

**Confabulation.** A staging URL that looks right, a deadline inferred from "soon", an
acceptance criterion nobody agreed to. These get trusted and acted on. See
[Sourcing every line](#sourcing-every-line).

---

## Notion Markdown traps

The `content` field is Notion-flavored Markdown, not CommonMark. These differences cause
most broken pages. Fetch `notion://docs/enhanced-markdown-spec` once per run for the full
dialect.

**Pipe tables do not exist.** `| a | b |` renders as literal text. Tables need XML:

```
<table header-row="true">
	<tr><td>What</td><td>Where</td></tr>
	<tr><td>Staging</td><td>https://carsa-v2.webflow.io</td></tr>
</table>
```

Prefer a bulleted list for link lists. It reads the same and cannot break.

**Multi-line quotes need `<br>`, not repeated `>`.** Consecutive `>` lines render as several
separate quote blocks, which looks like an accident:

```
> Line one<br>Line two<br>Line three
```

This matters because quoting the ask is the highest-value part of a brief, and a
multi-sentence ask is common.

**Indent children with tabs**, not spaces, for toggles, callouts, and nested list items.

**Escape these characters** outside code blocks, with a backslash:

```
\ * ~ ` $ [ ] < > { } | ^
```

Client names and file paths rarely contain them, but pasted error messages and CSS
selectors often do.

**Never use newlines inside inline code.** Use `<br>`, or a fenced code block.

**Table cells hold rich text only** — no headings, lists, or images inside a cell.

Useful and safe: `- [ ]` to-do items, `---` dividers, `**bold**`, fenced code blocks, and
callouts for a single genuinely important warning:

```
<callout icon="⚠️" color="red_bg">
	Live site. Publish only after Tomek confirms the copy.
</callout>
```

Use callouts sparingly. Everything highlighted means nothing is.

---

## Example 1 — Quick

A reply task. The quote plus the link is the whole brief. No headings, because at this
length headings cost more than they give.

**Task:** Reply to Tomek about the service page launch date
**Doer:** Claude · **Priority:** P1 · **Client:** Carsa

```
> Any update on when the MOT and servicing pages go live? Sales are asking so they can brief the stores.

— Tomek Stacharski, #carsa-general-website, 14 Aug 2026. [View in Slack](https://app.slack.com/archives/C08G8FGHX9Q/p1723640000123456)

He needs a date he can pass to the stores, not a status. Build state is tracked in
`projects/carsa/.claude/specs/carsa-service-BUILD-STATE.md`.

Run with: draft via gmail-triage voice rules, then `mcp__plugin_slack_slack__slack_send_message` after approval.
```

Note what is absent: no "Done when", no "Steps". Adding them here would be filler.

---

## Example 2 — Standard

One real deliverable. The full skeleton, minus sections with nothing true to say.

**Task:** Add FAQ schema to the Carsa MOT and servicing page
**Doer:** Claude · **Priority:** P2 · **Client:** Carsa

```
## The ask

> The MOT page isn't showing the FAQ dropdowns in Google like the finance one does. Can we get that working?

— Tomek Stacharski, #carsa-general-website, 12 Aug 2026. [View in Slack](https://app.slack.com/archives/C08G8FGHX9Q/p1723470000123456)

## Context

He is describing FAQ rich results in search. `/car-finance` already has FAQPage JSON-LD;
`/mot-and-car-servicing` does not. The page itself is built and live — this is a schema
gap, not a content gap.

The FAQ copy already exists on the page, so no new copy is needed. Existing schema for this
client lives in `projects/carsa/schema/`, and `mot-and-car-servicing.html` is already there
as the page template.

## Done when

- [ ] FAQPage JSON-LD is present on /mot-and-car-servicing
- [ ] Every question and answer matches the visible page copy word for word
- [ ] Google Rich Results Test reports FAQ as eligible, zero errors
- [ ] Published to live

## Steps

1. Read the live FAQ copy from https://www.carsa.co.uk/mot-and-car-servicing
2. Generate FAQPage JSON-LD with the schema agent, writing to `projects/carsa/schema/`
3. Paste into the page's Before `</body>` custom code in the Webflow Designer
4. Publish to staging and validate with the `test-schema` skill
5. Publish to live and re-validate

## Where things live

- Source thread — [#carsa-general-website](https://app.slack.com/archives/C08G8FGHX9Q/p1723470000123456)
- Live page — https://www.carsa.co.uk/mot-and-car-servicing
- Staging — https://carsa-v2.webflow.io/mot-and-car-servicing
- Existing schema — `projects/carsa/schema/mot-and-car-servicing.html`
- Reference implementation — /car-finance, which already has working FAQPage schema

## Open questions

- Google can take days to re-crawl after publishing. Is Tomek expecting the rich result to
  appear immediately? Worth setting that expectation in the reply.

Run with: `/generate-schema --client carsa --page /mot-and-car-servicing`
```

Every URL above came from `projects/carsa/.claude/intake.json` or the message itself. The
"reference implementation" line is the kind of detail that saves the most time and is
invisible from the task title alone.

---

## Example 3 — Parent and subtask

The parent carries the shape of the work. Subtasks carry their own slice and stand alone.

### Parent

**Task:** Migrate Carsa service pages to the new template
**Doer:** User + Claude · **Priority:** P1

```
## The ask

> We want the servicing pages rebuilt on the new template before the autumn campaign — MOT, winter health check, and the location pages.

— Tomek Stacharski, #carsa-tomek-rishi, 10 Aug 2026. [View in Slack](https://app.slack.com/archives/C0973LJ2BTJ/p1723300000123456)

## Context

Three page types move to the template in `projects/carsa/schema/mot-and-car-servicing-template.html`.
Copy is written and signed off in `projects/carsa/.claude/specs/carsa-service-copy-deck.md`.
Running build state is tracked in `carsa-service-BUILD-STATE.md` in the same directory —
check it before starting any subtask, it is the source of truth for what is already done.

## Subtasks

1. Build the MOT and servicing hub page
2. Build the winter health check page
3. Build the location page template
4. Add schema across all three
5. Set up redirects from the old URLs

Order matters for 5 — redirects go in last, after the new URLs are live, or the old pages
break while the new ones are still drafts.

## Where things live

- Source thread — [#carsa-tomek-rishi](https://app.slack.com/archives/C0973LJ2BTJ/p1723300000123456)
- Spec — `projects/carsa/.claude/specs/carsa-service-migration.md`
- Copy deck — `projects/carsa/.claude/specs/carsa-service-copy-deck.md`
- Build state — `projects/carsa/.claude/specs/carsa-service-BUILD-STATE.md`
- Staging — https://carsa-v2.webflow.io

## Open questions

- "Before the autumn campaign" is not a date. What is the actual deadline?
```

### Subtask

Note the first line. The reader knows which client and which site without opening the parent.

```
Carsa · https://carsa-v2.webflow.io · part of the service page migration.

## The ask

Build the winter health check page on the new service template.

## Context

Copy is signed off in `carsa-service-copy-deck.md` under "Winter Health Check" — do not
rewrite it. The template is `projects/carsa/schema/mot-and-car-servicing-template.html`, and
`winter-health-check.html` in the same directory is a partial start, not a finished page.

## Done when

- [ ] Page built on the service template, matching the signed-off copy
- [ ] Responsive at 991, 767 and 479 breakpoints
- [ ] Published to staging for review

## Where things live

- Copy — `projects/carsa/.claude/specs/carsa-service-copy-deck.md`
- Template — `projects/carsa/schema/mot-and-car-servicing-template.html`
- Partial build — `projects/carsa/schema/winter-health-check.html`

Run with: `/client-build --client carsa` for the page sections.
```

---

## Sourcing every line

Each line in a brief traces to one of:

| Source | How it appears in the brief |
|--------|-----------------------------|
| The message, event, or meeting note | Quoted verbatim, attributed, linked |
| A file read in this repo | Cited by path |
| `config.json` or the client's `intake.json` | URLs, page slugs, site IDs |
| Nothing — it is an assumption | **Open questions**, never the body |

The traps worth naming, because they are the ones that actually happen:

**Deadlines.** "Soon", "before the campaign", "next week" are not dates. Never convert them
into a `Due date` or write them as a date in the brief. Quote the phrase, ask the question.

**URLs.** Staging URLs follow a pattern (`{shortName}.webflow.io`) and it is tempting to
construct one. Read it from `intake.json`. If the client has no `intake.json`, write "no
project directory for this client — staging URL unknown" and move on.

**Acceptance criteria.** "Done when" is the easiest place to invent requirements. Derive
each one from what was actually asked, or from a spec that exists. Anything you think
*should* be true but nobody said belongs in Open questions as a proposal.

**Who owns what.** `client.md` records contacts and who handles what. Read it rather than
inferring from a name in a thread.

---

## Assets and attachments

The rule: link, do not copy. A linked asset stays current; a copied one drifts.

**Slack files and images** carry permalinks in the message payload. Use the permalink, and
name the file so the reader knows what they are clicking.

**Gmail attachments** have no stable public link. Name the file and its type, then link the
thread:

```
- Brand guidelines — `Carsa-Brand-2026.pdf`, attached to [the email thread](link)
```

**Pasted URLs** — Figma, Drive, Loom, Jam — go in exactly as written in the message. Never
reconstruct one from memory or from a pattern. A wrong Figma link costs more than a missing
one, because it sends the reader somewhere plausible and wrong.

**Repo assets** — screenshots in `projects/{client}/.claude/research/`, specs, audits — go
in as their path. Paths are stable and greppable.

**Re-uploading into Notion** is off by default. It duplicates the asset and it goes stale
silently. Offer it only when an asset is small, critical, and likely to expire — an
expiring share link, or a screenshot from a thread that will roll out of Slack retention.
When it is worth it, use `notion-create-file-upload` and put the returned
`suggested_markdown` in the brief.
