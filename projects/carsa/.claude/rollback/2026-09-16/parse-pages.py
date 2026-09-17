#!/usr/bin/env python3
"""Parse a Webflow MCP list_pages tool-result file into pages-list.json and print a one-line-per-page summary."""

import json
import os
import sys

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pages-list.json")
KEYS = ("id", "title", "slug", "draft", "archived", "isBranch", "collectionId", "parentId", "publishedPath", "lastUpdated")

data = json.load(open(sys.argv[1]))
pages = []
for item in data:
    try:
        parsed = json.loads(item.get("text", ""))
    except Exception:
        continue
    res = parsed.get("result", parsed)
    lst = res.get("pages") if isinstance(res, dict) else res
    if not lst:
        continue
    for pg in lst:
        pages.append({k: pg.get(k) for k in KEYS})

json.dump(pages, open(OUT, "w"), indent=1)
print(len(pages))
for pg in pages:
    flags = ("D" if pg["draft"] else " ") + ("A" if pg["archived"] else " ") + ("C" if pg["collectionId"] else " ")
    print(f"{pg['id']} {flags} {str(pg['slug']):32} {str(pg['publishedPath']):42} {pg['title']}")
