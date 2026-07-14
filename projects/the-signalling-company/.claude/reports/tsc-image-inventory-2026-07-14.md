# TSC Image Inventory — 2026-07-14

**Pixel density:** 2× retina · **Bucket merge gap:** 100px

**Final buckets (px → folder):** 730 → `mobile-small` · 960 → `mobile-large` · 1180 → `desktop-small` · 1500 → `desktop-medium` · 2850 → `desktop-large`

_Folders are named by render role. Note `mobile-large` (960) and `mobile-small` (730) also hold a few small desktop card images — they never render wider than a phone-width image, so they share the mobile buckets. The table below keeps exact pixel widths; use the map above to resolve the folder._

**Rendered images:** 18 · **Unmatched (never on-page):** 22 · **Total AVIF outputs (image×bucket):** 35

## Rendered images

| base | desktop css→2×→bucket | mobile css→2×→bucket | buckets | src w | pages |
|------|----------------------|---------------------|---------|-------|-------|
| cliff-009 | 1425→2850→**2850** | 479→958→**960** | 960, 2850 | 7008 | 2 |
| cliff-011 | 1425→2850→**2850** | 479→958→**960** | 960, 2850 | 7008 | 2 |
| cliff-040 | 1425→2850→**2850** | 479→958→**960** | 960, 2850 | 7008 | 8 |
| cliff-046 | 419→838→**960** | 431→862→**960** | 960 | 7008 | 4 |
| cliff-066 | 452→904→**960** | 345→690→**730** | 730, 960 | 7008 | 5 |
| cliff-080 | 588→1176→**1180** | 431→862→**960** | 960, 1180 | 7008 | 3 |
| cliff-100 | 1425→2850→**2850** | 479→958→**960** | 960, 2850 | 7008 | 5 |
| cliff-119 | 1425→2850→**2850** | 479→958→**960** | 960, 2850 | 7008 | 2 |
| cliff-121 | 1425→2850→**2850** | 479→958→**960** | 960, 2850 | 7008 | 2 |
| cliff-148 | 749→1498→**1500** | 431→862→**960** | 960, 1500 | 7008 | 2 |
| cliff-155 | 749→1498→**1500** | 431→862→**960** | 960, 1500 | 4101 | 3 |
| cliff-156 | 452→904→**960** | 345→690→**730** | 730, 960 | 7008 | 4 |
| rosendaal-003 | 1425→2850→**2850** | 479→958→**960** | 960, 2850 | 9504 | 4 |
| rosendaal-088 | 363→726→**730** | 431→862→**960** | 730, 960 | 9504 | 1 |
| rosendaal-100 | 588→1176→**1180** | 431→862→**960** | 960, 1180 | 9504 | 1 |
| rosendaal-101 | 452→904→**960** | 345→690→**730** | 730, 960 | 9504 | 4 |
| rosendaal-124 | 1425→2850→**2850** | 479→958→**960** | 960, 2850 | 9504 | 2 |
| rosendaal-144 | 360→720→**730** | 431→862→**960** | 730, 960 | 9504 | 1 |

## Unmatched — never rendered on any scanned page (candidates for removal)

- `cliff-006` (src 7008px)
- `cliff-010` (src 7008px)
- `cliff-028` (src 7008px)
- `cliff-052` (src 7008px)
- `cliff-055` (src 7008px)
- `cliff-056` (src 7008px)
- `cliff-065` (src 7008px)
- `cliff-071` (src 7008px)
- `cliff-072` (src 7008px)
- `cliff-082` (src 6957px)
- `cliff-137` (src 4559px)
- `cliff-143` (src 7008px)
- `cliff-144` (src 7008px)
- `cliff-147` (src 7008px)
- `cliff-152` (src 7008px)
- `cliff-157` (src 4608px)
- `rosendaal-041` (src 9504px)
- `rosendaal-042` (src 9504px)
- `rosendaal-073` (src 9504px)
- `rosendaal-096` (src 9504px)
- `stopmotion-01` (src 6920px)
- `stopmotion-17` (src 6920px)

## Before / after size summary

| | |
|---|---|
| Source JPEGs (all 40) | 215.2 MB |
| Source JPEGs (18 rendered — the ones replaced) | 99.4 MB |
| AVIF outputs (35 files) | 1.1 MB |
| **Reduction vs rendered sources** | **98.9%** |
| Avg AVIF size | 31 KB (largest 112 KB) |
| Encode quality | q33 across all 35 (none tripped the 150 KB cap) |

Per-bucket: 730px ×5 · 960px ×18 · 1180px ×2 · 1500px ×2 · 2850px ×8

## Notes for re-upload
- 22 source files are **never rendered** on any scanned page (listed above). They are
  either retired selects or used only as raw downloads/CMS assets not surfaced in HTML.
  Recommend confirming before deleting — do not re-upload without a home.
- Output tree: `website-selects/optimised/<bucket>/<base>.avif`. Upload the desktop
  bucket variant to the full-bleed/large slot and the 960 variant where an image is
  only ever mobile-width; images with two buckets need both variants wired via
  Webflow responsive image settings (or a `<picture>`/srcset embed).
