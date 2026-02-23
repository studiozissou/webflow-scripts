/* =========================================
   RHP — Case Study Earth Image Parallax
   Scroll-linked parallax on .earth-image: moves down subtly on scroll down, up on scroll up.
   Parallax amount is configurable per screen breakpoint (edit PARALLAX_Y below).
   ========================================= */
(() => {
  const VERSION = '2026.2.23.1';
  window.RHP = window.RHP || {};
  const RHP = window.RHP;

  /**
   * Total vertical movement (px) over full scroll. Edit per breakpoint to taste.
   * Keys: default (> 991px), then max-width breakpoints in px.
   */
  const PARALLAX_Y = {
    default: 320,
    991: 240,
    767: 160,
    479: 120
  };

  function getParallaxAmount() {
    if (typeof window.matchMedia === 'undefined') return PARALLAX_Y.default;
    if (window.matchMedia('(max-width: 479px)').matches) return PARALLAX_Y[479];
    if (window.matchMedia('(max-width: 767px)').matches) return PARALLAX_Y[767];
    if (window.matchMedia('(max-width: 991px)').matches) return PARALLAX_Y[991];
    return PARALLAX_Y.default;
  }

  const prefersReducedMotion = () =>
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  RHP.earthParallax = (() => {
    let active = false;
    let triggerInstance = null;
    let refreshHandler = null;

    function init(container) {
      const gsap = window.gsap;
      const ScrollTrigger = window.ScrollTrigger;
      if (!gsap || !ScrollTrigger || prefersReducedMotion()) return;
      if (active) return;

      const earthEl = container?.querySelector?.('.earth-image') || document.querySelector('.earth-image');
      if (!earthEl) return;

      const wrapper =
        container?.querySelector?.('[data-case-scroll-wrapper]') ||
        container?.querySelector?.('.case-scroll-wrapper') ||
        null;
      const content =
        wrapper?.querySelector?.('[data-case-scroll-content]') ||
        wrapper?.firstElementChild ||
        null;

      const scroller = wrapper || undefined;

      gsap.set(earthEl, { force3D: true });

      // Start when image enters viewport (top hits bottom of view), end when it leaves (bottom hits top)
      triggerInstance = ScrollTrigger.create({
        scroller: scroller || undefined,
        trigger: earthEl,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
        onUpdate: (self) => {
          const amount = getParallaxAmount();
          gsap.set(earthEl, { y: self.progress * amount });
        }
      });

      refreshHandler = function() {
        if (!active || !triggerInstance) return;
        const amount = getParallaxAmount();
        const p = triggerInstance.progress;
        gsap.set(earthEl, { y: p * amount });
      };
      ScrollTrigger.addEventListener('refresh', refreshHandler);

      active = true;
    }

    function destroy() {
      if (!active) return;
      if (refreshHandler && typeof window.ScrollTrigger !== 'undefined') {
        window.ScrollTrigger.removeEventListener('refresh', refreshHandler);
        refreshHandler = null;
      }
      if (triggerInstance) {
        triggerInstance.kill();
        triggerInstance = null;
      }
      const earthEl = document.querySelector('.earth-image');
      if (earthEl && window.gsap) window.gsap.set(earthEl, { clearProps: 'y' });
      active = false;
    }

    return {
      version: VERSION,
      init,
      destroy,
      getParallaxAmount
    };
  })();
})();
