/* =========================================
   RHP — Custom Cursor System (Site-wide)
   - Data-attribute based cursor states
   - Barba-aware (re-init on enter, cleanup on leave)
   ========================================= */
(() => {
  const CURSOR_VERSION = '2026.2.18.1'; // bump when you deploy; check in console: RHP.cursor.version
  const CURSOR_TRANSITION_DURATION = 0.25; // seconds for state changes; check in console: RHP.cursor.transitionDuration

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
    let cursorWrapper = null; // when present, we position this (6rem) so dot can resize without jumping
    let cursorDot = null;
    let cursorLabel = null;
    let cursorArrows = null;
    let currentState = 'dot';
    let stateStack = ['dot']; // Stack to track state history
    let externalControl = false; // When true, work-dial controls cursor state; we still run position
    let lockedToDot = false; // When true, cursor stays white dot (until video plays on home intro)
    let lastMouseX = -9999;
    let lastMouseY = -9999;

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
      cursorWrapper = scope.querySelector('.cursor_dot-wrapper') || document.querySelector('.cursor_dot-wrapper');
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

      // Resolve element under cursor (used for both move and hover; cursor has pointer-events:none)
      const getElementUnderCursor = (clientX, clientY) => {
        const el = document.elementFromPoint(clientX, clientY);
        return el?.closest?.('[data-cursor]') || null;
      };

      // Always update cursor position on mousemove (nav, dial, all areas)
      const handleMouseMove = (e) => {
        if (e.clientX === lastMouseX && e.clientY === lastMouseY) return;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        // If cursor node was replaced by Barba, re-query so we update the visible one
        if (!cursorDot || !document.body.contains(cursorDot)) {
          cursorWrapper = document.querySelector('.cursor_dot-wrapper');
          cursorDot = document.querySelector('.cursor_dot');
          cursorLabel = document.querySelector('.cursor_label');
          cursorArrows = document.querySelector('.cursor_arrows');
          if (!cursorDot) return;
        }
        applyCursorPosition();

        // Sync cursor state from element under cursor (works even when mouseover doesn't fire)
        const under = getElementUnderCursor(e.clientX, e.clientY);
        const overDial = externalControl && under?.closest?.('.dial_component');
        if (!overDial && under !== currentHoveredElement) {
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
      };

      document.addEventListener('mousemove', handleMouseMove, { passive: true, capture: true });
      window.addEventListener('mousemove', handleMouseMove, { passive: true, capture: true });
      cleanup.push(() => {
        document.removeEventListener('mousemove', handleMouseMove, { capture: true });
        window.removeEventListener('mousemove', handleMouseMove, { capture: true });
      });

      // After Barba transition, cursor stays at last position; re-apply so it doesn't appear stuck
      if (lastMouseX > -9999 && lastMouseY > -9999) applyCursorPosition();

      // Track currently hovered element with data-cursor
      let currentHoveredElement = null;

      // Helper to restore previous state
      const restorePreviousState = () => {
        if (stateStack.length > 1) {
          stateStack.pop();
          const prevState = stateStack[stateStack.length - 1];
          setCursorState(prevState, null, false);
        } else {
          setCursorState('dot', null, false);
        }
      };

      // Mouse over handler for elements with data-cursor
      const handleMouseOver = (e) => {
        const element = getElementUnderCursor(e.clientX, e.clientY) || e.target?.closest?.('[data-cursor]');
        
        // If no element with data-cursor, restore default if we were hovering one
        if (!element) {
          if (currentHoveredElement) {
            currentHoveredElement = null;
            restorePreviousState();
          }
          return;
        }

        // If already hovering this exact element, do nothing
        if (element === currentHoveredElement) return;

        // Check relationship between current and new element
        const isMovingToChild = currentHoveredElement && 
                                 currentHoveredElement.contains && 
                                 currentHoveredElement.contains(element);
        const isMovingToParent = currentHoveredElement && 
                                  element.contains && 
                                  element.contains(currentHoveredElement);

        // If moving from parent to child: save parent state to stack, then apply child state
        if (isMovingToChild) {
          stateStack.push(currentState);
        }
        // If moving from child to parent: pop child state, restore parent state
        else if (isMovingToParent) {
          if (stateStack.length > 1) {
            stateStack.pop(); // Remove child state
            const parentState = stateStack[stateStack.length - 1];
            currentHoveredElement = element;
            setCursorState(parentState, null, false);
            return;
          }
        }
        // If moving to a completely different element (sibling or unrelated)
        else if (currentHoveredElement) {
          restorePreviousState();
        }

        // Now enter the new element
        currentHoveredElement = element;
        const cursorType = element.getAttribute('data-cursor');
        const cursorText = element.getAttribute('data-cursor-text') || null;
        const cursorSvgs = element.getAttribute('data-cursor-svgs');

        if (cursorType) {
          // Only push to stack if not moving from parent to child (already pushed above)
          if (!isMovingToChild) {
            stateStack.push(currentState);
          }
          setCursorState(cursorType, cursorText, cursorSvgs === 'arrows' || cursorSvgs === 'true');
        }
      };

      // Mouse out handler
      const handleMouseOut = (e) => {
        const elementUnderCursor = getElementUnderCursor(e.clientX, e.clientY);
        const element = e.target?.closest?.('[data-cursor]') || elementUnderCursor;
        
        // If we're not leaving the currently hovered element, ignore
        if (!element || element !== currentHoveredElement) return;

        // Check where we're moving to
        const relatedElement = elementUnderCursor || e.relatedTarget?.closest?.('[data-cursor]');
        
        if (relatedElement) {
          // Moving to another element with data-cursor
          if (relatedElement === element) {
            // Moving to a child of the same element, don't reset
            return;
          } else if (element.contains && element.contains(relatedElement)) {
            // Moving from parent to child - child will handle its own state in mouseover
            // Don't reset here, let mouseover handle the transition
            return;
          } else if (relatedElement.contains && relatedElement.contains(element)) {
            // Moving from child to parent - restore parent state
            currentHoveredElement = null;
            restorePreviousState();
            return;
          }
        }

        // Actually leaving the element (moving to area without data-cursor)
        currentHoveredElement = null;
        restorePreviousState();
      };

      // Attach to both document and window so hover state works everywhere (nav, dial, content)
      document.addEventListener('mouseover', handleMouseOver, true);
      document.addEventListener('mouseout', handleMouseOut, true);
      window.addEventListener('mouseover', handleMouseOver, true);
      window.addEventListener('mouseout', handleMouseOut, true);
      cleanup.push(() => {
        document.removeEventListener('mouseover', handleMouseOver, true);
        document.removeEventListener('mouseout', handleMouseOut, true);
        window.removeEventListener('mouseover', handleMouseOver, true);
        window.removeEventListener('mouseout', handleMouseOut, true);
        currentHoveredElement = null;
      });

      // Hide default cursor
      document.body.style.cursor = 'none';
      cleanup.push(() => {
        document.body.style.cursor = '';
      });
    }

    // Re-apply position so centre stays at (lastMouseX, lastMouseY). When wrapper exists we position it (fixed 6rem) so dot resizing doesn't jump.
    function applyCursorPosition() {
      if (cursorWrapper) {
        const rect = cursorWrapper.getBoundingClientRect();
        const w = rect.width || parseFloat(getComputedStyle(cursorWrapper).width) || 96;
        const h = rect.height || parseFloat(getComputedStyle(cursorWrapper).height) || 96;
        cursorWrapper.style.transform = `translate3d(${lastMouseX - w / 2}px, ${lastMouseY - h / 2}px, 0)`;
      } else if (cursorDot) {
        const rect = cursorDot.getBoundingClientRect();
        const w = rect.width || parseFloat(getComputedStyle(cursorDot).width) || 16;
        const h = rect.height || parseFloat(getComputedStyle(cursorDot).height) || 16;
        cursorDot.style.transform = `translate3d(${lastMouseX - w / 2}px, ${lastMouseY - h / 2}px, 0)`;
      }
    }

    // Public API: Set cursor position (for work-dial on homepage)
    function setPosition(x, y) {
      if (!alive || (!cursorWrapper && !cursorDot)) return;
      lastMouseX = x;
      lastMouseY = y;
      applyCursorPosition();
    }

    // Public API: Set cursor state programmatically (for work-dial's play state)
    function setState(type, text, showArrows) {
      if (!alive) return;
      if (lockedToDot && type !== 'dot') return;
      setCursorState(type, text, showArrows);
    }

    // Public API: Lock cursor to white dot (home intro: until video plays)
    function setLockedToDot(locked) {
      const wasLocked = lockedToDot;
      lockedToDot = !!locked;
      if (lockedToDot && currentState !== 'dot') {
        setCursorState('dot', null, false);
      } else if (wasLocked && !lockedToDot && lastMouseX > -9999 && lastMouseY > -9999) {
        syncStateFromPosition();
      }
    }

    function syncStateFromPosition() {
      if (!alive || !cursorDot) return;
      const el = document.elementFromPoint(lastMouseX, lastMouseY);
      const under = el?.closest?.('[data-cursor]') || null;
      const overDial = externalControl && under?.closest?.('.dial_component');
      if (overDial) {
        const target = el || document.body;
        target.dispatchEvent(new PointerEvent('pointermove', { clientX: lastMouseX, clientY: lastMouseY, bubbles: true }));
      } else if (under) {
        const cursorType = under.getAttribute('data-cursor');
        const cursorText = under.getAttribute('data-cursor-text') || null;
        const cursorSvgs = under.getAttribute('data-cursor-svgs');
        if (cursorType) {
          setCursorState(cursorType, cursorText, cursorSvgs === 'arrows' || cursorSvgs === 'true');
        }
      } else {
        setCursorState('dot', null, false);
      }
    }

    function setCursorState(type, text, showArrows) {
      if (!cursorDot || !alive) return;
      if (lockedToDot && type !== 'dot') return;
      if (currentState === type && !text && !showArrows) return;

      currentState = type;
      const gsap = window.gsap;
      const reduced = prefersReduced();
      const duration = reduced ? 0 : CURSOR_TRANSITION_DURATION;
      const ease = 'power3.out';

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

    // Refresh cursor element refs after Barba (never remove mousemove — just point at new DOM node)
    function refresh() {
      if (!alive) return;
      const wrapper = document.querySelector('[data-barba="wrapper"]') || document.body;
      cursorWrapper = wrapper.querySelector('.cursor_dot-wrapper') || document.querySelector('.cursor_dot-wrapper');
      const nextDot = wrapper.querySelector('.cursor_dot') || document.querySelector('.cursor_dot');
      const nextLabel = wrapper.querySelector('.cursor_label') || document.querySelector('.cursor_label');
      const nextArrows = wrapper.querySelector('.cursor_arrows') || document.querySelector('.cursor_arrows');
      if (!nextDot) return;
      cursorDot = nextDot;
      cursorLabel = nextLabel;
      cursorArrows = nextArrows;
      setCursorState(currentState, null, false);
      if (lastMouseX > -9999 && lastMouseY > -9999) applyCursorPosition();
    }

    return {
      version: CURSOR_VERSION,
      transitionDuration: CURSOR_TRANSITION_DURATION,
      init,
      destroy: stop,
      refresh,
      setPosition,
      setState,
      setLockedToDot,
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
