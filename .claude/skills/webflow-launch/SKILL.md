---
name: webflow-launch
description: Generic rules and gates for taking a small-business Webflow site from staging to its custom domain — links, localisation order, placeholders, consent, third-party widgets, publish hygiene, owner inputs, and post-launch checks. Use this skill whenever the user says "launch", "go live", "pre-launch", "publish to custom domain", or asks what's left before a site goes live. Pairs with /launch-check.
---

<objective>
Stop the usual launch defects (dummy values, locale link leaks, ungated analytics, eager vendor widgets, surprise publishes) on staging, before the domain goes live, and run the follow-up checks after.
</objective>

<before_you_start>
- If `.claude/reference/webflow-launch-lessons.md` exists (private symlink, may be absent), read it now. It holds the real defect history behind these rules; add any new defect to it after launch.
- Read `projects/<client>/launch.config.json` (`domain`, `locales`, `placeholders`, `allowLocalAttr`). Without it, `launch-guard` can't run: write it first.
- Webflow MCP pre-flight per the `webflow-mcp` skill: `get_site` succeeds before any planning.
</before_you_start>

<rules>
**Owner-input gate (before build).** Collect real values first: legal + trade name, one canonical name/address/phone string, hours (incl. holidays), phone/WhatsApp, email on the domain, social handles, prices, logos, photos, font licences, booking account, consent manager, domains. Anything missing becomes `TODO-<thing>` on a dated list. Never type a dummy number, handle, URL or "Example text": `TODO-` greps, dummies ship.

**Links.**
- Internal links are always Link → **Page** (anchors: Page → Section). Never a typed URL like `/about` and never a custom `href` attribute: Webflow only localises Page links.
- Every social link ends in a handle (`instagram.com/<handle>`, not `instagram.com/`).
- Every email address is on the client's domain. Spell the domain from `get_site` → `customDomains`, never from notes.
- New-tab links get `rel="noopener"` (the template's site utilities do this).

**Localisation order.**
1. Primary locale complete and correct: real values, Page links, final copy.
2. Only then translate secondary locales. Each translated link becomes a per-locale override that later primary fixes don't reach, and the MCP can't reset it (Designer only; see `webflow-mcp` v2 gotchas).
3. Links inside translated rich text don't inherit: give them the locale path by hand (`/<locale>/page`).
4. Per locale: SEO title (50–62 chars) and description (120–155 chars), CMS option-name translations (Site settings › Localization), consent banner and widget languages.

**Placeholders and template leftovers.** No `TODO-`, `[...]`, `Example text`, `example.com`, `0000000`, configured placeholder numbers, template "Site Name" schema, style-guide page or utility blocks on the live domain.

**Consent.** Follow the consent pattern in the `webflow-embeds` skill (`<consent_and_third_party>`). Never enable Webflow's native GA integration on a site with a consent manager. Before a choice: no `_ga*`/`_gcl*` cookies, no `g/collect` request. The privacy policy must match live behaviour.

**Third-party widgets.** Use the lazy widget pattern in the `webflow-embeds` skill: load on idle or intent, wait for the widget's ready signal, fallback URL, no auto-open, titled iframe, stacked under the consent banner. Never paste a vendor snippet verbatim.

**Images and forms.** Nav logo and hero images load eager with `width`/`height`. Every form `<label for>` resolves to a field. Forms carry real placeholders.

**Publish hygiene.**
- One session publishes; others stage and hand over.
- Before every publish: `get_site`, compare `lastUpdated` with `lastPublished`, and say what else will go out. Publish only on explicit approval.
- Release tags only from merged, pushed `main` (`/deploy` enforces this). Pin the footer loader to a tag, never a commit.
- Remove `data-allow-local` (the loader's dev switch) from the live footer tag.
- After each publish, re-fetch every locale, not just the primary.
</rules>

<gates>
Each gate must be clean before the next phase. `/launch-check` covers the automated items.

| Gate | When | Pass condition |
|---|---|---|
| 0 Owner inputs | Before design | Every input in hand or on a dated `TODO-` list |
| 1 Copy + system | Before build | Primary copy signed off; every text colour × scheme passes contrast |
| 2 Primary locale | Before translating | `/launch-check <staging> --locale <primary>` has no blocking findings |
| 3 All locales | After translating | `/launch-check <staging>` clean on every locale |
| 4 Pre-launch | Before DNS | Gate 3 + real-phone checklist done + owner has walked staging + launch tag deployed |
| 5 Live | After publish to domain | `/launch-check <live-url>` clean; CDN regression re-run |

**Staging → live checklist (gate 4 → 5).**
- `/launch-check` on staging: zero blocking findings.
- Real phones (iOS Safari + Android Chrome): every CTA, booking flow, `tel:`/`wa.me`/`mailto:`, form submit arrives, consent banner usable with every floating widget open.
- JSON-LD uses the custom domain, not `webflow.io` URLs.
- Template leftovers removed; favicon and webclip set (Designer slot).
- `data-allow-local` gone from the footer loader tag; loader pinned to the launch tag.
- DNS + SSL live; 301s from `www`/apex and any typo or defensive domains.
- `get_site`: pending changes are only what you expect. Ask, then publish.
- `/launch-check <live-url>` on every locale. Then submit the sitemap in Search Console and Bing Webmaster Tools.
</gates>

<post_launch>
**Day 14**
- Five key URLs per locale indexed (Search Console URL inspection).
- `launch-guard` and Lighthouse mobile on live, every locale. Fix anything new.
- Append any new defect class to `.claude/reference/webflow-launch-lessons.md` (if present) and, if a script could catch it, to `tools/webflow/launch-guard.js` with a test.

**Day 30**
- CrUX field data (lags ~28 days): CLS < 0.1, LCP < 2.5 s on mobile.
- Search Console queries → retitle pages to the phrases people actually use.
- Remind the owner: GA4 doesn't count visitors who decline consent.
</post_launch>

<success_criteria>
- No `TODO-` or dummy value on the live domain
- Every locale links only to its own locale's pages
- No analytics cookie or request before consent
- No widget loads before idle/intent or covers the consent banner
- Every publish was preceded by a `get_site` pending-changes check and explicit approval
- Day 14 and day 30 checks scheduled at launch
</success_criteria>
