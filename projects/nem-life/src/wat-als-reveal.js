/**
 * NEM Life — "Wat als er niets verandert?" Scroll Reveal
 * Replaces the desktop hover interaction with a unified scroll-reveal that
 * matches the existing mobile behaviour: images reveal one by one as the
 * visitor scrolls through the section.
 *
 * Markup contract (add in Webflow Designer):
 *   Wrapper:  [data-animate="wat-als"]
 *   Items:    direct children of the wrapper (each containing an image)
 *
 * Each item starts muted (dimmed + desaturated) and transitions to full
 * colour/brightness as it enters the viewport.
 *
 * Requires: GSAP + ScrollTrigger (CDN-loaded).
 */
(() => {
  const DEBUG = false;
  const wrap = document.querySelector('[data-animate="wat-als"]');
  if (!wrap) return;

  const items = gsap.utils.toArray(wrap.children);
  if (!items.length) return;

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  if (prefersReducedMotion) {
    DEBUG && console.log('[wat-als] reduced motion — skipping animation');
    return;
  }

  /* Start each item dimmed */
  gsap.set(items, { opacity: 0.3, filter: 'saturate(0.4)' });

  items.forEach((item) => {
    gsap.to(item, {
      opacity: 1,
      filter: 'saturate(1)',
      duration: 0.8,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: item,
        start: 'top 80%',
      },
    });
  });

  DEBUG && console.log('[wat-als] scroll reveal registered for', items.length, 'items');
})();
