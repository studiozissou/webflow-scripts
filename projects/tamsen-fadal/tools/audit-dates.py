"""Measures how many Education Hub and Blog items would emit an empty or misleading datePublished."""
import json
import re
import urllib.request

UA = {"User-Agent": "Mozilla/5.0"}


def get(url):
    return urllib.request.urlopen(
        urllib.request.Request(url, headers=UA), timeout=30
    ).read().decode("utf-8", "replace")


def date_published(url):
    html = get(url)
    for b in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S):
        try:
            d = json.loads(b)
        except Exception:
            continue
        for n in d.get("@graph", [d]):
            if isinstance(n, dict) and n.get("@type") in ("Article", "BlogPosting"):
                return n.get("datePublished")
    return None


sitemap = get("https://www.tamsenfadal.com/sitemap.xml")
locs = re.findall(r"<loc>(.*?)</loc>", sitemap)

hub = [u for u in locs if "/menopause-education-hub/" in u]
blog = [u for u in locs if "/blog/" in u]

print(f"=== Education Hub ({len(hub)} items) ===")
blank = []
for u in hub:
    dp = date_published(u)
    if not dp or not str(dp).strip():
        blank.append(u)
        print("  BLANK datePublished:", u.split("/")[-1])
print(f"  --> {len(blank)}/{len(hub)} with empty datePublished")

print(f"\n=== Blog sample (first 12 of {len(blog)}) ===")
today = 0
for u in blog[:12]:
    dp = str(date_published(u) or "")
    flag = ""
    if dp.startswith("2026-08-20"):
        today += 1
        flag = "  <-- stamped today"
    print(f"  {dp[:25]:26s} {u.split('/')[-1][:52]}{flag}")
print(f"  --> {today}/12 sampled posts stamped with today's date")
