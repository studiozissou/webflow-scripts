#!/usr/bin/env bash
# Verification tests for Figma MCP setup
# Run: bash tests/verify-figma-mcp-setup.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PASS=0
FAIL=0

pass() { PASS=$((PASS + 1)); echo "  PASS: $1"; }
fail() { FAIL=$((FAIL + 1)); echo "  FAIL: $1"; }

echo "=== Figma MCP Setup Verification ==="
echo ""

# --- 1. Skill file exists and has required sections ---
echo "1. Skill file structure"

SKILL="$REPO_ROOT/.claude/skills/figma-mcp/SKILL.md"
if [ -f "$SKILL" ]; then
  pass "SKILL.md exists at .claude/skills/figma-mcp/SKILL.md"
else
  fail "SKILL.md missing at .claude/skills/figma-mcp/SKILL.md"
fi

for section in "When to use Figma MCP" "Tools" "Rules" "Recommended workflow" "Authentication"; do
  if grep -q "## $section" "$SKILL" 2>/dev/null; then
    pass "SKILL.md contains section: $section"
  else
    fail "SKILL.md missing section: $section"
  fi
done

# --- 2. All official Figma MCP tools documented ---
echo ""
echo "2. Tool coverage"

for tool in get_design_context get_metadata get_screenshot get_variable_defs get_code_connect_map generate_figma_design generate_diagram; do
  if grep -q "$tool" "$SKILL" 2>/dev/null; then
    pass "Tool documented: $tool"
  else
    fail "Tool missing from SKILL.md: $tool"
  fi
done

# --- 3. Settings.json has Figma MCP permissions ---
echo ""
echo "3. Permission rules in settings.json"

SETTINGS="$REPO_ROOT/.claude/settings.json"
if [ -f "$SETTINGS" ]; then
  pass "settings.json exists"
else
  fail "settings.json missing"
fi

# Read-only tools should be auto-allowed
for tool in get_design_context get_metadata get_screenshot get_variable_defs get_code_connect_map; do
  if grep -q "mcp__figma__$tool" "$SETTINGS" 2>/dev/null; then
    pass "Permission defined for read tool: $tool"
  else
    fail "Permission missing for read tool: $tool"
  fi
done

# Write tools should require approval (in "ask" block)
for tool in generate_figma_design generate_diagram; do
  if grep -q "mcp__figma__$tool" "$SETTINGS" 2>/dev/null; then
    pass "Permission defined for write tool: $tool"
  else
    fail "Permission missing for write tool: $tool"
  fi
done

# Verify read tools are in "allow" block (not "ask")
ALLOW_BLOCK=$(python3 -c "
import json
with open('$SETTINGS') as f:
    d = json.load(f)
for p in d.get('permissions',{}).get('allow',[]):
    print(p)
" 2>/dev/null || echo "")

for tool in get_design_context get_metadata get_screenshot get_variable_defs get_code_connect_map; do
  if echo "$ALLOW_BLOCK" | grep -q "mcp__figma__$tool"; then
    pass "Read tool in allow block: $tool"
  else
    fail "Read tool NOT in allow block (should be auto-allowed): $tool"
  fi
done

# Verify write tools are in "ask" block (not "allow")
ASK_BLOCK=$(python3 -c "
import json
with open('$SETTINGS') as f:
    d = json.load(f)
for p in d.get('permissions',{}).get('ask',[]):
    print(p)
" 2>/dev/null || echo "")

for tool in generate_figma_design generate_diagram; do
  if echo "$ASK_BLOCK" | grep -q "mcp__figma__$tool"; then
    pass "Write tool in ask block: $tool"
  else
    fail "Write tool NOT in ask block (should require approval): $tool"
  fi
done

# --- 4. Setup doc has Figma section ---
echo ""
echo "4. Setup documentation"

SETUP="$REPO_ROOT/.claude/claude-code-project-setup.md"
if grep -q "Figma MCP Integration" "$SETUP" 2>/dev/null; then
  pass "Setup doc has Figma MCP Integration section"
else
  fail "Setup doc missing Figma MCP Integration section"
fi

if grep -q "https://mcp.figma.com/mcp" "$SETUP" 2>/dev/null; then
  pass "Setup doc contains Figma MCP URL"
else
  fail "Setup doc missing Figma MCP URL"
fi

if grep -q "claude mcp add" "$SETUP" 2>/dev/null; then
  pass "Setup doc contains install command"
else
  fail "Setup doc missing install command"
fi

# Figma section should appear before Webflow section (section 3 before section 4)
FIGMA_LINE=$(grep -n "Figma MCP Integration" "$SETUP" | head -1 | cut -d: -f1)
WEBFLOW_LINE=$(grep -n "Webflow MCP Integration" "$SETUP" | head -1 | cut -d: -f1)
if [ -n "$FIGMA_LINE" ] && [ -n "$WEBFLOW_LINE" ] && [ "$FIGMA_LINE" -lt "$WEBFLOW_LINE" ]; then
  pass "Figma section appears before Webflow section"
else
  fail "Figma section should appear before Webflow section"
fi

# --- 5. Skill integrates with existing commands ---
echo ""
echo "5. Command integration"

if grep -q "figma-audit" "$SKILL" 2>/dev/null; then
  pass "SKILL.md references /figma-audit command"
else
  fail "SKILL.md should reference /figma-audit command"
fi

if grep -q "component-plan" "$SKILL" 2>/dev/null; then
  pass "SKILL.md references /component-plan command"
else
  fail "SKILL.md should reference /component-plan command"
fi

if grep -q "webflow-connect" "$SKILL" 2>/dev/null; then
  pass "SKILL.md references /webflow-connect command"
else
  fail "SKILL.md should reference /webflow-connect command"
fi

# --- 6. No secrets or API keys in committed files ---
echo ""
echo "6. Security checks"

if grep -rq "FIGMA_TOKEN\|figma_token\|figd_" "$SKILL" "$SETTINGS" "$SETUP" 2>/dev/null; then
  fail "Found potential Figma API token in committed files"
else
  pass "No Figma API tokens in committed files"
fi

# --- 7. Webflow MCP permissions unchanged ---
echo ""
echo "7. Webflow MCP permissions preserved"

for pattern in "mcp__webflow__*list*" "mcp__webflow__*get*" "mcp__webflow__*read*" "mcp__webflow__element_snapshot*" "mcp__webflow__style_tool*"; do
  if grep -Fq "$pattern" "$SETTINGS" 2>/dev/null; then
    pass "Webflow allow pattern preserved: $pattern"
  else
    fail "Webflow allow pattern missing: $pattern"
  fi
done

for pattern in "mcp__webflow__*create*" "mcp__webflow__*update*" "mcp__webflow__*delete*" "mcp__webflow__*publish*"; do
  if grep -Fq "$pattern" "$SETTINGS" 2>/dev/null; then
    pass "Webflow ask pattern preserved: $pattern"
  else
    fail "Webflow ask pattern missing: $pattern"
  fi
done

# --- Summary ---
echo ""
echo "=== Results ==="
echo "  Passed: $PASS"
echo "  Failed: $FAIL"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo "VERDICT: FAIL"
  exit 1
else
  echo "VERDICT: PASS"
  exit 0
fi
