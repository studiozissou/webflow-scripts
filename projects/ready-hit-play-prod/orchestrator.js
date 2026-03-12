/* =========================================
   RHP — Orchestrator (Barba conductor)
   + Scroll lock only on home
   + Lenis on all non-home pages
   ========================================= */
(() => {
  const ORCHESTRATOR_VERSION = '2026.3.12.1'; // bump when you deploy; check in console: RHP load check
  window.RHP = window.RHP || {};
  const RHP = window.RHP;
  RHP.orchestratorVersion = ORCHESTRATOR_VERSION;

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

  const _getScrollbarOffset = () => {
    var scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth <= 0) {
      var prevOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'scroll';
      scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.documentElement.style.overflow = prevOverflow;
    }
    return Math.round(scrollbarWidth / 2);
  };

  const _findTransitionLogo = () =>
    document.querySelector('#transition-logo') ||
    document.querySelector('.about-transition_nav-logo-wrapper') ||
    document.querySelector('.about-transition .nav_logo-wrapper-2.is-about-transition');

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
      caseAR: _getCSSVar('--dial-case-aspect-ratio', 'auto')
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

      // Pin dial_video-wrap dimensions before ns change
      const videoWrap = dialFg.querySelector('.dial_video-wrap');
      const vRect = videoWrap?.getBoundingClientRect();
      if (videoWrap && vRect) {
        gsap.set(videoWrap, { width: vRect.width, height: vRect.height, borderRadius: 999 });
      }

      if (dialComp) dialComp.setAttribute('data-dial-ns', 'work');

      // Pin current dimensions inline. Keep margin:auto so element stays centered
      // as GSAP tweens width/height (inset:0 + margin:auto = auto-centering).
      // GSAP cannot tween between margin:0 and margin:auto — always keep auto.
      gsap.set(dialFg, {
        width: rect.width,
        height: rect.height,
        borderRadius: 0,
        overflow: 'hidden',
        margin: 'auto'
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
          if (videoWrap) gsap.set(videoWrap, { clearProps: 'all' });
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
        margin: 'auto'
      });

      if (dialComp) dialComp.setAttribute('data-dial-ns', 'home');
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

    if (dialComp) dialComp.setAttribute('data-dial-ns', 'work');
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

    if (dialComp) dialComp.setAttribute('data-dial-ns', 'home');
    dialFg.classList.remove('is-case-study', 'no-scrollbar');

    if (gsap) {
      gsap.set(dialFg, { clearProps: 'all' });
      if (dialUI) gsap.set(dialUI, { clearProps: 'opacity' });
    } else {
      dialFg.style.cssText = '';
      if (dialUI) dialUI.style.cssText = '';
    }
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

  /* Persistent about-transition timeline (overlay + logo only; dial differs by direction) */
  let aboutTransitionTL = null;

  /* Invalidate cached timeline on resize so positions recalculate.
     Intentional: IIFE-scope, single page lifetime — no teardown needed. */
  window.addEventListener('resize', () => { aboutTransitionTL = null; }, { passive: true });

  function getAboutTransitionTimeline() {
    if (aboutTransitionTL) return aboutTransitionTL;
    const el = document.querySelector('.about-transition');
    if (!el || !window.gsap) return null;

    const gsap = window.gsap;
    const transitionLogo = _findTransitionLogo();

    const scrollbarOffsetPx = _getScrollbarOffset();
    const logoSmallWidth = _getCSSVar('--logo-small-width', '16rem');
    const logoSmallHeight = _getCSSVar('--logo-small-height', '2rem');
    const logoLargeWidth = _getCSSVar('--logo-large-width', '90vw');
    const logoLargeHeight = _getCSSVar('--logo-large-height', 'auto');
    const logoLargeMaxWidth = _getCSSVar('--logo-large-max-width', '93rem');
    const largeWidthPx = _parseSize(logoLargeWidth);
    const maxWidthPx = _parseSize(logoLargeMaxWidth);
    const finalWidthPx = Math.min(largeWidthPx, maxWidthPx);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dur = reducedMotion ? 0 : 1;

    aboutTransitionTL = gsap.timeline({ paused: true });

    // Overlay fade (display managed explicitly in runHomeToAbout/runAboutToHome, not here)
    aboutTransitionTL.fromTo(el,
      { opacity: 0 },
      { opacity: 1, duration: 0.3 * dur, ease: 'linear' },
      0
    );

    // Logo morph: small (nav position) -> large (centre)
    if (transitionLogo) {
      aboutTransitionTL.fromTo(transitionLogo,
        {
          position: 'fixed',
          left: '50%',
          top: '2vh',
          xPercent: -50,
          x: -scrollbarOffsetPx,
          yPercent: 0,
          width: logoSmallWidth,
          height: logoSmallHeight,
          maxWidth: 'none',
          transformOrigin: '50% 50%',
          opacity: 1,
          zIndex: 9998
        },
        {
          left: '50%',
          top: '50%',
          xPercent: -50,
          x: -scrollbarOffsetPx,
          yPercent: -50,
          width: finalWidthPx,
          height: logoLargeHeight,
          maxWidth: logoLargeMaxWidth,
          opacity: 0.4,
          duration: 0.75 * dur,
          ease: 'linear',
          overwrite: true
        },
        0
      );
    }

    return aboutTransitionTL;
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

    const isDesktop = () => window.matchMedia && window.matchMedia('(hover: hover)').matches;

    function initAboutTeamHover(container) {
      const gsap = window.gsap;
      if (!gsap) return;

      const ryanEl = container.querySelector('[data-team="ryan"]');
      const guyEl = container.querySelector('[data-team="guy"]');
      if (!ryanEl || !guyEl) return;

      const ryanBio = ryanEl.querySelector('.about-team_bio');
      const guyBio = guyEl.querySelector('.about-team_bio');
      const ryanImage = ryanEl.querySelector('.about-team_image');
      const guyImage = guyEl.querySelector('.about-team_image');
      if (!ryanBio || !guyBio || !ryanImage || !guyImage) return;

      // Initial state: both bios collapsed (max-width is set in CSS)
      gsap.set([ryanBio, guyBio], { width: 0, overflow: 'hidden', opacity: 0 });
      // Own transform from the start so we don't flip between translate and translate3d (avoids jump on leave)
      gsap.set([ryanEl, guyEl], { x: 0, force3D: true });

      const slideOpts = { duration: 0.5, ease: 'power3.out', force3D: true };
      const onRyanEnter = () => {
        gsap.to(ryanBio, { width: '100%', overflow: 'visible', duration: 0.5, ease: 'power3.out' });
        gsap.to(ryanBio, { opacity: 1, duration: 0.5, ease: 'linear' });
        gsap.to(guyEl, { x: '16vw', ...slideOpts });
      };
      const onRyanLeave = () => {
        gsap.to(ryanBio, { width: 0, overflow: 'hidden', duration: 0.5, ease: 'power3.out' });
        gsap.to(ryanBio, { opacity: 0, duration: 0.5, ease: 'linear' });
        gsap.to(guyEl, { x: 0, ...slideOpts });
      };

      const onGuyEnter = () => {
        gsap.to(guyBio, { width: '100%', overflow: 'visible', duration: 0.5, ease: 'power3.out' });
        gsap.to(guyBio, { opacity: 1, duration: 0.5, ease: 'linear' });
        gsap.to(ryanEl, { x: '-16vw', ...slideOpts });
      };
      const onGuyLeave = () => {
        gsap.to(guyBio, { width: 0, overflow: 'hidden', duration: 0.5, ease: 'power3.out' });
        gsap.to(guyBio, { opacity: 0, duration: 0.5, ease: 'linear' });
        gsap.to(ryanEl, { x: 0, ...slideOpts });
      };

      // OPEN on hover of .about-team_image; CLOSE on mouseleave of the whole data-team block
      ryanImage.addEventListener('mouseenter', onRyanEnter);
      ryanEl.addEventListener('mouseleave', onRyanLeave);
      guyImage.addEventListener('mouseenter', onGuyEnter);
      guyEl.addEventListener('mouseleave', onGuyLeave);
      teamHoverListeners.push(
        { el: ryanImage, type: 'enter', fn: onRyanEnter },
        { el: ryanEl, type: 'leave', fn: onRyanLeave },
        { el: guyImage, type: 'enter', fn: onGuyEnter },
        { el: guyEl, type: 'leave', fn: onGuyLeave }
      );
    }

    function destroyAboutTeamHover() {
      teamHoverListeners.forEach(({ el, type, fn }) => {
        el.removeEventListener(type === 'enter' ? 'mouseenter' : 'mouseleave', fn);
      });
      teamHoverListeners = [];
    }

    function initAboutHeroLogoHover(container) {
      const gsap = window.gsap;
      const SplitText = window.SplitText;
      if (!gsap || !SplitText) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      // .nav_logo-embed not in nav = inside main / about hero only
      const logoEmbeds = container.querySelectorAll('.section_about-hero .about-hero_ready .nav_logo-embed');
      if (!logoEmbeds.length) return;

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
    }

    function destroyAboutHeroLogoHover() {
      hoverListeners.forEach(({ embed, onEnter, onLeave }) => {
        embed.removeEventListener('mouseenter', onEnter);
        embed.removeEventListener('mouseleave', onLeave);
      });
      hoverListeners = [];
      splitInstances.forEach((item) => {
        try {
          const split = item.split || item;
          if (split.revert) split.revert();
        } catch (e) {}
      });
      splitInstances = [];
    }

    return {
      init(container) {
        if (active) return;
        active = true;
        RHP.scroll.unlock();
        RHP.lenis?.start();
        RHP.lenis?.resize();
        RHP.aboutDialTicks?.init?.(container);
        RHP.aboutTextLines?.init?.(container);
        if (isDesktop()) {
          initAboutHeroLogoHover(container);
          initAboutTeamHover(container);
        }
      },
      destroy() {
        if (!active) return;
        active = false;
        RHP.aboutDialTicks?.destroy?.();
        RHP.aboutTextLines?.destroy?.();
        destroyAboutHeroLogoHover();
        destroyAboutTeamHover();
      }
    };
  })();

  // Case view: dial_layer-fg as scroll wrapper (persists outside Barba container)
  RHP.views.case = RHP.views.case || (() => {
    let active = false;

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
      },

      destroy() {
        if (!active) return;
        active = false;
        RHP.earthParallax?.destroy?.();
        RHP.caseVideoControls?.destroy?.();
        RHP.lenis?.stop();
      }
    };
  })();

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
     Initial boot (no Barba nav yet)
     Only on initial load: if home, run home intro (not when transitioning from case/about)
     ----------------------------- */
  function bootCurrentView() {
    const container = document.querySelector('[data-barba="container"]');
    const ns = container?.getAttribute('data-barba-namespace');
    const dialComp = document.querySelector('.dial_component');
    const dialNs = dialComp?.getAttribute('data-dial-ns') || '';

    if (dialNs === 'work' || ns === 'case') {
      // Direct-land on work page: set dial to expanded state, no workDial init
      setDialToWorkState();
      RHP.scroll.unlock();
      RHP.views.case?.init?.(container);
    } else if (ns === 'about') {
      // Direct-land on about
      RHP.scroll.unlock();
      RHP.views.about?.init?.(container);
    } else {
      // Home or unknown: normal dial boot
      setDialToHomeState();

      if (ns !== 'home') {
        RHP.scroll.unlock();
        RHP.lenis?.start();
        RHP.lenis?.resize();
      }

      if (ns === 'home') {
        RHP.views.home?.init?.(container, { introMode: true });
        RHP.homeIntro?.run?.(container);
      } else if (ns && RHP.views[ns]?.init) {
        RHP.views[ns].init(container);
      }
    }

    // Init transition-dial on every page (symbol is outside Barba container)
    RHP.transitionDial?.init?.();

    // Direct-land setup: pre-position persistent .about-transition elements
    const aboutTransition = document.querySelector('.about-transition');
    if (aboutTransition && window.gsap) {
      const gsap = window.gsap;
      if (ns === 'about') {
        gsap.set(aboutTransition, { display: 'none' });
        const transitionLogo = _findTransitionLogo();
        if (transitionLogo) {
          const scrollbarOffsetPx = _getScrollbarOffset();
          const logoLargeWidth = _getCSSVar('--logo-large-width', '90vw');
          const logoLargeHeight = _getCSSVar('--logo-large-height', 'auto');
          const logoLargeMaxWidth = _getCSSVar('--logo-large-max-width', '93rem');
          const largeWidthPx = _parseSize(logoLargeWidth);
          const maxWidthPx = _parseSize(logoLargeMaxWidth);
          const finalWidthPx = Math.min(largeWidthPx, maxWidthPx);

          gsap.set(transitionLogo, {
            position: 'fixed',
            left: '50%',
            top: '50%',
            xPercent: -50,
            x: -scrollbarOffsetPx,
            yPercent: -50,
            width: finalWidthPx,
            height: logoLargeHeight,
            maxWidth: logoLargeMaxWidth,
            opacity: 0.4,
            zIndex: 9998
          });
        }
        const transitionDial = document.querySelector('.transition-dial');
        if (transitionDial) {
          const scrollbarOffsetPx = _getScrollbarOffset();
          const dialSmallW = _getCSSVar('--dial-small-width', '6rem');
          const dialSmallH = _getCSSVar('--dial-small-height', '6rem');
          const transitionDialBottom = _getCSSVar('--transition-dial-bottom', '2rem');
          gsap.set(transitionDial, {
            position: 'fixed',
            left: '50%',
            xPercent: -50,
            x: -scrollbarOffsetPx,
            bottom: transitionDialBottom,
            top: 'auto',
            right: 'auto',
            width: dialSmallW,
            height: dialSmallH,
            zIndex: 9997
          });
          RHP.transitionDial?.resize?.();
        }
      } else {
        gsap.set(aboutTransition, { display: 'none' });
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

    function runAfterEnter(data) {
      currentNs = data.next ? (data.next.namespace || '') : '';
      const ns = currentNs;

      var wrapper = document.querySelector('[data-barba="wrapper"]') || document.body;
      if (ns === 'home') {
        wrapper.classList.add('rhp-home-ready', 'rhp-cursor-ready');
      }
      if (ns === 'about') {
        wrapper.classList.add('rhp-nav-hidden');
      } else {
        wrapper.classList.remove('rhp-nav-hidden');
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
      // :has([data-barba-namespace]) selectors match the OLD page during leave().
      // Now that Barba has swapped the DOM, the new namespace is live and CSS is correct.
      // Safe to clearProps and let CSS own the layout.
      var dialFg = document.querySelector('.dial_layer-fg');
      if (dialFg && window.gsap) {
        window.gsap.set(dialFg, { clearProps: 'all' });
      }

      if (ns === 'case') {
        if (dialFg && window.gsap) {
          window.gsap.set(dialFg, { opacity: 1 });
        }
        var bgVideo = document.querySelector('.dial_bg-video');
        if (bgVideo && window.gsap) window.gsap.set(bgVideo, { filter: 'blur(40px)' });
      } else if (ns === 'home') {
        // Defensive: ensure dial is at home state after clearProps
        setDialToHomeState();
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
        if (ns !== 'case') {
          RHP.lenis && RHP.lenis.start && RHP.lenis.start();
          RHP.lenis && RHP.lenis.resize && RHP.lenis.resize();
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
            RHP.views.home.init(data.next.container);
            if (hadCaseHandoff) {
              setTimeout(function() { RHP.workDial?.setInteractionUnlocked?.(true); }, 300);
            }
          });
        } else {
          RHP.views[ns].init(data.next.container);
        }
      }

      // Case study: apply video handoff from home
      if (ns === 'case' && RHP.videoState && RHP.videoState.caseHandoff && data.next && data.next.container) {
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

      // Page-specific: Overland AI
      if (ns === 'case' && /\/work\/overland-ai(\/|$)/.test(window.location.pathname)) {
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
      if (ns === 'case') {
        var dialUI = document.querySelector('.dial_layer-ui');
        if (dialUI && window.gsap) window.gsap.set(dialUI, { opacity: 0 });
      }

      // Re-init transition-dial
      RHP.transitionDial?.init?.();

      // Hide about overlay
      var aboutTransitionEl = document.querySelector('.about-transition');
      if (aboutTransitionEl && window.gsap) {
        window.gsap.set(aboutTransitionEl, { display: 'none' });
      }

      _fireAfterEnterEvent(ns, data.next ? data.next.container : null);
    }

    /* NOTE: Logo width vs max-width timing — the div can still reach max-width before the end of the tween on some viewports; revisit so width and position both finish in sync. */
    function runHomeToAboutTransition(data) {
      const gsap = window.gsap;
      if (!gsap) return Promise.resolve();

      // Init transition-dial (symbol is on every page now, outside Barba container).
      // Destroyed in runAboutToHomeTransition after reverse completes; re-init'd here or in runAfterEnter.
      RHP.transitionDial?.init?.();

      // Overlay + logo via persistent timeline
      const tl = getAboutTransitionTimeline();

      // Dial shrink — .transition-dial used in both directions (buffer always at large resolution)
      let dialPromise = Promise.resolve();
      const transitionDial = document.querySelector('.transition-dial');
      if (transitionDial) {
        const scrollbarOffsetPx = _getScrollbarOffset();
        const rect = transitionDial.getBoundingClientRect();
        const bottomFromViewport = window.innerHeight - rect.bottom;
        const dialSmallW = _getCSSVar('--dial-small-width', '6rem');
        const dialSmallH = _getCSSVar('--dial-small-height', '6rem');
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const dur = reducedMotion ? 0 : 1;
        gsap.set(transitionDial, {
          position: 'fixed',
          left: '50%',
          xPercent: -50,
          x: -scrollbarOffsetPx,
          bottom: bottomFromViewport,
          top: 'auto',
          right: 'auto',
          width: 'calc(var(--dial-large-width) * 1.184)',
          height: 'calc(var(--dial-large-height) * 1.184)',
          zIndex: 9997
        });
        const transitionDialCanvas = transitionDial.querySelector('.transition-dial_canvas');
        if (transitionDialCanvas) {
          gsap.set(transitionDialCanvas, { width: '100%', height: '100%' });
        }
        const dialTween = gsap.to(transitionDial, {
          bottom: _getCSSVar('--transition-dial-bottom', '2rem'),
          width: dialSmallW,
          height: dialSmallH,
          x: -scrollbarOffsetPx,
          duration: 0.75 * dur,
          ease: 'power3.out',
          overwrite: true
        });
        dialPromise = dialTween.then ? dialTween.then() : new Promise(function(r) { dialTween.eventCallback('onComplete', r); });
      }

      if (!tl) return dialPromise;

      // Explicitly set display before playing — GSAP fromTo does not re-apply
      // non-animatable properties (like display) on timeline replay.
      const el = document.querySelector('.about-transition');
      if (el) gsap.set(el, { display: 'flex', opacity: 0 });

      tl.pause().progress(0);
      const tlPromise = new Promise(function(resolve) {
        tl.play().eventCallback('onComplete', resolve);
      });

      return Promise.all([tlPromise, dialPromise]).then(function() {});
    }

    function runAboutToHomeTransition(data) {
      const el = document.querySelector('.about-transition');
      const gsap = window.gsap;
      if (!el || !gsap) return Promise.resolve();
      var leaveTransitionStart = Date.now();
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const dur = reducedMotion ? 0 : 1;

      // Ensure the persistent timeline exists and is at end state before reversing.
      // If it was never played forward (direct land on /about), build it fresh and set to end.
      const tl = getAboutTransitionTimeline();
      if (tl) {
        tl.progress(1);
      }

      // Show overlay at end state before reversing.
      // tl.progress(1) above already set the logo to its end state (large, centred, 0.4 opacity).
      gsap.set(el, { display: 'flex', opacity: 1 });
      const scrollbarOffsetPx = _getScrollbarOffset();

      // Reverse the persistent overlay+logo timeline
      let tlPromise = Promise.resolve();
      if (tl) {
        tlPromise = new Promise(function(resolve) {
          tl.reverse().eventCallback('onReverseComplete', function() {
            gsap.set(el, { display: 'none' });
            resolve();
          });
        });
      }

      // Grow .transition-dial from the about-page dial position to viewport centre.
      // Its canvas buffer is always at large resolution, so ticks stay crisp throughout.
      // Hide .about_dial-wrapper so only the transition dial is visible.
      let dialPromise = Promise.resolve();
      const aboutDialWrapper = document.querySelector('.about_dial-wrapper');
      const transitionDial = document.querySelector('.transition-dial');
      if (transitionDial) {
        // Measure from the about-page dial if present, else fall back to transition-dial's own rect
        var aboutDialLink = aboutDialWrapper ? aboutDialWrapper.querySelector('.about_dial-link') : null;
        var aboutDialCanvas = aboutDialWrapper ? aboutDialWrapper.querySelector('#dial_ticks-canvas') : null;
        const measureEl = aboutDialLink || aboutDialCanvas || aboutDialWrapper || transitionDial;
        const rect = measureEl.getBoundingClientRect();

        // Hide about-page dial so only the transition dial shows
        if (aboutDialWrapper) gsap.set(aboutDialWrapper, { visibility: 'hidden' });

        // Large dial size in px: matches CSS clamp(180px, min(50svh, 70vw), ...) * 1.184
        var dialLargeBase = Math.max(180, Math.min(window.innerHeight * 0.5, window.innerWidth * 0.7));
        var largeWidthPx = dialLargeBase * 1.184;
        var largeHeightPx = dialLargeBase * 1.184;

        // Final position: centre of viewport
        var centerLeft = (window.innerWidth / 2) - (largeWidthPx / 2) - scrollbarOffsetPx;
        var centerTop = (window.innerHeight / 2) - (largeHeightPx / 2);

        // Ensure transition-dial is initialised and drawn
        RHP.transitionDial?.init?.();
        RHP.transitionDial?.resize?.();

        const transitionDialCanvas = transitionDial.querySelector('.transition-dial_canvas');
        if (transitionDialCanvas) {
          gsap.set(transitionDialCanvas, { width: '100%', height: '100%' });
        }

        gsap.set(transitionDial, {
          position: 'fixed',
          left: rect.left,
          top: rect.top,
          right: 'auto',
          bottom: 'auto',
          width: rect.width,
          height: rect.height,
          clearProps: 'transform',
          zIndex: 9997
        });

        const dialTween = gsap.fromTo(
          transitionDial,
          {
            left: rect.left,
            top: rect.top,
            right: 'auto',
            bottom: 'auto',
            width: rect.width,
            height: rect.height
          },
          {
            left: centerLeft,
            top: centerTop,
            right: 'auto',
            bottom: 'auto',
            width: largeWidthPx,
            height: largeHeightPx,
            duration: 0.75 * dur,
            ease: 'power3.out',
            overwrite: true
          }
        );
        dialPromise = dialTween.then ? dialTween.then() : new Promise(function(r) { dialTween.eventCallback('onComplete', r); });
      }

      var LOGO_DIAL_DURATION_MS = 750;
      return Promise.all([tlPromise, dialPromise]).then(function() {
        var elapsed = Date.now() - leaveTransitionStart;
        var wait = Math.max(0, LOGO_DIAL_DURATION_MS - elapsed);
        if (wait > 0) {
          return new Promise(function(r) { setTimeout(r, wait); }).then(function() {
            RHP.transitionDial?.destroy?.();
          });
        }
        RHP.transitionDial?.destroy?.();
      });
    }

    barba.init({
      preventRunning: true,
      transitions: [
        /* ---- Home -> Case ---- */
        {
          name: 'home-to-case',
          from: { namespace: ['home'] },
          to: { namespace: ['case'] },

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
            if (ns && RHP.views[ns]?.destroy) RHP.views[ns].destroy();
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

        /* ---- Case -> Home ---- */
        {
          name: 'case-to-home',
          from: { namespace: ['case'] },
          to: { namespace: ['home'] },

          beforeLeave(data) {
            const ns = data.current?.namespace || currentNs;
            // Capture case study video position for handoff back to home dial
            if (ns === 'case' && RHP.videoState) {
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

        /* ---- Case -> About ---- */
        {
          name: 'case-to-about',
          from: { namespace: ['case'] },
          to: { namespace: ['about'] },
          beforeLeave(data) {
            const ns = data.current?.namespace || currentNs;
            if (ns && RHP.views[ns]?.destroy) RHP.views[ns].destroy();
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

        /* ---- About -> Case ---- */
        {
          name: 'about-to-case',
          from: { namespace: ['about'] },
          to: { namespace: ['case'] },

          beforeLeave(data) {
            const ns = data.current?.namespace || currentNs;
            if (ns && RHP.views[ns]?.destroy) RHP.views[ns].destroy();
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
            const ns = data.current?.namespace || currentNs;
            if (ns && RHP.views[ns]?.destroy) {
              RHP.views[ns].destroy();
            }
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

  ready(() => {
    initBarba();
    initContactPullout();
  });
})();
