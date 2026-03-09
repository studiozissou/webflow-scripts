// Module: Quality Cards
// Project: Studio Zissou
// Deps: gsap, ScrollTrigger

const qualityCards = (() => {
  const DEBUG = false;

  let _initialized = false;
  let _ctx = null;

  const SELECTORS = {
    section: '[data-quality]',
    card: '[data-quality-card]',
    line: '[data-quality-line]',
    pin: '[data-quality-pin]',
    content: '[data-quality-content]',
  };

  const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Get the SVG stroke element (line or path) from a container. */
  const getSvgStrokeElement = (container) =>
    container.querySelector('line') || container.querySelector('path');

  /**
   * Set stroke-dasharray/dashoffset via gsap.set so ctx.revert() cleans up.
   * Hides the line by offsetting the full stroke length.
   */
  const hideLineForDraw = (lineEl) => {
    const stroke = getSvgStrokeElement(lineEl);
    if (!stroke || typeof stroke.getTotalLength !== 'function') return;
    const length = stroke.getTotalLength();
    window.gsap.set(stroke, {
      strokeDasharray: length,
      strokeDashoffset: length,
    });
  };

  /**
   * Build the GSAP timeline for a single card.
   * Returns the tween-populated timeline (caller positions it on the master).
   */
  const buildCardTimeline = (cardEl) => {
    const tl = window.gsap.timeline();

    const lineEl = cardEl.querySelector(SELECTORS.line);
    const pins = Array.from(cardEl.querySelectorAll(SELECTORS.pin));
    const contentEl = cardEl.querySelector(SELECTORS.content);

    // 1. Dashed line draws in
    if (lineEl) {
      const stroke = getSvgStrokeElement(lineEl);
      if (stroke) {
        tl.to(stroke, {
          strokeDashoffset: 0,
          duration: 0.4,
          ease: 'none',
        });
      }
    }

    // 2. Corner pins appear clockwise: TL, TR, BR, BL
    if (pins.length) {
      pins.forEach((pin, i) => {
        tl.to(
          pin,
          {
            scale: 1,
            opacity: 1,
            duration: 0.15,
            ease: 'back.out(2)',
          },
          `>-${i === 0 ? 0.1 : 0.08}`
        );
      });
    }

    // 3. Content fades in
    if (contentEl) {
      tl.to(
        contentEl,
        {
          opacity: 1,
          y: 0,
          duration: 0.3,
          ease: 'power2.out',
        },
        '>-0.1'
      );
    }

    return tl;
  };

  /**
   * Set all animated elements to their initial (hidden) states.
   */
  const setInitialStates = (cards) => {
    const { gsap } = window;

    cards.forEach((cardEl) => {
      const pins = cardEl.querySelectorAll(SELECTORS.pin);
      const contentEl = cardEl.querySelector(SELECTORS.content);

      gsap.set(pins, { scale: 0, opacity: 0, transformOrigin: 'center center' });

      if (contentEl) {
        gsap.set(contentEl, { opacity: 0, y: 12 });
      }

      const lineEl = cardEl.querySelector(SELECTORS.line);
      if (lineEl) {
        hideLineForDraw(lineEl);
      }
    });
  };

  /**
   * Show all elements in their final (revealed) state. Used for mobile and
   * reduced-motion contexts.
   */
  const showFinalState = (cards) => {
    const { gsap } = window;

    cards.forEach((cardEl) => {
      const pins = cardEl.querySelectorAll(SELECTORS.pin);
      const contentEl = cardEl.querySelector(SELECTORS.content);
      const lineEl = cardEl.querySelector(SELECTORS.line);

      gsap.set(pins, { scale: 1, opacity: 1 });

      if (contentEl) {
        gsap.set(contentEl, { opacity: 1, y: 0 });
      }

      if (lineEl) {
        const stroke = getSvgStrokeElement(lineEl);
        if (stroke && typeof stroke.getTotalLength === 'function') {
          const length = stroke.getTotalLength();
          gsap.set(stroke, { strokeDasharray: length, strokeDashoffset: 0 });
        }
      }
    });
  };

  const init = (container) => {
    if (_initialized) return;

    const { gsap, ScrollTrigger } = window;
    if (!gsap || !ScrollTrigger) {
      DEBUG && console.log('qualityCards: GSAP or ScrollTrigger not loaded');
      return;
    }

    const root = container || document;
    const sectionEl = root.querySelector(SELECTORS.section);
    if (!sectionEl) {
      DEBUG && console.log('qualityCards: section not found');
      return;
    }

    const cards = Array.from(sectionEl.querySelectorAll(SELECTORS.card));
    if (!cards.length) {
      DEBUG && console.log('qualityCards: no cards found');
      return;
    }

    _initialized = true;

    _ctx = gsap.context(() => {
      // Reduced motion: show final state unconditionally, no ScrollTrigger
      if (prefersReducedMotion()) {
        showFinalState(cards);
        return;
      }

      // matchMedia auto-reverts and re-initialises on breakpoint crossing
      ScrollTrigger.matchMedia({
        // Desktop/tablet: pinned scroll animation
        '(min-width: 768px)': () => {
          setInitialStates(cards);

          const masterTl = gsap.timeline({
            scrollTrigger: {
              trigger: sectionEl,
              pin: true,
              start: 'top top',
              end: '+=2000',
              scrub: 0.5,
            },
          });

          // Each card takes ~30% of timeline with ~5% overlap
          cards.forEach((cardEl, i) => {
            const cardTl = buildCardTimeline(cardEl);
            masterTl.add(cardTl, i * 0.25);
          });
        },

        // Mobile: show final state, no pin
        '(max-width: 767px)': () => {
          showFinalState(cards);
        },
      });
    }, sectionEl);
  };

  const destroy = () => {
    if (_ctx) {
      _ctx.revert();
      _ctx = null;
    }
    _initialized = false;
  };

  return { init, destroy };
})();
