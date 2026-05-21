/**
 * NEM Life — Method Cards Staggered Fade-In
 * Children of .method-cars_wrap fade in individually as they scroll into view.
 * On desktop (cards side-by-side) they batch and stagger; on mobile (stacked)
 * each card triggers independently.
 * Requires: GSAP + ScrollTrigger (CDN-loaded).
 */
(() => {
  const wrap = document.querySelector('.method-cars_wrap');
  if (!wrap) return;

  const items = gsap.utils.toArray(wrap.children);
  if (!items.length) return;

  gsap.set(items, { opacity: 0 });

  ScrollTrigger.batch(items, {
    start: 'top 90%',
    once: true,
    onEnter: (batch) => {
      gsap.to(batch, {
        opacity: 1,
        duration: 1.8,
        stagger: 1,
        delay: 0.4,
        ease: 'power2.out',
      });
    },
  });
})();
