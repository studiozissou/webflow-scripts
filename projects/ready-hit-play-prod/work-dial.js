/* =========================================
   RHP — Work Dial Module (FULL, UPDATED)
   - Client-First naming (matches your HTML)
   - Desktop: sector hover switching + tick attraction (ticks DO NOT rotate)
   - Mobile: dial rotation (ticks rotate ONLY) + Variant B stepping (updates on boundary)
   - Sector highlight: active sector ticks show orange→teal gradient, 0.1s linear transition
   - CMS order: first 8 items in rendered order
   - Poster support: reads <img class="dial_cms-poster" ...> inside each .dial_cms-item
   - Barba-safe: init(container) / destroy()
   - State machine: IDLE (mouse far, generic video) → ACTIVE (mouse near) → ENGAGED (fg hover)
   ========================================= */
(() => {
  const WORK_DIAL_VERSION = '2026.2.27.6';

  const GENERIC_VIDEO_URL = 'https://player.vimeo.com/progressive_redirect/playback/1167326952/rendition/1080p/file.mp4%20%281080p%29.mp4?loc=external&log_user=0&signature=4c9f59a80eb73bfb63fbb583702ad948afb7ca16fe99d5c12a85733e282f76bc';

  const DIAL_STATES = { IDLE: 'idle', ACTIVE: 'active', ENGAGED: 'engaged' };
  window.RHP = window.RHP || {};
  const RHP = window.RHP;

  // Global video state: playback position per index + case-study handoff (set by orchestrator)
  if (typeof RHP.videoState === 'undefined') {
    RHP.videoState = { byIndex: {}, caseHandoff: null };
  }

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
    let driftRafId = 0; // module-level so destroy() can cancel it
    let refs = null;
    let introMode = false;
    let introComplete = false;
    let attractionEnabled = true;
    let dialState = DIAL_STATES.IDLE;
    let interactionUnlocked = false;
    let genericVideo = null;
    let genericVideoComp = null; // comp ref for setDialState (set during init)

    function setDialUiOpacity(targetOpacity) {
      const dialUi = genericVideoComp?.querySelector('.dial_layer-ui') || document.querySelector('.dial_layer-ui');
      if (!dialUi) return;
      if (window.gsap) {
        window.gsap.to(dialUi, { opacity: targetOpacity, duration: 0.3, ease: 'linear', overwrite: true });
      } else {
        dialUi.style.opacity = String(targetOpacity);
      }
    }

    function on(el, evt, fn, opts) {
      if (!el) return;
      el.addEventListener(evt, fn, opts);
      cleanup.push(() => el.removeEventListener(evt, fn, opts));
    }

    function stop() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    }

    // Module-level stop for the drift monitor RAF (mirrors stop() above)
    function stopDriftMonitorGlobal() {
      if (driftRafId) cancelAnimationFrame(driftRafId);
      driftRafId = 0;
    }

    function init(container = document, options = {}) {
      if (alive) return;
      alive = true;
      cleanup = [];
      introMode = options.introMode === true;
      introComplete = !introMode;
      attractionEnabled = !introMode;

      const hasHandoff = !!(RHP.videoState?.caseHandoff);
      // Fresh load (introMode): stay IDLE until onIntroComplete() called
      // Barba return with handoff: start ACTIVE but locked until orchestrator unlocks
      // Barba return without handoff: immediately unlocked (no intro, no lock needed)
      dialState = hasHandoff ? DIAL_STATES.ACTIVE : DIAL_STATES.IDLE;
      interactionUnlocked = !introMode && !hasHandoff;

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

      // Sliding window (active ± 1): two pool videos preload prev/next; when switching to adjacent and ready, swap into visible slot for instant switch
      let poolPrev = document.createElement('video');
      let poolNext = document.createElement('video');
      [poolPrev, poolNext].forEach(function (el) {
        el.setAttribute('aria-hidden', 'true');
        el.setAttribute('muted', '');
        el.setAttribute('playsinline', '');
        el.setAttribute('loop', '');
        el.setAttribute('preload', 'auto');
        el.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;left:-9999px;';
        comp.appendChild(el);
      });
      cleanup.push(function () { poolPrev.remove(); poolNext.remove(); bgPoolPrev.remove(); bgPoolNext.remove(); if (bgVisible && bgVisible.parentNode) bgVisible.parentNode.removeChild(bgVisible); bgVisible = null; stopDriftMonitorGlobal(); });

      let bgPoolPrev = document.createElement('video');
      let bgPoolNext = document.createElement('video');
      [bgPoolPrev, bgPoolNext].forEach(el => {
        el.setAttribute('aria-hidden', 'true');
        el.setAttribute('muted', '');
        el.setAttribute('playsinline', '');
        el.setAttribute('loop', '');
        el.setAttribute('preload', 'auto');
        el.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;left:-9999px;';
        comp.appendChild(el);
      });
      let bgVisible = null;                              // currently visible bg <video> element
      let bgLoadWindowIndices = { prev: null, next: null };

      // Generic video: dedicated element for IDLE state (never touches project video pool)
      genericVideo = document.createElement('video');
      genericVideo.className = 'dial_generic-video';
      genericVideo.src = GENERIC_VIDEO_URL;
      genericVideo.muted = true;
      genericVideo.loop = true;
      genericVideo.setAttribute('playsinline', '');
      genericVideo.setAttribute('preload', 'auto');
      genericVideo.setAttribute('aria-hidden', 'true');
      // Starts hidden; home-intro fades it in via getIntroVideoEl(), or setDialState shows it instantly
      genericVideo.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;opacity:0;z-index:0;';
      comp.appendChild(genericVideo);
      cleanup.push(() => { genericVideo?.remove(); genericVideo = null; });
      genericVideoComp = comp;
      try { genericVideo.play().catch(() => {}); } catch(e) {}
      let intentionallyPaused = false;
      let playPairedGen = 0; // increment on each playPaired call; stale bg callbacks bail out
      let loadWindowIndices = { prev: null, next: null };
      let visibleVideo = null; // set on first applyActive: the video element currently in fgWrap (may be original fg or a swapped-in pool element)
      let bgVideoRef = null;   // persistent ref to .dial_bg-video for sync

      // Dynamic sector sizing
      const sectorSize = 360 / N;
      const sectorOffset = sectorSize / 2; // centered wedge

      // Cursor (desktop only) - use cursor.js API
      let cursorIsPlay = false;

      // Tick rendering config — ratios from design SVG (506×506, tick ~22.5×1.69px)
      const REF_R = 253; // SVG radius = 506/2
      const TICK_INTRO = { bars: 96, tickDur: 0.7, totalDur: 3.5 };
      TICK_INTRO.stagger = (TICK_INTRO.totalDur - TICK_INTRO.tickDur) / Math.max(1, TICK_INTRO.bars - 1);
      const TWELVE_OCLOCK_IDX = Math.floor((3 / 4) * TICK_INTRO.bars);
      const T = {
        bars: 96,
        barWRatio: 1.686 / REF_R,
        baseLenRatio: 22.51 / REF_R,
        maxLenRatio: 64 / REF_R, // longest attracted tick (adjust this number to change length)
        nearPxRatio: 80 / REF_R,
        radFalloffRatio: 1,
        angFalloff: 18,
        gapRatio: 24 / REF_R,
        switchBufferRatio: 90 / REF_R,
        teal: { r:5, g:239, b:191 },   // #05EFBF
        orange: { r:254, g:94, b:0 }   // #FE5E00
      };
      const mix = (a,b,t)=>`rgb(${(a.r+(b.r-a.r)*t|0)},${(a.g+(b.g-a.g)*t|0)},${(a.b+(b.b-a.b)*t|0)})`;

      // Geometry derived from rendered circle (scaled values filled in resize)
      const geom = { cx:0, cy:0, fgCX:0, fgCY:0, videoR:0, innerR:0, switchMaxR:0, dpr:1, gap:0, baseLen:0, maxLen:0, barW:1, nearPx:0, radFalloff:0 };

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

        // sector highlight (0.4s linear transition when sector changes)
        prevActiveIndex: 0,
        sectorHighlightEase: 1,

        // mobile dial
        rotationDeg: 0,
        dragActive: false,
        dragStartY: 0,
        dragStartRot: 0,
        startedInInner: false,

        // attraction ease (smooth in/out when pointer enters)
        attractionEase: 0
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

      function setDialState(newState) {
        if (dialState === newState) return;
        dialState = newState;

        const bgVideo = bgVideoRef || genericVideoComp?.querySelector(SEL.bgVideo) || document.querySelector(SEL.bgVideo);

        if (newState === DIAL_STATES.IDLE) {
          // Show generic video, hide project bg video + fg layer, hide dial UI
          const gsap = window.gsap;
          const reduced = prefersReduced();
          const dialFgEl = comp.querySelector('.dial_layer-fg') || document.querySelector('.dial_layer-fg');
          // Resume and fade in generic video
          if (genericVideo) {
            try { genericVideo.play().catch(() => {}); } catch(e) {}
            if (gsap && !reduced) gsap.to(genericVideo, { opacity: 1, duration: 0.3, ease: 'linear', overwrite: true });
            else genericVideo.style.opacity = '1';
          }
          // Fade out project bg video + blur, then pause
          if (bgVideo) {
            if (gsap && !reduced) {
              gsap.to(bgVideo, { opacity: 0, filter: 'blur(0px)', duration: 0.3, ease: 'linear', overwrite: 'auto',
                onComplete: () => { try { bgVideo.pause(); } catch(e) {} } });
            } else {
              bgVideo.style.opacity = '0';
              bgVideo.style.filter = 'blur(0px)';
              try { bgVideo.pause(); } catch(e) {}
            }
          }
          // Fade out fg layer (hides fg video inside it) and pause fg video
          if (dialFgEl) {
            if (gsap && !reduced) gsap.to(dialFgEl, { opacity: 0, duration: 0.3, ease: 'linear', overwrite: 'auto' });
            else dialFgEl.style.opacity = '0';
          }
          if (visibleVideo) try { visibleVideo.pause(); } catch(e) {}
          // Fade in step text
          document.querySelectorAll('[data-text="step"]').forEach(el => {
            if (gsap && !reduced) gsap.to(el, { opacity: 1, duration: 0.3, ease: 'linear', overwrite: 'auto' });
            else el.style.opacity = '1';
          });
          setDialUiOpacity(0);
          if (!isMobile()) setCursorPlay(false);
          // Task: video-sync-drift-monitor — stop drift loop in IDLE
          stopDriftMonitor();
        } else if (newState === DIAL_STATES.ACTIVE) {
          // Hide generic video, show project bg video + fg layer, show dial UI
          const gsap = window.gsap;
          const reduced = prefersReduced();
          const dialFgEl = comp.querySelector('.dial_layer-fg') || document.querySelector('.dial_layer-fg');
          // Fade out generic video, then pause
          if (genericVideo) {
            if (gsap && !reduced) {
              gsap.to(genericVideo, { opacity: 0, duration: 0.3, ease: 'linear', overwrite: true,
                onComplete: () => { try { genericVideo.pause(); } catch(e) {} } });
            } else {
              genericVideo.style.opacity = '0';
              try { genericVideo.pause(); } catch(e) {}
            }
          }
          // Fade in project bg video with blur
          if (bgVideo) {
            if (gsap && !reduced) gsap.to(bgVideo, { opacity: 1, filter: 'blur(40px)', duration: 0.3, ease: 'linear', overwrite: 'auto' });
            else { bgVideo.style.opacity = '1'; bgVideo.style.filter = 'blur(40px)'; }
          }
          // Fade in fg layer (reveals fg video inside it) — 0.3s linear
          if (dialFgEl) {
            if (gsap && !reduced) gsap.to(dialFgEl, { opacity: 1, duration: 0.3, ease: 'linear', overwrite: 'auto' });
            else dialFgEl.style.opacity = '1';
          }
          // Fade out step text
          document.querySelectorAll('[data-text="step"]').forEach(el => {
            if (gsap && !reduced) gsap.to(el, { opacity: 0, duration: 0.3, ease: 'linear', overwrite: 'auto' });
            else el.style.opacity = '0';
          });
          // Task: video-sync-paired-play (2) — play fg+bg in sync
          if (visibleVideo && bgVideo) {
            playPaired(visibleVideo, bgVideo);
          } else if (bgVideo && bgVideo.paused) {
            try { bgVideo.play().catch(() => {}); } catch(e) {}
          }
          setDialUiOpacity(1);
          // Task: video-sync-drift-monitor — start drift loop in ACTIVE
          startDriftMonitor();
        } else if (newState === DIAL_STATES.ENGAGED) {
          // Dial UI remains visible in ENGAGED state
          setDialUiOpacity(1);
          // Task: video-sync-drift-monitor — start drift loop in ENGAGED
          startDriftMonitor();
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

        // If author only provided a slug (e.g. "my-case"), build the full /work/ path
        if (!url.startsWith('http') && !url.startsWith('/')) {
          url = `/work/${url.replace(/^\/+/, '')}`;
        }

        if (window.barba && typeof window.barba.go === 'function') {
          window.barba.go(url);
        } else {
          window.location.href = url;
        }
      }

      // Tick i → sector index (0° at top, 8 sectors)
      function tickToSector(i) {
        const tickDeg = (i / T.bars) * 360;
        const top0 = (tickDeg + 90) % 360;
        return Math.floor(mod(top0 + sectorOffset, 360) / sectorSize);
      }

      // Gradient mix (0=teal, 1=orange). Middle 8 ticks fully orange, sharp falloff to teal at sector borders.
      const TICKS_PER_SECTOR = T.bars / N;
      const FLAT_TICKS = 8;
      const flatZoneHalfAngle = (FLAT_TICKS / TICKS_PER_SECTOR) * (sectorSize / 2);
      const edgeZoneAngle = (sectorSize / 2) - flatZoneHalfAngle;
      function sectorGradientMix(tickI, sectorIdx) {
        if (tickToSector(tickI) !== sectorIdx) return 0;
        const tickDeg = (tickI / T.bars) * 360;
        const top0 = (tickDeg + 90) % 360;
        const centerAngle = sectorIdx * sectorSize;
        const distFromCenter = Math.min(Math.abs(top0 - centerAngle), 360 - Math.abs(top0 - centerAngle));
        if (distFromCenter <= flatZoneHalfAngle) return 1;
        if (distFromCenter >= sectorSize / 2) return 0;
        return 1 - (distFromCenter - flatZoneHalfAngle) / edgeZoneAngle;
      }

      // Save playback state for an index (from a video element). Call before unloading or switching away.
      function saveVideoStateToIndex(videoEl, index) {
        if (!videoEl || !RHP.videoState) return;
        try {
          const ct = videoEl.currentTime;
          const paused = videoEl.paused;
          if (typeof index !== 'number') return;
          RHP.videoState.byIndex[index] = { currentTime: ct, paused: !!paused };
        } catch (e) {}
      }

      // Restore playback state for an index onto a video element; returns whether it was restored.
      function restoreVideoStateFromIndex(videoEl, index) {
        if (!videoEl || !RHP.videoState || typeof index !== 'number') return false;
        const s = RHP.videoState.byIndex[index];
        if (!s || typeof s.currentTime !== 'number') return false;
        try {
          videoEl.currentTime = s.currentTime;
          return true;
        } catch (e) { return false; }
      }

      // Task: video-sync-paired-play — wait for both fg+bg to be decodable before playing
      function waitCanPlay(videoEl) {
        return new Promise(resolve => {
          if (videoEl.readyState >= 2) { resolve(); return; }
          videoEl.addEventListener('canplay', resolve, { once: true });
        });
      }

      // Task: video-sync-paired-play — play fg immediately; sync bg to fg when bg becomes ready
      // Using Promise.all was causing fg to stall whenever bg's canplay never fired (src changed
      // mid-load cancels the old load; old { once:true } listener never fires → fg never plays).
      function playPaired(fg, bg) {
        if (!fg || !bg) return;
        if (intentionallyPaused) return;
        const gen = ++playPairedGen; // stale callbacks from cancelled bg loads will bail

        // fg plays immediately — don't block on bg
        if (fg.readyState >= 2) {
          try { fg.play().catch(() => {}); } catch(e) {}
        } else {
          waitCanPlay(fg).then(() => {
            if (!intentionallyPaused) try { fg.play().catch(() => {}); } catch(e) {}
          });
        }

        // bg: sync to fg's current position when ready, then play
        if (bg.readyState >= 2) {
          try { bg.currentTime = fg.currentTime; } catch(e) {}
          try { bg.play().catch(() => {}); } catch(e) {}
        } else {
          waitCanPlay(bg).then(() => {
            if (gen !== playPairedGen || intentionallyPaused) return; // stale or paused: bail
            try { bg.currentTime = fg.currentTime; } catch(e) {}
            try { bg.play().catch(() => {}); } catch(e) {}
          });
        }
      }

      // Task: video-sync-drift-monitor — dedicated RAF loop for drift correction
      // Uses module-level driftRafId so destroy() can cancel it from outside init()
      function stopDriftMonitor() {
        stopDriftMonitorGlobal();
      }

      function driftMonitorTick() {
        if (!alive || dialState === DIAL_STATES.IDLE || intentionallyPaused) {
          driftRafId = 0;
          return;
        }
        const bg = bgVideoRef;
        // fg is master: bg snaps to fg when drift exceeds threshold.
        // Guard on !visibleVideo.paused so we only correct when fg is actually playing —
        // this also prevents the drift monitor from fighting natural loop-resets on bg.
        if (visibleVideo && bg && bg.tagName === 'VIDEO' && !visibleVideo.paused) {
          const fgSrc = visibleVideo.currentSrc || visibleVideo.src;
          const bgSrc = bg.currentSrc || bg.src;
          if (fgSrc && bgSrc && fgSrc === bgSrc) {
            // fg is master: bg follows fg
            const drift = Math.abs(bg.currentTime - visibleVideo.currentTime);
            const threshold = isMobile() ? 0.3 : 0.1;
            if (drift > threshold) {
              // bg is out of sync — snap bg to fg position
              try { bg.currentTime = visibleVideo.currentTime; } catch(e) {}
            }
            // Keep bg playing if it stalled (loading, ended without loop, etc.)
            if (bg.paused && !intentionallyPaused) {
              try { bg.play().catch(() => {}); } catch(e) {}
            }
          }
        }
        driftRafId = requestAnimationFrame(driftMonitorTick);
      }

      function startDriftMonitor() {
        stopDriftMonitor();
        if (dialState !== DIAL_STATES.IDLE && !intentionallyPaused) {
          driftRafId = requestAnimationFrame(driftMonitorTick);
        }
      }

      function applyActive(idx) {
        idx = mod(idx, N);
        if (idx === state.lastIndex) return;
        const isInitial = state.lastIndex === -1;
        const prevIndex = state.lastIndex;
        state.prevActiveIndex = state.lastIndex;
        state.lastIndex = idx;
        state.activeIndex = idx;

        // Sector highlight transition: crossfade from prev to current over 0.1s linear (skip on initial load)
        const dur = (isInitial || prefersReduced()) ? 0 : 0.1;
        if (window.gsap && dur > 0) {
          state.sectorHighlightEase = 0;
          window.gsap.to(state, { sectorHighlightEase: 1, duration: dur, ease: 'linear', overwrite: true });
        } else {
          state.sectorHighlightEase = 1;
        }

        const item = items[idx];
        if (!item) return;

        const t = item.getAttribute('data-title') || '';
        const m = item.getAttribute('data-meta') || '';
        const v = item.getAttribute('data-video') || '';
        const poster = readPosterFromItem(item);

        if (titleEl) titleEl.textContent = t;
        if (metaEl)  metaEl.textContent  = m;

        if (!visibleVideo) visibleVideo = comp.querySelector(SEL.fgVideo) || document.querySelector(SEL.fgVideo);
        if (!bgVisible) {
          bgVisible = comp.querySelector(SEL.bgVideo) || document.querySelector(SEL.bgVideo);
          if (bgVisible) { bgVisible.style.position = 'absolute'; bgVisible.style.inset = '0'; }
          bgVideoRef = bgVisible;
        }
        const bgLayerEl = comp.querySelector('.dial_layer-bg') || document.querySelector('.dial_layer-bg');

        // Before switching: save current video playback state and pause
        if (prevIndex >= 0 && visibleVideo) {
          saveVideoStateToIndex(visibleVideo, prevIndex);
          try { visibleVideo.pause(); } catch (e) {}
        }
        if (prevIndex >= 0 && bgVisible && bgVisible.tagName === 'VIDEO') {
          saveVideoStateToIndex(bgVisible, prevIndex);
          try { bgVisible.pause(); } catch(e) {}
        }

        const newPrev = mod(idx - 1, N);
        const newNext = mod(idx + 1, N);
        const urlPrev = (items[newPrev] && items[newPrev].getAttribute('data-video')) || '';
        const urlNext = (items[newNext] && items[newNext].getAttribute('data-video')) || '';
        const inWindow = function (i) { return i === idx || i === newPrev || i === newNext; };
        if (loadWindowIndices.prev !== null && !inWindow(loadWindowIndices.prev)) saveVideoStateToIndex(poolPrev, loadWindowIndices.prev);
        if (loadWindowIndices.next !== null && !inWindow(loadWindowIndices.next)) saveVideoStateToIndex(poolNext, loadWindowIndices.next);
        if (bgLoadWindowIndices.prev !== null && !inWindow(bgLoadWindowIndices.prev)) saveVideoStateToIndex(bgPoolPrev, bgLoadWindowIndices.prev);
        if (bgLoadWindowIndices.next !== null && !inWindow(bgLoadWindowIndices.next)) saveVideoStateToIndex(bgPoolNext, bgLoadWindowIndices.next);

        const poolPrevReady = poolPrev.readyState >= 2; // HAVE_CURRENT_DATA: has a frame, enough for instant swap
        const poolNextReady = poolNext.readyState >= 2;
        const sameUrl = function (a, b) { return !!(a && b && (a === b || a.slice(-60) === b.slice(-60))); };
        const poolPrevHasUrl = sameUrl(v, poolPrev.currentSrc || poolPrev.src);
        const poolNextHasUrl = sameUrl(v, poolNext.currentSrc || poolNext.src);
        let didSwap = false;

        const poolHiddenStyle = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;left:-9999px;';
        var startPoolWhenReady = function (el) {
          if (el.readyState >= 2) try { el.play().catch(function () {}); } catch (e) {}
          else el.addEventListener('canplay', function () { try { el.play().catch(function () {}); } catch (e) {}; }, { once: true });
        };
        if (idx === loadWindowIndices.prev && poolPrevReady && poolPrevHasUrl && fgWrap.contains(visibleVideo)) {
          restoreVideoStateFromIndex(poolPrev, idx); // seek while still hidden so no flash when visible
          const oldVisible = visibleVideo;
          visibleVideo.classList.remove('dial_fg-video');
          fgWrap.removeChild(visibleVideo);
          fgWrap.appendChild(poolPrev);
          poolPrev.classList.add('dial_fg-video');
          poolPrev.style.cssText = ''; // clear hidden style so video is visible (CSS fills the wrap)
          poolPrev.removeAttribute('aria-hidden');
          poolPrev.poster = ''; // already buffered: show video frame, not poster (avoids brief poster flash)
          visibleVideo = poolPrev;
          // oldVisible has items[newNext] URL fully buffered — reuse as poolNext, no reload needed
          const freeElPrev = poolNext; // repurpose old poolNext for urlPrev
          poolNext = oldVisible;
          comp.appendChild(poolNext);
          poolNext.style.cssText = poolHiddenStyle;
          poolNext.setAttribute('aria-hidden', 'true');
          try { poolNext.pause(); } catch(e) {} // pause demoted video
          // poolNext.src stays as-is (items[newNext] URL, already buffered — ready for instant forward switch)
          poolPrev = freeElPrev;
          if (urlPrev && poolPrev.src !== urlPrev) { poolPrev.poster = readPosterFromItem(items[newPrev]) || ''; poolPrev.src = urlPrev; try { poolPrev.load(); } catch (e) {} startPoolWhenReady(poolPrev); }
          didSwap = true;
        } else if (idx === loadWindowIndices.next && poolNextReady && poolNextHasUrl && fgWrap.contains(visibleVideo)) {
          restoreVideoStateFromIndex(poolNext, idx); // seek while still hidden so no flash when visible
          const oldVisible = visibleVideo;
          visibleVideo.classList.remove('dial_fg-video');
          fgWrap.removeChild(visibleVideo);
          fgWrap.appendChild(poolNext);
          poolNext.classList.add('dial_fg-video');
          poolNext.style.cssText = ''; // clear hidden style so video is visible (CSS fills the wrap)
          poolNext.removeAttribute('aria-hidden');
          poolNext.poster = ''; // already buffered: show video frame, not poster (avoids brief poster flash)
          visibleVideo = poolNext;
          // oldVisible has items[newPrev] URL fully buffered — reuse as poolPrev, no reload needed
          const freeElNext = poolPrev; // repurpose old poolPrev for urlNext
          poolPrev = oldVisible;
          comp.appendChild(poolPrev);
          poolPrev.style.cssText = poolHiddenStyle;
          poolPrev.setAttribute('aria-hidden', 'true');
          try { poolPrev.pause(); } catch(e) {} // pause demoted video
          // poolPrev.src stays as-is (items[newPrev] URL, already buffered — ready for instant back-switch)
          poolNext = freeElNext;
          if (urlNext && poolNext.src !== urlNext) { poolNext.poster = readPosterFromItem(items[newNext]) || ''; poolNext.src = urlNext; try { poolNext.load(); } catch (e) {} startPoolWhenReady(poolNext); }
          didSwap = true;
        }

        // BG pool hit check — parallel sliding-window logic to FG pool
        const bgPoolPrevReady = bgPoolPrev.readyState >= 2;
        const bgPoolNextReady = bgPoolNext.readyState >= 2;
        const bgPoolPrevHasUrl = sameUrl(v, bgPoolPrev.currentSrc || bgPoolPrev.src);
        const bgPoolNextHasUrl = sameUrl(v, bgPoolNext.currentSrc || bgPoolNext.src);
        let didSwapBg = false;

        const bgFilledStyle = 'position:absolute;inset:0;opacity:0;';
        const currentBlurFilter = dialState !== DIAL_STATES.IDLE ? 'blur(40px)' : 'blur(0px)';
        const currentBgOpacity = dialState !== DIAL_STATES.IDLE ? 1 : 0;
        const useBgCrossfade = !prefersReduced() && !!window.gsap;

        if (idx === bgLoadWindowIndices.prev && bgPoolPrevReady && bgPoolPrevHasUrl && bgLayerEl) {
          restoreVideoStateFromIndex(bgPoolPrev, idx);
          const oldBgVisible = bgVisible;
          if (oldBgVisible) { oldBgVisible.style.position = 'absolute'; oldBgVisible.style.inset = '0'; }
          bgPoolPrev.classList.add('dial_bg-video');
          bgPoolPrev.removeAttribute('aria-hidden');
          bgPoolPrev.style.cssText = bgFilledStyle;
          bgLayerEl.appendChild(bgPoolPrev);
          if (useBgCrossfade) {
            window.gsap.set(bgPoolPrev, { filter: currentBlurFilter });
            window.gsap.to(bgPoolPrev, { opacity: currentBgOpacity, duration: 0.15, ease: 'linear', overwrite: true });
            window.gsap.to(oldBgVisible, { opacity: 0, duration: 0.15, ease: 'linear', overwrite: true, onComplete: () => {
              oldBgVisible.classList.remove('dial_bg-video');
              oldBgVisible.setAttribute('aria-hidden', 'true');
              oldBgVisible.style.cssText = poolHiddenStyle;
              if (oldBgVisible.parentNode === bgLayerEl) bgLayerEl.removeChild(oldBgVisible);
              comp.appendChild(oldBgVisible);
            }});
          } else {
            if (oldBgVisible) {
              oldBgVisible.classList.remove('dial_bg-video');
              oldBgVisible.setAttribute('aria-hidden', 'true');
              oldBgVisible.style.cssText = poolHiddenStyle;
              if (oldBgVisible.parentNode === bgLayerEl) bgLayerEl.removeChild(oldBgVisible);
              comp.appendChild(oldBgVisible);
            }
            bgPoolPrev.style.opacity = String(currentBgOpacity);
            if (window.gsap) window.gsap.set(bgPoolPrev, { filter: currentBlurFilter });
            else bgPoolPrev.style.filter = currentBlurFilter;
          }
          bgVisible = bgPoolPrev;
          bgVideoRef = bgVisible;
          // Rotate slots: old bgVisible → bgPoolNext (has items[newNext] URL, ready for forward switch)
          //               old bgPoolNext (freeBgPrev) → bgPoolPrev (will load urlPrev below)
          const freeBgPrev = bgPoolNext;
          bgPoolNext = oldBgVisible;
          bgPoolPrev = freeBgPrev;
          didSwapBg = true;

        } else if (idx === bgLoadWindowIndices.next && bgPoolNextReady && bgPoolNextHasUrl && bgLayerEl) {
          restoreVideoStateFromIndex(bgPoolNext, idx);
          const oldBgVisible = bgVisible;
          if (oldBgVisible) { oldBgVisible.style.position = 'absolute'; oldBgVisible.style.inset = '0'; }
          bgPoolNext.classList.add('dial_bg-video');
          bgPoolNext.removeAttribute('aria-hidden');
          bgPoolNext.style.cssText = bgFilledStyle;
          bgLayerEl.appendChild(bgPoolNext);
          if (useBgCrossfade) {
            window.gsap.set(bgPoolNext, { filter: currentBlurFilter });
            window.gsap.to(bgPoolNext, { opacity: currentBgOpacity, duration: 0.15, ease: 'linear', overwrite: true });
            window.gsap.to(oldBgVisible, { opacity: 0, duration: 0.15, ease: 'linear', overwrite: true, onComplete: () => {
              oldBgVisible.classList.remove('dial_bg-video');
              oldBgVisible.setAttribute('aria-hidden', 'true');
              oldBgVisible.style.cssText = poolHiddenStyle;
              if (oldBgVisible.parentNode === bgLayerEl) bgLayerEl.removeChild(oldBgVisible);
              comp.appendChild(oldBgVisible);
            }});
          } else {
            if (oldBgVisible) {
              oldBgVisible.classList.remove('dial_bg-video');
              oldBgVisible.setAttribute('aria-hidden', 'true');
              oldBgVisible.style.cssText = poolHiddenStyle;
              if (oldBgVisible.parentNode === bgLayerEl) bgLayerEl.removeChild(oldBgVisible);
              comp.appendChild(oldBgVisible);
            }
            bgPoolNext.style.opacity = String(currentBgOpacity);
            if (window.gsap) window.gsap.set(bgPoolNext, { filter: currentBlurFilter });
            else bgPoolNext.style.filter = currentBlurFilter;
          }
          bgVisible = bgPoolNext;
          bgVideoRef = bgVisible;
          // Rotate slots: old bgVisible → bgPoolPrev (has items[newPrev] URL, ready for back switch)
          //               old bgPoolPrev (freeBgNext) → bgPoolNext (will load urlNext below)
          const freeBgNext = bgPoolPrev;
          bgPoolPrev = oldBgVisible;
          bgPoolNext = freeBgNext;
          didSwapBg = true;
        }

        if (!didSwap) {
          setVideoSourceAndPoster(visibleVideo, v, poster);
        }
        // BG pool miss: reload src (setVideoSourceAndPoster skips if URL already matches)
        if (!didSwapBg) {
          setVideoSourceAndPoster(bgVisible, v, poster);
        }

        restoreVideoStateFromIndex(visibleVideo, idx);
        if (!didSwapBg && bgVisible && bgVisible.tagName === 'VIDEO') restoreVideoStateFromIndex(bgVisible, idx);

        enforceVideoPolicy(comp);

        // FG crossfade; BG miss crossfade (0.4s masks src reload); BG hit crossfade is handled above
        if (!isInitial && !prefersReduced() && window.gsap) {
          window.gsap.fromTo(fgWrap, { opacity: 0 }, { opacity: 1, duration: didSwap ? 0.15 : 0.4, ease: 'linear', overwrite: true });
          if (!didSwapBg && bgVisible) {
            window.gsap.fromTo(bgVisible, { opacity: 0 }, { opacity: currentBgOpacity, duration: 0.4, ease: 'linear', overwrite: 'auto' });
          }
        }

        // Play fg+bg in sync
        if (bgVisible && bgVisible.tagName === 'VIDEO') {
          playPaired(visibleVideo, bgVisible);
        } else {
          const tryPlay = () => { try { if (!visibleVideo.paused) return; visibleVideo.play().catch(() => {}); } catch(e) {} };
          if (visibleVideo.readyState >= 2) tryPlay();
          else visibleVideo.addEventListener('loadedmetadata', tryPlay, { once: true });
        }

        if (urlPrev && poolPrev.src !== urlPrev) {
          poolPrev.poster = readPosterFromItem(items[newPrev]) || '';
          poolPrev.src = urlPrev;
          try { poolPrev.load(); } catch (e) {}
          startPoolWhenReady(poolPrev);
        }
        if (urlNext && poolNext.src !== urlNext) {
          poolNext.poster = readPosterFromItem(items[newNext]) || '';
          poolNext.src = urlNext;
          try { poolNext.load(); } catch (e) {}
          startPoolWhenReady(poolNext);
        }
        loadWindowIndices.prev = newPrev;
        loadWindowIndices.next = newNext;

        // Mirror fg pool loading for BG pool (same URLs per project — both fg and bg use data-video)
        if (urlPrev && bgPoolPrev.src !== urlPrev) {
          bgPoolPrev.poster = readPosterFromItem(items[newPrev]) || '';
          bgPoolPrev.src = urlPrev;
          try { bgPoolPrev.load(); } catch(e) {}
          startPoolWhenReady(bgPoolPrev);
        }
        if (urlNext && bgPoolNext.src !== urlNext) {
          bgPoolNext.poster = readPosterFromItem(items[newNext]) || '';
          bgPoolNext.src = urlNext;
          try { bgPoolNext.load(); } catch(e) {}
          startPoolWhenReady(bgPoolNext);
        }
        bgLoadWindowIndices.prev = newPrev;
        bgLoadWindowIndices.next = newNext;
      }

      // Round to half-pixel for crisp 1px strokes (avoids blurry/pixelated lines when scaling)
      function crisp(x) { return Math.round(x * 2) / 2; }

      function resize() {
        canvas.style.width  = '';
        canvas.style.height = '';
        const r = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        geom.dpr = dpr;

        canvas.width = r.width * dpr;
        canvas.height = r.height * dpr;
        canvas.style.width = r.width + 'px';
        canvas.style.height = r.height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        geom.cx = r.width / 2;
        geom.cy = r.height / 2;

        const fr = fgWrap.getBoundingClientRect();
        geom.videoR = (Math.min(fr.width, fr.height) / 2) || REF_R;
        geom.fgCX = fr.left + fr.width / 2;
        geom.fgCY = fr.top + fr.height / 2;

        // Scale tick dimensions proportionally with circle size
        geom.gap = geom.videoR * T.gapRatio;
        geom.baseLen = geom.videoR * T.baseLenRatio;
        geom.maxLen = geom.videoR * T.maxLenRatio;
        geom.barW = Math.max(1, geom.videoR * T.barWRatio);
        geom.nearPx = geom.videoR * T.nearPxRatio;
        geom.radFalloff = geom.videoR * T.radFalloffRatio;

        geom.innerR = geom.videoR + geom.gap;
        const outerBase = geom.innerR + geom.baseLen;
        geom.switchMaxR = outerBase + geom.maxLen + geom.videoR * T.switchBufferRatio;

        // Idle threshold: 200px beyond outer tick ring edge at 3000px viewport, scaled by dial width
        geom.idleThreshold = (geom.innerR + geom.baseLen) + (200 * (r.width / 3000)) * 0.6;
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

        // IDLE ↔ ACTIVE transitions (only when interaction is unlocked)
        if (interactionUnlocked) {
          if (dialState === DIAL_STATES.IDLE && state.rDist <= geom.idleThreshold) {
            setDialState(DIAL_STATES.ACTIVE);
          } else if (dialState === DIAL_STATES.ACTIVE && state.rDist > geom.idleThreshold) {
            setDialState(DIAL_STATES.IDLE);
          } else if (dialState === DIAL_STATES.ENGAGED && state.rDist > geom.idleThreshold) {
            setDialState(DIAL_STATES.IDLE);
          }
        }

        // Zone updates (hysteresis)
        if (!state.inInner && state.rDist <= H.innerEnter()) state.inInner = true;
        else if (state.inInner && state.rDist >= H.innerExit()) state.inInner = false;

        // ACTIVE ↔ ENGAGED: use fgWrap viewport centre — immune to canvas/fgWrap offset
        if (!isMobile() && interactionUnlocked && introComplete) {
          const fgDist = Math.hypot(e.clientX - geom.fgCX, e.clientY - geom.fgCY);
          if (dialState === DIAL_STATES.ACTIVE && fgDist <= geom.videoR - 6) {
            setDialState(DIAL_STATES.ENGAGED);
          } else if (dialState === DIAL_STATES.ENGAGED && fgDist >= geom.videoR + 4) {
            setDialState(DIAL_STATES.ACTIVE);
          }
        }

        if (!state.inSwitch && state.rDist <= H.switchEnter() && state.rDist > geom.innerR) state.inSwitch = true;
        else if (state.inSwitch && (state.rDist >= H.switchExit() || state.rDist <= geom.innerR)) state.inSwitch = false;

        // Desktop: switch only when ACTIVE, inSwitch, and NOT inInner
        if (!isMobile() && dialState === DIAL_STATES.ACTIVE && state.inSwitch && !state.inInner) {
          const idx = Math.floor(mod(state.angDeg + sectorOffset, 360) / sectorSize);
          applyActive(idx);
        }

        // Desktop cursor morph - use cursor.js API
        if (!isMobile() && RHP.cursor && RHP.cursor.setPosition) {
          RHP.cursor.setPosition(e.clientX, e.clientY);
          setCursorPlay(dialState === DIAL_STATES.ACTIVE && state.inInner);
        }
      }

      function onPointerLeave() {
        state.x = -1e4; state.y = -1e4;
        state.rDist = 1e9;
        state.inInner = false;
        state.inSwitch = false;
        if (!isMobile()) setCursorPlay(false);
        if (interactionUnlocked && dialState !== DIAL_STATES.IDLE) {
          setDialState(DIAL_STATES.IDLE);
        }
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

      // Task: video-sync-pause-not-visible (3e) — pause/resume on tab hide/show
      function onVis() {
        if (document.hidden) {
          intentionallyPaused = true;
          stop(); // stops draw RAF
          stopDriftMonitor();
          if (visibleVideo) try { visibleVideo.pause(); } catch(e) {}
          const bg = comp.querySelector(SEL.bgVideo) || document.querySelector(SEL.bgVideo);
          if (bg && bg.tagName === 'VIDEO') try { bg.pause(); } catch(e) {}
          if (genericVideo && dialState === DIAL_STATES.IDLE) try { genericVideo.pause(); } catch(e) {}
        } else if (alive) {
          intentionallyPaused = false;
          stop();
          rafId = requestAnimationFrame(draw);
          if (dialState !== DIAL_STATES.IDLE) {
            startDriftMonitor();
            const bg = comp.querySelector(SEL.bgVideo) || document.querySelector(SEL.bgVideo);
            if (visibleVideo && bg && bg.tagName === 'VIDEO') playPaired(visibleVideo, bg);
          } else {
            if (genericVideo) try { genericVideo.play().catch(() => {}); } catch(e) {}
          }
        }
      }

      function draw() {
        if (!alive) return;

        // Task: video-sync-drift-monitor (4) — syncFgToBg() removed; drift handled by dedicated RAF loop

        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        ctx.clearRect(0, 0, w, h);

        // Mobile: rotate ticks ONLY (labels are separate DOM)
        if (isMobile()) {
          canvas.style.transform = `rotate(${state.rotationDeg}deg)`;

          // draw ticks — intro scale + opacity when in intro mode; sector highlight gradient
          const ease = state.sectorHighlightEase ?? 1;
          for (let i = 0; i < T.bars; i++) {
            const a = (i / T.bars) * Math.PI * 2;
            let tickScale = 1;
            let tickOpacity = 1;
            if (introMode && !introComplete && RHP._dialIntroProgress) {
              const t = RHP._dialIntroProgress.time || 0;
              const clockPos = (i - TWELVE_OCLOCK_IDX + T.bars) % T.bars;
              const startT = clockPos * TICK_INTRO.stagger;
              const raw = Math.max(0, Math.min(1, (t - startT) / TICK_INTRO.tickDur));
              tickScale = prefersReduced() ? raw : 1 - Math.pow(1 - raw, 4);
              tickOpacity = raw;
            }
            const len = geom.baseLen * tickScale;

            const prevMix = sectorGradientMix(i, state.prevActiveIndex);
            const currMix = sectorGradientMix(i, state.activeIndex);
            const sectorMix = prevMix + (currMix - prevMix) * ease;

            ctx.globalAlpha = tickOpacity;
            ctx.strokeStyle = mix(T.teal, T.orange, sectorMix);
            ctx.lineWidth = geom.barW;
            ctx.lineCap = 'round';

            const x0 = crisp(geom.cx + Math.cos(a) * geom.innerR);
            const y0 = crisp(geom.cy + Math.sin(a) * geom.innerR);
            const x1 = crisp(geom.cx + Math.cos(a) * (geom.innerR + len));
            const y1 = crisp(geom.cy + Math.sin(a) * (geom.innerR + len));

            ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
            ctx.globalAlpha = 1;
          }

          rafId = requestAnimationFrame(draw);
          return;
        }

        // Desktop: ticks never rotate
        canvas.style.transform = 'rotate(0deg)';

        const hasPointer = state.x > -1e3;
        const reduced = prefersReduced();

        const OUTER_R_BASE = geom.innerR + geom.baseLen;
        const dToInner = Math.abs(state.rDist - geom.innerR);
        const dToOuter = Math.abs(state.rDist - OUTER_R_BASE);
        const dEdge = Math.min(dToInner, dToOuter);

        const hasAttraction = hasPointer && !reduced && attractionEnabled;
        state.attractionEase += hasAttraction ? 0.04 : -0.06;
        state.attractionEase = Math.max(0, Math.min(1, state.attractionEase));

        for (let i = 0; i < T.bars; i++) {
          const a = (i / T.bars) * Math.PI * 2;
          const deg = (i / T.bars) * 360;

          let tickScale = 1;
          let tickOpacity = 1;
          if (introMode && !introComplete && RHP._dialIntroProgress) {
            const t = RHP._dialIntroProgress.time || 0;
            const clockPos = (i - TWELVE_OCLOCK_IDX + T.bars) % T.bars;
            const startT = clockPos * TICK_INTRO.stagger;
            const raw = Math.max(0, Math.min(1, (t - startT) / TICK_INTRO.tickDur));
            tickScale = reduced ? raw : 1 - Math.pow(1 - raw, 4);
            tickOpacity = raw;
          }

          let inf = 0;
          if (hasAttraction) {
            const degTop0 = (deg + 90) % 360;
            const dAng = Math.min(Math.abs(degTop0 - state.angDeg), 360 - Math.abs(degTop0 - state.angDeg));
            const iAng = Math.max(0, 1 - dAng / T.angFalloff);
            const iRad = Math.max(0, 1 - Math.max(0, dEdge - geom.nearPx) / geom.radFalloff);
            inf = iAng * iRad;
          }
          inf *= state.attractionEase;

          const len = (geom.baseLen + (geom.maxLen - geom.baseLen) * inf) * tickScale;
          // IDLE state: all ticks flat teal — no sector highlight, no orange
          const isIdle = dialState === DIAL_STATES.IDLE;
          const warm = (!isIdle && state.inInner) ? inf : 0;
          const prevMix = isIdle ? 0 : sectorGradientMix(i, state.prevActiveIndex);
          const currMix = isIdle ? 0 : sectorGradientMix(i, state.activeIndex);
          const sectorMix = (prevMix + (currMix - prevMix) * (state.sectorHighlightEase ?? 1));
          const finalWarm = Math.max(warm, sectorMix);

          ctx.globalAlpha = tickOpacity;
          ctx.strokeStyle = mix(T.teal, T.orange, finalWarm);
          ctx.lineWidth = geom.barW;
          ctx.lineCap = 'round';

          const x0 = crisp(geom.cx + Math.cos(a) * geom.innerR);
          const y0 = crisp(geom.cy + Math.sin(a) * geom.innerR);
          const x1 = crisp(geom.cx + Math.cos(a) * (geom.innerR + len));
          const y1 = crisp(geom.cy + Math.sin(a) * (geom.innerR + len));

          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
          ctx.globalAlpha = 1;
        }

        rafId = requestAnimationFrame(draw);
      }

      // Boot
      resize();
      applyActive(0);
      // FIX: homeIntro.skip() → resetToVisible() sets bgVideo opacity:1 before init runs.
      // applyActive(0) skips its crossfade (isInitial=true), so bgVideo stays at 1 in IDLE — wrong.
      // setDialState(IDLE) only fires on transitions, never at boot. Force correct opacity here.
      if (dialState === DIAL_STATES.IDLE && bgVisible) {
        if (window.gsap) window.gsap.set(bgVisible, { opacity: 0, overwrite: true });
        else bgVisible.style.opacity = '0';
      }

      // If returning from case study, restore handoff index and playback position
      if (RHP.videoState && RHP.videoState.caseHandoff) {
        const h = RHP.videoState.caseHandoff;
        if (typeof h.index === 'number' && h.index >= 0 && h.index < N && typeof h.currentTime === 'number') {
          // dialState is already ACTIVE (set at init) — ensure project video is visible, generic hidden
          if (genericVideo) genericVideo.style.opacity = '0';
          const bg = comp.querySelector(SEL.bgVideo) || document.querySelector(SEL.bgVideo);
          if (bg) bg.style.opacity = '1';
          // Pre-write handoff time so applyActive/restoreVideoStateFromIndex picks it up for both fg and bg
          RHP.videoState.byIndex[h.index] = { currentTime: h.currentTime, paused: false };
          applyActive(h.index);
          // applyActive called playPaired — but seek may have been overridden by restoreVideoStateFromIndex;
          // ensure both elements are at the exact handoff time before playPaired fires
          const fg = comp.querySelector(SEL.fgVideo) || document.querySelector(SEL.fgVideo);
          if (fg) try { fg.currentTime = h.currentTime; } catch(e) {}
          if (bg && bg.tagName === 'VIDEO') try { bg.currentTime = h.currentTime; } catch(e) {}
          if (fg && bg && bg.tagName === 'VIDEO') {
            playPaired(fg, bg);
          } else if (fg) {
            try { fg.play().catch(function() {}); } catch(e) {}
          }
        }
        RHP.videoState.caseHandoff = null;
        // FIX: dialState was set to ACTIVE directly at init, bypassing setDialState(ACTIVE).
        // setDialState(ACTIVE) is the only place filter:blur(40px) and fg opacity:1 are applied,
        // but its guard (if dialState === newState return) blocks it for the rest of this session
        // until the user first goes IDLE then ACTIVE again. Patch the visual state here.
        const reduced = prefersReduced();
        if (bgVideoRef) {
          if (window.gsap && !reduced) window.gsap.set(bgVideoRef, { filter: 'blur(40px)', overwrite: 'auto' });
          else bgVideoRef.style.filter = 'blur(40px)';
        }
        const handoffFgEl = comp.querySelector('.dial_layer-fg') || document.querySelector('.dial_layer-fg');
        if (handoffFgEl) {
          if (window.gsap && !reduced) window.gsap.set(handoffFgEl, { opacity: 1 });
          else handoffFgEl.style.opacity = '1';
        }
      }

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

        refs = refs || {};
        }

      on(document, 'visibilitychange', onVis, { passive: true });

      // iOS: kick videos again on first gesture
      on(window, 'pointerdown', () => enforceVideoPolicy(comp), { once: true, passive: true });

      rafId = requestAnimationFrame(draw);

      refs = Object.assign(refs || {}, { getActiveIndex: () => state.activeIndex });
    }

    function setIntroComplete() {
      introComplete = true;
    }

    // Called by home-intro after generic video fades in — unlocks state transitions
    function onIntroComplete() {
      interactionUnlocked = true;
    }

    // Called by home-intro after runNavAnimation resolves — nav animation leaves dial-ui at opacity 1;
    // hide it now if still in IDLE so the state machine can reveal it cleanly on first ACTIVE entry.
    function onNavAnimationComplete() {
      if (dialState === DIAL_STATES.IDLE) setDialUiOpacity(0);
    }

    // Called by orchestrator after Barba return settle
    function setInteractionUnlocked(enabled) {
      interactionUnlocked = !!enabled;
    }

    // Returns the video element home-intro should fade in during the loading sequence
    function getIntroVideoEl() {
      return genericVideo;
    }

    function setAttractionEnabled(enabled) {
      attractionEnabled = !!enabled;
    }

    function destroy() {
      if (!alive) return;
      alive = false;

      stop();
      stopDriftMonitorGlobal();
      cleanup.forEach(fn => { try { fn(); } catch(e){} });
      cleanup = [];
      refs = null;
    }

    function getActiveIndex() {
      return refs?.getActiveIndex?.() ?? 0;
    }

    return { init, destroy, getActiveIndex, setIntroComplete, setAttractionEnabled, onIntroComplete, onNavAnimationComplete, setInteractionUnlocked, getIntroVideoEl, version: WORK_DIAL_VERSION };
  })();
})();
