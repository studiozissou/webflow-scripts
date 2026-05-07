---
name: optimise-images
description: >
  Optimise JPEG and PNG images for web — lossless strip, lossy compression to a
  target size, and optional AVIF conversion for maximum savings. Use this skill
  whenever the user mentions image optimisation, compressing photos, shrinking
  file sizes, preparing images for Webflow upload, or converting to AVIF/WebP.
  Also trigger when the user says "crunch", "squash", or "shrink" images.
---

# /optimise-images

Compress JPEG and PNG files for web delivery. Supports lossless cleanup, lossy
size-capping, and AVIF export.

## Required CLI tools

All installed via Homebrew. If any are missing, install before proceeding:

| Tool | Purpose | Install |
|------|---------|---------|
| `jpegoptim` | JPEG lossless strip + lossy size cap | `brew install jpegoptim` |
| `oxipng` | PNG lossless optimisation | `brew install oxipng` |
| `pngquant` | PNG lossy quantisation (256-colour) | `brew install pngquant` |
| `avifenc` | AVIF encoding (from libavif) | `brew install libavif` |
| `magick` | Format conversion fallback (ImageMagick) | `brew install imagemagick` |

Before running any optimisation, verify tools exist:

```bash
which jpegoptim oxipng pngquant avifenc magick
```

Install any that are missing.

## Arguments

The user provides:

1. **Path** — a file or directory of images
2. **Target size** (optional) — e.g. "4mb", "500kb". If omitted, do lossless only.
3. **--avif** flag (optional) — also export `.avif` versions for web

Parse these from the user's message. If the path is unclear, ask.

## Workflow

### Step 1 — Discover files

```bash
# List all JPEG and PNG files with sizes
find "<path>" -maxdepth 1 \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) -exec ls -lh {} \;
```

Show the user a summary: file count, total size, largest file.

### Step 2 — Lossless pass (always)

Run lossless optimisation on every file. This strips metadata, optimises
encoding, and costs zero quality.

**JPEGs:**
```bash
jpegoptim --strip-all --all-progressive "<path>"/*.jpg "<path>"/*.jpeg 2>/dev/null
```

**PNGs:**
```bash
oxipng -o 4 --strip safe "<path>"/*.png 2>/dev/null
```

Report savings from the lossless pass.

### Step 3 — Lossy pass (only if target size given)

If the user specified a target size, apply lossy compression to files still
over the limit.

**JPEGs over target:**
```bash
jpegoptim --strip-all --all-progressive --size=<target_kb> "<file>"
```

`--size` accepts kilobytes. Convert the user's target: 4mb → 4096, 500kb → 500.

**PNGs over target:**
```bash
pngquant --quality=60-90 --skip-if-larger --force --ext .png "<file>"
```

If still over target after pngquant, resize down (longest edge) until it fits:
```bash
magick "<file>" -resize 80% -strip "<file>"
```

Loop resize at 80% steps until under target. Cap at 3 iterations to avoid
shrinking too aggressively — warn the user if it still won't fit.

### Step 4 — AVIF export (only if --avif or user asked)

Convert each original to AVIF for the smallest possible file size while
keeping images visually acceptable for web. Place AVIF files alongside
originals with the same base name.

**Photos (JPEG source / no transparency):**
```bash
avifenc -q 33 --speed 4 -y 420 --depth 8 "<input>" "<output>.avif"
```

**Graphics with transparency (PNG source with alpha):**
```bash
avifenc -q 33 --speed 4 -y 420 --depth 8 "<input>" "<output>.avif"
```
(avifenc automatically preserves alpha when present in the source)

Why these settings produce tiny files:
- `-q 33` — aggressive quality; roughly equivalent to JPEG q30-35, which is
  plenty for web hero images at screen resolution. Typical result: a 3.5MB
  JPEG becomes 40-300KB AVIF (95-99% reduction).
- `-y 420` — 4:2:0 chroma subsampling halves colour data (imperceptible on photos)
- `--depth 8` — 8-bit colour (no need for 10/12-bit on web)
- `--speed 4` — good compression ratio without extreme encode time

**Target: under 100KB per file (default for web AVIF).**
Start at `-q 33`. If any file is still over 100KB, re-encode at `-q 20`, then
`-q 15` if needed. Most 3840px photos land under 100KB at q20. Very detailed
or high-contrast images (foliage, crowds, split-tone scenes) may stay above
100KB even at q15 — that's acceptable, don't downscale to force it.

If the user wants higher quality (less aggressive), use `-q 50` for a more
balanced size/quality trade-off.

### Step 5 — Report

Show a before/after table:

| File | Original | Optimised | AVIF | Savings |
|------|----------|-----------|------|---------|

Include total savings and percentage. If AVIF was generated, note the
additional savings vs the optimised JPEG/PNG.

## Edge cases

- **Already small files**: Skip lossy pass if already under target. jpegoptim
  handles this automatically (reports "skipped").
- **Subdirectories**: Only process top-level files unless user says "recursive",
  then add `-r` / adjust find depth.
- **Filename spaces**: Always quote paths in commands.
- **Mixed formats**: Handle JPEGs and PNGs in the same directory — run the
  appropriate tool for each format.
- **Originals are precious**: Never delete originals when creating AVIF. The
  AVIF sits alongside as an additional file.
