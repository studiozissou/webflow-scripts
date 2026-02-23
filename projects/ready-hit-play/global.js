<script src="https://unpkg.com/@barba/core"></script>
<script src="https://unpkg.com/lenis@1.3.17/dist/lenis.min.js"></script>

<script>
/* =========================================
   RHP — Lenis Manager
   Uses official Lenis global (window.Lenis)
   ========================================= */
(() => {
  window.RHP = window.RHP || {};
  const RHP = window.RHP;

  let lenis = null;
  let rafId = null;

  const prefersReduced = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function start(options = {}) {
    if (typeof window.Lenis !== 'function') return;
    if (prefersReduced()) return;

    // If a Lenis instance already exists (e.g. from another page or wrapper),
    // tear it down so we can safely reconfigure it for the new context.
    if (lenis) {
      stop();
    }

    const defaults = {
      duration: 1.1,
      smoothWheel: true,
      smoothTouch: false
    };

    lenis = new Lenis({ ...defaults, ...options });

    const raf = (time) => {
      if (!lenis) return;
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };

    rafId = requestAnimationFrame(raf);
  }

  function stop() {
    if (!lenis) return;

    cancelAnimationFrame(rafId);
    rafId = null;

    lenis.destroy();
    lenis = null;
  }

  function resize() {
    lenis?.resize?.();
  }

  RHP.lenis = { start, stop, resize };
})();
</script>

<script>
/* =========================================
   RHP — Work Dial Module (FULL, UPDATED)
   - Client-First naming (matches your HTML)
   - Desktop: sector hover switching + tick attraction (ticks DO NOT rotate)
   - Mobile: dial rotation (ticks rotate ONLY) + Variant B stepping (updates on boundary)
   - CMS order: first 8 items in rendered order
   - Poster support: reads <img class="dial_cms-poster" ...> inside each .dial_cms-item
   - Barba-safe: init(container) / destroy()
   ========================================= */
(() => {
  window.RHP = window.RHP || {};
  const RHP = window.RHP;

  const SEL = {
    component: '.dial_component',
    canvas: '#dial_ticks-canvas',
    fgWrap: '.dial_video-wrap',
    fgVideo: '.dial_fg-video',
    bgVideo: '.dial_bg-video',
    cmsItem: '.dial_cms-item',
    cmsPoster: '.dial_cms-poster',
    title: '[data-dial-title]',
    meta: '[data-dial-meta]',
    cursorDot: '.cursor_dot',
    cursorLabel: '.cursor_label'
  };

  const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => window.matchMedia('(hover: none), (pointer: coarse)').matches;

  const mod = (n, m) => ((n % m) + m) % m;

  // 0° at TOP, clockwise
  const angleTop0 = (dx, dy) => {
    const degRight0 = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360; // 0° at right
    return (degRight0 + 90) % 360;                                       // 0° at top
  };

  // Enforce autoplay/mute/loop (Embed-safe + iOS-friendly)
  const enforceVideoPolicy = (root = document) => {
    root.querySelectorAll('video').forEach(v => {
      try {
        v.setAttribute('playsinline', '');
        v.setAttribute('muted', '');
        v.setAttribute('loop', '');
        v.setAttribute('autoplay', '');
        if (!v.getAttribute('preload')) v.setAttribute('preload', 'metadata');

        v.playsInline = true;
        v.muted = true;
        v.loop = true;
        v.autoplay = true;

        const tryPlay = () => v.play?.().catch(()=>{});
        if (v.readyState >= 2) tryPlay();
        else v.addEventListener('loadedmetadata', tryPlay, { once: true });
      } catch(e){}
    });
  };

  // Small helper to avoid repeatedly resetting the same poster/src
  const setVideoSourceAndPoster = (videoEl, src, poster) => {
    if (!videoEl) return;

    // poster first (prevents black flash)
    if (poster && videoEl.poster !== poster) videoEl.poster = poster;

    // src swap (only if changed)
    if (src && videoEl.currentSrc !== src && videoEl.src !== src) {
      videoEl.src = src;
      try { videoEl.load(); } catch(e){}
    }
  };

  RHP.workDial = (() => {
    let alive = false;
    let cleanup = [];
    let rafId = 0;
    let refs = null;

    function on(el, evt, fn, opts) {
      if (!el) return;
      el.addEventListener(evt, fn, opts);
      cleanup.push(() => el.removeEventListener(evt, fn, opts));
    }

    function stop() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    }

    function init(container = document) {
      if (alive) return;
      alive = true;
      cleanup = [];

      const comp = container.querySelector(SEL.component) || document.querySelector(SEL.component);
      const canvas = container.querySelector(SEL.canvas) || document.querySelector(SEL.canvas);
      const fgWrap = comp ? comp.querySelector(SEL.fgWrap) : document.querySelector(SEL.fgWrap);

      if (!comp || !canvas || !fgWrap) {
        alive = false;
        return;
      }

      // Make sure videos behave even if attributes get stripped later
      enforceVideoPolicy(comp);

      const ctx = canvas.getContext('2d');
      const titleEl = container.querySelector(SEL.title) || document.querySelector(SEL.title);
      const metaEl  = container.querySelector(SEL.meta)  || document.querySelector(SEL.meta);

      const cmsItems = Array.from(container.querySelectorAll(SEL.cmsItem));
      const items = cmsItems.length ? cmsItems : Array.from(document.querySelectorAll(SEL.cmsItem));
      const N = Math.min(8, items.length);

      if (!N) {
        alive = false;
        return;
      }

      // Dynamic sector sizing
      const sectorSize = 360 / N;
      const sectorOffset = sectorSize / 2; // centered wedge

      // Cursor (desktop only)
      const cursorDot = document.querySelector(SEL.cursorDot);
      const cursorLabel = document.querySelector(SEL.cursorLabel);
      let cursorIsPlay = false;

      // Tick rendering config
      const T = {
        bars: 96,
        barW: 2,
        baseLen: 32,
        maxLen: 80,
        nearPx: 80,
        radFalloff: 320,
        angFalloff: 18,
        teal: { r:0, g:240, b:200 },
        orange: { r:255, g:130, b:0 },
        gap: 24
      };
      const mix = (a,b,t)=>`rgb(${(a.r+(b.r-a.r)*t|0)},${(a.g+(b.g-a.g)*t|0)},${(a.b+(b.b-a.b)*t|0)})`;

      // Geometry derived from rendered circle
      const geom = { cx:0, cy:0, videoR:0, innerR:0, switchMaxR:0, dpr: window.devicePixelRatio||1 };

      // Runtime state
      const state = {
        // pointer
        x:-1e4, y:-1e4,
        angDeg:0, rDist:1e9,

        // zones
        inInner:false,
        inSwitch:false,

        // selection
        activeIndex: 0,
        lastIndex: -1,

        // mobile dial
        rotationDeg: 0,
        dragActive: false,
        dragStartY: 0,
        dragStartRot: 0,
        startedInInner: false
      };

      function setCursorPlay(isPlay) {
        if (!cursorDot || isMobile()) return;
        if (cursorIsPlay === isPlay) return;
        cursorIsPlay = isPlay;

        const gsap = window.gsap;
        const reduced = prefersReduced();

        if (gsap) {
          if (isPlay) {
            gsap.to(cursorDot, { duration: reduced ? 0 : 0.22, width: 86, height: 86, backgroundColor:'#ff8200', ease:'expo.out' });
            if (cursorLabel) gsap.to(cursorLabel, { duration: reduced ? 0 : 0.18, opacity:1, scale:1, ease:'power2.out', delay: reduced ? 0 : 0.03 });
          } else {
            if (cursorLabel) gsap.to(cursorLabel, { duration: reduced ? 0 : 0.12, opacity:0, scale:0.9, ease:'power2.out' });
            gsap.to(cursorDot, { duration: reduced ? 0 : 0.16, width: 12, height: 12, backgroundColor:'#ffffff', ease:'power2.out' });
          }
        } else {
          cursorDot.style.width = isPlay ? '86px' : '12px';
          cursorDot.style.height = isPlay ? '86px' : '12px';
          cursorDot.style.background = isPlay ? '#ff8200' : '#fff';
          if (cursorLabel) cursorLabel.style.opacity = isPlay ? '1' : '0';
        }
      }

      function readPosterFromItem(item) {
        // Prefer the actual rendered <img> (Webflow CMS image)
        const img = item ? item.querySelector(SEL.cmsPoster) : null;
        if (!img) return '';
        // Use currentSrc when available (if responsive), else src
        return img.currentSrc || img.src || '';
      }

      // Navigate to the currently active case study (Barba-aware)
      function goToActiveCase(e, items, state) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }

        const idx = state?.activeIndex ?? 0;
        const item = items[idx];
        if (!item) return;

        // Prefer explicit data attributes if present
        const dataRaw =
          item.getAttribute('data-url') ||
          item.getAttribute('data-case-url') ||
          item.getAttribute('data-link');

        // Fallback: first anchor inside the CMS item
        const linkEl = item.querySelector('a[href]');

        let url = dataRaw || linkEl?.href || '';
        if (!url) return;

        // If author only provided a slug (e.g. "my-case"), build the full case-studies path
        if (!url.startsWith('http') && !url.startsWith('/')) {
          url = `/case-studies/${url.replace(/^\/+/, '')}`;
        }

        if (window.barba && typeof window.barba.go === 'function') {
          window.barba.go(url);
        } else {
          window.location.href = url;
        }
      }

      function applyActive(idx) {
        idx = mod(idx, N);
        if (idx === state.lastIndex) return;
        state.lastIndex = idx;
        state.activeIndex = idx;

        const item = items[idx];
        if (!item) return;

        const t = item.getAttribute('data-title') || '';
        const m = item.getAttribute('data-meta') || '';
        const v = item.getAttribute('data-video') || '';
        const poster = readPosterFromItem(item);

        if (titleEl) titleEl.textContent = t;
        if (metaEl)  metaEl.textContent  = m;

        const fgVideo = comp.querySelector(SEL.fgVideo) || document.querySelector(SEL.fgVideo);
        const bgVideo = comp.querySelector(SEL.bgVideo) || document.querySelector(SEL.bgVideo);

        // Foreground: set poster, then src
        setVideoSourceAndPoster(fgVideo, v, poster);

        // Background: optional; only if it is a <video>
        if (bgVideo && bgVideo.tagName === 'VIDEO') {
          setVideoSourceAndPoster(bgVideo, v, poster);
        }

        // Ensure mute/loop/autoplay after swaps
        enforceVideoPolicy(comp);
      }

      function resize() {
        const r = comp.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        geom.dpr = dpr;

        canvas.width = r.width * dpr;
        canvas.height = r.height * dpr;
        canvas.style.width = r.width + 'px';
        canvas.style.height = r.height + 'px';
        ctx.setTransform(dpr,0,0,dpr,0,0);

        geom.cx = r.width / 2;
        geom.cy = r.height / 2;

        const fr = fgWrap.getBoundingClientRect();
        geom.videoR = (Math.min(fr.width, fr.height) / 2) || 320;
        geom.innerR = geom.videoR + T.gap;

        const outerBase = geom.innerR + T.baseLen;
        geom.switchMaxR = outerBase + T.maxLen + 90;
      }

      // Hysteresis thresholds (prevents boundary flicker)
      const H = {
        innerEnter: () => geom.innerR - 6,
        innerExit:  () => geom.innerR + 10,
        switchEnter:() => geom.switchMaxR - 10,
        switchExit: () => geom.switchMaxR + 20
      };

      // Desktop hover switching + cursor follow
      function onPointerMove(e) {
        const rect = canvas.getBoundingClientRect();
        state.x = e.clientX - rect.left;
        state.y = e.clientY - rect.top;

        const dx = state.x - geom.cx;
        const dy = state.y - geom.cy;
        state.rDist = Math.hypot(dx, dy);
        state.angDeg = angleTop0(dx, dy);

        // Zone updates (hysteresis)
        if (!state.inInner && state.rDist <= H.innerEnter()) state.inInner = true;
        else if (state.inInner && state.rDist >= H.innerExit()) state.inInner = false;

        if (!state.inSwitch && state.rDist <= H.switchEnter() && state.rDist > geom.innerR) state.inSwitch = true;
        else if (state.inSwitch && (state.rDist >= H.switchExit() || state.rDist <= geom.innerR)) state.inSwitch = false;

        // Desktop: switch only when inSwitch and NOT inInner
        if (!isMobile() && state.inSwitch && !state.inInner) {
          const idx = Math.floor(mod(state.angDeg + sectorOffset, 360) / sectorSize);
          applyActive(idx);
        }

        // Desktop cursor morph
        if (!isMobile() && cursorDot) {
          cursorDot.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
          setCursorPlay(state.inInner);
        }
      }

      function onPointerLeave() {
        state.x = -1e4; state.y = -1e4;
        state.rDist = 1e9;
        state.inInner = false;
        state.inSwitch = false;
        if (!isMobile()) setCursorPlay(false);
      }

      // Mobile dial: vertical drag rotates ticks only; update index per snap step (Variant B)
      const ROTATE_PER_PX = 0.22; // deg per px (tune)
      function onPointerDown(e) {
        if (!isMobile()) return;
        state.dragActive = true;
        state.dragStartY = e.clientY;
        state.dragStartRot = state.rotationDeg;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        state.startedInInner = (Math.hypot(x - geom.cx, y - geom.cy) <= geom.innerR);
      }

      function onPointerUp() {
        if (!isMobile()) return;
        state.dragActive = false;
        state.startedInInner = false;
      }

      function onPointerMoveMobile(e) {
        if (!isMobile() || !state.dragActive) return;
        if (state.startedInInner) return;

        const dy = e.clientY - state.dragStartY;
        state.rotationDeg = state.dragStartRot + (-dy * ROTATE_PER_PX);

        // Variant B: update active index as steps cross boundaries
        const stepped = Math.round(state.rotationDeg / sectorSize);
        applyActive(mod(stepped, N));
      }

      // Optional: wheel as dial input on coarse-pointer devices (prevents page scroll/address bar)
      function onWheel(e) {
        if (!isMobile()) return;
        e.preventDefault();

        const delta = (Math.abs(e.deltaY) > Math.abs(e.deltaX)) ? e.deltaY : e.deltaX;
        state.rotationDeg += (-delta * 0.08); // tune sensitivity

        const stepped = Math.round(state.rotationDeg / sectorSize);
        applyActive(mod(stepped, N));
      }

      // Prevent real page scroll while dragging (keeps browser UI calmer)
      function preventTouchScroll(e) {
        if (isMobile() && state.dragActive) e.preventDefault();
      }

      function onVis() {
        if (document.hidden) stop();
        else if (alive) {
          stop();
          rafId = requestAnimationFrame(draw);
        }
      }

      function draw() {
        if (!alive) return;

        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        ctx.clearRect(0, 0, w, h);

        // Mobile: rotate ticks ONLY (labels are separate DOM)
        if (isMobile()) {
          canvas.style.transform = `rotate(${state.rotationDeg}deg)`;

          // draw neutral ticks (cheap)
          for (let i = 0; i < T.bars; i++) {
            const a = (i / T.bars) * Math.PI * 2;
            const len = T.baseLen;

            ctx.strokeStyle = mix(T.teal, T.orange, 0);
            ctx.lineWidth = T.barW;
            ctx.lineCap = 'round';

            const x0 = geom.cx + Math.cos(a) * geom.innerR;
            const y0 = geom.cy + Math.sin(a) * geom.innerR;
            const x1 = geom.cx + Math.cos(a) * (geom.innerR + len);
            const y1 = geom.cy + Math.sin(a) * (geom.innerR + len);

            ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
          }

          rafId = requestAnimationFrame(draw);
          return;
        }

        // Desktop: ticks never rotate
        canvas.style.transform = 'rotate(0deg)';

        const hasPointer = state.x > -1e3;
        const reduced = prefersReduced();

        const OUTER_R_BASE = geom.innerR + T.baseLen;
        const dToInner = Math.abs(state.rDist - geom.innerR);
        const dToOuter = Math.abs(state.rDist - OUTER_R_BASE);
        const dEdge = Math.min(dToInner, dToOuter);

        for (let i = 0; i < T.bars; i++) {
          const a = (i / T.bars) * Math.PI * 2;
          const deg = (i / T.bars) * 360;

          let inf = 0;
          if (hasPointer && !reduced) {
          	const degTop0 = (deg + 90) % 360;
    		const dAng = Math.min(Math.abs(degTop0 - state.angDeg), 360 - Math.abs(degTop0 - state.angDeg));
            const iAng = Math.max(0, 1 - dAng / T.angFalloff);
            const iRad = Math.max(0, 1 - Math.max(0, dEdge - T.nearPx) / T.radFalloff);
            inf = iAng * iRad;
          }

          const len = T.baseLen + (T.maxLen - T.baseLen) * inf;
          const warm = state.inInner ? inf : 0;

          ctx.strokeStyle = mix(T.teal, T.orange, warm);
          ctx.lineWidth = T.barW;
          ctx.lineCap = 'round';

          const x0 = geom.cx + Math.cos(a) * geom.innerR;
          const y0 = geom.cy + Math.sin(a) * geom.innerR;
          const x1 = geom.cx + Math.cos(a) * (geom.innerR + len);
          const y1 = geom.cy + Math.sin(a) * (geom.innerR + len);

          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        }

        rafId = requestAnimationFrame(draw);
      }

      // Boot
      resize();
      applyActive(0);

      on(window, 'resize', resize, { passive: true });
      on(comp, 'pointermove', onPointerMove, { passive: true });
      on(comp, 'pointerleave', onPointerLeave, { passive: true });

      on(comp, 'pointerdown', onPointerDown, { passive: true });
      on(comp, 'pointermove', onPointerMoveMobile, { passive: true });
      on(window, 'pointerup', onPointerUp, { passive: true });

      on(comp, 'wheel', onWheel, { passive: false });
      on(window, 'touchmove', preventTouchScroll, { passive: false });

      // Center dial layer click → go to active case study (Barba transition)
      const dialFg = comp.querySelector('.dial_layer-fg') || document.querySelector('.dial_layer-fg');
      if (dialFg) {
        dialFg.style.cursor = 'pointer';
        on(dialFg, 'click', (e) => goToActiveCase(e, items, state), { passive: false });
      }

      on(document, 'visibilitychange', onVis, { passive: true });

      // iOS: kick videos again on first gesture
      on(window, 'pointerdown', () => enforceVideoPolicy(comp), { once: true, passive: true });

      rafId = requestAnimationFrame(draw);

      refs = {
        getActiveIndex: () => state.activeIndex
      };
    }

    function destroy() {
      if (!alive) return;
      alive = false;

      stop();
      cleanup.forEach(fn => { try { fn(); } catch(e){} });
      cleanup = [];
      refs = null;
    }

    function getActiveIndex() {
      return refs?.getActiveIndex?.() ?? 0;
    }

    return { init, destroy, getActiveIndex };
  })();
})();
</script>

<script>
/* =========================================
   RHP — Orchestrator (Barba conductor)
   + Scroll lock only on home
   + Lenis on all non-home pages
   ========================================= */
(() => {
  window.RHP = window.RHP || {};
  const RHP = window.RHP;

  /* -----------------------------
     DOM ready helper
     ----------------------------- */
  const ready = (fn) => {
    if (
      document.readyState === 'complete' ||
      document.readyState === 'interactive'
    ) {
      fn();
    } else {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    }
  };

  /* -----------------------------
     Scroll manager (CSS-level)
     ----------------------------- */
  RHP.scroll = RHP.scroll || (() => {
    let locked = false;

    const lock = () => {
      if (locked) return;
      locked = true;

      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100%';

      document.documentElement.classList.add('no-scroll');
      document.body.classList.add('no-scroll');
    };

    const unlock = () => {
      locked = false;

      document.documentElement.style.overflow = 'auto';
      document.body.style.overflow = 'auto';
      document.body.style.height = '';

      document.documentElement.classList.remove('no-scroll');
      document.body.classList.remove('no-scroll');
    };

    return { lock, unlock };
  })();

  /* -----------------------------
     Views
     ----------------------------- */
  RHP.views = RHP.views || {};

  // Home view (dial owns scroll)
  RHP.views.home = RHP.views.home || (() => {
    let active = false;

    return {
      init(container) {
        if (active) return;
        active = true;

        // ❌ No Lenis on home
        RHP.lenis?.stop();

        // 🔒 Lock scroll
        RHP.scroll.unlock(); // defensive reset
        RHP.scroll.lock();

        // Init dial
        RHP.workDial?.init?.(container);
      },

      destroy() {
        if (!active) return;
        active = false;

        RHP.workDial?.destroy?.();
        RHP.scroll.unlock();
      }
    };
  })();

  // Factory for scrollable pages (window scroll)
  const makeScrollPage = () => ({
    init() {
      RHP.scroll.unlock();
      RHP.lenis?.start();
      RHP.lenis?.resize();
    },
    destroy() {}
  });

  RHP.views.about   = RHP.views.about   || makeScrollPage();

  // Case view: Lenis on an inner scrollable wrapper instead of window
  RHP.views.case = RHP.views.case || (() => {
    let active = false;

    return {
      init(container) {
        if (active) return;
        active = true;

        RHP.scroll.unlock();

        const wrapper =
          container.querySelector('[data-case-scroll-wrapper]') ||
          container.querySelector('.case-scroll-wrapper');

        const content =
          wrapper?.querySelector('[data-case-scroll-content]') ||
          wrapper?.firstElementChild ||
          null;

        // If we find a specific scroll wrapper, bind Lenis to it.
        // Otherwise, fall back to normal window scroll.
        if (wrapper && content) {
          RHP.lenis?.stop();
          RHP.lenis?.start({
            wrapper,
            content
          });
          RHP.lenis?.resize();
        } else {
          RHP.lenis?.start();
          RHP.lenis?.resize();
        }
      },

      destroy() {
        if (!active) return;
        active = false;
        // Let global logic decide when to stop Lenis; no-op here.
      }
    };
  })();

  RHP.views.contact = RHP.views.contact || makeScrollPage();

  /* -----------------------------
     Initial boot (no Barba nav yet)
     ----------------------------- */
  function bootCurrentView() {
    const container = document.querySelector('[data-barba="container"]');
    const ns = container?.getAttribute('data-barba-namespace');

    if (ns !== 'home') {
      RHP.scroll.unlock();
      // For case view we let its own init decide how to configure Lenis
      if (ns !== 'case') {
        RHP.lenis?.start();
        RHP.lenis?.resize();
      }
    }

    if (ns && RHP.views[ns]?.init) {
      RHP.views[ns].init(container);
    }
  }

  /* -----------------------------
     Barba init
     ----------------------------- */
  function initBarba() {
    if (!window.barba) {
      bootCurrentView();
      return;
    }

    bootCurrentView();

    let currentNs =
      document
        .querySelector('[data-barba="container"]')
        ?.getAttribute('data-barba-namespace') || '';

    barba.init({
      transitions: [{
        name: 'rhp-core',

        beforeLeave(data) {
          const ns = data.current?.namespace || currentNs;
          if (ns && RHP.views[ns]?.destroy) {
            RHP.views[ns].destroy();
          }
        },

        enter() {
          // Always reset scroll position
          window.scrollTo(0, 0);
        },

        afterEnter(data) {
          currentNs = data.next?.namespace || '';
          const ns = currentNs;
          
          // Animate dial_layer-fg with GSAP based on namespace
          const dialFg = data.next.container.querySelector('.dial_layer-fg') || document.querySelector('.dial_layer-fg');
          if (dialFg && window.gsap) {
            // Helper to read CSS custom properties (responsive values)
            const getCSSVar = (varName) => {
              return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
            };
            
            // Read responsive values from CSS custom properties
            const homeWidth = getCSSVar('--dial-home-width') || '37.5rem';
            const homeHeight = getCSSVar('--dial-home-height') || '37.5rem';
            const homeBorderRadius = getCSSVar('--dial-home-border-radius') || '1000rem';
            const homeAspectRatio = getCSSVar('--dial-home-aspect-ratio') || '1';
            
            const caseWidth = getCSSVar('--dial-case-width') || '78vw';
            const caseHeight = getCSSVar('--dial-case-height') || '85dvh';
            const caseBorderRadius = getCSSVar('--dial-case-border-radius') || '7.5rem';
            const caseAspectRatio = getCSSVar('--dial-case-aspect-ratio') || 'auto';
            
            if (ns === 'case' || ns === 'about') {
              // Set initial state (home style) - including non-animatable properties
              gsap.set(dialFg, {
                width: homeWidth,
                height: homeHeight,
                borderRadius: homeBorderRadius,
                aspectRatio: homeAspectRatio,
                overflow: 'visible'
              });
              dialFg.style.display = 'grid';
              dialFg.style.flexFlow = 'row';
              
              // Add class for CSS fallback
              dialFg.classList.add('is-case-study');
              
              // Set non-animatable properties immediately
              dialFg.style.display = 'flex';
              dialFg.style.flexFlow = 'column';
              
              // Animate animatable properties using responsive CSS variables
              gsap.to(dialFg, {
                width: caseWidth,
                height: caseHeight,
                borderRadius: caseBorderRadius,
                aspectRatio: caseAspectRatio,
                overflow: 'auto',
                duration: 0.8,
                ease: 'power2.inOut'
              });
            } else {
              // Home state
              const prevNs = data.current?.namespace;
              
              // If coming from case-study, animate back (reverse animation)
              if (prevNs === 'case' || prevNs === 'about') {
                // Set initial state to case-study (where we're coming from)
                gsap.set(dialFg, {
                  width: caseWidth,
                  height: caseHeight,
                  borderRadius: caseBorderRadius,
                  aspectRatio: caseAspectRatio,
                  overflow: 'auto'
                });
                dialFg.style.display = 'flex';
                dialFg.style.flexFlow = 'column';
                
                // Remove class
                dialFg.classList.remove('is-case-study');
                
                // Set non-animatable properties immediately for home state
                dialFg.style.display = 'grid';
                dialFg.style.flexFlow = 'row';
                
                // Animate back to home state (reverse animation)
                gsap.to(dialFg, {
                  width: homeWidth,
                  height: homeHeight,
                  borderRadius: homeBorderRadius,
                  aspectRatio: homeAspectRatio,
                  overflow: 'visible',
                  duration: 0.8,
                  ease: 'power2.inOut'
                });
              } else {
                // Already on home or initial load - just ensure class is removed
                dialFg.classList.remove('is-case-study');
              }
            }
          } else if (dialFg) {
            // Fallback: just add/remove class if GSAP not available
            if (ns === 'case' || ns === 'about') {
              dialFg.classList.add('is-case-study');
            } else {
              dialFg.classList.remove('is-case-study');
            }
          }

          // 🔁 Scroll mode switch
          if (ns === 'home') {
            RHP.lenis?.stop();
            RHP.scroll.lock();
          } else {
            RHP.scroll.unlock();
            // Let the case view configure its own Lenis instance on its wrapper
            if (ns !== 'case') {
              RHP.lenis?.start();
              RHP.lenis?.resize();
            }
          }

          if (ns && RHP.views[ns]?.init) {
            RHP.views[ns].init(data.next.container);
          }

          // Re-initialize native Webflow Interactions (GSAP-powered)
          try {
            if (window.Webflow && typeof window.Webflow.require === 'function') {
              const ix2 = window.Webflow.require('ix2');
              if (ix2 && typeof ix2.init === 'function') {
                ix2.init();
              }
            }
          } catch (e) {
            // Safe-guard: if Webflow internals change, don't break the transition.
          }

          // Notify any custom page-level scripts so they can re-initialize on Barba transitions.
          try {
            const ev = new CustomEvent('rhp:barba:afterenter', {
              detail: { namespace: ns, container: data.next.container }
            });
            window.dispatchEvent(ev);
          } catch (e) {
            // CustomEvent might not exist in very old browsers; ignore.
          }
        }
      }]
    });
  }

  ready(initBarba);
})();
</script>

<!-- Make all links opening in a new tab 'noreferrer noopener' -->
<script>document.addEventListener('DOMContentLoaded', () => { const links = document.querySelectorAll('a[target="_blank"]'); links.forEach(link => { link.setAttribute('rel', 'noreferrer noopener'); });});</script>
<!-- Update the copyright year in the footer to the current year -->
<script>var y=document.getElementById("year");y&&(y.innerText=new Date().getFullYear());</script>
<!-- Add hidden fields to each form to track conversion pages and UTMs -->
<script> $(document).ready(function() { var currentUrl = window.location.href; function getUrlParams(url) { var params = {}; var parser = document.createElement('a'); parser.href = url; var query = parser.search.substring(1); var vars = query.split('&'); for (var i = 0; i < vars.length; i++) { var pair = vars[i].split('='); if (pair.length === 2) { params[pair[0]] = decodeURIComponent(pair[1]); } } return params; } var urlParams = getUrlParams(currentUrl); var urlWithoutUTMs = currentUrl.split('?')[0]; var cleanQueryParams = []; for (var key in urlParams) { if (!key.startsWith('utm_')) { cleanQueryParams.push(key + '=' + encodeURIComponent(urlParams[key])); } } if (cleanQueryParams.length > 0) { urlWithoutUTMs += '?' + cleanQueryParams.join('&'); } $('form').each(function() { var hiddenInput = $('<input>') .attr('type', 'hidden') .attr('name', 'Conversion Page') .attr('value', urlWithoutUTMs); $(this).append(hiddenInput); for (var key in urlParams) { if (key.startsWith('utm_')) { var utmInput = $('<input>') .attr('type', 'hidden') .attr('name', key) .attr('value', urlParams[key]); $(this).append(utmInput); } } }); });</script>
<!-- Slater integration removed; GSAP should be initialized by your own scripts per view -->
