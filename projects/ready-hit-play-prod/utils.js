/* =========================================
   RHP — Utility Scripts
   ========================================= */

// Make all links opening in a new tab 'noreferrer noopener'
document.addEventListener('DOMContentLoaded', () => {
  const links = document.querySelectorAll('a[target="_blank"]');
  links.forEach(link => {
    link.setAttribute('rel', 'noreferrer noopener');
  });
});

// Update the copyright year in the footer to the current year
(function() {
  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
})();

// Add hidden fields to each form to track conversion pages and UTMs
document.addEventListener('DOMContentLoaded', () => {
  const url = new URL(window.location.href);
  const urlWithoutUTMs = new URL(url.origin + url.pathname);

  for (const [key, value] of url.searchParams) {
    if (!key.startsWith('utm_')) {
      urlWithoutUTMs.searchParams.set(key, value);
    }
  }

  document.querySelectorAll('form').forEach(form => {
    const conversionInput = document.createElement('input');
    conversionInput.type = 'hidden';
    conversionInput.name = 'Conversion Page';
    conversionInput.value = urlWithoutUTMs.href;
    form.appendChild(conversionInput);

    for (const [key, value] of url.searchParams) {
      if (key.startsWith('utm_')) {
        const utmInput = document.createElement('input');
        utmInput.type = 'hidden';
        utmInput.name = key;
        utmInput.value = value;
        form.appendChild(utmInput);
      }
    }
  });
});
