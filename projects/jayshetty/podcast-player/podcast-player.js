// Dual-platform inline podcast player for the Jay Shetty podcast list: YouTube via postMessage, Spotify via its iFrame API swapped to the /video embed in every browser, with a slow, non-sticky video-to-audio fallback and an on-page log behind ?playerdebug. See README.md for why each branch exists.

(function () {
  var VERSION = "1.3.0";
  var LOG_ON = /[?&]playerdebug(=|&|$)/.test(location.search);
  var SILENT_WAV = "data:audio/wav;base64,UklGRnQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==";

  function srcKind(src) {
    if (!src) return "none";
    if (src.indexOf("/video") !== -1) return "video";
    if (src.indexOf("/embed/episode/") !== -1) return "audio";
    return src.slice(0, 60);
  }

  function createLogger() {
    var t0 = performance.now();
    var lines = [];
    var pre = null;
    var seen = {};
    window.__playerLog = lines;

    function write(msg) {
      var line = ((performance.now() - t0) / 1000).toFixed(2) + "s " + msg;
      lines.push(line);
      if (pre) {
        pre.textContent += line + "\n";
        pre.scrollTop = pre.scrollHeight;
      }
    }

    function wrapForSource(source) {
      var frames = document.querySelectorAll(".podcast-list-spotify-embed iframe");
      for (var i = 0; i < frames.length; i++) {
        if (frames[i].contentWindow === source) return frames[i].closest(".podcast-list-spotify-embed");
      }
      return null;
    }

    function stateLines() {
      var out = [];
      var wraps = document.querySelectorAll(".podcast-list-spotify-embed");
      for (var i = 0; i < wraps.length; i++) {
        var w = wraps[i];
        var f = w.querySelector("iframe");
        if (!f) continue;
        out.push("state " + (w.__episodeId || "?") + " iframe=" + srcKind(f.src) +
          " ok=" + !!w.__videoOk + " fellBack=" + !!w.__videoFellBack +
          " watchdog=" + !!w.__videoWatchdog + " shown=" + w.classList.contains("visible") +
          " allow=" + (f.getAttribute("allow") || "-"));
      }
      return out.length ? out : ["state no Spotify iframes on the page yet"];
    }

    function copyText(text, button) {
      var done = function (label) {
        button.textContent = label;
        setTimeout(function () { button.textContent = "Copy log"; }, 2000);
      };
      var fallback = function () {
        var area = document.createElement("textarea");
        area.value = text;
        area.style.cssText = "position:fixed;top:0;left:0;opacity:0";
        document.body.appendChild(area);
        area.select();
        var ok = false;
        try { ok = document.execCommand("copy"); } catch (err) {}
        area.remove();
        done(ok ? "Copied" : "Select + copy the text");
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done("Copied"); }, fallback);
      } else {
        fallback();
      }
    }

    function button(label) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.style.cssText = "font:600 12px system-ui,sans-serif;padding:6px 10px;border:0;border-radius:4px;background:#1ed760;color:#000;cursor:pointer";
      return b;
    }

    function mount() {
      var panel = document.createElement("div");
      panel.id = "js-player-debug";
      panel.style.cssText = "position:fixed;right:12px;bottom:12px;z-index:2147483647;width:min(440px,calc(100vw - 24px));background:#111;color:#eee;border-radius:6px;box-shadow:0 4px 20px rgba(0,0,0,.4)";
      var bar = document.createElement("div");
      bar.style.cssText = "display:flex;gap:8px;align-items:center;padding:8px";
      var title = document.createElement("span");
      title.textContent = "Player log v" + VERSION;
      title.style.cssText = "flex:1;font:600 12px system-ui,sans-serif";
      var copy = button("Copy log");
      var hide = button("Hide");
      hide.style.background = "#444";
      hide.style.color = "#fff";
      pre = document.createElement("pre");
      pre.style.cssText = "margin:0;padding:8px;max-height:40vh;overflow:auto;white-space:pre-wrap;word-break:break-all;font:11px/1.45 ui-monospace,Menlo,monospace;user-select:text;-webkit-user-select:text";
      pre.textContent = lines.join("\n") + "\n";
      copy.addEventListener("click", function () {
        copyText(lines.concat(stateLines()).join("\n"), copy);
      });
      hide.addEventListener("click", function () {
        var hidden = pre.style.display === "none";
        pre.style.display = hidden ? "block" : "none";
        hide.textContent = hidden ? "Hide" : "Show";
      });
      bar.appendChild(title);
      bar.appendChild(copy);
      bar.appendChild(hide);
      panel.appendChild(bar);
      panel.appendChild(pre);
      document.body.appendChild(panel);
    }

    function probeAutoplay(when) {
      try {
        var a = new Audio(SILENT_WAV);
        var settled = false;
        var p = a.play();
        if (p && p.then) {
          p.then(function () { settled = true; write("autoplay " + when + ": allowed"); },
            function (err) { settled = true; write("autoplay " + when + ": blocked (" + (err && err.name) + ")"); });
          setTimeout(function () {
            if (!settled) write("autoplay " + when + ": no answer after 3s");
          }, 3000);
        }
      } catch (err) {
        write("autoplay " + when + ": probe failed (" + (err && err.message) + ")");
      }
    }

    function probeEnvironment() {
      var mm = function (q) { return window.matchMedia ? window.matchMedia(q).matches : "?"; };
      write("env cookies=" + navigator.cookieEnabled +
        " MediaSource=" + !!window.MediaSource +
        " ManagedMediaSource=" + !!window.ManagedMediaSource +
        " WebKitMediaKeys=" + !!window.WebKitMediaKeys +
        " reducedMotion=" + mm("(prefers-reduced-motion: reduce)") +
        " touch=" + ("ontouchstart" in window) +
        " dpr=" + (window.devicePixelRatio || "?"));
      if (navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate().then(function (est) {
          var mb = Math.round((est.quota || 0) / 1048576);
          write("env storageQuota=" + mb + "MB" + (mb && mb < 200 ? " (small: maybe a Private window)" : ""));
        }, function () {});
      }
      if (navigator.requestMediaKeySystemAccess) {
        navigator.requestMediaKeySystemAccess("com.apple.fps", [{
          initDataTypes: ["sinf", "skd"],
          videoCapabilities: [{ contentType: 'video/mp4; codecs="avc1.42E01E"' }]
        }]).then(function () { write("env fairplay=available"); },
          function (err) { write("env fairplay=unavailable (" + (err && err.name) + ")"); });
      }
      probeAutoplay("without click");
    }

    write("podcast-player v" + VERSION + " | " + navigator.userAgent + " | " +
      innerWidth + "x" + innerHeight + " | " + location.href + " | " + new Date().toISOString());

    window.addEventListener("error", function (e) {
      write("error " + e.message + " @ " + (e.filename || "?") + ":" + (e.lineno || "?"));
    }, true);
    window.addEventListener("unhandledrejection", function (e) {
      var r = e && e.reason;
      write("rejection " + (r && r.message ? r.message : String(r)));
    });
    document.addEventListener("visibilitychange", function () {
      write("page " + document.visibilityState);
    });
    window.addEventListener("message", function (e) {
      if ((e.origin || "").indexOf("spotify.com") === -1) return;
      var data = e.data;
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch (err) { return; }
      }
      var type = (data && data.type) || "unknown";
      var wrap = wrapForSource(e.source);
      var label = wrap ? (wrap.__episodeId || "?") + " " + srcKind(wrap.querySelector("iframe").src) : "?";
      var key = label + ":" + type;
      seen[key] = (seen[key] || 0) + 1;
      if (seen[key] === 1) write("msg " + type + " from " + label);
    });

    try { probeEnvironment(); } catch (err) { write("env probe failed " + (err && err.message)); }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", mount);
    } else {
      mount();
    }

    write.autoplayOnClick = function () {
      if (write.clickProbed) return;
      write.clickProbed = true;
      probeAutoplay("on Watch click");
    };
    return write;
  }

  var log = LOG_ON ? createLogger() : function () {};

  function safely(label, fn) {
    try { fn(); } catch (err) { log(label + " threw " + (err && err.message)); }
  }

  var spotifyApi = window.__spotifyIframeApi || null;
  var pendingSpotifyPlays = [];
  var spotifyControllers = [];

  document.addEventListener("spotify-api-ready", function () {
    log("spotify api ready (head loader)");
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
    if (spotifyApi) {
      log("spotify api already loaded");
      return;
    }
    if (window.__spotifyIframeApi) {
      spotifyApi = window.__spotifyIframeApi;
      log("spotify api already loaded");
      return;
    }
    var previous = window.onSpotifyIframeApiReady;
    window.onSpotifyIframeApiReady = function (api) {
      log("spotify api ready");
      window.__spotifyIframeApi = api;
      spotifyApi = api;
      pendingSpotifyPlays.splice(0).forEach(function (fn) { fn(); });
      if (typeof previous === "function") {
        try { previous(api); } catch (err) {}
      }
    };
    if (document.querySelector('script[src*="embed/iframe-api"]')) {
      log("spotify api script already on page, waiting");
      return;
    }
    var script = document.createElement("script");
    script.src = "https://open.spotify.com/embed/iframe-api/v1";
    script.async = true;
    script.onerror = function () { log("spotify api script FAILED to load (blocked by a content blocker or network?)"); };
    document.head.appendChild(script);
    log("spotify api script injected");
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

  var VIDEO_WATCHDOG_MS = 20000;

  function watchForDegradedVideo(embedWrap, id) {
    if (embedWrap.__videoWatchdog || embedWrap.__videoOk) return;
    var frame = embedWrap.querySelector("iframe");
    if (!frame) return;
    var loadedAt = 0;

    var onMessage = function (e) {
      if (!frame.contentWindow || e.source !== frame.contentWindow) return;
      embedWrap.__videoOk = true;
      log("watchdog satisfied " + id + ": first message from iframe" +
        (loadedAt ? " " + ((performance.now() - loadedAt) / 1000).toFixed(2) + "s after load" : " before load"));
      stop();
    };

    var stop = function () {
      window.removeEventListener("message", onMessage);
      clearTimeout(embedWrap.__videoWatchdog);
      embedWrap.__videoWatchdog = null;
    };

    window.addEventListener("message", onMessage);
    embedWrap.__videoWatchdog = true;
    log("watchdog armed " + id);
    frame.addEventListener("load", function onLoad() {
      frame.removeEventListener("load", onLoad);
      if (!embedWrap.__videoWatchdog || embedWrap.__videoOk) return;
      if (frame.src.indexOf("/video") === -1) return;
      loadedAt = performance.now();
      log("watchdog countdown " + VIDEO_WATCHDOG_MS / 1000 + "s started " + id);
      embedWrap.__videoWatchdog = setTimeout(function () {
        stop();
        if (embedWrap.__videoOk) return;
        if (!document.contains(frame) || frame.src.indexOf("/video") === -1) return;
        log("WATCHDOG FIRED " + id + ": /video sent no message for " + VIDEO_WATCHDOG_MS / 1000 + "s, switching to audio embed");
        embedWrap.__videoFellBack = true;
        frame.removeAttribute("sandbox");
        frame.src = "https://open.spotify.com/embed/episode/" + id;
      }, VIDEO_WATCHDOG_MS);
    });
  }

  function useVideoEmbed(embedWrap, id, attempt) {
    if (embedWrap.__videoFellBack) return false;
    var frame = embedWrap.querySelector("iframe");
    if (!frame) {
      if (!attempt) log("waiting for Spotify iframe " + id);
      if ((attempt || 0) < 30) {
        setTimeout(function () {
          useVideoEmbed(embedWrap, id, (attempt || 0) + 1);
        }, 100);
      } else {
        log("gave up waiting for Spotify iframe " + id + " after 3s");
      }
      return false;
    }
    var videoSrc = "https://open.spotify.com/embed/episode/" + id + "/video?utm_source=iframe-api";
    if (frame.src.indexOf("/embed/episode/" + id + "/video") !== -1) return false;
    var swappedAt = performance.now();
    frame.addEventListener("load", function () {
      log("iframe load " + id + " " + srcKind(frame.src) + " " + ((performance.now() - swappedAt) / 1000).toFixed(2) + "s after swap");
      if (frame.src.indexOf("/video") === -1) return;
      var controller = controllerFor(embedWrap);
      if (controller) safely("play() after /video load", function () { controller.play(); });
    });
    frame.setAttribute("sandbox", "allow-scripts allow-same-origin allow-presentation");
    watchForDegradedVideo(embedWrap, id);
    log("swap " + id + " " + srcKind(frame.src) + " -> video");
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
    log("watch youtube");
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
    if (!embedWrap) {
      log("watch spotify: no .podcast-list-spotify-embed in this item");
      return;
    }
    embedWrap.classList.add("visible");

    var id = episodeIdFrom(spotifyUrlFor(item));
    if (!id) {
      log("watch spotify: no Spotify episode id found in this item");
      return;
    }
    embedWrap.__episodeId = id;

    var existing = spotifyControllers.filter(function (entry) {
      return item.contains(entry.el);
    })[0];
    log("watch spotify " + id + (existing ? " (reusing controller, iframe=" + srcKind((embedWrap.querySelector("iframe") || {}).src) + ")" : " (new controller)"));
    if (existing) {
      if (embedWrap.__videoFellBack) {
        log("item had fallen back to audio, retrying video " + id);
        embedWrap.__videoFellBack = false;
        embedWrap.__videoOk = false;
        embedWrap.__videoWatchdog = null;
        if (useVideoEmbed(embedWrap, id)) return;
      }
      safely("play()", function () { existing.controller.play(); });
      return;
    }

    var run = function () {
      var placeholder = item.querySelector(".spotify-player-target");
      if (!placeholder || !spotifyApi) {
        log("cannot create controller " + id + ": " + (!placeholder ? "no .spotify-player-target" : "no spotify api"));
        return;
      }
      log("createController " + id);
      spotifyApi.createController(placeholder, {
        uri: "spotify:episode:" + id,
        width: "100%",
        height: "100%"
      }, function (controller) {
        log("controller created " + id);
        spotifyControllers.push({ el: embedWrap, controller: controller });
        controller.addListener("ready", function () {
          log("controller ready " + id + " iframe=" + srcKind((embedWrap.querySelector("iframe") || {}).src));
          if (useVideoEmbed(embedWrap, id)) return;
          safely("play() on ready", function () { controller.play(); });
        });
      });
      useVideoEmbed(embedWrap, id);
    };
    if (spotifyApi) {
      run();
    } else {
      log("spotify api not ready yet, queued " + id);
      pendingSpotifyPlays.push(run);
    }
  }

  function pauseItem(item, platform) {
    log("pause " + platform);
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
      if (log.autoplayOnClick) log.autoplayOnClick();
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
