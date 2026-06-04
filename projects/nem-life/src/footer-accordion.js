/**
 * NEM Life — Footer Accordion (Mobile Only)
 * Collapse/expand footer nav columns on mobile (≤767px).
 * All items collapsed by default. Arrow rotates on expand.
 *
 * Webflow structure:
 *   .footer_nav-col
 *     .footer_accordion-trigger  (clickable header)
 *       .footer_arrow             (rotates 90° when open)
 *     .footer_navlinks-wrap       (collapsible content)
 *
 * Requires: GSAP (CDN-loaded).
 */
(() => {
  const DEBUG = false;
  const COLS = document.querySelectorAll('.footer_nav-col');
  if (!COLS.length) return;

  DEBUG && console.log('[footer-accordion] found', COLS.length, 'columns');

  const DURATION = 0.4;
  const EASE = 'power2.inOut';
  const MQ = window.matchMedia('(max-width: 767px)');
  let active = false;

  function collapse(col, instant) {
    const wrap = col.querySelector('.footer_navlinks-wrap');
    const arrow = col.querySelector('.footer_arrow');
    if (!wrap) return;
    const dur = instant ? 0 : DURATION;
    gsap.to(wrap, {
      height: 0,
      opacity: 0,
      duration: dur,
      ease: EASE,
      onComplete: () => { wrap.style.overflow = 'hidden'; },
    });
    if (arrow) gsap.to(arrow, { rotation: 0, duration: dur, ease: EASE });
    col.classList.remove('is-open');
  }

  function expand(col) {
    const wrap = col.querySelector('.footer_navlinks-wrap');
    const arrow = col.querySelector('.footer_arrow');
    if (!wrap) return;
    wrap.style.overflow = 'hidden';
    wrap.style.height = 'auto';
    const h = wrap.offsetHeight;
    wrap.style.height = '0px';
    gsap.to(wrap, {
      height: h,
      opacity: 1,
      duration: DURATION,
      ease: EASE,
      onComplete: () => {
        wrap.style.height = 'auto';
        wrap.style.overflow = 'visible';
      },
    });
    if (arrow) gsap.to(arrow, { rotation: 90, duration: DURATION, ease: EASE });
    col.classList.add('is-open');
  }

  function handleClick(e) {
    const col = e.currentTarget.closest('.footer_nav-col');
    if (!col) return;
    const isOpen = col.classList.contains('is-open');
    /* Close all others */
    COLS.forEach((other) => {
      if (other !== col && other.classList.contains('is-open')) {
        collapse(other);
      }
    });
    /* Toggle clicked item */
    if (isOpen) {
      collapse(col);
    } else {
      expand(col);
    }
  }

  function enable() {
    if (active) return;
    active = true;
    COLS.forEach((col) => {
      const wrap = col.querySelector('.footer_navlinks-wrap');
      const arrow = col.querySelector('.footer_arrow');
      const trigger = col.querySelector('.footer_accordion-trigger');
      if (wrap) gsap.set(wrap, { height: 0, opacity: 0, overflow: 'hidden' });
      if (arrow) gsap.set(arrow, { rotation: 0 });
      if (trigger) {
        trigger.style.cursor = 'pointer';
        trigger.addEventListener('click', handleClick);
      }
    });
  }

  function disable() {
    if (!active) return;
    active = false;
    COLS.forEach((col) => {
      const wrap = col.querySelector('.footer_navlinks-wrap');
      const arrow = col.querySelector('.footer_arrow');
      const trigger = col.querySelector('.footer_accordion-trigger');
      /* Remove inline GSAP styles so desktop layout is restored */
      if (wrap) gsap.set(wrap, { clearProps: 'all' });
      if (arrow) gsap.set(arrow, { clearProps: 'all' });
      if (trigger) {
        trigger.style.cursor = '';
        trigger.removeEventListener('click', handleClick);
      }
      col.classList.remove('is-open');
    });
  }

  function onChange(mq) {
    if (mq.matches) {
      enable();
    } else {
      disable();
    }
  }

  /* Listen for viewport changes */
  MQ.addEventListener('change', onChange);
  /* Initial check */
  onChange(MQ);
})();
