/* =========================================
   RHP — Orchestrator (Barba conductor)
   + Scroll lock only on home
   + Lenis on all non-home pages
   ========================================= */
(() => {
  const ORCHESTRATOR_VERSION = '2026.2.18.1'; // bump when you deploy; check in console: RHP load check
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

  // Case view: Lenis on an inner scrollable wrapper instead of window
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
          RHP.lenis?.setupScrollTriggerProxy?.(wrapper, content);
        } else {
          RHP.lenis?.start();
          RHP.lenis?.resize();
        }

        RHP.earthParallax?.init?.(container);
        RHP.caseVideoControls?.init?.(container);
      },

      destroy() {
        if (!active) return;
        active = false;
        RHP.earthParallax?.destroy?.();
        RHP.caseVideoControls?.destroy?.();
        // Let global logic decide when to stop Lenis; no-op here.
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

    if (ns !== 'home') {
      RHP.scroll.unlock();
      // For case view we let its own init decide how to configure Lenis
      if (ns !== 'case') {
        RHP.lenis?.start();
        RHP.lenis?.resize();
      }
    }

    if (ns === 'home') {
      // Fresh load of homepage: run intro animation
      RHP.views.home?.init?.(container, { introMode: true });
      RHP.homeIntro?.run?.(container);
    } else if (ns && RHP.views[ns]?.init) {
      RHP.views[ns].init(container);
    }

    // Init transition-dial on every page (symbol is outside Barba container)
    RHP.transitionDial?.init?.();

    // Direct-land setup: pre-position persistent .about-transition elements
    const aboutTransition = document.querySelector('.about-transition');
    if (aboutTransition && window.gsap) {
      const gsap = window.gsap;
      if (ns === 'about') {
        // On /about: pre-position logo+dial to end states, keep overlay hidden
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
        // Pre-position transition dial to end state (small, bottom)
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
          // Redraw canvas at small size (init already called above)
          RHP.transitionDial?.resize?.();
        }
      } else {
        // On /home, /case: ensure overlay is hidden
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

    function runCaseDialShrinkAnimation(data) {
      const dialFg = data.current?.container?.querySelector('.dial_layer-fg');
      if (!dialFg || !window.gsap) return Promise.resolve();

      const gsap = window.gsap;
      const getVar = (name, fallback) =>
        (getComputedStyle(document.documentElement).getPropertyValue(name) || '').trim() || fallback;

      const homeWidth = getVar('--dial-home-width', 'clamp(180px, min(50svh, 70vw), min(50svh, 70vw))');
      const homeHeight = getVar('--dial-home-height', 'clamp(180px, min(50svh, 70vw), min(50svh, 70vw))');
      const homeBorderRadius = getVar('--dial-home-border-radius', '1000rem');
      const homeAspectRatio = getVar('--dial-home-aspect-ratio', '1');

      gsap.set(dialFg, { overflow: 'hidden', margin: 'auto' });
      const tween = gsap.to(dialFg, {
        width: homeWidth,
        height: homeHeight,
        borderRadius: homeBorderRadius,
        aspectRatio: homeAspectRatio,
        duration: 0.6,
        ease: 'power2.inOut',
        overwrite: true
      });
      return tween.then ? tween.then() : new Promise(function(r) { tween.eventCallback('onComplete', r); });
    }

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

      if (ns === 'about' && window.gsap) {
        const navLogoWrapper = wrapper ? wrapper.querySelector('.nav_logo-wrapper-2') : null;
        if (navLogoWrapper) {
          gsap.set(navLogoWrapper, { clearProps: 'position,left,top,zIndex,xPercent,yPercent' });
          const navEmbeds = navLogoWrapper.querySelectorAll('.nav_logo-embed');
          if (navEmbeds.length) gsap.set(navEmbeds, { clearProps: 'height' });
          navLogoWrapper.style.visibility = 'hidden';
        }
      }
      if (ns === 'home') {
        var navLogoWrapper = wrapper ? wrapper.querySelector('.nav_logo-wrapper-2') : null;
        if (navLogoWrapper) {
          navLogoWrapper.style.visibility = '';
          if (window.gsap) {
            gsap.set(navLogoWrapper, { clearProps: 'position,left,top,xPercent,yPercent,zIndex' });
            var navEmbeds = navLogoWrapper.querySelectorAll('.nav_logo-embed');
            if (navEmbeds.length) gsap.set(navEmbeds, { clearProps: 'height' });
          }
        }
      }

      var dialFg = (data.next && data.next.container) ? data.next.container.querySelector('.dial_layer-fg') : null;
      if (!dialFg) dialFg = document.querySelector('.dial_layer-fg');
      var bgVideo = (data.next && data.next.container) ? data.next.container.querySelector('.dial_bg-video') : null;
      if (!bgVideo) bgVideo = document.querySelector('.dial_bg-video');
      if (dialFg && window.gsap) {
        var getCSSVar = function(varName) {
          return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
        };
        var homeWidth = getCSSVar('--dial-home-width') || '37.5rem';
        var homeHeight = getCSSVar('--dial-home-height') || '37.5rem';
        var homeBorderRadius = getCSSVar('--dial-home-border-radius') || '1000rem';
        var homeAspectRatio = getCSSVar('--dial-home-aspect-ratio') || '1';
        var caseWidth = getCSSVar('--dial-case-width') || '78vw';
        var caseHeight = getCSSVar('--dial-case-height') || '85dvh';
        var caseBorderRadius = getCSSVar('--dial-case-border-radius') || '7.5rem';
        var caseAspectRatio = getCSSVar('--dial-case-aspect-ratio') || 'auto';

        if (ns === 'case' || ns === 'about') {
          /* From click-through: keep opacity 1 and blur on bg for entire case-study view until return to home */
          gsap.set(dialFg, { opacity: 1 });
          if (bgVideo) gsap.set(bgVideo, { filter: 'blur(40px)' });

          gsap.set(dialFg, {
            width: homeWidth,
            height: homeHeight,
            borderRadius: homeBorderRadius,
            aspectRatio: homeAspectRatio,
            overflow: 'visible'
          });
          dialFg.style.display = 'grid';
          dialFg.style.flexFlow = 'row';
          dialFg.classList.add('is-case-study');
          dialFg.style.display = 'flex';
          dialFg.style.flexFlow = 'column';
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
          var prevNs = data.current ? data.current.namespace : undefined;
          var prevPath = (data.current && data.current.url) ? (data.current.url.path || data.current.url.pathname || '') : '';
          var fromAbout = prevNs === 'about' || /(^|\/)about(\/|$|\?)/.test(prevPath);
          if (fromAbout) {
            /* about→home: ensure dial is at home size — kill tweens, clear inline overrides, set home dimensions */
            dialFg.classList.remove('is-case-study');
            gsap.killTweensOf(dialFg);
            gsap.set(dialFg, {
              width: homeWidth,
              height: homeHeight,
              borderRadius: homeBorderRadius,
              aspectRatio: homeAspectRatio,
              overflow: 'visible',
              display: 'grid',
              flexFlow: 'row'
            });
          } else if (prevNs === 'case') {
            /* case→home: shrink animation runs in leave; home dial is fresh with default CSS */
            dialFg.classList.remove('is-case-study');
          } else {
            dialFg.classList.remove('is-case-study');
          }
        }
      } else if (dialFg) {
        if (ns === 'case' || ns === 'about') dialFg.classList.add('is-case-study');
        else dialFg.classList.remove('is-case-study');
      }

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

      if (ns && RHP.views[ns] && RHP.views[ns].init && data.next && data.next.container) {
        // Read handoff flag BEFORE views.home.init() — work-dial.init() consumes and clears it
        var hadCaseHandoff = ns === 'home' && !!(RHP.videoState?.caseHandoff);

        RHP.views[ns].init(data.next.container);

        // Barba return with case handoff: interaction is locked in work-dial; unlock after settle
        if (hadCaseHandoff) {
          setTimeout(function() { RHP.workDial?.setInteractionUnlocked?.(true); }, 300);
        }
      }

      // Case study: apply video handoff from home (seek to home currentTime + transition duration, then play)
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

      // Page-specific: load Overland AI CSS + script when navigating to it via Barba (if not loaded on initial page)
      if (ns === 'case' && /\/work\/overland-ai(\/|$)/.test(window.location.pathname)) {
        var baseUrl = RHP.getScriptBaseUrl && RHP.getScriptBaseUrl();
        var v = RHP.configVersion || '0';
        if (baseUrl) {
          /* Inject overland-ai.css if not already present */
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

      // Webflow IX2 re-init after Barba DOM swap (destroy clears old bindings, ready+ix2.init rebind to new container)
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
        // Re-apply scrollerProxy for case view: Webflow.destroy() clears it, so IX2's new ScrollTriggers need it after init
        if (ns === 'case' && data.next && data.next.container) {
          var caseWrapper = data.next.container.querySelector('[data-case-scroll-wrapper]') || data.next.container.querySelector('.case-scroll-wrapper');
          var caseContent = caseWrapper?.querySelector('[data-case-scroll-content]') || caseWrapper?.firstElementChild;
          if (caseWrapper && caseContent) {
            RHP.lenis?.setupScrollTriggerProxy?.(caseWrapper, caseContent);
            window.ScrollTrigger?.refresh?.(true);
          }
        }
      } catch (e) {}

      // Re-init transition-dial after Barba transition (symbol persists outside container)
      RHP.transitionDial?.init?.();

      // Safe: Barba guarantees leave() resolves before afterEnter fires.
      // Hide overlay here for all namespaces — overlay is only visible during transition animations.
      var aboutTransitionEl = document.querySelector('.about-transition');
      if (aboutTransitionEl && window.gsap) {
        window.gsap.set(aboutTransitionEl, { display: 'none' });
      }

      try {
        var ev = new CustomEvent('rhp:barba:afterenter', {
          detail: { namespace: ns, container: data.next ? data.next.container : null }
        });
        window.dispatchEvent(ev);
      } catch (e) {}
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
      transitions: [
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
          leave(data) {
            return runCaseDialShrinkAnimation(data);
          },
          enter() {
            window.scrollTo(0, 0);
          },
          afterEnter(data) {
            runAfterEnter(data);
          }
        },
        // Default transition (all other routes, including home → case)
        {
          name: 'rhp-core',

          beforeLeave(data) {
            const ns = data.current?.namespace || currentNs;
            // Home → case: capture dial video position for handoff to case study page
            if (ns === 'home' && RHP.videoState && RHP.workDial) {
              const container = data.current?.container || document;
              const fgVideo = container.querySelector('.dial_fg-video') || document.querySelector('.dial_fg-video');
              const idx = RHP.workDial.getActiveIndex();
              if (fgVideo && typeof idx === 'number') {
                RHP.videoState.caseHandoff = {
                  index: idx,
                  currentTime: fgVideo.currentTime || 0,
                  transitionDuration: 0.6
                };
              }
            }
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
