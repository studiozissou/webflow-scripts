/* =========================================
   RHP — Custom Cursor System (Site-wide)
   - Data-attribute based cursor states
   - Barba-aware (re-init on enter, cleanup on leave)
   ========================================= */
(() => {
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
    }

    function init(container = document) {
      if (alive) return;
      if (isMobile()) return;

      alive = true;
      stateStack = ['dot'];
      currentState = 'dot';

      // Get cursor elements
      cursorDot = container.querySelector('.cursor_dot') || document.querySelector('.cursor_dot');
      cursorLabel = container.querySelector('.cursor_label') || document.querySelector('.cursor_label');
      cursorArrows = container.querySelector('.cursor_arrows') || document.querySelector('.cursor_arrows');

      if (!cursorDot) {
        console.warn('Cursor dot element not found');
        return;
      }

      // Reset to default state
      setCursorState('dot', null, false);

      // Mouse move handler
      const handleMouseMove = (e) => {
        if (!cursorDot) return;
        // Get current size to center the cursor
        const rect = cursorDot.getBoundingClientRect();
        const width = rect.width || parseFloat(getComputedStyle(cursorDot).width) || 16;
        const height = rect.height || parseFloat(getComputedStyle(cursorDot).height) || 16;
        cursorDot.style.transform = `translate3d(${e.clientX - width / 2}px, ${e.clientY - height / 2}px, 0)`;
      };

      // Mouse enter handler for elements with data-cursor
      const handleMouseEnter = (e) => {
        const element = e.target.closest('[data-cursor]');
        if (!element) return;

        const cursorType = element.getAttribute('data-cursor');
        const cursorText = element.getAttribute('data-cursor-text') || null;
        const cursorSvgs = element.getAttribute('data-cursor-svgs');

        if (cursorType) {
          stateStack.push(currentState);
          setCursorState(cursorType, cursorText, cursorSvgs === 'arrows' || cursorSvgs === 'true');
        }
      };

      // Mouse leave handler
      const handleMouseLeave = (e) => {
        const element = e.target.closest('[data-cursor]');
        if (!element) return;

        // Restore previous state from stack
        if (stateStack.length > 1) {
          stateStack.pop();
          const prevState = stateStack[stateStack.length - 1];
          setCursorState(prevState, null, false);
        } else {
          setCursorState('dot', null, false);
        }
      };

      // Attach event listeners
      document.addEventListener('mousemove', handleMouseMove);
      cleanup.push(() => document.removeEventListener('mousemove', handleMouseMove));

      // Use event delegation for data-cursor elements
      container.addEventListener('mouseenter', handleMouseEnter, true);
      container.addEventListener('mouseleave', handleMouseLeave, true);
      cleanup.push(() => {
        container.removeEventListener('mouseenter', handleMouseEnter, true);
        container.removeEventListener('mouseleave', handleMouseLeave, true);
      });

      // Hide default cursor
      document.body.style.cursor = 'none';
      cleanup.push(() => {
        document.body.style.cursor = '';
      });
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
        .trim() || '#ff8200';

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

    return {
      init,
      destroy: stop
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
    RHP.cursor?.init();
  });

  // Re-initialize on Barba transitions
  window.addEventListener('rhp:barba:afterenter', (e) => {
    if (e.detail && e.detail.container) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        RHP.cursor?.destroy();
        RHP.cursor?.init(e.detail.container);
      }, 50);
    }
  });
})();
