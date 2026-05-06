/**
 * NEM Life — Back to Top
 * Scrolls to the top of the page when .back-to-top is clicked.
 */

const DEBUG = false;

document.querySelector('.back-to-top')?.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
