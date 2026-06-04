/**
 * NEM Life — Topbar Hide on Scroll
 *
 * Hides .header_topbar (height → 0, opacity → 0) when:
 *   - Page is scrolled away from the very top, OR
 *   - Mobile nav menu is open
 *
 * Shows .header_topbar again when:
 *   - Page is at the very top AND mobile menu is closed
 */

(() => {
  const DEBUG = false;
  const SELECTOR = '.header_topbar';
  const NAV_BUTTON = '.menu-button';
  const MENU_OPEN_CLASS = 'is-open';
  const THRESHOLD = 1; // px

  const topbar = document.querySelector(SELECTOR);
  if (!topbar) {
    DEBUG && console.log('[topbar-hide] .header_topbar not found');
    return;
  }

  const navButton = document.querySelector(NAV_BUTTON);
  let hidden = false;

  function isMenuOpen() {
    if (!navButton) return false;
    /* IX2 may toggle .is-open or .is-active on the button, or aria-expanded */
    return navButton.classList.contains(MENU_OPEN_CLASS) ||
      navButton.classList.contains('is-active') ||
      navButton.getAttribute('aria-expanded') === 'true';
  }

  function shouldHide() {
    return window.scrollY > THRESHOLD || isMenuOpen();
  }

  function hide() {
    if (hidden) return;
    hidden = true;
    gsap.to(topbar, {
      height: 0,
      opacity: 0,
      duration: 0.3,
      ease: 'power2.inOut',
      onComplete() { topbar.style.overflow = 'hidden'; },
    });
    DEBUG && console.log('[topbar-hide] hiding');
  }

  function show() {
    if (!hidden) return;
    hidden = false;
    topbar.style.overflow = '';
    gsap.to(topbar, {
      height: 'auto',
      opacity: 1,
      duration: 0.3,
      ease: 'power2.inOut',
    });
    DEBUG && console.log('[topbar-hide] showing');
  }

  function update() {
    if (shouldHide()) {
      hide();
    } else {
      show();
    }
  }

  /* Scroll & resize */
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });

  /* Watch for mobile menu open/close via class mutations */
  if (navButton) {
    const observer = new MutationObserver(update);
    observer.observe(navButton, { attributes: true, attributeFilter: ['class', 'aria-expanded'] });
  }

  /* Initial check */
  update();
})();
