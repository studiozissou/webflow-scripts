/**
 * The Signalling Company — Script Loader
 *
 * Single entry point loaded via jsDelivr:
 * <script src="https://cdn.jsdelivr.net/gh/{owner}/{repo}@{hash}/projects/the-signalling-company/init.js"></script>
 *
 * Includes site-wide utilities (rel noreferrer, footer year, UTM tracking)
 * and loads project modules once vendor deps are ready.
 */
(() => {
  const src = (document.currentScript && document.currentScript.src) || '';
  const BASE = src.substring(0, src.lastIndexOf('/') + 1);
  const DEBUG = false;

  /* ── Vendor deps (loaded first) ────────────────────────── */
  const deps = [
    // 'https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js',
    // 'https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollTrigger.min.js',
  ];

  /* ── Project modules (loaded after deps) ───────────────── */
  const modules = [
    // 'hero-anim.js',
  ];

  /* ── Site-wide utilities ───────────────────────────────── */

  function setExternalLinkRels() {
    document.querySelectorAll('a[target="_blank"]').forEach((a) => {
      a.setAttribute('rel', 'noreferrer noopener');
    });
  }

  function setFooterYear() {
    const el = document.getElementById('year');
    if (el) el.textContent = new Date().getFullYear();
  }

  function injectUTMTracking() {
    const forms = document.querySelectorAll('form');
    if (!forms.length) return;

    const url = new URL(window.location.href);
    const params = url.searchParams;

    /* Build clean page URL without UTM params */
    const cleanURL = new URL(url.origin + url.pathname);
    for (const [key, val] of params) {
      if (!key.startsWith('utm_')) cleanURL.searchParams.set(key, val);
    }
    const conversionPage = cleanURL.toString();

    forms.forEach((form) => {
      if (form.dataset.trackingInjected) return;
      form.dataset.trackingInjected = 'true';

      form.append(
        Object.assign(document.createElement('input'), {
          type: 'hidden',
          name: 'Conversion Page',
          value: conversionPage,
        })
      );

      for (const [key, val] of params) {
        if (key.startsWith('utm_')) {
          form.append(
            Object.assign(document.createElement('input'), {
              type: 'hidden',
              name: key,
              value: val,
            })
          );
        }
      }
    });
  }

  function moveNavSeeAll() {
    document.querySelectorAll('.w-dropdown-list').forEach((dropdown) => {
      const list = dropdown.querySelector('[data-nav="list"]');
      const seeAll = dropdown.querySelector(':scope [data-nav="see-all"]');
      if (list && seeAll && !list.contains(seeAll)) list.appendChild(seeAll);
    });
  }

  /* ── Project video embeds ──────────────────────────────── */
  /* Editors paste a plain YouTube URL into a CMS field bound to the
     data-yt-url attribute of an embed element. We swap it for a
     privacy-mode (youtube-nocookie.com) iframe with autoplay + mute
     + controls. */

  function getYouTubeId(url) {
    if (!url) return null;
    const m = url.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  /* Responsive 16:9 wrapper appended to a host element's cssText — shared by
     the mounted iframe and the click-to-play facade below. */
  const RESPONSIVE_16_9 =
    ';position:relative;padding-bottom:56.25%;height:0;overflow:hidden;';

  function mountYouTubeEmbed(el) {
    if (el.dataset.ytMounted) return;

    /* URL comes from the CMS-bound data-yt-url attribute. */
    const id = getYouTubeId(el.dataset.ytUrl);
    if (!id) return;

    el.dataset.ytMounted = 'true';

    const params = new URLSearchParams({
      autoplay: el.dataset.autoplay === 'false' ? '0' : '1',
      mute: el.dataset.mute === 'false' ? '0' : '1',
      controls: el.dataset.controls === 'false' ? '0' : '1',
      rel: '0', // limit related videos to same channel
      playsinline: '1',
    });

    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${id}?${params}`;
    iframe.title = 'YouTube video player';
    iframe.loading = 'lazy';
    iframe.allow =
      'accelerated-autoplay; autoplay; encrypted-media; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.style.cssText =
      'position:absolute;top:0;left:0;width:100%;height:100%;border:0;';

    /* Responsive 16:9 wrapper on the host element. */
    el.style.cssText += RESPONSIVE_16_9;
    el.textContent = '';
    el.appendChild(iframe);
  }

  /* ── YouTube click-to-play facade (QW2) ────────────────── */
  /* A below-the-fold embed shouldn't pull the full YT player + Google
     JS on load. Instead we paint a lightweight poster + play button and
     only inject the real (privacy-mode) iframe on a genuine click — a
     user gesture, so autoplay-with-sound is allowed. Opt in per element
     with data-yt-facade; other [data-yt-url] embeds mount immediately. */

  function mountYouTubeFacade(el) {
    if (el.dataset.ytFacadeMounted) return;

    const id = getYouTubeId(el.dataset.ytUrl);
    if (!id) return;

    el.dataset.ytFacadeMounted = 'true';
    el.textContent = ''; /* replace any authored placeholder, like mountYouTubeEmbed */

    /* Responsive 16:9 box (shared with mountYouTubeEmbed), plus a pointer
       cursor over the whole poster. */
    el.style.cssText += RESPONSIVE_16_9 + 'cursor:pointer;';

    /* Poster: caller override, else YouTube maxres with an hq fallback. */
    const poster = document.createElement('img');
    poster.src =
      el.dataset.ytPoster || `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
    poster.alt = ''; /* decorative — the button carries the label */
    poster.loading = 'lazy';
    poster.decoding = 'async';
    poster.style.cssText =
      'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;';
    /* maxres is absent for some videos; fall back once, guarded to
       prevent an onerror loop. */
    if (!el.dataset.ytPoster) {
      poster.onerror = () => {
        poster.onerror = null;
        poster.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
      };
    }

    /* Play button — a real, keyboard-focusable <button>. */
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', 'Play video');
    button.style.cssText =
      'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'width:68px;height:48px;padding:0;border:0;border-radius:14px;' +
      'background:rgba(18,18,18,0.8);cursor:pointer;display:flex;' +
      'align-items:center;justify-content:center;';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '24');
    svg.setAttribute('height', '24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const tri = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    tri.setAttribute('d', 'M8 5v14l11-7z');
    tri.setAttribute('fill', '#fff');
    svg.appendChild(tri);
    button.appendChild(svg);

    /* One click handler on the whole box, so a mouse click anywhere on the
       poster works (matching the pointer cursor). The button stays focusable
       for keyboard users; its Enter/Space fires a click that bubbles up here,
       so no separate listener is needed. mountYouTubeEmbed clears el and
       injects the iframe (poster/button remove themselves); its ytMounted
       guard prevents double-fire. We then move focus to the iframe so keyboard
       users aren't dropped to <body>. Default to sound on — a real gesture
       permits autoplay with audio. preventDefault guards against the host
       being a Webflow Link Block (<a>). */
    const activate = (event) => {
      event.preventDefault();
      if (el.dataset.mute === undefined) el.dataset.mute = 'false';
      mountYouTubeEmbed(el);
      const iframe = el.querySelector('iframe');
      if (iframe) iframe.focus();
    };
    el.addEventListener('click', activate);

    el.appendChild(poster);
    el.appendChild(button);
  }

  function setupProjectVideos() {
    document.querySelectorAll('[data-yt-url]').forEach((el) => {
      if (el.hasAttribute('data-yt-facade')) {
        mountYouTubeFacade(el);
      } else {
        mountYouTubeEmbed(el);
      }
    });
  }

  /* ── Motion preference helper ──────────────────────────── */

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* ── Lazy-mount helper ─────────────────────────────────── */
  /* Observe each element once; when it nears the viewport, fire the
     callback and stop observing it. Shared by the deferred-load quick
     wins below. */

  function observeOnce(elements, onEnter, options) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        obs.unobserve(entry.target);
        onEnter(entry.target);
      });
    }, options);
    elements.forEach((el) => observer.observe(el));
  }

  /* ── Deferred Spline runtime (QW1) ─────────────────────── */
  /* The Spline WebGL runtime is heavy. Instead of loading it on page
     load, we wait until the host element nears the viewport, then
     lazy-import the ES module runtime and mount the scene. Hosts are
     marked in the Designer with data-spline-defer="<sceneUrl>" and carry
     a reserved height so there's no layout shift. */

  async function mountSpline(el) {
    const sceneUrl = el.dataset.splineDefer;
    if (!sceneUrl) return;

    /* Browsers memoise dynamic import() by resolved specifier, so a
       repeat import of the same pinned URL never re-fetches. */
    let canvas;
    try {
      const { Application } = await import(
        'https://cdn.jsdelivr.net/npm/@splinetool/runtime@1.9.28/build/runtime.js'
      );
      canvas = document.createElement('canvas');
      el.appendChild(canvas);
      await new Application(canvas).load(sceneUrl);
    } catch (error) {
      /* Restore the static fallback/poster: drop the empty canvas. */
      if (canvas) canvas.remove();
      DEBUG && console.warn('[TSC] Spline mount failed', error);
    }
  }

  function setupDeferredSpline() {
    const hosts = document.querySelectorAll('[data-spline-defer]');
    if (!hosts.length) return;

    /* Respect reduced motion and data-saver: leave the static poster. */
    const saveData = navigator.connection && navigator.connection.saveData;
    if (prefersReducedMotion() || saveData) return;

    observeOnce(
      hosts,
      (el) => {
        if (el.dataset.splineMounted) return;
        el.dataset.splineMounted = 'true';
        mountSpline(el);
      },
      { rootMargin: '600px 0px' }
    );
  }

  /* ── Deferred CTA background video (QW3) ───────────────── */
  /* The bottom CTA background video is a large 1080p MP4 sitting far
     below the fold. We strip autoplay/preload so nothing is fetched on
     load, then start playback only when it nears the viewport. */

  function setupDeferredVideos() {
    const wrappers = document.querySelectorAll('.video_cta');
    if (!wrappers.length) return;

    const reduce = prefersReducedMotion();
    const videos = [];

    wrappers.forEach((node) => {
      const video =
        node.tagName === 'VIDEO' ? node : node.querySelector('video');
      if (!video || video.dataset.deferProcessed) return;
      video.dataset.deferProcessed = 'true';

      video.preload = 'none';
      video.removeAttribute('autoplay');
      video.autoplay = false;
      video.muted = true;
      video.playsInline = true;

      /* Reduced motion: keep the poster, never auto-start playback. */
      if (!reduce) videos.push(video);
    });

    observeOnce(
      videos,
      (video) => {
        video.preload = 'auto';
        video.play().catch(() => {}); /* swallow autoplay-policy rejection */
      },
      { rootMargin: '200px 0px' }
    );
  }

  /* ── Hero reveal failsafe (QW4) ────────────────────────── */
  /* The hero headline (LCP) is held hidden until a GSAP SplitText reveal
     runs. If GSAP is blocked or never runs, force the headline visible so
     it's never permanently hidden. SplitText generates .gsap_split_line
     nodes at runtime, so we query at reveal time (not boot time) and fall
     back to the authored <h1> if the split hasn't happened. */

  function revealHeroFailsafe() {
    const reveal = () => {
      const lines = document.querySelectorAll('.gsap_split_line');
      const targets = lines.length ? lines : document.querySelectorAll('h1');
      targets.forEach((el) => {
        const cs = getComputedStyle(el);
        if (cs.opacity === '0') el.style.opacity = '1';
        if (cs.visibility === 'hidden') el.style.visibility = 'visible';
      });
    };

    /* Reduced motion: reveal immediately, and again shortly after in case
       SplitText generates the lines a beat later. */
    if (prefersReducedMotion()) {
      reveal();
      setTimeout(reveal, 300);
      return;
    }

    /* Otherwise let the GSAP reveal win; only force visibility as a last
       resort if it hasn't run within ~1s. */
    setTimeout(reveal, 1000);
  }

  /* ── Loader helpers ────────────────────────────────────── */

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function loadModules() {
    modules.forEach((file) => {
      const s = document.createElement('script');
      s.src = `${BASE}${file}`;
      s.async = false;
      document.head.appendChild(s);
    });
  }

  /* ── Boot ──────────────────────────────────────────────── */

  async function boot() {
    /* Utilities — run immediately */
    setExternalLinkRels();
    setFooterYear();
    injectUTMTracking();
    moveNavSeeAll();
    setupProjectVideos();

    /* Performance quick-wins — each sets up its own observers/timeouts */
    setupDeferredSpline();
    setupDeferredVideos();
    revealHeroFailsafe();

    /* Vendor deps (sequential where order matters) */
    for (const url of deps) {
      await loadScript(url);
    }

    /* Project modules */
    if (modules.length) loadModules();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => boot().catch(() => {}));
  } else {
    boot().catch(() => {});
  }
})();
