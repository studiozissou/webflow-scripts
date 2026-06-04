/**
 * NEM Life — Mobile Menu Toggle (GSAP)
 *
 * Toggles .menu-wrap visibility via .menu-button click.
 * Animates hamburger lines to X and menu panel slide-down.
 * Adds .is-open to .menu-button for external state detection.
 */

(() => {
  const DEBUG = false;
  const btn = document.querySelector('.menu-button');
  const wrap = document.querySelector('.menu-wrap');
  if (!btn || !wrap) {
    DEBUG && console.log('[menu-toggle] .menu-button or .menu-wrap not found');
    return;
  }

  const lineTop = btn.querySelector('.menu-line--top');
  const lineMid = btn.querySelector('.menu-line--middle');
  const lineBot = btn.querySelector('.menu-line--bottom');
  const blur = document.querySelector('.menu-blur');


  let isOpen = false;
  let tl = null;

  function buildTimeline() {
    const t = gsap.timeline({ paused: true });

    /* Calculate offsets to center lines for X */
    const btnH = btn.offsetHeight;
    const center = btnH / 2;
    const topY = lineTop.offsetTop + lineTop.offsetHeight / 2;
    const botY = lineBot.offsetTop + lineBot.offsetHeight / 2;
    const topDelta = center - topY;
    const botDelta = center - botY;

    /* Hamburger → X */
    t.to(lineTop, {
      rotation: 45,
      y: topDelta,
      left: 0,
      width: '100%',
      transformOrigin: 'center center',
      duration: 0.3,
      ease: 'power2.inOut',
    }, 0);
    t.to(lineMid, {
      opacity: 0,
      duration: 0.15,
      ease: 'power2.in',
    }, 0);
    t.to(lineBot, {
      rotation: -45,
      y: botDelta,
      left: 0,
      width: '100%',
      transformOrigin: 'center center',
      duration: 0.3,
      ease: 'power2.inOut',
    }, 0);

    /* Menu panel reveal */
    t.fromTo(wrap, {
      display: 'flex',
      autoAlpha: 0,
      yPercent: -8,
    }, {
      autoAlpha: 1,
      yPercent: 0,
      duration: 0.35,
      ease: 'power2.out',
    }, 0.05);

    /* Backdrop blur */
    if (blur) {
      t.fromTo(blur, {
        display: 'block',
        autoAlpha: 0,
      }, {
        autoAlpha: 1,
        duration: 0.35,
        ease: 'power2.out',
      }, 0);
    }

    /* Stagger menu items (direct children of nav + CTA button) */
    const nav = wrap.querySelector('.menu_navigation-wrap');
    const items = [
      ...(nav ? nav.children : []),
      ...wrap.querySelectorAll('.menu_button-wrap'),
    ];
    if (items.length) {
      t.fromTo(items, {
        opacity: 0,
      }, {
        opacity: 1,
        duration: 0.3,
        stagger: 0.04,
        ease: 'none',
      }, 0.12);
    }

    return t;
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    btn.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    if (!tl) tl = buildTimeline();
    tl.play();
    DEBUG && console.log('[menu-toggle] open');
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    btn.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    if (tl) tl.reverse();
    DEBUG && console.log('[menu-toggle] close');
  }

  function toggle() {
    if (isOpen) close();
    else open();
  }

  btn.addEventListener('click', toggle);

  /* Close on Escape */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) close();
  });

  /* Close when clicking a nav link inside the menu */
  wrap.addEventListener('click', (e) => {
    if (e.target.closest('a')) close();
  });

  /* Close when clicking the blur overlay */
  if (blur) blur.addEventListener('click', close);

  /* Expose for external use */
  window.__nemMenu = { open, close, toggle, isOpen: () => isOpen };
})();
