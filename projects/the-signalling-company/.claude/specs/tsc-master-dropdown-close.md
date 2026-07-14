# TSC — Close nav dropdown on `.master_dropdown` background click

**Slug:** `tsc-master-dropdown-close`
**Client:** The Signalling Company
**Date:** 2026-07-14
**Author:** plan (Opus)
**Status:** Ready to Build
**File touched:** `projects/the-signalling-company/init.js` (single new function + one `boot()` call)

---

## 1. Summary

On the desktop nav mega-menu, clicking inside a `.master_dropdown` panel **on any
area that is not a child link** should close its parent Webflow dropdown. Clicking a
child link (`<a>`) must continue to navigate as normal. This gives the open mega-menu
a "click the panel background to dismiss" behaviour without affecting link clicks.

## 2. Requirements (confirmed with user)

| # | Decision | Answer |
|---|----------|--------|
| R1 | What triggers close | **Any non-link area** inside `.master_dropdown` — i.e. a click whose target is not (and is not inside) a child `<a>`. Child links navigate normally. |
| R2 | Scope | **Desktop only** — only `.master_dropdown` instances inside `.nav-menu-dektop`. Mobile-menu duplicates (`.wrap_mobile-menu`) are excluded. |

## 3. Live DOM (verified 2026-07-14 on `tsc-v2.webflow.io`, viewport 500px)

```
NAV.nav-menu.w-nav-menu
  DIV.nav-menu-dektop                      ← desktop scope gate (note Webflow's typo "dektop")
    DIV.nav_menu-inner
      DIV.wrap_nav-link
        DIV.dropdown.listed.w-dropdown     ← Webflow native dropdown (parent to close)
          DIV.dropdown-toggle.w-dropdown-toggle   ← carries aria-expanded, gets .w--open
          NAV.dropdown-list.w-dropdown-list       ← the list, gets .w--open when open
            DIV.master_dropdown            ← wraps the child link cards (TARGET container)
              A.card_nav-menu  ×N          ← child links (also a.link_nav-client, a.card_nav-menu.is-head)
              [.heading-style-h5 ...]       ← some masters contain a heading; in ≥1 case it is itself an <a>
```

- **10** `.master_dropdown` nodes total (desktop mega-menu + mobile duplicates). Desktop-only
  scope filters to the ones under `.nav-menu-dektop`.
- Webflow native dropdown: `window.Webflow` present; open state = `.w--open` on both
  `.w-dropdown-toggle` and `.w-dropdown-list`, plus `aria-expanded="true"` on the toggle.
- Some `.master_dropdown` children that *look* like headings are actually `<a>`
  (`heading-style-h5 text-color-blue`). The `e.target.closest('a')` guard treats those
  correctly as links (they navigate; they do not close).

## 4. Existing patterns to reuse (from `init.js`)

- Module style: plain named function inside the IIFE, invoked from `boot()`. No exports.
- `DEBUG && console.warn(...)` for any diagnostics (no bare `console.log`).
- Idempotency via a `dataset` guard flag (see `data-video-processed`, `data-author-split`).
- Existing nav helper `moveNavSeeAll()` already operates on `.w-dropdown-list` — same DOM family.
- **No Barba, no GSAP** active in this project.

## 5. Approach (single, right-sized)

This is a Low-complexity, single-file addition — no competing architectures worth a
3-agent exploration. One delegated click listener, added once at boot.

**`bindMasterDropdownClose()`** — attach **one** delegated `click` listener on `document`
(not per-node: CMS/Finsweet-safe, survives re-render, no per-element bookkeeping). On each click:

```js
function bindMasterDropdownClose() {
  if (document.documentElement.dataset.masterDropdownClose) return; // idempotent guard
  document.documentElement.dataset.masterDropdownClose = 'true';

  document.addEventListener('click', (event) => {
    const master = event.target.closest('.master_dropdown');
    if (!master) return;                                   // click outside any master panel
    if (!master.closest('.nav-menu-dektop')) return;       // R2: desktop scope only
    if (event.target.closest('a')) return;                 // R1: child link → let it navigate

    const dropdown = master.closest('.w-dropdown');
    if (!dropdown) return;
    closeWebflowDropdown(dropdown);
  });
}
```

**`closeWebflowDropdown(dropdown)`** — deterministic manual close (the pervasive, timing-free
Webflow pattern), keeping ARIA correct and dropping focus so it can't visually re-trigger:

```js
function closeWebflowDropdown(dropdown) {
  const toggle = dropdown.querySelector('.w-dropdown-toggle');
  const list = dropdown.querySelector('.w-dropdown-list');
  if (list) list.classList.remove('w--open');
  if (toggle) {
    toggle.classList.remove('w--open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.blur();
  }
}
```

Add `bindMasterDropdownClose();` to `boot()` alongside the other utilities.

**Why delegated, not per-master listeners:** one listener, no leaks, works if the nav
re-renders, and the `document.documentElement` dataset guard makes a second `boot()` a no-op.

## 6. KEY RISK — open trigger (tap vs hover) — resolve at build

During planning I could only probe at a 500px viewport (desktop toggle 0-size). A synthetic
**hover** (`mouseenter`) flipped the dropdown to open in that probe. If these dropdowns are
configured **Open on: hover** in the Webflow Designer, a click-to-close will be immediately
undone by the pointer still resting over the panel (re-hover reopens).

**Build MUST first confirm the open trigger on a real desktop viewport (≥1440px):**
- If **tap/click to open** (expected, since "click background to dismiss" only makes sense then):
  the manual close in §5 is sufficient.
- If **hover to open**: manual class-strip alone will visually reopen on next mousemove. In that
  case escalate — either (a) this feature is moot (hover-out already closes it), or (b) add a
  short suppression window / pointer-leave coordination. **Stop and flag to user before building
  the hover path** — do not silently ship a class-strip that reopens.

Secondary risk: stripping `.w--open` could desync Webflow's internal open flag so the *next*
open needs a double-click. Verify reopen works in one click during build (Tier 1 test T4).

## 7. Barba Impact

**N/A — no Barba transitions.** TSC is a standard Webflow site (no `[data-barba]`, no SPA
navigation). The single delegated listener lives on `document` for the page lifetime; there is
no init/destroy lifecycle to hook. The idempotent guard prevents a duplicate listener if `boot()`
ever runs twice.

## 8. Files & tasks

| Task | File | Agent | Est |
|------|------|-------|-----|
| T-1 Implement `bindMasterDropdownClose()` + `closeWebflowDropdown()`, wire into `boot()` | `projects/the-signalling-company/init.js` | code-writer | 20 min |
| T-2 Build-time: confirm open trigger (tap/hover) on desktop viewport; run Tier 1 tests | (verify) | qa | 15 min |

### Parallelisation Map
- **Sequential.** T-2 gates on T-1; T-1 is a single function in one file. No parallel streams,
  no worktrees, no agent teams. Total ≈ 35 min single-stream.

### ADR
- None required. Additive, reversible, single-file, no cross-project pattern change.

## 9. Test Plan (3 tiers)

### Tier 1 — Auto: Playwright local (`tests/acceptance/tsc-master-dropdown-close.spec.js`)
Runs against `STAGING_URL` (defaults to `https://tsc-v2.webflow.io`) at desktop viewport 1440×900.
1. **T1 no console errors** on `/` after nav interaction.
2. **T2 background click closes** — open a desktop dropdown, click the `.master_dropdown` panel
   on a non-link area → `.w-dropdown-list` loses `.w--open` and toggle `aria-expanded="false"`.
3. **T3 child link still navigates** — with a dropdown open, a child `<a>` retains its `href` and
   is not intercepted (assert the click is not `defaultPrevented`; dropdown-close does not fire for links).
4. **T4 reopen in one click** — after a background-click close, one click on the toggle reopens
   the dropdown (guards against Webflow internal-state desync).
5. **T5 desktop scope only** — a `.master_dropdown` inside `.wrap_mobile-menu` is not affected
   (its close handler is a no-op because it fails the `.nav-menu-dektop` gate).

### Tier 2 — Auto: CDN regression (`/deploy`)
- Register `tsc-master-dropdown-close` in `tests/registry.json` (`testPages`, `type: acceptance`,
  `source: plan`, `critical: false`). Runs post-CDN-hash on deploy.

### Tier 3 — Manual (can't be automated)
- **Feel / real pointer:** on a real desktop browser, open a mega-menu, click the gap between
  cards → panel dismisses cleanly; clicking a card still navigates. (Playwright synthetic clicks
  can't fully validate the tap-vs-hover interplay of §6.)
- **Cross-browser:** Safari + Firefox dropdown close (Playwright is Chromium only).
- **Hover-config check (§6):** manually confirm in the Webflow Designer / live desktop whether the
  dropdown opens on tap or hover — this decides whether §5 is sufficient or §6(b) is needed.

## 10. Verify Loop

**a. Pass/fail criteria (observable):**
- After opening a desktop dropdown and clicking a non-link area of `.master_dropdown`:
  `document.querySelector('.dropdown.w-dropdown .w-dropdown-list').classList.contains('w--open') === false`
  AND the toggle's `aria-expanded === "false"`.
- Clicking a child `<a>` of `.master_dropdown` does **not** close via this handler and the link
  navigates (URL changes / `href` honoured).
- No new console errors on `/`.

**b. Reproduction steps:**
1. Viewport ≥ 1440px. Go to `https://tsc-v2.webflow.io/`.
2. Click a nav dropdown toggle (e.g. the "listed"/"clients" dropdown) to open the mega-menu.
3. Click empty panel area inside `.master_dropdown` (a gap between cards) → dropdown closes.
4. Reopen; click a child link card → navigates normally.
5. Reopen once more with a single toggle click (T4).

**c. Tier mapping:** T2/T3/T4/T5 above are Tier 1 (Playwright). Registry entry is Tier 2.
Tap-vs-hover confirmation, cross-browser, and real-pointer feel are Tier 3 manual.

**d. Regression scope (must NOT break):**
- `moveNavSeeAll()` and other nav behaviour on `.w-dropdown-list`.
- Mobile menu (`.wrap_mobile-menu`) dropdowns — unaffected (out of scope).
- Normal link navigation from every `.master_dropdown` child link.
- No Barba (N/A). No persistent listener leak (single guarded `document` listener).

**Self-check:** `/build` knows this works when Tier 1 T2–T5 pass on desktop viewport AND §6's
open-trigger is confirmed as tap (or §6(b) path is explicitly chosen with the user).

## 11. Acceptance Tests (index)
Machine-runnable: `tests/acceptance/tsc-master-dropdown-close.spec.js`
- `no console errors on homepage`
- `background (non-link) click closes the desktop dropdown`
- `child link click does not close and still navigates`
- `dropdown reopens in a single toggle click after background close`
- `mobile-menu master_dropdown is out of scope (desktop-only)`
