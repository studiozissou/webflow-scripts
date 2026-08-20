"""Runs the spec's verify-loop assertions against the Webflow staging build."""
import json
import os
import re
import urllib.request

BASE = os.environ.get("VERIFY_BASE", "https://tamsenfadal.webflow.io")
UA = {"User-Agent": "Mozilla/5.0"}

BIO_200 = (
    "Tamsen Fadal is an Emmy Award-winning journalist, filmmaker, and instant New York Times "
    "bestselling author of How To Menopause, leading the national conversation around midlife and menopause."
)

PAGES = [
    "/", "/about-tamsen", "/speaking", "/podcast", "/press", "/blog", "/events",
    "/menopause-education-hub", "/shop", "/advocacy", "/contact", "/newsletter",
    "/themfactor", "/themfactor2", "/m-film-v2", "/menopause-support-provider-directory",
    "/book-how-to-menopause", "/book-how-to-menopause/free-resources",
]

HEAD_MUST_KEEP = [
    "google-site-verification", "GTM-WFRDD6ZD", "@finsweet/attributes", "-webkit-font-smoothing",
]

fails, notes = [], []

for path in PAGES:
    try:
        html = urllib.request.urlopen(
            urllib.request.Request(BASE + path, headers=UA), timeout=30
        ).read().decode("utf-8", "replace")
    except Exception as exc:
        fails.append(f"{path}: FETCH FAILED {exc}")
        continue

    blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S)
    if not blocks:
        fails.append(f"{path}: no JSON-LD blocks")
        continue

    ids, parsed = [], 0
    for b in blocks:
        try:
            d = json.loads(b)
        except Exception as exc:
            fails.append(f"{path}: JSON parse error {exc}")
            continue
        parsed += 1
        for n in d.get("@graph", [d]):
            if isinstance(n, dict) and "@id" in n:
                ids.append(n["@id"])

    for core in ("#website", "#publisher", "#person"):
        n = sum(1 for i in ids if i.endswith(core))
        if n != 1:
            fails.append(f"{path}: {core} defined {n}x (expected 1)")

    dupes = {i for i in ids if ids.count(i) > 1}
    if dupes:
        fails.append(f"{path}: duplicate @id {dupes}")

    if BIO_200 not in html:
        fails.append(f"{path}: approved bio-200 string absent")

    for keep in HEAD_MUST_KEEP:
        if keep not in html:
            fails.append(f"{path}: site head lost {keep}")

    title = re.search(r"<title>(.*?)</title>", html, re.S)
    desc = re.search(r'<meta name="description" content="(.*?)"', html, re.S)
    t = title.group(1) if title else ""
    de = desc.group(1) if desc else ""
    if "13x" in t or "13x" in de:
        fails.append(f"{path}: '13x' still in metadata")
    if t != t.strip():
        fails.append(f"{path}: title has leading/trailing whitespace")

    notes.append(f"{path}: {parsed} block(s), {len(ids)} @ids")

print("=== per page ===")
for n in notes:
    print(" ", n)

print("\n=== failures ===")
if fails:
    for f in fails:
        print("  FAIL:", f)
else:
    print("  none")
print(f"\n{len(notes)}/{len(PAGES)} pages checked, {len(fails)} failures")
