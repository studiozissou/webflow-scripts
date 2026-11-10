#!/usr/bin/env bash
# Mirrors a public site and every URL in its sitemap into <out-dir>/site/ with wget, and writes <out-dir>/serve.sh to browse it offline.
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "usage: mirror.sh <url> <out-dir>" >&2
  exit 64
fi

url="$1"
out="$2"
here="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$out/site"
out="$(cd "$out" && pwd)"
site="$out/site"

domains="$(node "$here/mirror-plan.js" domains "$url")"
host="${domains%%,*}"

flags=(
  --mirror
  --page-requisites
  --convert-links
  --adjust-extension
  --span-hosts
  -e robots=off
  "--domains=$domains"
  "--directory-prefix=$site"
)

fetch() {
  local status=0
  wget "${flags[@]}" "$@" || status=$?
  if [ "$status" -eq 8 ]; then
    echo "wget: some files returned server errors (exit 8); the mirror is still usable" >&2
  elif [ "$status" -eq 6 ]; then
    echo "wget: some pages are password-protected (exit 6) and were skipped; the mirror is still usable" >&2
  elif [ "$status" -ne 0 ]; then
    echo "wget failed with exit $status" >&2
    exit "$status"
  fi
}

fetch "$url"

list="$out/sitemap-urls.txt"
node "$here/mirror-plan.js" urls "$url" > "$list"
if [ -s "$list" ]; then
  fetch "--input-file=$list"
fi

if [ -d "$site" ]; then
  find "$site" -type f -name '*.html' -exec perl -pi -e 's/\s+integrity="[^"]*"//g; s/\s+crossorigin="[^"]*"//g' {} +
fi

cat > "$out/serve.sh" <<SERVE
#!/usr/bin/env bash
cd "\$(dirname "\$0")/site"
echo "Open http://localhost:8080/$host/"
python3 -m http.server 8080
SERVE
chmod +x "$out/serve.sh"
echo "Mirror in $site; run $out/serve.sh and open http://localhost:8080/$host/"
