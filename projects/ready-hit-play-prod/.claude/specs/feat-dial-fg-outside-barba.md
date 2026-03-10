# Moving `dial_layer-fg` Outside the Barba Container — Survival Guide

## Context

`dial_layer-fg` (the `<a>` tag containing `.dial_video-wrap` → `video.dial_fg-video`) currently lives inside `dial_component` → inside `[data-barba="container"]`. On every Barba page transition, the container is destroyed and replaced — taking `dial_layer-fg` with it. This is the root cause of the dial breaking after navigation.

**Goal:** Move `dial_layer-fg` outside the Barba container (as a sibling of `dial_layer-bg`, which already survives transitions), then fix everything that breaks.

---

## What Breaks (and How to Fix Each)

### 1. CRITICAL — `fgWrap` lookup causes hard bail in `init()`

**Problem:** `work-dial.js:145` queries `fgWrap` inside `comp`:
```js
const fgWrap = comp ? comp.querySelector(SEL.fgWrap) : document.querySelector(SEL.fgWrap);
```
Since `.dial_video-wrap` is inside `dial_layer-fg` (now outside `comp`), this returns `null` → the guard at line 147 bails → **the entire dial doesn't initialise**.

**Fix:** Change to always query `document`:
```js
const fgWrap = document.querySelector(SEL.fgWrap);
```

**File:** `work-dial.js:145`

---

### 2. CSS selectors break — namespace-scoped rules can't reach outside the container

**Problem:** 13+ CSS rules use `[data-barba-namespace="home"] .dial_layer-fg` or `[data-barba-namespace="case"] .dial_layer-fg`. Since `dial_layer-fg` is no longer a *descendant* of `[data-barba-namespace]`, none of these selectors match.

**Affected selectors in `ready-hit-play.css`:**
- Line 16: `[data-barba="wrapper"]:has([data-barba-namespace="home"]):not(.rhp-cursor-ready) .dial_layer-fg`
- Line 232: `[data-barba-namespace="home"] .dial_layer-fg`
- Line 246: `[data-barba-namespace="home"] .dial_layer-fg` (inside `@media`)
- Lines 249-250: `[data-barba-namespace="case"/"about"] .dial_layer-fg`
- Lines 255-256: `[data-barba-namespace="case"/"about"] .dial_layer-fg`
- Line 267: `[data-barba-namespace="case"] .dial_layer-fg`
- Lines 426-433: `[data-barba-namespace="case"] .dial_layer-fg.is-case-study ...`

**Fix:** Wrap each namespace selector with `:has()` on the wrapper:
```css
/* Before */  [data-barba-namespace="case"] .dial_layer-fg { ... }
/* After  */  [data-barba="wrapper"]:has([data-barba-namespace="case"]) .dial_layer-fg { ... }
```
This works because the wrapper still *contains* the namespace container, even though `dial_layer-fg` is now outside the container. No JS changes needed for CSS. Browser support: Chrome 105+, Safari 15.4+, Firefox 121+.

**Note:** Line 16 already uses this pattern — so this is consistent with existing code.

**File:** `ready-hit-play.css` (13+ selector changes)

---

### 3. JS lookups — most already have document fallback

**Problem:** Many places query `comp.querySelector('.dial_layer-fg')` — this will return `null` since it's no longer inside `comp`.

**Already safe (have `|| document.querySelector` fallback):**
- `work-dial.js:301` — `setDialState(IDLE)`
- `work-dial.js:338` — `setDialState(ACTIVE)`
- `work-dial.js:1161` — case handoff block
- `work-dial.js:1180` — click listener at bottom of init

**Needs fix — `home-intro.js` has NO document fallback:**
- `home-intro.js:47` — `comp?.querySelector('.dial_layer-fg')` in `setInitialState`
- `home-intro.js:133` — `comp?.querySelector('.dial_layer-fg')` in `runDialTickAnimation`
- `home-intro.js:214` — `comp?.querySelector('.dial_layer-fg')` in `resetToVisible`

**Fix:** Add `|| document.querySelector('.dial_layer-fg')` fallback to each.

**File:** `home-intro.js` (3 changes)

---

### 4. Orchestrator lookups — container-scoped queries return null

**Problem:**
- `orchestrator.js:649` — `data.current?.container?.querySelector('.dial_layer-fg')` in `runCaseDialShrinkAnimation` → returns null
- `orchestrator.js:709-710` — primary lookup in `runAfterEnter` tries `data.next.container` first

**Fix:**
- Line 649: Change to `document.querySelector('.dial_layer-fg')`
- Lines 709-710: Simplify to `var dialFg = document.querySelector('.dial_layer-fg');`

**File:** `orchestrator.js` (2 changes)

---

### 5. Pool element parking — still works but verify

No change needed for pool logic. FG pool videos park in `comp` when hidden, move to `fgWrap` when active. On destroy, `poolPrev.remove()` / `poolNext.remove()` removes them wherever they are.

---

### 6. `resetToVisible` / `homeIntro.skip()` conflict (RC3)

**Problem:** `orchestrator.js:783-785` calls `homeIntro.skip()` on every Barba return to home → `resetToVisible()` forces `bgVideo` to opacity 1 → bg video stuck visible in IDLE.

**Fix:** Remove the `homeIntro.skip()` call from `runAfterEnter`. The `hasRun` guard in homeIntro already prevents re-running the intro.

**File:** `orchestrator.js:783-785` (remove 3 lines)

---

### 7. Cleanup on destroy — prevent original bgVisible deletion (RC1)

**Problem:** `work-dial.js:180` cleanup removes `bgVisible` from DOM. If a BG pool swap occurred, `bgVisible` may be the original Webflow-placed `dial_bg-video`. Removing it means on re-init, `document.querySelector('.dial_bg-video')` returns null.

**Fix:** On BG pool swap, don't delete the demoted element — just hide it and park it. On destroy, only remove pool-created elements, not the original.

**File:** `work-dial.js:180` (modify cleanup function)

---

## Webflow Designer Steps

1. Select `dial_layer-fg` (the `<a>` element)
2. Drag it **outside** `dial_component` and **outside** `[data-barba="container"]` (`<main>`)
3. Place it as a sibling of `dial_layer-bg`, above the `<main>` tag
4. Ensure it keeps its existing classes and structure
5. Publish and verify the DOM structure matches:

```
<body data-barba="wrapper">
  .nav                          ← persistent
  .cursor_component             ← persistent
  div.dial_layer-bg             ← persistent (already here)
    video.dial_bg-video
  a.dial_layer-fg               ← MOVED HERE (now persistent)
    div.dial_video-wrap
      video.dial_fg-video
  main[data-barba="container"]  ← swapped on transitions
    section.section_home
      div.dial_component        ← now just canvas + CMS + UI
```

---

## Implementation Order

1. **Webflow Designer** — move `dial_layer-fg` outside container, publish
2. **CSS** — update all 13+ selectors from namespace-scoped to `:has()` wrapper-scoped
3. **work-dial.js** — fix `fgWrap` query (line 145), fix cleanup (line 180)
4. **orchestrator.js** — fix 2 querySelector calls, remove `homeIntro.skip()` call
5. **home-intro.js** — add document fallback to 3 queries
6. **Test** — fresh load, home→case→home, home→about→home, verify dial works on all

---

## Verification

1. **Fresh load (home):** Dial renders, IDLE→ACTIVE→ENGAGED transitions work, video plays
2. **Home → Case:** `dial_layer-fg` expands to case study view, video continues
3. **Case → Home:** Dial shrinks back, fg layer returns to circular, sector switching works
4. **Home → About → Home:** Dial survives round-trip, no stale listeners
5. **Check:** No console errors on any transition
6. **Check:** `dial_layer-fg` is never destroyed/recreated — same DOM node persists

---

## Files Modified

| File | Changes |
|---|---|
| `ready-hit-play.css` | ~13 selector updates (wrap with `:has()` on `[data-barba="wrapper"]`) |
| `work-dial.js` | `fgWrap` query fix (line 145), cleanup fix (line 180) |
| `orchestrator.js` | 2 querySelector fixes, remove `homeIntro.skip()` (3 lines) |
| `home-intro.js` | 3 querySelector fallback additions |
