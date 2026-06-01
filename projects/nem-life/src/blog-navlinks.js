/**
 * NEM Life — Blog nav links
 * For each .blog-navlink, reads its [data-link] value and scrolls to
 * the matching #id on click with a configurable offset.
 */
(() => {
  const DEBUG = false;
  const OFFSET = 80; // px offset to clear fixed header / navbar

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

      const top = target.getBoundingClientRect().top + window.scrollY - OFFSET;
      window.scrollTo({ top, behavior: 'smooth' });
      DEBUG && console.log('[blog-navlinks] scrolled to', targetId);
    });
  });
})();
