/* =========================================
   RHP — Work Dial Module (FULL, UPDATED)
   - Client-First naming (matches your HTML)
   - Desktop: sector hover switching + tick attraction (ticks DO NOT rotate)
   - Mobile: dial rotation (ticks rotate ONLY) + Variant B stepping (updates on boundary)
   - Sector highlight: active sector ticks show orange→teal gradient, 0.1s linear transition
   - CMS order: all items in rendered order (no cap)
   - Poster support: reads <img class="dial_cms-poster" ...> inside each .dial_cms-item
   - Barba-safe: init(container) / destroy()
   - State machine: IDLE (mouse far, generic video) → ACTIVE (mouse near) → ENGAGED (fg hover)
   ========================================= */
(() => {
  const WORK_DIAL_VERSION = '2026.4.22.1';
  const debugGeom = () => !!window.__DEBUG_GEOM;

  const GENERIC_VIDEO_URL = 'https://player.vimeo.com/progressive_redirect/playback/1167326952/rendition/540p/file.mp4%20%28540p%29.mp4?loc=external&log_user=0&signature=b3d5bd2e912f695a5c67b919274edd03e87965c7e3328e5968057204b419e21f';

  const DIAL_STATES = { IDLE: 'idle', ACTIVE: 'active', ENGAGED: 'engaged' };

  // Outer switch ring inside the fg video:
  // cursor beyond (videoR * this ratio) from fg centre still updates the active
  // sector even though it's over the video. Inside = switching locked.
  // Live-tuneable via RHP.workDial.setDeadzoneRatio().
  let SWITCH_DEADZONE_RATIO = 0.7;

  window.RHP = window.RHP || {};
  const RHP = window.RHP;

  // Global video state: playback position per index + case-study handoff (set by orchestrator)
  if (typeof RHP.videoState === 'undefined') {
    RHP.videoState = { byIndex: {}, caseHandoff: null };
  }

  const SEL = {
    component: '.dial_component',
    canvas: '#dial_ticks-canvas',
    fgWrap: '#fg-video-wrap',
    fgVideo: '.dial_fg-video',
    bgCanvas: '.dial_bg-canvas',
    cmsItem: '.dial_cms-item',
    cmsPoster: '.dial_cms-poster',
    title: '[data-dial-title]',
    meta: '[data-dial-meta]',
    cursorDot: '.cursor_dot',
    cursorLabel: '.cursor_label'
  };

  if (window.gsap && window.ScrambleTextPlugin) {
    window.gsap.registerPlugin(window.ScrambleTextPlugin);
  }

  const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => window.matchMedia('(hover: none), (pointer: coarse)').matches;

  const mod = (n, m) => ((n % m) + m) % m;

  // 0° at TOP, clockwise
  const angleTop0 = (dx, dy) => {
    const degRight0 = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360; // 0° at right
    return (degRight0 + 90) % 360;                                       // 0° at top
  };

  // Async play with rejection detection
  async function tryPlay(video) {
    try {
      await video.play();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e };
    }
  }

  // Module-scope autoplay flags (shared between enforceVideoPolicy and RHP.workDial internals)
  let _autoplayBlocked = false;
  let _autoplayUnlocked = false;

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

        const attempt = async () => {
          const result = await tryPlay(v);
          if (!result.ok) _autoplayBlocked = true;
        };
        if (v.readyState >= 2) attempt();
        else v.addEventListener('loadedmetadata', () => attempt(), { once: true });
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
    let suspendCleanup = [];
    let suspended = false;
    let _mobileActiveLocked = false; // once ACTIVE, never revert to IDLE until destroy
    let _setDialStateFn = null; // closure set inside init(); used by forceActive()
    let _suspendFn = null;  // closure set inside init(), called by suspend()
    let _resumeFn = null;   // closure set inside init(), called by resume()
    let rafId = 0;
    let refs = null;
    let introMode = false;
    let introComplete = false;
    let attractionEnabled = true;
    let dialState = DIAL_STATES.IDLE;
    let interactionUnlocked = false;
    let genericVideo = null;
    let genericVideoComp = null; // comp ref for setDialState (set during init)
    let sectorDotRef = null; // module-level ref for fade-in after intro
    let _state = null; // module-level ref to init()'s state object (for destroy)
    const _canPlayAborts = new WeakMap();
    const _poolReadyAborts = new WeakMap();

    function setDialUiOpacity(targetOpacity) {
      const dialUi = genericVideoComp?.querySelector('.dial_layer-ui') || document.querySelector('.dial_layer-ui');
      if (!dialUi) return;
      if (window.gsap) {
        window.gsap.to(dialUi, { opacity: targetOpacity, duration: 0.3, ease: 'linear', overwrite: true });
      } else {
        dialUi.style.opacity = String(targetOpacity);
      }
    }

    function on(el, evt, fn, opts, suspendable) {
      if (!el) return;
      el.addEventListener(evt, fn, opts);
      const remover = () => el.removeEventListener(evt, fn, opts);
      cleanup.push(remover);
      if (suspendable) suspendCleanup.push(remover);
    }

    function stop() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    }

    function init(container = document, options = {}) {
      if (alive) return;
      alive = true;
      cleanup = [];
      _autoplayBlocked = false;
      _autoplayUnlocked = false;
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

      // Offscreen canvas for tick glow — one blur composite per frame, not per tick
      const glowCanvas = document.createElement('canvas');
      const glowCtx = glowCanvas.getContext('2d');
      const titleEl = container.querySelector(SEL.title) || document.querySelector(SEL.title);
      const metaEl  = container.querySelector(SEL.meta)  || document.querySelector(SEL.meta);

      const stepEl = comp.querySelector('[data-text="step"]') || document.querySelector('[data-text="step"]');
      const origStepText = stepEl ? stepEl.textContent.trim() : '';
      let splitReverted = false;
      function revertStepSplit() {
        if (splitReverted) return;
        splitReverted = true;
        if (stepEl && stepEl.querySelector('.home-intro-word')) {
          stepEl.textContent = stepEl.textContent.trim();
        }
      }
      let _scrambleTween = null;
      // Kill any in-flight scramble tween on Barba destroy so it can't write to a detached node
      cleanup.push(() => {
        if (_scrambleTween) { _scrambleTween.kill(); _scrambleTween = null; }
        if (stepEl && window.gsap) window.gsap.killTweensOf(stepEl);
        if (stepEl) stepEl.classList.remove('is-scrambling');
      });

      // ScrambleText helper for [data-text="step"] — single source of truth for
      // the three call sites (IDLE/ACTIVE state transitions and ACTIVE sector changes).
      // Falls back to direct textContent swap when reduced-motion is on or the
      // plugin failed to load. `revert` cleans up any residual SplitText wrappers
      // from the home intro sequence before the first scramble runs.
      // Characters used for the scramble noise.
      const SCRAMBLE_CHARS = 'readyhitplay';
      // Build a noise string that mirrors the word structure and case of the
      // target text — same word count, same char count per word, same
      // upper/lower per position so glyph widths stay consistent.
      function buildNoise(target) {
        const words = target.split(' ');
        const noiseWords = words.map(w => {
          let out = '';
          for (let i = 0; i < w.length; i++) {
            const c = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
            out += w[i] === w[i].toUpperCase() ? c.toUpperCase() : c;
          }
          return out;
        });
        // For 4+ word targets, merge the 3rd and 4th noise words (no space
        // between) so the scrambled text sits on fewer lines.
        if (noiseWords.length >= 4) {
          noiseWords[2] = noiseWords[2] + noiseWords[3];
          noiseWords.splice(3, 1);
        }
        return noiseWords.join(' ');
      }

      function scrambleStep(text, { duration, speed, revert }) {
        if (!stepEl) return;
        if (revert) revertStepSplit();
        const gsapLib = window.gsap;
        const reduced = prefersReduced();
        if (gsapLib && !reduced) {
          // Allow break-anywhere wrapping during scramble so the random char
          // string doesn't overflow the dial when scrambling between texts of
          // different word-break shapes. Class is removed on complete so the
          // final clean text wraps on word boundaries again.
          stepEl.classList.add('is-scrambling');
          // Custom scramble: noise mirrors the target's word structure (same
          // word count + lengths). `progress` 0→1 reveals the final text
          // left to right. Unresolved positions show patterned noise that
          // refreshes every ~4 frames for a flickering effect.
          const tweenObj = { progress: 0 };
          let frameCount = 0;
          let cachedNoise = buildNoise(text);
          if (_scrambleTween) _scrambleTween.kill();
          _scrambleTween = gsapLib.to(tweenObj, {
            progress: 1,
            duration,
            ease: 'none',
            overwrite: true,
            onUpdate: () => {
              frameCount++;
              if (frameCount % 4 === 0) cachedNoise = buildNoise(text);
              const revealed = Math.floor(tweenObj.progress * text.length);
              stepEl.textContent = text.slice(0, revealed) +
                cachedNoise.slice(revealed);
            },
            onComplete: () => {
              stepEl.textContent = text;
              stepEl.classList.remove('is-scrambling');
            },
            onInterrupt: () => stepEl.classList.remove('is-scrambling')
          });
        } else {
          stepEl.textContent = text;
        }
      }

      const cmsItems = Array.from(container.querySelectorAll(SEL.cmsItem));
      const items = cmsItems.length ? cmsItems : Array.from(document.querySelectorAll(SEL.cmsItem));
      const N = items.length;

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
        el.muted = true;
        el.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;left:-9999px;';
        comp.appendChild(el);
      });
      cleanup.push(function () { poolPrev.remove(); poolNext.remove(); });
      // Release all pool videos on destroy: abort pending listeners, pause, clear src, reset media element
      cleanup.unshift(function() {
        [visibleVideo, poolPrev, poolNext, genericVideo]
          .forEach(function(v) {
            if (!v) return;
            var a = _canPlayAborts.get(v); if (a) { a.abort(); _canPlayAborts.delete(v); }
            var b = _poolReadyAborts.get(v); if (b) { b.abort(); _poolReadyAborts.delete(v); }
            try { v.pause(); } catch(e) {}
            v.removeAttribute('src');
            v.load(); // resets media element, releases network resources
          });
      });

      // BG canvas: mirrors fg video via drawImage (always behind blur, half-res saves GPU)
      let bgCanvas = null;
      let bgCtx = null;

      // Generic video: dedicated element for IDLE state (never touches project video pool)
      genericVideo = document.createElement('video');
      genericVideo.className = 'dial_generic-video';
      genericVideo.src = GENERIC_VIDEO_URL;
      genericVideo.muted = true;
      genericVideo.loop = true;
      genericVideo.setAttribute('playsinline', '');
      genericVideo.setAttribute('preload', 'auto');
      genericVideo.setAttribute('aria-hidden', 'true');
      // Starts hidden; fades in as soon as a frame is decoded so the user sees
      // video inside the dial during the intro scroll morph (not just after it).
      genericVideo.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;opacity:0;z-index:0;';
      comp.appendChild(genericVideo);
      cleanup.push(() => { genericVideo?.remove(); genericVideo = null; });

      // Fade in generic video as soon as a frame is ready — don't wait for intro to finish.
      const _earlyFadeIn = () => {
        if (!genericVideo || !alive) return;
        if (window.gsap && !prefersReduced()) {
          window.gsap.to(genericVideo, { opacity: 1, duration: 0.4, ease: 'linear', overwrite: true });
        } else {
          genericVideo.style.opacity = '1';
        }
      };
      if (genericVideo.readyState >= 2) { _earlyFadeIn(); }
      else { genericVideo.addEventListener('loadeddata', _earlyFadeIn, { once: true }); }

      // White dot indicator (sector position at 6 o'clock — CSS handles visibility per breakpoint)
      let sectorDot = document.createElement('div');
      sectorDot.className = 'dial_sector-dot';
      sectorDot.setAttribute('aria-hidden', 'true');
      // Hidden on fresh load; fades in after dial intro completes (setIntroComplete)
      if (!introComplete) sectorDot.style.opacity = '0';
      comp.appendChild(sectorDot);
      sectorDotRef = sectorDot;
      cleanup.push(() => { if (sectorDot) { sectorDot.remove(); sectorDot = null; } sectorDotRef = null; });

      genericVideoComp = comp;
      tryPlay(genericVideo).then(r => { if (!r.ok) _autoplayBlocked = true; });
      // Show spinner on generic video when intro was skipped (Barba return from about)
      var _genericSpinner = null;
      if (introComplete) {
        _genericSpinner = document.createElement('div');
        _genericSpinner.className = prefersReduced() ? 'rhp-video-spinner-fallback' : 'rhp-video-spinner';
        _genericSpinner.setAttribute('aria-hidden', 'true');
        _genericSpinner.classList.add('is-active');
        comp.appendChild(_genericSpinner);
        if (!prefersReduced() && typeof lottie !== 'undefined') {
          try { lottie.loadAnimation({ container: _genericSpinner, renderer: 'svg', loop: true, autoplay: true,
            path: 'https://cdn.prod.website-files.com/641ab9fdf6e779f347e7e659/642558fa09463525f4cc1053_spinner1-white.json' }); } catch(e) {}
        }
        cleanup.push(function () { if (_genericSpinner) { _genericSpinner.remove(); _genericSpinner = null; } });
      }
      let intentionallyPaused = false;
      let loadWindowIndices = { prev: null, next: null };
      let visibleVideo = null; // set on first applyActive: the video element currently in fgWrap (may be original fg or a swapped-in pool element)

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
        maxLenRatio: (window.innerWidth <= 991 ? 96 : 64) / REF_R, // 50% longer on tablet/mobile; original length on desktop
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
      const geom = { cx:0, cy:0, fgCX:0, fgCY:0, videoR:0, innerR:0, switchMaxR:0, deadzoneR:0, dpr:1, gap:0, baseLen:0, maxLen:0, barW:1, nearPx:0, radFalloff:0 };

      // Runtime state
      const state = {
        // pointer
        x:-1e4, y:-1e4,
        angDeg:0, rDist:1e9,

        // zones
        inInner:false,
        inSwitch:false,
        inDeadzone:false,

        // selection
        activeIndex: 0,
        lastIndex: -1,

        // sector highlight (0.4s linear transition when sector changes)
        prevActiveIndex: 0,
        sectorHighlightEase: 1,

        // mobile dial
        rotationDeg: 0,
        dragActive: false,
        dragStartX: 0,
        dragStartY: 0,
        dragStartRot: 0,
        startedInInner: false,

        // attraction ease (smooth in/out when pointer enters)
        attractionEase: 0,

        // frame counter for throttled self-healing geometry check
        frameCount: 0
      };
      _state = state; // expose to module-level destroy()

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

        if (newState === DIAL_STATES.IDLE) {
          // Show generic video, hide bg canvas + fg layer, hide dial UI
          const gsap = window.gsap;
          const reduced = prefersReduced();
          const dialFgEl = comp.querySelector('.dial_layer-fg') || document.querySelector('.dial_layer-fg');
          // Resume and fade in generic video
          if (genericVideo) {
            try { genericVideo.play().catch(() => {}); } catch(e) {}
            if (gsap && !reduced) gsap.to(genericVideo, { opacity: 1, duration: 0.3, ease: 'linear', overwrite: true });
            else genericVideo.style.opacity = '1';
          }
          // Fade out bg canvas and reset blur
          if (bgCanvas) {
            if (gsap && !reduced) gsap.to(bgCanvas, { opacity: 0, filter: 'blur(0px)', duration: 0.3, ease: 'linear', overwrite: 'auto' });
            else { bgCanvas.style.opacity = '0'; bgCanvas.style.filter = 'blur(0px)'; }
          }
          // Fade out fg layer (hides fg video inside it) and pause fg video
          if (dialFgEl) {
            if (gsap && !reduced) gsap.to(dialFgEl, { opacity: 0, duration: 0.3, ease: 'linear', overwrite: 'auto' });
            else dialFgEl.style.opacity = '0';
          }
          if (visibleVideo) try { visibleVideo.pause(); } catch(e) {}
          // Scramble step text back to original copy
          scrambleStep(origStepText, { duration: 0.85, speed: 0.4, revert: false });
          setDialUiOpacity(0);
          if (!isMobile()) setCursorPlay(false);
        } else if (newState === DIAL_STATES.ACTIVE) {
          // Hide generic video, show bg canvas + fg layer, show dial UI
          const gsap = window.gsap;
          const reduced = prefersReduced();
          const dialFgEl = comp.querySelector('.dial_layer-fg') || document.querySelector('.dial_layer-fg');
          // Kill residual ENGAGED attractionEase tween on rapid ENGAGED→ACTIVE oscillation
          if (gsap) gsap.killTweensOf(state);
          // Kill any running tweens on bgCanvas — the IDLE branch tweens both
          // opacity + filter together, and a rapid IDLE→ACTIVE transition would
          // let the old tween overwrite filter back to blur(0px) after our set().
          if (bgCanvas && gsap) gsap.killTweensOf(bgCanvas);
          // Remove generic spinner (it's about to hide)
          if (_genericSpinner) { _genericSpinner.remove(); _genericSpinner = null; }
          if (genericVideo) {
            if (gsap && !reduced) {
              gsap.to(genericVideo, { opacity: 0, duration: 0.3, ease: 'linear', overwrite: true,
                onComplete: () => { try { genericVideo.pause(); } catch(e) {} } });
            } else {
              genericVideo.style.opacity = '0';
              try { genericVideo.pause(); } catch(e) {}
            }
          }
          // Fade in bg canvas with blur — canvas always has a frame if draw loop is running
          if (bgCanvas) {
            if (gsap) gsap.set(bgCanvas, { filter: 'blur(40px)' });
            else bgCanvas.style.filter = 'blur(40px)';
            if (gsap && !reduced) gsap.to(bgCanvas, { opacity: 1, duration: 0.3, ease: 'linear', overwrite: 'auto' });
            else bgCanvas.style.opacity = '1';
          }
          // Fade in fg layer (reveals fg video inside it) — 0.3s linear
          if (dialFgEl) {
            if (gsap && !reduced) gsap.to(dialFgEl, { opacity: 1, duration: 0.3, ease: 'linear', overwrite: 'auto' });
            else dialFgEl.style.opacity = '1';
          }
          // Reset lastIndex so the next applyActive (mouse-position driven) always
          // fires, even if the cursor is over the same sector as before IDLE.
          // Use -2 (not -1) so applyActive doesn't treat this as the initial load.
          state.lastIndex = -2;
          // Play fg video
          if (visibleVideo) playFg(visibleVideo);
          setDialUiOpacity(1);
        } else if (newState === DIAL_STATES.ENGAGED) {
          setDialUiOpacity(1);
          // Smoothly disable tick attraction so ticks return to base length
          const gsap = window.gsap;
          const reduced = prefersReduced();
          if (gsap && !reduced) {
            gsap.to(state, { attractionEase: 0, duration: 0.3, ease: 'power2.out', overwrite: true });
          } else {
            state.attractionEase = 0;
          }
        }
      }
      _setDialStateFn = setDialState;

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
      // ~2/3 of sector ticks fully orange; matches 8-tick flat zone at N=8, T.bars=96
      const FLAT_TICKS = Math.round(TICKS_PER_SECTOR * 0.67);
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
      // Per-element AbortController prevents mutual cancellation when called for fg then bg
      function waitCanPlay(videoEl) {
        return new Promise(function(resolve) {
          if (videoEl.readyState >= 2) { resolve(); return; }
          var prev = _canPlayAborts.get(videoEl);
          if (prev) prev.abort();
          var ac = new AbortController();
          _canPlayAborts.set(videoEl, ac);
          videoEl.addEventListener('canplay', function() { resolve(); }, {
            once: true,
            signal: ac.signal
          });
          videoEl.addEventListener('emptied', function() { resolve(); }, {
            once: true,
            signal: ac.signal
          });
        });
      }

      // Simple fg-only play (replaces playPaired — bg is now a canvas mirror)
      function playFg(fg) {
        if (!fg || intentionallyPaused) return;
        if (_autoplayBlocked && !_autoplayUnlocked) return;
        fg.muted = true;
        if (fg.readyState >= 2) {
          tryPlay(fg).then(r => { if (!r.ok) _autoplayBlocked = true; });
        } else {
          waitCanPlay(fg).then(() => {
            if (!intentionallyPaused) tryPlay(fg).then(r => { if (!r.ok) _autoplayBlocked = true; });
          });
        }
      }

      // Mobile video source swap: prefer data-video-mobile on mobile, fallback to data-video.
      // 'bg' type reserved for future per-item bg overrides — bg pool currently mirrors fg URL.
      function getVideoUrl(item, type) {
        if (!item) return '';
        if (isMobile()) {
          const mobileAttr = type === 'bg' ? 'data-video-bg-mobile' : 'data-video-mobile';
          const mobileUrl = item.getAttribute(mobileAttr);
          if (mobileUrl) return mobileUrl;
        }
        const desktopAttr = type === 'bg' ? 'data-video-bg' : 'data-video';
        return item.getAttribute(desktopAttr) || '';
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
        const v = getVideoUrl(item, 'fg');
        const poster = readPosterFromItem(item);

        // Skip titleEl write when it resolves to the step element — scrambleStep owns step text
        // (the live DOM only has [data-dial-title] on the step element; the layer-ui h2 doesn't exist)
        if (titleEl && titleEl !== stepEl) titleEl.textContent = t;
        if (metaEl)  metaEl.textContent  = m;

        // Scramble step text on sector change while ACTIVE (shorter, snappier than state transitions)
        if (dialState === DIAL_STATES.ACTIVE && !isInitial) {
          scrambleStep(t, { duration: 0.65, speed: 0.6, revert: true });
        }

        if (!visibleVideo) visibleVideo = comp.querySelector(SEL.fgVideo) || document.querySelector(SEL.fgVideo);

        // Before switching: save current video playback state and pause
        if (prevIndex >= 0 && visibleVideo) {
          saveVideoStateToIndex(visibleVideo, prevIndex);
          try { visibleVideo.pause(); } catch (e) {}
        }

        const newPrev = mod(idx - 1, N);
        const newNext = mod(idx + 1, N);
        const urlPrev = getVideoUrl(items[newPrev], 'fg');
        const urlNext = getVideoUrl(items[newNext], 'fg');
        const inWindow = function (i) { return i === idx || i === newPrev || i === newNext; };
        if (loadWindowIndices.prev !== null && !inWindow(loadWindowIndices.prev)) saveVideoStateToIndex(poolPrev, loadWindowIndices.prev);
        if (loadWindowIndices.next !== null && !inWindow(loadWindowIndices.next)) saveVideoStateToIndex(poolNext, loadWindowIndices.next);

        const poolPrevReady = poolPrev.readyState >= 2; // HAVE_CURRENT_DATA: has a frame, enough for instant swap
        const poolNextReady = poolNext.readyState >= 2;
        const sameUrl = function (a, b) { return !!(a && b && (a === b || a.slice(-60) === b.slice(-60))); };
        const poolPrevHasUrl = sameUrl(v, poolPrev.currentSrc || poolPrev.src);
        const poolNextHasUrl = sameUrl(v, poolNext.currentSrc || poolNext.src);
        let didSwap = false;

        const poolHiddenStyle = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;left:-9999px;';
        const fgVideoBaseStyle = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;';
        // Pool videos only need to buffer (preload="auto" handles download).
        // Do NOT play — saves bandwidth (was 4 extra concurrent streams).
        var ensurePoolBuffered = function (el) {
          var prev = _poolReadyAborts.get(el);
          if (prev) prev.abort();
          el.muted = true; // re-assert after .load() — Safari can lose muted state
          // No .play() — pool videos buffer via preload="auto", play only when swapped into visible slot
        };
        // Seek-mask helper: hide swapped-in video until seeked event fires (prevents reverse-frame jerk)
        var seekMaskReveal = function (el) {
          if (!window.gsap) { el.style.opacity = ''; return; }
          var revealed = false;
          var reveal = function () {
            if (revealed) return;
            revealed = true;
            window.gsap.to(el, { opacity: 1, duration: 0.15, ease: 'linear', overwrite: true });
          };
          el.addEventListener('seeked', reveal, { once: true });
          // Timeout guard: force reveal if seeked doesn't fire within 500ms
          setTimeout(reveal, isMobile() ? 150 : 500);
        };
        if (idx === loadWindowIndices.prev && poolPrevReady && poolPrevHasUrl && fgWrap.contains(visibleVideo)) {
          const oldVisible = visibleVideo;
          visibleVideo.classList.remove('dial_fg-video');
          if (isMobile()) {
            // Mobile: add new video on top, keep old visible as backdrop until new is ready
            fgWrap.appendChild(poolPrev);
            poolPrev.classList.add('dial_fg-video');
            poolPrev.style.cssText = fgVideoBaseStyle + 'opacity:1;'; // instant — no seek-mask on mobile
            poolPrev.removeAttribute('aria-hidden');
            poolPrev.poster = '';
            restoreVideoStateFromIndex(poolPrev, idx);
            // Now remove old (new video is already visible on top)
            fgWrap.removeChild(oldVisible);
          } else {
            fgWrap.removeChild(visibleVideo);
            fgWrap.appendChild(poolPrev);
            poolPrev.classList.add('dial_fg-video');
            // Seek-mask: keep opacity:0 until seeked fires to prevent reverse-frame jerk
            poolPrev.style.cssText = fgVideoBaseStyle + 'opacity:0;';
            poolPrev.removeAttribute('aria-hidden');
            poolPrev.poster = '';
            seekMaskReveal(poolPrev);
            // Seek AFTER seekMaskReveal so the seeked listener is registered before the event fires
            restoreVideoStateFromIndex(poolPrev, idx);
          }
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
          if (urlPrev && poolPrev.src !== urlPrev) { poolPrev.poster = readPosterFromItem(items[newPrev]) || ''; poolPrev.src = urlPrev; try { poolPrev.load(); } catch (e) {} ensurePoolBuffered(poolPrev); }
          didSwap = true;
        } else if (idx === loadWindowIndices.next && poolNextReady && poolNextHasUrl && fgWrap.contains(visibleVideo)) {
          const oldVisible = visibleVideo;
          visibleVideo.classList.remove('dial_fg-video');
          if (isMobile()) {
            // Mobile: add new video on top, keep old visible as backdrop until new is ready
            fgWrap.appendChild(poolNext);
            poolNext.classList.add('dial_fg-video');
            poolNext.style.cssText = fgVideoBaseStyle + 'opacity:1;'; // instant — no seek-mask on mobile
            poolNext.removeAttribute('aria-hidden');
            poolNext.poster = '';
            restoreVideoStateFromIndex(poolNext, idx);
            // Now remove old (new video is already visible on top)
            fgWrap.removeChild(oldVisible);
          } else {
            fgWrap.removeChild(visibleVideo);
            fgWrap.appendChild(poolNext);
            poolNext.classList.add('dial_fg-video');
            // Seek-mask: keep opacity:0 until seeked fires to prevent reverse-frame jerk
            poolNext.style.cssText = fgVideoBaseStyle + 'opacity:0;';
            poolNext.removeAttribute('aria-hidden');
            poolNext.poster = '';
            seekMaskReveal(poolNext);
            // Seek AFTER seekMaskReveal so the seeked listener is registered before the event fires
            restoreVideoStateFromIndex(poolNext, idx);
          }
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
          if (urlNext && poolNext.src !== urlNext) { poolNext.poster = readPosterFromItem(items[newNext]) || ''; poolNext.src = urlNext; try { poolNext.load(); } catch (e) {} ensurePoolBuffered(poolNext); }
          didSwap = true;
        }

        if (!didSwap) {
          if (isMobile() && poster && !isInitial) {
            // Mobile: Safari won't show <video> poster on a previously-played element.
            // Overlay a poster <img> so the circle isn't blank while the new video loads.
            // Skip on isInitial (Barba resume) — video was suspended mid-play, no load gap.
            var posterImg = document.createElement('img');
            posterImg.src = poster;
            posterImg.style.cssText = fgVideoBaseStyle + 'opacity:1;z-index:1;';
            posterImg.setAttribute('aria-hidden', 'true');
            fgWrap.appendChild(posterImg);
            var removePoster = function () {
              if (posterImg.parentNode) posterImg.parentNode.removeChild(posterImg);
            };
            visibleVideo.addEventListener('loadeddata', removePoster, { once: true });
            setTimeout(removePoster, 3000); // fallback: remove after 3s max
          }
          setVideoSourceAndPoster(visibleVideo, v, poster);
        }

        restoreVideoStateFromIndex(visibleVideo, idx);

        // FG crossfade on sector switch (canvas mirrors fg automatically — no bg crossfade needed)
        if (!isInitial && !prefersReduced() && window.gsap) {
          if (isMobile()) {
            // Mobile: keep fgWrap at full opacity — seek-mask handles per-element reveal for pool swaps
            window.gsap.set(fgWrap, { opacity: 1 });
          } else {
            window.gsap.fromTo(fgWrap, { opacity: 0 }, { opacity: 1, duration: didSwap ? 0.15 : 0.4, ease: 'linear', overwrite: true });
          }
        }

        // BG canvas: if FG video not yet decoded, draw poster or fill black so canvas
        // doesn't show stale previous-sector frame through the blur
        if (bgCanvas && bgCtx && visibleVideo && visibleVideo.readyState < 2) {
          if (poster) {
            const img = new Image();
            img.onload = function () {
              // Only draw if still on same sector (avoid race with fast switching)
              if (state.activeIndex === idx && bgCanvas) {
                try { bgCtx.drawImage(img, 0, 0, bgCanvas.width, bgCanvas.height); } catch(e) {}
              }
            };
            img.src = poster;
          } else {
            bgCtx.fillStyle = '#000';
            bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
          }
        }

        // Play fg video (canvas mirror draws whatever fg shows)
        playFg(visibleVideo);

        if (urlPrev && poolPrev.src !== urlPrev) {
          poolPrev.poster = readPosterFromItem(items[newPrev]) || '';
          poolPrev.src = urlPrev;
          try { poolPrev.load(); } catch (e) {}
          ensurePoolBuffered(poolPrev);
        }
        if (urlNext && poolNext.src !== urlNext) {
          poolNext.poster = readPosterFromItem(items[newNext]) || '';
          poolNext.src = urlNext;
          try { poolNext.load(); } catch (e) {}
          ensurePoolBuffered(poolNext);
        }
        loadWindowIndices.prev = newPrev;
        loadWindowIndices.next = newNext;
      }

      // Round to half-pixel for crisp 1px strokes (avoids blurry/pixelated lines when scaling)
      function crisp(x) { return Math.round(x * 2) / 2; }

      function resize() {
        if (!alive) return;
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
        geom.deadzoneR  = geom.videoR * SWITCH_DEADZONE_RATIO;

        // Idle threshold: 200px beyond outer tick ring edge at 3000px viewport, scaled by dial width
        geom.idleThreshold = (geom.innerR + geom.baseLen) + (200 * (r.width / 3000)) * 0.6;

        // BG canvas: half-resolution (blur hides detail, saves GPU)
        if (bgCanvas) {
          const bgR = comp.getBoundingClientRect();
          if (bgR.width > 0 && bgR.height > 0) {
            bgCanvas.width = Math.round(bgR.width * 0.5);
            bgCanvas.height = Math.round(bgR.height * 0.5);
          }
        }

        if (debugGeom()) {
          console.log('[dial-geom] resize:', {
            canvas: `${r.width}×${r.height}`,
            fgWrap: `${fr.width}×${fr.height}`,
            videoR: geom.videoR,
            cx_cy: `${geom.cx}/${geom.cy}`,
            fgCenter: `${geom.fgCX}/${geom.fgCY}`,
            dvh: window.innerHeight,
            svh: window.visualViewport?.height ?? 'n/a',
            dialNs: comp?.getAttribute('data-dial-ns') ?? 'none',
            scrollY: window.scrollY
          });
        }
      }

      // Hysteresis thresholds (prevents boundary flicker)
      const H = {
        innerEnter:    () => geom.innerR - 6,
        innerExit:     () => geom.innerR + 10,
        switchEnter:   () => geom.switchMaxR - 10,
        switchExit:    () => geom.switchMaxR + 20,
        // Lock at exactly SWITCH_DEADZONE_RATIO * videoR (nominal ratio is the lock line).
        // Unlock 10 px beyond it for hysteresis so the boundary doesn't flicker.
        deadzoneEnter: () => geom.deadzoneR,
        deadzoneExit:  () => geom.deadzoneR + 10
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

        // Hoisted — reused by ACTIVE↔ENGAGED transition AND inDeadzone tracker
        const fgDist = Math.hypot(e.clientX - geom.fgCX, e.clientY - geom.fgCY);

        // IDLE ↔ ACTIVE transitions — desktop only (mobile uses tap radius in onPointerDown)
        if (!isMobile() && interactionUnlocked) {
          if (dialState === DIAL_STATES.IDLE && state.rDist <= geom.idleThreshold) {
            setDialState(DIAL_STATES.ACTIVE);
          } else if (dialState === DIAL_STATES.ACTIVE && state.rDist > geom.idleThreshold) {
            setDialState(DIAL_STATES.IDLE);
          } else if (dialState === DIAL_STATES.ENGAGED && state.rDist > geom.idleThreshold) {
            setDialState(DIAL_STATES.IDLE);
          }
        }

        // inInner zone — unchanged. Still drives cursor PLAY + tick warmth.
        if (!state.inInner && state.rDist <= H.innerEnter()) state.inInner = true;
        else if (state.inInner && state.rDist >= H.innerExit()) state.inInner = false;

        // inDeadzone zone — new. Drives sector-switching exclusion inside fg video.
        if (!state.inDeadzone && fgDist <= H.deadzoneEnter()) state.inDeadzone = true;
        else if (state.inDeadzone && fgDist >= H.deadzoneExit()) state.inDeadzone = false;

        // ACTIVE ↔ ENGAGED: now based on deadzone, not fg video edge
        if (!isMobile() && interactionUnlocked && introComplete) {
          if (dialState === DIAL_STATES.ACTIVE && fgDist <= geom.deadzoneR - 6) {
            setDialState(DIAL_STATES.ENGAGED);
          } else if (dialState === DIAL_STATES.ENGAGED && fgDist >= geom.deadzoneR + 4) {
            setDialState(DIAL_STATES.ACTIVE);
          }
        }

        // inSwitch — relaxed: no longer requires rDist > innerR. The !state.inDeadzone
        // check below handles the centre exclusion inside the fg video.
        if (!state.inSwitch && state.rDist <= H.switchEnter()) state.inSwitch = true;
        else if (state.inSwitch && state.rDist >= H.switchExit()) state.inSwitch = false;

        // Desktop: switch only when ACTIVE, inSwitch, and NOT inDeadzone
        if (!isMobile() && dialState === DIAL_STATES.ACTIVE && state.inSwitch && !state.inDeadzone) {
          const idx = Math.floor(mod(state.angDeg + sectorOffset, 360) / sectorSize);
          applyActive(idx);
        }

        // Desktop cursor morph - use cursor.js API
        if (!isMobile() && RHP.cursor && RHP.cursor.setPosition) {
          RHP.cursor.setPosition(e.clientX, e.clientY);
          setCursorPlay(dialState !== DIAL_STATES.IDLE && state.inInner);
        }
      }

      function onPointerLeave() {
        state.x = -1e4; state.y = -1e4;
        state.rDist = 1e9;
        state.inInner = false;
        state.inSwitch = false;
        state.inDeadzone = false;
        if (!isMobile()) setCursorPlay(false);
        // Mobile: IDLE transition handled by tap radius in onPointerDown, not pointer leave
        if (!isMobile() && interactionUnlocked && dialState !== DIAL_STATES.IDLE) {
          setDialState(DIAL_STATES.IDLE);
        }
      }

      // Mobile dial: vertical drag rotates ticks only; update index per snap step (Variant B)
      const ROTATE_PER_PX = 0.22; // deg per px (tune)
      let _justActivatedMobile = false; // suppress click-to-navigate on activation tap
      _mobileActiveLocked = false; // reset on each init
      function onPointerDown(e) {
        if (!isMobile()) return;
        // Kill in-flight snap tween so dragStartRot captures a stable value
        if (window.gsap) window.gsap.killTweensOf(state, 'rotationDeg');

        // Tap radius: within 4rem of dial outer edge → ACTIVE, outside → IDLE
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const dist = Math.hypot(x - geom.cx, y - geom.cy);
        const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        const activeRadius = geom.innerR + geom.maxLen + (4 * rem);

        if (interactionUnlocked) {
          // Taps inside dial_layer-ui (project info, links) should not change state
          const inUI = e.target.closest('.dial_layer-ui') || e.target.closest('.dial_work-link');
          if (dist <= activeRadius || inUI) {
            if (dialState === DIAL_STATES.IDLE) {
              setDialState(DIAL_STATES.ACTIVE);
              _mobileActiveLocked = true; // Lock to ACTIVE permanently
              _justActivatedMobile = true;
              setTimeout(() => { _justActivatedMobile = false; }, 400);
            }
          } else {
            if (!_mobileActiveLocked && dialState !== DIAL_STATES.IDLE) {
              setDialState(DIAL_STATES.IDLE);
            }
          }
        }

        state.dragActive = true;
        state.dragStartX = e.clientX;
        state.dragStartY = e.clientY;
        state.dragStartRot = state.rotationDeg;
        state.startedInInner = (dist <= geom.innerR);
      }

      function onPointerUp() {
        if (!isMobile()) return;
        state.dragActive = false;
        state.startedInInner = false;

        // Snap to nearest sector (kill any in-flight snap first)
        if (window.gsap) window.gsap.killTweensOf(state, 'rotationDeg');
        const nearestSector = Math.round(state.rotationDeg / sectorSize);
        if (prefersReduced() || !window.gsap) {
          state.rotationDeg = nearestSector * sectorSize;
          applyActive(mod(nearestSector, N));
        } else {
          window.gsap.to(state, {
            rotationDeg: nearestSector * sectorSize,
            duration: 0.2,
            ease: 'power2.out',
            overwrite: true,
            onUpdate: () => {
              if (!alive) return;
              applyActive(mod(Math.round(state.rotationDeg / sectorSize), N));
            },
            onComplete: () => {
              // Normalise to prevent unbounded accumulation
              state.rotationDeg = mod(state.rotationDeg, 360);
            }
          });
        }
      }

      function onPointerMoveMobile(e) {
        if (!isMobile() || !state.dragActive) return;
        if (state.startedInInner) return;

        const dx = e.clientX - state.dragStartX;
        const dy = e.clientY - state.dragStartY;
        // y-axis: swipe down → clockwise; x-axis: swipe right → counterclockwise (inverted)
        const delta = Math.abs(dy) >= Math.abs(dx) ? dy : -dx;
        state.rotationDeg = state.dragStartRot + (delta * ROTATE_PER_PX);

        // Variant B: update active index as steps cross boundaries
        const stepped = Math.round(state.rotationDeg / sectorSize);
        applyActive(mod(stepped, N));
      }

      // Optional: wheel as dial input on coarse-pointer devices (prevents page scroll/address bar)
      function onWheel(e) {
        if (!isMobile()) return;
        e.preventDefault();

        const delta = (Math.abs(e.deltaY) > Math.abs(e.deltaX)) ? e.deltaY : -e.deltaX;
        state.rotationDeg += (delta * 0.08); // tune sensitivity

        const stepped = Math.round(state.rotationDeg / sectorSize);
        applyActive(mod(stepped, N));
      }

      // Prevent real page scroll while dragging (keeps browser UI calmer)
      function preventTouchScroll(e) {
        if (isMobile() && state.dragActive) e.preventDefault();
      }

      // Pause/resume on tab hide/show — canvas freezes when draw() stops (tab hidden)
      function onVis() {
        if (document.hidden) {
          intentionallyPaused = true;
          stop(); // stops draw RAF — canvas freezes automatically
          if (visibleVideo) try { visibleVideo.pause(); } catch(e) {}
          if (genericVideo && dialState === DIAL_STATES.IDLE) try { genericVideo.pause(); } catch(e) {}
        } else if (alive) {
          intentionallyPaused = false;
          // Re-assert muted on all video elements after tab resume
          enforceVideoPolicy(comp);
          stop();
          rafId = requestAnimationFrame(draw);
          if (_autoplayBlocked && !_autoplayUnlocked) return;
          if (dialState !== DIAL_STATES.IDLE) {
            if (visibleVideo) playFg(visibleVideo);
          } else {
            if (genericVideo) tryPlay(genericVideo).then(r => { if (!r.ok) _autoplayBlocked = true; });
          }
        }
      }

      function draw() {
        if (!alive) return;
        if (state.frameCount >= 1e9) state.frameCount = 0;
        state.frameCount++;

        // Self-healing: check geometry drift every 60 frames (~1/sec) and auto-resize
        if (fgWrap && state.frameCount % 60 === 0) {
          const fr = fgWrap.getBoundingClientRect();
          const liveR = (Math.min(fr.width, fr.height) / 2) || 0;
          if (liveR > 0 && Math.abs(liveR - geom.videoR) > 4) {
            debugGeom() && console.warn('[dial-geom] DRIFT', { cached: geom.videoR, live: liveR, delta: liveR - geom.videoR });
            resize();
          }
        }

        // BG canvas mirror: draw current fg video frame (pixel-perfect sync under blur)
        // Skip in IDLE — canvas is at opacity:0 so drawing is invisible work
        if (bgCanvas && bgCtx && dialState !== DIAL_STATES.IDLE) {
          const srcVideo = visibleVideo || genericVideo;
          if (srcVideo && srcVideo.readyState >= 2) {
            try { bgCtx.drawImage(srcVideo, 0, 0, bgCanvas.width, bgCanvas.height); } catch(e) {}
          }
        }

        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (glowCanvas.width !== w || glowCanvas.height !== h) {
          glowCanvas.width = w; glowCanvas.height = h;
        }
        ctx.clearRect(0, 0, w, h);
        glowCtx.clearRect(0, 0, w, h);

        // Track max intro opacity this frame for glow fade-in
        let maxTickOpacity = 1;
        const inIntro = introMode && !introComplete && RHP._dialIntroProgress;

        // Mobile: rotate ticks ONLY (labels are separate DOM)
        if (isMobile()) {
          canvas.style.transform = `rotate(${state.rotationDeg}deg)`;

          // Mobile attraction: ticks always point toward the dot (screen-space bottom).
          // Canvas rotates via CSS, so compensate: target = 180° - rotation in canvas coords.
          const hasAttrMobile = attractionEnabled && !prefersReduced();
          const MOBILE_ATTR_EASE = 0.6;
          const attractionTarget = mod(180 - state.rotationDeg, 360);

          if (inIntro) maxTickOpacity = 0;
          // draw ticks — intro scale + opacity when in intro mode; sector highlight gradient
          const ease = state.sectorHighlightEase ?? 1;
          for (let i = 0; i < T.bars; i++) {
            const a = (i / T.bars) * Math.PI * 2;
            let tickScale = 1;
            let tickOpacity = 1;
            if (inIntro) {
              const t = RHP._dialIntroProgress.time || 0;
              const clockPos = (i - TWELVE_OCLOCK_IDX + T.bars) % T.bars;
              const startT = clockPos * TICK_INTRO.stagger;
              const raw = Math.max(0, Math.min(1, (t - startT) / TICK_INTRO.tickDur));
              tickScale = prefersReduced() ? raw : 1 - Math.pow(1 - raw, 4);
              tickOpacity = raw;
              if (tickOpacity > maxTickOpacity) maxTickOpacity = tickOpacity;
            }
            let mobileInf = 0;
            if (hasAttrMobile) {
              // degTop0: tick angle in top-0 frame (+90 converts canvas right-0 to top-0)
              const degTop0 = (i / T.bars * 360 + 90) % 360;
              const dAng = Math.min(Math.abs(degTop0 - attractionTarget), 360 - Math.abs(degTop0 - attractionTarget));
              mobileInf = Math.max(0, 1 - dAng / T.angFalloff) * MOBILE_ATTR_EASE;
            }
            const len = (geom.baseLen + (geom.maxLen - geom.baseLen) * mobileInf) * tickScale;

            // Mobile: all ticks stay teal (no orange — sector highlight + attraction color disabled)
            const mobileColor = mix(T.teal, T.orange, 0);

            // Draw to both main and glow canvases
            for (const c of [ctx, glowCtx]) {
              c.globalAlpha = tickOpacity;
              c.strokeStyle = mobileColor;
              c.lineWidth = geom.barW;
              c.lineCap = 'round';
            }

            const x0 = geom.cx + Math.cos(a) * geom.innerR;
            const y0 = geom.cy + Math.sin(a) * geom.innerR;
            const x1 = geom.cx + Math.cos(a) * (geom.innerR + len);
            const y1 = geom.cy + Math.sin(a) * (geom.innerR + len);

            for (const c of [ctx, glowCtx]) {
              c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
              c.globalAlpha = 1;
            }
          }

          // Composite glow layer — single blur op
          ctx.save();
          ctx.filter = 'blur(12px)';
          ctx.globalAlpha = maxTickOpacity;
          ctx.drawImage(glowCanvas, 0, 0);
          ctx.restore();

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

        const hasAttraction = hasPointer && !reduced && attractionEnabled && dialState !== DIAL_STATES.ENGAGED;
        state.attractionEase += hasAttraction ? 0.04 : -0.06;
        state.attractionEase = Math.max(0, Math.min(1, state.attractionEase));

        if (inIntro) maxTickOpacity = 0;

        for (let i = 0; i < T.bars; i++) {
          const a = (i / T.bars) * Math.PI * 2;
          const deg = (i / T.bars) * 360;

          let tickScale = 1;
          let tickOpacity = 1;
          if (inIntro) {
            const t = RHP._dialIntroProgress.time || 0;
            const clockPos = (i - TWELVE_OCLOCK_IDX + T.bars) % T.bars;
            const startT = clockPos * TICK_INTRO.stagger;
            const raw = Math.max(0, Math.min(1, (t - startT) / TICK_INTRO.tickDur));
            tickScale = reduced ? raw : 1 - Math.pow(1 - raw, 4);
            tickOpacity = raw;
            if (tickOpacity > maxTickOpacity) maxTickOpacity = tickOpacity;
          }

          let inf = 0;
          if (hasAttraction || state.attractionEase > 0) {
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

          const tickColor = mix(T.teal, T.orange, finalWarm);

          // Draw to both main and glow canvases
          for (const c of [ctx, glowCtx]) {
            c.globalAlpha = tickOpacity;
            c.strokeStyle = tickColor;
            c.lineWidth = geom.barW;
            c.lineCap = 'round';
          }

          const x0 = crisp(geom.cx + Math.cos(a) * geom.innerR);
          const y0 = crisp(geom.cy + Math.sin(a) * geom.innerR);
          const x1 = crisp(geom.cx + Math.cos(a) * (geom.innerR + len));
          const y1 = crisp(geom.cy + Math.sin(a) * (geom.innerR + len));

          for (const c of [ctx, glowCtx]) {
            c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
            c.globalAlpha = 1;
          }
        }

        // Composite glow layer — single blur op, fades in with intro
        ctx.save();
        ctx.filter = 'blur(12px)';
        ctx.globalAlpha = maxTickOpacity;
        ctx.drawImage(glowCanvas, 0, 0);
        ctx.restore();

        rafId = requestAnimationFrame(draw);
      }

      // Ensure fg video element exists (previous destroy may have removed it
      // via pool swap cleanup — originals get demoted to pool slots then removed).
      if (!comp.querySelector(SEL.fgVideo) && !document.querySelector(SEL.fgVideo)) {
        var freshFg = document.createElement('video');
        freshFg.className = 'dial_fg-video';
        freshFg.setAttribute('playsinline', '');
        freshFg.setAttribute('muted', '');
        freshFg.setAttribute('loop', '');
        freshFg.setAttribute('preload', 'auto');
        freshFg.muted = true;
        fgWrap.appendChild(freshFg);
        cleanup.push(function() { freshFg.remove(); });
      }

      // Create bg canvas (mirrors fg video via drawImage — always behind blur)
      const bgLayerBoot = comp.querySelector('.dial_layer-bg') || document.querySelector('.dial_layer-bg');
      if (bgLayerBoot) {
        bgCanvas = document.createElement('canvas');
        bgCanvas.className = 'dial_bg-canvas';
        bgCanvas.setAttribute('aria-hidden', 'true');
        bgCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
        bgLayerBoot.appendChild(bgCanvas);
        bgCtx = bgCanvas.getContext('2d');
        cleanup.push(function() { if (bgCanvas && bgCanvas.parentNode) bgCanvas.remove(); bgCanvas = null; bgCtx = null; });
      }

      // Boot
      resize();

      // visualViewport resize listener — catches Safari address bar show/hide
      if (window.visualViewport) {
        on(window.visualViewport, 'resize', resize, { passive: true }, true);
      }

      applyActive(0);
      // Boot opacity: bg canvas starts hidden in IDLE (draw loop populates it but it should not be visible)
      if (dialState === DIAL_STATES.IDLE && bgCanvas) {
        if (window.gsap) window.gsap.set(bgCanvas, { opacity: 0, overwrite: true });
        else bgCanvas.style.opacity = '0';
      }
      // Intro-skipped boot (about→home): fade in genericVideo and dismiss spinner when ready
      if (dialState === DIAL_STATES.IDLE && introComplete && genericVideo) {
        var _dismissGenericSpinner = function () {
          if (window.gsap) window.gsap.to(genericVideo, { opacity: 1, duration: 0.3, ease: 'linear', overwrite: true,
            onComplete: function () { if (_genericSpinner) { _genericSpinner.remove(); _genericSpinner = null; } } });
          else { genericVideo.style.opacity = '1'; if (_genericSpinner) { _genericSpinner.remove(); _genericSpinner = null; } }
        };
        if (genericVideo.readyState >= 3) { _dismissGenericSpinner(); }
        else { genericVideo.addEventListener('canplaythrough', _dismissGenericSpinner, { once: true }); }
      }

      // If returning from case study, restore handoff index and playback position
      if (RHP.videoState && RHP.videoState.caseHandoff) {
        const h = RHP.videoState.caseHandoff;
        if (typeof h.index === 'number' && h.index >= 0 && h.index < N && typeof h.currentTime === 'number') {
          // dialState is already ACTIVE (set at init) — ensure project video is visible, generic hidden
          if (genericVideo) genericVideo.style.opacity = '0';
          // Show bg canvas with blur (canvas auto-mirrors fg via draw loop)
          if (bgCanvas) {
            bgCanvas.style.opacity = '1';
            if (window.gsap) window.gsap.set(bgCanvas, { filter: 'blur(40px)' });
            else bgCanvas.style.filter = 'blur(40px)';
          }
          // Pre-write handoff time so applyActive/restoreVideoStateFromIndex picks it up
          RHP.videoState.byIndex[h.index] = { currentTime: h.currentTime, paused: false };
          applyActive(h.index);
          // Ensure fg is at the exact handoff time
          const fg = comp.querySelector(SEL.fgVideo) || document.querySelector(SEL.fgVideo);
          if (fg) {
            try { fg.currentTime = h.currentTime; } catch(e) {}
            playFg(fg);
          }
        }
        RHP.videoState.caseHandoff = null;
        // FIX: dialState was set to ACTIVE directly at init, bypassing setDialState(ACTIVE).
        // Patch the visual state here: fg layer visible, bg canvas visible with CSS blur.
        const reduced = prefersReduced();
        const handoffFgEl = comp.querySelector('.dial_layer-fg') || document.querySelector('.dial_layer-fg');
        if (handoffFgEl) {
          if (window.gsap && !reduced) window.gsap.set(handoffFgEl, { opacity: 1 });
          else handoffFgEl.style.opacity = '1';
        }
      }

      // Center dial layer click → go to active case study (Barba transition)
      const dialFg = comp.querySelector('.dial_layer-fg') || document.querySelector('.dial_layer-fg');

        if (dialFg) {
        dialFg.style.cursor = 'pointer';
        refs = refs || {};
        }

      function bindInteractionListeners() {
        on(window, 'resize', resize, { passive: true }, true);
        on(comp, 'pointermove', onPointerMove, { passive: true }, true);
        on(comp, 'pointerleave', onPointerLeave, { passive: true }, true);
        on(comp, 'pointerdown', onPointerDown, { passive: true }, true);
        on(comp, 'pointermove', onPointerMoveMobile, { passive: true }, true);
        on(window, 'pointerup', onPointerUp, { passive: true }, true);
        on(comp, 'wheel', onWheel, { passive: false }, true);
        on(window, 'touchmove', preventTouchScroll, { passive: false }, true);
        if (dialFg) on(dialFg, 'click', (e) => {
          // On mobile, suppress navigation on the tap that activated the dial
          if (isMobile() && _justActivatedMobile) { _justActivatedMobile = false; return; }
          // Only navigate when dial is in ACTIVE or ENGAGED state
          if (isMobile() && dialState === DIAL_STATES.IDLE) return;
          goToActiveCase(e, items, state);
        }, { passive: false }, true);
        on(document, 'visibilitychange', onVis, { passive: true }, true);
        on(window, 'pointerdown', () => enforceVideoPolicy(comp), { once: true, passive: true }, true);

        // Listen for home-intro tap-to-play unlock
        const onAutoplayUnlocked = () => { _autoplayUnlocked = true; };
        window.addEventListener('rhp:autoplay:unlocked', onAutoplayUnlocked);
        cleanup.push(() => window.removeEventListener('rhp:autoplay:unlocked', onAutoplayUnlocked));
      }

      bindInteractionListeners();

      // Suspend/resume closures — capture init-scoped variables
      _suspendFn = function() {
        if (!alive || suspended) return;
        suspended = true;

        // Save state for active sector
        if (visibleVideo && typeof state.activeIndex === 'number') {
          saveVideoStateToIndex(visibleVideo, state.activeIndex);
        }

        // Keep visible fg playing through the morph animation; pause pool + generic
        [genericVideo, poolPrev, poolNext]
          .forEach(v => { if (v && !v.paused) try { v.pause(); } catch(e) {} });

        // Keep draw() RAF running during suspend — bg canvas must continue
        // mirroring the fg video through the morph animation. Ticks still draw
        // (harmless, static) and interaction listeners are already removed.

        // Remove interaction listeners only (DOM stays)
        suspendCleanup.forEach(fn => { try { fn(); } catch(e) {} });
        cleanup = cleanup.filter(fn => !suspendCleanup.includes(fn));
        suspendCleanup = [];

        interactionUnlocked = false;
      };

      _resumeFn = function(handoff) {
        if (!alive || !suspended) return;
        suspended = false;

        bindInteractionListeners();

        // If handoff provided, apply it
        if (handoff && typeof handoff.index === 'number') {
          state.lastIndex = -1; // reset so applyActive doesn't bail on same-index
          RHP.videoState.byIndex[handoff.index] = {
            currentTime: handoff.currentTime,
            paused: false
          };
          applyActive(handoff.index);

          // Force exact seek
          if (visibleVideo) try { visibleVideo.currentTime = handoff.currentTime; } catch(e) {}
        }

        // Resume playback (only when not in IDLE — IDLE uses genericVideo)
        if (dialState !== DIAL_STATES.IDLE && visibleVideo) {
          playFg(visibleVideo);
        }
        if (genericVideo && dialState === DIAL_STATES.IDLE) {
          try { genericVideo.play().catch(() => {}); } catch(e) {}
        }

        // Force full visual state refresh — clearProps in runAfterEnter removed inline styles.
        // Always go through ACTIVE (the only branch that sets dialFg opacity, bg canvas, etc).
        dialState = null;
        setDialState(DIAL_STATES.ACTIVE);

        // Restart RAF loop — stop first to prevent double-RAF
        stop();
        resize();
        rafId = requestAnimationFrame(draw);

        // Preload adjacent FG pool slots
        const idx = state.activeIndex;
        if (typeof idx === 'number' && items && items.length) {
          const prevIdx = mod(idx - 1, N);
          const nextIdx = mod(idx + 1, N);
          const urlPrev = getVideoUrl(items[prevIdx], 'fg');
          const urlNext = getVideoUrl(items[nextIdx], 'fg');
          const posterPrev = readPosterFromItem(items[prevIdx]);
          const posterNext = readPosterFromItem(items[nextIdx]);
          setVideoSourceAndPoster(poolPrev, urlPrev, posterPrev);
          setVideoSourceAndPoster(poolNext, urlNext, posterNext);
        }

        interactionUnlocked = true;
      };

      rafId = requestAnimationFrame(draw);

      refs = Object.assign(refs || {}, { getActiveIndex: () => state.activeIndex, geom });

      // Signal that canvas is drawn and first video is attached — used by overlay hold
      RHP.workDial._ready = true;
    }

    function setIntroComplete() {
      introComplete = true;
      attractionEnabled = true; // Safety net: guarantee attraction enabled after intro
      // Fade in the mobile sector dot after dial ticks have animated in
      if (sectorDotRef && window.gsap) {
        window.gsap.to(sectorDotRef, { opacity: 1, duration: 0.4, ease: 'power2.out' });
      } else if (sectorDotRef) {
        sectorDotRef.style.opacity = '1';
      }
      // Fade in generic video now — on fresh load it was at opacity:0 waiting for intro to finish.
      // Show immediately if a frame is ready; otherwise wait for loadeddata then fade in.
      if (dialState === DIAL_STATES.IDLE && genericVideo) {
        const _fadeIn = () => {
          if (window.gsap && !prefersReduced()) {
            window.gsap.to(genericVideo, { opacity: 1, duration: 0.3, ease: 'linear', overwrite: true });
          } else {
            genericVideo.style.opacity = '1';
          }
        };
        if (genericVideo.readyState >= 2) { _fadeIn(); }
        else { genericVideo.addEventListener('loadeddata', _fadeIn, { once: true }); }
      }
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

    function suspend() {
      if (_suspendFn) _suspendFn();
    }

    function resume(handoff) {
      if (_resumeFn) _resumeFn(handoff);
    }

    function destroy() {
      if (!alive) return;
      alive = false;
      suspended = false;

      // Clear ready flag — overlay hold in orchestrator checks this
      RHP.workDial._ready = false;

      stop();
      // Kill any in-flight GSAP tweens on the state object (e.g. attractionEase from ENGAGED)
      if (window.gsap && _state) window.gsap.killTweensOf(_state);
      _state = null;
      cleanup.forEach(fn => { try { fn(); } catch(e){} });
      cleanup = [];
      suspendCleanup = [];
      _suspendFn = null;
      _resumeFn = null;
      _mobileActiveLocked = false;
      _setDialStateFn = null;
      refs = null;
      genericVideoComp = null;
    }

    function getActiveIndex() {
      return refs?.getActiveIndex?.() ?? 0;
    }

    function isSuspended() { return suspended; }

    function setDeadzoneRatio(ratio) {
      if (typeof ratio !== 'number' || !isFinite(ratio) || ratio < 0 || ratio > 1) return;
      SWITCH_DEADZONE_RATIO = ratio;
      const g = refs && refs.geom;
      if (g && g.videoR) g.deadzoneR = g.videoR * ratio;
    }

    /** Force the dial into ACTIVE state (mobile: skip tap requirement). */
    function forceActive() {
      if (!alive || !interactionUnlocked || !_setDialStateFn) return;
      _mobileActiveLocked = true;
      if (dialState !== DIAL_STATES.ACTIVE) {
        _setDialStateFn(DIAL_STATES.ACTIVE);
      }
    }

    return { init, destroy, suspend, resume, isSuspended, getActiveIndex, setIntroComplete, setAttractionEnabled, setDeadzoneRatio, onIntroComplete, onNavAnimationComplete, setInteractionUnlocked, getIntroVideoEl, forceActive, _ready: false, version: WORK_DIAL_VERSION };
  })();
})();
