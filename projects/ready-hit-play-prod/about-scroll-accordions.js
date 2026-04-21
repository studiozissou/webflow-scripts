(() => {
  'use strict';
  const VERSION = '2026.4.21.4';
  window.RHP = window.RHP || {};
  const RHP = window.RHP;

  RHP.aboutScrollAccordions = (() => {
    let active = false;
    let ctx = null;
    let triggers = [];
    let accordions = [];

    function init(container) {
      const gsap = window.gsap;
      const ScrollTrigger = window.ScrollTrigger;
      if (!gsap || !ScrollTrigger) return;
      if (active) return;
      if (!container) return;

      const blocks = container.querySelectorAll('.section_about-hero .accordion-block');
      if (!blocks.length) return;

      active = true;

      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (reducedMotion) {
        blocks.forEach((block) => {
          const content = block.querySelector('.accordion-content');
          if (!content) return;
          content.style.height = 'auto';
          content.style.opacity = '1';
          content.style.overflow = 'visible';
        });
        return;
      }

      ctx = gsap.context(() => {
        blocks.forEach((block) => {
          const title = block.querySelector('.accordion-title');
          const content = block.querySelector('.accordion-content');
          if (!title || !content) return;

          gsap.set(content, { height: 0, opacity: 0, overflow: 'hidden' });

          let isOpen = false;

          function open() {
            if (isOpen) return;
            isOpen = true;
            gsap.killTweensOf(content);
            gsap.to(content, {
              height: 'auto',
              opacity: 1,
              duration: 1.2,
              ease: 'power3.out',
              onComplete: () => {
                if (!content.isConnected) return;
                gsap.set(content, { overflow: 'visible' });
                RHP.lenis?.resize?.();
                ScrollTrigger.refresh();
                createTrigger(accordions.indexOf(data) + 1);
              }
            });
          }

          function close() {
            if (!isOpen) return;
            isOpen = false;
            gsap.killTweensOf(content);
            gsap.set(content, { overflow: 'hidden' });
            gsap.to(content, {
              height: 0,
              opacity: 0,
              duration: 1.2,
              ease: 'power3.out',
              onComplete: () => {
                if (!content.isConnected) return;
                RHP.lenis?.resize?.();
                ScrollTrigger.refresh();
              }
            });
          }

          const data = { title, content, open, close, trigger: null };
          accordions.push(data);
        });

        createTrigger(0);
      }, container);
    }

    let lastTriggerTime = 0;
    const THROTTLE_MS = 1000;

    function createTrigger(index) {
      if (index >= accordions.length) return;
      const data = accordions[index];
      if (data.trigger) return;

      const ScrollTrigger = window.ScrollTrigger;
      data.trigger = ScrollTrigger.create({
        trigger: data.title,
        start: 'top 50%',
        onEnter: () => {
          const now = performance.now();
          const wait = THROTTLE_MS - (now - lastTriggerTime);
          if (wait > 0) {
            setTimeout(() => { lastTriggerTime = performance.now(); data.open(); }, wait);
          } else {
            lastTriggerTime = now;
            data.open();
          }
        },
        onLeaveBack: () => data.close()
      });
      triggers.push(data.trigger);
    }

    function destroy() {
      if (!active) return;
      active = false;
      triggers.forEach(t => t.kill());
      triggers.length = 0;
      accordions.length = 0;
      if (ctx) { ctx.revert(); ctx = null; }
    }

    return { init, destroy, version: VERSION };
  })();
})();
