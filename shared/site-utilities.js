/**
 * Shared site-wide utilities
 *
 * Included in every project's init.js loader.
 * Import these functions or copy them into your loader's boot().
 *
 * - setExternalLinkRels()  — adds rel="noreferrer noopener" to target="_blank" links
 * - setFooterYear()        — sets #year element to current year
 * - injectUTMTracking()    — injects UTM params + conversion page into forms
 */

export function setExternalLinkRels() {
  document.querySelectorAll('a[target="_blank"]').forEach((a) => {
    a.setAttribute('rel', 'noreferrer noopener');
  });
}

export function setFooterYear() {
  const el = document.getElementById('year');
  if (el) el.textContent = new Date().getFullYear();
}

export function injectUTMTracking() {
  const forms = document.querySelectorAll('form');
  if (!forms.length) return;

  const url = new URL(window.location.href);
  const params = url.searchParams;

  const cleanURL = new URL(url.origin + url.pathname);
  for (const [key, val] of params) {
    if (!key.startsWith('utm_')) cleanURL.searchParams.set(key, val);
  }
  const conversionPage = cleanURL.toString();

  forms.forEach((form) => {
    if (form.dataset.trackingInjected) return;
    form.dataset.trackingInjected = 'true';

    form.append(
      Object.assign(document.createElement('input'), {
        type: 'hidden',
        name: 'Conversion Page',
        value: conversionPage,
      })
    );

    for (const [key, val] of params) {
      if (key.startsWith('utm_')) {
        form.append(
          Object.assign(document.createElement('input'), {
            type: 'hidden',
            name: key,
            value: val,
          })
        );
      }
    }
  });
}

/** Run all site-wide utilities. Call from your loader's boot(). */
export function runSiteUtilities() {
  setExternalLinkRels();
  setFooterYear();
  injectUTMTracking();
}
