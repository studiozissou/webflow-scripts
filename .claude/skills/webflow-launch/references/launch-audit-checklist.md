# Launch and audit checklist

One list for `/launch-check` and `/site-audit`. Items are paraphrased from Finsweet's [Client-First launch checklist](https://finsweet.notion.site/client-first-launch-checklist), then adjusted by the rulings and corrections below.

**Phase:** B build, P pre-launch, L post-launch, H handover.

**Method:**
- `Guard:<check>`: `tools/webflow/launch-guard.js` reads it from the published site.
- `Existing:<x>`: an existing check or step covers it.
- `MCP`: read through the Webflow MCP (`/launch-check` step 1, `/site-audit` Phase 2).
- `Browser`: checked in a browser with chrome-devtools.
- `Manual`: a person ticks it.

A row can use more than one method. Anything that couldn't be checked is reported as **Not run**, never as a pass.

| # | Group | Item | Phase | Method |
|---|---|---|---|---|
| 1 | General | Favicon | B | `Guard:icons` |
| 2 | General | Webclip | B | `Guard:icons` |
| 3 | General | Client time zone | B | `MCP` `get_site.timeZone`; a person confirms it's right |
| 4 | General | Language attribute | B | `Guard:html-lang` |
| 5 | General | Webflow badge off | P | `Browser` `.w-webflow-badge` not visible |
| 6 | Publishing | Webflow hosting added | P | `Manual` |
| 7 | Publishing | Minify HTML, CSS, JS | P | `Guard:minify` for CSS filenames (warns; only seen with minify on, so the off state is unverified); HTML and JS `Manual` |
| 8 | Publishing | SSL | P | `Guard:https-redirect` |
| 9 | Publishing | 301s set | P | `Manual`; config `redirects` tested by `Guard:redirects` when listed |
| 10 | Publishing | Custom domains, one default | P | `Guard:default-domain` |
| 11 | Publishing | Sensible staging URL | B | `Manual` |
| 12 | Publishing | Secure frame headers | P | `Guard:frame-headers` |
| 13 | Publishing | Per-page CSS | P | `Manual`; an `.opt.min.css` link suggests it's on, but only the setting confirms it |
| 14 | Publishing | Async JS | P | `Manual` |
| 15 | Form | Success and error states styled | P | `Manual` |
| 16 | Form | Unique form names | P | `MCP` `list_forms`, dedupe by `componentId` |
| 17 | Form | Clear field names | P | `MCP` `list_forms`; flag blank `displayName` |
| 18 | Form | No duplicate field names or IDs | P | `Guard:duplicate-ids` |
| 19 | Form | Field focus states | P | `Manual` |
| 20 | Form | Spam protection | P | `Manual` |
| 21 | Form | reCAPTCHA if needed | P | `Manual` |
| 22 | Form | Notification settings | P | `Manual` |
| 23 | Form | Test submissions | P | `Existing:/launch-check` phone checklist |
| 24 | Fonts | Uploaded fonts, WOFF2 | B | `Guard:font-format` from inline CSS, else `Manual` |
| 25 | Fonts | Unused fonts removed | B | `Manual` |
| 26 | Fonts | Subset fonts (recommended) | B | `Manual` |
| 27 | Apps | GA4, gated or GTM with Consent Mode (see C4) | B | `Existing:ungated-analytics`; `Browser` consent step |
| 28 | Apps | Other integrations as required | B | `Manual` |
| 29 | Apps | Consent manager | P | `Existing:/launch-check` step 3 |
| 30 | Apps | Integrations working | P, L | `Manual` |
| 31 | Apps | Test consent with Tag Assistant | L | `Manual` |
| 32 | SEO | Meta title and description | B | `Existing:title-length, description-length`; `MCP` for all pages (skip templates) |
| 33 | SEO | OG images | B | `Existing:missing-share-image`; `MCP` `openGraph` |
| 34 | SEO | Unwanted pages drafted or deleted | P | `MCP` `draft`; a person reviews the list |
| 35 | SEO | Unwanted pages out of sitemap | P | `MCP` `includeInSitemap` |
| 36 | SEO | Proper slugs | P | `MCP` `list_pages`; a person reviews |
| 37 | SEO | Blank CMS templates unpublished | P | `MCP` `shouldPublish`; a person reviews |
| 38 | SEO | Schema on key pages | B | `Existing:/launch-check` step 5 |
| 39 | SEO | FAQ structured data, optional (see C2) | B | `Existing:/launch-check` step 5 parses JSON-LD; no Rich Results Test for FAQ |
| 40 | SEO | Broken or empty links | P | `Guard:empty-link` (warns; a person confirms); broken links `Existing:/site-audit` |
| 41 | SEO | Semantic structure | P | `Guard:h1-count`; rest `Manual` |
| 42 | SEO | Webflow audit panel clean | P | `Manual` |
| 43 | SEO | Search Console verification | L | `Manual` |
| 44 | SEO | Global canonical | P | `Guard:canonical` |
| 45 | SEO | robots.txt set | P | `Guard:robots` |
| 46 | SEO | Sitemap auto-generated | P | `Guard:sitemap` |
| 47 | SEO | Webflow subdomain indexing off | P | `Guard:staging-index` when config `stagingUrl` is set, else `Manual` |
| 48 | SEO | Fix Search Console errors | L | `Manual` |
| 49 | SEO | Submit sitemap, remove old | L | `Existing:webflow-launch` |
| 50 | SEO | Request re-indexing | L | `Manual` |
| 51 | AEO | llms.txt | P | `Guard:llms` |
| 52 | AEO | AI crawlers not blocked | P | `Guard:robots-ai` |
| 53 | AEO | Validate markup | P | `Existing:/launch-check` step 5; Schema.org validator `Manual` |
| 54 | AEO | isitagentready.com (recommended) | P | `Manual` |
| 55 | CMS | OG image field | B | `Manual` |
| 56 | CMS | Meta title and description fields | B | `Manual` |
| 57 | CMS | Unused collection templates unpublished | P | `MCP` `shouldPublish` (same read as 37) |
| 58 | CMS | Field help text | H | `Manual` |
| 59 | CMS | Group fields | H | `Manual` |
| 60 | CMS | Empty states | P | `Manual` |
| 61 | Performance | Image dimensions or aspect ratio | B | `Existing:Lighthouse` `unsized-images` |
| 62 | Performance | Assets compressed, Lottie to dotLottie | B | `Existing:Lighthouse`; Lottie `Manual` |
| 63 | Performance | Unused classes removed | H | `Manual` |
| 64 | Performance | Unused interactions removed | H | `Manual` |
| 65 | Performance | Scripts async or defer | P | `Guard:blocking-script` (warns; a person decides whether each finding is fixable) |
| 66 | Performance | Assets compressed and optimised (second listing) | B | Same as 62: `Existing:Lighthouse`; Lottie `Manual` |
| 67 | Performance | Unused code removed | P | `MCP` freeform code; a person reviews |
| 68 | Performance | Single-page code not global | P | `MCP` freeform code; a person reviews |
| 69 | Performance | Eager top images | B | `Existing:lazy-above-fold` |
| 70 | Performance | Final scan of head and body code | P | `MCP` freeform code; a person reviews |
| 71 | Performance | No horizontal scroll | P | `Existing:/launch-check` step 4 |
| 72 | Performance | PageSpeed or Lighthouse | P | `Existing:/launch-check` step 4 |
| 73 | Performance | GTmetrix (recommended) | P | `Manual` |
| 74 | Mobile | Unneeded mobile interactions off | P | `Manual` |
| 75 | Mobile | Android phone and tablet | P | `Existing:/launch-check` phone and tablet checklist |
| 76 | Mobile | iPhone and iPad | P | `Existing:/launch-check` phone and tablet checklist |
| 77 | Mobile | Readable text (16px body, 14px small) | P | `Browser` computed font sizes at 375, else `Manual` |
| 78 | Mobile | Tappable buttons | P | `Existing:Lighthouse` `target-size` |
| 79 | Browser | Chrome and Edge | P | `Manual` |
| 80 | Browser | Safari | P | `Manual` |
| 81 | Browser | Firefox | P | `Manual` |
| 82 | Accessibility | Alt text | B | `MCP` `list_assets.altText`; `Existing:Lighthouse` `image-alt` |
| 83 | Accessibility | ARIA where needed (`role`) | B | `Existing:Lighthouse`; `Manual` |
| 84 | Accessibility | aria-label on textless links | B | `Guard:link-name` |
| 85 | Accessibility | No hover states on touch | P | `Manual` |
| 86 | Accessibility | Keyboard focus states | P | `Manual` |
| 87 | Accessibility | Finsweet a11y script (see C6) | B | `MCP` freeform code when used, else `Manual` |
| 88 | Accessibility | Focus on buttons, links, accordions, inputs | P | `Manual` |
| 89 | Organize | 404 and password pages match the design | P | `Manual` |
| 90 | Organize | Asset folders | H | `MCP` `list_assets` if folders show, else `Manual` |
| 91 | Organize | Style guide (see C3) | H | `MCP` `draft`; `Manual` |
| 92 | Organize | Components grouped | H | `Manual` |
| 93 | Training | Client team members added | H | `Manual` |
| 94 | Training | Training recorded | H | `Manual` |

## Handover items

`H` rows run on launches and on audits. On an audit they are maintainability findings.

## Conflict rulings

- **C1 Lengths:** titles 50-60 characters, descriptions 150-160, as warnings only, because Google sets no limit.
- **C2 FAQ:** FAQPage is optional and JSON-LD only; a missing one isn't a defect, never promise a rich result (retired by Google on 7 May 2026, per secondary sources), and never test FAQ in the Rich Results Test.
- **C3 Style guide:** keep it as a draft in the Designer, never published.
- **C4 GA4:** consent-gated, or GTM with Consent Mode; the native Webflow integration stays banned.
- **C5 Default domain:** www, unless config sets `apexDefault: true`.
- **C6 Finsweet a11y script:** optional, only for custom div buttons, tabs or modals that native markup can't fix; no default install.

## Finsweet corrections

- `aria-role` isn't an attribute: use `role`.
- `Claude-Web` is out of date: check `ClaudeBot`, `Claude-User` and `Claude-SearchBot`.
- Finsweet's FAQ link goes to QAPage docs, and QAPage is a different type from FAQPage.

## Changed by real-site runs

- **7:** JS filenames aren't checked, so JS moved to `Manual`. The CSS check has only been seen with minify on.
- **13:** moved to `Manual`. `per-page-css` failed verification and was removed from the guard, because a site with per-page CSS on still loads a shared `.min.css`.
- **40:** `empty-link` went from error to warning. Links wired by `data-*`, `fs-*`, `type="button"` or `role="button"` are exempt, because all 200 first-run errors on real sites were such controls.
- **47:** `Manual` unless config `stagingUrl` is set.
- **65:** consent managers need to load first and Webflow injects webfont and reCAPTCHA scripts, so a person decides on each finding. Scripts with a non-JS type such as `fs-consent` are ignored.

## Guard limits

- On `*.webflow.io` the guard skips `https-redirect`, `default-domain`, `robots` and `robots-ai`, so 8, 10, 45 and 52 are **Not run** until a custom-domain run.
- A `site-audit` warning means the site checks didn't finish: report their rows as **Not run**.

## MCP reads

- Readable: `timeZone`, locales, `lastUpdated`; page `seo`, `openGraph`, `draft`, `shouldPublish`; `includeInSitemap`; `list_forms`; `altText`; freeform code.
- Not readable: indexing, SSL, minify, per-page CSS, async, frame headers, badge, favicon, canonical, site verification, form notifications and spam settings, class and interaction usage, CMS help text, audit panel.
- Enterprise only: robots.txt and 301s, so crawl these instead.
- `list_forms` defaults to 25 rows, so pass a limit.
- Skip template pages with `{{wf ...}}` in `seo`.
- A `get_site_scripts` 404 means the site has no scripts.
- Assets come 100 to a page.
- The Designer wasn't connected in the 2026-11-02 probe, so nothing Designer-only is verified.

## SEMrush evidence

SEMrush adds evidence for items 32, 33, 40, 41, 44, 46, 61 and 62. It never replaces a Guard or MCP check.

- **Where:** `/site-audit` and `/launch-check` on a live URL (gate 5). Not gates 2-4: staging is noindexed and may not be crawlable.
- **Flow:** the `site_audit` toolkit through `get_report_schema` and `execute_report`: `list_projects`, `snapshots`, then `info`, `meta_issues` and `issue_details`. `page_list`, `page_info`, `history` and `snapshot` are also available.
- **Project:** everything but `list_projects` needs an existing project ID. Don't create a project without asking.
- **Matching:** match an issue to an item by its title from `meta_issues`. The read-only probe on 2026-11-02 confirmed names and parameters but returned `no_api_units` on `list_projects`, so issue-ID mapping is unverified.
- **No evidence:** no project, no data or no units means record **Not run** and carry on. Report any `no_api_units`.
