/* =========================================
   RHP — Orchestrator (Barba conductor)
   + Scroll lock only on home
   + Lenis on all non-home pages
   ========================================= */
(() => {
  const ORCHESTRATOR_VERSION = '2026.3.19.1'; // bump when you deploy; check in console: RHP load check
  window.RHP = window.RHP || {};
  const RHP = window.RHP;
  RHP.orchestratorVersion = ORCHESTRATOR_VERSION;

  /** Convert a GSAP tween to a Promise (GSAP 3.x compat). */
  const _tweenPromise = (tween) =>
    tween.then ? tween.then() : new Promise(r => tween.eventCallback('onComplete', r));

  // If cursor.js didn't load (missing from init or error), stub so RHP.cursor.version shows 'not-loaded'
  if (typeof RHP.cursor === 'undefined') {
    RHP.cursor = { version: 'not-loaded', init: function() {}, destroy: function() {}, refresh: function() {}, setPosition: function() {}, setState: function() {}, setLockedToDot: function() {} };
  }

  /* -----------------------------
     Shared transition helpers
     ----------------------------- */
  const _getCSSVar = (name, fallback) => {
    const v = (getComputedStyle(document.documentElement).getPropertyValue(name) || '').trim();
    return v || fallback;
  };

  const _remToPx = (rem) => rem * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16);

  const _parseSize = (str) => {
    if (!str || str === 'auto') return Infinity;
    const vw = window.innerWidth * 0.01;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const m = str.match(/min\((\d+)vw,\s*([\d.]+)rem\)/);
    if (m) return Math.min(parseFloat(m[1]) * vw, parseFloat(m[2]) * rem);
    if (str.includes('vw')) return parseFloat(str) * vw;
    if (str.includes('rem')) return parseFloat(str) * rem;
    if (str.includes('px')) return parseFloat(str);
    return Infinity;
  };

  /* -----------------------------
     FG video preload (case → home)
     Warms browser cache during dial-shrink so work-dial
     videos load from cache instead of showing spinners.
     ----------------------------- */
  let _preloadEls = [];

  function _preloadFgVideos(handoffIndex) {
    _cleanupPreload();

    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const ect = conn && conn.effectiveType;
    if (ect === '2g' || ect === 'slow-2g') return;
    const limitTo3 = (ect === '3g');

    const items = document.querySelectorAll('.dial_cms-item');
    if (!items.length) return;

    const N = Math.min(8, items.length);
    const isMobile = window.matchMedia('(hover: none), (pointer: coarse)').matches;

    // Priority: handoff sector, then ±1 adjacent, then remaining
    const order = [];
    if (typeof handoffIndex === 'number') order.push(handoffIndex);
    const prev = ((handoffIndex || 0) - 1 + N) % N;
    const next = ((handoffIndex || 0) + 1) % N;
    if (order.indexOf(prev) === -1) order.push(prev);
    if (order.indexOf(next) === -1) order.push(next);
    if (!limitTo3) {
      for (let i = 0; i < N; i++) {
        if (order.indexOf(i) === -1) order.push(i);
      }
    }

    const frag = document.createDocumentFragment();
    order.forEach(function(idx, rank) {
      const item = items[idx];
      if (!item) return;
      const url = item.getAttribute(isMobile ? 'data-video-mobile' : 'data-video')
               || item.getAttribute('data-video');
      if (!url) return;

      const el = document.createElement('video');
      el.setAttribute('preload', rank < 3 ? 'auto' : 'metadata');
      el.setAttribute('muted', '');
      el.setAttribute('playsinline', '');
      el.setAttribute('data-preload-temp', '');
      el.muted = true;
      el.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;left:-9999px;';
      el.src = url;
      try { el.load(); } catch(e) { /* swallow */ }
      frag.appendChild(el);
      _preloadEls.push(el);
    });

    // Appended outside Barba container so elements survive DOM swap;
    // _cleanupPreload() removes them on afterEnter
    const comp = document.querySelector('.dial_component');
    if (comp) comp.appendChild(frag);
  }

  function _cleanupPreload() {
    _preloadEls.forEach(function(el) {
      try { el.pause(); } catch(e) { /* swallow */ }
      el.removeAttribute('src');
      try { el.load(); } catch(e) { /* swallow */ }
      el.remove();
    });
    _preloadEls = [];
  }

  /* -----------------------------
     Dial morph helpers (namespace restructure)
     ----------------------------- */
  function getDialVars() {
    return {
      homeWidth: _getCSSVar('--dial-home-width', '37.5rem'),
      homeHeight: _getCSSVar('--dial-home-height', '37.5rem'),
      homeBR: _getCSSVar('--dial-home-border-radius', '1000rem'),
      homeAR: _getCSSVar('--dial-home-aspect-ratio', '1'),
      caseWidth: _getCSSVar('--dial-case-width', '78vw'),
      caseHeight: _getCSSVar('--dial-case-height', '85dvh'),
      caseBR: _getCSSVar('--dial-case-border-radius', '7.5rem'),
      caseAR: _getCSSVar('--dial-case-aspect-ratio', 'auto'),
      caseTitleGap: _getCSSVar('--dial-case-title-gap', '140px')
    };
  }

  function runDialExpandAnimation() {
    const gsap = window.gsap;
    const dialFg = document.querySelector('.dial_layer-fg');
    const dialComp = document.querySelector('.dial_component');
    const dialUI = document.querySelector('.dial_layer-ui');
    const dialTicks = document.querySelector('.dial_layer-ticks');
    if (!dialFg || !gsap) return Promise.resolve();

    const v = getDialVars();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dur = reduced ? 0 : 0.8;

    return new Promise((resolve) => {
      gsap.killTweensOf(dialFg);

      if (dialUI) {
        gsap.to(dialUI, { opacity: 0, duration: dur * 0.4, ease: 'power2.out' });
      }
      if (dialTicks) {
        gsap.to(dialTicks, { opacity: 0, duration: dur * 0.3, ease: 'power2.out' });
      }

      const rect = dialFg.getBoundingClientRect();

      // Pin #fg-video-wrap dimensions before ns change
      const videoWrap = document.getElementById('fg-video-wrap');
      const vRect = videoWrap?.getBoundingClientRect();
      if (videoWrap && vRect) {
        const caseBR = _parseSize(v.caseBR);
        gsap.set(videoWrap, {
          width: vRect.width,
          height: vRect.height,
          borderRadius: caseBR
        });
      }

      // Tween videoWrap to case video height (leaves gap for title peek)
      if (videoWrap) {
        // Resolve calc(--dial-case-height - --dial-case-title-gap) to pixels
        const tempEl = document.createElement('div');
        tempEl.style.height = 'calc(' + v.caseHeight + ' - ' + v.caseTitleGap + ')';
        tempEl.style.position = 'absolute';
        tempEl.style.visibility = 'hidden';
        document.body.appendChild(tempEl);
        const caseVideoHeight = tempEl.getBoundingClientRect().height;
        document.body.removeChild(tempEl);

        gsap.to(videoWrap, {
          width: '100%',
          height: caseVideoHeight,
          duration: dur,
          ease: 'power2.inOut',
          onComplete: function () {
            gsap.set(videoWrap, {
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0
            });
          }
        });
      }

      setDialNs('work');

      // Pin current dimensions inline. Keep margin:auto so element stays centered
      // as GSAP tweens width/height (inset:0 + margin:auto = auto-centering).
      // GSAP cannot tween between margin:0 and margin:auto — always keep auto.
      gsap.set(dialFg, {
        width: rect.width,
        height: rect.height,
        borderRadius: 0,
        overflow: 'hidden',
        margin: 'auto',
        opacity: 1
      });

      dialFg.classList.add('is-case-study', 'no-scrollbar');

      gsap.to(dialFg, {
        width: v.caseWidth,
        height: v.caseHeight,
        borderRadius: v.caseBR,
        duration: dur,
        ease: 'power2.inOut',
        onComplete: () => {
          // Do NOT clearProps here — we're still in leave(), barba namespace
          // is the OLD page. :has() selectors would match wrong namespace.
          // clearProps deferred to runAfterEnter where new namespace is live.
          resolve();
        }
      });
    });
  }

  function runDialShrinkAnimation() {
    const gsap = window.gsap;
    const dialFg = document.querySelector('.dial_layer-fg');
    const dialComp = document.querySelector('.dial_component');
    const dialUI = document.querySelector('.dial_layer-ui');
    const dialTicks = document.querySelector('.dial_layer-ticks');
    if (!dialFg || !gsap) return Promise.resolve();


    const v = getDialVars();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dur = reduced ? 0 : 0.8;

    return new Promise((resolve) => {
      gsap.killTweensOf(dialFg);

      if (dialTicks) gsap.set(dialTicks, { opacity: 0 });

      const rect = dialFg.getBoundingClientRect();

      // Pin current work dimensions inline. margin:auto keeps centering.
      gsap.set(dialFg, {
        width: rect.width,
        height: rect.height,
        borderRadius: v.caseBR,
        overflow: 'hidden',
        margin: 'auto',
        opacity: 1
      });

      setDialNs('home');
      dialFg.classList.remove('is-case-study', 'no-scrollbar');

      if (dialTicks) {
        gsap.to(dialTicks, { opacity: 1, duration: dur * 0.6, ease: 'power2.in', delay: dur * 0.2 });
      }

      if (dialUI) {
        gsap.to(dialUI, { opacity: 1, duration: dur * 0.5, ease: 'power2.in', delay: dur * 0.3 });
      }

      gsap.to(dialFg, {
        width: v.homeWidth,
        height: v.homeHeight,
        borderRadius: v.homeBR,
        duration: dur,
        ease: 'power2.inOut',
        onComplete: () => {
          // Do NOT clearProps here — we're still in leave(), barba namespace
          // is the OLD page. :has() selectors would match wrong namespace.
          // clearProps deferred to runAfterEnter where new namespace is live.
          if (dialTicks) gsap.set(dialTicks, { clearProps: 'opacity' });
          resolve();
        }
      });
    });
  }

  function setDialToWorkState() {
    const gsap = window.gsap;
    const dialFg = document.querySelector('.dial_layer-fg');
    const dialComp = document.querySelector('.dial_component');
    const dialUI = document.querySelector('.dial_layer-ui');
    if (!dialFg) return;

    setDialNs('work');
    dialFg.classList.add('is-case-study', 'no-scrollbar');

    if (gsap) {
      gsap.set(dialFg, { clearProps: 'all' });
      if (dialUI) gsap.set(dialUI, { opacity: 0 });
    } else {
      dialFg.style.cssText = '';
      if (dialUI) dialUI.style.opacity = '0';
    }
  }

  function setDialToHomeState() {
    const gsap = window.gsap;
    const dialFg = document.querySelector('.dial_layer-fg');
    const dialUI = document.querySelector('.dial_layer-ui');
    const dialComp = document.querySelector('.dial_component');
    if (!dialFg) return;

    setDialNs('home');
    dialFg.classList.remove('is-case-study', 'no-scrollbar');

    if (gsap) {
      gsap.set(dialFg, { clearProps: 'all' });
      // Assert centering — defensive against stale inline styles on mobile
      gsap.set(dialFg, { position: 'absolute', inset: 0, margin: 'auto' });
      if (dialUI) gsap.set(dialUI, { clearProps: 'opacity' });
    } else {
      dialFg.style.cssText = '';
      if (dialUI) dialUI.style.cssText = '';
    }
  }

  /** Set data-dial-ns attribute on .dial_component (drives CSS layout). */
  function setDialNs(ns) {
    const dialComp = document.querySelector('.dial_component');
    if (dialComp) dialComp.setAttribute('data-dial-ns', ns === 'case' ? 'work' : ns);
  }

  /** Start Lenis on a scroll wrapper element.
   *  @param {Element} [wrapper] — the scrollable element (e.g. Barba container with position:fixed + overflow:auto).
   *  Resets scrollTop and falls back to window Lenis if wrapper is absent. */
  function _startLenisForPage(wrapper) {
    if (wrapper) {
      wrapper.scrollTop = 0;
      if (RHP.lenis && RHP.lenis.start) RHP.lenis.start({ wrapper: wrapper });
    } else {
      if (RHP.lenis && RHP.lenis.start) RHP.lenis.start();
    }
    if (RHP.lenis && RHP.lenis.resize) RHP.lenis.resize();
  }

  function _reinitWebflow() {
    try {
      if (window.Webflow && typeof window.Webflow.destroy === 'function' && typeof window.Webflow.ready === 'function') {
        window.Webflow.destroy();
        window.Webflow.ready();
        var ix2 = window.Webflow.require && window.Webflow.require('ix2');
        if (ix2 && typeof ix2.init === 'function') ix2.init();
      }
      if (typeof window.ScrollTrigger !== 'undefined' && typeof window.ScrollTrigger.refresh === 'function') {
        window.ScrollTrigger.refresh(true);
      }
    } catch (e) {}
  }

  function _fireAfterEnterEvent(ns, container) {
    try {
      var ev = new CustomEvent('rhp:barba:afterenter', {
        detail: { namespace: ns, container: container }
      });
      window.dispatchEvent(ev);
    } catch (e) {}
  }

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
      init(container, options = {}) {
        if (active) return;
        active = true;

        // ❌ No Lenis on home
        RHP.lenis?.stop();

        // 🔒 Lock scroll
        RHP.scroll.unlock(); // defensive reset
        RHP.scroll.lock();

        // Init dial (introMode when fresh load - home intro runs separately)
        RHP.workDial?.init?.(container, { introMode: options.introMode === true });

        // Transition dial (static teal ticks in .transition-dial for page transitions)
        RHP.transitionDial?.init?.(container);
      },

      destroy() {
        if (!active) return;
        active = false;

        RHP.workDial?.destroy?.();
        RHP.transitionDial?.destroy?.();
        RHP.scroll.unlock();
      },

      suspend() {
        if (!active) return;
        active = false;

        RHP.workDial?.suspend?.();
        RHP.transitionDial?.destroy?.();
        RHP.scroll.unlock();
      },

      resume(container, handoff) {
        if (active) return;
        active = true;

        RHP.lenis?.stop();
        RHP.scroll.lock();
        RHP.workDial?.resume?.(handoff);
        RHP.transitionDial?.init?.(container);
      }
    };
  })();

  // Factory for scrollable pages (window scroll)
  // Note: scroll.unlock + lenis.start/resize handled by runAfterEnter (Barba) or bootCurrentView (direct-land)
  const makeScrollPage = () => ({
    init() {},
    destroy() {}
  });

  /* -----------------------------
     About view: scroll + hero logo hover (desktop)
     - .nav_logo-embed (not in nav) hover: sibling .heading-style-h3 animate word-by-word
       (SplitText, mask line, word y 100% → 0 / 0 → 100%), parent .about-hero_ready y -1.5rem / 0
     ----------------------------- */
  RHP.views.about = RHP.views.about || (() => {
    let active = false;
    let splitInstances = [];
    let hoverListeners = [];
    let teamHoverListeners = [];
    let teamTweenTargets = [];

    const isDesktop = () => window.matchMedia && window.matchMedia('(hover: hover)').matches;

    let aboutTeamCtx = null;
    // Mobile scroll-driven state (manual pattern — no ScrollTrigger, works with smoothTouch:false)
    let teamScrollHandler = null;
    let teamScrollWrapper = null;
    let teamRafId = null;
    let teamScrollElements = []; // { el, isImage } for mobile scroll update

    function initAboutTeamHover(container) {
      // Idempotency guard — destroy previous instance if somehow called twice
      if (aboutTeamCtx) destroyAboutTeamHover();

      const gsap = window.gsap;
      if (!gsap) return;

      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const scope = container || document;
      const ryanEl = scope.querySelector('[data-team="ryan"]');
      const guyEl = scope.querySelector('[data-team="guy"]');
      if (!ryanEl || !guyEl) return;

      const members = {
        ryan: {
          el: ryanEl,
          bio: ryanEl.querySelector('.about-team_bio'),
          image: ryanEl.querySelector('.about-team_image'),
          imageCover: ryanEl.querySelector('.image-cover'), // optional — falls back to .about-team_image for scale
          name: ryanEl.querySelector('.about-team_name'),
          nameDir: 1,  // positive = right
        },
        guy: {
          el: guyEl,
          bio: guyEl.querySelector('.about-team_bio'),
          image: guyEl.querySelector('.about-team_image'),
          imageCover: guyEl.querySelector('.image-cover'), // optional — falls back to .about-team_image for scale
          name: guyEl.querySelector('.about-team_name'),
          nameDir: -1, // negative = left
        }
      };

      // Validate required elements (imageCover is optional)
      for (const m of Object.values(members)) {
        if (!m.bio || !m.image || !m.name) return;
      }

      const ryanScale = members.ryan.imageCover || members.ryan.image;
      const guyScale = members.guy.imageCover || members.guy.image;

      teamTweenTargets = [
        members.ryan.bio, members.guy.bio,
        members.ryan.el, members.guy.el,
        members.ryan.name, members.guy.name,
        ryanScale, guyScale,
      ];

      // --- Reduced motion: show bios statically, no animation ---
      if (reducedMotion && !isDesktop()) {
        aboutTeamCtx = gsap.context(() => {
          for (const m of Object.values(members)) {
            gsap.set(m.bio, { opacity: 1, x: 0 });
            gsap.set(m.name, { opacity: 1, x: 0 });
            gsap.set(m.image, { opacity: 1, x: 0, scale: 1 });
          }
        }, container);
        return;
      }

      if (reducedMotion) return; // Desktop reduced motion — skip entirely

      const slideOpts = { duration: 0.5, ease: 'power3.out', force3D: true, overwrite: true };

      const openMember = (key) => {
        const m = members[key];
        const other = members[key === 'ryan' ? 'guy' : 'ryan'];
        // Read name shift from CSS custom property (responsive via breakpoints)
        const nameShift = _getCSSVar('--team-name-shift', '4rem');
        const otherShift = key === 'ryan' ? '16vw' : '-16vw';
        const nameX = m.nameDir > 0 ? nameShift : '-' + nameShift;
        const scaleTarget = m.imageCover || m.image;

        // Bio expand (single tween — two separate gsap.to with overwrite:true cancel each other)
        gsap.to(m.bio, { width: '100%', overflow: 'visible', opacity: 1, duration: 0.5, ease: 'power3.out', overwrite: true });
        // Shift other member away
        gsap.to(other.el, { x: otherShift, ...slideOpts });
        // Image scale (R2)
        gsap.to(scaleTarget, { scale: 1.1, duration: 0.3, ease: 'power3.out', overwrite: true, force3D: true });
        // Name shift (R3)
        gsap.to(m.name, { x: nameX, ...slideOpts });
      };

      const closeMember = (key) => {
        const m = members[key];
        const other = members[key === 'ryan' ? 'guy' : 'ryan'];
        const scaleTarget = m.imageCover || m.image;

        // Bio collapse (single tween — two separate gsap.to with overwrite:true cancel each other)
        gsap.to(m.bio, { width: 0, overflow: 'hidden', opacity: 0, duration: 0.5, ease: 'power3.out', overwrite: true });
        // Reset other member position
        gsap.to(other.el, { x: 0, ...slideOpts });
        // Image scale reset (R2)
        gsap.to(scaleTarget, { scale: 1, duration: 0.3, ease: 'power3.out', overwrite: true, force3D: true });
        // Name shift reset (R3)
        gsap.to(m.name, { x: 0, ...slideOpts });
      };

      aboutTeamCtx = gsap.context(() => {
        if (isDesktop()) {
          // Desktop: initial state + hover listeners
          gsap.set([members.ryan.bio, members.guy.bio], { width: 0, overflow: 'hidden', opacity: 0 });
          gsap.set([ryanEl, guyEl], { x: 0, force3D: true });
          gsap.set([members.ryan.name, members.guy.name], { x: 0, force3D: true });
          gsap.set([ryanScale, guyScale], { scale: 1, force3D: true });
        } else {
          // Mobile: manual scroll-driven reveal (no ScrollTrigger — Lenis smoothTouch:false
          // means the scroller proxy doesn't receive touch updates on real devices).
          // Pattern matches about-text-lines.js: listen on wrapper + Lenis, use getBoundingClientRect.
          teamScrollElements = [];
          for (const m of Object.values(members)) {
            for (const el of [m.image, m.name, m.bio]) {
              gsap.set(el, { opacity: 0, x: '100%', force3D: true, ...(el === m.image ? { scale: 1 } : {}) });
              teamScrollElements.push({ el, isImage: el === m.image });
            }
          }

          // Scroll update: map each element's position to 0–1 progress
          // Start: element top hits viewport bottom. End: element top hits 40% from top.
          const doTeamScrollUpdate = () => {
            const vBottom = window.innerHeight;
            const endY = vBottom * 0.4;
            const startY = vBottom;
            const range = startY - endY;
            if (range === 0) return;

            for (const { el, isImage } of teamScrollElements) {
              const top = el.getBoundingClientRect().top;
              let progress = 0;
              if (top <= endY) {
                progress = 1;
              } else if (top < startY) {
                progress = (startY - top) / range;
              }
              progress = Math.max(0, Math.min(1, progress));

              gsap.set(el, {
                opacity: progress,
                x: ((1 - progress) * 100) + '%',
                ...(isImage ? { scale: 1 + progress * 0.05 } : {}),
              });
            }
          };

          teamScrollHandler = () => {
            if (teamRafId) return;
            teamRafId = requestAnimationFrame(() => {
              teamRafId = null;
              doTeamScrollUpdate();
            });
          };

          // Listen on scroll wrapper (Barba container), window, and Lenis
          teamScrollWrapper = container?.closest('[data-barba="container"]') || container;
          if (teamScrollWrapper && teamScrollWrapper !== window) {
            teamScrollWrapper.addEventListener('scroll', teamScrollHandler, { passive: true });
          }
          window.addEventListener('scroll', teamScrollHandler, { passive: true });
          RHP.lenis?.onScroll?.(teamScrollHandler);

          doTeamScrollUpdate();
        }
      }, container);

      if (isDesktop()) {
        // Desktop hover listeners (outside context — cleaned up via teamHoverListeners)
        const onRyanEnter = () => openMember('ryan');
        const onRyanLeave = () => closeMember('ryan');
        const onGuyEnter = () => openMember('guy');
        const onGuyLeave = () => closeMember('guy');

        members.ryan.image.addEventListener('mouseenter', onRyanEnter);
        ryanEl.addEventListener('mouseleave', onRyanLeave);
        members.guy.image.addEventListener('mouseenter', onGuyEnter);
        guyEl.addEventListener('mouseleave', onGuyLeave);

        teamHoverListeners.push(
          { el: members.ryan.image, type: 'mouseenter', fn: onRyanEnter },
          { el: ryanEl, type: 'mouseleave', fn: onRyanLeave },
          { el: members.guy.image, type: 'mouseenter', fn: onGuyEnter },
          { el: guyEl, type: 'mouseleave', fn: onGuyLeave }
        );
      }
    }

    function destroyAboutTeamHover() {
      const gsap = window.gsap;
      if (gsap && teamTweenTargets.length) {
        gsap.killTweensOf(teamTweenTargets);
        gsap.set(teamTweenTargets, { clearProps: 'transform,width,opacity,overflow,scale' });
      }
      aboutTeamCtx?.revert();
      aboutTeamCtx = null;

      // Mobile scroll cleanup
      if (teamScrollWrapper && teamScrollWrapper !== window) {
        teamScrollWrapper.removeEventListener('scroll', teamScrollHandler);
      }
      window.removeEventListener('scroll', teamScrollHandler);
      RHP.lenis?.offScroll?.(teamScrollHandler);
      if (teamRafId) {
        cancelAnimationFrame(teamRafId);
        teamRafId = null;
      }
      teamScrollHandler = null;
      teamScrollWrapper = null;
      teamScrollElements = [];

      for (const l of teamHoverListeners) {
        if (l.el) l.el.removeEventListener(l.type, l.fn);
      }
      teamHoverListeners = [];
      teamTweenTargets = [];
    }

    let aboutHeroCtx = null;

    function initAboutHeroLogoHover(container) {
      const gsap = window.gsap;
      const SplitText = window.SplitText;
      if (!gsap || !SplitText) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      // .nav_logo-embed not in nav = inside main / about hero only
      let logoEmbeds = container.querySelectorAll('.section_about-hero .about-hero_ready .nav_logo-embed');
      if (!logoEmbeds.length) {
        logoEmbeds = document.querySelectorAll('.section_about-hero .about-hero_ready .nav_logo-embed');
      }
      if (!logoEmbeds.length) return;

      aboutHeroCtx = gsap.context(() => {
        logoEmbeds.forEach((embed) => {
          const heroReady = embed.closest('.about-hero_ready');
          if (!heroReady) return;

          gsap.set(heroReady, { opacity: 0.4 });

          const headings = heroReady.querySelectorAll('.heading-style-h3');
          if (!headings.length) return;

          const headingSplits = [];
          headings.forEach((h) => {
            try {
              const split = new SplitText(h, { type: 'words,lines', linesClass: 'about-hero-line', wordsClass: 'about-hero-word' });
              if (split.words && split.words.length) {
                gsap.set(split.words, { yPercent: -100, opacity: 0 });
              }
              headingSplits.push({ split, headingEl: h });
            } catch (e) {
              console.warn('RHP about-hero SplitText:', e);
            }
          });

          splitInstances.push(...headingSplits);

          const wordDuration = 0.6;
          const wordStagger = 0.225;
          const lineDelay = 0.225;
          const leaveDuration = wordDuration / 2;

          const onEnter = () => {
            gsap.killTweensOf(heroReady);
            headingSplits.forEach(({ split, headingEl }) => {
              gsap.killTweensOf(headingEl);
              if (split.words?.length) gsap.killTweensOf(split.words);
            });
            gsap.set(heroReady, { opacity: 0.4, y: 0 });
            headingSplits.forEach(({ split, headingEl }) => {
              gsap.set(headingEl, { opacity: 0 });
              if (split.words?.length) gsap.set(split.words, { yPercent: -100, opacity: 0 });
            });
            gsap.to(heroReady, { opacity: 1, duration: 0.3, ease: 'linear' });
            gsap.to(heroReady, { y: '-1.5rem', duration: 0.5, ease: 'power3.out' });
            headingSplits.forEach(({ split, headingEl }, idx) => {
              const delay = idx * lineDelay;
              gsap.to(headingEl, { opacity: 1, duration: wordDuration, ease: 'power4.out', delay });
              if (split.words && split.words.length) {
                gsap.to(split.words, { yPercent: 0, opacity: 1, duration: wordDuration, ease: 'power4.out', stagger: wordStagger, delay });
              }
            });
          };

          const onLeave = () => {
            gsap.killTweensOf(heroReady);
            headingSplits.forEach(({ split, headingEl }) => {
              gsap.killTweensOf(headingEl);
              if (split.words && split.words.length) gsap.killTweensOf(split.words);
            });
            gsap.to(heroReady, { opacity: 0.4, duration: 0.3, ease: 'linear' });
            gsap.to(heroReady, { y: 0, duration: 0.5, ease: 'power3.out' });
            headingSplits.forEach(({ split, headingEl }) => {
              gsap.to(headingEl, { opacity: 0, duration: leaveDuration, ease: 'power4.out' });
              if (split.words && split.words.length) {
                gsap.to(split.words, { yPercent: 100, opacity: 0, duration: leaveDuration, ease: 'power4.out' });
              }
            });
          };

          embed.addEventListener('mouseenter', onEnter);
          embed.addEventListener('mouseleave', onLeave);
          hoverListeners.push({ embed, onEnter, onLeave });
        });
      }, container);
    }

    function destroyAboutHeroLogoHover() {
      // Kill in-flight hover tweens (gsap.to calls fire async outside the context)
      const gsap = window.gsap;
      if (gsap) {
        splitInstances.forEach(({ split, headingEl }) => {
          gsap.killTweensOf(headingEl);
          if (split.words?.length) gsap.killTweensOf(split.words);
        });
        hoverListeners.forEach(({ embed }) => {
          const heroReady = embed.closest('.about-hero_ready');
          if (heroReady) gsap.killTweensOf(heroReady);
        });
      }
      aboutHeroCtx?.revert();
      aboutHeroCtx = null;
      hoverListeners.forEach(({ embed, onEnter, onLeave }) => {
        embed.removeEventListener('mouseenter', onEnter);
        embed.removeEventListener('mouseleave', onLeave);
      });
      hoverListeners = [];
      splitInstances = [];
    }

    /* Mobile (≤991px) scroll-driven logo animation
       - Each of the 3 .about-hero_ready elements animates in a bell curve
         within its third of the section: fade 0.4→1, SplitText words slide in,
         then reverse out. Driven by scrub:true ScrollTrigger on .section_about-hero.
       - Desktop keeps the existing hover interaction (gated by isDesktop()). */
    let aboutHeroScrollCtx = null;
    let scrollSplitInstances = []; // separate from hover's splitInstances

    function initAboutHeroLogoScroll(container) {
      const gsap = window.gsap;
      const ScrollTrigger = window.ScrollTrigger;
      const SplitText = window.SplitText;
      if (!gsap || !ScrollTrigger || !SplitText) return;

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        // Show all words fully visible, skip animation
        const heroReadyEls = (container || document).querySelectorAll('.section_about-hero .about-hero_ready');
        heroReadyEls.forEach(el => { el.style.opacity = '1'; });
        return;
      }

      const section = (container || document).querySelector('.section_about-hero');
      if (!section) return;

      const heroReadyEls = section.querySelectorAll('.about-hero_ready');
      if (heroReadyEls.length < 3) return;

      // About page scrolls inside fixed Barba container, not window
      const scroller = container?.closest('[data-barba="container"]') || container || window;

      aboutHeroScrollCtx = gsap.context(() => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            scroller: scroller,
            start: 'top top',
            end: 'bottom bottom',
            scrub: true,
          }
        });

        heroReadyEls.forEach((heroReady, i) => {
          // Initial state: same as desktop hover initial state
          gsap.set(heroReady, { opacity: 0.4, y: 0 });

          // SplitText on headings (reuse hover pattern)
          const headings = heroReady.querySelectorAll('.heading-style-h3');
          const allHeadings = Array.from(headings);
          const allWords = [];

          headings.forEach(h => {
            try {
              gsap.set(h, { opacity: 0 }); // heading hidden until animated in
              const split = new SplitText(h, {
                type: 'words,lines',
                linesClass: 'about-hero-line',
                wordsClass: 'about-hero-word'
              });
              if (split.words?.length) {
                gsap.set(split.words, { yPercent: -100, opacity: 0 });
                allWords.push(...split.words);
              }
              scrollSplitInstances.push({ split, headingEl: h });
            } catch (e) {
              // SplitText failed for this heading — skip gracefully
            }
          });

          // Timeline: 3 thirds fit in 0–0.9, final 0.9–1.0 is all-visible reveal
          const totalAnim = 0.9;
          const third = totalAnim / 3;
          const thirdStart = i * third;
          const inEnd = thirdStart + third * 0.25;   // IN finishes at 25% of third
          const outStart = thirdStart + third * 0.75; // OUT begins at 75% of third
          const thirdEnd = (i + 1) * third;
          const inDuration = inEnd - thirdStart;
          const outDuration = thirdEnd - outStart;

          const names = ['ready', 'hit', 'play'];
          const name = names[i];

          // Stagger: keep all words finishing within inDuration
          const wordStagger = allWords.length > 1
            ? inDuration / (allWords.length * 3)
            : 0;

          // Read y-shift from CSS (responsive via --hero-logo-scroll-y)
          const scrollY = _getCSSVar('--hero-logo-scroll-y', '-1.5rem');

          // IN: thirdStart → inEnd (25% of third)
          tl.addLabel(`${name}-in`, thirdStart);
          tl.to(heroReady, {
            opacity: 1,
            y: scrollY,
            duration: inDuration,
            ease: 'none',
          }, thirdStart);

          if (allHeadings.length) {
            tl.to(allHeadings, {
              opacity: 1,
              duration: inDuration,
              ease: 'none',
            }, thirdStart);
          }

          if (allWords.length) {
            tl.to(allWords, {
              yPercent: 0,
              opacity: 1,
              duration: inDuration,
              ease: 'none',
              stagger: wordStagger,
            }, thirdStart);
          }

          // HOLD: inEnd → outStart (50% of third) — GSAP holds final state automatically

          // OUT: outStart → thirdEnd (25% of third)
          tl.addLabel(`${name}-out`, outStart);
          tl.to(heroReady, {
            opacity: 0.4,
            y: 0,
            duration: outDuration,
            ease: 'none',
          }, outStart);

          if (allHeadings.length) {
            tl.to(allHeadings, {
              opacity: 0,
              duration: outDuration,
              ease: 'none',
            }, outStart);
          }

          if (allWords.length) {
            tl.to(allWords, {
              yPercent: 100,
              opacity: 0,
              duration: outDuration,
              ease: 'none',
              stagger: wordStagger,
            }, outStart);
          }

          // After PLAY's OUT: fade all 3 to full opacity (0.9 → 1.0)
          if (i === 2) {
            const revealStart = 0.9;
            const revealDuration = 0.1;
            tl.addLabel('reveal', revealStart);
            heroReadyEls.forEach(el => {
              tl.to(el, { opacity: 1, duration: revealDuration, ease: 'none' }, revealStart);
            });
          }
        });
      }, container);
    }

    function destroyAboutHeroLogoScroll() {
      if (!aboutHeroScrollCtx) return;
      // ctx.revert() kills all tweens + ScrollTrigger created inside the context
      aboutHeroScrollCtx.revert();
      aboutHeroScrollCtx = null;
      scrollSplitInstances = [];
    }

    return {
      init(container) {
        if (active) return;
        active = true;
        // Note: scroll.unlock + lenis.start/resize handled by runAfterEnter (Barba) or bootCurrentView (direct-land)
        RHP.aboutDialTicks?.init?.(container);
        RHP.aboutTextLines?.init?.(container);
        // Gate matches CSS @media (max-width: 991px) — width-based, not hover-based,
        // so scroll layout + JS path always agree (touch laptops, MCP headless, etc.)
        if (window.innerWidth > 991) {
          initAboutHeroLogoHover(container);
        } else {
          initAboutHeroLogoScroll(container);
        }
        initAboutTeamHover(container); // handles desktop vs mobile internally
      },
      destroy() {
        if (!active) return;
        active = false;
        RHP.lenis?.stop();
        RHP.aboutDialTicks?.destroy?.();
        RHP.aboutTextLines?.destroy?.();
        destroyAboutHeroLogoHover();
        destroyAboutHeroLogoScroll();
        destroyAboutTeamHover();
      }
    };
  })();

  // Case view: dial_layer-fg as scroll wrapper (persists outside Barba container)
  RHP.views.case = RHP.views.case || (() => {
    let active = false;
    let caseTitleSplits = [];
    let caseTitleCtx = null;
    let caseTitleSection = null;

    function initCaseTitleEntrance(container) {
      const gsap = window.gsap;
      const SplitText = window.SplitText;
      if (!gsap || !container) return;

      // Idempotent: tear down previous if init called twice without destroy
      if (caseTitleCtx) {
        caseTitleCtx.revert();
        caseTitleCtx = null;
        caseTitleSplits = [];
      }

      const section = container.querySelector('.section_case-title');
      if (!section) return;
      caseTitleSection = section;

      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const h1s = Array.from(section.querySelectorAll('h1'));
      const h6s = Array.from(section.querySelectorAll('h6'));
      const headings = [...h1s, ...h6s];

      if (reducedMotion) {
        gsap.set(section, { opacity: 1, y: 0 });
        headings.forEach(h => gsap.set(h, { opacity: 1 }));
        return;
      }

      // Set hidden state before context so there is no FOUC
      gsap.set(section, { opacity: 0, y: 40 });

      caseTitleCtx = gsap.context(() => {
        // SplitText on headings (if SplitText available)
        if (SplitText) {
          headings.forEach(h => {
            // Add role="group" for ARIA before splitting (GSAP SplitText adds aria-label)
            if (!h.getAttribute('role')) h.setAttribute('role', 'group');
            try {
              const split = new SplitText(h, { type: 'words', wordsClass: 'case-title-word' });
              if (split.words?.length) {
                gsap.set(split.words, { yPercent: -100, opacity: 0 });
              }
              gsap.set(h, { opacity: 1 }); // heading visible, words hidden
              caseTitleSplits.push({ split, el: h });
            } catch (e) { /* SplitText init failure — graceful skip */ }
          });
        } else {
          // Fallback: no SplitText — stagger headings as whole elements
          headings.forEach(h => gsap.set(h, { opacity: 0, y: 20 }));
        }

        // Container slide-up
        gsap.to(section, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' });

        // Word stagger (overlapping — starts 0.3s after container)
        const wordDuration = 0.6;
        const wordStagger = 0.225;
        const lineDelay = 0.225;
        const overlapDelay = 0.3;

        if (caseTitleSplits.length) {
          caseTitleSplits.forEach(({ split }, idx) => {
            const delay = overlapDelay + (idx * lineDelay);
            if (split.words?.length) {
              gsap.to(split.words, {
                yPercent: 0, opacity: 1,
                duration: wordDuration, ease: 'power4.out',
                stagger: wordStagger, delay
              });
            }
          });
        } else {
          // Fallback stagger
          headings.forEach((h, idx) => {
            gsap.to(h, {
              opacity: 1, y: 0,
              duration: 0.6, ease: 'power4.out',
              delay: overlapDelay + (idx * lineDelay)
            });
          });
        }
      }, section);
    }

    function destroyCaseTitleEntrance() {
      if (caseTitleCtx) {
        caseTitleCtx.revert();
        caseTitleCtx = null;
      }
      caseTitleSplits = [];
      caseTitleSection = null;
    }

    return {
      init(container) {
        if (active) return;
        active = true;

        RHP.scroll.unlock();

        // Format intro text (decode entities, sanitize to BR/STRONG/EM etc. only)
        if (typeof RHP.formatIntroText === 'function') {
          RHP.formatIntroText(container);
        }

        // The scroll wrapper is dial_layer-fg (persists outside Barba container)
        const dialFg = document.querySelector('.dial_layer-fg');
        const content =
          dialFg?.querySelector('[data-case-scroll-content]') ||
          dialFg?.querySelector('.case-studies_wrapper') ||
          null;

        // Reset scroll position (dialFg persists so scrollTop may be stale)
        if (dialFg) dialFg.scrollTop = 0;

        if (dialFg && content) {
          RHP.lenis?.stop();
          RHP.lenis?.start({
            wrapper: dialFg,
            content: content
          });
          RHP.lenis?.setupScrollTriggerProxy?.(dialFg, content);
          requestAnimationFrame(() => {
            RHP.lenis?.resize();
            window.ScrollTrigger?.refresh?.();
          });
        } else {
          RHP.lenis?.start();
          requestAnimationFrame(() => RHP.lenis?.resize());
        }

        RHP.earthParallax?.init?.(container);
        RHP.caseVideoControls?.init?.(container);
        initCaseTitleEntrance(container);
      },

      destroy() {
        if (!active) return;
        active = false;
        destroyCaseTitleEntrance();
        RHP.earthParallax?.destroy?.();
        RHP.caseVideoControls?.destroy?.();
        RHP.lenis?.stop();
      }
    };
  })();
  // Alias: Barba namespace was renamed from 'case' to 'work'
  RHP.views.work = RHP.views.case;

  RHP.views.contact = RHP.views.contact || makeScrollPage();

  /* -----------------------------
     Contact pullout (GSAP open/close)
     - Nav lives in [data-barba="wrapper"] outside the container; scope all
       queries and listeners to the wrapper so we only touch the persistent nav.
     - Open: .nav_contact-link click → .section_contact display block, then
       .contact_overlay opacity 1 (0.2s linear) + pullout translate (same time)
     - Close: .contact_overlay click → .contact_overlay opacity 0 (0.2s linear) +
       pullout translate (same time), .section_contact display none when done
     - Add class .nav_contact-close to your close button in Webflow
     ----------------------------- */
  function initContactPullout() {
    const gsap = window.gsap;
    if (!gsap) {
      console.warn('RHP contact pullout: GSAP not found.');
      return;
    }

    const scope = document.querySelector('[data-barba="wrapper"]') || document.body;
    let isOpen = false;
    let pulloutEl = null;
    const DEBUG = window.location.hostname === 'localhost';

    function findPullout() {
      return scope.querySelector('.nav_contact-pullout') || scope.querySelector('[class*="nav_contact-pullout"]');
    }
    function findSectionContact() {
      return scope.querySelector('.section_contact') || scope.querySelector('[class*="section_contact"]');
    }
    function findContactOverlay() {
      return scope.querySelector('.contact_overlay') || scope.querySelector('[class*="contact_overlay"]');
    }
    function findLink(el) {
      if (!el || !scope.contains(el)) return null;
      return el.closest('.nav_contact-link') || el.closest('[class*="nav_contact-link"]');
    }

    function getPullout() {
      if (pulloutEl && scope.contains(pulloutEl)) return pulloutEl;
      pulloutEl = findPullout();
      return pulloutEl;
    }

    function openPullout() {
      const pullout = getPullout();
      if (!pullout) {
        if (DEBUG) console.warn('RHP contact: pullout not found in wrapper. Add class nav_contact-pullout to your panel in Webflow.');
        return;
      }
      const sectionContact = findSectionContact();
      const contactOverlay = findContactOverlay();

      if (DEBUG) {
        var cs = window.getComputedStyle(pullout);
        console.log('RHP contact: animating pullout', {
          display: cs.display,
          visibility: cs.visibility,
          opacity: cs.opacity,
          zIndex: cs.zIndex,
          position: cs.position
        });
      }
      isOpen = true;

      // 1. Set .section_contact to display block BEFORE all other animations
      if (sectionContact) {
        sectionContact.style.display = 'block';
      }

      pullout.style.pointerEvents = 'auto';
      pullout.style.visibility = 'visible';
      if (window.getComputedStyle(pullout).display === 'none') {
        pullout.style.display = 'block';
      }

      // 2. .contact_overlay opacity 1 (0.2s linear) + pullout translate — fire at same time
      if (contactOverlay) {
        gsap.to(contactOverlay, { opacity: 1, duration: 0.2, ease: 'linear', overwrite: true });
      }
      gsap.to(pullout, {
        xPercent: -100,
        opacity: 1,
        duration: 0.7,
        ease: 'expo.out',
        overwrite: true
      });
      if (DEBUG) console.log('RHP contact: pullout opening');
    }

    function closePullout() {
      const pullout = getPullout();
      if (!pullout) return;
      isOpen = false;
      const sectionContact = findSectionContact();
      const contactOverlay = findContactOverlay();

      // .contact_overlay opacity 0 (0.2s linear) + pullout translate — fire at same time
      if (contactOverlay) {
        gsap.to(contactOverlay, { opacity: 0, duration: 0.2, ease: 'linear', overwrite: true });
      }
      gsap.to(pullout, {
        xPercent: 0,
        opacity: 0,
        duration: 0.7,
        ease: 'expo.out',
        overwrite: true,
        onComplete: () => {
          pullout.style.pointerEvents = 'none';
          // .section_contact display none after all animations complete
          if (sectionContact) {
            sectionContact.style.display = 'none';
          }
        }
      });
    }

    function setInitialState() {
      const pullout = findPullout();
      const sectionContact = findSectionContact();
      const contactOverlay = findContactOverlay();
      const link = scope.querySelector('.nav_contact-link') || scope.querySelector('[class*="nav_contact-link"]');
      if (DEBUG) {
        console.log('RHP contact pullout (scope: wrapper):', { pullout: !!pullout, link: !!link });
      }
      if (sectionContact) {
        sectionContact.style.display = 'none';
      }
      if (contactOverlay) {
        gsap.set(contactOverlay, { opacity: 0 });
      }
      if (pullout) {
        gsap.set(pullout, { xPercent: 0, opacity: 0 });
        pullout.style.pointerEvents = 'none';
        pullout.style.visibility = 'visible';
      }
    }

    scope.addEventListener('click', (e) => {
      if (window._rhpContactDebugClicks) {
        var linkFound = findLink(e.target);
        console.log('RHP contact click:', {
          target: e.target.tagName + (e.target.className ? '.' + String(e.target.className).trim().split(/\s+/).slice(0, 2).join('.') : ''),
          inScope: scope.contains(e.target),
          linkFound: !!linkFound,
          wouldOpen: !!linkFound
        });
      }
      const link = findLink(e.target);
      if (!link) return;
      e.preventDefault();
      e.stopPropagation();
      if (DEBUG) console.log('RHP contact: trigger clicked');
      openPullout();
    }, true);

    // Close trigger: .contact_overlay click (and close button / click outside)
    scope.addEventListener('click', (e) => {
      if (findLink(e.target)) return;
      if (!isOpen) return;
      const pullout = getPullout();
      if (!pullout) return;
      const inPullout = pullout.contains(e.target);
      const isCloseBtn = e.target.closest('.nav_contact-close') || e.target.closest('[class*="nav_contact-close"]');
      const isOverlayClick = e.target.closest('.contact_overlay') || e.target.closest('[class*="contact_overlay"]');
      if (isOverlayClick || !inPullout || isCloseBtn) closePullout();
    }, true);

    [100, 400, 800].forEach(function(ms) {
      setTimeout(setInitialState, ms);
    });

    RHP.openContactPullout = openPullout;
    RHP.contactPulloutCheck = function() {
      var scopeEl = document.querySelector('[data-barba="wrapper"]') || document.body;
      var pullout = scopeEl.querySelector('.nav_contact-pullout') || scopeEl.querySelector('[class*="nav_contact-pullout"]');
      var sectionContact = scopeEl.querySelector('.section_contact') || scopeEl.querySelector('[class*="section_contact"]');
      var contactOverlay = scopeEl.querySelector('.contact_overlay') || scopeEl.querySelector('[class*="contact_overlay"]');
      var link = scopeEl.querySelector('.nav_contact-link') || scopeEl.querySelector('[class*="nav_contact-link"]');
      var gsapOk = typeof window.gsap !== 'undefined';
      var report = {
        gsap: gsapOk ? 'OK (' + (window.gsap && window.gsap.version) + ')' : 'MISSING',
        wrapper: !!document.querySelector('[data-barba="wrapper"]'),
        pullout: !!pullout,
        sectionContact: !!sectionContact,
        contactOverlay: !!contactOverlay,
        link: !!link,
        pulloutElement: pullout || null,
        linkElement: link || null
      };
      if (pullout) {
        var cs = window.getComputedStyle(pullout);
        report.pulloutStyles = {
          display: cs.display,
          visibility: cs.visibility,
          opacity: cs.opacity,
          zIndex: cs.zIndex,
          position: cs.position,
          pointerEvents: cs.pointerEvents
        };
      }
      console.log('RHP contact pullout check:', report);
      var verdict = [];
      if (!gsapOk) verdict.push('GSAP missing');
      if (!report.wrapper) verdict.push('No [data-barba="wrapper"]');
      if (!pullout) verdict.push('Add class nav_contact-pullout to panel (in wrapper)');
      if (!link) verdict.push('Add class nav_contact-link to trigger (in wrapper)');
      if (report.pulloutStyles && report.pulloutStyles.display === 'none') verdict.push('Pullout has display:none – we force block on open');
      if (report.pulloutStyles && parseFloat(report.pulloutStyles.zIndex) < 0) verdict.push('Pullout z-index may be behind other elements');
      if (verdict.length) console.warn('RHP contact verdict:', verdict.join('; '));
      else console.log('RHP contact verdict: Setup OK. Try RHP.openContactPullout() or click the trigger.');
      return report;
    };
    RHP.contactPulloutDebugClicks = function(n) {
      n = n == null ? 5 : n;
      window._rhpContactDebugClicks = true;
      console.log('RHP contact: logging next ' + n + ' clicks in wrapper. Click your contact trigger.');
      var count = 0;
      var off = function() {
        scope.removeEventListener('click', handler, true);
        window._rhpContactDebugClicks = false;
        console.log('RHP contact: click debug off.');
      };
      var handler = function(e) {
        count++;
        if (count > n) { off(); return; }
        var linkFound = findLink(e.target);
        console.log('RHP contact click ' + count + '/' + n + ':', {
          target: e.target.tagName + (e.target.className ? '.' + String(e.target.className).trim().split(/\s+/).slice(0, 3).join('.') : ''),
          inScope: scope.contains(e.target),
          linkFound: !!linkFound,
          wouldOpen: !!linkFound
        });
      };
      scope.addEventListener('click', handler, true);
      setTimeout(function() {
        if (window._rhpContactDebugClicks) { off(); console.log('RHP contact: click debug timed out after 30s.'); }
      }, 30000);
    };
    if (DEBUG) console.log('RHP contact: ready. Console: RHP.contactPulloutCheck() | RHP.openContactPullout() | RHP.contactPulloutDebugClicks(5)');
  }

  /* -----------------------------
     Nav logo → homepage (Webflow renders .nav_logo-link as <div>, not <a>)
     ----------------------------- */
  function initNavLogoLink() {
    var navLogo = document.querySelector('.nav_logo-link');
    if (!navLogo) return;
    navLogo.style.cursor = 'pointer';
    navLogo.setAttribute('role', 'link');
    navLogo.setAttribute('tabindex', '0');
    navLogo.addEventListener('click', function(e) {
      e.preventDefault();
      if (window.barba && typeof window.barba.go === 'function') {
        window.barba.go('/');
      } else {
        window.location.href = '/';
      }
    });
  }

  /* -----------------------------
     Initial boot (no Barba nav yet)
     Only on initial load: if home, run home intro (not when transitioning from case/about)
     ----------------------------- */
  // Measure nav height and set as CSS custom property (matches CSS @media max-width:991px)
  var _navRafId = 0;
  function setNavHeight() {
    if (!window.matchMedia('(max-width: 991px)').matches) return;
    var nav = document.querySelector('.nav_component') || document.querySelector('.nav');
    if (nav && nav.offsetHeight > 0) {
      document.documentElement.style.setProperty('--nav-height', nav.offsetHeight + 'px');
    }
  }
  function setNavHeightDebounced() {
    cancelAnimationFrame(_navRafId);
    _navRafId = requestAnimationFrame(setNavHeight);
  }

  /* Case BG canvas rAF draw — mirrors fg video frame into bg canvas on case pages
     (work-dial draw loop is suspended during case view; orchestrator owns the loop here) */
  let _caseBgRafId = null;
  function startCaseBgDraw() {
    stopCaseBgDraw();
    const bgCanvas = document.querySelector('.dial_bg-canvas');
    const caseFgEl = document.querySelector('#fg-video-wrap > .dial_fg-video');
    if (!bgCanvas || !caseFgEl) return;
    // Size canvas to half-res of parent (work-dial resize() is suspended on case pages)
    const parent = bgCanvas.parentElement;
    if (parent) {
      const pw = parent.offsetWidth;
      const ph = parent.offsetHeight;
      if (pw > 0 && ph > 0) {
        bgCanvas.width = Math.round(pw * 0.5);
        bgCanvas.height = Math.round(ph * 0.5);
      }
    }
    const bgCtx = bgCanvas.getContext('2d');
    function tick() {
      if (caseFgEl.readyState >= 2) {
        try { bgCtx.drawImage(caseFgEl, 0, 0, bgCanvas.width, bgCanvas.height); } catch(e) {}
      }
      _caseBgRafId = requestAnimationFrame(tick);
    }
    _caseBgRafId = requestAnimationFrame(tick);
  }
  function stopCaseBgDraw() {
    if (_caseBgRafId) { cancelAnimationFrame(_caseBgRafId); _caseBgRafId = null; }
  }

  function bootCurrentView() {
    const container = document.querySelector('[data-barba="container"]');
    const ns = container?.getAttribute('data-barba-namespace');
    const dialComp = document.querySelector('.dial_component');
    const dialNs = dialComp?.getAttribute('data-dial-ns') || '';

    if (dialNs === 'work' || ns === 'case' || ns === 'work') {
      // Direct-land on work page: set dial to expanded state, no workDial init
      setDialToWorkState();
      setDialNs('work');
      RHP.scroll.unlock();

      // Populate persistent FG video from data attributes on .case-studies_wrapper
      var caseWrapper = container?.querySelector('.case-studies_wrapper');
      var isMobile = window.matchMedia('(hover: none), (pointer: coarse)').matches;
      var fgSrc = (isMobile && caseWrapper?.getAttribute('fg-video-mobile')) || caseWrapper?.getAttribute('fg-video') || '';
      var fgVideo = document.querySelector('#fg-video-wrap > .dial_fg-video');
      if (fgSrc && fgVideo && !fgVideo.src) {
        fgVideo.src = fgSrc;
        fgVideo.play().catch(function() {});
      }
      // BG canvas: set blur + opacity, start rAF draw loop
      const bgCanvas = document.querySelector('.dial_bg-canvas');
      if (bgCanvas && window.gsap) {
        window.gsap.set(bgCanvas, { filter: 'blur(40px)', opacity: 1 });
      }
      startCaseBgDraw();

      RHP.views.case?.init?.(container);
    } else if (ns === 'about') {
      // Direct-land on about — Barba container (position:fixed, overflow:auto) is the scroll wrapper
      setDialNs('about');
      RHP.scroll.unlock();
      _startLenisForPage(container);
      RHP.lenis?.setupScrollTriggerProxy?.(container, null);
      requestAnimationFrame(function() {
        RHP.lenis?.resize();
        window.ScrollTrigger?.refresh?.();
      });
      // Clear lingering dial visibility from previous session
      const aboutDialWrapper = document.querySelector('.about_dial-wrapper');
      if (aboutDialWrapper && window.gsap) window.gsap.set(aboutDialWrapper, { clearProps: 'visibility' });
      RHP.views.about?.init?.(container);
    } else {
      // Home or unknown: normal dial boot
      setDialToHomeState();
      if (ns === 'contact') setDialNs('contact');

      if (ns !== 'home') {
        // Contact/other: Barba container is the scroll wrapper
        RHP.scroll.unlock();
        _startLenisForPage(container);
      }

      if (ns === 'home') {
        RHP.views.home?.init?.(container, { introMode: true });
        RHP.homeIntro?.run?.(container);
      } else if (ns && RHP.views[ns]?.init) {
        RHP.views[ns].init(container);
      }
    }

    // Video loading spinners (direct-land)
    if (RHP.videoLoader) RHP.videoLoader.init(container);

    // Init transition-dial on every page (symbol is outside Barba container)
    RHP.transitionDial?.init?.();

    // Direct-land setup: pre-position persistent .about-transition elements using Flip containers
    const aboutTransition = document.querySelector('.about-transition');
    if (aboutTransition && window.gsap) {
      const gsap = window.gsap;
      const logo = document.querySelector('#transition-logo');
      const dial = document.querySelector('.transition-dial');

      if (ns === 'about') {
        // Direct land /about: reparent logo + dial to about-state containers, hide overlay
        gsap.set(aboutTransition, { display: 'none' });
        const logoEnd = document.querySelector('.about-transition_logo-middle');
        const dialEnd = document.querySelector('.about_dial-wrapper');
        if (logo && logoEnd && !logoEnd.contains(logo)) {
          logoEnd.appendChild(logo);
          gsap.set(logo, { clearProps: 'all' });
          gsap.set(logo, { opacity: 0.4 });
        }
        if (dial && dialEnd && !dialEnd.contains(dial)) {
          dialEnd.appendChild(dial);
          gsap.set(dial, { clearProps: 'all' });
          RHP.transitionDial?.resize?.();
        }
      } else {
        // Home / case / contact: logo in _logo-start, dial in _logo-middle (default positions)
        gsap.set(aboutTransition, { display: 'none' });
        const logoStart = document.querySelector('.about-transition_logo-start');
        const logoMiddle = document.querySelector('.about-transition_logo-middle');
        if (logo && logoStart && !logoStart.contains(logo)) {
          logoStart.appendChild(logo);
          gsap.set(logo, { clearProps: 'all' });
        }
        if (dial && logoMiddle && !logoMiddle.contains(dial)) {
          logoMiddle.appendChild(dial);
          gsap.set(dial, { clearProps: 'all' });
        }
      }
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
    let _overlayPollCancelled = false; // Cancel token for about→home overlay rAF poll

    function runAfterEnter(data) {
      // Stop case BG canvas draw from previous page
      stopCaseBgDraw();
      currentNs = data.next ? (data.next.namespace || '') : '';
      const ns = currentNs;
      setDialNs(ns);

      var wrapper = document.querySelector('[data-barba="wrapper"]') || document.body;
      if (ns === 'home') {
        wrapper.classList.add('rhp-home-ready', 'rhp-cursor-ready');
      }
      if (ns === 'about') {
        wrapper.classList.add('rhp-nav-hidden');
      } else {
        wrapper.classList.remove('rhp-nav-hidden');
      }

      // Clear lingering visibility:hidden set by runAboutToHomeTransition
      if (ns === 'about') {
        const aboutDialWrapper = document.querySelector('.about_dial-wrapper');
        if (aboutDialWrapper && window.gsap) window.gsap.set(aboutDialWrapper, { clearProps: 'visibility' });
      }

      // Nav logo cleanup for about/home transitions
      if (ns === 'about' && window.gsap) {
        const navLogoWrapper = wrapper ? wrapper.querySelector('.nav_logo-wrapper-2') : null;
        if (navLogoWrapper) {
          window.gsap.set(navLogoWrapper, { clearProps: 'position,left,top,zIndex,xPercent,yPercent' });
          const navEmbeds = navLogoWrapper.querySelectorAll('.nav_logo-embed');
          if (navEmbeds.length) window.gsap.set(navEmbeds, { clearProps: 'height' });
          navLogoWrapper.style.visibility = 'hidden';
        }
      }
      if (ns === 'home') {
        var navLogoWrapper = wrapper ? wrapper.querySelector('.nav_logo-wrapper-2') : null;
        if (navLogoWrapper) {
          navLogoWrapper.style.visibility = '';
          if (window.gsap) {
            window.gsap.set(navLogoWrapper, { clearProps: 'position,left,top,xPercent,yPercent,zIndex' });
            var navEmbeds = navLogoWrapper.querySelectorAll('.nav_logo-embed');
            if (navEmbeds.length) window.gsap.set(navEmbeds, { clearProps: 'height' });
          }
        }
      }

      // Deferred clearProps: morph animations in leave() keep inline styles because
      // [data-dial-ns] was set to the transition value during leave().
      // Now that Barba has swapped, setDialNs(ns) above set the correct value.
      // Safe to clearProps and let CSS own the layout.
      var dialFg = document.querySelector('.dial_layer-fg');
      if (dialFg && window.gsap) {
        window.gsap.set(dialFg, { clearProps: 'all' });
      }
      var videoWrap = document.getElementById('fg-video-wrap');
      if (videoWrap && window.gsap) {
        window.gsap.set(videoWrap, { clearProps: 'all' });
      }

      if (ns === 'case' || ns === 'work') {
        setNavHeight();
        if (dialFg && window.gsap) {
          window.gsap.set(dialFg, { opacity: 1 });
        }
        // BG canvas: set blur + opacity, start rAF draw loop (mirrors case fg video)
        const bgCanvas = document.querySelector('.dial_bg-canvas');
        if (bgCanvas && window.gsap) window.gsap.set(bgCanvas, { filter: 'blur(40px)', opacity: 1 });
        startCaseBgDraw();
      } else if (ns === 'home') {
        // Defensive: ensure dial is at home state after clearProps
        setDialToHomeState();
        // Mobile: prevent stale suspended video flash for one rAF frame.
        // Desktop is protected by CSS opacity:0 on .dial_layer-fg in home state
        // (media: hover:hover). On mobile that CSS rule doesn't apply, so the
        // suspended fg video would be visible until resume()'s setDialState(ACTIVE)
        // runs. Hide dialFg now so that fade-in is a proper 0→1 transition.
        if (dialFg && window.gsap && RHP.workDial?.isSuspended?.()) {
          window.gsap.set(dialFg, { opacity: 0 });
        }
      }

      // Scroll mode
      if (ns === 'home') {
        var prevNs = data.current ? data.current.namespace : null;
        if (prevNs && prevNs !== 'home' && data.next && data.next.container) {
          RHP.homeIntro?.skip?.(data.next.container);
        }
        RHP.lenis && RHP.lenis.stop();
        RHP.scroll.lock();
      } else {
        RHP.scroll.unlock();
        if (ns !== 'case' && ns !== 'work') {
          // About/contact: Barba container (position:fixed, overflow:auto) is the scroll wrapper
          _startLenisForPage(data.next && data.next.container ? data.next.container : null);
          if (ns === 'about') {
            RHP.lenis?.setupScrollTriggerProxy?.(data.next.container, null);
            requestAnimationFrame(function() {
              RHP.lenis?.resize();
              window.ScrollTrigger?.refresh?.();
            });
          }
        }
      }

      // Init view
      if (ns && RHP.views[ns] && RHP.views[ns].init && data.next && data.next.container) {
        var hadCaseHandoff = ns === 'home' && !!(RHP.videoState?.caseHandoff);
        if (ns === 'home') {
          // Defer home init by one frame so the browser settles CSS layout
          // after clearProps + :has() selector changes. work-dial.resize()
          // reads getBoundingClientRect which needs correct computed styles.
          requestAnimationFrame(function() {
            // Resume suspended work-dial (case→home) instead of full re-init.
            // Gate on isSuspended() — not hadCaseHandoff — because after a
            // full destroy/init cycle (rapid multi-cycle nav) suspended is false
            // and resume() would silently no-op.
            if (hadCaseHandoff && RHP.workDial?.isSuspended?.()) {
              var handoff = RHP.videoState.caseHandoff;
              RHP.videoState.caseHandoff = null;
              RHP.views.home.resume(data.next.container, handoff);
            } else {
              RHP.videoState.caseHandoff = null;
              RHP.views.home.init(data.next.container);
              if (hadCaseHandoff) {
                setTimeout(function() { RHP.workDial?.setInteractionUnlocked?.(true); }, 300);
              }
            }
          });
        } else {
          RHP.views[ns].init(data.next.container);
        }
      }

      // Case study: apply video handoff from home
      if ((ns === 'case' || ns === 'work') && RHP.videoState && RHP.videoState.caseHandoff && data.next && data.next.container) {
        var handoff = RHP.videoState.caseHandoff;
        var seekTime = (handoff.currentTime || 0) + (handoff.transitionDuration || 0.6);
        if (typeof handoff.index === 'number') RHP.videoState.lastCaseIndex = handoff.index;
        var caseContainer = data.next.container;
        var caseVideoEl = caseContainer.querySelector('.section_case-video video') || caseContainer.querySelector('.dial_fg-video') || caseContainer.querySelector('.dial_video-wrap video');
        if (caseVideoEl) {
          caseVideoEl.currentTime = seekTime;
          caseVideoEl.play().catch(function() {});
        }
        RHP.videoState.caseHandoff = null;
      }

      // Case study: autoplay videos — wire no-controls sections for autoplay fallback
      if ((ns === 'case' || ns === 'work') && data.next && data.next.container) {
        var caseContainer = data.next.container;
        var handoffVideoEl = caseVideoEl; // reference from handoff block above (may be undefined if no handoff)

        // Sections WITH controls are handled by caseVideoControls.init() (already called above)
        // Sections WITHOUT controls get wireNoControlsSection for autoplay fallback UI
        var allVideoSections = caseContainer.querySelectorAll('.section_case-video, .section_case-video-laptop');
        allVideoSections.forEach(function(sec) {
          // Skip sections that have control wrappers (handled by wireSection)
          if (sec.querySelector('.case-video_control-wrapper')) return;
          // Skip if the only video is the handoff video (already seeked + playing)
          var vid = sec.querySelector('video.video-cover') || sec.querySelector('video');
          if (vid === handoffVideoEl) return;
          if (RHP.caseVideoControls && RHP.caseVideoControls.wireNoControlsSection) {
            RHP.caseVideoControls.wireNoControlsSection(sec);
          }
        });

        // Columns sections: simple autoplay (no overlay needed — small inline videos)
        var columnVideos = caseContainer.querySelectorAll('.section_case-columns video');
        columnVideos.forEach(function(v) {
          if (v === handoffVideoEl) return;
          v.play().catch(function() {});
        });
      }

      // Page-specific: Overland AI
      if ((ns === 'case' || ns === 'work') && /\/work\/overland-ai(\/|$)/.test(window.location.pathname)) {
        var baseUrl = RHP.getScriptBaseUrl && RHP.getScriptBaseUrl();
        var v = RHP.configVersion || '0';
        if (baseUrl) {
          var cssHref = baseUrl + '/overland-ai.css?v=' + v;
          if (!document.querySelector('link[href*="overland-ai.css"]')) {
            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = cssHref;
            document.head.appendChild(link);
          }
          if (!RHP.overlandAI && RHP.loadScript) {
            RHP.loadScript(baseUrl + '/overland-ai.js?v=' + v).then(function() {
              if (RHP.overlandAI && RHP.overlandAI.init) {
                RHP.overlandAI.init(data.next && data.next.container ? data.next.container : document);
              }
            });
          }
        }
      }

      // Re-init Webflow IX2 + ScrollTrigger
      _reinitWebflow();

      // Re-assert UI hidden after _reinitWebflow() (IX2 may reset it)
      if (ns === 'case' || ns === 'work') {
        var dialUI = document.querySelector('.dial_layer-ui');
        if (dialUI && window.gsap) window.gsap.set(dialUI, { opacity: 0 });
      }

      // Re-init transition-dial
      RHP.transitionDial?.init?.();

      // Hide about overlay — on about->home, hold until work-dial is ready, then fade
      var aboutTransitionEl = document.querySelector('.about-transition');
      if (aboutTransitionEl && window.gsap) {
        var aboutOverlayVisible = window.getComputedStyle(aboutTransitionEl).display !== 'none' &&
          parseFloat(window.getComputedStyle(aboutTransitionEl).opacity) > 0;

        if (ns === 'home' && aboutOverlayVisible) {
          // Overlay hold: wait for work-dial to be ready before fading
          _overlayPollCancelled = false;
          var _overlayFadeStarted = false;
          var _fadeOverlay = function() {
            if (_overlayFadeStarted || _overlayPollCancelled) return;
            _overlayFadeStarted = true;
            window.gsap.to(aboutTransitionEl, {
              opacity: 0,
              duration: 0.4,
              ease: 'linear',
              onComplete: function() {
                window.gsap.set(aboutTransitionEl, { display: 'none' });
              }
            });
          };
          // Poll for work-dial _ready via rAF, with 3s safety timeout
          var _safetyTimeout = setTimeout(_fadeOverlay, 3000);
          var _pollReady = function() {
            if (_overlayFadeStarted || _overlayPollCancelled) { clearTimeout(_safetyTimeout); return; }
            if (RHP.workDial?._ready) {
              clearTimeout(_safetyTimeout);
              _fadeOverlay();
            } else {
              requestAnimationFrame(_pollReady);
            }
          };
          requestAnimationFrame(_pollReady);
        } else {
          window.gsap.set(aboutTransitionEl, { display: 'none' });
        }
      }

      // Video loading spinners (destroy already called in beforeLeave)
      if (RHP.videoLoader) {
        RHP.videoLoader.init(data.next ? data.next.container : null);
      }

      // Clean up any preloaded video elements (cache is already warm)
      _cleanupPreload();

      _fireAfterEnterEvent(ns, data.next ? data.next.container : null);
    }

    /**
     * Home -> About (or Case -> About) transition using GSAP Flip.
     * Reparents #transition-logo from _logo-start to _logo-middle,
     * and .transition-dial from _logo-middle to .about_dial-wrapper.
     * Creates disposable Flip tweens each time — no persistent timeline.
     */
    function runHomeToAboutTransition(data) {
      _overlayPollCancelled = true; // Cancel any in-flight about→home overlay poll
      const gsap = window.gsap;
      const Flip = window.Flip;
      if (!gsap) return Promise.resolve();

      const overlay = document.querySelector('.about-transition');
      const logo = document.querySelector('#transition-logo');
      const dial = document.querySelector('.transition-dial');
      const logoEnd = document.querySelector('.about-transition_logo-middle');
      const dialEnd = document.querySelector('.about_dial-wrapper');

      if (!overlay || !Flip) {
        // Fallback: no Flip plugin or overlay — instant transition
        if (overlay) gsap.set(overlay, { display: 'none' });
        return Promise.resolve();
      }

      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Init transition-dial so canvas is drawn before capture
      RHP.transitionDial?.init?.();

      if (reducedMotion) {
        // Instant reparent, no animation
        gsap.set(overlay, { display: 'flex', opacity: 1 });
        if (logo && logoEnd) { logoEnd.appendChild(logo); gsap.set(logo, { clearProps: 'all' }); gsap.set(logo, { opacity: 0.4 }); }
        if (dial && dialEnd) { dialEnd.appendChild(dial); gsap.set(dial, { clearProps: 'all' }); }
        RHP.transitionDial?.resize?.();
        return Promise.resolve();
      }

      // Show overlay hidden at opacity 0
      gsap.set(overlay, { display: 'flex', opacity: 0 });

      // Capture current states
      const logoState = logo ? Flip.getState(logo) : null;
      const dialState = dial ? Flip.getState(dial) : null;

      // Reparent to about-state containers
      if (logo && logoEnd) logoEnd.appendChild(logo);
      if (dial && dialEnd) dialEnd.appendChild(dial);

      // Clear any stale inline styles from previous transitions so Flip reads CSS layout
      if (logo) gsap.set(logo, { clearProps: 'all' });
      if (dial) gsap.set(dial, { clearProps: 'all' });

      const promises = [];

      // Overlay fade in
      const overlayTween = gsap.to(overlay, { opacity: 1, duration: 0.3, ease: 'linear' });
      promises.push(_tweenPromise(overlayTween));

      // Logo Flip
      if (logoState && logo) {
        const logoFlip = Flip.from(logoState, {
          targets: logo,
          duration: 0.75,
          ease: 'power3.out',
          absolute: true
        });
        promises.push(_tweenPromise(logoFlip));
        // Logo opacity animated separately (opacity is not a layout prop)
        const logoOpacity = gsap.to(logo, { opacity: 0.4, duration: 0.75, ease: 'power3.out' });
        promises.push(_tweenPromise(logoOpacity));
      }

      // Dial Flip
      if (dialState && dial) {
        const dialFlip = Flip.from(dialState, {
          targets: dial,
          duration: 0.75,
          ease: 'power3.out',
          absolute: true
        });
        promises.push(_tweenPromise(dialFlip));
      }

      return Promise.all(promises).then(() => {
        // Resize transition-dial canvas to new container size
        RHP.transitionDial?.resize?.();
        // Clear Flip inline styles — let CSS own final layout
        if (logo) { gsap.set(logo, { clearProps: 'all' }); gsap.set(logo, { opacity: 0.4 }); }
        if (dial) gsap.set(dial, { clearProps: 'all' });
      });
    }

    /**
     * About -> Home transition using GSAP Flip.
     * Reparents #transition-logo from _logo-middle to _logo-start,
     * and .transition-dial from .about_dial-wrapper to _logo-middle.
     * Plays a NEW forward animation (not reverse) with forward easing.
     * Overlay stays visible until work-dial is ready (handled in runAfterEnter).
     */
    function runAboutToHomeTransition(data) {
      _overlayPollCancelled = true; // Cancel any in-flight overlay poll from a prior cycle
      const overlay = document.querySelector('.about-transition');
      const gsap = window.gsap;
      const Flip = window.Flip;
      if (!overlay || !gsap) return Promise.resolve();

      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const logo = document.querySelector('#transition-logo');
      const dial = document.querySelector('.transition-dial');
      const logoHome = document.querySelector('.about-transition_logo-start');
      const dialHome = document.querySelector('.about-transition_logo-middle');
      const aboutDialWrapper = document.querySelector('.about_dial-wrapper');

      // Ensure overlay is visible at full opacity (we're leaving about page)
      gsap.set(overlay, { display: 'flex', opacity: 1 });

      // Hide about-page dial so only the transition dial shows
      if (aboutDialWrapper) gsap.set(aboutDialWrapper, { visibility: 'hidden' });

      // Ensure transition-dial is initialised
      RHP.transitionDial?.init?.();

      if (!Flip || reducedMotion) {
        // Instant reparent, no animation — overlay stays visible for runAfterEnter to fade
        if (logo && logoHome) { logoHome.appendChild(logo); gsap.set(logo, { clearProps: 'all' }); }
        if (dial && dialHome) { dialHome.appendChild(dial); gsap.set(dial, { clearProps: 'all' }); }
        RHP.transitionDial?.resize?.();
        return Promise.resolve();
      }

      // Capture current states at about positions
      const logoState = logo ? Flip.getState(logo) : null;
      const dialState = dial ? Flip.getState(dial) : null;

      // Reparent to home-state containers
      if (logo && logoHome) logoHome.appendChild(logo);
      if (dial && dialHome) dialHome.appendChild(dial);

      // Clear stale inline styles so Flip reads CSS layout
      if (logo) gsap.set(logo, { clearProps: 'all' });
      if (dial) gsap.set(dial, { clearProps: 'all' });

      const promises = [];

      // Logo Flip (forward easing, NOT reversed)
      if (logoState && logo) {
        const logoFlip = Flip.from(logoState, {
          targets: logo,
          duration: 0.75,
          ease: 'power3.out',
          absolute: true
        });
        promises.push(_tweenPromise(logoFlip));
        // Logo opacity back to 1
        const logoOpacity = gsap.to(logo, { opacity: 1, duration: 0.75, ease: 'power3.out' });
        promises.push(_tweenPromise(logoOpacity));
      }

      // Dial Flip
      if (dialState && dial) {
        const dialFlip = Flip.from(dialState, {
          targets: dial,
          duration: 0.75,
          ease: 'power3.out',
          absolute: true
        });
        promises.push(_tweenPromise(dialFlip));
      }

      // Do NOT fade overlay here — it stays visible until work-dial is ready (runAfterEnter handles)
      return Promise.all(promises).then(() => {
        // Resize transition-dial canvas after Flip completes
        RHP.transitionDial?.resize?.();
        // Clear Flip inline styles — let CSS own layout
        if (logo) gsap.set(logo, { clearProps: 'all' });
        if (dial) gsap.set(dial, { clearProps: 'all' });
      });
    }

    barba.init({
      preventRunning: true,
      transitions: [
        /* ---- Home -> Work ---- */
        {
          name: 'home-to-work',
          from: { namespace: ['home'] },
          to: { namespace: ['case', 'work'] },

          beforeLeave(data) {
            const ns = data.current?.namespace || currentNs;
            // Capture dial video position for handoff to case study page
            if (ns === 'home' && RHP.videoState && RHP.workDial) {
              const fgVideo = document.querySelector('.dial_fg-video');
              const idx = RHP.workDial.getActiveIndex();
              if (fgVideo && typeof idx === 'number') {
                RHP.videoState.caseHandoff = {
                  index: idx,
                  currentTime: fgVideo.currentTime || 0,
                  transitionDuration: 0.6
                };
              }
            }
            // Suspend work-dial (keep videos alive for morph animation)
            if (ns === 'home' && RHP.views.home?.suspend) {
              RHP.views.home.suspend();
            } else if (ns && RHP.views[ns]?.destroy) {
              RHP.views[ns].destroy();
            }
            RHP.videoLoader?.destroy?.();
          },

          async leave() {
            await runDialExpandAnimation();
          },

          enter() {
            window.scrollTo(0, 0);
          },

          afterEnter(data) {
            runAfterEnter(data);
          }
        },

        /* ---- Work -> Home ---- */
        {
          name: 'work-to-home',
          from: { namespace: ['case', 'work'] },
          to: { namespace: ['home'] },

          beforeLeave(data) {
            // Stop Lenis before scrollTop reset so rAF doesn't override it
            RHP.lenis?.stop();
            // Scroll case content to top so video is visible for shrink animation
            const dialFg = document.querySelector('.dial_layer-fg');
            if (dialFg) dialFg.scrollTop = 0;

            const ns = data.current?.namespace || currentNs;
            // Capture case study video position for handoff back to home dial
            if ((ns === 'case' || ns === 'work') && RHP.videoState) {
              const container = data.current?.container || document;
              const caseVideo = container.querySelector('.section_case-video video') || container.querySelector('.dial_fg-video') || container.querySelector('.dial_video-wrap video');
              const idx = RHP.videoState.lastCaseIndex;
              if (caseVideo && typeof idx === 'number') {
                RHP.videoState.caseHandoff = {
                  index: idx,
                  currentTime: caseVideo.currentTime || 0
                };
              }
            }
            if (ns && RHP.views[ns]?.destroy) RHP.views[ns].destroy();
            RHP.videoLoader?.destroy?.();

            // Preload fg videos while dial shrink animates (~1s head start)
            const handoffIdx = RHP.videoState?.lastCaseIndex;
            if (typeof handoffIdx === 'number') _preloadFgVideos(handoffIdx);
          },

          async leave() {
            await runDialShrinkAnimation();
          },

          enter() {
            window.scrollTo(0, 0);
          },

          afterEnter(data) {
            runAfterEnter(data);
          }
        },

        /* ---- Home -> About ---- */
        {
          name: 'home-to-about',
          from: { namespace: ['home'] },
          to: { namespace: ['about'] },
          beforeLeave(data) {
            const ns = data.current?.namespace || currentNs;
            if (ns && RHP.views[ns]?.destroy) RHP.views[ns].destroy();
            RHP.videoLoader?.destroy?.();
          },
          leave(data) {
            return runHomeToAboutTransition(data);
          },
          enter() {
            window.scrollTo(0, 0);
          },
          afterEnter(data) {
            runAfterEnter(data);
          }
        },

        /* ---- About -> Home ---- */
        {
          name: 'about-to-home',
          from: { namespace: ['about'] },
          to: { namespace: ['home'] },
          beforeLeave(data) {
            const ns = data.current?.namespace || currentNs;
            if (ns && RHP.views[ns]?.destroy) RHP.views[ns].destroy();
            RHP.videoLoader?.destroy?.();
          },
          leave(data) {
            return runAboutToHomeTransition(data);
          },
          enter() {
            window.scrollTo(0, 0);
          },
          afterEnter(data) {
            runAfterEnter(data);
          }
        },

        /* ---- Work -> About ---- */
        {
          name: 'work-to-about',
          from: { namespace: ['case', 'work'] },
          to: { namespace: ['about'] },
          beforeLeave(data) {
            // Stop Lenis before scrollTop reset so rAF doesn't override it
            RHP.lenis?.stop();
            // Scroll case content to top before leaving (dialFg persists across transitions)
            const dialFg = document.querySelector('.dial_layer-fg');
            if (dialFg) dialFg.scrollTop = 0;

            const ns = data.current?.namespace || currentNs;
            if (ns && RHP.views[ns]?.destroy) RHP.views[ns].destroy();
            // If work-dial was suspended (home→case→about path), fully destroy it now
            RHP.workDial?.destroy?.();
            RHP.videoLoader?.destroy?.();
            // Reset dial-ns so about CSS rules (dial_layer-fg overflow/placement) apply
            setDialNs('home');
          },
          leave(data) {
            return runHomeToAboutTransition(data);
          },
          enter() {
            window.scrollTo(0, 0);
          },
          afterEnter(data) {
            runAfterEnter(data);
          }
        },

        /* ---- About -> Work ---- */
        {
          name: 'about-to-work',
          from: { namespace: ['about'] },
          to: { namespace: ['case', 'work'] },

          beforeLeave(data) {
            const ns = data.current?.namespace || currentNs;
            if (ns && RHP.views[ns]?.destroy) RHP.views[ns].destroy();
            RHP.videoLoader?.destroy?.();
          },

          async leave() {
            const dialComp = document.querySelector('.dial_component');
            if (dialComp?.getAttribute('data-dial-ns') !== 'work') {
              await runDialExpandAnimation();
            } else {
              setDialToWorkState();
            }
          },

          enter() {
            window.scrollTo(0, 0);
          },

          afterEnter(data) {
            runAfterEnter(data);
          }
        },

        /* ---- Default transition (fallback) ---- */
        {
          name: 'rhp-core',

          beforeLeave(data) {
            // Stop Lenis before scrollTop reset so rAF doesn't override it
            RHP.lenis?.stop();
            // Scroll case content to top before leaving (dialFg persists across transitions)
            const dialFg = document.querySelector('.dial_layer-fg');
            if (dialFg) dialFg.scrollTop = 0;

            const ns = data.current?.namespace || currentNs;
            if (ns && RHP.views[ns]?.destroy) {
              RHP.views[ns].destroy();
            }
            // Safety: if work-dial was suspended, fully destroy it
            RHP.workDial?.destroy?.();
            // Tear down video spinners before transition animation (prevent stale Lottie callbacks)
            RHP.videoLoader?.destroy?.();
          },

          leave() {},

          enter() {
            window.scrollTo(0, 0);
          },

          afterEnter(data) {
            runAfterEnter(data);
          }
        }
      ]
    });
  }

  window.addEventListener('resize', setNavHeightDebounced, { passive: true });

  ready(() => {
    initBarba();
    initContactPullout();
    initNavLogoLink();
  });
})();
