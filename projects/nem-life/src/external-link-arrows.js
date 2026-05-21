/**
 * NEM Life — External Link Arrow Rotation
 * Rotates .button-arrow inside any .button that points to an external URL
 * by -45deg so the arrow indicates "outbound".
 */
(() => {
  const origin = window.location.origin;

  document.querySelectorAll('.button').forEach((btn) => {
    const href = btn.getAttribute('href');
    if (!href) return;

    const isExternal =
      href.startsWith('http') && !href.startsWith(origin);

    if (!isExternal) return;

    const arrow = btn.querySelector('.button-arrow');
    if (arrow) arrow.style.transform = 'rotate(-45deg)';
  });
})();
