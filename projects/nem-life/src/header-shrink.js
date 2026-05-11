/**
 * NEM Life — Header Logo Shrink
 *
 * Adds .is-small to .header-logo when the page is scrolled away from the top.
 * Removes .is-small when the user is at the very top (scrollY === 0).
 *
 * Handles: scroll, resize, back-navigation (page may load mid-scroll).
 */

const DEBUG = false;

(() => {
  const SELECTOR = '.header-logo';
  const CLASS = 'is-small';
  const THRESHOLD = 1; // px — treat anything above this as "not at top"

  const logo = document.querySelector(SELECTOR);
  if (!logo) {
    DEBUG && console.log('[header-shrink] .header-logo not found');
    return;
  }

  function update() {
    const atTop = window.scrollY <= THRESHOLD;
    logo.classList.toggle(CLASS, !atTop);
    DEBUG && console.log('[header-shrink]', atTop ? 'at top' : 'scrolled');
  }

  /* Core listener */
  window.addEventListener('scroll', update, { passive: true });

  /* Resize can shift scroll position (e.g. address bar hide on mobile) */
  window.addEventListener('resize', update, { passive: true });

  /* Initial check — covers page load, back-navigation, and anchor links */
  update();
})();
