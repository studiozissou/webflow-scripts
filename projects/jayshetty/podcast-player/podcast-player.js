// Dual-platform inline podcast player for the Jay Shetty podcast list: YouTube via postMessage, Spotify via its iFrame API swapped to the /video embed in every browser, with a video-to-audio fallback. See README.md for why each branch exists.

(function () {
  var DEBUG = false;

  var spotifyApi = window.__spotifyIframeApi || null;
  var pendingSpotifyPlays = [];
  var spotifyControllers = [];

  document.addEventListener("spotify-api-ready", function () {
    spotifyApi = window.__spotifyIframeApi;
    pendingSpotifyPlays.splice(0).forEach(function (fn) { fn(); });
  });

  var PLAYER_CSS =
    ".podcast-list-spotify-embed.is-cover{display:block}" +
    ".showvideo .podcast-list-spotify-embed,.videoplay .podcast-list-spotify-embed{z-index:2}" +
    ".podcast-list-spotify-embed iframe{width:100%;height:100%;border:0}" +
    ".podcasts_image-wrapper:has(.podcast-list-spotify-embed.visible) .image-cover{opacity:0}";

  function injectStyles() {
    if (document.getElementById("js-podcast-player-css")) return;
    var style = document.createElement("style");
    style.id = "js-podcast-player-css";
    style.textContent = PLAYER_CSS;
    document.head.appendChild(style);
  }

  function ensureSpotifyApi() {
    if (spotifyApi) return;
    if (window.__spotifyIframeApi) {
      spotifyApi = window.__spotifyIframeApi;
      return;
    }
    var previous = window.onSpotifyIframeApiReady;
    window.onSpotifyIframeApiReady = function (api) {
      window.__spotifyIframeApi = api;
      spotifyApi = api;
      pendingSpotifyPlays.splice(0).forEach(function (fn) { fn(); });
      if (typeof previous === "function") {
        try { previous(api); } catch (err) {}
      }
    };
    if (document.querySelector('script[src*="embed/iframe-api"]')) return;
    var script = document.createElement("script");
    script.src = "https://open.spotify.com/embed/iframe-api/v1";
    script.async = true;
    document.head.appendChild(script);
  }

  function episodeIdFrom(url) {
    var m = /episode\/([A-Za-z0-9]+)/.exec(url || "");
    return m ? m[1] : null;
  }

  function spotifyUrlFor(item) {
    var el = item.querySelector("[data-spotify-url]");
    if (el) return el.getAttribute("data-spotify-url");
    var link = item.querySelector('a[href*="open.spotify.com/episode"]');
    return link ? link.getAttribute("href") : "";
  }

  function controllerFor(embedWrap) {
    var entry = spotifyControllers.filter(function (e) { return e.el === embedWrap; })[0];
    return entry ? entry.controller : null;
  }

  var VIDEO_WATCHDOG_MS = 6000;

  function watchForDegradedVideo(embedWrap, id) {
    if (embedWrap.__videoWatchdog || embedWrap.__videoOk) return;
    var frame = embedWrap.querySelector("iframe");
    if (!frame) return;

    var onMessage = function (e) {
      if (!frame.contentWindow || e.source !== frame.contentWindow) return;
      embedWrap.__videoOk = true;
      stop();
    };

    var stop = function () {
      window.removeEventListener("message", onMessage);
      clearTimeout(embedWrap.__videoWatchdog);
      embedWrap.__videoWatchdog = null;
    };

    window.addEventListener("message", onMessage);
    embedWrap.__videoWatchdog = setTimeout(function () {
      stop();
      if (embedWrap.__videoOk) return;
      if (!document.contains(frame) || frame.src.indexOf("/video") === -1) return;
      DEBUG && console.log("[player] /video page silent, using audio embed", id);
      embedWrap.__videoFellBack = true;
      frame.removeAttribute("sandbox");
      frame.src = "https://open.spotify.com/embed/episode/" + id;
    }, VIDEO_WATCHDOG_MS);
  }

  function useVideoEmbed(embedWrap, id, attempt) {
    if (embedWrap.__videoFellBack) return false;
    var frame = embedWrap.querySelector("iframe");
    if (!frame) {
      if ((attempt || 0) < 30) {
        setTimeout(function () {
          useVideoEmbed(embedWrap, id, (attempt || 0) + 1);
        }, 100);
      }
      return false;
    }
    var videoSrc = "https://open.spotify.com/embed/episode/" + id + "/video?utm_source=iframe-api";
    if (frame.src.indexOf("/embed/episode/" + id + "/video") !== -1) return false;
    frame.addEventListener("load", function () {
      if (frame.src.indexOf("/video") === -1) return;
      var controller = controllerFor(embedWrap);
      if (controller) {
        try { controller.play(); } catch (err) {}
      }
    });
    frame.setAttribute("sandbox", "allow-scripts allow-same-origin allow-presentation");
    watchForDegradedVideo(embedWrap, id);
    frame.src = videoSrc;
    return true;
  }

  function pruneControllers() {
    spotifyControllers = spotifyControllers.filter(function (entry) {
      if (document.contains(entry.el)) return true;
      try { entry.controller.destroy(); } catch (err) {}
      return false;
    });
  }

  function pauseAllSpotify() {
    pruneControllers();
    spotifyControllers.forEach(function (entry) {
      try { entry.controller.pause(); } catch (err) {}
    });
  }

  function pauseAllYouTube() {
    document.querySelectorAll(".podcast-list-youtube-embed iframe").forEach(function (frame) {
      if (frame.contentWindow) {
        frame.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', "*");
      }
    });
  }

  function pauseEverything() {
    pauseAllYouTube();
    pauseAllSpotify();
  }

  function clearShowBtn() {
    document.querySelectorAll(".podcasts_video-wrapper.show-btn").forEach(function (w) {
      w.classList.remove("show-btn");
    });
  }

  function markPlaying(watchBtn) {
    clearShowBtn();
    var wrapper = watchBtn.closest(".podcasts_video-wrapper");
    if (wrapper) wrapper.classList.add("show-btn");
    var block = watchBtn.closest(".podcast-block") || watchBtn.closest(".podcasts_item");
    if (block) {
      var img = block.querySelector(".podcasts_image-wrapper");
      if (img) img.classList.add("videoplay");
    }
  }

  function playYouTube(item, watchBtn) {
    pauseEverything();
    var embed = item.querySelector(".podcast-list-youtube-embed");
    if (embed) embed.classList.add("visible");
    markPlaying(watchBtn);
    var frame = item.querySelector(".podcast-list-youtube-embed iframe");
    if (frame && frame.contentWindow) {
      frame.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', "*");
    }
  }

  function playSpotify(item, watchBtn) {
    pauseEverything();
    var embedWrap = item.querySelector(".podcast-list-spotify-embed");
    markPlaying(watchBtn);
    if (!embedWrap) return;
    embedWrap.classList.add("visible");

    var id = episodeIdFrom(spotifyUrlFor(item));
    if (!id) {
      DEBUG && console.log("[player] no Spotify episode id on", embedWrap);
      return;
    }

    var existing = spotifyControllers.filter(function (entry) {
      return item.contains(entry.el);
    })[0];
    if (existing) {
      existing.controller.play();
      return;
    }

    var run = function () {
      var placeholder = item.querySelector(".spotify-player-target");
      if (!placeholder || !spotifyApi) return;
      spotifyApi.createController(placeholder, {
        uri: "spotify:episode:" + id,
        width: "100%",
        height: "100%"
      }, function (controller) {
        spotifyControllers.push({ el: embedWrap, controller: controller });
        controller.addListener("ready", function () {
          if (useVideoEmbed(embedWrap, id)) return;
          try { controller.play(); } catch (err) {}
        });
      });
      useVideoEmbed(embedWrap, id);
    };
    spotifyApi ? run() : pendingSpotifyPlays.push(run);
  }

  function pauseItem(item, platform) {
    if (platform === "spotify") {
      pruneControllers();
      spotifyControllers.forEach(function (entry) {
        if (item.contains(entry.el)) {
          try { entry.controller.pause(); } catch (err) {}
        }
      });
    } else {
      var frame = item.querySelector(".podcast-list-youtube-embed iframe");
      if (frame && frame.contentWindow) {
        frame.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', "*");
      }
    }
    var shown = item.querySelector(".podcasts_video-wrapper.show-btn");
    if (shown) shown.classList.remove("show-btn");
  }

  function isConditionallyHidden(btn) {
    var wrapper = btn.closest(".podcasts_video-wrapper");
    return btn.classList.contains("w-condition-invisible") ||
      (wrapper && wrapper.classList.contains("w-condition-invisible"));
  }

  document.addEventListener("click", function (e) {
    if (!e.target || !e.target.closest) return;

    var watch = e.target.closest(".is-podcast-watch-button");
    if (watch) {
      var item = watch.closest(".podcasts_item") || watch.closest(".podcast-block");
      if (!item) return;
      var platform = watch.getAttribute("data-watch") || "youtube";
      platform === "spotify" ? playSpotify(item, watch) : playYouTube(item, watch);
      return;
    }

    var pauseBtn = e.target.closest(".is-podcast-pause-button");
    if (pauseBtn) {
      var pItem = pauseBtn.closest(".podcasts_item") || pauseBtn.closest(".podcast-block");
      if (pItem) pauseItem(pItem, pauseBtn.getAttribute("data-pause") || "youtube");
      return;
    }

    var playBtn = e.target.closest(".is-podcast-play-button");
    if (playBtn) {
      clearShowBtn();
      var playWrapper = playBtn.closest(".podcasts_video-wrapper");
      if (playWrapper) playWrapper.classList.add("show-btn");
      return;
    }

    var cover = e.target.closest(".image-cover");
    if (cover) {
      var cItem = cover.closest(".podcasts_item") || cover.closest(".podcast-block");
      if (!cItem) return;
      var imgWrap = cover.closest(".podcasts_image-wrapper");
      if (imgWrap) imgWrap.classList.add("showvideo");
      var buttons = cItem.querySelectorAll(".is-podcast-watch-button");
      for (var i = 0; i < buttons.length; i++) {
        if (!isConditionallyHidden(buttons[i])) {
          buttons[i].click();
          break;
        }
      }
    }
  });

  function dropNonOmnyEmbeds() {
    document.querySelectorAll("iframe.omny-embed").forEach(function (frame) {
      if ((frame.src || "").indexOf("omny.fm") === -1) frame.remove();
    });
  }

  injectStyles();
  ensureSpotifyApi();
  dropNonOmnyEmbeds();
  document.addEventListener("click", function (e) {
    if (!e.target || !e.target.closest) return;
    if (e.target.closest(".podcast-pagination-button, .category-item")) {
      setTimeout(dropNonOmnyEmbeds, 1200);
    }
  });
})();
