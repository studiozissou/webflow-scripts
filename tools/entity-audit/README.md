# entity-audit

Compares **entity signals** between an old and a current version of a site, page by
page, and reports what the redesign lost.

Built for the Tamsen Fadal branded-search problem: the old site ranked fine, the
redesign rewrote copy for humans (correctly), and in doing so dropped the factual
entity signals Google leans on for "who is this person" queries. This tool finds
exactly which signals went missing, so the fix can be surgical rather than a rewrite.

## Usage

```bash
npm run entity-audit -- --site tamsen-fadal
npm run entity-audit -- --site tamsen-fadal --out ./somewhere
npm run entity-audit -- --site tamsen-fadal --concurrency 6
```

Writes two files to `projects/{site}/.claude/audits/`:

- `entity-audit-YYYY-MM-DD.md` — client-ready report
- `entity-audit-YYYY-MM-DD.json` — machine-readable baseline

Re-run after making edits: the score column shows movement, so the same command
doubles as the monthly progress check.

## Tests

```bash
npm run test:ea
```

Extraction and comparison are pure functions with no network calls, so the full
suite runs offline in well under a second.

## What it measures

Per page, on both sites:

| Signal | Why it matters |
| --- | --- |
| Entity name in `<title>` | Strongest on-page branded-search signal |
| Entity name in `H1` | Confirms what the page is *about* |
| Entity name in meta description | Reinforces the entity in the SERP snippet |
| Entity name in footer | Sitewide corroboration |
| Factual statements (`"X is a …"`) | The construction search engines parse for entity facts |
| Full-name body mentions | Overall entity density |
| JSON-LD `@type`s present | Explicit structured entity declaration |
| Outbound profile links | `sameAs` corroboration (Wikipedia, LinkedIn, IMDb, …) |
| Branded internal anchor text | Internal entity reinforcement |

Each page gets a weighted `signalScore` — title, H1, factual statements and
`Person` schema carry the most weight.

## Regression severity

| Severity | Signals |
| --- | --- |
| high | title / H1 entity lost, JSON-LD types lost, all factual statements lost |
| medium | meta description entity lost, some factual statements lost, mention volume halved, profile links lost |
| low | footer entity lost, branded anchor text lost |

Mention-volume drops are only reported when the old page mentioned the entity at
least 3 times and the new page dropped below half — this avoids flagging noise on
thin pages.

## Adding another site

Add an entry to `config.js`. The page map is the only manual part: only a human
knows that the old `/the-tamsen-show-podcast` became the new `/podcast`. Use
`old: null` for new pages and `current: null` for dropped ones so nothing
silently disappears from the comparison.

## Design notes

- **Zero dependencies.** Webflow serves fully rendered HTML, so regex parsing is
  sufficient and avoids adding a DOM library to the monorepo.
- **Pure extraction and comparison.** All the logic in `lib/extract.js` and
  `lib/compare.js` is HTML-in, data-out, which is why it is fully unit tested.
- **Full name required.** `countEntityMentions` deliberately ignores the first
  name alone — "Hi! I'm Tamsen" is precisely the weak signal being measured.
