---
name: chrome-devtools
description: Guides the agent through Chrome DevTools MCP for live browser checks — console, network, screenshots, JS eval, performance traces, Lighthouse audits, memory snapshots. Primary browser tool; Playwright MCP is secondary/fallback.
---

<objective>
**Role: Primary browser tool.** Chrome DevTools MCP provides real-browser access for live checks against Webflow staging sites. Playwright MCP (`playwright-webflow` skill) is the secondary/fallback for when Chrome DevTools is not connected, and remains the tool for generating permanent Playwright test specs.

Use Chrome DevTools MCP for all ad-hoc browser checks in `/build`, `/debug`, `/qa-check`, `/refactor`, and `/plan`.
</objective>

<tool_inventory>

## Navigation & Pages
| Tool | Key Parameters | Notes |
|------|---------------|-------|
| `list_pages` | — | List open tabs. Use as connectivity ping. |
| `new_page` | `url` | Open a new tab |
| `navigate_page` | `url` | Navigate current tab |
| `select_page` | `index` | Switch between tabs |
| `close_page` | — | Close current tab |

## DOM & Interaction
| Tool | Key Parameters | Notes |
|------|---------------|-------|
| `take_snapshot` | — | Accessibility tree snapshot (returns `uid` for each element) |
| `click` | `uid` | Click element by uid from `take_snapshot` |
| `hover` | `uid` | Hover element by uid from `take_snapshot` |
| `drag` | `startUid`, `endUid` | Drag between elements |
| `fill` | `uid`, `value` | Fill input field |
| `fill_form` | `fields: [{ uid, value }]` | Fill multiple fields at once |
| `press_key` | `key` | Press keyboard key (e.g. `"Tab"`, `"Enter"`) |
| `type_text` | `text` | Type text character by character |
| `upload_file` | `uid`, `filePaths` | Upload file to input |
| `handle_dialog` | `accept`, `text` | Handle alert/confirm/prompt dialogs |
| `wait_for` | `selector`, `timeout` | Wait for element to appear |

## Screenshots & Visual
| Tool | Key Parameters | Notes |
|------|---------------|-------|
| `take_screenshot` | `format` (jpeg/png) | Screenshot of current viewport |
| `resize_page` | `width`, `height` | Resize browser viewport |
| `emulate` | `viewport`, `cpuThrottle`, `networkThrottle`, `darkMode`, `geolocation` | Device/network emulation |

## JavaScript & Evaluation
| Tool | Key Parameters | Notes |
|------|---------------|-------|
| `evaluate_script` | `expression` | Execute JS in page context. **Must be function declaration** — see gotchas. |

## Console & Network
| Tool | Key Parameters | Notes |
|------|---------------|-------|
| `list_console_messages` | `types` (array: `"error"`, `"warning"`, `"log"`, etc.), `includePreservedMessages` | Get console output. Use `types: ["error"]` for error check. |
| `get_console_message` | `index` | Get a specific console message by index |
| `list_network_requests` | `statusCode`, `resourceType` | List network requests. Filter by status code pattern. |
| `get_network_request` | `index` | Get details of a specific network request |

## Performance & Profiling (Chrome DevTools exclusive)
| Tool | Key Parameters | Notes |
|------|---------------|-------|
| `lighthouse_audit` | `categories` (array: `"accessibility"`, `"performance"`, `"best-practices"`, `"seo"`) | Full Lighthouse audit |
| `performance_start_trace` | — | Start performance recording |
| `performance_stop_trace` | — | Stop recording, returns trace data |
| `performance_analyze_insight` | `category` | Analyze a specific aspect of the trace |
| `take_memory_snapshot` | — | Heap snapshot for memory leak analysis |

</tool_inventory>

<mcp_availability_guard>

### Browser MCP availability

1. **Try Chrome DevTools MCP:** call `list_pages`
   - If connected: use Chrome DevTools tools for all browser checks
2. **If Chrome DevTools not available, try Playwright MCP:** call `browser_navigate`
   - If connected: use Playwright tools (see `playwright-webflow` skill)
3. **If neither connected:**
   - Log: "No browser MCP available — skipping live checks"
   - Continue with code-only checks (all browser steps are optional)

Every command that uses browser checks MUST wrap them in this guard so the command never fails due to missing MCP.

</mcp_availability_guard>

<adhoc_checks>
Reusable Chrome DevTools MCP check patterns referenced by /build, /debug, /qa-check, and /refactor:

**Console error check:**
1. `navigate_page` to target URL, wait for load
2. `list_console_messages` with `types: ["error"]`
3. Filter benign noise: third-party scripts, analytics, favicon 404s, gtag, Google Fonts warnings
4. Any remaining errors → FAIL with details

**Mobile rendering check:**
1. `emulate` with `viewport: { width: 375, height: 812 }` (iPhone viewport)
2. `navigate_page` to target URL
3. `evaluate_script`: `() => { return document.documentElement.scrollWidth > document.documentElement.clientWidth }` → if true, horizontal overflow → FAIL
4. `take_screenshot` for visual record

**CLS measurement:**
1. `evaluate_script` — inject PerformanceObserver:
```js
() => {
  return new Promise(resolve => {
    let cls = 0;
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) cls += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
    setTimeout(() => resolve(cls), 5000);
  });
}
```
2. Thresholds: < 0.1 → PASS, 0.1–0.25 → WARN, > 0.25 → FAIL

**Animation smoke check:**
1. `evaluate_script` — scroll to target section: `() => { document.querySelector(SELECTOR).scrollIntoView(); return true; }`
2. Wait per timing table (e.g. 2000ms for GSAP animation)
3. `take_screenshot` for visual record
4. `evaluate_script` — check GSAP state: `() => { return gsap.globalTimeline.getChildren().length; }`
5. Compare against expected count from the spec

**Desktop screenshot:**
1. `resize_page` with `width: 1280, height: 800` (MacBook Pro 13")
2. `navigate_page` to target URL
3. `take_screenshot`

**Keyboard a11y spot check:**
1. `press_key` Tab 5 times
2. After each Tab, `evaluate_script`:
```js
() => {
  const el = document.activeElement;
  return { tag: el.tagName, focusVisible: el.matches(':focus-visible'), role: el.getAttribute('role') };
}
```
3. If any Tab lands on a non-interactive element or focus ring is invisible → WARN

**Lighthouse audit (a11y + best practices):**
1. `lighthouse_audit` with `categories: ["accessibility", "best-practices"]`
2. Thresholds: score ≥ 90 → PASS, 70–89 → WARN, < 70 → FAIL

**Lighthouse performance (informational):**
1. `lighthouse_audit` with `categories: ["performance"]`
2. Report score. WARN only — informational, does not block.

**Performance trace (for perf bugs or refactor comparison):**
1. `performance_start_trace` before the interaction/page load
2. Perform the action (navigate, scroll, click)
3. `performance_stop_trace` after action completes
4. `performance_analyze_insight` on the results for specific categories

**Memory snapshot (for memory leak investigation):**
1. `take_memory_snapshot` before interaction
2. Perform the suspected leaky action (navigate back and forth, open/close panel)
3. `take_memory_snapshot` after interaction
4. Compare heap sizes and retained objects

</adhoc_checks>

<timing_table>
Typical wait times for Webflow staging sites (same as Playwright — real browser may be faster):

| What you're waiting for | Wait time |
|---|---|
| Page load (navigation complete) | Built into navigate_page |
| Custom JS initialisation | 1500–2000ms |
| GSAP animation to complete | 1000–2000ms (depends on duration) |
| ScrollTrigger to fire after scroll | 500–1000ms |
| Finsweet CMS Filter to process | 800–1200ms |
| Finsweet CMS Load to render | 1000–1500ms |
| Barba page transition | 1500–2500ms |
| Lenis smooth scroll to settle | 500–1000ms |
| Webflow interactions (IX2) | 500–1500ms |
</timing_table>

<gotchas>
- **`evaluate_script` requires a function declaration:** Always wrap JS as `() => { return X }`, not raw JS expressions. Async functions `async () => { ... }` work too.
- **`click`/`hover` use `uid` from `take_snapshot`:** You must call `take_snapshot` first to get element uids. These are NOT CSS selectors.
- **`list_console_messages` has `includePreservedMessages`:** Set to `true` to include messages from before the current navigation — useful for cross-page console history.
- **Real browser = real extensions/state:** The user's Chrome extensions, cached data, and cookies are present. Console output may include noise from extensions. Filter accordingly.
- **`emulate` resets on navigation:** Some emulation settings (viewport, CPU throttle) may need to be re-applied after `navigate_page`.
- **Lighthouse needs a fresh page:** For accurate Lighthouse results, navigate to the page first, then run `lighthouse_audit`. Don't run it mid-interaction.
</gotchas>

<success_criteria>
- All browser checks use Chrome DevTools MCP tools (not Playwright) when connected
- `evaluate_script` calls use function wrapper syntax
- `click`/`hover` calls use `uid` from `take_snapshot`, not CSS selectors
- Console error checks filter extension noise in addition to standard benign noise
- Lighthouse audit included where specified (build verify, qa-check, debug post-fix)
- Fallback to Playwright → manual checklist is documented for each command
</success_criteria>
