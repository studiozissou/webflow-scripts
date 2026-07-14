# TSC Redirect Strategy — WordPress → Webflow

**Slug:** `tsc-redirect-strategy`
**Client:** The Signalling Company
**Date:** 2026-07-07 (launch day)
**Author:** Will Morley
**Status:** Ready to implement
**Companion file:** `tsc-redirect-map.csv` (source of truth — 21 rules)

---

## TL;DR

The old site (WordPress) and new site (Webflow) launch on the **same domain**
(`thesignallingcompany.com`), so every old URL that isn't reproduced 1:1 on the
new site will start returning **404** the moment DNS cuts over. The good news:
the old site is tiny. The whole redirect job is **14 blog posts + 3 category
archives**, plus a couple of freebies Webflow handles automatically.

- **Must-do 301s:** 14 post URLs + 3 category archives = **17 rules**
- **Auto-handled (no action):** `/`, `/news/`, `/privacy-policy/`, `/privacy/`
- **One gap to resolve:** the RegioJet post has no migrated equivalent (see §5)

---

## 1. Why this matters

The old WordPress permalink structure is **root-level post slugs**
(`thesignallingcompany.com/{slug}/`), not `/blog/{slug}` or `/news/{slug}`.
The new Webflow site nests posts under **`/news/{slug}`**. Because the slug path
*and* several slugs themselves changed, old post URLs cannot resolve on the new
site without explicit 301s.

These 14 posts (2019–2026) are the site's only accumulated SEO equity and the
targets of external press links — RailTech Innovation Award coverage, the Skoda
acquisition announcement, TÜV Rheinland assessment, etc. Losing them to 404s
throws away backlinks and rankings that took years to earn. 301s preserve ~all
of that link equity and give humans a soft landing instead of a dead end.

> **Note on `/insights` vs `/news`:** the nav-IA spec (`tsc-nav-ia.md`) proposed
> `/insights` for the blog. The **built** site ships on **`/news`**. This
> strategy targets the live reality (`/news`). If the team later moves the blog
> to `/insights`, these redirects must be repointed and a `/news/* → /insights/*`
> rule added.

---

## 2. Old-site inventory (authoritative)

Pulled from the live Yoast sitemap index on 2026-07-07
(`thesignallingcompany.com/sitemap_index.xml`) and confirmed with live HTTP
probes. **This is the complete old-site URL surface** — there are no old
`/about`, `/products`, `/services`, `/contact`, `/careers` or `/leadership`
pages (all probed → 404), so there is no equity to preserve on those paths.

| Type | Count | Paths |
|------|-------|-------|
| Home | 1 | `/` |
| Blog listing | 1 | `/news/` |
| Blog posts | 14 | root-level `/{slug}/` |
| Category archives | 3 | `/category/{news,mise-en-avant,uncategorized}/` |
| Legal | 1 | `/privacy-policy/` (+ `/privacy/` already 301s here) |

---

## 3. How Webflow handles it (mechanics)

Verified against the live Webflow site on 2026-07-07:

1. **Trailing slashes are stripped automatically.** A request to `/news/`
   301s to `/news` *before* custom redirects run. Therefore **enter all old
   paths WITHOUT a trailing slash** — Webflow normalises the incoming
   `/{slug}/` to `/{slug}` and then matches your rule.
2. **Same-path pages need no redirect.** `/news/` and `/privacy-policy/` both
   exist on the new site, so after the auto-strip they resolve. No rule needed.
3. **Category paths still 404.** `/category/news/` strips to `/category/news`,
   which does not exist on the new site → 404. These **do** need explicit rules.
4. **`www` is already canonicalised.** `www.thesignallingcompany.com` 301s to
   the apex today; keep that behaviour on the new host.

### Where to enter them

Webflow → **Project Settings → Publishing → 301 Redirects**. Old Path = path
only (no domain, no trailing slash). Redirect To = new path. Publish to apply.
For bulk entry, the `tsc-redirect-map.csv` columns map directly; entries can
also be pushed via the Webflow Data API if manual entry is tedious.

---

## 4. The redirect map

Full machine-readable version in `tsc-redirect-map.csv`. Summary:

### 4a. Blog posts — exact slug (7) — verbatim path prefix change

These slugs are identical old→new; only the `/news/` prefix is added.

| Old `/{slug}` | New |
|---|---|
| `/a-better-etcs-onboard-no-more-no-less` | `/news/…` (same slug) |
| `/digital-stms-will-accelerate-ertms-roll-out` | `/news/…` |
| `/geert-pauwels-ceo-of-lineas-wins-prestigious-european-railway-award` | `/news/…` |
| `/nomination-of-stanislas-pinte-as-ceo-of-thesignallingcompany` | `/news/…` |
| `/shaping-the-train-positioning-algorithms-of-the-future` | `/news/…` |
| `/the-signalling-company-and-try-and-cert-introduce-silicon-valley-best-practice-into-european-etcs-development` | `/news/…` |
| _(RailTech award & others renamed — see 4b)_ | |

### 4b. Blog posts — renamed slug (6) — explicit mapping required

| Old | New |
|---|---|
| `/positive-assessment-from-tuv-rheinland-for-ievc-product-design` | `/news/tuv-rheinland-positive-assessment-ievc` |
| `/skoda-group-acquires-a-majority-stake-in-the-signalling-company` | `/news/skoda-group-acquires-majority-stake` |
| `/thesignallingcompany-to-build-new-mobile-app-to-function-as-the-belgian-class-bsystem-tbl1-on-its-etcs-solution` | `/news/tsc-mobile-app-belgian-tbl1-plus` |
| `/first-locomotive-authorised-with-the-signalling-companys-software-defined-safety-system` | `/news/first-locomotive-authorised-tsc-platform` |
| `/introducing-the-worlds-1st-software-defined-etcs-certified-safety-system` | `/news/worlds-first-software-defined-etcs-certified` |
| `/stans-etcs-diary-11-days-australia` | `/news/stans-diary-11-days-in-australia` |
| `/the-signalling-companys-etcs-wins-railtech-innovation-award` | `/news/etcs-wins-railtech-innovation-award` |

### 4c. Category archives (3) → news listing

`/category/news`, `/category/mise-en-avant`, `/category/uncategorized` → `/news`

### 4d. Optional

`/feed` → `/news` (catches legacy RSS pollers; low traffic, nice-to-have).

---

## 5. The one gap — RegioJet post ⚠️

The old post **`/award-winning-etcs-soon-deployed-on-new-hybrid-regiojet-trains`**
was **not migrated** — there is no matching item in the new `/news` collection
(new site has 13 news items; old sitemap has 14 posts).

**Options, best first:**
1. **Migrate the post** into the News collection, then 301 the old URL to its
   new `/news/{slug}`. Preserves the content and full equity. _Recommended._
2. **Interim topical redirect** to `/projects/skoda-regiojet` (the post is about
   Škoda/RegioJet trains getting TSC's ETCS) so the URL isn't dead at launch.
   The CSV currently encodes this as the interim target.
3. Redirect to `/news` (weakest — generic, loses topical relevance).

**Action:** flag to Romain / content owner. Default to option 2 at launch to
avoid a 404, switch to option 1 once the post is migrated.

---

## 6. Out of scope / deliberately not redirected

- **`/wp-content/uploads/…` media** — old image hotlinks will 404. Not worth
  per-file redirects; Webflow serves its own assets. Leave to decay.
- **`/wp-admin`, `/wp-login.php`, `/xmlrpc.php`** — WordPress system paths;
  let them 404 (also a small security win — no login surface advertised).
- **`/?s=` search** — query-string search; new site has no equivalent, ignore.
- **`/comments/feed`** — no comments migrated; ignore.

---

## 7. Verification plan (run after cutover)

1. **Automated sweep** — after DNS + publish, curl every `old_path` in
   `tsc-redirect-map.csv` on the production domain and assert
   `301 → expected new_path` (see command below).
2. **Spot-check in browser** — click through 3–4 renamed posts to confirm they
   land on the right article, not a generic listing.
3. **Search Console** — submit the new sitemap, then watch Coverage for a spike
   in 404s over the following 2 weeks; anything unexpected gets a new rule.
4. **Confirm the RegioJet decision** is live (no 404).

```bash
# Post-cutover check — run against the production domain
DOMAIN="https://thesignallingcompany.com"
tail -n +2 tsc-redirect-map.csv | while IFS=, read -r old new type conf notes; do
  got=$(curl -s -o /dev/null -m 12 -w "%{http_code} %{redirect_url}" "$DOMAIN$old")
  printf "%-70s %s\n" "$old" "$got"
done
```

---

## 8. Implementation checklist

- [ ] Resolve RegioJet gap (§5) — pick option, apply
- [ ] Enter 17 required rules (14 posts + 3 categories) in Webflow 301 settings
- [ ] Add optional `/feed → /news`
- [ ] Publish site
- [ ] Run §7 automated sweep against production
- [ ] Submit new sitemap to Google Search Console
- [ ] Diarise a 2-week Search Console 404 review
