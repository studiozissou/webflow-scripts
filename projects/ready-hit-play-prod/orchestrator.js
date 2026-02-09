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
     - Nav lives in [data-barba="wrapper"] outside the container; scope all
       queries and listeners to the wrapper so we only touch the persistent nav.
     - .nav_contact-link click → pullout opacity 1 (linear 0.5s)
     - Click outside pullout or on close button → pullout opacity 0 (linear 0.5s)
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
    const DEBUG = true;

    function findPullout() {
      return scope.querySelector('.nav_contact-pullout') || scope.querySelector('[class*="nav_contact-pullout"]');
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
      pullout.style.pointerEvents = 'auto';
      pullout.style.visibility = 'visible';
      if (window.getComputedStyle(pullout).display === 'none') {
        pullout.style.display = 'block';
      }
      gsap.to(pullout, {
        xPercent: 0,
        opacity: 1,
        duration: 0.7,
        ease: 'expo.out'
      });
      if (DEBUG) console.log('RHP contact: pullout opening');
    }

    function closePullout() {
      const pullout = getPullout();
      if (!pullout) return;
      isOpen = false;
      gsap.to(pullout, {
        xPercent: 100,
        opacity: 0,
        duration: 0.7,
        ease: 'expo.out',
        onComplete: () => {
          pullout.style.pointerEvents = 'none';
          gsap.set(pullout, { xPercent: -100 });
        }
      });
    }

    function setInitialState() {
      const pullout = findPullout();
      const link = scope.querySelector('.nav_contact-link') || scope.querySelector('[class*="nav_contact-link"]');
      if (DEBUG) {
        console.log('RHP contact pullout (scope: wrapper):', { pullout: !!pullout, link: !!link });
      }
      if (pullout) {
        gsap.set(pullout, { xPercent: -100, opacity: 0 });
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

    scope.addEventListener('click', (e) => {
      if (findLink(e.target)) return;
      if (!isOpen) return;
      const pullout = getPullout();
      if (!pullout) return;
      const inPullout = pullout.contains(e.target);
      const isCloseBtn = e.target.closest('.nav_contact-close') || e.target.closest('[class*="nav_contact-close"]');
      if (!inPullout || isCloseBtn) closePullout();
    }, true);

    [100, 400, 800].forEach(function(ms) {
      setTimeout(setInitialState, ms);
    });

    RHP.openContactPullout = openPullout;
    RHP.contactPulloutCheck = function() {
      var scopeEl = document.querySelector('[data-barba="wrapper"]') || document.body;
      var pullout = scopeEl.querySelector('.nav_contact-pullout') || scopeEl.querySelector('[class*="nav_contact-pullout"]');
      var link = scopeEl.querySelector('.nav_contact-link') || scopeEl.querySelector('[class*="nav_contact-link"]');
      var gsapOk = typeof window.gsap !== 'undefined';
      var report = {
        gsap: gsapOk ? 'OK (' + (window.gsap && window.gsap.version) + ')' : 'MISSING',
        wrapper: !!document.querySelector('[data-barba="wrapper"]'),
        pullout: !!pullout,
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
