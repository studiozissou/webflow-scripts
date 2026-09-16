#!/usr/bin/env python3
"""Pull inline Webflow freeform-code tool results out of a Claude Code session transcript (transcript path, then labels) and write {label}-head/body.html beside this script; the label site-freeform maps to site-head.html / site-footer.html."""

import json
import os
import sys

OUT = os.path.dirname(os.path.abspath(__file__))
transcript, wanted = sys.argv[1], set(sys.argv[2:])
results = {}

for line in open(transcript, encoding="utf-8"):
    if "get_page_freeform_code" not in line and "get_site_freeform_code" not in line:
        continue
    try:
        rec = json.loads(line)
    except Exception:
        continue
    content = rec.get("message", {}).get("content", [])
    for block in content if isinstance(content, list) else []:
        if block.get("type") != "tool_result":
            continue
        parts = block.get("content", [])
        for part in parts if isinstance(parts, list) else [{"text": parts}]:
            text = part.get("text", "") if isinstance(part, dict) else str(part)
            try:
                parsed = json.loads(text)
            except Exception:
                continue
            if isinstance(parsed, dict) and parsed.get("label") in wanted and "result" in parsed:
                results[parsed["label"]] = parsed["result"]

for label in wanted:
    if label not in results:
        print(f"MISSING {label}")
        continue
    for entry in results[label]:
        body = entry.get("content") or ""
        if not body.strip():
            continue
        if label == "site-freeform":
            name = "site-head.html" if entry["location"] == "head" else "site-footer.html"
        else:
            name = f"{label}-{'head' if entry['location'] == 'head' else 'body'}.html"
        open(os.path.join(OUT, name), "w", encoding="utf-8").write(body)
        print(f"{name} {len(body)}")
