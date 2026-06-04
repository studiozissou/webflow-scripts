/**
 * NEM Life — "Wat als er niets verandert?" Pain Cards
 *
 * Markup:
 *   .pains-cards [data-animate="wat-als"]
 *     .pain-card  (position: relative, overflow: clip)  [data-w-id stripped]
 *       img.i-100
 *       .pain-card_info-wrap  (position: absolute, bottom: 0)
 *         .pain-card_gradient
 *         .pain-card_text-wrap > p
 *
 * Desktop (>=992px):
 *   1. Images start dimmed, content hidden.
 *   2. Scroll-triggered 1-2-3 stagger: image brightens + content fades in.
 *   3. After intro finishes, content fades back out and hover takes over.
 *   4. Hover locked during intro animation.
 *
 * Mobile (<992px):
 *   One active card at a time. Trigger: card top–bottom crossing viewport
 *   centre. Activating a card deactivates ALL others. Bidirectional,
 *   overwrite-guarded for fast scroll.
 *
 * Note: Webflow IX2 hover interaction (data-w-id) on .pain-card is stripped
 * at runtime to prevent conflict with GSAP-managed opacity.
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

  const imgs = cards.map((c) => c.querySelector('img'));
  const infos = cards.map((c) => c.querySelector('.pain-card_info-wrap'));

  /* Strip IX2 hover interaction to prevent conflict */
  cards.forEach((card) => card.removeAttribute('data-w-id'));

  ScrollTrigger.matchMedia({

    /* ────────────────────────────────────────────────────────
     * DESKTOP
     * ──────────────────────────────────────────────────────── */
    '(min-width: 992px)': function () {
      let hoverLocked = true;

      /* Initial state: images dimmed, content hidden */
      gsap.set(imgs, { opacity: 0.35 });
      gsap.set(infos, { opacity: 0 });

      /* ── Intro: scroll-triggered 1-2-3 stagger ── */
      const introTl = gsap.timeline({
        paused: true,
        onComplete() {
          DEBUG && console.log('[wat-als] intro complete, enabling hover');

          /* After intro: fade content back out, then unlock hover */
          gsap.to(infos, {
            opacity: 0,
            duration: 0.5,
            ease: 'power2.inOut',
            stagger: 0.1,
            onComplete() {
              hoverLocked = false;
            },
          });
        },
      });

      cards.forEach((card, i) => {
        const offset = i * 1.5;

        introTl.to(imgs[i], {
          opacity: 1,
          duration: 1.2,
          ease: 'power2.out',
        }, offset);

        introTl.to(infos[i], {
          opacity: 1,
          duration: 1.2,
          ease: 'power2.out',
        }, offset);
      });

      ScrollTrigger.create({
        trigger: wrap,
        start: 'top 80%',
        once: true,
        onEnter() {
          introTl.play();
        },
      });

      /* ── Hover: show/hide content after intro ── */
      cards.forEach((card, i) => {
        card.addEventListener('mouseenter', () => {
          if (hoverLocked) return;
          gsap.killTweensOf(infos[i]);
          gsap.to(infos[i], { opacity: 1, duration: 0.35, ease: 'power2.out' });
        });

        card.addEventListener('mouseleave', () => {
          if (hoverLocked) return;
          gsap.killTweensOf(infos[i]);
          gsap.to(infos[i], { opacity: 0, duration: 0.3, ease: 'power2.inOut' });
        });
      });

      DEBUG && console.log('[wat-als] desktop: registered');
    },

    /* ────────────────────────────────────────────────────────
     * MOBILE — one active card at a time
     * ──────────────────────────────────────────────────────── */
    '(max-width: 991px)': function () {
      let activeIndex = -1;

      gsap.set(imgs, { opacity: 0.4 });
      gsap.set(infos, { opacity: 0 });

      function setActive(index) {
        if (index === activeIndex) return;

        DEBUG && console.log('[wat-als] mobile:', activeIndex, '→', index);

        /* Deactivate ALL other cards (guard against stale state) */
        cards.forEach((_, j) => {
          if (j === index) return;
          gsap.to(imgs[j], {
            opacity: 0.4,
            duration: 0.4,
            ease: 'power2.inOut',
            overwrite: true,
          });
          gsap.to(infos[j], {
            opacity: 0,
            duration: 0.4,
            ease: 'power2.inOut',
            overwrite: true,
          });
        });

        /* Activate target */
        activeIndex = index;
        gsap.to(imgs[index], {
          opacity: 1,
          duration: 0.5,
          ease: 'power2.out',
          overwrite: true,
        });
        gsap.to(infos[index], {
          opacity: 1,
          duration: 0.5,
          ease: 'power2.out',
          overwrite: true,
        });
      }

      cards.forEach((card, i) => {
        ScrollTrigger.create({
          trigger: card,
          start: 'top center',
          end: 'bottom center',
          onEnter: () => setActive(i),
          onEnterBack: () => setActive(i),
        });
      });

      DEBUG && console.log('[wat-als] mobile: registered');
    },
  });
})();
