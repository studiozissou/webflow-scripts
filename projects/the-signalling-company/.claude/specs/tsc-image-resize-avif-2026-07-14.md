# TSC Responsive Image Resizing → AVIF

**Slug:** `tsc-image-resize-avif`
**Client:** The Signalling Company
**Date:** 2026-07-14
**Author:** Will (via /plan)
**Type:** Asset optimisation pipeline (no runtime code change)

## Goal

Resize the 40 curated hi-res source photos so each is served at the correct
pixel dimensions for the container it actually renders in — measured live on the
site at desktop (1440px) and mobile (479px) viewports — and export each required
size as an optimised **AVIF**. Output is grouped into one folder per size bucket,
ready for re-upload to Webflow.

## Inputs

- **Source folder:** `/Users/willmorley/Downloads/TSC Images/website-selects/hires`
  - 40 JPEGs: `cliff-*` (28), `rosendaal-*` (10), `stopmotion-*` (2)
  - Intrinsic sizes 7008×4672 → 9504×6336 (all far larger than any target, so
    the 2× retina target is never capped by the source).
- **Live site:** `https://tsc-v2.webflow.io` (== `https://www.thesignallingcompany.com`, DNS switched 2026-07-14)

## Decisions (confirmed with user)

| Decision | Choice |
|----------|--------|
| Pixel density | **2× retina** — export width = measured CSS width × 2 |
| Pages scanned | **All main pages** — every page that actually references one of the 40 source files |
| Output format | **AVIF only** |
| Bucket merge rule | Widths within **100px** collapse to the **largest** in the cluster |
| Multi-page usage | An image used on several pages is sized to its **largest** render across all pages/viewports |

## Key finding (de-risks the whole task)

Webflow **preserves the original base filename** in its CDN URLs:
`https://cdn.prod.website-files.com/<site>/<hash>_cliff-009.jpg`. Therefore every
on-page `<img>`/background image can be matched back to its source file by
extracting the basename after the last `_`. No visual/manual matching needed.

Note: some images are *already* served as `.avif` on the live site. We ignore the
live variants entirely and regenerate cleanly from the hi-res JPEG sources.

## Approach (chosen — no competing-approach fan-out needed)

This is a deterministic 4-stage pipeline; the approach is not architecturally
ambiguous, so the `/plan` 3-approach exploration step is intentionally skipped.

```
Stage 0  Discover which pages use which source image   (curl + grep — all ~60 URLs, fast)
Stage 1  Measure render width per image @1440 & @479    (Chrome DevTools MCP, only pages that matter)
Stage 2  Compute 2× targets → cluster into size buckets (JS/node, deterministic)
Stage 3  Resize + AVIF-encode into per-bucket folders   (magick + avifenc)
```

### Stage 0 — Locate images (fast, complete coverage)

For each URL in the sitemap, `curl` the HTML and grep for the 40 source
basenames. Produces a map: `basename → [pages that reference it]`. This guarantees
we never miss a page and lets Stage 1 browser-measure *only* the pages that
actually contain one of the 40 photos (skip the ~50 device/news sub-pages that
don't).

Sitemap: `https://tsc-v2.webflow.io/sitemap.xml` (fetched — ~60 URLs).

### Stage 1 — Measure (Chrome DevTools MCP)

**MCP availability guard** (chrome-devtools skill): if `mcp__chrome-devtools__*`
tools are not connected, halt and tell the user to connect, or fall back to the
`claude-in-chrome` browser. Do not fabricate measurements.

For each page from Stage 0, for each viewport ∈ {1440, 479}:
1. `navigate_page` to the URL, `resize_page` to the viewport (height 900).
2. Scroll to the bottom in steps to trigger lazy-loaded images and background
   images, then scroll back to top. Wait ~800ms for layout to settle.
3. `evaluate_script` with the measurement function below.

Measurement function (returns one row per visible image-bearing element):

```js
() => {
  const rows = [];
  const nameRe = /_([a-z0-9-]+)\.(?:jpe?g|png|avif|webp)/i;
  const push = (src, w, h, natW, kind) => {
    const m = src && src.match(nameRe);
    // fall back to last path segment for non-hashed URLs
    const base = m ? m[1] : (src ? src.split('/').pop().replace(/\.[a-z0-9]+$/i,'') : null);
    if (base && w >= 2) rows.push({ base, kind, w: Math.round(w), h: Math.round(h), natW: natW||null, src });
  };
  document.querySelectorAll('img').forEach(img => {
    const r = img.getBoundingClientRect();
    push(img.currentSrc || img.src, r.width, r.height, img.naturalWidth, 'img');
  });
  document.querySelectorAll('*').forEach(el => {
    const bg = getComputedStyle(el).backgroundImage;
    if (!bg || bg.indexOf('url(') === -1) return;
    const m = bg.match(/url\(["']?(.*?)["']?\)/);
    if (!m || !/\.(jpe?g|png|avif|webp)/i.test(m[1])) return;
    const r = el.getBoundingClientRect();
    push(m[1], r.width, r.height, null, 'bg');
  });
  return { url: location.pathname, vw: window.innerWidth, rows };
}
```

Aggregate all rows into: `base → { desktopMaxCss, mobileMaxCss, pages:Set }`,
taking the **max** CSS width per viewport across every page and instance.
`desktopMaxCss` comes from the 1440 runs, `mobileMaxCss` from the 479 runs.

### Stage 2 — Targets + bucketing (deterministic)

1. For each image: `desktopTarget = round(desktopMaxCss × 2)`,
   `mobileTarget = round(mobileMaxCss × 2)`. (Cap at source intrinsic width — never
   hit here.)
2. Collect **all** targets (desktop + mobile, all images) into one list.
3. **Cluster:** sort ascending; walk the list, starting a new cluster whenever the
   gap to the previous width exceeds 100px. Each cluster collapses to its **max**
   value = the bucket width. Round bucket widths to the nearest 10 for tidy folder
   names.
4. Snap each image's desktopTarget and mobileTarget to its containing bucket.
   - If an image's desktop and mobile targets land in the **same** bucket, it's
     exported **once**.
   - Otherwise it's exported into **both** buckets.
5. Emit `inventory.json` + a human-readable `inventory.md` table:
   `base | pages | desktopCss→target→bucket | mobileCss→target→bucket`.
   Flag any source file **never found on-page** (candidate for removal, or used as
   a raw download/CMS asset not caught by the scan).

### Stage 3 — Encode

Output root: `/Users/willmorley/Downloads/TSC Images/website-selects/optimised/`
One subfolder per bucket width, e.g. `optimised/958/`, `optimised/1440/`, `optimised/2880/`.

Per (image, bucket) pair:
```bash
# 1. Resize from hi-res source to exact bucket width (preserve aspect, high-quality filter)
magick "<src>/<base>.jpg" -resize "<W>x" -strip "/tmp/tsc-resize/<base>-<W>.png"
# 2. Encode AVIF with the proven optimise-images settings
avifenc -q 33 --speed 4 -y 420 --depth 8 "/tmp/tsc-resize/<base>-<W>.png" \
        "optimised/<W>/<base>.avif"
```
- Start `-q 33`. If a file exceeds ~150KB (raised from the skill's 100KB default
  because 2× retina targets run up to ~2880px on full-bleed heroes), re-encode at
  `-q 25`, then `-q 20`. Do **not** downscale below the bucket width to force size.
- Never modify or delete the originals.

## Output artifacts

- `optimised/<bucket>/<base>.avif` — one AVIF per (image, bucket), grouped by width.
- `projects/the-signalling-company/.claude/reports/tsc-image-inventory-2026-07-14.md`
  — the inventory table (render sizes, targets, buckets, pages, unmatched files).
- `projects/the-signalling-company/.claude/reports/tsc-image-inventory-2026-07-14.json`
  — machine-readable version.
- Before/after size summary (total source MB vs total AVIF MB, % saved).

## Barba impact

N/A — no Barba transitions, no runtime code. Asset-only task.

## Verify Loop

`/build` consumes this section directly.

### a. Pass/fail criteria (observable)
1. **Coverage:** every source file that appears in Stage-0's page→image map has a
   measured desktop and/or mobile render width. Any source *never* found on-page is
   explicitly listed as unmatched (not silently dropped).
2. **Correct sizing:** for each emitted AVIF, `magick identify` reports width ==
   the bucket width (±1px rounding), and width == round(measured CSS × 2) snapped to
   bucket. Spot-check 3 images by hand against the live render.
3. **Bucketing correctness:** no two final bucket widths are within 100px of each
   other (the merge rule held); every image's targets map to an existing bucket.
4. **Format:** every output file is a valid AVIF (`magick identify -format '%m'`
   returns `AVIF`) and opens without error.
5. **Size sanity:** each AVIF is materially smaller than its JPEG source (expect
   90–99% reduction); none is unexpectedly larger.
6. **Originals untouched:** source folder file count and bytes unchanged.

### b. Reproduction steps
1. Run Stage 0 → confirm the page→image map is non-empty and covers cliff/rosendaal/stopmotion.
2. Run Stage 1 at both viewports → confirm rows returned for the mapped pages.
3. Run Stage 2 → open `inventory.md`, sanity-check a few widths against the live site
   (DevTools element inspector on `tsc-v2.webflow.io`).
4. Run Stage 3 → `find optimised -name '*.avif' | wc -l` matches the (image,bucket)
   count from the inventory; `magick identify` widths match bucket folder names.

### c. Tier mapping
- **Tier 1 (auto, local):** `magick identify` assertions on every output (width ==
  folder name; format == AVIF); output-count == inventory count; originals-unchanged
  checksum. Runs as a shell verification script at end of `/build`. No Playwright —
  there is no page/DOM behaviour to test.
- **Tier 2 (CDN regression):** N/A — nothing is deployed to the CDN by this task.
  (Re-uploading AVIFs to Webflow is a separate manual step, out of scope here.)
- **Tier 3 (manual):**
  - Visual sharpness check on 2–3 AVIFs at 100% zoom (subjective quality at q33 —
    can't be automated).
  - Confirm the measured containers looked right on the live site (human judgement
    on which element is "the" image, esp. for background-image heroes).
  - Decide re-upload/swap strategy in Webflow (out of scope for this build).

### d. Regression scope
- Source originals must not be mutated (checksum guard).
- No Webflow/site change is made by this task, so no site regression surface.

**Self-check:** `/build` knows this feature works when (1) inventory.md lists a
render size + bucket for every on-page source image, (2) `find optimised -name
'*.avif'` count == inventory (image,bucket) count, and (3) every AVIF's identified
width == its folder name. All three are shell-checkable.

## Open questions / notes
- ~50 CMS sub-pages (railos-devices, news, product detail) are skipped unless
  Stage 0 finds one of the 40 photos there. If a curated photo is used *only* in a
  CMS field the HTML grep will still catch it (the CDN URL is in the rendered HTML).
- If the user later wants WebP/JPEG fallbacks too, Stage 3 gains parallel encode
  lines — no other stage changes.
