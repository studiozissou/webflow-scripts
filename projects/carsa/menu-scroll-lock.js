/**
 * Menu Scroll Lock
 * Prevents background scroll when Webflow nav menu is open,
 * while keeping the menu panel itself scrollable.
 *
 * Uses overflow:hidden (not position:fixed) to avoid breaking
 * the sticky navbar positioning on Android Chrome.
 */
(() => {
  const nav = document.querySelector('.navbar7_component');
  if (!nav) return;

  const btn = nav.querySelector('.w-nav-button');
  const menu = nav.querySelector('.navbar8_menu');
  if (!btn || !menu) return;

  let locked = false;
  let scrollY = 0;

  function lock() {
    if (locked) return;
    locked = true;
    scrollY = window.scrollY;
    // Only body — setting overflow on html breaks sticky positioning
    document.body.style.overflow = 'hidden';
    menu.style.overflowY = 'auto';
    menu.style.webkitOverflowScrolling = 'touch';
  }

  function unlock() {
    if (!locked) return;
    locked = false;
    document.body.style.overflow = '';
    menu.style.overflowY = '';
    menu.style.webkitOverflowScrolling = '';
    window.scrollTo(0, scrollY);
  }

  const observer = new MutationObserver(() => {
    const isOpen = btn.getAttribute('aria-expanded') === 'true';
    if (isOpen) lock();
    else unlock();
  });

  observer.observe(btn, { attributes: true, attributeFilter: ['aria-expanded'] });
})();
