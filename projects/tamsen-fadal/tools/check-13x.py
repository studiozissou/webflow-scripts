"""Sweeps the live site for any remaining '13x' wording after the footer copy change."""
import re
import urllib.request

UA = {"User-Agent": "Mozilla/5.0"}
BASE = "https://www.tamsenfadal.com"


def get(url):
    return urllib.request.urlopen(
        urllib.request.Request(url, headers=UA), timeout=30
    ).read().decode("utf-8", "replace")


locs = re.findall(r"<loc>(.*?)</loc>", get(BASE + "/sitemap.xml"))
static = [u for u in locs if u.count("/") <= 3]
sample = static + [u for u in locs if "/blog/" in u][:5] + [u for u in locs if "/podcast/" in u][:5]

hits = 0
for u in sample:
    try:
        n = get(u).count("13x")
    except Exception as exc:
        print(f"  {u} -> FETCH FAILED {exc}")
        continue
    if n:
        hits += 1
        print(f"  STILL PRESENT ({n}x): {u}")

print(f"\nchecked {len(sample)} pages ({len(static)} static + 10 CMS)")
print("pages still containing '13x':", hits if hits else "none")
