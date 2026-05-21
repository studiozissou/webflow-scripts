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

  items.forEach((item, i) => {
    gsap.to(item, {
      opacity: 1,
      duration: 1.8,
      delay: i * 1,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: wrap,
        start: 'top 85%',
      },
    });
  });
})();
