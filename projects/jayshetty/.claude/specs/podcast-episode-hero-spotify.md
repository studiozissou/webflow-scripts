# Spec — Podcast episode hero: Spotify video with best-effort autoplay

**Client:** jayshetty.me (via Skye High Interactive)
**Page:** Podcast episode CMS template (`/podcast/{slug}`) on https://jayshetty.webflow.io (site ID `64c10a2010e1a379d08bf030`)
**Test episodes:**
- Spotify-era (no YouTube ID): https://jayshetty.webflow.io/podcast/paris-jackson-no-intervention-could-have-gotten-me-sober (Spotify episode `3UDvxSeaqpAvoCKEJZ7wZ3`)
- YouTube-era (regression baseline): https://jayshetty.webflow.io/podcast/lucy-guo-the-fastest-way-to-build-a-business-today-the-1-strategy-that-saves-you-months-of-wasted-work (YouTube `9fCGS4w-z0w`, Spotify `16dTTxfsITtEOt0yWvqFzd`)

**Date:** 2026-08-19
**Sibling spec:** `podcast-dual-platform-inline-player.md` (podcast list page, branch `worktree-jayshetty-podcast-player-spec`). This spec reuses its confirmed decisions: Spotify iFrame API approach, episode-ID regex, webflow.io-only publishing, no repo project dir (all code lives in Webflow custom code).

## Goal

On episode pages the hero is a full-bleed, muted, looping YouTube background video. Episodes from 13 Jul 2026 have no YouTube ID — only a Spotify link — so the whole hero is conditionally hidden and the page opens with no video. When **Spotify Link is set and YouTube ID is empty**, show the Spotify **video** embed in the hero slot and attempt autoplay.

## Current state (verified from live HTML, 19 Aug)

- Hero: `.section_podcast-hero` → `.podcast-hero_background-wrapper` containing a background `img.image-cover`, the HtmlEmbed `.podcast-youtube-embed.is-hero` (iframe `#ytplayer`, `?mute=1&autoplay=1&loop=1&…&enablejsapi=1`), and `.hero-gradient` overlay. A `.scroll-down-wrapper` sits below.
- **No JS controls the hero player** — it's a plain CMS-bound embed; autoplay works only because it's muted.
- Conditional visibility (exact rules to be read in Designer during `/build`): on Spotify-era pages BOTH `.section_podcast-hero` and `.podcast-youtube-embed.is-hero` carry `w-condition-invisible`; the YouTube iframe src renders with an empty ID (`/embed/?mute=1…`) but is hidden.
- CMS has a **Spotify Link** field storing the share URL: `https://open.spotify.com/episode/{22-char id}?si=…` — **not** an embed URL.
- Spotify's own embed code for a video episode (supplied by Will):
  `https://open.spotify.com/embed/episode/{id}/video?utm_source=generator&theme=0` with `allow="autoplay; encrypted-media; fullscreen; picture-in-picture"` — note the **`/video` path suffix** selects the video variant.
- Other scripts on the template: Finsweet v1 `cmsprevnext`, `cmsload`, `scrolldisable`; Swiper; jQuery 3.5.1; misc popups. None touch the hero.

## Decisions (user-confirmed, 19 Aug)

1. **Best-effort autoplay.** Spotify embeds cannot be muted, and browsers block audible autoplay without a gesture. Attempt `controller.play()` on ready; if blocked, the player sits loaded and starts on one tap. (Same caveat already accepted on the list-page spec.)
2. **Fill the hero slot.** Spotify iframe fills `.podcast-hero_background-wrapper` where the YouTube iframe sits; gradient stays.
3. **Designer changes via Webflow MCP** on the episode template; **publish to jayshetty.webflow.io only** — never the custom domains. Live copy is Will's manual step.
4. Approach: **Spotify iFrame API** (only way to call `play()`), consistent with the list-page spec. Approach exploration skipped — the architectural decision was made today on the sibling feature.

## Design

### Behaviour matrix

| YouTube ID | Spotify Link | Hero |
|---|---|---|
| set | any | YouTube muted loop (unchanged) |
| empty | set | **Spotify video embed, best-effort autoplay (new)** |
| empty | empty | No hero (unchanged) |

### 1) Designer changes (episode template)

Webflow conditional visibility is **AND-only** — "YouTube set OR Spotify set" cannot be expressed on the section. So:

a. **Remove** the conditional-visibility rule from `.section_podcast-hero` (record the existing rule first via MCP for rollback).
b. **Keep** `.podcast-youtube-embed.is-hero` visibility as-is (visible when YouTube ID set).
c. **Add** a new HtmlEmbed inside `.podcast-hero_background-wrapper`, sibling of the YouTube embed, class `podcast-spotify-embed is-hero`, conditional visibility: **Spotify Link is set AND YouTube ID is not set** (AND is expressible). Embed content:

```html
<div class="spotify-hero-target" data-spotify-url="{{Spotify Link}}"></div>
```

d. Empty-hero guard: with the section rule removed, episodes with neither field would show a bare background image. Hide it with CSS `:has()` (no JS, no flash — supported in all 2026 browsers):

```css
.section_podcast-hero:not(
  :has(.podcast-youtube-embed.is-hero:not(.w-condition-invisible)),
  :has(.podcast-spotify-embed.is-hero:not(.w-condition-invisible))
) { display: none; }
```

### 2) Template head code additions

```html
<script src="https://open.spotify.com/embed/iframe-api/v1" async></script>
<style>
  /* :has() empty-hero guard from 1d */
  .podcast-spotify-embed.is-hero,
  .podcast-spotify-embed.is-hero iframe { width: 100%; height: 100%; }
  /* Spotify needs clicks; the gradient must not eat them */
  .section_podcast-hero:has(.podcast-spotify-embed.is-hero:not(.w-condition-invisible)) .hero-gradient { pointer-events: none; }
  /* Match the YouTube embed's positioning within the wrapper (copy exact rules from .podcast-youtube-embed.is-hero in Designer during build) */
</style>
```

### 3) Template footer code — one small IIFE

```html
<script>
(function () {
  var DEBUG = false;
  var target = document.querySelector('.podcast-spotify-embed:not(.w-condition-invisible) .spotify-hero-target');
  if (!target) return; // YouTube-era or no-video episode: do nothing

  var m = /episode\/([A-Za-z0-9]+)/.exec(target.getAttribute('data-spotify-url') || '');
  if (!m) { DEBUG && console.log('[hero] no episode id'); return; }
  var episodeId = m[1];

  window.onSpotifyIframeApiReady = function (api) {
    api.createController(target, {
      uri: 'spotify:episode:' + episodeId,
      width: '100%',
      height: '100%'
    }, function (controller) {
      controller.play(); // best-effort: browsers may block audible autoplay
    });
  };
})();
</script>
```

**Fallback (verify during build):** if the iFrame API renders the audio card instead of the **video** variant for video episodes, drop the API and have the IIFE inject a plain iframe instead — src built from the CMS URL as `https://open.spotify.com/embed/episode/{id}/video?utm_source=generator&theme=0`, `allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"` — accepting no programmatic `play()` (player loads ready, user taps once). Decision point is check 2 in the verify loop.

### What is intentionally NOT changed

- YouTube hero embed, its CMS binding, and its visibility rule.
- The podcast **list** page (covered by the sibling spec — separate branch/build).
- Platform link buttons, Finsweet prevnext/load, Swiper, popups.

## Barba Impact

N/A — no Barba on this site. One IIFE per plain page load.

## Parallelisation Map

Single sequential stream — one template page, one embed element, two custom-code blocks. No worktrees/teams/parallel agents. `/build` steps: (1) read current hero visibility rules via MCP (rollback record), (2) add Spotify embed element + remove section rule, (3) head code, (4) footer code, (5) publish to webflow.io, (6) verify loop. code-writer inline; code-reviewer optional.

**Coordination note:** the sibling list-page build touches the same site's custom code (site-wide head?) — both specs add `<script src="https://open.spotify.com/embed/iframe-api/v1">` and both define `window.onSpotifyIframeApiReady`. **If both land, the loader must be included once and the ready callback shared** (episode-page code should append to a callback queue rather than overwrite — check which lands first at build time). Episode template uses page-level head code, so collision only occurs if the list build puts its tag site-wide.

## Verify Loop

**Pages:** the two test episodes above, on jayshetty.webflow.io (subdomain publish only).

**Pass/fail criteria (Chrome DevTools MCP):**
1. Paris page: `.section_podcast-hero` visible; no `w-condition-invisible` on the Spotify embed; an `open.spotify.com/embed` iframe exists inside `.podcast-spotify-embed.is-hero` filling the wrapper.
2. The rendered Spotify embed is the **video** variant (screenshot check; if audio card → switch to the fallback plan above and re-verify).
3. Autoplay attempt made (no JS errors; either playback starts or player is loaded-ready — both pass, per decision 1).
4. Spotify player controls are clickable (gradient not intercepting — click play via MCP, state changes).
5. Lucy page regression: YouTube hero renders and muted-autoplays exactly as production; no Spotify iframe present; no new console errors.
6. An old episode with neither YouTube ID nor Spotify link (find via CMS during build): hero fully hidden (`:has()` guard working).
7. No console errors on load on all three pages (third-party frame warnings acceptable).
8. Mobile viewport (390×844): hero lays out sanely on Paris page.

**Reproduction steps:** load page → wait for network idle → snapshot hero subtree → screenshot → click embed play control → ~1.5s wait → read console.

**Tier mapping:**
- **Tier 1 (auto, MCP ad-hoc):** all eight checks via chrome-devtools MCP. No Playwright — client has no test infra (no `.env.test`, no `package.json`); noted per plan step 8, no `tests/registry.json` entry.
- **Tier 2 (CDN regression):** N/A — code ships in Webflow custom code, not the CDN pipeline.
- **Tier 3 (manual):**
  - Audio actually audible (MCP can't hear).
  - iOS Safari + desktop Safari/Firefox: autoplay likely blocked → confirm one-tap start feels acceptable.
  - Visual: gradient + player card look over the hero background (subjective).
  - Copy of Designer/custom-code changes to the live domain + publish — human step (Will).

**Regression scope:** YouTube hero on all back-catalogue episodes; no-hero episodes stay heroless; scroll-down indicator interaction; Finsweet prevnext/related-episodes list; popups/Swiper untouched.

## Acceptance Tests

No Playwright infra for this client — skipped (see Tier mapping). The Verify Loop's eight MCP checks are the machine-runnable list for `/build`.

## Follow-ups (out of scope)

1. If Annie's back-catalogue import later adds Spotify links to episodes that keep YouTube IDs, YouTube wins under this matrix — same open point as the sibling spec (#4); confirm with Annie once.
2. Consider suppressing the empty YouTube iframe request (`/embed/?mute=1…`) on Spotify-era pages — wasted request, hidden but loaded.
3. Unify the iFrame API loader/callback with the list page if both features publish site-wide (see coordination note).

## Open questions

- None blocking. `/video` embed-path behaviour of the iFrame API is a build-time verification with a defined fallback, not a blocker.
