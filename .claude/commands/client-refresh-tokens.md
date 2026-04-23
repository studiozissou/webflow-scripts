# /client-refresh-tokens — Refresh design tokens from Webflow

Pulls the current variables from a connected Webflow site and updates
`design/figma-tokens.json`. Safe to re-run — overwrites Webflow-sourced
tokens, preserves Figma-sourced and manually-entered tokens.

**Arguments:** `--client <slug>` (default: inferred from cwd)

**Never writes to the Webflow project. Read-only throughout.**

---

## Pre-flight

1. Resolve client from `--client` flag or cwd (`projects/<client>/`)
2. Read `projects/<client>/.claude/build/site-config.json` — confirm site ID
3. Read existing `projects/<client>/.claude/design/figma-tokens.json` if it exists
4. Connect to Webflow MCP

---

## Step 1 — Read all variables

Use `variable_tool` to read all variables from the connected Webflow project.

For each variable, create a token entry:

```json
{
  "figma_name": null,
  "converted_name": "{kebab-case-name}",
  "type": "{color|size|font|other}",
  "value": "{current-value}",
  "cf_mapping": "{client-first-mapping-if-applicable}",
  "source": "webflow",
  "webflow_variable_id": "{variable-id}",
  "last_refreshed": "YYYY-MM-DD"
}
```

---

## Step 2 — Merge with existing tokens

If `figma-tokens.json` already exists:
1. For tokens with `"source": "webflow"` — overwrite with fresh values
2. For tokens with `"source": "figma"` — preserve (Figma is the design source of truth)
3. For tokens with `"source": "screenshot"` or `"source": "manual"` — preserve
4. For new variables not in the existing file — add them
5. For tokens in the file whose `webflow_variable_id` no longer exists in Webflow — flag with `"status": "orphaned"` but do not delete

If `figma-tokens.json` doesn't exist, create it with all Webflow tokens.

---

## Step 3 — Write and confirm

Write the merged tokens to `design/figma-tokens.json`.

Present a summary:
- Total tokens: N
- Updated: N (Webflow-sourced tokens refreshed)
- Preserved: N (Figma/screenshot/manual tokens kept)
- New: N (variables added)
- Orphaned: N (tokens whose Webflow variable was deleted)

Ask: "Token refresh complete. Anything look wrong?"

---

## Verification tests

1. `figma-tokens.json` exists after running
2. All Webflow variables are represented in the file
3. Non-Webflow-sourced tokens were not modified
4. No tokens were deleted (orphaned tokens are flagged, not removed)
5. `last_refreshed` date is today on all Webflow-sourced tokens

ARGUMENTS: $ARGUMENTS
