/**
 * NEM Life — Method Cards Scroll-Triggered Reveal
 * "Doorbreek je patronen" 123 cards section.
 *
 * Desktop (>=992px): Cards stagger into view with generous spacing when the
 *   wrap scrolls into the viewport. Each card fades + slides up sequentially.
 * Mobile  (<992px):  Cards start slightly dimmed and brighten individually as
 *   the visitor scrolls to each one (no content is hidden, just muted).
 *
 * Requires: GSAP + ScrollTrigger (CDN-loaded).
 */
(() => {
  const DEBUG = false;
  const wrap = document.querySelector('.method-cars_wrap');
  if (!wrap) return;

  const items = gsap.utils.toArray(wrap.children);
  if (!items.length) return;

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  if (prefersReducedMotion) {
    DEBUG && console.log('[method-cards] reduced motion — skipping animation');
    return;
  }

  ScrollTrigger.matchMedia({
    /* ── Desktop: staggered reveal when wrap enters viewport ── */
    '(min-width: 992px)': function () {
      gsap.set(items, { opacity: 0, y: 30 });

      items.forEach((item, i) => {
        gsap.to(item, {
          opacity: 1,
          y: 0,
          duration: 1.2,
          delay: i * 1.5,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: wrap,
            start: 'top 80%',
            once: true,
          },
        });
      });

      DEBUG && console.log('[method-cards] desktop: stagger reveal registered');
    },

    /* ── Mobile: dim-to-bright per card on individual scroll ── */
    '(max-width: 991px)': function () {
      gsap.set(items, { opacity: 0.25 });

      items.forEach((item) => {
        gsap.to(item, {
          opacity: 1,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: item,
            start: 'bottom 95%',
          },
        });
      });

      DEBUG && console.log('[method-cards] mobile: dim-to-bright registered');
    },
  });
})();
