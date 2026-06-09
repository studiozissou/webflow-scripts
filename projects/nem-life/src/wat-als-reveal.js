/**
 * NEM Life — "Wat als er niets verandert?" Pain Cards
 *
 * Markup:
 *   .pains-cards [data-animate="wat-als"]
 *     .pain-card  (position: relative, overflow: clip)
 *       img.i-100
 *       .pain-card_info-wrap  (position: absolute, bottom: 0)
 *         .pain-card_gradient
 *         .pain-card_text-wrap > p
 *
 * Desktop (>=992px): Cards stagger into view when the wrap scrolls into the
 *   viewport. Each card fades + slides up sequentially (same pattern as the
 *   123 method cards).
 * Mobile  (<992px):  Cards start slightly dimmed and brighten individually as
 *   the visitor scrolls to each one (no content is hidden, just muted).
 *
 * Requires: GSAP + ScrollTrigger (CDN-loaded).
 */
(() => {
  const DEBUG = false;
  const wrap = document.querySelector('[data-animate="wat-als"]');
  if (!wrap) return;

  const cards = gsap.utils.toArray(wrap.querySelectorAll('.pain-card'));
  if (!cards.length) return;

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  if (prefersReducedMotion) {
    DEBUG && console.log('[wat-als] reduced motion — skipping');
    return;
  }

  ScrollTrigger.matchMedia({
    /* ── Desktop: staggered reveal when wrap enters viewport ── */
    '(min-width: 992px)': function () {
      gsap.set(cards, { opacity: 0, y: 30 });

      cards.forEach((card, i) => {
        gsap.to(card, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          delay: i * 0.75,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: wrap,
            start: 'top 80%',
            once: true,
          },
        });
      });

      DEBUG && console.log('[wat-als] desktop: stagger reveal registered');
    },

    /* ── Mobile: dim-to-bright per card on individual scroll ── */
    '(max-width: 991px)': function () {
      gsap.set(cards, { opacity: 0.25 });

      cards.forEach((card) => {
        gsap.to(card, {
          opacity: 1,
          duration: 0.4,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: card,
            start: 'bottom 95%',
          },
        });
      });

      DEBUG && console.log('[wat-als] mobile: dim-to-bright registered');
    },
  });
})();
