#!/usr/bin/env python3
"""Parse Webflow MCP get_page_freeform_code tool-result files (paths as args) into {label}-head.html / {label}-body.html beside this script, skipping empty blocks."""

import json
import os
import sys

OUT = os.path.dirname(os.path.abspath(__file__))
SUFFIX = {"head": "head", "footer": "body"}

written = []
empty = 0
for path in sys.argv[1:]:
    for item in json.load(open(path)):
        try:
            parsed = json.loads(item.get("text", ""))
        except Exception:
            continue
        label = parsed.get("label")
        if "error" in parsed:
            print(f"ERROR {label}: {parsed['error'].get('message', '')[:120]}")
            continue
        for entry in parsed.get("result", []) or []:
            content = entry.get("content") or ""
            if not content.strip():
                empty += 1
                continue
            name = f"{label}-{SUFFIX.get(entry.get('location'), entry.get('location'))}.html"
            open(os.path.join(OUT, name), "w", encoding="utf-8").write(content)
            written.append((name, len(content.encode()) / 1024))

for name, kb in sorted(written):
    print(f"{name:55} {kb:7.1f}KB")
print(f"written={len(written)} empty={empty}")
