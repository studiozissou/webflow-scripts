/* =========================================
   RHP — Custom Cursor System (Site-wide)
   - Data-attribute based cursor states
   - Barba-aware (re-init on enter, cleanup on leave)
   ========================================= */
(() => {
  const CURSOR_VERSION = '2026.2.6.2'; // bump when you deploy; check in console: RHP.cursor.version

  window.RHP = window.RHP || {};
  const RHP = window.RHP;

  // Check if device is mobile/touch
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches);
  };

  // Check for reduced motion preference
  const prefersReduced = () => {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };

  RHP.cursor = (() => {
    let alive = false;
    let cleanup = [];
    let rafId = 0;
    let cursorDot = null;
    let cursorLabel = null;
    let cursorArrows = null;
    let currentState = 'dot';
    let stateStack = ['dot']; // Stack to track state history
    let externalControl = false; // When true, work-dial controls cursor state; we still run position
    let lastMouseX = -9999;
    let lastMouseY = -9999;

    const DOT_PX = 16;
    const LARGE_PX = 96;
    function getCursorSizePx() {
      return currentState === 'dot' ? { w: DOT_PX, h: DOT_PX } : { w: LARGE_PX, h: LARGE_PX };
    }
    function applyPosition(x, y) {
      if (!cursorDot || !document.body.contains(cursorDot)) return;
      const { w, h } = getCursorSizePx();
      cursorDot.style.transform = `translate3d(${x - w / 2}px, ${y - h / 2}px, 0)`;
    }

    function stop() {
      if (!alive) return;
      alive = false;

      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }

      cleanup.forEach(fn => {
        try { fn(); } catch (e) { console.error('Cursor cleanup error:', e); }
      });
      cleanup = [];
      externalControl = false;
    }

    function init(container = document, options = {}) {
      if (alive) return;
      if (isMobile()) return;

      alive = true;
      stateStack = ['dot'];
      currentState = 'dot';
      externalControl = options.externalControl || false;

      // Cursor and nav are outside [data-barba=container], wrapper is body with data-barba="wrapper"
      const wrapper = document.querySelector('[data-barba="wrapper"]') || document.body;
      const scope = wrapper;
      cursorDot = scope.querySelector('.cursor_dot') || document.querySelector('.cursor_dot');
      cursorLabel = scope.querySelector('.cursor_label') || document.querySelector('.cursor_label');
      cursorArrows = scope.querySelector('.cursor_arrows') || document.querySelector('.cursor_arrows');

      if (!cursorDot) {
        alive = false;
        // Retry in case cursor is in a symbol or renders after DOMContentLoaded
        const retry = [50, 150, 350];
        retry.forEach((ms, i) => {
          setTimeout(() => {
            if (alive) return;
            RHP.cursor?.init(document, options);
          }, ms);
        });
        return;
      }

      // Reset to default state
      setCursorState('dot', null, false);

      // Resolve element under cursor (cursor has pointer-events:none)
      const getElementUnderCursor = (clientX, clientY) => {
        const el = document.elementFromPoint(clientX, clientY);
        return el?.closest?.('[data-cursor]') || null;
      };

      let positionRaf = 0;
      let pendingX = -9999;
      let pendingY = -9999;
      let lastUnderCursor = null;
      let currentHoveredElement = null;

      const onPositionRaf = () => {
        positionRaf = 0;
        if (pendingX > -9999) {
          applyPosition(pendingX, pendingY);
          // Sync state once per frame from element under cursor (2-frame stability to avoid boundary flicker)
          const under = getElementUnderCursor(pendingX, pendingY);
          const overDial = externalControl && under?.closest?.('.dial_component');
          if (!overDial) {
            if (under !== lastUnderCursor) {
              lastUnderCursor = under;
            } else {
              // Same element for 2 consecutive frames — commit state
              if (under !== currentHoveredElement) {
                currentHoveredElement = under;
                if (under) {
                  const cursorType = under.getAttribute('data-cursor');
                  const cursorText = under.getAttribute('data-cursor-text') || null;
                  const cursorSvgs = under.getAttribute('data-cursor-svgs');
                  if (cursorType) {
                    stateStack = [stateStack[0] || 'dot'];
                    stateStack.push(currentState);
                    setCursorState(cursorType, cursorText, cursorSvgs === 'arrows' || cursorSvgs === 'true');
                  }
                } else {
                  stateStack = ['dot'];
                  setCursorState('dot', null, false);
                }
              }
            }
          } else {
            lastUnderCursor = null;
          }
        }
      };

      // Single mousemove listener; position and state both updated in rAF (one place, once per frame)
      const handleMouseMove = (e) => {
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        if (!cursorDot || !document.body.contains(cursorDot)) {
          cursorDot = document.querySelector('.cursor_dot');
          cursorLabel = document.querySelector('.cursor_label');
          cursorArrows = document.querySelector('.cursor_arrows');
          if (!cursorDot) return;
        }
        pendingX = e.clientX;
        pendingY = e.clientY;
        if (!positionRaf) positionRaf = requestAnimationFrame(onPositionRaf);
      };

      document.addEventListener('mousemove', handleMouseMove, { passive: true, capture: true });
      cleanup.push(() => {
        document.removeEventListener('mousemove', handleMouseMove, { capture: true });
        if (positionRaf) cancelAnimationFrame(positionRaf);
      });

      if (lastMouseX > -9999 && lastMouseY > -9999) applyPosition(lastMouseX, lastMouseY);

      // State is updated only from mousemove → rAF (elementFromPoint + 2-frame stability). No mouseover/mouseout
      // so we avoid two competing sources of state that caused flicker when moving slowly.

      // Hide default cursor
      document.body.style.cursor = 'none';
      cleanup.push(() => {
        document.body.style.cursor = '';
      });
    }

    // Public API: Update stored position only (do not apply — single source is mousemove + rAF to avoid flicker)
    function setPosition(x, y) {
      if (!alive) return;
      lastMouseX = x;
      lastMouseY = y;
    }

    // Public API: Set cursor state programmatically (for work-dial's play state)
    function setState(type, text, showArrows) {
      if (!alive) return;
      setCursorState(type, text, showArrows);
    }

    function setCursorState(type, text, showArrows) {
      if (!cursorDot || !alive) return;
      if (currentState === type && !text && !showArrows) return;

      currentState = type;
      const gsap = window.gsap;
      const reduced = prefersReduced();
      const duration = reduced ? 0 : 0.3;
      const ease = 'power2.out';

      // Get CSS variable for orange color
      const orangeColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--_primitives---colors--orange')
        .trim() || '#fe5e00';

      switch (type) {
        case 'dot':
          // Default: solid white dot 1rem x 1rem, 1px border solid white
          if (gsap) {
            gsap.to(cursorDot, {
              duration,
              width: '1rem',
              height: '1rem',
              backgroundColor: '#ffffff',
              borderColor: '#ffffff',
              ease
            });
          } else {
            cursorDot.style.width = '1rem';
            cursorDot.style.height = '1rem';
            cursorDot.style.backgroundColor = '#ffffff';
            cursorDot.style.borderColor = '#ffffff';
          }
          if (cursorLabel) {
            if (gsap) {
              gsap.to(cursorLabel, { duration, opacity: 0, ease });
            } else {
              cursorLabel.style.opacity = '0';
            }
          }
          if (cursorArrows) {
            if (gsap) {
              gsap.to(cursorArrows, { duration, opacity: 0, ease });
            } else {
              cursorArrows.style.opacity = '0';
            }
          }
          break;

        case 'solid-orange':
          // Solid orange dot 6rem x 6rem, 1px border solid orange, show label
          if (gsap) {
            gsap.to(cursorDot, {
              duration,
              width: '6rem',
              height: '6rem',
              backgroundColor: orangeColor,
              borderColor: orangeColor,
              ease
            });
          } else {
            cursorDot.style.width = '6rem';
            cursorDot.style.height = '6rem';
            cursorDot.style.backgroundColor = orangeColor;
            cursorDot.style.borderColor = orangeColor;
          }
          if (cursorLabel) {
            if (text) cursorLabel.textContent = text;
            if (gsap) {
              gsap.to(cursorLabel, { duration, opacity: 1, ease });
            } else {
              cursorLabel.style.opacity = '1';
            }
          }
          if (cursorArrows) {
            if (gsap) {
              gsap.to(cursorArrows, { duration, opacity: 0, ease });
            } else {
              cursorArrows.style.opacity = '0';
            }
          }
          break;

        case 'arrow-orange-outline':
          // Transparent circle 6rem x 6rem, 1px border solid orange, show arrows (orange)
          if (gsap) {
            gsap.to(cursorDot, {
              duration,
              width: '6rem',
              height: '6rem',
              backgroundColor: 'transparent',
              borderColor: orangeColor,
              ease
            });
          } else {
            cursorDot.style.width = '6rem';
            cursorDot.style.height = '6rem';
            cursorDot.style.backgroundColor = 'transparent';
            cursorDot.style.borderColor = orangeColor;
          }
          if (cursorLabel) {
            if (gsap) {
              gsap.to(cursorLabel, { duration, opacity: 0, ease });
            } else {
              cursorLabel.style.opacity = '0';
            }
          }
          if (cursorArrows) {
            const svg = cursorArrows.querySelector('svg');
            if (svg) {
              // Set stroke color via currentColor (SVG uses stroke="currentColor")
              svg.style.color = orangeColor;
            }
            if (gsap) {
              gsap.to(cursorArrows, { duration, opacity: 1, ease });
            } else {
              cursorArrows.style.opacity = '1';
            }
          }
          break;

        case 'arrow-white-outline':
          // Transparent circle 6rem x 6rem, 1px border solid white, show arrows (white)
          if (gsap) {
            gsap.to(cursorDot, {
              duration,
              width: '6rem',
              height: '6rem',
              backgroundColor: 'transparent',
              borderColor: '#ffffff',
              ease
            });
          } else {
            cursorDot.style.width = '6rem';
            cursorDot.style.height = '6rem';
            cursorDot.style.backgroundColor = 'transparent';
            cursorDot.style.borderColor = '#ffffff';
          }
          if (cursorLabel) {
            if (gsap) {
              gsap.to(cursorLabel, { duration, opacity: 0, ease });
            } else {
              cursorLabel.style.opacity = '0';
            }
          }
          if (cursorArrows) {
            const svg = cursorArrows.querySelector('svg');
            if (svg) {
              // Set stroke color via currentColor (SVG uses stroke="currentColor")
              svg.style.color = '#ffffff';
            }
            if (gsap) {
              gsap.to(cursorArrows, { duration, opacity: 1, ease });
            } else {
              cursorArrows.style.opacity = '1';
            }
          }
          break;

        default:
          // Fallback to dot
          setCursorState('dot', null, false);
      }
    }

    // Refresh cursor element refs after Barba (never remove mousemove — just point at new DOM node)
    function refresh() {
      if (!alive) return;
      const wrapper = document.querySelector('[data-barba="wrapper"]') || document.body;
      const nextDot = wrapper.querySelector('.cursor_dot') || document.querySelector('.cursor_dot');
      const nextLabel = wrapper.querySelector('.cursor_label') || document.querySelector('.cursor_label');
      const nextArrows = wrapper.querySelector('.cursor_arrows') || document.querySelector('.cursor_arrows');
      if (!nextDot) return;
      cursorDot = nextDot;
      cursorLabel = nextLabel;
      cursorArrows = nextArrows;
      setCursorState(currentState, null, false);
      if (lastMouseX > -9999 && lastMouseY > -9999) applyPosition(lastMouseX, lastMouseY);
    }

    return {
      version: CURSOR_VERSION,
      init,
      destroy: stop,
      refresh,
      setPosition,
      setState,
      getCurrentState: () => currentState
    };
  })();

  // Auto-initialize on DOM ready
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

  ready(() => {
    // Check if we're on homepage (work-dial will control cursor position)
    const container = document.querySelector('[data-barba="container"]');
    const ns = container?.getAttribute('data-barba-namespace');
    const isHome = ns === 'home';
    
    RHP.cursor?.init(document, { externalControl: isHome });
  });

  // After Barba: refresh cursor refs so we point at the (possibly new) cursor node; never destroy so mousemove stays
  window.addEventListener('rhp:barba:afterenter', () => {
    setTimeout(() => RHP.cursor?.refresh?.(), 0);
    setTimeout(() => RHP.cursor?.refresh?.(), 100);
  });
})();
