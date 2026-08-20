"""Confirms CMS template binding tokens resolved to real values rather than empty strings."""
import json
import re
import urllib.request

UA = {"User-Agent": "Mozilla/5.0"}
URLS = [
    "https://www.tamsenfadal.com/blog/why-am-i-so-tired",
    "https://www.tamsenfadal.com/podcast/naomi-watts-what-i-wish-i-knew-in-my-30s",
    "https://www.tamsenfadal.com/menopause-education-hub/the-belly-fat-reset-guide",
]


def walk(node, path=""):
    """Yields (path, value) for every leaf string in the graph."""
    if isinstance(node, dict):
        for k, v in node.items():
            yield from walk(v, f"{path}.{k}" if path else k)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            yield from walk(v, f"{path}[{i}]")
    else:
        yield path, node


for url in URLS:
    print("=" * 70)
    print(url)
    try:
        html = urllib.request.urlopen(
            urllib.request.Request(url, headers=UA), timeout=30
        ).read().decode("utf-8", "replace")
    except Exception as exc:
        print("  FETCH FAILED:", exc)
        continue

    blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S)
    empties, unresolved, shown = [], [], 0
    for b in blocks:
        try:
            d = json.loads(b)
        except Exception as exc:
            print("  PARSE FAIL:", exc)
            continue
        for node in d.get("@graph", [d]):
            if not isinstance(node, dict):
                continue
            t = node.get("@type")
            if t in ("BlogPosting", "Article", "PodcastEpisode"):
                for k in ("headline", "name", "description", "image", "datePublished", "url"):
                    v = node.get(k)
                    print(f"  {t}.{k} = {str(v)[:95]}")
                    shown += 1
            for p, v in walk(node):
                if isinstance(v, str):
                    if v.strip() == "":
                        empties.append(f"{t}.{p}")
                    if "{{" in v or "&quot;" in v:
                        unresolved.append(f"{t}.{p}")

    print(f"  --> empty values: {empties if empties else 'none'}")
    print(f"  --> unresolved tokens: {unresolved if unresolved else 'none'}")
    if not shown:
        print("  --> WARNING: no Article/BlogPosting/PodcastEpisode node found")
    print()
