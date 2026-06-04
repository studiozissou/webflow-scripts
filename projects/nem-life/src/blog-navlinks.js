/**
 * NEM Life — Blog nav links
 * For each .blog-navlink, reads its [data-link] value and scrolls to
 * the matching #id on click with a configurable offset.
 * On tablet and below, closes the ancestor dropdown after navigation.
 */
(() => {
  const DEBUG = false;
  const TABLET_BP = 991; // Webflow tablet breakpoint
  const getOffset = () => window.innerWidth > TABLET_BP ? 128 : 78;

  document.querySelectorAll('.blog-navlink').forEach((el) => {
    const targetId = el.getAttribute('data-link');
    if (!targetId) return;

    el.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById(targetId);
      if (!target) {
        DEBUG && console.log('[blog-navlinks] target not found:', targetId);
        return;
      }

      /* Close ancestor dropdown on tablet and below */
      if (window.innerWidth <= TABLET_BP) {
        const dropdown = el.closest('.w-dropdown');
        if (dropdown) {
          const toggle = dropdown.querySelector('.w-dropdown-toggle');
          if (toggle) toggle.click();
          DEBUG && console.log('[blog-navlinks] closed ancestor dropdown');
        }
      }

      const top = target.getBoundingClientRect().top + window.scrollY - getOffset();
      window.scrollTo({ top, behavior: 'smooth' });
      DEBUG && console.log('[blog-navlinks] scrolled to', targetId);
    });
  });
})();
