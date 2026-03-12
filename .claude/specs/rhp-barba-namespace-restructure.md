# Spec: Restructure Barba namespace layout for seamless home ↔ work transitions

**Client**: ready-hit-play
**Status**: Ready to Build
**Created**: 2026-03-12

## Problem
The dial component (videos, ticks, layers) is currently INSIDE the Barba container. When Barba swaps containers on navigation, the entire dial gets destroyed and recreated — causing video flash, loss of playback state, and the morph animation running after the swap instead of during it.

## Goal
Move the dial and videos outside the Barba swap zone so they persist across transitions. The Barba container sits inside `dial_layer-fg`, swapping only the page-specific content (home UI vs case study content).

## Scope
- Webflow HTML restructure (manual, in Designer)
- CSS changes (namespace-based visibility, video sizing)
- JS changes in `projects/ready-hit-play/global.js` (dev site)

---

## Target DOM structure

### Home page
```
body
└── page-wrapper
    ├── Global Styles, Cursor, Nav, Contact Pullout (symbols — persist)
    ├── dial_layer-bg (embed — persists)
    └── main-wrapper
        └── section_home
            ├── H1 visually-hidden
            └── dial_component [data-dial-ns="home"]  ← set in HTML, JS updates on transition
                ├── case-homepage-link                 ← persists (hidden on home, shown on work)
                ├── heading-style-h7                   ← persists (shown on home, hidden on work)
                ├── dial_layer-ticks                   ← persists (shown on home, hidden on work)
                ├── dial_layer-fg                      ← persists, morphs circle↔rect
                │   ├── dial_work-link                 ← persists (shown on home, hidden on work)
                │   ├── dial_video-wrap                ← persists (video never destroyed)
                │   └── [data-barba="container"]       ← SWAP ZONE
                │       └── ns=home: (empty or minimal home-only content)
                ├── dial_layer-ui                      ← persists (fades out home→work, fades in work→home)
                │   └── dial_label-wrap
                │       ├── H2 dial_label-title
                │       └── T dial_label-meta
                └── dial_cms-list-wrapper              ← persists (hidden, data source only)
    └── About Transition (symbol — persists)
```

### Work page (identical outer shell, `data-dial-ns="work"` set in HTML)
Only the barba-namespace content differs:
```
[data-barba="container"]
└── ns=work
    └── case-studies_wrapper             ← Lenis scrollable
        ├── section_case-video.is-header ← spacer (persistent video shows through)
        ├── section_case-title
        ├── section_case-intro
        ├── ... (remaining case sections)
        └── section_case-close
```

### About/contact pages (after Barba swap)
```
[data-barba="container"]
└── ns=about (or ns=contact)
    └── page content with:
        position: fixed; inset: 0; z-index: above dial; overflow-y: auto;
```

---

## Key design decisions

### 1. Identical outer shells on both Webflow pages
Both home and work pages have the same elements outside the Barba container. `data-dial-ns` is set in HTML on each page (`"home"` or `"work"`), so CSS works on direct-land with no flash. JS updates the attribute during Barba transitions.

### 2. Element visibility by namespace

| Element | Home | Work | Method |
|---------|------|------|--------|
| `dial_layer-ui` (labels) | shown | hidden | GSAP fade out in `leave()`, fade in on return |
| `dial_work-link` | shown | hidden | `visibility: hidden` + `pointer-events: none` (no animation) |
| `dial_layer-ticks` | shown | hidden | CSS `display: none` via `data-dial-ns` |
| `heading-style-h7` | shown | hidden | CSS `display: none` via `data-dial-ns` |
| `case-homepage-link` | hidden | shown | CSS via `data-dial-ns` |
| `dial_cms-list-wrapper` | hidden | hidden | Always hidden (data source only) |

CSS rules on `dial_component`:
```css
.dial_component[data-dial-ns="work"] .dial_layer-ticks { display: none; }
.dial_component[data-dial-ns="work"] .dial_work-link { visibility: hidden; pointer-events: none; }
.dial_component[data-dial-ns="work"] .heading-style-h7 { display: none; }
.dial_component[data-dial-ns="home"] .case-homepage-link { display: none; }
```
Note: `dial_layer-ui` is NOT toggled via CSS — it uses GSAP fade so it animates smoothly during transitions.

### 3. dial_work-link updates from CMS data
On home, JS updates `dial_work-link` href to the active case study URL. The existing `goToActiveCase` logic reads `data-url` from the active CMS item and sets the link href, replacing the old `dial_layer-fg` click handler.

### 4. Video sizing on work pages
The persistent `dial_video-wrap` resizes when transitioning to work so the case title peeks above the fold. Existing CSS pattern:
```css
min-height: calc(var(--dial-case-height) - 140px);
```
During home→work `leave()`:
1. `dial_layer-fg` morphs from circle to rectangle (GSAP)
2. `dial_video-wrap` animates from `100%` height to `calc(100% - 140px)` or similar
3. The remaining 140px is where `section_case-title` appears from namespace content

### 5. Dial ticks canvas — lazy init on return
The canvas element persists (identical shell) but the dial module (`RHP.workDial`) is destroyed on work pages. No RAF loop runs while browsing a case study. When work→home `leave()` fires:
1. Unhide `dial_layer-ticks` (opacity 0)
2. Call `RHP.workDial.init()` — draws one frame of ticks
3. Fade in ticks + morph rect→circle simultaneously

Direct-land on work: dial not initialized at all. Only inits when user navigates home.

### 6. About/contact pages
Content uses `position: fixed; inset: 0` to visually escape the dial. The about-transition overlay (already outside Barba) handles the visual transition. Dial is hidden underneath.

### 7. Barba wrapper placement
`[data-barba="wrapper"]` wraps just `[data-barba="container"]` inside `dial_layer-fg`. Minimum Barba requirement.

---

## Implementation steps

### Step 1 — Webflow HTML changes (manual, in Designer)
1. Add `data-dial-ns="home"` on `dial_component` on home page
2. Add `data-dial-ns="work"` on `dial_component` on work page
3. Move `[data-barba="container"]` from wrapping `main-wrapper` to inside `dial_layer-fg`
4. Ensure `dial_video-wrap` is outside the Barba container (sibling inside `dial_layer-fg`)
5. Ensure `dial_work-link` is outside the Barba container (sibling inside `dial_layer-fg`)
6. Ensure work page has identical outer shell (all dial elements present)
7. On work page, put `case-studies_wrapper` inside the Barba container
8. Remove or hide old `section_case-video` — the persistent `dial_video-wrap` replaces it

### Step 2 — CSS changes
- Namespace-based visibility rules (see table above)
- Video sizing for work view (`dial_video-wrap` height calc)
- `position: fixed; inset: 0` rules for about/contact namespace content

### Step 3 — JS changes in `global.js`
1. **Barba `leave()` hook** (async): Animate `dial_layer-fg` morph (circle↔rect) + video resize + fade out `dial_layer-ui`. Update `data-dial-ns` attribute. Runs BEFORE DOM swap.
2. **Barba `afterEnter()`**: Init Lenis on `case-studies_wrapper` for work. No dial morph animation needed (already ran in leave).
3. **Remove old dial morph** from `afterEnter` (current lines 792-886).
4. **Move view destroy** from `beforeLeave` to end of `leave()`.
5. **Boot/direct-land**: Detect namespace on page load, read `data-dial-ns` from HTML. If work, set dial to expanded state via `gsap.set()`, start Lenis. If home, init dial normally.
6. **dial_work-link href**: Update in `applyActive()` — when active CMS item changes, set `dial_work-link.href` to the item's `data-url`.
7. **Work→home `leave()`**: Re-init `RHP.workDial`, fade in ticks + `dial_layer-ui`, morph rect→circle.

### Step 4 — Work view scroll setup
New `RHP.views.work` (or rename existing `case` view):
- Unlock scroll
- Start Lenis on `case-studies_wrapper` (inside Barba container)
- Handle Lenis teardown in `destroy()`

---

## Edge cases
- **Direct-land on work**: `data-dial-ns="work"` in HTML, CSS hides ticks/labels/link immediately. JS sets dial to expanded state, starts Lenis. Dial module not initialized.
- **Direct-land on home**: `data-dial-ns="home"` in HTML. Normal dial boot.
- **Direct-land on about**: No dial visible. About content is position:fixed covering viewport.
- **Browser back/forward**: Barba handles popstate. `leave()` runs the reverse animation.
- **Work → about**: Dial shrinks/hides under about-transition overlay, namespace swaps to about content.
- **Resize during work view**: `dial_layer-fg` uses responsive CSS vars, Lenis.resize() called.

---

## Verification
1. Home → work: video plays continuously, dial morphs circle→rect, title visible above fold, labels fade out
2. Work → home: video plays continuously, ticks + labels fade in, dial morphs rect→circle
3. Direct-land home: normal dial boot, no regression
4. Direct-land work: dial expanded, ticks hidden, case content scrollable, video playing
5. Home → about: about-transition overlay works, about content full-screen
6. Work → about: overlay works, about content full-screen
7. Mobile: touch scroll on work, dial interactions on home
8. Video same frame throughout transitions (no reload)
9. `dial_work-link` href updates when hovering different sectors on home

---

## Files
- `projects/ready-hit-play/global.js` — main JS changes
- Webflow Designer — HTML restructure (manual)
- CSS file TBD (inline embed or separate file)
