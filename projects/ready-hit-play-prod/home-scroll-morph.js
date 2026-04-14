/* =========================================
   RHP — Home Scroll Morph
   On fresh home load the dial is LOCKED idle at dial-small size, the intro
   logo (#interactive-logo) is visible in .home-intro_middle, and the nav is
   hidden. Scrolling through the 100vh .section_home-intro scrubs:
     - Logo: Flip.fit from .home-intro_middle -> .home-intro_top (shrink)
     - Dial: Flip.fit from .home-intro_bottom -> .home-intro_middle (grow)
     - CSS vars: --dial-live-width/height scrub from dial-small to dial-large
     - Step text: opacity 0 -> 1 in last 10%
   At scrub-end: .rhp-home-ready is toggled on the wrapper (CSS FOUC rule
   falls off, nav items become visible via class cascade — no GSAP tween on
   the nav logo), scroll locks, dial unlocks (setIntroComplete +
   setAttractionEnabled + setInteractionUnlocked), intro section is
   display:none'd.
   ========================================= */
(function () {
  'use strict';
  const VERSION = '2026.4.14.1';
  const DEBUG = false;
  const FLIP_CLEAR = 'transform,x,y,scale,scaleX,scaleY,maxWidth';

  let ctx = null;
  let scrubTL = null;
  let scrollTrigger = null;
  let initialised = false;
  let complete = false;
  let sectionEl = null;        // .section_home-intro
  let topSlot = null;          // .home-intro_top (logo end position)
  let middleSlot = null;       // .home-intro_middle (logo start / dial end)
  let bottomSlot = null;       // .home-intro_bottom (dial start position)
  let logoEl = null;           // #interactive-logo SVG wordmark
  let dialWrapper = null;      // .home-transition-dial wrapper
  let dialEl = null;           // .dial_component[data-dial-ns="home"]
  let stepTextEl = null;       // step text element
  let _resizeHandler = null;   // stored bound ref so destroy() can remove it
  let logoHoverCleanup = [];   // mouseenter/mouseleave removers
  let logoSplitData = [];      // { ready, upper, lower, splits: SplitText[], allWords: Element[] }

  function _isDesktop() {
    return window.matchMedia?.('(hover: hover)').matches === true;
  }

  function prefersReduced() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  }

  function redrawDialCanvas() {
    // work-dial listens for resize and re-paints its canvas.
    window.dispatchEvent(new Event('resize'));
  }

  /** Kill the scrub timeline + ScrollTrigger so they can't revert tweened
      values. Order: ScrollTrigger first, then timeline (mirrors GSAP teardown). */
  function _killScrub() {
    if (scrubTL) {
      if (scrubTL.scrollTrigger) scrubTL.scrollTrigger.kill();
      scrubTL.kill();
      scrubTL = null;
    }
    if (scrollTrigger) {
      scrollTrigger.kill();
      scrollTrigger = null;
    }
  }

  /** Returns the Barba wrapper (or body as fallback) for class-toggle scope. */
  function _getScope() {
    return document.querySelector('[data-barba="wrapper"]') || document.body;
  }

  /** Re-queries module-scoped DOM refs. Called by init() and skipToEnd()
      since Barba swaps the [data-barba="container"] on every transition.
      .section_home-intro and .home-transition (which hosts the layout
      slots) both live OUTSIDE the Barba container as siblings in
      main.main-wrapper. Nav and dial also persist outside the container. */
  function _queryDOMRefs(container) {
    sectionEl = document.querySelector('.section_home-intro');
    // Layout slots live inside .home-transition (sibling of .section_home-intro),
    // not inside .section_home-intro itself — query at document level.
    topSlot = document.querySelector('.home-intro_top') || null;
    middleSlot = document.querySelector('.home-intro_middle') || null;
    bottomSlot = document.querySelector('.home-intro_bottom') || null;
    logoEl = document.querySelector('#interactive-logo');
    dialWrapper = document.querySelector('.home-transition-dial');
    dialEl = document.querySelector('.dial_component[data-dial-ns="home"]');
    stepTextEl = document.querySelector('.dial_component[data-dial-ns="home"] .heading-style-h7.is-step') ||
      document.querySelector('.dial_component[data-dial-ns="home"] [data-text="step"]');
  }

  /* --- Logo text animation (hover on desktop, scroll on mobile) --- */

  function _revertLogoText() {
    logoSplitData.forEach(d => {
      d.splits.forEach(s => { try { s.revert(); } catch (_) {} });
    });
    logoSplitData = [];
  }

  /** Split .is-about-upper / .is-about-lower inside each .about-hero_ready.
      Sets words to yPercent:100, opacity:0 (hidden below the mask line). */
  function _splitLogoText() {
    _revertLogoText();
    const gsap = window.gsap;
    const SplitText = window.SplitText;
    if (!gsap || !SplitText || !logoEl) return;

    const readys = logoEl.querySelectorAll('.about-hero_ready');
    readys.forEach(ready => {
      const upper = ready.querySelector('.is-about-upper');
      const lower = ready.querySelector('.is-about-lower');
      const targets = [upper, lower].filter(Boolean);
      if (!targets.length) return;

      const splits = [];
      const allWords = [];
      targets.forEach(t => {
        try {
          const s = new SplitText(t, {
            type: 'words,lines',
            linesClass: 'intro-logo-line',
            wordsClass: 'intro-logo-word'
          });
          // Vertical-only mask: clip top/bottom at element bounds but allow
          // horizontal overflow so wide words (e.g. "CONNECTION") aren't clipped
          // by a narrow flex column. overflow:hidden clips both axes and CSS
          // doesn't allow overflow-x:visible with overflow-y:hidden.
          if (s.lines) s.lines.forEach(l => {
            l.style.clipPath = 'inset(0 -100% 0 -100%)';
          });
          if (s.words) {
            gsap.set(s.words, { yPercent: 100, opacity: 0 });
            allWords.push(...s.words);
          }
          splits.push(s);
        } catch (_) { /* SplitText init failure — graceful skip */ }
      });

      logoSplitData.push({ ready, upper, lower, splits, allWords });
    });
  }

  /** Desktop: hover on each .about-hero_ready reveals text via SplitText mask. */
  function _initLogoHover() {
    if (!_isDesktop()) return;
    const gsap = window.gsap;
    if (!gsap) return;

    logoSplitData.forEach(({ ready, upper, lower, allWords }) => {
      const targets = [upper, lower].filter(Boolean);

      const onEnter = () => {
        targets.forEach(t => gsap.to(t, { opacity: 1, duration: 0.3, overwrite: true }));
        gsap.to(allWords, {
          yPercent: 0, opacity: 1,
          duration: 0.5, ease: 'power3.out', stagger: 0.05, overwrite: true
        });
        gsap.to(ready, { y: '-1.5rem', duration: 0.5, ease: 'power3.out', overwrite: true });
      };

      const onLeave = () => {
        gsap.to(allWords, {
          yPercent: 100, opacity: 0,
          duration: 0.4, ease: 'power3.in', stagger: 0.03, overwrite: true
        });
        targets.forEach(t => gsap.to(t, { opacity: 0, duration: 0.3, delay: 0.15, overwrite: true }));
        gsap.to(ready, { y: 0, duration: 0.5, ease: 'power3.out', overwrite: true });
      };

      ready.addEventListener('mouseenter', onEnter);
      ready.addEventListener('mouseleave', onLeave);
      logoHoverCleanup.push(
        () => ready.removeEventListener('mouseenter', onEnter),
        () => ready.removeEventListener('mouseleave', onLeave)
      );
    });
  }

  function _destroyLogoHover() {
    logoHoverCleanup.forEach(fn => { try { fn(); } catch (_) {} });
    logoHoverCleanup = [];
  }

  /** Gracefully tear down logo hover: plays a fast hover-out animation first
      so there's no visual jump, then hides the upper/lower text elements from
      flex layout and reverts SplitText. Called on first scroll frame. */
  function _destroyLogoText() {
    _destroyLogoHover();
    const gsap = window.gsap;
    if (gsap && logoSplitData.length) {
      const DUR = 0.25;
      // Play hover-out on every ready group, then hide + revert when done.
      let pending = logoSplitData.length;
      const afterAll = () => {
        if (--pending > 0) return;
        // All hover-out anims done — hide text + spacers, revert splits.
        // With the scale approach, internal structure differences don't matter
        // (the whole element scales uniformly), but hiding text/spacers keeps
        // the visual clean during the shrink.
        logoSplitData.forEach(({ ready, upper, lower }) => {
          [upper, lower].filter(Boolean).forEach(t => { t.style.display = 'none'; });
          if (ready) ready.querySelectorAll('.about_logo-spacer').forEach(s => { s.style.display = 'none'; });
        });
        _revertLogoText();
      };
      logoSplitData.forEach(({ ready, upper, lower, allWords }) => {
        const targets = [upper, lower].filter(Boolean);
        // Kill any in-flight hover tweens so overwrite doesn't conflict
        gsap.killTweensOf(ready);
        gsap.killTweensOf(allWords);
        targets.forEach(t => gsap.killTweensOf(t));
        // Hover-out: words slide down + fade, container resets y
        gsap.to(allWords, {
          yPercent: 100, opacity: 0,
          duration: DUR, ease: 'power3.in', overwrite: true
        });
        targets.forEach(t => gsap.to(t, {
          opacity: 0, duration: DUR, overwrite: true
        }));
        gsap.to(ready, {
          y: 0, duration: DUR, ease: 'power3.out', overwrite: true,
          onComplete: afterAll
        });
      });
    } else {
      _revertLogoText();
    }
  }

  function init(container) {
    if (initialised) return;

    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    if (!gsap || !ScrollTrigger) {
      DEBUG && console.warn('[home-scroll-morph] GSAP/ScrollTrigger missing');
      return;
    }

    _queryDOMRefs(container);

    if (!sectionEl || !topSlot || !middleSlot || !bottomSlot || !logoEl || !dialWrapper || !dialEl) {
      DEBUG && console.warn('[home-scroll-morph] required DOM missing — intro morph disabled', {
        sectionEl: !!sectionEl,
        topSlot: !!topSlot,
        middleSlot: !!middleSlot,
        bottomSlot: !!bottomSlot,
        logoEl: !!logoEl,
        dialWrapper: !!dialWrapper,
        dialEl: !!dialEl
      });
      return;
    }

    initialised = true;

    // Lock the dial — on fresh load it must stay idle at dial-small
    // with no fg video / no project switching / no attraction.
    if (RHP.workDial?.setAttractionEnabled) RHP.workDial.setAttractionEnabled(false);
    if (RHP.workDial?.setInteractionUnlocked) RHP.workDial.setInteractionUnlocked(false);

    // Initial state: dial small (matches about size). Use a CSS class
    // rather than inline style — Webflow IX2 / GSAP batch-clear inline
    // styles at ~220ms on page load, wiping setProperty calls.
    // The class cascade is immune to inline-style clearing.
    dialEl.classList.add('is-intro-small');

    // Step text starts hidden — revealed at tail end of scrub.
    if (stepTextEl) gsap.set(stepTextEl, { opacity: 0 });

    // Logo text: split words for mask animation, then fade logo in.
    _splitLogoText();
    gsap.to(logoEl, { opacity: 1, duration: 0.8, ease: 'power2.out' });
    if (_isDesktop()) _initLogoHover();

    ctx = gsap.context(() => {

      const buildTimeline = () => {
        _killScrub();

        // Reset any leftover transforms so Flip measures rest state
        gsap.set(dialWrapper, { clearProps: FLIP_CLEAR });
        gsap.set(logoEl, { clearProps: FLIP_CLEAR });

        if (prefersReduced()) {
          // Reduced motion: no tween, callback-only ScrollTrigger.
          scrollTrigger = ScrollTrigger.create({
            trigger: sectionEl,
            start: 'top top',
            end: '+=100%',
            onLeave: onMorphComplete,
            onEnterBack: onMorphReverse,
            invalidateOnRefresh: true
          });
          return;
        }

        // --- Position + uniform scale ---
        // Dial: resolve --dial-large-width to px for target size (not slot width).
        // Logo: use max(slot dimensions) for target size.

        const dialRect = dialWrapper.getBoundingClientRect();
        const midRect = middleSlot.getBoundingClientRect();
        // Resolve --dial-large-width to px, then multiply by TICK_RING_EXPAND
        // so the transition dial's outer tick ring matches the work dial's.
        // --dial-large-width = fg video circle; work-dial ticks extend beyond by
        // gap + baseLen + barW (the TICK_RING_EXPAND factor from transition-dial.js).
        const REF_R = 253;
        const TICK_RING_EXPAND = 1 + 24 / REF_R + 22.51 / REF_R + 1.686 / REF_R;
        const dialComp = document.querySelector('.dial_component[data-dial-ns="home"]');
        let dTargetSize = 0;
        if (dialComp) {
          const raw = getComputedStyle(dialComp).getPropertyValue('--dial-large-width').trim();
          if (raw) {
            const tmp = document.createElement('div');
            tmp.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;width:' + raw;
            dialComp.appendChild(tmp);
            dTargetSize = tmp.offsetWidth * TICK_RING_EXPAND;
            dialComp.removeChild(tmp);
          }
        }
        if (!dTargetSize) dTargetSize = Math.max(midRect.width, midRect.height) || 1;
        const dSourceMax = Math.max(dialRect.width, dialRect.height) || 1;
        const dScale = dTargetSize / dSourceMax;
        const dx = (midRect.left + midRect.width / 2) - (dialRect.left + dialRect.width / 2);
        const dy = (midRect.top + midRect.height / 2) - (dialRect.top + dialRect.height / 2);

        // Animate #interactive-logo via GSAP scale to shrink to nav logo size.
        // Both logos share .nav_logo-wrapper-2 with responsive CSS scale
        // (0.8 @ 1280, 0.9 @ 1440, 1 @ 1920). Using GSAP scale (which compounds
        // with the CSS scale) avoids all internal flex-structure mismatches —
        // the entire element shrinks uniformly to match the nav wrapper's visual width.
        const navWrapper = document.querySelector('.nav_logo-wrapper-2.is-nav');
        const navLink = document.querySelector('.nav_logo-link') || topSlot;
        const navWrapperRect = navWrapper ? navWrapper.getBoundingClientRect() : navLink.getBoundingClientRect();
        const logoRect = logoEl.getBoundingClientRect();

        // Scale factor: GSAP scale replaces the CSS transform (which includes
        // a responsive scale: 0.8 @ 1280px, 0.9 @ 1440px, 1 @ 1920px).
        // The nav logo SVGs overflow their flex container (flex:0 1 auto lets
        // intrinsic SVG sizes exceed the wrapper), while the interactive logo
        // SVGs are constrained (flex:N 1 0%). So we measure the actual nav SVG
        // visual span, not the wrapper width, as the target.
        const navSvgs = navWrapper.querySelectorAll ? [...navWrapper.querySelectorAll('svg')] : [];
        let navSvgSpan = navWrapperRect.width; // fallback
        if (navSvgs.length) {
          const rects = navSvgs.map(s => s.getBoundingClientRect());
          navSvgSpan = Math.max(...rects.map(r => r.right)) - Math.min(...rects.map(r => r.left));
        }
        const lScale = navSvgSpan / (logoEl.offsetWidth || logoRect.width);

        // Position: align on the FIRST SVG ("READY") so it doesn't jump on swap.
        // GSAP `translate(lx) scale(s)` transforms from the layout center, so the
        // first SVG's visual offset changes with scale. We compute where the first
        // SVG center will land AFTER scaling, then solve for lx.
        //
        // Math: at rest, CSS scale = cssScale. First SVG offset from logo center
        // (visual) = ilSvgCenter - ilLogoCenter. After GSAP scale(lScale), this
        // offset scales by (lScale / cssScale). So:
        //   lx = navSvgCenter - ilLogoCenter - offset * (lScale / cssScale)
        const cssScale = logoEl.offsetWidth > 0 ? logoRect.width / logoEl.offsetWidth : 1;
        const ilFirstSvg = logoEl.querySelector('svg');
        const navFirstSvg = navWrapper.querySelector ? navWrapper.querySelector('svg') : null;
        const ilLogoCenterX = logoRect.left + logoRect.width / 2;
        const ilLogoCenterY = logoRect.top + logoRect.height / 2;
        let lx, ly;
        if (ilFirstSvg && navFirstSvg && cssScale > 0) {
          const ilSvgRect = ilFirstSvg.getBoundingClientRect();
          const navSvgRect = navFirstSvg.getBoundingClientRect();
          const scaleRatio = lScale / cssScale;
          // Horizontal: align first SVG center after scale
          const offsetX = (ilSvgRect.left + ilSvgRect.width / 2) - ilLogoCenterX;
          lx = (navSvgRect.left + navSvgRect.width / 2) - ilLogoCenterX - offsetX * scaleRatio;
          // Vertical: align on nav wrapper center after scale
          const offsetY = ilLogoCenterY - ilLogoCenterY; // 0 — center stays center
          ly = (navWrapperRect.top + navWrapperRect.height / 2) - ilLogoCenterY;
        } else {
          lx = (navWrapperRect.left + navWrapperRect.width / 2) - ilLogoCenterX;
          ly = (navWrapperRect.top + navWrapperRect.height / 2) - ilLogoCenterY;
        }

        scrubTL = gsap.timeline({
          scrollTrigger: {
            trigger: sectionEl,
            start: 'top top',
            end: '+=100%',
            scrub: 0.5,
            onLeave: onMorphComplete,
            onEnterBack: onMorphReverse,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              // On first scroll frame, destroy the hover text animation so the
              // upper/lower text elements no longer affect flex layout. This lets
              // the SVGs fill their containers at the same proportions as the nav logo.
              if (self.progress > 0 && logoSplitData.length) {
                _destroyLogoText();
              }
              // Redraw transition dial canvas at current visual size so ticks
              // stay crisp as GSAP scale grows the wrapper.
              if (RHP.transitionDial?.resize) RHP.transitionDial.resize();
            }
          }
        });

        // Dial: move to middle slot center + grow (uniform scale)
        scrubTL.to(dialWrapper, {
          x: dx, y: dy, scale: dScale,
          ease: 'power3.inOut', duration: 1
        }, 0);

        // Logo: shrink via uniform scale + move to nav position.
        // GSAP scale compounds with the CSS transform scale, so the visual
        // result is cssScale × gsapScale. At lScale the logo visually matches
        // the nav wrapper exactly.
        scrubTL.to(logoEl, {
          x: lx, y: ly, scale: lScale,
          ease: 'power3.inOut', duration: 1
        }, 0);

        // Step text: fade in during last 10%
        if (stepTextEl) {
          scrubTL.to(stepTextEl, { opacity: 1, duration: 0.1, ease: 'power1.out' }, 0.9);
        }

        // Mobile: scroll-driven text reveal (bell curve per word).
        // Each .about-hero_ready gets a segment: words slide in then out.
        if (!_isDesktop() && logoSplitData.length) {
          // Reset word positions (buildTimeline may be called on resize)
          logoSplitData.forEach(d => {
            const tgts = [d.upper, d.lower].filter(Boolean);
            gsap.set(tgts, { opacity: 0 });
            gsap.set(d.allWords, { yPercent: 100, opacity: 0 });
          });

          const SEG = 0.28;  // each word: 28% of scroll
          logoSplitData.forEach((data, i) => {
            const start = i * SEG;
            const mid = start + SEG / 2;
            const tgts = [data.upper, data.lower].filter(Boolean);

            // IN: text opacity 0→1, words slide up into mask
            scrubTL.to(tgts, { opacity: 1, duration: SEG / 2 }, start);
            scrubTL.to(data.allWords, {
              yPercent: 0, opacity: 1, duration: SEG / 2, ease: 'none'
            }, start);

            // OUT: words slide out above, text fades
            scrubTL.to(data.allWords, {
              yPercent: -100, opacity: 0, duration: SEG / 2, ease: 'none'
            }, mid);
            scrubTL.to(tgts, { opacity: 0, duration: SEG / 2 }, mid);
          });
        }

        // Capture for explicit cleanup on next rebuild / destroy.
        scrollTrigger = scrubTL.scrollTrigger || null;
      };

      buildTimeline();

      // Rebuild on resize. Stored outside the ctx so destroy() can remove it
      // and replay() can call it.
      _resizeHandler = buildTimeline;
      window.addEventListener('resize', _resizeHandler);
    }, container || document);
  }

  /** Shared post-complete side effects for both the scrub-end path and the
      Barba re-entry skipToEnd path. Unlocks the dial, locks scroll, redraws
      the dial canvas so the tick layer renders at its final large size.
      Nav item visibility is driven purely by the .rhp-home-ready class on
      the wrapper — no GSAP tween on .nav_logo-link. The CSS FOUC rule at
      the top of ready-hit-play.css hides those nodes while the wrapper
      lacks .rhp-home-ready; adding the class removes the hide rule and they
      become visible instantly. The nav logo reveal is CSS-only (class toggle). */
  function _applyCompleteState(animate) {
    const gsap = window.gsap;
    const SplitText = window.SplitText;
    const scope = _getScope();

    // Kill the scrub timeline + ScrollTrigger so they can't revert tweened
    // values when scroll.lock() changes the scroll position.
    _killScrub();

    // Clear inline opacity on step text before the class toggle.
    if (stepTextEl && gsap) gsap.set(stepTextEl, { clearProps: 'opacity,visibility' });

    // Query nav items.
    const navAbout = scope.querySelector('.nav_about-link');
    const navContact = scope.querySelector('.nav_contact-link');

    if (animate) {
      // Pin nav items at starting positions before the class toggle removes
      // the CSS FOUC hide — prevents them flashing at their final state.
      // Nav logo is NOT animated — it just becomes visible via the class toggle.
      if (gsap) {
        if (navAbout) gsap.set(navAbout, { xPercent: -100, opacity: 0, visibility: 'visible' });
        if (navContact) gsap.set(navContact, { xPercent: 100, opacity: 0, visibility: 'visible' });
      }
      // Pin step text at opacity:0 before the class toggle.
      if (stepTextEl && gsap) gsap.set(stepTextEl, { opacity: 0, visibility: 'visible' });
    }

    scope.classList.add('rhp-home-ready');

    if (animate) {
      // --- Nav entrance animation ---
      // About slides from left, contact from right. Nav logo is revealed
      // instantly by the .rhp-home-ready class toggle (no GSAP tween).
      const DUR = 0.7;
      const EASE_TRANSLATE = 'power3.out';
      if (gsap) {
        const tl = gsap.timeline();
        if (navAbout) {
          tl.to(navAbout, { xPercent: 0, opacity: 1, duration: DUR, ease: EASE_TRANSLATE,
            clearProps: 'xPercent,opacity,visibility' });
        }
        if (navContact) {
          tl.to(navContact, { xPercent: 0, opacity: 1, duration: DUR, ease: EASE_TRANSLATE,
            clearProps: 'xPercent,opacity,visibility' });
        }
      }

      // --- Step text SplitText entrance ---
      if (stepTextEl && gsap && SplitText) {
        try {
          const split = new SplitText(stepTextEl, {
            type: 'words,lines',
            linesClass: 'home-intro-line',
            wordsClass: 'home-intro-word'
          });
          if (split.lines) split.lines.forEach(l => { l.style.overflow = 'hidden'; });
          if (split.words?.length) gsap.set(split.words, { yPercent: 100, opacity: 0 });
          gsap.to(stepTextEl, { opacity: 1, duration: 0.4, ease: 'power4.out' });
          gsap.to(split.words, { yPercent: 0, duration: 0.8, ease: 'expo.out', stagger: 0.15 });
          gsap.to(split.words, { opacity: 1, duration: 0.8, ease: 'linear', stagger: 0.15 }, '<');
        } catch (e) {
          stepTextEl.style.opacity = '1';
        }
      } else if (stepTextEl) {
        stepTextEl.style.opacity = '1';
      }
    } else {
      // Skip path (Barba re-entry): land in final state instantly.
      if (gsap) {
        [navAbout, navContact].filter(Boolean).forEach(el => {
          gsap.set(el, { clearProps: 'xPercent,opacity,visibility' });
        });
      }
      if (stepTextEl) {
        if (gsap) gsap.set(stepTextEl, { clearProps: 'opacity,visibility' });
        else stepTextEl.style.opacity = '1';
      }
    }

    if (window.RHP?.workDial?.setIntroComplete) window.RHP.workDial.setIntroComplete();
    if (window.RHP?.workDial?.setAttractionEnabled) window.RHP.workDial.setAttractionEnabled(true);
    if (window.RHP?.workDial?.setInteractionUnlocked) window.RHP.workDial.setInteractionUnlocked(true);

    if (window.RHP?.lenis?.stop) window.RHP.lenis.stop();
    if (window.RHP?.scroll?.lock) window.RHP.scroll.lock();
    redrawDialCanvas();
  }

  function onMorphComplete() {
    if (complete) return;
    complete = true;

    // Clean up logo text animation (logo will be hidden with .home-transition)
    _destroyLogoText();

    // Remove the small-state class so fallback (large) kicks in
    if (dialEl) dialEl.classList.remove('is-intro-small');

    // Clear any stale inline CSS vars left by the scrub timeline — inline
    // styles override the CSS cascade, so a stuck --dial-live-width would
    // prevent the large fallback from taking effect.
    if (dialEl) {
      dialEl.style.removeProperty('--dial-live-width');
      dialEl.style.removeProperty('--dial-live-height');
    }

    // Hide the intro overlay (.home-transition) so it doesn't sit on top
    const homeTransition = document.querySelector('.home-transition');
    if (homeTransition) homeTransition.style.display = 'none';

    // Hide the intro section so it no longer takes layout
    if (sectionEl && window.gsap) window.gsap.set(sectionEl, { display: 'none' });

    // Clear Flip transforms so elements return to CSS-driven layout
    if (window.gsap) {
      if (dialWrapper) window.gsap.set(dialWrapper, { clearProps: FLIP_CLEAR });
      if (logoEl) window.gsap.set(logoEl, { clearProps: FLIP_CLEAR });
    }

    // Unlock dial + scroll lock + add .rhp-home-ready + animate nav/step in.
    _applyCompleteState(true);

    DEBUG && console.log('[home-scroll-morph] complete');
    window.dispatchEvent(new CustomEvent('rhp:home-scroll-morph:complete'));
  }

  function onMorphReverse() {
    // User scrolled back up past the intro start — hide nav again via class
    // removal. Under normal CSS-locked conditions this branch is unreachable
    // (scroll is locked on morph complete), but kept for safety.
    complete = false;

    _getScope().classList.remove('rhp-home-ready');

    if (window.RHP?.workDial?.setInteractionUnlocked) {
      window.RHP.workDial.setInteractionUnlocked(false);
    }
    if (window.RHP?.workDial?.setAttractionEnabled) {
      window.RHP.workDial.setAttractionEnabled(false);
    }
    if (window.RHP?.scroll?.unlock) window.RHP.scroll.unlock();
    if (window.RHP?.lenis?.start) window.RHP.lenis.start();
  }

  function skipToEnd(container) {
    // Called on Barba re-entry to home. Land in dial-large state without animation.
    _queryDOMRefs(container);

    // Ensure no small-state class lingers
    if (dialEl) dialEl.classList.remove('is-intro-small');
    // Clear stale inline CSS vars
    if (dialEl) {
      dialEl.style.removeProperty('--dial-live-width');
      dialEl.style.removeProperty('--dial-live-height');
    }

    // Hide the intro overlay and section
    const homeTransition = document.querySelector('.home-transition');
    if (homeTransition) homeTransition.style.display = 'none';
    if (sectionEl) sectionEl.style.display = 'none';

    // Clear any Flip transforms on dialWrapper and logoEl
    if (window.gsap) {
      if (dialWrapper) window.gsap.set(dialWrapper, { clearProps: FLIP_CLEAR });
      if (logoEl) window.gsap.set(logoEl, { clearProps: FLIP_CLEAR });
    }

    // Step text was inline-opacity-0 on first load — clear any leftover
    // inline style so the class toggle / CSS owns the final state.
    if (stepTextEl && window.gsap) {
      window.gsap.set(stepTextEl, { clearProps: 'opacity' });
    }

    complete = true;
    initialised = true; // block double-init from view hook
    _applyCompleteState(false);
  }

  function replay() {
    // Nav logo click on home: scroll to top, reverse timeline, re-show intro section.
    if (!_resizeHandler) return;
    complete = false;

    // Re-show the intro overlay and section
    const homeTransition = document.querySelector('.home-transition');
    if (homeTransition) homeTransition.style.display = '';
    if (sectionEl) sectionEl.style.display = '';

    // Remove .rhp-home-ready so nav items + step text cascade back to hidden
    _getScope().classList.remove('rhp-home-ready');

    // Re-apply small-state class (hides main dial via CSS opacity: 0)
    if (dialEl) dialEl.classList.add('is-intro-small');

    // Reset dial/logo to start positions
    if (window.gsap) {
      if (dialWrapper) window.gsap.set(dialWrapper, { clearProps: FLIP_CLEAR });
      if (logoEl) window.gsap.set(logoEl, { clearProps: FLIP_CLEAR });
    }

    // Re-hide step text immediately — the rebuilt scrub will fade it back in.
    if (stepTextEl && window.gsap) window.gsap.set(stepTextEl, { opacity: 0 });

    // Re-init logo text animation and fade logo back in
    _splitLogoText();
    if (window.gsap && logoEl) window.gsap.to(logoEl, { opacity: 1, duration: 0.6, ease: 'power2.out' });
    if (_isDesktop()) _initLogoHover();

    // Rebuild the scrub timeline so new rects reflect current layout.
    _resizeHandler();

    if (window.RHP?.workDial?.setInteractionUnlocked) {
      window.RHP.workDial.setInteractionUnlocked(false);
    }
    if (window.RHP?.workDial?.setAttractionEnabled) {
      window.RHP.workDial.setAttractionEnabled(false);
    }

    if (window.RHP?.scroll?.unlock) window.RHP.scroll.unlock();
    if (window.RHP?.lenis?.start) window.RHP.lenis.start();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function destroy() {
    _destroyLogoText();
    if (_resizeHandler) {
      window.removeEventListener('resize', _resizeHandler);
      _resizeHandler = null;
    }
    // Remove intro-small class if still present
    if (dialEl) dialEl.classList.remove('is-intro-small');
    // Clear Flip transforms on dialWrapper and logoEl if they exist
    if (window.gsap) {
      if (dialWrapper) window.gsap.set(dialWrapper, { clearProps: FLIP_CLEAR });
      if (logoEl) window.gsap.set(logoEl, { clearProps: FLIP_CLEAR });
    }
    _killScrub();
    if (ctx) { ctx.revert(); ctx = null; }
    initialised = false;
    complete = false;
  }

  window.RHP = window.RHP || {};
  window.RHP.homeScrollMorph = {
    init,
    destroy,
    skipToEnd,
    replay,
    get complete() { return complete; },
    version: VERSION
  };
})();
