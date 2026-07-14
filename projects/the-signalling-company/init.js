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

  /* ── Close mega-menu on panel background click ─────────────── */
  /* The desktop nav dropdowns open on hover, and their .master_dropdown
     panel is a full-screen overlay — so the pointer can't leave the menu to
     dismiss it except by hovering another top-bar item. This lets a click on
     any non-link area of the panel close it, while child links still navigate.

     One delegated listener on document (not per-node): CMS/Finsweet-safe,
     survives re-render, no per-element bookkeeping. Desktop-only via the
     .nav-menu-dektop gate (Webflow's own class typo — intentional); the mobile
     menu duplicates are excluded. The manual class-strip is the timing-free
     Webflow close; verified live that a hover reopens it in one action with no
     internal-state desync. Idempotent via a documentElement dataset guard so a
     second boot() adds no duplicate listener. */

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

  function bindMasterDropdownClose() {
    if (document.documentElement.dataset.masterDropdownClose) return;
    document.documentElement.dataset.masterDropdownClose = 'true';

    document.addEventListener('click', (event) => {
      const master = event.target.closest('.master_dropdown');
      if (!master) return; /* click outside any master panel */
      if (!master.closest('.nav-menu-dektop')) return; /* desktop scope only */
      if (event.target.closest('a')) return; /* child link → let it navigate */

      const dropdown = master.closest('.w-dropdown');
      if (dropdown) closeWebflowDropdown(dropdown);
    });
  }

  /* ── Leadership team modal (replaces Webflow IX2 a-146 / a-147) ──
   * /leadership has 8 .card_team cards, each with a nested
   * .modal2_component (content-wrapper + full-screen overlay). The IX2
   * click interactions that drove these were removed in the Designer;
   * this reproduces them 1:1 — 500ms slide (outQuad) + 500ms overlay
   * fade (ease) — and adds a11y: role=dialog, focus trap, ESC,
   * scroll-lock, focus-return. Reduced motion → 0ms. Closed-state
   * defaults are enforced by page-head CSS so there is no flash before
   * this CDN-deferred script runs; JS also resets them defensively on
   * init. */

  function bindLeadershipModals() {
    const cards = document.querySelectorAll('.card_team');
    if (!cards.length) return; /* scope: leadership page only */
    if (document.documentElement.dataset.tscLeadershipModals) return;
    document.documentElement.dataset.tscLeadershipModals = 'true';

    const SLIDE = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'; /* Webflow "outQuad" */
    const FADE = 'ease'; /* Webflow "ease" */
    const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const DUR = REDUCED ? 0 : 500;

    let active = null; /* currently open .modal2_component */
    let trigger = null; /* .card_team that opened it (for focus return) */
    let closeTimer = null;

    const parts = (modal) => ({
      wrap: modal.querySelector('.modal2_content-wrapper'),
      overlay: modal.querySelector('.modal2_background-overlay'),
    });

    const focusables = (wrap) =>
      wrap.querySelectorAll(
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
      if (overlay) {
        overlay.style.opacity = '0';
        overlay.style.transition = '';
      }
    }

    function snapClosed(modal) {
      /* instant close (used when switching between cards) */
      const { wrap, overlay } = parts(modal);
      if (wrap) {
        wrap.style.transition = '';
        wrap.style.transform = 'translateX(100%)';
      }
      if (overlay) overlay.style.opacity = '0';
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
    }

    function open(card) {
      const modal = card.querySelector('.modal2_component');
      if (!modal || active === modal) return;
      if (active) snapClosed(active); /* one modal open at a time */
      clearTimeout(closeTimer);
      active = modal;
      trigger = card;
      const { wrap, overlay } = parts(modal);
      modal.style.display = 'flex';
      modal.setAttribute('aria-hidden', 'false');
      void modal.offsetHeight; /* reflow → transition runs from initial state */
      if (wrap) {
        wrap.style.transition = 'transform ' + DUR + 'ms ' + SLIDE;
        wrap.style.transform = 'translateX(0%)';
      }
      if (overlay) {
        overlay.style.transition = 'opacity ' + DUR + 'ms ' + FADE;
        overlay.style.opacity = '1';
      }
      document.documentElement.style.overflow = 'hidden'; /* scroll lock */
      if (wrap) wrap.focus({ preventScroll: true });
    }

    function close(modal) {
      if (!modal) return;
      const { wrap, overlay } = parts(modal);
      if (wrap) {
        wrap.style.transition = 'transform ' + DUR + 'ms ' + SLIDE;
        wrap.style.transform = 'translateX(100%)';
      }
      if (overlay) {
        overlay.style.transition = 'opacity ' + DUR + 'ms ' + FADE;
        overlay.style.opacity = '0';
      }
      modal.setAttribute('aria-hidden', 'true');
      document.documentElement.style.overflow = ''; /* restore scroll */
      const returnTo = trigger;
      active = null;
      trigger = null;
      closeTimer = setTimeout(function () {
        modal.style.display = 'none';
      }, DUR);
      if (returnTo) returnTo.focus({ preventScroll: true });
    }

    cards.forEach(function (c) {
      const m = c.querySelector('.modal2_component');
      if (m) prep(m);
    });

    document.addEventListener('click', function (e) {
      const overlay = e.target.closest('.modal2_background-overlay');
      if (overlay) {
        e.stopPropagation();
        close(overlay.closest('.modal2_component'));
        return;
      }
      if (e.target.closest('.modal2_component')) return; /* click inside open modal content */
      const card = e.target.closest('.card_team');
      if (card) open(card);
    });

    document.addEventListener('keydown', function (e) {
      if (!active) return;
      if (e.key === 'Escape') {
        close(active);
        return;
      }
      if (e.key === 'Tab') {
        const wrap = parts(active).wrap;
        if (!wrap) return;
        const f = focusables(wrap);
        if (!f.length) {
          e.preventDefault();
          wrap.focus();
          return;
        }
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }

  /* ── Flatten project meta tiles ────────────────────────── */
  /* Each .projects_meta-wrapper nests its .country_tile items inside
     Finsweet CMS list wrappers (.projects_meta-list-wrapper). Lift every
     tile to be a direct child of its own wrapper, then drop the now-empty
     list wrappers, so the tiles lay out in one flat container. Scoped per
     wrapper so each project card keeps its own tiles. Idempotent: once a
     wrapper has no list wrappers, there is nothing left to move. */

  function flattenProjectMeta() {
    document.querySelectorAll('.projects_meta-wrapper').forEach((wrapper) => {
      const lists = wrapper.querySelectorAll('.projects_meta-list-wrapper');
      if (!lists.length) return;

      wrapper
        .querySelectorAll('.country_tile')
        .forEach((tile) => wrapper.appendChild(tile));

      lists.forEach((list) => list.remove());
    });
  }

  /* ── Quote author name highlight ───────────────────────── */
  /* CMS quote-author strings read "Name, Role at Company". Wrap the
     name — everything up to the first comma — in a yellow span so it
     reads apart from the role, leaving the comma and remainder as plain
     text. Idempotent via data-author-split; the strings are plain text
     (no nested markup), so rebuilding from textContent is lossless. */

  function highlightQuoteAuthors() {
    document.querySelectorAll('[data-text="quote-author"]').forEach((el) => {
      if (el.dataset.authorSplit) return;

      const text = el.textContent;
      const commaIndex = text.indexOf(',');
      const name = commaIndex === -1 ? text : text.slice(0, commaIndex);
      if (!name.trim()) return;

      el.dataset.authorSplit = 'true';

      const span = document.createElement('span');
      span.className = 'text-color-yellow';
      span.textContent = name;

      el.textContent = '';
      el.appendChild(span);
      const rest = text.slice(name.length);
      if (rest) el.appendChild(document.createTextNode(rest));
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
    if (prefersReducedMotion() || saveDataEnabled()) return;

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

  /* ── Managed background videos (breakpoint-correct hydration) ─── */
  /* Webflow's native background-video ships one <video> per breakpoint, each
     inside its own variant WRAPPER (.is-desktop / .is-mobile) that Webflow
     toggles with CSS `display`. Each <video> holds <source> children (mp4 +
     dead webm) and paints its poster as an inline background-image, so a
     source-less <video> still shows frame 0 (no black flash).

     The bandwidth problem: the browser fetches EVERY variant's <source> at
     parse time — ~19 MB, ~14 MB of it wasted on mobile (off-breakpoint +
     below-fold). Preventing that fetch requires stripping each <source src>
     BEFORE the parser reaches it, which only a synchronous inline snippet in
     the site-wide <head> can do (see `head-video-strip.html`). init.js loads
     in the FOOTER, so its own strip below runs too late to stop the initial
     fetch — measured live 2026-07-13: footer strip → all 4 fetched; head
     snippet → 0 fetched. So the division of labour is:

       • HEAD snippet (head-video-strip.html): strips <source src> → data-src
         during parse, so nothing fetches. This is what delivers the bandwidth
         win. It shares this module's data-video-processed guard + data-src
         contract.
       • init.js (here, footer): reads data-src and HYDRATES only the active
         breakpoint's <video> at the right time — hero eagerly (above fold),
         CTA on scroll, with a progressive low→high hero swap. The strip below
         is a guarded FALLBACK: if the head snippet is absent, playback still
         works (videos already cached from the parse-time fetch), just without
         the bandwidth win.

     IMPORTANT — do not "simplify" the source-stripping away. Restoring src
     from data-src is deliberate and load-bearing; `preload="none"` alone is
     insufficient for a Webflow bg-video (see spec §4 / §8 and the measured
     result above). */

  const MOBILE_BREAKPOINT = '(max-width: 991px)'; // Webflow tablet breakpoint

  function saveDataEnabled() {
    return !!(navigator.connection && navigator.connection.saveData);
  }

  /* Point a video at a single URL: prefer its first <source>, else the <video>
     src itself. Shared by the progressive low and high hydrate paths. */
  function setVideoSourceUrl(video, url) {
    const firstSource = video.querySelector('source');
    if (firstSource) firstSource.setAttribute('src', url);
    else video.setAttribute('src', url);
  }

  /* The original (high-res) URL of a stripped video — Webflow keeps it on the
     first <source>'s data-src; fall back to the <video>'s own data-src. */
  function highResUrl(video) {
    const firstSource = video.querySelector('source[data-src]');
    return (firstSource && firstSource.dataset.src) || video.dataset.src || '';
  }

  /* Move a video's live source URLs into data-src so nothing can fetch them,
     and normalise playback attributes. Idempotent (data-video-processed guard). */
  function stripVideoSources(video) {
    if (video.dataset.videoProcessed) return;
    video.dataset.videoProcessed = 'true';

    if (video.getAttribute('src')) {
      video.dataset.src = video.getAttribute('src');
      video.removeAttribute('src');
    }
    video.querySelectorAll('source').forEach((s) => {
      const url = s.getAttribute('src');
      if (url) {
        s.dataset.src = url;
        s.removeAttribute('src');
      }
    });

    video.preload = 'none';
    video.removeAttribute('autoplay');
    video.autoplay = false;
    video.muted = true;
    video.playsInline = true;
    /* No src means the video's inline background-image poster covers frame 0. */
  }

  /* Restore a video's source URLs and start playback. `lowUrl`, if given,
     points the video at a single low-res clip (progressive swap); otherwise the
     original (high-res) URLs are restored from data-src. */
  function hydrateVideo(video, lowUrl) {
    if (video.dataset.videoHydrated) return;
    video.dataset.videoHydrated = 'true';

    if (lowUrl) {
      setVideoSourceUrl(video, lowUrl);
    } else {
      if (video.dataset.src) video.setAttribute('src', video.dataset.src);
      video.querySelectorAll('source').forEach((s) => {
        if (s.dataset.src) s.setAttribute('src', s.dataset.src);
      });
    }

    video.preload = 'auto';
    video.load();
    video.play().catch(() => {}); /* swallow autoplay-policy rejection */
  }

  /* True when an element is actually rendered (has a layout box) — false for
     display:none on the element or any ancestor. Robust for absolutely- and
     fixed-positioned wrappers where offsetParent is unreliable. */
  function isRendered(el) {
    return el.getClientRects().length > 0;
  }

  /* The variant WRAPPER the browser actually renders at the current viewport.
     Webflow toggles the .is-desktop / .is-mobile wrappers with `display`, so
     prefer reading real layout over re-deriving breakpoints in JS; fall back to
     matchMedia + the variant class. */
  function activeWrapper(wrappers) {
    const rendered = wrappers.find(isRendered);
    if (rendered) return rendered;
    const mobile = window.matchMedia(MOBILE_BREAKPOINT).matches;
    return (
      wrappers.find((w) =>
        w.classList.contains(mobile ? 'is-mobile' : 'is-desktop')
      ) || wrappers[0]
    );
  }

  /* Progressive low→high swap for the hero. After the page settles, warm the
     high-res clip in a throwaway <video> (so the low clip keeps playing), then
     cut the live element over to high, preserving playback position. */
  function scheduleHeroUpgrade(video, highUrl) {
    if (!highUrl || prefersReducedMotion() || saveDataEnabled()) return;

    const upgrade = () => {
      const probe = document.createElement('video');
      probe.muted = true;
      probe.preload = 'auto';
      probe.addEventListener(
        'canplaythrough',
        () => {
          const resumeAt = video.currentTime;
          setVideoSourceUrl(video, highUrl);
          video.load();
          video.addEventListener(
            'loadedmetadata',
            () => {
              if (video.duration) video.currentTime = resumeAt % video.duration;
              video.play().catch(() => {});
            },
            { once: true }
          );
          probe.removeAttribute('src');
          probe.remove();
        },
        { once: true }
      );
      probe.addEventListener('error', () => probe.remove(), { once: true });
      probe.src = highUrl; /* warms the HTTP cache; the swap reload hits cache */
      probe.load();
    };

    /* Wait for load, then idle time, so the upgrade never contends with the
       FCP/LCP window. */
    const afterLoad = () => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(upgrade, { timeout: 2000 });
      } else {
        setTimeout(upgrade, 200);
      }
    };
    if (document.readyState === 'complete') afterLoad();
    else window.addEventListener('load', afterLoad, { once: true });
  }

  /* Hero (eager, above fold): hydrate the active variant's <video> now. The
     off-breakpoint wrapper's <video> is never hydrated, so it never fetches. */
  function hydrateHero(wrappers) {
    const wrapper = activeWrapper(wrappers);
    if (!wrapper) return;
    const video = wrapper.querySelector('video');
    if (!video || video.dataset.videoHydrated) return;

    /* Reduced motion / data-saver: stay on the poster, fetch nothing. */
    if (prefersReducedMotion() || saveDataEnabled()) return;

    /* Progressive: a low-res clip (per-video data-lowsrc, else wrapper-level
       data-video-lowsrc) buffers fast under throttling; swap to the original
       high-res source after load. No low clip → hydrate high directly. */
    const lowUrl = video.dataset.lowsrc || wrapper.dataset.videoLowsrc || '';
    if (lowUrl) {
      hydrateVideo(video, lowUrl);
      scheduleHeroUpgrade(video, highResUrl(video));
    } else {
      hydrateVideo(video);
    }
  }

  function setupBackgroundVideos() {
    const heroWrappers = Array.from(
      document.querySelectorAll('.video_about-b-video')
    );
    const ctaWrappers = Array.from(document.querySelectorAll('.video_cta'));
    if (!heroWrappers.length && !ctaWrappers.length) return;

    /* Strip every managed variant up front so nothing fetches on load. */
    [...heroWrappers, ...ctaWrappers].forEach((wrapper) => {
      wrapper.querySelectorAll('video').forEach(stripVideoSources);
    });

    /* Hero: hydrate the active variant's <video> immediately. */
    if (heroWrappers.length) hydrateHero(heroWrappers);

    /* CTA (deferred, below fold): each breakpoint variant is its own wrapper,
       and only the rendered one has a layout box, so observing all of them
       hydrates just the active variant when it nears the viewport (the
       display:none variant never intersects). Reduced motion keeps the poster,
       never auto-plays. */
    if (!prefersReducedMotion()) {
      observeOnce(
        ctaWrappers,
        (wrapper) => {
          const video = wrapper.querySelector('video');
          if (video) hydrateVideo(video);
        },
        { rootMargin: '200px 0px' }
      );
    }

    /* Resize safety: a breakpoint change can reveal an un-hydrated hero
       variant. Re-run hydrateHero (its guards make it a no-op once the active
       variant is hydrated) so the hero is never blank after a desktop↔mobile
       resize. CTA is left to its observer. One debounced listener — the only
       persistent listener this module adds (spec §10). */
    if (heroWrappers.length) {
      let resizeTimer;
      const onResize = () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => hydrateHero(heroWrappers), 200);
      };
      window.addEventListener('resize', onResize);
      window.addEventListener('orientationchange', onResize);
    }
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

    /* Otherwise let the GSAP reveal win, but never hold the LCP text longer
       than the SplitText load budget: force visibility after ~200ms (was
       1000ms). The hero heading is the LCP element, held opacity:0 for the
       reveal — a 1s hold guaranteed LCP ≥ 1s. If SplitText runs within budget
       it still wins the animation; if not, the plain H1 paints early, which is
       strictly better for LCP than a 1s hold (spec §4 2b).
       NOTE: raising GSAP/SplitText *fetch* priority (CDN preload) is head-code,
       documented in the handoff — init.js does not load GSAP itself. */
    setTimeout(reveal, 200);
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
    bindMasterDropdownClose();
    bindLeadershipModals();
    flattenProjectMeta();
    highlightQuoteAuthors();
    setupProjectVideos();

    /* Performance quick-wins — each sets up its own observers/timeouts */
    setupDeferredSpline();
    setupBackgroundVideos();
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
