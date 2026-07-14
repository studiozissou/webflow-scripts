#!/usr/bin/env python3
"""
Parse Webflow MCP tool result JSON files and save each page's head and
footer/body code as individual rollback files.

Input: 3 JSON batch files from the Webflow data_scripts MCP tool.
Output: {label}-head.html and {label}-body.html files in the same directory.

Usage: python3 parse-rollback.py
"""

import json
import os
import sys

# --- Configuration ---

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = SCRIPT_DIR  # Save rollback files alongside this script

TOOL_RESULTS_DIR = (
    "/Users/willmorley/.claude/projects/-Users-willmorley-webflow-scripts"
    "/d87c083e-e18f-4172-8ddd-2fc4a07873c1/tool-results"
)

BATCH_FILES = [
    os.path.join(
        TOOL_RESULTS_DIR,
        "mcp-claude_ai_Webflow-data_scripts_tool-1783374985234.txt",
    ),
    os.path.join(
        TOOL_RESULTS_DIR,
        "mcp-claude_ai_Webflow-data_scripts_tool-1783375094492.txt",
    ),
    os.path.join(
        TOOL_RESULTS_DIR,
        "mcp-claude_ai_Webflow-data_scripts_tool-1783375124256.txt",
    ),
]

# Map Webflow MCP "location" values to our file suffixes
LOCATION_MAP = {
    "head": "head",
    "footer": "body",
}


def parse_batch_file(filepath):
    """Parse a single batch JSON file and return a list of page results."""
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    pages = []
    for item in data:
        text = item.get("text", "")
        if not text:
            continue
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError as e:
            print(f"  WARNING: Could not parse text entry: {e}")
            continue

        label = parsed.get("label")
        result = parsed.get("result", [])

        if not label or not isinstance(result, list):
            continue

        for entry in result:
            location = entry.get("location")
            content = entry.get("content")
            if location and content:
                pages.append((label, location, content))

    return pages


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    total_files = 0
    total_skipped = 0
    all_pages = []
    summary = []

    for i, batch_file in enumerate(BATCH_FILES, start=1):
        if not os.path.exists(batch_file):
            print(f"ERROR: Batch file {i} not found: {batch_file}")
            sys.exit(1)

        print(f"--- Batch {i}: {os.path.basename(batch_file)} ---")
        pages = parse_batch_file(batch_file)
        print(f"  Found {len(pages)} non-empty code entries")
        all_pages.extend(pages)

    print(f"\n--- Writing rollback files ---")

    for label, location, content in all_pages:
        suffix = LOCATION_MAP.get(location, location)
        filename = f"{label}-{suffix}.html"
        filepath = os.path.join(OUTPUT_DIR, filename)

        # Skip empty content (empty string or whitespace-only)
        stripped = content.strip()
        if not stripped:
            total_skipped += 1
            continue

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)

        size_kb = len(content.encode("utf-8")) / 1024
        summary.append((filename, size_kb))
        total_files += 1

    # Print summary table
    print(f"\n{'File':<45} {'Size':>8}")
    print("-" * 55)

    # Sort by label name for readability
    summary.sort(key=lambda x: x[0])
    for filename, size_kb in summary:
        print(f"{filename:<45} {size_kb:>7.1f}KB")

    print("-" * 55)
    print(f"Total files written: {total_files}")
    print(f"Entries skipped (empty content): {total_skipped}")
    print(f"Output directory: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
