<!--
  UTM tagging — The Times referral campaign
  Page: https://getcoconut.webflow.io/thetimes
  Placement: Page Settings → Custom Code → Before </body>
  Deployed: 2026-04-08

  Tags every http(s) <a href> on the page with:
    ?utm_source=the_times&utm_medium=referral

  Guards:
    - Skips #, mailto:, tel:, javascript: and non-http(s) protocols
    - Idempotent (won't re-tag links that already have utm_source)
    - Handles relative URLs via new URL(href, location.href)
-->
<script>
(function () {
  var params = {
    utm_source: 'the_times',
    utm_medium: 'referral'
  };

  function addUTMs() {
    var links = document.querySelectorAll('a[href]');
    links.forEach(function (link) {
      var href = link.getAttribute('href');
      if (!href) return;
      if (/^(#|mailto:|tel:|javascript:)/i.test(href)) return;

      try {
        var url = new URL(href, window.location.href);
        if (!/^https?:$/.test(url.protocol)) return;
        if (url.searchParams.has('utm_source')) return;

        Object.keys(params).forEach(function (key) {
          url.searchParams.set(key, params[key]);
        });

        link.setAttribute('href', url.toString());
      } catch (e) {
        // Invalid URL — leave it alone
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addUTMs);
  } else {
    addUTMs();
  }
})();
</script>
