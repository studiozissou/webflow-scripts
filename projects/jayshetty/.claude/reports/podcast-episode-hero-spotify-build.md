# Build report — podcast-episode-hero-spotify (2026-08-19)

**Result: shipped to jayshetty.webflow.io. All 8 verify-loop checks pass.**
Live copy to the custom domains remains Will's manual step (spec decision 3).

## What shipped (all in Webflow, no repo code)

Page: **Podcasts Template** (`64c133963e40ee8d4e6df725`), published to the
webflow.io subdomain only.

1. **New element** inside `.podcast-hero_background-wrapper`, directly after the
   YouTube embed: plain DOM div `class="podcast-spotify-embed is-hero"` wrapping
   `div.spotify-hero-target`. No Webflow styles, no conditional visibility.
2. **Page head custom code** (appended block `<!-- podcast-episode-hero-spotify -->`):
   CSS — wrapper hidden by default, absolute inset-0 z-index-2 (copied from
   `.podcast-youtube-embed.is-hero`), `.is-active` reveal,
   `.section_podcast-hero.spotify-hero-active { display:block !important }`, and
   gradient `pointer-events:none` when the Spotify hero is active.
3. **Page footer custom code** (appended block): IIFE reads **Youtube ID** and
   **Spotify Link** via `{{wf}}` field tokens, and when YouTube is empty and an
   episode id parses, injects the Spotify **/video** embed iframe and adds the
   activation classes.

## Two deviations from the spec design (behaviour matrix unchanged)

1. **Conditional-visibility rules were left 100% untouched.** The Webflow MCP
   APIs do not expose CMS conditional visibility (read or write), so the spec's
   "remove the section rule + add a rule on the new embed" was replaced by an
   additive approach: the section's own rule still hides it, and a scoped CSS
   class override (`spotify-hero-active`, added by JS only when a Spotify video
   should show) reveals it. Empty-hero episodes need no `:has()` guard — the
   original rule keeps them hidden. Rollback is now a pure delete (see
   `../specs/podcast-episode-hero-spotify-rollback.md`).
2. **Spec fallback shipped instead of the iFrame API** (this was check 2's
   predefined decision point): the API's `createController` rendered the
   **audio card** for this video episode (verified visually during playback),
   while the plain `/embed/episode/{id}/video` URL renders the true full-bleed
   video player. Consequence: **no programmatic `play()`** — the player loads
   ready and starts on one tap, which spec decision 1 already accepted as the
   blocked-autoplay outcome. No Spotify iFrame API loader ships at all, which
   also dissolves the coordination concern with the sibling list-page build.

## Verify loop (Chrome DevTools MCP + Claude-in-Chrome, live on webflow.io)

| # | Check | Result |
|---|---|---|
| 1 | Paris: section visible, Spotify iframe fills wrapper | PASS — display:block, iframe 1265×712 = section size, correct episode id |
| 2 | Video variant renders | PASS — full-bleed video player (after fallback switch; API variant showed audio card) |
| 3 | Autoplay/loaded-ready, no JS errors | PASS — player loads ready, starts on one tap; no errors from new code |
| 4 | Player clickable through gradient | PASS — gradient computed `pointer-events:none`; clicking Play started video playback |
| 5 | Lucy regression (YouTube hero) | PASS — YT iframe loads, section visible, Spotify wrapper display:none, no iframe injected |
| 6 | Neither-field episode hero hidden | PASS — Camila ep 848: section display:none, height 0, no injection |
| 7 | Console clean on all three pages | PASS — only pre-existing site-wide SVG `width/height="auto"` noise (identical on untouched pages) |
| 8 | Mobile 390×844 layout | PASS — 16:9 player 390×219, no horizontal overflow |

**Lighthouse (desktop):** Paris a11y **78** / best-practices **73** vs untouched
Lucy baseline **75 / 73** — WARN band but pre-existing and site-wide; the new
hero does not regress (a11y is 3 points higher than baseline).

## Post-verify polish (Will, 19 Aug)

Spotify's embed has built-in rounded corners (inside the cross-origin iframe, not
restylable). Fixed by oversizing the iframe by 32px with -16px margins inside the
`overflow:hidden` wrapper so the corners fall outside the visible hero, plus
`background:#000` on the wrapper backing any transparent corner pixels.
Verified live: corners flush on desktop.

## Tier 3 — manual checklist (from spec)

- [ ] Audio audible after tapping play (MCP can't hear)
- [ ] iOS Safari + desktop Safari/Firefox: one-tap start feels acceptable
- [ ] Visual: player card + gradient over the hero background (subjective)
- [ ] Copy Designer/custom-code changes to the live domain + publish (Will)

## Notes

- Tier 1 Playwright / Tier 2 registry: N/A for this client (no test infra; code
  lives in Webflow custom code, not the CDN pipeline) — per spec tier mapping.
- Follow-up (spec #2) still open: Spotify-era pages load an empty YouTube iframe
  request (`/embed/?mute=1…`) — hidden but wasted; suppressing it is out of scope.
- The Camila test found episodes newer than 13 Jul 2026 that have **no Spotify
  link at all** (eps 847–848) — those stay hero-less, as designed, but worth
  flagging to Annie alongside spec follow-up #1.
