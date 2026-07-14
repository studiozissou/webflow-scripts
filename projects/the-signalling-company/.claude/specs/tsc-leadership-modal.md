# TSC Leadership Team Modal — vanilla-JS rebuild

**Slug:** `tsc-leadership-modal`
**Project:** the-signalling-company
**Type:** feature
**Status:** Ready to Build
**Created:** 2026-07-14
**Author:** planning session (Opus)

---

## 1. Summary

The `/leadership` page has 8 `.card_team` cards. Each card contains a nested
`.modal2_component` (a full-screen slide-in modal with the person's name, role,
and bio). Today these open/close via two Webflow **IX2** interactions:

- **Open** — `MOUSE_CLICK` on `.card_team` → action list **`a-146`**
- **Close** — `MOUSE_CLICK` on `.modal2_background-overlay` → action list **`a-147`**

We are rebuilding both in vanilla JS inside `init.js` so the interaction no
longer depends on Webflow's IX2 runtime, and adding accessibility the Webflow
version lacks (focus management, ESC, scroll-lock, ARIA). This mirrors the
already-shipped, client-verified `projects/dejonghe-morley` bio-modal rebuild,
which uses the same `.modal2_*` class family.

## 2. Exact behaviour to reproduce (extracted live from IX2, 2026-07-14)

From `Webflow.require('ix2').store.getState().ixData` on the live page:

**`a-146` (open):**
| target | property | from → to | duration | easing |
|---|---|---|---|---|
| `.modal2_component` | display | none → flex | 0 | — |
| `.modal2_content-wrapper` | transform translateX | 100% → 0% | 500ms | **outQuad** |
| `.modal2_background-overlay` | opacity | 0 → 1 | 500ms | **ease** |

**`a-147` (close):**
| target | property | from → to | duration | easing |
|---|---|---|---|---|
| `.modal2_content-wrapper` | transform translateX | 0% → 100% | 500ms | **outQuad** |
| `.modal2_background-overlay` | opacity | 1 → 0 | 500ms | **ease** |
| `.modal2_component` | display | flex → none | 0 (after) | — |

**Easing mapping (Webflow preset → CSS cubic-bezier):**
- `outQuad` → `cubic-bezier(0.25, 0.46, 0.45, 0.94)`
- `ease` → `ease`

These are the exact end-states already baked as inline styles in the published
markup (`translate3d(100%,0,0)` on the wrapper, `opacity:0` on the overlay,
`display:none` on the component), which confirms the extraction.

## 3. Confirmed DOM structure (live, `/leadership`)

```
.card_team[data-w-id]                      ← OPEN trigger (whole card)
  .image-wrap_team[data-w-id]
    img.image_cover.parallax               ← hover-zoom target (KEEP its IX2)
  .text-wrap_team-card
    .heading-style-h5                       (name)
    .text-size-regular                      (role)
  .modal2_component            [display:none]        ← the modal (nested in card)
    .modal2_content-wrapper    [transform:translateX(100%)]
      .max-width-large.align-center
        h2.heading-style-h2                 (name)
        .spacer-xsmall
        p.text-size-medium                  (role)
        .w-richtext                         (bio)
    .modal2_background-overlay[data-w-id] [opacity:0]   ← CLOSE trigger
```

- **8 cards**, each with its own nested modal.
- The overlay is a **sibling** of the content-wrapper, **inside** the component,
  which is itself **inside** the card. This nesting is the core gotcha — see §5.

## 4. Approach (chosen)

- **Neutralise IX2:** the user **deletes the two IX2 interactions** (card-click
  open + overlay-click close) in the Webflow Designer and publishes. The card
  **hover-zoom** interaction (`a-105`/`a-106` on `.image_cover`) is left intact.
  → No runtime interception needed; JS is the sole driver.
- **Location:** one named function `bindLeadershipModals()` inside the existing
  `init.js` IIFE, invoked from `boot()` — the TSC house convention (mirrors
  `bindMasterDropdownClose()`). Self-scopes to the leadership page via
  `if (!document.querySelectorAll('.card_team').length) return;`.
- **Closed-state CSS (page head):** once the IX2 interactions are deleted,
  Webflow stops baking the `display:none` / `translateX(100%)` / `opacity:0`
  initial styles into the markup, so the modals would flash **open** on load
  before the CDN-deferred `init.js` runs. A tiny CSS block added to the
  **leadership page head** (currently empty) enforces the closed state
  immediately, with no flash. `init.js` also resets these defensively on init.
- **Accessibility (full):** `role="dialog"` + `aria-modal="true"` +
  `aria-labelledby` on the content-wrapper, focus moved into the dialog on open,
  **focus trap** on Tab/Shift+Tab, **ESC** to close, **body scroll-lock**, and
  **focus return** to the originating card on close.
- **Reduced motion:** `prefers-reduced-motion: reduce` collapses duration to 0ms
  (modal still fully functional, just no slide/fade).

### Approaches considered (not chosen)
- **Runtime IX2 interception (capture-phase `stopPropagation`)** — avoids the
  Designer step but is fragile on the "click card directly vs a child" edge case
  and risks disturbing the hover-zoom. Rejected in favour of the clean deletion.
- **Standalone page embed** (like dejonghe-morley) — isolated but outside the
  repo's `init.js`/jsDelivr deploy flow. Rejected to keep one deploy surface.

## 5. Key gotcha — nested trigger/close

Because `.modal2_component` is a **descendant** of `.card_team`, a click on the
overlay bubbles up to the card. Without care, closing would immediately re-open.
The delegated handler resolves clicks in strict order:

1. `e.target.closest('.modal2_background-overlay')` → **close** + `stopPropagation()`
2. else `e.target.closest('.modal2_component')` → **ignore** (click landed on
   modal content; not a close, not an open)
3. else `e.target.closest('.card_team')` → **open**

## 6. Implementation — `bindLeadershipModals()` (for `init.js`)

Insert the function among the other named functions and call it from `boot()`
immediately after `bindMasterDropdownClose();` (line ~693).

```js
/* ============================================================
 * Leadership team modal (replaces Webflow IX2 a-146 / a-147)
 * ------------------------------------------------------------
 * /leadership has 8 .card_team cards, each with a nested
 * .modal2_component (content-wrapper + full-screen overlay).
 * The IX2 click interactions that drove these were removed in the
 * Designer; this reproduces them 1:1 — 500ms slide (outQuad) +
 * 500ms overlay fade (ease) — and adds a11y: role=dialog, focus
 * trap, ESC, scroll-lock, focus-return. Reduced motion → 0ms.
 * Closed-state defaults are enforced by page-head CSS so there is
 * no flash before this CDN-deferred script runs; JS also resets
 * them defensively on init.
 * ============================================================ */
function bindLeadershipModals() {
  const cards = document.querySelectorAll('.card_team');
  if (!cards.length) return;                          // scope: leadership only
  if (document.documentElement.dataset.tscLeadershipModals) return;
  document.documentElement.dataset.tscLeadershipModals = 'true';

  const SLIDE = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'; // Webflow "outQuad"
  const FADE  = 'ease';                                  // Webflow "ease"
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DUR = REDUCED ? 0 : 500;

  let active = null;      // currently open .modal2_component
  let trigger = null;     // .card_team that opened it (for focus return)
  let closeTimer = null;

  const parts = (modal) => ({
    wrap: modal.querySelector('.modal2_content-wrapper'),
    overlay: modal.querySelector('.modal2_background-overlay'),
  });

  const focusables = (wrap) => wrap.querySelectorAll(
    'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])'
  );

  function prep(modal) {
    const { wrap, overlay } = parts(modal);
    modal.setAttribute('aria-hidden', 'true');
    modal.style.display = 'none';
    if (wrap) {
      wrap.setAttribute('role', 'dialog');
      wrap.setAttribute('aria-modal', 'true');
      wrap.setAttribute('tabindex', '-1');
      const h = wrap.querySelector('h1,h2,h3,.heading-style-h2');
      if (h) {
        if (!h.id) h.id = 'tsc-modal-title-' + Math.random().toString(36).slice(2, 8);
        wrap.setAttribute('aria-labelledby', h.id);
      }
      wrap.style.transform = 'translateX(100%)';
      wrap.style.transition = '';
    }
    if (overlay) { overlay.style.opacity = '0'; overlay.style.transition = ''; }
  }

  function snapClosed(modal) {           // instant close (used when switching)
    const { wrap, overlay } = parts(modal);
    if (wrap) { wrap.style.transition = ''; wrap.style.transform = 'translateX(100%)'; }
    if (overlay) { overlay.style.opacity = '0'; }
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  }

  function open(card) {
    const modal = card.querySelector('.modal2_component');
    if (!modal || active === modal) return;
    if (active) snapClosed(active);        // one modal open at a time
    clearTimeout(closeTimer);
    active = modal; trigger = card;
    const { wrap, overlay } = parts(modal);
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    void modal.offsetHeight;               // reflow → transition runs from initial
    if (wrap) { wrap.style.transition = 'transform ' + DUR + 'ms ' + SLIDE; wrap.style.transform = 'translateX(0%)'; }
    if (overlay) { overlay.style.transition = 'opacity ' + DUR + 'ms ' + FADE; overlay.style.opacity = '1'; }
    document.documentElement.style.overflow = 'hidden';   // scroll lock
    if (wrap) wrap.focus({ preventScroll: true });
  }

  function close(modal) {
    if (!modal) return;
    const { wrap, overlay } = parts(modal);
    if (wrap) { wrap.style.transition = 'transform ' + DUR + 'ms ' + SLIDE; wrap.style.transform = 'translateX(100%)'; }
    if (overlay) { overlay.style.transition = 'opacity ' + DUR + 'ms ' + FADE; overlay.style.opacity = '0'; }
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
    const returnTo = trigger;
    active = null; trigger = null;
    closeTimer = setTimeout(function () { modal.style.display = 'none'; }, DUR);
    if (returnTo) returnTo.focus({ preventScroll: true });
  }

  cards.forEach(function (c) {
    const m = c.querySelector('.modal2_component');
    if (m) prep(m);
  });

  document.addEventListener('click', function (e) {
    const overlay = e.target.closest('.modal2_background-overlay');
    if (overlay) { e.stopPropagation(); close(overlay.closest('.modal2_component')); return; }
    if (e.target.closest('.modal2_component')) return;   // click inside open modal content
    const card = e.target.closest('.card_team');
    if (card) open(card);
  });

  document.addEventListener('keydown', function (e) {
    if (!active) return;
    if (e.key === 'Escape') { close(active); return; }
    if (e.key === 'Tab') {
      const wrap = parts(active).wrap;
      if (!wrap) return;
      const f = focusables(wrap);
      if (!f.length) { e.preventDefault(); wrap.focus(); return; }
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
}
```

Wire-up in `boot()`:
```js
bindMasterDropdownClose();
bindLeadershipModals();   // ← add
```

## 7. Closed-state CSS (leadership page head — added via MCP)

The leadership page head is currently **empty**. Add:

```html
<style>
  /* Leadership modal closed-state — prevents flash before init.js (CDN) runs.
     Replaces the initial state Webflow IX2 used to bake in, now that the
     card-open / overlay-close interactions are removed. init.js drives the
     open/close transitions. */
  .modal2_component { display: none; }
  .modal2_content-wrapper { transform: translateX(100%); }
  .modal2_background-overlay { opacity: 0; }
</style>
```

Source order (page head is injected after the Webflow stylesheet) gives these
single-class rules precedence over the component's base class styles.

## 8. Deploy — "update the script hash via Webflow MCP"

The `init.js` tag lives in the **site footer** custom code (confirmed):
```
<script src="https://cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@929f758/projects/the-signalling-company/init.js"></script>
```
(no `?v=` param; a jsDelivr `@<commit>` path is immutable, so bumping the hash is
sufficient.)

**Deploy steps (run during `/deploy`, not `/build`):**
1. Commit (`feat(tsc): rebuild leadership modal in JS + a11y`) and **`git push`**.
   ⚠️ Pre-flight: `origin/main` was ~24 commits behind local `HEAD` at plan time —
   confirm the push lands before wiring a new hash (jsDelivr resolves from GitHub).
2. `NEW_HASH = git rev-parse --short HEAD`.
3. **MCP** `data_scripts_tool → set_site_freeform_code` (site `6a32b717a48adbce92029295`,
   `footer`): rewrite the block with `@929f758` → `@<NEW_HASH>` (leave the
   LinkedIn pixel untouched).
4. **MCP** `data_scripts_tool → set_page_freeform_code` (page
   `6a3bee7dc1f94c42e8ce2d7f`, `head`): write the §7 CSS block.
5. **User action in Designer:** delete the two IX2 interactions (card-open +
   overlay-close) on the leadership modal, then **publish** the site
   (or MCP `publish_site` after the user confirms the IX2 deletion is done —
   publishing live content requires explicit approval).
6. Wait ~30s for jsDelivr to index; run the acceptance spec against
   `https://tsc-v2.webflow.io/leadership`.
7. Stamp `tests/registry.json` (`lastDeployed`, `lastDeployedHash`) and commit.

> Ordering note: steps 3–5 must all land in the same publish. If the hash is
> bumped but the IX2 interactions are still present, both drivers run and fight.
> Safest sequence: user deletes IX2 → we set footer hash + page CSS via MCP →
> publish → verify.

**IDs for reference:**
- Site: `6a32b717a48adbce92029295`
- Leadership page: `6a3bee7dc1f94c42e8ce2d7f`
- Current deployed hash: `929f758`

## 9. Barba impact

**N/A — no Barba transitions.** TSC is a static Webflow site with no SPA
navigation. The two delegated listeners (`click`, `keydown`) live on `document`
for the page lifetime; the idempotency guard
(`document.documentElement.dataset.tscLeadershipModals`) prevents double-binding
if `boot()` ever runs twice. No init/destroy lifecycle required.

## 10. Verify loop

### a. Pass/fail criteria
- **On load:** every `.modal2_component` is `display:none` (not visible); no
  console errors; `documentElement` overflow is not `hidden`.
- **Open (click a `.card_team`):** after ~600ms its `.modal2_content-wrapper`
  computed transform ≈ `translateX(0)` (matrix with tx≈0), `.modal2_background-overlay`
  opacity ≈ 1, component `display:flex`, `aria-hidden="false"`, `documentElement`
  overflow `hidden`, and focus is inside the content-wrapper.
- **Close (click `.modal2_background-overlay`):** after ~600ms the component is
  `display:none`, `aria-hidden="true"`, overflow restored, and focus returns to
  the originating card.
- **ESC:** with a modal open, pressing Escape closes it (same end-state as above).
- **ARIA:** content-wrapper has `role="dialog"`, `aria-modal="true"`, and an
  `aria-labelledby` pointing at the name heading.
- **Reduced motion:** with `prefers-reduced-motion: reduce`, open/close still
  reach the correct end-state (functional), effectively instant.
- **No double-fire / re-open:** clicking the overlay closes and does **not**
  re-open the card's modal.

### b. Reproduction steps
1. Navigate to `https://tsc-v2.webflow.io/leadership` (post-deploy).
2. Wait for load (network idle + ~1s for Webflow init).
3. Click the first `.card_team`; wait 700ms; assert open state.
4. Click `.modal2_background-overlay`; wait 700ms; assert closed state.
5. Re-open; press `Escape`; wait 700ms; assert closed.
6. Reload with reduced-motion emulation; open/close; assert functional.

### c. Tier mapping
- **Tier 1 (auto, Playwright):** all of §11 — DOM/CSS/ARIA/scroll-lock/ESC/
  reduced-motion/console assertions. Runs during `/build` (Playwright MCP ad-hoc)
  and `/deploy` (spec file).
- **Tier 2 (auto, CDN regression):** `tsc-leadership-modal` registered in
  `tests/registry.json`; runs on `/deploy` against the live CDN.
- **Tier 3 (manual):**
  - Slide/fade **feel** — subjective easing match vs the old IX2 (visual).
  - **Safari / Firefox** — Playwright is Chromium-only; verify transitions and
    focus behaviour cross-browser.
  - **Real touch device** — tap-to-open, overlay-tap-to-close, and that the
    hover-zoom still behaves on touch.
  - **Screen reader** (VoiceOver) — dialog is announced, focus trap holds.

### d. Regression scope (must NOT break)
- Card **hover-zoom** (`.image_cover` scale, IX2 `a-105`/`a-106`) still works.
- Other leadership-page IX2 (scroll-in reveals, timeline) unaffected.
- No new console errors on any page (function no-ops off `/leadership`).
- Site-wide `init.js` features (video hydration, dropdown close, Spline) unchanged.

## 11. Acceptance tests (`tests/acceptance/tsc-leadership-modal.spec.js`)

1. **no console errors** on `/leadership` load.
2. **modals hidden on load** — every `.modal2_component` not visible.
3. **click card opens modal** — wrapper translateX≈0, overlay opacity≈1,
   component visible, `aria-hidden="false"`.
4. **overlay click closes modal** — component hidden, `aria-hidden="true"` after
   the transition; does **not** re-open.
5. **ESC closes modal**.
6. **body scroll-lock** — `documentElement` overflow `hidden` while open,
   restored on close.
7. **focus management** — focus enters the dialog on open; returns to the card
   on close.
8. **ARIA roles** — `role="dialog"` + `aria-modal="true"` + `aria-labelledby`
   present on the content-wrapper.
9. **prefers-reduced-motion** — modal still opens and closes correctly.

## 12. Parallelisation map

Single-stream, single-file feature (`init.js` + one page-head CSS block + one
test file). **No parallelisation, no worktrees, no agent teams.** Sequential:

| Task | Agent | Gates |
|---|---|---|
| T1 Implement `bindLeadershipModals()` + wire into `boot()` | code-writer | — |
| T2 Verify (Playwright MCP against staging) | qa | T1, + user's IX2 deletion + deploy |
| T3 Deploy: push, MCP footer-hash swap + page-head CSS, publish, regression | (deploy flow) | T2 |

T2 depends on an **external human step** (user deletes the two IX2 interactions
in Designer and publishes) — flagged so `/build` doesn't treat a red staging
test as a code failure before that step is done.

## 13. Open risks
- **IX2 deletion is manual** and not MCP-scriptable — the whole plan assumes the
  user removes the two interactions. If they can't, fall back to the runtime
  capture-phase interception approach (§4, not chosen).
- **`origin/main` behind local** — must push before the jsDelivr hash resolves.
- **Overlay z-order** — assumes `.modal2_background-overlay` sits above the
  content in the closed→open flow so overlay clicks land on the overlay (Webflow
  default for Modal 2). Verify during build.
