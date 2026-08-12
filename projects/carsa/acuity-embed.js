/**
 * Acuity Embed — Carsa service-location template pages
 *
 * Builds a responsive Acuity Scheduling booking iframe inside a placeholder
 * element on each location page.
 *
 * DOM contract (set up in Webflow Designer):
 *   <div data-acuity-embed data-calendar-id="12345678"></div>
 *   - data-acuity-embed  : marks the container to populate (required)
 *   - data-calendar-id   : the location's Acuity calendar ID, bound from the
 *                          CMS `acuity-calendar-id` field via a Webflow custom
 *                          attribute (Element settings → Custom attributes →
 *                          data-calendar-id = {{ acuity-calendar-id }}).
 *
 * The owner account (33396621) is shared across all 5 locations; only the
 * calendarID changes per page.
 *
 * If the container or calendar ID is missing the module does nothing and
 * throws no errors — pages without a booking embed stay console-clean.
 *
 * Height tradeoff: rather than loading Acuity's embed.js (which mutates the
 * iframe height via postMessage and adds a third-party dependency), we set a
 * fixed min-height that comfortably contains the widget at all breakpoints.
 * Width is always 100% so the iframe can never exceed the mobile viewport.
 */
const CarsaAcuityEmbed = (() => {
  const DEBUG = false;

  const SELECTOR = '[data-acuity-embed]';
  const OWNER = '33396621';
  const IFRAME_CLASS = 'carsa-acuity-iframe';
  const DESKTOP_BP = '(min-width: 768px)';

  let _initialized = false;
  let _iframe = null;
  let _container = null;

  function buildSrc(calendarId) {
    // Keep the URL minimal: owner + calendarID. Acuity renders the standard
    // embedded widget from these two params alone.
    return `https://app.acuityscheduling.com/schedule.php?owner=${encodeURIComponent(OWNER)}&calendarID=${encodeURIComponent(calendarId)}`;
  }

  function init() {
    if (_initialized) return;

    _container = document.querySelector(SELECTOR);
    if (!_container) {
      DEBUG && console.log('[CarsaAcuityEmbed] no container found — skipping');
      return;
    }

    const calendarId = (_container.getAttribute('data-calendar-id') || '').trim();
    if (!calendarId) {
      DEBUG && console.log('[CarsaAcuityEmbed] container has no data-calendar-id — skipping');
      return;
    }

    // Avoid duplicating an iframe if one is already present.
    if (_container.querySelector(`iframe.${IFRAME_CLASS}`)) {
      DEBUG && console.log('[CarsaAcuityEmbed] iframe already present — skipping');
      _initialized = true;
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.className = IFRAME_CLASS;
    iframe.src = buildSrc(calendarId);
    iframe.title = 'Book a service appointment';
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('loading', 'lazy');

    // Width 100% guarantees the iframe never exceeds the viewport (375px test).
    // Desktop gets a taller frame; mobile uses a generous min-height so the
    // full calendar + form is reachable without Acuity's resize script.
    const desktop = window.matchMedia(DESKTOP_BP).matches;
    iframe.style.width = '100%';
    iframe.style.maxWidth = '100%';
    iframe.style.border = '0';
    iframe.style.display = 'block';
    iframe.style.height = desktop ? '800px' : '1000px';
    iframe.style.minHeight = desktop ? '800px' : '1000px';

    _container.appendChild(iframe);
    _iframe = iframe;
    _initialized = true;

    DEBUG && console.log('[CarsaAcuityEmbed] iframe injected', { calendarId });
  }

  function destroy() {
    if (_iframe && _iframe.parentNode) {
      _iframe.parentNode.removeChild(_iframe);
    }
    _iframe = null;
    _container = null;
    _initialized = false;
    DEBUG && console.log('[CarsaAcuityEmbed] destroyed');
  }

  // Auto-init once the DOM is ready, guarding against double-init.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  return { init, destroy };
})();
