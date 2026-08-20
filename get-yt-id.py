"""Resolves a YouTube handle to its UC channel ID for Wikidata P2397."""
import re
import urllib.request

HANDLE = "@TamsenFadalTV"
UA = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

PATTERNS = [
    r'"externalId"\s*:\s*"(UC[\w-]{22})"',
    r'"channelId"\s*:\s*"(UC[\w-]{22})"',
    r'/channel/(UC[\w-]{22})',
    r'itemprop="identifier"\s+content="(UC[\w-]{22})"',
    r'"browseId"\s*:\s*"(UC[\w-]{22})"',
]

for url in [
    f"https://www.youtube.com/{HANDLE}",
    f"https://www.youtube.com/{HANDLE}/about",
    f"https://www.youtube.com/{HANDLE}/videos",
]:
    try:
        html = urllib.request.urlopen(
            urllib.request.Request(url, headers=UA), timeout=45
        ).read().decode("utf-8", "replace")
    except Exception as exc:
        print(f"{url} -> FETCH FAILED {exc}")
        continue

    found = []
    for p in PATTERNS:
        found += re.findall(p, html)

    uniq = sorted(set(found))
    print(f"{url}\n  bytes={len(html)}  candidates={uniq}")
    if uniq:
        # the channel's own id is overwhelmingly the most frequent
        best = max(uniq, key=lambda c: html.count(c))
        print(f"  --> MOST LIKELY: {best}  (appears {html.count(best)}x)")
        break
