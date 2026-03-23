# fix-dial-namespace-selectors

## Summary
Replace all `.dial_component:has([data-barba-namespace="X"])` CSS selectors with `[data-dial-ns="X"]` attribute selectors, and extend the JS to set `data-dial-ns` for all Barba namespaces (home, about, case, contact) — not just home/work.

## Root Cause (Playwright-verified)

The Webflow Designer has **different DOM structures per page**:

**Home page** — container is INSIDE `dial_component`:
```
main.main-wrapper
  └── section.section_home
        └── .dial_component
              └── .dial_layer-fg
                    └── [data-barba="container" ns="home"]  ← descendant ✓
```
- `dialComp.contains(container) === true`
- `.dial_component:has([data-barba-namespace="home"])` matches → `display: grid` ✓

**About page** — container is a SIBLING of `section.section_home`:
```
main.main-wrapper
  ├── section.section_home
  │     └── .dial_component
  │           └── .dial_layer-fg (empty — no container)
  └── div.barba-wrapper-about[data-barba="container" ns="about"]  ← sibling ✗
```
- `dialComp.contains(container) === false`
- `.dial_component:has([data-barba-namespace="about"])` fails → `display: flex` (Webflow default) ✗

**After about→home Barba swap**, the new home container goes into the **same DOM location** as the about container (sibling of `section.section_home`). The `:has()` selectors break on the home page too.

## Affected selectors

### Will be converted (`.dial_component:has()` → `[data-dial-ns]`)

~30 CSS rules across `ready-hit-play.css`:
- **Shared (home+case+about)**: grid layout, tap highlight, layer positioning (lines 288–336, 356–367, 517–523)
- **Home only**: fg sizing, opacity, UI position, CMS hide, bg color, sector dot (lines 339–341, 370–386, 492–551, 767–769, 941–943)
- **Case only**: fg sizing/scroll, video wrap, blur, layer visibility, mobile (lines 344–347, 387–414, 500–513, 554–600, 948–951, 968–992)
- **About only**: bg canvas hide, fg opacity, video wrap, sector dot, mobile (lines 344–352, 387–404, 500–508, 948–951, 989–992)
- **Contact only**: sector dot hide (lines 948–951)

### Will NOT be changed
- `[data-barba="wrapper"]:has([data-barba-namespace])` — these work (container is always inside wrapper)
- `[data-barba-namespace="about"] .about_dial-wrapper ...` (bare, non-`:has()`) — these target elements inside the container itself
- All `[data-dial-ns="work"]` rules — already correct

## Implementation

### Task 1: Extend `data-dial-ns` in orchestrator.js

Currently only `'home'` and `'work'` are ever set. Add `'about'`, `'case'`, `'contact'`.

**In `bootCurrentView()`:**
- `ns === 'case'` → `data-dial-ns="work"` (keep — work is the visual state)
- `ns === 'about'` → ADD `data-dial-ns="about"` (currently missing!)
- `ns === 'home'` → `data-dial-ns="home"` (already set via `setDialToHomeState()`)
- `ns === 'contact'` → `data-dial-ns="contact"` (currently gets `"home"` via `setDialToHomeState()`)

**In `runAfterEnter()`:**
- Add `dialComp.setAttribute('data-dial-ns', ns)` early in the function (before any CSS-dependent logic)
- Keep `setDialToHomeState()` / `setDialToWorkState()` for their non-namespace-related work (clearProps, class removal)
- For case: set `data-dial-ns="case"` in runAfterEnter, then rely on existing work-state CSS via `[data-dial-ns="work"]` rules for the scroll/sizing. Actually: case pages visually use "work" layout, so set `data-dial-ns="work"` for case (already done in leave). But we also need `data-dial-ns="case"` for the case-specific CSS rules (bg blur, fg position, video wrap sizing). **Solution**: use the actual namespace value (`case`, `about`, `contact`, `home`) and convert the CSS accordingly. The `work` value stays for home→case leave animation only; `runAfterEnter` overrides with `case`.

**In each Barba transition `beforeLeave`:**
- No changes needed — `data-dial-ns` gets set in `runAfterEnter` after the swap.

**New helper** `setDialNs(ns)`:
```js
function setDialNs(ns) {
  const dialComp = document.querySelector('.dial_component');
  if (dialComp) dialComp.setAttribute('data-dial-ns', ns);
}
```
Call at the top of `runAfterEnter(data)` after determining `ns`.

### Task 2: Convert CSS selectors

**Strategy**: Find-and-replace all `.dial_component:has([data-barba-namespace="X"])` with `.dial_component[data-dial-ns="X"]`.

For selectors that combine multiple namespaces:
```css
/* Before */
.dial_component:has([data-barba-namespace="home"]),
.dial_component:has([data-barba-namespace="case"]),
.dial_component:has([data-barba-namespace="about"]) { ... }

/* After */
.dial_component[data-dial-ns="home"],
.dial_component[data-dial-ns="case"],
.dial_component[data-dial-ns="about"] { ... }
```

**Special case — `work` vs `case`**: Currently, the CSS uses `data-barba-namespace="case"` for case-specific rules AND `data-dial-ns="work"` for the expanded layout. After conversion:
- Case-specific rules → `[data-dial-ns="case"]`
- Work layout rules → `[data-dial-ns="work"]` (keep as-is, these are for the expand animation state)
- Shared case+work rules: duplicate selector for both `[data-dial-ns="case"]` and `[data-dial-ns="work"]`

### Task 3: Update `setDialToHomeState()` and `setDialToWorkState()`

These already set `data-dial-ns`. Just ensure they're consistent with the new namespace values:
- `setDialToHomeState()`: keep `data-dial-ns="home"`
- `setDialToWorkState()`: keep `data-dial-ns="work"` (used during expand animation in leave())

### Task 4: Verify all transition paths

Ensure `data-dial-ns` is correct after every navigation:
| Path | `data-dial-ns` at each stage |
|------|------------------------------|
| Direct land home | `home` (bootCurrentView) |
| Direct land about | `about` (bootCurrentView — NEW) |
| Direct land case | `work` (bootCurrentView) → stays `work` |
| Direct land contact | `contact` (bootCurrentView — NEW) |
| home→about | `home` → leave keeps → `about` (runAfterEnter) |
| about→home | `about` → leave keeps → `home` (runAfterEnter) |
| home→case | `home` → `work` (leave expand) → `case` (runAfterEnter) |
| case→home | `work` → `home` (leave shrink) → `home` (runAfterEnter) |
| about→case | `about` → `work` (leave expand) → `case` (runAfterEnter) |
| case→about | `work` → `home` (beforeLeave) → `about` (runAfterEnter) |
| any→contact | prev → `contact` (runAfterEnter) |

## Barba Impact

1. **Init/Destroy lifecycle**: No new DOM elements or listeners. This only changes an attribute value on an existing persistent element.
2. **State survival**: `data-dial-ns` is set fresh on every `runAfterEnter` — no stale state.
3. **Transition interference**: During `leave()`, the old `data-dial-ns` value is active. The expand/shrink animations set it to `work`/`home` as needed. After swap, `runAfterEnter` sets the correct value. No conflict.
4. **Re-entry correctness**: Each `runAfterEnter` sets the namespace fresh. No stale values possible.
5. **Namespace scoping**: All 4 namespaces + `work` are handled.

## Verify Loop

### Pass/fail criteria
- On direct land `/about` → `.dial_component` has `data-dial-ns="about"` and `display: grid`
- On about→home Barba nav → `.dial_component` has `data-dial-ns="home"` and `display: grid`
- On direct land `/` → `.dial_component` has `data-dial-ns="home"` and `display: grid`
- On home→about Barba nav → `.dial_component` has `data-dial-ns="about"` and `display: grid`
- On direct land case study → `.dial_component` has `data-dial-ns="work"` or `"case"`
- No JS console errors on any page
- The about page dial ticks canvas is visible at 6rem
- The home page dial is circular with correct sizing

### Reproduction steps
1. Direct land `https://rhpcircle.webflow.io/about`
2. Click logo to navigate home via Barba
3. Verify dial renders correctly (circular, ticks visible, video playing)
4. Navigate back to about
5. Verify about page renders correctly

### Tier mapping
- **Tier 1**: `fix-dial-namespace-selectors.spec.js` — automated Playwright checks for `data-dial-ns` value and `display: grid` on every transition path
- **Tier 2**: Registered in `tests/registry.json`
- **Tier 3**: Visual inspection of dial animation smoothness during transitions (subjective timing/easing)

### Regression scope
- All existing Barba transitions must still work
- Home dial: ticks, videos, generic video, state machine (IDLE/ACTIVE/ENGAGED)
- About page: dial ticks, text lines, team hover
- Case pages: expanded layout, video controls, scroll
- Contact page: basic render
- `[data-barba="wrapper"]:has()` rules must not be affected

## Test Plan

### Tier 1 — Auto: Playwright local
See `tests/acceptance/fix-dial-namespace-selectors.spec.js`

### Tier 2 — Auto: CDN regression
Registered in `tests/registry.json` with id `fix-dial-namespace-selectors`

### Tier 3 — Manual
- Visual smoothness of about↔home transition overlay + dial morph (subjective)
- Safari/Firefox: verify `[data-dial-ns]` attribute selectors work (`:has()` has known Safari issues — the new approach actually improves browser compat)
- Mobile: tap-to-activate dial after about→home transition

## Acceptance Tests

1. `direct land about — dial_component has data-dial-ns="about"`
2. `direct land about — dial_component has display grid`
3. `direct land home — dial_component has data-dial-ns="home"`
4. `direct land home — dial_component has display grid`
5. `about→home Barba — dial_component has data-dial-ns="home" after transition`
6. `about→home Barba — dial_component has display grid after transition`
7. `home→about Barba — dial_component has data-dial-ns="about" after transition`
8. `no JS errors on about page`
9. `no JS errors on home page`
10. `no JS errors after about→home transition`

## Parallelisation Map

| Stream | Task | Agent | Est. tokens |
|--------|------|-------|-------------|
| A | CSS selector conversion | code-writer | ~15k |
| B | JS orchestrator changes | code-writer | ~10k |

- **A and B are independent** — CSS changes target selectors, JS changes target setAttribute calls
- After both complete: **sequential** code-review + test run
- **Recommendation**: parallel, no worktrees needed (same branch), no agent teams
