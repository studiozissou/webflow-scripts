// Module: Work Clients
// Project: Studio Zissou
// Deps: gsap (CDN)

const workClients = (() => {
  const DEBUG = false;

  let _initialized = false;
  let _ctx = null;
  const _listeners = [];

  const SELECTORS = {
    section: '[data-work]',
    row: '[data-work-row]',
    preview: '[data-work-preview]',
  };

  const MOBILE_BP = 768;

  const isMobile = () => window.innerWidth < MOBILE_BP;

  const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const addTrackedListener = (el, type, fn) => {
    el.addEventListener(type, fn);
    _listeners.push({ el, type, fn });
  };

  const init = (container) => {
    if (_initialized) return;

    const { gsap } = window;
    if (!gsap) {
      DEBUG && console.log('workClients: GSAP not loaded');
      return;
    }

    const root = container || document;
    const section = root.querySelector(SELECTORS.section);
    if (!section) {
      DEBUG && console.log('workClients: section not found');
      return;
    }

    const rows = Array.from(section.querySelectorAll(SELECTORS.row));
    const previewWrap = section.querySelector(SELECTORS.preview);
    if (!rows.length || !previewWrap) {
      DEBUG && console.log('workClients: rows or preview not found');
      return;
    }

    const previewImg = previewWrap.querySelector('img');
    if (!previewImg) {
      DEBUG && console.log('workClients: preview img not found');
      return;
    }

    // No hover previews on mobile (touch devices)
    if (isMobile()) {
      DEBUG && console.log('workClients: mobile — skipping hover init');
      return;
    }

    _initialized = true;

    _ctx = gsap.context(() => {
      gsap.set(previewWrap, { opacity: 0 });

      const setPreviewOpacity = (opacity, options) => {
        if (prefersReducedMotion()) {
          gsap.set(previewWrap, { opacity });
        } else {
          gsap.to(previewWrap, { opacity, ...options, overwrite: true });
        }
      };

      rows.forEach((row) => {
        const { previewSrc, clientName } = row.dataset;

        const onEnter = () => {
          if (!previewSrc) return;
          previewImg.src = previewSrc;
          previewImg.alt = `${clientName} project preview`;
          setPreviewOpacity(1, { duration: 0.3, ease: 'power2.out' });
        };

        const onLeave = () => {
          setPreviewOpacity(0, { duration: 0.2, ease: 'power2.in' });
        };

        addTrackedListener(row, 'mouseenter', onEnter);
        addTrackedListener(row, 'mouseleave', onLeave);
        addTrackedListener(row, 'focusin', onEnter);
        addTrackedListener(row, 'focusout', onLeave);
      });
    }, section);
  };

  const destroy = () => {
    _listeners.forEach(({ el, type, fn }) => el.removeEventListener(type, fn));
    _listeners.length = 0;

    if (_ctx) {
      _ctx.revert();
      _ctx = null;
    }

    _initialized = false;
  };

  return { init, destroy };
})();
