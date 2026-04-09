<!--
  _X_ cookie override — The Times referral campaign
  Page: https://getcoconut.com/thetimes (production)
        https://getcoconut.webflow.io/thetimes (staging)
  Placement: Page Settings → Custom Code → Before </body>
  Deployed: 2026-04-09

  Forces the site-wide _X_ attribution cookie to the Times campaign value on
  every visit to /thetimes, overriding the first-touch-only behaviour of the
  existing site-wide "Cookies 2025 by agency" writer. Must run AFTER the
  agency writer — Webflow runs site-wide Before </body> embeds before
  page-level ones, so this is automatic.

  Cookie format matches the existing agency writer: {referrer}~{querystring}
  We force an empty referrer + UTM querystring, matching the Gov.uk
  attribution pattern already in production.

  Staging note: on *.webflow.io hosts, any cookie with domain=.getcoconut.com
  is silently rejected by the browser (Public Suffix List separation), so
  staging falls back to a host-only cookie for testability. Production uses
  .getcoconut.com to match the agency writer byte-for-byte, preventing
  duplicate cookies in different scopes.
-->
<script>
(function () {
  var DEBUG = false;

  var CONFIG = {
    cookieName: '_X_',
    // Format: {referrer}~{querystring} — tilde is a separator, not a prefix.
    cookieValue: '~utm_source=the_times&utm_medium=referral&utm_campaign=april26',
    expiryDays: 730,
    path: '/',
    secure: true,
    sameSite: 'Lax'
  };

  // Defensive path guard. This snippet lives in page-level Before </body> on
  // /thetimes so it already only runs there — the guard is a safety net in
  // case the snippet is ever moved to site-wide custom code.
  var path = window.location.pathname.replace(/\/$/, '');
  if (path !== '/thetimes') return;

  // Domain resolution: match the agency writer on production, host-only on
  // the Webflow staging host (see header note).
  var isStaging = window.location.hostname.indexOf('webflow.io') !== -1;
  var domain = isStaging ? null : '.getcoconut.com';

  // Build the Set-Cookie string. Must re-specify all attributes on every
  // write — browsers don't inherit expiry/domain/path/SameSite from the
  // previous cookie value, and omitting expiry would make it session-only.
  var expiry = new Date();
  expiry.setTime(expiry.getTime() + CONFIG.expiryDays * 24 * 60 * 60 * 1000);

  var parts = [
    CONFIG.cookieName + '=' + CONFIG.cookieValue,
    'expires=' + expiry.toUTCString(),
    'path=' + CONFIG.path
  ];
  if (domain) parts.push('domain=' + domain);
  if (CONFIG.secure) parts.push('Secure');
  parts.push('SameSite=' + CONFIG.sameSite);

  document.cookie = parts.join('; ');

  DEBUG && console.log('[Times LP] _X_ cookie overridden', {
    value: CONFIG.cookieValue,
    domain: domain || '(host-only)',
    expiryDays: CONFIG.expiryDays
  });
})();
</script>
