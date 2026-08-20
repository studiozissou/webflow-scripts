# Spec — Podcast dual-platform inline player (YouTube + Spotify)

**Client:** jayshetty.me (via Skye High Interactive)
**Page:** Podcasts v2 — test page https://jayshetty.webflow.io/podcast-v2 (Webflow page ID `6a85a907e42332f1eded63d7`, site ID `64c10a2010e1a379d08bf030`). Copied to the live podcast page manually once verified.
**Date:** 2026-08-19
**Source of truth:** 10 Aug call with Annie ([call notes](https://app.notion.com/p/3b8e1848bb518015b854d90504a0f2ea)) + Will's in-Designer prep (duplicated buttons with `data-watch` / `data-pause` attributes, Spotify embed element, mobile Spotify link button).
**Notion task:** [Embed Spotify player for in-page episode playback](https://app.notion.com/p/3b3e1848bb518110b54ed093ed896553) (parent: [Implement jayshetty.me podcast platform link updates](https://app.notion.com/p/3b3e1848bb5181798112fac698448e56))

## Goal

The Watch/pause buttons on the podcast list currently drive an inline YouTube player. Episodes from 13 Jul 2026 publish to Spotify video instead. Buttons marked `data-watch="youtube"` must keep the exact current behaviour; buttons marked `data-watch="spotify"` must reproduce it against a Spotify embed. Everything must survive Finsweet CMS filtering and pagination re-renders, and the code should come out simpler and less fragile than what's there.

## Current state (verified via Webflow MCP + published test page, 19 Aug)

### Stack
- jQuery 3.6.4, Finsweet **v1**: `cmsfilter@1`, `cmsload@1` (`fs-cmsload-mode="pagination"`, `resetix`, `showquery`), `cmsslider@1`
- YouTube iframe API (`enablejsapi=1` embeds, controlled via `postMessage`)
- Embedly `player-0.1.0` (playerjs) for the legacy Omny "Listen" players
- No Barba. No repo project dir until this spec — all code lives in the page's custom code (head + footer).

### Markup per CMS item (`.podcasts_item` → `.podcast-block`)
- `.podcasts_image-wrapper` with `.image-cover` images (cover click plays), `.ratio` sizer
- `.podcast-list-youtube-embed.is-cover` HtmlEmbed → `<iframe class="youtube-iframe" id="{slug}" src="https://www.youtube.com/embed/{YouTube ID}?enablejsapi=1&…">`. On Spotify-era items the CMS YouTube ID is empty so the src is `…/embed/?enablejsapi=1` and the wrapper carries `w-condition-invisible`.
- `.podcast-list-spotify-embed.is-cover` HtmlEmbed → **currently broken iframe**: src is `open.spotify.com/episode/{id}?si=…&utm_source=copy-linktheme=0&si=…` — missing the `/embed/` path segment and a malformed query string (missing `&`, duplicated `si`). Conditional visibility set on the element.
- `.podcasts_play-links` → four sibling `.podcasts_video-wrapper` divs in order: watch(youtube), pause(youtube), watch(spotify), pause(spotify). Buttons carry `data-watch="youtube|spotify"` / `data-pause="youtube|spotify"`. Webflow conditional visibility (`w-condition-invisible`) shows the right pair per era. Both watch buttons carry a leftover `id="videoplay"` (duplicate IDs; nothing references them — CSS uses the *class* `videoplay`. Drop the ids in Designer when convenient).
- Mobile: `.is-podcast-watch-button-mobile` link, now CMS-bound to the episode's Spotify URL (`https://open.spotify.com/episode/{id}?si=…`) — **already done by Will in Designer, out of scope here.**

### Current footer JS ("Video Player JS" block)
- Watch/pause/play handlers are already **delegated** (`$("body").on("click", ".is-podcast-watch-button", …)`) — this is why they survive Finsweet today.
- Play targets `$(this).parents(".podcasts_item").find("iframe")[0]` — the **first iframe in the item**. Safe when items had one iframe; wrong now that items carry both a YouTube and a Spotify iframe. Must target per-platform selectors.
- UI state via classes: `.show-btn` on `.podcasts_video-wrapper` (CSS `show-btn + wrapper` sibling rule reveals the pause button), `.videoplay`/`.showvideo` on `.podcasts_image-wrapper` (z-index raises the embed), `.visible` on the embed.
- Cover click (`.image-cover`) postMessages play at `find("iframe")[0]` and triggers `.is-podcast-watch-button` — with two watch buttons per item this now double-fires/misfires.
- Omny/Listen: `initPlayer()` re-IDs every Omny iframe and rebinds on a `setTimeout(1000)` after pagination/category clicks. Fragile, **explicitly left untouched this pass** (user decision 19 Aug) — see Follow-ups.

## Decisions (user-confirmed, 19 Aug)

1. **Approach A — official Spotify iFrame API** (`https://open.spotify.com/embed/iframe-api/v1`): lazy `createController` per item on first click; documented `play()`/`pause()`; no undocumented postMessage.
2. **Omny code untouched**; follow-up note to refactor it onto the same pattern after the main work is verified.
3. **Cover click routes to the item's visible watch button** (whichever era Webflow's conditional visibility shows).
4. Mobile Spotify link button — already built by Will; not part of this build.

## Design

### Why this survives Finsweet (v1) with zero re-init
- **All** click handling is event delegation on `document` — no listener lives on any element inside the list, so `cmsfilter`/`cmsload` can swap items freely.
- Spotify controllers are created **lazily on first click** of that specific item's button and cached in a registry keyed by the placeholder element. A re-rendered item is new DOM with no controller → next click just creates one. Stale controllers (DOM no longer connected) are pruned and `destroy()`ed during pause-all sweeps.
- No `fsAttributes` callbacks, no MutationObserver, no `setTimeout` re-init.

### 1) Designer change — Spotify embed element (HtmlEmbed `2356c0b9-cde5-734f-2373-b89173011785`)
Replace the embed's code (currently the broken iframe) with a placeholder the API can consume:

```html
<div class="spotify-player-target" data-spotify-url="{{Spotify Link CMS field}}"></div>
```

Keep the `.podcast-list-spotify-embed.is-cover` wrapper and its conditional visibility exactly as-is. The iFrame API **replaces** the placeholder with its own iframe on `createController`.

### 2) Head custom code additions
```html
<script src="https://open.spotify.com/embed/iframe-api/v1" async></script>
<style>
  /* Mirror the YouTube z-index rules for Spotify */
  .showvideo .podcast-list-spotify-embed,
  .videoplay .podcast-list-spotify-embed { z-index: 2; }
  /* Controller iframe fills the cover slot */
  .podcast-list-spotify-embed iframe { width: 100%; height: 100%; }
</style>
```

### 3) Footer — replace only the "Video Player JS" `<script>` block

Vanilla JS, one IIFE. Draft (final version produced in `/build`):

```html
<script>
(function () {
  var DEBUG = false;

  /* ---------- Spotify iFrame API plumbing ---------- */
  var spotifyApi = null;
  var pendingSpotifyPlays = []; // clicks that arrived before the API loaded
  var spotifyControllers = []; // { el: placeholderEl, controller: EmbedController }

  window.onSpotifyIframeApiReady = function (api) {
    spotifyApi = api;
    pendingSpotifyPlays.splice(0).forEach(function (fn) { fn(); });
  };

  function episodeIdFrom(url) {
    var m = /episode\/([A-Za-z0-9]+)/.exec(url || '');
    return m ? m[1] : null;
  }

  function pruneControllers() {
    spotifyControllers = spotifyControllers.filter(function (entry) {
      if (document.contains(entry.el)) return true;
      try { entry.controller.destroy(); } catch (e) {}
      return false; // item was re-rendered away by Finsweet
    });
  }

  function pauseAllSpotify() {
    pruneControllers();
    spotifyControllers.forEach(function (entry) { entry.controller.pause(); });
  }

  function pauseAllYouTube() {
    document.querySelectorAll('.podcast-list-youtube-embed iframe').forEach(function (f) {
      f.contentWindow && f.contentWindow.postMessage(
        '{"event":"command","func":"pauseVideo","args":""}', '*');
    });
  }

  function pauseEverything() { pauseAllYouTube(); pauseAllSpotify(); }

  /* ---------- shared button-state UI (same classes as before) ---------- */
  function clearShowBtn() {
    document.querySelectorAll('.podcasts_video-wrapper.show-btn')
      .forEach(function (w) { w.classList.remove('show-btn'); });
  }
  function markPlaying(watchBtn) {
    var block = watchBtn.closest('.podcast-block');
    clearShowBtn();
    var wrapper = watchBtn.closest('.podcasts_video-wrapper');
    if (wrapper) wrapper.classList.add('show-btn');
    if (block) {
      var img = block.querySelector('.podcasts_image-wrapper');
      if (img) img.classList.add('videoplay');
    }
  }

  /* ---------- per-item players ---------- */
  function playYouTube(item, watchBtn) {
    pauseEverything();
    var embed = item.querySelector('.podcast-list-youtube-embed');
    if (embed) embed.classList.add('visible');
    markPlaying(watchBtn);
    var frame = item.querySelector('.podcast-list-youtube-embed iframe');
    if (frame && frame.contentWindow) {
      frame.contentWindow.postMessage(
        '{"event":"command","func":"playVideo","args":""}', '*');
    }
  }

  function playSpotify(item, watchBtn) {
    pauseEverything();
    var target = item.querySelector('.spotify-player-target, .podcast-list-spotify-embed iframe');
    var embedWrap = item.querySelector('.podcast-list-spotify-embed');
    if (embedWrap) embedWrap.classList.add('visible');
    markPlaying(watchBtn);

    // Already have a live controller for this item?
    var existing = spotifyControllers.find(function (e) { return item.contains(e.el); });
    if (existing) { existing.controller.play(); return; }

    var run = function () {
      var placeholder = item.querySelector('.spotify-player-target');
      if (!placeholder || !spotifyApi) return;
      var id = episodeIdFrom(placeholder.getAttribute('data-spotify-url'));
      if (!id) { DEBUG && console.log('[player] no episode id', placeholder); return; }
      spotifyApi.createController(placeholder, {
        uri: 'spotify:episode:' + id, width: '100%', height: '100%'
      }, function (controller) {
        // createController swaps the placeholder for an iframe; track the wrapper
        spotifyControllers.push({ el: embedWrap || item, controller: controller });
        controller.play();
      });
    };
    spotifyApi ? run() : pendingSpotifyPlays.push(run);
  }

  function pauseItem(item, platform) {
    if (platform === 'spotify') {
      pruneControllers();
      var entry = spotifyControllers.find(function (e) { return item.contains(e.el); });
      if (entry) entry.controller.pause();
    } else {
      var frame = item.querySelector('.podcast-list-youtube-embed iframe');
      if (frame && frame.contentWindow) {
        frame.contentWindow.postMessage(
          '{"event":"command","func":"pauseVideo","args":""}', '*');
      }
    }
    var links = item.querySelector('.podcasts_play-links');
    if (links) {
      var first = links.querySelector('.podcasts_video-wrapper.show-btn');
      if (first) first.classList.remove('show-btn');
    }
  }

  /* ---------- delegated events (survive Finsweet re-renders) ---------- */
  document.addEventListener('click', function (e) {
    var watch = e.target.closest('.is-podcast-watch-button');
    if (watch) {
      var item = watch.closest('.podcasts_item') || watch.closest('.podcast-block');
      if (!item) return;
      // Buttons without data-watch (legacy/featured) behave as YouTube — current behaviour.
      var platform = watch.getAttribute('data-watch') || 'youtube';
      platform === 'spotify' ? playSpotify(item, watch) : playYouTube(item, watch);
      return;
    }

    var pause = e.target.closest('.is-podcast-pause-button');
    if (pause) {
      var pItem = pause.closest('.podcasts_item') || pause.closest('.podcast-block');
      if (pItem) pauseItem(pItem, pause.getAttribute('data-pause') || 'youtube');
      return;
    }

    var cover = e.target.closest('.image-cover');
    if (cover) {
      var cItem = cover.closest('.podcasts_item') || cover.closest('.podcast-block');
      if (!cItem) return;
      var imgWrap = cover.closest('.podcasts_image-wrapper');
      if (imgWrap) imgWrap.classList.add('showvideo');
      // Route to whichever watch button Webflow's conditional visibility shows for this era
      var btn = Array.prototype.find.call(
        cItem.querySelectorAll('.is-podcast-watch-button'),
        function (b) {
          var w = b.closest('.podcasts_video-wrapper');
          return w && !w.classList.contains('w-condition-invisible');
        });
      if (btn) btn.click();
    }
  });

  /* Legacy hook the Omny block relies on: pause Omny players when a watch button
     is pressed. The untouched Omny code already binds its own
     $("body").on("click", ".is-podcast-watch-button", …) — nothing needed here. */
})();
</script>
```

Removed relative to today: the duplicated pause-all loops, the `find("iframe")[0]` indexing, the separate `.is-podcast-play-button` show-btn handler duplication, and the double `.image-cover` bindings. Kept byte-identical in behaviour: class choreography (`show-btn`, `videoplay`, `showvideo`, `visible`), pause-others-on-play, Omny interop.

### What is intentionally NOT changed
- The two Omny `<script>` blocks (re-ID + `initPlayer` + `setTimeout` re-init) — untouched.
- The misc footer scripts (topics prepend, filter form prevent, Swiper, testimonial modal).
- The YouTube HtmlEmbed and its CMS binding.
- Head Finsweet/YouTube/playerjs script tags.

## Barba Impact

N/A — no Barba on this site. Plain page loads; delegation binds once per load.

## Parallelisation Map

Single sequential stream — one JS block, one embed element, one page. No worktree teams, no parallel agents. `/build` steps: (1) Designer embed swap via MCP `set_settings`, (2) head code update, (3) footer block replacement, (4) publish to webflow.io subdomain only, (5) verify loop. Agents: code-writer inline (small enough to do directly), code-reviewer pass optional.

## Verify Loop

**Page:** https://jayshetty.webflow.io/podcast-v2 (publish to the Webflow subdomain only — never the custom domains — until sign-off; live copy is a manual step by Will).

**Pass/fail criteria (Chrome DevTools MCP):**
1. No console errors on load (warnings from Spotify/YouTube third-party frames acceptable).
2. Spotify-era item (e.g. Paris Jackson, EP 857): click Watch → a `open.spotify.com/embed` iframe is injected inside `.podcast-list-spotify-embed`, playback starts, wrapper has `.show-btn`, image wrapper has `.videoplay`.
3. While Spotify plays, click Watch on a YouTube-era item → Spotify pauses (controller state), YouTube plays. And the reverse.
4. Pause button on each era stops its own player and removes `.show-btn`.
5. Cover-image click on each era triggers the correct (visible) watch button.
6. Apply a category filter, then paginate; click Watch on a newly rendered Spotify item → player created and plays (proves lazy-create survives re-render). Filter again mid-play → no console errors from pruned controllers.
7. Regression: YouTube-era items behave exactly as production (`jayshetty.me/podcast`) does today; Omny Listen buttons (if visible on old items) unaffected.

**Reproduction steps:** load page → wait for network idle → run the clicks above with ~1s waits after each for embed load; filter via a category radio; paginate via `.podcast-pagination-button`.

**Tier mapping:**
- **Tier 1 (auto, MCP ad-hoc):** all seven checks above via chrome-devtools MCP snapshots + console reads. No Playwright: this client has no test infra (`.env.test`/Playwright absent — first repo artifact for jayshetty is this spec). Noted per plan step 8; no `tests/registry.json` entry.
- **Tier 2 (CDN regression):** N/A — code ships in Webflow custom code, not the CDN pipeline.
- **Tier 3 (manual):**
  - iOS Safari: tap Watch on a Spotify item — `controller.play()` after async controller creation may need a second tap (autoplay policy). Best-effort per the call ("we'll try to autoplay").
  - Real cross-browser pass (Safari/Firefox desktop).
  - Audio actually audible both platforms (MCP can't hear).
  - Copy of head/footer/embed changes to the live podcast page + full-site publish — human step.

**Regression scope:** YouTube inline play/pause on old episodes; Omny Listen on old episodes; Finsweet filtering/pagination/slider; Swiper awards slider; testimonial modal; newsletter popup.

## Acceptance Tests

No Playwright infra for this client — skipped (see Tier mapping). The Verify Loop's seven MCP checks are the machine-runnable list for `/build`.

## Follow-ups (out of scope this pass)

1. **Omny refactor** (user-requested note): once the main work is verified, fold the Omny `initPlayer` + `setTimeout(1000)` re-init onto the same delegation/lazy pattern; the re-ID dance can go entirely if playerjs controllers are keyed by element like the Spotify registry.
2. Remove the leftover `id="videoplay"` duplicate IDs from both watch buttons in Designer.
3. Consider not rendering the empty YouTube iframe (`/embed/?enablejsapi=1`) on Spotify-era items — wasted request per item (conditional visibility hides but still loads it).
4. Older episodes gaining Spotify links while keeping YouTube IDs (Annie's back-catalogue list, still owed): current logic shows YouTube for them — confirm with Annie which platform wins before importing her list.

## Open questions

- None blocking. Spotify episode-ID regex verified against 5 live CMS URLs (`open.spotify.com/episode/{22-char id}?si=…`).
