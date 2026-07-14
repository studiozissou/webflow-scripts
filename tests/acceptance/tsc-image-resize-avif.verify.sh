#!/usr/bin/env bash
# Tier 1 verification for tsc-image-resize-avif (asset pipeline, no DOM/Playwright).
# Verifies: bucketing rule, per-file width == folder, AVIF format, size sanity,
# output count == inventory, and originals untouched (checksum guard).
#
# Usage: OUTROOT=... SRC=... INVENTORY=... BASELINE_MD5=... bash tsc-image-resize-avif.verify.sh
set -uo pipefail

OUTROOT="${OUTROOT:-/Users/willmorley/Downloads/TSC Images/website-selects/optimised}"
SRC="${SRC:-/Users/willmorley/Downloads/TSC Images/website-selects/hires}"
INVENTORY="${INVENTORY:-/Users/willmorley/webflow-scripts/projects/the-signalling-company/.claude/reports/tsc-image-inventory-2026-07-14.json}"
BASELINE_MD5="${BASELINE_MD5:-}"   # optional path to pre-run md5 list of source files

pass=0; fail=0
ok(){ echo "  [PASS] $1"; pass=$((pass+1)); }
no(){ echo "  [FAIL] $1"; fail=$((fail+1)); }

echo "== 1. Bucketing rule: no two buckets within 100px =="
BUCKETS=$(python3 -c "import json;print(' '.join(map(str,json.load(open('$INVENTORY'))['buckets'])))")
prev=""; bok=1
for b in $BUCKETS; do
  if [ -n "$prev" ] && [ $((b - prev)) -le 100 ]; then no "buckets $prev and $b within 100px"; bok=0; fi
  prev=$b
done
[ $bok -eq 1 ] && ok "buckets [$BUCKETS] all >100px apart"

echo "== 2. Output count == inventory encodeCount =="
EXPECT=$(python3 -c "import json;print(json.load(open('$INVENTORY'))['encodeCount'])")
ACTUAL=$(find "$OUTROOT" -type f -name '*.avif' | wc -l | tr -d ' ')
[ "$EXPECT" = "$ACTUAL" ] && ok "found $ACTUAL AVIFs == inventory $EXPECT" || no "count mismatch: found $ACTUAL, expected $EXPECT"

echo "== 3+4. Each AVIF: width == folder's mapped width, format == AVIF =="
# folders are named semantically (desktop-large, mobile-small, ...); the inventory's
# bucketNames maps width->name, so invert it to check each file's width against its folder.
wok=1; fok=1
while IFS= read -r f; do
  folder=$(basename "$(dirname "$f")")
  expect=$(python3 -c "import json,sys;m=json.load(open('$INVENTORY'))['bucketNames'];print(next((w for w,n in m.items() if n==sys.argv[1]),''))" "$folder")
  w=$(magick identify -format '%w' "$f" 2>/dev/null)
  fmt=$(magick identify -format '%m' "$f" 2>/dev/null)
  if [ -z "$expect" ]; then no "$(basename "$f"): folder '$folder' not in bucketNames map"; wok=0;
  elif [ "$w" != "$expect" ]; then no "$(basename "$f"): width $w != $folder ($expect)"; wok=0; fi
  [ "$fmt" = "AVIF" ]  || { no "$(basename "$f"): format $fmt != AVIF"; fok=0; }
done < <(find "$OUTROOT" -type f -name '*.avif' | sort)
[ $wok -eq 1 ] && ok "every AVIF width matches its bucket folder's mapped width"
[ $fok -eq 1 ] && ok "every output is a valid AVIF"

echo "== 5. Size sanity: each AVIF materially smaller than its JPEG source =="
sok=1
while IFS= read -r f; do
  # filenames are suffixed with width (e.g. cliff-040-2850.avif) — strip it to get the source base
  base=$(basename "$f" .avif | sed -E 's/-[0-9]+$//')
  srcf="$SRC/$base.jpg"
  [ -f "$srcf" ] || { no "no source for $base"; sok=0; continue; }
  sb=$(stat -f%z "$srcf"); ab=$(stat -f%z "$f")
  # AVIF must be < 50% of source (expect 90-99% reduction)
  if [ "$ab" -ge $((sb / 2)) ]; then no "$base: avif $ab not materially < source $sb"; sok=0; fi
done < <(find "$OUTROOT" -type f -name '*.avif' | sort)
[ $sok -eq 1 ] && ok "every AVIF materially smaller than its source"

echo "== 6. Originals untouched =="
CNT=$(find "$SRC" -type f -name '*.jpg' | wc -l | tr -d ' ')
[ "$CNT" = "40" ] && ok "source file count == 40" || no "source count changed: $CNT"
if [ -n "$BASELINE_MD5" ] && [ -f "$BASELINE_MD5" ]; then
  NOW=$(find "$SRC" -type f -name '*.jpg' | sort | while read -r f; do md5 -q "$f"; done)
  if [ "$NOW" = "$(cat "$BASELINE_MD5")" ]; then ok "source checksums unchanged"; else no "source checksums CHANGED"; fi
else
  echo "  [SKIP] no BASELINE_MD5 provided — checksum guard not run"
fi

echo ""
echo "== SUMMARY: $pass passed, $fail failed =="
[ $fail -eq 0 ]
