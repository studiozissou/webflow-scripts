/**
 * NEM Life — External Link Arrow Rotation
 * Rotates all .button-arrow elements inside any .button that points to an
 * external URL by -45deg so the arrow indicates "outbound".
 */
(() => {
  const origin = window.location.origin;

  document.querySelectorAll('.button').forEach((btn) => {
    const href = btn.closest('a')?.href || btn.getAttribute('href');
    if (!href) return;

    try {
      const url = new URL(href, origin);
      if (url.origin === origin) return;
      if (url.protocol === 'mailto:' || url.protocol === 'tel:') return;
    } catch (e) {
      return;
    }

    btn.querySelectorAll('.button-arrow').forEach((arrow) => {
      arrow.style.transform = 'rotate(-45deg)';
    });
  });
})();
