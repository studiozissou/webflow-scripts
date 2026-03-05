(() => {
  const secureExternalLinks = () => {
    const links = document.querySelectorAll('a[target="_blank"]');
    links.forEach((link) => {
      link.setAttribute('rel', 'noreferrer noopener');
    });
  };

  const setCopyrightYear = () => {
    const yearEl = document.getElementById('year');
    if (yearEl) {
      yearEl.textContent = new Date().getFullYear();
    }
  };

  const injectFormTracking = () => {
    const forms = document.querySelectorAll('form');
    if (!forms.length) return;

    const currentUrl = new URL(window.location.href);
    const urlParams = currentUrl.searchParams;

    const cleanUrl = new URL(currentUrl.origin + currentUrl.pathname);
    for (const [key, value] of urlParams) {
      if (!key.startsWith('utm_')) {
        cleanUrl.searchParams.set(key, value);
      }
    }
    const conversionPage = cleanUrl.toString();

    forms.forEach((form) => {
      if (form.dataset.trackingInjected) return;
      form.dataset.trackingInjected = 'true';

      const conversionInput = Object.assign(document.createElement('input'), {
        type: 'hidden',
        name: 'Conversion Page',
        value: conversionPage,
      });
      form.append(conversionInput);

      for (const [key, value] of urlParams) {
        if (key.startsWith('utm_')) {
          const utmInput = Object.assign(document.createElement('input'), {
            type: 'hidden',
            name: key,
            value,
          });
          form.append(utmInput);
        }
      }
    });
  };

  const run = () => {
    secureExternalLinks();
    setCopyrightYear();
    injectFormTracking();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
