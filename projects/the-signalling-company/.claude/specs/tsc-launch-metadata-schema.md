# TSC — Launch Metadata Gap + Full JSON-LD Schema + Meta Re-Audit

> Slug: `tsc-launch-metadata-schema`
> Client: The Signalling Company
> Date: 2026-07-15
> Status: Planned
> Author: Will (via Claude)
> Site: `6a32b717a48adbce92029295` (tsc-v2) · staging `https://tsc-v2.webflow.io`

---

## Context & scope decision

The task brief ("scan content → write titles/metadata → write schema → push via MCP")
assumed titles/metadata were unwritten. **They are not.** A prior build
(`tsc-cms-seo-fields`, 2026-07-08, verified) plus a static-page pass already landed
on-brand SEO title + description across nearly the whole site. A live MCP scan on
2026-07-15 confirmed:

- **Static pages** — every real page (Home, RailOS, Products, Services, Projects,
  About, Leadership, Careers, News, FAQ, Contact, App Store, Open RailOS, Devices,
  Apps overview, legal, 404) has SEO title + description set and live.
- **CMS templates** — Products, Services, RailOS Devices, News, Projects bind
  `seo-title` / `meta-description`; ~43 items populated.
- **Gap 1 — RailOS / Apps CMS collection (11 items)** has **no** SEO fields; its
  `/railos-apps` template ships empty `seo:{}`, so all 11 app pages share one title.
  This is the sole remaining metadata hole and a launch blocker.
- **Gap 2 — JSON-LD schema** — none exists anywhere on the site.

Per client direction (2026-07-15) this spec therefore covers three workstreams:

1. **WS-A — Write the missing metadata** (RailOS Apps, 11 items).
2. **WS-B — Write + add Full JSON-LD schema** across the site.
3. **WS-C — Re-audit all existing metadata** against actual page content for accuracy,
   then fix what's wrong.

**Decisions locked (2026-07-15):**
- Schema depth: **Full** (Organization, WebSite, BreadcrumbList, Product, Service,
  FAQPage, Article/NewsArticle, Person, SoftwareApplication, CreativeWork case studies,
  VideoObject).
- Apply to **staging only** (`tsc-v2.webflow.io`); Will publishes to the live domain
  after review.
- Organization schema uses **settled facts only** — omits disputed headcount, founder
  wording, and the ">250 years" claim (see `overview.md` Known discrepancies).

---

## Approach (and why no 3-way exploration)

The `/plan` 3-competing-approaches fan-out was **skipped deliberately**: the delivery
mechanism is already dictated by (a) the proven `tsc-cms-seo-fields` pattern for the
Apps gap and (b) MCP capabilities confirmed live during planning. Inventing rival
architectures would be theatre. The chosen mechanism:

| Content | Mechanism | MCP tool | Fallback |
|---|---|---|---|
| Apps SEO fields | Dedicated `seo-title` + `meta-description`, bound in template | `data_cms_tool` create field / update items; `data_pages_tool > update_page_settings` | Designer if binding rejected |
| Site-wide Org + WebSite | JSON-LD on **homepage** `@graph` | `data_pages_tool > bulk_update_pages_schema_markup` | paste file |
| Static-page WebPage + BreadcrumbList, FAQPage, Person ItemList, SoftwareApplication (RailOS) | Per-page JSON-LD (baked static; FAQ/Leadership content pulled from CMS at build) | `bulk_update_pages_schema_markup` (≤25 pages/call) | paste file |
| CMS template schema (Product, Service, NewsArticle, CaseStudy, SoftwareApplication-apps) | Per-page **freeform head code** with `{{wf …}}` binding tokens | `data_scripts_tool > set_page_freeform_code` (head) | paste file |
| VideoObject (hero + embeds) | Baked static on relevant pages | `bulk_update_pages_schema_markup` | paste file |

**Build-time discovery (do first):** try `bulk_update_pages_schema_markup` with a
`{{wf}}` token on ONE CMS template. If tokens are rejected there (as OG imageUrl was in
the SEO-fields build), route all CMS-template schema through **freeform head code**,
which is raw HTML and accepts tokens. Document the outcome in build notes.

**Copy-paste artifact (always produced):** a single file
`.claude/schema/tsc-schema-all.md` containing every JSON-LD block (static + templated,
tokens included), so anything MCP rejects is paste-ready in Webflow page/site custom
code. This satisfies the brief's "if you can't add dynamic fields, write a file."

---

## WS-A — RailOS Apps metadata (write missing)

Collection `RailOS / Apps` `6a458cb63020a42432407cdc`, 11 live items. Mirror the
Devices treatment exactly.

### A1 — Add fields
Create on the collection (matching the neighbouring convention — description slug is
`meta-description`, not `seo-description`, for consistency with Products/Services/Devices/News):
- `seo-title` — PlainText — help: "≤ 60 chars incl. brand suffix. Front-load the key term."
- `meta-description` — PlainText — help: "150–155 chars. Plain English, no invented claims."

### A2 — Copy (all 11, ready to apply)

Convention: title ≤ 60 chars `… | TSC`; description 150–155 chars, answer-first, soft
CTA "See the app."; no invented claims; diacritics preserved.

| slug | SEO Title | Meta Description |
|---|---|---|
| `etcs-app` | ETCS App: Software-Defined Train Protection \| TSC | TSC's ETCS app is certified onboard train protection, software-defined on RailOS and combinable with iSTM and wSTM for multi-country Class B. See the app. |
| `tbl1-app` | TBL1+ App: Belgian Class B ATP on RailOS \| TSC | TBL1+ is TSC's software-defined Belgian Class B ATP, in service on the Lineas HLD77 fleet since 2025 — available in ++ and NG variants. See the app. |
| `pzb-app` | PZB App: Class B ATP for Germany & Beyond \| TSC | PZB is TSC's software-defined Class B ATP for Germany, Austria, Romania, Serbia and Croatia, sharing the certified ETCS iEVC platform. See the app. |
| `kvb-app` | KVB App: French Class B ATP on RailOS \| TSC | KVB is TSC's software-defined Class B ATP for the French national network, sharing the same SIL4 iEVC platform as ETCS. See the app. |
| `istm-app` | iSTM App: Software-Defined STM for ETCS & Class B \| TSC | iSTM is TSC's software-defined Synchronous Transmission Module for no-code ETCS and Class B integration with RailOS or third-party apps. See the app. |
| `tcms-app` | TCMS App: Train Control & Management on RailOS \| TSC | TSC's TCMS apps deliver train control and management, customised to each vehicle's sub-system integration plan on the RailOS platform. See the app. |
| `djr-app` | DJR App: Digital Journey Replay Analytics \| TSC | DJR reconstructs a complete Digital Journey Replay from RailOS safety data, so operators troubleshoot onboard and trackside signalling fast. See the app. |
| `tru-app` | TRU App: Onboard Recording — DRU & JRU \| TSC | TSC's TRU app captures train and juridical data in one configurable recording unit, replacing stand-alone TRU/JRU hardware on RailOS. See the app. |
| `lru-app` | LRU App: Secure Rail Data Extraction \| TSC | LRU is TSC's laptop application for secure local or remote extraction of RailOS train data for analysis and diagnostics. See the app. |
| `wstm-app` | wSTM App: Universal Software-Defined STM \| TSC | wSTM is TSC's pure-software STM, integrating third-party national Class B systems on the RailOS iEVC and removing dedicated STM boxes. See the app. |
| `toba-app` | TOBA App: Onboard Telecom Gateway — GSM-R & FRMCS \| TSC | TOBA manages train-to-ground comms — GSM-R, 4G/5G and FRMCS — through one software-defined gateway, paired with the TSC Telecom Box. See the app. |

> Note: `wstm-app` and `toba-app` bodies mention statuses/pairings that trace to on-page
> copy. The re-audit (WS-C) re-checks each string against the item body before publish.

### A3 — Bind template
`/railos-apps` template page (`6a458cb63020a42432407ce8`): Title Tag →
`{{wf {"path":"seo-title","type":"PlainText"} }}`, Meta Description →
`{{wf {"path":"meta-description","type":"PlainText"} }}`, OG title/desc to the same.
Via `update_page_settings`; Designer fallback if rejected.

### A4 — Populate + A5 — Publish
Set both fields on all 11 items (`update_collection_items`), then
`publish_collection_items` for the collection.

---

## WS-B — Full JSON-LD schema (write + add)

### Site-wide (homepage `@graph`)
- **Organization** — `name` "The Signalling Company"; `legalName` "The Signalling
  Company SRL"; `url`; `logo` (resolve asset at build — OG default asset
  `6a5005abefaddf6c29ec4d8e` or brand logo); `foundingDate` "2019";
  `parentOrganization` → { Organization, name "Škoda Group" }; `address`
  PostalAddress (Rue des Deux Gares 82 Building B, 1070 Anderlecht, Brussels, BE);
  `telephone` "+32 2 882 59 00"; `email` "info@thesignallingcompany.com";
  `vatID` / `identifier` "BE0724.925.936"; `sameAs` [LinkedIn — **confirm URL**].
  **Omit** `numberOfEmployees`, `founder`, ">250 years" (disputed).
- **WebSite** — `name`, `url`, `publisher` → Organization ref. No `SearchAction`
  (site has no internal search).

### Static pages — `bulk_update_pages_schema_markup` (≤25/call)
- **BreadcrumbList** on every primary page, mirroring nav IA (e.g. Home › RailOS ›
  Devices). Source nav hierarchy from `tsc-nav-ia.md`.
- **WebPage** node per page (`name`, `description` = the live SEO desc, `isPartOf`
  WebSite, `about` where relevant).
- **/faq → FAQPage** — pull all live items from FAQs collection
  (`6a45898e00485325224db7af`) at build, bake Question/acceptedAnswer pairs.
- **/leadership → ItemList of Person** — pull live Leadership items
  (`6a3b8e50468af0c57a1db9d5`); each Person `name`, `jobTitle`, `worksFor` Org.
- **/railos → SoftwareApplication** — RailOS itself (`applicationCategory`
  "Railway signalling operating system", `operatingSystem` self, `provider` Org).

### CMS templates — freeform head code with `{{wf}}` tokens (or schema API if tokens accepted)
- **Products** (`detail_products`) → **Product** — `name`={{wf name}},
  `description`={{wf seo-title/short-description}}, `brand`→Org, `category`.
- **RailOS Devices** (`detail_railos-devices`) → **Product** — same shape;
  `image`={{wf thumbnail}} where present.
- **Services** (`detail_services`) → **Service** — `serviceType`={{wf name}},
  `provider`→Org, `areaServed` "Europe".
- **News** (`detail_news`) → **NewsArticle** — `headline`={{wf name}},
  `datePublished`={{wf date}}, `image`={{wf thumbnail}}, `author`/`publisher`→Org.
- **Projects** (`detail_projects`) → **CreativeWork** (case study; schema.org has no
  `CaseStudy` type) — `name`={{wf name}}, `about`, `image`={{wf thumbnail}},
  `creator`→Org.
- **RailOS Apps** (`detail_railos-apps`) → **SoftwareApplication** — `name`={{wf name}},
  `applicationCategory` from `category` option, `operatingSystem` "RailOS",
  `provider`→Org. (Depends on WS-A field creation only for consistency, not required.)

### VideoObject (best-effort)
Homepage hero + any embedded videos (`head-video-strip.html`,
`research/video-timestamps.md`). Requires `name`, `description`, `thumbnailUrl`,
`uploadDate`, `contentUrl`/`embedUrl`. **Flag to Will** any video whose `uploadDate`
or hosted URL is unknown rather than invent it; ship the ones with complete data.

### Validation
Every block validated against Google Rich Results Test via the `test-schema` skill
before/after publish (Tier 3).

---

## WS-C — Re-audit all existing metadata vs page content

Goal: confirm every already-live title/description is **accurate** against the page's
actual content (not just present), and fix drift, off-brand strings, and template
leftovers.

### C1 — Static pages (~20)
For each live static page, compare its SEO title/description against the rendered
content (use `.claude/research/staging-*.txt` + `audit-*.txt` snapshots, refresh via
live fetch where stale). Flag: factual drift, truncation risk (>60 title / >160 desc),
Cargo-template leftovers, and duplicate/junk **published** pages — specifically
`Home B` (`home-b`) and `Projects B` (`projects-b`), both currently `draft:false` with
placeholder meta. Decide keep/unpublish with Will.

### C2 — CMS items (~54)
Audit the 43 populated items + 11 new Apps items: description claims must trace to the
item body; no truncation; diacritics intact.

### C3 — Audit report
Write `.claude/audits/tsc-metadata-audit-2026-07-15.md` — per-page table
(URL · current title · current desc · verdict PASS/FIX · proposed fix · source line).

### C4 — Apply fixes
Static via `update_page_settings`; CMS via `update_collection_items`. Only pages marked
FIX are touched — no churn on PASS pages.

---

## Parallelisation Map

| Stream | Task | Agent | Depends on | Est. MCP calls |
|---|---|---|---|---|
| S1 | WS-A A1 add 2 Apps fields | code-writer | — | 2 |
| S1 | WS-A A2 write 11 app copy | seo | — (draft now) | 0 |
| S1 | WS-A A3 bind template | code-writer | A1 | 1 |
| S1 | WS-A A4 populate 11 items | code-writer | A1,A2 | ~11 |
| S2 | WS-B author all schema + paste file | schema | — (draft now) | 0 |
| S2 | WS-B pull FAQ + Leadership CMS for baking | code-writer | — | 2 |
| S2 | WS-B push static schema | code-writer | authored | ~3 (batched) |
| S2 | WS-B push CMS-template schema (freeform) | code-writer | authored + token test | ~6 |
| S3 | WS-C C1/C2 audit | seo + content | — (read-only) | read-only |
| S3 | WS-C C3 report | seo | C1,C2 | 0 |
| S3 | WS-C C4 apply fixes | code-writer | C3 approved | ~N (only FIXes) |
| — | Publish staging + verify | qa | all above | ~6 |

**Parallel:** S1, S2, S3 are independent workstreams — run concurrently. Within S2,
authoring + CMS-content pulls parallel; pushes gated on the token-capability test.
**Sequential:** binds/pushes after their fields/content; publish + verify last; C4 after
audit sign-off.
**Worktrees:** No — all changes are Webflow-side via MCP + local doc/schema/test files
with no code-path conflicts.
**Recommendation:** parallel by workstream, single agent team, no worktrees.

---

## Barba Impact

N/A — no Barba transitions on this project. Metadata + JSON-LD only; no JS lifecycle,
no DOM listeners, no GSAP/ScrollTrigger. Schema is static markup or Webflow-rendered
head content.

---

## Test Plan (3 tiers)

### Tier 1 — Auto: Playwright local (`tests/acceptance/tsc-launch-metadata-schema.spec.js`)
- **Apps metadata** — each of the 11 `/railos-apps/{slug}` pages has a non-empty
  `<title>` ≤ 65 chars and `meta[name=description]` 50–160 chars; titles are **distinct**
  from each other and ≠ "The Signalling Company".
- **Apps exact worked examples** — `etcs-app` and `tbl1-app` match spec strings.
- **Schema presence** — every sampled page has ≥1 `script[type="application/ld+json"]`
  that `JSON.parse`s and has `@context` containing `schema.org`.
- **Schema types** — Home has Organization + WebSite; `/products/etcs` has Product;
  `/services/…` has Service; a `/news/…` page has NewsArticle; `/railos-apps/etcs-app`
  has SoftwareApplication; `/faq` has FAQPage; `/leadership` has Person.
- **No console errors** on every sampled page.

### Tier 2 — Auto: CDN regression (`/deploy`)
Register `tsc-launch-metadata-schema` in `tests/registry.json`. Runs against
`tsc-v2.webflow.io` after publish.

### Tier 3 — Manual
- **Google Rich Results Test** on one page per schema type (`test-schema` skill).
  *Why manual:* external tool, re-crawl latency.
- **SERP + social preview** of the 11 app pages. *Why manual:* subjective click appeal.
- **VideoObject data** — confirm any flagged missing `uploadDate`/URL with Will.
  *Why manual:* needs a human-supplied fact.

---

## Verify Loop

### Pass/fail criteria
- [ ] RailOS Apps collection has `seo-title` + `meta-description` fields.
- [ ] `/railos-apps` template binds Title Tag + Meta Description to those fields.
- [ ] All 11 app item pages render a unique, non-empty `<title>` (≤ 65) and meta
      description (50–160); none equals the bare brand name.
- [ ] Every primary page (Home + the ~19 static + one item per CMS template) renders
      valid JSON-LD (`JSON.parse` succeeds, `@type` matches the intended type).
- [ ] Home carries Organization (settled facts only, **no** disputed fields) + WebSite.
- [ ] FAQPage on `/faq` reflects live FAQ items; Person on `/leadership` reflects live team.
- [ ] Audit report exists; every page marked FIX has been corrected; PASS pages untouched.
- [ ] Copy-paste artifact `.claude/schema/tsc-schema-all.md` contains every block.
- [ ] No console errors on sampled pages.
- [ ] Nothing published to the **live** domain by the agent (staging only).

### Reproduction steps
1. `get_collection_details` on RailOS Apps → confirm fields.
2. Publish **staging** (`tsc-v2.webflow.io`) only.
3. `npm run test:sz:acceptance -- tsc-launch-metadata-schema` (STAGING_URL=https://tsc-v2.webflow.io).
4. Rich Results Test: `/`, `/products/etcs`, `/services/maintenance`, a `/news/*`,
   `/railos-apps/etcs-app`, `/faq`, `/leadership`.

### Regression scope
- Existing static + CMS metadata marked PASS must remain byte-identical.
- Existing OG image bindings on News/Projects templates must not be disturbed.
- Item template layouts must still render (schema/head-only changes — no visible layout).
- The 5 already-bound CMS templates (Products/Services/Devices/News/Projects) keep their
  existing `seo-title`/`meta-description` bindings.
- No publish to the production domain.

---

## Acceptance Tests

`tests/acceptance/tsc-launch-metadata-schema.spec.js`:

- **Apps — 11 pages have distinct valid title + meta description**
- **Apps — `etcs-app` exact title & description**
- **Apps — `tbl1-app` exact title & description**
- **Schema — every sampled page has parseable JSON-LD with schema.org @context**
- **Schema — Home has Organization + WebSite**
- **Schema — Product on `/products/etcs`**
- **Schema — Service on a `/services/*` page**
- **Schema — NewsArticle on a `/news/*` page**
- **Schema — SoftwareApplication on `/railos-apps/etcs-app`**
- **Schema — FAQPage on `/faq`**
- **Schema — Person on `/leadership`**
- **No console errors on sampled pages**

---

## Open questions / blockers

1. **CMS-template schema token capability** — build-time discovery: does
   `bulk_update_pages_schema_markup` accept `{{wf}}` tokens on a collection template? If
   not, route via freeform head code. (No client input needed.)
2. **Organization `sameAs`** — confirm TSC LinkedIn (and any X/YouTube) URL for the
   Organization node. (Needs Will.)
3. **Organization `logo`** — confirm the canonical logo asset URL to reference.
4. **VideoObject data** — hero/embedded video `uploadDate` + hosted URL where unknown.
   (Needs Will.)
5. **Junk published pages** — `Home B` and `Projects B` are live with placeholder meta.
   Keep, unpublish, or fix? (Needs Will — flagged in WS-C.)
