/**
 * NEM Life — Method Cars Staggered Fade-In
 * Children of .method-cars_wrap fade in on scroll, staggered, opacity only.
 * Requires: GSAP + ScrollTrigger (CDN-loaded).
 */
(() => {
  const wrap = document.querySelector('.method-cars_wrap');
  if (!wrap) return;

  const items = wrap.children;
  if (!items.length) return;

  gsap.set(items, { opacity: 0 });

  gsap.to(items, {
    opacity: 1,
    duration: 1.5,
    stagger: 0.75,
    ease: 'power1.out',
    scrollTrigger: {
      trigger: wrap,
      start: 'top 85%',
    },
  });
})();
