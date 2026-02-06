/* =========================================
   RHP — Orchestrator (Barba conductor)
   + Scroll lock only on home
   + Lenis on all non-home pages
   ========================================= */
(() => {
  window.RHP = window.RHP || {};
  const RHP = window.RHP;

  // If cursor.js didn't load (missing from init or error), stub so RHP.cursor.version shows 'not-loaded'
  if (typeof RHP.cursor === 'undefined') {
    RHP.cursor = { version: 'not-loaded', init: function() {}, destroy: function() {}, refresh: function() {}, setPosition: function() {}, setState: function() {} };
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
     Contact pullout (GSAP open/close)
     - .nav_contact-link click → pullout opacity 1 (linear 0.5s)
     - Click outside pullout or on close button → pullout opacity 0 (linear 0.5s)
     - Add class .nav_contact-close to your close button in Webflow
     - Uses event delegation so link/pullout can appear after init (e.g. symbols)
     ----------------------------- */
  function initContactPullout() {
    const gsap = window.gsap;
    if (!gsap) {
      console.warn('RHP contact pullout: GSAP not found. Enable GSAP in Webflow Project Settings.');
      return;
    }

    let isOpen = false;
    let pulloutEl = null;

    function getPullout() {
      if (pulloutEl && document.contains(pulloutEl)) return pulloutEl;
      pulloutEl = document.querySelector('.nav_contact-pullout');
      return pulloutEl;
    }

    function openPullout() {
      const pullout = getPullout();
      if (!pullout) {
        console.warn('RHP contact pullout: .nav_contact-pullout not found in DOM. Add this class to your pullout panel in Webflow.');
        return;
      }
      isOpen = true;
      pullout.style.pointerEvents = 'auto';
      gsap.to(pullout, { opacity: 1, duration: 0.5, ease: 'none' });
    }

    function closePullout() {
      const pullout = getPullout();
      if (!pullout) return;
      isOpen = false;
      gsap.to(pullout, {
        opacity: 0,
        duration: 0.5,
        ease: 'none',
        onComplete: () => {
          pullout.style.pointerEvents = 'none';
        }
      });
    }

    // Init: hide pullout if it exists so first open animates correctly
    function setInitialState() {
      const pullout = document.querySelector('.nav_contact-pullout');
      if (pullout) {
        gsap.set(pullout, { opacity: 0 });
        pullout.style.pointerEvents = 'none';
      }
    }

    // Open on .nav_contact-link click (delegated – works if link is in symbol or added later)
    document.addEventListener('click', (e) => {
      const link = e.target.closest('.nav_contact-link');
      if (!link) return;
      e.preventDefault();
      e.stopPropagation();
      openPullout();
    }, true);

    // Close when clicking outside pullout or on .nav_contact-close (don't close when opening via link)
    document.addEventListener('click', (e) => {
      if (e.target.closest('.nav_contact-link')) return;
      if (!isOpen) return;
      const pullout = getPullout();
      if (!pullout) return;
      const inPullout = pullout.contains(e.target);
      const isCloseBtn = e.target.closest('.nav_contact-close');
      if (!inPullout || isCloseBtn) closePullout();
    }, true);

    // Run after a short delay so Webflow DOM (and symbols) are ready
    setTimeout(setInitialState, 100);
  }

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

  ready(() => {
    initBarba();
    initContactPullout();
  });
})();
