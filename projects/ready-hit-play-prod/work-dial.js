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
  const WORK_DIAL_VERSION = '2026.2.6.8';
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

      // Cursor (desktop only) - use cursor.js API
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
        if (isMobile()) return;
        if (cursorIsPlay === isPlay) return;
        cursorIsPlay = isPlay;

        // Use cursor.js API - "solid-orange" state matches the old play state
        if (RHP.cursor && RHP.cursor.setState) {
          if (isPlay) {
            RHP.cursor.setState('solid-orange', 'PLAY', false);
          } else {
            RHP.cursor.setState('dot', null, false);
          }
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

        // Desktop cursor morph - use cursor.js API
        if (!isMobile() && RHP.cursor && RHP.cursor.setPosition) {
          RHP.cursor.setPosition(e.clientX, e.clientY);
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

    return { init, destroy, getActiveIndex, version: WORK_DIAL_VERSION };
  })();
})();
