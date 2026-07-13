# Spec: "Read full bio" modal — iOS fix

**Date:** 2026-07-13
**Page:** https://www.dejonghemorley.com/ (Home)
**Status:** Deployed & verified on live site (2026-07-13). Awaiting client real-device sign-off (iPhone Safari + Chrome).

## Symptom
Client reported the two "Read full bio" links did nothing on iPhone (Safari **and** Chrome).
On the client's screen recording, tapping made the **page jump to the top**. Not reproducible
on desktop or in Chrome's mobile emulator.

## Root cause
The bio links were `<a href="#">` whose only open mechanism was a **Webflow IX2 click
interaction**. IX2's runtime is delivered via an obfuscated-path async script
(`/wvxwa3jtwetc…/…`) — exactly the kind of resource iOS content/tracking blockers drop.
When that script is blocked (or fails to init on WebKit), the IX2 click handler never binds,
so nothing calls `preventDefault()` and the browser follows the anchor's native `href="#"`
→ **jump to top**. Fails identically in iOS Safari and Chrome because both are WebKit + share
the blocker. Works for the dev / in a clean emulator because IX2 runs there.

### Ruled out (with evidence)
- Mobile breakpoint disabled — IX2 `mediaQueries` = `["main","medium","small","tiny"]` (all on).
- Overlay intercepting the tap — `elementFromPoint` at the link = the link itself.
- iOS first-tap-hover swallow — no hover styles/interactions on the link.
- Server-side UA variation — iPhone vs desktop HTML byte-identical.

## Modal DOM (for reference)
- Trigger: `.text-style-link` with text "Read full bio" (was `<a href="#">`, now `<p>`).
- `nextElementSibling` = `.modal2_component` (fixed, full-viewport, z-index 99, starts `display:none`).
  - `.modal2_content-wrapper` — slide-in panel; initial `transform: translate3d(100%,0,0)` (parked off right).
  - `.modal2_background-overlay` — dim layer; initial `opacity:0`.
  - `.modal2_close-button` — close control.
- `fs-scrolldisable-element="when-visible"` on the modal (Finsweet body-scroll lock).

## Fix
Self-contained vanilla-JS embed placed in the **page's own** Before-`</body>` custom code
(served from the normal Webflow page, not the blockable third-party bundle). It:
- binds `click` directly on the bio triggers (reliable on iOS),
- `preventDefault()` + `stopPropagation()` (kills any jump-to-top; prevents IX2 double-fire where IX2 does run),
- slides `.modal2_content-wrapper` in and fades `.modal2_background-overlay`,
- locks body scroll; wires close button, overlay-tap, and Esc.

Snippet: `bio-modal-embed.html` (this folder).

### Belt-and-braces mitigation applied by client
Bio trigger changed from `<a href="#">` to `<p>` — removes the native jump-to-top even if the
script ever fails to load. **Caused a selector regression:** the first snippet matched
`a.text-style-link` (0 matches against the `<p>`). Corrected selector matches `.text-style-link`
on any tag.

## Trigger selector — final
Uses a custom attribute **`data-link="bio-open"`** on each "Read full bio" element
(tag/class/text-agnostic). Selector: `document.querySelectorAll('[data-link="bio-open"]')`.

Selector history: original snippet matched `a.text-style-link` (0 matches once trigger became `<p>`)
→ interim `.text-style-link` → interim `[data-link="bio"]` → final `[data-link="bio-open"]`.

## Verification
Chrome DevTools MCP, iPhone emulation (390×844, touch), **IX2 neutralised** (bio triggers cloned
to strip IX2 listeners) to simulate the client's blocked-runtime device:

| Condition | Result |
|---|---|
| Published `a.text-style-link` selector | modal `display:none` — broken |
| Final `[data-link="bio-open"]` selector | matched 2; both panels slide in (on-screen); overlay opacity 1; **scrollJump 0**; Esc/close restore scroll |

**Live deployment check (2026-07-13):** page source confirms `data-link="bio-open"` on both triggers
+ full embed in Before-`</body>`. On the live page both bios open via the deployed script
(`data-bio-open="true"` marker set — IX2 never sets it), panel on-screen, overlay opacity 1,
scrollJump 0, body locked, close restores scroll. ✅

**Outstanding:** client to confirm on a real iPhone (Safari + Chrome).

## Action required (Webflow)
1. On each "Read full bio" element: Element settings → Custom attributes → add `data-link` = `bio`.
2. Replace the Before-`</body>` embed with `bio-modal-embed.html` (selects `[data-link="bio-open"]`).
3. Publish; client retests on a real iPhone.
