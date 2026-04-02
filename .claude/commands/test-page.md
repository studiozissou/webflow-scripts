Run a comprehensive page analysis using Chrome DevTools MCP as the primary engine.

## Usage
Provide: page URL. Optionally add `--figma <URL>` or `--screenshot <PATH>` for design comparison.

## Step 0 — MCP availability guard

Reference the `chrome-devtools` skill's `<mcp_availability_guard>`:

1. Try `list_pages` (Chrome DevTools MCP) — if connected, use Chrome DevTools for all checks
2. If not available, try `browser_navigate` (Playwright MCP) — limited fallback (no Lighthouse, no perf traces, no memory)
3. Neither connected → use WebFetch for basic HTML analysis only. Log: "No browser MCP — running HTML-only analysis."

## Step 1 — Mode gate

Ask the user with time/token estimates:

| Mode | What it runs | Est. time | Est. tokens |
|------|-------------|-----------|-------------|
| **Light** (smoke test) | Console errors, CLS, Lighthouse (all 4), mobile overflow, desktop + mobile screenshots | ~15s | ~25k |
| **Full** (deep analysis) | Light + perf trace, memory snapshot, network analysis, keyboard a11y (5-tab), DOM snapshot | ~90s | ~45k |

If `--figma` or `--screenshot` provided, note: "Figma/screenshot comparison will run in parallel (+~20s, ~15k tokens)."

## Step 2 — Phase 1: Diagnose (read-only)

All Chrome DevTools checks run **sequentially** in the main agent (single browser connection).
If `--figma` or `--screenshot` provided, spawn art-director in **parallel** (Step 2f).

### 2a. Navigate and screenshot (desktop)
1. `resize_page` width: 1280, height: 800
2. `navigate_page` to target URL
3. Wait 2000ms for JS init
4. `take_screenshot` format: png — save to `.claude/research/test-page/`

### 2b. Console errors
1. `list_console_messages` types: `["error"]`
2. Filter benign noise: gtag, analytics, Google Fonts, favicon 404, browser extensions, third-party
3. Classify remaining: Critical (uncaught exception) / High (runtime error) / Medium (deprecation)

### 2c. CLS measurement
1. `evaluate_script` — inject PerformanceObserver (see `chrome-devtools` skill CLS pattern)
2. Wait 5000ms
3. < 0.1 PASS, 0.1–0.25 WARN, > 0.25 FAIL

### 2d. Mobile check
1. `emulate` viewport: { width: 375, height: 812 }
2. `navigate_page` to target URL (emulate resets on nav)
3. `evaluate_script`: `() => { return document.documentElement.scrollWidth > document.documentElement.clientWidth }`
   - true → FAIL (horizontal overflow)
4. `take_screenshot` — save mobile screenshot

### 2e. Lighthouse audit (all 4 categories)
1. `navigate_page` to target URL (fresh load — Lighthouse needs clean state)
2. `lighthouse_audit` categories: `["performance", "accessibility", "best-practices", "seo"]`
3. Thresholds: >= 90 PASS, 70–89 WARN, < 70 FAIL
4. If any score < 70, flag for Lighthouse re-run gate in Phase 2

### 2f. Figma/screenshot comparison (PARALLEL — only if --figma or --screenshot)

Spawn art-director agent (`subagent_type: "art-director"`, `model: "sonnet"`):

Prompt the agent with:
- Production screenshots from 2a + 2d
- If `--figma`: call `get_screenshot` and `get_design_context` on the Figma URL
- If `--screenshot`: use the provided path(s)
- Task: compare layout, spacing, typography, colour. Score fidelity 0–100. List discrepancies categorised as Critical/Medium/Low. Return top 3 highest-impact fixes.

### 2g. Full mode only — additional checks

If Full mode selected, continue after 2e:

#### Network analysis
1. `list_network_requests`
2. Flag: 4xx/5xx responses, assets > 500KB, render-blocking scripts, no-WebP images, third-party > 100KB
3. `get_network_request` on flagged items for details

#### Performance trace
1. `navigate_page` fresh load
2. `performance_start_trace`
3. Wait 5000ms
4. `performance_stop_trace`
5. `performance_analyze_insight` category: "loading"
6. `performance_analyze_insight` category: "rendering"

#### Memory snapshot
1. `take_memory_snapshot`
2. Report: heap size, top retained objects, leak indicators

#### Keyboard accessibility
1. `press_key` Tab × 5
2. After each: `evaluate_script` to check `document.activeElement` — tag, `:focus-visible`, role, aria-label
3. WARN if focus on non-interactive element or no visible focus ring

#### DOM snapshot
1. `take_snapshot` — accessibility tree
2. Flag: missing ARIA labels, empty alt text, heading hierarchy issues

## Step 3 — Collate results

Merge all findings into a prioritised issue list:

```
## Test Results: <URL>
Date: YYYY-MM-DD | Mode: Light/Full | Figma: Yes/No

### Scores
| Category | Score | Status |
|----------|-------|--------|
| Performance | XX | PASS/WARN/FAIL |
| Accessibility | XX | PASS/WARN/FAIL |
| Best Practices | XX | PASS/WARN/FAIL |
| SEO | XX | PASS/WARN/FAIL |
| CLS | X.XX | PASS/WARN/FAIL |
| Design Fidelity | XX/100 | (if Figma) |

### Issues (N total)
#### Critical (must fix)
#### High
#### Medium
#### Low
```

Each issue includes: description, source (Lighthouse/Console/CLS/Network/A11y/Figma), auto-fixable (Yes/No).

## Step 4 — Phase 2: Act

### 4a. Check for existing baseline

Look for `.claude/research/test-page/<slug>-baseline-*.json`. If found:
- Load the most recent baseline
- Compare current results against baseline
- Flag regressions:
  - Lighthouse score dropped >= 5 points
  - CLS increased above threshold
  - New console errors
  - Network: new 4xx/5xx, new oversized assets
  - Memory heap +20%
  - Figma fidelity dropped >= 10 points
- Show comparison table before the issue list

### 4b. Auto-fix gate (if Webflow MCP connected)

Check if Webflow MCP is available (try `data_sites_tool`).

**Allowlisted auto-fixes only:**
| Issue | Tool | Risk |
|-------|------|------|
| Missing image alt text | `element_tool` | Low |
| Missing ARIA label | `element_tool` | Low |
| Missing meta description | `data_pages_tool` | Low |
| Missing `rel="noopener noreferrer"` | `element_tool` | Low |
| Colour contrast (variable swap) | `style_tool` | Medium |

Ask: "Found N auto-fixable issues. Apply fixes via Webflow MCP?" Show the list.
Fix sequentially. Report each: what changed, before/after, element.

Anything NOT on the allowlist is flagged for manual resolution only.

### 4c. Regression baseline gate

Ask: "Generate regression baseline for future `/test-page` comparison? (~5s, ~8k tokens)"

If yes:
1. Save JSON baseline to `.claude/research/test-page/<slug>-baseline-<date>.json`
2. Generate Playwright regression spec to `tests/acceptance/test-page-<slug>.spec.js` using `tests/templates/smoke.test.template.js` as the pattern
3. Register in `tests/registry.json` (create file if needed)

### 4d. Cross-browser gate

Ask with estimates:

| Option | Extra time | Extra tokens |
|--------|-----------|-------------|
| Chromium only (already done) | 0 | 0 |
| + Firefox | ~30s | ~10k |
| + WebKit (Safari) | ~30s | ~10k |
| All three | ~60s | ~20k |

If selected, run the Playwright spec from 4c with additional browser engines.
Report any cross-browser-specific failures.

### 4e. Lighthouse re-run (if flagged)

If any Lighthouse score was < 70 or seemed inconsistent:

Ask: "Lighthouse scores vary between runs. Re-run N more times and average? (~30s/run, ~5k/run)"

If yes: run N times with fresh `navigate_page` each, average scores, report individual + avg + stddev.

## Step 5 — Final report

Save to `.claude/research/test-page/<slug>-report-<date>.md`:
- Scores and issues from Step 3
- Baseline comparison (if exists)
- Auto-fix results (if applied)
- Cross-browser results (if run)
- Lighthouse averages (if re-run)
- Screenshot file paths
- Figma comparison summary (if run)
- Regression baseline location (if generated)

## Output
A comprehensive page analysis report at `.claude/research/test-page/<slug>-report-<date>.md` with prioritised issues, Lighthouse scores, and optional Figma comparison + regression baseline.
